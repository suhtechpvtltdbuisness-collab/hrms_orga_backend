import HiringRepository from "../repository/hiring.repo.js";
import { jobs, users } from "../db/schema.js";
import { emailService } from "./emailService.js";
import crypto from "crypto";

const DEFAULT_ONBOARDING_TASKS = {
  setup: {
    documentSubmission: false,
    bankDetails: false,
    itSetup: false,
    idCard: false,
    systemAccess: false,
    provideLaptop: true,
  },
  progress: {
    welcomeKit: false,
    laptopSetup: false,
    documentSubmission: false,
    systemAccess: false,
    bankDetails: false,
    idCard: false,
  },
  completion: {
    verifyDocuments: false,
    approveProfile: false,
    convertToEmployee: false,
  },
};

const parseOnboardingTasks = (raw?: string | null) => {
  if (!raw) {
    return {
      setup: { ...DEFAULT_ONBOARDING_TASKS.setup },
      progress: { ...DEFAULT_ONBOARDING_TASKS.progress },
      completion: { ...DEFAULT_ONBOARDING_TASKS.completion },
    };
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      setup: { ...DEFAULT_ONBOARDING_TASKS.setup, ...(parsed.setup || {}) },
      progress: { ...DEFAULT_ONBOARDING_TASKS.progress, ...(parsed.progress || {}) },
      completion: { ...DEFAULT_ONBOARDING_TASKS.completion, ...(parsed.completion || {}) },
    };
  } catch {
    return {
      setup: { ...DEFAULT_ONBOARDING_TASKS.setup },
      progress: { ...DEFAULT_ONBOARDING_TASKS.progress },
      completion: { ...DEFAULT_ONBOARDING_TASKS.completion },
    };
  }
};

const parseCandidateDocuments = (raw?: string | null) => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const parseCandidateProfile = (raw?: string | null) => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const getFrontendUrl = () => (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");

const serializeOnboardingTasks = (tasks: typeof DEFAULT_ONBOARDING_TASKS) => JSON.stringify(tasks);

const parseSalaryNumber = (value?: string | null) => {
  if (!value) return 0;
  const digits = String(value).replace(/[^\d.]/g, "");
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : 0;
};

const splitAddressParts = (address = "") => {
  const parts = String(address)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    street: parts[0] || "",
    city: parts[1] || "",
    state: parts[2] || "",
    postalCode: parts[3] || "",
  };
};

const normalizeGender = (value?: string | null) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  if (normalized === "m" || normalized === "male") return "male";
  if (normalized === "f" || normalized === "female") return "female";
  if (normalized === "other") return "other";
  if (normalized.includes("prefer")) return "prefer_not_to_say";
  return normalized;
};

const deriveBankNameFromIfsc = (ifsc?: string | null) => {
  const code = String(ifsc || "").trim().slice(0, 4).toUpperCase();
  return /^[A-Z]{4}$/.test(code) ? code : "";
};

const CANDIDATE_DOCUMENT_LABELS: Record<string, string> = {
  idProof: "ID Proof",
  addressProof: "Address Proof",
  photograph: "Photograph",
  educationCertificate: "Education Certificate",
  bankProof: "Bank Proof",
};

class HiringServices {
  private hiringRepo: HiringRepository;
  constructor() {
    this.hiringRepo = new HiringRepository();
  }

  private async ensureDocumentUploadToken(applicationId: number) {
    const application = await this.hiringRepo.getApplicationById(applicationId);
    if (!application) throw new Error("Application not found");
    if (application.documentUploadToken) {
      return { application, token: application.documentUploadToken };
    }
    const token = crypto.randomBytes(32).toString("hex");
    await this.hiringRepo.updateApplication(applicationId, { documentUploadToken: token });
    return { application, token };
  }

  private getDocumentUploadUrl(token: string) {
    return `${getFrontendUrl()}/candidate/documents?token=${token}`;
  }

