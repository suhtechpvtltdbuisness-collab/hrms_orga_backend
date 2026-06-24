import { Request, Response } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { db } from "../db/connection.js";
import { users } from "../db/schema.js";
import { subscriptionService } from "../services/subscriptionServices.js";
import { generateTokens, verifyToken } from "../utils/jwt.js";
import { setAuthCookies, clearAuthCookies } from "../utils/authCookies.js";
import { eq, and } from "drizzle-orm";
import { emailService } from "../services/emailService.js";

// Cooldown map for rate-limiting resend verification
const resendCooldowns = new Map<string, number>();
const COOLDOWN_MS = 60 * 1000; // 60 seconds cooldown

// Register new user
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      email,
      password,
      phone,
      gender,
      dob,
      bloodGroup,
      maritalStatus,
      address,
      aadharNo,
      pancardNo,
    } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      res.status(400).json({
        success: false,
        message: "Name, email, and password are required",
      });
      return;
    }

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), eq(users.isDeleted, false)))
      .limit(1);

    if (existingUser.length > 0) {
      res.status(409).json({
        success: false,
        message: "User with this email already exists",
      });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate secure 6-digit OTP code and expiration (15 minutes)
    const verificationOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpires = new Date(Date.now() + 15 * 60 * 1000);

    // Create user with type admin
    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email,
        password: hashedPassword,
        type: "admin",
        isAdmin: true,
        roleId: 1,
        phone: phone || null,
        gender: gender || null,
        dob: dob || null,
        bloodGroup: bloodGroup || null,
        maritalStatus: maritalStatus !== undefined ? maritalStatus : false,
        address: address || null,
        aadharNo: aadharNo || null,
        pancardNo: pancardNo || null,
        active: true,
        isDeleted: false,
        isEmailVerified: false, // Default is false, user must verify
        emailVerificationToken: verificationOtp,
        emailVerificationExpires: verificationExpires,
      })
      .returning();

    // Send verification email through Nodemailer SMTP
    await emailService.sendOtpEmail(newUser.email, newUser.name, verificationOtp);

    res.status(201).json({
      success: true,
      message: "Verification OTP has been sent. Please check your inbox.",
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Login user
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
      return;
    }

    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), eq(users.isDeleted, false)))
      .limit(1);

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    // Check if user is active
    if (!user.active) {
      res.status(403).json({
        success: false,
        message: "Account is inactive. Please contact administrator.",
      });
      return;
    }

    // Block login if email is not verified (only for admin users)
    if (!user.isEmailVerified && user.type === "admin") {
      res.status(403).json({
        success: false,
        message: "Please verify your email before logging in.",
      });
      return;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    // Generate tokens
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      type: user.type,
      roleId: user.roleId,
    });

    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    const subscription = await subscriptionService.getSubscriptionSummary(
      user.id,
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: userWithoutPassword,
        tokens,
        subscription,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Logout user
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    clearAuthCookies(res);

    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Logout failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Refresh access token
export const refreshToken = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const refreshTokenValue =
      req.cookies?.refreshToken || req.body.refreshToken;

    if (!refreshTokenValue) {
      res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
      return;
    }

    try {
      const decoded = verifyToken(refreshTokenValue);

      const tokens = generateTokens({
        userId: decoded.userId,
        email: decoded.email,
        type: decoded.type,
        roleId: decoded.roleId,
      });

      setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

      res.status(200).json({
        success: true,
        message: "Token refreshed successfully",
        data: {
          tokens,
        },
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
      });
      return;
    }
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(500).json({
      success: false,
      message: "Token refresh failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Get current user profile
export const getProfile = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, req.user.userId), eq(users.isDeleted, false)))
      .limit(1);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    const subscription = await subscriptionService.getSubscriptionSummary(
      user.id,
    );

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          type: user.type,
          roleId: user.roleId,
          gender: user.gender,
          dob: user.dob,
          bloodGroup: user.bloodGroup,
          maritalStatus: user.maritalStatus,
          address: user.address,
          active: user.active,
          profilePic: user.profilePic,
          isEmailVerified: user.isEmailVerified,
        },
        subscription,
        plan:
          user.type === "admin" && "plan" in subscription
            ? subscription.plan
            : null,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get profile",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Google Login
