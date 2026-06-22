import { Router } from "express";
import PayrollController from "../controllers/payrollController.js";
import PayrollModuleController from "../controllers/payrollModuleController.js";
import { authenticate, authorizeAdmin } from "../middleware/auth.js";

const payrollRouter = Router();
const payrollController = new PayrollController();
const payrollModuleController = new PayrollModuleController();

payrollRouter.post("/salary-components", authenticate, authorizeAdmin, (req, res, next) =>
  payrollModuleController.createSalaryComponent(req, res, next),
);
payrollRouter.get("/salary-components", authenticate, (req, res, next) =>
  payrollModuleController.getSalaryComponents(req, res, next),
);
payrollRouter.put("/salary-components/:id", authenticate, authorizeAdmin, (req, res, next) =>
  payrollModuleController.updateSalaryComponent(req, res, next),
);
payrollRouter.delete("/salary-components/:id", authenticate, authorizeAdmin, (req, res, next) =>
  payrollModuleController.deleteSalaryComponent(req, res, next),
);

payrollRouter.post("/salary-structures", authenticate, authorizeAdmin, (req, res, next) =>
  payrollModuleController.createSalaryStructure(req, res, next),
);
payrollRouter.get("/salary-structures", authenticate, (req, res, next) =>
  payrollModuleController.getSalaryStructures(req, res, next),
);
payrollRouter.put("/salary-structures/:id", authenticate, authorizeAdmin, (req, res, next) =>
  payrollModuleController.updateSalaryStructure(req, res, next),
);
payrollRouter.delete("/salary-structures/:id", authenticate, authorizeAdmin, (req, res, next) =>
  payrollModuleController.deleteSalaryStructure(req, res, next),
);

payrollRouter.post("/salary-structure-assignments", authenticate, authorizeAdmin, (req, res, next) =>
  payrollModuleController.createSalaryStructureAssignment(req, res, next),
);
payrollRouter.get("/salary-structure-assignments", authenticate, (req, res, next) =>
  payrollModuleController.getSalaryStructureAssignments(req, res, next),
);
payrollRouter.put("/salary-structure-assignments/:id", authenticate, authorizeAdmin, (req, res, next) =>
  payrollModuleController.updateSalaryStructureAssignment(req, res, next),
);
payrollRouter.delete("/salary-structure-assignments/:id", authenticate, authorizeAdmin, (req, res, next) =>
  payrollModuleController.deleteSalaryStructureAssignment(req, res, next),
);

payrollRouter.post("/additional-salaries", authenticate, authorizeAdmin, (req, res, next) =>
  payrollModuleController.createAdditionalSalary(req, res, next),
);
payrollRouter.get("/additional-salaries", authenticate, (req, res, next) =>
  payrollModuleController.getAdditionalSalaries(req, res, next),
);
payrollRouter.put("/additional-salaries/:id", authenticate, authorizeAdmin, (req, res, next) =>
  payrollModuleController.updateAdditionalSalary(req, res, next),
);
payrollRouter.delete("/additional-salaries/:id", authenticate, authorizeAdmin, (req, res, next) =>
  payrollModuleController.deleteAdditionalSalary(req, res, next),
);

payrollRouter.post("/entries", authenticate, authorizeAdmin, (req, res, next) =>
  payrollModuleController.createPayrollEntry(req, res, next),
);
payrollRouter.get("/entries", authenticate, (req, res, next) =>
  payrollModuleController.getPayrollEntries(req, res, next),
);
payrollRouter.get("/entries/:id", authenticate, (req, res, next) =>
  payrollModuleController.getPayrollEntry(req, res, next),
);
payrollRouter.post("/entries/:id/finalize", authenticate, authorizeAdmin, (req, res, next) =>
  payrollModuleController.finalizePayrollEntry(req, res, next),
);

payrollRouter.post("/salary-slips", authenticate, authorizeAdmin, (req, res, next) =>
  payrollModuleController.generateSalarySlip(req, res, next),
);
payrollRouter.get("/salary-slips", authenticate, (req, res, next) =>
  payrollModuleController.getSalarySlips(req, res, next),
);
payrollRouter.post("/salary-slips/:id/finalize", authenticate, authorizeAdmin, (req, res, next) =>
  payrollModuleController.finalizeSalarySlip(req, res, next),
);
payrollRouter.post("/salary-slips/:id/sign-off", authenticate, (req, res, next) =>
  payrollModuleController.signOffSalarySlip(req, res, next),
);

payrollRouter.get("/accounting", authenticate, (req, res, next) =>
  payrollModuleController.getPayrollAccountingEntries(req, res, next),
);
payrollRouter.get("/bank-export", authenticate, (req, res, next) =>
  payrollModuleController.getBankExport(req, res, next),
);

payrollRouter.post("/", authenticate, (req, res, next) =>
  payrollController.createPayroll(req, res, next),
);
payrollRouter.get("/employee/:empId", authenticate, (req, res, next) =>
  payrollController.getPayrollByEmployeeId(req, res, next),
);
payrollRouter.get("/user/:userId", authenticate, (req, res, next) =>
  payrollController.getPayrollByUserId(req, res, next),
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
