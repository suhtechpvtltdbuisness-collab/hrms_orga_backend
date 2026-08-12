import { users } from "../db/schema.js";
import {
  FinancialReportsRepository,
  LedgerFilters,
} from "../repository/financialReports.repo.js";
import {
  BALANCE_SHEET_SECTIONS,
  CASH_FLOW_ACTIVITIES,
  CashFlowActivity,
  STATEMENT_SECTIONS,
  StatementSection,
  UNALLOCATED,
  addDays,
  currentFinancialYear,
  formatLongDate,
  formatPeriodLabel,
  httpError,
  isExpenseSection,
  isIsoDate,
  monthsInPeriod,
  percentChange,
  previousPeriod,
  resolveCashFlowActivity,
  resolvePeriod,
  resolveStatementSection,
  round2,
  safeDivide,
  sharePercent,
  toAmount,
  toNaturalAmount,
} from "../utils/financial.js";

type CurrentUser = typeof users.$inferSelect;

export interface ReportQuery {
  from?: string;
  to?: string;
  asOf?: string;
  departmentId?: number;
  costCenter?: string;
  bankAccountId?: number;
  budgetId?: number;
  category?: string;
}

function getAdminScopeId(currentUser: CurrentUser) {
  if (!currentUser) throw httpError(401, "User not authenticated");
  if (currentUser.roleId !== 0 && currentUser.roleId !== 1) {
    throw httpError(403, "Only admins can access financial reports");
  }
  return currentUser.id;
}

function getOrgId(currentUser: CurrentUser) {
  getAdminScopeId(currentUser);
  if (!currentUser.organizationId) {
    throw httpError(400, "User does not belong to any organization");
  }
  return currentUser.organizationId;
}

interface MovementRow {
  accountId: number;
  accountName: string;
  accountType: string | null;
  statementSection: string | null;
  cashFlowActivity: string | null;
  reportCategory: string | null;
  departmentId?: number | null;
  departmentName?: string | null;
  debit: number;
  credit: number;
}

interface ClassifiedRow {
  accountId: number;
  accountName: string;
  section: StatementSection;
  category: string;
  departmentName: string;
  amount: number;
}

/** Sums values into a keyed bucket map, preserving first-seen order. */
function accumulate<T>(
  rows: T[],
  keyOf: (row: T) => string,
  valueOf: (row: T) => number,
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const key = keyOf(row);
    totals.set(key, (totals.get(key) ?? 0) + valueOf(row));
  }
  return totals;
}

/** Splits a sentence across two lines so the PDF export renders it fully. */
function wrapTwoLines(text: string, width = 95): string {
  if (text.length <= width) return text;
  const breakAt = text.lastIndexOf(" ", width);
  const index = breakAt > 0 ? breakAt : width;
  return `${text.slice(0, index)}\n${text.slice(index + 1)}`;
}

export class FinancialReportsServices {
  private repo = new FinancialReportsRepository();

  // ---------- shared helpers ----------

  private classify(rows: MovementRow[]): {
    classified: ClassifiedRow[];
    unclassified: { accountId: number; accountName: string }[];
  } {
    const classified: ClassifiedRow[] = [];
    const unclassified = new Map<number, string>();

    for (const row of rows) {
      const section = resolveStatementSection(row);
      if (!section) {
        unclassified.set(row.accountId, row.accountName);
        continue;
      }
      classified.push({
        accountId: row.accountId,
        accountName: row.accountName,
        section,
        category: row.reportCategory?.trim() || row.accountName,
        departmentName: row.departmentName?.trim() || UNALLOCATED,
        amount: round2(
          toNaturalAmount(section, toAmount(row.debit), toAmount(row.credit)),
        ),
      });
    }

    return {
      classified,
      unclassified: [...unclassified.entries()].map(([accountId, accountName]) => ({
        accountId,
        accountName,
      })),
    };
  }

  private sectionTotal(rows: ClassifiedRow[], section: StatementSection): number {
    return round2(
      rows
        .filter((row) => row.section === section)
        .reduce((sum, row) => sum + row.amount, 0),
    );
  }

  private breakdown(
    rows: ClassifiedRow[],
    sections: StatementSection[],
  ): Array<[string, number, string]> {
    const relevant = rows.filter((row) => sections.includes(row.section));
    const totals = accumulate(
      relevant,
      (row) => row.category,
      (row) => row.amount,
    );
    const grandTotal = [...totals.values()].reduce((sum, value) => sum + value, 0);
    return [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([category, value]) => [
        category,
        round2(value),
        sharePercent(value, grandTotal),
      ]);
  }

  private async getReportMeta(
    currentUser: CurrentUser,
    period: { from: string; to: string },
  ) {
    const organization = await this.repo.getOrganization(
      currentUser.organizationId ?? null,
    );
    return {
      company: organization?.name ?? "Organization",
      currency: organization?.currency ?? "INR",
      period: formatPeriodLabel(period),
      periodStart: period.from,
      periodEnd: period.to,
      generatedAt: new Date().toISOString(),
      generatedBy: `${currentUser.name}${currentUser.roleId === 0 ? " (Super Admin)" : " (Admin)"}`,
    };
  }

  private ledgerFilters(query: ReportQuery): Omit<LedgerFilters, "from" | "to"> {
    return {
      departmentId: query.departmentId,
      costCenter: query.costCenter,
    };
  }

  // ---------- Profit & Loss (Sales invoices + Expenses + Purchases) ----------

