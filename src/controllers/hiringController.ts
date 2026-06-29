import { Request, Response, NextFunction } from "express";
import HiringServices from "../services/hiringServices.js";

class HiringController {
  private hiringServices: HiringServices;
  constructor() {
    this.hiringServices = new HiringServices();
  }

  // ─── Job Openings ─────────────────────────────────────────────
  async createJob(req: Request, res: Response, next: NextFunction) {
    try {
      const user = res.locals.user;
      const result = await this.hiringServices.createJob(req.body, user);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || "Failed to create job" });
    }
  }

  async getAllJobs(req: Request, res: Response, next: NextFunction) {
    try {
      const user = res.locals.user;
      const result = await this.hiringServices.getAllJobs(user);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "Failed to fetch jobs" });
    }
  }

  async getAllVisibleJobs(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.hiringServices.getAllVisibleJobs();
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "Failed to fetch jobs" });
    }
  }

  async getJobById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid job ID" });
        return;
      }
      const result = await this.hiringServices.getJobById(id);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message || "Job not found" });
    }
  }

  async updateJob(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid job ID" });
        return;
      }
      const user = res.locals.user;
      const result = await this.hiringServices.updateJob(id, req.body, user);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || "Failed to update job" });
    }
  }

  async deleteJob(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid job ID" });
        return;
      }
      const user = res.locals.user;
      const result = await this.hiringServices.deleteJob(id, user);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || "Failed to delete job" });
    }
  }

  async toggleJobStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid job ID" });
        return;
      }
      const { isActive } = req.body;
      const result = await this.hiringServices.toggleJobStatus(id, isActive);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || "Failed to toggle job status" });
    }
  }

  // ─── Job Applications ─────────────────────────────────────────
  async createApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const jobId = Number(req.params.jobId);
      if (isNaN(jobId)) {
        res.status(400).json({ success: false, message: "Invalid job ID" });
        return;
      }
      const result = await this.hiringServices.createApplication(jobId, req.body);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || "Failed to submit application" });
    }
  }

  async getApplicationsByJobId(req: Request, res: Response, next: NextFunction) {
    try {
      const jobId = Number(req.params.jobId);
      if (isNaN(jobId)) {
        res.status(400).json({ success: false, message: "Invalid job ID" });
        return;
      }
      const result = await this.hiringServices.getApplicationsByJobId(jobId);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "Failed to fetch applications" });
    }
  }

  async getApplicationById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid application ID" });
        return;
      }
      const result = await this.hiringServices.getApplicationById(id);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message || "Application not found" });
    }
  }

  async updateApplicationStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid application ID" });
        return;
      }
      const { status } = req.body;
      if (!status) {
        res.status(400).json({ success: false, message: "Status is required" });
        return;
      }
      const result = await this.hiringServices.updateApplicationStatus(id, status);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || "Failed to update status" });
    }
  }

  async deleteApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid application ID" });
        return;
      }
      const result = await this.hiringServices.deleteApplication(id);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || "Failed to delete application" });
    }
  }

  async updateApplicationNotes(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid application ID" });
        return;
      }
      const { hrNotes } = req.body;
      const result = await this.hiringServices.updateApplicationNotes(id, hrNotes);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || "Failed to update notes" });
    }
  }

  async updateApplicationAtsScore(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid application ID" });
        return;
      }
      const { atsData } = req.body;
      const result = await this.hiringServices.updateApplicationAtsScore(id, atsData);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || "Failed to update ATS score" });
    }
  }

  async analyzeApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid application ID" });
        return;
      }
      const result = await this.hiringServices.analyzeApplication(id);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || "Failed to analyze application" });
    }
  }

  // ─── Interviews ────────────────────────────────────────────────
  async createInterview(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.hiringServices.createInterview(req.body);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || "Failed to schedule interview" });
    }
  }

  async getAllInterviews(req: Request, res: Response, next: NextFunction) {
    try {
      const user = res.locals.user;
      const result = await this.hiringServices.getAllInterviews(user);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "Failed to fetch interviews" });
    }
  }

  async getInterviewById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid interview ID" });
        return;
      }
      const result = await this.hiringServices.getInterviewById(id);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message || "Interview not found" });
    }
  }

  async updateInterview(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid interview ID" });
        return;
      }
      const result = await this.hiringServices.updateInterview(id, req.body);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || "Failed to update interview" });
    }
  }

  async deleteInterview(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid interview ID" });
        return;
      }
      const result = await this.hiringServices.deleteInterview(id);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || "Failed to delete interview" });
    }
  }

  async submitFeedback(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid interview ID" });
        return;
      }
      const { feedback, status } = req.body;
      const result = await this.hiringServices.submitFeedback(id, { feedback, status });
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || "Failed to submit feedback" });
    }
  }

  // ─── Referrals ─────────────────────────────────────────────────
  async generateReferralCode(req: Request, res: Response, next: NextFunction) {
    try {
      const user = res.locals.user;
      const result = await this.hiringServices.generateReferralCode(user);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "Failed to generate code" });
    }
  }

  async createReferral(req: Request, res: Response, next: NextFunction) {
    try {
      const user = res.locals.user;
      const result = await this.hiringServices.createReferral(req.body, user);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || "Failed to create referral" });
    }
  }

  async getAllReferrals(req: Request, res: Response, next: NextFunction) {
    try {
      const user = res.locals.user;
      const result = await this.hiringServices.getAllReferrals(user);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "Failed to fetch referrals" });
    }
  }

  async getMyReferrals(req: Request, res: Response, next: NextFunction) {
    try {
      const user = res.locals.user;
      const result = await this.hiringServices.getMyReferrals(user);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "Failed to fetch your referrals" });
    }
  }

  async getReferralById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid referral ID" });
        return;
      }
      const result = await this.hiringServices.getReferralById(id);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message || "Referral not found" });
    }
  }

  async updateReferral(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid referral ID" });
        return;
      }
      const result = await this.hiringServices.updateReferral(id, req.body);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || "Failed to update referral" });
    }
  }

  // ─── Dashboard Stats ───────────────────────────────────────────
  async getDashboardStats(req: Request, res: Response, next: NextFunction) {
    try {
      const user = res.locals.user;
      const result = await this.hiringServices.getDashboardStats(user);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "Failed to fetch stats" });
    }
  }
}

export default HiringController;
