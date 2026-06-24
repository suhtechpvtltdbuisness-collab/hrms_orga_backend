import { Request, Response, NextFunction } from "express";
import DepartmentServices from "../services/departmentServices.js";

class DepartmentController {
  private departmentServices: DepartmentServices;
  constructor() {
    this.departmentServices = new DepartmentServices();
  }

  async createDepartment(req: Request, res: Response, next: NextFunction) {
    try {
      const user = res.locals.user;
      const data = req.body;

      const result = await this.departmentServices.createDepartment(data, user);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to create department",
      });
    }
  }

  async getDepartmentById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid department ID" });
        return;
      }
      const result = await this.departmentServices.getDepartmentById(id);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || "Department not found",
      });
    }
  }

  async getAllDepartments(req: Request, res: Response, next: NextFunction) {
    try {
      const user = res.locals.user;
      const { search, status, sortBy, sortOrder, page, limit } = req.query;

      const queryParams = {
        search: search ? String(search) : undefined,
        status: status ? String(status) : undefined,
        sortBy: sortBy ? String(sortBy) : undefined,
        sortOrder: (sortOrder === "asc" || sortOrder === "desc" ? sortOrder : undefined) as "asc" | "desc" | undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      };

      const result = await this.departmentServices.getAllDepartments(user, queryParams);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch departments",
      });
    }
  }

  async getDepartmentsDropdown(req: Request, res: Response, next: NextFunction) {
    try {
      const user = res.locals.user;
      const result = await this.departmentServices.getDepartmentsDropdown(user);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch departments dropdown",
      });
    }
  }

  async getDepartmentStats(req: Request, res: Response, next: NextFunction) {
    try {
      const user = res.locals.user;
      const result = await this.departmentServices.getDepartmentStats(user);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch department statistics",
      });
    }
  }

  async updateDepartment(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid department ID" });
        return;
      }
      const data = req.body;
      const user = res.locals.user;
      const result = await this.departmentServices.updateDepartment(
        id,
        data,
        user
      );
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to update department",
      });
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid department ID" });
        return;
      }
      const { status } = req.body;
      const user = res.locals.user;
      const result = await this.departmentServices.updateStatus(id, status, user);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to update status",
      });
    }
  }

  async deleteDepartment(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid department ID" });
        return;
      }
      const user = res.locals.user;
      const result = await this.departmentServices.deleteDepartment(id, user);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to delete department",
      });
    }
  }
}

export default DepartmentController;
