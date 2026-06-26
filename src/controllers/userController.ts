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
      const page = req.query.page ? Number(req.query.page) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const search = req.query.search ? String(req.query.search) : undefined;
      const result = await this.userServices.getAllEmployeesByAdminId(adminId, page, limit, search);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getEmployeeDetailsByUserId(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const userId = Number(req.params.userId);
      const result = await this.userServices.getEmployeeDetailsByUserId(userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const currentUser = res.locals.user;
      const data = req.body;
      const result = await this.userServices.updateUser(id, data, currentUser);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getAllUsersForSuperAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
      const search = req.query.search as string | undefined;

      const result = await this.userServices.getAllUsersForSuperAdmin(page, limit, search);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async softDeleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const currentUser = res.locals.user;
      const result = await this.userServices.softDeleteUser(id, currentUser);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
export default UserController;
