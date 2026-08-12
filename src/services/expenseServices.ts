import { users } from "../db/schema.js";
import { ExpenseRepository } from "../repository/expense.repo.js";

type CurrentUser = typeof users.$inferSelect;

const EXPENSE_STATUSES = [
  "Draft",
  "Submitted",
  "Manager Approved",
  "Approved",
  "Reimbursed",
  "Rejected",
] as const;

function getOrgId(currentUser: CurrentUser) {
  if (!currentUser?.organizationId) {
    throw Object.assign(new Error("User does not belong to any organization"), {
      statusCode: 400,
    });
  }
  return currentUser.organizationId;
}

function toAmount(value: unknown) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n < 0) {
    throw Object.assign(new Error("Amount must be a valid non-negative number"), {
      statusCode: 400,
    });
  }
  return n.toFixed(2);
}

/** Accepts YYYY-MM-DD or DD/MM/YYYY and returns ISO date. */
export function normalizeExpenseDate(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const dmy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, "0");
    const month = dmy[2].padStart(2, "0");
    return `${dmy[3]}-${month}-${day}`;
  }
  throw Object.assign(new Error("Invalid expense date. Use YYYY-MM-DD or DD/MM/YYYY"), {
    statusCode: 400,
  });
}

function mapExpense(row: any) {
  if (!row) return row;
  return {
    ...row,
    amount: Number(row.amount || 0),
    date: row.date || row.expenseDate,
  };
}

export class ExpenseServices {
  private repo = new ExpenseRepository();

  async listCategories(currentUser: CurrentUser) {
    const data = await this.repo.listCategories(getOrgId(currentUser));
    return {
      success: true,
      data: data.map((row) => ({
        ...row,
        monthlyBudget: row.monthlyBudget != null ? Number(row.monthlyBudget) : null,
        dailyLimit: row.dailyLimit != null ? Number(row.dailyLimit) : null,
      })),
    };
  }

  async createCategory(body: any, currentUser: CurrentUser) {
    const orgId = getOrgId(currentUser);
    if (!body.name?.trim()) {
      throw Object.assign(new Error("Category name is required"), { statusCode: 400 });
    }
    const data = await this.repo.createCategory({
      organizationId: orgId,
      name: String(body.name).trim(),
      linkedAccount: body.linkedAccount?.trim() || null,
      monthlyBudget:
        body.monthlyBudget === "" || body.monthlyBudget == null
          ? null
          : toAmount(body.monthlyBudget),
      dailyLimit:
        body.dailyLimit === "" || body.dailyLimit == null
          ? null
          : toAmount(body.dailyLimit),
      approval: body.approval === "Required" ? "Required" : "Not Required",
      createdBy: currentUser.id,
    });
    return { success: true, message: "Category created", data };
  }

  async updateCategory(id: number, body: any, currentUser: CurrentUser) {
    const orgId = getOrgId(currentUser);
    const data = await this.repo.updateCategory(id, orgId, {
      name: String(body.name || "").trim(),
      linkedAccount: body.linkedAccount?.trim() || null,
      monthlyBudget:
        body.monthlyBudget === "" || body.monthlyBudget == null
          ? null
          : toAmount(body.monthlyBudget),
      dailyLimit:
        body.dailyLimit === "" || body.dailyLimit == null
          ? null
          : toAmount(body.dailyLimit),
      approval: body.approval === "Required" ? "Required" : "Not Required",
    });
    if (!data) {
      throw Object.assign(new Error("Category not found"), { statusCode: 404 });
    }
    return { success: true, message: "Category updated", data };
  }

  async deleteCategory(id: number, currentUser: CurrentUser) {
    const data = await this.repo.softDeleteCategory(id, getOrgId(currentUser));
    if (!data) {
      throw Object.assign(new Error("Category not found"), { statusCode: 404 });
    }
    return { success: true, message: "Category deleted", data };
  }

  async listExpenses(currentUser: CurrentUser, query: any = {}) {
    const data = await this.repo.listExpenses(getOrgId(currentUser), {
      status: query.status,
      title: query.title,
      category: query.category,
      from: query.from,
      to: query.to,
      pendingOnly: query.pendingOnly === true || query.pendingOnly === "true",
    });
    return { success: true, data: data.map(mapExpense) };
  }

  async getExpense(id: number, currentUser: CurrentUser) {
    const data = await this.repo.getExpenseById(id, getOrgId(currentUser));
    if (!data) {
      throw Object.assign(new Error("Expense not found"), { statusCode: 404 });
    }
    return { success: true, data: mapExpense(data) };
  }

