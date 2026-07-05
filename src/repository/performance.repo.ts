import { db } from "../db/connection.js";
import { performance, Employee, users } from "../db/schema.js";
import { and, eq } from "drizzle-orm";
import { employeeIsVisible } from "./employeeVisibility.js";

export class PerformanceRepository {
  async createPerformance(data: typeof performance.$inferInsert) {
    return await db.insert(performance).values(data).returning();
  }

  async getAllPerformances() {
    return await db
      .select({
        performance: performance,
        employee: Employee,
      })
      .from(performance)
      .leftJoin(Employee, eq(performance.empId, Employee.userId))
      .where(employeeIsVisible(performance.empId));
  }

  async getPerformanceById(id: number) {
    return await db
      .select({
        performance: performance,
        employee: Employee,
      })
      .from(performance)
      .leftJoin(Employee, eq(performance.empId, Employee.userId))
      .where(and(eq(performance.id, id), employeeIsVisible(performance.empId)));
  }

  async getPerformancesByEmployeeId(empId: number) {
    return await db
      .select({
        performance: performance,
        employee: Employee,
      })
      .from(performance)
      .leftJoin(Employee, eq(performance.empId, Employee.userId))
      .where(and(
        eq(performance.empId, empId),
        employeeIsVisible(performance.empId),
      ));
  }

  async updatePerformance(id: number, data: typeof performance.$inferInsert) {
    return await db
      .update(performance)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(performance.id, id))
      .returning();
  }

  async updatePerformanceByUserId(
    userId: number,
    data: typeof performance.$inferInsert,
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
      .update(performance)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(performance.empId, employeeResult[0].userId))
      .returning();
  }

  async deletePerformance(id: number) {
    return await db
      .delete(performance)
      .where(eq(performance.id, id))
      .returning();
  }

  async deletePerformanceByUserId(userId: number) {
    const employeeResult = await db
      .select()
      .from(Employee)
      .where(eq(Employee.userId, userId))
      .limit(1);

    if (!employeeResult[0]) {
      throw new Error("Employee not found for this user");
    }

    return await db
      .delete(performance)
      .where(eq(performance.empId, employeeResult[0].userId))
      .returning();
  }
}
