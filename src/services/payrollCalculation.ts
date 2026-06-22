export type MoneyInput = string | number | null | undefined;

export type PayrollComponentInput = {
  id?: number;
  code?: string | null;
  name: string;
  type: "earning" | "deduction";
  amountType?: "fixed" | "formula" | null;
  amount?: MoneyInput;
  formula?: string | null;
  taxable?: boolean | null;
  dependsOnPaymentDays?: boolean | null;
};

export type AdditionalSalaryInput = {
  id?: number;
  componentName: string;
  type: "earning" | "deduction";
  amount: MoneyInput;
  taxable?: boolean | null;
};

export type StatutoryDeductionRule = {
  enabled?: boolean;
  name?: string;
  amount?: MoneyInput;
  rate?: number | string | null;
  base?: "gross" | "taxable" | "baseSalary";
  maxAmount?: MoneyInput;
};

export type StatutoryDeductionConfig = {
  pf?: StatutoryDeductionRule;
  esi?: StatutoryDeductionRule;
  professionalTax?: StatutoryDeductionRule;
  tds?: StatutoryDeductionRule;
  custom?: Array<StatutoryDeductionRule & { code?: string }>;
};

export type PayrollCalculationInput = {
  baseSalary?: MoneyInput;
  totalWorkingDays: number;
  paidDays: number;
  components: PayrollComponentInput[];
  additionalSalaries?: AdditionalSalaryInput[];
  statutoryDeductions?: StatutoryDeductionConfig;
};

export type PayrollLine = {
  source: "component" | "additional_salary" | "statutory";
  code: string;
  name: string;
  type: "earning" | "deduction";
  amount: string;
  taxable: boolean;
};

export type PayrollCalculationResult = {
  grossPay: string;
  taxableEarnings: string;
  totalDeductions: string;
  netPay: string;
  earnings: PayrollLine[];
  deductions: PayrollLine[];
  additionalSalaries: PayrollLine[];
  statutoryDeductions: Record<string, PayrollLine>;
};

const MONEY_SCALE = 100;

export function parseMoneyToCents(value: MoneyInput): number {
  if (value === null || value === undefined || value === "") return 0;
  const numeric = Number(String(value).replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(numeric)) {
    throw new Error(`Invalid money amount: ${value}`);
  }
  return Math.round(numeric * MONEY_SCALE);
}

export function centsToMoney(cents: number): string {
  return (Math.round(cents) / MONEY_SCALE).toFixed(2);
}

function toNumberAmount(cents: number): number {
  return cents / MONEY_SCALE;
}

function normalizeCode(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

function prorateCents(cents: number, paidDays: number, totalWorkingDays: number) {
  return Math.round((cents * paidDays) / totalWorkingDays);
}

type Token =
  | { type: "number"; value: number }
  | { type: "identifier"; value: string }
  | { type: "operator"; value: "+" | "-" | "*" | "/" }
  | { type: "paren"; value: "(" | ")" };

function tokenizeFormula(formula: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < formula.length) {
    const char = formula[i];
    if (/\s/.test(char)) {
      i += 1;
      continue;
    }

    if (/\d|\./.test(char)) {
      let value = char;
      i += 1;
      while (i < formula.length && /[\d.]/.test(formula[i])) {
        value += formula[i];
        i += 1;
      }
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) {
        throw new Error(`Invalid formula number: ${value}`);
      }
      tokens.push({ type: "number", value: parsed });
      continue;
    }

    if (/[a-zA-Z_]/.test(char)) {
      let value = char;
      i += 1;
      while (i < formula.length && /[a-zA-Z0-9_]/.test(formula[i])) {
        value += formula[i];
        i += 1;
      }
      tokens.push({ type: "identifier", value });
      continue;
    }

    if (["+", "-", "*", "/"].includes(char)) {
      tokens.push({ type: "operator", value: char as "+" | "-" | "*" | "/" });
      i += 1;
      continue;
    }

    if (char === "(" || char === ")") {
      tokens.push({ type: "paren", value: char });
      i += 1;
      continue;
    }

    throw new Error(`Unsupported formula character: ${char}`);
  }

  return tokens;
}

