import { db } from "../db/connection.js";
import { trainingAndDevelopment, Employee } from "../db/schema.js";
import { eq } from "drizzle-orm";

export class TrainingRepository {
  async createTraining(data: typeof trainingAndDevelopment.$inferInsert) {
    return await db.insert(trainingAndDevelopment).values(data).returning();
  }

  async getAllTrainings() {
    return await db
      .select({
        training: trainingAndDevelopment,
        employee: Employee,
      })
      .from(trainingAndDevelopment)
      .leftJoin(Employee, eq(trainingAndDevelopment.empId, Employee.id));
  }

  async getTrainingById(id: number) {
    return await db
      .select({
        training: trainingAndDevelopment,
        employee: Employee,
      })
      .from(trainingAndDevelopment)
      .leftJoin(Employee, eq(trainingAndDevelopment.empId, Employee.id))
      .where(eq(trainingAndDevelopment.id, id));
  }

  async getTrainingsByEmployeeId(empId: number) {
    return await db
      .select({
        training: trainingAndDevelopment,
        employee: Employee,
      })
      .from(trainingAndDevelopment)
      .leftJoin(Employee, eq(trainingAndDevelopment.empId, Employee.id))
      .where(eq(trainingAndDevelopment.empId, empId));
  }

  async updateTraining(
    id: number,
    data: typeof trainingAndDevelopment.$inferInsert,
  ) {
    return await db
      .update(trainingAndDevelopment)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(trainingAndDevelopment.id, id))
      .returning();
  }

  async updateTrainingByUserId(
    userId: number,
    data: typeof trainingAndDevelopment.$inferInsert,
  ) {
    const { Employee } = await import("../db/schema.js");
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
      .update(trainingAndDevelopment)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(trainingAndDevelopment.empId, employeeResult[0].id))
      .returning();
  }

  async deleteTraining(id: number) {
    return await db
      .delete(trainingAndDevelopment)
      .where(eq(trainingAndDevelopment.id, id))
      .returning();
  }

  async deleteTrainingByUserId(userId: number) {
    const { Employee } = await import("../db/schema.js");
    const employeeResult = await db
      .select()
      .from(Employee)
      .where(eq(Employee.userId, userId))
      .limit(1);

    if (!employeeResult[0]) {
      throw new Error("Employee not found for this user");
    }

    return await db
      .delete(trainingAndDevelopment)
      .where(eq(trainingAndDevelopment.empId, employeeResult[0].id))
      .returning();
  }
}
