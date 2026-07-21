import { jobs, jobApplication, interview, offerLetter, referrals, users } from "../db/schema.js";
import { db } from "../db/connection.js";
import { eq, and, desc, isNull, or, ilike, sql } from "drizzle-orm";

class HiringRepository {
  async createJob(jobData: any) {
    const result = await db.insert(jobs).values(jobData).returning();
    return result[0];
  }

  async getAllJobs(adminId: number, filters?: { status?: string; visibility?: string }) {
    let whereClause = and(eq(jobs.adminId, adminId), eq(jobs.isDeleted, false));
    if (filters?.status === "active") {
      whereClause = and(whereClause, eq(jobs.isActive, true));
    }
    if (filters?.visibility) {
      whereClause = and(whereClause, eq(jobs.jobVisibility, filters.visibility));
    }
    return await db.select().from(jobs).where(whereClause).orderBy(desc(jobs.createdAt));
  }

  async getAllVisibleJobs() {
    return await db
      .select()
      .from(jobs)
      .where(
        and(
          eq(jobs.isActive, true),
          eq(jobs.isDeleted, false),
          or(eq(jobs.jobVisibility, "Public"), eq(jobs.jobVisibility, "All Employees")),
        ),
      )
      .orderBy(desc(jobs.createdAt));
  }