function evaluateFormula(formula: string, context: Record<string, number>): number {
  const tokens = tokenizeFormula(formula);
  let position = 0;

  function parseExpression(): number {
    let value = parseTerm();
    while (
      position < tokens.length &&
      tokens[position].type === "operator" &&
      (tokens[position].value === "+" || tokens[position].value === "-")
    ) {
      const operator = tokens[position].value;
      position += 1;
      const right = parseTerm();
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  }

  function parseTerm(): number {
    let value = parseFactor();
    while (
      position < tokens.length &&
      tokens[position].type === "operator" &&
      (tokens[position].value === "*" || tokens[position].value === "/")
    ) {
      const operator = tokens[position].value;
      position += 1;
      const right = parseFactor();
      if (operator === "/" && right === 0) {
        throw new Error("Formula division by zero");
      }
      value = operator === "*" ? value * right : value / right;
    }
    return value;
  }

  function parseFactor(): number {
    const token = tokens[position];
    if (!token) {
      throw new Error("Invalid formula");
    }

    if (token.type === "operator" && token.value === "-") {
      position += 1;
      return -parseFactor();
    }

    if (token.type === "number") {
      position += 1;
      return token.value;
    }

    if (token.type === "identifier") {
      position += 1;
      const key = normalizeCode(token.value);
      if (!(key in context)) {
        throw new Error(`Unknown formula variable: ${token.value}`);
      }
      return context[key];
    }

    if (token.type === "paren" && token.value === "(") {
      position += 1;
      const value = parseExpression();
      if (tokens[position]?.type !== "paren" || tokens[position].value !== ")") {
        throw new Error("Formula has mismatched parentheses");
      }
      position += 1;
      return value;
    }

    throw new Error("Invalid formula");
  }

  const result = parseExpression();
  if (position !== tokens.length) {
    throw new Error("Invalid formula");
  }
  return result;
}

function calculateStatutoryRule(
  code: string,
  defaultName: string,
  rule: StatutoryDeductionRule | undefined,
  bases: { gross: number; taxable: number; baseSalary: number },
): PayrollLine | null {
  if (!rule || rule.enabled === false) return null;

  let cents = 0;
  if (rule.amount !== undefined && rule.amount !== null && rule.amount !== "") {
    cents = parseMoneyToCents(rule.amount);
  } else if (rule.rate !== undefined && rule.rate !== null && rule.rate !== "") {
    const rate = Number(rule.rate);
    if (!Number.isFinite(rate)) {
      throw new Error(`Invalid ${defaultName} rate`);
    }
    const base = bases[rule.base ?? "gross"];
    cents = Math.round(base * (rate / 100));
  } else {
    throw new Error(`${defaultName} requires amount or rate`);
  }

  if (rule.maxAmount !== undefined && rule.maxAmount !== null && rule.maxAmount !== "") {
    cents = Math.min(cents, parseMoneyToCents(rule.maxAmount));
  }

  return {
    source: "statutory",
    code,
    name: rule.name || defaultName,
    type: "deduction",
    amount: centsToMoney(cents),
    taxable: false,
  };
}

export function calculatePayroll(
  input: PayrollCalculationInput,
): PayrollCalculationResult {
  const { totalWorkingDays, paidDays } = input;
  if (!Number.isInteger(totalWorkingDays) || totalWorkingDays <= 0) {
    throw new Error("totalWorkingDays must be a positive integer");
  }
  if (!Number.isInteger(paidDays) || paidDays < 0 || paidDays > totalWorkingDays) {
    throw new Error("paidDays must be between 0 and totalWorkingDays");
  }

  const earnings: PayrollLine[] = [];
  const deductions: PayrollLine[] = [];
  const additionalLines: PayrollLine[] = [];
  const statutoryLines: Record<string, PayrollLine> = {};
  const context: Record<string, number> = {
    BASESALARY: toNumberAmount(parseMoneyToCents(input.baseSalary)),
    GROSS: 0,
    TAXABLE: 0,
  };

  let grossCents = 0;
  let taxableCents = 0;
  let deductionCents = 0;

  for (const component of input.components) {
    const code = normalizeCode(component.code || component.name);
    const amountType = component.amountType || "fixed";
    let cents =
      amountType === "formula"
        ? Math.round(
            evaluateFormula(component.formula || "", context) * MONEY_SCALE,
          )
        : parseMoneyToCents(component.amount);

    if (component.dependsOnPaymentDays !== false) {
      cents = prorateCents(cents, paidDays, totalWorkingDays);
    }

    const line: PayrollLine = {
      source: "component",
      code,
      name: component.name,
      type: component.type,
      amount: centsToMoney(cents),
      taxable: component.taxable !== false,
    };

    context[code] = toNumberAmount(cents);
    if (component.type === "earning") {
      grossCents += cents;
      if (line.taxable) taxableCents += cents;
      earnings.push(line);
    } else {
      deductionCents += cents;
      deductions.push(line);
    }
    context.GROSS = toNumberAmount(grossCents);
    context.TAXABLE = toNumberAmount(taxableCents);
  }

  for (const additional of input.additionalSalaries || []) {
    const cents = parseMoneyToCents(additional.amount);
    const line: PayrollLine = {
      source: "additional_salary",
      code: normalizeCode(additional.componentName),
      name: additional.componentName,
      type: additional.type,
      amount: centsToMoney(cents),
      taxable: additional.taxable !== false,
    };
    additionalLines.push(line);

    if (additional.type === "earning") {
      grossCents += cents;
      if (line.taxable) taxableCents += cents;
      earnings.push(line);
    } else {
      deductionCents += cents;
      deductions.push(line);
    }
    context.GROSS = toNumberAmount(grossCents);
    context.TAXABLE = toNumberAmount(taxableCents);
  }

  const bases = {
    gross: grossCents,
    taxable: taxableCents,
    baseSalary: parseMoneyToCents(input.baseSalary),
  };

  const statutoryConfig = input.statutoryDeductions || {};
  const configuredRules: Array<[string, string, StatutoryDeductionRule | undefined]> = [
    ["PF", "Provident Fund", statutoryConfig.pf],
    ["ESI", "ESI", statutoryConfig.esi],
    ["PROFESSIONAL_TAX", "Professional Tax", statutoryConfig.professionalTax],
    ["TDS", "TDS", statutoryConfig.tds],
  ];

  for (const [code, name, rule] of configuredRules) {
    const line = calculateStatutoryRule(code, name, rule, bases);
    if (!line) continue;
    statutoryLines[code] = line;
    deductionCents += parseMoneyToCents(line.amount);
    deductions.push(line);
  }

  for (const customRule of statutoryConfig.custom || []) {
    const code = normalizeCode(customRule.code || customRule.name || "CUSTOM");
    const line = calculateStatutoryRule(
      code,
      customRule.name || "Custom Deduction",
      customRule,
      bases,
    );
    if (!line) continue;
    statutoryLines[code] = line;
    deductionCents += parseMoneyToCents(line.amount);
    deductions.push(line);
  }

  const netCents = grossCents - deductionCents;
  return {
    grossPay: centsToMoney(grossCents),
    taxableEarnings: centsToMoney(taxableCents),
    totalDeductions: centsToMoney(deductionCents),
    netPay: centsToMoney(netCents),
    earnings,
    deductions,
    additionalSalaries: additionalLines,
    statutoryDeductions: statutoryLines,
  };
}
