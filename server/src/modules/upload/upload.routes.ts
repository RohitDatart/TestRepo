import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { authenticate } from "../../middlewares/authenticate.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads folder exists in server directory
const uploadsDir = process.env.UPLOADS_DIR 
  ? path.resolve(process.env.UPLOADS_DIR)
  : fs.existsSync(path.resolve(process.cwd(), "uploads"))
    ? path.resolve(process.cwd(), "uploads")
    : path.resolve(__dirname, "../../../uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export { uploadsDir };

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    cb(null, allowed.includes(file.mimetype));
  },
});

const router: IRouter = Router();

router.post("/upload/image", authenticate, upload.single("image"), (req, res): void => {
  if (!req.file) {
    res.status(400).json({ message: "No image file provided or invalid file type" });
    return;
  }
  const url = `/api/uploads/${req.file.filename}`;
  res.json({ url, filename: req.file.filename });
});

export default router;
