import { db } from "../db/connection.js";
import { Employee, users } from "../db/schema.js";
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
      .leftJoin(users, eq(Employee.userId, users.id));
  }

  async getEmployeeById(id: number) {
    return await db
      .select({
        employee: Employee,
        user: users,
      })
      .from(Employee)
      .leftJoin(users, eq(Employee.userId, users.id))
      .where(eq(Employee.id, id));
  }

  async getEmployeeByUserId(userId: number) {
    return await db
      .select({
        employee: Employee,
        user: users,
      })
      .from(Employee)
      .leftJoin(users, eq(Employee.userId, users.id))
      .where(eq(Employee.userId, userId));
  }

  async getEmployeesByAdminId(adminId: number) {
    return await db
      .select({
        employee: Employee,
        user: users,
      })
      .from(Employee)
      .leftJoin(users, eq(Employee.userId, users.id))
      .where(eq(Employee.adminId, adminId));
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
    return await db
      .delete(Employee)
      .where(eq(Employee.userId, userId))
      .returning();
  }
}