export const googleLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({
        success: false,
        message: "Google OAuth token is required",
      });
      return;
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.error("GOOGLE_CLIENT_ID is not configured on the backend");
      res.status(500).json({
        success: false,
        message: "Google login is currently unavailable",
      });
      return;
    }

    const client = new OAuth2Client(clientId);

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: clientId,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.name) {
      res.status(400).json({
        success: false,
        message: "Invalid token payload received from Google",
      });
      return;
    }

    const email = payload.email;
    const name = payload.name;
    const picture = payload.picture;

    // Check if user exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), eq(users.isDeleted, false)))
      .limit(1);

    let user = existingUser;

    if (user) {
      // User exists
      if (!user.active) {
        res.status(403).json({
          success: false,
          message: "Account is inactive. Please contact administrator.",
        });
        return;
      }
      
      // Update profile picture if it was empty
      if (!user.profilePic && picture) {
        const [updatedUser] = await db
          .update(users)
          .set({ profilePic: picture })
          .where(eq(users.id, user.id))
          .returning();
        user = updatedUser;
      }
    } else {
      // Create user if not exists
      const randomPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      const [newUser] = await db
        .insert(users)
        .values({
          name,
          email,
          password: hashedPassword,
          type: "admin",
          isAdmin: true,
          roleId: 1,
          maritalStatus: false,
          active: true,
          isDeleted: false,
          profilePic: picture || null,
          isEmailVerified: true, // Verified by Google OAuth
        })
        .returning();
      user = newUser;
    }

    // Generate JWT
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      type: user.type,
      roleId: user.roleId,
    });

    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    const subscription = await subscriptionService.getSubscriptionSummary(
      user.id,
    );

    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      message: existingUser ? "Login successful" : "Account created and login successful",
      data: {
        user: userWithoutPassword,
        tokens,
        subscription,
      },
    });
  } catch (error) {
    console.error("Google login error:", error);
    res.status(500).json({
      success: false,
      message: "Google login failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Verify Email
export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      res.status(400).json({
        success: false,
        message: "Verification token is required",
      });
      return;
    }

    // Find user by token
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.emailVerificationToken, token), eq(users.isDeleted, false)))
      .limit(1);

    if (!user) {
      res.status(400).json({
        success: false,
        message: "Invalid or expired verification token",
      });
      return;
    }

    // Check expiration
    if (user.emailVerificationExpires && new Date() > user.emailVerificationExpires) {
      res.status(400).json({
        success: false,
        message: "Verification link has expired. Please request a new one.",
      });
      return;
    }

    // Mark user verified and remove token details
    const [updatedUser] = await db
      .update(users)
      .set({
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      })
      .where(eq(users.id, user.id))
      .returning();

    // Trigger welcome email asynchronously
    emailService.sendWelcomeEmail(updatedUser.email, updatedUser.name).catch((err) => {
      console.error("Failed to send welcome email:", err);
    });

    res.status(200).json({
      success: true,
      message: "Email verified successfully. You can now login.",
    });
  } catch (error) {
    console.error("Email verification error:", error);
    // Never expose internal error messages to client
    res.status(500).json({
      success: false,
      message: "An internal server error occurred. Please try again later.",
    });
  }
};

