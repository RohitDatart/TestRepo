import { Router, type IRouter } from "express";
import { db, auctionsTable, teamsTable, playersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// Public read-only endpoint — no auth required
// Returns auction info + teams + players for a given shareToken
router.get("/public/auction/:shareToken", async (req, res): Promise<void> => {
  const { shareToken } = req.params;
  if (!shareToken) {
    res.status(400).json({ message: "shareToken required" });
    return;
  }

  // Find auction by shareToken
  const [auction] = await db
    .select()
    .from(auctionsTable)
    .where(eq(auctionsTable.shareToken, shareToken));

  if (!auction) {
    res.status(404).json({ message: "Auction not found or share link is invalid" });
    return;
  }

  const teams = await db
    .select()
    .from(teamsTable)
    .where(eq(teamsTable.auctionId, auction.id));

  const players = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.auctionId, auction.id));

  res.json({
    id: auction.id,
    name: auction.name,
    description: auction.description,
    logo: auction.logo,
    auctionStatus: auction.auctionStatus,
    auctionDate: auction.auctionDate,
    pointsPerTeam: auction.pointsPerTeam ? Number(auction.pointsPerTeam) : null,
    playersPerTeam: auction.playersPerTeam,
    minimumBid: auction.minimumBid ? Number(auction.minimumBid) : null,
    bidIncreaseBy: auction.bidIncreaseBy ? Number(auction.bidIncreaseBy) : null,
    teams: teams.map((t) => ({
      id: t.id,
      name: t.name,
      logo: t.logo,
      purseAmount: Number(t.purseAmount),
      remainingPurse: Number(t.remainingPurse),
      playersBought: t.playersBought || 0,
      auctionId: t.auctionId,
      ownerEmail: t.ownerEmail,
    })),
    players: players.map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      basePrice: Number(p.basePrice),
      city: p.city,
      photoUrl: p.photoUrl,
      auctionId: p.auctionId,
      teamId: p.teamId,
      soldPrice: p.soldPrice ? Number(p.soldPrice) : null,
      status: p.status,
    })),
  });
});

// Admin: generate / get share token for an auction
router.post("/auction/:auctionId/share", async (req, res): Promise<void> => {
  const { auctionId } = req.params;
  if (!auctionId) {
    res.status(400).json({ message: "auctionId required" });
    return;
  }

  const [existing] = await db
    .select()
    .from(auctionsTable)
    .where(eq(auctionsTable.id, auctionId));

  if (!existing) {
    res.status(404).json({ message: "Auction not found" });
    return;
  }

  // Return existing token or generate new one
  let token = existing.shareToken;
  if (!token) {
    token =
      Math.random().toString(36).slice(2) +
      Math.random().toString(36).slice(2);
    await db
      .update(auctionsTable)
      .set({ shareToken: token, updatedAt: new Date() })
      .where(eq(auctionsTable.id, auctionId));
  }

  res.json({ shareToken: token });
});

export default router;
