import { Router } from "express";
import {
  createAttendance,
  getAllAttendances,
  getAttendanceById,
  getAttendancesByEmployeeId,
  getEmployeeAttendanceInfo,
  getNextSeries,
  getUnmarkedDates,
  markAttendanceBulk,
  markSelfAttendance,
  updateAttendance,
  deleteAttendance,
  checkInSelf,
  checkOutSelf,
  getMyAttendance,
  getTodayStatus,
} from "../controllers/attendanceController.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.get("/today-status", authenticate, getTodayStatus);
router.post("/check-in", authenticate, checkInSelf);
router.post("/check-out", authenticate, checkOutSelf);
router.get("/my-attendance", authenticate, getMyAttendance);
router.post("/self", authenticate, markSelfAttendance);
router.post("/mark", authenticate, markAttendanceBulk);
router.get("/unmarked", authenticate, getUnmarkedDates);
router.get("/next-series", authenticate, getNextSeries);
router.get("/employee-info/:empId", authenticate, getEmployeeAttendanceInfo);
router.get("/employee/:empId", authenticate, getAttendancesByEmployeeId);
router.post("/", authenticate, createAttendance);
router.get("/", authenticate, getAllAttendances);
router.get("/:id", authenticate, getAttendanceById);
router.put("/:id", authenticate, updateAttendance);
router.delete("/:id", authenticate, deleteAttendance);

export default router;
