import test from "node:test";
import assert from "node:assert/strict";
import { calculatePayroll } from "./payrollCalculation.js";

test("calculates normal payroll with configured statutory deductions", () => {
  const result = calculatePayroll({
    totalWorkingDays: 30,
    paidDays: 30,
    components: [
      {
        code: "BASIC",
        name: "Basic",
        type: "earning",
        amountType: "fixed",
        amount: "30000",
        taxable: true,
      },
      {
        code: "HRA",
        name: "HRA",
        type: "earning",
        amountType: "formula",
        formula: "BASIC * 0.4",
        taxable: true,
        dependsOnPaymentDays: false,
      },
    ],
    statutoryDeductions: {
      pf: { enabled: true, rate: 12, base: "taxable", maxAmount: "1800" },
      professionalTax: { enabled: true, amount: "200" },
    },
  });

  assert.equal(result.grossPay, "42000.00");
  assert.equal(result.totalDeductions, "2000.00");
  assert.equal(result.netPay, "40000.00");
});

test("prorates a mid-cycle joiner or leaver by paid days", () => {
  const result = calculatePayroll({
    totalWorkingDays: 30,
    paidDays: 15,
    components: [
      {
        code: "BASIC",
        name: "Basic",
        type: "earning",
        amountType: "fixed",
        amount: "30000",
        taxable: true,
      },
      {
        code: "HRA",
        name: "HRA",
        type: "earning",
        amountType: "formula",
        formula: "BASIC * 0.4",
        taxable: true,
        dependsOnPaymentDays: false,
      },
    ],
    statutoryDeductions: {
      professionalTax: { enabled: true, amount: "100" },
    },
  });

  assert.equal(result.grossPay, "21000.00");
  assert.equal(result.totalDeductions, "100.00");
  assert.equal(result.netPay, "20900.00");
});

test("includes additional earning and deduction in net pay", () => {
  const result = calculatePayroll({
    totalWorkingDays: 30,
    paidDays: 30,
    components: [
      {
        code: "BASIC",
        name: "Basic",
        type: "earning",
        amountType: "fixed",
        amount: "40000",
        taxable: true,
      },
    ],
    additionalSalaries: [
      {
        componentName: "Performance Bonus",
        type: "earning",
        amount: "5000",
        taxable: true,
      },
      {
        componentName: "Recovery Deduction",
        type: "deduction",
        amount: "1000",
      },
    ],
    statutoryDeductions: {
      tds: { enabled: true, amount: "2000" },
    },
  });

  assert.equal(result.grossPay, "45000.00");
  assert.equal(result.totalDeductions, "3000.00");
  assert.equal(result.netPay, "42000.00");
});
