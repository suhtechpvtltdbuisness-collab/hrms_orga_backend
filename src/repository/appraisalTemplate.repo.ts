import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";
import { db } from "../db/connection.js";
import {
  appraisalTemplate,
  appraisalTemplateGoal,
} from "../db/schema.js";

class AppraisalTemplateRepository {
  private db: typeof db;
  constructor() {
    this.db = db;
  }

  async createTemplate(data: typeof appraisalTemplate.$inferInsert) {
    const [result] = await this.db
      .insert(appraisalTemplate)
      .values(data)
      .returning();
    return result;
  }

  async createGoals(
    goals: (typeof appraisalTemplateGoal.$inferInsert)[],
  ) {
    if (!goals.length) return [];
    return await this.db.insert(appraisalTemplateGoal).values(goals).returning();
  }

  async replaceGoals(
    templateId: number,
    goals: (typeof appraisalTemplateGoal.$inferInsert)[],
  ) {
    await this.db
      .delete(appraisalTemplateGoal)
      .where(eq(appraisalTemplateGoal.templateId, templateId));
    if (!goals.length) return [];
    return await this.db.insert(appraisalTemplateGoal).values(goals).returning();
  }

  async getGoalsByTemplateId(templateId: number) {
    return await this.db
      .select()
      .from(appraisalTemplateGoal)
      .where(eq(appraisalTemplateGoal.templateId, templateId))
      .orderBy(asc(appraisalTemplateGoal.sortOrder), asc(appraisalTemplateGoal.id));
  }

  async getTemplateById(id: number) {
    const [result] = await this.db
      .select()
      .from(appraisalTemplate)
      .where(
        and(eq(appraisalTemplate.id, id), eq(appraisalTemplate.isDeleted, false)),
      )
      .limit(1);
    return result;
  }

  async getTemplateWithGoals(id: number) {
    const template = await this.getTemplateById(id);
    if (!template) return null;
    const goals = await this.getGoalsByTemplateId(id);
    return { ...template, goals };
  }

  async findByTitle(title: string, organizationId: number, excludeId?: number) {
    const conditions = [
      eq(appraisalTemplate.title, title),
      eq(appraisalTemplate.organizationId, organizationId),
      eq(appraisalTemplate.isDeleted, false),
    ];
    if (excludeId) {
      conditions.push(sql`${appraisalTemplate.id} != ${excludeId}`);
    }
    const [result] = await this.db
      .select()
      .from(appraisalTemplate)
      .where(and(...conditions))
      .limit(1);
    return result;
  }

  async getAllTemplates(
    organizationId: number,
    search?: string,
    limit = 50,
    offset = 0,
  ) {
    let whereClause = and(
      eq(appraisalTemplate.organizationId, organizationId),
      eq(appraisalTemplate.isDeleted, false),
    );
    if (search) {
      whereClause = and(
        whereClause,
        ilike(appraisalTemplate.title, `%${search}%`),
      );
    }

    const templates = await this.db
      .select()
      .from(appraisalTemplate)
      .where(whereClause)
      .orderBy(desc(appraisalTemplate.createdAt))
      .limit(limit)
      .offset(offset);

    const withGoals = await Promise.all(
      templates.map(async (t) => ({
        ...t,
        goals: await this.getGoalsByTemplateId(t.id),
      })),
    );
    return withGoals;
  }

  async countTemplates(organizationId: number, search?: string) {
    let whereClause = and(
      eq(appraisalTemplate.organizationId, organizationId),
      eq(appraisalTemplate.isDeleted, false),
    );
    if (search) {
      whereClause = and(
        whereClause,
        ilike(appraisalTemplate.title, `%${search}%`),
      );
    }
    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(appraisalTemplate)
      .where(whereClause);
    return result?.count ?? 0;
  }

  async getDropdown(organizationId: number) {
    return await this.db
      .select({
        id: appraisalTemplate.id,
        title: appraisalTemplate.title,
      })
      .from(appraisalTemplate)
      .where(
        and(
          eq(appraisalTemplate.organizationId, organizationId),
          eq(appraisalTemplate.isDeleted, false),
        ),
      )
      .orderBy(asc(appraisalTemplate.title));
  }

  async updateTemplate(
    id: number,
    data: Partial<typeof appraisalTemplate.$inferInsert>,
  ) {
    const [result] = await this.db
      .update(appraisalTemplate)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(appraisalTemplate.id, id))
      .returning();
    return result;
  }

  async softDeleteTemplate(id: number) {
    const [result] = await this.db
      .update(appraisalTemplate)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(appraisalTemplate.id, id))
      .returning();
    return result;
  }
}

export default AppraisalTemplateRepository;
