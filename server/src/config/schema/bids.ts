import { pgTable, numeric, timestamp, uuid, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bidsTable = pgTable("bids", {
  id: uuid("id").primaryKey().defaultRandom(),
  auctionId: uuid("auction_id").notNull(),
  playerId: uuid("player_id").notNull(),
  teamId: uuid("team_id").notNull(),
  teamName: text("team_name").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBidSchema = createInsertSchema(bidsTable).omit({ id: true, createdAt: true });
export type InsertBid = z.infer<typeof insertBidSchema>;
export type Bid = typeof bidsTable.$inferSelect;
