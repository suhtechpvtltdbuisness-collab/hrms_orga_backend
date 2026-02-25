import { Router } from "express";
import {
  createTraining,
  getAllTrainings,
  getTrainingById,
  getTrainingsByEmployeeId,
  updateTraining,
  deleteTraining,
} from "../controllers/trainingController.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.post("/", authenticate, createTraining);
router.get("/", authenticate, getAllTrainings);
router.get("/:id", authenticate, getTrainingById);
router.get("/employee/:empId", authenticate, getTrainingsByEmployeeId);
router.put("/:id", authenticate, updateTraining);
router.delete("/:id", authenticate, deleteTraining);

export default router;
