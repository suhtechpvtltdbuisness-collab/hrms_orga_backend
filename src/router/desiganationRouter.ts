import { Router } from "express";
import DesignationController from "../controllers/desiganationController.js";
import { authenticate, authorizeAdmin } from "../middleware/auth.js";
import { de } from "zod/locales";
const desiganationRouter = Router();
const designationController = new DesignationController();

desiganationRouter.post("/", authenticate, authorizeAdmin, (req, res, next) =>
  designationController.createDesignation(req, res, next),
);
desiganationRouter.get("/:id", authenticate, (req, res, next) =>
  designationController.getDesignationById(req, res, next),
);
desiganationRouter.get("/", authenticate, (req, res, next) =>
  designationController.getAllDesignations(req, res, next),
);
desiganationRouter.put("/:id", authenticate, authorizeAdmin, (req, res, next) =>
  designationController.updateDesignation(req, res, next),
);
desiganationRouter.get("/admin/:adminId", authenticate, (req, res, next) =>
  designationController.getDesignationsByAdminId(req, res, next),
);

export default desiganationRouter;
