import { eq, and, sql, ilike, desc, asc } from "drizzle-orm";
import { designation, department, employment, users } from "../db/schema.js";
import { db } from "../db/connection.js";

class DesignationRepository {
  private db: typeof db;
  constructor() {
    this.db = db;
  }

  async getDesignationByDepartmentIdAndName(
    departmentId: number,
    name: string,
  ) {
    const result = await this.db
      .select()
      .from(designation)
      .where(
        and(
          eq(designation.departmentId, departmentId),
          eq(designation.name, name),
          eq(designation.isDeleted, false)
        ),
      )
      .limit(1);
    return result[0];
  }

  async createDesignation(data: typeof designation.$inferInsert) {
    const result = await this.db
      .insert(designation)
      .values({ ...data })
      .returning();
    return result[0];
  }

  async getDesignationById(id: number) {
    const countSubquery = this.db
      .select({
        jobTitle: employment.jobTitle,
        count: sql<number>`count(*)::int`.as("count"),
      })
      .from(employment)
      .where(eq(employment.isDeleted, false))
      .groupBy(employment.jobTitle)
      .as("emp_count");

    const result = await this.db
      .select({
        id: designation.id,
        name: designation.name,
        type: designation.type,
        departmentId: designation.departmentId,
        departmentName: department.departmentName,
        level: designation.level,
        status: designation.status,
        responsibility: designation.responsibility,
        reportingTo: designation.reportingTo,
        reportingToName: users.name,
        description: designation.description,
        employeeCount: sql<number>`coalesce(${countSubquery.count}, 0)::int`,
        isDeleted: designation.isDeleted,
        createdBy: designation.createdBy,
        createdAt: designation.createdAt,
        updatedAt: designation.updatedAt,
      })
      .from(designation)
      .innerJoin(department, eq(designation.departmentId, department.id))
      .leftJoin(countSubquery, eq(designation.name, countSubquery.jobTitle))
      .leftJoin(users, eq(designation.reportingTo, users.id))
      .where(and(eq(designation.id, id), eq(designation.isDeleted, false)))
      .limit(1);
    return result[0];
  }

  async getAllDesignations(
    organizationId: number,
    search?: string,
    departmentId?: number,
    level?: number,
    status?: boolean,
    sortBy?: string,
    sortOrder: "asc" | "desc" = "desc",
    limit?: number,
    offset?: number
  ) {
    const countSubquery = this.db
      .select({
        jobTitle: employment.jobTitle,
        count: sql<number>`count(*)::int`.as("count"),
      })
      .from(employment)
      .where(eq(employment.isDeleted, false))
      .groupBy(employment.jobTitle)
      .as("emp_count");

    let whereClause = and(
      eq(department.organizationId, organizationId),
      eq(designation.isDeleted, false)
    );

    if (status !== undefined) {
      whereClause = and(whereClause, eq(designation.status, status));
    }

    if (departmentId !== undefined) {
      whereClause = and(whereClause, eq(designation.departmentId, departmentId));
    }

    if (level !== undefined) {
      whereClause = and(whereClause, eq(designation.level, level));
    }

    if (search) {
      whereClause = and(
        whereClause,
        ilike(designation.name, `%${search}%`)
      );
    }

    let query = this.db
      .select({
        id: designation.id,
        name: designation.name,
        type: designation.type,
        departmentId: designation.departmentId,
        departmentName: department.departmentName,
        level: designation.level,
        status: designation.status,
        responsibility: designation.responsibility,
        reportingTo: designation.reportingTo,
        reportingToName: users.name,
        description: designation.description,
        employeeCount: sql<number>`coalesce(${countSubquery.count}, 0)::int`,
        createdBy: designation.createdBy,
        createdAt: designation.createdAt,
        updatedAt: designation.updatedAt,
      })
      .from(designation)
      .innerJoin(department, eq(designation.departmentId, department.id))
      .leftJoin(countSubquery, eq(designation.name, countSubquery.jobTitle))
      .leftJoin(users, eq(designation.reportingTo, users.id))
      .where(whereClause);

    let orderExpression = desc(designation.createdAt);
    if (sortBy === "name") {
      orderExpression = sortOrder === "asc" ? asc(designation.name) : desc(designation.name);
    } else if (sortBy === "departmentName" || sortBy === "department") {
      orderExpression = sortOrder === "asc" ? asc(department.departmentName) : desc(department.departmentName);
    } else if (sortBy === "level") {
      orderExpression = sortOrder === "asc" ? asc(designation.level) : desc(designation.level);
    } else if (sortBy === "employeeCount" || sortBy === "employees") {
      orderExpression = sortOrder === "asc" ? asc(sql`coalesce(${countSubquery.count}, 0)`) : desc(sql`coalesce(${countSubquery.count}, 0)`);
    } else if (sortBy === "createdAt") {
      orderExpression = sortOrder === "asc" ? asc(designation.createdAt) : desc(designation.createdAt);
    }

    query = query.orderBy(orderExpression) as any;

    if (limit !== undefined && offset !== undefined) {
      query = query.limit(limit).offset(offset) as any;
    }

    return await query;
  }

