import { Router } from "express";
import {
  getFaceStatus,
  registerFace,
  verifyFace,
  verifyFaceAndMarkAttendance,
  verifyPasswordAndMarkAttendance,
} from "../controllers/faceBiometricController.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();
router.use(authenticate);
router.get("/status", getFaceStatus);
router.post("/register", registerFace);
router.post("/verify", verifyFace);
// Keep verification and the resulting attendance mutation in one request so the
// client cannot forge the outcome of a separate verification request.
router.post("/attendance", verifyFaceAndMarkAttendance);
router.post("/password-attendance", verifyPasswordAndMarkAttendance);

export default router;
