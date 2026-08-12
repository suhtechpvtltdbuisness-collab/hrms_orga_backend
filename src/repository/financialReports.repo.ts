import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  lt,
  lte,
  ne,
  notInArray,
  sql,
} from "drizzle-orm";
import { db } from "../db/connection.js";
import {
  bankCashAccount,
  budget,
  budgetLine,
  chartAccount,
  department,
  expense,
  expenseCategory,
  fiscalYear,
  invoicePayment,
  journalEntry,
  journalEntryLine,
  organizations,
  purchaseInvoice,
  salesInvoice,
  salesRecord,
} from "../db/schema.js";

export interface LedgerFilters {
  from?: string;
  to?: string;
  departmentId?: number;
  costCenter?: string;
}

const amount = (column: any) => sql<number>`coalesce(sum(${column}::numeric), 0)::float`;

/** Normalize stored dates that may be YYYY-MM-DD or DD/MM/YYYY into ISO for range filters. */
const isoDate = (column: any) => sql`case
  when ${column} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' then substring(${column} from 1 for 10)
  when ${column} ~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}$' then to_char(to_date(${column}, 'DD/MM/YYYY'), 'YYYY-MM-DD')
  when ${column} ~ '^[0-9]{1,2}-[0-9]{1,2}-[0-9]{4}$' then to_char(to_date(${column}, 'DD-MM-YYYY'), 'YYYY-MM-DD')
  else ${column}
end`;

export class FinancialReportsRepository {
  private ledgerConditions(adminId: number, filters: LedgerFilters) {
    const conditions = [
      eq(journalEntry.adminId, adminId),
      eq(journalEntry.isDeleted, false),
      eq(chartAccount.isDeleted, false),
    ];
    if (filters.from) conditions.push(gte(journalEntry.entryDate, filters.from));
    if (filters.to) conditions.push(lte(journalEntry.entryDate, filters.to));
    if (filters.departmentId) {
      conditions.push(eq(journalEntryLine.departmentId, filters.departmentId));
    }
    if (filters.costCenter) {
      conditions.push(eq(journalEntryLine.costCenter, filters.costCenter));
    }
    return conditions;
  }

  /** Period movement per account, split across the department dimension. */
  async getMovementsByAccountAndDepartment(
    adminId: number,
    filters: LedgerFilters,
  ) {
    return db
      .select({
        accountId: chartAccount.id,
        accountName: chartAccount.accountName,
        accountType: chartAccount.accountType,
        statementSection: chartAccount.statementSection,
        cashFlowActivity: chartAccount.cashFlowActivity,
        reportCategory: chartAccount.reportCategory,
        departmentId: journalEntryLine.departmentId,
        departmentName: department.departmentName,
        debit: amount(journalEntryLine.debit),
        credit: amount(journalEntryLine.credit),
      })
      .from(journalEntryLine)
      .innerJoin(journalEntry, eq(journalEntry.id, journalEntryLine.journalEntryId))
      .innerJoin(chartAccount, eq(chartAccount.id, journalEntryLine.accountId))
      .leftJoin(department, eq(department.id, journalEntryLine.departmentId))
      .where(and(...this.ledgerConditions(adminId, filters)))
      .groupBy(
        chartAccount.id,
        chartAccount.accountName,
        chartAccount.accountType,
        chartAccount.statementSection,
        chartAccount.cashFlowActivity,
        chartAccount.reportCategory,
        journalEntryLine.departmentId,
        department.departmentName,
      );
  }

  /** Period movement per account, ignoring dimensions. */
  async getMovementsByAccount(adminId: number, filters: LedgerFilters) {
    return db
      .select({
        accountId: chartAccount.id,
        accountName: chartAccount.accountName,
        accountType: chartAccount.accountType,
        statementSection: chartAccount.statementSection,
        cashFlowActivity: chartAccount.cashFlowActivity,
        reportCategory: chartAccount.reportCategory,
        debit: amount(journalEntryLine.debit),
        credit: amount(journalEntryLine.credit),
      })
      .from(journalEntryLine)
      .innerJoin(journalEntry, eq(journalEntry.id, journalEntryLine.journalEntryId))
      .innerJoin(chartAccount, eq(chartAccount.id, journalEntryLine.accountId))
      .where(and(...this.ledgerConditions(adminId, filters)))
      .groupBy(
        chartAccount.id,
        chartAccount.accountName,
        chartAccount.accountType,
        chartAccount.statementSection,
        chartAccount.cashFlowActivity,
        chartAccount.reportCategory,
      );
  }

