import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../middleware/errorHandler";
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  addStockMovement,
  productSchema,
  productUpdateSchema,
  stockMovementSchema,
} from "../controllers/product.controller";

const router = Router();

router.use(requireAuth);

// Everyone can view products/stock
router.get("/", asyncHandler(listProducts));
router.get("/:id", asyncHandler(getProduct));

// Only Admin and Warehouse manage the product catalog and stock
router.post("/", requireRole("ADMIN", "WAREHOUSE"), validateBody(productSchema), asyncHandler(createProduct));
router.put("/:id", requireRole("ADMIN", "WAREHOUSE"), validateBody(productUpdateSchema), asyncHandler(updateProduct));
router.post(
  "/:id/stock-movements",
  requireRole("ADMIN", "WAREHOUSE"),
  validateBody(stockMovementSchema),
  asyncHandler(addStockMovement)
);

export default router;
