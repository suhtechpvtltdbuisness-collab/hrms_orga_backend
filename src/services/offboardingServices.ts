import { OffboardingRepository } from "../repository/offboarding.repo.js";
import { offboarding, users } from "../db/schema.js";

export class OffboardingService {
  private offboardingRepo: OffboardingRepository;

  constructor() {
    this.offboardingRepo = new OffboardingRepository();
  }

  async createOffboarding(
    data: typeof offboarding.$inferInsert,
    currentUser: any,
  ) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can create offboarding records");
    }

    // Note: empId and managerId now expect userId (from users table)
    // Validate required fields
    if (!data.empId) {
      throw new Error("User ID (empId) is required");
    }

    return await this.offboardingRepo.createOffboarding(data);
  }

  async getAllOffboardings(currentUser: any) {
    return await this.offboardingRepo.getAllOffboardings();
  }

  async getOffboardingById(id: number, currentUser: any) {
    const offboardingRecord = await this.offboardingRepo.getOffboardingById(id);

    if (offboardingRecord.length === 0) {
      throw new Error("Offboarding record not found");
    }

    return offboardingRecord;
  }

  async getOffboardingsByEmployeeId(empId: number, currentUser: any) {
    return await this.offboardingRepo.getOffboardingsByEmployeeId(empId);
  }

  async updateOffboarding(
    id: number,
    data: typeof offboarding.$inferInsert,
    currentUser: any,
  ) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can update offboarding records");
    }

    const existingRecord = await this.offboardingRepo.getOffboardingById(id);
    if (existingRecord.length === 0) {
      throw new Error("Offboarding record not found");
    }

    return await this.offboardingRepo.updateOffboarding(id, data);
  }

  async updateOffboardingByUserId(
    userId: number,
    data: typeof offboarding.$inferInsert,
    currentUser: any,
  ) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can update offboarding records");
    }

    return await this.offboardingRepo.updateOffboardingByUserId(userId, data);
  }

  async deleteOffboarding(id: number, currentUser: any) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can delete offboarding records");
    }

    const existingRecord = await this.offboardingRepo.getOffboardingById(id);
    if (existingRecord.length === 0) {
      throw new Error("Offboarding record not found");
    }

    return await this.offboardingRepo.deleteOffboarding(id);
  }

  async deleteOffboardingByUserId(userId: number, currentUser: any) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can delete offboarding records");
    }

    return await this.offboardingRepo.deleteOffboardingByUserId(userId);
  }
}