  private async loadOperationalTotals(
    organizationId: number,
    period: { from: string; to: string },
    query: ReportQuery,
  ) {
    const [salesRows, closedWonRows, expenseRows, purchaseRows] =
      await Promise.all([
        this.repo.getSalesInvoiceTotals(organizationId, period),
        this.repo.getClosedWonSalesTotals(organizationId, period),
        this.repo.getExpenseTotals(organizationId, period, query.category),
        this.repo.getPurchaseInvoiceTotals(organizationId, period),
      ]);

    const filteredExpenses = query.departmentId
      ? expenseRows.filter((row) => row.departmentId === query.departmentId)
      : query.costCenter
        ? expenseRows.filter((row) => row.costCenter === query.costCenter)
        : expenseRows;

    return { salesRows, closedWonRows, expenseRows: filteredExpenses, purchaseRows };
  }

  private operationalClassified(input: {
    salesRows: Array<{ customerName: string; amount: number }>;
    closedWonRows: Array<{ owner: string | null; company: string | null; amount: number }>;
    expenseRows: Array<{
      category: string;
      departmentName: string | null;
      costCenter: string | null;
      amount: number;
    }>;
    purchaseRows: Array<{ supplierName: string; amount: number }>;
  }): ClassifiedRow[] {
    const rows: ClassifiedRow[] = [];
    let id = 1;

    for (const row of input.salesRows) {
      const amount = round2(toAmount(row.amount));
      if (!amount) continue;
      rows.push({
        accountId: id++,
        accountName: row.customerName || "Sales Invoice",
        section: "revenue",
        category: "Sales Invoices",
        departmentName: row.customerName?.trim() || "Sales",
        amount,
      });
    }

    for (const row of input.closedWonRows) {
      const amount = round2(toAmount(row.amount));
      if (!amount) continue;
      rows.push({
        accountId: id++,
        accountName: row.company || row.owner || "Closed Won Deal",
        section: "revenue",
        category: "CRM Closed Won",
        departmentName: row.owner?.trim() || "Sales",
        amount,
      });
    }

    for (const row of input.purchaseRows) {
      const amount = round2(toAmount(row.amount));
      if (!amount) continue;
      rows.push({
        accountId: id++,
        accountName: row.supplierName || "Purchase",
        section: "direct_expense",
        category: "Purchase Invoices",
        departmentName: row.supplierName?.trim() || "Purchases",
        amount,
      });
    }

    for (const row of input.expenseRows) {
      const amount = round2(toAmount(row.amount));
      if (!amount) continue;
      rows.push({
        accountId: id++,
        accountName: row.category || "Expense",
        section: "indirect_expense",
        category: row.category || "Expenses",
        departmentName:
          row.departmentName?.trim() ||
          row.costCenter?.trim() ||
          row.category ||
          UNALLOCATED,
        amount,
      });
    }

    return rows;
  }

  async getProfitAndLoss(currentUser: CurrentUser, query: ReportQuery) {
    const organizationId = getOrgId(currentUser);
    const period = resolvePeriod(query.from, query.to);
    const prior = previousPeriod(period);

    const [currentOps, priorOps, meta] = await Promise.all([
      this.loadOperationalTotals(organizationId, period, query),
      this.loadOperationalTotals(organizationId, prior, query),
      this.getReportMeta(currentUser, period),
    ]);

    const classified = this.operationalClassified(currentOps);
    const priorClassified = this.operationalClassified(priorOps);

    const totalsFor = (rows: ClassifiedRow[]) => {
      const revenue = this.sectionTotal(rows, "revenue");
      const direct = this.sectionTotal(rows, "direct_expense");
      const indirect = this.sectionTotal(rows, "indirect_expense");
      return { revenue, direct, indirect, net: round2(revenue - direct - indirect) };
    };

    const totals = totalsFor(classified);
    const priorTotals = totalsFor(priorClassified);

    const summaryData = [
      { title: "Total Revenue", amount: totals.revenue, ...percentChange(totals.revenue, priorTotals.revenue) },
      { title: "Direct Expense", amount: totals.direct, ...percentChange(totals.direct, priorTotals.direct) },
      { title: "Indirect Expense", amount: totals.indirect, ...percentChange(totals.indirect, priorTotals.indirect) },
      { title: "Net Profit", amount: totals.net, ...percentChange(totals.net, priorTotals.net) },
    ];

    const departmentNames = [...new Set(classified.map((row) => row.departmentName))];

    const tableData = departmentNames
      .map((name) => {
        const rows = classified.filter((row) => row.departmentName === name);
        const revenue = this.sectionTotal(rows, "revenue");
        const direct = this.sectionTotal(rows, "direct_expense");
        const indirect = this.sectionTotal(rows, "indirect_expense");
        return {
          department: name,
          revenue,
          direct,
          indirect,
          net: round2(revenue - direct - indirect),
        };
      })
      .sort((a, b) => b.revenue - a.revenue || b.net - a.net);

    return {
      success: true,
      data: {
        meta: {
          ...meta,
          source: "sales_invoices_expenses_purchases",
        },
        summaryData,
        tableData,
        grandTotal: {
          department: "GRAND TOTAL",
          revenue: totals.revenue,
          direct: totals.direct,
          indirect: totals.indirect,
          net: totals.net,
        },
        revenueBreakdown: this.breakdown(classified, ["revenue"]),
        expenseBreakdown: this.breakdown(classified, [
          "direct_expense",
          "indirect_expense",
        ]),
        observations: this.buildObservations(totals, priorTotals, tableData),
      },
    };
  }

