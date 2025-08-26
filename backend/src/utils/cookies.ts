// src/utils/cookies.ts
import type { CookieOptions, Request } from "express";

export function cookieBaseFromReq(req: Request): CookieOptions {
  // works behind proxies (you already do app.set('trust proxy', 1))
  const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
  return {
    httpOnly: true,
    secure: isHttps,               // only secure over https
    sameSite: isHttps ? "none" : "lax",
    path: "/",
  };
}
