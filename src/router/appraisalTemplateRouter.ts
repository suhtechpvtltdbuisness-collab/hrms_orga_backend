import { Router } from "express";
import AppraisalTemplateController from "../controllers/appraisalTemplateController.js";
import { authenticate, authorizeAdmin } from "../middleware/auth.js";

const appraisalTemplateRouter = Router();
const controller = new AppraisalTemplateController();

appraisalTemplateRouter.post("/", authenticate, authorizeAdmin, (req, res, next) =>
  controller.create(req, res, next),
);

appraisalTemplateRouter.get("/dropdown", authenticate, (req, res, next) =>
  controller.getDropdown(req, res, next),
);

appraisalTemplateRouter.get("/", authenticate, (req, res, next) =>
  controller.getAll(req, res, next),
);

appraisalTemplateRouter.get("/:id", authenticate, (req, res, next) =>
  controller.getById(req, res, next),
);

appraisalTemplateRouter.put("/:id", authenticate, authorizeAdmin, (req, res, next) =>
  controller.update(req, res, next),
);

appraisalTemplateRouter.delete("/:id", authenticate, authorizeAdmin, (req, res, next) =>
  controller.delete(req, res, next),
);

export default appraisalTemplateRouter;
