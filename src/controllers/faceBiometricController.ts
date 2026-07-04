import { NextFunction, Request, Response } from "express";
import {
  FaceBiometricService,
  normalizeFaceProviderError,
} from "../services/faceBiometricService.js";

const service = new FaceBiometricService();
const run =
  (handler: (req: Request, res: Response) => Promise<unknown>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req, res);
    } catch (error) {
      next(normalizeFaceProviderError(error));
    }
  };

export const getFaceStatus = run(async (_req, res) => {
  res.json({ success: true, data: await service.status(res.locals.user) });
});

export const registerFace = run(async (req, res) => {
  const data = await service.register(req.body.image, res.locals.user);
  res.status(201).json({ success: true, message: "Face registered successfully", data });
});

export const verifyFace = run(async (req, res) => {
  const data = await service.verify(req.body.image, res.locals.user);
  res.json({ success: true, data });
});

export const verifyFaceAndMarkAttendance = run(async (req, res) => {
  const data = await service.verifyAndMark(req.body.image, req.body.type, res.locals.user);
  res.status(req.body.type === "check-in" ? 201 : 200).json({ success: true, data });
});

export const verifyPasswordAndMarkAttendance = run(async (req, res) => {
  const data = await service.verifyPasswordAndMark(
    req.body.password,
    req.body.type,
    res.locals.user,
  );
  res.status(req.body.type === "check-in" ? 201 : 200).json({ success: true, data });
});
