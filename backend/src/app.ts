// src/app.ts
import express from "express";
import cors, { CorsOptions } from "cors";
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
app.set("trust proxy", 1);

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const corsOptions: CorsOptions = {
  origin(origin, cb) {
    // allow same-origin / tools (no Origin header) and your frontend
    if (!origin) return cb(null, true);
    const allowed = [FRONTEND_URL, "http://localhost:5173"].includes(origin);
    return cb(allowed ? null : new Error("CORS blocked"), allowed);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // preflight
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// health
app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/healthz", (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// routes…
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/hubs", hubRoutes);
app.use("/api/locations", locationRoutes);

app.all("*", (_req, res) => res.status(404).json({ error: "Not found" }));
app.use(errorHandler);

export default app;

