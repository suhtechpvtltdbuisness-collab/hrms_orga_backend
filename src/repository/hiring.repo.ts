import { jobs, jobApplication, interview, referrals, users } from "../db/schema.js";
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
      .select()
      .from(jobApplication)
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

  async getJobApplicationsCount(jobId: number) {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(jobApplication)
      .where(eq(jobApplication.jobId, jobId));
    return result[0]?.count ?? 0;
  }
}

export default HiringRepository;
