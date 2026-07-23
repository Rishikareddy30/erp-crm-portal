import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../middleware/errorHandler";
import {
  listChallans,
  getChallan,
  createChallan,
  updateChallanItems,
  confirmChallan,
  cancelChallan,
  exportChallanPdf,
  createChallanSchema,
  updateChallanItemsSchema,
} from "../controllers/challan.controller";

const router = Router();

router.use(requireAuth);

// Admin, Sales, Warehouse, Accounts can all view challans (different teams need visibility)
router.get("/", asyncHandler(listChallans));
router.get("/:id", asyncHandler(getChallan));
router.get("/:id/pdf", asyncHandler(exportChallanPdf));

// Only Sales and Admin create/edit challans
router.post("/", requireRole("ADMIN", "SALES"), validateBody(createChallanSchema), asyncHandler(createChallan));
router.put(
  "/:id/items",
  requireRole("ADMIN", "SALES"),
  validateBody(updateChallanItemsSchema),
  asyncHandler(updateChallanItems)
);
router.post("/:id/confirm", requireRole("ADMIN", "SALES"), asyncHandler(confirmChallan));
router.post("/:id/cancel", requireRole("ADMIN", "SALES"), asyncHandler(cancelChallan));

export default router;
