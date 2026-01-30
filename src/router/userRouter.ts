import { Router } from "express";
import UserController from "../controllers/userController.js";
const userRouter = Router();
const userController = new UserController();

userRouter.post("/", (req, res, next) =>
  userController.createUser(req, res, next),
);
userRouter.get("/:id", (req, res, next) =>
  userController.getUserById(req, res, next),
);
userRouter.get("/employee/:id", (req, res, next) =>
  userController.getEmployeeById(req, res, next),
);

export default userRouter;
