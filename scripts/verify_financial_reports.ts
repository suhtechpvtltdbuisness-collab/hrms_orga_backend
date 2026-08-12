import dotenv from "dotenv";
import { and, eq, inArray, like } from "drizzle-orm";
import { db, pool } from "../src/db/connection.js";
import {
  budget,
  budgetLine,
  chartAccount,
  bankCashAccount,
  department,
  journalEntry,
  journalEntryLine,
  users,
} from "../src/db/schema.js";
import { FinancialReportsServices } from "../src/services/financialReportsServices.js";

dotenv.config();

const TAG = "ZZVERIFY";
const service = new FinancialReportsServices();
const PERIOD = { from: "2025-04-01", to: "2025-06-30" };
const PRIOR = { from: "2025-01-01", to: "2025-03-31" };

const created = {
  accountIds: [] as number[],
  entryIds: [] as number[],
  bankIds: [] as number[],
  budgetIds: [] as number[],
  departmentIds: [] as number[],
};

async function cleanup() {
  if (created.entryIds.length) {
    await db.delete(journalEntryLine).where(inArray(journalEntryLine.journalEntryId, created.entryIds));
    await db.delete(journalEntry).where(inArray(journalEntry.id, created.entryIds));
  }
  if (created.budgetIds.length) {
    await db.delete(budgetLine).where(inArray(budgetLine.budgetId, created.budgetIds));
    await db.delete(budget).where(inArray(budget.id, created.budgetIds));
  }
  if (created.bankIds.length) {
    await db.delete(bankCashAccount).where(inArray(bankCashAccount.id, created.bankIds));
  }
  if (created.accountIds.length) {
    await db.delete(chartAccount).where(inArray(chartAccount.id, created.accountIds));
  }
  if (created.departmentIds.length) {
    await db.delete(department).where(inArray(department.id, created.departmentIds));
  }
}

async function makeAccount(
  adminId: number,
  name: string,
  accountType: string,
  statementSection: string,
  opts: { opening?: string; category?: string; activity?: string } = {},
) {
  const [row] = await db
    .insert(chartAccount)
    .values({
      adminId,
      accountName: `${TAG} ${name}`,
      accountType,
      statementSection,
      reportCategory: opts.category ?? null,
      cashFlowActivity: opts.activity ?? null,
      openingBalance: opts.opening ?? "0",
      createdBy: adminId,
    })
    .returning();
  created.accountIds.push(row.id);
  return row;
}