  private async syncDocumentSubmissionProgress(applicationId: number, adminId?: number) {
    if (!adminId) return;
    const offer = await this.hiringRepo.getOfferLetterByApplicationId(applicationId, adminId);
    if (!offer || offer.onboardingStatus === "not_started") return;

    const tasks = parseOnboardingTasks(offer.onboardingTasks);
    tasks.progress.documentSubmission = true;
    if (tasks.setup.bankDetails) tasks.progress.bankDetails = true;
    await this.hiringRepo.updateOfferLetter(offer.id, {
      onboardingTasks: serializeOnboardingTasks(tasks),
    });
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

  async updateApplicationNotes(id: number, hrNotes: string) {
    const existing = await this.hiringRepo.getApplicationById(id);
    if (!existing) throw new Error("Application not found");
    const result = await this.hiringRepo.updateApplicationNotes(id, hrNotes);
    return { message: "HR notes updated successfully", success: true, data: result };
  }

  async updateApplicationAtsScore(id: number, atsData: any) {
    const existing = await this.hiringRepo.getApplicationById(id);
    if (!existing) throw new Error("Application not found");
    const result = await this.hiringRepo.updateApplicationAtsScore(id, atsData);
    return { message: "ATS score updated successfully", success: true, data: result };
  }

  async analyzeApplication(id: number) {
    const application = await this.hiringRepo.getApplicationById(id);
    if (!application) throw new Error("Application not found");

    const job = await this.hiringRepo.getJobById(application.jobId);
    if (!job) throw new Error("Associated job not found");

    const applicantSkills = (application.applicantSkills || "").split(/[,;]\s*/).map((s: string) => s.toLowerCase().trim()).filter(Boolean);
    const requiredSkills = (job.requiredSkills || "").split(/[,;]\s*/).map((s: string) => s.toLowerCase().trim()).filter(Boolean);

    let skillMatch = 50;
    if (requiredSkills.length > 0 && applicantSkills.length > 0) {
      const matched = applicantSkills.filter((s: string) => requiredSkills.some((rs: string) => rs.includes(s) || s.includes(rs)));
      skillMatch = Math.round((matched.length / requiredSkills.length) * 100);
    }

    const applicantExp = parseInt(application.applicantExperience || "0") || 0;
    const jobExp = parseInt(job.experience || "0") || 0;
    const experienceFit = jobExp > 0 ? Math.min(Math.round((applicantExp / jobExp) * 100), 100) : 70;

    const educationFit = 85;
    const roleMatch = Math.round((skillMatch + experienceFit) / 2);

    const atsData = { skillMatch, experienceFit, educationFit, roleMatch };
    const avgScore = Math.round((skillMatch + experienceFit + educationFit + roleMatch) / 4);
    let atsVerdict = "Strong fit";
    if (avgScore < 60) atsVerdict = "Weak fit";
    else if (avgScore < 75) atsVerdict = "Moderate fit";

    await this.hiringRepo.updateApplicationAtsScore(id, { ...atsData, atsVerdict });

    return {
      message: "ATS analysis complete",
      success: true,
      data: { ...atsData, atsVerdict, applicantName: application.applicantName, applicantEmail: application.applicantEmail },
    };
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

    const application = await this.hiringRepo.getApplicationById(interviewData.jobApplicationId);
    if (!application) {
      throw new Error("Application not found");
    }

    const candidateEmail = interviewData.candidateEmail || application.applicantEmail;
    if (!candidateEmail) {
      throw new Error("Candidate email is required to schedule interview");
    }

    const interviewType = interviewData.interviewType || "Interview";
    const interviewMode = interviewData.interviewMode || "Online";
    const panel = interviewData.panel || "HR";

    const { interviewType: _type, interviewMode: _mode, panel: _panel, candidateEmail: _email, ...dbData } = interviewData;
    const data = { ...dbData };
    if (data.scheduledAt && typeof data.scheduledAt === "string") {
      const parsed = new Date(data.scheduledAt);
      if (!isNaN(parsed.getTime())) {
        data.scheduledAt = parsed;
      }
    }

    data.instruction = data.instruction || `${interviewType} - ${interviewMode}`;
    data.meetingLink = data.meetingLink || "";

    const result = await this.hiringRepo.createInterview(data);
    const scheduledAt = data.scheduledAt instanceof Date ? data.scheduledAt : new Date(data.scheduledAt);

    const emailSent = await emailService.sendInterviewScheduledEmail({
      email: candidateEmail,
      candidateName: application.applicantName || "Candidate",
      jobTitle: application.jobTitle || "the open position",
      scheduledAt,
      interviewType,
      interviewMode,
      panel,
    });

    return {
      message: emailSent
        ? "Interview scheduled and email sent successfully"
        : "Interview scheduled successfully, but email could not be sent",
      success: true,
      data: result,
      emailSent,
    };
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

    if (feedbackData.status === "selected" && existing.jobApplicationId) {
      await this.hiringRepo.updateApplicationStatus(existing.jobApplicationId, "selected");
      const application = await this.hiringRepo.getApplicationById(existing.jobApplicationId);
      if (application?.applicantEmail) {
        const { token } = await this.ensureDocumentUploadToken(existing.jobApplicationId);
        const uploadUrl = this.getDocumentUploadUrl(token);
        await emailService.sendCandidateDocumentUploadEmail({
          email: application.applicantEmail,
          candidateName: application.applicantName,
          jobTitle: application.jobTitle || existing.jobTitle || "the open position",
          uploadUrl,
          reason: "selected",
        });
      }
    }

    return { message: "Feedback submitted successfully", success: true, data: result };
  }

  async createOfferLetter(
    body: {
      jobApplicationId: number;
      interviewId?: number;
      salary?: string;
      joiningDate?: string;
      department?: string;
      designation?: string;
      notes?: string;
      sendEmail?: boolean;
    },
    currentUser: typeof users.$inferSelect,
  ) {
    const application = await this.hiringRepo.getApplicationById(body.jobApplicationId);
    if (!application) throw new Error("Application not found");

    const job = await this.hiringRepo.getJobById(application.jobId);
    if (!job || job.adminId !== currentUser.id) throw new Error("Application not found for this organization");

    if (!application.applicantEmail) throw new Error("Candidate email is required to issue an offer letter");

    const existingOffer = await this.hiringRepo.getOfferLetterByApplicationId(body.jobApplicationId, currentUser.id);
    if (existingOffer && ["sent", "accepted"].includes(existingOffer.status)) {
      throw new Error("An active offer letter already exists for this candidate");
    }

    const offer = await this.hiringRepo.createOfferLetter({
      jobApplicationId: body.jobApplicationId,
      interviewId: body.interviewId ?? null,
      adminId: currentUser.id,
      candidateName: application.applicantName,
      candidateEmail: application.applicantEmail,
      jobTitle: application.jobTitle || job.title,
      salary: body.salary ?? job.salaryRange ?? null,
      joiningDate: body.joiningDate ?? null,
      department: body.department ?? null,
      designation: body.designation ?? null,
      notes: body.notes ?? null,
      status: "draft",
      acceptToken: crypto.randomBytes(32).toString("hex"),
      createdBy: currentUser.id,
    });

    if (body.sendEmail !== false) {
      return this.sendOfferLetter(offer.id, currentUser);
    }

    return { message: "Offer letter created successfully", success: true, data: offer };
  }

  async getOfferLetters(currentUser: typeof users.$inferSelect, status?: string) {
    const result = await this.hiringRepo.getOfferLetters(currentUser.id, status);
    return { message: "Offer letters fetched successfully", success: true, data: result };
  }

  async getOfferLetterById(id: number, currentUser: typeof users.$inferSelect) {
    const result = await this.hiringRepo.getOfferLetterById(id, currentUser.id);
    if (!result) throw new Error("Offer letter not found");
    return { message: "Offer letter fetched successfully", success: true, data: result };
  }

  async sendOfferLetter(id: number, currentUser: typeof users.$inferSelect) {
    const offer = await this.hiringRepo.getOfferLetterById(id, currentUser.id);
    if (!offer) throw new Error("Offer letter not found");
    if (offer.status === "accepted") throw new Error("Offer letter has already been accepted");

    let acceptToken = offer.acceptToken;
    if (!acceptToken) {
      acceptToken = crypto.randomBytes(32).toString("hex");
      await this.hiringRepo.updateOfferLetter(id, { acceptToken });
    }

    const acceptUrl = `${getFrontendUrl()}/offer/accept?token=${acceptToken}`;
    const { token: documentToken } = await this.ensureDocumentUploadToken(offer.jobApplicationId);
    const documentUploadUrl = this.getDocumentUploadUrl(documentToken);

    const emailSent = await emailService.sendOfferLetterEmail({
      email: offer.candidateEmail,
      candidateName: offer.candidateName,
      jobTitle: offer.jobTitle || "the open position",
      salary: offer.salary || "As discussed",
      joiningDate: offer.joiningDate ? new Date(`${offer.joiningDate}T00:00:00`) : null,
      department: offer.department || "To be confirmed",
      designation: offer.designation || offer.jobTitle || "To be confirmed",
      notes: offer.notes || "",
      acceptUrl,
      documentUploadUrl,
    });

    const updated = await this.hiringRepo.updateOfferLetter(id, {
      status: "sent",
      sentAt: new Date(),
    });
    await this.hiringRepo.updateApplicationStatus(offer.jobApplicationId, "offer_sent");

    return {
      message: emailSent
        ? "Offer letter sent successfully"
        : "Offer letter saved as sent, but email could not be delivered",
      success: true,
      data: updated,
      emailSent,
    };
  }

  async updateOfferLetterStatus(
    id: number,
    status: string,
    currentUser: typeof users.$inferSelect,
  ) {
    const offer = await this.hiringRepo.getOfferLetterById(id, currentUser.id);
    if (!offer) throw new Error("Offer letter not found");

    const allowed = ["accepted", "declined"];
    if (!allowed.includes(status)) throw new Error("Invalid offer status");

    const patch: Record<string, unknown> = { status };
    if (status === "accepted") {
      patch.acceptedAt = new Date();
      await this.hiringRepo.updateApplicationStatus(offer.jobApplicationId, "offer_accepted");
    } else {
      await this.hiringRepo.updateApplicationStatus(offer.jobApplicationId, "offer_declined");
    }

    const updated = await this.hiringRepo.updateOfferLetter(id, patch);
    return { message: `Offer letter marked as ${status}`, success: true, data: updated };
  }

  async getPublicOfferLetter(token: string) {
    const offer = await this.hiringRepo.getOfferLetterByToken(token);
    if (!offer) throw new Error("Offer letter not found or link has expired");

    if (offer.status === "sent" && !offer.viewedAt) {
      await this.hiringRepo.updateOfferLetter(offer.id, { viewedAt: new Date() });
    }

    return {
      message: "Offer letter fetched successfully",
      success: true,
      data: {
        candidateName: offer.candidateName,
        candidateEmail: offer.candidateEmail,
        jobTitle: offer.jobTitle,
        salary: offer.salary,
        joiningDate: offer.joiningDate,
        department: offer.department,
        designation: offer.designation,
        notes: offer.notes,
        status: offer.status,
        sentAt: offer.sentAt,
        acceptedAt: offer.acceptedAt,
        documentUploadUrl: offer.jobApplicationId
          ? this.getDocumentUploadUrl(
              (await this.ensureDocumentUploadToken(offer.jobApplicationId)).token,
            )
          : null,
        documentsSubmitted: Boolean(
          parseCandidateDocuments(
            (await this.hiringRepo.getApplicationById(offer.jobApplicationId))?.candidateDocuments,
          )?.submittedAt,
        ),
      },
    };
  }

  async acceptPublicOfferLetter(token: string) {
    const offer = await this.hiringRepo.getOfferLetterByToken(token);
    if (!offer) throw new Error("Offer letter not found or link has expired");
    if (offer.status === "accepted") {
      return { message: "Offer letter already accepted", success: true, data: offer };
    }
    if (offer.status === "declined") throw new Error("This offer letter has already been declined");
    if (offer.status !== "sent") throw new Error("This offer letter is not available for acceptance");

    const updated = await this.hiringRepo.updateOfferLetter(offer.id, {
      status: "accepted",
      acceptedAt: new Date(),
    });
    await this.hiringRepo.updateApplicationStatus(offer.jobApplicationId, "offer_accepted");

    const { token: documentToken } = await this.ensureDocumentUploadToken(offer.jobApplicationId);
    const documentUploadUrl = this.getDocumentUploadUrl(documentToken);
    const application = await this.hiringRepo.getApplicationById(offer.jobApplicationId);
    if (application?.applicantEmail) {
      await emailService.sendCandidateDocumentUploadEmail({
        email: application.applicantEmail,
        candidateName: application.applicantName,
        jobTitle: offer.jobTitle || application.jobTitle || "the open position",
        uploadUrl: documentUploadUrl,
        reason: "offer_accepted",
      });
    }

    return {
      message: "Offer letter accepted successfully",
      success: true,
      data: { ...updated, documentUploadUrl },
    };
  }

  async declinePublicOfferLetter(token: string) {
    const offer = await this.hiringRepo.getOfferLetterByToken(token);
    if (!offer) throw new Error("Offer letter not found or link has expired");
    if (offer.status === "declined") {
      return { message: "Offer letter already declined", success: true, data: offer };
    }
    if (offer.status === "accepted") throw new Error("This offer letter has already been accepted");
    if (offer.status !== "sent") throw new Error("This offer letter is not available for response");

    const updated = await this.hiringRepo.updateOfferLetter(offer.id, { status: "declined" });
    await this.hiringRepo.updateApplicationStatus(offer.jobApplicationId, "offer_declined");

    return { message: "Offer letter declined", success: true, data: updated };
  }

  private mapOfferForOnboarding(offer: Record<string, unknown>) {
    return {
      ...offer,
      onboardingTasks: parseOnboardingTasks(
        typeof offer.onboardingTasks === "string" ? offer.onboardingTasks : null,
      ),
    };
  }

  async getOfferOnboarding(id: number, currentUser: typeof users.$inferSelect) {
    const offer = await this.hiringRepo.getOfferLetterById(id, currentUser.id);
    if (!offer) throw new Error("Offer letter not found");
    if (offer.status !== "accepted") throw new Error("Only accepted offers can be onboarded");

    const application = await this.hiringRepo.getApplicationById(offer.jobApplicationId);
    const candidateDocuments = parseCandidateDocuments(application?.candidateDocuments);
    const candidateProfile = parseCandidateProfile(application?.candidateProfile);
    const { token } = await this.ensureDocumentUploadToken(offer.jobApplicationId);

    return {
      message: "Offer onboarding fetched successfully",
      success: true,
      data: {
        ...this.mapOfferForOnboarding(offer),
        candidatePhone: application?.applicantPhone || candidateProfile?.phone || null,
        jobLocation: application?.jobLocation || null,
        candidateDocuments,
        candidateProfile,
        documentsSubmitted: Boolean(candidateDocuments?.submittedAt),
        documentUploadUrl: this.getDocumentUploadUrl(token),
      },
    };
  }

  async startOfferOnboarding(
    id: number,
    setupTasks: Record<string, boolean> | undefined,
    currentUser: typeof users.$inferSelect,
  ) {
    const offer = await this.hiringRepo.getOfferLetterById(id, currentUser.id);
    if (!offer) throw new Error("Offer letter not found");
    if (offer.status !== "accepted") throw new Error("Only accepted offers can start onboarding");
    if (offer.onboardingStatus === "completed") throw new Error("Onboarding is already completed");

    const tasks = parseOnboardingTasks(offer.onboardingTasks);
    if (setupTasks) {
      tasks.setup = { ...tasks.setup, ...setupTasks };
    }

    const updated = await this.hiringRepo.updateOfferLetter(id, {
      onboardingStatus: "in_progress",
      onboardingStartedAt: offer.onboardingStartedAt || new Date(),
      onboardingTasks: serializeOnboardingTasks(tasks),
    });
    await this.hiringRepo.updateApplicationStatus(offer.jobApplicationId, "onboarding_started");

    return {
      message: "Onboarding started successfully",
      success: true,
      data: this.mapOfferForOnboarding(updated),
    };
  }

  async updateOfferOnboardingTasks(
    id: number,
    body: {
      setup?: Record<string, boolean>;
      progress?: Record<string, boolean>;
      completion?: Record<string, boolean>;
    },
    currentUser: typeof users.$inferSelect,
  ) {
    const offer = await this.hiringRepo.getOfferLetterById(id, currentUser.id);
    if (!offer) throw new Error("Offer letter not found");
    if (offer.onboardingStatus === "not_started") throw new Error("Start onboarding before updating tasks");

    const tasks = parseOnboardingTasks(offer.onboardingTasks);
    if (body.setup) tasks.setup = { ...tasks.setup, ...body.setup };
    if (body.progress) tasks.progress = { ...tasks.progress, ...body.progress };
    if (body.completion) tasks.completion = { ...tasks.completion, ...body.completion };

    const updated = await this.hiringRepo.updateOfferLetter(id, {
      onboardingTasks: serializeOnboardingTasks(tasks),
    });

    return {
      message: "Onboarding tasks updated successfully",
      success: true,
      data: this.mapOfferForOnboarding(updated),
    };
  }

  async completeOfferOnboarding(id: number, currentUser: typeof users.$inferSelect) {
    const offer = await this.hiringRepo.getOfferLetterById(id, currentUser.id);
    if (!offer) throw new Error("Offer letter not found");
    if (offer.onboardingStatus !== "in_progress") throw new Error("Onboarding must be in progress to complete");

    const tasks = parseOnboardingTasks(offer.onboardingTasks);
    const completionDone = Object.values(tasks.completion).every(Boolean);
    if (!completionDone) throw new Error("Complete all onboarding checks before finishing");
    if (!offer.employeeUserId) throw new Error("Convert the candidate to an employee before completing onboarding");

    const updated = await this.hiringRepo.updateOfferLetter(id, {
      onboardingStatus: "completed",
      onboardingCompletedAt: new Date(),
    });
    await this.hiringRepo.updateApplicationStatus(offer.jobApplicationId, "onboarded");

    return {
      message: "Onboarding completed successfully",
      success: true,
      data: this.mapOfferForOnboarding(updated),
    };
  }

  async linkOfferEmployee(id: number, userId: number, currentUser: typeof users.$inferSelect) {
    const offer = await this.hiringRepo.getOfferLetterById(id, currentUser.id);
    if (!offer) throw new Error("Offer letter not found");

    const tasks = parseOnboardingTasks(offer.onboardingTasks);
    tasks.completion.convertToEmployee = true;

    const updated = await this.hiringRepo.updateOfferLetter(id, {
      employeeUserId: userId,
      onboardingTasks: serializeOnboardingTasks(tasks),
    });
    await this.hiringRepo.updateApplicationStatus(offer.jobApplicationId, "employee_created");

    return {
      message: "Offer linked to employee successfully",
      success: true,
      data: this.mapOfferForOnboarding(updated),
    };
  }

  async getOfferOnboardingPrefill(id: number, currentUser: typeof users.$inferSelect) {
    const offer = await this.hiringRepo.getOfferLetterById(id, currentUser.id);
    if (!offer) throw new Error("Offer letter not found");

    const application = await this.hiringRepo.getApplicationById(offer.jobApplicationId);
    const candidateProfile = parseCandidateProfile(application?.candidateProfile);
    const candidateDocuments = parseCandidateDocuments(application?.candidateDocuments);
    const profileFromDocuments = candidateDocuments?.profile || {};
    const profile = { ...profileFromDocuments, ...(candidateProfile || {}) };
    const addressSource = profile.currentAddress || profile.permanentAddress || "";
    const addressParts = splitAddressParts(addressSource);
    const ctc = parseSalaryNumber(offer.salary);
    const monthlyGross = ctc > 0 ? Math.round(ctc / 12) : 0;
    const bankIfsc = profile.bankIfsc || "";
    const candidateFiles = candidateDocuments?.files || {};
    const prefilledDocuments = Object.entries(candidateFiles)
      .filter(([, file]) => Boolean((file as { url?: string })?.url))
      .map(([key, file]) => {
        const typedFile = file as { url?: string; name?: string; type?: string; size?: number };
        return {
          name: typedFile.name || CANDIDATE_DOCUMENT_LABELS[key] || key,
          url: typedFile.url || "",
          type: typedFile.type || "application/octet-stream",
          size: typedFile.size || 0,
        };
      });

    return {
      message: "Offer prefill fetched successfully",
      success: true,
      data: {
        offerId: offer.id,
        name: offer.candidateName,
        email: offer.candidateEmail,
        phone: profile.phone || application?.applicantPhone || "",
        dob: profile.dateOfBirth || "",
        gender: normalizeGender(profile.gender),
        address: addressParts.street || addressSource,
        city: addressParts.city,
        state: addressParts.state,
        postalCode: addressParts.postalCode,
        contactName: profile.emergencyContactName || "",
        contactNumber: profile.emergencyContactPhone || "",
        employmentJobTitle: offer.designation || offer.jobTitle || "",
        employmentDepartmentName: offer.department || "",
        employmentJoiningDate: offer.joiningDate || "",
        employmentWorkLocation: application?.jobLocation || "",
        ctc: ctc > 0 ? String(ctc) : "",
        monthlyGross: monthlyGross > 0 ? String(monthlyGross) : "",
        monthlyPay: monthlyGross > 0 ? String(monthlyGross) : "",
        baseSalary: monthlyGross > 0 ? String(monthlyGross) : "",
        bankName: profile.bankName || deriveBankNameFromIfsc(bankIfsc),
        accountNumber: profile.bankAccountNumber || "",
        ifscCode: bankIfsc,
        profilePic: candidateFiles.photograph?.url || "",
        documents: prefilledDocuments,
      },
    };
  }

  async getPublicCandidateDocuments(token: string) {
    const application = await this.hiringRepo.getApplicationByDocumentToken(token);
    if (!application) throw new Error("Document upload link is invalid or expired");

    return {
      message: "Candidate document portal loaded",
      success: true,
      data: {
        candidateName: application.applicantName,
        candidateEmail: application.applicantEmail,
        jobTitle: application.jobTitle,
        resume: application.resume,
        documents: parseCandidateDocuments(application.candidateDocuments),
        profile: parseCandidateProfile(application.candidateProfile),
        documentsSubmitted: Boolean(parseCandidateDocuments(application.candidateDocuments)?.submittedAt),
      },
    };
  }

  async submitPublicCandidateDocuments(
    token: string,
    profile: Record<string, string>,
    files: Record<string, { url: string; name: string; type?: string; size?: number }>,
  ) {
    const application = await this.hiringRepo.getApplicationByDocumentToken(token);
    if (!application) throw new Error("Document upload link is invalid or expired");

    const requiredFiles = ["idProof", "addressProof", "photograph"];
    for (const key of requiredFiles) {
      if (!files[key]?.url) throw new Error(`${key} is required`);
    }

    const payload = {
      submittedAt: new Date().toISOString(),
      files,
      profile,
    };

    const patch: Record<string, unknown> = {
      candidateDocuments: JSON.stringify(payload),
      candidateProfile: JSON.stringify(profile),
    };
    if (profile.phone) patch.applicantPhone = profile.phone;

    await this.hiringRepo.updateApplication(application.id, patch);

    const job = await this.hiringRepo.getJobById(application.jobId);
    await this.syncDocumentSubmissionProgress(application.id, job?.adminId);

    return {
      message: "Documents submitted successfully",
      success: true,
      data: payload,
    };
  }

  async resendCandidateDocumentEmail(applicationId: number, currentUser: typeof users.$inferSelect) {
    const application = await this.hiringRepo.getApplicationById(applicationId);
    if (!application) throw new Error("Application not found");
    const job = await this.hiringRepo.getJobById(application.jobId);
    if (!job || job.adminId !== currentUser.id) throw new Error("Application not found for this organization");
    if (!application.applicantEmail) throw new Error("Candidate email is required");

    const { token } = await this.ensureDocumentUploadToken(applicationId);
    const uploadUrl = this.getDocumentUploadUrl(token);
    const emailSent = await emailService.sendCandidateDocumentUploadEmail({
      email: application.applicantEmail,
      candidateName: application.applicantName,
      jobTitle: application.jobTitle || job.title,
      uploadUrl,
      reason: "reminder",
    });

    return {
      message: emailSent ? "Document upload email sent" : "Email could not be delivered",
      success: true,
      data: { uploadUrl, emailSent },
    };
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
