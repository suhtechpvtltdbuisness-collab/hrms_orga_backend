import { db } from "../db/connection.js";
import { offboarding, Employee, department } from "../db/schema.js";
import { and, eq } from "drizzle-orm";
import { employeeIsVisible } from "./employeeVisibility.js";

export class OffboardingRepository {
  async createOffboarding(data: typeof offboarding.$inferInsert) {
    return await db.insert(offboarding).values(data).returning();
  }

  async getAllOffboardings() {
    return await db
      .select({
        offboarding: offboarding,
        employee: Employee,
        department: department,
      })
      .from(offboarding)
      .leftJoin(Employee, eq(offboarding.empId, Employee.userId))
      .leftJoin(department, eq(offboarding.departmentId, department.id))
      .where(employeeIsVisible(offboarding.empId));
  }

  async getOffboardingById(id: number) {
    return await db
      .select({
        offboarding: offboarding,
        employee: Employee,
        department: department,
      })
      .from(offboarding)
      .leftJoin(Employee, eq(offboarding.empId, Employee.userId))
      .leftJoin(department, eq(offboarding.departmentId, department.id))
      .where(and(eq(offboarding.id, id), employeeIsVisible(offboarding.empId)));
  }

  async getOffboardingsByEmployeeId(empId: number) {
    return await db
      .select({
        offboarding: offboarding,
        employee: Employee,
        department: department,
      })
      .from(offboarding)
      .leftJoin(Employee, eq(offboarding.empId, Employee.userId))
      .leftJoin(department, eq(offboarding.departmentId, department.id))
      .where(and(
        eq(offboarding.empId, empId),
        employeeIsVisible(offboarding.empId),
      ));
  }

  async updateOffboarding(id: number, data: typeof offboarding.$inferInsert) {
    return await db
      .update(offboarding)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(offboarding.id, id))
      .returning();
  }

  async updateOffboardingByUserId(
    userId: number,
    data: typeof offboarding.$inferInsert,
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
      .update(offboarding)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(offboarding.empId, employeeResult[0].userId))
      .returning();
  }

  async deleteOffboarding(id: number) {
    return await db
      .delete(offboarding)
      .where(eq(offboarding.id, id))
      .returning();
  }

  async deleteOffboardingByUserId(userId: number) {
    const employeeResult = await db
      .select()
      .from(Employee)
      .where(eq(Employee.userId, userId))
      .limit(1);

    if (!employeeResult[0]) {
      throw new Error("Employee not found for this user");
    }

    return await db
      .delete(offboarding)
      .where(eq(offboarding.empId, employeeResult[0].userId))
      .returning();
  }
}
