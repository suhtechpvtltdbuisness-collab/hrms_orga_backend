import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/connection.js";
import { bankCashAccount, chartAccount, journalEntry, journalEntryLine } from "../db/schema.js";

export class AccountsRepository {
  async getChartAccounts(adminId: number) {
    return db
      .select()
      .from(chartAccount)
      .where(and(eq(chartAccount.adminId, adminId), eq(chartAccount.isDeleted, false)))
      .orderBy(asc(chartAccount.accountType), asc(chartAccount.accountName));
  }

  async getChartAccountById(id: number, adminId: number) {
    const [account] = await db
      .select()
      .from(chartAccount)
      .where(and(eq(chartAccount.id, id), eq(chartAccount.adminId, adminId), eq(chartAccount.isDeleted, false)))
      .limit(1);
    return account;
  }

  async createChartAccount(values: typeof chartAccount.$inferInsert) {
    const [account] = await db.insert(chartAccount).values(values).returning();
    return account;
  }

  async updateChartAccount(id: number, adminId: number, values: Partial<typeof chartAccount.$inferInsert>) {
    const [account] = await db
      .update(chartAccount)
      .set({ ...values, updatedAt: new Date() })
      .where(and(eq(chartAccount.id, id), eq(chartAccount.adminId, adminId), eq(chartAccount.isDeleted, false)))
      .returning();
    return account;
  }

  async countJournalLinesForAccount(accountId: number) {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(journalEntryLine)
      .where(eq(journalEntryLine.accountId, accountId));
    return result?.count ?? 0;
  }

