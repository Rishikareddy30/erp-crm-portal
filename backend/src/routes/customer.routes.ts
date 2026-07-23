import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../middleware/errorHandler";
import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  addCustomerNote,
  customerSchema,
  customerUpdateSchema,
  noteSchema,
} from "../controllers/customer.controller";

const router = Router();

// All customer routes require auth. Admin, Sales, and Accounts can view;
// Sales and Admin can create/edit (Accounts is read-only for CRM, Warehouse has no access).
router.use(requireAuth);

router.get("/", requireRole("ADMIN", "SALES", "ACCOUNTS"), asyncHandler(listCustomers));
router.get("/:id", requireRole("ADMIN", "SALES", "ACCOUNTS"), asyncHandler(getCustomer));
router.post("/", requireRole("ADMIN", "SALES"), validateBody(customerSchema), asyncHandler(createCustomer));
router.put("/:id", requireRole("ADMIN", "SALES"), validateBody(customerUpdateSchema), asyncHandler(updateCustomer));
router.post("/:id/notes", requireRole("ADMIN", "SALES"), validateBody(noteSchema), asyncHandler(addCustomerNote));

export default router;
