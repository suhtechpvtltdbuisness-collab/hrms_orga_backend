import { db } from "../db/connection.js";
import {
  attendanceRequest,
  Employee,
  users,
  employment,
  department,
} from "../db/schema.js";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";

export type AttendanceRequestFilters = {
  status?: "pending" | "approved" | "rejected";
  empId?: number;
  adminId?: number;
  search?: string;
};

const selectFields = {
  id: attendanceRequest.id,
  empId: attendanceRequest.empId,
  employeeName: users.name,
  employeeCode: sql<string>`concat('EMP-', lpad(${attendanceRequest.empId}::text, 3, '0'))`,
  departmentName: department.departmentName,
  fromDate: attendanceRequest.fromDate,
  toDate: attendanceRequest.toDate,
  requestType: attendanceRequest.requestType,
  isHalfDay: attendanceRequest.isHalfDay,
  explanation: attendanceRequest.explanation,
  status: attendanceRequest.status,
  reviewedBy: attendanceRequest.reviewedBy,
  reviewedAt: attendanceRequest.reviewedAt,
  rejectionReason: attendanceRequest.rejectionReason,
  createdAt: attendanceRequest.createdAt,
  updatedAt: attendanceRequest.updatedAt,
};

export class AttendanceRequestRepository {
  async create(data: typeof attendanceRequest.$inferInsert) {
    const [row] = await db.insert(attendanceRequest).values(data).returning();
    return row;
  }

  async getById(id: number, adminId?: number) {
    const conditions = [
      eq(attendanceRequest.id, id),
      eq(attendanceRequest.isDeleted, false),
    ];
    if (adminId) conditions.push(eq(Employee.adminId, adminId));

    const [row] = await db
      .select(selectFields)
      .from(attendanceRequest)
      .innerJoin(Employee, eq(Employee.userId, attendanceRequest.empId))
      .innerJoin(users, eq(users.id, attendanceRequest.empId))
      .leftJoin(employment, eq(employment.employeeId, attendanceRequest.empId))
      .leftJoin(department, eq(department.id, employment.departmentId))
      .where(and(...conditions))
      .limit(1);

    return row ?? null;
  }

  async list(filters: AttendanceRequestFilters = {}) {
    const conditions = [eq(attendanceRequest.isDeleted, false)];

    if (filters.status) conditions.push(eq(attendanceRequest.status, filters.status));
    if (filters.empId) conditions.push(eq(attendanceRequest.empId, filters.empId));
    if (filters.adminId) conditions.push(eq(Employee.adminId, filters.adminId));
    if (filters.search) {
      const term = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(users.name, term),
          ilike(attendanceRequest.requestType, term),
          ilike(department.departmentName, term),
        )!,
      );
    }

    return db
      .select(selectFields)
      .from(attendanceRequest)
      .innerJoin(Employee, eq(Employee.userId, attendanceRequest.empId))
      .innerJoin(users, eq(users.id, attendanceRequest.empId))
      .leftJoin(employment, eq(employment.employeeId, attendanceRequest.empId))
      .leftJoin(department, eq(department.id, employment.departmentId))
      .where(and(...conditions))
      .orderBy(desc(attendanceRequest.createdAt));
  }

  async update(
    id: number,
    data: Partial<typeof attendanceRequest.$inferInsert>,
  ) {
    const [row] = await db
      .update(attendanceRequest)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(attendanceRequest.id, id), eq(attendanceRequest.isDeleted, false)))
      .returning();
    return row ?? null;
  }
}
