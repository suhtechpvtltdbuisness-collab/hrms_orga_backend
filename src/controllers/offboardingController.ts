import { Request, Response } from "express";
import { OffboardingService } from "../services/offboardingServices.js";

const offboardingService = new OffboardingService();

export const createOffboarding = async (req: Request, res: Response) => {
  try {
    const offboarding = await offboardingService.createOffboarding(
      req.body,
      res.locals.user,
    );
    res.status(201).json(offboarding);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getAllOffboardings = async (req: Request, res: Response) => {
  try {
    const offboardings = await offboardingService.getAllOffboardings(
      res.locals.user,
    );
    res.json(offboardings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getOffboardingById = async (req: Request, res: Response) => {
  try {
    const offboarding = await offboardingService.getOffboardingById(
      parseInt(req.params.id as string),
      res.locals.user,
    );
    res.json(offboarding);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const getOffboardingsByEmployeeId = async (
  req: Request,
  res: Response,
) => {
  try {
    const offboardings = await offboardingService.getOffboardingsByEmployeeId(
      parseInt(req.params.empId as string),
      res.locals.user,
    );
    res.json(offboardings);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const updateOffboarding = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id as string);
    const offboarding = await offboardingService.updateOffboardingByUserId(
      userId,
      req.body,
      res.locals.user,
    );
    res.json(offboarding);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteOffboarding = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id as string);
    await offboardingService.deleteOffboardingByUserId(userId, res.locals.user);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
