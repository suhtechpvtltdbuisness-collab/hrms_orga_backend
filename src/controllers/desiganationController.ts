import { Request, Response, NextFunction } from "express";
import DesignationServices from "../services/desiganationServices.js";

class DesignationController {
  private designationServices: DesignationServices;
  constructor() {
    this.designationServices = new DesignationServices();
  }

  async createDesignation(req: Request, res: Response, next: NextFunction) {
    try {
      const user = res.locals.user;
      const data = req.body;

      if (!data.name || !data.departmentId || !data.level) {
        res.status(400).json({
          success: false,
          message: "Name, departmentId, and level are required fields",
        });
        return;
      }

      const result = await this.designationServices.createDesignation(data, user);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to create designation",
      });
    }
  }

  async getDesignationById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid designation ID" });
        return;
      }
      const result = await this.designationServices.getDesignationById(id);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || "Designation not found",
      });
    }
  }

  async getAllDesignations(req: Request, res: Response, next: NextFunction) {
    try {
      const user = res.locals.user;
      const { search, departmentId, level, status, sortBy, sortOrder, page, limit } = req.query;

      const queryParams = {
        search: search ? String(search) : undefined,
        departmentId: departmentId ? Number(departmentId) : undefined,
        level: level ? Number(level) : undefined,
        status: status !== undefined ? status === "true" || status === "Active" : undefined,
        sortBy: sortBy ? String(sortBy) : undefined,
        sortOrder: (sortOrder === "asc" || sortOrder === "desc" ? sortOrder : undefined) as "asc" | "desc" | undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      };

      const result = await this.designationServices.getAllDesignations(user, queryParams);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch designations",
      });
    }
  }

  async getDesignationsDropdown(req: Request, res: Response, next: NextFunction) {
    try {
      const user = res.locals.user;
      const departmentId = req.query.departmentId ? Number(req.query.departmentId) : undefined;
      const result = await this.designationServices.getDesignationsDropdown(user, departmentId);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch designations dropdown",
      });
    }
  }

  async getDesignationStats(req: Request, res: Response, next: NextFunction) {
    try {
      const user = res.locals.user;
      const result = await this.designationServices.getDesignationStats(user);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch designation statistics",
      });
    }
  }

  async updateDesignation(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid designation ID" });
        return;
      }
      const data = req.body;
      const user = res.locals.user;

      const result = await this.designationServices.updateDesignation(id, data, user);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to update designation",
      });
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid designation ID" });
        return;
      }
      const { status } = req.body;
      const user = res.locals.user;

      if (status === undefined) {
        res.status(400).json({ success: false, message: "Status is required" });
        return;
      }

      const statusBool = status === true || status === "Active" || status === "true";
      const result = await this.designationServices.updateStatus(id, statusBool, user);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to update status",
      });
    }
  }

  async deleteDesignation(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid designation ID" });
        return;
      }
      const user = res.locals.user;

      const result = await this.designationServices.deleteDesignation(id, user);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to delete designation",
      });
    }
  }
}

export default DesignationController;
