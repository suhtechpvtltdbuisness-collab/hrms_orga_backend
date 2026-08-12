import { Router } from "express";
import { authenticate, authorizeAdmin } from "../middleware/auth.js";
import {
  createBudget,
  createFiscalYear,
  deleteBudget,
  deleteFiscalYear,
  getAccountClassification,
  getBalanceSheet,
  getBudget,
  getBudgetVsActual,
  getCashFlow,
  getFilterOptions,
  getProfitAndLoss,
  getTrialBalance,
  listBudgets,
  listFiscalYears,
  updateAccountClassification,
  updateBudget,
  updateFiscalYear,
} from "../controllers/financialReportsController.js";

const router = Router();

router.use(authenticate, authorizeAdmin);

// Statements
router.get("/profit-and-loss", getProfitAndLoss);
router.get("/balance-sheet", getBalanceSheet);
router.get("/cash-flow", getCashFlow);
router.get("/budget-vs-actual", getBudgetVsActual);
router.get("/trial-balance", getTrialBalance);

// Shared dropdown options for every report screen
router.get("/filters", getFilterOptions);

// Statement mapping for the chart of accounts
router.get("/account-classification", getAccountClassification);
router.patch("/account-classification/:id", updateAccountClassification);

// Fiscal years
router.get("/fiscal-years", listFiscalYears);
router.post("/fiscal-years", createFiscalYear);
router.put("/fiscal-years/:id", updateFiscalYear);
router.delete("/fiscal-years/:id", deleteFiscalYear);

// Budgets
router.get("/budgets", listBudgets);
router.post("/budgets", createBudget);
router.get("/budgets/:id", getBudget);
router.put("/budgets/:id", updateBudget);
router.delete("/budgets/:id", deleteBudget);

export default router;
