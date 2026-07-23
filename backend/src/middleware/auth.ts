import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ApiError } from "./errorHandler";
import { Role } from "@prisma/client";

export interface AuthPayload {
  userId: string;
  role: Role;
  email: string;
}

// Extend Express Request to carry the authenticated user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw new ApiError(401, "Missing or invalid Authorization header");
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    throw new ApiError(401, "Invalid or expired token");
  }
}

// Usage: requireRole("ADMIN", "SALES")
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ApiError(401, "Not authenticated");
    }
    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, `This action requires one of these roles: ${roles.join(", ")}`);
    }
    next();
  };
}
