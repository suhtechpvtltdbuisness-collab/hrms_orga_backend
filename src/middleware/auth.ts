import { Request, Response, NextFunction } from "express";
import { verifyToken, TokenPayload } from "../utils/jwt.js";
import { db } from "../db/connection.js";
import { users } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Access token is missing or invalid",
      });
      return;
    }

    const token = authHeader.substring(7);

    try {
      const decoded = verifyToken(token);
      req.user = decoded;

      // Fetch full user data from database
      const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, decoded.userId), eq(users.isDeleted, false)))
        .limit(1);

      if (!user || !user.active) {
        res.status(401).json({
          success: false,
          message: "User not found or inactive",
        });
        return;
      }

      res.locals.user = user;
      next();
    } catch (error) {
      res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
      return;
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Authentication error",
    });
    return;
  }
};

export const authorizeAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    if (req.user.type !== "admin") {
      res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Authorization error",
    });
    return;
  }
};
