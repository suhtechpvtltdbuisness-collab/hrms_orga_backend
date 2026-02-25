import { db } from "../db/connection.js";
import { attendance, Employee, users } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

export class AttendanceRepository {
  async createAttendance(data: typeof attendance.$inferInsert) {
    return await db.insert(attendance).values(data).returning();
  }

  async getAllAttendances() {
    return await db
      .select({
        attendance: attendance,
        employee: Employee,
      })
      .from(attendance)
      .leftJoin(Employee, eq(attendance.empId, Employee.id))
      .where(eq(attendance.isDeleted, false));
  }

  async getAttendanceById(id: number) {
    return await db
      .select({
        attendance: attendance,
        employee: Employee,
      })
      .from(attendance)
      .leftJoin(Employee, eq(attendance.empId, Employee.id))
      .where(and(eq(attendance.id, id), eq(attendance.isDeleted, false)));
  }

  async getAttendancesByEmployeeId(empId: number) {
    return await db
      .select({
        attendance: attendance,
        employee: Employee,
      })
      .from(attendance)
      .leftJoin(Employee, eq(attendance.empId, Employee.id))
      .where(and(eq(attendance.empId, empId), eq(attendance.isDeleted, false)));
  }

  async updateAttendance(id: number, data: typeof attendance.$inferInsert) {
    return await db
      .update(attendance)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(attendance.id, id))
      .returning();
  }

  async updateAttendanceByUserId(
    userId: number,
    data: typeof attendance.$inferInsert,
  ) {
    // First get the employee by userId
    const employeeResult = await db
      .select()
      .from(Employee)
      .where(eq(Employee.userId, userId))
      .limit(1);

    if (!employeeResult[0]) {
      throw new Error("Employee not found for this user");
    }

    return await db
      .update(attendance)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(attendance.empId, employeeResult[0].id))
      .returning();
  }

  async deleteAttendance(id: number) {
    return await db
      .update(attendance)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(attendance.id, id))
      .returning();
  }

  async deleteAttendanceByUserId(userId: number) {
    const employeeResult = await db
      .select()
      .from(Employee)
      .where(eq(Employee.userId, userId))
      .limit(1);

    if (!employeeResult[0]) {
      throw new Error("Employee not found for this user");
    }

    return await db
      .update(attendance)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(attendance.empId, employeeResult[0].id))
      .returning();
  }
}
