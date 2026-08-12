import { NextFunction, Request, Response } from "express";
import { ExpenseServices } from "../services/expenseServices.js";

const service = new ExpenseServices();

const run =
  (handler: (req: Request, res: Response) => Promise<void>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req, res);
    } catch (error: any) {
      const status = error?.statusCode || 400;
      res.status(status).json({
        success: false,
        message: error?.message || "Expense request failed",
      });
    }
  };

const requireId = (req: Request, res: Response, label: string): number | null => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ success: false, message: `Invalid ${label} ID` });
    return null;
  }
  return id;
};

export const listCategories = run(async (_req, res) => {
  res.json(await service.listCategories(res.locals.user));
});

export const createCategory = run(async (req, res) => {
  res.status(201).json(await service.createCategory(req.body, res.locals.user));
});

export const updateCategory = run(async (req, res) => {
  const id = requireId(req, res, "category");
  if (id === null) return;
  res.json(await service.updateCategory(id, req.body, res.locals.user));
});

export const deleteCategory = run(async (req, res) => {
  const id = requireId(req, res, "category");
  if (id === null) return;
  res.json(await service.deleteCategory(id, res.locals.user));
});

export const listExpenses = run(async (req, res) => {
  res.json(await service.listExpenses(res.locals.user, req.query));
});

export const getExpense = run(async (req, res) => {
  const id = requireId(req, res, "expense");
  if (id === null) return;
  res.json(await service.getExpense(id, res.locals.user));
});

export const createExpense = run(async (req, res) => {
  res.status(201).json(await service.createExpense(req.body, res.locals.user));
});

export const updateExpense = run(async (req, res) => {
  const id = requireId(req, res, "expense");
  if (id === null) return;
  res.json(await service.updateExpense(id, req.body, res.locals.user));
});

export const updateExpenseStatus = run(async (req, res) => {
  const id = requireId(req, res, "expense");
  if (id === null) return;
  res.json(
    await service.updateExpenseStatus(id, String(req.body.status || ""), res.locals.user),
  );
});

export const deleteExpense = run(async (req, res) => {
  const id = requireId(req, res, "expense");
  if (id === null) return;
  res.json(await service.deleteExpense(id, res.locals.user));
});
