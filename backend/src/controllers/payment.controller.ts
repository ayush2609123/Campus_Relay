import { Request, Response } from "express";
import { Types } from "mongoose";
import crypto from "node:crypto";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { createPaymentIntentSchema, updatePaymentStatusSchema } from "../validators/payment.schema";
import QRCode from "qrcode";
import Booking from "../models/Booking.model";
import Trip from "../models/Trip.model";
import PaymentIntent from "../models/PaymentIntent.model";
import { isValidObjectId } from "mongoose";
/** helpers */
function ensureAuthed(req: any) {
  if (!req.user?._id) throw new ApiError(401, "Unauthorized");
}
function getIdemKey(req: Request) {
  return req.header("Idempotency-Key") || undefined;
}
function sha(str: string) {
  return crypto.createHash("sha256").update(str).digest("hex");
}

function buildUpiUri(opts: { vpa: string; name: string; amount: number; note: string; trRef?: string }) {
    const { vpa, name, amount, note, trRef } = opts;
    const tr = trRef || crypto.randomBytes(12).toString("hex"); // transaction/ref id
    const qs = new URLSearchParams({
      pa: vpa,                               // payee VPA
      pn: name,                              // payee name
      am: amount.toFixed(2),                 // amount, 2dp
      cu: "INR",                             // currency
      tr,                                    // transaction ref
      tn: note,                              // note
    });
    return `upi://pay?${qs.toString()}`;
  }
  
  /**
   * POST /api/payments/intent
   * body: { bookingId: string, amount?: number }
   * headers: Idempotency-Key (optional but recommended)
   */
  export const createUPIIntent = asyncHandler(async (req, res) => {
    const user = req.user;
    if (!user) throw new ApiError(401, "Unauthorized");
  
    const { bookingId, amount } = req.body || {};
    const idem = req.header("Idempotency-Key") || undefined;
  
    if (!bookingId || !isValidObjectId(bookingId)) {
      throw new ApiError(400, "Invalid bookingId");
    }
  
    // Load booking
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new ApiError(404, "Booking not found");
  
    // Only the booking owner (or admin) can create an intent
    if (booking.userId.toString() !== user._id.toString() && user.role !== "admin") {
      throw new ApiError(403, "Forbidden");
    }
  
    // Booking must not be cancelled
    if (booking.status === "cancelled") {
      throw new ApiError(400, "Booking is cancelled");
    }
  
    // Load trip (for price/seat + timing)
    const trip = await Trip.findById(booking.tripId);
    if (!trip) throw new ApiError(404, "Trip not found");
  
    // Optional guard: don’t allow intent if trip already started
    if (new Date(trip.startTime) <= new Date()) {
      throw new ApiError(400, "Trip already started");
    }
  
    // Idempotency: reuse previous intent if same key was used
    if (idem) {
      const existing = await PaymentIntent.findOne({ bookingId, idem }).lean();
      if (existing) {
        return res
          .status(200)
          .json(new ApiResponse(200, { upiUri: existing.upiUri, paymentId: existing._id }, "OK"));
      }
    }
  
    // Compute amount safely (fallback to seats * pricePerSeat)
    const computed = (trip.pricePerSeat || 0) * (booking.seats || 1);
    const amt = Number.isFinite(Number(amount)) && Number(amount) > 0 ? Number(amount) : computed;
    if (!amt || amt <= 0) throw new ApiError(400, "Invalid amount");
  
    const VPA  = process.env.UPI_VPA  || "ayush@upi";        // put your real VPA in .env
    const NAME = process.env.UPI_NAME || "Campus Relay";     // display name for UPI apps
  
    const note = `Booking ${booking._id.toString().slice(-6)}`;
    const upiUri = buildUpiUri({ vpa: VPA, name: NAME, amount: amt, note });
  
    const intent = await PaymentIntent.create({
      bookingId,
      upiUri,
      status: "initiated",
      idem, // may be undefined
    });
  
    return res
      .status(201)
      .json(new ApiResponse(201, { upiUri, paymentId: intent._id }, "Intent created"));
  });
/**
 * POST /payments/:id/status
 * Body: { status: 'success' | 'failed' }
 * - Client reports result; we mark the intent accordingly.
 * - Allowed by booking owner or trip driver/admin.
 */
