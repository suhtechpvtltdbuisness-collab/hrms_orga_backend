import { PerformanceRepository } from "../repository/performance.repo.js";
import { performance, users } from "../db/schema.js";

export class PerformanceService {
  private performanceRepo: PerformanceRepository;

  constructor() {
    this.performanceRepo = new PerformanceRepository();
  }

  async createPerformance(
    data: typeof performance.$inferInsert,
    currentUser: any,
  ) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can create performance records");
    }

    // Validate required fields
    if (!data.empId) {
      throw new Error("Employee ID is required");
    }

    return await this.performanceRepo.createPerformance(data);
  }

  async getAllPerformances(currentUser: any) {
    return await this.performanceRepo.getAllPerformances();
  }

  async getPerformanceById(id: number, currentUser: any) {
    const performanceRecord = await this.performanceRepo.getPerformanceById(id);

    if (performanceRecord.length === 0) {
      throw new Error("Performance record not found");
    }

    return performanceRecord;
  }

  async getPerformancesByEmployeeId(empId: number, currentUser: any) {
    return await this.performanceRepo.getPerformancesByEmployeeId(empId);
  }

  async updatePerformance(
    id: number,
    data: typeof performance.$inferInsert,
    currentUser: any,
  ) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can update performance records");
    }

    const existingRecord = await this.performanceRepo.getPerformanceById(id);
    if (existingRecord.length === 0) {
      throw new Error("Performance record not found");
    }

    return await this.performanceRepo.updatePerformance(id, data);
  }

  async updatePerformanceByUserId(
    userId: number,
    data: typeof performance.$inferInsert,
    currentUser: any,
  ) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can update performance records");
    }

    return await this.performanceRepo.updatePerformanceByUserId(userId, data);
  }

  async deletePerformance(id: number, currentUser: any) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can delete performance records");
    }

    const existingRecord = await this.performanceRepo.getPerformanceById(id);
    if (existingRecord.length === 0) {
      throw new Error("Performance record not found");
    }

    return await this.performanceRepo.deletePerformance(id);
  }

  async deletePerformanceByUserId(userId: number, currentUser: any) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can delete performance records");
    }

    return await this.performanceRepo.deletePerformanceByUserId(userId);
  }
}
