import orgPaymentController from "../controllers/orgPayment.controller.js";
import { Router } from "express";

const orgPaymentRouter = Router();

orgPaymentRouter.post("/", orgPaymentController.createOrgPayment);

orgPaymentRouter.get("/:id", orgPaymentController.getOrgPaymentById);

orgPaymentRouter.put("/:id", orgPaymentController.updateOrgPayment);

export default orgPaymentRouter;
