import { Router } from "express";
import authRouter from "./router/authRoutes.js";
import departmentRouter from "./router/departmentRouter.js";
import desiganationRouter from "./router/desiganationRouter.js";
import userRouter from "./router/userRouter.js";
import payrollRouter from "./router/payrollRouter.js";
import leaveRouter from "./router/leaveRouter.js";

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

export default router;
