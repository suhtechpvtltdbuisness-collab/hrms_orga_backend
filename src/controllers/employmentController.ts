import { Request, Response, NextFunction } from "express";
import EmploymentServices from "../services/employmentServices.js";

class EmploymentController {
  private employmentServices: EmploymentServices;
  constructor() {
    this.employmentServices = new EmploymentServices();
  }

  async createEmployment(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = res.locals.user;
      const data = req.body;
      const result = await this.employmentServices.createEmployment(
        data,
        currentUser,
      );
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getEmploymentById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const result = await this.employmentServices.getEmploymentById(id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getAllEmployments(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.employmentServices.getAllEmployments();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getEmploymentsByEmployeeId(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const employeeId = Number(req.params.employeeId);
      const result =
        await this.employmentServices.getEmploymentsByEmployeeId(employeeId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getEmploymentsByDepartmentId(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const departmentId = Number(req.params.departmentId);
      const result =
        await this.employmentServices.getEmploymentsByDepartmentId(
          departmentId,
        );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateEmployment(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const data = req.body;
      const result = await this.employmentServices.updateEmployment(id, data);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteEmployment(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const result = await this.employmentServices.deleteEmployment(id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default EmploymentController;
