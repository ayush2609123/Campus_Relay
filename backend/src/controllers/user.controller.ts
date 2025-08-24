import { Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import User from "../models/User.model";

import { z } from "zod";

import RefreshToken from "../models/RefreshToken.model";
import { updateMeSchema } from "../validators/user.schema";

// GET /users/me — fresh from DB
export const getMe = asyncHandler(async (req: any, res: Response) => {
  if (!req.user?._id) throw new ApiError(401, "Unauthorized");
  const user = await User.findById(req.user._id).select("_id name email role phone createdAt updatedAt");
  if (!user) throw new ApiError(404, "User not found");
  return res.json(new ApiResponse(200, user, "OK"));
});

// PATCH /users/me — update profile (name, phone)
export const updateMe = asyncHandler(async (req: any, res: Response) => {
  if (!req.user?._id) throw new ApiError(401, "Unauthorized");
  const body = updateMeSchema.parse(req.body);

  const updates: Record<string, any> = {};
  if (body.name) updates.name = body.name.trim();
  if (body.phone) {
    // normalize phone: keep digits + leading +
    const cleaned = body.phone.replace(/[^\d+]/g, "");
    updates.phone = cleaned;
  }

  try {
    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true, projection: "_id name email role phone updatedAt" }
    );
    if (!updated) throw new ApiError(404, "User not found");
    return res.json(new ApiResponse(200, updated, "Profile updated"));
  } catch (err: any) {
    if (err?.code === 11000) {
      // unique index conflict (likely phone/email)
      const field = Object.keys(err.keyPattern || {})[0] || "field";
      throw new ApiError(409, `${field} already in use`);
    }
    throw err;
  }
});

// GET /users/sessions — list active & past refresh sessions
export const listSessions = asyncHandler(async (req: any, res: Response) => {
  if (!req.user?._id) throw new ApiError(401, "Unauthorized");

  const sessions = await RefreshToken
    .find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .select("_id createdAt revokedAt userAgent ip");

  const data = sessions.map(s => ({
    id: s._id.toString(),
    createdAt: s.createdAt,
    revokedAt: s.revokedAt ?? null,
    active: !s.revokedAt,
    userAgent: s.userAgent || "",
    ip: s.ip || ""
  }));

  return res.json(new ApiResponse(200, data, "OK"));
});

// DELETE /users/sessions/:sessionId — revoke one session
export const revokeSession = asyncHandler(async (req: any, res: Response) => {
  if (!req.user?._id) throw new ApiError(401, "Unauthorized");
  const { sessionId } = req.params;

  const session = await RefreshToken.findOne({ _id: sessionId, userId: req.user._id });
  if (!session) throw new ApiError(404, "Session not found");

  if (!session.revokedAt) {
    session.revokedAt = new Date();
    await session.save();
  }

  return res.json(new ApiResponse(200, { id: session._id.toString(), revokedAt: session.revokedAt }, "Session revoked"));
});

const enrollSchema = z.object({
  code: z.string().min(4, "Code required"),
});

function ensureAuthed(req: any) {
  if (!req.user?._id) throw new ApiError(401, "Unauthorized");
}

/**
 * POST /users/driver/enroll
 * Body: { code }
 * If code matches DRIVER_ENROLL_CODE, promote current user to role=driver.
 */
export const enrollDriver = asyncHandler(async (req: any, res) => {
  ensureAuthed(req);
  const { code } = enrollSchema.parse(req.body);

  const expected = process.env.DRIVER_ENROLL_CODE;
  if (!expected) throw new ApiError(500, "Enroll code not configured");
  if (code !== expected) throw new ApiError(403, "Invalid enroll code");

  // already a driver?
  if (req.user.role === "driver") {
    return res.json(new ApiResponse(200, { role: "driver" }, "Already a driver"));
  }

  await User.updateOne(
    { _id: req.user._id },
    { $set: { role: "driver", driverEnrolledAt: new Date() } as any }
  );

  const fresh = await User.findById(req.user._id).select("-password -refreshToken");
  return res.json(new ApiResponse(200, fresh, "Role updated to driver"));
});