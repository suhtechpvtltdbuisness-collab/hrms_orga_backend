import { Router } from "express";
import organizationRouter from "./router/organization.router.js";

const router = Router();

router.get("/health", (req, res) => {
  res.send("ok, service is healthy v.1.0.0.0");
});

router.use("/organization", organizationRouter);

export default router;