  async getOrganization(organizationId: number | null) {
    if (!organizationId) return null;
    const [row] = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        currency: organizations.currency,
      })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);
    return row ?? null;
  }

  async getChartAccounts(adminId: number) {
    return db
      .select()
      .from(chartAccount)
      .where(
        and(eq(chartAccount.adminId, adminId), eq(chartAccount.isDeleted, false)),
      )
      .orderBy(asc(chartAccount.accountType), asc(chartAccount.accountName));
  }

  async getBankCashAccounts(adminId: number) {
    return db
      .select()
      .from(bankCashAccount)
      .where(
        and(
          eq(bankCashAccount.adminId, adminId),
          eq(bankCashAccount.isDeleted, false),
        ),
      )
      .orderBy(asc(bankCashAccount.bankName));
  }

  // ---------- Cash flow ----------

  /** Net cash movement per journal entry for the given cash GL accounts. */
  async getCashMovementsByEntry(
    adminId: number,
    period: { from: string; to: string },
    cashAccountIds: number[],
  ) {
    if (!cashAccountIds.length) return [];
    return db
      .select({
        journalEntryId: journalEntryLine.journalEntryId,
        entryDate: journalEntry.entryDate,
        remarks: journalEntry.remarks,
        debit: amount(journalEntryLine.debit),
        credit: amount(journalEntryLine.credit),
      })
      .from(journalEntryLine)
      .innerJoin(journalEntry, eq(journalEntry.id, journalEntryLine.journalEntryId))
      .where(
        and(
          eq(journalEntry.adminId, adminId),
          eq(journalEntry.isDeleted, false),
          inArray(journalEntryLine.accountId, cashAccountIds),
          gte(journalEntry.entryDate, period.from),
          lte(journalEntry.entryDate, period.to),
        ),
      )
      .groupBy(
        journalEntryLine.journalEntryId,
        journalEntry.entryDate,
        journalEntry.remarks,
      )
      .orderBy(asc(journalEntry.entryDate));
  }

  /** The non-cash side of the supplied entries, used to classify each movement. */
  async getCounterpartLines(entryIds: number[], cashAccountIds: number[]) {
    if (!entryIds.length) return [];
    const conditions = [
      inArray(journalEntryLine.journalEntryId, entryIds),
      eq(chartAccount.isDeleted, false),
    ];
    if (cashAccountIds.length) {
      conditions.push(notInArray(journalEntryLine.accountId, cashAccountIds));
    }
    return db
      .select({
        journalEntryId: journalEntryLine.journalEntryId,
        accountId: chartAccount.id,
        accountName: chartAccount.accountName,
        accountType: chartAccount.accountType,
        statementSection: chartAccount.statementSection,
        cashFlowActivity: chartAccount.cashFlowActivity,
        reportCategory: chartAccount.reportCategory,
        debit: journalEntryLine.debit,
        credit: journalEntryLine.credit,
      })
      .from(journalEntryLine)
      .innerJoin(chartAccount, eq(chartAccount.id, journalEntryLine.accountId))
      .where(and(...conditions));
  }

  /** Cash movement strictly before a date, for the opening balance. */
  async getCashMovementBefore(
    adminId: number,
    before: string,
    cashAccountIds: number[],
  ) {
    if (!cashAccountIds.length) return { debit: 0, credit: 0 };
    const [row] = await db
      .select({
        debit: amount(journalEntryLine.debit),
        credit: amount(journalEntryLine.credit),
      })
      .from(journalEntryLine)
      .innerJoin(journalEntry, eq(journalEntry.id, journalEntryLine.journalEntryId))
      .where(
        and(
          eq(journalEntry.adminId, adminId),
          eq(journalEntry.isDeleted, false),
          inArray(journalEntryLine.accountId, cashAccountIds),
          lt(journalEntry.entryDate, before),
        ),
      );
    return row ?? { debit: 0, credit: 0 };
  }

  // ---------- Dimensions ----------

  async getDepartments(organizationId: number | null) {
    const conditions = [eq(department.isDeleted, false)];
    if (organizationId) {
      conditions.push(eq(department.organizationId, organizationId));
    }
    return db
      .select({
        id: department.id,
        name: department.departmentName,
        code: department.departmentCode,
      })
      .from(department)
      .where(and(...conditions))
      .orderBy(asc(department.departmentName));
  }

  async getCostCenters(adminId: number) {
    const rows = await db
      .selectDistinct({ costCenter: journalEntryLine.costCenter })
      .from(journalEntryLine)
      .innerJoin(journalEntry, eq(journalEntry.id, journalEntryLine.journalEntryId))
      .where(
        and(
          eq(journalEntry.adminId, adminId),
          eq(journalEntry.isDeleted, false),
          isNotNull(journalEntryLine.costCenter),
          ne(journalEntryLine.costCenter, ""),
        ),
      )
      .orderBy(asc(journalEntryLine.costCenter));
    return rows.map((row) => row.costCenter as string);
  }

  // ---------- Fiscal years ----------

  async listFiscalYears(adminId: number) {
    return db
      .select()
      .from(fiscalYear)
      .where(
        and(eq(fiscalYear.adminId, adminId), eq(fiscalYear.isDeleted, false)),
      )
      .orderBy(desc(fiscalYear.startDate));
  }

  async getFiscalYearById(id: number, adminId: number) {
    const [row] = await db
      .select()
      .from(fiscalYear)
      .where(
        and(
          eq(fiscalYear.id, id),
          eq(fiscalYear.adminId, adminId),
          eq(fiscalYear.isDeleted, false),
        ),
      )
      .limit(1);
    return row;
  }

  async createFiscalYear(values: typeof fiscalYear.$inferInsert) {
    const [row] = await db.insert(fiscalYear).values(values).returning();
    return row;
  }

  async clearDefaultFiscalYear(adminId: number) {
    await db
      .update(fiscalYear)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(and(eq(fiscalYear.adminId, adminId), eq(fiscalYear.isDefault, true)));
  }

  async updateFiscalYear(
    id: number,
    adminId: number,
    values: Partial<typeof fiscalYear.$inferInsert>,
  ) {
    const [row] = await db
      .update(fiscalYear)
      .set({ ...values, updatedAt: new Date() })
      .where(
        and(
          eq(fiscalYear.id, id),
          eq(fiscalYear.adminId, adminId),
          eq(fiscalYear.isDeleted, false),
        ),
      )
      .returning();
    return row;
  }

  async softDeleteFiscalYear(id: number, adminId: number) {
    const [row] = await db
      .update(fiscalYear)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(
        and(
          eq(fiscalYear.id, id),
          eq(fiscalYear.adminId, adminId),
          eq(fiscalYear.isDeleted, false),
        ),
      )
      .returning();
    return row;
  }

  async countBudgetsForFiscalYear(fiscalYearId: number) {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(budget)
      .where(
        and(eq(budget.fiscalYearId, fiscalYearId), eq(budget.isDeleted, false)),
      );
    return row?.count ?? 0;
  }

  // ---------- Budgets ----------

  async listBudgets(
    adminId: number,
    filters: { status?: string; from?: string; to?: string } = {},
  ) {
    const conditions = [eq(budget.adminId, adminId), eq(budget.isDeleted, false)];
    if (filters.status) conditions.push(eq(budget.status, filters.status));
    // Any budget that overlaps the requested window.
    if (filters.to) conditions.push(lte(budget.periodStart, filters.to));
    if (filters.from) conditions.push(gte(budget.periodEnd, filters.from));

    const budgets = await db
      .select()
      .from(budget)
      .where(and(...conditions))
      .orderBy(desc(budget.periodStart));

    if (!budgets.length) return [];
    const lines = await this.getBudgetLines(budgets.map((row) => row.id));
    return budgets.map((row) => ({
      ...row,
      lines: lines.filter((line) => line.budgetId === row.id),
    }));
  }

  async getBudgetLines(budgetIds: number[]) {
    if (!budgetIds.length) return [];
    return db
      .select({
        id: budgetLine.id,
        budgetId: budgetLine.budgetId,
        departmentId: budgetLine.departmentId,
        departmentName: department.departmentName,
        accountId: budgetLine.accountId,
        accountName: chartAccount.accountName,
        statementSection: chartAccount.statementSection,
        accountType: chartAccount.accountType,
        reportCategory: chartAccount.reportCategory,
        categoryName: budgetLine.categoryName,
        budgetedAmount: budgetLine.budgetedAmount,
        sortOrder: budgetLine.sortOrder,
      })
      .from(budgetLine)
      .leftJoin(department, eq(department.id, budgetLine.departmentId))
      .leftJoin(chartAccount, eq(chartAccount.id, budgetLine.accountId))
      .where(inArray(budgetLine.budgetId, budgetIds))
      .orderBy(asc(budgetLine.sortOrder), asc(budgetLine.id));
  }

  async getBudgetById(id: number, adminId: number) {
    const [row] = await db
      .select()
      .from(budget)
      .where(
        and(
          eq(budget.id, id),
          eq(budget.adminId, adminId),
          eq(budget.isDeleted, false),
        ),
      )
      .limit(1);
    if (!row) return null;
    const lines = await this.getBudgetLines([row.id]);
    return { ...row, lines };
  }

  async createBudgetWithLines(
    values: typeof budget.$inferInsert,
    lines: Array<Omit<typeof budgetLine.$inferInsert, "budgetId">>,
  ) {
    return db.transaction(async (tx) => {
      const [created] = await tx.insert(budget).values(values).returning();
      if (lines.length) {
        await tx
          .insert(budgetLine)
          .values(lines.map((line) => ({ ...line, budgetId: created.id })));
      }
      return created;
    });
  }

  async updateBudgetWithLines(
    id: number,
    adminId: number,
    values: Partial<typeof budget.$inferInsert>,
    lines: Array<Omit<typeof budgetLine.$inferInsert, "budgetId">> | null,
  ) {
    return db.transaction(async (tx) => {
      const [updated] = await tx
        .update(budget)
        .set({ ...values, updatedAt: new Date() })
        .where(
          and(
            eq(budget.id, id),
            eq(budget.adminId, adminId),
            eq(budget.isDeleted, false),
          ),
        )
        .returning();
      if (!updated) return null;
      if (lines) {
        await tx.delete(budgetLine).where(eq(budgetLine.budgetId, id));
        if (lines.length) {
          await tx
            .insert(budgetLine)
            .values(lines.map((line) => ({ ...line, budgetId: id })));
        }
      }
      return updated;
    });
  }

  async softDeleteBudget(id: number, adminId: number) {
    const [row] = await db
      .update(budget)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(
        and(
          eq(budget.id, id),
          eq(budget.adminId, adminId),
          eq(budget.isDeleted, false),
        ),
      )
      .returning();
    return row;
  }

  // ---------- Account classification ----------

  async updateAccountClassification(
    id: number,
    adminId: number,
    values: {
      statementSection?: string | null;
      cashFlowActivity?: string | null;
      reportCategory?: string | null;
    },
  ) {
    const [row] = await db
      .update(chartAccount)
      .set({ ...values, updatedAt: new Date() })
      .where(
        and(
          eq(chartAccount.id, id),
          eq(chartAccount.adminId, adminId),
          eq(chartAccount.isDeleted, false),
        ),
      )
      .returning();
    return row;
  }

  // ---------- Operational sources (Sales invoices + Expenses + Purchases) ----------

  async getSalesInvoiceTotals(
    organizationId: number,
    period: { from?: string; to?: string } = {},
  ) {
    const conditions = [
      eq(salesInvoice.organizationId, organizationId),
      eq(salesInvoice.isDeleted, false),
    ];
    if (period.from) conditions.push(gte(isoDate(salesInvoice.invoiceDate), period.from));
    if (period.to) conditions.push(lte(isoDate(salesInvoice.invoiceDate), period.to));

    return db
      .select({
        customerName: salesInvoice.customerName,
        status: salesInvoice.status,
        amount: sql<number>`coalesce(sum(${salesInvoice.amount}::numeric), 0)::float`,
        count: sql<number>`count(*)::int`,
      })
      .from(salesInvoice)
      .where(and(...conditions))
      .groupBy(salesInvoice.customerName, salesInvoice.status)
      .orderBy(asc(salesInvoice.customerName));
  }

  async getClosedWonSalesTotals(
    organizationId: number,
    period: { from?: string; to?: string } = {},
  ) {
    const conditions = [
      eq(salesRecord.organizationId, organizationId),
      eq(salesRecord.isDeleted, false),
      eq(salesRecord.recordType, "opportunity"),
      eq(salesRecord.status, "Closed Won"),
    ];
    if (period.from) {
      conditions.push(
        gte(
          sql`to_char(coalesce(${salesRecord.wonAt}, ${salesRecord.updatedAt}), 'YYYY-MM-DD')`,
          period.from,
        ),
      );
    }
    if (period.to) {
      conditions.push(
        lte(
          sql`to_char(coalesce(${salesRecord.wonAt}, ${salesRecord.updatedAt}), 'YYYY-MM-DD')`,
          period.to,
        ),
      );
    }

    return db
      .select({
        owner: salesRecord.owner,
        company: salesRecord.company,
        amount: sql<number>`coalesce(sum(${salesRecord.value}::numeric), 0)::float`,
        count: sql<number>`count(*)::int`,
      })
      .from(salesRecord)
      .where(and(...conditions))
      .groupBy(salesRecord.owner, salesRecord.company);
  }

  async getExpenseTotals(
    organizationId: number,
    period: { from?: string; to?: string } = {},
    category?: string,
  ) {
    const conditions = [
      eq(expense.organizationId, organizationId),
      eq(expense.isDeleted, false),
      inArray(expense.status, [
        "Submitted",
        "Manager Approved",
        "Approved",
        "Reimbursed",
      ]),
    ];
    if (period.from) conditions.push(gte(isoDate(expense.expenseDate), period.from));
    if (period.to) conditions.push(lte(isoDate(expense.expenseDate), period.to));
    if (category) conditions.push(eq(expense.category, category));

    return db
      .select({
        category: expense.category,
        departmentId: expense.departmentId,
        departmentName: department.departmentName,
        costCenter: expense.costCenter,
        amount: sql<number>`coalesce(sum(${expense.amount}::numeric), 0)::float`,
      })
      .from(expense)
      .leftJoin(department, eq(department.id, expense.departmentId))
      .where(and(...conditions))
      .groupBy(
        expense.category,
        expense.departmentId,
        department.departmentName,
        expense.costCenter,
      );
  }

  async getPurchaseInvoiceTotals(
    organizationId: number,
    period: { from?: string; to?: string } = {},
  ) {
    const conditions = [
      eq(purchaseInvoice.organizationId, organizationId),
      eq(purchaseInvoice.isDeleted, false),
    ];
    if (period.from) conditions.push(gte(isoDate(purchaseInvoice.billDate), period.from));
    if (period.to) conditions.push(lte(isoDate(purchaseInvoice.billDate), period.to));

    return db
      .select({
        supplierName: purchaseInvoice.supplierName,
        status: purchaseInvoice.status,
        amount: sql<number>`coalesce(sum(${purchaseInvoice.amount}::numeric), 0)::float`,
      })
      .from(purchaseInvoice)
      .where(and(...conditions))
      .groupBy(purchaseInvoice.supplierName, purchaseInvoice.status);
  }

  async getInvoicePaymentTotals(
    organizationId: number,
    period: { from?: string; to?: string } = {},
  ) {
    const conditions = [
      eq(invoicePayment.organizationId, organizationId),
      eq(invoicePayment.isDeleted, false),
      eq(invoicePayment.status, "Complete"),
    ];
    if (period.from) conditions.push(gte(isoDate(invoicePayment.paymentDate), period.from));
    if (period.to) conditions.push(lte(isoDate(invoicePayment.paymentDate), period.to));

    const [row] = await db
      .select({
        amount: sql<number>`coalesce(sum(${invoicePayment.amount}::numeric), 0)::float`,
      })
      .from(invoicePayment)
      .where(and(...conditions));
    return Number(row?.amount || 0);
  }

  async getReimbursedExpenseTotal(
    organizationId: number,
    period: { from?: string; to?: string } = {},
  ) {
    const conditions = [
      eq(expense.organizationId, organizationId),
      eq(expense.isDeleted, false),
      eq(expense.status, "Reimbursed"),
    ];
    if (period.from) conditions.push(gte(isoDate(expense.expenseDate), period.from));
    if (period.to) conditions.push(lte(isoDate(expense.expenseDate), period.to));

    const [row] = await db
      .select({
        amount: sql<number>`coalesce(sum(${expense.amount}::numeric), 0)::float`,
      })
      .from(expense)
      .where(and(...conditions));
    return Number(row?.amount || 0);
  }

  async getPaidPurchaseTotal(
    organizationId: number,
    period: { from?: string; to?: string } = {},
  ) {
    const conditions = [
      eq(purchaseInvoice.organizationId, organizationId),
      eq(purchaseInvoice.isDeleted, false),
      eq(purchaseInvoice.status, "Paid"),
    ];
    if (period.from) conditions.push(gte(isoDate(purchaseInvoice.billDate), period.from));
    if (period.to) conditions.push(lte(isoDate(purchaseInvoice.billDate), period.to));

    const [row] = await db
      .select({
        amount: sql<number>`coalesce(sum(${purchaseInvoice.amount}::numeric), 0)::float`,
      })
      .from(purchaseInvoice)
      .where(and(...conditions));
    return Number(row?.amount || 0);
  }

  async getOutstandingSalesInvoices(organizationId: number, asOf: string) {
    const [row] = await db
      .select({
        amount: sql<number>`coalesce(sum(${salesInvoice.amount}::numeric), 0)::float`,
      })
      .from(salesInvoice)
      .where(
        and(
          eq(salesInvoice.organizationId, organizationId),
          eq(salesInvoice.isDeleted, false),
          lte(isoDate(salesInvoice.invoiceDate), asOf),
          inArray(salesInvoice.status, ["Pending", "Overdue"]),
        ),
      );
    return Number(row?.amount || 0);
  }

  async getOutstandingPurchaseInvoices(organizationId: number, asOf: string) {
    const [row] = await db
      .select({
        amount: sql<number>`coalesce(sum(${purchaseInvoice.amount}::numeric), 0)::float`,
      })
      .from(purchaseInvoice)
      .where(
        and(
          eq(purchaseInvoice.organizationId, organizationId),
          eq(purchaseInvoice.isDeleted, false),
          lte(isoDate(purchaseInvoice.billDate), asOf),
          inArray(purchaseInvoice.status, ["Pending", "Overdue"]),
        ),
      );
    return Number(row?.amount || 0);
  }

  async getExpenseCategories(organizationId: number) {
    return db
      .select({
        id: expenseCategory.id,
        name: expenseCategory.name,
        monthlyBudget: expenseCategory.monthlyBudget,
      })
      .from(expenseCategory)
      .where(
        and(
          eq(expenseCategory.organizationId, organizationId),
          eq(expenseCategory.isDeleted, false),
        ),
      )
      .orderBy(asc(expenseCategory.name));
  }

  async sumSalesInvoicesBefore(organizationId: number, beforeDate: string) {
    const [row] = await db
      .select({
        amount: sql<number>`coalesce(sum(${salesInvoice.amount}::numeric), 0)::float`,
      })
      .from(salesInvoice)
      .where(
        and(
          eq(salesInvoice.organizationId, organizationId),
          eq(salesInvoice.isDeleted, false),
          lt(isoDate(salesInvoice.invoiceDate), beforeDate),
        ),
      );
    return Number(row?.amount || 0);
  }

  async sumExpensesBefore(organizationId: number, beforeDate: string) {
    const [row] = await db
      .select({
        amount: sql<number>`coalesce(sum(${expense.amount}::numeric), 0)::float`,
      })
      .from(expense)
      .where(
        and(
          eq(expense.organizationId, organizationId),
          eq(expense.isDeleted, false),
          inArray(expense.status, ["Submitted", "Manager Approved", "Approved", "Reimbursed"]),
          lt(isoDate(expense.expenseDate), beforeDate),
        ),
      );
    return Number(row?.amount || 0);
  }

  async sumPurchasesBefore(organizationId: number, beforeDate: string) {
    const [row] = await db
      .select({
        amount: sql<number>`coalesce(sum(${purchaseInvoice.amount}::numeric), 0)::float`,
      })
      .from(purchaseInvoice)
      .where(
        and(
          eq(purchaseInvoice.organizationId, organizationId),
          eq(purchaseInvoice.isDeleted, false),
          lt(isoDate(purchaseInvoice.billDate), beforeDate),
        ),
      );
    return Number(row?.amount || 0);
  }
}
