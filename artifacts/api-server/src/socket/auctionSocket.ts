import type { Server as HttpServer } from "http";
import { Server as SocketServer } from "socket.io";
import { db, bidsTable, playersTable, teamsTable, auctionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { verifyToken } from "../lib/auth.js";

interface BidSnapshot {
  teamId: string;
  teamName: string;
  amount: number;
}

interface AuctionState {
  currentPlayerId: string | null;
  currentBid: number;
  highestBidder: BidSnapshot | null;
  bidHistory: BidSnapshot[];
  auctionId: string;
  minimumBid: number;
  bidIncreaseBy: number;
}

const auctionStates = new Map<string, AuctionState>();

function formatPlayer(p: typeof playersTable.$inferSelect) {
  return {
    id: p.id,
    name: p.name,
    role: p.role,
    basePrice: Number(p.basePrice),
    age: p.age,
    city: p.city,
    photoUrl: p.photoUrl,
    auctionId: p.auctionId,
    teamId: p.teamId,
    soldPrice: p.soldPrice ? Number(p.soldPrice) : null,
    status: p.status,
  };
}

async function pickRandomUnsoldPlayer(auctionId: string) {
  const players = await db
    .select()
    .from(playersTable)
    .where(and(eq(playersTable.auctionId, auctionId), eq(playersTable.status, "available")));
  if (players.length === 0) return null;
  return players[Math.floor(Math.random() * players.length)];
}

async function buildStateFromAuction(auctionId: string): Promise<AuctionState | null> {
  const [auction] = await db.select().from(auctionsTable).where(eq(auctionsTable.id, auctionId));
  if (!auction) return null;
  return {
    currentPlayerId: null,
    currentBid: 0,
    highestBidder: null,
    bidHistory: [],
    auctionId,
    minimumBid: auction.minimumBid ? Number(auction.minimumBid) : 0,
    bidIncreaseBy: auction.bidIncreaseBy ? Number(auction.bidIncreaseBy) : 100,
  };
}

async function broadcastNextPlayer(auctionId: string, state: AuctionState, io: SocketServer) {
  const player = await pickRandomUnsoldPlayer(auctionId);
  if (!player) {
    console.log(`[socket] auction ${auctionId}: no more available players`);
    io.to(`auction:${auctionId}`).emit("auction:noMorePlayers", { message: "All players have been auctioned!" });
    return;
  }

  console.log(`[socket] auction ${auctionId}: next player -> ${player.name}`);

  await db.update(playersTable).set({ status: "inBidding" }).where(eq(playersTable.id, player.id));
  await db.update(auctionsTable).set({ currentPlayer: player.id }).where(eq(auctionsTable.id, auctionId));

  state.currentPlayerId = player.id;
  state.currentBid = 0;
  state.highestBidder = null;
  state.bidHistory = [];

  io.to(`auction:${auctionId}`).emit("auction:player", {
    player: { ...formatPlayer(player), status: "inBidding" },
    currentBid: state.currentBid,
  });
}

export function setupSocket(httpServer: HttpServer) {
  const io = new SocketServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    path: "/api/socket.io",
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth["token"] || socket.handshake.query["token"];
    if (!token) {
      // Allow unauthenticated viewers — they can only receive broadcast events
      (socket as any).user = { id: "viewer", email: "viewer", role: "viewer" };
      return next();
    }
    try {
      const user = verifyToken(token as string);
      (socket as typeof socket & { user: typeof user }).user = user;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const user = (socket as typeof socket & { user: { id: string; email: string; role: string } }).user;
    console.log(`[socket] connected: ${user.email} (${user.role})`);

    // Join auction room and send current state
    socket.on("auction:join", async (auctionId: string) => {
      try {
        console.log(`[socket] ${user.email} joining auction:${auctionId}`);
        socket.join(`auction:${auctionId}`);
        const state = auctionStates.get(auctionId);
        if (state) {
          socket.emit("auction:state", {
            currentPlayerId: state.currentPlayerId,
            currentBid: state.currentBid,
            highestBidder: state.highestBidder,
          });
          if (state.currentPlayerId) {
            const [player] = await db.select().from(playersTable).where(eq(playersTable.id, state.currentPlayerId));
            if (player) {
              socket.emit("auction:player", {
                player: formatPlayer(player),
                currentBid: state.currentBid,
              });
            }
          }
        }
      } catch (err) {
        console.error("[socket] auction:join error:", err);
      }
    });

    // Admin: Start auction → auto-select first random player
    socket.on("auction:start", async ({ auctionId }: { auctionId: string }) => {
      try {
        console.log(`[socket] auction:start received from ${user.email} for auction ${auctionId}`);
        if (user.role !== "admin") {
          socket.emit("auction:error", { message: "Only admins can start auction" });
          return;
        }

        let state = auctionStates.get(auctionId);
        if (!state) {
          const built = await buildStateFromAuction(auctionId);
          if (!built) {
            socket.emit("auction:error", { message: "Auction not found" });
            return;
          }
          state = built;
          auctionStates.set(auctionId, state);
        }

        io.to(`auction:${auctionId}`).emit("auction:started", { auctionId });
        await broadcastNextPlayer(auctionId, state, io);
      } catch (err) {
        console.error("[socket] auction:start error:", err);
        socket.emit("auction:error", { message: "Failed to start auction: " + String(err) });
      }
    });

    // Admin: Next random player
    socket.on("auction:nextPlayer", async ({ auctionId }: { auctionId: string }) => {
      try {
        console.log(`[socket] auction:nextPlayer from ${user.email} for auction ${auctionId}`);
        if (user.role !== "admin") {
          socket.emit("auction:error", { message: "Only admins can advance players" });
          return;
        }

        let state = auctionStates.get(auctionId);
        if (!state) {
          const built = await buildStateFromAuction(auctionId);
          if (!built) {
            socket.emit("auction:error", { message: "Auction not found" });
            return;
          }
          state = built;
          auctionStates.set(auctionId, state);
        }

        await broadcastNextPlayer(auctionId, state, io);
      } catch (err) {
        console.error("[socket] auction:nextPlayer error:", err);
        socket.emit("auction:error", { message: "Failed to get next player: " + String(err) });
      }
    });

    // Team clicks their button → bid increases by bidIncreaseBy
    socket.on("auction:teamBid", async ({ auctionId, teamId }: { auctionId: string; teamId: string }) => {
      try {
        const state = auctionStates.get(auctionId);
        if (!state || !state.currentPlayerId) {
          socket.emit("auction:error", { message: "No active player for bidding" });
          return;
        }

        const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, teamId));
        if (!team) {
          socket.emit("auction:error", { message: "Team not found" });
          return;
        }

        const newBid = state.currentBid + state.bidIncreaseBy;

        if (Number(team.remainingPurse) < newBid) {
          socket.emit("auction:error", { message: `Insufficient purse. Remaining: ${team.remainingPurse}` });
          return;
        }

        // Push previous state to history for undo
        state.bidHistory.push({
          teamId: state.highestBidder?.teamId || "",
          teamName: state.highestBidder?.teamName || "",
          amount: state.currentBid,
        });

        state.currentBid = newBid;
        state.highestBidder = { teamId, teamName: team.name, amount: newBid };

        await db.insert(bidsTable).values({
          auctionId,
          playerId: state.currentPlayerId,
          teamId,
          teamName: team.name,
          amount: String(newBid),
        });

        io.to(`auction:${auctionId}`).emit("auction:update", {
          currentBid: state.currentBid,
          highestBidder: state.highestBidder,
          bidHistory: state.bidHistory,
        });
      } catch (err) {
        console.error("[socket] auction:teamBid error:", err);
        socket.emit("auction:error", { message: "Bid failed: " + String(err) });
      }
    });

    // Undo last bid
    socket.on("auction:undo", ({ auctionId }: { auctionId: string }) => {
      try {
        const state = auctionStates.get(auctionId);
        if (!state || state.bidHistory.length === 0) {
          socket.emit("auction:error", { message: "Nothing to undo" });
          return;
        }

        const prev = state.bidHistory.pop()!;
        state.currentBid = prev.amount;
        state.highestBidder = prev.teamId ? { teamId: prev.teamId, teamName: prev.teamName, amount: prev.amount } : null;

        io.to(`auction:${auctionId}`).emit("auction:update", {
          currentBid: state.currentBid,
          highestBidder: state.highestBidder,
          bidHistory: state.bidHistory,
        });
      } catch (err) {
        console.error("[socket] auction:undo error:", err);
        socket.emit("auction:error", { message: "Undo failed: " + String(err) });
      }
    });

    // Admin: Mark player SOLD
    socket.on("auction:sold", async ({ auctionId }: { auctionId: string }) => {
      try {
        if (user.role !== "admin") return;
        const state = auctionStates.get(auctionId);
        if (!state || !state.currentPlayerId) {
          socket.emit("auction:error", { message: "No active player" });
          return;
        }
        await handleSold(auctionId, state, io);
      } catch (err) {
        console.error("[socket] auction:sold error:", err);
        socket.emit("auction:error", { message: "Sold failed: " + String(err) });
      }
    });

    // Admin: Mark player UNSOLD
    socket.on("auction:unsold", async ({ auctionId }: { auctionId: string }) => {
      try {
        if (user.role !== "admin") return;
        const state = auctionStates.get(auctionId);
        if (!state || !state.currentPlayerId) return;

        const playerId = state.currentPlayerId;
        await db.update(playersTable).set({ status: "unsold" }).where(eq(playersTable.id, playerId));

        state.currentPlayerId = null;
        state.currentBid = 0;
        state.highestBidder = null;
        state.bidHistory = [];

        io.to(`auction:${auctionId}`).emit("auction:playerUnsold", { playerId });

        // Auto-select next player
        await broadcastNextPlayer(auctionId, state, io);
      } catch (err) {
        console.error("[socket] auction:unsold error:", err);
        socket.emit("auction:error", { message: "Unsold failed: " + String(err) });
      }
    });

    socket.on("disconnect", () => {
      console.log(`[socket] disconnected: ${user.email}`);
    });
  });

  return io;
}

