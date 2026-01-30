import { db } from "../db/connection.js";
import { designation } from "../db/schema.js";
import { eq } from "drizzle-orm";

class DesignationRepository {
  private db: typeof db;
  constructor() {
    this.db = db;
  }

  async createDesignation(data: typeof designation.$inferInsert) {
    const result = await db
      .insert(designation)
      .values({ ...data })
      .returning();
    return result;
  }

  async getDesignationById(id: number) {
    const result = await db
      .select()
      .from(designation)
      .where(eq(designation.id, id));
    return result[0];
  }

  async getAllDesignations() {
    const result = await db.select().from(designation);
    return result;
  }

  async updateDesignation(id: number, data: typeof designation.$inferInsert) {
    const result = await db
      .update(designation)
      .set({ ...data })
      .where(eq(designation.id, id))
      .returning();
    return result;
  }
}

export default DesignationRepository;
