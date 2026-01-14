import { db } from "../db/connection.js";
import { organization } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

class OrganizationRepo {
  async createOrganization(data: typeof organization.$inferInsert) {
    const newOrg = await db.insert(organization).values(data).returning();
    return newOrg;
  }
  async getAllOrganizations() {
    const result = await db
      .select()
      .from(organization)
      .where(eq(organization.isDeleted, false));
    return result;
  }
  async getOrganizationById(id: number) {
    const result = await db
      .select()
      .from(organization)
      .where(and(eq(organization.id, id), eq(organization.isDeleted, false)));
    return result;
  }
  async deleteOrganization(id: number) {
    const result = await db
      .update(organization)
      .set({ isDeleted: true })
      .where(eq(organization.id, id))
      .returning();
    return result;
  }
  async updateOrganization(id: number, data: typeof organization.$inferInsert) {
    const result = await db
      .update(organization)
      .set(data)
      .where(eq(organization.id, id))
      .returning();
    return result;
  }
}
export default new OrganizationRepo();
