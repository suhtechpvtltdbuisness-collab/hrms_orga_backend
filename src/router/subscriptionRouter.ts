import { Router } from "express";
import {
  getPlans,
  getCurrentSubscription,
  createTrialSubscription,
  verifyTrialSubscription,
  createPaymentOrder,
  verifyPayment,
  createAddonOrder,
  verifyAddonPayment,
  getAllSubscriptions,
  getManagedPlans,
  createManagedPlan,
  updateManagedPlan,
  deleteManagedPlan,
} from "../controllers/subscriptionController.js";
import { authenticate, authorizeSuperAdmin } from "../middleware/auth.js";

const subscriptionRouter = Router();

subscriptionRouter.get("/plans", getPlans);
subscriptionRouter.get("/plans/manage", authenticate, authorizeSuperAdmin, getManagedPlans);
subscriptionRouter.post("/plans/manage", authenticate, authorizeSuperAdmin, createManagedPlan);
subscriptionRouter.put("/plans/manage/:id", authenticate, authorizeSuperAdmin, updateManagedPlan);
subscriptionRouter.delete("/plans/manage/:id", authenticate, authorizeSuperAdmin, deleteManagedPlan);

subscriptionRouter.get("/current", authenticate, getCurrentSubscription);
subscriptionRouter.get("/all", authenticate, authorizeSuperAdmin, getAllSubscriptions);
subscriptionRouter.post("/free-trial", authenticate, createTrialSubscription);
subscriptionRouter.post("/verify-trial", authenticate, verifyTrialSubscription);
subscriptionRouter.post("/create-order", authenticate, createPaymentOrder);
subscriptionRouter.post("/verify-payment", authenticate, verifyPayment);
subscriptionRouter.post("/create-addon-order", authenticate, createAddonOrder);
subscriptionRouter.post("/verify-addon-payment", authenticate, verifyAddonPayment);

export default subscriptionRouter;
