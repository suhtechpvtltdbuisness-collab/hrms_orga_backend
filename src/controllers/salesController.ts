import { Request, Response, NextFunction } from "express";
import SalesServices from "../services/salesServices.js";

class SalesController {
  private salesServices: SalesServices;
  constructor() {
    this.salesServices = new SalesServices();
  }

  async getWorkspace(req: Request, res: Response, next: NextFunction) {
    try {
      const user = res.locals.user;
      const result = await this.salesServices.getWorkspace(user);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch sales workspace",
      });
    }
  }

  async createRecord(req: Request, res: Response, next: NextFunction) {
    try {
      const user = res.locals.user;
      const result = await this.salesServices.createRecord(req.body, user);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to create sales record",
      });
    }
  }

  async getRecords(req: Request, res: Response, next: NextFunction) {
    try {
      const user = res.locals.user;
      const { type, search, status, sortOrder, page, limit } = req.query;

      const result = await this.salesServices.getRecords(user, {
        type: type ? String(type) : undefined,
        search: search ? String(search) : undefined,
        status: status ? String(status) : undefined,
        sortOrder: (sortOrder === "asc" || sortOrder === "desc" ? sortOrder : undefined) as "asc" | "desc" | undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to fetch sales records",
      });
    }
  }

  async getRecordById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid record ID" });
        return;
      }
      const user = res.locals.user;
      const result = await this.salesServices.getRecordById(id, user);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || "Sales record not found",
      });
    }
  }

  async updateRecord(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid record ID" });
        return;
      }
      const user = res.locals.user;
      const result = await this.salesServices.updateRecord(id, req.body, user);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to update sales record",
      });
    }
  }

  async deleteRecord(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid record ID" });
        return;
      }
      const user = res.locals.user;
      const result = await this.salesServices.deleteRecord(id, user);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to delete sales record",
      });
    }
  }

  async convertLead(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid lead ID" });
        return;
      }
      const user = res.locals.user;
      const result = await this.salesServices.convertLeadToOpportunity(id, req.body, user);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to convert lead",
      });
    }
  }

  async activateClient(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid opportunity ID" });
        return;
      }
      const user = res.locals.user;
      const result = await this.salesServices.activateClientFromOpportunity(id, req.body, user);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to activate client",
      });
    }
  }

  async checkDuplicates(req: Request, res: Response, next: NextFunction) {
    try {
      const user = res.locals.user;
      const result = await this.salesServices.checkDuplicates(req.body, user);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to check duplicates",
      });
    }
  }

  async askCopilot(req: Request, res: Response, next: NextFunction) {
    try {
      const user = res.locals.user;
      const { question } = req.body;
      const result = await this.salesServices.askCopilot(question, user);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to get co-pilot answer",
      });
    }
  }

  async createKnowledge(req: Request, res: Response, next: NextFunction) {
    try {
      const user = res.locals.user;
      const result = await this.salesServices.createKnowledge(req.body, user);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to create knowledge article",
      });
    }
  }

  async getKnowledge(req: Request, res: Response, next: NextFunction) {
    try {
      const user = res.locals.user;
      const { category, search } = req.query;
      const result = await this.salesServices.getKnowledge(
        user,
        category ? String(category) : undefined,
        search ? String(search) : undefined,
      );
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to fetch knowledge articles",
      });
    }
  }

  async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const user = res.locals.user;
      const result = await this.salesServices.createProduct(req.body, user);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to create product",
      });
    }
  }

  async getProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const user = res.locals.user;
      const { search } = req.query;
      const result = await this.salesServices.getProducts(
        user,
        search ? String(search) : undefined,
      );
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to fetch products",
      });
    }
  }

  async createDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const user = res.locals.user;
      const result = await this.salesServices.createDocument(req.body, user);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to create sales document",
      });
    }
  }

  async getDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const user = res.locals.user;
      const { type, search } = req.query;
      const result = await this.salesServices.getDocuments(
        user,
        type ? String(type) : undefined,
        search ? String(search) : undefined,
      );
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to fetch sales documents",
      });
    }
  }
}

export default SalesController;
