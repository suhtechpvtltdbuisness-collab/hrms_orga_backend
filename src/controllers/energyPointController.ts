import { Request, Response, NextFunction } from "express";
import EnergyPointServices from "../services/energyPointServices.js";

class EnergyPointController {
  private services: EnergyPointServices;
  constructor() {
    this.services = new EnergyPointServices();
  }

  // Rules
  async createRule(req: Request, res: Response, _next: NextFunction) {
    try {
      const result = await this.services.createRule(req.body, res.locals.user);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to create energy point rule",
      });
    }
  }

  async getRuleById(req: Request, res: Response, _next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid rule ID" });
        return;
      }
      const result = await this.services.getRuleById(id, res.locals.user);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || "Energy point rule not found",
      });
    }
  }

  async getAllRules(req: Request, res: Response, _next: NextFunction) {
    try {
      const { search, enabled, page, limit } = req.query;
      const result = await this.services.getAllRules(res.locals.user, {
        search: search ? String(search) : undefined,
        enabled: enabled !== undefined ? String(enabled) : undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch energy point rules",
      });
    }
  }

  async updateRule(req: Request, res: Response, _next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid rule ID" });
        return;
      }
      const result = await this.services.updateRule(
        id,
        req.body,
        res.locals.user,
      );
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to update energy point rule",
      });
    }
  }

  async deleteRule(req: Request, res: Response, _next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid rule ID" });
        return;
      }
      const result = await this.services.deleteRule(id, res.locals.user);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to delete energy point rule",
      });
    }
  }

  // Logs
  async createLog(req: Request, res: Response, _next: NextFunction) {
    try {
      const result = await this.services.createLog(req.body, res.locals.user);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to create energy point log",
      });
    }
  }

  async getLogById(req: Request, res: Response, _next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid log ID" });
        return;
      }
      const result = await this.services.getLogById(id, res.locals.user);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || "Energy point log not found",
      });
    }
  }

  async getAllLogs(req: Request, res: Response, _next: NextFunction) {
    try {
      const { name, user, rule, referenceDocument, empId, page, limit } =
        req.query;
      const result = await this.services.getAllLogs(res.locals.user, {
        name: name ? String(name) : undefined,
        user: user ? String(user) : undefined,
        rule: rule ? String(rule) : undefined,
        referenceDocument: referenceDocument
          ? String(referenceDocument)
          : undefined,
        empId: empId ? Number(empId) : undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch energy point logs",
      });
    }
  }

  async deleteLog(req: Request, res: Response, _next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid log ID" });
        return;
      }
      const result = await this.services.deleteLog(id, res.locals.user);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to delete energy point log",
      });
    }
  }

  // Settings
  async getSettings(req: Request, res: Response, _next: NextFunction) {
    try {
      const result = await this.services.getSettings(res.locals.user);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch energy point settings",
      });
    }
  }

  async upsertSettings(req: Request, res: Response, _next: NextFunction) {
    try {
      const result = await this.services.upsertSettings(
        req.body,
        res.locals.user,
      );
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to save energy point settings",
      });
    }
  }
}

export default EnergyPointController;
