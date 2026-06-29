import HiringController from "../controllers/hiringController.js";
import { Router } from "express";
import { authenticate, authorizeAdmin } from "../middleware/auth.js";

const hiringRouter = Router();
const hiringController = new HiringController();

// ─── Job Openings ────────────────────────────────────────────────
hiringRouter.post("/jobs", authenticate, authorizeAdmin, (req, res, next) =>
  hiringController.createJob(req, res, next),
);

hiringRouter.get("/jobs", authenticate, (req, res, next) =>
  hiringController.getAllJobs(req, res, next),
);

hiringRouter.get("/jobs/visible", authenticate, (req, res, next) =>
  hiringController.getAllVisibleJobs(req, res, next),
);

hiringRouter.get("/jobs/:id", authenticate, (req, res, next) =>
  hiringController.getJobById(req, res, next),
);

hiringRouter.put("/jobs/:id", authenticate, authorizeAdmin, (req, res, next) =>
  hiringController.updateJob(req, res, next),
);

hiringRouter.delete("/jobs/:id", authenticate, authorizeAdmin, (req, res, next) =>
  hiringController.deleteJob(req, res, next),
);

hiringRouter.patch("/jobs/:id/status", authenticate, authorizeAdmin, (req, res, next) =>
  hiringController.toggleJobStatus(req, res, next),
);

// ─── Job Applications ────────────────────────────────────────────
hiringRouter.post("/jobs/:jobId/applications", authenticate, (req, res, next) =>
  hiringController.createApplication(req, res, next),
);

hiringRouter.get("/jobs/:jobId/applications", authenticate, (req, res, next) =>
  hiringController.getApplicationsByJobId(req, res, next),
);

hiringRouter.get("/applications/:id", authenticate, (req, res, next) =>
  hiringController.getApplicationById(req, res, next),
);

hiringRouter.patch("/applications/:id/status", authenticate, (req, res, next) =>
  hiringController.updateApplicationStatus(req, res, next),
);

hiringRouter.delete("/applications/:id", authenticate, authorizeAdmin, (req, res, next) =>
  hiringController.deleteApplication(req, res, next),
);

// ─── Interviews ──────────────────────────────────────────────────
hiringRouter.post("/interviews", authenticate, (req, res, next) =>
  hiringController.createInterview(req, res, next),
);

hiringRouter.get("/interviews", authenticate, (req, res, next) =>
  hiringController.getAllInterviews(req, res, next),
);

hiringRouter.get("/interviews/:id", authenticate, (req, res, next) =>
  hiringController.getInterviewById(req, res, next),
);

hiringRouter.put("/interviews/:id", authenticate, (req, res, next) =>
  hiringController.updateInterview(req, res, next),
);

hiringRouter.delete("/interviews/:id", authenticate, authorizeAdmin, (req, res, next) =>
  hiringController.deleteInterview(req, res, next),
);

hiringRouter.patch("/interviews/:id/feedback", authenticate, (req, res, next) =>
  hiringController.submitFeedback(req, res, next),
);

// ─── Referrals ───────────────────────────────────────────────────
hiringRouter.post("/referrals/generate-code", authenticate, (req, res, next) =>
  hiringController.generateReferralCode(req, res, next),
);

hiringRouter.post("/referrals", authenticate, (req, res, next) =>
  hiringController.createReferral(req, res, next),
);

hiringRouter.get("/referrals", authenticate, (req, res, next) =>
  hiringController.getAllReferrals(req, res, next),
);

hiringRouter.get("/referrals/my", authenticate, (req, res, next) =>
  hiringController.getMyReferrals(req, res, next),
);

hiringRouter.get("/referrals/:id", authenticate, (req, res, next) =>
  hiringController.getReferralById(req, res, next),
);

hiringRouter.put("/referrals/:id", authenticate, (req, res, next) =>
  hiringController.updateReferral(req, res, next),
);

hiringRouter.patch("/applications/:id/notes", authenticate, (req, res, next) =>
  hiringController.updateApplicationNotes(req, res, next),
);

hiringRouter.patch("/applications/:id/ats-score", authenticate, (req, res, next) =>
  hiringController.updateApplicationAtsScore(req, res, next),
);

hiringRouter.post("/applications/:id/ats-analyze", authenticate, (req, res, next) =>
  hiringController.analyzeApplication(req, res, next),
);

// ─── Dashboard Stats ─────────────────────────────────────────────
hiringRouter.get("/dashboard/stats", authenticate, (req, res, next) =>
  hiringController.getDashboardStats(req, res, next),
);

export default hiringRouter;
