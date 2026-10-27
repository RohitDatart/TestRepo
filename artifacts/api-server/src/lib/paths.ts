import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getUploadsDir(): string {
  if (process.env.UPLOADS_DIR) {
    const dir = path.resolve(process.env.UPLOADS_DIR);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  const candidates = [
    path.resolve(process.cwd(), "artifacts/api-server/uploads"),
    path.resolve(process.cwd(), "uploads"),
    path.resolve(__dirname, "../uploads"),
    path.resolve(__dirname, "../../uploads"),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }

  const fallback = candidates[0];
  if (!fs.existsSync(fallback)) fs.mkdirSync(fallback, { recursive: true });
  return fallback;
}

export function getStaticDir(): string | null {
  const candidates = [
    path.resolve(process.cwd(), "artifacts/sports-auction/dist/public"),
    path.resolve(__dirname, "../../sports-auction/dist/public"),
    path.resolve(__dirname, "../sports-auction/dist/public"),
    path.resolve(__dirname, "public"),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c) && fs.existsSync(path.join(c, "index.html"))) {
      return c;
    }
  }

  return null;
}
