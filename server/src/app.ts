import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { apiRoutes } from "./modules/index.js";
import { errorHandler } from "./middlewares/errorHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Determine uploads directory
const uploadsDir = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : fs.existsSync(path.resolve(process.cwd(), "uploads"))
    ? path.resolve(process.cwd(), "uploads")
    : path.resolve(__dirname, "../uploads");

// Serve uploaded files
app.use("/api/uploads", express.static(uploadsDir));

// Mount API routes
app.use("/api", apiRoutes);

// Error handling middleware
app.use(errorHandler);

export default app;
