import DepartmentController from "../controllers/departmentController.js";
import { Router } from "express";
import { authenticate, authorizeAdmin } from "../middleware/auth.js";

const departmentRouter = Router();
const departmentController = new DepartmentController();

departmentRouter.post("/", authenticate, authorizeAdmin, (req, res, next) =>
  departmentController.createDepartment(req, res, next),
);
departmentRouter.get("/admin/:adminId", authenticate, (req, res, next) =>
  departmentController.getDepartmentsByAdminId(req, res, next),
);
departmentRouter.get("/:id", authenticate, (req, res, next) =>
  departmentController.getDepartmentById(req, res, next),
);
departmentRouter.get("/", authenticate, (req, res, next) =>
  departmentController.getAllDepartments(req, res, next),
);
departmentRouter.put("/:id", authenticate, authorizeAdmin, (req, res, next) =>
  departmentController.updateDepartment(req, res, next),
);

export default departmentRouter;
