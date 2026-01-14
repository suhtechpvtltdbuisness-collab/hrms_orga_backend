import { Router } from "express";
import organizationController from "../controllers/organization.controller.js";

const organizationRouter = Router();

organizationRouter.get("/", organizationController.getAllOrganizations);

organizationRouter.get("/:id", organizationController.getOrganizationById);

organizationRouter.post("/", organizationController.createOrganization);

export default organizationRouter;
