import { users } from "../db/schema.js";
import { PayrollModuleRepository } from "../repository/payrollModule.repo.js";
import {
  calculatePayroll,
  parseMoneyToCents,
  centsToMoney,
  PayrollComponentInput,
  AdditionalSalaryInput,
  StatutoryDeductionConfig,
} from "./payrollCalculation.js";

type CurrentUser = typeof users.$inferSelect;

type StructureComponentPayload = {
  salaryComponentId?: number;
  componentId?: number;
  amount?: string | number;
  formula?: string;
  sortOrder?: number;
};

function assertAdmin(user: CurrentUser) {
  if (!user?.isAdmin && user?.roleId !== 0 && user?.roleId !== 1) {
    throw new Error("Admin privileges required");
  }
}

function normalizeCode(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

function normalizeDate(value: unknown, field: string) {
  if (!value || typeof value !== "string") {
    throw new Error(`${field} is required`);
  }
  const trimmed = value.trim();
  const ddmmyyyy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (ddmmyyyy) {
    return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error(`${field} must be YYYY-MM-DD`);
  }
  return trimmed;
}

function optionalDate(value: unknown, field: string) {
  if (!value) return null;
  return normalizeDate(value, field);
}

function toPositiveInt(value: unknown, field: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${field} must be a positive integer`);
  }
  return parsed;
}

function toNonNegativeInt(value: unknown, field: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${field} must be a non-negative integer`);
  }
  return parsed;
}

function daysInclusive(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Invalid pay period dates");
  }
  if (end < start) {
    throw new Error("periodEnd cannot be before periodStart");
  }
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

function normalizeMoney(value: unknown, field: string, required = false) {
  if ((value === undefined || value === null || value === "") && !required) {
    return undefined;
  }
  if ((value === undefined || value === null || value === "") && required) {
    throw new Error(`${field} is required`);
  }
  return centsToMoney(parseMoneyToCents(value as string | number));
}

function normalizeComponentType(value: unknown) {
  const type = String(value || "").toLowerCase();
  if (type !== "earning" && type !== "deduction") {
    throw new Error("type must be earning or deduction");
  }
  return type;
}

function normalizeAmountType(value: unknown) {
  const amountType = String(value || "fixed").toLowerCase();
  if (amountType !== "fixed" && amountType !== "formula") {
    throw new Error("amountType must be fixed or formula");
  }
  return amountType;
}

function response(message: string, data: unknown) {
  return { success: true, message, data };
}

export class PayrollModuleServices {
  private repo: PayrollModuleRepository;

  constructor() {
    this.repo = new PayrollModuleRepository();
  }

  private async normalizeEmployeeId(empId: unknown) {
    const parsed = Number(empId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error("empId is required");
    }
    const employee = await this.repo.findEmployeeIdentity(parsed);
    if (!employee) {
      throw new Error("Employee not found");
    }
    return employee.userId;
  }

  async createSalaryComponent(body: any, currentUser: CurrentUser) {
    assertAdmin(currentUser);
    if (!body.name) throw new Error("name is required");

    const type = normalizeComponentType(body.type);
    const amountType = normalizeAmountType(body.amountType);
    if (amountType === "fixed") {
      normalizeMoney(body.amount, "amount", true);
    }
    if (amountType === "formula" && !body.formula) {
      throw new Error("formula is required for formula-based components");
    }

    const created = await this.repo.createSalaryComponent({
      name: String(body.name).trim(),
      code: body.code ? normalizeCode(String(body.code)) : normalizeCode(body.name),
      type,
      amountType,
      amount: normalizeMoney(body.amount, "amount"),
      formula: body.formula || null,
      taxable: body.taxable ?? body.isTaxApplicable ?? true,
      dependsOnPaymentDays: body.dependsOnPaymentDays ?? true,
      active: body.active ?? body.status ?? true,
      description: body.description || null,
      defaultAccount: body.defaultAccount || null,
      costCenter: body.costCenter || null,
      createdBy: currentUser.id,
    });
    return response("Salary component created", created);
  }

  async getSalaryComponents() {
    return response("Salary components fetched", await this.repo.getSalaryComponents());
  }

