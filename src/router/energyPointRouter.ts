import { Router } from "express";
import EnergyPointController from "../controllers/energyPointController.js";
import { authenticate, authorizeAdmin } from "../middleware/auth.js";

const energyPointRouter = Router();
const controller = new EnergyPointController();

// Settings (must be before /:id routes on sub-routers)
energyPointRouter.get("/settings", authenticate, (req, res, next) =>
  controller.getSettings(req, res, next),
);
energyPointRouter.put("/settings", authenticate, authorizeAdmin, (req, res, next) =>
  controller.upsertSettings(req, res, next),
);

// Rules
energyPointRouter.post("/rules", authenticate, authorizeAdmin, (req, res, next) =>
  controller.createRule(req, res, next),
);
energyPointRouter.get("/rules", authenticate, (req, res, next) =>
  controller.getAllRules(req, res, next),
);
energyPointRouter.get("/rules/:id", authenticate, (req, res, next) =>
  controller.getRuleById(req, res, next),
);
energyPointRouter.put("/rules/:id", authenticate, authorizeAdmin, (req, res, next) =>
  controller.updateRule(req, res, next),
);
energyPointRouter.delete("/rules/:id", authenticate, authorizeAdmin, (req, res, next) =>
  controller.deleteRule(req, res, next),
);

// Logs
energyPointRouter.post("/logs", authenticate, authorizeAdmin, (req, res, next) =>
  controller.createLog(req, res, next),
);
energyPointRouter.get("/logs", authenticate, (req, res, next) =>
  controller.getAllLogs(req, res, next),
);
energyPointRouter.get("/logs/:id", authenticate, (req, res, next) =>
  controller.getLogById(req, res, next),
);
energyPointRouter.delete("/logs/:id", authenticate, authorizeAdmin, (req, res, next) =>
  controller.deleteLog(req, res, next),
);

export default energyPointRouter;
