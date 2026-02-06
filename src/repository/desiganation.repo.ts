import { db } from "../db/connection.js";
import { designation,department } from "../db/schema.js";
import { eq,and } from "drizzle-orm";

class DesignationRepository {
  private db: typeof db;
  constructor() {
    this.db = db;
  }
  async getDesignationByDepartmentIdAndName(
    departmentId: number,
    name: string,
  ) {
    const result = await db
      .select()
      .from(designation)
      .where(
        and(
          eq(designation.departmentId, departmentId),
          eq(designation.name, name),
        ),
      )
      .limit(1);
    return result[0];
  }
  async createDesignation(data: typeof designation.$inferInsert) {
    const result = await db
      .insert(designation)
      .values({ ...data })
      .returning();
    return result;
  }

  async getDesignationById(id: number) {
    const result = await db
      .select()
      .from(designation)
      .where(eq(designation.id, id));
    return result[0];
  }

  async getAllDesignations() {
    const result = await db.select().from(designation);
    return result;
  }

  async updateDesignation(id: number, data: typeof designation.$inferInsert) {
    const result = await db
      .update(designation)
      .set({ ...data })
      .where(eq(designation.id, id))
      .returning();
    return result;
  }
  async getDesignationsByAdminId(adminId: number) {
    const result = await db
      .select()
      .from(designation)
      .leftJoin(
        department,
        eq(department.id, designation.departmentId),
      )
      .where(
        and(
          eq(department.adminId, adminId),
          eq(designation.isDeleted, false),
        ),
      );
    return result;
  } 
}

export default DesignationRepository;
