import { Router } from "express";
import {
  createPerformance,
  getAllPerformances,
  getPerformanceById,
  getPerformancesByEmployeeId,
  updatePerformance,
  deletePerformance,
} from "../controllers/performanceController.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.post("/", authenticate, createPerformance);
router.get("/", authenticate, getAllPerformances);
router.get("/:id", authenticate, getPerformanceById);
router.get("/employee/:empId", authenticate, getPerformancesByEmployeeId);
router.put("/:id", authenticate, updatePerformance);
router.delete("/:id", authenticate, deletePerformance);

export default router;
