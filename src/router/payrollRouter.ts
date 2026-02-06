import { Router } from "express";
import PayrollController from "../controllers/payrollController.js";
import { authenticate, authorizeAdmin } from "../middleware/auth.js";

const payrollRouter = Router();
const payrollController = new PayrollController();

payrollRouter.post("/", authenticate, (req, res, next) =>
  payrollController.createPayroll(req, res, next),
);
payrollRouter.get("/employee/:empId", authenticate, (req, res, next) =>
  payrollController.getPayrollByEmployeeId(req, res, next),
);
payrollRouter.get("/:id", authenticate, (req, res, next) =>
  payrollController.getPayrollById(req, res, next),
);
payrollRouter.get("/", authenticate, (req, res, next) =>
  payrollController.getAllPayrolls(req, res, next),
);
payrollRouter.put("/:id", authenticate, (req, res, next) =>
  payrollController.updatePayroll(req, res, next),
);
payrollRouter.delete("/:id", authenticate, authorizeAdmin, (req, res, next) =>
  payrollController.deletePayroll(req, res, next),
);

export default payrollRouter;
