import { TrainingRepository } from "../repository/training.repo.js";
import { trainingAndDevelopment, users } from "../db/schema.js";

export class TrainingService {
  private trainingRepo: TrainingRepository;

  constructor() {
    this.trainingRepo = new TrainingRepository();
  }

  async createTraining(
    data: typeof trainingAndDevelopment.$inferInsert,
    currentUser: any,
  ) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can create training records");
    }

    // Validate required fields
    if (!data.empId) {
      throw new Error("Employee ID is required");
    }

    return await this.trainingRepo.createTraining(data);
  }

  async getAllTrainings(currentUser: any) {
    return await this.trainingRepo.getAllTrainings();
  }

  async getTrainingById(id: number, currentUser: any) {
    const training = await this.trainingRepo.getTrainingById(id);

    if (training.length === 0) {
      throw new Error("Training record not found");
    }

    return training;
  }

  async getTrainingsByEmployeeId(empId: number, currentUser: any) {
    return await this.trainingRepo.getTrainingsByEmployeeId(empId);
  }

  async updateTraining(
    id: number,
    data: typeof trainingAndDevelopment.$inferInsert,
    currentUser: any,
  ) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can update training records");
    }

    const existingRecord = await this.trainingRepo.getTrainingById(id);
    if (existingRecord.length === 0) {
      throw new Error("Training record not found");
    }

    return await this.trainingRepo.updateTraining(id, data);
  }

  async updateTrainingByUserId(
    userId: number,
    data: typeof trainingAndDevelopment.$inferInsert,
    currentUser: any,
  ) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can update training records");
    }

    return await this.trainingRepo.updateTrainingByUserId(userId, data);
  }

  async deleteTraining(id: number, currentUser: any) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can delete training records");
    }

    const existingRecord = await this.trainingRepo.getTrainingById(id);
    if (existingRecord.length === 0) {
      throw new Error("Training record not found");
    }

    return await this.trainingRepo.deleteTraining(id);
  }

  async deleteTrainingByUserId(userId: number, currentUser: any) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can delete training records");
    }

    return await this.trainingRepo.deleteTrainingByUserId(userId);
  }
}
