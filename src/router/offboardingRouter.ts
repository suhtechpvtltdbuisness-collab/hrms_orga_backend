import { Router } from "express";
import {
  createOffboarding,
  getAllOffboardings,
  getOffboardingById,
  getOffboardingsByEmployeeId,
  updateOffboarding,
  deleteOffboarding,
} from "../controllers/offboardingController.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.post("/", authenticate, createOffboarding);
router.get("/", authenticate, getAllOffboardings);
router.get("/:id", authenticate, getOffboardingById);
router.get("/employee/:empId", authenticate, getOffboardingsByEmployeeId);
router.put("/:id", authenticate, updateOffboarding);
router.delete("/:id", authenticate, deleteOffboarding);

export default router;
