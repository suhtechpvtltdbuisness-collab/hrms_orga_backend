import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/connection.js";
import { Employee, leaveRequest, users } from "../db/schema.js";
import { employeeIsVisible } from "./employeeVisibility.js";

export type LeaveRequestFilters = {
  status?: string;
  empId?: number;
  adminId?: number;
};

class LeaveRequestRepository {
  private selectFields = {
    id: leaveRequest.id,
    empId: leaveRequest.empId,
    empName: users.name,
    empEmail: users.email,
    leaveType: leaveRequest.leaveType,
    fromDate: leaveRequest.fromDate,
    toDate: leaveRequest.toDate,
    days: leaveRequest.days,
    reason: leaveRequest.reason,
    status: leaveRequest.status,
    reviewedBy: leaveRequest.reviewedBy,
    reviewedAt: leaveRequest.reviewedAt,
    rejectionReason: leaveRequest.rejectionReason,
    createdAt: leaveRequest.createdAt,
    updatedAt: leaveRequest.updatedAt,
  };

  async createLeaveRequest(data: typeof leaveRequest.$inferInsert) {
    const [result] = await db.insert(leaveRequest).values(data).returning();
    return result;
  }

  async getLeaveRequests(filters: LeaveRequestFilters = {}) {
    const conditions = [
      eq(leaveRequest.isDeleted, false),
      employeeIsVisible(leaveRequest.empId),
    ];

    if (filters.status) {
      conditions.push(
        eq(
          leaveRequest.status,
          filters.status as typeof leaveRequest.$inferSelect.status,
        ),
      );
    }

    if (filters.empId) {
      conditions.push(eq(leaveRequest.empId, filters.empId));
    }

    if (filters.adminId) {
      conditions.push(eq(Employee.adminId, filters.adminId));
    }

    return db
      .select(this.selectFields)
      .from(leaveRequest)
      .leftJoin(users, eq(leaveRequest.empId, users.id))
      .leftJoin(Employee, eq(Employee.userId, leaveRequest.empId))
      .where(and(...conditions))
      .orderBy(desc(leaveRequest.createdAt));
  }

  async getLeaveRequestById(id: number, adminId?: number) {
    const [result] = await db
      .select(this.selectFields)
      .from(leaveRequest)
      .leftJoin(users, eq(leaveRequest.empId, users.id))
      .leftJoin(Employee, eq(Employee.userId, leaveRequest.empId))
      .where(
        and(
          eq(leaveRequest.id, id),
          eq(leaveRequest.isDeleted, false),
          employeeIsVisible(leaveRequest.empId),
          ...(adminId ? [eq(Employee.adminId, adminId)] : []),
        ),
      )
      .limit(1);

    return result ?? null;
  }

  async updateLeaveRequest(
    id: number,
    data: Partial<typeof leaveRequest.$inferInsert>,
  ) {
    const [result] = await db
      .update(leaveRequest)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(leaveRequest.id, id))
      .returning();

    return result;
  }
}

export default LeaveRequestRepository;
