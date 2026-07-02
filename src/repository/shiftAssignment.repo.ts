import { and, asc, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "../db/connection.js";
import { Employee, shiftAssignment, shiftType, users } from "../db/schema.js";

export class ShiftAssignmentRepository {
  async getRoster(adminId: number, rosterDate: string, search: string, page: number, limit: number) {
    const searchCondition = search
      ? or(
          ilike(users.name, `%${search}%`),
          sql`('EMP-' || lpad(${users.id}::text, 3, '0')) ILIKE ${`%${search}%`}`,
        )
      : undefined;
    const where = and(eq(Employee.adminId, adminId), eq(users.isDeleted, false), searchCondition);

    const [rows, totalRows] = await Promise.all([
      db
        .select({
          employeeId: Employee.userId,
          employeeName: users.name,
          assignmentId: shiftAssignment.id,
          shiftTypeId: shiftAssignment.shiftTypeId,
          shiftName: shiftType.name,
          startTime: shiftType.startTime,
          endTime: shiftType.endTime,
        })
        .from(Employee)
        .innerJoin(users, eq(users.id, Employee.userId))
        .leftJoin(
          shiftAssignment,
          and(
            eq(shiftAssignment.adminId, adminId),
            eq(shiftAssignment.empId, Employee.userId),
            eq(shiftAssignment.rosterDate, rosterDate),
          ),
        )
        .leftJoin(shiftType, eq(shiftType.id, shiftAssignment.shiftTypeId))
        .where(where)
        .orderBy(asc(users.name), asc(users.id))
        .limit(limit)
        .offset((page - 1) * limit),
      db
        .select({ total: count() })
        .from(Employee)
        .innerJoin(users, eq(users.id, Employee.userId))
        .where(where),
    ]);

    return { rows, total: Number(totalRows[0]?.total ?? 0) };
  }

  async getAvailableShiftTypes(adminId: number) {
    return db
      .select({ id: shiftType.id, name: shiftType.name, startTime: shiftType.startTime, endTime: shiftType.endTime })
      .from(shiftType)
      .where(and(eq(shiftType.isDeleted, false), eq(shiftType.createdBy, adminId)))
      .orderBy(asc(shiftType.name));
  }

  async getEmployees(adminId: number, employeeIds: number[]) {
    if (!employeeIds.length) return [];
    return db
      .select({ userId: Employee.userId })
      .from(Employee)
      .where(and(eq(Employee.adminId, adminId), inArray(Employee.userId, employeeIds)));
  }

  async getEmployeeByUserId(userId: number) {
    const [employee] = await db
      .select({ userId: Employee.userId, adminId: Employee.adminId })
      .from(Employee)
      .where(eq(Employee.userId, userId))
      .limit(1);
    return employee;
  }

  async getEmployeeAssignmentsForDates(empId: number, rosterDates: string[]) {
    if (!rosterDates.length) return [];

    return db
      .select({
        assignmentId: shiftAssignment.id,
        rosterDate: shiftAssignment.rosterDate,
        shiftTypeId: shiftType.id,
        shiftName: shiftType.name,
        startTime: shiftType.startTime,
        endTime: shiftType.endTime,
        beginCheckinBefore: shiftType.beginCheckinBefore,
        enableEntryGracePeriod: shiftType.enableEntryGracePeriod,
        lateEntryGracePeriod: shiftType.lateEntryGracePeriod,
      })
      .from(shiftAssignment)
      .innerJoin(
        shiftType,
        and(
          eq(shiftType.id, shiftAssignment.shiftTypeId),
          eq(shiftType.isDeleted, false),
        ),
      )
      .where(
        and(
          eq(shiftAssignment.empId, empId),
          inArray(shiftAssignment.rosterDate, rosterDates),
        ),
      )
      .orderBy(desc(shiftAssignment.rosterDate));
  }

  async getShiftTypes(adminId: number, shiftTypeIds: number[]) {
    if (!shiftTypeIds.length) return [];
    return db
      .select({ id: shiftType.id })
      .from(shiftType)
      .where(
        and(
          eq(shiftType.createdBy, adminId),
          eq(shiftType.isDeleted, false),
          inArray(shiftType.id, shiftTypeIds),
        ),
      );
  }

  async saveRoster(
    adminId: number,
    organizationId: number | null,
    rosterDate: string,
    assignments: Array<{ employeeId: number; shiftTypeId: number | null }>,
    assignedBy: number,
  ) {
    return db.transaction(async (tx) => {
      const unassigned = assignments.filter((item) => item.shiftTypeId === null).map((item) => item.employeeId);
      if (unassigned.length) {
        await tx.delete(shiftAssignment).where(
          and(
            eq(shiftAssignment.adminId, adminId),
            eq(shiftAssignment.rosterDate, rosterDate),
            inArray(shiftAssignment.empId, unassigned),
          ),
        );
      }

      const assigned = assignments.filter(
        (item): item is { employeeId: number; shiftTypeId: number } => item.shiftTypeId !== null,
      );
      if (!assigned.length) return [];

      return tx
        .insert(shiftAssignment)
        .values(
          assigned.map((item) => ({
            adminId,
            organizationId,
            empId: item.employeeId,
            shiftTypeId: item.shiftTypeId,
            rosterDate,
            assignedBy,
          })),
        )
        .onConflictDoUpdate({
          target: [shiftAssignment.adminId, shiftAssignment.empId, shiftAssignment.rosterDate],
          set: {
            shiftTypeId: sql`excluded.shift_type_id`,
            assignedBy,
            updatedAt: new Date(),
          },
        })
        .returning();
    });
  }

  async getEmployeeHistory(adminId: number, empId: number, fromDate?: string, toDate?: string) {
    return db
      .select({
        id: shiftAssignment.id,
        rosterDate: shiftAssignment.rosterDate,
        shiftTypeId: shiftType.id,
        shiftName: shiftType.name,
        startTime: shiftType.startTime,
        endTime: shiftType.endTime,
        assignedBy: shiftAssignment.assignedBy,
        createdAt: shiftAssignment.createdAt,
        updatedAt: shiftAssignment.updatedAt,
      })
      .from(shiftAssignment)
      .innerJoin(shiftType, eq(shiftType.id, shiftAssignment.shiftTypeId))
      .where(
        and(
          eq(shiftAssignment.adminId, adminId),
          eq(shiftAssignment.empId, empId),
          fromDate ? sql`${shiftAssignment.rosterDate} >= ${fromDate}` : undefined,
          toDate ? sql`${shiftAssignment.rosterDate} <= ${toDate}` : undefined,
        ),
      )
      .orderBy(desc(shiftAssignment.rosterDate));
  }

  async deleteById(adminId: number, id: number) {
    return db
      .delete(shiftAssignment)
      .where(and(eq(shiftAssignment.id, id), eq(shiftAssignment.adminId, adminId)))
      .returning({ id: shiftAssignment.id });
  }
}