async function makeEntry(
  adminId: number,
  entryDate: string,
  remarks: string,
  lines: Array<{ accountId: number; debit?: number; credit?: number; departmentId?: number | null }>,
) {
  const totalDebit = lines.reduce((s, l) => s + (l.debit ?? 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (l.credit ?? 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    throw new Error(`Unbalanced fixture entry "${remarks}": ${totalDebit} vs ${totalCredit}`);
  }
  const [entry] = await db
    .insert(journalEntry)
    .values({
      adminId,
      entryDate,
      remarks: `${TAG} ${remarks}`,
      totalDebit: totalDebit.toFixed(2),
      totalCredit: totalCredit.toFixed(2),
      balance: "0",
      createdBy: adminId,
    })
    .returning();
  created.entryIds.push(entry.id);
  await db.insert(journalEntryLine).values(
    lines.map((l) => ({
      journalEntryId: entry.id,
      accountId: l.accountId,
      debit: (l.debit ?? 0).toFixed(2),
      credit: (l.credit ?? 0).toFixed(2),
      departmentId: l.departmentId ?? null,
    })),
  );
  return entry;
}

const checks: Array<{ label: string; pass: boolean; detail: string }> = [];
function expect(label: string, actual: unknown, expected: unknown) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  checks.push({
    label,
    pass,
    detail: pass ? `${JSON.stringify(actual)}` : `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
  });
}

async function main() {
  const [admin] = await db
    .select()
    .from(users)
    .where(and(eq(users.isDeleted, false), inArray(users.roleId, [0, 1])))
    .limit(1);
  if (!admin) throw new Error("No admin user found to scope the verification.");
  console.log(`Using admin #${admin.id} (${admin.email}), org ${admin.organizationId}`);

  // Departments (reuse existing org departments, else create two)
  let depts = await db
    .select()
    .from(department)
    .where(and(eq(department.isDeleted, false), eq(department.organizationId, admin.organizationId as number)))
    .limit(2);
  if (depts.length < 2) {
    for (const name of ["ZZVERIFY Sales", "ZZVERIFY Engineering"]) {
      const [row] = await db
        .insert(department)
        .values({
          organizationId: admin.organizationId,
          departmentName: name,
          departmentCode: name.replace(/\s+/g, "-").toUpperCase(),
          createdBy: admin.id,
        })
        .returning();
      created.departmentIds.push(row.id);
      depts.push(row as any);
    }
    depts = depts.slice(-2);
  }
  const [deptA, deptB] = depts;
  console.log(`Departments: ${deptA.departmentName} (#${deptA.id}), ${deptB.departmentName} (#${deptB.id})`);

  // Chart of accounts
  const cash = await makeAccount(admin.id, "HDFC Current", "Asset", "current_asset", {
    opening: "100000",
    category: "Cash & Cash Equivalent",
  });
  const receivable = await makeAccount(admin.id, "Accounts Receivable", "Asset", "current_asset", {
    opening: "50000",
    category: "Accounts Receivable",
  });
  const equipment = await makeAccount(admin.id, "Equipment", "Asset", "non_current_asset", {
    opening: "200000",
    category: "Property, Plant & Equipment",
  });
  const payable = await makeAccount(admin.id, "Accounts Payable", "Liability", "current_liability", {
    opening: "80000",
    category: "Accounts Payable",
  });
  const loan = await makeAccount(admin.id, "Term Loan", "Liability", "non_current_liability", {
    opening: "150000",
    category: "Long Term Debt",
  });
  const capital = await makeAccount(admin.id, "Share Capital", "Equity", "equity", {
    opening: "120000",
    category: "Common Stock",
  });
  const productRevenue = await makeAccount(admin.id, "Product Sales", "Income", "revenue", {
    category: "Product Sales",
  });
  const serviceRevenue = await makeAccount(admin.id, "Service Revenue", "Income", "revenue", {
    category: "Service Revenue",
  });
  const cogs = await makeAccount(admin.id, "Cost of Delivery", "Expense", "direct_expense", {
    category: "Salaries & Wages",
  });
  const marketing = await makeAccount(admin.id, "Marketing Spend", "Expense", "indirect_expense", {
    category: "Marketing",
  });

  const [bank] = await db
    .insert(bankCashAccount)
    .values({
      adminId: admin.id,
      accountType: "Bank",
      bankName: `${TAG} HDFC`,
      accountNumber: "123456789012",
      openingBalance: "100000",
      linkedGlAccountId: cash.id,
      createdBy: admin.id,
    })
    .returning();
  created.bankIds.push(bank.id);

  // ---- Current period entries ----
  // Revenue collected in cash: 300000 product (deptA), 200000 service (deptB)
  await makeEntry(admin.id, "2025-04-10", "Product sale cash", [
    { accountId: cash.id, debit: 300000 },
    { accountId: productRevenue.id, credit: 300000, departmentId: deptA.id },
  ]);
  await makeEntry(admin.id, "2025-05-05", "Service sale cash", [
    { accountId: cash.id, debit: 200000 },
    { accountId: serviceRevenue.id, credit: 200000, departmentId: deptB.id },
  ]);
  // Direct expense paid in cash: 120000 deptA, 80000 deptB
  await makeEntry(admin.id, "2025-05-20", "Delivery cost deptA", [
    { accountId: cogs.id, debit: 120000, departmentId: deptA.id },
    { accountId: cash.id, credit: 120000 },
  ]);
  await makeEntry(admin.id, "2025-06-02", "Delivery cost deptB", [
    { accountId: cogs.id, debit: 80000, departmentId: deptB.id },
    { accountId: cash.id, credit: 80000 },
  ]);
  // Indirect expense on credit (no cash impact): 50000 deptA
  await makeEntry(admin.id, "2025-06-10", "Marketing on credit", [
    { accountId: marketing.id, debit: 50000, departmentId: deptA.id },
    { accountId: payable.id, credit: 50000 },
  ]);
  // Investing: buy equipment for cash 60000
  await makeEntry(admin.id, "2025-06-15", "Equipment purchase", [
    { accountId: equipment.id, debit: 60000 },
    { accountId: cash.id, credit: 60000 },
  ]);
  // Financing: loan drawdown 40000 cash in
  await makeEntry(admin.id, "2025-06-20", "Loan drawdown", [
    { accountId: cash.id, debit: 40000 },
    { accountId: loan.id, credit: 40000 },
  ]);

  // ---- Prior period entries (for % change) ----
  await makeEntry(admin.id, "2025-02-10", "Prior product sale", [
    { accountId: cash.id, debit: 250000 },
    { accountId: productRevenue.id, credit: 250000, departmentId: deptA.id },
  ]);
  await makeEntry(admin.id, "2025-02-20", "Prior delivery cost", [
    { accountId: cogs.id, debit: 100000, departmentId: deptA.id },
    { accountId: cash.id, credit: 100000 },
  ]);

  // ---- Budget ----
  const [createdBudget] = await db
    .insert(budget)
    .values({
      adminId: admin.id,
      name: `${TAG} Q1 FY26`,
      periodStart: PERIOD.from,
      periodEnd: PERIOD.to,
      status: "Approved",
      createdBy: admin.id,
    })
    .returning();
  created.budgetIds.push(createdBudget.id);
  await db.insert(budgetLine).values([
    { budgetId: createdBudget.id, departmentId: deptA.id, accountId: cogs.id, categoryName: "Salaries & Wages", budgetedAmount: "150000", sortOrder: 0 },
    { budgetId: createdBudget.id, departmentId: deptA.id, accountId: marketing.id, categoryName: "Marketing", budgetedAmount: "40000", sortOrder: 1 },
    { budgetId: createdBudget.id, departmentId: deptB.id, accountId: cogs.id, categoryName: "Salaries & Wages", budgetedAmount: "100000", sortOrder: 2 },
  ]);

  // ================= Assertions =================

  const pnl = (await service.getProfitAndLoss(admin as any, PERIOD)).data;
  console.log("\n--- PROFIT & LOSS ---");
  console.log(JSON.stringify(pnl.summaryData, null, 2));
  console.log(JSON.stringify(pnl.tableData, null, 2));
  console.log(JSON.stringify(pnl.grandTotal, null, 2));
  console.log("revenueBreakdown", JSON.stringify(pnl.revenueBreakdown));
  console.log("expenseBreakdown", JSON.stringify(pnl.expenseBreakdown));
  console.log("observations", JSON.stringify(pnl.observations, null, 2));

  expect("P&L total revenue", pnl.grandTotal.revenue, 500000);
  expect("P&L direct expense", pnl.grandTotal.direct, 200000);
  expect("P&L indirect expense", pnl.grandTotal.indirect, 50000);
  expect("P&L net profit", pnl.grandTotal.net, 250000);
  expect("P&L revenue % change vs prior 250000", pnl.summaryData[0].percentage, "100%");
  const deptARow = pnl.tableData.find((r: any) => r.department === deptA.departmentName);
  const deptBRow = pnl.tableData.find((r: any) => r.department === deptB.departmentName);
  expect("P&L deptA net (300000-120000-50000)", deptARow?.net, 130000);
  expect("P&L deptB net (200000-80000)", deptBRow?.net, 120000);
  expect(
    "P&L dept rows sum to grand total",
    pnl.tableData.reduce((s: number, r: any) => s + r.net, 0),
    pnl.grandTotal.net,
  );
  expect("P&L revenue breakdown shares sum 100%", pnl.revenueBreakdown.map((r: any) => r[2]), ["60%", "40%"]);

  const dept = (await service.getProfitAndLoss(admin as any, { ...PERIOD, departmentId: deptB.id })).data;
  expect("P&L filtered to deptB revenue", dept.grandTotal.revenue, 200000);
  expect("P&L filtered to deptB direct", dept.grandTotal.direct, 80000);

  const bs = (await service.getBalanceSheet(admin as any, { asOf: PERIOD.to })).data;
  console.log("\n--- BALANCE SHEET ---");
  console.log(JSON.stringify(
    {
      currentAssets: bs.currentAssets,
      totalCurrentAssets: bs.totalCurrentAssets,
      nonCurrentAssets: bs.nonCurrentAssets,
      totalAssets: bs.totalAssets,
      currentLiabilities: bs.currentLiabilities,
      nonCurrentLiabilities: bs.nonCurrentLiabilities,
      equity: bs.equity,
      totalEquity: bs.totalEquity,
      totalLiabilitiesEquity: bs.totalLiabilitiesEquity,
      retainedEarnings: bs.retainedEarnings,
      currentRatio: bs.currentRatio,
      isBalanced: bs.isBalanced,
      difference: bs.difference,
    },
    null,
    2,
  ));
  // Cumulative from inception: 100000 opening + prior (250000-100000)
  // + current (300000+200000-120000-80000-60000+40000) = 530000
  const cashLine = bs.currentAssets.find((l: any) => l.name.includes("HDFC Current"));
  expect("BS cash balance", cashLine?.amount, 530000);
  expect("BS equipment 200000+60000", bs.nonCurrentAssets.find((l: any) => l.name.includes("Equipment"))?.amount, 260000);
  expect("BS payable 80000+50000", bs.currentLiabilities.find((l: any) => l.name.includes("Accounts Payable"))?.amount, 130000);
  expect("BS loan 150000+40000", bs.nonCurrentLiabilities.find((l: any) => l.name.includes("Term Loan"))?.amount, 190000);
  // all-time P&L: revenue 500000+250000=750000, expenses 200000+50000+100000=350000 -> 400000
  expect("BS retained earnings (all-time net)", bs.retainedEarnings, 400000);
  expect("BS balanced", bs.isBalanced, true);
  expect("BS difference zero", bs.difference, 0);

  const cf = (await service.getCashFlow(admin as any, PERIOD)).data;
  console.log("\n--- CASH FLOW ---");
  console.log(JSON.stringify(cf.summaryCards, null, 2));
  console.log(JSON.stringify(cf.sectionsData, null, 2));
  console.log("cashPositionRows", JSON.stringify(cf.cashPositionRows, null, 2));
  console.log("inflowOutflowRows", JSON.stringify(cf.inflowOutflowRows, null, 2));

  // opening: bank opening 100000 + pre-period movement (250000-100000)=150000 -> 250000
  expect("CF opening balance", cf.openingBalance, 250000);
  const op = cf.sectionsData.find((s: any) => s.id === "operating");
  const inv = cf.sectionsData.find((s: any) => s.id === "investing");
  const fin = cf.sectionsData.find((s: any) => s.id === "financing");
  expect("CF operating net (500000-200000)", op?.netTotal, 300000);
  expect("CF investing net (-60000)", inv?.netTotal, -60000);
  expect("CF financing net (+40000)", fin?.netTotal, 40000);
  expect("CF net change", cf.netChange, 280000);
  expect("CF closing balance", cf.closingBalance, 530000);
  expect("CF closing matches BS cash + ...", cf.closingBalance, 530000);
  expect("CF total row position", cf.inflowOutflowRows.at(-1)?.[4], "Inflow");

  const cfBank = (await service.getCashFlow(admin as any, { ...PERIOD, bankAccountId: bank.id })).data;
  expect("CF filtered by bank matches all (single bank)", cfBank.netChange, 280000);

  const bva = (await service.getBudgetVsActual(admin as any, PERIOD)).data;
  console.log("\n--- BUDGET VS ACTUAL ---");
  console.log(JSON.stringify(bva.summaryCards, null, 2));
  console.log(JSON.stringify(bva.varianceByDeptRows, null, 2));
  console.log(JSON.stringify(bva.grandTotal, null, 2));
  console.log("expenseCategoryRows", JSON.stringify(bva.expenseCategoryRows, null, 2));
  console.log("utilizationSummaryRows", JSON.stringify(bva.utilizationSummaryRows, null, 2));

  expect("BVA total budget (150+40+100k)", bva.grandTotal.budget, 290000);
  expect("BVA total actual (120+80+50k)", bva.grandTotal.actual, 250000);
  expect("BVA net variance", bva.grandTotal.variance, 40000);
  expect("BVA status within", bva.grandTotal.status, "Within");
  const bvaDeptA = bva.varianceByDeptRows.find((r: any) => r.department === deptA.departmentName);
  const bvaDeptB = bva.varianceByDeptRows.find((r: any) => r.department === deptB.departmentName);
  expect("BVA deptA budget 190000", bvaDeptA?.budget, 190000);
  expect("BVA deptA actual 170000", bvaDeptA?.actual, 170000);
  expect("BVA deptB budget 100000", bvaDeptB?.budget, 100000);
  expect("BVA deptB actual 80000", bvaDeptB?.actual, 80000);
  expect("BVA utilization rate", bva.utilizationSummaryRows[4][1], "86.21%");
  expect("BVA overall status", bva.utilizationSummaryRows[5][1], "WITHIN BUDGET");

  const tb = (await service.getTrialBalance(admin as any, PERIOD)).data;
  console.log("\n--- TRIAL BALANCE ---");
  console.log(`totalDebit=${tb.totalDebit} totalCredit=${tb.totalCredit}`);
  expect("Trial balance debits equal credits", tb.totalDebit, tb.totalCredit);

  const filters = (await service.getFilterOptions(admin as any)).data;
  console.log("\n--- FILTERS ---");
  console.log(JSON.stringify({
    departments: filters.departments.length,
    bankAccounts: filters.bankAccounts.length,
    expenseCategories: filters.expenseCategories,
    budgets: filters.budgets.length,
    defaultPeriod: filters.defaultPeriod,
  }, null, 2));
  expect("Filters expose bank accounts", filters.bankAccounts.length > 0, true);
  expect("Filters expose departments", filters.departments.length > 0, true);

  const classification = (await service.getAccountClassification(admin as any)).data;
  const unclassified = classification.filter((a: any) => !a.isClassified);
  console.log(`\nUnclassified accounts: ${unclassified.length}`);

  console.log("\n================ RESULTS ================");
  let failed = 0;
  for (const check of checks) {
    console.log(`${check.pass ? "PASS" : "FAIL"}  ${check.label} :: ${check.detail}`);
    if (!check.pass) failed++;
  }
  console.log(`\n${checks.length - failed}/${checks.length} checks passed.`);
  if (failed) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error("Verification error:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
    await pool.end();
    console.log("Fixtures cleaned up.");
  });
