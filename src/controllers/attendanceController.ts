import { Request, Response } from "express";
import { AttendanceService } from "../services/attendanceServices.js";

const attendanceService = new AttendanceService();

export const createAttendance = async (req: Request, res: Response) => {
  try {
    const attendance = await attendanceService.createAttendance(
      req.body,
      res.locals.user,
    );
    res.status(201).json(attendance);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getNextSeries = async (req: Request, res: Response) => {
  try {
    const result = await attendanceService.getNextSeries(res.locals.user);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getEmployeeAttendanceInfo = async (
  req: Request,
  res: Response,
) => {
  try {
    const info = await attendanceService.getEmployeeAttendanceInfo(
      parseInt(req.params.empId as string),
      res.locals.user,
    );
    res.json(info);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const getAllAttendances = async (req: Request, res: Response) => {
  try {
    const filters = {
      employeeName: req.query.employeeName as string | undefined,
      leaveType: req.query.leaveType as string | undefined,
      month: req.query.month as string | undefined,
    };
    const attendances = await attendanceService.getAllAttendances(
      res.locals.user,
      filters,
    );
    res.json(attendances);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getUnmarkedDates = async (req: Request, res: Response) => {
  try {
    const empId = parseInt(req.query.empId as string);
    const month = req.query.month as string;
    const result = await attendanceService.getUnmarkedDates(
      empId,
      month,
      res.locals.user,
    );
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const markAttendanceBulk = async (req: Request, res: Response) => {
  try {
    const attendance = await attendanceService.markAttendanceBulk(
      req.body,
      res.locals.user,
    );
    res.status(201).json(attendance);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const markSelfAttendance = async (req: Request, res: Response) => {
  try {
    const attendance = await attendanceService.markSelfAttendance(
      req.body,
      res.locals.user,
    );
    res.status(201).json(attendance);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getAttendanceById = async (req: Request, res: Response) => {
  try {
    const attendance = await attendanceService.getAttendanceById(
      parseInt(req.params.id as string),
      res.locals.user,
    );
    res.json(attendance);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const getAttendancesByEmployeeId = async (
  req: Request,
  res: Response,
) => {
  try {
    const month = req.query.month as string | undefined;
    const attendances = await attendanceService.getAttendancesByEmployeeId(
      parseInt(req.params.empId as string),
      res.locals.user,
      month,
    );
    res.json(attendances);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const updateAttendance = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const attendance = await attendanceService.updateAttendance(
      id,
      req.body,
      res.locals.user,
    );
    res.json(attendance);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteAttendance = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    await attendanceService.deleteAttendance(id, res.locals.user);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const checkInSelf = async (req: Request, res: Response) => {
  try {
    const attendance = await attendanceService.checkInSelf(res.locals.user);
    res.status(201).json(attendance);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const checkOutSelf = async (req: Request, res: Response) => {
  try {
    const attendance = await attendanceService.checkOutSelf(res.locals.user);
    res.status(200).json(attendance);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getMyAttendance = async (req: Request, res: Response) => {
  try {
    const month = req.query.month as string | undefined;
    const attendances = await attendanceService.getMyAttendance(res.locals.user, month);
    res.json(attendances);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getTodayStatus = async (req: Request, res: Response) => {
  try {
    const status = await attendanceService.getTodayStatus(res.locals.user);
    res.json(status);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
