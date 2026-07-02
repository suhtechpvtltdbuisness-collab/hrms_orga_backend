import { Router } from "express";
import { getAdminDashboard } from "../controllers/dashboardController.js";
import { authenticate } from "../middleware/auth.js";

const dashboardRouter = Router();

dashboardRouter.get("/admin", authenticate, getAdminDashboard);

export default dashboardRouter;
