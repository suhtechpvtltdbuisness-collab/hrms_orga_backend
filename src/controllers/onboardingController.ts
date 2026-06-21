import { Request, Response, NextFunction } from "express";
import OnboardingServices from "../services/onboardingServices.js";
import { ZodError } from "zod";

class OnboardingController {
  private onboardingServices: OnboardingServices;
  constructor() {
    this.onboardingServices = new OnboardingServices();
  }

  async onboardOrganization(req: Request, res: Response, next: NextFunction) {
    try {
      const user = res.locals.user;
      if (!user) {
        res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
        return;
      }

      const result = await this.onboardingServices.onboardOrganization(req.body, user.id);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: error.issues.map((err) => ({
            field: err.path.join("."),
            message: err.message
          }))
        });
        return;
      }
      next(error);
    }
  }

  async getOnboardingStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const user = res.locals.user;
      if (!user) {
        res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
        return;
      }

      const result = await this.onboardingServices.getOnboardingStatus(user);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default OnboardingController;
