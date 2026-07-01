import {
  and,
  desc,
  eq,
  gte,
  isNull,
  lte,
  ne,
  or,
} from "drizzle-orm";
import { db } from "../db/connection.js";
import {
  additionalSalary,
  department,
  Employee,
  employment,
  payrollAccounting,
  payrollEntry,
  salaryComponent,
  salarySlip,
  salaryStructure,
  salaryStructureAssignment,
  salaryStructureComponent,
  users,
} from "../db/schema.js";

export class PayrollModuleRepository {
  async findEmployeeIdentity(id: number) {
    const [employee] = await db
      .select({
        employeeId: Employee.id,
        userId: Employee.userId,
        adminId: Employee.adminId,
        name: users.name,
        email: users.email,
        organizationId: users.organizationId,
      })
      .from(Employee)
      .innerJoin(users, eq(Employee.userId, users.id))
      .where(or(eq(Employee.userId, id), eq(Employee.id, id)))
      .limit(1);

    return employee;
  }

  async createSalaryComponent(data: typeof salaryComponent.$inferInsert) {
    const [created] = await db.insert(salaryComponent).values(data).returning();
    return created;
  }

  async getSalaryComponents() {
    return await db
      .select()
      .from(salaryComponent)
      .where(eq(salaryComponent.isDeleted, false))
      .orderBy(salaryComponent.name);
  }

  async getSalaryComponentById(id: number) {
    const [component] = await db
      .select()
      .from(salaryComponent)
      .where(and(eq(salaryComponent.id, id), eq(salaryComponent.isDeleted, false)))
      .limit(1);
    return component;
  }

