import { Request, Response, NextFunction } from "express";
import AppraisalTemplateServices from "../services/appraisalTemplateServices.js";

class AppraisalTemplateController {
  private services: AppraisalTemplateServices;
  constructor() {
    this.services = new AppraisalTemplateServices();
  }

  async create(req: Request, res: Response, _next: NextFunction) {
    try {
      const result = await this.services.createTemplate(
        req.body,
        res.locals.user,
      );
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to create appraisal template",
      });
    }
  }

  async getById(req: Request, res: Response, _next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid template ID" });
        return;
      }
      const result = await this.services.getTemplateById(id, res.locals.user);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || "Appraisal template not found",
      });
    }
  }

  async getAll(req: Request, res: Response, _next: NextFunction) {
    try {
      const { search, page, limit } = req.query;
      const result = await this.services.getAllTemplates(res.locals.user, {
        search: search ? String(search) : undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch appraisal templates",
      });
    }
  }

  async getDropdown(req: Request, res: Response, _next: NextFunction) {
    try {
      const result = await this.services.getDropdown(res.locals.user);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch templates dropdown",
      });
    }
  }

  async update(req: Request, res: Response, _next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid template ID" });
        return;
      }
      const result = await this.services.updateTemplate(
        id,
        req.body,
        res.locals.user,
      );
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to update appraisal template",
      });
    }
  }

  async delete(req: Request, res: Response, _next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid template ID" });
        return;
      }
      const result = await this.services.deleteTemplate(id, res.locals.user);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to delete appraisal template",
      });
    }
  }
}

export default AppraisalTemplateController;
