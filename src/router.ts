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
import trainingRouter from "./router/trainingRouter.js";

const router = Router();

router.get("/health", (req, res) => {
  res.send("ok, service is healthy v.1.0.0.0");
});

// Auth routes
router.use("/auth", authRouter);
// Department routes
router.use("/departments", departmentRouter);
router.use("/designation", desiganationRouter);
router.use("/users", userRouter);
router.use("/payroll", payrollRouter);
router.use("/leave", leaveRouter);
router.use("/employment", employmentRouter);
router.use("/employees", employeeRouter);
router.use("/documents", documentRouter);
router.use("/offboarding", offboardingRouter);
router.use("/performance", performanceRouter);
router.use("/attendance", attendanceRouter);
router.use("/training", trainingRouter);

export default router;
