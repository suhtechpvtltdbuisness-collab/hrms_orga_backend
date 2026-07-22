import { Request, Response } from "express";
import { emailService } from "../services/emailService.js";

export const submitDemoRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const firstName = String(req.body.firstName || "").trim();
    const lastName = String(req.body.lastName || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const contact = String(req.body.contact || "").trim();
    const preferredLanguage = String(req.body.preferredLanguage || req.body.language || "").trim();
    const teamSize = String(req.body.teamSize || "").trim();
    const useCase = String(req.body.useCase || "").trim();
    const name = `${firstName} ${lastName}`.trim();

    if (!firstName || !lastName || !email || !contact || !preferredLanguage || !teamSize || !useCase) {
      res.status(400).json({
        success: false,
        message: "All demo request fields are required",
      });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
      return;
    }

    const emailSent = await emailService.sendDemoRequestEmail({
      name,
      email,
      contact,
      preferredLanguage,
      teamSize,
      useCase,
    });

    if (!emailSent) {
      res.status(502).json({
        success: false,
        message: "Unable to send demo request email. Please try again later.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Demo request sent successfully",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to submit demo request",
    });
  }
};
