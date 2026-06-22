import { NextFunction, Request, Response } from "express";
import { PayrollModuleServices } from "../services/payrollModuleServices.js";

class PayrollModuleController {
  private payrollModuleServices: PayrollModuleServices;

  constructor() {
    this.payrollModuleServices = new PayrollModuleServices();
  }

  private handleError(error: unknown, next: NextFunction) {
    next(error);
  }

  async createSalaryComponent(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.payrollModuleServices.createSalaryComponent(
        req.body,
        res.locals.user,
      );
      res.status(201).json(result);
    } catch (error) {
      this.handleError(error, next);
    }
  }

  async getSalaryComponents(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await this.payrollModuleServices.getSalaryComponents());
    } catch (error) {
      this.handleError(error, next);
    }
  }

  async updateSalaryComponent(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(
        await this.payrollModuleServices.updateSalaryComponent(
          Number(req.params.id),
          req.body,
          res.locals.user,
        ),
      );
    } catch (error) {
      this.handleError(error, next);
    }
  }

  async deleteSalaryComponent(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(
        await this.payrollModuleServices.deleteSalaryComponent(
          Number(req.params.id),
          res.locals.user,
        ),
      );
    } catch (error) {
      this.handleError(error, next);
    }
  }

  async createSalaryStructure(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.payrollModuleServices.createSalaryStructure(
        req.body,
        res.locals.user,
      );
      res.status(201).json(result);
    } catch (error) {
      this.handleError(error, next);
    }
  }

  async getSalaryStructures(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await this.payrollModuleServices.getSalaryStructures());
    } catch (error) {
      this.handleError(error, next);
    }
  }

  async updateSalaryStructure(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(
        await this.payrollModuleServices.updateSalaryStructure(
          Number(req.params.id),
          req.body,
          res.locals.user,
        ),
      );
    } catch (error) {
      this.handleError(error, next);
    }
  }

  async deleteSalaryStructure(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(
        await this.payrollModuleServices.deleteSalaryStructure(
          Number(req.params.id),
          res.locals.user,
        ),
      );
    } catch (error) {
      this.handleError(error, next);
    }
  }

  async createSalaryStructureAssignment(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result =
        await this.payrollModuleServices.createSalaryStructureAssignment(
          req.body,
          res.locals.user,
        );
      res.status(201).json(result);
    } catch (error) {
      this.handleError(error, next);
    }
  }

  async getSalaryStructureAssignments(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      res.json(await this.payrollModuleServices.getSalaryStructureAssignments());
    } catch (error) {
      this.handleError(error, next);
    }
  }

  async updateSalaryStructureAssignment(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      res.json(
        await this.payrollModuleServices.updateSalaryStructureAssignment(
          Number(req.params.id),
          req.body,
          res.locals.user,
        ),
      );
    } catch (error) {
      this.handleError(error, next);
    }
  }

  async deleteSalaryStructureAssignment(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      res.json(
        await this.payrollModuleServices.deleteSalaryStructureAssignment(
          Number(req.params.id),
          res.locals.user,
        ),
      );
    } catch (error) {
      this.handleError(error, next);
    }
  }

  async createAdditionalSalary(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.payrollModuleServices.createAdditionalSalary(
        req.body,
        res.locals.user,
      );
      res.status(201).json(result);
    } catch (error) {
      this.handleError(error, next);
    }
  }

  async getAdditionalSalaries(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await this.payrollModuleServices.getAdditionalSalaries(req.query));
    } catch (error) {
      this.handleError(error, next);
    }
  }

  async updateAdditionalSalary(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(
        await this.payrollModuleServices.updateAdditionalSalary(
          Number(req.params.id),
          req.body,
          res.locals.user,
        ),
      );
    } catch (error) {
      this.handleError(error, next);
    }
  }

  async deleteAdditionalSalary(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(
        await this.payrollModuleServices.deleteAdditionalSalary(
          Number(req.params.id),
          res.locals.user,
        ),
      );
    } catch (error) {
      this.handleError(error, next);
    }
  }

  async createPayrollEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.payrollModuleServices.createPayrollEntry(
        req.body,
        res.locals.user,
      );
      res.status(201).json(result);
    } catch (error) {
      this.handleError(error, next);
    }
  }

  async getPayrollEntries(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await this.payrollModuleServices.getPayrollEntries(req.query));
    } catch (error) {
      this.handleError(error, next);
    }
  }

  async getPayrollEntry(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(
        await this.payrollModuleServices.getPayrollEntry(Number(req.params.id)),
      );
    } catch (error) {
      this.handleError(error, next);
    }
  }

  async finalizePayrollEntry(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(
        await this.payrollModuleServices.finalizePayrollEntry(
          Number(req.params.id),
          res.locals.user,
        ),
      );
    } catch (error) {
      this.handleError(error, next);
    }
  }

  async generateSalarySlip(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.payrollModuleServices.generateSalarySlip(
        req.body,
        res.locals.user,
      );
      res.status(201).json(result);
    } catch (error) {
      this.handleError(error, next);
    }
  }

  async getSalarySlips(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await this.payrollModuleServices.getSalarySlips());
    } catch (error) {
      this.handleError(error, next);
    }
  }

  async finalizeSalarySlip(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(
        await this.payrollModuleServices.finalizeSalarySlip(
          Number(req.params.id),
          res.locals.user,
        ),
      );
    } catch (error) {
      this.handleError(error, next);
    }
  }

  async signOffSalarySlip(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(
        await this.payrollModuleServices.signOffSalarySlip(
          Number(req.params.id),
          res.locals.user,
        ),
      );
    } catch (error) {
      this.handleError(error, next);
    }
  }

  async getPayrollAccountingEntries(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      res.json(await this.payrollModuleServices.getPayrollAccountingEntries());
    } catch (error) {
      this.handleError(error, next);
    }
  }

  async getBankExport(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await this.payrollModuleServices.getBankExport(req.query));
    } catch (error) {
      this.handleError(error, next);
    }
  }
}

export default PayrollModuleController;
