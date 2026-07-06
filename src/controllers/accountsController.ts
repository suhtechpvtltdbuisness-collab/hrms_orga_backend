import { NextFunction, Request, Response } from "express";
import { AccountsServices } from "../services/accountsServices.js";

const service = new AccountsServices();

const run =
  (handler: (req: Request, res: Response) => Promise<void>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req, res);
    } catch (error) {
      next(error);
    }
  };

export const getChartAccounts = run(async (_req, res) => {
  res.json(await service.getChartAccounts(res.locals.user));
});

export const createChartAccount = run(async (req, res) => {
  res.status(201).json(await service.createChartAccount(req.body, res.locals.user));
});

export const updateChartAccount = run(async (req, res) => {
  res.json(await service.updateChartAccount(Number(req.params.id), req.body, res.locals.user));
});

export const deleteChartAccount = run(async (req, res) => {
  res.json(await service.deleteChartAccount(Number(req.params.id), res.locals.user));
});

export const getAccountLedger = run(async (req, res) => {
  res.json(await service.getAccountLedger(Number(req.params.id), res.locals.user));
});

export const getBankCashAccounts = run(async (_req, res) => {
  res.json(await service.getBankCashAccounts(res.locals.user));
});

export const createBankCashAccount = run(async (req, res) => {
  res.status(201).json(await service.createBankCashAccount(req.body, res.locals.user));
});

export const updateBankCashAccount = run(async (req, res) => {
  res.json(await service.updateBankCashAccount(Number(req.params.id), req.body, res.locals.user));
});

export const deleteBankCashAccount = run(async (req, res) => {
  res.json(await service.deleteBankCashAccount(Number(req.params.id), res.locals.user));
});

export const getJournalEntries = run(async (_req, res) => {
  res.json(await service.getJournalEntries(res.locals.user));
});

export const getJournalEntry = run(async (req, res) => {
  res.json(await service.getJournalEntry(Number(req.params.id), res.locals.user));
});

export const createJournalEntry = run(async (req, res) => {
  res.status(201).json(await service.createJournalEntry(req.body, res.locals.user));
});

export const updateJournalEntry = run(async (req, res) => {
  res.json(await service.updateJournalEntry(Number(req.params.id), req.body, res.locals.user));
});

export const deleteJournalEntry = run(async (req, res) => {
  res.json(await service.deleteJournalEntry(Number(req.params.id), res.locals.user));
});
