import { Request, Response, NextFunction } from "express";
import UserServices from "../services/userServices.js";
class UserController {
  private userServices: UserServices;
  constructor() {
    this.userServices = new UserServices();
  }

  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = res.locals.user;
      const data = req.body;
      const result = await this.userServices.createUser(data, currentUser);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const result = await this.userServices.getUserById(id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
  async getEmployeeById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const result = await this.userServices.getEmployeeById(id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getAllEmployeesByAdminId(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const adminId = Number(req.params.adminId);
      const result = await this.userServices.getAllEmployeesByAdminId(adminId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
export default UserController;
