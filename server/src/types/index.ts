import type { Request } from "express";
import type { JwtPayload } from "../utils/auth.js";

export type { JwtPayload };

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export * from "@workspace/shared";
