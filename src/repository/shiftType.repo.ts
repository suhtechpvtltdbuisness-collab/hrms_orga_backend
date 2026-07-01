import { db } from "../db/connection.js";
import { shiftType } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

class ShiftTypeRepository {
  async createShiftType(data: typeof shiftType.$inferInsert) {
    const result = await db.insert(shiftType).values(data).returning();
    return result[0];
  }

  async getAllShiftTypes(adminId: number) {
    return await db
      .select()
      .from(shiftType)
      .where(and(eq(shiftType.isDeleted, false), eq(shiftType.createdBy, adminId)));
  }

  async getShiftTypeById(id: number, adminId: number) {
    const [result] = await db
      .select()
      .from(shiftType)
      .where(and(eq(shiftType.id, id), eq(shiftType.createdBy, adminId), eq(shiftType.isDeleted, false)))
      .limit(1);
    return result;
  }

  async getShiftTypeByName(name: string, adminId: number) {
    const [result] = await db
      .select()
      .from(shiftType)
      .where(and(eq(shiftType.name, name), eq(shiftType.createdBy, adminId), eq(shiftType.isDeleted, false)))
      .limit(1);
    return result;
  }

  async updateShiftType(id: number, adminId: number, data: Partial<typeof shiftType.$inferInsert>) {
    const [result] = await db
      .update(shiftType)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(shiftType.id, id), eq(shiftType.createdBy, adminId)))
      .returning();
    return result;
  }
}

export default ShiftTypeRepository;
