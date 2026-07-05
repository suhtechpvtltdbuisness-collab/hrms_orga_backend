import { db } from "../db/connection.js";
import { employment } from "../db/schema.js";
import { and, eq } from "drizzle-orm";
import { employeeIsVisible } from "./employeeVisibility.js";

class EmploymentRepository {
  private db: typeof db;
  constructor() {
    this.db = db;
  }

  async createEmployment(data: typeof employment.$inferInsert) {
    const result = await this.db.insert(employment).values(data).returning();
    return result[0];
  }

  async getEmploymentById(id: number) {
    const result = await this.db
      .select()
      .from(employment)
      .where(
        and(
          eq(employment.id, id),
          eq(employment.isDeleted, false),
          employeeIsVisible(employment.employeeId),
        ),
      )
      .limit(1);
    return result[0];
  }

  async getAllEmployments() {
    const result = await this.db
      .select()
      .from(employment)
      .where(
        and(
          eq(employment.isDeleted, false),
          employeeIsVisible(employment.employeeId),
        ),
      );
    return result;
  }

  async getEmploymentsByEmployeeId(employeeId: number) {
    const result = await this.db
      .select()
      .from(employment)
      .where(
        and(
          eq(employment.employeeId, employeeId),
          eq(employment.isDeleted, false),
          employeeIsVisible(employment.employeeId),
        ),
      );
    return result;
  }

  async getEmploymentsByDepartmentId(departmentId: number) {
    const result = await this.db
      .select()
      .from(employment)
      .where(
        and(
          eq(employment.departmentId, departmentId),
          eq(employment.isDeleted, false),
          employeeIsVisible(employment.employeeId),
        ),
      );
    return result;
  }

  async updateEmployment(
    id: number,
    data: Partial<typeof employment.$inferInsert>,
  ) {
    const result = await this.db
      .update(employment)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(employment.id, id))
      .returning();
    return result[0];
  }

  async updateEmploymentByUserId(
    userId: number,
    data: Partial<typeof employment.$inferInsert>,
  ) {
    // First get the employee by userId
    const { Employee } = await import("../db/schema.js");
    const employeeResult = await this.db
      .select()
      .from(Employee)
      .where(eq(Employee.userId, userId))
      .limit(1);

    if (!employeeResult[0]) {
      throw new Error("Employee not found for this user");
    }

    const result = await this.db
      .update(employment)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(employment.employeeId, employeeResult[0].userId))
      .returning();
    return result[0];
  }

  async deleteEmployment(id: number) {
    const result = await this.db
      .update(employment)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(employment.id, id))
      .returning();
    return result[0];
  }

  async deleteEmploymentByUserId(userId: number) {
    const { Employee } = await import("../db/schema.js");
    const employeeResult = await this.db
      .select()
      .from(Employee)
      .where(eq(Employee.userId, userId))
      .limit(1);

    if (!employeeResult[0]) {
      throw new Error("Employee not found for this user");
    }

    const result = await this.db
      .update(employment)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(employment.employeeId, employeeResult[0].userId))
      .returning();
    return result[0];
  }
}

export default EmploymentRepository;
