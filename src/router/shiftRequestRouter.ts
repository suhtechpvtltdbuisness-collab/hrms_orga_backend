import { Router } from "express";
import ShiftRequestController from "../controllers/shiftRequestController.js";
import { authenticate } from "../middleware/auth.js";

const shiftRequestRouter = Router();
const shiftRequestController = new ShiftRequestController();

shiftRequestRouter.post("/", authenticate, (req, res, next) =>
  shiftRequestController.createShiftRequest(req, res, next),
);
shiftRequestRouter.get("/", authenticate, (req, res, next) =>
  shiftRequestController.getShiftRequests(req, res, next),
);
shiftRequestRouter.get("/:id", authenticate, (req, res, next) =>
  shiftRequestController.getShiftRequestById(req, res, next),
);
shiftRequestRouter.patch("/:id/approve", authenticate, (req, res, next) =>
  shiftRequestController.approveShiftRequest(req, res, next),
);
shiftRequestRouter.patch("/:id/reject", authenticate, (req, res, next) =>
  shiftRequestController.rejectShiftRequest(req, res, next),
);

export default shiftRequestRouter;
