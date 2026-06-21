import OrganizationController from "../controllers/organizationController.js";
import { Router } from "express";
import { authenticate, authorizeSuperAdmin } from "../middleware/auth.js";

const organizationRouter = Router();
const organizationController = new OrganizationController();

organizationRouter.get("/superadmin/overview", authenticate, authorizeSuperAdmin, (req, res, next) =>
  organizationController.getSuperAdminDashboardOverview(req, res, next),
);

organizationRouter.get("/", authenticate, authorizeSuperAdmin, (req, res, next) =>
  organizationController.getAllOrganizations(req, res, next),
);

export default organizationRouter;
