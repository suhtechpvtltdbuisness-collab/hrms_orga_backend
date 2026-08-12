import { NextFunction, Request, Response } from "express";
import { AnnouncementServices } from "../services/announcementServices.js";

const service = new AnnouncementServices();

const run =
  (handler: (req: Request, res: Response) => Promise<void>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req, res);
    } catch (error: any) {
      const status = error?.statusCode || 400;
      res.status(status).json({
        success: false,
        message: error?.message || "Announcement request failed",
      });
    }
  };

const requireId = (req: Request, res: Response, label = "announcement"): number | null => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ success: false, message: `Invalid ${label} ID` });
    return null;
  }
  return id;
};

export const listAnnouncements = run(async (req, res) => {
  res.json(await service.list(res.locals.user, req.query));
});

export const announcementStats = run(async (_req, res) => {
  res.json(await service.stats(res.locals.user));
});

export const getAnnouncement = run(async (req, res) => {
  const id = requireId(req, res);
  if (id === null) return;
  res.json(await service.get(id, res.locals.user));
});

export const createAnnouncement = run(async (req, res) => {
  res.status(201).json(await service.create(req.body, res.locals.user));
});

export const updateAnnouncement = run(async (req, res) => {
  const id = requireId(req, res);
  if (id === null) return;
  res.json(await service.update(id, req.body, res.locals.user));
});

export const updateAnnouncementStatus = run(async (req, res) => {
  const id = requireId(req, res);
  if (id === null) return;
  const action = String(req.body.action || req.body.status || "");
  res.json(await service.updateStatus(id, action, res.locals.user));
});

export const deleteAnnouncement = run(async (req, res) => {
  const id = requireId(req, res);
  if (id === null) return;
  res.json(await service.remove(id, res.locals.user));
});

export const duplicateAnnouncement = run(async (req, res) => {
  const id = requireId(req, res);
  if (id === null) return;
  res.status(201).json(await service.duplicate(id, res.locals.user));
});

export const listEmployeeAnnouncements = run(async (req, res) => {
  res.json(await service.listForEmployee(res.locals.user, req.query));
});

export const getEmployeeAnnouncement = run(async (req, res) => {
  const id = requireId(req, res);
  if (id === null) return;
  res.json(await service.getForEmployee(id, res.locals.user));
});

export const setAnnouncementRead = run(async (req, res) => {
  const id = requireId(req, res);
  if (id === null) return;
  const read =
    req.body.read === undefined
      ? true
      : req.body.read === true || req.body.read === "true";
  res.json(await service.setRead(id, read, res.locals.user));
});
