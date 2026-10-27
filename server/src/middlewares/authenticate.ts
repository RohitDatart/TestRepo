import type { Response, NextFunction } from "express";
import { extractToken, verifyToken } from "../utils/auth.js";
import type { AuthRequest } from "../types/index.js";

export type { AuthRequest };

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ message: "No token provided" });
    return;
  }
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== "admin") {
    res.status(403).json({ message: "Admin access required" });
    return;
  }
  next();
}
