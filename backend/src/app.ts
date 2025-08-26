// src/app.ts
import express from "express";
import cors, { CorsOptionsDelegate } from "cors";
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

// trust proxy when running behind Render/NGINX
app.set("trust proxy", 1);

// ----- CORS -----
const FRONTEND_URL = (process.env.FRONTEND_URL || "").trim();
const ALLOWED = new Set<string>([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  ...(FRONTEND_URL ? [FRONTEND_URL] : []),
]);

const corsOptions: CorsOptionsDelegate = (req, cb) => {
  const origin = req.header("Origin") || "";
  const allow = !origin || ALLOWED.has(origin);
  // Do NOT throw here — just disable CORS if not allowed so we don’t send a 500.
  cb(null, {
    origin: allow,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  });
};

app.use(cors(corsOptions));
// Let preflights through quickly
app.options("*", cors(corsOptions));

// ----- parsers -----
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ----- health -----
app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/healthz", (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// ----- routes -----
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

// centralized error handler
app.use(errorHandler);

export default app;
