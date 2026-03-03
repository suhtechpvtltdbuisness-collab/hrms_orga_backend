import EmploymentRepository from "../repository/employment.repo.js";
import { employment } from "../db/schema.js";

class EmploymentServices {
  private employmentRepo: EmploymentRepository;
  constructor() {
    this.employmentRepo = new EmploymentRepository();
  }

  async createEmployment(
    data: typeof employment.$inferInsert,
    currentUser: any,
  ) {
    // Note: employeeId now expects userId (from users table)
    // Validate required fields
    if (!data.employeeId || !data.departmentId) {
      throw new Error("User ID (employeeId) and Department ID are required");
    }

    const employmentData = {
      ...data,
      createdBy: currentUser.id,
    };

    const result = await this.employmentRepo.createEmployment(employmentData);
    return {
      message: "Employment record created successfully",
      success: true,
      data: result,
    };
  }

  async getEmploymentById(id: number) {
    const result = await this.employmentRepo.getEmploymentById(id);
    if (!result) {
      throw new Error("Employment record not found");
    }
    return {
      message: "Employment record fetched successfully",
      success: true,
      data: result,
    };
  }

  async getAllEmployments() {
    const result = await this.employmentRepo.getAllEmployments();
    return {
      message: "Employment records fetched successfully",
      success: true,
      data: result,
    };
  }

  async getEmploymentsByEmployeeId(employeeId: number) {
    const result =
      await this.employmentRepo.getEmploymentsByEmployeeId(employeeId);
    return {
      message: "Employment records fetched successfully",
      success: true,
      data: result,
    };
  }

  async getEmploymentsByDepartmentId(departmentId: number) {
    const result =
      await this.employmentRepo.getEmploymentsByDepartmentId(departmentId);
    return {
      message: "Employment records fetched successfully",
      success: true,
      data: result,
    };
  }

  async updateEmployment(
    id: number,
    data: Partial<typeof employment.$inferInsert>,
  ) {
    // Check if employment exists
    const existingEmployment = await this.employmentRepo.getEmploymentById(id);
    if (!existingEmployment) {
      throw new Error("Employment record not found");
    }

    const result = await this.employmentRepo.updateEmployment(id, data);
    return {
      message: "Employment record updated successfully",
      success: true,
      data: result,
    };
  }

  async updateEmploymentByUserId(
    userId: number,
    data: Partial<typeof employment.$inferInsert>,
    currentUser: any,
  ) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can update employment records");
    }

    const result = await this.employmentRepo.updateEmploymentByUserId(
      userId,
      data,
    );
    return {
      message: "Employment record updated successfully",
      success: true,
      data: result,
    };
  }

  async deleteEmployment(id: number) {
    // Check if employment exists
    const existingEmployment = await this.employmentRepo.getEmploymentById(id);
    if (!existingEmployment) {
      throw new Error("Employment record not found");
    }

    const result = await this.employmentRepo.deleteEmployment(id);
    return {
      message: "Employment record deleted successfully",
      success: true,
      data: result,
    };
  }

  async deleteEmploymentByUserId(userId: number, currentUser: any) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can delete employment records");
    }

    const result = await this.employmentRepo.deleteEmploymentByUserId(userId);
    return {
      message: "Employment record deleted successfully",
      success: true,
      data: result,
    };
  }
}

export default EmploymentServices;
