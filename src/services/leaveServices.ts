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
    if (!data.empId) {
      throw new Error("Employee ID is required");
    }

    // Check if employee exists
    const employee = await db
      .select()
      .from(Employee)
      .where(eq(Employee.userId, data.empId))
      .limit(1);

    if (!employee || employee.length === 0) {
      throw new Error("Employee not found with ID: " + data.empId);
    }

    // Calculate total leave from individual leave types
    const sickLeave = data.sickLeave || 0;
    const casualLeave = data.casualLeave || 0;
    const paidLeave = data.paidLeave || 0;
    const calculatedTotal = sickLeave + casualLeave + paidLeave;

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

    // Recalculate totals if individual leave values are provided
    const updateData: any = { ...data };

    if (
      data.sickLeave !== undefined ||
      data.casualLeave !== undefined ||
      data.paidLeave !== undefined
    ) {
      const sickLeave = data.sickLeave ?? existingLeave.sickLeave;
      const casualLeave = data.casualLeave ?? existingLeave.casualLeave;
      const paidLeave = data.paidLeave ?? existingLeave.paidLeave;
      updateData.total = sickLeave + casualLeave + paidLeave;
    }

    if (
      data.sickLeaveTaken !== undefined ||
      data.casualLeaveTaken !== undefined ||
      data.paidLeaveTaken !== undefined
    ) {
      const sickLeaveTaken =
        data.sickLeaveTaken ?? existingLeave.sickLeaveTaken;
      const casualLeaveTaken =
        data.casualLeaveTaken ?? existingLeave.casualLeaveTaken;
      const paidLeaveTaken =
        data.paidLeaveTaken ?? existingLeave.paidLeaveTaken;
      updateData.taken = sickLeaveTaken + casualLeaveTaken + paidLeaveTaken;

      // Validate that taken leaves don't exceed allocated leaves
      const sickLeave = updateData.sickLeave ?? existingLeave.sickLeave;
      const casualLeave = updateData.casualLeave ?? existingLeave.casualLeave;
      const paidLeave = updateData.paidLeave ?? existingLeave.paidLeave;

      if (sickLeaveTaken > sickLeave) {
        throw new Error(
          `Sick leave taken (${sickLeaveTaken}) cannot exceed allocated sick leave (${sickLeave})`,
        );
      }
      if (casualLeaveTaken > casualLeave) {
        throw new Error(
          `Casual leave taken (${casualLeaveTaken}) cannot exceed allocated casual leave (${casualLeave})`,
        );
      }
      if (paidLeaveTaken > paidLeave) {
        throw new Error(
          `Paid leave taken (${paidLeaveTaken}) cannot exceed allocated paid leave (${paidLeave})`,
        );
      }
    }

    const result = await this.leaveRepo.updateLeave(id, updateData);
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

    // Get existing leave data for the user
    const existingLeaves = await this.leaveRepo.getLeavesByUserId(userId);
    if (!existingLeaves || existingLeaves.length === 0) {
      throw new Error("Leave record not found for this user");
    }
    const existingLeave = existingLeaves[0].leave;

    // Recalculate totals if individual leave values are provided
    const updateData: any = { ...data };

    if (
      data.sickLeave !== undefined ||
      data.casualLeave !== undefined ||
      data.paidLeave !== undefined
    ) {
      const sickLeave = data.sickLeave ?? existingLeave.sickLeave;
      const casualLeave = data.casualLeave ?? existingLeave.casualLeave;
      const paidLeave = data.paidLeave ?? existingLeave.paidLeave;
      updateData.total = sickLeave + casualLeave + paidLeave;
    }

    if (
      data.sickLeaveTaken !== undefined ||
      data.casualLeaveTaken !== undefined ||
      data.paidLeaveTaken !== undefined
    ) {
      const sickLeaveTaken =
        data.sickLeaveTaken ?? existingLeave.sickLeaveTaken;
      const casualLeaveTaken =
        data.casualLeaveTaken ?? existingLeave.casualLeaveTaken;
      const paidLeaveTaken =
        data.paidLeaveTaken ?? existingLeave.paidLeaveTaken;
      updateData.taken = sickLeaveTaken + casualLeaveTaken + paidLeaveTaken;

      // Validate that taken leaves don't exceed allocated leaves
      const sickLeave = updateData.sickLeave ?? existingLeave.sickLeave;
      const casualLeave = updateData.casualLeave ?? existingLeave.casualLeave;
      const paidLeave = updateData.paidLeave ?? existingLeave.paidLeave;

      if (sickLeaveTaken > sickLeave) {
        throw new Error(
          `Sick leave taken (${sickLeaveTaken}) cannot exceed allocated sick leave (${sickLeave})`,
        );
      }
      if (casualLeaveTaken > casualLeave) {
        throw new Error(
          `Casual leave taken (${casualLeaveTaken}) cannot exceed allocated casual leave (${casualLeave})`,
        );
      }
      if (paidLeaveTaken > paidLeave) {
        throw new Error(
          `Paid leave taken (${paidLeaveTaken}) cannot exceed allocated paid leave (${paidLeave})`,
        );
      }
    }

    const result = await this.leaveRepo.updateLeaveByUserId(userId, updateData);
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
