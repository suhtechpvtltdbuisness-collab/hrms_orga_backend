import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "../db/connection.js";
import {
  announcement,
  announcementRead,
  department,
  employment,
  users,
} from "../db/schema.js";

export type AnnouncementListFilters = {
  status?: string;
  priority?: string;
  audience?: string;
  department?: string;
  query?: string;
  sort?: string;
};

export class AnnouncementRepository {
  async list(organizationId: number, filters: AnnouncementListFilters = {}) {
    const conditions = [
      eq(announcement.organizationId, organizationId),
      eq(announcement.isDeleted, false),
    ];

    if (filters.status && filters.status !== "All") {
      conditions.push(eq(announcement.status, filters.status));
    }
    if (filters.priority && filters.priority !== "All") {
      conditions.push(eq(announcement.priority, filters.priority));
    }
    if (filters.audience && filters.audience !== "All") {
      conditions.push(eq(announcement.audience, filters.audience));
    }
    if (filters.department && filters.department !== "All") {
      conditions.push(
        sql`${announcement.departments} ? ${filters.department}`,
      );
    }
    if (filters.query?.trim()) {
      const q = `%${filters.query.trim()}%`;
      conditions.push(
        or(
          ilike(announcement.title, q),
          ilike(announcement.description, q),
          ilike(announcement.content, q),
          ilike(announcement.author, q),
        )!,
      );
    }

    let orderBy = desc(announcement.createdAt);
    if (filters.sort === "Oldest") orderBy = asc(announcement.createdAt);
    if (filters.sort === "Title") orderBy = asc(announcement.title);

    const rows = await db
      .select({
        announcement,
        reads: sql<number>`(
          SELECT count(*)::int FROM "announcement_read" ar
          WHERE ar."announcement_id" = ${announcement.id}
        )`.as("reads"),
      })
      .from(announcement)
      .where(and(...conditions))
      .orderBy(orderBy);

    return rows.map((row) => ({ ...row.announcement, reads: Number(row.reads || 0) }));
  }

  async getById(id: number, organizationId: number) {
    const [row] = await db
      .select({
        announcement,
        reads: sql<number>`(
          SELECT count(*)::int FROM "announcement_read" ar
          WHERE ar."announcement_id" = ${announcement.id}
        )`.as("reads"),
      })
      .from(announcement)
      .where(
        and(
          eq(announcement.id, id),
          eq(announcement.organizationId, organizationId),
          eq(announcement.isDeleted, false),
        ),
      )
      .limit(1);
    if (!row) return null;
    return { ...row.announcement, reads: Number(row.reads || 0) };
  }

  async create(data: typeof announcement.$inferInsert) {
    const [row] = await db.insert(announcement).values(data).returning();
    return { ...row, reads: 0 };
  }

