import PayrollRepository from "../repository/payroll.repo.js";
import { payroll, users } from "../db/schema.js";

class PayrollServices {
  private payrollRepo: PayrollRepository;
  constructor() {
    this.payrollRepo = new PayrollRepository();
  }

  async createPayroll(
    data: typeof payroll.$inferInsert,
    currentUser: typeof users.$inferSelect,
  ) {
    // if (!currentUser.isAdmin) {
    //   throw new Error("Only admins can create payroll");
    // }

    // Validate required fields
    if (!data.empId || !data.ctc || !data.monthlyGross || !data.monthlyPay) {
      throw new Error(
        "Employee ID, CTC, monthly gross, and monthly pay are required",
      );
    }

    const payrollData = {
      ...data,
      createdBy: currentUser.id,
    };

    const result = await this.payrollRepo.createPayroll(payrollData);
    return {
      message: "successfully created payroll",
      success: true,
      data: result,
    };
  }

  async getPayrollById(id: number) {
    const result = await this.payrollRepo.getPayrollById(id);
    if (!result) {
      throw new Error("Payroll not found");
    }
    return {
      message: "successfully fetched payroll",
      success: true,
      data: result,
    };
  }

  async getPayrollByEmployeeId(empId: number) {
    const result = await this.payrollRepo.getPayrollByEmployeeId(empId);
    return {
      message: "successfully fetched payroll by employee",
      success: true,
      data: result,
    };
  }

  async getAllPayrolls() {
    const result = await this.payrollRepo.getAllPayrolls();
    return {
      message: "successfully fetched payrolls",
      success: true,
      data: result,
    };
  }

  async updatePayroll(
    id: number,
    data: typeof payroll.$inferInsert,
    currentUser: typeof users.$inferSelect,
  ) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can update payroll");
    }

    const existingPayroll = await this.payrollRepo.getPayrollById(id);
    if (!existingPayroll) {
      throw new Error("Payroll not found");
    }

    const result = await this.payrollRepo.updatePayroll(id, data);
    return {
      message: "successfully updated payroll",
      success: true,
      data: result,
    };
  }

  async deletePayroll(id: number, currentUser: typeof users.$inferSelect) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can delete payroll");
    }

    const existingPayroll = await this.payrollRepo.getPayrollById(id);
    if (!existingPayroll) {
      throw new Error("Payroll not found");
    }

    const result = await this.payrollRepo.deletePayroll(id);
    return {
      message: "successfully deleted payroll",
      success: true,
      data: result,
    };
  }
}

export default PayrollServices;
