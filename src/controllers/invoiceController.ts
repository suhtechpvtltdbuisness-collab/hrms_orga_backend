import { Request, Response, NextFunction } from "express";
import InvoiceServices from "../services/invoiceServices.js";

class InvoiceController {
  private services: InvoiceServices;
  constructor() {
    this.services = new InvoiceServices();
  }

  // ---------- Sales ----------

  async listSales(req: Request, res: Response, _next: NextFunction) {
    try {
      const user = res.locals.user;
      const result = await this.services.listSalesInvoices(user, {
        status: req.query.status ? String(req.query.status) : undefined,
        customer: req.query.customer ? String(req.query.customer) : undefined,
        invoiceDate: req.query.invoiceDate
          ? String(req.query.invoiceDate)
          : undefined,
        invoiceNo: req.query.invoiceNo ? String(req.query.invoiceNo) : undefined,
      });
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to fetch sales invoices",
      });
    }
  }

  async getSales(req: Request, res: Response, _next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid invoice ID" });
        return;
      }
      const result = await this.services.getSalesInvoice(id, res.locals.user);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || "Sales invoice not found",
      });
    }
  }

  async createSales(req: Request, res: Response, _next: NextFunction) {
    try {
      const result = await this.services.createSalesInvoice(
        req.body,
        res.locals.user,
      );
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to create sales invoice",
      });
    }
  }

  async updateSales(req: Request, res: Response, _next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid invoice ID" });
        return;
      }
      const result = await this.services.updateSalesInvoice(
        id,
        req.body,
        res.locals.user,
      );
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to update sales invoice",
      });
    }
  }

  async deleteSales(req: Request, res: Response, _next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid invoice ID" });
        return;
      }
      const result = await this.services.deleteSalesInvoice(id, res.locals.user);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to delete sales invoice",
      });
    }
  }

  // ---------- Purchase ----------

  async listPurchase(req: Request, res: Response, _next: NextFunction) {
    try {
      const result = await this.services.listPurchaseInvoices(res.locals.user, {
        status: req.query.status ? String(req.query.status) : undefined,
        supplier: req.query.supplier ? String(req.query.supplier) : undefined,
        invoiceDate: req.query.invoiceDate
          ? String(req.query.invoiceDate)
          : undefined,
      });
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to fetch purchase invoices",
      });
    }
  }

  async getPurchase(req: Request, res: Response, _next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid invoice ID" });
        return;
      }
      const result = await this.services.getPurchaseInvoice(id, res.locals.user);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || "Purchase invoice not found",
      });
    }
  }

  async createPurchase(req: Request, res: Response, _next: NextFunction) {
    try {
      const result = await this.services.createPurchaseInvoice(
        req.body,
        res.locals.user,
      );
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to create purchase invoice",
      });
    }
  }

  async updatePurchase(req: Request, res: Response, _next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid invoice ID" });
        return;
      }
      const result = await this.services.updatePurchaseInvoice(
        id,
        req.body,
        res.locals.user,
      );
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to update purchase invoice",
      });
    }
  }

  async deletePurchase(req: Request, res: Response, _next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid invoice ID" });
        return;
      }
      const result = await this.services.deletePurchaseInvoice(
        id,
        res.locals.user,
      );
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to delete purchase invoice",
      });
    }
  }

  // ---------- Recurring ----------

  async listRecurring(req: Request, res: Response, _next: NextFunction) {
    try {
      const result = await this.services.listRecurringInvoices(res.locals.user, {
        status: req.query.status ? String(req.query.status) : undefined,
        client: req.query.client ? String(req.query.client) : undefined,
        invoiceDate: req.query.invoiceDate
          ? String(req.query.invoiceDate)
          : undefined,
        invoiceType: req.query.invoiceType
          ? String(req.query.invoiceType)
          : undefined,
      });
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to fetch recurring invoices",
      });
    }
  }

  async getRecurring(req: Request, res: Response, _next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid invoice ID" });
        return;
      }
      const result = await this.services.getRecurringInvoice(
        id,
        res.locals.user,
      );
      res.status(200).json(result);
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || "Recurring invoice not found",
      });
    }
  }

  async createRecurring(req: Request, res: Response, _next: NextFunction) {
    try {
      const result = await this.services.createRecurringInvoice(
        req.body,
        res.locals.user,
      );
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to create recurring invoice",
      });
    }
  }

  async updateRecurring(req: Request, res: Response, _next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid invoice ID" });
        return;
      }
      const result = await this.services.updateRecurringInvoice(
        id,
        req.body,
        res.locals.user,
      );
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to update recurring invoice",
      });
    }
  }

  async deleteRecurring(req: Request, res: Response, _next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid invoice ID" });
        return;
      }
      const result = await this.services.deleteRecurringInvoice(
        id,
        res.locals.user,
      );
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to delete recurring invoice",
      });
    }
  }

  // ---------- Payments ----------

  async listPayments(req: Request, res: Response, _next: NextFunction) {
    try {
      const result = await this.services.listPayments(res.locals.user, {
        status: req.query.status ? String(req.query.status) : undefined,
        customer: req.query.customer ? String(req.query.customer) : undefined,
        method: req.query.method ? String(req.query.method) : undefined,
        paymentDate: req.query.paymentDate
          ? String(req.query.paymentDate)
          : undefined,
      });
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to fetch payments",
      });
    }
  }

  async getPayment(req: Request, res: Response, _next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid payment ID" });
        return;
      }
      const result = await this.services.getPayment(id, res.locals.user);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || "Payment not found",
      });
    }
  }

  async createPayment(req: Request, res: Response, _next: NextFunction) {
    try {
      const result = await this.services.createPayment(
        req.body,
        res.locals.user,
      );
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to record payment",
      });
    }
  }

  async updatePayment(req: Request, res: Response, _next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid payment ID" });
        return;
      }
      const result = await this.services.updatePayment(
        id,
        req.body,
        res.locals.user,
      );
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to update payment",
      });
    }
  }

  async deletePayment(req: Request, res: Response, _next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid payment ID" });
        return;
      }
      const result = await this.services.deletePayment(id, res.locals.user);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to delete payment",
      });
    }
  }
}

export default InvoiceController;
