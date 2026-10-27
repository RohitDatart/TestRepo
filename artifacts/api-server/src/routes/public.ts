import { Router } from "express";
import { db, auctionsTable, teamsTable, playersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// Public endpoint — no authentication required.
// Returns enough data for the read-only viewer page.
router.get("/public/auction/:id", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const [auction] = await db
    .select()
    .from(auctionsTable)
    .where(eq(auctionsTable.id, id));

  if (!auction) {
    res.status(404).json({ message: "Auction not found" });
    return;
  }

  const teams = await db
    .select()
    .from(teamsTable)
    .where(eq(teamsTable.auctionId, id));

  const players = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.auctionId, id));

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
      playersBought: t.playersBought,
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

export default router;