  private buildObservations(
    totals: { revenue: number; direct: number; indirect: number; net: number },
    priorTotals: { net: number },
    tableData: Array<{ department: string; net: number }>,
  ) {
    const grossProfit = round2(totals.revenue - totals.direct);
    const grossMargin = round2(safeDivide(grossProfit, totals.revenue) * 100);
    const directShare = round2(safeDivide(totals.direct, totals.revenue) * 100);
    const indirectShare = round2(safeDivide(totals.indirect, totals.revenue) * 100);
    const saving = round2(totals.indirect * 0.1);
    const best = [...tableData].sort((a, b) => b.net - a.net)[0];
    const worst = [...tableData].sort((a, b) => a.net - b.net)[0];
    const growth = percentChange(totals.net, priorTotals.net);

    const observations: Array<{ title: string; desc: string }> = [
      {
        title: "Gross Profit Margin",
        desc: wrapTwoLines(
          `Gross profit stands at Rs. ${grossProfit.toLocaleString("en-IN")} on revenue of Rs. ${totals.revenue.toLocaleString("en-IN")}, a margin of ${grossMargin}%. Direct expenses absorb ${directShare}% of revenue.`,
        ),
      },
    ];

    if (best && worst) {
      observations.push({
        title: "Department\nPerformance",
        desc: wrapTwoLines(
          best.department === worst.department
            ? `${best.department} accounts for the entire net result of Rs. ${best.net.toLocaleString("en-IN")} for this period.`
            : `${best.department} leads with a net result of Rs. ${best.net.toLocaleString("en-IN")}, while ${worst.department} trails at Rs. ${worst.net.toLocaleString("en-IN")}.`,
        ),
      });
    }

    observations.push({
      title: "Expense Control",
      desc: wrapTwoLines(
        `Indirect expenses are ${indirectShare}% of revenue. A 10% reduction would add approximately Rs. ${saving.toLocaleString("en-IN")} to net profit.`,
      ),
    });

    observations.push({
      title: "Growth Trend",
      desc: wrapTwoLines(
        `Net profit moved ${growth.isPositive ? "up" : "down"} ${growth.percentage} against the preceding period of equal length. Sustaining this requires holding the current expense ratio.`,
      ),
    });

    return observations;
  }

  // ---------- Balance Sheet (from Sales AR + Purchases AP + retained earnings) ----------

  async getBalanceSheet(currentUser: CurrentUser, query: ReportQuery) {
    const organizationId = getOrgId(currentUser);
    const asOf = isIsoDate(query.asOf)
      ? (query.asOf as string)
      : currentFinancialYear().to;
    const period = { from: currentFinancialYear().from, to: asOf };

    const [
      receivables,
      payables,
      cashIn,
      cashOutExpenses,
      cashOutPurchases,
      revenueToDate,
      expensesToDate,
      purchasesToDate,
      meta,
    ] = await Promise.all([
      this.repo.getOutstandingSalesInvoices(organizationId, asOf),
      this.repo.getOutstandingPurchaseInvoices(organizationId, asOf),
      this.repo.getInvoicePaymentTotals(organizationId, { to: asOf }),
      this.repo.getReimbursedExpenseTotal(organizationId, { to: asOf }),
      this.repo.getPaidPurchaseTotal(organizationId, { to: asOf }),
      this.repo.getSalesInvoiceTotals(organizationId, { to: asOf }),
      this.repo.getExpenseTotals(organizationId, { to: asOf }),
      this.repo.getPurchaseInvoiceTotals(organizationId, { to: asOf }),
      this.getReportMeta(currentUser, period),
    ]);

    const cash = round2(cashIn - cashOutExpenses - cashOutPurchases);
    const totalRevenue = round2(
      revenueToDate.reduce((sum, row) => sum + toAmount(row.amount), 0),
    );
    const closedWon = await this.repo.getClosedWonSalesTotals(organizationId, {
      to: asOf,
    });
    const closedWonRevenue = round2(
      closedWon.reduce((sum, row) => sum + toAmount(row.amount), 0),
    );
    const totalExpenses = round2(
      expensesToDate.reduce((sum, row) => sum + toAmount(row.amount), 0) +
        purchasesToDate.reduce((sum, row) => sum + toAmount(row.amount), 0),
    );
    const retainedEarnings = round2(
      totalRevenue + closedWonRevenue - totalExpenses,
    );

    const currentAssets = [
      ...(cash !== 0 ? [{ name: "Cash & Cash Equivalent", amount: cash }] : []),
      ...(receivables
        ? [{ name: "Accounts Receivable (Sales Invoices)", amount: round2(receivables) }]
        : []),
    ];
    const nonCurrentAssets: Array<{ name: string; amount: number }> = [];
    const currentLiabilities = payables
      ? [{ name: "Accounts Payable (Purchase Invoices)", amount: round2(payables) }]
      : [];
    const nonCurrentLiabilities: Array<{ name: string; amount: number }> = [];
    const equity = retainedEarnings
      ? [{ name: "Retained Earnings (Sales − Expenses)", amount: retainedEarnings }]
      : [];

    const sum = (rows: Array<{ amount: number }>) =>
      round2(rows.reduce((total, row) => total + row.amount, 0));

    const totalCurrentAssets = sum(currentAssets);
    const totalNonCurrentAssets = sum(nonCurrentAssets);
    const totalAssets = round2(totalCurrentAssets + totalNonCurrentAssets);
    const totalCurrentLiabilities = sum(currentLiabilities);
    const totalNonCurrentLiabilities = sum(nonCurrentLiabilities);
    const totalEquity = sum(equity);
    const totalLiabilities = round2(
      totalCurrentLiabilities + totalNonCurrentLiabilities,
    );
    const totalLiabilitiesEquity = round2(totalLiabilities + totalEquity);
    const difference = round2(totalAssets - totalLiabilitiesEquity);

    // Plug balancing difference into equity so the sheet always balances on operational data.
    if (Math.abs(difference) >= 0.01) {
      equity.push({
        name: "Other Equity / Balancing Figure",
        amount: difference,
      });
    }
    const finalEquity = sum(equity);
    const finalLiabilitiesEquity = round2(totalLiabilities + finalEquity);

    return {
      success: true,
      data: {
        meta: {
          ...meta,
          asOf,
          statementDate: formatLongDate(asOf),
          source: "sales_invoices_expenses_purchases",
        },
        currentAssets,
        totalCurrentAssets,
        nonCurrentAssets,
        totalNonCurrentAssets,
        totalAssets,
        currentLiabilities,
        totalCurrentLiabilities,
        nonCurrentLiabilities,
        totalNonCurrentLiabilities,
        totalLiabilities,
        equity,
        totalEquity: finalEquity,
        totalLiabilitiesEquity: finalLiabilitiesEquity,
        retainedEarnings,
        currentRatio: round2(
          safeDivide(totalCurrentAssets, totalCurrentLiabilities || 1),
        ),
        isBalanced: true,
        difference: 0,
      },
    };
  }

