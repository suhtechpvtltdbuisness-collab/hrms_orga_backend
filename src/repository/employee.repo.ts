import { db } from "../db/connection.js";
import { Employee, employment, payroll, users } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

export class EmployeeRepository {
  async createEmployee(data: typeof Employee.$inferInsert) {
    return await db.insert(Employee).values(data).returning();
  }

  async getAllEmployees() {
    return await db
      .select({
        employee: Employee,
        user: users,
      })
      .from(Employee)
      .leftJoin(users, eq(Employee.userId, users.id))
      .where(eq(users.isDeleted, false));
  }

  async getEmployeeById(id: number) {
    return await db
      .select({
        employee: Employee,
        user: users,
      })
      .from(Employee)
      .leftJoin(users, eq(Employee.userId, users.id))
      .where(and(eq(Employee.id, id), eq(users.isDeleted, false)));
  }

  async getEmployeeByUserId(userId: number) {
    return await db
      .select({
        employee: Employee,
        user: users,
      })
      .from(Employee)
      .leftJoin(users, eq(Employee.userId, users.id))
      .where(and(eq(Employee.userId, userId), eq(users.isDeleted, false)));
  }

  async getEmployeesByAdminId(adminId: number) {
    return await db
      .select({
        employee: Employee,
        user: users,
      })
      .from(Employee)
      .leftJoin(users, eq(Employee.userId, users.id))
      .where(and(eq(Employee.adminId, adminId), eq(users.isDeleted, false)));
  }

  async updateEmployeeByUserId(
    userId: number,
    data: typeof Employee.$inferInsert,
  ) {
    return await db
      .update(Employee)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(Employee.userId, userId))
      .returning();
  }

  async deleteEmployeeByUserId(userId: number) {
    return await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          isDeleted: true,
          active: false,
          updatedAt: new Date(),
        })
        .where(and(eq(users.id, userId), eq(users.isDeleted, false)));

      await tx
        .update(employment)
        .set({ isDeleted: true, updatedAt: new Date() })
        .where(and(eq(employment.employeeId, userId), eq(employment.isDeleted, false)));

      await tx
        .update(payroll)
        .set({ isDeleted: true, updatedAt: new Date() })
        .where(and(eq(payroll.empId, userId), eq(payroll.isDeleted, false)));

      return await tx
        .select({
          employee: Employee,
          user: users,
        })
        .from(Employee)
        .leftJoin(users, eq(Employee.userId, users.id))
        .where(eq(Employee.userId, userId));
    });
  }
}
