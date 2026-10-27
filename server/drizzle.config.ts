import { defineConfig } from "drizzle-kit";
import path from "path";
import fs from "fs";

try {
  if (typeof process.loadEnvFile === "function") {
    const candidates = [
      path.resolve(process.cwd(), ".env"),
      path.resolve(process.cwd(), "../.env"),
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
  throw new Error("DATABASE_URL must be set. Please check your .env file or environment variables.");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/config/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
