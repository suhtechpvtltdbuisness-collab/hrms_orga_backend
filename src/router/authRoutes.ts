import { Router } from "express";
import {
  register,
  login,
  faceLogin,
  logout,
  refreshToken,
  getProfile,
  googleLogin,
  verifyEmail,
  resendVerification,
  verifyOtp,
  resendOtp,
} from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";

const authRouter = Router();

// Public routes
authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/face-login", faceLogin);
authRouter.post("/google", googleLogin);
authRouter.post("/refresh-token", refreshToken);
authRouter.get("/verify-email", verifyEmail);
authRouter.post("/resend-verification", resendVerification);
authRouter.post("/verify-otp", verifyOtp);
authRouter.post("/resend-otp", resendOtp);

authRouter.post("/logout", logout);

// Protected routes
authRouter.get("/profile", authenticate, getProfile);

export default authRouter;
