import { Request, Response, NextFunction } from "express";
import DesignationServices from "../services/desiganationServices.js";
class DesignationController {
  private designationServices: DesignationServices;
  constructor() {
    this.designationServices = new DesignationServices();
  }

  async createDesignation(req: Request, res: Response, next: NextFunction) {
    try {
      const user = res.locals.user;
      const data = req.body;
      const result = await this.designationServices.createDesignation(
        data,
        user,
      );
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getDesignationById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const result = await this.designationServices.getDesignationById(id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getAllDesignations(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.designationServices.getAllDesignations();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateDesignation(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const data = req.body;
      const user = res.locals.user;
      const result = await this.designationServices.updateDesignation(
        id,
        data,
        user,
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
export default DesignationController;
