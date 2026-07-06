import { users } from "../db/schema.js";
import { AccountsRepository } from "../repository/accounts.repo.js";

function toNumberAmount(value: unknown) {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error("Amount must be a valid non-negative number");
  return parsed.toFixed(2);
}

function getAdminScopeId(currentUser: typeof users.$inferSelect) {
  if (currentUser.roleId !== 0 && currentUser.roleId !== 1) {
    throw new Error("Only admins can access accounts");
  }
  return currentUser.id;
}

export class AccountsServices {
  private repo = new AccountsRepository();

  async getChartAccounts(currentUser: typeof users.$inferSelect) {
    const adminId = getAdminScopeId(currentUser);
    const data = await this.repo.getChartAccounts(adminId);
    return { success: true, data };
  }

  async createChartAccount(body: any, currentUser: typeof users.$inferSelect) {
    const adminId = getAdminScopeId(currentUser);
    if (!body.accountName || !body.accountType) throw new Error("Account Name and Type are required");
    const data = await this.repo.createChartAccount({
      adminId,
      accountName: String(body.accountName).trim(),
      accountType: String(body.accountType).trim(),
      parentAccount: body.parentAccount?.trim() || null,
      currency: body.currency?.trim() || null,
      openingBalance: toNumberAmount(body.openingBalance),
      createdBy: currentUser.id,
    });
    return { success: true, message: "Account created successfully", data };
  }

  async updateChartAccount(id: number, body: any, currentUser: typeof users.$inferSelect) {
    const adminId = getAdminScopeId(currentUser);
    const data = await this.repo.updateChartAccount(id, adminId, {
      accountName: String(body.accountName).trim(),
      accountType: String(body.accountType).trim(),
      parentAccount: body.parentAccount?.trim() || null,
      currency: body.currency?.trim() || null,
      openingBalance: toNumberAmount(body.openingBalance),
    });
    if (!data) throw new Error("Account not found");
    return { success: true, message: "Account updated successfully", data };
  }

  async deleteChartAccount(id: number, currentUser: typeof users.$inferSelect) {
    const adminId = getAdminScopeId(currentUser);
    const [journalLinks, bankLinks] = await Promise.all([
      this.repo.countJournalLinesForAccount(id),
      this.repo.countBankLinksForAccount(id),
    ]);
    if (journalLinks > 0 || bankLinks > 0) {
      throw new Error("This account has existing transactions that must be resolved before it can be disabled.");
    }
    const data = await this.repo.softDeleteChartAccount(id, adminId);
    if (!data) throw new Error("Account not found");
    return { success: true, message: "Account deleted successfully", data };
  }

  async getAccountLedger(id: number, currentUser: typeof users.$inferSelect) {
    const adminId = getAdminScopeId(currentUser);
    const account = await this.repo.getChartAccountById(id, adminId);
    if (!account) throw new Error("Account not found");
    const rows = await this.repo.getLedger(id, adminId);
    let runningBalance = Number(account.openingBalance ?? 0);
    const ledger = rows
      .slice()
      .reverse()
      .map((row) => {
        runningBalance += Number(row.debit ?? 0) - Number(row.credit ?? 0);
        return {
          ...row,
          balance: runningBalance.toFixed(2),
        };
      })
      .reverse();
    return { success: true, data: { account, ledger } };
  }

  async getBankCashAccounts(currentUser: typeof users.$inferSelect) {
    const adminId = getAdminScopeId(currentUser);
    const data = await this.repo.getBankCashAccounts(adminId);
    return { success: true, data };
  }

  async createBankCashAccount(body: any, currentUser: typeof users.$inferSelect) {
    const adminId = getAdminScopeId(currentUser);
    if (!body.bankName || !body.accountNumber) throw new Error("Bank Name and Account Number are required");
    if (!/^\d{12}$/.test(String(body.accountNumber))) throw new Error("Account Number must be exactly 12 digits");
    const data = await this.repo.createBankCashAccount({
      adminId,
      accountType: String(body.accountType || "Bank"),
      bankName: String(body.bankName).trim(),
      accountNumber: String(body.accountNumber),
      openingBalance: toNumberAmount(body.openingBalance),
      linkedGlAccountId: body.linkedGlAccountId ? Number(body.linkedGlAccountId) : null,
      createdBy: currentUser.id,
    });
    return { success: true, message: "Bank and cash account created successfully", data };
  }

