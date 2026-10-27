import { pgTable, text, timestamp, uuid, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const auctionsTable = pgTable("auctions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  logo: text("logo"),
  auctionStatus: text("auction_status").notNull().default("pending"),
  currentPlayer: text("current_player"),
  auctionDate: timestamp("auction_date", { withTimezone: true }),
  pointsPerTeam: numeric("points_per_team", { precision: 12, scale: 2 }),
  playersPerTeam: integer("players_per_team"),
  minimumBid: numeric("minimum_bid", { precision: 12, scale: 2 }),
  bidIncreaseBy: numeric("bid_increase_by", { precision: 12, scale: 2 }),
  createdBy: uuid("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAuctionSchema = createInsertSchema(auctionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAuction = z.infer<typeof insertAuctionSchema>;
export type Auction = typeof auctionsTable.$inferSelect;
