// src/controllers/auth.controller.ts
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { registerSchema, loginSchema } from "../validators/auth.schema";
import User from "../models/User.model";
import RefreshToken from "../models/RefreshToken.model";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { signAccess, signRefresh, verifyRefreshToken } from "../utils/jwt";

// Compute cookie attributes once so clear/set always match
function cookieBaseOpts() {
  const publicOrigin = (process.env.FRONTEND_URL || "").trim();
  const looksLocal =
    !publicOrigin || publicOrigin.includes("localhost") || process.env.COOKIE_INSECURE === "true";

  return {
    httpOnly: true,
    secure: !looksLocal,                  // must be true on Render
    sameSite: looksLocal ? ("lax" as const) : ("none" as const), // None+Secure across subdomains
    // DO NOT set domain for Render; default = backend host, which is correct
    path: "/",
  };
}

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  const base = cookieBaseOpts();
  // 15 minutes
  res.cookie("accessToken", accessToken, { ...base, maxAge: 15 * 60 * 1000 });
  // 7 days
  res.cookie("refreshToken", refreshToken, { ...base, maxAge: 7 * 24 * 60 * 60 * 1000 });
}

function clearAuthCookies(res: Response) {
  const base = cookieBaseOpts();
  // clear must include the same attributes
  res.clearCookie("accessToken", base);
  res.clearCookie("refreshToken", base);
}

function readRefreshToken(req: Request): string | undefined {
  const fromCookie = (req as any).cookies?.refreshToken as string | undefined;

  const auth = req.header("authorization");
  const bearer = auth && auth.startsWith("Bearer ") ? auth.slice(7) : undefined;

  const fromHeader = req.header("x-refresh-token") || bearer;
  const fromBody = (req.body?.refreshToken as string | undefined) || undefined;

  return fromCookie || fromHeader || fromBody;
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const data = registerSchema.parse(req.body);

  const exists = await User.findOne({ email: data.email.toLowerCase() });
  if (exists) throw new ApiError(409, "Email already registered");

  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await User.create({
    name: data.name,
    email: data.email.toLowerCase(),
    passwordHash,
    phone: data.phone,
    role: "rider",
  });

  const payload = { _id: user._id.toString(), email: user.email!, role: user.role! };
  const accessToken = signAccess(payload);
  const refreshToken = signRefresh(payload);

  await RefreshToken.create({
    userId: user._id,
    tokenHash: await bcrypt.hash(refreshToken, 12),
    userAgent: req.headers["user-agent"] || "",
    ip: req.ip,
  });

  setAuthCookies(res, accessToken, refreshToken);
  return res
    .status(201)
    .json(new ApiResponse(201, {
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
      tokens: { accessToken, refreshToken }
    }, "Registered"));
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw new ApiError(401, "Invalid credentials");

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new ApiError(401, "Invalid credentials");

  const payload = { _id: user._id.toString(), email: user.email!, role: user.role! };
  const accessToken = signAccess(payload);
  const refreshToken = signRefresh(payload);

  await RefreshToken.create({
    userId: user._id,
    tokenHash: await bcrypt.hash(refreshToken, 12),
    userAgent: req.headers["user-agent"] || "",
    ip: req.ip,
  });

  setAuthCookies(res, accessToken, refreshToken);
  return res.json(new ApiResponse(200, {
    user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    tokens: { accessToken, refreshToken }
  }, "Logged in"));
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const incoming = readRefreshToken(req);
  if (!incoming) throw new ApiError(401, "Refresh token missing");

  let decoded: { _id: string; email: string; role: string };
  try {
    decoded = verifyRefreshToken(incoming);
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const user = await User.findById(decoded._id).select("_id name email role");
  if (!user) throw new ApiError(401, "User not found");

  const candidates = await RefreshToken.find({ userId: user._id, revokedAt: { $exists: false } })
    .sort({ createdAt: -1 }).limit(20);

  let matched: typeof candidates[number] | null = null;
  for (const rt of candidates) {
    if (await bcrypt.compare(incoming, rt.tokenHash)) { matched = rt; break; }
  }
  if (!matched) throw new ApiError(401, "Refresh session not recognized (re-login)");

  matched.revokedAt = new Date();
  await matched.save();

  const payload = { _id: user._id.toString(), email: user.email!, role: user.role! };
  const newAccess = signAccess(payload);
  const newRefresh = signRefresh(payload);

  await RefreshToken.create({
    userId: user._id,
    tokenHash: await bcrypt.hash(newRefresh, 12),
    userAgent: req.headers["user-agent"] || "",
    ip: req.ip,
  });

  setAuthCookies(res, newAccess, newRefresh);
  return res.json(new ApiResponse(200, { accessToken: newAccess, refreshToken: newRefresh }, "Token rotated"));
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const incoming = readRefreshToken(req);

  if (incoming) {
    const all = await RefreshToken.find({ revokedAt: { $exists: false } }).sort({ createdAt: -1 }).limit(50);
    for (const rt of all) {
      if (await bcrypt.compare(incoming, rt.tokenHash)) {
        rt.revokedAt = new Date();
        await rt.save();
        break;
      }
    }
  }
  clearAuthCookies(res);
  return res.json(new ApiResponse(200, null, "Logged out"));
});

export const logoutAll = asyncHandler(async (req: any, res: Response) => {
  if (!req.user?._id) throw new ApiError(401, "Unauthorized");
  await RefreshToken.updateMany({ userId: req.user._id, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } });
  clearAuthCookies(res);
  return res.json(new ApiResponse(200, null, "All sessions revoked"));
});

export const me = asyncHandler(async (req: any, res: Response) => {
  if (!req.user?._id) throw new ApiError(401, "Unauthorized");
  const fresh = await User.findById(req.user._id).select("_id name email role phone createdAt");
  if (!fresh) throw new ApiError(404, "User not found");
  return res.json(new ApiResponse(200, fresh, "OK"));
});
