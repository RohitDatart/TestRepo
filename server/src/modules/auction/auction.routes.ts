import { Router, type IRouter } from "express";
import { db, auctionsTable, teamsTable, playersTable } from "../../config/db.js";
import { eq } from "drizzle-orm";
import { authenticate, requireAdmin, type AuthRequest } from "../../middlewares/authenticate.js";

const router: IRouter = Router();

function formatAuction(a: typeof auctionsTable.$inferSelect) {
  return {
    id: a.id,
    name: a.name,
    description: a.description,
    logo: a.logo,
    auctionStatus: a.auctionStatus,
    createdBy: a.createdBy,
    createdAt: a.createdAt,
    auctionDate: a.auctionDate,
    pointsPerTeam: a.pointsPerTeam ? Number(a.pointsPerTeam) : null,
    playersPerTeam: a.playersPerTeam,
    minimumBid: a.minimumBid ? Number(a.minimumBid) : null,
    bidIncreaseBy: a.bidIncreaseBy ? Number(a.bidIncreaseBy) : null,
  };
}

router.post("/auction/create", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const { name, description, logo, auctionDate, pointsPerTeam, playersPerTeam, minimumBid, bidIncreaseBy } = req.body;
  if (!name) {
    res.status(400).json({ message: "Auction name required" });
    return;
  }

  const [auction] = await db.insert(auctionsTable).values({
    name,
    description,
    logo,
    auctionDate: auctionDate ? new Date(auctionDate) : null,
    pointsPerTeam: pointsPerTeam ? String(pointsPerTeam) : null,
    playersPerTeam: playersPerTeam ? Number(playersPerTeam) : null,
    minimumBid: minimumBid ? String(minimumBid) : null,
    bidIncreaseBy: bidIncreaseBy ? String(bidIncreaseBy) : null,
    createdBy: req.user!.id,
    auctionStatus: "pending",
  }).returning();

  res.status(201).json(formatAuction(auction));
});

router.get("/auction/list", authenticate, async (_req, res): Promise<void> => {
  const auctions = await db.select().from(auctionsTable).orderBy(auctionsTable.createdAt);
  res.json(auctions.map(formatAuction));
});

router.put("/auction/start", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const { auctionId } = req.body;
  if (!auctionId) {
    res.status(400).json({ message: "auctionId required" });
    return;
  }

  const [auction] = await db.update(auctionsTable)
    .set({ auctionStatus: "active", updatedAt: new Date() })
    .where(eq(auctionsTable.id, auctionId))
    .returning();

  if (!auction) {
    res.status(404).json({ message: "Auction not found" });
    return;
  }

  res.json(formatAuction(auction));
});

router.put("/auction/stop", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const { auctionId } = req.body;
  if (!auctionId) {
    res.status(400).json({ message: "auctionId required" });
    return;
  }

  const [auction] = await db.update(auctionsTable)
    .set({ auctionStatus: "completed", updatedAt: new Date() })
    .where(eq(auctionsTable.id, auctionId))
    .returning();

  if (!auction) {
    res.status(404).json({ message: "Auction not found" });
    return;
  }

  res.json(formatAuction(auction));
});

router.get("/auction/:id", authenticate, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [auction] = await db.select().from(auctionsTable).where(eq(auctionsTable.id, raw));
  if (!auction) {
    res.status(404).json({ message: "Auction not found" });
    return;
  }

  const teams = await db.select().from(teamsTable).where(eq(teamsTable.auctionId, raw));
  const players = await db.select().from(playersTable).where(eq(playersTable.auctionId, raw));

  res.json({
    ...formatAuction(auction),
    currentPlayer: auction.currentPlayer,
    teams: teams.map(t => ({
      id: t.id,
      name: t.name,
      logo: t.logo,
      purseAmount: Number(t.purseAmount),
      remainingPurse: Number(t.remainingPurse),
      playersBought: t.playersBought,
      auctionId: t.auctionId,
      ownerEmail: t.ownerEmail,
    })),
    playerPool: players.map(p => ({
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
    })),
  });
});

export default router;