  async updateSalaryComponent(
    id: number,
    data: Partial<typeof salaryComponent.$inferInsert>,
  ) {
    const [updated] = await db
      .update(salaryComponent)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(salaryComponent.id, id), eq(salaryComponent.isDeleted, false)))
      .returning();
    return updated;
  }

  async deleteSalaryComponent(id: number) {
    const [deleted] = await db
      .update(salaryComponent)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(salaryComponent.id, id))
      .returning();
    return deleted;
  }

  async createSalaryStructure(
    data: typeof salaryStructure.$inferInsert,
    components: Array<Partial<typeof salaryStructureComponent.$inferInsert>>,
  ) {
    return await db.transaction(async (tx) => {
      const [created] = await tx.insert(salaryStructure).values(data).returning();
      if (components.length > 0) {
        await tx.insert(salaryStructureComponent).values(
          components.map((component, index) => ({
            salaryStructureId: created.id,
            salaryComponentId: component.salaryComponentId!,
            amount: component.amount,
            formula: component.formula,
            sortOrder: component.sortOrder ?? index,
          })),
        );
      }
      return created;
    });
  }

  async getSalaryStructures() {
    const structures = await db
      .select()
      .from(salaryStructure)
      .where(eq(salaryStructure.isDeleted, false))
      .orderBy(desc(salaryStructure.id));

    return await Promise.all(
      structures.map(async (structure) => ({
        ...structure,
        components: await this.getSalaryStructureComponents(structure.id),
      })),
    );
  }

  async getSalaryStructureById(id: number) {
    const [structure] = await db
      .select()
      .from(salaryStructure)
      .where(and(eq(salaryStructure.id, id), eq(salaryStructure.isDeleted, false)))
      .limit(1);
    if (!structure) return undefined;
    return {
      ...structure,
      components: await this.getSalaryStructureComponents(id),
    };
  }

  async getSalaryStructureComponents(structureId: number) {
    const rows = await db
      .select({
        link: salaryStructureComponent,
        component: salaryComponent,
      })
      .from(salaryStructureComponent)
      .innerJoin(
        salaryComponent,
        eq(salaryStructureComponent.salaryComponentId, salaryComponent.id),
      )
      .where(
        and(
          eq(salaryStructureComponent.salaryStructureId, structureId),
          eq(salaryStructureComponent.isDeleted, false),
          eq(salaryComponent.isDeleted, false),
        ),
      )
      .orderBy(salaryStructureComponent.sortOrder);

    return rows.map((row) => ({
      ...row.link,
      component: row.component,
    }));
  }

  async updateSalaryStructure(
    id: number,
    data: Partial<typeof salaryStructure.$inferInsert>,
    components?: Array<Partial<typeof salaryStructureComponent.$inferInsert>>,
  ) {
    return await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(salaryStructure)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(salaryStructure.id, id), eq(salaryStructure.isDeleted, false)))
        .returning();

      if (components) {
        await tx
          .update(salaryStructureComponent)
          .set({ isDeleted: true, updatedAt: new Date() })
          .where(eq(salaryStructureComponent.salaryStructureId, id));

        if (components.length > 0) {
          await tx.insert(salaryStructureComponent).values(
            components.map((component, index) => ({
              salaryStructureId: id,
              salaryComponentId: component.salaryComponentId!,
              amount: component.amount,
              formula: component.formula,
              sortOrder: component.sortOrder ?? index,
            })),
          );
        }
      }

      return updated;
    });
  }

  async deleteSalaryStructure(id: number) {
    const [deleted] = await db
      .update(salaryStructure)
      .set({ isDeleted: true, active: false, updatedAt: new Date() })
      .where(eq(salaryStructure.id, id))
      .returning();
    return deleted;
  }

  async findOverlappingAssignment(
    empId: number,
    fromDate: string,
    toDate?: string | null,
    excludeId?: number,
  ) {
    const conditions = [
      eq(salaryStructureAssignment.empId, empId),
      eq(salaryStructureAssignment.isDeleted, false),
      eq(salaryStructureAssignment.isActive, true),
      or(
        isNull(salaryStructureAssignment.toDate),
        gte(salaryStructureAssignment.toDate, fromDate),
      )!,
    ];

    if (toDate) {
      conditions.push(lte(salaryStructureAssignment.fromDate, toDate));
    }
    if (excludeId) {
      conditions.push(ne(salaryStructureAssignment.id, excludeId));
    }

    const [assignment] = await db
      .select()
      .from(salaryStructureAssignment)
      .where(and(...conditions))
      .limit(1);

    return assignment;
  }

  async createSalaryStructureAssignment(
    data: typeof salaryStructureAssignment.$inferInsert,
  ) {
    const [created] = await db
      .insert(salaryStructureAssignment)
      .values(data)
      .returning();
    return created;
  }

  async getSalaryStructureAssignments() {
    return await db
      .select({
        assignment: salaryStructureAssignment,
        employeeName: users.name,
        structureName: salaryStructure.name,
        departmentName: department.departmentName,
      })
      .from(salaryStructureAssignment)
      .innerJoin(users, eq(salaryStructureAssignment.empId, users.id))
      .innerJoin(
        salaryStructure,
        eq(salaryStructureAssignment.salaryStructureId, salaryStructure.id),
      )
      .leftJoin(employment, eq(employment.employeeId, users.id))
      .leftJoin(department, eq(employment.departmentId, department.id))
      .where(eq(salaryStructureAssignment.isDeleted, false))
      .orderBy(desc(salaryStructureAssignment.id));
  }

  async getSalaryStructureAssignmentById(id: number) {
    const [assignment] = await db
      .select()
      .from(salaryStructureAssignment)
      .where(
        and(
          eq(salaryStructureAssignment.id, id),
          eq(salaryStructureAssignment.isDeleted, false),
        ),
      )
      .limit(1);
    return assignment;
  }

  async updateSalaryStructureAssignment(
    id: number,
    data: Partial<typeof salaryStructureAssignment.$inferInsert>,
  ) {
    const [updated] = await db
      .update(salaryStructureAssignment)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(salaryStructureAssignment.id, id),
          eq(salaryStructureAssignment.isDeleted, false),
        ),
      )
      .returning();
    return updated;
  }

  async deleteSalaryStructureAssignment(id: number) {
    const [deleted] = await db
      .update(salaryStructureAssignment)
      .set({ isDeleted: true, isActive: false, updatedAt: new Date() })
      .where(eq(salaryStructureAssignment.id, id))
      .returning();
    return deleted;
  }

  async getActiveAssignmentForPeriod(
    empId: number,
    periodStart: string,
    periodEnd: string,
  ) {
    const [assignment] = await db
      .select()
      .from(salaryStructureAssignment)
      .where(
        and(
          eq(salaryStructureAssignment.empId, empId),
          eq(salaryStructureAssignment.isDeleted, false),
          eq(salaryStructureAssignment.isActive, true),
          lte(salaryStructureAssignment.fromDate, periodEnd),
          or(
            isNull(salaryStructureAssignment.toDate),
            gte(salaryStructureAssignment.toDate, periodStart),
          ),
        ),
      )
      .orderBy(desc(salaryStructureAssignment.fromDate))
      .limit(1);
    return assignment;
  }

  async createAdditionalSalary(data: typeof additionalSalary.$inferInsert) {
    const [created] = await db.insert(additionalSalary).values(data).returning();
    return created;
  }

  async getAdditionalSalaries(filters: {
    empId?: number;
    periodStart?: string;
    periodEnd?: string;
  } = {}) {
    const conditions = [eq(additionalSalary.isDeleted, false)];
    if (filters.empId) conditions.push(eq(additionalSalary.empId, filters.empId));
    if (filters.periodStart) {
      conditions.push(gte(additionalSalary.payrollPeriodEnd, filters.periodStart));
    }
    if (filters.periodEnd) {
      conditions.push(lte(additionalSalary.payrollPeriodStart, filters.periodEnd));
    }

    return await db
      .select({
        additionalSalary,
        employeeName: users.name,
        component: salaryComponent,
      })
      .from(additionalSalary)
      .innerJoin(users, eq(additionalSalary.empId, users.id))
      .leftJoin(
        salaryComponent,
        eq(additionalSalary.salaryComponentId, salaryComponent.id),
      )
      .where(and(...conditions))
      .orderBy(desc(additionalSalary.id));
  }

  async getAdditionalSalaryById(id: number) {
    const [record] = await db
      .select()
      .from(additionalSalary)
      .where(and(eq(additionalSalary.id, id), eq(additionalSalary.isDeleted, false)))
      .limit(1);
    return record;
  }

  async updateAdditionalSalary(
    id: number,
    data: Partial<typeof additionalSalary.$inferInsert>,
  ) {
    const [updated] = await db
      .update(additionalSalary)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(additionalSalary.id, id), eq(additionalSalary.isDeleted, false)))
      .returning();
    return updated;
  }

  async deleteAdditionalSalary(id: number) {
    const [deleted] = await db
      .update(additionalSalary)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(additionalSalary.id, id))
      .returning();
    return deleted;
  }

  async findPayrollEntryByEmpAndPeriod(
    empId: number,
    periodStart: string,
    periodEnd: string,
  ) {
    const [entry] = await db
      .select()
      .from(payrollEntry)
      .where(
        and(
          eq(payrollEntry.empId, empId),
          eq(payrollEntry.periodStart, periodStart),
          eq(payrollEntry.periodEnd, periodEnd),
          eq(payrollEntry.isDeleted, false),
        ),
      )
      .limit(1);
    return entry;
  }

  async createPayrollEntry(data: typeof payrollEntry.$inferInsert) {
    const [created] = await db.insert(payrollEntry).values(data).returning();
    return created;
  }

  async getPayrollEntries(filters: {
    empId?: number;
    periodStart?: string;
    periodEnd?: string;
    status?: "calculated" | "finalized" | "cancelled";
  } = {}) {
    const conditions = [eq(payrollEntry.isDeleted, false)];
    if (filters.empId) conditions.push(eq(payrollEntry.empId, filters.empId));
    if (filters.periodStart) conditions.push(gte(payrollEntry.periodEnd, filters.periodStart));
    if (filters.periodEnd) conditions.push(lte(payrollEntry.periodStart, filters.periodEnd));
    if (filters.status) conditions.push(eq(payrollEntry.status, filters.status));

    return await db
      .select({
        payrollEntry,
        employeeName: users.name,
        structureName: salaryStructure.name,
        departmentName: department.departmentName,
      })
      .from(payrollEntry)
      .innerJoin(users, eq(payrollEntry.empId, users.id))
      .leftJoin(salaryStructure, eq(payrollEntry.salaryStructureId, salaryStructure.id))
      .leftJoin(employment, eq(employment.employeeId, users.id))
      .leftJoin(department, eq(employment.departmentId, department.id))
      .where(and(...conditions))
      .orderBy(desc(payrollEntry.periodEnd), desc(payrollEntry.id));
  }

  async getPayrollEntryById(id: number) {
    const [entry] = await db
      .select({
        payrollEntry,
        employeeName: users.name,
        employeeEmail: users.email,
        structureName: salaryStructure.name,
        departmentName: department.departmentName,
      })
      .from(payrollEntry)
      .innerJoin(users, eq(payrollEntry.empId, users.id))
      .leftJoin(salaryStructure, eq(payrollEntry.salaryStructureId, salaryStructure.id))
      .leftJoin(employment, eq(employment.employeeId, users.id))
      .leftJoin(department, eq(employment.departmentId, department.id))
      .where(and(eq(payrollEntry.id, id), eq(payrollEntry.isDeleted, false)))
      .limit(1);
    return entry;
  }

  async updatePayrollEntry(
    id: number,
    data: Partial<typeof payrollEntry.$inferInsert>,
  ) {
    const [updated] = await db
      .update(payrollEntry)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(payrollEntry.id, id), eq(payrollEntry.isDeleted, false)))
      .returning();
    return updated;
  }

  async getSalarySlipByPayrollEntryId(payrollEntryId: number) {
    const [slip] = await db
      .select()
      .from(salarySlip)
      .where(
        and(
          eq(salarySlip.payrollEntryId, payrollEntryId),
          eq(salarySlip.isDeleted, false),
        ),
      )
      .limit(1);
    return slip;
  }

  async getSalarySlipById(id: number) {
    const [slip] = await db
      .select()
      .from(salarySlip)
      .where(and(eq(salarySlip.id, id), eq(salarySlip.isDeleted, false)))
      .limit(1);
    return slip;
  }

  async createSalarySlip(data: typeof salarySlip.$inferInsert) {
    const [created] = await db.insert(salarySlip).values(data).returning();
    return created;
  }

  async updateSalarySlip(id: number, data: Partial<typeof salarySlip.$inferInsert>) {
    const [updated] = await db
      .update(salarySlip)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(salarySlip.id, id), eq(salarySlip.isDeleted, false)))
      .returning();
    return updated;
  }

  async getSalarySlips(filters: { empId?: number; adminId?: number; finalizedOnly?: boolean } = {}) {
    const conditions = [eq(salarySlip.isDeleted, false)];
    if (filters.empId) conditions.push(eq(payrollEntry.empId, filters.empId));
    if (filters.adminId) conditions.push(eq(Employee.adminId, filters.adminId));
    if (filters.finalizedOnly) conditions.push(ne(salarySlip.status, "draft"));

    return await db
      .select({
        salarySlip,
        payrollEntry,
        employeeName: users.name,
      })
      .from(salarySlip)
      .innerJoin(payrollEntry, eq(salarySlip.payrollEntryId, payrollEntry.id))
      .innerJoin(users, eq(payrollEntry.empId, users.id))
      .innerJoin(Employee, eq(Employee.userId, payrollEntry.empId))
      .where(and(...conditions))
      .orderBy(desc(salarySlip.id));
  }

  async createPayrollAccounting(data: typeof payrollAccounting.$inferInsert) {
    const [created] = await db.insert(payrollAccounting).values(data).returning();
    return created;
  }

  async getPayrollAccountingEntries() {
    return await db
      .select({
        payrollAccounting,
        payrollEntry,
        employeeName: users.name,
      })
      .from(payrollAccounting)
      .innerJoin(payrollEntry, eq(payrollAccounting.payrollEntryId, payrollEntry.id))
      .innerJoin(users, eq(payrollEntry.empId, users.id))
      .where(eq(payrollAccounting.isDeleted, false))
      .orderBy(desc(payrollAccounting.id));
  }

  async getFinalizedEntriesForBankExport(filters: {
    periodStart?: string;
    periodEnd?: string;
  }) {
    const conditions = [
      eq(payrollEntry.isDeleted, false),
      eq(payrollEntry.status, "finalized" as const),
    ];
    if (filters.periodStart) conditions.push(gte(payrollEntry.periodEnd, filters.periodStart));
    if (filters.periodEnd) conditions.push(lte(payrollEntry.periodStart, filters.periodEnd));

    return await db
      .select({
        id: payrollEntry.id,
        empId: payrollEntry.empId,
        employeeName: users.name,
        employeeEmail: users.email,
        periodStart: payrollEntry.periodStart,
        periodEnd: payrollEntry.periodEnd,
        netPay: payrollEntry.netPay,
        departmentName: department.departmentName,
      })
      .from(payrollEntry)
      .innerJoin(users, eq(payrollEntry.empId, users.id))
      .leftJoin(employment, eq(employment.employeeId, users.id))
      .leftJoin(department, eq(employment.departmentId, department.id))
      .where(and(...conditions))
      .orderBy(users.name);
  }
}
