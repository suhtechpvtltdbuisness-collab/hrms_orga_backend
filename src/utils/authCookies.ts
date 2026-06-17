import { CookieOptions, Response } from "express";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const getAuthCookieOptions = (): CookieOptions => {
  const crossSite =
    process.env.COOKIE_SAMESITE === "none" ||
    (!process.env.COOKIE_DOMAIN && process.env.NODE_ENV === "production");

  const options: CookieOptions = {
    httpOnly: true,
    secure: crossSite || process.env.COOKIE_SECURE === "true",
    sameSite: crossSite ? "none" : "lax",
    path: "/",
  };

  if (process.env.COOKIE_DOMAIN) {
    options.domain = process.env.COOKIE_DOMAIN;
  }

  return options;
};

export const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string,
) => {
  const baseOptions = getAuthCookieOptions();

  res.cookie("accessToken", accessToken, {
    ...baseOptions,
    maxAge: SEVEN_DAYS_MS,
  });

  res.cookie("refreshToken", refreshToken, {
    ...baseOptions,
    maxAge: THIRTY_DAYS_MS,
  });
};

export const clearAuthCookies = (res: Response) => {
  const options = getAuthCookieOptions();
  res.clearCookie("accessToken", options);
  res.clearCookie("refreshToken", options);
};