  async createExpense(body: any, currentUser: CurrentUser) {
    const orgId = getOrgId(currentUser);
    if (!body.title?.trim()) {
      throw Object.assign(new Error("Title is required"), { statusCode: 400 });
    }
    if (!body.category?.trim() && !body.categoryId) {
      throw Object.assign(new Error("Category is required"), { statusCode: 400 });
    }
    let categoryName = body.category?.trim() || "";
    let categoryId = body.categoryId ? Number(body.categoryId) : null;
    if (categoryId) {
      const cat = await this.repo.getCategoryById(categoryId, orgId);
      if (!cat) {
        throw Object.assign(new Error("Category not found"), { statusCode: 400 });
      }
      categoryName = cat.name;
    }

    const created = await this.repo.createExpense({
      organizationId: orgId,
      title: String(body.title).trim(),
      description: body.description?.trim() || null,
      category: categoryName,
      categoryId,
      amount: toAmount(body.amount),
      expenseDate: normalizeExpenseDate(body.date || body.expenseDate),
      paymentType: body.paymentType?.trim() || null,
      bill: body.bill || null,
      status: body.status && EXPENSE_STATUSES.includes(body.status)
        ? body.status
        : "Submitted",
      employeeName: body.employee || body.employeeName || currentUser.name || null,
      costCenter: body.costCenter?.trim() || null,
      departmentId: body.departmentId ? Number(body.departmentId) : null,
      createdBy: currentUser.id,
    });
    const data = await this.repo.getExpenseById(created.id, orgId);
    return { success: true, message: "Expense created", data: mapExpense(data) };
  }

  async updateExpense(id: number, body: any, currentUser: CurrentUser) {
    const orgId = getOrgId(currentUser);
    const existing = await this.repo.getExpenseById(id, orgId);
    if (!existing) {
      throw Object.assign(new Error("Expense not found"), { statusCode: 404 });
    }

    let categoryName = body.category?.trim() || existing.category;
    let categoryId =
      body.categoryId !== undefined
        ? body.categoryId
          ? Number(body.categoryId)
          : null
        : existing.categoryId;
    if (body.categoryId) {
      const cat = await this.repo.getCategoryById(Number(body.categoryId), orgId);
      if (!cat) {
        throw Object.assign(new Error("Category not found"), { statusCode: 400 });
      }
      categoryName = cat.name;
      categoryId = cat.id;
    }

    const values: any = {
      title: String(body.title ?? existing.title).trim(),
      description:
        body.description !== undefined
          ? body.description?.trim() || null
          : existing.description,
      category: categoryName,
      categoryId,
      amount: body.amount !== undefined ? toAmount(body.amount) : String(existing.amount),
      expenseDate:
        body.date || body.expenseDate
          ? normalizeExpenseDate(body.date || body.expenseDate)
          : existing.expenseDate,
      paymentType:
        body.paymentType !== undefined
          ? body.paymentType?.trim() || null
          : existing.paymentType,
      bill: body.bill !== undefined ? body.bill : existing.bill,
      costCenter:
        body.costCenter !== undefined
          ? body.costCenter?.trim() || null
          : existing.costCenter,
      departmentId:
        body.departmentId !== undefined
          ? body.departmentId
            ? Number(body.departmentId)
            : null
          : existing.departmentId,
      employeeName:
        body.employee || body.employeeName || existing.employeeName,
    };

    if (body.status) {
      if (!EXPENSE_STATUSES.includes(body.status)) {
        throw Object.assign(new Error("Invalid expense status"), { statusCode: 400 });
      }
      values.status = body.status;
    }

    await this.repo.updateExpense(id, orgId, values);
    const data = await this.repo.getExpenseById(id, orgId);
    return { success: true, message: "Expense updated", data: mapExpense(data) };
  }

  async updateExpenseStatus(id: number, status: string, currentUser: CurrentUser) {
    if (!EXPENSE_STATUSES.includes(status as any)) {
      throw Object.assign(new Error("Invalid expense status"), { statusCode: 400 });
    }
    const orgId = getOrgId(currentUser);
    const data = await this.repo.updateExpense(id, orgId, { status });
    if (!data) {
      throw Object.assign(new Error("Expense not found"), { statusCode: 404 });
    }
    const full = await this.repo.getExpenseById(id, orgId);
    return { success: true, message: "Expense status updated", data: mapExpense(full) };
  }

  async deleteExpense(id: number, currentUser: CurrentUser) {
    const data = await this.repo.softDeleteExpense(id, getOrgId(currentUser));
    if (!data) {
      throw Object.assign(new Error("Expense not found"), { statusCode: 404 });
    }
    return { success: true, message: "Expense deleted", data };
  }
}
