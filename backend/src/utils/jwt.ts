// src/utils/jwt.ts
import jwt, { type JwtPayload, type Secret } from "jsonwebtoken";

const ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || process.env.ACCESS_TOKEN_SECRET;
const REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || process.env.REFRESH_TOKEN_SECRET;

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error(
    "JWT secrets missing. Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET in .env"
  );
}

type BasePayload = { _id: string; email: string; role: string };

export function signAccess(payload: BasePayload): string {
  const expiresIn = process.env.ACCESS_TOKEN_TTL ?? "15m";
  // Do NOT type the options; let TS infer (or cast to any) to avoid StringValue issues.
  return jwt.sign(payload, ACCESS_SECRET as Secret, { expiresIn } as any);
}

export function signRefresh(payload: BasePayload): string {
  const expiresIn = process.env.REFRESH_TOKEN_TTL ?? "7d";
  return jwt.sign(payload, REFRESH_SECRET as Secret, { expiresIn } as any);
}

export function verifyAccessToken(token: string): BasePayload & JwtPayload {
  return jwt.verify(token, ACCESS_SECRET as Secret) as BasePayload & JwtPayload;
}

export function verifyRefreshToken(token: string): BasePayload & JwtPayload {
  return jwt.verify(token, REFRESH_SECRET as Secret) as BasePayload & JwtPayload;
}
