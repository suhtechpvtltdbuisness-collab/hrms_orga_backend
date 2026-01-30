import { Router } from "express";
import DesignationController from "../controllers/desiganationController.js";
const desiganationRouter = Router();
const designationController = new DesignationController();

desiganationRouter.post("/", (req, res, next) =>
  designationController.createDesignation(req, res, next),
);
desiganationRouter.get("/:id", (req, res, next) =>
  designationController.getDesignationById(req, res, next),
);
desiganationRouter.get("/", (req, res, next) =>
  designationController.getAllDesignations(req, res, next),
);
desiganationRouter.put("/:id", (req, res, next) =>
  designationController.updateDesignation(req, res, next),
);

export default desiganationRouter;
