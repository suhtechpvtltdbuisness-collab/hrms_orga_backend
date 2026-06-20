import { db } from "../db/connection.js";
import { users, Employee, employment, Plain } from "../db/schema.js";
import { eq, ne, and, sql } from "drizzle-orm";

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
  async getuserAdminDetailsByUserId(id: number) {
    const result = await db
      .select()
      .from(Employee)
      .leftJoin(users, eq(users.id, Employee.adminId))
      .where(eq(Employee.userId, id))
      .limit(1);
    return result;
  }

  async getUserById(id: number) {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return result[0];
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

  async getEmployeeDetailsByUserId(userId: number) {
    const result = await db
      .select({
        employee: Employee,
        user: users,
        employment: employment,
      })
      .from(Employee)
      .innerJoin(users, eq(Employee.userId, users.id))
      .leftJoin(employment, eq(employment.employeeId, Employee.id))
      .where(eq(Employee.userId, userId))
      .limit(1);
    return result[0];
  }

  async updateUser(id: number, data: typeof users.$inferInsert) {
    const result = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    if (result.length === 0) {
      throw new Error("User not found");
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = result[0];
    return userWithoutPassword;
  }

  async getAllUsersForSuperAdmin(page: number, limit: number, search?: string) {
    const offset = (page - 1) * limit;
    
    let whereClause = and(eq(users.isDeleted, false), ne(users.roleId, 0));
    
    if (search) {
      whereClause = and(
        whereClause,
        sql`(${users.name} ILIKE ${'%' + search + '%'} OR ${users.email} ILIKE ${'%' + search + '%'})`
      );
    }
    
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(whereClause);
      
    const total = countResult?.count ?? 0;
    
    const data = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        active: users.active,
        createdAt: users.createdAt,
        roleId: users.roleId,
        type: users.type,
        profilePic: users.profilePic,
        plan: {
          id: Plain.id,
          planType: Plain.planType,
          active: Plain.active,
          expired: Plain.expired,
          price: Plain.price,
        }
      })
      .from(users)
      .leftJoin(
        Plain,
        and(
          eq(Plain.userId, users.id),
          eq(Plain.isDeleted, false)
        )
      )
      .where(whereClause)
      .limit(limit)
      .offset(offset);
      
    return { data, total };
  }
}
export default UserRepository;
