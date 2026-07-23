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
    const empId = Number(req.params.empId);
    if (!Number.isInteger(empId) || empId <= 0) {
      res.status(400).json({ error: "Invalid employee ID" });
      return;
    }

    const info = await attendanceService.getEmployeeAttendanceInfo(
      empId,
      res.locals.user,
    );
    res.json(info);
  } catch (error: any) {
    if (error.message === "Only admins can view employee attendance info") {
      res.status(403).json({ error: error.message });
      return;
    }

    res.status(404).json({ error: error.message });
  }
};

export const getAllAttendances = async (req: Request, res: Response) => {
  try {
    const filters = {
      employeeName: req.query.employeeName as string | undefined,
      leaveType: req.query.leaveType as string | undefined,
      month: req.query.month as string | undefined,
      date: req.query.date as string | undefined,
      status: req.query.status as string | undefined,
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

export const downloadAttendanceTemplate = async (req: Request, res: Response) => {
  try {
    const fromDate = typeof req.query.fromDate === "string" ? req.query.fromDate : undefined;
    const toDate = typeof req.query.toDate === "string" ? req.query.toDate : undefined;
    const template = await attendanceService.generateImportTemplate(
      res.locals.user,
      fromDate,
      toDate,
    );

    res.setHeader("Content-Type", template.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${template.fileName}"`,
    );
    res.send(template.buffer);
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message, message: error.message });
  }
};

export const importAttendance = async (req: Request, res: Response) => {
  try {
    const file = req.file as Express.Multer.File | undefined;
    const result = await attendanceService.importAttendanceFile(file, res.locals.user, {
      fromDate: typeof req.body?.fromDate === "string" ? req.body.fromDate : undefined,
      toDate: typeof req.body?.toDate === "string" ? req.body.toDate : undefined,
    });

    const failedCount = result.data.failedCount;
    const successCount = result.data.successCount;
    const statusCode = successCount === 0 && failedCount > 0 ? 400 : 200;
    res.status(statusCode).json(result);
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
      message: error.message,
    });
  }
};
