import { db } from "../db/connection.js";
import { employment } from "../db/schema.js";
import { eq } from "drizzle-orm";

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
      .where(eq(employment.id, id))
      .limit(1);
    return result[0];
  }

  async getAllEmployments() {
    const result = await this.db
      .select()
      .from(employment)
      .where(eq(employment.isDeleted, false));
    return result;
  }

  async getEmploymentsByEmployeeId(employeeId: number) {
    const result = await this.db
      .select()
      .from(employment)
      .where(eq(employment.employeeId, employeeId));
    return result;
  }

  async getEmploymentsByDepartmentId(departmentId: number) {
    const result = await this.db
      .select()
      .from(employment)
      .where(eq(employment.departmentId, departmentId));
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
      .where(eq(employment.employeeId, employeeResult[0].id))
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
      .where(eq(employment.employeeId, employeeResult[0].id))
      .returning();
    return result[0];
  }
}

export default EmploymentRepository;
