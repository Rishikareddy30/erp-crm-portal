import { Router } from "express";
import { login, createUser, loginSchema, createUserSchema, me } from "../controllers/auth.controller";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../middleware/errorHandler";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.post("/login", validateBody(loginSchema), asyncHandler(login));
router.get("/me", requireAuth, asyncHandler(me));

// Admin-only endpoint to provision new employee accounts
router.post(
  "/users",
  requireAuth,
  requireRole("ADMIN"),
  validateBody(createUserSchema),
  asyncHandler(createUser)
);

export default router;
