import http from "http";
import fs from "fs";
import path from "path";
import app from "./app.js";
import { setupSocket } from "./socket/auctionSocket.js";

// Load .env if present
try {
  if (typeof process.loadEnvFile === "function") {
    const candidates = [
      path.resolve(process.cwd(), ".env"),
      path.resolve(process.cwd(), "../../.env"),
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

const port = Number(process.env["PORT"]) || 8080;

const httpServer = http.createServer(app);
setupSocket(httpServer);

httpServer.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
