import { Request, Response, NextFunction } from "express";
import LeaveServices from "../services/leaveServices.js";

class LeaveController {
  private leaveServices: LeaveServices;
  constructor() {
    this.leaveServices = new LeaveServices();
  }

  async createLeave(req: Request, res: Response, next: NextFunction) {
    try {
      const user = res.locals.user;
      const data = req.body;

      // Validate required fields
      if (!data.empId || !data.type || !data.total) {
        res.status(400).json({
          success: false,
          message: "Employee ID, leave type, and total days are required",
        });
        return;
      }

      const result = await this.leaveServices.createLeave(data, user);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getLeaveById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const result = await this.leaveServices.getLeaveById(id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getLeavesByEmployeeId(req: Request, res: Response, next: NextFunction) {
    try {
      const empId = Number(req.params.empId);
      const result = await this.leaveServices.getLeavesByEmployeeId(empId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getAllLeaves(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.leaveServices.getAllLeaves();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateLeave(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const data = req.body;
      const user = res.locals.user;
      const result = await this.leaveServices.updateLeave(id, data, user);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteLeave(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const user = res.locals.user;
      const result = await this.leaveServices.deleteLeave(id, user);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default LeaveController;
