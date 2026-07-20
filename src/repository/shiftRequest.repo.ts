import { db } from "../db/connection.js";
import { Employee, shiftRequest, shiftType, users } from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { employeeIsVisible } from "./employeeVisibility.js";

export type ShiftRequestFilters = {
  status?: string;
  empId?: number;
  adminId?: number;
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
    const conditions = [
      eq(shiftRequest.isDeleted, false),
      employeeIsVisible(shiftRequest.empId),
    ];

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
    if (filters.adminId) conditions.push(eq(Employee.adminId, filters.adminId));

    return await db
      .select(this.selectFields)
      .from(shiftRequest)
      .leftJoin(users, eq(shiftRequest.empId, users.id))
      .innerJoin(Employee, eq(Employee.userId, shiftRequest.empId))
      .leftJoin(shiftType, eq(shiftRequest.shiftTypeId, shiftType.id))
      .where(and(...conditions))
      .orderBy(desc(shiftRequest.createdAt));
  }

  async getShiftRequestById(id: number, adminId?: number) {
    const conditions = [
      eq(shiftRequest.id, id),
      eq(shiftRequest.isDeleted, false),
      employeeIsVisible(shiftRequest.empId),
    ];
    if (adminId) conditions.push(eq(Employee.adminId, adminId));
    const [result] = await db
      .select(this.selectFields)
      .from(shiftRequest)
      .leftJoin(users, eq(shiftRequest.empId, users.id))
      .innerJoin(Employee, eq(Employee.userId, shiftRequest.empId))
      .leftJoin(shiftType, eq(shiftRequest.shiftTypeId, shiftType.id))
      .where(and(...conditions))
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

  async getApprovedRequestsForEmployee(adminId: number, empId: number) {
    return db
      .select({
        id: shiftRequest.id,
        empId: shiftRequest.empId,
        shiftTypeId: shiftRequest.shiftTypeId,
        fromDate: shiftRequest.fromDate,
        toDate: shiftRequest.toDate,
        reviewedBy: shiftRequest.reviewedBy,
        reviewedAt: shiftRequest.reviewedAt,
        updatedAt: shiftRequest.updatedAt,
      })
      .from(shiftRequest)
      .innerJoin(Employee, eq(Employee.userId, shiftRequest.empId))
      .where(
        and(
          eq(shiftRequest.isDeleted, false),
          eq(shiftRequest.status, "approved"),
          eq(shiftRequest.empId, empId),
          eq(Employee.adminId, adminId),
          employeeIsVisible(shiftRequest.empId),
        ),
      )
      .orderBy(desc(shiftRequest.reviewedAt), desc(shiftRequest.id));
  }
}

export default ShiftRequestRepository;
