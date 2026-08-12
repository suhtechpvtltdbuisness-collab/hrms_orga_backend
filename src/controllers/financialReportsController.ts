import { NextFunction, Request, Response } from "express";
import {
  FinancialReportsServices,
  ReportQuery,
} from "../services/financialReportsServices.js";

const service = new FinancialReportsServices();

const run =
  (handler: (req: Request, res: Response) => Promise<void>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req, res);
    } catch (error) {
      next(error);
    }
  };

const asString = (value: unknown): string | undefined =>
  value === undefined || value === null || value === "" ? undefined : String(value);

const asNumber = (value: unknown): number | undefined => {
  const parsed = Number(value);
  return value === undefined || value === null || value === "" || !Number.isFinite(parsed)
    ? undefined
    : parsed;
};

const parseQuery = (req: Request): ReportQuery => ({
  from: asString(req.query.from),
  to: asString(req.query.to),
  asOf: asString(req.query.asOf),
  departmentId: asNumber(req.query.departmentId),
  costCenter: asString(req.query.costCenter),
  bankAccountId: asNumber(req.query.bankAccountId),
  budgetId: asNumber(req.query.budgetId),
  category: asString(req.query.category),
});

const requireId = (req: Request, res: Response, label: string): number | null => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ success: false, message: `Invalid ${label} ID` });
    return null;
  }
  return id;
};

export const getProfitAndLoss = run(async (req, res) => {
  res.json(await service.getProfitAndLoss(res.locals.user, parseQuery(req)));
});

export const getBalanceSheet = run(async (req, res) => {
  res.json(await service.getBalanceSheet(res.locals.user, parseQuery(req)));
});

export const getCashFlow = run(async (req, res) => {
  res.json(await service.getCashFlow(res.locals.user, parseQuery(req)));
});

export const getBudgetVsActual = run(async (req, res) => {
  res.json(await service.getBudgetVsActual(res.locals.user, parseQuery(req)));
});

export const getTrialBalance = run(async (req, res) => {
  res.json(await service.getTrialBalance(res.locals.user, parseQuery(req)));
});

export const getFilterOptions = run(async (_req, res) => {
  res.json(await service.getFilterOptions(res.locals.user));
});

export const getAccountClassification = run(async (_req, res) => {
  res.json(await service.getAccountClassification(res.locals.user));
});

export const updateAccountClassification = run(async (req, res) => {
  const id = requireId(req, res, "account");
  if (id === null) return;
  res.json(
    await service.updateAccountClassification(id, req.body, res.locals.user),
  );
});

export const listFiscalYears = run(async (_req, res) => {
  res.json(await service.listFiscalYears(res.locals.user));
});

export const createFiscalYear = run(async (req, res) => {
  res.status(201).json(await service.createFiscalYear(req.body, res.locals.user));
});

export const updateFiscalYear = run(async (req, res) => {
  const id = requireId(req, res, "fiscal year");
  if (id === null) return;
  res.json(await service.updateFiscalYear(id, req.body, res.locals.user));
});

export const deleteFiscalYear = run(async (req, res) => {
  const id = requireId(req, res, "fiscal year");
  if (id === null) return;
  res.json(await service.deleteFiscalYear(id, res.locals.user));
});

export const listBudgets = run(async (req, res) => {
  res.json(
    await service.listBudgets(res.locals.user, {
      ...parseQuery(req),
      status: asString(req.query.status),
    }),
  );
});

export const getBudget = run(async (req, res) => {
  const id = requireId(req, res, "budget");
  if (id === null) return;
  res.json(await service.getBudget(id, res.locals.user));
});

export const createBudget = run(async (req, res) => {
  res.status(201).json(await service.createBudget(req.body, res.locals.user));
});

export const updateBudget = run(async (req, res) => {
  const id = requireId(req, res, "budget");
  if (id === null) return;
  res.json(await service.updateBudget(id, req.body, res.locals.user));
});

export const deleteBudget = run(async (req, res) => {
  const id = requireId(req, res, "budget");
  if (id === null) return;
  res.json(await service.deleteBudget(id, res.locals.user));
});
