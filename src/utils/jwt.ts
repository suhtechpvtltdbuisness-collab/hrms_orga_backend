import jwt from "jsonwebtoken";

const JWT_EXPIRES_IN = () => process.env.JWT_EXPIRES_IN || "7d";
const REFRESH_TOKEN_EXPIRES_IN = () =>
  process.env.REFRESH_TOKEN_EXPIRES_IN || "30d";

const getJwtSecret = () =>
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

export interface TokenPayload {
  userId: number;
  email: string;
  type: string;
  roleId: number;
}

export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: JWT_EXPIRES_IN(),
  } as jwt.SignOptions);
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN(),
  } as jwt.SignOptions);
};

export const verifyToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, getJwtSecret()) as TokenPayload;
  } catch {
    throw new Error("Invalid or expired token");
  }
};

export const generateTokens = (payload: TokenPayload) => {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  return {
    accessToken,
    refreshToken,
  };
};
