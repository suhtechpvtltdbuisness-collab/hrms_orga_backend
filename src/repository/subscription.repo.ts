import { db } from "../db/connection.js";
import { Plain, PlainPayment, Employee, subscriptionPlanDefinition, users } from "../db/schema.js";
import { and, asc, eq, sql, ne } from "drizzle-orm";

export class SubscriptionRepository {
  async getPlanDefinitions(includeInactive = false) {
    const conditions = [eq(subscriptionPlanDefinition.isDeleted, false)];
    if (!includeInactive) conditions.push(eq(subscriptionPlanDefinition.active, true));
    return db
      .select()
      .from(subscriptionPlanDefinition)
      .where(and(...conditions))
      .orderBy(asc(subscriptionPlanDefinition.sortOrder), asc(subscriptionPlanDefinition.id));
  }

  async getAllPlanDefinitionRecords() {
    return db.select().from(subscriptionPlanDefinition).orderBy(asc(subscriptionPlanDefinition.sortOrder));
  }

  async getPlanDefinitionByType(planType: string, includeInactive = false) {
    const conditions = [
      eq(subscriptionPlanDefinition.planType, planType),
      eq(subscriptionPlanDefinition.isDeleted, false),
    ];
    if (!includeInactive) conditions.push(eq(subscriptionPlanDefinition.active, true));
    const [plan] = await db.select().from(subscriptionPlanDefinition).where(and(...conditions)).limit(1);
    return plan ?? null;
  }

  async getAnyPlanDefinitionByType(planType: string) {
    const [plan] = await db
      .select()
      .from(subscriptionPlanDefinition)
      .where(eq(subscriptionPlanDefinition.planType, planType))
      .limit(1);
    return plan ?? null;
  }

  async createPlanDefinition(data: typeof subscriptionPlanDefinition.$inferInsert) {
    const [plan] = await db.insert(subscriptionPlanDefinition).values(data).returning();
    return plan;
  }

  async updatePlanDefinition(
    id: number,
    data: Partial<typeof subscriptionPlanDefinition.$inferInsert>,
  ) {
    const [plan] = await db
      .update(subscriptionPlanDefinition)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(subscriptionPlanDefinition.id, id), eq(subscriptionPlanDefinition.isDeleted, false)))
      .returning();
    return plan ?? null;
  }

  async deletePlanDefinition(id: number) {
    const [plan] = await db
      .update(subscriptionPlanDefinition)
      .set({ active: false, isDeleted: true, updatedAt: new Date() })
      .where(and(eq(subscriptionPlanDefinition.id, id), eq(subscriptionPlanDefinition.isDeleted, false)))
      .returning();
    return plan ?? null;
  }

  async countSubscriptionsByPlanType(planType: string) {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(Plain)
      .where(and(eq(Plain.planType, planType), eq(Plain.isDeleted, false)));
    return result?.count ?? 0;
  }

  async adjustSubscriptionEmployeeLimits(planType: string, delta: number) {
    if (!delta) return;
    await db
      .update(Plain)
      .set({
        maxEmployees: sql`greatest(1, ${Plain.maxEmployees} + ${delta})`,
        updatedAt: new Date(),
      })
      .where(and(eq(Plain.planType, planType), eq(Plain.isDeleted, false)));
  }
  async getActivePlanByUserId(userId: number) {
    const [plan] = await db
      .select()
      .from(Plain)
      .where(and(eq(Plain.userId, userId), eq(Plain.isDeleted, false)))
      .limit(1);

    return plan ?? null;
  }

  async countEmployeesByAdminId(adminId: number): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(Employee)
      .where(eq(Employee.adminId, adminId));

    return result?.count ?? 0;
  }

  async getAdminIdByEmployeeUserId(userId: number): Promise<number | null> {
    const [row] = await db
      .select({ adminId: Employee.adminId })
      .from(Employee)
      .where(eq(Employee.userId, userId))
      .limit(1);

    return row?.adminId ?? null;
  }

  async getAdminBasicDetails(adminId: number) {
    const [admin] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(and(eq(users.id, adminId), eq(users.isDeleted, false)))
      .limit(1);

    return admin ?? null;
  }

  async getPlanByRazorpaySubscriptionId(subscriptionId: string) {
    const [plan] = await db
      .select()
      .from(Plain)
      .where(
        and(
          eq(Plain.razorpaySubscriptionId, subscriptionId),
          eq(Plain.isDeleted, false),
        ),
      )
      .limit(1);

    return plan ?? null;
  }

  async createPlan(data: typeof Plain.$inferInsert) {
    const [plan] = await db.insert(Plain).values(data).returning();
    return plan;
  }

  async updatePlan(planId: number, data: Partial<typeof Plain.$inferInsert>) {
    const [plan] = await db
      .update(Plain)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(Plain.id, planId))
      .returning();

    return plan;
  }

  async createPayment(data: typeof PlainPayment.$inferInsert) {
    if (data.paymentId) {
      const existing = await this.getPaymentByPaymentId(data.paymentId);
      if (existing) {
        throw new Error("This payment has already been processed");
      }
    }

    const [payment] = await db.insert(PlainPayment).values(data).returning();
    return payment;
  }

  async getPaymentByPaymentId(paymentId: string) {
    const [payment] = await db
      .select()
      .from(PlainPayment)
      .where(eq(PlainPayment.paymentId, paymentId))
      .limit(1);

    return payment ?? null;
  }

  async getAllSubscriptionsWithUsers(page: number, limit: number, search?: string) {
    const offset = (page - 1) * limit;
    
    let whereClause = and(eq(Plain.isDeleted, false), ne(users.roleId, 0));
    
    if (search) {
      whereClause = and(
        whereClause,
        sql`(${users.name} ILIKE ${'%' + search + '%'} OR ${users.email} ILIKE ${'%' + search + '%'})`
      );
    }
    
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(Plain)
      .innerJoin(users, eq(Plain.userId, users.id))
      .where(whereClause);
      
    const total = countResult?.count ?? 0;
    
    const data = await db
      .select({
        plan: Plain,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(Plain)
      .innerJoin(users, eq(Plain.userId, users.id))
      .where(whereClause)
      .limit(limit)
      .offset(offset);
      
    return { data, total };
  }
}
