import { eq, and, sql, ilike, or, desc, asc } from "drizzle-orm";
import { department, employment, users, Employee } from "../db/schema.js";
import { db } from "../db/connection.js";

class DepartmentRepository {
  private db: typeof db;
  constructor() {
    this.db = db;
  }

  async createDepartment(data: typeof department.$inferInsert) {
    const result = await this.db
      .insert(department)
      .values({ ...data })
      .returning();
    return (result as any)[0];
  }

  async getDepartmentById(id: number) {
    const countSubquery = this.db
      .select({
        departmentId: employment.departmentId,
        count: sql<number>`count(*)::int`.as("count"),
      })
      .from(employment)
      .where(eq(employment.isDeleted, false))
      .groupBy(employment.departmentId)
      .as("emp_count");

    const result = await this.db
      .select({
        id: department.id,
        organizationId: department.organizationId,
        departmentName: department.departmentName,
        departmentCode: department.departmentCode,
        description: department.description,
        managerId: department.managerId,
        managerName: users.name,
        status: department.status,
        employeeCount: sql<number>`coalesce(${countSubquery.count}, 0)::int`,
        isDeleted: department.isDeleted,
        createdBy: department.createdBy,
        createdAt: department.createdAt,
        updatedAt: department.updatedAt,
      })
      .from(department)
      .leftJoin(countSubquery, eq(department.id, countSubquery.departmentId))
      .leftJoin(users, eq(department.managerId, users.id))
      .where(and(eq(department.id, id), eq(department.isDeleted, false)))
      .limit(1);
    return (result as any)[0];
  }

  async findDepartmentByName(name: string, organizationId: number) {
    const result = await this.db
      .select()
      .from(department)
      .where(
        and(
          eq(department.departmentName, name),
          eq(department.organizationId, organizationId),
          eq(department.isDeleted, false)
        )
      )
      .limit(1);
    return (result as any)[0];
  }

  async findDepartmentByCode(code: string, organizationId: number) {
    const result = await this.db
      .select()
      .from(department)
      .where(
        and(
          eq(department.departmentCode, code),
          eq(department.organizationId, organizationId),
          eq(department.isDeleted, false)
        )
      )
      .limit(1);
    return (result as any)[0];
  }

  async getDepartmentsDropdown(organizationId: number) {
    const result = await this.db
      .select({
        id: department.id,
        name: department.departmentName,
      })
      .from(department)
      .where(
        and(
          eq(department.organizationId, organizationId),
          eq(department.status, "Active"),
          eq(department.isDeleted, false)
        )
      );
    return result;
  }

  async getAllDepartments(
    organizationId: number,
    search?: string,
    status?: string,
    sortBy?: string,
    sortOrder: "asc" | "desc" = "desc",
    limit?: number,
    offset?: number
  ) {
    const countSubquery = this.db
      .select({
        departmentId: employment.departmentId,
        count: sql<number>`count(*)::int`.as("count"),
      })
      .from(employment)
      .where(eq(employment.isDeleted, false))
      .groupBy(employment.departmentId)
      .as("emp_count");

    let whereClause = and(
      eq(department.organizationId, organizationId),
      eq(department.isDeleted, false)
    );

    if (status) {
      whereClause = and(whereClause, eq(department.status, status));
    }

    if (search) {
      whereClause = and(
        whereClause,
        or(
          ilike(department.departmentName, `%${search}%`),
          ilike(department.departmentCode, `%${search}%`)
        )
      );
    }

    let query = this.db
      .select({
        id: department.id,
        organizationId: department.organizationId,
        departmentName: department.departmentName,
        departmentCode: department.departmentCode,
        description: department.description,
        managerId: department.managerId,
        managerName: users.name,
        status: department.status,
        employeeCount: sql<number>`coalesce(${countSubquery.count}, 0)::int`,
        createdBy: department.createdBy,
        createdAt: department.createdAt,
        updatedAt: department.updatedAt,
      })
      .from(department)
      .leftJoin(countSubquery, eq(department.id, countSubquery.departmentId))
      .leftJoin(users, eq(department.managerId, users.id))
      .where(whereClause);

    let orderExpression = desc(department.createdAt);
    if (sortBy === "departmentName" || sortBy === "name") {
      orderExpression = sortOrder === "asc" ? asc(department.departmentName) : desc(department.departmentName);
    } else if (sortBy === "createdAt" || sortBy === "createdDate") {
      orderExpression = sortOrder === "asc" ? asc(department.createdAt) : desc(department.createdAt);
    } else if (sortBy === "employeeCount" || sortBy === "employees") {
      orderExpression = sortOrder === "asc" ? asc(sql`coalesce(${countSubquery.count}, 0)`) : desc(sql`coalesce(${countSubquery.count}, 0)`);
    }

    query = query.orderBy(orderExpression) as any;

    if (limit !== undefined && offset !== undefined) {
      query = query.limit(limit).offset(offset) as any;
    }

    return await query;
  }

  async countDepartments(organizationId: number, search?: string, status?: string) {
    let whereClause = and(
      eq(department.organizationId, organizationId),
      eq(department.isDeleted, false)
    );

    if (status) {
      whereClause = and(whereClause, eq(department.status, status));
    }

    if (search) {
      whereClause = and(
        whereClause,
        or(
          ilike(department.departmentName, `%${search}%`),
          ilike(department.departmentCode, `%${search}%`)
        )
      );
    }

    const result = await this.db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(department)
      .where(whereClause);

    return result[0]?.count ?? 0;
  }

  async getDepartmentStats(organizationId: number) {
    const [totalDept] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(department)
      .where(and(eq(department.organizationId, organizationId), eq(department.isDeleted, false)));

    const [activeDept] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(department)
      .where(
        and(
          eq(department.organizationId, organizationId),
          eq(department.status, "Active"),
          eq(department.isDeleted, false)
        )
      );

    const [inactiveDept] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(department)
      .where(
        and(
          eq(department.organizationId, organizationId),
          eq(department.status, "Inactive"),
          eq(department.isDeleted, false)
        )
      );

    const [employeesAssigned] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(employment)
      .innerJoin(
        department,
        and(
          eq(employment.departmentId, department.id),
          eq(department.organizationId, organizationId),
          eq(department.isDeleted, false)
        )
      )
      .where(eq(employment.isDeleted, false));

    return {
      totalDepartments: totalDept?.count ?? 0,
      activeDepartments: activeDept?.count ?? 0,
      inactiveDepartments: inactiveDept?.count ?? 0,
      totalEmployeesAssigned: employeesAssigned?.count ?? 0,
    };
  }

  async checkEmployeesAssigned(departmentId: number) {
    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(employment)
      .where(and(eq(employment.departmentId, departmentId), eq(employment.isDeleted, false)))
      .limit(1);
    return (((result as any)[0] as any)?.count ?? 0) > 0;
  }

  async updateDepartment(id: number, data: Partial<typeof department.$inferInsert>) {
    const result = await this.db
      .update(department)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(department.id, id))
      .returning();
    return (result as any)[0];
  }

  async updateStatus(id: number, status: string) {
    const result = await this.db
      .update(department)
      .set({ status, updatedAt: new Date() })
      .where(eq(department.id, id))
      .returning();
    return (result as any)[0];
  }

  async softDeleteDepartment(id: number) {
    const result = await this.db
      .update(department)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(department.id, id))
      .returning();
    return (result as any)[0];
  }
}

export default DepartmentRepository;
