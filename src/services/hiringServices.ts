import HiringRepository from "../repository/hiring.repo.js";
import { jobs, users } from "../db/schema.js";
import crypto from "crypto";

class HiringServices {
  private hiringRepo: HiringRepository;
  constructor() {
    this.hiringRepo = new HiringRepository();
  }

  async createJob(jobData: any, currentUser: typeof users.$inferSelect) {
    const newJobData: any = {
      ...jobData,
      adminId: currentUser.id,
      createdBy: currentUser.id,
    };
    if (newJobData.applicationDeadline && typeof newJobData.applicationDeadline === "string") {
      const parsed = new Date(newJobData.applicationDeadline);
      if (!isNaN(parsed.getTime())) {
        newJobData.applicationDeadline = parsed;
      }
    }
    const result = await this.hiringRepo.createJob(newJobData);
    return { message: "Job opening created successfully", success: true, data: result };
  }

  async getAllJobs(currentUser: typeof users.$inferSelect) {
    const result = await this.hiringRepo.getAllJobs(currentUser.id);
    const counts = await Promise.all(
      result.map(async (job: any) => ({
        ...job,
        applicationCount: await this.hiringRepo.getJobApplicationsCount(job.id),
      })),
    );
    return { message: "Jobs fetched successfully", success: true, data: counts };
  }

  async getAllVisibleJobs() {
    const result = await this.hiringRepo.getAllVisibleJobs();
    return { message: "Jobs fetched successfully", success: true, data: result };
  }

  async getJobById(id: number) {
    const result = await this.hiringRepo.getJobById(id);
    if (!result) throw new Error("Job not found");
    const applicationCount = await this.hiringRepo.getJobApplicationsCount(id);
    return {
      message: "Job details fetched successfully",
      success: true,
      data: { ...result, applicationCount },
    };
  }

  async updateJob(id: number, jobData: any, currentUser: typeof users.$inferSelect) {
    const existingJob = await this.hiringRepo.getJobById(id);
    if (!existingJob) throw new Error("Job not found");
    const result = await this.hiringRepo.updateJob(id, jobData);
    return { message: "Job updated successfully", success: true, data: result };
  }

  async deleteJob(id: number, currentUser: typeof users.$inferSelect) {
    const existingJob = await this.hiringRepo.getJobById(id);
    if (!existingJob) throw new Error("Job not found");
    const result = await this.hiringRepo.deleteJob(id);
    return { message: "Job deleted successfully", success: true, data: result };
  }

  async toggleJobStatus(id: number, isActive: boolean) {
    const existingJob = await this.hiringRepo.getJobById(id);
    if (!existingJob) throw new Error("Job not found");
    const result = await this.hiringRepo.updateJob(id, { isActive });
    return { message: `Job ${isActive ? "activated" : "deactivated"} successfully`, success: true, data: result };
  }

  async createApplication(jobId: number, applicationData: any) {
    const job = await this.hiringRepo.getJobById(jobId);
    if (!job) throw new Error("Job not found");
    const data = { ...applicationData, jobId };
    const result = await this.hiringRepo.createApplication(data);
    return { message: "Application submitted successfully", success: true, data: result };
  }

  async getApplicationsByJobId(jobId: number) {
    const result = await this.hiringRepo.getApplicationsByJobId(jobId);
    return { message: "Applications fetched successfully", success: true, data: result };
  }

  async getApplicationById(id: number) {
    const result = await this.hiringRepo.getApplicationById(id);
    if (!result) throw new Error("Application not found");
    return { message: "Application details fetched successfully", success: true, data: result };
  }

  async updateApplicationStatus(id: number, status: string) {
    const existing = await this.hiringRepo.getApplicationById(id);
    if (!existing) throw new Error("Application not found");
    const result = await this.hiringRepo.updateApplicationStatus(id, status);
    return { message: "Application status updated successfully", success: true, data: result };
  }

  async deleteApplication(id: number) {
    const existing = await this.hiringRepo.getApplicationById(id);
    if (!existing) throw new Error("Application not found");
    const result = await this.hiringRepo.deleteApplication(id);
    return { message: "Application deleted successfully", success: true, data: result };
  }

