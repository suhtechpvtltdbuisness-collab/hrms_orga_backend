import { jobs } from "../db/schema.js";
import { db } from "../db/connection.js";
import { eq, and } from "drizzle-orm";

class JobRepository {
  async createJob(jobData: typeof jobs.$inferInsert) {
    const result = await db.insert(jobs).values(jobData).returning();
    return result[0];
  }
  async getAllJobs(id: number) {
    return await db.select().from(jobs).where(eq(jobs.adminId, id));
  }
  async getJobById(id: number) {
    return await db.select().from(jobs).where(eq(jobs.id, id));
  }

  async updateJob(id: number, jobData: typeof jobs.$inferInsert) {
    const result = await db
      .update(jobs)
      .set(jobData)
      .where(eq(jobs.id, id))
      .returning();
    return result[0];
  }
}

export default JobRepository;