  async update(
    id: number,
    organizationId: number,
    data: Partial<typeof announcement.$inferInsert>,
  ) {
    const [row] = await db
      .update(announcement)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(announcement.id, id),
          eq(announcement.organizationId, organizationId),
          eq(announcement.isDeleted, false),
        ),
      )
      .returning();
    if (!row) return null;
    const full = await this.getById(id, organizationId);
    return full;
  }

  async softDelete(id: number, organizationId: number) {
    const [row] = await db
      .update(announcement)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(
        and(
          eq(announcement.id, id),
          eq(announcement.organizationId, organizationId),
          eq(announcement.isDeleted, false),
        ),
      )
      .returning();
    return row;
  }

  async getStats(organizationId: number) {
    const rows = await db
      .select({
        status: announcement.status,
        count: sql<number>`count(*)::int`,
      })
      .from(announcement)
      .where(
        and(
          eq(announcement.organizationId, organizationId),
          eq(announcement.isDeleted, false),
        ),
      )
      .groupBy(announcement.status);

    const byStatus: Record<string, number> = {
      Published: 0,
      Draft: 0,
      Scheduled: 0,
      Archived: 0,
    };
    let total = 0;
    for (const row of rows) {
      byStatus[row.status] = Number(row.count || 0);
      total += Number(row.count || 0);
    }
    return { total, ...byStatus };
  }

  async countOrgEmployees(organizationId: number) {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(
        and(
          eq(users.organizationId, organizationId),
          eq(users.isDeleted, false),
          eq(users.active, true),
          eq(users.roleId, 2),
        ),
      );
    return Number(row?.count || 0);
  }

  async countManagersAdmins(organizationId: number) {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(
        and(
          eq(users.organizationId, organizationId),
          eq(users.isDeleted, false),
          eq(users.active, true),
          or(
            inArray(users.roleId, [0, 1]),
            eq(users.type, "manager"),
            eq(users.isAdmin, true),
          )!,
        ),
      );
    return Number(row?.count || 0);
  }

  async countEmployeesInDepartments(
    organizationId: number,
    departmentNames: string[],
  ) {
    if (!departmentNames.length) return 0;
    const [row] = await db
      .select({ count: sql<number>`count(DISTINCT ${users.id})::int` })
      .from(users)
      .innerJoin(employment, eq(employment.employeeId, users.id))
      .innerJoin(department, eq(department.id, employment.departmentId))
      .where(
        and(
          eq(users.organizationId, organizationId),
          eq(users.isDeleted, false),
          eq(users.active, true),
          eq(department.isDeleted, false),
          inArray(department.departmentName, departmentNames),
        ),
      );
    return Number(row?.count || 0);
  }

  async getEmployeeContext(userId: number, organizationId: number) {
    const [row] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        roleId: users.roleId,
        type: users.type,
        isAdmin: users.isAdmin,
        departmentName: department.departmentName,
      })
      .from(users)
      .leftJoin(employment, eq(employment.employeeId, users.id))
      .leftJoin(department, eq(department.id, employment.departmentId))
      .where(
        and(
          eq(users.id, userId),
          eq(users.organizationId, organizationId),
          eq(users.isDeleted, false),
        ),
      )
      .limit(1);
    return row || null;
  }

  async listPublished(organizationId: number) {
    const rows = await db
      .select({
        announcement,
        reads: sql<number>`(
          SELECT count(*)::int FROM "announcement_read" ar
          WHERE ar."announcement_id" = ${announcement.id}
        )`.as("reads"),
      })
      .from(announcement)
      .where(
        and(
          eq(announcement.organizationId, organizationId),
          eq(announcement.isDeleted, false),
          eq(announcement.status, "Published"),
        ),
      )
      .orderBy(desc(announcement.publishedAt), desc(announcement.id));

    return rows.map((row) => ({ ...row.announcement, reads: Number(row.reads || 0) }));
  }

  async getReadIds(userId: number, announcementIds: number[]) {
    if (!announcementIds.length) return new Set<number>();
    const rows = await db
      .select({ announcementId: announcementRead.announcementId })
      .from(announcementRead)
      .where(
        and(
          eq(announcementRead.userId, userId),
          inArray(announcementRead.announcementId, announcementIds),
        ),
      );
    return new Set(rows.map((r) => r.announcementId));
  }

  async isRead(announcementId: number, userId: number) {
    const [row] = await db
      .select({ id: announcementRead.id })
      .from(announcementRead)
      .where(
        and(
          eq(announcementRead.announcementId, announcementId),
          eq(announcementRead.userId, userId),
        ),
      )
      .limit(1);
    return Boolean(row);
  }

  async markRead(
    announcementId: number,
    userId: number,
    organizationId: number,
  ) {
    await db
      .insert(announcementRead)
      .values({ announcementId, userId, organizationId })
      .onConflictDoNothing();
    return true;
  }

  async markUnread(announcementId: number, userId: number) {
    await db
      .delete(announcementRead)
      .where(
        and(
          eq(announcementRead.announcementId, announcementId),
          eq(announcementRead.userId, userId),
        ),
      );
    return true;
  }
}
