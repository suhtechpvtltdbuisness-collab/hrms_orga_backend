import { Request, Response } from "express";
import { AttendanceRequestService } from "../services/attendanceRequestServices.js";

const attendanceRequestService = new AttendanceRequestService();

export const createAttendanceRequest = async (req: Request, res: Response) => {
  try {
    const result = await attendanceRequestService.createRequest(req.body, res.locals.user);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message, error: error.message });
  }
};

export const getAttendanceRequests = async (req: Request, res: Response) => {
  try {
    const result = await attendanceRequestService.listRequests(res.locals.user, {
      status: typeof req.query.status === "string" ? req.query.status : undefined,
      search: typeof req.query.search === "string" ? req.query.search : undefined,
    });
    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message, error: error.message });
  }
};

export const approveAttendanceRequest = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ success: false, message: "Invalid request id" });
      return;
    }
    const result = await attendanceRequestService.approveRequest(id, res.locals.user);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message, error: error.message });
  }
};

export const rejectAttendanceRequest = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ success: false, message: "Invalid request id" });
      return;
    }
    const result = await attendanceRequestService.rejectRequest(id, req.body || {}, res.locals.user);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message, error: error.message });
  }
};
