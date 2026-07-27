import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";
import { db } from "../db/connection.js";
import {
  energyPointLog,
  energyPointReviewLevel,
  energyPointRule,
  energyPointSettings,
  users,
} from "../db/schema.js";

class EnergyPointRepository {
  private db: typeof db;
  constructor() {
    this.db = db;
  }

  // ---- Rules ----
  async createRule(data: typeof energyPointRule.$inferInsert) {
    const [result] = await this.db.insert(energyPointRule).values(data).returning();
    return result;
  }

  async getRuleById(id: number) {
    const [result] = await this.db
      .select()
      .from(energyPointRule)
      .where(
        and(eq(energyPointRule.id, id), eq(energyPointRule.isDeleted, false)),
      )
      .limit(1);
    return result;
  }

  async getAllRules(
    organizationId: number,
    filters: { search?: string; enabled?: boolean; limit?: number; offset?: number },
  ) {
    const limit = filters.limit ?? 20;
    const offset = filters.offset ?? 0;
    let whereClause = and(
      eq(energyPointRule.organizationId, organizationId),
      eq(energyPointRule.isDeleted, false),
    );
    if (filters.enabled !== undefined) {
      whereClause = and(whereClause, eq(energyPointRule.enabled, filters.enabled));
    }
    if (filters.search) {
      whereClause = and(
        whereClause,
        ilike(energyPointRule.ruleName, `%${filters.search}%`),
      );
    }

    return await this.db
      .select()
      .from(energyPointRule)
      .where(whereClause)
      .orderBy(desc(energyPointRule.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async countRules(
    organizationId: number,
    filters: { search?: string; enabled?: boolean },
  ) {
    let whereClause = and(
      eq(energyPointRule.organizationId, organizationId),
      eq(energyPointRule.isDeleted, false),
    );
    if (filters.enabled !== undefined) {
      whereClause = and(whereClause, eq(energyPointRule.enabled, filters.enabled));
    }
    if (filters.search) {
      whereClause = and(
        whereClause,
        ilike(energyPointRule.ruleName, `%${filters.search}%`),
      );
    }
    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(energyPointRule)
      .where(whereClause);
    return result?.count ?? 0;
  }

  async updateRule(
    id: number,
    data: Partial<typeof energyPointRule.$inferInsert>,
  ) {
    const [result] = await this.db
      .update(energyPointRule)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(energyPointRule.id, id))
      .returning();
    return result;
  }

  async softDeleteRule(id: number) {
    const [result] = await this.db
      .update(energyPointRule)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(energyPointRule.id, id))
      .returning();
    return result;
  }

  // ---- Logs ----
  async createLog(data: typeof energyPointLog.$inferInsert) {
    const [result] = await this.db.insert(energyPointLog).values(data).returning();
    return result;
  }

  async getLogById(id: number) {
    const [result] = await this.db
      .select({
        id: energyPointLog.id,
        organizationId: energyPointLog.organizationId,
        empId: energyPointLog.empId,
        name: users.name,
        user: users.email,
        ruleId: energyPointLog.ruleId,
        rule: energyPointRule.ruleName,
        status: energyPointLog.status,
        points: energyPointLog.points,
        referenceDocumentType: energyPointLog.referenceDocumentType,
        referenceDocumentId: energyPointLog.referenceDocumentId,
        createdAt: energyPointLog.createdAt,
        updatedAt: energyPointLog.updatedAt,
      })
      .from(energyPointLog)
      .leftJoin(users, eq(energyPointLog.empId, users.id))
      .leftJoin(energyPointRule, eq(energyPointLog.ruleId, energyPointRule.id))
      .where(
        and(eq(energyPointLog.id, id), eq(energyPointLog.isDeleted, false)),
      )
      .limit(1);
    return result;
  }

  async getAllLogs(
    organizationId: number,
    filters: {
      name?: string;
      user?: string;
      rule?: string;
      referenceDocument?: string;
      empId?: number;
      limit?: number;
      offset?: number;
    },
  ) {
    const limit = filters.limit ?? 20;
    const offset = filters.offset ?? 0;

    let whereClause = and(
      eq(energyPointLog.organizationId, organizationId),
      eq(energyPointLog.isDeleted, false),
    );
    if (filters.empId) {
      whereClause = and(whereClause, eq(energyPointLog.empId, filters.empId));
    }
    if (filters.name) {
      whereClause = and(whereClause, ilike(users.name, `%${filters.name}%`));
    }
    if (filters.user) {
      whereClause = and(whereClause, ilike(users.email, `%${filters.user}%`));
    }
    if (filters.rule) {
      whereClause = and(
        whereClause,
        ilike(energyPointRule.ruleName, `%${filters.rule}%`),
      );
    }
    if (filters.referenceDocument) {
      whereClause = and(
        whereClause,
        ilike(
          energyPointLog.referenceDocumentType,
          `%${filters.referenceDocument}%`,
        ),
      );
    }

    return await this.db
      .select({
        id: energyPointLog.id,
        organizationId: energyPointLog.organizationId,
        empId: energyPointLog.empId,
        name: users.name,
        user: users.email,
        ruleId: energyPointLog.ruleId,
        rule: energyPointRule.ruleName,
        status: energyPointLog.status,
        points: energyPointLog.points,
        referenceDocument: energyPointLog.referenceDocumentType,
        referenceDocumentType: energyPointLog.referenceDocumentType,
        referenceDocumentId: energyPointLog.referenceDocumentId,
        createdAt: energyPointLog.createdAt,
        updatedAt: energyPointLog.updatedAt,
      })
      .from(energyPointLog)
      .leftJoin(users, eq(energyPointLog.empId, users.id))
      .leftJoin(energyPointRule, eq(energyPointLog.ruleId, energyPointRule.id))
      .where(whereClause)
      .orderBy(desc(energyPointLog.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async countLogs(
    organizationId: number,
    filters: {
      name?: string;
      user?: string;
      rule?: string;
      referenceDocument?: string;
      empId?: number;
    },
  ) {
    let whereClause = and(
      eq(energyPointLog.organizationId, organizationId),
      eq(energyPointLog.isDeleted, false),
    );
    if (filters.empId) {
      whereClause = and(whereClause, eq(energyPointLog.empId, filters.empId));
    }
    if (filters.name) {
      whereClause = and(whereClause, ilike(users.name, `%${filters.name}%`));
    }
    if (filters.user) {
      whereClause = and(whereClause, ilike(users.email, `%${filters.user}%`));
    }
    if (filters.rule) {
      whereClause = and(
        whereClause,
        ilike(energyPointRule.ruleName, `%${filters.rule}%`),
      );
    }
    if (filters.referenceDocument) {
      whereClause = and(
        whereClause,
        ilike(
          energyPointLog.referenceDocumentType,
          `%${filters.referenceDocument}%`,
        ),
      );
    }

    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(energyPointLog)
      .leftJoin(users, eq(energyPointLog.empId, users.id))
      .leftJoin(energyPointRule, eq(energyPointLog.ruleId, energyPointRule.id))
      .where(whereClause);
    return result?.count ?? 0;
  }

  async softDeleteLog(id: number) {
    const [result] = await this.db
      .update(energyPointLog)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(energyPointLog.id, id))
      .returning();
    return result;
  }

  // ---- Settings ----
  async getSettingsByOrg(organizationId: number) {
    const [result] = await this.db
      .select()
      .from(energyPointSettings)
      .where(eq(energyPointSettings.organizationId, organizationId))
      .limit(1);
    return result;
  }

  async getReviewLevels(settingsId: number) {
    return await this.db
      .select()
      .from(energyPointReviewLevel)
      .where(eq(energyPointReviewLevel.settingsId, settingsId))
      .orderBy(asc(energyPointReviewLevel.sortOrder), asc(energyPointReviewLevel.id));
  }

  async upsertSettings(data: typeof energyPointSettings.$inferInsert) {
    const existing = await this.getSettingsByOrg(data.organizationId);
    if (existing) {
      const [result] = await this.db
        .update(energyPointSettings)
        .set({
          enabled: data.enabled,
          allocationPeriod: data.allocationPeriod,
          lastAllocationDate: data.lastAllocationDate,
          updatedAt: new Date(),
        })
        .where(eq(energyPointSettings.id, existing.id))
        .returning();
      return result;
    }
    const [result] = await this.db
      .insert(energyPointSettings)
      .values(data)
      .returning();
    return result;
  }

  async replaceReviewLevels(
    settingsId: number,
    levels: (typeof energyPointReviewLevel.$inferInsert)[],
  ) {
    await this.db
      .delete(energyPointReviewLevel)
      .where(eq(energyPointReviewLevel.settingsId, settingsId));
    if (!levels.length) return [];
    return await this.db
      .insert(energyPointReviewLevel)
      .values(levels)
      .returning();
  }
}

export default EnergyPointRepository;
