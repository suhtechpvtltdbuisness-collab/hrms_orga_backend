import { Router } from "express";
import { authenticate, authorizeAdmin } from "../middleware/auth.js";
import {
  createCategory,
  createExpense,
  deleteCategory,
  deleteExpense,
  getExpense,
  listCategories,
  listExpenses,
  updateCategory,
  updateExpense,
  updateExpenseStatus,
} from "../controllers/expenseController.js";

const router = Router();

router.use(authenticate, authorizeAdmin);

router.get("/categories", listCategories);
router.post("/categories", createCategory);
router.put("/categories/:id", updateCategory);
router.delete("/categories/:id", deleteCategory);

router.get("/", listExpenses);
router.get("/:id", getExpense);
router.post("/", createExpense);
router.put("/:id", updateExpense);
router.patch("/:id/status", updateExpenseStatus);
router.delete("/:id", deleteExpense);

export default router;
