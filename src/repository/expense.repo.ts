import { and, asc, desc, eq, gte, ilike, inArray, lte, ne, sql } from "drizzle-orm";
import { db } from "../db/connection.js";
import { department, expense, expenseCategory } from "../db/schema.js";

export class ExpenseRepository {
  async listCategories(organizationId: number) {
    return db
      .select()
      .from(expenseCategory)
      .where(
        and(
          eq(expenseCategory.organizationId, organizationId),
          eq(expenseCategory.isDeleted, false),
        ),
      )
      .orderBy(asc(expenseCategory.name));
  }

  async getCategoryById(id: number, organizationId: number) {
    const [row] = await db
      .select()
      .from(expenseCategory)
      .where(
        and(
          eq(expenseCategory.id, id),
          eq(expenseCategory.organizationId, organizationId),
          eq(expenseCategory.isDeleted, false),
        ),
      )
      .limit(1);
    return row;
  }

  async createCategory(data: typeof expenseCategory.$inferInsert) {
    const [row] = await db.insert(expenseCategory).values(data).returning();
    return row;
  }

  async updateCategory(
    id: number,
    organizationId: number,
    data: Partial<typeof expenseCategory.$inferInsert>,
  ) {
    const [row] = await db
      .update(expenseCategory)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(expenseCategory.id, id),
          eq(expenseCategory.organizationId, organizationId),
          eq(expenseCategory.isDeleted, false),
        ),
      )
      .returning();
    return row;
  }

  async softDeleteCategory(id: number, organizationId: number) {
    const [row] = await db
      .update(expenseCategory)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(
        and(
          eq(expenseCategory.id, id),
          eq(expenseCategory.organizationId, organizationId),
        ),
      )
      .returning();
    return row;
  }

  async listExpenses(
    organizationId: number,
    filters: {
      status?: string;
      title?: string;
      category?: string;
      from?: string;
      to?: string;
      pendingOnly?: boolean;
    } = {},
  ) {
    const conditions = [
      eq(expense.organizationId, organizationId),
      eq(expense.isDeleted, false),
    ];
    if (filters.status) conditions.push(eq(expense.status, filters.status));
    if (filters.pendingOnly) {
      conditions.push(inArray(expense.status, ["Submitted", "Manager Approved"]));
    }
    if (filters.title) conditions.push(ilike(expense.title, `%${filters.title}%`));
    if (filters.category) conditions.push(eq(expense.category, filters.category));
    if (filters.from) conditions.push(gte(expense.expenseDate, filters.from));
    if (filters.to) conditions.push(lte(expense.expenseDate, filters.to));

    return db
      .select({
        id: expense.id,
        title: expense.title,
        description: expense.description,
        category: expense.category,
        categoryId: expense.categoryId,
        amount: expense.amount,
        date: expense.expenseDate,
        expenseDate: expense.expenseDate,
        paymentType: expense.paymentType,
        bill: expense.bill,
        status: expense.status,
        employee: expense.employeeName,
        employeeName: expense.employeeName,
        costCenter: expense.costCenter,
        departmentId: expense.departmentId,
        departmentName: department.departmentName,
        createdAt: expense.createdAt,
        updatedAt: expense.updatedAt,
      })
      .from(expense)
      .leftJoin(department, eq(department.id, expense.departmentId))
      .where(and(...conditions))
      .orderBy(desc(expense.expenseDate), desc(expense.id));
  }

  async getExpenseById(id: number, organizationId: number) {
    const [row] = await db
      .select({
        id: expense.id,
        title: expense.title,
        description: expense.description,
        category: expense.category,
        categoryId: expense.categoryId,
        amount: expense.amount,
        date: expense.expenseDate,
        expenseDate: expense.expenseDate,
        paymentType: expense.paymentType,
        bill: expense.bill,
        status: expense.status,
        employee: expense.employeeName,
        employeeName: expense.employeeName,
        costCenter: expense.costCenter,
        departmentId: expense.departmentId,
        departmentName: department.departmentName,
        createdAt: expense.createdAt,
        updatedAt: expense.updatedAt,
      })
      .from(expense)
      .leftJoin(department, eq(department.id, expense.departmentId))
      .where(
        and(
          eq(expense.id, id),
          eq(expense.organizationId, organizationId),
          eq(expense.isDeleted, false),
        ),
      )
      .limit(1);
    return row;
  }

  async createExpense(data: typeof expense.$inferInsert) {
    const [row] = await db.insert(expense).values(data).returning();
    return row;
  }

  async updateExpense(
    id: number,
    organizationId: number,
    data: Partial<typeof expense.$inferInsert>,
  ) {
    const [row] = await db
      .update(expense)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(expense.id, id),
          eq(expense.organizationId, organizationId),
          eq(expense.isDeleted, false),
        ),
      )
      .returning();
    return row;
  }

  async softDeleteExpense(id: number, organizationId: number) {
    const [row] = await db
      .update(expense)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(
        and(eq(expense.id, id), eq(expense.organizationId, organizationId)),
      )
      .returning();
    return row;
  }

  async sumByCategory(
    organizationId: number,
    from: string,
    to: string,
    statuses: string[],
  ) {
    return db
      .select({
        category: expense.category,
        departmentId: expense.departmentId,
        departmentName: department.departmentName,
        costCenter: expense.costCenter,
        amount: sql<number>`coalesce(sum(${expense.amount}::numeric), 0)::float`,
      })
      .from(expense)
      .leftJoin(department, eq(department.id, expense.departmentId))
      .where(
        and(
          eq(expense.organizationId, organizationId),
          eq(expense.isDeleted, false),
          inArray(expense.status, statuses),
          gte(expense.expenseDate, from),
          lte(expense.expenseDate, to),
          ne(expense.status, "Rejected"),
        ),
      )
      .groupBy(
        expense.category,
        expense.departmentId,
        department.departmentName,
        expense.costCenter,
      );
  }
}