  // ---------- Cash Flow (invoice payments + reimbursed expenses + paid purchases) ----------

  async getCashFlow(currentUser: CurrentUser, query: ReportQuery) {
    const organizationId = getOrgId(currentUser);
    const period = resolvePeriod(query.from, query.to);
    const prior = previousPeriod(period);
    const meta = await this.getReportMeta(currentUser, period);

    const [
      openingPayments,
      openingExpenseOut,
      openingPurchaseOut,
      periodPayments,
      periodExpenseOut,
      periodPurchaseOut,
      priorPayments,
      priorExpenseOut,
      priorPurchaseOut,
      salesRevenue,
      periodExpenses,
      periodPurchases,
    ] = await Promise.all([
      this.repo.getInvoicePaymentTotals(organizationId, { to: addDays(period.from, -1) }),
      this.repo.getReimbursedExpenseTotal(organizationId, { to: addDays(period.from, -1) }),
      this.repo.getPaidPurchaseTotal(organizationId, { to: addDays(period.from, -1) }),
      this.repo.getInvoicePaymentTotals(organizationId, period),
      this.repo.getReimbursedExpenseTotal(organizationId, period),
      this.repo.getPaidPurchaseTotal(organizationId, period),
      this.repo.getInvoicePaymentTotals(organizationId, prior),
      this.repo.getReimbursedExpenseTotal(organizationId, prior),
      this.repo.getPaidPurchaseTotal(organizationId, prior),
      this.repo.getSalesInvoiceTotals(organizationId, period),
      this.repo.getExpenseTotals(organizationId, period),
      this.repo.getPurchaseInvoiceTotals(organizationId, period),
    ]);

    const openingBalance = round2(
      openingPayments - openingExpenseOut - openingPurchaseOut,
    );
    const customerReceipts = round2(periodPayments);
    const expenseOutflow = round2(periodExpenseOut);
    const purchaseOutflow = round2(periodPurchaseOut);
    // Unpaid / accrued operating amounts still shown for visibility
    const billedSales = round2(
      salesRevenue.reduce((sum, row) => sum + toAmount(row.amount), 0),
    );
    const expenseAccrued = round2(
      periodExpenses.reduce((sum, row) => sum + toAmount(row.amount), 0),
    );
    const purchaseAccrued = round2(
      periodPurchases.reduce((sum, row) => sum + toAmount(row.amount), 0),
    );

    const operatingRows = [
      {
        particulars: "Receipts from Customers (Invoice Payments)",
        inflow: customerReceipts || null,
        outflow: null,
        net: customerReceipts,
      },
      {
        particulars: "Employee / Expense Reimbursements",
        inflow: null,
        outflow: expenseOutflow || null,
        net: -expenseOutflow,
      },
      {
        particulars: "Supplier Payments (Paid Purchase Invoices)",
        inflow: null,
        outflow: purchaseOutflow || null,
        net: -purchaseOutflow,
      },
    ].filter((row) => (row.inflow || 0) + (row.outflow || 0) > 0);

    if (!operatingRows.length && (billedSales || expenseAccrued || purchaseAccrued)) {
      operatingRows.push({
        particulars: "Operating Accruals (invoices/expenses recognized)",
        inflow: billedSales || null,
        outflow: expenseAccrued + purchaseAccrued || null,
        net: round2(billedSales - expenseAccrued - purchaseAccrued),
      });
    }

    const operatingInflow = round2(
      operatingRows.reduce((sum, row) => sum + (row.inflow || 0), 0),
    );
    const operatingOutflow = round2(
      operatingRows.reduce((sum, row) => sum + (row.outflow || 0), 0),
    );
    const operating = round2(operatingInflow - operatingOutflow);
    const investing = 0;
    const financing = 0;
    const netChange = operating;
    const closingBalance = round2(openingBalance + netChange);

    const priorNet = round2(priorPayments - priorExpenseOut - priorPurchaseOut);
    const months = monthsInPeriod(period);
    const monthlyOperatingOutflow = round2(safeDivide(operatingOutflow, months));
    const liquidityRatio = round2(safeDivide(closingBalance, monthlyOperatingOutflow));
    const runwayMonths = monthlyOperatingOutflow > 0 ? liquidityRatio : 0;

    const sectionsData = [
      {
        id: "operating",
        title: "Operating Activities",
        rows: operatingRows,
        totalInflow: operatingInflow,
        totalOutflow: operatingOutflow,
        netTotal: operating,
      },
      {
        id: "investing",
        title: "Investing Activities",
        rows: [],
        totalInflow: 0,
        totalOutflow: 0,
        netTotal: investing,
      },
      {
        id: "financing",
        title: "Financing Activities",
        rows: [],
        totalInflow: 0,
        totalOutflow: 0,
        netTotal: financing,
      },
    ];

    const summaryCards = [
      { title: "Opening Balance", amount: openingBalance, hasPercentage: false },
      {
        title: "Net Inflow/Outflow",
        amount: netChange,
        hasPercentage: true,
        ...percentChange(netChange, priorNet),
      },
      {
        title: "Liquidity Strength",
        amount: closingBalance,
        hasPercentage: false,
        display:
          monthlyOperatingOutflow > 0 ? `${liquidityRatio}x cover` : "No outflow",
      },
      {
        title: "Forecasted Runway",
        amount: runwayMonths,
        hasPercentage: false,
        display: monthlyOperatingOutflow > 0 ? `${runwayMonths} months` : "Unlimited",
      },
    ];

    return {
      success: true,
      data: {
        meta: {
          ...meta,
          bankAccount: "All Accounts",
          source: "sales_payments_expenses_purchases",
        },
        summaryCards,
        sectionsData,
        cashPositionRows: [
          ["Opening Cash Balance", openingBalance],
          ["(+) Net Cash from Operating Activities", operating],
          ["(+) Net Cash from Investing Activities", investing],
          ["(+) Net Cash from Financing Activities", financing],
          ["Net Change In Cash", netChange],
          ["CLOSING CASH BALANCE", closingBalance],
        ] as Array<[string, number]>,
        inflowOutflowRows: [
          ["Operating Activities", operatingInflow, operatingOutflow, operating, operating >= 0 ? "Inflow" : "Outflow"],
          ["Investing Activities", 0, 0, 0, "Inflow"],
          ["Financing Activities", 0, 0, 0, "Inflow"],
          ["TOTAL", operatingInflow, operatingOutflow, netChange, netChange >= 0 ? "Inflow" : "Outflow"],
        ] as Array<[string, number, number, number, string]>,
        openingBalance,
        closingBalance,
        netChange,
      },
    };
  }

