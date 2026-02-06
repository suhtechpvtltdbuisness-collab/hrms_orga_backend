import { Request, Response, NextFunction } from "express";
import PayrollServices from "../services/payrollServices.js";

class PayrollController {
  private payrollServices: PayrollServices;
  constructor() {
    this.payrollServices = new PayrollServices();
  }

  async createPayroll(req: Request, res: Response, next: NextFunction) {
    try {
      const user = res.locals.user;
      const data = req.body;

      // Validate required fields
      if (!data.empId || !data.ctc || !data.monthlyGross || !data.monthlyPay) {
        res.status(400).json({
          success: false,
          message:
            "Employee ID, CTC, monthly gross, and monthly pay are required",
        });
        return;
      }

      const result = await this.payrollServices.createPayroll(data, user);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getPayrollById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const result = await this.payrollServices.getPayrollById(id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getPayrollByEmployeeId(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const empId = Number(req.params.empId);
      const result = await this.payrollServices.getPayrollByEmployeeId(empId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getAllPayrolls(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.payrollServices.getAllPayrolls();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updatePayroll(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const data = req.body;
      const user = res.locals.user;
      const result = await this.payrollServices.updatePayroll(id, data, user);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async deletePayroll(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const user = res.locals.user;
      const result = await this.payrollServices.deletePayroll(id, user);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default PayrollController;
