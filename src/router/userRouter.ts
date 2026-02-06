import { Router } from "express";
import UserController from "../controllers/userController.js";
import { authenticate, authorizeAdmin } from "../middleware/auth.js";

const userRouter = Router();
const userController = new UserController();

userRouter.post("/", authenticate, authorizeAdmin, (req, res, next) =>
  userController.createUser(req, res, next),
);
userRouter.get("/employees/admin/:adminId", authenticate, (req, res, next) =>
  userController.getAllEmployeesByAdminId(req, res, next),
);
userRouter.get("/:id", authenticate, (req, res, next) =>
  userController.getUserById(req, res, next),
);
userRouter.get("/employee/:id", authenticate, (req, res, next) =>
  userController.getEmployeeById(req, res, next),
);

export default userRouter;
