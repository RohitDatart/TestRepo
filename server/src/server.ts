import http from "http";
import app from "./app.js";
import { setupSocket } from "./modules/socket/auctionSocket.js";
import { env } from "./config/env.js";

const port = env.PORT;

const httpServer = http.createServer(app);
setupSocket(httpServer);

httpServer.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

export { httpServer };
