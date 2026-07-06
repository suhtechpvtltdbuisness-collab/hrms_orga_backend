import { Router } from "express";
import authRouter from "./router/authRoutes.js";
import departmentRouter from "./router/departmentRouter.js";
import desiganationRouter from "./router/desiganationRouter.js";
import userRouter from "./router/userRouter.js";
import payrollRouter from "./router/payrollRouter.js";
import leaveRouter from "./router/leaveRouter.js";
import employmentRouter from "./router/employmentRouter.js";
import employeeRouter from "./router/employeeRouter.js";
import documentRouter from "./router/documentRouter.js";
import offboardingRouter from "./router/offboardingRouter.js";
import performanceRouter from "./router/performanceRouter.js";
import attendanceRouter from "./router/attendanceRouter.js";
import shiftTypeRouter from "./router/shiftTypeRouter.js";
import shiftRequestRouter from "./router/shiftRequestRouter.js";
import shiftAssignmentRouter from "./router/shiftAssignmentRouter.js";
import trainingRouter from "./router/trainingRouter.js";
import leaveRequestRouter from "./router/leaveRequestRouter.js";
import leaveManagementRouter from "./router/leaveManagementRouter.js";
import subscriptionRouter from "./router/subscriptionRouter.js";
import uploadRouter from "./router/uploadRouter.js";
import onboardingRouter from "./router/onboardingRouter.js";
import organizationRouter from "./router/organizationRouter.js";
import hiringRouter from "./router/hiringRouter.js";
import dashboardRouter from "./router/dashboardRouter.js";
import faceBiometricRouter from "./router/faceBiometricRouter.js";
import accountsRouter from "./router/accountsRouter.js";

const router = Router();

router.get("/health", (req, res) => {
  res.send("ok, service is healthy v.1.0.0.0");
});

// Auth routes
router.use("/auth", authRouter);
router.use("/api/auth", authRouter);
// Department routes
router.use("/departments", departmentRouter);
router.use("/designation", desiganationRouter);
router.use("/users", userRouter);
router.use("/payroll", payrollRouter);
router.use("/leave", leaveRouter);
router.use("/leave-requests", leaveRequestRouter);
router.use("/leave-admin", leaveManagementRouter);
router.use("/employment", employmentRouter);
router.use("/employees", employeeRouter);
router.use("/documents", documentRouter);
router.use("/offboarding", offboardingRouter);
router.use("/performance", performanceRouter);
router.use("/attendance", attendanceRouter);
router.use("/shift-types", shiftTypeRouter);
router.use("/shift-requests", shiftRequestRouter);
router.use("/shift-assignments", shiftAssignmentRouter);
router.use("/training", trainingRouter);
router.use("/subscriptions", subscriptionRouter);
router.use("/upload", uploadRouter);
router.use("/api/onboarding", onboardingRouter);
router.use("/organizations", organizationRouter);
router.use("/hiring", hiringRouter);
router.use("/dashboard", dashboardRouter);
router.use("/employee/face", faceBiometricRouter);
router.use("/accounts", accountsRouter);

export default router;
