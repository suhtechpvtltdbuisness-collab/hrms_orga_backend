import LeaveRequestRepository from "../repository/leaveRequest.repo.js";
import LeaveRepository from "../repository/leave.repo.js";
import { leave, leaveRequest, users, Employee } from "../db/schema.js";
import { db } from "../db/connection.js";
import { eq } from "drizzle-orm";

type LeaveType = "sick" | "casual" | "earned" | "maternity" | "paternity";

class LeaveRequestServices {
  private leaveRequestRepo: LeaveRequestRepository;
  private leaveRepo: LeaveRepository;

  constructor() {
    this.leaveRequestRepo = new LeaveRequestRepository();
    this.leaveRepo = new LeaveRepository();
  }

  private calculateDays(fromDate: string, toDate: string) {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (from > to) {
      throw new Error("fromDate cannot be after toDate");
    }
    const diffMs = to.getTime() - from.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  }

  private getAllocationFields(leaveType: string) {
    switch (leaveType) {
      case "sick":
        return { allocated: "sickLeave" as const, taken: "sickLeaveTaken" as const };
      case "casual":
        return {
          allocated: "casualLeave" as const,
          taken: "casualLeaveTaken" as const,
        };
      default:
        return { allocated: "paidLeave" as const, taken: "paidLeaveTaken" as const };
    }
  }

  private normalizeStatus(status?: string) {
    if (!status) {
      return undefined;
    }

    if (status === "pending") {
      return "submitted" as const;
    }

    if (["submitted", "approved", "rejected"].includes(status)) {
      return status as "submitted" | "approved" | "rejected";
    }

    const error = new Error("Invalid leave request status filter") as Error & {
      statusCode?: number;
    };
    error.statusCode = 400;
    throw error;
  }

  private async validateEmployee(empId: number) {
    const [employee] = await db
      .select()
      .from(Employee)
      .where(eq(Employee.userId, empId))
      .limit(1);

    if (!employee) {
      throw new Error("Employee not found with user ID: " + empId);
    }
  }

  async createLeaveRequest(
    body: {
      empId?: number;
      leaveType: LeaveType;
      fromDate: string;
      toDate: string;
      reason?: string;
    },
    currentUser: typeof users.$inferSelect,
  ) {
    const empId = body.empId ?? currentUser.id;

    if (currentUser.type === "employee" && empId !== currentUser.id) {
      throw new Error("You can only submit leave requests for yourself");
    }

    if (!body.leaveType || !body.fromDate || !body.toDate) {
      throw new Error("leaveType, fromDate, and toDate are required");
    }

    await this.validateEmployee(empId);

    const days = this.calculateDays(body.fromDate, body.toDate);
    const balance = await this.leaveRepo.getBalanceByEmpUserId(empId);

    if (!balance) {
      throw new Error(
        "No leave balance allocated. Contact your admin to allocate leave.",
      );
    }

    const { allocated, taken } = this.getAllocationFields(body.leaveType);
    const remaining = (balance[allocated] ?? 0) - (balance[taken] ?? 0);

    if (days > remaining) {
      throw new Error(
        `Insufficient leave balance. Remaining: ${remaining}, requested: ${days}`,
      );
    }

    const result = await this.leaveRequestRepo.createLeaveRequest({
      empId,
      leaveType: body.leaveType,
      fromDate: body.fromDate,
      toDate: body.toDate,
      days,
      reason: body.reason ?? null,
      status: "submitted",
      isDeleted: false,
    });

    const enriched = await this.leaveRequestRepo.getLeaveRequestById(result.id);

    return {
      message: "Leave request submitted successfully",
      success: true,
      data: enriched,
    };
  }

  async getLeaveRequests(
    filters: { status?: string; empId?: number },
    currentUser: typeof users.$inferSelect,
  ) {
    const queryFilters = {
      ...filters,
      status: this.normalizeStatus(filters.status),
    };

    if (!currentUser.isAdmin && currentUser.type !== "admin") {
      queryFilters.empId = currentUser.id;
    }

    const result = await this.leaveRequestRepo.getLeaveRequests(queryFilters);

    return {
      message: "Leave requests fetched successfully",
      success: true,
      data: result,
    };
  }

  async getLeaveRequestById(
    id: number,
    currentUser: typeof users.$inferSelect,
  ) {
    const result = await this.leaveRequestRepo.getLeaveRequestById(id);
    if (!result) {
      throw new Error("Leave request not found");
    }

    const isAdmin =
      currentUser.isAdmin || currentUser.type === "admin";
    if (!isAdmin && result.empId !== currentUser.id) {
      throw new Error("You are not allowed to view this leave request");
    }

    return {
      message: "Leave request fetched successfully",
      success: true,
      data: result,
    };
  }

  private async applyApprovedLeaveToBalance(
    empId: number,
    leaveType: string,
    days: number,
  ) {
    const balance = await this.leaveRepo.getBalanceByEmpUserId(empId);
    if (!balance) {
      throw new Error("Leave balance record not found for employee");
    }

    const { allocated, taken } = this.getAllocationFields(leaveType);
    const remaining = (balance[allocated] ?? 0) - (balance[taken] ?? 0);

    if (days > remaining) {
      throw new Error(
        `Cannot approve: insufficient balance (remaining ${remaining})`,
      );
    }

    const updatedTaken = (balance[taken] ?? 0) + days;
    const updateData: Partial<typeof leave.$inferInsert> = {
      [taken]: updatedTaken,
      taken: (balance.taken ?? 0) + days,
    };

    await this.leaveRepo.updateLeave(balance.id, updateData as typeof leave.$inferInsert);
  }

  async approveLeaveRequest(id: number, currentUser: typeof users.$inferSelect) {
    if (!currentUser.isAdmin && currentUser.type !== "admin") {
      throw new Error("Only admins can approve leave requests");
    }

    const existing = await this.leaveRequestRepo.getLeaveRequestById(id);
    if (!existing) {
      throw new Error("Leave request not found");
    }

    if (existing.status !== "submitted") {
      throw new Error("Only submitted requests can be approved");
    }

    await this.applyApprovedLeaveToBalance(
      existing.empId,
      existing.leaveType,
      existing.days,
    );

    await this.leaveRequestRepo.updateLeaveRequest(id, {
      status: "approved",
      reviewedBy: currentUser.id,
      reviewedAt: new Date(),
      rejectionReason: null,
    });

    const enriched = await this.leaveRequestRepo.getLeaveRequestById(id);

    return {
      message: "Leave request approved successfully",
      success: true,
      data: enriched,
    };
  }

  async rejectLeaveRequest(
    id: number,
    body: { rejectionReason?: string },
    currentUser: typeof users.$inferSelect,
  ) {
    if (!currentUser.isAdmin && currentUser.type !== "admin") {
      throw new Error("Only admins can reject leave requests");
    }

    const existing = await this.leaveRequestRepo.getLeaveRequestById(id);
    if (!existing) {
      throw new Error("Leave request not found");
    }

    if (existing.status !== "submitted") {
      throw new Error("Only submitted requests can be rejected");
    }

    await this.leaveRequestRepo.updateLeaveRequest(id, {
      status: "rejected",
      reviewedBy: currentUser.id,
      reviewedAt: new Date(),
      rejectionReason: body.rejectionReason ?? null,
    });

    const enriched = await this.leaveRequestRepo.getLeaveRequestById(id);

    return {
      message: "Leave request rejected successfully",
      success: true,
      data: enriched,
    };
  }
}

export default LeaveRequestServices;
