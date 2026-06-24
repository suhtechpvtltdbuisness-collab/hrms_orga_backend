import { db } from "../db/connection.js";
import {
  attendance,
  Employee,
  users,
  employment,
  department,
} from "../db/schema.js";
import { eq, and, sql, ilike, gte, lte, desc } from "drizzle-orm";

export type AttendanceFilters = {
  employeeName?: string;
  leaveType?: string;
  month?: string;
  date?: string;
  status?: string;
};

const attendanceSelectFields = {
  id: attendance.id,
  series: attendance.series,
  empId: attendance.empId,
  empName: users.name,
  departmentName: department.departmentName,
  attendanceDate: attendance.attendanceDate,
  leaveType: attendance.leaveType,
  status: attendance.status,
  period: attendance.period,
  shift: attendance.shift,
  lateEntry: attendance.lateEntry,
  earlyExit: attendance.earlyExit,
  markedBy: attendance.markedBy,
  createdAt: attendance.createdAt,
  updatedAt: attendance.updatedAt,
};

function attendanceJoins() {
  return db
    .select(attendanceSelectFields)
    .from(attendance)
    .leftJoin(users, eq(attendance.empId, users.id))
    .leftJoin(employment, eq(attendance.empId, employment.employeeId))
    .leftJoin(department, eq(employment.departmentId, department.id));
}

export class AttendanceRepository {
  async generateNextSeries(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `HR-ATT-${year}-`;

    const [latest] = await db
      .select({ series: attendance.series })
      .from(attendance)
      .where(sql`${attendance.series} LIKE ${prefix + "%"}`)
      .orderBy(desc(attendance.id))
      .limit(1);

    if (!latest?.series) {
      return `${prefix}001`;
    }

    const lastNumber = parseInt(latest.series.replace(prefix, ""), 10);
    const nextNumber = Number.isNaN(lastNumber) ? 1 : lastNumber + 1;
    return `${prefix}${String(nextNumber).padStart(3, "0")}`;
  }

  async getEmployeeAttendanceInfo(empId: number) {
    const [info] = await db
      .select({
        empId: users.id,
        empName: users.name,
        departmentName: department.departmentName,
        shift: employment.assignedShift,
      })
      .from(users)
      .innerJoin(Employee, eq(Employee.userId, users.id))
      .leftJoin(employment, eq(employment.employeeId, users.id))
      .leftJoin(department, eq(employment.departmentId, department.id))
      .where(eq(users.id, empId))
      .limit(1);

    return info;
  }

  async createAttendance(data: typeof attendance.$inferInsert) {
    return await db.insert(attendance).values(data).returning();
  }

