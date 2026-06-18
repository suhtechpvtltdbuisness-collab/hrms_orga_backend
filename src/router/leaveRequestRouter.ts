import { Router } from "express";
import LeaveRequestController from "../controllers/leaveRequestController.js";
import { authenticate } from "../middleware/auth.js";

const leaveRequestRouter = Router();
const leaveRequestController = new LeaveRequestController();

leaveRequestRouter.post("/", authenticate, (req, res, next) =>
  leaveRequestController.createLeaveRequest(req, res, next),
);
leaveRequestRouter.get("/", authenticate, (req, res, next) =>
  leaveRequestController.getLeaveRequests(req, res, next),
);
leaveRequestRouter.get("/:id", authenticate, (req, res, next) =>
  leaveRequestController.getLeaveRequestById(req, res, next),
);
leaveRequestRouter.patch("/:id/approve", authenticate, (req, res, next) =>
  leaveRequestController.approveLeaveRequest(req, res, next),
);
leaveRequestRouter.patch("/:id/reject", authenticate, (req, res, next) =>
  leaveRequestController.rejectLeaveRequest(req, res, next),
);

export default leaveRequestRouter;