async function handleSold(auctionId: string, state: AuctionState, io: SocketServer) {
  if (!state.currentPlayerId) return;

  const [player] = await db.select().from(playersTable).where(eq(playersTable.id, state.currentPlayerId));
  if (!player) return;

  if (state.highestBidder) {
    await db.update(playersTable).set({
      status: "sold",
      teamId: state.highestBidder.teamId,
      soldPrice: String(state.currentBid),
    }).where(eq(playersTable.id, state.currentPlayerId));

    const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, state.highestBidder.teamId));
    if (team) {
      await db.update(teamsTable).set({
        remainingPurse: String(Number(team.remainingPurse) - state.currentBid),
        playersBought: (team.playersBought || 0) + 1,
      }).where(eq(teamsTable.id, state.highestBidder.teamId));
    }

    io.to(`auction:${auctionId}`).emit("auction:sold", {
      player: {
        id: player.id,
        name: player.name,
        role: player.role,
        basePrice: Number(player.basePrice),
        photoUrl: player.photoUrl,
        soldPrice: state.currentBid,
      },
      team: { id: state.highestBidder.teamId, name: state.highestBidder.teamName },
      amount: state.currentBid,
    });
  } else {
    await db.update(playersTable).set({ status: "unsold" }).where(eq(playersTable.id, state.currentPlayerId));
    io.to(`auction:${auctionId}`).emit("auction:playerUnsold", { playerId: state.currentPlayerId });
  }

  state.currentPlayerId = null;
  state.currentBid = 0;
  state.highestBidder = null;
  state.bidHistory = [];

  await broadcastNextPlayer(auctionId, state, io);
}
