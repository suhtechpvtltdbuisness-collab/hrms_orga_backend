import DepartmentController from "../controllers/departmentController.js";
import { Router } from "express";
import { authenticate, authorizeAdmin } from "../middleware/auth.js";

const departmentRouter = Router();
const departmentController = new DepartmentController();

// 1. Create a Department
departmentRouter.post("/", authenticate, authorizeAdmin, (req, res, next) =>
  departmentController.createDepartment(req, res, next),
);

// 2. Get Dropdown List
departmentRouter.get("/dropdown", authenticate, (req, res, next) =>
  departmentController.getDepartmentsDropdown(req, res, next),
);

// 3. Get Department Stats
departmentRouter.get("/stats", authenticate, authorizeAdmin, (req, res, next) =>
  departmentController.getDepartmentStats(req, res, next),
);

// 4. Get Department by ID
departmentRouter.get("/:id", authenticate, (req, res, next) =>
  departmentController.getDepartmentById(req, res, next),
);

// 5. Get All Departments (with pagination, filtering, search, sorting)
departmentRouter.get("/", authenticate, (req, res, next) =>
  departmentController.getAllDepartments(req, res, next),
);

// 6. Update Department
departmentRouter.put("/:id", authenticate, authorizeAdmin, (req, res, next) =>
  departmentController.updateDepartment(req, res, next),
);

// 7. Update Status
departmentRouter.patch("/:id/status", authenticate, authorizeAdmin, (req, res, next) =>
  departmentController.updateStatus(req, res, next),
);

// 8. Delete Department
departmentRouter.delete("/:id", authenticate, authorizeAdmin, (req, res, next) =>
  departmentController.deleteDepartment(req, res, next),
);

export default departmentRouter;
