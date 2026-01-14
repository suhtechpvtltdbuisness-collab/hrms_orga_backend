import { Request, Response, NextFunction } from "express";
import { db } from "../db/connection.js";
import { organization } from "../db/schema.js";
import { eq } from "drizzle-orm";
import organizationService from "../services/organization.services.js";

class OrganizationController {
  // Create new organization
  async createOrganization(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body as typeof organization.$inferInsert;
      const { name, type, module, purchaseDate } = data;

      // Validation
      if (!name || !type || !module) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: name, type, or module",
        });
      }
      const result = await organizationService.createOrganization({
        ...data,
      });

      res.status(201).json({
        success: true,
        message: "Organization created successfully",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
  async getAllOrganizations(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await organizationService.getAllOrganizations();
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
  async getOrganizationById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = +req.params.id;
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "organization ID is required",
        });
      }
      const result = await organizationService.getOrganizationById(id);
      if (result.length === 0) {
        return res.status(404).json({
          success: false,
          message: "data not found",
        });
      }
      res.status(200).json({
        success: true,
        data: result[0],
      });
    } catch (err) {
      next(err);
    }
  }
  async deleteOrganization(req: Request, res: Response, next: NextFunction) {
    try {
      const id = +req.params.id;
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "organization ID is required",
        });
      }
      const result = await organizationService.deleteOrganization(id);
      res.status(200).json({
        success: true,
        message: "Organization deleted successfully",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
  async updateOrganization(req: Request, res: Response, next: NextFunction) {
    try {
      const id = +req.params.id;
      const data = req.body as typeof organization.$inferInsert;
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "organization ID is required",
        });
      }
      const result = await organizationService.updateOrganization(id, data);
      res.status(200).json({
        success: true,
        message: "Organization updated successfully",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

export default new OrganizationController();
