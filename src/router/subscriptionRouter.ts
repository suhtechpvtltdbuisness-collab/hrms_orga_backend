import { Router } from "express";
import {
  getPlans,
  getCurrentSubscription,
  createTrialSubscription,
  verifyTrialSubscription,
  createPaymentOrder,
  verifyPayment,
  getAllSubscriptions,
} from "../controllers/subscriptionController.js";
import { authenticate, authorizeSuperAdmin } from "../middleware/auth.js";

const subscriptionRouter = Router();

subscriptionRouter.get("/plans", getPlans);

subscriptionRouter.get("/current", authenticate, getCurrentSubscription);
subscriptionRouter.get("/all", authenticate, authorizeSuperAdmin, getAllSubscriptions);
subscriptionRouter.post("/free-trial", authenticate, createTrialSubscription);
subscriptionRouter.post("/verify-trial", authenticate, verifyTrialSubscription);
subscriptionRouter.post("/create-order", authenticate, createPaymentOrder);
subscriptionRouter.post("/verify-payment", authenticate, verifyPayment);

export default subscriptionRouter;
