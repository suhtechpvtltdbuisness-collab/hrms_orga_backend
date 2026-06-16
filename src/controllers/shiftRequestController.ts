import { Request, Response, NextFunction } from "express";
import ShiftRequestServices from "../services/shiftRequestServices.js";

class ShiftRequestController {
  private shiftRequestServices: ShiftRequestServices;

  constructor() {
    this.shiftRequestServices = new ShiftRequestServices();
  }

  async createShiftRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.shiftRequestServices.createShiftRequest(
        req.body,
        res.locals.user,
      );
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getShiftRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        status: req.query.status as string | undefined,
        empId: req.query.empId
          ? Number(req.query.empId)
          : undefined,
      };
      const result = await this.shiftRequestServices.getShiftRequests(
        filters,
        res.locals.user,
      );
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getShiftRequestById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const result = await this.shiftRequestServices.getShiftRequestById(
        id,
        res.locals.user,
      );
      res.status(200).json(result);
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  async approveShiftRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const result = await this.shiftRequestServices.approveShiftRequest(
        id,
        res.locals.user,
      );
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async rejectShiftRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const result = await this.shiftRequestServices.rejectShiftRequest(
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

export default ShiftRequestController;
