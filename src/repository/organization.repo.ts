import { db } from "../db/connection.js";
import { organizations, users, Plain, PlainPayment, Employee } from "../db/schema.js";
import { eq, and, sql } from "drizzle-orm";

class OrganizationRepository {
  private db: typeof db;
  constructor() {
    this.db = db;
  }

  async createOrganizationAndOnboardUser(
    orgData: typeof organizations.$inferInsert,
    userId: number
  ) {
    return await db.transaction(async (tx) => {
      // 1. Create organization
      const [insertedOrg] = await tx
        .insert(organizations)
        .values({
          ...orgData,
          createdBy: userId,
        })
        .returning();

      // 2. Update user
      const [updatedUser] = await tx
        .update(users)
        .set({
          organizationId: insertedOrg.id,
          onboardingCompleted: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

      return {
        organization: insertedOrg,
        user: updatedUser,
      };
    });
  }

  async getOrganizationById(id: number) {
    const result = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id))
      .limit(1);
    return result[0];
  }

  async getAllOrganizations(page: number = 1, limit: number = 10, search?: string) {
    const offset = (page - 1) * limit;

    let whereClause = sql`1=1`;
    if (search) {
      whereClause = sql`(${organizations.name} ILIKE ${'%' + search + '%'} OR ${organizations.organizationEmail} ILIKE ${'%' + search + '%'})`;
    }

    // Count total organizations
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(organizations)
      .where(whereClause);

    const total = countResult?.count ?? 0;

    // Fetch organizations left joined with subscription and computing user count
    const data = await db
      .select({
        organization: organizations,
        userCount: sql<number>`(SELECT count(*)::int FROM ${users} WHERE ${users.organizationId} = ${organizations.id})::int`,
        plan: {
          planType: Plain.planType,
          active: Plain.active,
          expired: Plain.expired,
        }
      })
      .from(organizations)
      .leftJoin(Plain, eq(organizations.createdBy, Plain.userId))
      .where(whereClause)
      .limit(limit)
      .offset(offset);

    return { data, total };
  }

  async getSuperAdminDashboardOverview() {
    // 1. Total Organizations count
    const [orgCountResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(organizations);
    const totalOrganizations = orgCountResult?.count ?? 0;

    // 2. Active Subscriptions count
    const [subCountResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(Plain)
      .where(and(eq(Plain.active, true), eq(Plain.isDeleted, false), sql`${Plain.expired} IS NULL OR ${Plain.expired}::timestamp > now()`));
    const activeSubscriptions = subCountResult?.count ?? 0;

    // 3. Total Employees count
    const [empCountResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(Employee);
    const totalEmployees = empCountResult?.count ?? 0;

    // 4. Monthly Revenue (sum of plain_payment in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const [revenueResult] = await db
      .select({ sum: sql<string>`coalesce(sum(${PlainPayment.totalAmount}), '0')` })
      .from(PlainPayment)
      .where(and(eq(PlainPayment.status, 'paid'), sql`${PlainPayment.createdAt} >= ${thirtyDaysAgo}`));
    let monthlyRevenue = parseFloat(revenueResult?.sum ?? '0');

    // If monthlyRevenue is 0, let's sum all paid payments as a fallback
    if (monthlyRevenue === 0) {
      const [allRevenueResult] = await db
        .select({ sum: sql<string>`coalesce(sum(${PlainPayment.totalAmount}), '0')` })
        .from(PlainPayment)
        .where(eq(PlainPayment.status, 'paid'));
      monthlyRevenue = parseFloat(allRevenueResult?.sum ?? '0');
    }

    // 5. Previous month counts to calculate growth percentage
    const startOfCurrentMonth = new Date();
    startOfCurrentMonth.setDate(1);
    startOfCurrentMonth.setHours(0,0,0,0);

    const [prevOrgCountResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(organizations)
      .where(sql`${organizations.createdAt} < ${startOfCurrentMonth}`);
    const prevOrgCount = prevOrgCountResult?.count ?? 0;
    const orgsGrowthPercent = prevOrgCount > 0 ? Math.round(((totalOrganizations - prevOrgCount) / prevOrgCount) * 100) : 0;

    const [prevSubCountResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(Plain)
      .where(and(
        eq(Plain.active, true),
        eq(Plain.isDeleted, false),
        sql`${Plain.createdAt} < ${startOfCurrentMonth}`
      ));
    const prevSubCount = prevSubCountResult?.count ?? 0;
    const subsGrowthPercent = prevSubCount > 0 ? Math.round(((activeSubscriptions - prevSubCount) / prevSubCount) * 100) : 0;

    // 6. Recent organizations (latest 5)
    const recentOrgsData = await db
      .select({
        organization: organizations,
        userCount: sql<number>`(SELECT count(*)::int FROM ${users} WHERE ${users.organizationId} = ${organizations.id})::int`,
        plan: {
          planType: Plain.planType,
          active: Plain.active,
          expired: Plain.expired,
        }
      })
      .from(organizations)
      .leftJoin(Plain, eq(organizations.createdBy, Plain.userId))
      .orderBy(sql`${organizations.createdAt} DESC`)
      .limit(5);

    // 7. Fetch recent payments for activity feed
    const recentPayments = await db
      .select({
        payment: PlainPayment,
        orgName: organizations.name,
        planType: Plain.planType,
      })
      .from(PlainPayment)
      .innerJoin(Plain, eq(PlainPayment.plainId, Plain.id))
      .innerJoin(users, eq(Plain.userId, users.id))
      .leftJoin(organizations, eq(users.organizationId, organizations.id))
      .orderBy(sql`${PlainPayment.createdAt} DESC`)
      .limit(5);

    // 8. Fetch recent employees for activity feed
    const recentEmployees = await db
      .select({
        employee: users,
        orgName: organizations.name,
      })
      .from(users)
      .leftJoin(organizations, eq(users.organizationId, organizations.id))
      .where(and(eq(users.roleId, 2), eq(users.isDeleted, false)))
      .orderBy(sql`${users.createdAt} DESC`)
      .limit(5);

    return {
      stats: {
        totalOrganizations,
        orgsGrowthPercent,
        activeSubscriptions,
        subsGrowthPercent,
        totalEmployees,
        monthlyRevenue,
      },
      recentOrganizations: recentOrgsData,
      recentPayments,
      recentEmployees,
    };
  }
}

export default OrganizationRepository;


