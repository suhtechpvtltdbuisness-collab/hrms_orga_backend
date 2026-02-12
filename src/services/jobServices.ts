import JobRepository from "../repository/job.repo.js";
import UserRepository from "../repository/user.repo.js";
import { jobs, users } from "../db/schema.js";

class JobServices {
  private jobRepo: JobRepository;
  private userRepo: UserRepository;
  constructor() {
    this.jobRepo = new JobRepository();
    this.userRepo = new UserRepository();
  }
  async createJob(
    jobData: typeof jobs.$inferInsert,
    currentUser: typeof users.$inferSelect,
  ) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can create jobs");
    }
    const newJobData = { ...jobData, adminId: currentUser.id };
    const result = await this.jobRepo.createJob(newJobData);
    return {
      message: "Successfully created job",
      success: true,
      data: result,
    };
  }

  async getAllJobs(currentUser: typeof users.$inferSelect) {
    if (!currentUser.isAdmin) {
        const userAdmin=await 

    }   
    const result = await this.jobRepo.getAllJobs(currentUser.);
    return {
      message: "Successfully fetched jobs",
      success: true,
      data: result,
    };
  }


  async getJobById(id: number, currentUser: typeof users.$inferSelect) {
    const result = await this.jobRepo.getJobById(id);
    if (!result) {
      throw new Error("Job not found");
    }
    return {
      message: "Successfully fetched job details",
      success: true,
      data: result,
    };
  }

  async updateJob(
    id: number,
    jobData: typeof jobs.$inferInsert,
    currentUser: typeof users.$inferSelect,
  ) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can update jobs");
    }
    const existingJob = await this.jobRepo.getJobById(id);
    if (!existingJob) {
      throw new Error("Job not found");
    }
    const updatedJobData = { ...existingJob, ...jobData };
    const result = await this.jobRepo.updateJob(id, updatedJobData);
    return {
      message: "Successfully updated job",
      success: true,
      data: result,
    };
  }
}

export default JobServices;