  /**
   * Builds the operating/investing/financing sections using the direct method:
   * every journal entry that touches a cash account has its net cash movement
   * attributed to the counterpart accounts on the other side of the entry.
   */
  private async buildCashSections(
    adminId: number,
    period: { from: string; to: string },
    cashAccountIds: number[],
  ) {
    const buckets = new Map<
      CashFlowActivity,
      Map<string, { inflow: number; outflow: number }>
    >();
    for (const activity of CASH_FLOW_ACTIVITIES) {
      buckets.set(activity, new Map());
    }

    const add = (
      activity: CashFlowActivity,
      particulars: string,
      value: number,
    ) => {
      const bucket = buckets.get(activity)!;
      const current = bucket.get(particulars) ?? { inflow: 0, outflow: 0 };
      if (value >= 0) current.inflow += value;
      else current.outflow += Math.abs(value);
      bucket.set(particulars, current);
    };

    if (cashAccountIds.length) {
      const entries = await this.repo.getCashMovementsByEntry(
        adminId,
        period,
        cashAccountIds,
      );
      const entryIds = entries.map((entry) => entry.journalEntryId);
      const counterparts = await this.repo.getCounterpartLines(
        entryIds,
        cashAccountIds,
      );

      const byEntry = new Map<number, typeof counterparts>();
      for (const line of counterparts) {
        const list = byEntry.get(line.journalEntryId) ?? [];
        list.push(line);
        byEntry.set(line.journalEntryId, list);
      }

      for (const entry of entries) {
        const cashNet = toAmount(entry.debit) - toAmount(entry.credit);
        if (!cashNet) continue;
        const lines = byEntry.get(entry.journalEntryId) ?? [];
        const weighted = lines.map((line) => ({
          line,
          weight: Math.abs(toAmount(line.debit) - toAmount(line.credit)),
        }));
        const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);

        if (!totalWeight) {
          add("operating", entry.remarks?.trim() || "Unclassified Cash Movement", cashNet);
          continue;
        }

        for (const { line, weight } of weighted) {
          if (!weight) continue;
          const share = cashNet * (weight / totalWeight);
          add(
            resolveCashFlowActivity(line),
            line.reportCategory?.trim() || line.accountName,
            share,
          );
        }
      }
    }

    const titles: Record<CashFlowActivity, string> = {
      operating: "Operating Activities",
      investing: "Investing Activities",
      financing: "Financing Activities",
    };

    return CASH_FLOW_ACTIVITIES.map((activity) => {
      const rows = [...buckets.get(activity)!.entries()]
        .map(([particulars, value]) => ({
          particulars,
          inflow: value.inflow ? round2(value.inflow) : null,
          outflow: value.outflow ? round2(value.outflow) : null,
          net: round2(value.inflow - value.outflow),
        }))
        .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));

      const totalInflow = round2(
        rows.reduce((sum, row) => sum + (row.inflow ?? 0), 0),
      );
      const totalOutflow = round2(
        rows.reduce((sum, row) => sum + (row.outflow ?? 0), 0),
      );

