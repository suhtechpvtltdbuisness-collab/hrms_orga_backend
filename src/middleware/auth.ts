import { Request, Response, NextFunction } from "express";
import { verifyToken, TokenPayload } from "../utils/jwt.js";
import { db } from "../db/connection.js";
import { users } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export const extractAccessToken = (req: Request): string | undefined => {
  if (req.cookies?.accessToken) {
    return req.cookies.accessToken;
  }

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  return undefined;
};

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = extractAccessToken(req);

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Access token is missing or invalid",
      });
      return;
    }

    try {
      const decoded = verifyToken(token);
      req.user = decoded;

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
    const user = res.locals.user;
    if (!user) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    // Role ID 0 is Super Admin, 1 is Admin
    if (user.roleId !== 0 && user.roleId !== 1) {
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

export const authorizeSuperAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = res.locals.user;
    if (!user) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    // Role ID 0 is Super Admin
    if (user.roleId !== 0) {
      res.status(403).json({
        success: false,
        message: "Access denied. Super Admin privileges required.",
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
