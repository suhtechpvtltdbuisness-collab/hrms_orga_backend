import { orgOrder } from "../db/schema.js";
import { db } from "../db/connection.js";
import { eq, and } from "drizzle-orm";

class OrgOrder {
  async createOrgOrder(data: typeof orgOrder.$inferInsert) {
    const result = await db.insert(orgOrder).values(data).returning();
    return result;
  }
  async getOrgOrderById(id: number) {
    const result = await db.select().from(orgOrder).where(eq(orgOrder.id, id));
    return result;
  }
  async updateOrgOrder(id: number, data: typeof orgOrder.$inferInsert) {
    const result = await db
      .update(orgOrder)
      .set(data)
      .where(eq(orgOrder.id, id))
      .returning();
    return result;
  }
}
export default new OrgOrder();
