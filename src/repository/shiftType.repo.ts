import { db } from "../db/connection.js";
import { shiftType } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

class ShiftTypeRepository {
  async createShiftType(data: typeof shiftType.$inferInsert) {
    const result = await db.insert(shiftType).values(data).returning();
    return result[0];
  }

  async getAllShiftTypes() {
    return await db
      .select()
      .from(shiftType)
      .where(eq(shiftType.isDeleted, false));
  }

  async getShiftTypeById(id: number) {
    const [result] = await db
      .select()
      .from(shiftType)
      .where(and(eq(shiftType.id, id), eq(shiftType.isDeleted, false)))
      .limit(1);
    return result;
  }

  async getShiftTypeByName(name: string) {
    const [result] = await db
      .select()
      .from(shiftType)
      .where(and(eq(shiftType.name, name), eq(shiftType.isDeleted, false)))
      .limit(1);
    return result;
  }

  async updateShiftType(id: number, data: Partial<typeof shiftType.$inferInsert>) {
    const [result] = await db
      .update(shiftType)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(shiftType.id, id))
      .returning();
    return result;
  }
}

export default ShiftTypeRepository;
