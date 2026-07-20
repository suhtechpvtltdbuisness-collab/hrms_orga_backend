import { users } from "../db/schema.js";
import { ShiftAssignmentRepository } from "../repository/shiftAssignment.repo.js";
import ShiftRequestRepository from "../repository/shiftRequest.repo.js";

type AssignmentInput = { employeeId: number; shiftTypeId: number | null };

function validateDate(value: unknown, field = "date"): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${field} must use YYYY-MM-DD format`);
  }
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error(`${field} is not a valid date`);
  }
  return value;
}

function requireAdmin(currentUser: typeof users.$inferSelect) {
  if (!currentUser.isAdmin && currentUser.roleId !== 0 && currentUser.roleId !== 1) {
    throw new Error("Only admins can manage shift assignments");
  }
}

export class ShiftAssignmentServices {
  private repo = new ShiftAssignmentRepository();
  private shiftRequestRepo = new ShiftRequestRepository();

  async getRoster(
    query: Record<string, unknown>,
    currentUser: typeof users.$inferSelect,
  ) {
    requireAdmin(currentUser);
    const date = validateDate(query.date);
    const search = typeof query.search === "string" ? query.search.trim() : "";
    const page = query.page === undefined ? 1 : Number(query.page);
    const limit = query.limit === undefined ? 10 : Number(query.limit);
    if (!Number.isInteger(page) || page < 1) throw new Error("page must be a positive integer");
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new Error("limit must be an integer between 1 and 100");
    }

    const [{ rows, total }, availableShiftTypes] = await Promise.all([
      this.repo.getRoster(currentUser.id, date, search, page, limit),
      this.repo.getAvailableShiftTypes(currentUser.id),
    ]);
    const data = rows.map((row) => ({
      assignmentId: row.assignmentId,
      employeeId: row.employeeId,
      employeeCode: `EMP-${String(row.employeeId).padStart(3, "0")}`,
      employeeName: row.employeeName,
      rosterDate: date,
      shift: row.assignmentId
        ? {
            id: row.shiftTypeId,
            name: row.shiftName,
            startTime: row.startTime,
            endTime: row.endTime,
          }
        : null,
      status: row.assignmentId ? "Scheduled" : "Off-Duty",
    }));

    return {
      success: true,
      message: "Shift roster fetched successfully",
      data,
      availableShiftTypes,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async saveRoster(
    body: { date?: unknown; assignments?: unknown },
    currentUser: typeof users.$inferSelect,
  ) {
    requireAdmin(currentUser);
    const date = validateDate(body.date);
    if (!Array.isArray(body.assignments) || body.assignments.length === 0) {
      throw new Error("assignments must be a non-empty array");
    }
    if (body.assignments.length > 500) throw new Error("A maximum of 500 assignments is allowed");

    const assignments: AssignmentInput[] = body.assignments.map((raw: any, index) => {
      const employeeId = Number(raw?.employeeId ?? raw?.empId);
      const shiftTypeId = raw?.shiftTypeId === null || raw?.shiftTypeId === undefined
        ? null
        : Number(raw.shiftTypeId);
      if (!Number.isInteger(employeeId) || employeeId <= 0) {
        throw new Error(`assignments[${index}].employeeId must be a positive integer`);
      }
      if (shiftTypeId !== null && (!Number.isInteger(shiftTypeId) || shiftTypeId <= 0)) {
        throw new Error(`assignments[${index}].shiftTypeId must be a positive integer or null`);
      }
      return { employeeId, shiftTypeId };
    });

    const employeeIds = assignments.map((item) => item.employeeId);
    if (new Set(employeeIds).size !== employeeIds.length) {
      throw new Error("Each employee may appear only once in assignments");
    }
    const shiftTypeIds = [...new Set(assignments.flatMap((item) => item.shiftTypeId === null ? [] : [item.shiftTypeId]))];
    const [employees, shiftTypes] = await Promise.all([
      this.repo.getEmployees(currentUser.id, employeeIds),
      this.repo.getShiftTypes(currentUser.id, shiftTypeIds),
    ]);
    if (employees.length !== employeeIds.length) {
      const found = new Set(employees.map((item) => item.userId));
      throw new Error(`Employees do not belong to this admin: ${employeeIds.filter((id) => !found.has(id)).join(", ")}`);
    }
    if (shiftTypes.length !== shiftTypeIds.length) {
      const found = new Set(shiftTypes.map((item) => item.id));
      throw new Error(`Shift types do not belong to this admin: ${shiftTypeIds.filter((id) => !found.has(id)).join(", ")}`);
    }

    const saved = await this.repo.saveRoster(
      currentUser.id,
      currentUser.organizationId,
      date,
      assignments,
      currentUser.id,
    );
    return {
      success: true,
      message: "Shift roster saved successfully",
      data: { date, processed: assignments.length, scheduled: saved.length, unassigned: assignments.length - saved.length },
    };
  }

  async getEmployeeHistory(
    employeeId: number,
    query: Record<string, unknown>,
    currentUser: typeof users.$inferSelect,
  ) {
    if (!Number.isInteger(employeeId) || employeeId <= 0) throw new Error("Invalid employee ID");

    const isAdmin = currentUser.isAdmin || currentUser.roleId === 0 || currentUser.roleId === 1;
    if (!isAdmin && currentUser.id !== employeeId) {
      throw new Error("Employees can only fetch their own shift history");
    }

    let adminId = currentUser.id;
    if (isAdmin) {
      const employee = await this.repo.getEmployees(currentUser.id, [employeeId]);
      if (!employee.length) throw new Error("Employee not found for this admin");
    } else {
      const employee = await this.repo.getEmployeeByUserId(employeeId);
      if (!employee) throw new Error("Employee record not found");
      adminId = employee.adminId;
    }

    const fromDate = query.fromDate === undefined ? undefined : validateDate(query.fromDate, "fromDate");
    const toDate = query.toDate === undefined ? undefined : validateDate(query.toDate, "toDate");
    if (fromDate && toDate && fromDate > toDate) throw new Error("fromDate cannot be after toDate");

    const approvedRequests = await this.shiftRequestRepo.getApprovedRequestsForEmployee(adminId, employeeId);
    if (approvedRequests.length) {
      const syncAdminId = isAdmin ? currentUser.id : adminId;
      const organizationId = isAdmin ? currentUser.organizationId : null;
      await this.repo.syncApprovedRequestsToAssignments(
        syncAdminId,
        organizationId,
        employeeId,
        approvedRequests,
        { fromDate, toDate },
      );
    }

    const data = await this.repo.getEmployeeHistory(adminId, employeeId, fromDate, toDate);
    return { success: true, message: "Employee shift history fetched successfully", data };
  }

  async deleteAssignment(id: number, currentUser: typeof users.$inferSelect) {
    requireAdmin(currentUser);
    if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid assignment ID");
    const deleted = await this.repo.deleteById(currentUser.id, id);
    if (!deleted.length) throw new Error("Shift assignment not found");
    return { success: true, message: "Shift assignment removed successfully" };
  }
}
