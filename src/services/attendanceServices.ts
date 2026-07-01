import {
  AttendanceRepository,
  AttendanceFilters,
} from "../repository/attendance.repo.js";
import { attendance, users, Employee } from "../db/schema.js";
import { db } from "../db/connection.js";
import { eq } from "drizzle-orm";

type AttendanceStatus = typeof attendance.$inferSelect.status;
type LeaveType = NonNullable<typeof attendance.$inferSelect.leaveType>;
type AdminAttendanceRecord = {
  date?: string;
  attendanceDate?: string;
  selectedDate?: string;
  status?: string;
  attendanceStatus?: string;
  leaveType?: string;
  shift?: string;
};

type AdminAttendanceBody = {
  empId?: number | string;
  employeeId?: number | string;
  employee?: number | string | { id?: number | string; userId?: number | string };
  records?: Array<AdminAttendanceRecord | string>;
  record?: AdminAttendanceRecord;
  dates?: string[];
  selectedDates?: string[];
  date?: string;
  attendanceDate?: string;
  selectedDate?: string;
  status?: string;
  attendanceStatus?: string;
  leaveType?: string;
  shift?: string;
};

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

function validateAttendanceDate(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid attendance date "${date}". Use YYYY-MM-DD`);
  }

  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error(`Invalid attendance date "${date}". Use YYYY-MM-DD`);
  }

  return date;
}

function getFullDayTimes(date: string) {
  // Attendance is currently operated in India Standard Time. Supplying an
  // explicit offset keeps these times stable when the API runs on UTC hosts.
  return {
    checkIn: new Date(`${date}T10:00:00+05:30`),
    checkOut: new Date(`${date}T18:00:00+05:30`),
  };
}

function normalizeAdminAttendanceBody(body: AdminAttendanceBody = {}) {
  const employeeObject =
    typeof body.employee === "object" && body.employee !== null
      ? body.employee
      : null;
  const rawEmpId =
    body.empId ??
    body.employeeId ??
    (typeof body.employee !== "object" ? body.employee : undefined) ??
    employeeObject?.userId ??
    employeeObject?.id;
  const empId = Number(rawEmpId);
  if (!Number.isInteger(empId) || empId <= 0) {
    throw new Error("A valid empId or employeeId is required");
  }

  const defaultStatus = body.status ?? body.attendanceStatus ?? "present";
  const suppliedRecords = body.records ?? (body.record ? [body.record] : undefined);
  let records: AdminAttendanceRecord[] | undefined = suppliedRecords?.map(
    (record) =>
      typeof record === "string"
        ? { date: record, status: defaultStatus }
        : {
            ...record,
            date:
              record.date ?? record.attendanceDate ?? record.selectedDate,
            status:
              record.status ?? record.attendanceStatus ?? defaultStatus,
          },
  );

  if (!records?.length) {
    const dates =
      body.dates ??
      body.selectedDates ??
      [body.date ?? body.attendanceDate ?? body.selectedDate].filter(
        (date): date is string => Boolean(date),
      );

    if (dates.length > 0) {
      records = dates.map((date) => ({
        date,
        status: defaultStatus,
        leaveType: body.leaveType,
        shift: body.shift,
      }));
    }
  }

  if (!Array.isArray(records) || records.length === 0) {
    const receivedFields = Object.keys(body);
    throw new Error(
      `No attendance date was provided. Use date, attendanceDate, selectedDate, dates, selectedDates, or records. Received fields: ${receivedFields.join(", ") || "none"}`,
    );
  }

  return { empId, records };
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

  private adjustAttendanceStatus(record: any): any {
    if (!record) return record;
    const todayStr = getTodayDateString();
    // If they checked in but did not check out, and the attendance date is in the past
    if (record.checkIn && !record.checkOut && record.attendanceDate < todayStr) {
      return { 
        ...record, 
        status: "absent" as const, 
        period: "less_than_half_day" 
      };
    }
    return record;
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

    // Auto-calculate period if status is provided
    let periodVal = data.period ?? null;
    if (!periodVal) {
      if (data.status === "present") {
        periodVal = "full_time";
      } else if (data.status === "absent") {
        periodVal = "less_than_half_day";
      } else if (data.status === "half_day") {
        periodVal = "half_day";
      }
    }

    // Map half_day status to present status + half_day period
    let statusVal = data.status;
    if (statusVal === "half_day") {
      statusVal = "present";
      periodVal = "half_day";
    }

    const attendanceData = {
      series,
      empId: data.empId,
      attendanceDate: data.attendanceDate,
      status: statusVal,
      period: periodVal,
      leaveType: data.status === "on_leave" ? data.leaveType : null,
      shift: data.shift ?? null,
      lateEntry: data.lateEntry ?? false,
      earlyExit: data.earlyExit ?? false,
      markedBy: data.markedBy ?? currentUser.id,
      isDeleted: false,
    };

    const created = await this.attendanceRepo.createAttendance(attendanceData);
    const enriched = await this.attendanceRepo.getAttendanceById(created[0].id);
    return this.adjustAttendanceStatus(enriched[0]);
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
    const isAdmin =
      currentUser.isAdmin ||
      currentUser.roleId === 0 ||
      currentUser.roleId === 1;

    if (!isAdmin) {
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
    const list = await this.attendanceRepo.getAllAttendances(currentUser, filters);
    return list.map((r) => this.adjustAttendanceStatus(r));
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
    body: AdminAttendanceBody = {},
    currentUser: typeof users.$inferSelect,
  ) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can mark attendance bulk");
    }

    const { empId, records } = normalizeAdminAttendanceBody(body);

    await validateEmployee(empId);

    const results = [];
    for (const r of records) {
      if (!r || !r.date || !r.status) {
        throw new Error("Each attendance record requires date and status");
      }

      validateAttendanceDate(r.date);
      const normalizedStatus = r.status.trim().toLowerCase().replace(/[\s-]+/g, "_");
      validateStatus(normalizedStatus);
      if (normalizedStatus === "on_leave" && !r.leaveType) {
        throw new Error(`leaveType is required for date ${r.date} when status is on_leave`);
      }

      let statusVal = normalizedStatus as AttendanceStatus;
      let periodVal = null;
      if (statusVal === "present") {
        periodVal = "full_time";
      } else if (statusVal === "absent") {
        periodVal = "less_than_half_day";
      } else if (statusVal === "half_day") {
        statusVal = "present";
        periodVal = "half_day";
      }

      const fullDayTimes =
        normalizedStatus === "present" ? getFullDayTimes(r.date) : null;
      const attendanceTimes = {
        checkIn: fullDayTimes?.checkIn ?? null,
        checkOut: fullDayTimes?.checkOut ?? null,
      };

      const existing = await this.attendanceRepo.getAttendanceByEmpAndDate(
        empId,
        r.date,
      );

      if (existing.length > 0) {
        const updated = await this.attendanceRepo.updateAttendance(existing[0].id, {
          status: statusVal,
          period: periodVal,
          leaveType: (statusVal === "on_leave" ? r.leaveType : null) as LeaveType | null,
          shift: r.shift ?? null,
          ...attendanceTimes,
          lateEntry: false,
          earlyExit: false,
          markedBy: currentUser.id,
        });
        results.push(updated[0]);
      } else {
        const series = await this.attendanceRepo.generateNextSeries();
        const created = await this.attendanceRepo.createAttendance({
          series,
          empId,
          attendanceDate: r.date,
          status: statusVal,
          period: periodVal,
          leaveType: (statusVal === "on_leave" ? r.leaveType : null) as LeaveType | null,
          shift: r.shift ?? null,
          lateEntry: false,
          earlyExit: false,
          markedBy: currentUser.id,
          ...attendanceTimes,
          isDeleted: false,
        });
        results.push(created[0]);
      }
    }

    return results.map((r) => this.adjustAttendanceStatus(r));
  }

  async markSelfAttendance(
    data: {
      attendanceDate: string;
      status: string;
      leaveType?: string;
      shift?: string;
    },
    currentUser: typeof users.$inferSelect,
  ) {
    await validateEmployee(currentUser.id);

    if (!data.attendanceDate || !data.status) {
      throw new Error("attendanceDate and status are required");
    }

    validateStatus(data.status);

    if (data.status === "on_leave" && !data.leaveType) {
      throw new Error("leaveType is required when status is on_leave");
    }

    let statusVal = data.status as AttendanceStatus;
    let periodVal = null;
    if (statusVal === "present") {
      periodVal = "full_time";
    } else if (statusVal === "absent") {
      periodVal = "less_than_half_day";
    } else if (statusVal === "half_day") {
      statusVal = "present";
      periodVal = "half_day";
    }

    const existing = await this.attendanceRepo.getAttendanceByEmpAndDate(
      currentUser.id,
      data.attendanceDate,
    );

    if (existing.length > 0) {
      const updated = await this.attendanceRepo.updateAttendance(existing[0].id, {
        status: statusVal,
        period: periodVal,
        leaveType: (statusVal === "on_leave" ? data.leaveType : null) as LeaveType | null,
        shift: data.shift ?? null,
        markedBy: currentUser.id,
      });
      const enriched = await this.attendanceRepo.getAttendanceById(updated[0].id);
      return this.adjustAttendanceStatus(enriched[0]);
    }

    const series = await this.attendanceRepo.generateNextSeries();
    const created = await this.attendanceRepo.createAttendance({
      series,
      empId: currentUser.id,
      attendanceDate: data.attendanceDate,
      status: statusVal,
      period: periodVal,
      leaveType: (statusVal === "on_leave" ? data.leaveType : null) as LeaveType | null,
      shift: data.shift ?? null,
      lateEntry: false,
      earlyExit: false,
      markedBy: currentUser.id,
      isDeleted: false,
    });

    const enriched = await this.attendanceRepo.getAttendanceById(created[0].id);
    return this.adjustAttendanceStatus(enriched[0]);
  }

  async checkInSelf(currentUser: typeof users.$inferSelect) {
    const today = getTodayDateString();
    await validateEmployee(currentUser.id);

    const now = new Date();
    const tenAM = new Date(now);
    tenAM.setHours(10, 0, 0, 0);
    const lateEntry = now.getTime() > tenAM.getTime();

    const existing = await this.attendanceRepo.getAttendanceByEmpAndDate(
      currentUser.id,
      today,
    );

    if (existing.length > 0) {
      const record = existing[0];
      if (record.checkIn) {
        throw new Error("Already checked in today");
      }
      const updated = await this.attendanceRepo.updateAttendance(record.id, {
        checkIn: now,
        lateEntry,
        status: "present",
        period: "less_than_half_day",
        markedBy: currentUser.id,
      });
      const enriched = await this.attendanceRepo.getAttendanceById(updated[0].id);
      return this.adjustAttendanceStatus(enriched[0]);
    }

    const series = await this.attendanceRepo.generateNextSeries();
    const created = await this.attendanceRepo.createAttendance({
      series,
      empId: currentUser.id,
      attendanceDate: today,
      status: "present",
      period: "less_than_half_day",
      leaveType: null,
      shift: null,
      lateEntry,
      earlyExit: false,
      markedBy: currentUser.id,
      checkIn: now,
      checkOut: null,
      isDeleted: false,
    });

    const enriched = await this.attendanceRepo.getAttendanceById(created[0].id);
    return this.adjustAttendanceStatus(enriched[0]);
  }

  async checkOutSelf(currentUser: typeof users.$inferSelect) {
    const today = getTodayDateString();
    await validateEmployee(currentUser.id);

    const existing = await this.attendanceRepo.getAttendanceByEmpAndDate(
      currentUser.id,
      today,
    );

    if (existing.length === 0 || !existing[0].checkIn) {
      throw new Error("Cannot check out without checking in first today");
    }

    const record = existing[0];
    if (record.checkOut) {
      throw new Error("Already checked out today");
    }

    const checkOutTime = new Date();
    const diffMs = checkOutTime.getTime() - record.checkIn!.getTime();
    const hours = diffMs / (1000 * 60 * 60);

    let status: AttendanceStatus = "present";
    let period = "full_time";
    if (hours < 3) {
      status = "absent";
      period = "less_than_half_day";
    } else if (hours < 8) {
      status = "present";
      period = "half_day";
    }

    const updated = await this.attendanceRepo.updateAttendance(record.id, {
      checkOut: checkOutTime,
      status,
      period,
    });

    const enriched = await this.attendanceRepo.getAttendanceById(updated[0].id);
    return this.adjustAttendanceStatus(enriched[0]);
  }

  async getMyAttendance(currentUser: typeof users.$inferSelect, month?: string) {
    await validateEmployee(currentUser.id);
    const list = await this.attendanceRepo.getAttendancesByEmployeeId(currentUser.id, currentUser, month);
    return list.map((r) => this.adjustAttendanceStatus(r));
  }

  async getAttendanceById(id: number, currentUser: typeof users.$inferSelect) {
    const attendanceRecord = await this.attendanceRepo.getAttendanceById(id);

    if (attendanceRecord.length === 0) {
      throw new Error("Attendance record not found");
    }

    return attendanceRecord.map((r) => this.adjustAttendanceStatus(r));
  }

  async getAttendancesByEmployeeId(
    empId: number,
    currentUser: typeof users.$inferSelect,
    month?: string,
  ) {
    const list = await this.attendanceRepo.getAttendancesByEmployeeId(empId, currentUser, month);
    return list.map((r) => this.adjustAttendanceStatus(r));
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

    // Auto-calculate/map period if status is updated
    let periodVal = data.period ?? null;
    let statusVal = status;
    if (data.status) {
      if (data.status === "half_day") {
        statusVal = "present";
        periodVal = "half_day";
      } else if (!periodVal) {
        if (data.status === "present") {
          periodVal = "full_time";
        } else if (data.status === "absent") {
          periodVal = "less_than_half_day";
        }
      }
    }

    const updateData = {
      ...data,
      status: statusVal,
      period: periodVal ?? existingRecord[0].period,
      leaveType:
        statusVal === "on_leave"
          ? (data.leaveType ?? existingRecord[0].leaveType)
          : null,
    };

    const updated = await this.attendanceRepo.updateAttendance(id, updateData);
    const enriched = await this.attendanceRepo.getAttendanceById(updated[0].id);
    return this.adjustAttendanceStatus(enriched[0]);
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

  async getTodayStatus(currentUser: typeof users.$inferSelect) {
    const today = getTodayDateString();
    await validateEmployee(currentUser.id);

    const existing = await this.attendanceRepo.getAttendanceByEmpAndDate(
      currentUser.id,
      today,
    );

    if (existing.length > 0) {
      const record = this.adjustAttendanceStatus(existing[0]);
      return {
        checkedIn: !!record.checkIn,
        checkInTime: record.checkIn,
        checkedOut: !!record.checkOut,
        checkOutTime: record.checkOut,
        status: record.status,
        period: record.period,
        lateEntry: record.lateEntry,
        record,
      };
    }

    return {
      checkedIn: false,
      checkInTime: null,
      checkedOut: false,
      checkOutTime: null,
      status: null,
      period: null,
      lateEntry: false,
      record: null,
    };
  }
}
