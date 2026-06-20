import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { db } from "../db/connection.js";
import { users } from "../db/schema.js";
import { subscriptionService } from "../services/subscriptionServices.js";
import { generateTokens, verifyToken } from "../utils/jwt.js";
import { setAuthCookies, clearAuthCookies } from "../utils/authCookies.js";
import { eq, and } from "drizzle-orm";

// Register new user (admin only)
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
      })
      .returning();

    // Generate tokens
    const tokens = generateTokens({
      userId: newUser.id,
      email: newUser.email,
      type: newUser.type,
      roleId: newUser.roleId,
    });

    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    const subscription = await subscriptionService.getSubscriptionSummary(
      newUser.id,
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: userWithoutPassword,
        tokens,
        subscription,
      },
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

// Logout user (client-side token removal, but included for completeness)
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
