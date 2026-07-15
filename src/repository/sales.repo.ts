import { eq, and, sql, ilike, or, desc, asc, gte, lt, isNotNull } from "drizzle-orm";
import {
  salesRecord,
  salesActivity,
  salesKnowledge,
  salesProduct,
  salesDocument,
} from "../db/schema.js";
import { db } from "../db/connection.js";

class SalesRepository {
  private db: typeof db;
  constructor() {
    this.db = db;
  }

  // ---------- Records (leads / clients / opportunities / deals) ----------

  async createRecord(data: typeof salesRecord.$inferInsert) {
    const result = await this.db.insert(salesRecord).values(data).returning();
    return (result as any)[0];
  }

  async getRecordById(id: number, organizationId: number) {
    const result = await this.db
      .select()
      .from(salesRecord)
      .where(
        and(
          eq(salesRecord.id, id),
          eq(salesRecord.organizationId, organizationId),
          eq(salesRecord.isDeleted, false),
        ),
      )
      .limit(1);
    return (result as any)[0];
  }

  private buildRecordFilter(
    organizationId: number,
    recordType?: string,
    search?: string,
    status?: string,
  ) {
    let whereClause = and(
      eq(salesRecord.organizationId, organizationId),
      eq(salesRecord.isDeleted, false),
    );
    if (recordType) {
      whereClause = and(whereClause, eq(salesRecord.recordType, recordType));
    }
    if (status) {
      whereClause = and(whereClause, eq(salesRecord.status, status));
    }
    if (search) {
      whereClause = and(
        whereClause,
        or(
          ilike(salesRecord.name, `%${search}%`),
          ilike(salesRecord.company, `%${search}%`),
          ilike(salesRecord.owner, `%${search}%`),
          ilike(salesRecord.status, `%${search}%`),
        ),
      );
    }
    return whereClause;
  }

  async getRecords(
    organizationId: number,
    recordType?: string,
    search?: string,
    status?: string,
    sortOrder: "asc" | "desc" = "desc",
    limit?: number,
    offset?: number,
  ) {
    let query = this.db
      .select()
      .from(salesRecord)
      .where(this.buildRecordFilter(organizationId, recordType, search, status))
      .orderBy(sortOrder === "asc" ? asc(salesRecord.createdAt) : desc(salesRecord.createdAt));

    if (limit !== undefined && offset !== undefined) {
      query = query.limit(limit).offset(offset) as any;
    }
    return await query;
  }

  async countRecords(
    organizationId: number,
    recordType?: string,
    search?: string,
    status?: string,
  ) {
    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(salesRecord)
      .where(this.buildRecordFilter(organizationId, recordType, search, status));
    return result[0]?.count ?? 0;
  }

