import { db } from "../db/connection.js";
import { offboarding, Employee, department } from "../db/schema.js";
import { eq } from "drizzle-orm";

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
      .leftJoin(Employee, eq(offboarding.empId, Employee.id))
      .leftJoin(department, eq(offboarding.departmentId, department.id));
  }

  async getOffboardingById(id: number) {
    return await db
      .select({
        offboarding: offboarding,
        employee: Employee,
        department: department,
      })
      .from(offboarding)
      .leftJoin(Employee, eq(offboarding.empId, Employee.id))
      .leftJoin(department, eq(offboarding.departmentId, department.id))
      .where(eq(offboarding.id, id));
  }

  async getOffboardingsByEmployeeId(empId: number) {
    return await db
      .select({
        offboarding: offboarding,
        employee: Employee,
        department: department,
      })
      .from(offboarding)
      .leftJoin(Employee, eq(offboarding.empId, Employee.id))
      .leftJoin(department, eq(offboarding.departmentId, department.id))
      .where(eq(offboarding.empId, empId));
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
      .where(eq(offboarding.empId, employeeResult[0].id))
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
      .where(eq(offboarding.empId, employeeResult[0].id))
      .returning();
  }
}
