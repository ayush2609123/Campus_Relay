// src/app.ts
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middlewares/errorHandler";
import authRoutes from "./routes/auth.routes";
import userRoutes from   "./routes/user.routes";
import vehicleRoutes from "./routes/vehicle.routes";
import tripRoutes from "./routes/trip.routes";
import bookingRoutes from "./routes/booking.routes";
import paymentRoutes from "./routes/payment.routes";
import hubRoutes from "./routes/hub.routes";
import locationRoutes from "./routes/location.routes";

const app = express();

// trust proxy if behind vercel/nginx
app.set("trust proxy", 1);

const ORIGINS = (
    process.env.CORS_ORIGINS ||
    process.env.FRONTEND_URL || ""
  )
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  
  // In prod, keep it tight. In dev, include localhost.
  const corsOptions: cors.CorsOptions = {
    origin(origin, cb) {
      if (!origin) return cb(null, true);               // curl/mobile/native
      if (ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "x-refresh-token",
      "x-idempotency-key"
    ],
  };
  
  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions)); // handle preflight
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// health check
app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/healthz", (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// ...
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/hubs", hubRoutes);
app.use("/api/locations", locationRoutes);

// 404 for unmatched routes
app.all("*", (_req, res) => res.status(404).json({ error: "Not found" }));

// centralized error handler (uses ApiError/ApiResponse)
app.use(errorHandler);

export default app;
