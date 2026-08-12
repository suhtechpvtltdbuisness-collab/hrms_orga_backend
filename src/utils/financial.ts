// Shared accounting primitives for the financial reporting module. Journal
// entry dates are stored as ISO "YYYY-MM-DD" strings, so lexicographic
// comparison is also chronological comparison.

/** Carries a status code that the app-level error handler turns into the response code. */
export function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { statusCode: status });
}

export const STATEMENT_SECTIONS = [
  "revenue",
  "direct_expense",
  "indirect_expense",
  "current_asset",
  "non_current_asset",
  "current_liability",
  "non_current_liability",
  "equity",
] as const;

export type StatementSection = (typeof STATEMENT_SECTIONS)[number];

export const CASH_FLOW_ACTIVITIES = [
  "operating",
  "investing",
  "financing",
] as const;

export type CashFlowActivity = (typeof CASH_FLOW_ACTIVITIES)[number];

const ACCOUNT_TYPE_SECTIONS: Record<string, StatementSection> = {
  asset: "current_asset",
  assets: "current_asset",
  liability: "current_liability",
  liabilities: "current_liability",
  equity: "equity",
  income: "revenue",
  revenue: "revenue",
  expense: "indirect_expense",
  expenses: "indirect_expense",
};

/**
 * Resolves where an account belongs on the statements. An explicit
 * `statementSection` always wins; otherwise it falls back to the free-text
 * `accountType` the chart of accounts has always captured.
 */
export function resolveStatementSection(account: {
  statementSection?: string | null;
  accountType?: string | null;
}): StatementSection | null {
  const explicit = account.statementSection?.trim().toLowerCase();
  if (explicit && (STATEMENT_SECTIONS as readonly string[]).includes(explicit)) {
    return explicit as StatementSection;
  }
  const fallback = account.accountType?.trim().toLowerCase();
  return fallback ? ACCOUNT_TYPE_SECTIONS[fallback] ?? null : null;
}

export function resolveCashFlowActivity(account: {
  cashFlowActivity?: string | null;
  statementSection?: string | null;
  accountType?: string | null;
}): CashFlowActivity {
  const explicit = account.cashFlowActivity?.trim().toLowerCase();
  if (explicit && (CASH_FLOW_ACTIVITIES as readonly string[]).includes(explicit)) {
    return explicit as CashFlowActivity;
  }
  const section = resolveStatementSection(account);
  if (section === "non_current_asset") return "investing";
  if (section === "equity" || section === "non_current_liability") {
    return "financing";
  }
  return "operating";
}

/** Debit-normal sections increase with debits; credit-normal ones with credits. */
export function normalBalance(section: StatementSection): "debit" | "credit" {
  switch (section) {
    case "current_asset":
    case "non_current_asset":
    case "direct_expense":
    case "indirect_expense":
      return "debit";
    default:
      return "credit";
  }
}

/**
 * Converts a raw debit/credit movement into the account's natural sign, so a
 * revenue account with credits reports a positive figure.
 */
export function toNaturalAmount(
  section: StatementSection,
  debit: number,
  credit: number,
): number {
  return normalBalance(section) === "debit" ? debit - credit : credit - debit;
}

export const PNL_SECTIONS: StatementSection[] = [
  "revenue",
  "direct_expense",
  "indirect_expense",
];

export const BALANCE_SHEET_SECTIONS: StatementSection[] = [
  "current_asset",
  "non_current_asset",
  "current_liability",
  "non_current_liability",
  "equity",
];

export function isPnlSection(section: StatementSection | null): boolean {
  return !!section && PNL_SECTIONS.includes(section);
}

export function isExpenseSection(section: StatementSection | null): boolean {
  return section === "direct_expense" || section === "indirect_expense";
}

export function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function toAmount(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function safeDivide(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return numerator / denominator;
}

/** Percentage change against a previous period, guarding a zero baseline. */
export function percentChange(
  current: number,
  previous: number,
): { percentage: string; isPositive: boolean } {
  if (!previous) {
    const isPositive = current >= 0;
    return { percentage: current === 0 ? "0%" : "100%", isPositive };
  }
  const change = ((current - previous) / Math.abs(previous)) * 100;
  return {
    percentage: `${Math.abs(round2(change))}%`,
    isPositive: change >= 0,
  };
}

export function sharePercent(part: number, total: number): string {
  if (!total) return "0%";
  return `${round2((part / total) * 100)}%`;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: unknown): boolean {
  return typeof value === "string" && ISO_DATE.test(value);
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseIso(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(value: string, days: number): string {
  const date = parseIso(value);
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDate(date);
}

export function daysBetween(from: string, to: string): number {
  const diff = parseIso(to).getTime() - parseIso(from).getTime();
  return Math.round(diff / 86400000) + 1;
}

/** Financial years run April to March, matching the INR reporting default. */
export function currentFinancialYear(today = new Date()): {
  from: string;
  to: string;
} {
  const year = today.getUTCFullYear();
  const startYear = today.getUTCMonth() >= 3 ? year : year - 1;
  return {
    from: `${startYear}-04-01`,
    to: `${startYear + 1}-03-31`,
  };
}

export function resolvePeriod(
  from?: string,
  to?: string,
): { from: string; to: string } {
  const fallback = currentFinancialYear();
  const start = isIsoDate(from) ? (from as string) : fallback.from;
  const end = isIsoDate(to) ? (to as string) : fallback.to;
  if (start > end) {
    throw httpError(400, "`from` date cannot be after `to` date");
  }
  return { from: start, to: end };
}

/** The equally sized window immediately before the requested period. */
export function previousPeriod(period: { from: string; to: string }): {
  from: string;
  to: string;
} {
  const length = daysBetween(period.from, period.to);
  const end = addDays(period.from, -1);
  return { from: addDays(end, -(length - 1)), to: end };
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function formatPeriodLabel(period: { from: string; to: string }): string {
  const start = parseIso(period.from);
  const end = parseIso(period.to);
  const startLabel = `${MONTHS[start.getUTCMonth()]} ${start.getUTCFullYear()}`;
  const endLabel = `${MONTHS[end.getUTCMonth()]} ${end.getUTCFullYear()}`;
  return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
}

export function formatLongDate(value: string): string {
  const date = parseIso(value);
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** Whole months in the period, used for run-rate and runway figures. */
export function monthsInPeriod(period: { from: string; to: string }): number {
  return Math.max(daysBetween(period.from, period.to) / 30.44, 1 / 30.44);
}

export const UNALLOCATED = "Unallocated";