// Resend Verification Email
export const resendVerification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      res.status(400).json({
        success: false,
        message: "Email address is required",
      });
      return;
    }

    // Rate-limiting check
    const lastRequest = resendCooldowns.get(email);
    if (lastRequest && Date.now() - lastRequest < COOLDOWN_MS) {
      const waitSec = Math.ceil((COOLDOWN_MS - (Date.now() - lastRequest)) / 1000);
      res.status(429).json({
        success: false,
        message: `Please wait ${waitSec} seconds before requesting another verification email.`,
      });
      return;
    }

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), eq(users.isDeleted, false)))
      .limit(1);

    if (!user) {
      // Don't leak details for user enumeration
      res.status(200).json({
        success: true,
        message: "Verification email has been sent.",
      });
      return;
    }

    if (user.isEmailVerified) {
      res.status(400).json({
        success: false,
        message: "Email is already verified. Please login.",
      });
      return;
    }

    // Generate new OTP and expiration (15 minutes)
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const newExpires = new Date(Date.now() + 15 * 60 * 1000);

    // Save OTP and invalidate previous token
    await db
      .update(users)
      .set({
        emailVerificationToken: newOtp,
        emailVerificationExpires: newExpires,
      })
      .where(eq(users.id, user.id));

    // Update cooldown map
    resendCooldowns.set(email, Date.now());

    // Send new OTP email
    await emailService.sendOtpEmail(user.email, user.name, newOtp);

    res.status(200).json({
      success: true,
      message: "Verification OTP has been sent.",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({
      success: false,
      message: "An internal server error occurred. Please try again later.",
    });
  }
};

// Verify OTP
export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
      return;
    }

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), eq(users.isDeleted, false)))
      .limit(1);

    if (!user) {
      res.status(400).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    if (user.isEmailVerified) {
      res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
      return;
    }

    if (!user.emailVerificationToken || user.emailVerificationToken !== otp) {
      res.status(400).json({
        success: false,
        message: "Invalid OTP code",
      });
      return;
    }

    if (user.emailVerificationExpires && new Date() > user.emailVerificationExpires) {
      res.status(400).json({
        success: false,
        message: "OTP code has expired. Please request a new one.",
      });
      return;
    }

    // Verify user
    const [updatedUser] = await db
      .update(users)
      .set({
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      })
      .where(eq(users.id, user.id))
      .returning();

    // Trigger welcome email asynchronously
    emailService.sendWelcomeEmail(updatedUser.email, updatedUser.name).catch((err) => {
      console.error("Failed to send welcome email:", err);
    });

    // Generate tokens to log them in directly
    const tokens = generateTokens({
      userId: updatedUser.id,
      email: updatedUser.email,
      type: updatedUser.type,
      roleId: updatedUser.roleId,
    });

    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    const subscription = await subscriptionService.getSubscriptionSummary(
      updatedUser.id,
    );

    const { password: _, ...userWithoutPassword } = updatedUser;

    res.status(200).json({
      success: true,
      message: "Email verified and logged in successfully",
      data: {
        user: userWithoutPassword,
        tokens,
        subscription,
      },
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({
      success: false,
      message: "An internal server error occurred",
    });
  }
};

// Resend OTP Code
export const resendOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      res.status(400).json({
        success: false,
        message: "Email address is required",
      });
      return;
    }

    // Rate-limiting check
    const lastRequest = resendCooldowns.get(email);
    if (lastRequest && Date.now() - lastRequest < COOLDOWN_MS) {
      const waitSec = Math.ceil((COOLDOWN_MS - (Date.now() - lastRequest)) / 1000);
      res.status(429).json({
        success: false,
        message: `Please wait ${waitSec} seconds before requesting another code.`,
      });
      return;
    }

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), eq(users.isDeleted, false)))
      .limit(1);

    if (!user) {
      res.status(200).json({
        success: true,
        message: "Verification code has been sent.",
      });
      return;
    }

    if (user.isEmailVerified) {
      res.status(400).json({
        success: false,
        message: "Email is already verified. Please login.",
      });
      return;
    }

    // Generate new OTP and expiration (15 minutes)
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const newExpires = new Date(Date.now() + 15 * 60 * 1000);

    await db
      .update(users)
      .set({
        emailVerificationToken: newOtp,
        emailVerificationExpires: newExpires,
      })
      .where(eq(users.id, user.id));

    // Update cooldown map
    resendCooldowns.set(email, Date.now());

    // Send new OTP email
    await emailService.sendOtpEmail(user.email, user.name, newOtp);

    res.status(200).json({
      success: true,
      message: "Verification code has been sent.",
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({
      success: false,
      message: "An internal server error occurred",
    });
  }
};

