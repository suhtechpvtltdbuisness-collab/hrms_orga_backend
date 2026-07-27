import { Request, Response, NextFunction } from "express";
import AppraisalServices from "../services/appraisalServices.js";

class AppraisalController {
  private services: AppraisalServices;
  constructor() {
    this.services = new AppraisalServices();
  }

  async create(req: Request, res: Response, _next: NextFunction) {
    try {
      const result = await this.services.createAppraisal(
        req.body,
        res.locals.user,
      );
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to create appraisal",
      });
    }
  }

  async getById(req: Request, res: Response, _next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid appraisal ID" });
        return;
      }
      const result = await this.services.getAppraisalById(id, res.locals.user);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || "Appraisal not found",
      });
    }
  }

  async getAll(req: Request, res: Response, _next: NextFunction) {
    try {
      const { search, empId, status, templateId, page, limit } = req.query;
      const result = await this.services.getAllAppraisals(res.locals.user, {
        search: search ? String(search) : undefined,
        empId: empId ? Number(empId) : undefined,
        status: status ? String(status) : undefined,
        templateId: templateId ? Number(templateId) : undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch appraisals",
      });
    }
  }

  async update(req: Request, res: Response, _next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid appraisal ID" });
        return;
      }
      const result = await this.services.updateAppraisal(
        id,
        req.body,
        res.locals.user,
      );
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to update appraisal",
      });
    }
  }

  async delete(req: Request, res: Response, _next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid appraisal ID" });
        return;
      }
      const result = await this.services.deleteAppraisal(id, res.locals.user);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to delete appraisal",
      });
    }
  }
}

export default AppraisalController;
