import { db } from "../db/connection.js";
import {
  users,
  Employee,
  employment,
  payroll,
  document,
  Plain,
  subscriptionPlanDefinition,
  department,
  designation,
} from "../db/schema.js";
import { eq, ne, and, sql } from "drizzle-orm";

class UserRepository {
  private db: typeof db;
  constructor() {
    this.db = db;
  }
  async createUser(
    data: typeof users.$inferInsert,
    user: typeof users.$inferSelect,
    relatedData?: {
      employment?: Omit<typeof employment.$inferInsert, "employeeId"> | null;
      payroll?: Omit<typeof payroll.$inferInsert, "empId"> | null;
      documents?: Array<Omit<typeof document.$inferInsert, "empId">>;
    },
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

      let employmentData = null;
      if (relatedData?.employment) {
        const insertedEmployment = await tx
          .insert(employment)
          .values({
            ...relatedData.employment,
            employeeId: insertedUsers[0].id,
            createdBy: user.id,
          })
          .returning();
        employmentData = insertedEmployment[0];
      }

      let payrollData = null;
      if (relatedData?.payroll) {
        const insertedPayroll = await tx
          .insert(payroll)
          .values({
            ...relatedData.payroll,
            empId: insertedUsers[0].id,
            createdBy: user.id,
          })
          .returning();
        payrollData = insertedPayroll[0];
      }

      let documentData: Array<typeof document.$inferSelect> = [];
      if (relatedData?.documents?.length) {
        documentData = await tx
          .insert(document)
          .values(
            relatedData.documents.map((item) => ({
              ...item,
              empId: insertedUsers[0].id,
            })),
          )
          .returning();
      }

      // Remove password from response
      const { password: _, ...userWithoutPassword } = insertedUsers[0];

      return {
        user: userWithoutPassword,
        employee: employeeData[0],
        employment: employmentData,
        payroll: payrollData,
        documents: documentData,
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
      .where(and(eq(users.id, id), eq(users.isDeleted, false)))
      .limit(1);
    return result[0];
  }

  async getUserByEmail(email: string) {
    const result = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, email), eq(users.isDeleted, false)))
      .limit(1);
    return result[0];
  }

  async getEmployeeById(id: number) {
    const result = await db
      .select()
      .from(Employee)
      .innerJoin(users, eq(Employee.userId, users.id))
      .where(and(eq(Employee.id, id), eq(users.isDeleted, false)))
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

  async getAllEmployeesByAdminId(adminId: number, page?: number, limit?: number, search?: string) {
    let whereClause: any = and(
      eq(Employee.adminId, adminId),
      eq(users.isDeleted, false),
    );
    if (search) {
      whereClause = and(
        whereClause,
        sql`(${users.name} ILIKE ${'%' + search + '%'} OR ${users.email} ILIKE ${'%' + search + '%'})`
      );
    }

    if (page !== undefined && limit !== undefined) {
      const offset = (page - 1) * limit;

      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(Employee)
        .innerJoin(users, eq(Employee.userId, users.id))
        .where(whereClause);

      const total = countResult?.count ?? 0;

      const data = await db
        .select({
          employee: Employee,
          user: users,
          employment: employment,
          department: department,
          designation: designation,
        })
        .from(Employee)
        .innerJoin(users, eq(Employee.userId, users.id))
        .leftJoin(
          employment,
          and(eq(employment.employeeId, Employee.userId), eq(employment.isDeleted, false)),
        )
        .leftJoin(department, and(eq(department.id, employment.departmentId), eq(department.isDeleted, false)))
        .leftJoin(designation, and(eq(designation.id, employment.designationId), eq(designation.isDeleted, false)))
        .where(whereClause)
        .limit(limit)
        .offset(offset);

      return { data, total };
    } else {
      const data = await db
        .select({
          employee: Employee,
          user: users,
          employment: employment,
          department: department,
          designation: designation,
        })
        .from(Employee)
        .innerJoin(users, eq(Employee.userId, users.id))
        .leftJoin(
          employment,
          and(eq(employment.employeeId, Employee.userId), eq(employment.isDeleted, false)),
        )
        .leftJoin(department, and(eq(department.id, employment.departmentId), eq(department.isDeleted, false)))
        .leftJoin(designation, and(eq(designation.id, employment.designationId), eq(designation.isDeleted, false)))
        .where(whereClause);

      return { data, total: data.length };
    }
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
      .leftJoin(
        employment,
        and(eq(employment.employeeId, Employee.userId), eq(employment.isDeleted, false)),
      )
      .where(and(eq(Employee.userId, userId), eq(users.isDeleted, false)))
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

  async softDeleteUser(id: number) {
    return await db.transaction(async (tx) => {
      const [existingUser] = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, id), eq(users.isDeleted, false)))
        .limit(1);

      if (!existingUser) {
        throw new Error("Employee not found");
      }

      const [deletedUser] = await tx
        .update(users)
        .set({
          isDeleted: true,
          active: false,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();

      await tx
        .update(employment)
        .set({ isDeleted: true, updatedAt: new Date() })
        .where(and(eq(employment.employeeId, id), eq(employment.isDeleted, false)));

      await tx
        .update(payroll)
        .set({ isDeleted: true, updatedAt: new Date() })
        .where(and(eq(payroll.empId, id), eq(payroll.isDeleted, false)));

      return deletedUser;
    });
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
          name: subscriptionPlanDefinition.name,
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
      .leftJoin(
        subscriptionPlanDefinition,
        eq(subscriptionPlanDefinition.planType, Plain.planType),
      )
      .where(whereClause)
      .limit(limit)
      .offset(offset);
      
    return { data, total };
  }
}
export default UserRepository;
