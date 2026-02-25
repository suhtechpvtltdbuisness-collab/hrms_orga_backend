import LeaveRepository from "../repository/leave.repo.js";
import { leave, users, Employee } from "../db/schema.js";
import { db } from "../db/connection.js";
import { eq } from "drizzle-orm";

class LeaveServices {
  private leaveRepo: LeaveRepository;
  constructor() {
    this.leaveRepo = new LeaveRepository();
  }

  async createLeave(
    data: typeof leave.$inferInsert,
    currentUser: typeof users.$inferSelect,
  ) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can create leave records");
    }

    // Validate required fields
    if (!data.empId || !data.type) {
      throw new Error("Employee ID and leave type are required");
    }

    // Validate that total leave equals sum of individual leaves
    const sickLeave = data.sickLeave || 0;
    const casualLeave = data.casualLeave || 0;
    const paidLeave = data.paidLeave || 0;
    const calculatedTotal = sickLeave + casualLeave + paidLeave;

    if (data.total && data.total !== calculatedTotal) {
      throw new Error(
        `Total leave (${data.total}) must equal the sum of sick leave (${sickLeave}), casual leave (${casualLeave}), and paid leave (${paidLeave}). Expected total: ${calculatedTotal}`,
      );
    }

    // Check if employee exists
    const employee = await db
      .select()
      .from(Employee)
      .where(eq(Employee.id, data.empId))
      .limit(1);

    if (!employee || employee.length === 0) {
      throw new Error("Employee not found with ID: " + data.empId);
    }

    const leaveData = {
      ...data,
      total: calculatedTotal,
      sickLeave,
      casualLeave,
      paidLeave,
      createdBy: currentUser.id,
    };

    const result = await this.leaveRepo.createLeave(leaveData);
    return {
      message: "successfully created leave",
      success: true,
      data: result,
    };
  }

  async getLeaveById(id: number) {
    const result = await this.leaveRepo.getLeaveById(id);
    if (!result) {
      throw new Error("Leave not found");
    }
    return {
      message: "successfully fetched leave",
      success: true,
      data: result,
    };
  }

  async getLeavesByEmployeeId(empId: number) {
    const result = await this.leaveRepo.getLeavesByEmployeeId(empId);
    return {
      message: "successfully fetched leaves by employee",
      success: true,
      data: result,
    };
  }

  async getAllLeaves() {
    const result = await this.leaveRepo.getAllLeaves();
    return {
      message: "successfully fetched leaves",
      success: true,
      data: result,
    };
  }

  async getLeavesByUserId(userId: number) {
    const result = await this.leaveRepo.getLeavesByUserId(userId);
    return {
      message: "successfully fetched leaves by user",
      success: true,
      data: result,
    };
  }

  async updateLeave(
    id: number,
    data: typeof leave.$inferInsert,
    currentUser: typeof users.$inferSelect,
  ) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can update leave records");
    }

    const existingLeave = await this.leaveRepo.getLeaveById(id);
    if (!existingLeave) {
      throw new Error("Leave not found");
    }

    const result = await this.leaveRepo.updateLeave(id, data);
    return {
      message: "successfully updated leave",
      success: true,
      data: result,
    };
  }

  async updateLeaveByUserId(
    userId: number,
    data: typeof leave.$inferInsert,
    currentUser: typeof users.$inferSelect,
  ) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can update leave records");
    }

    const result = await this.leaveRepo.updateLeaveByUserId(userId, data);
    return {
      message: "successfully updated leave",
      success: true,
      data: result,
    };
  }

  async deleteLeave(id: number, currentUser: typeof users.$inferSelect) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can delete leave records");
    }

    const existingLeave = await this.leaveRepo.getLeaveById(id);
    if (!existingLeave) {
      throw new Error("Leave not found");
    }

    const result = await this.leaveRepo.deleteLeave(id);
    return {
      message: "successfully deleted leave",
      success: true,
      data: result,
    };
  }

  async deleteLeaveByUserId(
    userId: number,
    currentUser: typeof users.$inferSelect,
  ) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can delete leave records");
    }

    const result = await this.leaveRepo.deleteLeaveByUserId(userId);
    return {
      message: "successfully deleted leave",
      success: true,
      data: result,
    };
  }
}

export default LeaveServices;
