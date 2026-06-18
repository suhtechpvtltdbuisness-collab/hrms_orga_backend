import { Request, Response, NextFunction } from "express";
import LeaveRequestServices from "../services/leaveRequestServices.js";

class LeaveRequestController {
  private leaveRequestServices: LeaveRequestServices;

  constructor() {
    this.leaveRequestServices = new LeaveRequestServices();
  }

  async createLeaveRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.leaveRequestServices.createLeaveRequest(
        req.body,
        res.locals.user,
      );
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getLeaveRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        status: req.query.status as string | undefined,
        empId: req.query.empId ? Number(req.query.empId) : undefined,
      };
      const result = await this.leaveRequestServices.getLeaveRequests(
        filters,
        res.locals.user,
      );
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getLeaveRequestById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const result = await this.leaveRequestServices.getLeaveRequestById(
        id,
        res.locals.user,
      );
      res.status(200).json(result);
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  async approveLeaveRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const result = await this.leaveRequestServices.approveLeaveRequest(
        id,
        res.locals.user,
      );
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async rejectLeaveRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const result = await this.leaveRequestServices.rejectLeaveRequest(
        id,
        req.body,
        res.locals.user,
      );
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

export default LeaveRequestController;
