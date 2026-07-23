import { Request, Response, NextFunction } from "express";

export class ApiError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Catches errors thrown (or passed via next()) from any route/controller
// and returns a consistent JSON error shape.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.message,
      details: err.details ?? undefined,
    });
  }

  // Prisma unique constraint violation, etc.
  if (typeof err === "object" && err !== null && "code" in err) {
    const prismaErr = err as { code?: string; meta?: unknown };
    if (prismaErr.code === "P2002") {
      return res.status(409).json({
        error: "A record with this value already exists (unique constraint).",
        details: prismaErr.meta,
      });
    }
    if (prismaErr.code === "P2025") {
      return res.status(404).json({ error: "Record not found." });
    }
  }

  console.error("Unhandled error:", err);
  return res.status(500).json({ error: "Internal server error" });
}

// Wraps async route handlers so thrown errors reach errorHandler
// without needing try/catch in every controller.
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
