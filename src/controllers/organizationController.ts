import { Request, Response, NextFunction } from "express";
import OrganizationServices from "../services/organizationServices.js";

class OrganizationController {
  private organizationServices: OrganizationServices;

  constructor() {
    this.organizationServices = new OrganizationServices();
  }

  async getAllOrganizations(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
      const search = req.query.search as string | undefined;

      const result = await this.organizationServices.getAllOrganizations(page, limit, search);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getSuperAdminDashboardOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.organizationServices.getSuperAdminDashboardOverview();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default OrganizationController;
