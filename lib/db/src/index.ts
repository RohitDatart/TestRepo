import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import fs from "fs";
import path from "path";
import * as schema from "./schema";

const { Pool } = pg;

try {
  if (typeof process.loadEnvFile === "function") {
    const candidates = [
      path.resolve(process.cwd(), ".env"),
      path.resolve(process.cwd(), "../../.env"),
      path.resolve(import.meta.dirname, "../../../.env"),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        process.loadEnvFile(p);
        break;
      }
    }
  }
} catch {
  // Ignore error if .env doesn't exist
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Please check your .env file or environment variables.",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

export * from "./schema";
