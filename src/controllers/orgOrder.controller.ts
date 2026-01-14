import { orgOrder } from "../db/schema.js";
import { db } from "../db/connection.js";
import { eq, and } from "drizzle-orm";
import orgOrderServices from "../services/orgOrder.services.js";
import { Request, Response, NextFunction } from "express";

class OrgOrderRepo {
  async createOrgOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body as typeof orgOrder.$inferInsert;
      const result = await orgOrderServices.createOrgOrder(data);
      res.status(201).json({
        success: true,
        message: "Organization Order created successfully",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
  async getOrgOrderById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = +req.params.id;
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Organization Order ID is required",
        });
      }
      const result = await orgOrderServices.getOrgOrderById(id);
      if (result.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Data not found",
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
  async updateOrgOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const id = +req.params.id;
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Organization Order ID is required",
        });
      }
      const data = req.body as typeof orgOrder.$inferInsert;
      const result = await orgOrderServices.updateOrgOrder(id, data);
      res.status(200).json({
        success: true,
        message: "Organization Order updated successfully",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}
export default new OrgOrderRepo();
