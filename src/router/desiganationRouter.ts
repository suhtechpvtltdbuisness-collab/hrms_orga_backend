import { Router } from "express";
import DesignationController from "../controllers/desiganationController.js";
import { authenticate, authorizeAdmin } from "../middleware/auth.js";

const desiganationRouter = Router();
const designationController = new DesignationController();

// 1. Create a Designation
desiganationRouter.post("/", authenticate, authorizeAdmin, (req, res, next) =>
  designationController.createDesignation(req, res, next),
);

// 2. Get Dropdown List
desiganationRouter.get("/dropdown", authenticate, (req, res, next) =>
  designationController.getDesignationsDropdown(req, res, next),
);

// 3. Get Designation Stats
desiganationRouter.get("/stats", authenticate, authorizeAdmin, (req, res, next) =>
  designationController.getDesignationStats(req, res, next),
);

// 4. Get Designation by ID
desiganationRouter.get("/:id", authenticate, (req, res, next) =>
  designationController.getDesignationById(req, res, next),
);

// 5. Get All Designations (with pagination, filtering, search, sorting)
desiganationRouter.get("/", authenticate, (req, res, next) =>
  designationController.getAllDesignations(req, res, next),
);

// 6. Update Designation
desiganationRouter.put("/:id", authenticate, authorizeAdmin, (req, res, next) =>
  designationController.updateDesignation(req, res, next),
);

// 7. Update Status
desiganationRouter.patch("/:id/status", authenticate, authorizeAdmin, (req, res, next) =>
  designationController.updateStatus(req, res, next),
);

// 8. Delete Designation
desiganationRouter.delete("/:id", authenticate, authorizeAdmin, (req, res, next) =>
  designationController.deleteDesignation(req, res, next),
);

export default desiganationRouter;
