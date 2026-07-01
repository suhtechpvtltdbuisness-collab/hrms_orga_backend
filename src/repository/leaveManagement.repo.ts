import {
  and,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { db } from "../db/connection.js";
import {
  compensatoryLeaveRequest,
  department,
  Employee,
  employment,
  leaveBlock,
  leaveEncashmentRequest,
  leaveHoliday,
  leavePeriod,
  leavePolicy,
  leavePolicyAssignment,
  leaveTypeConfig,
  salaryStructureAssignment,
  users,
} from "../db/schema.js";

class LeaveManagementRepository {
  async getEmployees(adminId: number) {
    return db
      .select({
        empId: users.id,
        empName: users.name,
        empEmail: users.email,
        departmentId: department.id,
        departmentName: department.departmentName,
      })
      .from(Employee)
      .leftJoin(users, eq(Employee.userId, users.id))
      .leftJoin(employment, eq(employment.employeeId, users.id))
      .leftJoin(department, eq(employment.departmentId, department.id))
      .where(
        and(
          eq(Employee.adminId, adminId),
          eq(users.isDeleted, false),
          eq(users.active, true),
        ),
      )
      .orderBy(users.name);
  }

  async getDepartments(adminId: number) {
    return db
      .select({
        id: department.id,
        name: department.departmentName,
      })
      .from(Employee)
      .leftJoin(users, eq(Employee.userId, users.id))
      .leftJoin(employment, eq(employment.employeeId, Employee.userId))
      .leftJoin(department, eq(department.id, employment.departmentId))
      .where(
        and(
          eq(Employee.adminId, adminId),
          eq(users.isDeleted, false),
          eq(employment.isDeleted, false),
        ),
      )
      .groupBy(department.id, department.departmentName)
      .orderBy(department.departmentName);
  }

  async getEmploymentByUserId(empId: number) {
    const [result] = await db
      .select({
        departmentId: employment.departmentId,
      })
      .from(employment)
      .where(and(eq(employment.employeeId, empId), eq(employment.isDeleted, false)))
      .limit(1);

    return result ?? null;
  }

  async getUserById(userId: number) {
    const [result] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.isDeleted, false)))
      .limit(1);

    return result ?? null;
  }

  async getHolidayById(id: number) {
    const [result] = await db
      .select()
      .from(leaveHoliday)
      .where(eq(leaveHoliday.id, id))
      .limit(1);
    return result ?? null;
  }

  async findHolidayDuplicate(
    adminId: number,
    holidayDate: string,
    name: string,
    excludeId?: number,
  ) {
    const results = await db
      .select()
      .from(leaveHoliday)
      .where(
        and(
          eq(leaveHoliday.adminId, adminId),
          eq(leaveHoliday.holidayDate, holidayDate),
          ilike(leaveHoliday.name, name),
        ),
      );

    return results.find((item) => item.id !== excludeId) ?? null;
  }

  async getHolidays(
    adminId: number,
    filters: { search?: string; type?: string; year?: number },
  ) {
    const conditions = [eq(leaveHoliday.adminId, adminId)];

    if (filters.type) {
      conditions.push(eq(leaveHoliday.holidayType, filters.type));
    }

    if (filters.year) {
      conditions.push(eq(leaveHoliday.holidayYear, filters.year));
    }

    if (filters.search) {
      conditions.push(ilike(leaveHoliday.name, `%${filters.search}%`));
    }

    return db
      .select()
      .from(leaveHoliday)
      .where(and(...conditions))
      .orderBy(leaveHoliday.holidayDate, leaveHoliday.name);
  }

  async createHoliday(data: typeof leaveHoliday.$inferInsert) {
    const [result] = await db.insert(leaveHoliday).values(data).returning();
    return result;
  }

  async updateHoliday(id: number, data: Partial<typeof leaveHoliday.$inferInsert>) {
    const [result] = await db
      .update(leaveHoliday)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(leaveHoliday.id, id))
      .returning();
    return result;
  }

  async deleteHoliday(id: number) {
    const [result] = await db
      .delete(leaveHoliday)
      .where(eq(leaveHoliday.id, id))
      .returning();
    return result;
  }

  async getHolidayCalendarOptions(adminId: number) {
    return db
      .select({
        holidayListName: leaveHoliday.holidayListName,
        holidayYear: leaveHoliday.holidayYear,
      })
      .from(leaveHoliday)
      .where(eq(leaveHoliday.adminId, adminId))
      .groupBy(leaveHoliday.holidayListName, leaveHoliday.holidayYear)
      .orderBy(desc(leaveHoliday.holidayYear), leaveHoliday.holidayListName);
  }

  async getPeriods(adminId: number) {
    return db
      .select()
      .from(leavePeriod)
      .where(eq(leavePeriod.adminId, adminId))
      .orderBy(desc(leavePeriod.fromDate), desc(leavePeriod.createdAt));
  }

  async getPeriodById(id: number) {
    const [result] = await db
      .select()
      .from(leavePeriod)
      .where(eq(leavePeriod.id, id))
      .limit(1);
    return result ?? null;
  }

  async createPeriod(data: typeof leavePeriod.$inferInsert) {
    const [result] = await db.insert(leavePeriod).values(data).returning();
    return result;
  }

  async updatePeriodsStatusByAdmin(adminId: number, isActive: boolean) {
    return db
      .update(leavePeriod)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(leavePeriod.adminId, adminId));
  }

  async updatePeriod(id: number, data: Partial<typeof leavePeriod.$inferInsert>) {
    const [result] = await db
      .update(leavePeriod)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(leavePeriod.id, id))
      .returning();
    return result;
  }

  async deletePeriod(id: number) {
    const [result] = await db
      .delete(leavePeriod)
      .where(eq(leavePeriod.id, id))
      .returning();
    return result;
  }

  async getBlocks(adminId: number, search?: string) {
    const conditions = [eq(leaveBlock.adminId, adminId)];
    if (search) {
      conditions.push(ilike(leaveBlock.name, `%${search}%`));
    }

    return db
      .select()
      .from(leaveBlock)
      .where(and(...conditions))
      .orderBy(desc(leaveBlock.fromDate), leaveBlock.name);
  }

  async getBlockById(id: number) {
    const [result] = await db
      .select()
      .from(leaveBlock)
      .where(eq(leaveBlock.id, id))
      .limit(1);
    return result ?? null;
  }

  async getPotentialOverlappingBlocks(
    adminId: number,
    fromDate: string,
    toDate: string,
  ) {
    return db
      .select()
      .from(leaveBlock)
      .where(
        and(
          eq(leaveBlock.adminId, adminId),
          lte(leaveBlock.fromDate, toDate),
          gte(leaveBlock.toDate, fromDate),
        ),
      );
  }

  async createBlock(data: typeof leaveBlock.$inferInsert) {
    const [result] = await db.insert(leaveBlock).values(data).returning();
    return result;
  }

  async updateBlock(id: number, data: Partial<typeof leaveBlock.$inferInsert>) {
    const [result] = await db
      .update(leaveBlock)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(leaveBlock.id, id))
      .returning();
    return result;
  }

  async deleteBlock(id: number) {
    const [result] = await db
      .delete(leaveBlock)
      .where(eq(leaveBlock.id, id))
      .returning();
    return result;
  }

  async getLeaveTypes(adminId: number, search?: string) {
    const conditions = [eq(leaveTypeConfig.adminId, adminId)];
    if (search) {
      conditions.push(
        or(
          ilike(leaveTypeConfig.name, `%${search}%`),
          ilike(leaveTypeConfig.code, `%${search}%`),
        )!,
      );
    }

    return db
      .select()
      .from(leaveTypeConfig)
      .where(and(...conditions))
      .orderBy(leaveTypeConfig.name);
  }

  async getLeaveTypeById(id: number) {
    const [result] = await db
      .select()
      .from(leaveTypeConfig)
      .where(eq(leaveTypeConfig.id, id))
      .limit(1);
    return result ?? null;
  }

  async createLeaveType(data: typeof leaveTypeConfig.$inferInsert) {
    const [result] = await db.insert(leaveTypeConfig).values(data).returning();
    return result;
  }

  async updateLeaveType(
    id: number,
    data: Partial<typeof leaveTypeConfig.$inferInsert>,
  ) {
    const [result] = await db
      .update(leaveTypeConfig)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(leaveTypeConfig.id, id))
      .returning();
    return result;
  }

  async deleteLeaveType(id: number) {
    const [result] = await db
      .delete(leaveTypeConfig)
      .where(eq(leaveTypeConfig.id, id))
      .returning();
    return result;
  }

  async getPolicies(adminId: number, search?: string) {
    const conditions = [eq(leavePolicy.adminId, adminId)];
    if (search) {
      conditions.push(ilike(leavePolicy.name, `%${search}%`));
    }

    return db
      .select()
      .from(leavePolicy)
      .where(and(...conditions))
      .orderBy(desc(leavePolicy.isDefault), leavePolicy.name);
  }

  async getPolicyById(id: number) {
    const [result] = await db
      .select()
      .from(leavePolicy)
      .where(eq(leavePolicy.id, id))
      .limit(1);
    return result ?? null;
  }

  async updatePoliciesDefaultByAdmin(adminId: number, isDefault: boolean) {
    return db
      .update(leavePolicy)
      .set({ isDefault, updatedAt: new Date() })
      .where(eq(leavePolicy.adminId, adminId));
  }

  async createPolicy(data: typeof leavePolicy.$inferInsert) {
    const [result] = await db.insert(leavePolicy).values(data).returning();
    return result;
  }

  async updatePolicy(id: number, data: Partial<typeof leavePolicy.$inferInsert>) {
    const [result] = await db
      .update(leavePolicy)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(leavePolicy.id, id))
      .returning();
    return result;
  }

  async deletePolicy(id: number) {
    const [result] = await db
      .delete(leavePolicy)
      .where(eq(leavePolicy.id, id))
      .returning();
    return result;
  }

  async getAssignments(adminId: number, filters: { search?: string; departmentId?: number }) {
    const conditions = [eq(leavePolicyAssignment.adminId, adminId)];
    if (filters.departmentId) {
      conditions.push(eq(employment.departmentId, filters.departmentId));
    }
    if (filters.search) {
      conditions.push(
        or(
          ilike(users.name, `%${filters.search}%`),
          ilike(users.email, `%${filters.search}%`),
          ilike(leavePolicy.name, `%${filters.search}%`),
        )!,
      );
    }

    return db
      .select({
        id: leavePolicyAssignment.id,
        empId: leavePolicyAssignment.empId,
        employee: users.name,
        empEmail: users.email,
        departmentId: department.id,
        department: department.departmentName,
        policyId: leavePolicy.id,
        policy: leavePolicy.name,
        effectiveDate: leavePolicyAssignment.effectiveDate,
        assignedBy: leavePolicyAssignment.assignedBy,
        assignedByName: users.name,
        isActive: leavePolicyAssignment.isActive,
        createdAt: leavePolicyAssignment.createdAt,
      })
      .from(leavePolicyAssignment)
      .leftJoin(users, eq(leavePolicyAssignment.empId, users.id))
      .leftJoin(employment, eq(leavePolicyAssignment.empId, employment.employeeId))
      .leftJoin(department, eq(employment.departmentId, department.id))
      .leftJoin(leavePolicy, eq(leavePolicyAssignment.policyId, leavePolicy.id))
      .where(and(...conditions))
      .orderBy(desc(leavePolicyAssignment.createdAt));
  }

  async getAssignmentById(id: number) {
    const [result] = await db
      .select()
      .from(leavePolicyAssignment)
      .where(eq(leavePolicyAssignment.id, id))
      .limit(1);
    return result ?? null;
  }

  async getActiveAssignmentForEmployee(adminId: number, empId: number) {
    const [result] = await db
      .select()
      .from(leavePolicyAssignment)
      .where(
        and(
          eq(leavePolicyAssignment.adminId, adminId),
          eq(leavePolicyAssignment.empId, empId),
          eq(leavePolicyAssignment.isActive, true),
        ),
      )
      .orderBy(desc(leavePolicyAssignment.createdAt))
      .limit(1);
    return result ?? null;
  }

  async deactivateAssignmentsForEmployee(adminId: number, empId: number) {
    return db
      .update(leavePolicyAssignment)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(leavePolicyAssignment.adminId, adminId),
          eq(leavePolicyAssignment.empId, empId),
          eq(leavePolicyAssignment.isActive, true),
        ),
      );
  }

  async createAssignment(data: typeof leavePolicyAssignment.$inferInsert) {
    const [result] = await db
      .insert(leavePolicyAssignment)
      .values(data)
      .returning();
    return result;
  }

  async updateAssignment(
    id: number,
    data: Partial<typeof leavePolicyAssignment.$inferInsert>,
  ) {
    const [result] = await db
      .update(leavePolicyAssignment)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(leavePolicyAssignment.id, id))
      .returning();
    return result;
  }

  async deleteAssignment(id: number) {
    const [result] = await db
      .delete(leavePolicyAssignment)
      .where(eq(leavePolicyAssignment.id, id))
      .returning();
    return result;
  }

  async getCompOffRequests(
    adminId: number,
    filters: { status?: string; search?: string },
  ) {
    const conditions = [eq(compensatoryLeaveRequest.adminId, adminId)];
    if (filters.status) {
      conditions.push(
        eq(
          compensatoryLeaveRequest.status,
          filters.status as typeof compensatoryLeaveRequest.$inferSelect.status,
        ),
      );
    }
    if (filters.search) {
      conditions.push(
        or(
          ilike(users.name, `%${filters.search}%`),
          ilike(users.email, `%${filters.search}%`),
        )!,
      );
    }

    return db
      .select({
        id: compensatoryLeaveRequest.id,
        empId: compensatoryLeaveRequest.empId,
        empName: users.name,
        empEmail: users.email,
        workDate: compensatoryLeaveRequest.workDate,
        creditedDays: compensatoryLeaveRequest.creditedDays,
        reason: compensatoryLeaveRequest.reason,
        status: compensatoryLeaveRequest.status,
        reviewedBy: compensatoryLeaveRequest.reviewedBy,
        reviewedAt: compensatoryLeaveRequest.reviewedAt,
        rejectionReason: compensatoryLeaveRequest.rejectionReason,
        createdAt: compensatoryLeaveRequest.createdAt,
      })
      .from(compensatoryLeaveRequest)
      .leftJoin(users, eq(compensatoryLeaveRequest.empId, users.id))
      .where(and(...conditions))
      .orderBy(desc(compensatoryLeaveRequest.createdAt));
  }

  async getCompOffRequestById(id: number) {
    const [result] = await db
      .select()
      .from(compensatoryLeaveRequest)
      .where(eq(compensatoryLeaveRequest.id, id))
      .limit(1);
    return result ?? null;
  }

  async createCompOffRequest(data: typeof compensatoryLeaveRequest.$inferInsert) {
    const [result] = await db
      .insert(compensatoryLeaveRequest)
      .values(data)
      .returning();
    return result;
  }

  async updateCompOffRequest(
    id: number,
    data: Partial<typeof compensatoryLeaveRequest.$inferInsert>,
  ) {
    const [result] = await db
      .update(compensatoryLeaveRequest)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(compensatoryLeaveRequest.id, id))
      .returning();
    return result;
  }

  async getEncashmentRequests(
    adminId: number,
    filters: { status?: string; search?: string; empId?: number },
  ) {
    const conditions = [eq(leaveEncashmentRequest.adminId, adminId)];
    if (filters.status) {
      conditions.push(
        eq(
          leaveEncashmentRequest.status,
          filters.status as typeof leaveEncashmentRequest.$inferSelect.status,
        ),
      );
    }
    if (filters.search) {
      conditions.push(
        or(
          ilike(users.name, `%${filters.search}%`),
          ilike(users.email, `%${filters.search}%`),
        )!,
      );
    }
    if (filters.empId) {
      conditions.push(eq(leaveEncashmentRequest.empId, filters.empId));
    }

    return db
      .select({
        id: leaveEncashmentRequest.id,
        empId: leaveEncashmentRequest.empId,
        empName: users.name,
        empEmail: users.email,
        leaveTypeId: leaveEncashmentRequest.leaveTypeId,
        leaveTypeName: leaveEncashmentRequest.leaveTypeName,
        daysAvailable: leaveEncashmentRequest.daysAvailable,
        daysRequested: leaveEncashmentRequest.daysRequested,
        dailyRate: leaveEncashmentRequest.dailyRate,
        amount: leaveEncashmentRequest.amount,
        status: leaveEncashmentRequest.status,
        reviewedBy: leaveEncashmentRequest.reviewedBy,
        reviewedAt: leaveEncashmentRequest.reviewedAt,
        rejectionReason: leaveEncashmentRequest.rejectionReason,
        createdAt: leaveEncashmentRequest.createdAt,
      })
      .from(leaveEncashmentRequest)
      .leftJoin(users, eq(leaveEncashmentRequest.empId, users.id))
      .where(and(...conditions))
      .orderBy(desc(leaveEncashmentRequest.createdAt));
  }

  async getEncashmentRequestById(id: number) {
    const [result] = await db
      .select()
      .from(leaveEncashmentRequest)
      .where(eq(leaveEncashmentRequest.id, id))
      .limit(1);
    return result ?? null;
  }

  async createEncashmentRequest(data: typeof leaveEncashmentRequest.$inferInsert) {
    const [result] = await db
      .insert(leaveEncashmentRequest)
      .values(data)
      .returning();
    return result;
  }

  async createEncashmentRequests(data: Array<typeof leaveEncashmentRequest.$inferInsert>) {
    return db.insert(leaveEncashmentRequest).values(data).returning();
  }

  async getEmployeeOwner(empId: number) {
    const [result] = await db
      .select({ adminId: Employee.adminId, organizationId: users.organizationId })
      .from(Employee)
      .innerJoin(users, eq(users.id, Employee.userId))
      .where(and(eq(Employee.userId, empId), eq(users.isDeleted, false), eq(users.active, true)))
      .limit(1);
    return result ?? null;
  }

  async getEncashableLeaveTypes(adminId: number) {
    return db
      .select()
      .from(leaveTypeConfig)
      .where(
        and(
          eq(leaveTypeConfig.adminId, adminId),
          eq(leaveTypeConfig.encashable, true),
          eq(leaveTypeConfig.isPaid, true),
          eq(leaveTypeConfig.isActive, true),
        ),
      )
      .orderBy(leaveTypeConfig.name);
  }

  async findEncashableLeaveType(adminId: number, leaveTypeId?: number | null, name?: string | null) {
    const conditions = [
      eq(leaveTypeConfig.adminId, adminId),
      eq(leaveTypeConfig.encashable, true),
      eq(leaveTypeConfig.isPaid, true),
      eq(leaveTypeConfig.isActive, true),
    ];
    if (leaveTypeId) conditions.push(eq(leaveTypeConfig.id, leaveTypeId));
    else if (name) {
      conditions.push(or(ilike(leaveTypeConfig.name, name), ilike(leaveTypeConfig.code, name))!);
    } else return null;

    const [result] = await db.select().from(leaveTypeConfig).where(and(...conditions)).limit(1);
    return result ?? null;
  }

  async getPendingEncashmentDays(adminId: number, empId: number, leaveTypeName: string) {
    const [result] = await db
      .select({ days: sql<number>`coalesce(sum(${leaveEncashmentRequest.daysRequested}), 0)` })
      .from(leaveEncashmentRequest)
      .where(
        and(
          eq(leaveEncashmentRequest.adminId, adminId),
          eq(leaveEncashmentRequest.empId, empId),
          eq(leaveEncashmentRequest.leaveTypeName, leaveTypeName),
          eq(leaveEncashmentRequest.status, "submitted"),
        ),
      );
    return Number(result?.days ?? 0);
  }

  async getActiveSalaryAssignment(empId: number) {
    const today = new Date().toISOString().slice(0, 10);
    const [result] = await db
      .select({ baseSalary: salaryStructureAssignment.baseSalary })
      .from(salaryStructureAssignment)
      .where(
        and(
          eq(salaryStructureAssignment.empId, empId),
          eq(salaryStructureAssignment.isActive, true),
          eq(salaryStructureAssignment.isDeleted, false),
          lte(salaryStructureAssignment.fromDate, today),
          or(
            sql`${salaryStructureAssignment.toDate} is null`,
            gte(salaryStructureAssignment.toDate, today),
          )!,
        ),
      )
      .orderBy(desc(salaryStructureAssignment.fromDate))
      .limit(1);
    return result ?? null;
  }

  async updateEncashmentRequest(
    id: number,
    data: Partial<typeof leaveEncashmentRequest.$inferInsert>,
  ) {
    const [result] = await db
      .update(leaveEncashmentRequest)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(leaveEncashmentRequest.id, id))
      .returning();
    return result;
  }

  async countAssignmentsByPolicyIds(policyIds: number[]) {
    if (!policyIds.length) {
      return [];
    }

    return db
      .select()
      .from(leavePolicyAssignment)
      .where(inArray(leavePolicyAssignment.policyId, policyIds));
  }
}

export default LeaveManagementRepository;
