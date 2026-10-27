import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import router from "./routes/index.js";
import { getUploadsDir, getStaticDir } from "./lib/paths.js";

const app: Express = express();

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use("/api/uploads", express.static(getUploadsDir()));

app.use("/api", router);

// Serve frontend in production/standalone if built
const staticDir = getStaticDir();
if (staticDir) {
  app.use(express.static(staticDir));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.join(staticDir, "index.html"));
  });
}

export default app;
