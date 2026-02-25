import { Router } from "express";
import {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  getEmployeeByUserId,
  updateEmployee,
  deleteEmployee,
} from "../controllers/employeeController.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.post("/", authenticate, createEmployee);
router.get("/", authenticate, getAllEmployees);
router.get("/:id", authenticate, getEmployeeById);
router.get("/user/:userId", authenticate, getEmployeeByUserId);
router.put("/:id", authenticate, updateEmployee);
router.delete("/:id", authenticate, deleteEmployee);

export default router;