  async getAllAttendances(currentUser: any, filters: AttendanceFilters = {}) {
    const conditions = [eq(attendance.isDeleted, false)];

    // Role-based organization scoping
    if (currentUser.roleId !== 0) {
      if (currentUser.organizationId) {
        conditions.push(eq(users.organizationId, currentUser.organizationId));
      } else {
        conditions.push(eq(attendance.empId, currentUser.id));
      }
    }

    if (filters.employeeName) {
      conditions.push(ilike(users.name, `%${filters.employeeName}%`));
    }

    if (filters.leaveType) {
      conditions.push(
        eq(
          attendance.leaveType,
          filters.leaveType as
            | "sick"
            | "casual"
            | "earned"
            | "maternity"
            | "paternity",
        ),
      );
    }

    if (filters.month) {
      conditions.push(
        sql`to_char(${attendance.attendanceDate}, 'YYYY-MM') = ${filters.month}`,
      );
    }

    if (filters.date) {
      conditions.push(eq(attendance.attendanceDate, filters.date));
    }

    if (filters.status) {
      const statusVal = filters.status.toLowerCase();
      if (statusVal === "leave" || statusVal === "on_leave") {
        conditions.push(eq(attendance.status, "on_leave"));
      } else if (statusVal === "present") {
        // Standard "present" filter in frontend (exclude half_day)
        conditions.push(eq(attendance.status, "present"));
        conditions.push(sql`${attendance.period} IS DISTINCT FROM 'half_day'`);
      } else if (statusVal === "absent") {
        conditions.push(eq(attendance.status, "absent"));
      } else if (statusVal === "half_day") {
        conditions.push(eq(attendance.status, "present"));
        conditions.push(eq(attendance.period, "half_day"));
      }
    }

    const markedAttendances = await attendanceJoins()
      .where(and(...conditions))
      .orderBy(attendance.attendanceDate);

    // If month filter is applied, we don't synthesize for a specific single day
    if (filters.month) {
      return markedAttendances;
    }

    // Default target date for synthesis
    const targetDate = filters.date || new Date().toISOString().split("T")[0];

    // Fetch all active employees
    const orgCondition = [
      eq(users.isDeleted, false),
      eq(users.active, true)
    ];
    if (currentUser.roleId !== 0 && currentUser.organizationId) {
      orgCondition.push(eq(users.organizationId, currentUser.organizationId));
    }
    const allActiveEmployees = await db
      .select({
        id: users.id,
        name: users.name,
        organizationId: users.organizationId,
        departmentName: department.departmentName,
        shift: employment.assignedShift,
      })
      .from(users)
      .innerJoin(Employee, eq(Employee.userId, users.id))
      .leftJoin(employment, eq(employment.employeeId, users.id))
      .leftJoin(department, eq(employment.departmentId, department.id))
      .where(and(...orgCondition));

    const markedUserIds = new Set(markedAttendances.map(a => a.empId));
    const combined = [...markedAttendances];

    for (const emp of allActiveEmployees) {
      if (!markedUserIds.has(emp.id)) {
        // Apply employeeName filter
        if (filters.employeeName && !emp.name.toLowerCase().includes(filters.employeeName.toLowerCase())) {
          continue;
        }
        // Apply status filter (synthesized has status 'absent')
        if (filters.status) {
          const statusVal = filters.status.toLowerCase();
          if (statusVal !== "absent") {
            continue;
          }
        }
        // Apply leaveType filter (synthesized has no leave type)
        if (filters.leaveType) {
          continue;
        }

        combined.push({
          id: null as any,
          series: "-",
          empId: emp.id,
          empName: emp.name,
          departmentName: emp.departmentName,
          attendanceDate: targetDate,
          leaveType: null,
          status: "absent" as any,
          period: null,
          shift: emp.shift,
          lateEntry: false,
          earlyExit: false,
          markedBy: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    return combined;
  }

  async getAttendanceById(id: number) {
    return await attendanceJoins().where(
      and(eq(attendance.id, id), eq(attendance.isDeleted, false)),
    );
  }

  async getAttendancesByEmployeeId(empId: number, currentUser: any, month?: string) {
    const conditions = [
      eq(attendance.empId, empId),
      eq(attendance.isDeleted, false),
    ];

    if (currentUser.roleId !== 0) {
      if (currentUser.organizationId) {
        conditions.push(eq(users.organizationId, currentUser.organizationId));
      } else {
        conditions.push(eq(attendance.empId, currentUser.id));
      }
    }

    if (month) {
      conditions.push(
        sql`to_char(${attendance.attendanceDate}, 'YYYY-MM') = ${month}`,
      );
    }

    return await attendanceJoins()
      .where(and(...conditions))
      .orderBy(attendance.attendanceDate);
  }

  async getMarkedDatesForMonth(empId: number, month: string) {
    const [year, monthNum] = month.split("-").map(Number);
    const startDate = `${year}-${String(monthNum).padStart(2, "0")}-01`;
    const lastDay = new Date(year, monthNum, 0).getDate();
    const endDate = `${year}-${String(monthNum).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const records = await db
      .select({ attendanceDate: attendance.attendanceDate })
      .from(attendance)
      .where(
        and(
          eq(attendance.empId, empId),
          eq(attendance.isDeleted, false),
          gte(attendance.attendanceDate, startDate),
          lte(attendance.attendanceDate, endDate),
        ),
      );

    return records.map((r) => r.attendanceDate);
  }

  async getAttendanceByEmpAndDate(empId: number, attendanceDate: string) {
    return await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.empId, empId),
          eq(attendance.attendanceDate, attendanceDate),
          eq(attendance.isDeleted, false),
        ),
      )
      .limit(1);
  }

  async updateAttendance(
    id: number,
    data: Partial<typeof attendance.$inferInsert>,
  ) {
    return await db
      .update(attendance)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(attendance.id, id))
      .returning();
  }

  async deleteAttendance(id: number) {
    return await db
      .update(attendance)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(attendance.id, id))
      .returning();
  }
}
