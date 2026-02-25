import { Request, Response } from "express";
import { PerformanceService } from "../services/performanceServices.js";

const performanceService = new PerformanceService();

export const createPerformance = async (req: Request, res: Response) => {
  try {
    const performance = await performanceService.createPerformance(
      req.body,
      res.locals.user,
    );
    res.status(201).json(performance);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getAllPerformances = async (req: Request, res: Response) => {
  try {
    const performances = await performanceService.getAllPerformances(
      res.locals.user,
    );
    res.json(performances);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getPerformanceById = async (req: Request, res: Response) => {
  try {
    const performance = await performanceService.getPerformanceById(
      parseInt(req.params.id as string),
      res.locals.user,
    );
    res.json(performance);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const getPerformancesByEmployeeId = async (
  req: Request,
  res: Response,
) => {
  try {
    const performances = await performanceService.getPerformancesByEmployeeId(
      parseInt(req.params.empId as string),
      res.locals.user,
    );
    res.json(performances);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const updatePerformance = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id as string);
    const performance = await performanceService.updatePerformanceByUserId(
      userId,
      req.body,
      res.locals.user,
    );
    res.json(performance);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const deletePerformance = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id as string);
    await performanceService.deletePerformanceByUserId(userId, res.locals.user);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