  async createInterview(interviewData: any) {
    if (!interviewData.jobApplicationId) {
      throw new Error("jobApplicationId is required");
    }
    const data = { ...interviewData };
    if (data.scheduledAt && typeof data.scheduledAt === "string") {
      const parsed = new Date(data.scheduledAt);
      if (!isNaN(parsed.getTime())) {
        data.scheduledAt = parsed;
      }
    }
    const result = await this.hiringRepo.createInterview(data);
    return { message: "Interview scheduled successfully", success: true, data: result };
  }

  async getAllInterviews(currentUser: typeof users.$inferSelect) {
    const result = await this.hiringRepo.getAllInterviews(currentUser.id);
    return { message: "Interviews fetched successfully", success: true, data: result };
  }

  async getInterviewById(id: number) {
    const result = await this.hiringRepo.getInterviewById(id);
    if (!result) throw new Error("Interview not found");
    return { message: "Interview details fetched successfully", success: true, data: result };
  }

  async updateInterview(id: number, interviewData: any) {
    const existing = await this.hiringRepo.getInterviewById(id);
    if (!existing) throw new Error("Interview not found");
    const result = await this.hiringRepo.updateInterview(id, interviewData);
    return { message: "Interview updated successfully", success: true, data: result };
  }

  async deleteInterview(id: number) {
    const existing = await this.hiringRepo.getInterviewById(id);
    if (!existing) throw new Error("Interview not found");
    const result = await this.hiringRepo.deleteInterview(id);
    return { message: "Interview deleted successfully", success: true, data: result };
  }

  async submitFeedback(id: number, feedbackData: { feedback: string; status: string }) {
    const existing = await this.hiringRepo.getInterviewById(id);
    if (!existing) throw new Error("Interview not found");
    const result = await this.hiringRepo.updateInterview(id, feedbackData);
    return { message: "Feedback submitted successfully", success: true, data: result };
  }

  async generateReferralCode(currentUser: typeof users.$inferSelect) {
    const code = `REF-${currentUser.id}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    return { message: "Referral code generated", success: true, data: { referralCode: code } };
  }

  async createReferral(referralData: any, currentUser: typeof users.$inferSelect) {
    const data = {
      ...referralData,
      employeeId: currentUser.id,
      referralCode: referralData.referralCode || `REF-${currentUser.id}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
    };
    const result = await this.hiringRepo.createReferral(data);
    return { message: "Referral created successfully", success: true, data: result };
  }

  async getAllReferrals(currentUser: typeof users.$inferSelect) {
    const result = await this.hiringRepo.getAllReferrals();
    return { message: "Referrals fetched successfully", success: true, data: result };
  }

  async getMyReferrals(currentUser: typeof users.$inferSelect) {
    const result = await this.hiringRepo.getAllReferrals(currentUser.id);
    return { message: "Your referrals fetched successfully", success: true, data: result };
  }

  async getReferralById(id: number) {
    const result = await this.hiringRepo.getReferralById(id);
    if (!result) throw new Error("Referral not found");
    return { message: "Referral details fetched successfully", success: true, data: result };
  }

  async updateReferral(id: number, referralData: any) {
    const existing = await this.hiringRepo.getReferralById(id);
    if (!existing) throw new Error("Referral not found");
    const result = await this.hiringRepo.updateReferral(id, referralData);
    return { message: "Referral updated successfully", success: true, data: result };
  }

  async getDashboardStats(currentUser: typeof users.$inferSelect) {
    const jobs = await this.hiringRepo.getAllJobs(currentUser.id);
    const activeJobs = jobs.filter((j: any) => j.isActive);
    const totalApplications = await Promise.all(
      activeJobs.map(async (job: any) => {
        const count = await this.hiringRepo.getJobApplicationsCount(job.id);
        return { jobTitle: job.title, count };
      }),
    );
    const totalApplicants = totalApplications.reduce((sum: number, item: any) => sum + item.count, 0);

    return {
      message: "Dashboard stats fetched",
      success: true,
      data: {
        totalJobs: jobs.length,
        activeJobs: activeJobs.length,
        totalApplicants,
        recentJobs: activeJobs.slice(0, 5),
      },
    };
  }
}

export default HiringServices;
