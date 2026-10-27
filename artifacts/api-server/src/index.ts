import "./env.js";
import http from "http";
import app from "./app.js";
import { setupSocket } from "./socket/auctionSocket.js";

const port = Number(process.env["PORT"]) || 8080;

const httpServer = http.createServer(app);
setupSocket(httpServer);

httpServer.listen(port, () => {
  console.log(`🚀 Backend API running at http://localhost:${port}/api`);
  console.log(`🌐 Frontend Web App available at http://localhost:${port}/`);
});
