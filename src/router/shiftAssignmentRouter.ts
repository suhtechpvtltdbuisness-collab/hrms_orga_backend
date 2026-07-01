import { Router } from "express";
import {
  deleteShiftAssignment,
  getEmployeeShiftHistory,
  getShiftRoster,
  saveShiftRoster,
} from "../controllers/shiftAssignmentController.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.get("/", authenticate, getShiftRoster);
router.put("/roster", authenticate, saveShiftRoster);
router.post("/bulk", authenticate, saveShiftRoster);
router.get("/employee/:employeeId", authenticate, getEmployeeShiftHistory);
router.delete("/:id", authenticate, deleteShiftAssignment);

export default router;
