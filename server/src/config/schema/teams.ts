import { pgTable, text, numeric, timestamp, uuid, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const teamsTable = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  logo: text("logo"),
  purseAmount: numeric("purse_amount", { precision: 12, scale: 2 }).notNull(),
  remainingPurse: numeric("remaining_purse", { precision: 12, scale: 2 }).notNull(),
  playersBought: integer("players_bought").notNull().default(0),
  auctionId: uuid("auction_id").notNull(),
  ownerEmail: text("owner_email"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTeamSchema = createInsertSchema(teamsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teamsTable.$inferSelect;
