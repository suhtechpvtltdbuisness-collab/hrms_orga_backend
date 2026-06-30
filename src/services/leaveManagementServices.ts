import { db } from "../db/connection.js";
import { leave, users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import LeaveManagementRepository from "../repository/leaveManagement.repo.js";
import LeaveRepository from "../repository/leave.repo.js";

type CurrentUser = typeof users.$inferSelect;

class LeaveManagementServices {
  private repo: LeaveManagementRepository;
  private leaveRepo: LeaveRepository;

  constructor() {
    this.repo = new LeaveManagementRepository();
    this.leaveRepo = new LeaveRepository();
  }

  private assertAdmin(user: CurrentUser) {
    if (user.roleId !== 0 && user.roleId !== 1) {
      throw new Error("Admin access is required");
    }
  }

  private getOrgId(user: CurrentUser) {
    if (!user.organizationId) {
      throw new Error("User does not belong to any organization");
    }
    return user.organizationId;
  }

  private getAdminScopeId(user: CurrentUser) {
    return user.id;
  }

  private normalizeText(value?: string | null) {
    if (!value) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  private ensureDateRange(fromDate?: string, toDate?: string) {
    if (!fromDate || !toDate) {
      throw new Error("Both fromDate and toDate are required");
    }

    if (new Date(fromDate) > new Date(toDate)) {
      throw new Error("fromDate cannot be after toDate");
    }
  }

  private ensurePositiveInteger(value: number, field: string, allowZero = true) {
    if (!Number.isInteger(value) || value < 0 || (!allowZero && value === 0)) {
      throw new Error(`${field} must be ${allowZero ? "a non-negative" : "a positive"} integer`);
    }
  }

  private slugifyLeaveTypeCode(name: string) {
    return name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 50);
  }

  private formatHolidayListName(year: number) {
    return `Holiday List ${year}`;
  }

  private getRemainingPaidDays(balance: typeof leave.$inferSelect | null) {
    if (!balance) {
      return 0;
    }
    return (balance.paidLeave ?? 0) - (balance.paidLeaveTaken ?? 0);
  }

  private async validateEmployeeBelongsToOrg(orgId: number, empId: number, adminId?: number) {
    const employee = await this.repo.getUserById(empId);
    if (!employee || employee.organizationId !== orgId) {
      throw new Error("Employee not found in this organization");
    }
    if (adminId != null) {
      const employees = await this.repo.getEmployees(adminId);
      if (!employees.some((item) => item.empId === empId)) {
        throw new Error("Employee does not belong to this admin");
      }
    }
    return employee;
  }

  async getOptions(currentUser: CurrentUser) {
    this.assertAdmin(currentUser);
    const orgId = this.getOrgId(currentUser);

    const adminId = this.getAdminScopeId(currentUser);
    const [employees, departments, policies, leaveTypes, holidayLists] =
      await Promise.all([
        this.repo.getEmployees(adminId),
        this.repo.getDepartments(adminId),
        this.repo.getPolicies(adminId),
        this.repo.getLeaveTypes(adminId),
        this.repo.getHolidayCalendarOptions(adminId),
      ]);

    return {
      success: true,
      message: "Leave management options fetched successfully",
      data: {
        employees,
        departments,
        policies,
        leaveTypes,
        holidayLists,
      },
    };
  }

  async getHolidays(
    filters: { search?: string; type?: string; year?: number },
    currentUser: CurrentUser,
  ) {
    this.assertAdmin(currentUser);
    const adminId = this.getAdminScopeId(currentUser);
    const holidays = await this.repo.getHolidays(adminId, filters);

    const years = Array.from(new Set(holidays.map((item) => item.holidayYear))).sort(
      (a, b) => b - a,
    );

    return {
      success: true,
      message: "Holidays fetched successfully",
      data: {
        holidays,
        years,
      },
    };
  }

  async createHoliday(
    body: {
      name?: string;
      holidayDate?: string;
      holidayType?: string;
      description?: string;
      holidayListName?: string;
      holidayYear?: number;
    },
    currentUser: CurrentUser,
  ) {
    this.assertAdmin(currentUser);
    const adminId = this.getAdminScopeId(currentUser);
    const orgId = this.getOrgId(currentUser);

    if (!body.name?.trim() || !body.holidayDate || !body.holidayType?.trim()) {
      throw new Error("name, holidayDate, and holidayType are required");
    }

    const holidayYear =
      body.holidayYear ?? new Date(body.holidayDate).getFullYear();
    const holidayListName =
      this.normalizeText(body.holidayListName) ?? this.formatHolidayListName(holidayYear);

    const duplicate = await this.repo.findHolidayDuplicate(
      adminId,
      body.holidayDate,
      body.name.trim(),
    );
    if (duplicate) {
      throw new Error("A holiday with the same name already exists on that date");
    }

    const result = await this.repo.createHoliday({
      organizationId: orgId,
      adminId,
      holidayListName,
      holidayYear,
      name: body.name.trim(),
      holidayDate: body.holidayDate,
      holidayType: body.holidayType.trim(),
      description: this.normalizeText(body.description),
      createdBy: currentUser.id,
    });

    return {
      success: true,
      message: "Holiday created successfully",
      data: result,
    };
  }

  async updateHoliday(
    id: number,
    body: {
      name?: string;
      holidayDate?: string;
      holidayType?: string;
      description?: string;
      holidayListName?: string;
      holidayYear?: number;
    },
    currentUser: CurrentUser,
  ) {
    this.assertAdmin(currentUser);
    const adminId = this.getAdminScopeId(currentUser);
    const orgId = this.getOrgId(currentUser);
    const existing = await this.repo.getHolidayById(id);

    if (!existing || existing.adminId !== adminId) {
      throw new Error("Holiday not found");
    }

    const name = body.name?.trim() ?? existing.name;
    const holidayDate = body.holidayDate ?? existing.holidayDate;
    const holidayType = body.holidayType?.trim() ?? existing.holidayType;
    const holidayYear =
      body.holidayYear ?? new Date(holidayDate).getFullYear() ?? existing.holidayYear;
    const holidayListName =
      this.normalizeText(body.holidayListName) ??
      existing.holidayListName ??
      this.formatHolidayListName(holidayYear);

    const duplicate = await this.repo.findHolidayDuplicate(
      adminId,
      holidayDate,
      name,
      id,
    );
    if (duplicate) {
      throw new Error("A holiday with the same name already exists on that date");
    }

    const result = await this.repo.updateHoliday(id, {
      name,
      holidayDate,
      holidayType,
      description: this.normalizeText(body.description) ?? existing.description,
      holidayYear,
      holidayListName,
    });

    return {
      success: true,
      message: "Holiday updated successfully",
      data: result,
    };
  }

  async deleteHoliday(id: number, currentUser: CurrentUser) {
    this.assertAdmin(currentUser);
    const adminId = this.getAdminScopeId(currentUser);
    const existing = await this.repo.getHolidayById(id);
    if (!existing || existing.adminId !== adminId) {
      throw new Error("Holiday not found");
    }

    const result = await this.repo.deleteHoliday(id);
    return {
      success: true,
      message: "Holiday deleted successfully",
      data: result,
    };
  }

  async getPeriods(currentUser: CurrentUser) {
    this.assertAdmin(currentUser);
    const adminId = this.getAdminScopeId(currentUser);

    return {
      success: true,
      message: "Leave periods fetched successfully",
      data: await this.repo.getPeriods(adminId),
    };
  }

  async createPeriod(
    body: {
      fromDate?: string;
      toDate?: string;
      holidayListName?: string;
      holidayYear?: number;
      isActive?: boolean;
    },
    currentUser: CurrentUser,
  ) {
    this.assertAdmin(currentUser);
    const adminId = this.getAdminScopeId(currentUser);
    const orgId = this.getOrgId(currentUser);
    this.ensureDateRange(body.fromDate, body.toDate);

    const currentPeriods = await this.repo.getPeriods(adminId);
    const name = `LP-${new Date(body.fromDate as string).getFullYear()}-${String(
      currentPeriods.length + 1,
    ).padStart(2, "0")}`;

    if (body.isActive) {
      await this.repo.updatePeriodsStatusByAdmin(adminId, false);
    }

    const result = await this.repo.createPeriod({
      organizationId: orgId,
      adminId,
      name,
      fromDate: body.fromDate as string,
      toDate: body.toDate as string,
      holidayListName: this.normalizeText(body.holidayListName),
      holidayYear: body.holidayYear ?? null,
      isActive: body.isActive ?? true,
      createdBy: currentUser.id,
    });

    return {
      success: true,
      message: "Leave period created successfully",
      data: result,
    };
  }

  async updatePeriod(
    id: number,
    body: {
      fromDate?: string;
      toDate?: string;
      holidayListName?: string;
      holidayYear?: number;
      isActive?: boolean;
    },
    currentUser: CurrentUser,
  ) {
    this.assertAdmin(currentUser);
    const adminId = this.getAdminScopeId(currentUser);
    const existing = await this.repo.getPeriodById(id);
    if (!existing || existing.adminId !== adminId) {
      throw new Error("Leave period not found");
    }

    const fromDate = body.fromDate ?? existing.fromDate;
    const toDate = body.toDate ?? existing.toDate;
    this.ensureDateRange(fromDate, toDate);

    if (body.isActive) {
      await this.repo.updatePeriodsStatusByAdmin(adminId, false);
    }

    const result = await this.repo.updatePeriod(id, {
      fromDate,
      toDate,
      holidayListName:
        this.normalizeText(body.holidayListName) ?? existing.holidayListName,
      holidayYear: body.holidayYear ?? existing.holidayYear,
      isActive: body.isActive ?? existing.isActive,
    });

    return {
      success: true,
      message: "Leave period updated successfully",
      data: result,
    };
  }

  async deletePeriod(id: number, currentUser: CurrentUser) {
    this.assertAdmin(currentUser);
    const adminId = this.getAdminScopeId(currentUser);
    const existing = await this.repo.getPeriodById(id);
    if (!existing || existing.adminId !== adminId) {
      throw new Error("Leave period not found");
    }

    const result = await this.repo.deletePeriod(id);
    return {
      success: true,
      message: "Leave period deleted successfully",
      data: result,
    };
  }

  async getBlocks(
    filters: { search?: string },
    currentUser: CurrentUser,
  ) {
    this.assertAdmin(currentUser);
    const adminId = this.getAdminScopeId(currentUser);
    const [blocks, departments] = await Promise.all([
      this.repo.getBlocks(adminId, filters.search),
      this.repo.getDepartments(adminId),
    ]);

    const departmentMap = new Map(departments.map((item) => [item.id, item.name]));
    const enriched = blocks.map((block) => {
      const departmentIds = (block.departmentIds ?? []) as number[];
      return {
        ...block,
        departments:
          departmentIds.length === 0
            ? ["All"]
            : departmentIds.map((id) => departmentMap.get(id) ?? `Department #${id}`),
      };
    });

    return {
      success: true,
      message: "Leave blocks fetched successfully",
      data: enriched,
    };
  }

  async createBlock(
    body: {
      name?: string;
      fromDate?: string;
      toDate?: string;
      departmentIds?: number[];
      reason?: string;
    },
    currentUser: CurrentUser,
  ) {
    this.assertAdmin(currentUser);
    const adminId = this.getAdminScopeId(currentUser);
    const orgId = this.getOrgId(currentUser);
    if (!body.name?.trim()) {
      throw new Error("Block name is required");
    }
    this.ensureDateRange(body.fromDate, body.toDate);

    const result = await this.repo.createBlock({
      organizationId: orgId,
      adminId,
      name: body.name.trim(),
      fromDate: body.fromDate as string,
      toDate: body.toDate as string,
      departmentIds: body.departmentIds ?? [],
      reason: this.normalizeText(body.reason),
      createdBy: currentUser.id,
    });

    return {
      success: true,
      message: "Leave block created successfully",
      data: result,
    };
  }

  async updateBlock(
    id: number,
    body: {
      name?: string;
      fromDate?: string;
      toDate?: string;
      departmentIds?: number[];
      reason?: string;
    },
    currentUser: CurrentUser,
  ) {
    this.assertAdmin(currentUser);
    const adminId = this.getAdminScopeId(currentUser);
    const existing = await this.repo.getBlockById(id);
    if (!existing || existing.adminId !== adminId) {
      throw new Error("Leave block not found");
    }

    const fromDate = body.fromDate ?? existing.fromDate;
    const toDate = body.toDate ?? existing.toDate;
    this.ensureDateRange(fromDate, toDate);

    const result = await this.repo.updateBlock(id, {
      name: body.name?.trim() ?? existing.name,
      fromDate,
      toDate,
      departmentIds: body.departmentIds ?? (existing.departmentIds as number[]),
      reason: this.normalizeText(body.reason) ?? existing.reason,
    });

    return {
      success: true,
      message: "Leave block updated successfully",
      data: result,
    };
  }

  async deleteBlock(id: number, currentUser: CurrentUser) {
    this.assertAdmin(currentUser);
    const adminId = this.getAdminScopeId(currentUser);
    const existing = await this.repo.getBlockById(id);
    if (!existing || existing.adminId !== adminId) {
      throw new Error("Leave block not found");
    }

    const result = await this.repo.deleteBlock(id);
    return {
      success: true,
      message: "Leave block deleted successfully",
      data: result,
    };
  }

  async getLeaveTypes(
    filters: { search?: string },
    currentUser: CurrentUser,
  ) {
    this.assertAdmin(currentUser);
    const adminId = this.getAdminScopeId(currentUser);
    return {
      success: true,
      message: "Leave types fetched successfully",
      data: await this.repo.getLeaveTypes(adminId, filters.search),
    };
  }

  async createLeaveType(
    body: {
      name?: string;
      code?: string;
      maxDays?: number;
      carryForward?: boolean;
      encashable?: boolean;
      isPaid?: boolean;
      allowHalfDay?: boolean;
      description?: string;
    },
    currentUser: CurrentUser,
  ) {
    this.assertAdmin(currentUser);
    const adminId = this.getAdminScopeId(currentUser);
    const orgId = this.getOrgId(currentUser);
    if (!body.name?.trim()) {
      throw new Error("Leave type name is required");
    }

    const maxDays = Number(body.maxDays ?? 0);
    this.ensurePositiveInteger(maxDays, "maxDays");

    const name = body.name.trim();
    const code = (body.code?.trim() || this.slugifyLeaveTypeCode(name)).toUpperCase();

    const result = await this.repo.createLeaveType({
      organizationId: orgId,
      adminId,
      name,
      code,
      maxDays,
      carryForward: body.carryForward ?? false,
      encashable: body.encashable ?? false,
      isPaid: body.isPaid ?? true,
      allowHalfDay: body.allowHalfDay ?? true,
      description: this.normalizeText(body.description),
      createdBy: currentUser.id,
    });

    return {
      success: true,
      message: "Leave type created successfully",
      data: result,
    };
  }

  async updateLeaveType(
    id: number,
    body: {
      name?: string;
      code?: string;
      maxDays?: number;
      carryForward?: boolean;
      encashable?: boolean;
      isPaid?: boolean;
      allowHalfDay?: boolean;
      description?: string;
      isActive?: boolean;
    },
    currentUser: CurrentUser,
  ) {
    this.assertAdmin(currentUser);
    const adminId = this.getAdminScopeId(currentUser);
    const existing = await this.repo.getLeaveTypeById(id);
    if (!existing || existing.adminId !== adminId) {
      throw new Error("Leave type not found");
    }

    const maxDays = Number(body.maxDays ?? existing.maxDays);
    this.ensurePositiveInteger(maxDays, "maxDays");

    const name = body.name?.trim() ?? existing.name;
    const code =
      (body.code?.trim() || existing.code || this.slugifyLeaveTypeCode(name)).toUpperCase();

    const result = await this.repo.updateLeaveType(id, {
      name,
      code,
      maxDays,
      carryForward: body.carryForward ?? existing.carryForward,
      encashable: body.encashable ?? existing.encashable,
      isPaid: body.isPaid ?? existing.isPaid,
      allowHalfDay: body.allowHalfDay ?? existing.allowHalfDay,
      description: this.normalizeText(body.description) ?? existing.description,
      isActive: body.isActive ?? existing.isActive,
    });

    return {
      success: true,
      message: "Leave type updated successfully",
      data: result,
    };
  }

  async deleteLeaveType(id: number, currentUser: CurrentUser) {
    this.assertAdmin(currentUser);
    const adminId = this.getAdminScopeId(currentUser);
    const existing = await this.repo.getLeaveTypeById(id);
    if (!existing || existing.adminId !== adminId) {
      throw new Error("Leave type not found");
    }

    const policies = await this.repo.getPolicies(adminId);
    const inUse = policies.some((policy) =>
      ((policy.leaveTypeIds ?? []) as number[]).includes(id),
    );

    if (inUse) {
      throw new Error("This leave type is used in a policy and cannot be deleted");
    }

    const result = await this.repo.deleteLeaveType(id);
    return {
      success: true,
      message: "Leave type deleted successfully",
      data: result,
    };
  }

  async getPolicies(
    filters: { search?: string },
    currentUser: CurrentUser,
  ) {
    this.assertAdmin(currentUser);
    const adminId = this.getAdminScopeId(currentUser);
    const [policies, leaveTypes] = await Promise.all([
      this.repo.getPolicies(adminId, filters.search),
      this.repo.getLeaveTypes(adminId),
    ]);

    const leaveTypeMap = new Map(leaveTypes.map((item) => [item.id, item]));
    const enriched = policies.map((policy) => ({
      ...policy,
      leaveTypes: ((policy.leaveTypeIds ?? []) as number[])
        .map((id) => leaveTypeMap.get(id))
        .filter(Boolean),
    }));

    return {
      success: true,
      message: "Leave policies fetched successfully",
      data: enriched,
    };
  }

  async createPolicy(
    body: {
      name?: string;
      description?: string;
      leaveTypeIds?: number[];
      applicableTo?: string;
      isDefault?: boolean;
    },
    currentUser: CurrentUser,
  ) {
    this.assertAdmin(currentUser);
    const adminId = this.getAdminScopeId(currentUser);
    const orgId = this.getOrgId(currentUser);
    if (!body.name?.trim()) {
      throw new Error("Policy name is required");
    }

    const leaveTypeIds = Array.from(new Set(body.leaveTypeIds ?? []));
    if (!leaveTypeIds.length) {
      throw new Error("At least one leave type is required");
    }

    if (body.isDefault) {
      await this.repo.updatePoliciesDefaultByAdmin(adminId, false);
    }

    const result = await this.repo.createPolicy({
      organizationId: orgId,
      adminId,
      name: body.name.trim(),
      description: this.normalizeText(body.description),
      applicableTo: this.normalizeText(body.applicableTo),
      isDefault: body.isDefault ?? false,
      leaveTypeIds,
      createdBy: currentUser.id,
    });

    return {
      success: true,
      message: "Leave policy created successfully",
      data: result,
    };
  }

  async updatePolicy(
    id: number,
    body: {
      name?: string;
      description?: string;
      leaveTypeIds?: number[];
      applicableTo?: string;
      isDefault?: boolean;
    },
    currentUser: CurrentUser,
  ) {
    this.assertAdmin(currentUser);
    const adminId = this.getAdminScopeId(currentUser);
    const existing = await this.repo.getPolicyById(id);
    if (!existing || existing.adminId !== adminId) {
      throw new Error("Leave policy not found");
    }

    const leaveTypeIds = Array.from(
      new Set(body.leaveTypeIds ?? ((existing.leaveTypeIds ?? []) as number[])),
    );
    if (!leaveTypeIds.length) {
      throw new Error("At least one leave type is required");
    }

    if (body.isDefault) {
      await this.repo.updatePoliciesDefaultByAdmin(adminId, false);
    }

    const result = await this.repo.updatePolicy(id, {
      name: body.name?.trim() ?? existing.name,
      description: this.normalizeText(body.description) ?? existing.description,
      applicableTo: this.normalizeText(body.applicableTo) ?? existing.applicableTo,
      leaveTypeIds,
      isDefault: body.isDefault ?? existing.isDefault,
    });

    return {
      success: true,
      message: "Leave policy updated successfully",
      data: result,
    };
  }

  async deletePolicy(id: number, currentUser: CurrentUser) {
    this.assertAdmin(currentUser);
    const adminId = this.getAdminScopeId(currentUser);
    const existing = await this.repo.getPolicyById(id);
    if (!existing || existing.adminId !== adminId) {
      throw new Error("Leave policy not found");
    }

    const assignments = await this.repo.countAssignmentsByPolicyIds([id]);
    if (assignments.length) {
      throw new Error("This policy is assigned to employees and cannot be deleted");
    }

    const result = await this.repo.deletePolicy(id);
    return {
      success: true,
      message: "Leave policy deleted successfully",
      data: result,
    };
  }

  async getAssignments(
    filters: { search?: string; departmentId?: number },
    currentUser: CurrentUser,
  ) {
    this.assertAdmin(currentUser);
    const adminId = this.getAdminScopeId(currentUser);
    return {
      success: true,
      message: "Leave policy assignments fetched successfully",
      data: await this.repo.getAssignments(adminId, filters),
    };
  }

  async createAssignment(
    body: { empId?: number; policyId?: number; effectiveDate?: string },
    currentUser: CurrentUser,
  ) {
    this.assertAdmin(currentUser);
    const adminId = this.getAdminScopeId(currentUser);
    const orgId = this.getOrgId(currentUser);
    if (!body.empId || !body.policyId || !body.effectiveDate) {
      throw new Error("empId, policyId, and effectiveDate are required");
    }

    await this.validateEmployeeBelongsToOrg(orgId, body.empId, adminId);
    const policy = await this.repo.getPolicyById(body.policyId);
    if (!policy || policy.adminId !== adminId) {
      throw new Error("Leave policy not found");
    }

    await this.repo.deactivateAssignmentsForEmployee(adminId, body.empId);
    const result = await this.repo.createAssignment({
      adminId,
      organizationId: orgId,
      empId: body.empId,
      policyId: body.policyId,
      effectiveDate: body.effectiveDate,
      assignedBy: currentUser.id,
      isActive: true,
    });

    return {
      success: true,
      message: "Leave policy assigned successfully",
      data: result,
    };
  }

  async updateAssignment(
    id: number,
    body: { empId?: number; policyId?: number; effectiveDate?: string; isActive?: boolean },
    currentUser: CurrentUser,
  ) {
    this.assertAdmin(currentUser);
    const adminId = this.getAdminScopeId(currentUser);
    const orgId = this.getOrgId(currentUser);
    const existing = await this.repo.getAssignmentById(id);
    if (!existing || existing.adminId !== adminId) {
      throw new Error("Leave assignment not found");
    }

    const empId = body.empId ?? existing.empId;
    const policyId = body.policyId ?? existing.policyId;
    const effectiveDate = body.effectiveDate ?? existing.effectiveDate;
    await this.validateEmployeeBelongsToOrg(orgId, empId, adminId);

    const policy = await this.repo.getPolicyById(policyId);
    if (!policy || policy.adminId !== adminId) {
      throw new Error("Leave policy not found");
    }

    if (body.isActive ?? existing.isActive) {
      await this.repo.deactivateAssignmentsForEmployee(adminId, empId);
    }

    const result = await this.repo.updateAssignment(id, {
      empId,
      policyId,
      effectiveDate,
      isActive: body.isActive ?? existing.isActive,
      assignedBy: currentUser.id,
    });

    return {
      success: true,
      message: "Leave assignment updated successfully",
      data: result,
    };
  }

  async deleteAssignment(id: number, currentUser: CurrentUser) {
    this.assertAdmin(currentUser);
    const adminId = this.getAdminScopeId(currentUser);
    const existing = await this.repo.getAssignmentById(id);
    if (!existing || existing.adminId !== adminId) {
      throw new Error("Leave assignment not found");
    }

    const result = await this.repo.deleteAssignment(id);
    return {
      success: true,
      message: "Leave assignment deleted successfully",
      data: result,
    };
  }

  async getCompOffRequests(
    filters: { status?: string; search?: string },
    currentUser: CurrentUser,
  ) {
    this.assertAdmin(currentUser);
    const adminId = this.getAdminScopeId(currentUser);
    return {
      success: true,
      message: "Compensatory leave requests fetched successfully",
      data: await this.repo.getCompOffRequests(adminId, filters),
    };
  }

  async createCompOffRequest(
    body: { empId?: number; workDate?: string; creditedDays?: number; reason?: string },
    currentUser: CurrentUser,
  ) {
    this.assertAdmin(currentUser);
    const adminId = this.getAdminScopeId(currentUser);
    const orgId = this.getOrgId(currentUser);
    if (!body.empId || !body.workDate) {
      throw new Error("empId and workDate are required");
    }

    await this.validateEmployeeBelongsToOrg(orgId, body.empId, adminId);
    const creditedDays = Number(body.creditedDays ?? 1);
    this.ensurePositiveInteger(creditedDays, "creditedDays", false);

    const result = await this.repo.createCompOffRequest({
      organizationId: orgId,
      adminId,
      empId: body.empId,
      workDate: body.workDate,
      creditedDays,
      reason: this.normalizeText(body.reason),
    });

    return {
      success: true,
      message: "Compensatory leave request created successfully",
      data: result,
    };
  }

  async approveCompOffRequest(id: number, currentUser: CurrentUser) {
    this.assertAdmin(currentUser);
    const adminId = this.getAdminScopeId(currentUser);
    const existing = await this.repo.getCompOffRequestById(id);
    if (!existing || existing.adminId !== adminId) {
      throw new Error("Compensatory leave request not found");
    }
    if (existing.status !== "submitted") {
      throw new Error("Only submitted requests can be approved");
    }

    await db.transaction(async () => {
      const balance = await this.leaveRepo.getBalanceByEmpUserId(existing.empId);
      if (balance) {
        await this.leaveRepo.updateLeave(balance.id, {
          paidLeave: (balance.paidLeave ?? 0) + existing.creditedDays,
          total: (balance.total ?? 0) + existing.creditedDays,
        } as typeof leave.$inferInsert);
      } else {
        await this.leaveRepo.createLeave({
          empId: existing.empId,
          sickLeave: 0,
          casualLeave: 0,
          paidLeave: existing.creditedDays,
          sickLeaveTaken: 0,
          casualLeaveTaken: 0,
          paidLeaveTaken: 0,
          total: existing.creditedDays,
          taken: 0,
          createdBy: currentUser.id,
        });
      }

      await this.repo.updateCompOffRequest(id, {
        status: "approved",
        reviewedBy: currentUser.id,
        reviewedAt: new Date(),
        rejectionReason: null,
      });
    });

    return {
      success: true,
      message: "Compensatory leave request approved successfully",
      data: await this.repo.getCompOffRequestById(id),
    };
  }

  async rejectCompOffRequest(
    id: number,
    body: { rejectionReason?: string },
    currentUser: CurrentUser,
  ) {
    this.assertAdmin(currentUser);
    const adminId = this.getAdminScopeId(currentUser);
    const existing = await this.repo.getCompOffRequestById(id);
    if (!existing || existing.adminId !== adminId) {
      throw new Error("Compensatory leave request not found");
    }
    if (existing.status !== "submitted") {
      throw new Error("Only submitted requests can be rejected");
    }

    const result = await this.repo.updateCompOffRequest(id, {
      status: "rejected",
      reviewedBy: currentUser.id,
      reviewedAt: new Date(),
      rejectionReason: this.normalizeText(body.rejectionReason),
    });

    return {
      success: true,
      message: "Compensatory leave request rejected successfully",
      data: result,
    };
  }

  async getEncashmentRequests(
    filters: { status?: string; search?: string },
    currentUser: CurrentUser,
  ) {
    this.assertAdmin(currentUser);
    const adminId = this.getAdminScopeId(currentUser);
    return {
      success: true,
      message: "Leave encashment requests fetched successfully",
      data: await this.repo.getEncashmentRequests(adminId, filters),
    };
  }

  async createEncashmentRequest(
    body: {
      empId?: number;
      leaveTypeId?: number | null;
      leaveTypeName?: string;
      daysRequested?: number;
      dailyRate?: number;
    },
    currentUser: CurrentUser,
  ) {
    this.assertAdmin(currentUser);
    const adminId = this.getAdminScopeId(currentUser);
    const orgId = this.getOrgId(currentUser);
    if (!body.empId || !body.leaveTypeName || body.daysRequested == null || body.dailyRate == null) {
      throw new Error("empId, leaveTypeName, daysRequested, and dailyRate are required");
    }

    await this.validateEmployeeBelongsToOrg(orgId, body.empId, adminId);

    const daysRequested = Number(body.daysRequested);
    const dailyRate = Number(body.dailyRate);
    this.ensurePositiveInteger(daysRequested, "daysRequested", false);
    if (Number.isNaN(dailyRate) || dailyRate <= 0) {
      throw new Error("dailyRate must be greater than 0");
    }

    const balance = await this.leaveRepo.getBalanceByEmpUserId(body.empId);
    const daysAvailable = this.getRemainingPaidDays(balance);
    if (daysRequested > daysAvailable) {
      throw new Error(`Requested encashment exceeds available balance (${daysAvailable})`);
    }

    const amount = Number((daysRequested * dailyRate).toFixed(2));
    const result = await this.repo.createEncashmentRequest({
      organizationId: orgId,
      adminId,
      empId: body.empId,
      leaveTypeId: body.leaveTypeId ?? null,
      leaveTypeName: body.leaveTypeName.trim(),
      daysAvailable,
      daysRequested,
      dailyRate: String(dailyRate),
      amount: String(amount),
    });

    return {
      success: true,
      message: "Leave encashment request created successfully",
      data: result,
    };
  }

  async approveEncashmentRequest(id: number, currentUser: CurrentUser) {
    this.assertAdmin(currentUser);
    const adminId = this.getAdminScopeId(currentUser);
    const existing = await this.repo.getEncashmentRequestById(id);
    if (!existing || existing.adminId !== adminId) {
      throw new Error("Leave encashment request not found");
    }
    if (existing.status !== "submitted") {
      throw new Error("Only submitted requests can be approved");
    }

    const balance = await this.leaveRepo.getBalanceByEmpUserId(existing.empId);
    if (!balance) {
      throw new Error("Employee does not have a leave balance record");
    }

    const remainingPaid = this.getRemainingPaidDays(balance);
    if (existing.daysRequested > remainingPaid) {
      throw new Error(`Encashment exceeds remaining paid leave (${remainingPaid})`);
    }

    await db.transaction(async () => {
      await this.leaveRepo.updateLeave(balance.id, {
        paidLeave: balance.paidLeave - existing.daysRequested,
        total: balance.total - existing.daysRequested,
      } as typeof leave.$inferInsert);

      await this.repo.updateEncashmentRequest(id, {
        status: "approved",
        reviewedBy: currentUser.id,
        reviewedAt: new Date(),
        rejectionReason: null,
      });
    });

    return {
      success: true,
      message: "Leave encashment request approved successfully",
      data: await this.repo.getEncashmentRequestById(id),
    };
  }

  async rejectEncashmentRequest(
    id: number,
    body: { rejectionReason?: string },
    currentUser: CurrentUser,
  ) {
    this.assertAdmin(currentUser);
    const adminId = this.getAdminScopeId(currentUser);
    const existing = await this.repo.getEncashmentRequestById(id);
    if (!existing || existing.adminId !== adminId) {
      throw new Error("Leave encashment request not found");
    }
    if (existing.status !== "submitted") {
      throw new Error("Only submitted requests can be rejected");
    }

    const result = await this.repo.updateEncashmentRequest(id, {
      status: "rejected",
      reviewedBy: currentUser.id,
      reviewedAt: new Date(),
      rejectionReason: this.normalizeText(body.rejectionReason),
    });

    return {
      success: true,
      message: "Leave encashment request rejected successfully",
      data: result,
    };
  }
}

export default LeaveManagementServices;
