import { Router } from "express";
import AppraisalController from "../controllers/appraisalController.js";
import { authenticate, authorizeAdmin } from "../middleware/auth.js";

const appraisalRouter = Router();
const controller = new AppraisalController();

appraisalRouter.post("/", authenticate, authorizeAdmin, (req, res, next) =>
  controller.create(req, res, next),
);

appraisalRouter.get("/", authenticate, (req, res, next) =>
  controller.getAll(req, res, next),
);

appraisalRouter.get("/:id", authenticate, (req, res, next) =>
  controller.getById(req, res, next),
);

appraisalRouter.put("/:id", authenticate, authorizeAdmin, (req, res, next) =>
  controller.update(req, res, next),
);

appraisalRouter.delete("/:id", authenticate, authorizeAdmin, (req, res, next) =>
  controller.delete(req, res, next),
);

export default appraisalRouter;
