import { Router } from "express";
import OnboardingController from "../controllers/onboardingController.js";
import { authenticate } from "../middleware/auth.js";

const onboardingRouter = Router();
const onboardingController = new OnboardingController();

onboardingRouter.post("/organization", authenticate, (req, res, next) =>
  onboardingController.onboardOrganization(req, res, next)
);

onboardingRouter.get("/status", authenticate, (req, res, next) =>
  onboardingController.getOnboardingStatus(req, res, next)
);

export default onboardingRouter;
