import { Router, type IRouter } from "express";
import { db, playersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import multer from "multer";
import csvParser from "csv-parser";
import { Readable } from "stream";
import {
  authenticate,
  requireAdmin,
  type AuthRequest,
} from "../middlewares/authenticate.js";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

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

router.post(
  "/player/add",
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res): Promise<void> => {
    const { name, role, basePrice, age, city, photoUrl, auctionId } = req.body;
    if (!name || !role || !basePrice || !auctionId) {
      res
        .status(400)
        .json({ message: "name, role, basePrice, auctionId required" });
      return;
    }

    const [player] = await db
      .insert(playersTable)
      .values({
        name,
        role,
        basePrice: String(basePrice),
        age: age ? Number(age) : null,
        city,
        photoUrl,
        auctionId,
        status: "available",
      })
      .returning();

    res.status(201).json(formatPlayer(player));
  },
);

router.get(
  "/player/:auctionId",
  authenticate,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.auctionId)
      ? req.params.auctionId[0]
      : req.params.auctionId;
    const players = await db
      .select()
      .from(playersTable)
      .where(eq(playersTable.auctionId, raw));
    res.json(players.map(formatPlayer));
  },
);

router.patch(
  "/player/:playerId/re-add",
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res): Promise<void> => {
    const rawPlayerId = req.params.playerId;
    const playerId = Array.isArray(rawPlayerId) ? rawPlayerId[0] : rawPlayerId;
    if (!playerId) {
      res.status(400).json({ message: "Player ID is required" });
      return;
    }
    const [updated] = await db
      .update(playersTable)
      .set({ status: "available", teamId: null, soldPrice: null })
      .where(eq(playersTable.id, playerId))
      .returning();
    if (!updated) {
      res.status(404).json({ message: "Player not found" });
      return;
    }
    res.json(formatPlayer(updated));
  },
);

router.post(
  "/player/bulk-upload",
  authenticate,
  requireAdmin,
  upload.single("file"),
  async (req: AuthRequest, res): Promise<void> => {
    const { auctionId, basePrice } = req.body;
    if (!auctionId) {
      res.status(400).json({ message: "auctionId required" });
      return;
    }
    if (!req.file) {
      res.status(400).json({ message: "CSV file required" });
      return;
    }

    const defaultBasePrice = basePrice ? String(basePrice) : "200";
    const rows: Array<{
      name: string;
      role: string;
      city?: string;
      photoUrl?: string;
      basePrice?: string;
    }> = [];

    await new Promise<void>((resolve, reject) => {
      const stream = Readable.from(req.file!.buffer);
      stream
        .pipe(csvParser())
        .on("data", (row: Record<string, string>) => {
          rows.push({
            name: row["name"] || row["Name"] || "",
            role: row["role"] || row["Role"] || "Player",
            city: row["city"] || row["City"] || undefined,
            photoUrl:
              row["photoUrl"] ||
              row["photo_url"] ||
              row["PhotoUrl"] ||
              undefined,
            basePrice: row["basePrice"] || row["base_price"] || undefined,
          });
        })
        .on("end", () => resolve())
        .on("error", reject);
    });

    const validRows = rows.filter((r) => r.name.trim());
    const inserted = await db
      .insert(playersTable)
      .values(
        validRows.map((r) => ({
          name: r.name,
          role: r.role,
          basePrice: r.basePrice ? String(r.basePrice) : defaultBasePrice,
          city: r.city || null,
          photoUrl: r.photoUrl || null,
          auctionId,
          status: "available" as const,
        })),
      )
      .returning();

    res.status(201).json({
      count: inserted.length,
      players: inserted.map(formatPlayer),
    });
  },
);

export default router;