export const updatePaymentStatus = asyncHandler(async (req: any, res: Response) => {
  ensureAuthed(req);
  const { id } = req.params;
  const { status } = updatePaymentStatusSchema.parse(req.body);

  if (!Types.ObjectId.isValid(id)) throw new ApiError(400, "Invalid payment id");

  const intent = await PaymentIntent.findById(id);
  if (!intent) throw new ApiError(404, "Payment intent not found");

  const b = await Booking.findById(intent.bookingId);
  if (!b) throw new ApiError(404, "Booking not found");

  // permissions: rider (owner) OR driver/admin of the trip
  const riderOwns = b.userId.toString() === req.user._id.toString();
  let driverOwns = false;
  if (!riderOwns) {
    const trip = await Trip.findById(b.tripId).select("driverId");
    if (trip && (trip.driverId.toString() === req.user._id.toString() || req.user.role === "admin")) {
      driverOwns = true;
    }
  }
  if (!riderOwns && !driverOwns) throw new ApiError(403, "Not allowed");

  if (intent.status !== "initiated") {
    return res.json(new ApiResponse(200, intent, "Already finalized"));
  }

  intent.status = status;
  intent.completedAt = new Date();
  await intent.save();

  return res.json(new ApiResponse(200, intent, "Payment status updated"));
});

/** (optional) GET /payments/by-booking/:bookingId — latest intent for this booking */
export const getLatestIntentForBooking = asyncHandler(async (req: any, res: Response) => {
  ensureAuthed(req);
  const { bookingId } = req.params;
  if (!Types.ObjectId.isValid(bookingId)) throw new ApiError(400, "Invalid booking id");

  const b = await Booking.findById(bookingId);
  if (!b) throw new ApiError(404, "Booking not found");
  if (b.userId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    throw new ApiError(403, "Not allowed");
  }

  const latest = await PaymentIntent.findOne({ bookingId })
    .sort({ createdAt: -1 });

  return res.json(new ApiResponse(200, latest, "OK"));

});

export const getIntentQrPng = asyncHandler(async (req: any, res: Response) => {
    if (!req.user?._id) throw new ApiError(401, "Unauthorized");
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) throw new ApiError(400, "Invalid payment id");
  
    const intent = await PaymentIntent.findById(id);
    if (!intent) throw new ApiError(404, "Payment intent not found");
  
    // Only booking owner or driver/admin can fetch QR
    const b = await Booking.findById(intent.bookingId).select("userId tripId");
    if (!b) throw new ApiError(404, "Booking not found");
    const riderOwns = b.userId.toString() === req.user._id.toString();
    let driverOwns = false;
    if (!riderOwns) {
      const trip = await Trip.findById(b.tripId).select("driverId");
      if (trip && (trip.driverId.toString() === req.user._id.toString() || req.user.role === "admin")) {
        driverOwns = true;
      }
    }
    if (!riderOwns && !driverOwns) throw new ApiError(403, "Not allowed");
  
    const png = await QRCode.toBuffer(intent.upiUri, {
      errorCorrectionLevel: "M",
      margin: 1,
      scale: 6
    });
  
    res.setHeader("Content-Type", "image/png");
    res.send(png);

});
/** GET /payments/:id/qr — minimal HTML page showing QR + copy button (auth required) */
export const getIntentQrPage = asyncHandler(async (req: any, res: Response) => {
    if (!req.user?._id) throw new ApiError(401, "Unauthorized");
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) throw new ApiError(400, "Invalid payment id");
  
    const intent = await PaymentIntent.findById(id);
    if (!intent) throw new ApiError(404, "Payment intent not found");
  
    const b = await Booking.findById(intent.bookingId).select("userId tripId");
    if (!b) throw new ApiError(404, "Booking not found");
    const riderOwns = b.userId.toString() === req.user._id.toString();
    let driverOwns = false;
    if (!riderOwns) {
      const trip = await Trip.findById(b.tripId).select("driverId");
      if (trip && (trip.driverId.toString() === req.user._id.toString() || req.user.role === "admin")) {
        driverOwns = true;
      }
    }
    if (!riderOwns && !driverOwns) throw new ApiError(403, "Not allowed");
  
    const dataUrl = await QRCode.toDataURL(intent.upiUri, { errorCorrectionLevel: "M", margin: 1, scale: 6 });
  
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>UPI Payment QR</title>
    <style>
      body{font-family:system-ui,-apple-system,Segoe UI,Roboto;display:flex;min-height:100vh;align-items:center;justify-content:center;background:#0b1220;color:#e8eefc;margin:0}
      .card{background:#111a2b;border:1px solid #1f2b44;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.3);padding:24px;max-width:420px;width:100%;text-align:center}
      img{width:260px;height:260px;border-radius:8px;background:#fff;padding:8px}
      .link{word-break:break-all;font-size:12px;color:#a9b8d9;margin-top:10px}
      .btn{margin-top:14px;padding:10px 14px;border-radius:10px;border:0;background:#3b82f6;color:#fff;font-weight:600;cursor:pointer}
    </style>
  </head>
  <body>
    <div class="card">
      <h2 style="margin:0 0 12px">Scan to Pay (UPI)</h2>
      <img src="${dataUrl}" alt="UPI QR" />
      <div class="link" id="link">${intent.upiUri.replace(/&/g, "&amp;")}</div>
      <button class="btn" onclick="navigator.clipboard.writeText(document.getElementById('link').innerText)">Copy UPI Link</button>
    </div>
  </body>
  </html>`);
  });
  