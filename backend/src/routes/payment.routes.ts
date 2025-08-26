import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import {
    createUPIIntent,
  updatePaymentStatus,
  getLatestIntentForBooking,
  getIntentQrPng,         
  getIntentQrPage 
} from "../controllers/payment.controller";

const r = Router();

r.post("/intent", verifyJWT, createUPIIntent);
r.post("/:id/status", verifyJWT, updatePaymentStatus);
r.get("/by-booking/:bookingId", verifyJWT, getLatestIntentForBooking);

r.get("/:id/qr.png", verifyJWT, getIntentQrPng);
r.get("/:id/qr", verifyJWT, getIntentQrPage);
export default r;
