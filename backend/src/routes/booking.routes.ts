import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import {
  createBooking,
  myBookings,
  getBooking,
  cancelBooking,
  regenerateOtp,
  listBookingsByTripForDriver
} from "../controllers/booking.controller";

const r = Router();

r.post("/", verifyJWT, createBooking);
r.get("/my", verifyJWT, myBookings);
r.get("/:id", verifyJWT, getBooking);
r.post("/:id/cancel", verifyJWT, cancelBooking);
r.post("/:id/otp", verifyJWT, regenerateOtp);
r.get("/by-trip/:tripId", verifyJWT, listBookingsByTripForDriver);
export default r;
