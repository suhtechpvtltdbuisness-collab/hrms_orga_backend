import { Router } from "express";
import LeaveController from "../controllers/leaveController.js";
import { authenticate, authorizeAdmin } from "../middleware/auth.js";

const leaveRouter = Router();
const leaveController = new LeaveController();

leaveRouter.post("/", authenticate, authorizeAdmin, (req, res, next) =>
  leaveController.createLeave(req, res, next),
);
leaveRouter.get("/employee/:empId", authenticate, (req, res, next) =>
  leaveController.getLeavesByEmployeeId(req, res, next),
);
leaveRouter.get("/:id", authenticate, (req, res, next) =>
  leaveController.getLeaveById(req, res, next),
);
leaveRouter.get("/", authenticate, (req, res, next) =>
  leaveController.getAllLeaves(req, res, next),
);
leaveRouter.put("/:id", authenticate, (req, res, next) =>
  leaveController.updateLeave(req, res, next),
);
leaveRouter.delete("/:id", authenticate, authorizeAdmin, (req, res, next) =>
  leaveController.deleteLeave(req, res, next),
);

export default leaveRouter;
