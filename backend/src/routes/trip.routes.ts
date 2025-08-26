// server/src/routes/trip.routes.ts
import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import {
  createTrip, getTrip, searchTrips, myTrips,
  updateTrip, publishTrip, cancelTrip, startTrip, completeTrip
} from "../controllers/trip.controller";
import { verifyOtpForTrip } from "../controllers/booking.controller";
const r = Router();

// public
r.get("/search", searchTrips);

// authed (driver/admin)
r.get("/my", verifyJWT, myTrips);                 // <-- put BEFORE "/:id"
r.post("/", verifyJWT, createTrip);
r.patch("/:id", verifyJWT, updateTrip);
r.post("/:id/publish", verifyJWT, publishTrip);
r.post("/:id/cancel", verifyJWT, cancelTrip);
r.post("/:id/start", verifyJWT, startTrip);
r.post("/:id/complete", verifyJWT, completeTrip);
r.post("/:id/verify-otp", verifyJWT, verifyOtpForTrip);
// public detail — keep LAST so it doesn't swallow "/my"
r.get("/:id", getTrip);

export default r;