  async getJobById(id: number) {
    const result = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, id), eq(jobs.isDeleted, false)))
      .limit(1);
    return result[0];
  }

  async updateJob(id: number, jobData: any) {
    const result = await db
      .update(jobs)
      .set({ ...jobData, updatedAt: new Date() })
      .where(eq(jobs.id, id))
      .returning();
    return result[0];
  }

  async deleteJob(id: number) {
    const result = await db
      .update(jobs)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(jobs.id, id))
      .returning();
    return result[0];
  }

  async createApplication(applicationData: any) {
    const result = await db.insert(jobApplication).values(applicationData).returning();
    return result[0];
  }

  async getApplicationsByJobId(jobId: number) {
    return await db
      .select()
      .from(jobApplication)
      .where(eq(jobApplication.jobId, jobId))
      .orderBy(desc(jobApplication.createdAt));
  }

  async getApplicationById(id: number) {
    const result = await db
      .select({
        id: jobApplication.id,
        jobId: jobApplication.jobId,
        applicantName: jobApplication.applicantName,
        applicantEmail: jobApplication.applicantEmail,
        applicantPhone: jobApplication.applicantPhone,
        applicantExperience: jobApplication.applicantExperience,
        applicantSkills: jobApplication.applicantSkills,
        resume: jobApplication.resume,
        coverLetter: jobApplication.coverLetter,
        documentUploadToken: jobApplication.documentUploadToken,
        candidateDocuments: jobApplication.candidateDocuments,
        candidateProfile: jobApplication.candidateProfile,
        status: jobApplication.status,
        hrNotes: jobApplication.hrNotes,
        atsData: jobApplication.atsData,
        createdAt: jobApplication.createdAt,
        updatedAt: jobApplication.updatedAt,
        jobTitle: jobs.title,
        jobLocation: jobs.location,
      })
      .from(jobApplication)
      .leftJoin(jobs, eq(jobApplication.jobId, jobs.id))
      .where(eq(jobApplication.id, id))
      .limit(1);
    return result[0];
  }

  async updateApplicationStatus(id: number, status: string) {
    const result = await db
      .update(jobApplication)
      .set({ status, updatedAt: new Date() })
      .where(eq(jobApplication.id, id))
      .returning();
    return result[0];
  }

  async updateApplication(id: number, data: Partial<typeof jobApplication.$inferInsert>) {
    const [result] = await db
      .update(jobApplication)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(jobApplication.id, id))
      .returning();
    return result;
  }

  async getApplicationByDocumentToken(token: string) {
    const [result] = await db
      .select({
        id: jobApplication.id,
        jobId: jobApplication.jobId,
        applicantName: jobApplication.applicantName,
        applicantEmail: jobApplication.applicantEmail,
        applicantPhone: jobApplication.applicantPhone,
        resume: jobApplication.resume,
        documentUploadToken: jobApplication.documentUploadToken,
        candidateDocuments: jobApplication.candidateDocuments,
        candidateProfile: jobApplication.candidateProfile,
        status: jobApplication.status,
        jobTitle: jobs.title,
      })
      .from(jobApplication)
      .leftJoin(jobs, eq(jobApplication.jobId, jobs.id))
      .where(eq(jobApplication.documentUploadToken, token))
      .limit(1);
    return result;
  }

  async deleteApplication(id: number) {
    const result = await db
      .delete(jobApplication)
      .where(eq(jobApplication.id, id))
      .returning();
    return result[0];
  }

  async createInterview(interviewData: any) {
    const result = await db.insert(interview).values(interviewData).returning();
    return result[0];
  }

  async getAllInterviews(adminId?: number) {
    const query = db
      .select({
        id: interview.id,
        jobApplicationId: interview.jobApplicationId,
        interviewerId: interview.interviewerId,
        scheduledAt: interview.scheduledAt,
        instruction: interview.instruction,
        meetingLink: interview.meetingLink,
        status: interview.status,
        feedback: interview.feedback,
        createdAt: interview.createdAt,
        updatedAt: interview.updatedAt,
        candidateName: jobApplication.applicantName,
        candidateEmail: jobApplication.applicantEmail,
        jobTitle: jobs.title,
      })
      .from(interview)
      .leftJoin(jobApplication, eq(interview.jobApplicationId, jobApplication.id))
      .leftJoin(jobs, eq(jobApplication.jobId, jobs.id));

    if (adminId) {
      return query.where(eq(jobs.adminId, adminId)).orderBy(desc(interview.scheduledAt));
    }

    return query.orderBy(desc(interview.scheduledAt));
  }

  async getInterviewById(id: number) {
    const result = await db
      .select({
        id: interview.id,
        jobApplicationId: interview.jobApplicationId,
        interviewerId: interview.interviewerId,
        scheduledAt: interview.scheduledAt,
        instruction: interview.instruction,
        meetingLink: interview.meetingLink,
        status: interview.status,
        feedback: interview.feedback,
        createdAt: interview.createdAt,
        updatedAt: interview.updatedAt,
        candidateName: jobApplication.applicantName,
        candidateEmail: jobApplication.applicantEmail,
        jobTitle: jobs.title,
      })
      .from(interview)
      .leftJoin(jobApplication, eq(interview.jobApplicationId, jobApplication.id))
      .leftJoin(jobs, eq(jobApplication.jobId, jobs.id))
      .where(eq(interview.id, id))
      .limit(1);
    return result[0];
  }

  async updateInterview(id: number, interviewData: any) {
    const result = await db
      .update(interview)
      .set({ ...interviewData, updatedAt: new Date() })
      .where(eq(interview.id, id))
      .returning();
    return result[0];
  }

  async deleteInterview(id: number) {
    const result = await db
      .delete(interview)
      .where(eq(interview.id, id))
      .returning();
    return result[0];
  }

  async createOfferLetter(data: typeof offerLetter.$inferInsert) {
    const [result] = await db.insert(offerLetter).values(data).returning();
    return result;
  }

  async getOfferLetters(adminId: number, status?: string) {
    const conditions = [eq(offerLetter.adminId, adminId)];
    if (status) conditions.push(eq(offerLetter.status, status));

    return db
      .select({
        id: offerLetter.id,
        jobApplicationId: offerLetter.jobApplicationId,
        interviewId: offerLetter.interviewId,
        candidateName: offerLetter.candidateName,
        candidateEmail: offerLetter.candidateEmail,
        jobTitle: offerLetter.jobTitle,
        salary: offerLetter.salary,
        joiningDate: offerLetter.joiningDate,
        department: offerLetter.department,
        designation: offerLetter.designation,
        notes: offerLetter.notes,
        status: offerLetter.status,
        sentAt: offerLetter.sentAt,
        acceptedAt: offerLetter.acceptedAt,
        onboardingStatus: offerLetter.onboardingStatus,
        onboardingStartedAt: offerLetter.onboardingStartedAt,
        onboardingCompletedAt: offerLetter.onboardingCompletedAt,
        onboardingTasks: offerLetter.onboardingTasks,
        employeeUserId: offerLetter.employeeUserId,
        viewedAt: offerLetter.viewedAt,
        createdAt: offerLetter.createdAt,
        updatedAt: offerLetter.updatedAt,
      })
      .from(offerLetter)
      .where(and(...conditions))
      .orderBy(desc(offerLetter.createdAt));
  }

  async getOfferLetterById(id: number, adminId?: number) {
    const conditions = [eq(offerLetter.id, id)];
    if (adminId) conditions.push(eq(offerLetter.adminId, adminId));

    const [result] = await db
      .select({
        id: offerLetter.id,
        jobApplicationId: offerLetter.jobApplicationId,
        interviewId: offerLetter.interviewId,
        adminId: offerLetter.adminId,
        candidateName: offerLetter.candidateName,
        candidateEmail: offerLetter.candidateEmail,
        jobTitle: offerLetter.jobTitle,
        salary: offerLetter.salary,
        joiningDate: offerLetter.joiningDate,
        department: offerLetter.department,
        designation: offerLetter.designation,
        notes: offerLetter.notes,
        status: offerLetter.status,
        acceptToken: offerLetter.acceptToken,
        onboardingStatus: offerLetter.onboardingStatus,
        onboardingStartedAt: offerLetter.onboardingStartedAt,
        onboardingCompletedAt: offerLetter.onboardingCompletedAt,
        onboardingTasks: offerLetter.onboardingTasks,
        employeeUserId: offerLetter.employeeUserId,
        viewedAt: offerLetter.viewedAt,
        sentAt: offerLetter.sentAt,
        acceptedAt: offerLetter.acceptedAt,
        createdAt: offerLetter.createdAt,
        updatedAt: offerLetter.updatedAt,
      })
      .from(offerLetter)
      .where(and(...conditions))
      .limit(1);
    return result;
  }

  async getOfferLetterByToken(token: string) {
    const [result] = await db
      .select({
        id: offerLetter.id,
        jobApplicationId: offerLetter.jobApplicationId,
        candidateName: offerLetter.candidateName,
        candidateEmail: offerLetter.candidateEmail,
        jobTitle: offerLetter.jobTitle,
        salary: offerLetter.salary,
        joiningDate: offerLetter.joiningDate,
        department: offerLetter.department,
        designation: offerLetter.designation,
        notes: offerLetter.notes,
        status: offerLetter.status,
        acceptToken: offerLetter.acceptToken,
        viewedAt: offerLetter.viewedAt,
        sentAt: offerLetter.sentAt,
        acceptedAt: offerLetter.acceptedAt,
      })
      .from(offerLetter)
      .where(eq(offerLetter.acceptToken, token))
      .limit(1);
    return result;
  }

  async getOfferLetterByApplicationId(jobApplicationId: number, adminId: number) {
    const [result] = await db
      .select()
      .from(offerLetter)
      .where(and(eq(offerLetter.jobApplicationId, jobApplicationId), eq(offerLetter.adminId, adminId)))
      .orderBy(desc(offerLetter.createdAt))
      .limit(1);
    return result;
  }

  async updateOfferLetter(id: number, data: Partial<typeof offerLetter.$inferInsert>) {
    const [result] = await db
      .update(offerLetter)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(offerLetter.id, id))
      .returning();
    return result;
  }

  async createReferral(referralData: any) {
    const result = await db.insert(referrals).values(referralData).returning();
    return result[0];
  }

  async getAllReferrals(employeeId?: number) {
    let whereClause: any = undefined;
    if (employeeId) {
      whereClause = eq(referrals.employeeId, employeeId);
    }
    const query = db
      .select({
        id: referrals.id,
        employeeId: referrals.employeeId,
        referralCode: referrals.referralCode,
        jobId: referrals.jobId,
        candidateName: referrals.candidateName,
        candidateEmail: referrals.candidateEmail,
        candidatePhone: referrals.candidatePhone,
        resumeUrl: referrals.resumeUrl,
        status: referrals.status,
        notes: referrals.notes,
        createdAt: referrals.createdAt,
        updatedAt: referrals.updatedAt,
        employeeName: users.name,
        jobTitle: jobs.title,
      })
      .from(referrals)
      .leftJoin(users, eq(referrals.employeeId, users.id))
      .leftJoin(jobs, eq(referrals.jobId, jobs.id));

    if (whereClause) {
      return await query.where(whereClause).orderBy(desc(referrals.createdAt));
    }

    return await query.orderBy(desc(referrals.createdAt));
  }

  async getReferralById(id: number) {
    const result = await db
      .select({
        id: referrals.id,
        employeeId: referrals.employeeId,
        referralCode: referrals.referralCode,
        jobId: referrals.jobId,
        candidateName: referrals.candidateName,
        candidateEmail: referrals.candidateEmail,
        candidatePhone: referrals.candidatePhone,
        resumeUrl: referrals.resumeUrl,
        status: referrals.status,
        notes: referrals.notes,
        createdAt: referrals.createdAt,
        updatedAt: referrals.updatedAt,
        employeeName: users.name,
        jobTitle: jobs.title,
      })
      .from(referrals)
      .leftJoin(users, eq(referrals.employeeId, users.id))
      .leftJoin(jobs, eq(referrals.jobId, jobs.id))
      .where(eq(referrals.id, id))
      .limit(1);
    return result[0];
  }

  async getReferralByCode(code: string) {
    const result = await db
      .select()
      .from(referrals)
      .where(eq(referrals.referralCode, code))
      .limit(1);
    return result[0];
  }

  async updateReferral(id: number, referralData: any) {
    const result = await db
      .update(referrals)
      .set({ ...referralData, updatedAt: new Date() })
      .where(eq(referrals.id, id))
      .returning();
    return result[0];
  }

  async updateApplicationNotes(id: number, hrNotes: string) {
    const result = await db
      .update(jobApplication)
      .set({ hrNotes, updatedAt: new Date() })
      .where(eq(jobApplication.id, id))
      .returning();
    return result[0];
  }

  async updateApplicationAtsScore(id: number, atsData: any) {
    const result = await db
      .update(jobApplication)
      .set({ atsData, updatedAt: new Date() })
      .where(eq(jobApplication.id, id))
      .returning();
    return result[0];
  }

  async getJobApplicationsCount(jobId: number) {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(jobApplication)
      .where(eq(jobApplication.jobId, jobId));
    return result[0]?.count ?? 0;
  }
}

export default HiringRepository;
