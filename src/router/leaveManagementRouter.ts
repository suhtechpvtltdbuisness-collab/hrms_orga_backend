import { Router } from "express";
import LeaveManagementController from "../controllers/leaveManagementController.js";
import { authenticate, authorizeAdmin } from "../middleware/auth.js";

const leaveManagementRouter = Router();
const controller = new LeaveManagementController();

leaveManagementRouter.use(authenticate);

// Employee self-service routes. Service-level checks force employees to their own data.
leaveManagementRouter.get("/encashment-eligibility", (req, res, next) =>
  controller.getEncashmentEligibility(req, res, next),
);
leaveManagementRouter.get("/encashment-requests", (req, res, next) =>
  controller.getEncashmentRequests(req, res, next),
);
leaveManagementRouter.post("/encashment-requests", (req, res, next) =>
  controller.createEncashmentRequest(req, res, next),
);
leaveManagementRouter.post("/encashment-requests/all", (req, res, next) =>
  controller.createEncashAllRequest(req, res, next),
);

leaveManagementRouter.use(authorizeAdmin);

leaveManagementRouter.get("/options", (req, res, next) =>
  controller.getOptions(req, res, next),
);

leaveManagementRouter.get("/holidays", (req, res, next) =>
  controller.getHolidays(req, res, next),
);
leaveManagementRouter.post("/holidays", (req, res, next) =>
  controller.createHoliday(req, res, next),
);
leaveManagementRouter.put("/holidays/:id", (req, res, next) =>
  controller.updateHoliday(req, res, next),
);
leaveManagementRouter.delete("/holidays/:id", (req, res, next) =>
  controller.deleteHoliday(req, res, next),
);

leaveManagementRouter.get("/periods", (req, res, next) =>
  controller.getPeriods(req, res, next),
);
leaveManagementRouter.post("/periods", (req, res, next) =>
  controller.createPeriod(req, res, next),
);
leaveManagementRouter.put("/periods/:id", (req, res, next) =>
  controller.updatePeriod(req, res, next),
);
leaveManagementRouter.delete("/periods/:id", (req, res, next) =>
  controller.deletePeriod(req, res, next),
);

leaveManagementRouter.get("/blocks", (req, res, next) =>
  controller.getBlocks(req, res, next),
);
leaveManagementRouter.post("/blocks", (req, res, next) =>
  controller.createBlock(req, res, next),
);
leaveManagementRouter.put("/blocks/:id", (req, res, next) =>
  controller.updateBlock(req, res, next),
);
leaveManagementRouter.delete("/blocks/:id", (req, res, next) =>
  controller.deleteBlock(req, res, next),
);

leaveManagementRouter.get("/types", (req, res, next) =>
  controller.getLeaveTypes(req, res, next),
);
leaveManagementRouter.post("/types", (req, res, next) =>
  controller.createLeaveType(req, res, next),
);
leaveManagementRouter.put("/types/:id", (req, res, next) =>
  controller.updateLeaveType(req, res, next),
);
leaveManagementRouter.delete("/types/:id", (req, res, next) =>
  controller.deleteLeaveType(req, res, next),
);

leaveManagementRouter.get("/policies", (req, res, next) =>
  controller.getPolicies(req, res, next),
);
leaveManagementRouter.post("/policies", (req, res, next) =>
  controller.createPolicy(req, res, next),
);
leaveManagementRouter.put("/policies/:id", (req, res, next) =>
  controller.updatePolicy(req, res, next),
);
leaveManagementRouter.delete("/policies/:id", (req, res, next) =>
  controller.deletePolicy(req, res, next),
);

leaveManagementRouter.get("/assignments", (req, res, next) =>
  controller.getAssignments(req, res, next),
);
leaveManagementRouter.post("/assignments", (req, res, next) =>
  controller.createAssignment(req, res, next),
);
leaveManagementRouter.put("/assignments/:id", (req, res, next) =>
  controller.updateAssignment(req, res, next),
);
leaveManagementRouter.delete("/assignments/:id", (req, res, next) =>
  controller.deleteAssignment(req, res, next),
);

leaveManagementRouter.get("/comp-off-requests", (req, res, next) =>
  controller.getCompOffRequests(req, res, next),
);
leaveManagementRouter.post("/comp-off-requests", (req, res, next) =>
  controller.createCompOffRequest(req, res, next),
);
leaveManagementRouter.patch("/comp-off-requests/:id/approve", (req, res, next) =>
  controller.approveCompOffRequest(req, res, next),
);
leaveManagementRouter.patch("/comp-off-requests/:id/reject", (req, res, next) =>
  controller.rejectCompOffRequest(req, res, next),
);

leaveManagementRouter.patch("/encashment-requests/:id/approve", (req, res, next) =>
  controller.approveEncashmentRequest(req, res, next),
);
leaveManagementRouter.patch("/encashment-requests/:id/reject", (req, res, next) =>
  controller.rejectEncashmentRequest(req, res, next),
);

export default leaveManagementRouter;
