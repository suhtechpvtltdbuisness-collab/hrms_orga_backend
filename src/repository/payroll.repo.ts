import { eq, and } from "drizzle-orm";
import { payroll } from "../db/schema.js";
import { db } from "../db/connection.js";

class PayrollRepository {
  private db: typeof db;
  constructor() {
    this.db = db;
  }

  async createPayroll(data: typeof payroll.$inferInsert) {
    const result = await db
      .insert(payroll)
      .values({ ...data })
      .returning();
    return result[0];
  }

  async getPayrollById(id: number) {
    const result = await db
      .select()
      .from(payroll)
      .where(and(eq(payroll.id, id), eq(payroll.isDeleted, false)))
      .limit(1);
    return result[0];
  }

  async getPayrollByEmployeeId(empId: number) {
    const result = await db
      .select()
      .from(payroll)
      .where(and(eq(payroll.empId, empId), eq(payroll.isDeleted, false)));
    return result;
  }

  async getAllPayrolls() {
    const result = await db
      .select()
      .from(payroll)
      .where(eq(payroll.isDeleted, false));
    return result;
  }

  async updatePayroll(id: number, data: typeof payroll.$inferInsert) {
    const result = await db
      .update(payroll)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(payroll.id, id))
      .returning();
    return result[0];
  }

  async deletePayroll(id: number) {
    const result = await db
      .update(payroll)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(payroll.id, id))
      .returning();
    return result[0];
  }
}

export default PayrollRepository;
