import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import {
  invoicePayment,
  purchaseInvoice,
  purchaseInvoiceItem,
  recurringInvoice,
  recurringInvoiceItem,
  salesInvoice,
  salesInvoiceItem,
} from "../db/schema.js";
import { db } from "../db/connection.js";

class InvoiceRepository {
  private db: typeof db;
  constructor() {
    this.db = db;
  }

  // ---------- Sales Invoice ----------

  async createSalesInvoice(data: typeof salesInvoice.$inferInsert) {
    const result = await this.db.insert(salesInvoice).values(data).returning();
    return (result as any)[0];
  }

  async createSalesInvoiceItems(items: (typeof salesInvoiceItem.$inferInsert)[]) {
    if (!items.length) return [];
    return await this.db.insert(salesInvoiceItem).values(items).returning();
  }

  async deleteSalesInvoiceItems(invoiceId: number) {
    await this.db
      .delete(salesInvoiceItem)
      .where(eq(salesInvoiceItem.invoiceId, invoiceId));
  }

  async getSalesInvoiceById(id: number, organizationId: number) {
    const result = await this.db
      .select()
      .from(salesInvoice)
      .where(
        and(
          eq(salesInvoice.id, id),
          eq(salesInvoice.organizationId, organizationId),
          eq(salesInvoice.isDeleted, false),
        ),
      )
      .limit(1);
    return (result as any)[0];
  }

  async getSalesInvoiceByNumber(invoiceNumber: string, organizationId: number) {
    const result = await this.db
      .select()
      .from(salesInvoice)
      .where(
        and(
          eq(salesInvoice.invoiceNumber, invoiceNumber),
          eq(salesInvoice.organizationId, organizationId),
          eq(salesInvoice.isDeleted, false),
        ),
      )
      .limit(1);
    return (result as any)[0];
  }

  async getSalesInvoiceItems(invoiceId: number) {
    return await this.db
      .select()
      .from(salesInvoiceItem)
      .where(eq(salesInvoiceItem.invoiceId, invoiceId))
      .orderBy(salesInvoiceItem.sortOrder);
  }

  async listSalesInvoices(
    organizationId: number,
    filters: {
      status?: string;
      customer?: string;
      invoiceDate?: string;
      invoiceNo?: string;
    } = {},
  ) {
    let whereClause = and(
      eq(salesInvoice.organizationId, organizationId),
      eq(salesInvoice.isDeleted, false),
    );
    if (filters.status) {
      whereClause = and(whereClause, eq(salesInvoice.status, filters.status));
    }
    if (filters.customer) {
      whereClause = and(
        whereClause,
        ilike(salesInvoice.customerName, `%${filters.customer}%`),
      );
    }
    if (filters.invoiceDate) {
      whereClause = and(
        whereClause,
        eq(salesInvoice.invoiceDate, filters.invoiceDate),
      );
    }
    if (filters.invoiceNo) {
      whereClause = and(
        whereClause,
        ilike(salesInvoice.invoiceNumber, `%${filters.invoiceNo}%`),
      );
    }
    return await this.db
      .select()
      .from(salesInvoice)
      .where(whereClause)
      .orderBy(desc(salesInvoice.createdAt));
  }

