import {
  AttendanceRepository,
  AttendanceFilters,
} from "../repository/attendance.repo.js";
import { attendance, users, Employee } from "../db/schema.js";
import { db } from "../db/connection.js";
import { eq } from "drizzle-orm";

type AttendanceStatus = typeof attendance.$inferSelect.status;
type LeaveType = NonNullable<typeof attendance.$inferSelect.leaveType>;

const VALID_STATUSES: AttendanceStatus[] = [
  "present",
  "absent",
  "half_day",
  "on_leave",
];

function getDaysInMonth(month: string): string[] {
  const [year, monthNum] = month.split("-").map(Number);
  if (!year || !monthNum || monthNum < 1 || monthNum > 12) {
    throw new Error("Invalid month format. Use YYYY-MM");
  }

  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const dates: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    dates.push(
      `${year}-${String(monthNum).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    );
  }
  return dates;
}

function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function validateStatus(status: string): AttendanceStatus {
  if (!VALID_STATUSES.includes(status as AttendanceStatus)) {
    throw new Error(
      `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
    );
  }
  return status as AttendanceStatus;
}

async function validateEmployee(empId: number) {
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

export class AttendanceService {
  private attendanceRepo: AttendanceRepository;

  constructor() {
    this.attendanceRepo = new AttendanceRepository();
  }

  async createAttendance(
    data: Partial<typeof attendance.$inferInsert> & {
      empId: number;
      attendanceDate: string;
      status: AttendanceStatus;
    },
    currentUser: typeof users.$inferSelect,
  ) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can create attendance records");
    }

    if (!data.empId || !data.attendanceDate || !data.status) {
      throw new Error("empId, attendanceDate, and status are required");
    }

    validateStatus(data.status);
    await validateEmployee(data.empId);

    if (data.status === "on_leave" && !data.leaveType) {
      throw new Error("leaveType is required when status is on_leave");
    }

    const existing = await this.attendanceRepo.getAttendanceByEmpAndDate(
      data.empId,
      data.attendanceDate,
    );
    if (existing.length > 0) {
      throw new Error("Attendance already marked for this date");
    }

    const series = data.series ?? (await this.attendanceRepo.generateNextSeries());

    const attendanceData = {
      series,
      empId: data.empId,
      attendanceDate: data.attendanceDate,
      status: data.status,
      leaveType: data.status === "on_leave" ? data.leaveType : null,
      shift: data.shift ?? null,
      lateEntry: data.lateEntry ?? false,
      earlyExit: data.earlyExit ?? false,
      markedBy: data.markedBy ?? currentUser.id,
      isDeleted: false,
    };

    const created = await this.attendanceRepo.createAttendance(attendanceData);
    const enriched = await this.attendanceRepo.getAttendanceById(created[0].id);
    return enriched[0];
  }

  async getNextSeries(currentUser: typeof users.$inferSelect) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can generate attendance series");
    }

    const series = await this.attendanceRepo.generateNextSeries();
    return { series };
  }

  async getEmployeeAttendanceInfo(
    empId: number,
    currentUser: typeof users.$inferSelect,
  ) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can view employee attendance info");
    }

    const info = await this.attendanceRepo.getEmployeeAttendanceInfo(empId);
    if (!info) {
      throw new Error("Employee not found");
    }

    return info;
  }

  async getAllAttendances(
    currentUser: typeof users.$inferSelect,
    filters: AttendanceFilters = {},
  ) {
    return await this.attendanceRepo.getAllAttendances(filters);
  }

  async getUnmarkedDates(
    empId: number,
    month: string,
    currentUser: typeof users.$inferSelect,
  ) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can view unmarked attendance dates");
    }

    if (!empId || !month) {
      throw new Error("empId and month are required");
    }

    await validateEmployee(empId);

    const allDates = getDaysInMonth(month);
    const markedDates =
      await this.attendanceRepo.getMarkedDatesForMonth(empId, month);
    const markedSet = new Set(markedDates);

    const unmarkedDates = allDates.filter((date) => !markedSet.has(date));

    return { unmarkedDates };
  }

  async markAttendanceBulk(
    body: {
      empId: number;
      dates: string[];
      status: string;
      leaveType?: LeaveType | null;
      markedBy?: number;
      shift?: string | null;
      lateEntry?: boolean;
      earlyExit?: boolean;
    },
    currentUser: typeof users.$inferSelect,
  ) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can mark attendance in bulk");
    }

    const { empId, dates, status, leaveType } = body;

    if (!empId || !dates?.length || !status) {
      throw new Error("empId, dates, and status are required");
    }

    const validatedStatus = validateStatus(status);
    await validateEmployee(empId);

    if (validatedStatus === "on_leave" && !leaveType) {
      throw new Error("leaveType is required when status is on_leave");
    }

    const markedBy = body.markedBy ?? currentUser.id;
    const results = [];

    for (const date of dates) {
      const existing = await this.attendanceRepo.getAttendanceByEmpAndDate(
        empId,
        date,
      );
      if (existing.length > 0) {
        throw new Error(`Attendance already marked for date: ${date}`);
      }

      const series = await this.attendanceRepo.generateNextSeries();
      const record = await this.attendanceRepo.createAttendance({
        series,
        empId,
        attendanceDate: date,
        status: validatedStatus,
        leaveType: validatedStatus === "on_leave" ? leaveType : null,
        shift: body.shift ?? null,
        lateEntry: body.lateEntry ?? false,
        earlyExit: body.earlyExit ?? false,
        markedBy,
        isDeleted: false,
      });
      results.push(record[0]);
    }

    return results;
  }

  async markSelfAttendance(
    body: { status?: string; shift?: string; lateEntry?: boolean; earlyExit?: boolean },
    currentUser: typeof users.$inferSelect,
  ) {
    const status = validateStatus(body.status ?? "present");
    const today = getTodayDateString();

    await validateEmployee(currentUser.id);

    const existing = await this.attendanceRepo.getAttendanceByEmpAndDate(
      currentUser.id,
      today,
    );
    if (existing.length > 0) {
      throw new Error("Attendance already marked for today");
    }

    if (status === "on_leave") {
      throw new Error("Use leave request flow to mark on_leave");
    }

    const series = await this.attendanceRepo.generateNextSeries();
    const created = await this.attendanceRepo.createAttendance({
      series,
      empId: currentUser.id,
      attendanceDate: today,
      status,
      leaveType: null,
      shift: body.shift ?? null,
      lateEntry: body.lateEntry ?? false,
      earlyExit: body.earlyExit ?? false,
      markedBy: currentUser.id,
      isDeleted: false,
    });

    const enriched = await this.attendanceRepo.getAttendanceById(created[0].id);
    return enriched[0];
  }

  async getAttendanceById(id: number, currentUser: typeof users.$inferSelect) {
    const attendanceRecord = await this.attendanceRepo.getAttendanceById(id);

    if (attendanceRecord.length === 0) {
      throw new Error("Attendance record not found");
    }

    return attendanceRecord;
  }

  async getAttendancesByEmployeeId(
    empId: number,
    currentUser: typeof users.$inferSelect,
    month?: string,
  ) {
    return await this.attendanceRepo.getAttendancesByEmployeeId(empId, month);
  }

  async updateAttendance(
    id: number,
    data: Partial<typeof attendance.$inferInsert>,
    currentUser: typeof users.$inferSelect,
  ) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can update attendance records");
    }

    const existingRecord = await this.attendanceRepo.getAttendanceById(id);
    if (existingRecord.length === 0) {
      throw new Error("Attendance record not found");
    }

    if (data.status) {
      validateStatus(data.status);
    }

    const status = data.status ?? existingRecord[0].status;
    if (status === "on_leave" && !data.leaveType && !existingRecord[0].leaveType) {
      throw new Error("leaveType is required when status is on_leave");
    }

    const updateData = {
      ...data,
      leaveType:
        status === "on_leave"
          ? (data.leaveType ?? existingRecord[0].leaveType)
          : null,
    };

    const updated = await this.attendanceRepo.updateAttendance(id, updateData);
    const enriched = await this.attendanceRepo.getAttendanceById(updated[0].id);
    return enriched[0];
  }

  async deleteAttendance(id: number, currentUser: typeof users.$inferSelect) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can delete attendance records");
    }

    const existingRecord = await this.attendanceRepo.getAttendanceById(id);
    if (existingRecord.length === 0) {
      throw new Error("Attendance record not found");
    }

    return await this.attendanceRepo.deleteAttendance(id);
  }
}
