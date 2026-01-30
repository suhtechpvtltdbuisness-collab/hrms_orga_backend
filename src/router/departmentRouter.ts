import { DefaultDeserializer } from "node:v8";
import DepartmentController from "../controllers/departmentController.js";
import { Router } from "express";
import { de } from "zod/locales";

const departmentRouter = Router();
const departmentController = new DepartmentController();

departmentRouter.post("/", (req, res, next) =>
  departmentController.createDepartment(req, res, next),
);
departmentRouter.get("/:id", (req, res, next) =>
  departmentController.getDepartmentById(req, res, next),
);
departmentRouter.get("/", (req, res, next) =>
  departmentController.getAllDepartments(req, res, next),
);
departmentRouter.put("/:id", (req, res, next) =>
  departmentController.updateDepartment(req, res, next),
);

export default departmentRouter;
