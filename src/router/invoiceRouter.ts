import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import InvoiceController from "../controllers/invoiceController.js";

const invoiceRouter = Router();
const controller = new InvoiceController();

invoiceRouter.use(authenticate);

// Sales invoices
invoiceRouter.get("/sales", (req, res, next) =>
  controller.listSales(req, res, next),
);
invoiceRouter.get("/sales/:id", (req, res, next) =>
  controller.getSales(req, res, next),
);
invoiceRouter.post("/sales", (req, res, next) =>
  controller.createSales(req, res, next),
);
invoiceRouter.put("/sales/:id", (req, res, next) =>
  controller.updateSales(req, res, next),
);
invoiceRouter.delete("/sales/:id", (req, res, next) =>
  controller.deleteSales(req, res, next),
);

// Purchase invoices
invoiceRouter.get("/purchase", (req, res, next) =>
  controller.listPurchase(req, res, next),
);
invoiceRouter.get("/purchase/:id", (req, res, next) =>
  controller.getPurchase(req, res, next),
);
invoiceRouter.post("/purchase", (req, res, next) =>
  controller.createPurchase(req, res, next),
);
invoiceRouter.put("/purchase/:id", (req, res, next) =>
  controller.updatePurchase(req, res, next),
);
invoiceRouter.delete("/purchase/:id", (req, res, next) =>
  controller.deletePurchase(req, res, next),
);

// Recurring invoices
invoiceRouter.get("/recurring", (req, res, next) =>
  controller.listRecurring(req, res, next),
);
invoiceRouter.get("/recurring/:id", (req, res, next) =>
  controller.getRecurring(req, res, next),
);
invoiceRouter.post("/recurring", (req, res, next) =>
  controller.createRecurring(req, res, next),
);
invoiceRouter.put("/recurring/:id", (req, res, next) =>
  controller.updateRecurring(req, res, next),
);
invoiceRouter.delete("/recurring/:id", (req, res, next) =>
  controller.deleteRecurring(req, res, next),
);

// Invoice payment allocation
invoiceRouter.get("/payments", (req, res, next) =>
  controller.listPayments(req, res, next),
);
invoiceRouter.get("/payments/:id", (req, res, next) =>
  controller.getPayment(req, res, next),
);
invoiceRouter.post("/payments", (req, res, next) =>
  controller.createPayment(req, res, next),
);
invoiceRouter.put("/payments/:id", (req, res, next) =>
  controller.updatePayment(req, res, next),
);
invoiceRouter.delete("/payments/:id", (req, res, next) =>
  controller.deletePayment(req, res, next),
);

export default invoiceRouter;
