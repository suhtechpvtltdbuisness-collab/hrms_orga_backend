import { Router } from "express";
import ShiftTypeController from "../controllers/shiftTypeController.js";
import { authenticate } from "../middleware/auth.js";

const shiftTypeRouter = Router();
const shiftTypeController = new ShiftTypeController();

shiftTypeRouter.post("/", authenticate, (req, res, next) =>
  shiftTypeController.createShiftType(req, res, next),
);
shiftTypeRouter.get("/", authenticate, (req, res, next) =>
  shiftTypeController.getAllShiftTypes(req, res, next),
);
shiftTypeRouter.get("/:id", authenticate, (req, res, next) =>
  shiftTypeController.getShiftTypeById(req, res, next),
);
shiftTypeRouter.put("/:id", authenticate, (req, res, next) =>
  shiftTypeController.updateShiftType(req, res, next),
);

export default shiftTypeRouter;
