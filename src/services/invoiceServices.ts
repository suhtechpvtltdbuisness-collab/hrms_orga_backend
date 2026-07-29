import InvoiceRepository from "../repository/invoice.repo.js";
import { users } from "../db/schema.js";

type CurrentUser = typeof users.$inferSelect;

const SALES_STATUSES = ["Paid", "Pending", "Overdue"] as const;
const RECURRING_STATUSES = ["Active", "Inactive"] as const;
const RECURRING_TYPES = ["Monthly", "Yearly", "Quarterly"] as const;
const PAYMENT_METHODS = [
  "Bank Transfer",
  "Check",
  "Cash",
  "UPI",
  "Credit Card",
] as const;
const PAYMENT_STATUSES = ["Complete", "Pending", "Active"] as const;

function toAmount(value: unknown, field = "Amount") {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`${field} must be a valid non-negative number`);
  }
  return n.toFixed(2);
}

class InvoiceServices {
  private repo: InvoiceRepository;
  constructor() {
    this.repo = new InvoiceRepository();
  }

  private getOrgId(currentUser: CurrentUser) {
    const orgId = currentUser.organizationId;
    if (!orgId) {
      throw new Error("User does not belong to any organization");
    }
    return orgId;
  }

  private mapSalesInvoice(invoice: any, items: any[] = []) {
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName,
      clientId: invoice.clientId,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      subTotal: Number(invoice.subTotal),
      totalTax: Number(invoice.totalTax),
      amount: Number(invoice.amount),
      status: invoice.status,
      items: items.map((item, index) => ({
        id: item.id,
        name: item.name,
        quantity: String(Number(item.quantity)),
        rate: String(Number(item.rate)),
        tax: String(Number(item.tax)),
        amount: Number(item.amount),
        sortOrder: item.sortOrder ?? index,
      })),
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    };
  }

  private mapPurchaseInvoice(invoice: any, items: any[] = []) {
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      supplierName: invoice.supplierName,
      invoiceDate: invoice.billDate,
      billDate: invoice.billDate,
      dueDate: invoice.dueDate,
      subTotal: Number(invoice.subTotal),
      totalTax: Number(invoice.totalTax),
      amount: Number(invoice.amount),
      status: invoice.status,
      items: items.map((item, index) => ({
        id: item.id,
        name: item.name,
        amount: String(Number(item.amount)),
        tax: String(Number(item.tax)),
        sortOrder: item.sortOrder ?? index,
      })),
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    };
  }

  private mapRecurringInvoice(invoice: any, items: any[] = []) {
    return {
      id: invoice.id,
      invoiceTitle: invoice.invoiceTitle,
      client: invoice.client,
      clientId: invoice.clientId,
      invoiceType: invoice.invoiceType,
      billDate: invoice.billDate,
      revenueAccount: invoice.revenueAccount,
      taxRules: invoice.taxRules,
      subTotal: Number(invoice.subTotal),
      totalTax: Number(invoice.totalTax),
      amount: Number(invoice.amount),
      status: invoice.status,
      items: items.map((item, index) => ({
        id: item.id,
        phase: item.phase,
        amount: String(Number(item.amount)),
        scheduleDate: item.scheduleDate,
        sortOrder: item.sortOrder ?? index,
      })),
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    };
  }

  private mapPayment(payment: any) {
    return {
      id: payment.id,
      salesInvoiceId: payment.salesInvoiceId,
      invoiceNumber: payment.invoiceNumber,
      customer: payment.customer,
      paymentDate: payment.paymentDate,
      amount: Number(payment.amount),
      method: payment.method,
      status: payment.status,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  private calcSalesTotals(items: any[]) {
    const subTotal = items.reduce(
      (sum, item) => sum + Number(item.quantity || 0) * Number(item.rate || 0),
      0,
    );
    const totalTax = items.reduce((sum, item) => {
      const line = Number(item.quantity || 0) * Number(item.rate || 0);
      return sum + line * (Number(item.tax || 0) / 100);
    }, 0);
    return {
      subTotal: toAmount(subTotal, "Sub total"),
      totalTax: toAmount(totalTax, "Tax"),
      amount: toAmount(subTotal + totalTax, "Amount"),
    };
  }

  private calcPurchaseTotals(items: any[]) {
    const subTotal = items.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    );
    const totalTax = items.reduce((sum, item) => {
      return sum + Number(item.amount || 0) * (Number(item.tax || 0) / 100);
    }, 0);
    return {
      subTotal: toAmount(subTotal, "Sub total"),
      totalTax: toAmount(totalTax, "Tax"),
      amount: toAmount(subTotal + totalTax, "Amount"),
    };
  }

  private calcRecurringTotals(items: any[], taxRules?: string | null) {
    const subTotal = items.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    );
    const taxPct = taxRules ? Number(taxRules) : 0;
    const totalTax = subTotal * (Number.isFinite(taxPct) ? taxPct / 100 : 0);
    return {
      subTotal: toAmount(subTotal, "Sub total"),
      totalTax: toAmount(totalTax, "Tax"),
      amount: toAmount(subTotal + totalTax, "Amount"),
    };
  }

  // ---------- Sales Invoice ----------

  async listSalesInvoices(
    currentUser: CurrentUser,
    filters: {
      status?: string;
      customer?: string;
      invoiceDate?: string;
      invoiceNo?: string;
    },
  ) {
    const orgId = this.getOrgId(currentUser);
    const rows = await this.repo.listSalesInvoices(orgId, filters);
    const data = await Promise.all(
      rows.map(async (row) => {
        const items = await this.repo.getSalesInvoiceItems(row.id);
        return this.mapSalesInvoice(row, items);
      }),
    );
    return { success: true, data };
  }

  async getSalesInvoice(id: number, currentUser: CurrentUser) {
    const orgId = this.getOrgId(currentUser);
    const invoice = await this.repo.getSalesInvoiceById(id, orgId);
    if (!invoice) throw new Error("Sales invoice not found");
    const items = await this.repo.getSalesInvoiceItems(id);
    return { success: true, data: this.mapSalesInvoice(invoice, items) };
  }

  async createSalesInvoice(body: any, currentUser: CurrentUser) {
    const orgId = this.getOrgId(currentUser);
    if (!body.invoiceNumber?.trim()) throw new Error("Invoice number is required");
    if (!body.customerName?.trim()) throw new Error("Customer name is required");
    if (!body.invoiceDate) throw new Error("Invoice date is required");
    if (body.status && !SALES_STATUSES.includes(body.status)) {
      throw new Error(`Status must be one of: ${SALES_STATUSES.join(", ")}`);
    }

    const items = Array.isArray(body.items) ? body.items : [];
    const totals = this.calcSalesTotals(items);

    const invoice = await this.repo.createSalesInvoice({
      organizationId: orgId,
      invoiceNumber: String(body.invoiceNumber).trim(),
      customerName: String(body.customerName).trim(),
      clientId: body.clientId ? Number(body.clientId) : null,
      invoiceDate: String(body.invoiceDate),
      dueDate: body.dueDate ? String(body.dueDate) : null,
      subTotal: totals.subTotal,
      totalTax: totals.totalTax,
      amount: totals.amount,
      status: body.status || "Pending",
      createdBy: currentUser.id,
    });

    const savedItems = await this.repo.createSalesInvoiceItems(
      items.map((item: any, index: number) => {
        const qty = Number(item.quantity || 0);
        const rate = Number(item.rate || 0);
        const tax = Number(item.tax || 0);
        const line = qty * rate;
        return {
          invoiceId: invoice.id,
          name: String(item.name || "").trim() || "Item",
          quantity: toAmount(qty, "Quantity"),
          rate: toAmount(rate, "Rate"),
          tax: toAmount(tax, "Tax"),
          amount: toAmount(line + line * (tax / 100), "Line amount"),
          sortOrder: index,
        };
      }),
    );

    return {
      success: true,
      message: "Sales invoice created successfully",
      data: this.mapSalesInvoice(invoice, savedItems),
    };
  }

  async updateSalesInvoice(id: number, body: any, currentUser: CurrentUser) {
    const orgId = this.getOrgId(currentUser);
    const existing = await this.repo.getSalesInvoiceById(id, orgId);
    if (!existing) throw new Error("Sales invoice not found");

    if (body.status && !SALES_STATUSES.includes(body.status)) {
      throw new Error(`Status must be one of: ${SALES_STATUSES.join(", ")}`);
    }

    const items = Array.isArray(body.items) ? body.items : null;
    const totals = items ? this.calcSalesTotals(items) : null;

    const invoice = await this.repo.updateSalesInvoice(id, {
      invoiceNumber:
        body.invoiceNumber !== undefined
          ? String(body.invoiceNumber).trim()
          : existing.invoiceNumber,
      customerName:
        body.customerName !== undefined
          ? String(body.customerName).trim()
          : existing.customerName,
      clientId:
        body.clientId !== undefined
          ? body.clientId
            ? Number(body.clientId)
            : null
          : existing.clientId,
      invoiceDate:
        body.invoiceDate !== undefined
          ? String(body.invoiceDate)
          : existing.invoiceDate,
      dueDate:
        body.dueDate !== undefined
          ? body.dueDate
            ? String(body.dueDate)
            : null
          : existing.dueDate,
      ...(totals || {}),
      status: body.status !== undefined ? body.status : existing.status,
    });

    let savedItems = await this.repo.getSalesInvoiceItems(id);
    if (items) {
      await this.repo.deleteSalesInvoiceItems(id);
      savedItems = await this.repo.createSalesInvoiceItems(
        items.map((item: any, index: number) => {
          const qty = Number(item.quantity || 0);
          const rate = Number(item.rate || 0);
          const tax = Number(item.tax || 0);
          const line = qty * rate;
          return {
            invoiceId: id,
            name: String(item.name || "").trim() || "Item",
            quantity: toAmount(qty, "Quantity"),
            rate: toAmount(rate, "Rate"),
            tax: toAmount(tax, "Tax"),
            amount: toAmount(line + line * (tax / 100), "Line amount"),
            sortOrder: index,
          };
        }),
      );
    }

    return {
      success: true,
      message: "Sales invoice updated successfully",
      data: this.mapSalesInvoice(invoice, savedItems),
    };
  }

  async deleteSalesInvoice(id: number, currentUser: CurrentUser) {
    const orgId = this.getOrgId(currentUser);
    const existing = await this.repo.getSalesInvoiceById(id, orgId);
    if (!existing) throw new Error("Sales invoice not found");
    await this.repo.softDeleteSalesInvoice(id);
    return { success: true, message: "Sales invoice deleted successfully" };
  }

  // ---------- Purchase Invoice ----------

  async listPurchaseInvoices(
    currentUser: CurrentUser,
    filters: { status?: string; supplier?: string; invoiceDate?: string },
  ) {
    const orgId = this.getOrgId(currentUser);
    const rows = await this.repo.listPurchaseInvoices(orgId, filters);
    const data = await Promise.all(
      rows.map(async (row) => {
        const items = await this.repo.getPurchaseInvoiceItems(row.id);
        return this.mapPurchaseInvoice(row, items);
      }),
    );
    return { success: true, data };
  }

  async getPurchaseInvoice(id: number, currentUser: CurrentUser) {
    const orgId = this.getOrgId(currentUser);
    const invoice = await this.repo.getPurchaseInvoiceById(id, orgId);
    if (!invoice) throw new Error("Purchase invoice not found");
    const items = await this.repo.getPurchaseInvoiceItems(id);
    return { success: true, data: this.mapPurchaseInvoice(invoice, items) };
  }

  async createPurchaseInvoice(body: any, currentUser: CurrentUser) {
    const orgId = this.getOrgId(currentUser);
    if (!body.invoiceNumber?.trim()) throw new Error("Invoice number is required");
    if (!body.supplierName?.trim()) throw new Error("Supplier name is required");
    const billDate = body.billDate || body.invoiceDate;
    if (!billDate) throw new Error("Bill date is required");
    if (body.status && !SALES_STATUSES.includes(body.status)) {
      throw new Error(`Status must be one of: ${SALES_STATUSES.join(", ")}`);
    }

    const items = Array.isArray(body.items) ? body.items : [];
    const totals = this.calcPurchaseTotals(items);

    const invoice = await this.repo.createPurchaseInvoice({
      organizationId: orgId,
      invoiceNumber: String(body.invoiceNumber).trim(),
      supplierName: String(body.supplierName).trim(),
      billDate: String(billDate),
      dueDate: body.dueDate ? String(body.dueDate) : null,
      subTotal: totals.subTotal,
      totalTax: totals.totalTax,
      amount: totals.amount,
      status: body.status || "Pending",
      createdBy: currentUser.id,
    });

    const savedItems = await this.repo.createPurchaseInvoiceItems(
      items.map((item: any, index: number) => ({
        invoiceId: invoice.id,
        name: String(item.name || "").trim() || "Item",
        amount: toAmount(item.amount || 0, "Amount"),
        tax: toAmount(item.tax || 0, "Tax"),
        sortOrder: index,
      })),
    );

    return {
      success: true,
      message: "Purchase invoice created successfully",
      data: this.mapPurchaseInvoice(invoice, savedItems),
    };
  }

  async updatePurchaseInvoice(id: number, body: any, currentUser: CurrentUser) {
    const orgId = this.getOrgId(currentUser);
    const existing = await this.repo.getPurchaseInvoiceById(id, orgId);
    if (!existing) throw new Error("Purchase invoice not found");

    if (body.status && !SALES_STATUSES.includes(body.status)) {
      throw new Error(`Status must be one of: ${SALES_STATUSES.join(", ")}`);
    }

    const items = Array.isArray(body.items) ? body.items : null;
    const totals = items ? this.calcPurchaseTotals(items) : null;
    const billDate =
      body.billDate !== undefined || body.invoiceDate !== undefined
        ? String(body.billDate || body.invoiceDate)
        : existing.billDate;

    const invoice = await this.repo.updatePurchaseInvoice(id, {
      invoiceNumber:
        body.invoiceNumber !== undefined
          ? String(body.invoiceNumber).trim()
          : existing.invoiceNumber,
      supplierName:
        body.supplierName !== undefined
          ? String(body.supplierName).trim()
          : existing.supplierName,
      billDate,
      dueDate:
        body.dueDate !== undefined
          ? body.dueDate
            ? String(body.dueDate)
            : null
          : existing.dueDate,
      ...(totals || {}),
      status: body.status !== undefined ? body.status : existing.status,
    });

    let savedItems = await this.repo.getPurchaseInvoiceItems(id);
    if (items) {
      await this.repo.deletePurchaseInvoiceItems(id);
      savedItems = await this.repo.createPurchaseInvoiceItems(
        items.map((item: any, index: number) => ({
          invoiceId: id,
          name: String(item.name || "").trim() || "Item",
          amount: toAmount(item.amount || 0, "Amount"),
          tax: toAmount(item.tax || 0, "Tax"),
          sortOrder: index,
        })),
      );
    }

    return {
      success: true,
      message: "Purchase invoice updated successfully",
      data: this.mapPurchaseInvoice(invoice, savedItems),
    };
  }

  async deletePurchaseInvoice(id: number, currentUser: CurrentUser) {
    const orgId = this.getOrgId(currentUser);
    const existing = await this.repo.getPurchaseInvoiceById(id, orgId);
    if (!existing) throw new Error("Purchase invoice not found");
    await this.repo.softDeletePurchaseInvoice(id);
    return { success: true, message: "Purchase invoice deleted successfully" };
  }

  // ---------- Recurring Invoice ----------

  async listRecurringInvoices(
    currentUser: CurrentUser,
    filters: {
      status?: string;
      client?: string;
      invoiceDate?: string;
      invoiceType?: string;
    },
  ) {
    const orgId = this.getOrgId(currentUser);
    const rows = await this.repo.listRecurringInvoices(orgId, filters);
    const data = await Promise.all(
      rows.map(async (row) => {
        const items = await this.repo.getRecurringInvoiceItems(row.id);
        return this.mapRecurringInvoice(row, items);
      }),
    );
    return { success: true, data };
  }

  async getRecurringInvoice(id: number, currentUser: CurrentUser) {
    const orgId = this.getOrgId(currentUser);
    const invoice = await this.repo.getRecurringInvoiceById(id, orgId);
    if (!invoice) throw new Error("Recurring invoice not found");
    const items = await this.repo.getRecurringInvoiceItems(id);
    return { success: true, data: this.mapRecurringInvoice(invoice, items) };
  }

  async createRecurringInvoice(body: any, currentUser: CurrentUser) {
    const orgId = this.getOrgId(currentUser);
    if (!body.invoiceTitle?.trim()) throw new Error("Invoice title is required");
    if (!body.client?.trim()) throw new Error("Client is required");
    if (!body.billDate) throw new Error("Bill date is required");
    if (body.invoiceType && !RECURRING_TYPES.includes(body.invoiceType)) {
      throw new Error(`Invoice type must be one of: ${RECURRING_TYPES.join(", ")}`);
    }
    if (body.status && !RECURRING_STATUSES.includes(body.status)) {
      throw new Error(`Status must be one of: ${RECURRING_STATUSES.join(", ")}`);
    }

    const items = Array.isArray(body.items) ? body.items : [];
    const totals = this.calcRecurringTotals(items, body.taxRules);

    const invoice = await this.repo.createRecurringInvoice({
      organizationId: orgId,
      invoiceTitle: String(body.invoiceTitle).trim(),
      client: String(body.client).trim(),
      clientId: body.clientId ? Number(body.clientId) : null,
      invoiceType: body.invoiceType || null,
      billDate: String(body.billDate),
      revenueAccount: body.revenueAccount
        ? String(body.revenueAccount).trim()
        : null,
      taxRules: body.taxRules != null ? String(body.taxRules) : null,
      subTotal: totals.subTotal,
      totalTax: totals.totalTax,
      amount: totals.amount,
      status: body.status || "Active",
      createdBy: currentUser.id,
    });

    const savedItems = await this.repo.createRecurringInvoiceItems(
      items.map((item: any, index: number) => ({
        invoiceId: invoice.id,
        phase: String(item.phase || "").trim() || "Phase",
        amount: toAmount(item.amount || 0, "Amount"),
        scheduleDate: item.scheduleDate ? String(item.scheduleDate) : null,
        sortOrder: index,
      })),
    );

    return {
      success: true,
      message: "Recurring invoice created successfully",
      data: this.mapRecurringInvoice(invoice, savedItems),
    };
  }

  async updateRecurringInvoice(
    id: number,
    body: any,
    currentUser: CurrentUser,
  ) {
    const orgId = this.getOrgId(currentUser);
    const existing = await this.repo.getRecurringInvoiceById(id, orgId);
    if (!existing) throw new Error("Recurring invoice not found");

    if (body.invoiceType && !RECURRING_TYPES.includes(body.invoiceType)) {
      throw new Error(`Invoice type must be one of: ${RECURRING_TYPES.join(", ")}`);
    }
    if (body.status && !RECURRING_STATUSES.includes(body.status)) {
      throw new Error(`Status must be one of: ${RECURRING_STATUSES.join(", ")}`);
    }

    const items = Array.isArray(body.items) ? body.items : null;
    const taxRules =
      body.taxRules !== undefined
        ? body.taxRules != null
          ? String(body.taxRules)
          : null
        : existing.taxRules;
    const totals = items ? this.calcRecurringTotals(items, taxRules) : null;

    const invoice = await this.repo.updateRecurringInvoice(id, {
      invoiceTitle:
        body.invoiceTitle !== undefined
          ? String(body.invoiceTitle).trim()
          : existing.invoiceTitle,
      client:
        body.client !== undefined
          ? String(body.client).trim()
          : existing.client,
      clientId:
        body.clientId !== undefined
          ? body.clientId
            ? Number(body.clientId)
            : null
          : existing.clientId,
      invoiceType:
        body.invoiceType !== undefined
          ? body.invoiceType || null
          : existing.invoiceType,
      billDate:
        body.billDate !== undefined ? String(body.billDate) : existing.billDate,
      revenueAccount:
        body.revenueAccount !== undefined
          ? body.revenueAccount
            ? String(body.revenueAccount).trim()
            : null
          : existing.revenueAccount,
      taxRules,
      ...(totals || {}),
      status: body.status !== undefined ? body.status : existing.status,
    });

    let savedItems = await this.repo.getRecurringInvoiceItems(id);
    if (items) {
      await this.repo.deleteRecurringInvoiceItems(id);
      savedItems = await this.repo.createRecurringInvoiceItems(
        items.map((item: any, index: number) => ({
          invoiceId: id,
          phase: String(item.phase || "").trim() || "Phase",
          amount: toAmount(item.amount || 0, "Amount"),
          scheduleDate: item.scheduleDate ? String(item.scheduleDate) : null,
          sortOrder: index,
        })),
      );
    }

    return {
      success: true,
      message: "Recurring invoice updated successfully",
      data: this.mapRecurringInvoice(invoice, savedItems),
    };
  }

  async deleteRecurringInvoice(id: number, currentUser: CurrentUser) {
    const orgId = this.getOrgId(currentUser);
    const existing = await this.repo.getRecurringInvoiceById(id, orgId);
    if (!existing) throw new Error("Recurring invoice not found");
    await this.repo.softDeleteRecurringInvoice(id);
    return { success: true, message: "Recurring invoice deleted successfully" };
  }

  // ---------- Invoice Payment ----------

  async listPayments(
    currentUser: CurrentUser,
    filters: {
      status?: string;
      customer?: string;
      method?: string;
      paymentDate?: string;
    },
  ) {
    const orgId = this.getOrgId(currentUser);
    const rows = await this.repo.listInvoicePayments(orgId, filters);
    return { success: true, data: rows.map((row) => this.mapPayment(row)) };
  }

  async getPayment(id: number, currentUser: CurrentUser) {
    const orgId = this.getOrgId(currentUser);
    const payment = await this.repo.getInvoicePaymentById(id, orgId);
    if (!payment) throw new Error("Payment not found");
    return { success: true, data: this.mapPayment(payment) };
  }

  async createPayment(body: any, currentUser: CurrentUser) {
    const orgId = this.getOrgId(currentUser);
    const method = body.method || body.paymentMode;
    if (!method?.trim()) throw new Error("Payment mode is required");
    if (body.amount === undefined || body.amount === null || body.amount === "") {
      throw new Error("Amount is required");
    }
    if (!body.paymentDate) throw new Error("Payment date is required");
    if (!PAYMENT_METHODS.includes(method)) {
      throw new Error(`Payment mode must be one of: ${PAYMENT_METHODS.join(", ")}`);
    }
    if (body.status && !PAYMENT_STATUSES.includes(body.status)) {
      throw new Error(`Status must be one of: ${PAYMENT_STATUSES.join(", ")}`);
    }

    let invoiceNumber = body.invoiceNumber ? String(body.invoiceNumber) : null;
    let customer = body.customer ? String(body.customer).trim() : "";
    let salesInvoiceId = body.salesInvoiceId
      ? Number(body.salesInvoiceId)
      : null;

    if (salesInvoiceId) {
      const invoice = await this.repo.getSalesInvoiceById(
        salesInvoiceId,
        orgId,
      );
      if (!invoice) throw new Error("Linked sales invoice not found");
      invoiceNumber = invoice.invoiceNumber;
      customer = invoice.customerName;
    }

    if (!customer) throw new Error("Customer is required");

    const payment = await this.repo.createInvoicePayment({
      organizationId: orgId,
      salesInvoiceId,
      invoiceNumber,
      customer,
      paymentDate: String(body.paymentDate),
      amount: toAmount(body.amount),
      method: String(method).trim(),
      status: body.status || "Pending",
      createdBy: currentUser.id,
    });

    return {
      success: true,
      message: "Payment recorded successfully",
      data: this.mapPayment(payment),
    };
  }

  async updatePayment(id: number, body: any, currentUser: CurrentUser) {
    const orgId = this.getOrgId(currentUser);
    const existing = await this.repo.getInvoicePaymentById(id, orgId);
    if (!existing) throw new Error("Payment not found");

    const method = body.method || body.paymentMode;
    if (method && !PAYMENT_METHODS.includes(method)) {
      throw new Error(`Payment mode must be one of: ${PAYMENT_METHODS.join(", ")}`);
    }
    if (body.status && !PAYMENT_STATUSES.includes(body.status)) {
      throw new Error(`Status must be one of: ${PAYMENT_STATUSES.join(", ")}`);
    }

    let salesInvoiceId =
      body.salesInvoiceId !== undefined
        ? body.salesInvoiceId
          ? Number(body.salesInvoiceId)
          : null
        : existing.salesInvoiceId;
    let invoiceNumber =
      body.invoiceNumber !== undefined
        ? body.invoiceNumber
          ? String(body.invoiceNumber)
          : null
        : existing.invoiceNumber;
    let customer =
      body.customer !== undefined
        ? String(body.customer).trim()
        : existing.customer;

    if (body.salesInvoiceId) {
      const invoice = await this.repo.getSalesInvoiceById(
        Number(body.salesInvoiceId),
        orgId,
      );
      if (!invoice) throw new Error("Linked sales invoice not found");
      salesInvoiceId = invoice.id;
      invoiceNumber = invoice.invoiceNumber;
      customer = invoice.customerName;
    }

    const payment = await this.repo.updateInvoicePayment(id, {
      salesInvoiceId,
      invoiceNumber,
      customer,
      paymentDate:
        body.paymentDate !== undefined
          ? String(body.paymentDate)
          : existing.paymentDate,
      amount:
        body.amount !== undefined ? toAmount(body.amount) : existing.amount,
      method: method ? String(method).trim() : existing.method,
      status: body.status !== undefined ? body.status : existing.status,
    });

    return {
      success: true,
      message: "Payment updated successfully",
      data: this.mapPayment(payment),
    };
  }

  async deletePayment(id: number, currentUser: CurrentUser) {
    const orgId = this.getOrgId(currentUser);
    const existing = await this.repo.getInvoicePaymentById(id, orgId);
    if (!existing) throw new Error("Payment not found");
    await this.repo.softDeleteInvoicePayment(id);
    return { success: true, message: "Payment deleted successfully" };
  }
}

export default InvoiceServices;
