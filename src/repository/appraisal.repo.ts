import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";
import { db } from "../db/connection.js";
import {
  appraisal,
  appraisalGoal,
  appraisalTemplate,
  department,
  employment,
  users,
} from "../db/schema.js";

class AppraisalRepository {
  private db: typeof db;
  constructor() {
    this.db = db;
  }

  async createAppraisal(data: typeof appraisal.$inferInsert) {
    const [result] = await this.db.insert(appraisal).values(data).returning();
    return result;
  }

  async createGoals(goals: (typeof appraisalGoal.$inferInsert)[]) {
    if (!goals.length) return [];
    return await this.db.insert(appraisalGoal).values(goals).returning();
  }

  async replaceGoals(
    appraisalId: number,
    goals: (typeof appraisalGoal.$inferInsert)[],
  ) {
    await this.db
      .delete(appraisalGoal)
      .where(eq(appraisalGoal.appraisalId, appraisalId));
    if (!goals.length) return [];
    return await this.db.insert(appraisalGoal).values(goals).returning();
  }

  async getGoalsByAppraisalId(appraisalId: number) {
    return await this.db
      .select()
      .from(appraisalGoal)
      .where(eq(appraisalGoal.appraisalId, appraisalId))
      .orderBy(asc(appraisalGoal.sortOrder), asc(appraisalGoal.id));
  }

  async getAppraisalById(id: number) {
    const [result] = await this.db
      .select({
        id: appraisal.id,
        organizationId: appraisal.organizationId,
        series: appraisal.series,
        templateId: appraisal.templateId,
        templateTitle: appraisalTemplate.title,
        empId: appraisal.empId,
        employeeName: users.name,
        departmentId: appraisal.departmentId,
        departmentName: department.departmentName,
        status: appraisal.status,
        startDate: appraisal.startDate,
        endDate: appraisal.endDate,
        remarks: appraisal.remarks,
        totalScore: appraisal.totalScore,
        createdBy: appraisal.createdBy,
        createdAt: appraisal.createdAt,
        updatedAt: appraisal.updatedAt,
      })
      .from(appraisal)
      .leftJoin(appraisalTemplate, eq(appraisal.templateId, appraisalTemplate.id))
      .leftJoin(users, eq(appraisal.empId, users.id))
      .leftJoin(department, eq(appraisal.departmentId, department.id))
      .where(and(eq(appraisal.id, id), eq(appraisal.isDeleted, false)))
      .limit(1);
    return result;
  }

  async getAppraisalWithGoals(id: number) {
    const row = await this.getAppraisalById(id);
    if (!row) return null;
    const goals = await this.getGoalsByAppraisalId(id);
    return { ...row, goals };
  }

  async getEmployeeDepartment(empId: number) {
    const [result] = await this.db
      .select({
        departmentId: employment.departmentId,
        departmentName: department.departmentName,
      })
      .from(employment)
      .leftJoin(department, eq(employment.departmentId, department.id))
      .where(
        and(eq(employment.employeeId, empId), eq(employment.isDeleted, false)),
      )
      .limit(1);
    return result ?? null;
  }

  async getNextSeriesSequence(organizationId: number, year: number) {
    const prefix = `HR-APR-${year}-`;
    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(appraisal)
      .where(
        and(
          eq(appraisal.organizationId, organizationId),
          eq(appraisal.isDeleted, false),
          ilike(appraisal.series, `${prefix}%`),
        ),
      );
    return (result?.count ?? 0) + 1;
  }

  async getAllAppraisals(
    organizationId: number,
    filters: {
      search?: string;
      empId?: number;
      status?: string;
      templateId?: number;
      limit?: number;
      offset?: number;
    },
  ) {
    const limit = filters.limit ?? 20;
    const offset = filters.offset ?? 0;

    let whereClause = and(
      eq(appraisal.organizationId, organizationId),
      eq(appraisal.isDeleted, false),
    );
    if (filters.empId) {
      whereClause = and(whereClause, eq(appraisal.empId, filters.empId));
    }
    if (filters.status) {
      whereClause = and(whereClause, eq(appraisal.status, filters.status));
    }
    if (filters.templateId) {
      whereClause = and(
        whereClause,
        eq(appraisal.templateId, filters.templateId),
      );
    }
    if (filters.search) {
      whereClause = and(
        whereClause,
        ilike(users.name, `%${filters.search}%`),
      );
    }

    const rows = await this.db
      .select({
        id: appraisal.id,
        organizationId: appraisal.organizationId,
        series: appraisal.series,
        templateId: appraisal.templateId,
        templateTitle: appraisalTemplate.title,
        empId: appraisal.empId,
        employeeName: users.name,
        departmentId: appraisal.departmentId,
        departmentName: department.departmentName,
        status: appraisal.status,
        startDate: appraisal.startDate,
        endDate: appraisal.endDate,
        remarks: appraisal.remarks,
        totalScore: appraisal.totalScore,
        createdBy: appraisal.createdBy,
        createdAt: appraisal.createdAt,
        updatedAt: appraisal.updatedAt,
      })
      .from(appraisal)
      .leftJoin(appraisalTemplate, eq(appraisal.templateId, appraisalTemplate.id))
      .leftJoin(users, eq(appraisal.empId, users.id))
      .leftJoin(department, eq(appraisal.departmentId, department.id))
      .where(whereClause)
      .orderBy(desc(appraisal.createdAt))
      .limit(limit)
      .offset(offset);

    return rows;
  }

  async countAppraisals(
    organizationId: number,
    filters: {
      search?: string;
      empId?: number;
      status?: string;
      templateId?: number;
    },
  ) {
    let whereClause = and(
      eq(appraisal.organizationId, organizationId),
      eq(appraisal.isDeleted, false),
    );
    if (filters.empId) {
      whereClause = and(whereClause, eq(appraisal.empId, filters.empId));
    }
    if (filters.status) {
      whereClause = and(whereClause, eq(appraisal.status, filters.status));
    }
    if (filters.templateId) {
      whereClause = and(
        whereClause,
        eq(appraisal.templateId, filters.templateId),
      );
    }

    if (filters.search) {
      const [result] = await this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(appraisal)
        .leftJoin(users, eq(appraisal.empId, users.id))
        .where(and(whereClause, ilike(users.name, `%${filters.search}%`)));
      return result?.count ?? 0;
    }

    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(appraisal)
      .where(whereClause);
    return result?.count ?? 0;
  }

  async updateAppraisal(
    id: number,
    data: Partial<typeof appraisal.$inferInsert>,
  ) {
    const [result] = await this.db
      .update(appraisal)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(appraisal.id, id))
      .returning();
    return result;
  }

  async softDeleteAppraisal(id: number) {
    const [result] = await this.db
      .update(appraisal)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(appraisal.id, id))
      .returning();
    return result;
  }
}

export default AppraisalRepository;
