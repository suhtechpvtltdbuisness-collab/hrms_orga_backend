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

export const getAllAttendances = async (req: Request, res: Response) => {
  try {
    const attendances = await attendanceService.getAllAttendances(
      res.locals.user,
    );
    res.json(attendances);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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
    const attendances = await attendanceService.getAttendancesByEmployeeId(
      parseInt(req.params.empId as string),
      res.locals.user,
    );
    res.json(attendances);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const updateAttendance = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id as string);
    const attendance = await attendanceService.updateAttendanceByUserId(
      userId,
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
    const userId = parseInt(req.params.id as string);
    await attendanceService.deleteAttendanceByUserId(userId, res.locals.user);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
