import { NextFunction, Request, Response } from "express";
import LeaveManagementServices from "../services/leaveManagementServices.js";

class LeaveManagementController {
  private services: LeaveManagementServices;

  constructor() {
    this.services = new LeaveManagementServices();
  }

  private handleError(res: Response, error: any, fallbackMessage: string) {
    console.error("[leaveManagement]", error);
    res.status(error.statusCode ?? 400).json({
      success: false,
      message: error.message || fallbackMessage,
      details: error.cause?.message || error.cause || null,
    });
  }

  async getOptions(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.services.getOptions(res.locals.user);
      res.status(200).json(result);
    } catch (error) {
      this.handleError(res, error, "Failed to fetch leave management options");
    }
  }

  async getHolidays(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.services.getHolidays(
        {
          search: req.query.search ? String(req.query.search) : undefined,
          type: req.query.type ? String(req.query.type) : undefined,
          year: req.query.year ? Number(req.query.year) : undefined,
        },
        res.locals.user,
      );
      res.status(200).json(result);
    } catch (error) {
      this.handleError(res, error, "Failed to fetch holidays");
    }
  }

  async createHoliday(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.services.createHoliday(req.body, res.locals.user);
      res.status(201).json(result);
    } catch (error) {
      this.handleError(res, error, "Failed to create holiday");
    }
  }

  async updateHoliday(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.services.updateHoliday(
        Number(req.params.id),
        req.body,
        res.locals.user,
      );
      res.status(200).json(result);
    } catch (error) {
      this.handleError(res, error, "Failed to update holiday");
    }
  }

  async deleteHoliday(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.services.deleteHoliday(
        Number(req.params.id),
        res.locals.user,
      );
      res.status(200).json(result);
    } catch (error) {
      this.handleError(res, error, "Failed to delete holiday");
    }
  }

  async getPeriods(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.services.getPeriods(res.locals.user);
      res.status(200).json(result);
    } catch (error) {
      this.handleError(res, error, "Failed to fetch leave periods");
    }
  }

  async createPeriod(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.services.createPeriod(req.body, res.locals.user);
      res.status(201).json(result);
    } catch (error) {
      this.handleError(res, error, "Failed to create leave period");
    }
  }

  async updatePeriod(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.services.updatePeriod(
        Number(req.params.id),
        req.body,
        res.locals.user,
      );
      res.status(200).json(result);
    } catch (error) {
      this.handleError(res, error, "Failed to update leave period");
    }
  }

  async deletePeriod(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.services.deletePeriod(
        Number(req.params.id),
        res.locals.user,
      );
      res.status(200).json(result);
    } catch (error) {
      this.handleError(res, error, "Failed to delete leave period");
    }
  }

  async getBlocks(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.services.getBlocks(
        { search: req.query.search ? String(req.query.search) : undefined },
        res.locals.user,
      );
      res.status(200).json(result);
    } catch (error) {
      this.handleError(res, error, "Failed to fetch leave blocks");
    }
  }

  async createBlock(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.services.createBlock(req.body, res.locals.user);
      res.status(201).json(result);
    } catch (error) {
      this.handleError(res, error, "Failed to create leave block");
    }
  }

  async updateBlock(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.services.updateBlock(
        Number(req.params.id),
        req.body,
        res.locals.user,
      );
      res.status(200).json(result);
    } catch (error) {
      this.handleError(res, error, "Failed to update leave block");
    }
  }

  async deleteBlock(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.services.deleteBlock(
        Number(req.params.id),
        res.locals.user,
      );
      res.status(200).json(result);
    } catch (error) {
      this.handleError(res, error, "Failed to delete leave block");
    }
  }

  async getLeaveTypes(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.services.getLeaveTypes(
        { search: req.query.search ? String(req.query.search) : undefined },
        res.locals.user,
      );
      res.status(200).json(result);
    } catch (error) {
      this.handleError(res, error, "Failed to fetch leave types");
    }
  }

  async createLeaveType(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.services.createLeaveType(req.body, res.locals.user);
      res.status(201).json(result);
    } catch (error) {
      this.handleError(res, error, "Failed to create leave type");
    }
  }

  async updateLeaveType(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.services.updateLeaveType(
        Number(req.params.id),
        req.body,
        res.locals.user,
      );
      res.status(200).json(result);
    } catch (error) {
      this.handleError(res, error, "Failed to update leave type");
    }
  }

  async deleteLeaveType(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.services.deleteLeaveType(
        Number(req.params.id),
        res.locals.user,
      );
      res.status(200).json(result);
    } catch (error) {
      this.handleError(res, error, "Failed to delete leave type");
    }
  }

  async getPolicies(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.services.getPolicies(
        { search: req.query.search ? String(req.query.search) : undefined },
        res.locals.user,
      );
      res.status(200).json(result);
    } catch (error) {
      this.handleError(res, error, "Failed to fetch leave policies");
    }
  }

  async createPolicy(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.services.createPolicy(req.body, res.locals.user);
      res.status(201).json(result);
    } catch (error) {
      this.handleError(res, error, "Failed to create leave policy");
    }
  }

  async updatePolicy(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.services.updatePolicy(
        Number(req.params.id),
        req.body,
        res.locals.user,
      );
      res.status(200).json(result);
    } catch (error) {
      this.handleError(res, error, "Failed to update leave policy");
    }
  }

  async deletePolicy(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.services.deletePolicy(
        Number(req.params.id),
        res.locals.user,
      );
      res.status(200).json(result);
    } catch (error) {
      this.handleError(res, error, "Failed to delete leave policy");
    }
  }

  async getAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.services.getAssignments(
        {
          search: req.query.search ? String(req.query.search) : undefined,
          departmentId: req.query.departmentId
            ? Number(req.query.departmentId)
            : undefined,
        },
        res.locals.user,
      );
      res.status(200).json(result);
    } catch (error) {
      this.handleError(res, error, "Failed to fetch leave assignments");
    }
  }

  async createAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.services.createAssignment(req.body, res.locals.user);
      res.status(201).json(result);
    } catch (error) {
      this.handleError(res, error, "Failed to create leave assignment");
    }
  }

  async updateAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.services.updateAssignment(
        Number(req.params.id),
        req.body,
        res.locals.user,
      );
      res.status(200).json(result);
    } catch (error) {
      this.handleError(res, error, "Failed to update leave assignment");
    }
  }

  async deleteAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.services.deleteAssignment(
        Number(req.params.id),
        res.locals.user,
      );
      res.status(200).json(result);
    } catch (error) {
      this.handleError(res, error, "Failed to delete leave assignment");
    }
  }

  async getCompOffRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.services.getCompOffRequests(
        {
          status: req.query.status ? String(req.query.status) : undefined,
          search: req.query.search ? String(req.query.search) : undefined,
        },
        res.locals.user,
      );
      res.status(200).json(result);
    } catch (error) {
      this.handleError(res, error, "Failed to fetch compensatory leave requests");
    }
  }

  async createCompOffRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.services.createCompOffRequest(
        req.body,
        res.locals.user,
      );
      res.status(201).json(result);
    } catch (error) {
      this.handleError(res, error, "Failed to create compensatory leave request");
    }
  }

  async approveCompOffRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.services.approveCompOffRequest(
        Number(req.params.id),
        res.locals.user,
      );
      res.status(200).json(result);
    } catch (error) {
      this.handleError(res, error, "Failed to approve compensatory leave request");
    }
  }

  async rejectCompOffRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.services.rejectCompOffRequest(
        Number(req.params.id),
        req.body,
        res.locals.user,
      );
      res.status(200).json(result);
    } catch (error) {
      this.handleError(res, error, "Failed to reject compensatory leave request");
    }
  }

  async getEncashmentRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.services.getEncashmentRequests(
        {
          status: req.query.status ? String(req.query.status) : undefined,
          search: req.query.search ? String(req.query.search) : undefined,
          empId: req.query.empId ? Number(req.query.empId) : undefined,
        },
        res.locals.user,
      );
      res.status(200).json(result);
    } catch (error) {
      this.handleError(res, error, "Failed to fetch leave encashment requests");
    }
  }

  async getEncashmentEligibility(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.services.getEncashmentEligibility(res.locals.user);
      res.status(200).json(result);
    } catch (error) {
      this.handleError(res, error, "Failed to fetch leave encashment eligibility");
    }
  }

  async createEncashAllRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.services.createEncashAllRequest(res.locals.user);
      res.status(201).json(result);
    } catch (error) {
      this.handleError(res, error, "Failed to encash all available leave");
    }
  }

  async createEncashmentRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.services.createEncashmentRequest(
        req.body,
        res.locals.user,
      );
      res.status(201).json(result);
    } catch (error) {
      this.handleError(res, error, "Failed to create leave encashment request");
    }
  }

  async approveEncashmentRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.services.approveEncashmentRequest(
        Number(req.params.id),
        res.locals.user,
      );
      res.status(200).json(result);
    } catch (error) {
      this.handleError(res, error, "Failed to approve leave encashment request");
    }
  }

  async rejectEncashmentRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.services.rejectEncashmentRequest(
        Number(req.params.id),
        req.body,
        res.locals.user,
      );
      res.status(200).json(result);
    } catch (error) {
      this.handleError(res, error, "Failed to reject leave encashment request");
    }
  }
}

export default LeaveManagementController;
