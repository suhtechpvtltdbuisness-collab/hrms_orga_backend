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

      // Remove password from response
      const { password: _, ...userWithoutPassword } = insertedUsers[0];

      return {
        user: userWithoutPassword,
        employee: employeeData[0],
      };
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
  async getuserAdminDetailsByUserId(id: number) {
    const result = await db
      .select()
      .from(Employee)
      .leftJoin(users, eq(users.id, Employee.adminId))
      .where(eq(Employee.userId, id))
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
  async getEmployeeByAdminId(id: number) {
    const result = await db
      .select()
      .from(users)
      .leftJoin(Employee, eq(Employee.adminId, users.id))
      .where(eq(users.id, id));
    return result;
  }

  async getAllEmployeesByAdminId(adminId: number) {
    const result = await db
      .select({
        employee: Employee,
        user: users,
      })
      .from(Employee)
      .innerJoin(users, eq(Employee.userId, users.id))
      .where(eq(Employee.adminId, adminId));
    return result;
  }
}
export default UserRepository;
