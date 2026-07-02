import { Request, Response } from "express";
import { DashboardServices } from "../services/dashboardServices.js";

const dashboardServices = new DashboardServices();

export const getAdminDashboard = async (_req: Request, res: Response) => {
  try {
    res.status(200).json(await dashboardServices.getAdminDashboard(res.locals.user));
  } catch (error: any) {
    const forbidden = error.message === "Only admins can view the admin dashboard";
    res.status(forbidden ? 403 : 500).json({ success: false, message: error.message });
  }
};