  async updateSalesInvoice(
    id: number,
    data: Partial<typeof salesInvoice.$inferInsert>,
  ) {
    const result = await this.db
      .update(salesInvoice)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(salesInvoice.id, id))
      .returning();
    return (result as any)[0];
  }

  async getInvoicePaymentSummary(
    organizationId: number,
    salesInvoiceId?: number | null,
    invoiceNumber?: string | null,
  ) {
    if (!salesInvoiceId && !invoiceNumber) {
      return { totalAmount: 0, completedAmount: 0 };
    }

    const conditions = [
      eq(invoicePayment.organizationId, organizationId),
      eq(invoicePayment.isDeleted, false),
    ];

    if (salesInvoiceId && invoiceNumber) {
      conditions.push(
        or(
          eq(invoicePayment.salesInvoiceId, salesInvoiceId),
          eq(invoicePayment.invoiceNumber, invoiceNumber),
        ) as any,
      );
    } else if (salesInvoiceId) {
      conditions.push(eq(invoicePayment.salesInvoiceId, salesInvoiceId));
    } else if (invoiceNumber) {
      conditions.push(eq(invoicePayment.invoiceNumber, invoiceNumber));
    }

    const result = await this.db
      .select({
        totalAmount: sql<number>`coalesce(sum(${invoicePayment.amount}::numeric), 0)::float`,
        completedAmount: sql<number>`coalesce(sum(case when ${invoicePayment.status} = 'Complete' then ${invoicePayment.amount}::numeric else 0 end), 0)::float`,
      })
      .from(invoicePayment)
      .where(and(...conditions));

    return result[0] || { totalAmount: 0, completedAmount: 0 };
  }

  async softDeleteSalesInvoice(id: number) {
    const result = await this.db
      .update(salesInvoice)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(salesInvoice.id, id))
      .returning();
    return (result as any)[0];
  }

  // ---------- Purchase Invoice ----------

  async createPurchaseInvoice(data: typeof purchaseInvoice.$inferInsert) {
    const result = await this.db.insert(purchaseInvoice).values(data).returning();
    return (result as any)[0];
  }

  async createPurchaseInvoiceItems(
    items: (typeof purchaseInvoiceItem.$inferInsert)[],
  ) {
    if (!items.length) return [];
    return await this.db.insert(purchaseInvoiceItem).values(items).returning();
  }

  async deletePurchaseInvoiceItems(invoiceId: number) {
    await this.db
      .delete(purchaseInvoiceItem)
      .where(eq(purchaseInvoiceItem.invoiceId, invoiceId));
  }

  async getPurchaseInvoiceById(id: number, organizationId: number) {
    const result = await this.db
      .select()
      .from(purchaseInvoice)
      .where(
        and(
          eq(purchaseInvoice.id, id),
          eq(purchaseInvoice.organizationId, organizationId),
          eq(purchaseInvoice.isDeleted, false),
        ),
      )
      .limit(1);
    return (result as any)[0];
  }

  async getPurchaseInvoiceItems(invoiceId: number) {
    return await this.db
      .select()
      .from(purchaseInvoiceItem)
      .where(eq(purchaseInvoiceItem.invoiceId, invoiceId))
      .orderBy(purchaseInvoiceItem.sortOrder);
  }

  async listPurchaseInvoices(
    organizationId: number,
    filters: {
      status?: string;
      supplier?: string;
      invoiceDate?: string;
    } = {},
  ) {
    let whereClause = and(
      eq(purchaseInvoice.organizationId, organizationId),
      eq(purchaseInvoice.isDeleted, false),
    );
    if (filters.status) {
      whereClause = and(whereClause, eq(purchaseInvoice.status, filters.status));
    }
    if (filters.supplier) {
      whereClause = and(
        whereClause,
        ilike(purchaseInvoice.supplierName, `%${filters.supplier}%`),
      );
    }
    if (filters.invoiceDate) {
      whereClause = and(
        whereClause,
        eq(purchaseInvoice.billDate, filters.invoiceDate),
      );
    }
    return await this.db
      .select()
      .from(purchaseInvoice)
      .where(whereClause)
      .orderBy(desc(purchaseInvoice.createdAt));
  }

  async updatePurchaseInvoice(
    id: number,
    data: Partial<typeof purchaseInvoice.$inferInsert>,
  ) {
    const result = await this.db
      .update(purchaseInvoice)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(purchaseInvoice.id, id))
      .returning();
    return (result as any)[0];
  }

  async softDeletePurchaseInvoice(id: number) {
    const result = await this.db
      .update(purchaseInvoice)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(purchaseInvoice.id, id))
      .returning();
    return (result as any)[0];
  }

  // ---------- Recurring Invoice ----------

  async createRecurringInvoice(data: typeof recurringInvoice.$inferInsert) {
    const result = await this.db.insert(recurringInvoice).values(data).returning();
    return (result as any)[0];
  }

  async createRecurringInvoiceItems(
    items: (typeof recurringInvoiceItem.$inferInsert)[],
  ) {
    if (!items.length) return [];
    return await this.db.insert(recurringInvoiceItem).values(items).returning();
  }

  async deleteRecurringInvoiceItems(invoiceId: number) {
    await this.db
      .delete(recurringInvoiceItem)
      .where(eq(recurringInvoiceItem.invoiceId, invoiceId));
  }

  async getRecurringInvoiceById(id: number, organizationId: number) {
    const result = await this.db
      .select()
      .from(recurringInvoice)
      .where(
        and(
          eq(recurringInvoice.id, id),
          eq(recurringInvoice.organizationId, organizationId),
          eq(recurringInvoice.isDeleted, false),
        ),
      )
      .limit(1);
    return (result as any)[0];
  }

  async getRecurringInvoiceItems(invoiceId: number) {
    return await this.db
      .select()
      .from(recurringInvoiceItem)
      .where(eq(recurringInvoiceItem.invoiceId, invoiceId))
      .orderBy(recurringInvoiceItem.sortOrder);
  }

  async listRecurringInvoices(
    organizationId: number,
    filters: {
      status?: string;
      client?: string;
      invoiceDate?: string;
      invoiceType?: string;
    } = {},
  ) {
    let whereClause = and(
      eq(recurringInvoice.organizationId, organizationId),
      eq(recurringInvoice.isDeleted, false),
    );
    if (filters.status) {
      whereClause = and(whereClause, eq(recurringInvoice.status, filters.status));
    }
    if (filters.client) {
      whereClause = and(
        whereClause,
        ilike(recurringInvoice.client, `%${filters.client}%`),
      );
    }
    if (filters.invoiceDate) {
      whereClause = and(
        whereClause,
        eq(recurringInvoice.billDate, filters.invoiceDate),
      );
    }
    if (filters.invoiceType) {
      whereClause = and(
        whereClause,
        eq(recurringInvoice.invoiceType, filters.invoiceType),
      );
    }
    return await this.db
      .select()
      .from(recurringInvoice)
      .where(whereClause)
      .orderBy(desc(recurringInvoice.createdAt));
  }

  async updateRecurringInvoice(
    id: number,
    data: Partial<typeof recurringInvoice.$inferInsert>,
  ) {
    const result = await this.db
      .update(recurringInvoice)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(recurringInvoice.id, id))
      .returning();
    return (result as any)[0];
  }

  async softDeleteRecurringInvoice(id: number) {
    const result = await this.db
      .update(recurringInvoice)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(recurringInvoice.id, id))
      .returning();
    return (result as any)[0];
  }

  // ---------- Invoice Payment ----------

  async createInvoicePayment(data: typeof invoicePayment.$inferInsert) {
    const result = await this.db.insert(invoicePayment).values(data).returning();
    return (result as any)[0];
  }

  async getInvoicePaymentById(id: number, organizationId: number) {
    const result = await this.db
      .select()
      .from(invoicePayment)
      .where(
        and(
          eq(invoicePayment.id, id),
          eq(invoicePayment.organizationId, organizationId),
          eq(invoicePayment.isDeleted, false),
        ),
      )
      .limit(1);
    return (result as any)[0];
  }

  async listInvoicePayments(
    organizationId: number,
    filters: {
      status?: string;
      customer?: string;
      method?: string;
      paymentDate?: string;
    } = {},
  ) {
    let whereClause = and(
      eq(invoicePayment.organizationId, organizationId),
      eq(invoicePayment.isDeleted, false),
    );
    if (filters.status) {
      whereClause = and(whereClause, eq(invoicePayment.status, filters.status));
    }
    if (filters.customer) {
      whereClause = and(
        whereClause,
        ilike(invoicePayment.customer, `%${filters.customer}%`),
      );
    }
    if (filters.method) {
      whereClause = and(whereClause, eq(invoicePayment.method, filters.method));
    }
    if (filters.paymentDate) {
      whereClause = and(
        whereClause,
        eq(invoicePayment.paymentDate, filters.paymentDate),
      );
    }
    return await this.db
      .select()
      .from(invoicePayment)
      .where(whereClause)
      .orderBy(desc(invoicePayment.createdAt));
  }

  async updateInvoicePayment(
    id: number,
    data: Partial<typeof invoicePayment.$inferInsert>,
  ) {
    const result = await this.db
      .update(invoicePayment)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(invoicePayment.id, id))
      .returning();
    return (result as any)[0];
  }

  async softDeleteInvoicePayment(id: number) {
    const result = await this.db
      .update(invoicePayment)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(invoicePayment.id, id))
      .returning();
    return (result as any)[0];
  }
}

export default InvoiceRepository;
