import { Request, Response, NextFunction } from "express";
import { orgPayment } from "../db/schema.js";
import orgPaymentServices from "../services/orgPayment.services.js";

class OrgPaymentController {
  async createOrgPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body as typeof orgPayment.$inferInsert;
      const result = await orgPaymentServices.createOrgPayment(data);
      res.status(201).json({
        success: true,
        message: "Organization Payment created successfully",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getOrgPaymentById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = +req.params.id;
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Organization Payment ID is required",
        });
      }
      const result = await orgPaymentServices.getOrgPaymentById(id);
      if (result.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Organization Payment not found",
        });
      }
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateOrgPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const id = +req.params.id;
      const data = req.body as typeof orgPayment.$inferInsert;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Organization Payment ID is required",
        });
      }

      const result = await orgPaymentServices.updateOrgPayment(id, data);

      if (result.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Organization Payment not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Organization Payment updated successfully",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

export default new OrgPaymentController();