  async countBankLinksForAccount(accountId: number) {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bankCashAccount)
      .where(and(eq(bankCashAccount.linkedGlAccountId, accountId), eq(bankCashAccount.isDeleted, false)));
    return result?.count ?? 0;
  }

  async softDeleteChartAccount(id: number, adminId: number) {
    const [account] = await db
      .update(chartAccount)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(and(eq(chartAccount.id, id), eq(chartAccount.adminId, adminId), eq(chartAccount.isDeleted, false)))
      .returning();
    return account;
  }

  async getLedger(accountId: number, adminId: number) {
    return db
      .select({
        id: journalEntryLine.id,
        date: journalEntry.entryDate,
        accountName: chartAccount.accountName,
        debit: journalEntryLine.debit,
        credit: journalEntryLine.credit,
      })
      .from(journalEntryLine)
      .innerJoin(journalEntry, eq(journalEntry.id, journalEntryLine.journalEntryId))
      .innerJoin(chartAccount, eq(chartAccount.id, journalEntryLine.accountId))
      .where(
        and(
          eq(journalEntryLine.accountId, accountId),
          eq(journalEntry.adminId, adminId),
          eq(journalEntry.isDeleted, false),
          eq(chartAccount.isDeleted, false),
        ),
      )
      .orderBy(desc(journalEntry.createdAt), desc(journalEntryLine.id));
  }

  async getBankCashAccounts(adminId: number) {
    return db
      .select({
        id: bankCashAccount.id,
        accountType: bankCashAccount.accountType,
        bankName: bankCashAccount.bankName,
        accountNumber: bankCashAccount.accountNumber,
        openingBalance: bankCashAccount.openingBalance,
        linkedGlAccountId: bankCashAccount.linkedGlAccountId,
        linkedGlAccountName: chartAccount.accountName,
      })
      .from(bankCashAccount)
      .leftJoin(chartAccount, eq(chartAccount.id, bankCashAccount.linkedGlAccountId))
      .where(and(eq(bankCashAccount.adminId, adminId), eq(bankCashAccount.isDeleted, false)))
      .orderBy(asc(bankCashAccount.bankName));
  }

  async getBankCashAccountById(id: number, adminId: number) {
    const [account] = await db
      .select()
      .from(bankCashAccount)
      .where(and(eq(bankCashAccount.id, id), eq(bankCashAccount.adminId, adminId), eq(bankCashAccount.isDeleted, false)))
      .limit(1);
    return account;
  }

  async createBankCashAccount(values: typeof bankCashAccount.$inferInsert) {
    const [account] = await db.insert(bankCashAccount).values(values).returning();
    return account;
  }

  async updateBankCashAccount(id: number, adminId: number, values: Partial<typeof bankCashAccount.$inferInsert>) {
    const [account] = await db
      .update(bankCashAccount)
      .set({ ...values, updatedAt: new Date() })
      .where(and(eq(bankCashAccount.id, id), eq(bankCashAccount.adminId, adminId), eq(bankCashAccount.isDeleted, false)))
      .returning();
    return account;
  }

  async softDeleteBankCashAccount(id: number, adminId: number) {
    const [account] = await db
      .update(bankCashAccount)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(and(eq(bankCashAccount.id, id), eq(bankCashAccount.adminId, adminId), eq(bankCashAccount.isDeleted, false)))
      .returning();
    return account;
  }

  async getJournalEntries(adminId: number) {
    const entries = await db
      .select()
      .from(journalEntry)
      .where(and(eq(journalEntry.adminId, adminId), eq(journalEntry.isDeleted, false)))
      .orderBy(desc(journalEntry.createdAt));

    if (!entries.length) return [];
    const entryIds = entries.map((entry) => entry.id);
    const lines = await db
      .select({
        id: journalEntryLine.id,
        journalEntryId: journalEntryLine.journalEntryId,
        accountId: journalEntryLine.accountId,
        accountName: chartAccount.accountName,
        debit: journalEntryLine.debit,
        credit: journalEntryLine.credit,
      })
      .from(journalEntryLine)
      .innerJoin(chartAccount, eq(chartAccount.id, journalEntryLine.accountId))
      .where(inArray(journalEntryLine.journalEntryId, entryIds))
      .orderBy(asc(journalEntryLine.id));

    return entries.map((entry) => ({
      ...entry,
      lines: lines.filter((line) => line.journalEntryId === entry.id),
    }));
  }

  async getJournalEntryById(id: number, adminId: number) {
    const [entry] = await db
      .select()
      .from(journalEntry)
      .where(and(eq(journalEntry.id, id), eq(journalEntry.adminId, adminId), eq(journalEntry.isDeleted, false)))
      .limit(1);
    if (!entry) return null;
    const lines = await db
      .select({
        id: journalEntryLine.id,
        accountId: journalEntryLine.accountId,
        accountName: chartAccount.accountName,
        debit: journalEntryLine.debit,
        credit: journalEntryLine.credit,
      })
      .from(journalEntryLine)
      .innerJoin(chartAccount, eq(chartAccount.id, journalEntryLine.accountId))
      .where(eq(journalEntryLine.journalEntryId, entry.id))
      .orderBy(asc(journalEntryLine.id));
    return { ...entry, lines };
  }

  async createJournalEntryWithLines(
    entryValues: typeof journalEntry.$inferInsert,
    lineValues: Array<typeof journalEntryLine.$inferInsert>,
  ) {
    return db.transaction(async (tx) => {
      const [entry] = await tx.insert(journalEntry).values(entryValues).returning();
      const lines = await tx
        .insert(journalEntryLine)
        .values(lineValues.map((line) => ({ ...line, journalEntryId: entry.id })))
        .returning();
      return { ...entry, lines };
    });
  }

  async updateJournalEntryWithLines(
    id: number,
    adminId: number,
    entryValues: Partial<typeof journalEntry.$inferInsert>,
    lineValues: Array<Omit<typeof journalEntryLine.$inferInsert, "journalEntryId">>,
  ) {
    return db.transaction(async (tx) => {
      const [entry] = await tx
        .update(journalEntry)
        .set({ ...entryValues, updatedAt: new Date() })
        .where(and(eq(journalEntry.id, id), eq(journalEntry.adminId, adminId), eq(journalEntry.isDeleted, false)))
        .returning();
      await tx.delete(journalEntryLine).where(eq(journalEntryLine.journalEntryId, id));
      const lines = await tx
        .insert(journalEntryLine)
        .values(lineValues.map((line) => ({ ...line, journalEntryId: id })))
        .returning();
      return { ...entry, lines };
    });
  }

  async softDeleteJournalEntry(id: number, adminId: number) {
    const [entry] = await db
      .update(journalEntry)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(and(eq(journalEntry.id, id), eq(journalEntry.adminId, adminId), eq(journalEntry.isDeleted, false)))
      .returning();
    return entry;
  }
}
