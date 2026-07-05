import { and, eq } from "drizzle-orm";
import { leave, Employee } from "../db/schema.js";
import { db } from "../db/connection.js";
import { employeeIsVisible } from "./employeeVisibility.js";

class LeaveRepository {
  private db: typeof db;
  constructor() {
    this.db = db;
  }

  async createLeave(data: typeof leave.$inferInsert) {
    const result = await db
      .insert(leave)
      .values({ ...data })
      .returning();
    return result[0];
  }

  async getLeaveById(id: number) {
    const result = await db
      .select()
      .from(leave)
      .where(and(eq(leave.id, id), employeeIsVisible(leave.empId)))
      .limit(1);
    return result[0];
  }

  async getLeavesByEmployeeId(empId: number) {
    const result = await db
      .select()
      .from(leave)
      .where(and(eq(leave.empId, empId), employeeIsVisible(leave.empId)));
    return result;
  }

  async getBalanceByEmpUserId(userId: number) {
    const [result] = await db
      .select()
      .from(leave)
      .where(and(eq(leave.empId, userId), employeeIsVisible(leave.empId)))
      .limit(1);
    return result ?? null;
  }

  async getAllLeaves() {
    const result = await db
      .select()
      .from(leave)
      .where(employeeIsVisible(leave.empId));
    return result;
  }

  async getAllLeavesByAdminId(adminId: number) {
    return db
      .select({ leave })
      .from(leave)
      .innerJoin(Employee, eq(Employee.userId, leave.empId))
      .where(and(
        eq(Employee.adminId, adminId),
        employeeIsVisible(leave.empId),
      ));
  }

  async getLeaveByIdForAdmin(id: number, adminId: number) {
    const [result] = await db
      .select({ leave })
      .from(leave)
      .innerJoin(Employee, eq(Employee.userId, leave.empId))
      .where(and(
        eq(leave.id, id),
        eq(Employee.adminId, adminId),
        employeeIsVisible(leave.empId),
      ))
      .limit(1);
    return result?.leave ?? null;
  }

  async getLeavesByUserId(userId: number) {
    const result = await db
      .select()
      .from(leave)
      .where(and(eq(leave.empId, userId), employeeIsVisible(leave.empId)));
    return result;
  }

  async updateLeave(id: number, data: typeof leave.$inferInsert) {
    const result = await db
      .update(leave)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(leave.id, id))
      .returning();
    return result[0];
  }

  async updateLeaveByUserId(userId: number, data: typeof leave.$inferInsert) {
    // First get the employee by userId
    const employeeResult = await db
      .select()
      .from(Employee)
      .where(eq(Employee.userId, userId))
      .limit(1);

    if (!employeeResult[0]) {
      throw new Error("Employee not found for this user");
    }

    const result = await db
      .update(leave)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(leave.empId, userId))
      .returning();
    return result[0];
  }

  async deleteLeave(id: number) {
    const result = await db.delete(leave).where(eq(leave.id, id)).returning();
    return result[0];
  }

  async deleteLeaveByUserId(userId: number) {
    const employeeResult = await db
      .select()
      .from(Employee)
      .where(eq(Employee.userId, userId))
      .limit(1);

    if (!employeeResult[0]) {
      throw new Error("Employee not found for this user");
    }

    const result = await db
      .delete(leave)
      .where(eq(leave.empId, employeeResult[0].id))
      .returning();
    return result[0];
  }
}

export default LeaveRepository;
