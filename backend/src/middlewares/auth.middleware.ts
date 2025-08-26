import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import User from "../models/User.model";

interface JwtUserPayload extends JwtPayload { _id: string; email?: string; role?: string; }
export interface AuthedUser { _id: string; name?: string; email: string; role: string; phone?: string; }

declare global {
  namespace Express { interface Request { user?: AuthedUser } }
}

export const verifyJWT = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const token =
    (req as any).cookies?.accessToken ||
    req.header("authorization")?.replace("Bearer ", "") ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!token) throw new ApiError(401, "Unauthorized request: No token provided");

  const secret = process.env.JWT_ACCESS_SECRET || process.env.ACCESS_TOKEN_SECRET;
  if (!secret) throw new ApiError(500, "Server misconfig: missing JWT secret");

  let decoded: JwtUserPayload;
  try {
    decoded = jwt.verify(token, secret) as JwtUserPayload;
  } catch {
    throw new ApiError(401, "Invalid or expired access token");
  }
  if (!decoded || !decoded._id) throw new ApiError(401, "Invalid access token payload");

  const user = await User.findById(decoded._id).select("_id name email role phone");
  if (!user) throw new ApiError(401, "User not found for provided token");
  if (!user.role) throw new ApiError(403, "User role is not defined");

  req.user = {
    _id: user._id.toString(),
    name: user.name ?? undefined,
    email: user.email,
    role: user.role,
    phone: user.phone ?? undefined,
  };
  next();
});