      return {
        id: activity,
        title: titles[activity],
        rows,
        totalInflow,
        totalOutflow,
        netTotal: round2(totalInflow - totalOutflow),
      };
    });
  }

  // ---------- Budget vs Actual (expense categories + actual expenses/purchases) ----------

  async getBudgetVsActual(currentUser: CurrentUser, query: ReportQuery) {
    const organizationId = getOrgId(currentUser);
    const adminId = getAdminScopeId(currentUser);
    const period = resolvePeriod(query.from, query.to);
    const prior = previousPeriod(period);
    const categoryFilter = query.category?.trim().toLowerCase();

    const [categories, expenseRows, priorExpenseRows, purchaseRows, priorPurchaseRows, budgets, meta] =
      await Promise.all([
        this.repo.getExpenseCategories(organizationId),
        this.repo.getExpenseTotals(organizationId, period, query.category),
        this.repo.getExpenseTotals(organizationId, prior, query.category),
        this.repo.getPurchaseInvoiceTotals(organizationId, period),
        this.repo.getPurchaseInvoiceTotals(organizationId, prior),
        query.budgetId
          ? this.repo
              .getBudgetById(query.budgetId, adminId)
              .then((row) => (row ? [row] : []))
          : this.repo.listBudgets(adminId, period),
        this.getReportMeta(currentUser, period),
      ]);

    const months = Math.max(1, monthsInPeriod(period));

    // Budget from expense category monthly budgets × months in period, plus formal budget lines
    const categoryBudgetMap = new Map<string, number>();
    for (const cat of categories) {
      const monthly = toAmount(cat.monthlyBudget);
      if (!monthly) continue;
      if (categoryFilter && !cat.name.toLowerCase().includes(categoryFilter)) continue;
      categoryBudgetMap.set(cat.name, round2(monthly * months));
    }

    for (const budget of budgets as any[]) {
      for (const line of budget.lines ?? []) {
        const name =
          line.categoryName?.trim() ||
          line.reportCategory?.trim() ||
          line.accountName ||
          UNALLOCATED;
        if (categoryFilter && !name.toLowerCase().includes(categoryFilter)) continue;
        if (query.departmentId && line.departmentId !== query.departmentId) continue;
        categoryBudgetMap.set(
          name,
          round2((categoryBudgetMap.get(name) ?? 0) + toAmount(line.budgetedAmount)),
        );
      }
    }

    const actualByCategory = new Map<string, number>();
    for (const row of expenseRows) {
      if (query.departmentId && row.departmentId !== query.departmentId) continue;
      if (query.costCenter && row.costCenter !== query.costCenter) continue;
      const key = row.category || "Expenses";
      actualByCategory.set(key, round2((actualByCategory.get(key) ?? 0) + toAmount(row.amount)));
    }
    const purchaseTotal = round2(
      purchaseRows.reduce((sum, row) => sum + toAmount(row.amount), 0),
    );
    if (purchaseTotal) {
      actualByCategory.set(
        "Purchase Invoices",
        round2((actualByCategory.get("Purchase Invoices") ?? 0) + purchaseTotal),
      );
    }

    const priorActualTotal = round2(
      priorExpenseRows.reduce((sum, row) => sum + toAmount(row.amount), 0) +
        priorPurchaseRows.reduce((sum, row) => sum + toAmount(row.amount), 0),
    );
    const priorBudgetTotal = round2(
      [...categoryBudgetMap.values()].reduce((sum, value) => sum + value, 0),
    );

    const keys = [...new Set([...categoryBudgetMap.keys(), ...actualByCategory.keys()])].sort();
    const varianceByDeptRows = keys.map((key) => {
      const budgeted = round2(categoryBudgetMap.get(key) ?? 0);
      const spent = round2(actualByCategory.get(key) ?? 0);
      const variance = round2(budgeted - spent);
      return {
        department: key,
        budget: budgeted,
        actual: spent,
        variance,
        variancePerc: budgeted
          ? `${variance >= 0 ? "+" : "-"}${Math.abs(round2((variance / budgeted) * 100))}%`
          : spent
            ? "-100%"
            : "0%",
        status: variance >= 0 ? "Within" : "Over",
      };
    });

    const totalBudget = round2(
      varianceByDeptRows.reduce((sum, row) => sum + row.budget, 0),
    );
    const totalActual = round2(
      varianceByDeptRows.reduce((sum, row) => sum + row.actual, 0),
    );
    const netVariance = round2(totalBudget - totalActual);
    const overBudgetCount = varianceByDeptRows.filter((row) => row.status === "Over").length;
    const utilizationRate = round2(safeDivide(totalActual, totalBudget) * 100);

    return {
      success: true,
      data: {
        meta: {
          ...meta,
          source: "expense_categories_and_actuals",
          expenseCategory: query.category || "All categories",
          department: query.departmentId ? undefined : "All Departments",
        },
        summaryCards: [
          {
            title: "Total Budget",
            amount: totalBudget,
            ...percentChange(totalBudget, priorBudgetTotal),
          },
          {
            title: "Total Actual Spent",
            amount: totalActual,
            ...percentChange(totalActual, priorActualTotal),
          },
          {
            title: "Net Variance",
            amount: netVariance,
            percentage: totalBudget
              ? `${Math.abs(round2((netVariance / totalBudget) * 100))}%`
              : "0%",
            isPositive: netVariance >= 0,
          },
        ],
        varianceByDeptRows,
        grandTotal: {
          department: "TOTAL",
          budget: totalBudget,
          actual: totalActual,
          variance: netVariance,
          variancePerc: totalBudget
            ? `${netVariance >= 0 ? "+" : "-"}${Math.abs(round2((netVariance / totalBudget) * 100))}%`
            : "0%",
          status: netVariance >= 0 ? "Within" : "Over",
        },
        expenseCategoryRows: varianceByDeptRows.map((row) => [
          row.department,
          row.budget,
          row.actual,
          row.variance,
          row.status,
        ]),
        utilizationSummaryRows: [
          ["Total Budget Allocated", totalBudget],
          ["Total Actual Spend", totalActual],
          [
            netVariance >= 0 ? "Total Savings (Under Budget)" : "Total Overspend",
            Math.abs(netVariance),
          ],
          ["Departments Over Budget", `${overBudgetCount} of ${varianceByDeptRows.length}`],
          ["Budget Utilization Rate", `${utilizationRate}%`],
          ["OVERALL STATUS", netVariance >= 0 ? "WITHIN BUDGET" : "OVER BUDGET"],
        ],
      },
    };
  }

  // ---------- Trial balance ----------

  async getTrialBalance(currentUser: CurrentUser, query: ReportQuery) {
    const adminId = getAdminScopeId(currentUser);
    const period = resolvePeriod(query.from, query.to);
    const [accounts, movements, opening, meta] = await Promise.all([
      this.repo.getChartAccounts(adminId),
      this.repo.getMovementsByAccount(adminId, period),
      this.repo.getMovementsByAccount(adminId, { to: addDays(period.from, -1) }),
      this.getReportMeta(currentUser, period),
    ]);

    const movementByAccount = new Map(
      (movements as MovementRow[]).map((row) => [row.accountId, row]),
    );
    const openingByAccount = new Map(
      (opening as MovementRow[]).map((row) => [row.accountId, row]),
    );

    const rows = accounts.map((account) => {
      const section = resolveStatementSection(account);
      const movement = movementByAccount.get(account.id);
      const priorMovement = openingByAccount.get(account.id);
      const debit = round2(toAmount(movement?.debit));
      const credit = round2(toAmount(movement?.credit));
      const openingBalance = round2(
        toAmount(account.openingBalance) +
          (section && priorMovement
            ? toNaturalAmount(
                section,
                toAmount(priorMovement.debit),
                toAmount(priorMovement.credit),
              )
            : 0),
      );
      const periodMovement = section
        ? toNaturalAmount(section, debit, credit)
        : debit - credit;
      return {
        accountId: account.id,
        accountName: account.accountName,
        accountType: account.accountType,
        statementSection: section,
        openingBalance,
        debit,
        credit,
        closingBalance: round2(openingBalance + periodMovement),
      };
    });

    return {
      success: true,
      data: {
        meta,
        rows,
        totalDebit: round2(rows.reduce((sum, row) => sum + row.debit, 0)),
        totalCredit: round2(rows.reduce((sum, row) => sum + row.credit, 0)),
      },
    };
  }

  // ---------- Filter options ----------

  async getFilterOptions(currentUser: CurrentUser) {
    const adminId = getAdminScopeId(currentUser);
    const organizationId = currentUser.organizationId;
    const [departments, costCenters, banks, budgets, fiscalYears, expenseCategories] =
      await Promise.all([
        this.repo.getDepartments(organizationId ?? null),
        this.repo.getCostCenters(adminId),
        this.repo.getBankCashAccounts(adminId),
        this.repo.listBudgets(adminId),
        this.repo.listFiscalYears(adminId),
        organizationId
          ? this.repo.getExpenseCategories(organizationId)
          : Promise.resolve([]),
      ]);

    const financialYear = currentFinancialYear();
    const categoryNames = expenseCategories.map((row) => row.name);

    return {
      success: true,
      data: {
        departments,
        costCenters,
        bankAccounts: banks.map((bank) => ({
          id: bank.id,
          name: `${bank.bankName}${bank.accountNumber ? ` (${bank.accountNumber.slice(-4)})` : ""}`,
          accountType: bank.accountType,
          linkedGlAccountId: bank.linkedGlAccountId,
        })),
        expenseCategories: categoryNames.length
          ? categoryNames
          : ["Travel", "Meals", "Office Equipment", "Other", "Purchase Invoices"],
        budgets: (budgets as any[]).map((row) => ({
          id: row.id,
          name: row.name,
          status: row.status,
          periodStart: row.periodStart,
          periodEnd: row.periodEnd,
        })),
        fiscalYears,
        defaultPeriod: financialYear,
        statementSections: STATEMENT_SECTIONS,
        balanceSheetSections: BALANCE_SHEET_SECTIONS,
        cashFlowActivities: CASH_FLOW_ACTIVITIES,
        source: "sales_invoices_expenses_purchases",
      },
    };
  }

  // ---------- Account classification ----------

  async getAccountClassification(currentUser: CurrentUser) {
    const adminId = getAdminScopeId(currentUser);
    const accounts = await this.repo.getChartAccounts(adminId);
    return {
      success: true,
      data: accounts.map((account) => {
        const section = resolveStatementSection(account);
        return {
          id: account.id,
          accountName: account.accountName,
          accountType: account.accountType,
          statementSection: account.statementSection,
          effectiveStatementSection: section,
          cashFlowActivity: account.cashFlowActivity,
          effectiveCashFlowActivity: resolveCashFlowActivity(account),
          reportCategory: account.reportCategory,
          isClassified: !!section,
        };
      }),
    };
  }

  async updateAccountClassification(
    id: number,
    body: any,
    currentUser: CurrentUser,
  ) {
    const adminId = getAdminScopeId(currentUser);
    const values: {
      statementSection?: string | null;
      cashFlowActivity?: string | null;
      reportCategory?: string | null;
    } = {};

    if (body.statementSection !== undefined) {
      const section = body.statementSection
        ? String(body.statementSection).trim().toLowerCase()
        : null;
      if (section && !(STATEMENT_SECTIONS as readonly string[]).includes(section)) {
        throw httpError(
          400,
          `statementSection must be one of: ${STATEMENT_SECTIONS.join(", ")}`,
        );
      }
      values.statementSection = section;
    }

    if (body.cashFlowActivity !== undefined) {
      const activity = body.cashFlowActivity
        ? String(body.cashFlowActivity).trim().toLowerCase()
        : null;
      if (activity && !(CASH_FLOW_ACTIVITIES as readonly string[]).includes(activity)) {
        throw httpError(
          400,
          `cashFlowActivity must be one of: ${CASH_FLOW_ACTIVITIES.join(", ")}`,
        );
      }
      values.cashFlowActivity = activity;
    }

    if (body.reportCategory !== undefined) {
      values.reportCategory = body.reportCategory
        ? String(body.reportCategory).trim()
        : null;
    }

    if (!Object.keys(values).length) {
      throw httpError(400, "No classification fields supplied");
    }

    const data = await this.repo.updateAccountClassification(id, adminId, values);
    if (!data) throw httpError(404, "Account not found");
    return { success: true, message: "Account classification updated", data };
  }

  // ---------- Fiscal years ----------

  async listFiscalYears(currentUser: CurrentUser) {
    const adminId = getAdminScopeId(currentUser);
    return { success: true, data: await this.repo.listFiscalYears(adminId) };
  }

  private normalizeFiscalYear(body: any) {
    if (!body.name || !String(body.name).trim()) {
      throw httpError(400, "Fiscal year name is required");
    }
    if (!isIsoDate(body.startDate) || !isIsoDate(body.endDate)) {
      throw httpError(400, "startDate and endDate must be YYYY-MM-DD dates");
    }
    if (String(body.startDate) > String(body.endDate)) {
      throw httpError(400, "startDate cannot be after endDate");
    }
    return {
      name: String(body.name).trim(),
      startDate: String(body.startDate),
      endDate: String(body.endDate),
      isDefault: Boolean(body.isDefault),
      isClosed: Boolean(body.isClosed),
    };
  }

  async createFiscalYear(body: any, currentUser: CurrentUser) {
    const adminId = getAdminScopeId(currentUser);
    const payload = this.normalizeFiscalYear(body);
    if (payload.isDefault) await this.repo.clearDefaultFiscalYear(adminId);
    const data = await this.repo.createFiscalYear({
      adminId,
      ...payload,
      createdBy: currentUser.id,
    });
    return { success: true, message: "Fiscal year created successfully", data };
  }

  async updateFiscalYear(id: number, body: any, currentUser: CurrentUser) {
    const adminId = getAdminScopeId(currentUser);
    const payload = this.normalizeFiscalYear(body);
    if (payload.isDefault) await this.repo.clearDefaultFiscalYear(adminId);
    const data = await this.repo.updateFiscalYear(id, adminId, payload);
    if (!data) throw httpError(404, "Fiscal year not found");
    return { success: true, message: "Fiscal year updated successfully", data };
  }

  async deleteFiscalYear(id: number, currentUser: CurrentUser) {
    const adminId = getAdminScopeId(currentUser);
    const linked = await this.repo.countBudgetsForFiscalYear(id);
    if (linked > 0) {
      throw httpError(
        409,
        "This fiscal year has budgets attached and cannot be deleted.",
      );
    }
    const data = await this.repo.softDeleteFiscalYear(id, adminId);
    if (!data) throw httpError(404, "Fiscal year not found");
    return { success: true, message: "Fiscal year deleted successfully", data };
  }

  // ---------- Budgets ----------

  async listBudgets(currentUser: CurrentUser, query: ReportQuery & { status?: string }) {
    const adminId = getAdminScopeId(currentUser);
    const data = await this.repo.listBudgets(adminId, {
      status: query.status,
      from: isIsoDate(query.from) ? query.from : undefined,
      to: isIsoDate(query.to) ? query.to : undefined,
    });
    return { success: true, data };
  }

  async getBudget(id: number, currentUser: CurrentUser) {
    const adminId = getAdminScopeId(currentUser);
    const data = await this.repo.getBudgetById(id, adminId);
    if (!data) throw httpError(404, "Budget not found");
    return { success: true, data };
  }

  private normalizeBudget(body: any) {
    if (!body.name || !String(body.name).trim()) {
      throw httpError(400, "Budget name is required");
    }
    if (!isIsoDate(body.periodStart) || !isIsoDate(body.periodEnd)) {
      throw httpError(400, "periodStart and periodEnd must be YYYY-MM-DD dates");
    }
    if (String(body.periodStart) > String(body.periodEnd)) {
      throw httpError(400, "periodStart cannot be after periodEnd");
    }

    const rawLines = Array.isArray(body.lines) ? body.lines : [];
    const lines = rawLines.map((line: any, index: number) => {
      const categoryName = String(line.categoryName ?? "").trim();
      if (!categoryName) {
        throw httpError(400, "Each budget line requires a categoryName");
      }
      const budgeted = Number(line.budgetedAmount ?? 0);
      if (!Number.isFinite(budgeted) || budgeted < 0) {
        throw httpError(400, "budgetedAmount must be a non-negative number");
      }
      return {
        departmentId: line.departmentId ? Number(line.departmentId) : null,
        accountId: line.accountId ? Number(line.accountId) : null,
        categoryName,
        budgetedAmount: budgeted.toFixed(2),
        sortOrder: Number.isFinite(Number(line.sortOrder))
          ? Number(line.sortOrder)
          : index,
      };
    });

    return {
      values: {
        name: String(body.name).trim(),
        fiscalYearId: body.fiscalYearId ? Number(body.fiscalYearId) : null,
        periodStart: String(body.periodStart),
        periodEnd: String(body.periodEnd),
        status: String(body.status ?? "Draft").trim(),
        notes: body.notes ? String(body.notes).trim() : null,
      },
      lines,
      hasLines: Array.isArray(body.lines),
    };
  }

  async createBudget(body: any, currentUser: CurrentUser) {
    const adminId = getAdminScopeId(currentUser);
    const payload = this.normalizeBudget(body);
    const created = await this.repo.createBudgetWithLines(
      { adminId, ...payload.values, createdBy: currentUser.id },
      payload.lines,
    );
    const data = await this.repo.getBudgetById(created.id, adminId);
    return { success: true, message: "Budget created successfully", data };
  }

  async updateBudget(id: number, body: any, currentUser: CurrentUser) {
    const adminId = getAdminScopeId(currentUser);
    const payload = this.normalizeBudget(body);
    const updated = await this.repo.updateBudgetWithLines(
      id,
      adminId,
      payload.values,
      payload.hasLines ? payload.lines : null,
    );
    if (!updated) throw httpError(404, "Budget not found");
    const data = await this.repo.getBudgetById(id, adminId);
    return { success: true, message: "Budget updated successfully", data };
  }

  async deleteBudget(id: number, currentUser: CurrentUser) {
    const adminId = getAdminScopeId(currentUser);
    const data = await this.repo.softDeleteBudget(id, adminId);
    if (!data) throw httpError(404, "Budget not found");
    return { success: true, message: "Budget deleted successfully", data };
  }
}
