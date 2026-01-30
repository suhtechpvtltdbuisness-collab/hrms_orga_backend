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
    } catch (error) {
      next(error);
    }
  }

  async getDepartmentById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const result = await this.departmentServices.getDepartmentById(id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getAllDepartments(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.departmentServices.getAllDepartments();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateDepartment(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const data = req.body;
      const user = res.locals.user;
      const result = await this.departmentServices.updateDepartment(
        id,
        data,
        user,
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
export default DepartmentController;
