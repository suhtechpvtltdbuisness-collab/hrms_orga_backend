import { Request, Response } from "express";
import { ShiftAssignmentServices } from "../services/shiftAssignmentServices.js";

const service = new ShiftAssignmentServices();

export const getShiftRoster = async (req: Request, res: Response) => {
  try {
    res.status(200).json(await service.getRoster(req.query, res.locals.user));
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const saveShiftRoster = async (req: Request, res: Response) => {
  try {
    res.status(200).json(await service.saveRoster(req.body, res.locals.user));
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getEmployeeShiftHistory = async (req: Request, res: Response) => {
  try {
    res.status(200).json(
      await service.getEmployeeHistory(Number(req.params.employeeId), req.query, res.locals.user),
    );
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteShiftAssignment = async (req: Request, res: Response) => {
  try {
    res.status(200).json(await service.deleteAssignment(Number(req.params.id), res.locals.user));
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};
