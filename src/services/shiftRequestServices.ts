import ShiftRequestRepository from "../repository/shiftRequest.repo.js";
import ShiftTypeRepository from "../repository/shiftType.repo.js";
import { shiftRequest, users, Employee } from "../db/schema.js";
import { db } from "../db/connection.js";
import { eq } from "drizzle-orm";

class ShiftRequestServices {
  private shiftRequestRepo: ShiftRequestRepository;
  private shiftTypeRepo: ShiftTypeRepository;

  constructor() {
    this.shiftRequestRepo = new ShiftRequestRepository();
    this.shiftTypeRepo = new ShiftTypeRepository();
  }

  private canManageOthers(currentUser: typeof users.$inferSelect) {
    return (
      currentUser.isAdmin ||
      currentUser.type === "manager" ||
      currentUser.type === "admin"
    );
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
    return employee;
  }

  async createShiftRequest(
    body: {
      empId?: number;
      shiftTypeId: number;
      fromDate: string;
      toDate: string;
      comment?: string;
    },
    currentUser: typeof users.$inferSelect,
  ) {
    const empId = body.empId ?? currentUser.id;

    if (!this.canManageOthers(currentUser) && empId !== currentUser.id) {
      throw new Error("You can only create shift requests for yourself");
    }

    if (!body.shiftTypeId || !body.fromDate || !body.toDate) {
      throw new Error("shiftTypeId, fromDate, and toDate are required");
    }

    if (body.fromDate > body.toDate) {
      throw new Error("fromDate cannot be after toDate");
    }

    const employee = await this.validateEmployee(empId);
    const requesterAdminId = currentUser.isAdmin
      ? currentUser.id
      : (await this.validateEmployee(currentUser.id)).adminId;
    if (employee.adminId !== requesterAdminId) throw new Error("Employee does not belong to this organization");

    const shiftTypeRecord = await this.shiftTypeRepo.getShiftTypeById(
      body.shiftTypeId,
      requesterAdminId,
    );
    if (!shiftTypeRecord) {
      throw new Error("Shift type not found");
    }

    const result = await this.shiftRequestRepo.createShiftRequest({
      empId,
      shiftTypeId: body.shiftTypeId,
      fromDate: body.fromDate,
      toDate: body.toDate,
      comment: body.comment ?? null,
      status: "submitted",
      isDeleted: false,
    });

    const enriched = await this.shiftRequestRepo.getShiftRequestById(result.id, requesterAdminId);

    return {
      message: "Shift request submitted successfully",
      success: true,
      data: enriched,
    };
  }

  async getShiftRequests(
    filters: { status?: string; empId?: number },
    currentUser: typeof users.$inferSelect,
  ) {
    const queryFilters: { status?: string; empId?: number; adminId?: number } = { ...filters };

    // Non-admins (employees, managers) can only view their own requests
    if (!currentUser.isAdmin) {
      queryFilters.empId = currentUser.id;
      queryFilters.adminId = (await this.validateEmployee(currentUser.id)).adminId;
    } else {
      queryFilters.adminId = currentUser.id;
    }

    const result = await this.shiftRequestRepo.getShiftRequests(queryFilters);

    return {
      message: "Shift requests fetched successfully",
      success: true,
      data: result,
    };
  }

  async getShiftRequestById(
    id: number,
    currentUser: typeof users.$inferSelect,
  ) {
    const adminId = currentUser.isAdmin ? currentUser.id : (await this.validateEmployee(currentUser.id)).adminId;
    const result = await this.shiftRequestRepo.getShiftRequestById(id, adminId);
    if (!result) {
      throw new Error("Shift request not found");
    }

    if (!currentUser.isAdmin && result.empId !== currentUser.id) {
      throw new Error("You are not allowed to view this shift request");
    }

    return {
      message: "Shift request fetched successfully",
      success: true,
      data: result,
    };
  }

  async approveShiftRequest(
    id: number,
    currentUser: typeof users.$inferSelect,
  ) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can approve shift requests");
    }

    const existing = await this.shiftRequestRepo.getShiftRequestById(id, currentUser.id);
    if (!existing) {
      throw new Error("Shift request not found");
    }

    if (existing.status !== "submitted") {
      throw new Error("Only submitted requests can be approved");
    }

    await this.shiftRequestRepo.updateShiftRequest(id, {
      status: "approved",
      reviewedBy: currentUser.id,
      reviewedAt: new Date(),
      rejectionReason: null,
    });

    const enriched = await this.shiftRequestRepo.getShiftRequestById(id, currentUser.id);

    return {
      message: "Shift request approved successfully",
      success: true,
      data: enriched,
    };
  }

  async rejectShiftRequest(
    id: number,
    body: { rejectionReason?: string },
    currentUser: typeof users.$inferSelect,
  ) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can reject shift requests");
    }

    const existing = await this.shiftRequestRepo.getShiftRequestById(id, currentUser.id);
    if (!existing) {
      throw new Error("Shift request not found");
    }

    if (existing.status !== "submitted") {
      throw new Error("Only submitted requests can be rejected");
    }

    await this.shiftRequestRepo.updateShiftRequest(id, {
      status: "rejected",
      reviewedBy: currentUser.id,
      reviewedAt: new Date(),
      rejectionReason: body.rejectionReason ?? null,
    });

    const enriched = await this.shiftRequestRepo.getShiftRequestById(id, currentUser.id);

    return {
      message: "Shift request rejected successfully",
      success: true,
      data: enriched,
    };
  }
}

export default ShiftRequestServices;
