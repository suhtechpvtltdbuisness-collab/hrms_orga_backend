import LeaveRepository from "../repository/leave.repo.js";
import { leave, users } from "../db/schema.js";

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
    if (!data.empId || !data.type || !data.total) {
      throw new Error("Employee ID, leave type, and total days are required");
    }

    const leaveData = {
      ...data,
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
}

export default LeaveServices;
