import fs from "fs";
import path from "path";

try {
  if (typeof process.loadEnvFile === "function") {
    const dir = typeof __dirname !== "undefined"
      ? __dirname
      : (typeof import.meta !== "undefined" && typeof import.meta.dirname === "string" ? import.meta.dirname : "");
    const candidates = [
      path.resolve(process.cwd(), ".env"),
      path.resolve(process.cwd(), "../../.env"),
      dir ? path.resolve(dir, "../../../.env") : "",
      dir ? path.resolve(dir, "../../.env") : "",
      dir ? path.resolve(dir, "../.env") : "",
    ].filter(Boolean);
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
