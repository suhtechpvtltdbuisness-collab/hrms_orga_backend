import { Router } from "express";
import {
  createAttendance,
  getAllAttendances,
  getAttendanceById,
  getAttendancesByEmployeeId,
  updateAttendance,
  deleteAttendance,
} from "../controllers/attendanceController.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.post("/", authenticate, createAttendance);
router.get("/", authenticate, getAllAttendances);
router.get("/:id", authenticate, getAttendanceById);
router.get("/employee/:empId", authenticate, getAttendancesByEmployeeId);
router.put("/:id", authenticate, updateAttendance);
router.delete("/:id", authenticate, deleteAttendance);

export default router;
