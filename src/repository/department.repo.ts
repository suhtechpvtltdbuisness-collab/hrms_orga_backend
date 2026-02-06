import { eq, and } from "drizzle-orm";
import { department } from "../db/schema.js";
import { db } from "../db/connection.js";

class DepartmentRepository {
  private db: typeof db;
  constructor() {
    this.db = db;
  }
  async createDepartment(data: typeof department.$inferInsert) {
    const result = await db
      .insert(department)
      .values({ ...data })
      .returning();
    return result;
  }

  async getDepartmentById(id: number) {
    const result = await db
      .select()
      .from(department)
      .where(eq(department.id, id));
    return result[0];
  }

  async findDepartmentByNameCodeAndAdmin(
    name: string,
    code: string,
    adminId: number,
  ) {
    const result = await db
      .select()
      .from(department)
      .where(
        and(
          eq(department.name, name),
          eq(department.code, code),
          eq(department.adminId, adminId),
          eq(department.isDeleted, false),
        ),
      )
      .limit(1);
    return result[0];
  }

  async getAllDepartments() {
    const result = await db.select().from(department);
    return result;
  }

  async getDepartmentsByAdminId(adminId: number) {
    const result = await db
      .select()
      .from(department)
      .where(
        and(eq(department.adminId, adminId), eq(department.isDeleted, false)),
      );
    return result;
  }

  async updateDepartment(id: number, data: typeof department.$inferInsert) {
    const result = await db
      .update(department)
      .set({ ...data })
      .where(eq(department.id, id))
      .returning();
    return result;
  }
}

export default DepartmentRepository;
