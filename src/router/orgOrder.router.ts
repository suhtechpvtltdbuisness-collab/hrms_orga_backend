import orgOrderController from "../controllers/orgOrder.controller.js";
import { Router } from "express";

const orgOrderRouter = Router();

orgOrderRouter.post("/", orgOrderController.createOrgOrder);

orgOrderRouter.get("/:id", orgOrderController.getOrgOrderById);

orgOrderRouter.put("/:id", orgOrderController.updateOrgOrder);

export default orgOrderRouter;
