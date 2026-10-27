import { pgTable, text, numeric, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const playersTable = pgTable("players", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  basePrice: numeric("base_price", { precision: 12, scale: 2 }).notNull(),
  age: integer("age"),
  city: text("city"),
  photoUrl: text("photo_url"),
  auctionId: uuid("auction_id").notNull(),
  teamId: uuid("team_id"),
  soldPrice: numeric("sold_price", { precision: 12, scale: 2 }),
  status: text("status").notNull().default("available"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPlayerSchema = createInsertSchema(playersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof playersTable.$inferSelect;