  async updateRecord(id: number, data: Partial<typeof salesRecord.$inferInsert>) {
    const result = await this.db
      .update(salesRecord)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(salesRecord.id, id))
      .returning();
    return (result as any)[0];
  }

  async softDeleteRecord(id: number) {
    const result = await this.db
      .update(salesRecord)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(salesRecord.id, id))
      .returning();
    return (result as any)[0];
  }

  // ---------- Overview aggregates ----------

  async countByTypeAndStatus(organizationId: number, recordType: string, status?: string) {
    let whereClause = and(
      eq(salesRecord.organizationId, organizationId),
      eq(salesRecord.recordType, recordType),
      eq(salesRecord.isDeleted, false),
    );
    if (status) {
      whereClause = and(whereClause, eq(salesRecord.status, status));
    }
    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(salesRecord)
      .where(whereClause);
    return result[0]?.count ?? 0;
  }

  async sumDealValue(organizationId: number, status?: string, from?: Date, to?: Date) {
    let whereClause = and(
      eq(salesRecord.organizationId, organizationId),
      eq(salesRecord.recordType, "deal"),
      eq(salesRecord.isDeleted, false),
    );
    if (status) {
      whereClause = and(whereClause, eq(salesRecord.status, status));
    }
    if (from) {
      whereClause = and(whereClause, gte(salesRecord.updatedAt, from));
    }
    if (to) {
      whereClause = and(whereClause, lt(salesRecord.updatedAt, to));
    }
    const result = await this.db
      .select({
        total: sql<string>`coalesce(sum(${salesRecord.value}), 0)`,
        count: sql<number>`count(*)::int`,
      })
      .from(salesRecord)
      .where(whereClause);
    return {
      total: Number(result[0]?.total ?? 0),
      count: result[0]?.count ?? 0,
    };
  }

  async sumOpportunityValue(organizationId: number) {
    const result = await this.db
      .select({
        total: sql<string>`coalesce(sum(${salesRecord.value}), 0)`,
        count: sql<number>`count(*)::int`,
      })
      .from(salesRecord)
      .where(
        and(
          eq(salesRecord.organizationId, organizationId),
          eq(salesRecord.recordType, "opportunity"),
          eq(salesRecord.isDeleted, false),
        ),
      );
    return {
      total: Number(result[0]?.total ?? 0),
      count: result[0]?.count ?? 0,
    };
  }

  async getLeadSources(organizationId: number) {
    return await this.db
      .select({
        source: sql<string>`coalesce(${salesRecord.source}, 'Other')`,
        count: sql<number>`count(*)::int`,
      })
      .from(salesRecord)
      .where(
        and(
          eq(salesRecord.organizationId, organizationId),
          eq(salesRecord.recordType, "lead"),
          eq(salesRecord.isDeleted, false),
        ),
      )
      .groupBy(sql`coalesce(${salesRecord.source}, 'Other')`)
      .orderBy(desc(sql`count(*)`));
  }

  async getUpcomingFollowUps(organizationId: number, limitCount = 5) {
    return await this.db
      .select()
      .from(salesRecord)
      .where(
        and(
          eq(salesRecord.organizationId, organizationId),
          eq(salesRecord.isDeleted, false),
          isNotNull(salesRecord.followUpAt),
          gte(salesRecord.followUpAt, sql`now() - interval '1 day'`),
        ),
      )
      .orderBy(asc(salesRecord.followUpAt))
      .limit(limitCount);
  }

  async getWeeklyRevenueTrend(organizationId: number, weeks = 7) {
    const result = await this.db
      .select({
        week: sql<string>`to_char(date_trunc('week', ${salesRecord.updatedAt}), 'YYYY-MM-DD')`,
        total: sql<string>`coalesce(sum(${salesRecord.value}), 0)`,
      })
      .from(salesRecord)
      .where(
        and(
          eq(salesRecord.organizationId, organizationId),
          eq(salesRecord.recordType, "deal"),
          eq(salesRecord.status, "Won"),
          eq(salesRecord.isDeleted, false),
          gte(salesRecord.updatedAt, sql`now() - (${weeks} * interval '1 week')`),
        ),
      )
      .groupBy(sql`date_trunc('week', ${salesRecord.updatedAt})`)
      .orderBy(asc(sql`date_trunc('week', ${salesRecord.updatedAt})`));
    return result.map((row) => ({ week: row.week, total: Number(row.total) }));
  }

  async getSalesByOwner(organizationId: number) {
    return await this.db
      .select({
        owner: sql<string>`coalesce(${salesRecord.owner}, 'Unassigned')`,
        recordType: salesRecord.recordType,
        status: salesRecord.status,
        count: sql<number>`count(*)::int`,
        totalValue: sql<string>`coalesce(sum(${salesRecord.value}), 0)`,
      })
      .from(salesRecord)
      .where(
        and(
          eq(salesRecord.organizationId, organizationId),
          eq(salesRecord.isDeleted, false),
        ),
      )
      .groupBy(
        sql`coalesce(${salesRecord.owner}, 'Unassigned')`,
        salesRecord.recordType,
        salesRecord.status,
      );
  }

  async getMonthlyRevenue(organizationId: number, months = 6) {
    const result = await this.db
      .select({
        month: sql<string>`to_char(date_trunc('month', ${salesRecord.updatedAt}), 'YYYY-MM')`,
        total: sql<string>`coalesce(sum(${salesRecord.value}), 0)`,
        dealCount: sql<number>`count(*)::int`,
      })
      .from(salesRecord)
      .where(
        and(
          eq(salesRecord.organizationId, organizationId),
          eq(salesRecord.recordType, "deal"),
          eq(salesRecord.status, "Won"),
          eq(salesRecord.isDeleted, false),
          gte(salesRecord.updatedAt, sql`date_trunc('month', now()) - (${months} * interval '1 month')`),
        ),
      )
      .groupBy(sql`date_trunc('month', ${salesRecord.updatedAt})`)
      .orderBy(asc(sql`date_trunc('month', ${salesRecord.updatedAt})`));
    return result.map((row) => ({
      month: row.month,
      total: Number(row.total),
      dealCount: row.dealCount,
    }));
  }

  // ---------- Activities ----------

  async logActivity(organizationId: number, description: string, createdBy?: number) {
    const result = await this.db
      .insert(salesActivity)
      .values({ organizationId, description, createdBy })
      .returning();
    return (result as any)[0];
  }

  async getRecentActivities(organizationId: number, limitCount = 8) {
    return await this.db
      .select()
      .from(salesActivity)
      .where(eq(salesActivity.organizationId, organizationId))
      .orderBy(desc(salesActivity.createdAt))
      .limit(limitCount);
  }

  // ---------- Knowledge ----------

  async createKnowledge(data: typeof salesKnowledge.$inferInsert) {
    const result = await this.db.insert(salesKnowledge).values(data).returning();
    return (result as any)[0];
  }

  async getKnowledge(organizationId: number, category?: string, search?: string) {
    let whereClause = and(
      eq(salesKnowledge.organizationId, organizationId),
      eq(salesKnowledge.isDeleted, false),
    );
    if (category && category !== "All") {
      whereClause = and(whereClause, eq(salesKnowledge.category, category));
    }
    if (search) {
      whereClause = and(whereClause, ilike(salesKnowledge.title, `%${search}%`));
    }
    return await this.db
      .select()
      .from(salesKnowledge)
      .where(whereClause)
      .orderBy(desc(salesKnowledge.updatedAt));
  }

  // ---------- Products ----------

  async createProduct(data: typeof salesProduct.$inferInsert) {
    const result = await this.db.insert(salesProduct).values(data).returning();
    return (result as any)[0];
  }

  async getProducts(organizationId: number, search?: string) {
    let whereClause = and(
      eq(salesProduct.organizationId, organizationId),
      eq(salesProduct.isDeleted, false),
    );
    if (search) {
      whereClause = and(
        whereClause,
        or(
          ilike(salesProduct.name, `%${search}%`),
          ilike(salesProduct.category, `%${search}%`),
        ),
      );
    }
    return await this.db
      .select()
      .from(salesProduct)
      .where(whereClause)
      .orderBy(desc(salesProduct.createdAt));
  }

  // ---------- Documents ----------

  async createDocument(data: typeof salesDocument.$inferInsert) {
    const result = await this.db.insert(salesDocument).values(data).returning();
    return (result as any)[0];
  }

  async getDocuments(organizationId: number, docType?: string, search?: string) {
    let whereClause = and(
      eq(salesDocument.organizationId, organizationId),
      eq(salesDocument.isDeleted, false),
    );
    if (docType) {
      whereClause = and(whereClause, eq(salesDocument.docType, docType));
    }
    if (search) {
      whereClause = and(
        whereClause,
        or(
          ilike(salesDocument.title, `%${search}%`),
          ilike(salesDocument.clientName, `%${search}%`),
        ),
      );
    }
    return await this.db
      .select()
      .from(salesDocument)
      .where(whereClause)
      .orderBy(desc(salesDocument.createdAt));
  }
}

export default SalesRepository;
