import { Request, Response } from "express";
import googleCalendarService from "../services/googleCalendarService.js";

const getFrontendRedirect = () => {
  const configured = process.env.GOOGLE_CALENDAR_SUCCESS_REDIRECT;
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL.replace(/\/$/, "");
  const corsOrigins = process.env.CORS_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean);
  return corsOrigins?.[0] || "http://localhost:5173";
};

export const getGoogleCalendarConnectUrl = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const authUrl = googleCalendarService.getAuthUrl(userId);
    res.status(200).json({
      success: true,
      authUrl,
      redirectUri: googleCalendarService.getRedirectUri(),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to start Google Calendar connect" });
  }
};

export const googleCalendarCallback = async (req: Request, res: Response) => {
  const frontendRedirect = getFrontendRedirect();
  try {
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;
    const errorParam = req.query.error as string | undefined;
    const userId = Number(state);

    console.log("[GoogleCalendarCallback] query:", { code: code ? "present" : "missing", state, error: errorParam });
    console.log("[GoogleCalendarCallback] frontendRedirect:", frontendRedirect);

    if (errorParam) {
      console.error("[GoogleCalendarCallback] Google returned error:", errorParam);
      res.redirect(`${frontendRedirect}/hrms/hiring-and-recruitment/new-hiring/ats-screening/schedule-interview?googleCalendar=error&reason=${encodeURIComponent(errorParam)}`);
      return;
    }

    if (!code || !Number.isInteger(userId) || userId <= 0) {
      console.error("[GoogleCalendarCallback] Invalid code or userId:", { code: !!code, userId });
      res.redirect(`${frontendRedirect}/hrms/hiring-and-recruitment/new-hiring/ats-screening/schedule-interview?googleCalendar=error&reason=invalid_state`);
      return;
    }

    await googleCalendarService.handleOAuthCallback(code, userId);
    console.log("[GoogleCalendarCallback] Success for userId:", userId);
    res.redirect(`${frontendRedirect}/hrms/hiring-and-recruitment/new-hiring/ats-screening/schedule-interview?googleCalendar=connected`);
  } catch (err: any) {
    console.error("[GoogleCalendarCallback] Exception:", err?.message || err);
    res.redirect(`${frontendRedirect}/hrms/hiring-and-recruitment/new-hiring/ats-screening/schedule-interview?googleCalendar=error&reason=${encodeURIComponent(err?.message || "unknown")}`);
  }
};

export const getGoogleCalendarStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const status = await googleCalendarService.getConnectionStatus(userId);
    res.status(200).json({
      success: true,
      data: {
        ...status,
        redirectUri: googleCalendarService.getRedirectUri(),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to fetch Google Calendar status" });
  }
};

export const disconnectGoogleCalendar = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    await googleCalendarService.disconnect(userId);
    res.status(200).json({ success: true, message: "Google Calendar disconnected" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to disconnect Google Calendar" });
  }
};
