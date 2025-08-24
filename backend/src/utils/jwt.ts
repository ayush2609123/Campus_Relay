import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.ACCESS_TOKEN_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.REFRESH_TOKEN_SECRET;

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  // fail fast at boot if secrets missing
  // (index.ts loads env before starting)
  // You can remove this throw if you prefer lazy checks.
  throw new Error("JWT secrets missing. Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET in .env");
}

type BasePayload = { _id: string; email: string; role: string };

export function signAccess(payload: BasePayload) {
  const exp = process.env.ACCESS_TOKEN_TTL || "15m";
  return jwt.sign(payload, ACCESS_SECRET!, { expiresIn: exp });
}

export function signRefresh(payload: BasePayload) {
  const exp = process.env.REFRESH_TOKEN_TTL || "7d";
  return jwt.sign(payload, REFRESH_SECRET!, { expiresIn: exp });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, ACCESS_SECRET!) as BasePayload & jwt.JwtPayload;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, REFRESH_SECRET!) as BasePayload & jwt.JwtPayload;
}
