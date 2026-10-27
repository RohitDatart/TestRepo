import { Router, type IRouter } from "express";
import { db, bidsTable } from "../../config/db.js";
import { eq } from "drizzle-orm";
import { authenticate } from "../../middlewares/authenticate.js";

const router: IRouter = Router();

router.get("/bid/history/:auctionId", authenticate, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.auctionId) ? req.params.auctionId[0] : req.params.auctionId;
  const bids = await db.select().from(bidsTable)
    .where(eq(bidsTable.auctionId, raw))
    .orderBy(bidsTable.createdAt);

  res.json(bids.map(b => ({
    id: b.id,
    auctionId: b.auctionId,
    playerId: b.playerId,
    teamId: b.teamId,
    teamName: b.teamName,
    amount: Number(b.amount),
    createdAt: b.createdAt,
  })));
});

export default router;
