import { db } from "../db/connection.js";
import { Plain, PlainPayment, Employee } from "../db/schema.js";
import { and, eq, sql } from "drizzle-orm";

export class SubscriptionRepository {
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
    const [payment] = await db.insert(PlainPayment).values(data).returning();
    return payment;
  }
}
