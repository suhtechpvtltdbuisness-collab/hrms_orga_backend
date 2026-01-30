import { db } from "../db/connection.js";
import { users, Employee } from "../db/schema.js";
import { eq } from "drizzle-orm";

class UserRepository {
  private db: typeof db;
  constructor() {
    this.db = db;
  }
  async createUser(
    data: typeof users.$inferInsert,
    user: typeof users.$inferSelect,
  ) {
    const result = await db.transaction(async (tx) => {
      const insertedUsers = await tx
        .insert(users)
        .values({ ...data })
        .returning();
      const employeeData = await tx
        .insert(Employee)
        .values({
          userId: insertedUsers[0].id,
          adminId: user.id,
        })
        .returning();
    });
    return result;
  }
  async getUserById(id: number) {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return result;
  }
  async getEmployeeById(id: number) {
    const result = await db
      .select()
      .from(Employee)
      .where(eq(Employee.id, id))
      .limit(1);
    return result;
  }
}
export default UserRepository;
