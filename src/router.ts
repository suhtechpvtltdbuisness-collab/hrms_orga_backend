import { Router } from "express";
import authRouter from "./router/authRoutes.js";

const router = Router();

router.get("/health", (req, res) => {
  res.send("ok, service is healthy v.1.0.0.0");
});

// Auth routes
router.use("/auth", authRouter);

export default router;
