import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { db } from "../db/connection.js";
import { users, Plain } from "../db/schema.js";
import { generateTokens, verifyToken } from "../utils/jwt.js";
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
        phone: phone || null,
        gender: gender || null,
        dob: dob || null,
        bloodGroup: bloodGroup || null,
        maritalStatus: maritalStatus || null,
        address: address || null,
        aadharNo: aadharNo || null,
        pancardNo: pancardNo || null,
        active: true,
        isDeleted: false,
      })
      .returning();

    // Check if there's any plan data for this user
    const existingPlan = await db
      .select()
      .from(Plain)
      .where(and(eq(Plain.userId, newUser.id), eq(Plain.isDeleted, false)))
      .limit(1);

    // If no plan exists, create a free trial plan
    if (existingPlan.length === 0) {
      const trialExpiry = new Date();
      trialExpiry.setDate(trialExpiry.getDate() + 30); // 30 days trial

      await db.insert(Plain).values({
        userId: newUser.id,
        type: "startup",
        price: 0,
        module: "hrms",
        active: true,
        isDeleted: false,
        expired: trialExpiry.toISOString(),
        purchaseDate: new Date().toISOString(),
      });
    }

    // Generate tokens
    const tokens = generateTokens({
      userId: newUser.id,
      email: newUser.email,
      type: newUser.type,
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: userWithoutPassword,
        tokens,
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
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: userWithoutPassword,
        tokens,
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
    // In a JWT-based system, logout is typically handled client-side by removing the token
    // However, you can implement token blacklisting here if needed

    res.status(200).json({
      success: true,
      message:
        "Logout successful. Please remove the token from client storage.",
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
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
      return;
    }

    try {
      // Verify refresh token
      const decoded = verifyToken(refreshToken);

      // Generate new tokens
      const tokens = generateTokens({
        userId: decoded.userId,
        email: decoded.email,
        type: decoded.type,
      });

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

    // Get user's plan
    const [userPlan] = await db
      .select()
      .from(Plain)
      .where(and(eq(Plain.userId, user.id), eq(Plain.isDeleted, false)))
      .limit(1);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          type: user.type,
          gender: user.gender,
          dob: user.dob,
          bloodGroup: user.bloodGroup,
          maritalStatus: user.maritalStatus,
          address: user.address,
          active: user.active,
        },
        plan: userPlan || null,
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
