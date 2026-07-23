import { Router } from "express";
import {
  approveAttendanceRequest,
  createAttendanceRequest,
  getAttendanceRequests,
  rejectAttendanceRequest,
} from "../controllers/attendanceRequestController.js";
import { authenticate } from "../middleware/auth.js";

const attendanceRequestRouter = Router();

attendanceRequestRouter.get("/", authenticate, getAttendanceRequests);
attendanceRequestRouter.post("/", authenticate, createAttendanceRequest);
attendanceRequestRouter.patch("/:id/approve", authenticate, approveAttendanceRequest);
attendanceRequestRouter.patch("/:id/reject", authenticate, rejectAttendanceRequest);

export default attendanceRequestRouter;
