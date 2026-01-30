import { Router } from "express";
import authRouter from "./router/authRoutes.js";
import departmentRouter from "./router/departmentRouter.js";

const router = Router();

router.get("/health", (req, res) => {
  res.send("ok, service is healthy v.1.0.0.0");
});

// Auth routes
router.use("/auth", authRouter);
// Department routes
router.use("/departments", departmentRouter);

export default router;
