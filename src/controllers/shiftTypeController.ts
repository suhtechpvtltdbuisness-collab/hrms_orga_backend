import { Request, Response, NextFunction } from "express";
import ShiftTypeServices from "../services/shiftTypeServices.js";

class ShiftTypeController {
  private shiftTypeServices: ShiftTypeServices;

  constructor() {
    this.shiftTypeServices = new ShiftTypeServices();
  }

  async createShiftType(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.shiftTypeServices.createShiftType(
        req.body,
        res.locals.user,
      );
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getAllShiftTypes(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.shiftTypeServices.getAllShiftTypes(res.locals.user);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getShiftTypeById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const result = await this.shiftTypeServices.getShiftTypeById(id, res.locals.user);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  async updateShiftType(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const result = await this.shiftTypeServices.updateShiftType(
        id,
        req.body,
        res.locals.user,
      );
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async deleteShiftType(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const result = await this.shiftTypeServices.deleteShiftType(id, res.locals.user);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  }
}

export default ShiftTypeController;
