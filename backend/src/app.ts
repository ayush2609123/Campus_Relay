// src/app.ts
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middlewares/errorHandler";

import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import vehicleRoutes from "./routes/vehicle.routes";
import tripRoutes from "./routes/trip.routes";
import bookingRoutes from "./routes/booking.routes";
import paymentRoutes from "./routes/payment.routes";
import hubRoutes from "./routes/hub.routes";
import locationRoutes from "./routes/location.routes";

const app = express();

// required for Secure cookies behind Render's proxy
app.set("trust proxy", 1);

/**
 * CORS
 * FRONTEND_URL should be exactly your deployed client origin, e.g.
 *   https://campus-relay-1.onrender.com
 * You can add extra comma-separated origins in CORS_EXTRA_ORIGINS.
 */
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const EXTRA = (process.env.CORS_EXTRA_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

const ALLOW = new Set<string>([
  FRONTEND_URL,
  "http://localhost:5173",
  ...EXTRA,
]);

app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true); // tools/SSR/postman
    cb(ALLOW.has(origin) ? null : new Error("CORS: origin not allowed"), ALLOW.has(origin));
  },
  credentials: true,
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization","X-Requested-With"],
  optionsSuccessStatus: 204,
}));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// health checks
app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/healthz", (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// api routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/hubs", hubRoutes);
app.use("/api/locations", locationRoutes);

// 404
app.all("*", (_req, res) => res.status(404).json({ error: "Not found" }));

// central error handler
app.use(errorHandler);

export default app;
