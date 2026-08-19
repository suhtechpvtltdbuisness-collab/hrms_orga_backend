import { Router } from "express";
import UserController from "../controllers/userController.js";
import { authenticate, authorizeAdmin, authorizeSuperAdmin } from "../middleware/auth.js";

const userRouter = Router();
const userController = new UserController();

userRouter.get("/superadmin/all", authenticate, authorizeSuperAdmin, (req, res, next) =>
  userController.getAllUsersForSuperAdmin(req, res, next),
);
userRouter.get("/superadmin/deleted", authenticate, authorizeSuperAdmin, (req, res, next) =>
  userController.getDeletedUsersForSuperAdmin(req, res, next),
);
userRouter.post("/superadmin/bulk-delete", authenticate, authorizeSuperAdmin, (req, res, next) =>
  userController.softDeleteUsersForSuperAdmin(req, res, next),
);
userRouter.delete("/superadmin/:id", authenticate, authorizeSuperAdmin, (req, res, next) =>
  userController.softDeleteUserForSuperAdmin(req, res, next),
);
userRouter.patch("/superadmin/:id/restore", authenticate, authorizeSuperAdmin, (req, res, next) =>
  userController.restoreUserForSuperAdmin(req, res, next),
);

userRouter.post("/", authenticate, authorizeAdmin, (req, res, next) =>
  userController.createUser(req, res, next),
);
userRouter.get("/employees/admin/:adminId", authenticate, (req, res, next) =>
  userController.getAllEmployeesByAdminId(req, res, next),
);
userRouter.get("/employee/user/:userId", authenticate, (req, res, next) =>
  userController.getEmployeeDetailsByUserId(req, res, next),
);
userRouter.get("/:id", authenticate, (req, res, next) =>
  userController.getUserById(req, res, next),
);
userRouter.get("/employee/:id", authenticate, (req, res, next) =>
  userController.getEmployeeById(req, res, next),
);
userRouter.put("/:id", authenticate, authorizeAdmin, (req, res, next) =>
  userController.updateUser(req, res, next),
);
userRouter.delete("/:id", authenticate, authorizeAdmin, (req, res, next) =>
  userController.softDeleteUser(req, res, next),
);

export default userRouter;