  async updateSalaryComponent(id: number, body: any, currentUser: CurrentUser) {
    assertAdmin(currentUser);
    const existing = await this.repo.getSalaryComponentById(id);
    if (!existing) throw new Error("Salary component not found");

    const data: any = {};
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.code !== undefined) data.code = normalizeCode(String(body.code));
    if (body.type !== undefined) data.type = normalizeComponentType(body.type);
    if (body.amountType !== undefined) data.amountType = normalizeAmountType(body.amountType);
    if (body.amount !== undefined) data.amount = normalizeMoney(body.amount, "amount");
    if (body.formula !== undefined) data.formula = body.formula || null;
    if (body.taxable !== undefined || body.isTaxApplicable !== undefined) {
      data.taxable = body.taxable ?? body.isTaxApplicable;
    }
    if (body.dependsOnPaymentDays !== undefined) {
      data.dependsOnPaymentDays = body.dependsOnPaymentDays;
    }
    if (body.active !== undefined || body.status !== undefined) {
      data.active = body.active ?? body.status;
    }
    if (body.description !== undefined) data.description = body.description || null;
    if (body.defaultAccount !== undefined) data.defaultAccount = body.defaultAccount || null;
    if (body.costCenter !== undefined) data.costCenter = body.costCenter || null;

    return response("Salary component updated", await this.repo.updateSalaryComponent(id, data));
  }

  async deleteSalaryComponent(id: number, currentUser: CurrentUser) {
    assertAdmin(currentUser);
    const deleted = await this.repo.deleteSalaryComponent(id);
    if (!deleted) throw new Error("Salary component not found");
    return response("Salary component deleted", deleted);
  }

  private async normalizeStructureComponents(components: StructureComponentPayload[] = []) {
    const normalized = [];
    for (const [index, component] of components.entries()) {
      const salaryComponentId = Number(component.salaryComponentId ?? component.componentId);
      if (!Number.isInteger(salaryComponentId) || salaryComponentId <= 0) {
        throw new Error(`components[${index}].salaryComponentId is required`);
      }
      const existing = await this.repo.getSalaryComponentById(salaryComponentId);
      if (!existing) {
        throw new Error(`Salary component ${salaryComponentId} not found`);
      }
      normalized.push({
        salaryComponentId,
        amount: normalizeMoney(component.amount, "component amount"),
        formula: component.formula || undefined,
        sortOrder: component.sortOrder ?? index,
      });
    }
    return normalized;
  }

  async createSalaryStructure(body: any, currentUser: CurrentUser) {
    assertAdmin(currentUser);
    if (!body.name && !body.structureName) throw new Error("name is required");

    const components = await this.normalizeStructureComponents(body.components || []);
    const created = await this.repo.createSalaryStructure(
      {
        name: String(body.name || body.structureName).trim(),
        description: body.description || null,
        effectiveFrom: normalizeDate(body.effectiveFrom, "effectiveFrom"),
        effectiveTo: optionalDate(body.effectiveTo, "effectiveTo"),
        active: body.active ?? body.isActive ?? true,
        createdBy: currentUser.id,
      },
      components,
    );
    return response(
      "Salary structure created",
      await this.repo.getSalaryStructureById(created.id),
    );
  }

  async getSalaryStructures() {
    return response("Salary structures fetched", await this.repo.getSalaryStructures());
  }

  async updateSalaryStructure(id: number, body: any, currentUser: CurrentUser) {
    assertAdmin(currentUser);
    const existing = await this.repo.getSalaryStructureById(id);
    if (!existing) throw new Error("Salary structure not found");

    const data: any = {};
    if (body.name !== undefined || body.structureName !== undefined) {
      data.name = String(body.name ?? body.structureName).trim();
    }
    if (body.description !== undefined) data.description = body.description || null;
    if (body.effectiveFrom !== undefined) data.effectiveFrom = normalizeDate(body.effectiveFrom, "effectiveFrom");
    if (body.effectiveTo !== undefined) data.effectiveTo = optionalDate(body.effectiveTo, "effectiveTo");
    if (body.active !== undefined || body.isActive !== undefined) {
      data.active = body.active ?? body.isActive;
    }

    const components = body.components
      ? await this.normalizeStructureComponents(body.components)
      : undefined;
    await this.repo.updateSalaryStructure(id, data, components);
    return response(
      "Salary structure updated",
      await this.repo.getSalaryStructureById(id),
    );
  }

  async deleteSalaryStructure(id: number, currentUser: CurrentUser) {
    assertAdmin(currentUser);
    const deleted = await this.repo.deleteSalaryStructure(id);
    if (!deleted) throw new Error("Salary structure not found");
    return response("Salary structure deleted", deleted);
  }

  async createSalaryStructureAssignment(body: any, currentUser: CurrentUser) {
    assertAdmin(currentUser);
    const empId = await this.normalizeEmployeeId(body.empId ?? body.employee);
    const salaryStructureId = Number(body.salaryStructureId);
    if (!Number.isInteger(salaryStructureId) || salaryStructureId <= 0) {
      throw new Error("salaryStructureId is required");
    }
    const structure = await this.repo.getSalaryStructureById(salaryStructureId);
    if (!structure) throw new Error("Salary structure not found");

    const fromDate = normalizeDate(body.fromDate, "fromDate");
    const toDate = optionalDate(body.toDate, "toDate");
    const overlap = await this.repo.findOverlappingAssignment(empId, fromDate, toDate);
    if (overlap) {
      throw new Error(
        `Employee already has an active salary structure assignment from ${overlap.fromDate} to ${overlap.toDate || "open-ended"}`,
      );
    }

    const created = await this.repo.createSalaryStructureAssignment({
      empId,
      salaryStructureId,
      fromDate,
      toDate,
      baseSalary: normalizeMoney(body.baseSalary, "baseSalary"),
      isActive: body.isActive ?? true,
      createdBy: currentUser.id,
    });
    return response("Salary structure assignment created", created);
  }

  async getSalaryStructureAssignments() {
    return response(
      "Salary structure assignments fetched",
      await this.repo.getSalaryStructureAssignments(),
    );
  }

  async updateSalaryStructureAssignment(id: number, body: any, currentUser: CurrentUser) {
    assertAdmin(currentUser);
    const existing = await this.repo.getSalaryStructureAssignmentById(id);
    if (!existing) throw new Error("Salary structure assignment not found");

    const empId = body.empId !== undefined ? await this.normalizeEmployeeId(body.empId) : existing.empId;
    const fromDate =
      body.fromDate !== undefined ? normalizeDate(body.fromDate, "fromDate") : existing.fromDate;
    const toDate =
      body.toDate !== undefined ? optionalDate(body.toDate, "toDate") : existing.toDate;

    if (body.salaryStructureId !== undefined) {
      const structure = await this.repo.getSalaryStructureById(Number(body.salaryStructureId));
      if (!structure) throw new Error("Salary structure not found");
    }

    const overlap = await this.repo.findOverlappingAssignment(empId, fromDate, toDate, id);
    if (overlap) {
      throw new Error(
        `Employee already has an active salary structure assignment from ${overlap.fromDate} to ${overlap.toDate || "open-ended"}`,
      );
    }

    const updated = await this.repo.updateSalaryStructureAssignment(id, {
      empId,
      salaryStructureId:
        body.salaryStructureId !== undefined
          ? Number(body.salaryStructureId)
          : existing.salaryStructureId,
      fromDate,
      toDate,
      baseSalary:
        body.baseSalary !== undefined
          ? normalizeMoney(body.baseSalary, "baseSalary")
          : existing.baseSalary,
      isActive: body.isActive ?? existing.isActive,
    });
    return response("Salary structure assignment updated", updated);
  }

  async deleteSalaryStructureAssignment(id: number, currentUser: CurrentUser) {
    assertAdmin(currentUser);
    const deleted = await this.repo.deleteSalaryStructureAssignment(id);
    if (!deleted) throw new Error("Salary structure assignment not found");
    return response("Salary structure assignment deleted", deleted);
  }

  async createAdditionalSalary(body: any, currentUser: CurrentUser) {
    assertAdmin(currentUser);
    const empId = await this.normalizeEmployeeId(body.empId ?? body.employeeId);
    let componentName = body.componentName || body.salaryComponent;
    let type = body.type ? normalizeComponentType(body.type) : undefined;

    const salaryComponentId = body.salaryComponentId ? Number(body.salaryComponentId) : null;
    if (salaryComponentId) {
      const component = await this.repo.getSalaryComponentById(salaryComponentId);
      if (!component) throw new Error("Salary component not found");
      componentName = componentName || component.name;
      type = type || component.type;
    }

    if (!componentName) throw new Error("componentName is required");
    if (!type) throw new Error("type is required");

    const created = await this.repo.createAdditionalSalary({
      empId,
      salaryComponentId,
      componentName,
      type: type as any,
      amount: normalizeMoney(body.amount, "amount", true)!,
      payrollPeriodStart: normalizeDate(
        body.payrollPeriodStart || body.periodStart || body.payrollDate,
        "payrollPeriodStart",
      ),
      payrollPeriodEnd: normalizeDate(
        body.payrollPeriodEnd || body.periodEnd || body.payrollDate,
        "payrollPeriodEnd",
      ),
      taxable: body.taxable ?? true,
      reason: body.reason || null,
      status: body.status || "draft",
      createdBy: currentUser.id,
    });
    return response("Additional salary created", created);
  }

  async getAdditionalSalaries(query: any) {
    const empId = query.empId ? Number(query.empId) : undefined;
    const periodStart = query.periodStart ? normalizeDate(query.periodStart, "periodStart") : undefined;
    const periodEnd = query.periodEnd ? normalizeDate(query.periodEnd, "periodEnd") : undefined;
    return response(
      "Additional salaries fetched",
      await this.repo.getAdditionalSalaries({
        empId,
        periodStart,
        periodEnd,
      }),
    );
  }
 
  async updateAdditionalSalary(id: number, body: any, currentUser: CurrentUser) {
    assertAdmin(currentUser);
    const existing = await this.repo.getAdditionalSalaryById(id);
    if (!existing) throw new Error("Additional salary not found");

    const data: any = {};
    if (body.empId !== undefined) data.empId = await this.normalizeEmployeeId(body.empId);
    if (body.salaryComponentId !== undefined) data.salaryComponentId = Number(body.salaryComponentId) || null;
    if (body.componentName !== undefined || body.salaryComponent !== undefined) {
      data.componentName = body.componentName ?? body.salaryComponent;
    }
    if (body.type !== undefined) data.type = normalizeComponentType(body.type);
    if (body.amount !== undefined) data.amount = normalizeMoney(body.amount, "amount", true);
    if (body.payrollPeriodStart !== undefined || body.periodStart !== undefined) {
      data.payrollPeriodStart = normalizeDate(
        body.payrollPeriodStart || body.periodStart,
        "payrollPeriodStart",
      );
    }
    if (body.payrollPeriodEnd !== undefined || body.periodEnd !== undefined) {
      data.payrollPeriodEnd = normalizeDate(
        body.payrollPeriodEnd || body.periodEnd,
        "payrollPeriodEnd",
      );
    }
    if (body.taxable !== undefined) data.taxable = body.taxable;
    if (body.reason !== undefined) data.reason = body.reason || null;
    if (body.status !== undefined) data.status = body.status;

    return response("Additional salary updated", await this.repo.updateAdditionalSalary(id, data));
  }

  async deleteAdditionalSalary(id: number, currentUser: CurrentUser) {
    assertAdmin(currentUser);
    const deleted = await this.repo.deleteAdditionalSalary(id);
    if (!deleted) throw new Error("Additional salary not found");
    return response("Additional salary deleted", deleted);
  }

  async createPayrollEntry(body: any, currentUser: CurrentUser) {
    assertAdmin(currentUser);
    const empId = await this.normalizeEmployeeId(body.empId ?? body.employeeId);
    const periodStart = normalizeDate(body.periodStart || body.startDate, "periodStart");
    const periodEnd = normalizeDate(body.periodEnd || body.endDate, "periodEnd");
    const calendarDays = daysInclusive(periodStart, periodEnd);
    const totalWorkingDays =
      body.totalWorkingDays !== undefined
        ? toPositiveInt(body.totalWorkingDays, "totalWorkingDays")
        : calendarDays;
    const paidDays =
      body.paidDays !== undefined
        ? toNonNegativeInt(body.paidDays, "paidDays")
        : totalWorkingDays;

    const existing = await this.repo.findPayrollEntryByEmpAndPeriod(
      empId,
      periodStart,
      periodEnd,
    );
    if (existing) {
      throw new Error("Payroll entry already exists for this employee and period");
    }

    let assignment = null;
    if (body.salaryStructureAssignmentId) {
      assignment = await this.repo.getSalaryStructureAssignmentById(
        Number(body.salaryStructureAssignmentId),
      );
      if (!assignment || assignment.empId !== empId) {
        throw new Error("Salary structure assignment not found for employee");
      }
    } else {
      assignment = await this.repo.getActiveAssignmentForPeriod(
        empId,
        periodStart,
        periodEnd,
      );
    }

    const salaryStructureId = Number(body.salaryStructureId || assignment?.salaryStructureId);
    if (!salaryStructureId) {
      throw new Error("No active salary structure assignment found for this period");
    }

    const structure = await this.repo.getSalaryStructureById(salaryStructureId);
    if (!structure) throw new Error("Salary structure not found");

    const components: PayrollComponentInput[] = structure.components.map((row: any) => ({
      id: row.component.id,
      code: row.component.code,
      name: row.component.name,
      type: row.component.type,
      amountType: row.component.amountType,
      amount: row.amount ?? row.component.amount,
      formula: row.formula ?? row.component.formula,
      taxable: row.component.taxable,
      dependsOnPaymentDays: row.component.dependsOnPaymentDays,
    }));

    const additionalRows = await this.repo.getAdditionalSalaries({
      empId,
      periodStart,
      periodEnd,
    });
    const additionalSalaries: AdditionalSalaryInput[] = additionalRows.map((row: any) => ({
      id: row.additionalSalary.id,
      componentName: row.additionalSalary.componentName,
      type: row.additionalSalary.type,
      amount: row.additionalSalary.amount,
      taxable: row.additionalSalary.taxable,
    }));

    const statutoryDeductions = (body.statutoryDeductions || {}) as StatutoryDeductionConfig;
    const calculation = calculatePayroll({
      baseSalary: body.baseSalary ?? assignment?.baseSalary,
      totalWorkingDays,
      paidDays,
      components,
      additionalSalaries,
      statutoryDeductions,
    });

    const created = await this.repo.createPayrollEntry({
      empId,
      salaryStructureId,
      salaryStructureAssignmentId: assignment?.id ?? null,
      periodStart,
      periodEnd,
      totalWorkingDays,
      paidDays,
      grossPay: calculation.grossPay,
      taxableEarnings: calculation.taxableEarnings,
      totalDeductions: calculation.totalDeductions,
      netPay: calculation.netPay,
      earnings: calculation.earnings,
      deductions: calculation.deductions,
      additionalSalaries: calculation.additionalSalaries,
      statutoryDeductions,
      status: "calculated",
      createdBy: currentUser.id,
    });

    return response("Payroll entry calculated", created);
  }

  async getPayrollEntries(query: any) {
    const periodStart = query.periodStart ? normalizeDate(query.periodStart, "periodStart") : undefined;
    const periodEnd = query.periodEnd ? normalizeDate(query.periodEnd, "periodEnd") : undefined;
    return response(
      "Payroll entries fetched",
      await this.repo.getPayrollEntries({
        empId: query.empId ? Number(query.empId) : undefined,
        periodStart,
        periodEnd,
        status: query.status,
      }),
    );
  }

  async getPayrollEntry(id: number) {
    const entry = await this.repo.getPayrollEntryById(id);
    if (!entry) throw new Error("Payroll entry not found");
    return response("Payroll entry fetched", entry);
  }

  async finalizePayrollEntry(id: number, currentUser: CurrentUser) {
    assertAdmin(currentUser);
    const entry = await this.repo.getPayrollEntryById(id);
    if (!entry) throw new Error("Payroll entry not found");
    if (entry.payrollEntry.status === "finalized") {
      return response("Payroll entry already finalized", entry.payrollEntry);
    }

    const accountingPayload = {
      salaryExpenseDebit: entry.payrollEntry.grossPay,
      statutoryLiabilityCredit: entry.payrollEntry.totalDeductions,
      bankOrCashCredit: entry.payrollEntry.netPay,
      payrollEntryId: entry.payrollEntry.id,
    };
    const message =
      "Accounts backend is not implemented yet. Payroll accounting is stubbed and no journal entry was posted.";

    await this.repo.createPayrollAccounting({
      payrollEntryId: entry.payrollEntry.id,
      status: "stubbed",
      payload: accountingPayload,
      message,
      createdBy: currentUser.id,
    });

    const updated = await this.repo.updatePayrollEntry(id, {
      status: "finalized",
      finalizedAt: new Date(),
      accountingStatus: "stubbed",
      accountingMessage: message,
    });

    await this.generateSalarySlip({ payrollEntryId: id }, currentUser, true);
    return response("Payroll entry finalized", updated);
  }

  async generateSalarySlip(
    body: any,
    currentUser: CurrentUser,
    allowFinalizedLock = false,
  ) {
    assertAdmin(currentUser);
    const payrollEntryId = Number(body.payrollEntryId);
    if (!Number.isInteger(payrollEntryId) || payrollEntryId <= 0) {
      throw new Error("payrollEntryId is required");
    }

    const entry = await this.repo.getPayrollEntryById(payrollEntryId);
    if (!entry) throw new Error("Payroll entry not found");

    const existing = await this.repo.getSalarySlipByPayrollEntryId(payrollEntryId);
    if (existing?.isLocked && !allowFinalizedLock) {
      throw new Error("Salary slip is locked and cannot be recalculated");
    }

    const slipData = {
      payrollEntryId,
      slipNumber: `SLIP-${entry.payrollEntry.empId}-${entry.payrollEntry.periodStart.replace(/-/g, "")}-${payrollEntryId}`,
      employeeSnapshot: {
        empId: entry.payrollEntry.empId,
        name: entry.employeeName,
        email: entry.employeeEmail,
        department: entry.departmentName,
        salaryStructure: entry.structureName,
        periodStart: entry.payrollEntry.periodStart,
        periodEnd: entry.payrollEntry.periodEnd,
      },
      earnings: entry.payrollEntry.earnings,
      deductions: entry.payrollEntry.deductions,
      grossPay: entry.payrollEntry.grossPay,
      totalDeductions: entry.payrollEntry.totalDeductions,
      netPay: entry.payrollEntry.netPay,
      status: (entry.payrollEntry.status === "finalized" ? "finalized" : "draft") as "finalized" | "draft" | "signed_off",
      isLocked: entry.payrollEntry.status === "finalized",
      finalizedAt: entry.payrollEntry.status === "finalized" ? new Date() : null,
      createdBy: currentUser.id,
    };

    const slip = existing
      ? await this.repo.updateSalarySlip(existing.id, slipData)
      : await this.repo.createSalarySlip(slipData);
    return response("Salary slip generated", slip);
  }

  async getSalarySlips() {
    return response("Salary slips fetched", await this.repo.getSalarySlips());
  }

  async finalizeSalarySlip(id: number, currentUser: CurrentUser) {
    assertAdmin(currentUser);
    const slip = await this.repo.getSalarySlipById(id);
    if (!slip) throw new Error("Salary slip not found");
    const updated = await this.repo.updateSalarySlip(id, {
      status: "finalized",
      isLocked: true,
      finalizedAt: new Date(),
    });
    return response("Salary slip finalized", updated);
  }

  async signOffSalarySlip(id: number, currentUser: CurrentUser) {
    const slip = await this.repo.getSalarySlipById(id);
    if (!slip) throw new Error("Salary slip not found");
    const updated = await this.repo.updateSalarySlip(id, {
      status: "signed_off",
      isLocked: true,
      signedOffAt: new Date(),
    });
    return response("Salary slip signed off", updated);
  }

  async getPayrollAccountingEntries() {
    return response(
      "Payroll accounting entries fetched",
      await this.repo.getPayrollAccountingEntries(),
    );
  }

  async getBankExport(query: any) {
    const periodStart = query.periodStart ? normalizeDate(query.periodStart, "periodStart") : undefined;
    const periodEnd = query.periodEnd ? normalizeDate(query.periodEnd, "periodEnd") : undefined;
    const rows = await this.repo.getFinalizedEntriesForBankExport({
      periodStart,
      periodEnd,
    });
    return response("Bank payout export data fetched", {
      rows: rows.map((row) => ({
        payrollEntryId: row.id,
        empId: row.empId,
        employeeName: row.employeeName,
        employeeEmail: row.employeeEmail,
        departmentName: row.departmentName,
        periodStart: row.periodStart,
        periodEnd: row.periodEnd,
        netPay: row.netPay,
        bankAccount: null,
        ifscCode: null,
        payoutStatus: "ready_for_export",
      })),
      note: "No bank integration is connected. This endpoint only exposes payout data for export.",
    });
  }
}
