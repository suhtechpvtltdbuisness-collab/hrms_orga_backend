import { Router } from "express";
import {
  register,
  login,
  logout,
  refreshToken,
  getProfile,
} from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";

const authRouter = Router();

// Public routes
authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/refresh-token", refreshToken);

// Protected routes
authRouter.post("/logout", authenticate, logout);
authRouter.get("/profile", authenticate, getProfile);

export default authRouter;
