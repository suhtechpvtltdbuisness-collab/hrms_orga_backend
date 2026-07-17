import SalesController from "../controllers/salesController.js";
import { Router } from "express";
import { authenticate } from "../middleware/auth.js";

const salesRouter = Router();
const salesController = new SalesController();

// 1. Workspace overview (metrics, trends, activities, follow-ups, all rows)
salesRouter.get("/workspace", authenticate, (req, res, next) =>
  salesController.getWorkspace(req, res, next),
);

// 2. Records: leads, clients, opportunities, deals
salesRouter.post("/records", authenticate, (req, res, next) =>
  salesController.createRecord(req, res, next),
);
salesRouter.get("/records", authenticate, (req, res, next) =>
  salesController.getRecords(req, res, next),
);
salesRouter.get("/records/:id", authenticate, (req, res, next) =>
  salesController.getRecordById(req, res, next),
);
salesRouter.put("/records/:id", authenticate, (req, res, next) =>
  salesController.updateRecord(req, res, next),
);
salesRouter.post("/leads/:id/convert", authenticate, (req, res, next) =>
  salesController.convertLead(req, res, next),
);
salesRouter.post("/opportunities/:id/activate-client", authenticate, (req, res, next) =>
  salesController.activateClient(req, res, next),
);
salesRouter.post("/records/check-duplicates", authenticate, (req, res, next) =>
  salesController.checkDuplicates(req, res, next),
);
salesRouter.delete("/records/:id", authenticate, (req, res, next) =>
  salesController.deleteRecord(req, res, next),
);

// 3. Sales AI Co-Pilot (grounded in this organization's sales data)
salesRouter.post("/copilot", authenticate, (req, res, next) =>
  salesController.askCopilot(req, res, next),
);

// 4. Knowledge Hub
salesRouter.post("/knowledge", authenticate, (req, res, next) =>
  salesController.createKnowledge(req, res, next),
);
salesRouter.get("/knowledge", authenticate, (req, res, next) =>
  salesController.getKnowledge(req, res, next),
);

// 4. Products & Services
salesRouter.post("/products", authenticate, (req, res, next) =>
  salesController.createProduct(req, res, next),
);
salesRouter.get("/products", authenticate, (req, res, next) =>
  salesController.getProducts(req, res, next),
);

// 5. Documents: proposals, quotations, contracts, case studies, battlecards, objection playbooks
salesRouter.post("/documents", authenticate, (req, res, next) =>
  salesController.createDocument(req, res, next),
);
salesRouter.get("/documents", authenticate, (req, res, next) =>
  salesController.getDocuments(req, res, next),
);

export default salesRouter;
