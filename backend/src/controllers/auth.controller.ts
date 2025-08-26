import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { registerSchema, loginSchema } from "../validators/auth.schema";
import User from "../models/User.model";
import RefreshToken from "../models/RefreshToken.model";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { signAccess, signRefresh, verifyRefreshToken } from "../utils/jwt";

function cookieBaseOpts() {
  const publicOrigin = process.env.PUBLIC_ORIGIN || "";
  const looksLocal =
    publicOrigin.includes("localhost") ||
    process.env.COOKIE_INSECURE === "true" ||
    process.env.NODE_ENV !== "production";

  return {
    httpOnly: true,
    secure: !looksLocal,                               // false on localhost
    sameSite: looksLocal ? ("lax" as const) : ("none" as const), // "none" only when secure
    domain: process.env.COOKIE_DOMAIN || undefined,    // leave undefined for localhost
    path: "/",
  };
}
function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  const base = cookieBaseOpts();
  res.cookie("accessToken", accessToken, { ...base, maxAge: 15 * 60 * 1000 });          // 15m
  res.cookie("refreshToken", refreshToken, { ...base, maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7d
}

function clearAuthCookies(res: Response) {
  const base = cookieBaseOpts();
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
    .sort({ createdAt: -1 })
    .limit(20);

  let matched: typeof candidates[number] | null = null;
  for (const rt of candidates) {
    const ok = await bcrypt.compare(incoming, rt.tokenHash);
    if (ok) { matched = rt; break; }
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

/** POST /auth/logout — revoke the presented refresh token (if any) */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const incoming = readRefreshToken(req);
  if (!incoming) {
    // best effort: remove cookies anyway
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    return res.json(new ApiResponse(200, null, "Logged out"));
  }

  // revoke matching session (best effort)
  const all = await RefreshToken.find({ revokedAt: { $exists: false } }).sort({ createdAt: -1 }).limit(50);
  for (const rt of all) {
    if (await bcrypt.compare(incoming, rt.tokenHash)) {
      rt.revokedAt = new Date();
      await rt.save();
      break;
    }
  }

  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  return res.json(new ApiResponse(200, null, "Logged out"));
});

/** POST /auth/logout-all — revoke all user sessions (requires access token) */
export const logoutAll = asyncHandler(async (req: any, res: Response) => {
  if (!req.user?._id) throw new ApiError(401, "Unauthorized");
  await RefreshToken.updateMany({ userId: req.user._id, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } });
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  return res.json(new ApiResponse(200, null, "All sessions revoked"));
});

/** GET /auth/me (requires access token) */
export const me = asyncHandler(async (req: any, res: Response) => {
  if (!req.user?._id) throw new ApiError(401, "Unauthorized");
  const fresh = await User.findById(req.user._id).select("_id name email role phone createdAt");
  if (!fresh) throw new ApiError(404, "User not found");
  return res.json(new ApiResponse(200, fresh, "OK"));
});