  async updateBankCashAccount(id: number, body: any, currentUser: typeof users.$inferSelect) {
    const adminId = getAdminScopeId(currentUser);
    const data = await this.repo.updateBankCashAccount(id, adminId, {
      accountType: String(body.accountType || "Bank"),
      bankName: String(body.bankName).trim(),
      accountNumber: String(body.accountNumber),
      openingBalance: toNumberAmount(body.openingBalance),
      linkedGlAccountId: body.linkedGlAccountId ? Number(body.linkedGlAccountId) : null,
    });
    if (!data) throw new Error("Bank and cash account not found");
    return { success: true, message: "Bank and cash account updated successfully", data };
  }

  async deleteBankCashAccount(id: number, currentUser: typeof users.$inferSelect) {
    const adminId = getAdminScopeId(currentUser);
    const data = await this.repo.softDeleteBankCashAccount(id, adminId);
    if (!data) throw new Error("Bank and cash account not found");
    return { success: true, message: "Bank and cash account deleted successfully", data };
  }

  async getJournalEntries(currentUser: typeof users.$inferSelect) {
    const adminId = getAdminScopeId(currentUser);
    const entries = await this.repo.getJournalEntries(adminId);
    const data = entries.map((entry) => ({
      ...entry,
      entries: entry.lines.map((line) => ({
        id: line.id,
        accountId: line.accountId,
        account: line.accountName,
        debit: line.debit,
        credit: line.credit,
      })),
    }));
    return { success: true, data };
  }

  async getJournalEntry(id: number, currentUser: typeof users.$inferSelect) {
    const adminId = getAdminScopeId(currentUser);
    const entry = await this.repo.getJournalEntryById(id, adminId);
    if (!entry) throw new Error("Journal entry not found");
    return {
      success: true,
      data: {
        ...entry,
        entries: entry.lines.map((line) => ({
          id: line.id,
          accountId: line.accountId,
          account: line.accountName,
          debit: line.debit,
          credit: line.credit,
        })),
      },
    };
  }

  private normalizeJournalPayload(body: any) {
    if (!body.entryDate || !body.remarks) throw new Error("Entry date and remarks are required");
    if (!Array.isArray(body.entries) || !body.entries.length) throw new Error("At least one journal line is required");
    const entries = body.entries.map((entry: any) => {
      if (!entry.accountId) throw new Error("Each journal line must include an account");
      return {
        accountId: Number(entry.accountId),
        debit: toNumberAmount(entry.debit),
        credit: toNumberAmount(entry.credit),
      };
    });
    const totalDebit = entries.reduce((sum: number, entry: { debit: string }) => sum + Number(entry.debit), 0);
    const totalCredit = entries.reduce((sum: number, entry: { credit: string }) => sum + Number(entry.credit), 0);
    return {
      entryDate: String(body.entryDate),
      remarks: String(body.remarks).trim(),
      entries,
      totalDebit: totalDebit.toFixed(2),
      totalCredit: totalCredit.toFixed(2),
      balance: (totalDebit - totalCredit).toFixed(2),
    };
  }

  async createJournalEntry(body: any, currentUser: typeof users.$inferSelect) {
    const adminId = getAdminScopeId(currentUser);
    const payload = this.normalizeJournalPayload(body);
    const data = await this.repo.createJournalEntryWithLines(
      {
        adminId,
        entryDate: payload.entryDate,
        remarks: payload.remarks,
        totalDebit: payload.totalDebit,
        totalCredit: payload.totalCredit,
        balance: payload.balance,
        createdBy: currentUser.id,
      },
      payload.entries,
    );
    return { success: true, message: "Journal entry created successfully", data };
  }

  async updateJournalEntry(id: number, body: any, currentUser: typeof users.$inferSelect) {
    const adminId = getAdminScopeId(currentUser);
    const payload = this.normalizeJournalPayload(body);
    const data = await this.repo.updateJournalEntryWithLines(
      id,
      adminId,
      {
        entryDate: payload.entryDate,
        remarks: payload.remarks,
        totalDebit: payload.totalDebit,
        totalCredit: payload.totalCredit,
        balance: payload.balance,
      },
      payload.entries,
    );
    if (!data) throw new Error("Journal entry not found");
    return { success: true, message: "Journal entry updated successfully", data };
  }

  async deleteJournalEntry(id: number, currentUser: typeof users.$inferSelect) {
    const adminId = getAdminScopeId(currentUser);
    const data = await this.repo.softDeleteJournalEntry(id, adminId);
    if (!data) throw new Error("Journal entry not found");
    return { success: true, message: "Journal entry deleted successfully", data };
  }
}
