import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { env } from "./env.js";
import * as schema from "./schema/index.js";

const { Pool } = pg;

if (!env.DATABASE_URL) {
  console.warn("DATABASE_URL is not set. Please check your .env file or environment variables.");
}

export const pool = new Pool({ connectionString: env.DATABASE_URL });
export const db = drizzle(pool, { schema });

export * from "./schema/index.js";
