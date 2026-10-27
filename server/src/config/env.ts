import fs from "fs";
import path from "path";

// Attempt to load .env using process.loadEnvFile if available
try {
  if (typeof process.loadEnvFile === "function") {
    const candidates = [
      path.resolve(process.cwd(), ".env"),
      path.resolve(process.cwd(), "../.env"),
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

export const env = {
  PORT: Number(process.env["PORT"]) || 8080,
  DATABASE_URL: process.env["DATABASE_URL"] || "",
  JWT_SECRET: process.env["JWT_SECRET"] || "sports-auction-secret-key-2024",
  NODE_ENV: process.env["NODE_ENV"] || "development",
};
