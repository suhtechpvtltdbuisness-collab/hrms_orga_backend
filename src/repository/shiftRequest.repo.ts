import { db } from "../db/connection.js";
import { shiftRequest, shiftType, users } from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";

export type ShiftRequestFilters = {
  status?: string;
  empId?: number;
};

class ShiftRequestRepository {
  private selectFields = {
    id: shiftRequest.id,
    empId: shiftRequest.empId,
    empName: users.name,
    shiftTypeId: shiftRequest.shiftTypeId,
    shiftTypeName: shiftType.name,
    fromDate: shiftRequest.fromDate,
    toDate: shiftRequest.toDate,
    comment: shiftRequest.comment,
    status: shiftRequest.status,
    reviewedBy: shiftRequest.reviewedBy,
    reviewedAt: shiftRequest.reviewedAt,
    rejectionReason: shiftRequest.rejectionReason,
    createdAt: shiftRequest.createdAt,
    updatedAt: shiftRequest.updatedAt,
  };

  async createShiftRequest(data: typeof shiftRequest.$inferInsert) {
    const [result] = await db.insert(shiftRequest).values(data).returning();
    return result;
  }

  async getShiftRequests(filters: ShiftRequestFilters = {}) {
    const conditions = [eq(shiftRequest.isDeleted, false)];

    if (filters.status) {
      conditions.push(
        eq(
          shiftRequest.status,
          filters.status as typeof shiftRequest.$inferSelect.status,
        ),
      );
    }

    if (filters.empId) {
      conditions.push(eq(shiftRequest.empId, filters.empId));
    }

    return await db
      .select(this.selectFields)
      .from(shiftRequest)
      .leftJoin(users, eq(shiftRequest.empId, users.id))
      .leftJoin(shiftType, eq(shiftRequest.shiftTypeId, shiftType.id))
      .where(and(...conditions))
      .orderBy(desc(shiftRequest.createdAt));
  }

  async getShiftRequestById(id: number) {
    const [result] = await db
      .select(this.selectFields)
      .from(shiftRequest)
      .leftJoin(users, eq(shiftRequest.empId, users.id))
      .leftJoin(shiftType, eq(shiftRequest.shiftTypeId, shiftType.id))
      .where(and(eq(shiftRequest.id, id), eq(shiftRequest.isDeleted, false)))
      .limit(1);
    return result;
  }

  async updateShiftRequest(
    id: number,
    data: Partial<typeof shiftRequest.$inferInsert>,
  ) {
    const [result] = await db
      .update(shiftRequest)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(shiftRequest.id, id))
      .returning();
    return result;
  }
}

export default ShiftRequestRepository;
