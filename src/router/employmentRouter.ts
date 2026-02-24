import { Router } from "express";
import EmploymentController from "../controllers/employmentController.js";
import { authenticate } from "../middleware/auth.js";

const employmentRouter = Router();
const employmentController = new EmploymentController();

// Create employment record
employmentRouter.post("/", authenticate, (req, res, next) =>
  employmentController.createEmployment(req, res, next),
);

// Get all employment records
employmentRouter.get("/", authenticate, (req, res, next) =>
  employmentController.getAllEmployments(req, res, next),
);

// Get employment record by ID
employmentRouter.get("/:id", authenticate, (req, res, next) =>
  employmentController.getEmploymentById(req, res, next),
);

// Get employment records by employee ID
employmentRouter.get("/employee/:employeeId", authenticate, (req, res, next) =>
  employmentController.getEmploymentsByEmployeeId(req, res, next),
);

// Get employment records by department ID
employmentRouter.get(
  "/department/:departmentId",
  authenticate,
  (req, res, next) =>
    employmentController.getEmploymentsByDepartmentId(req, res, next),
);

// Update employment record
employmentRouter.put("/:id", authenticate, (req, res, next) =>
  employmentController.updateEmployment(req, res, next),
);

// Delete employment record
employmentRouter.delete("/:id", authenticate, (req, res, next) =>
  employmentController.deleteEmployment(req, res, next),
);

export default employmentRouter;
