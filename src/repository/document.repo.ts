import { db } from "../db/connection.js";
import { document, Employee, users } from "../db/schema.js";
import { and, eq } from "drizzle-orm";
import { employeeIsVisible } from "./employeeVisibility.js";

export class DocumentRepository {
  async createDocument(data: typeof document.$inferInsert) {
    return await db.insert(document).values(data).returning();
  }

  async getAllDocuments() {
    return await db
      .select({
        document: document,
        employee: Employee,
      })
      .from(document)
      .leftJoin(Employee, eq(document.empId, Employee.userId))
      .where(employeeIsVisible(document.empId));
  }

  async getDocumentById(id: number) {
    return await db
      .select({
        document: document,
        employee: Employee,
      })
      .from(document)
      .leftJoin(Employee, eq(document.empId, Employee.userId))
      .where(and(eq(document.id, id), employeeIsVisible(document.empId)));
  }

  async getDocumentsByEmployeeId(empId: number) {
    return await db
      .select({
        document: document,
        employee: Employee,
      })
      .from(document)
      .leftJoin(Employee, eq(document.empId, Employee.userId))
      .where(and(
        eq(document.empId, empId),
        employeeIsVisible(document.empId),
      ));
  }

  async updateDocument(id: number, data: typeof document.$inferInsert) {
    return await db
      .update(document)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(document.id, id))
      .returning();
  }

  async updateDocumentByUserId(
    userId: number,
    data: typeof document.$inferInsert,
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
      .update(document)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(document.empId, employeeResult[0].userId))
      .returning();
  }

  async deleteDocument(id: number) {
    return await db.delete(document).where(eq(document.id, id)).returning();
  }

  async deleteDocumentByUserId(userId: number) {
    const employeeResult = await db
      .select()
      .from(Employee)
      .where(eq(Employee.userId, userId))
      .limit(1);

    if (!employeeResult[0]) {
      throw new Error("Employee not found for this user");
    }

    return await db
      .delete(document)
      .where(eq(document.empId, employeeResult[0].userId))
      .returning();
  }
}
