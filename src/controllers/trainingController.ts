import { Request, Response } from "express";
import { TrainingService } from "../services/trainingServices.js";

const trainingService = new TrainingService();

export const createTraining = async (req: Request, res: Response) => {
  try {
    const training = await trainingService.createTraining(
      req.body,
      res.locals.user,
    );
    res.status(201).json(training);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getAllTrainings = async (req: Request, res: Response) => {
  try {
    const trainings = await trainingService.getAllTrainings(res.locals.user);
    res.json(trainings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getTrainingById = async (req: Request, res: Response) => {
  try {
    const training = await trainingService.getTrainingById(
      parseInt(req.params.id as string),
      res.locals.user,
    );
    res.json(training);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const getTrainingsByEmployeeId = async (req: Request, res: Response) => {
  try {
    const trainings = await trainingService.getTrainingsByEmployeeId(
      parseInt(req.params.empId as string),
      res.locals.user,
    );
    res.json(trainings);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const updateTraining = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id as string);
    const training = await trainingService.updateTrainingByUserId(
      userId,
      req.body,
      res.locals.user,
    );
    res.json(training);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteTraining = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id as string);
    await trainingService.deleteTrainingByUserId(userId, res.locals.user);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
