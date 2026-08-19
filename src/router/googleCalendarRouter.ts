import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  disconnectGoogleCalendar,
  getGoogleCalendarConnectUrl,
  getGoogleCalendarStatus,
  googleCalendarCallback,
} from "../controllers/googleCalendarController.js";

const googleCalendarRouter = Router();

googleCalendarRouter.get("/connect", authenticate, getGoogleCalendarConnectUrl);
googleCalendarRouter.get("/callback", googleCalendarCallback);
googleCalendarRouter.get("/status", authenticate, getGoogleCalendarStatus);
googleCalendarRouter.delete("/disconnect", authenticate, disconnectGoogleCalendar);

export default googleCalendarRouter;
