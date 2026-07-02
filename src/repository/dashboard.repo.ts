import { and, asc, count, desc, eq, gte, inArray, lt } from "drizzle-orm";
import { db } from "../db/connection.js";
import {
  attendance,
  department,
  Employee,
  jobs,
  leaveRequest,
  shiftRequest,
  users,
} from "../db/schema.js";

export class DashboardRepository {
  async getEmployeeSummary(adminId: number, monthStart: Date, nextMonthStart: Date) {
    const base = and(
      eq(Employee.adminId, adminId),
      eq(users.isDeleted, false),
      eq(users.active, true),
    );

    const [totalRows, joinedThisMonthRows] = await Promise.all([
      db.select({ value: count() }).from(Employee).innerJoin(users, eq(users.id, Employee.userId)).where(base),
      db
        .select({ value: count() })
        .from(Employee)
        .innerJoin(users, eq(users.id, Employee.userId))
        .where(and(base, gte(Employee.createdAt, monthStart), lt(Employee.createdAt, nextMonthStart))),
    ]);

    return {
      total: Number(totalRows[0]?.value ?? 0),
      joinedThisMonth: Number(joinedThisMonthRows[0]?.value ?? 0),
    };
  }

  async getAttendanceByDates(adminId: number, dates: string[]) {
    if (!dates.length) return [];
    return db
      .select({
        date: attendance.attendanceDate,
        status: attendance.status,
        value: count(),
      })
      .from(attendance)
      .innerJoin(Employee, eq(Employee.userId, attendance.empId))
      .where(
        and(
          eq(Employee.adminId, adminId),
          eq(attendance.isDeleted, false),
          inArray(attendance.attendanceDate, dates),
        ),
      )
      .groupBy(attendance.attendanceDate, attendance.status)
      .orderBy(asc(attendance.attendanceDate));
  }

  async getRequestSummary(adminId: number) {
    const employeeScope = eq(Employee.adminId, adminId);
    const [leaveRows, shiftRows] = await Promise.all([
      db
        .select({ status: leaveRequest.status, value: count() })
        .from(leaveRequest)
        .innerJoin(Employee, eq(Employee.userId, leaveRequest.empId))
        .where(and(employeeScope, eq(leaveRequest.isDeleted, false)))
        .groupBy(leaveRequest.status),
      db
        .select({ status: shiftRequest.status, value: count() })
        .from(shiftRequest)
        .innerJoin(Employee, eq(Employee.userId, shiftRequest.empId))
        .where(and(employeeScope, eq(shiftRequest.isDeleted, false)))
        .groupBy(shiftRequest.status),
    ]);

    const totalLeave = leaveRows.reduce((sum, row) => sum + Number(row.value), 0);
    const totalShift = shiftRows.reduce((sum, row) => sum + Number(row.value), 0);
    const pendingLeave = Number(leaveRows.find((row) => row.status === "submitted")?.value ?? 0);
    const pendingShift = Number(shiftRows.find((row) => row.status === "submitted")?.value ?? 0);

    return {
      pendingLeave,
      pendingShift,
      pendingTasks: pendingLeave + pendingShift,
      totalTasks: totalLeave + totalShift,
    };
  }

  async getJobs(adminId: number) {
    return db
      .select({
        id: jobs.id,
        title: jobs.title,
        department: department.departmentName,
        location: jobs.location,
        isActive: jobs.isActive,
        openings: jobs.numberOfOpenings,
        createdAt: jobs.createdAt,
      })
      .from(jobs)
      .leftJoin(department, eq(department.id, jobs.departmentId))
      .where(and(eq(jobs.adminId, adminId), eq(jobs.isDeleted, false)))
      .orderBy(desc(jobs.createdAt));
  }

  async getRecentAttendance(adminId: number, limit = 8) {
    return db
      .select({
        id: attendance.id,
        name: users.name,
        status: attendance.status,
        occurredAt: attendance.updatedAt,
      })
      .from(attendance)
      .innerJoin(Employee, eq(Employee.userId, attendance.empId))
      .innerJoin(users, eq(users.id, attendance.empId))
      .where(and(eq(Employee.adminId, adminId), eq(attendance.isDeleted, false)))
      .orderBy(desc(attendance.updatedAt))
      .limit(limit);
  }

  async getRecentLeaveRequests(adminId: number, limit = 8) {
    return db
      .select({
        id: leaveRequest.id,
        name: users.name,
        status: leaveRequest.status,
        occurredAt: leaveRequest.updatedAt,
      })
      .from(leaveRequest)
      .innerJoin(Employee, eq(Employee.userId, leaveRequest.empId))
      .innerJoin(users, eq(users.id, leaveRequest.empId))
      .where(and(eq(Employee.adminId, adminId), eq(leaveRequest.isDeleted, false)))
      .orderBy(desc(leaveRequest.updatedAt))
      .limit(limit);
  }
}
