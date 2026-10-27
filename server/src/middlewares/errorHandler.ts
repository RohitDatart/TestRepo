import type { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error("Unhandled error:", err);
  const status = (err as any).status || 500;
  res.status(status).json({
    message: err.message || "Internal server error",
  });
}
