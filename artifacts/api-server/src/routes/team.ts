import { Router, type IRouter } from "express";
import { db, teamsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authenticate, requireAdmin, type AuthRequest } from "../middlewares/authenticate.js";

const router: IRouter = Router();

function formatTeam(t: typeof teamsTable.$inferSelect) {
  return {
    id: t.id,
    name: t.name,
    logo: t.logo,
    purseAmount: Number(t.purseAmount),
    remainingPurse: Number(t.remainingPurse),
    playersBought: t.playersBought || 0,
    auctionId: t.auctionId,
    ownerEmail: t.ownerEmail,
  };
}

router.post("/team/create", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const { name, logo, purseAmount, auctionId, ownerEmail } = req.body;
  if (!name || !purseAmount || !auctionId) {
    res.status(400).json({ message: "name, purseAmount, auctionId required" });
    return;
  }

  const [team] = await db.insert(teamsTable).values({
    name,
    logo,
    purseAmount: String(purseAmount),
    remainingPurse: String(purseAmount),
    auctionId,
    ownerEmail,
  }).returning();

  res.status(201).json(formatTeam(team));
});

router.get("/team/:auctionId", authenticate, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.auctionId) ? req.params.auctionId[0] : req.params.auctionId;
  const teams = await db.select().from(teamsTable).where(eq(teamsTable.auctionId, raw));
  res.json(teams.map(formatTeam));
});

router.put("/team/update", authenticate, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const { id, name, logo, purseAmount } = req.body;
  if (!id) {
    res.status(400).json({ message: "id required" });
    return;
  }

  const updates: Partial<typeof teamsTable.$inferInsert> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name;
  if (logo !== undefined) updates.logo = logo;
  if (purseAmount !== undefined) updates.purseAmount = String(purseAmount);

  const [team] = await db.update(teamsTable)
    .set(updates)
    .where(eq(teamsTable.id, id))
    .returning();

  if (!team) {
    res.status(404).json({ message: "Team not found" });
    return;
  }

  res.json(formatTeam(team));
});

export default router;