  async countDesignations(
    organizationId: number,
    search?: string,
    departmentId?: number,
    level?: number,
    status?: boolean
  ) {
    let whereClause = and(
      eq(department.organizationId, organizationId),
      eq(designation.isDeleted, false)
    );

    if (status !== undefined) {
      whereClause = and(whereClause, eq(designation.status, status));
    }

    if (departmentId !== undefined) {
      whereClause = and(whereClause, eq(designation.departmentId, departmentId));
    }

    if (level !== undefined) {
      whereClause = and(whereClause, eq(designation.level, level));
    }

    if (search) {
      whereClause = and(
        whereClause,
        ilike(designation.name, `%${search}%`)
      );
    }

    const result = await this.db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(designation)
      .innerJoin(department, eq(designation.departmentId, department.id))
      .where(whereClause);

    return result[0]?.count ?? 0;
  }

  async getDesignationsDropdown(organizationId: number, departmentId?: number) {
    let whereClause = and(
      eq(department.organizationId, organizationId),
      eq(designation.status, true),
      eq(designation.isDeleted, false)
    );
    if (departmentId !== undefined) {
      whereClause = and(whereClause, eq(designation.departmentId, departmentId));
    }
    const result = await this.db
      .select({
        id: designation.id,
        name: designation.name,
        departmentId: designation.departmentId,
      })
      .from(designation)
      .innerJoin(department, eq(designation.departmentId, department.id))
      .where(whereClause);
    return result;
  }

  async getDesignationStats(organizationId: number) {
    const [totalDesig] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(designation)
      .innerJoin(department, eq(designation.departmentId, department.id))
      .where(
        and(
          eq(department.organizationId, organizationId),
          eq(designation.isDeleted, false)
        )
      );

    const [activeDesig] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(designation)
      .innerJoin(department, eq(designation.departmentId, department.id))
      .where(
        and(
          eq(department.organizationId, organizationId),
          eq(designation.status, true),
          eq(designation.isDeleted, false)
        )
      );

    const [inactiveDesig] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(designation)
      .innerJoin(department, eq(designation.departmentId, department.id))
      .where(
        and(
          eq(department.organizationId, organizationId),
          eq(designation.status, false),
          eq(designation.isDeleted, false)
        )
      );

    const [employeesAssigned] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(employment)
      .innerJoin(designation, eq(employment.jobTitle, designation.name))
      .innerJoin(department, eq(designation.departmentId, department.id))
      .where(
        and(
          eq(department.organizationId, organizationId),
          eq(designation.isDeleted, false),
          eq(employment.isDeleted, false)
        )
      );

    return {
      totalDesignations: totalDesig?.count ?? 0,
      activeDesignations: activeDesig?.count ?? 0,
      inactiveDesignations: inactiveDesig?.count ?? 0,
      totalEmployeesAssigned: employeesAssigned?.count ?? 0,
    };
  }

  async checkEmployeesAssigned(designationId: number) {
    // Find designation name first
    const desig = await this.db
      .select({ name: designation.name })
      .from(designation)
      .where(eq(designation.id, designationId))
      .limit(1);

    if (!desig[0]) return false;

    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(employment)
      .where(and(eq(employment.jobTitle, desig[0].name), eq(employment.isDeleted, false)))
      .limit(1);
    return (result[0]?.count ?? 0) > 0;
  }

  async updateDesignation(id: number, data: Partial<typeof designation.$inferInsert>) {
    const result = await this.db
      .update(designation)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(designation.id, id))
      .returning();
    return result[0];
  }

  async updateStatus(id: number, status: boolean) {
    const result = await this.db
      .update(designation)
      .set({ status, updatedAt: new Date() })
      .where(eq(designation.id, id))
      .returning();
    return result[0];
  }

  async softDeleteDesignation(id: number) {
    const result = await this.db
      .update(designation)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(designation.id, id))
      .returning();
    return result[0];
  }
}

export default DesignationRepository;
