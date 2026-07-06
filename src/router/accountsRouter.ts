import { Router } from "express";
import { authenticate, authorizeAdmin } from "../middleware/auth.js";
import {
  createBankCashAccount,
  createChartAccount,
  createJournalEntry,
  deleteBankCashAccount,
  deleteChartAccount,
  deleteJournalEntry,
  getAccountLedger,
  getBankCashAccounts,
  getChartAccounts,
  getJournalEntries,
  getJournalEntry,
  updateBankCashAccount,
  updateChartAccount,
  updateJournalEntry,
} from "../controllers/accountsController.js";

const router = Router();

router.use(authenticate, authorizeAdmin);

router.get("/chart-of-accounts", getChartAccounts);
router.post("/chart-of-accounts", createChartAccount);
router.put("/chart-of-accounts/:id", updateChartAccount);
router.delete("/chart-of-accounts/:id", deleteChartAccount);
router.get("/chart-of-accounts/:id/ledger", getAccountLedger);

router.get("/bank-and-cash", getBankCashAccounts);
router.post("/bank-and-cash", createBankCashAccount);
router.put("/bank-and-cash/:id", updateBankCashAccount);
router.delete("/bank-and-cash/:id", deleteBankCashAccount);

router.get("/journal-entries", getJournalEntries);
router.get("/journal-entries/:id", getJournalEntry);
router.post("/journal-entries", createJournalEntry);
router.put("/journal-entries/:id", updateJournalEntry);
router.delete("/journal-entries/:id", deleteJournalEntry);

export default router;
