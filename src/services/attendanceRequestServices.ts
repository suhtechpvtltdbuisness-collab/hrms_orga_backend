import { AttendanceRequestRepository } from "../repository/attendanceRequest.repo.js";
import { AttendanceRepository } from "../repository/attendance.repo.js";
import { Employee, users } from "../db/schema.js";
import { db } from "../db/connection.js";
import { and, eq } from "drizzle-orm";

type AttendanceRequestBody = {
  fromDate?: string;
  toDate?: string;
  requestType?: string;
  isHalfDay?: boolean;
  explanation?: string;
};

function validateDate(date: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`${label} must use YYYY-MM-DD format`);
  }
  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error(`Invalid ${label}`);
  }
  return date;
}

function addDays(date: string, days: number) {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function eachDateInclusive(fromDate: string, toDate: string) {
  const dates: string[] = [];
  let cursor = fromDate;
  while (cursor <= toDate) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
    if (dates.length > 62) break;
  }
  return dates;
}

function getFullDayTimes(date: string) {
  return {
    checkIn: new Date(`${date}T10:00:00+05:30`),
    checkOut: new Date(`${date}T18:00:00+05:30`),
  };
}

function getHalfDayTimes(date: string) {
  return {
    checkIn: new Date(`${date}T10:00:00+05:30`),
    checkOut: new Date(`${date}T14:00:00+05:30`),
  };
}

export class AttendanceRequestService {
  private repo = new AttendanceRequestRepository();
  private attendanceRepo = new AttendanceRepository();

  private async ensureEmployeeBelongsToAdmin(empId: number, adminId: number) {
    const [employee] = await db
      .select({ userId: Employee.userId })
      .from(Employee)
      .innerJoin(users, eq(users.id, Employee.userId))
      .where(
        and(
          eq(Employee.userId, empId),
          eq(Employee.adminId, adminId),
          eq(users.isDeleted, false),
          eq(users.active, true),
        ),
      )
      .limit(1);

    if (!employee) throw new Error("Employee not found");
    return employee;
  }

  async createRequest(body: AttendanceRequestBody, currentUser: typeof users.$inferSelect) {
    const fromDate = validateDate(String(body.fromDate || ""), "From date");
    const toDate = validateDate(String(body.toDate || ""), "To date");
    if (toDate < fromDate) throw new Error("To date cannot be before from date");

    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    if (fromDate > today || toDate > today) {
      throw new Error("Future dates are not allowed");
    }

    const requestType = String(body.requestType || "").trim() || "Attendance correction";
    const explanation = String(body.explanation || "").trim();
    if (!explanation) throw new Error("Explanation is required");

    const [employee] = await db
      .select({ userId: Employee.userId, adminId: Employee.adminId })
      .from(Employee)
      .where(eq(Employee.userId, currentUser.id))
      .limit(1);

    if (!employee) throw new Error("Only employees can submit attendance requests");

    const created = await this.repo.create({
      empId: currentUser.id,
      fromDate,
      toDate,
      requestType,
      isHalfDay: Boolean(body.isHalfDay),
      explanation,
      status: "pending",
      isDeleted: false,
    });

    const detailed = await this.repo.getById(created.id, employee.adminId);
    return {
      success: true,
      message: "Attendance request submitted for approval",
      data: detailed,
    };
  }

  async listRequests(
    currentUser: typeof users.$inferSelect,
    filters: { status?: string; search?: string } = {},
  ) {
    const status =
      filters.status && ["pending", "approved", "rejected"].includes(filters.status)
        ? (filters.status as "pending" | "approved" | "rejected")
        : undefined;

    if (currentUser.isAdmin) {
      const data = await this.repo.list({
        adminId: currentUser.id,
        status,
        search: filters.search,
      });
      return { success: true, data };
    }

    const data = await this.repo.list({
      empId: currentUser.id,
      status,
      search: filters.search,
    });
    return { success: true, data };
  }

  async approveRequest(id: number, currentUser: typeof users.$inferSelect) {
    if (!currentUser.isAdmin) throw new Error("Only admins can approve attendance requests");

    const request = await this.repo.getById(id, currentUser.id);
    if (!request) throw new Error("Attendance request not found");
    if (request.status !== "pending") throw new Error("Only pending requests can be approved");

    await this.ensureEmployeeBelongsToAdmin(request.empId, currentUser.id);

    const dates = eachDateInclusive(request.fromDate, request.toDate);
    const isWfh = /work from home|wfh/i.test(request.requestType);
    const period = request.isHalfDay ? "half_day" : "full_time";

    for (const date of dates) {
      const times = request.isHalfDay ? getHalfDayTimes(date) : getFullDayTimes(date);
      const existing = await this.attendanceRepo.getAttendanceByEmpAndDate(request.empId, date);
      const payload = {
        status: "present" as const,
        period,
        leaveType: null,
        shift: isWfh ? "WFH" : null,
        checkIn: times.checkIn,
        checkOut: times.checkOut,
        lateEntry: false,
        earlyExit: false,
        markedBy: currentUser.id,
      };

      if (existing.length > 0) {
        await this.attendanceRepo.updateAttendance(existing[0].id, payload);
      } else {
        const series = await this.attendanceRepo.generateNextSeries();
        await this.attendanceRepo.createAttendance({
          series,
          empId: request.empId,
          attendanceDate: date,
          isDeleted: false,
          ...payload,
        });
      }
    }

    await this.repo.update(id, {
      status: "approved",
      reviewedBy: currentUser.id,
      reviewedAt: new Date(),
      rejectionReason: null,
    });

    const updated = await this.repo.getById(id, currentUser.id);
    return {
      success: true,
      message: "Attendance request approved",
      data: updated,
    };
  }

  async rejectRequest(
    id: number,
    body: { rejectionReason?: string },
    currentUser: typeof users.$inferSelect,
  ) {
    if (!currentUser.isAdmin) throw new Error("Only admins can reject attendance requests");

    const request = await this.repo.getById(id, currentUser.id);
    if (!request) throw new Error("Attendance request not found");
    if (request.status !== "pending") throw new Error("Only pending requests can be rejected");

    await this.repo.update(id, {
      status: "rejected",
      reviewedBy: currentUser.id,
      reviewedAt: new Date(),
      rejectionReason: body.rejectionReason?.trim() || null,
    });

    const updated = await this.repo.getById(id, currentUser.id);
    return {
      success: true,
      message: "Attendance request rejected",
      data: updated,
    };
  }
}
