import { Request, Response } from "express";
import { Types, isValidObjectId, startSession } from "mongoose";
import bcrypt from "bcrypt";
import Trip from "../models/Trip.model";
import Booking from "../models/Booking.model";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { createBookingSchema, verifyOtpSchema } from "../validators/booking.schema";
import User from "../models/User.model";
/** constants */
const CANCEL_CUTOFF_MINUTES = 30;

/** helpers */
function ensureAuthed(req: any) {
  if (!req.user?._id) throw new ApiError(401, "Unauthorized");
}
function ensureDriver(req: any) {
  ensureAuthed(req);
  if (req.user.role !== "driver" && req.user.role !== "admin") {
    throw new ApiError(403, "Driver role required");
  }
}
const pad6 = (n: number) => n.toString().padStart(6, "0");
const generateOtp = () => pad6(Math.floor(Math.random() * 1_000_000));

/** shape booking (+trip summary) for client */
function shape(b: any) {
  const trip = b.tripId || b.trip;
  return {
    _id: b._id,
    userId: b.userId,
    tripId: b.tripId?._id || b.tripId,
    seats: b.seats,
    status: b.status,
    verifiedAt: b.verifiedAt,
    createdAt: b.createdAt,
    trip: trip && {
      _id: trip._id,
      origin: trip.origin,
      destination: trip.destination,
      startTime: trip.startTime,
      pricePerSeat: trip.pricePerSeat,
      kind: trip.kind,
      routeName: trip.routeName,
    },
  };
}

/**
 * POST /bookings
 * Create booking with atomic seat reservation.
 * - Idempotent per (userId, tripId): returns existing active booking if present
 * - Generates OTP (hashed) with expiry = startTime + 2h
 * - Starts as "pending" (driver verifies OTP at pickup → "confirmed")
 */
export const createBooking = asyncHandler(async (req: any, res: Response) => {
  ensureAuthed(req);

  // Be tolerant about incoming shapes to avoid “tripId undefined”
  const coercion = {
    tripId:
      req.body?.tripId ??
      req.body?.trip ??
      req.body?.trip_id ??
      req.body?.tripID ??
      undefined,
    seats:
      typeof req.body?.seats === "string"
        ? Number(req.body.seats)
        : req.body?.seats,
  };

  const parsed = createBookingSchema.safeParse(coercion);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    }));
    throw new ApiError(400, "Invalid request body", issues);
  }

  const { tripId: tripIdStr, seats } = parsed.data;
  const userId = new Types.ObjectId(req.user._id);
  const tripId = new Types.ObjectId(tripIdStr);

  // Idempotency: if a non-cancelled booking exists, return it (with trip populated)
  const existing = await Booking.findOne({
    userId,
    tripId,
    status: { $ne: "cancelled" },
  })
    .populate("tripId", "origin destination startTime pricePerSeat kind routeName")
    .lean();

  if (existing) {
    return res
      .status(200)
      .json(new ApiResponse(200, shape(existing), "Already booked (idempotent)"));
  }

  const trip = await Trip.findById(tripId);
  if (!trip) throw new ApiError(404, "Trip not found");
  if (trip.status !== "published") throw new ApiError(400, "Trip not open for booking");
  if (trip.startTime.getTime() <= Date.now())
    throw new ApiError(400, "Trip already started");
  if (seats > trip.seatsLeft)
    throw new ApiError(400, "Not enough seats left");
  if (String(trip.driverId) === String(userId))
    throw new ApiError(400, "Driver cannot book own trip");

  // Prepare OTP now (stored hashed). Rider can regenerate later.
  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 12);
  const otpExpiresAt = new Date(trip.startTime.getTime() + 2 * 60 * 60 * 1000);

  const session = await startSession();
  try {
    await session.withTransaction(async () => {
      const updated = await Trip.findOneAndUpdate(
        {
          _id: tripId,
          status: "published",
          startTime: { $gt: new Date() },
          seatsLeft: { $gte: seats },
        },
        { $inc: { seatsLeft: -seats } },
        { new: true, session }
      );
      if (!updated)
        throw new ApiError(409, "Seats just sold out, try fewer seats");

      await Booking.create(
        [
          {
            userId,
            tripId,
            seats,
            status: "pending",
            otpHash,
            otpExpiresAt,
          },
        ],
        { session }
      );
    });

    const created = await Booking.findOne({ userId, tripId })
      .sort({ createdAt: -1 })
      .populate("tripId", "origin destination startTime pricePerSeat kind routeName")
      .lean();

    return res
      .status(201)
      .json(new ApiResponse(201, { booking: shape(created), otp }, "Booking created"));
  } catch (err: any) {
    // Fallback path if transactions unsupported
    if (String(err?.message || "").includes("Transaction")) {
      try {
        const updated = await Trip.findOneAndUpdate(
          {
            _id: tripId,
            status: "published",
            startTime: { $gt: new Date() },
            seatsLeft: { $gte: seats },
          },
          { $inc: { seatsLeft: -seats } },
          { new: true }
        );
        if (!updated)
          throw new ApiError(409, "Seats just sold out, try fewer seats");

        const created = await Booking.create({
          userId,
          tripId,
          seats,
          status: "pending",
          otpHash,
          otpExpiresAt,
        });

        const withTrip = await Booking.findById(created._id)
          .populate("tripId", "origin destination startTime pricePerSeat kind routeName")
          .lean();

        return res
          .status(201)
          .json(new ApiResponse(201, { booking: shape(withTrip), otp }, "Booking created"));
      } catch (e) {
        // compensate seats if booking create failed
        await Trip.updateOne({ _id: tripId }, { $inc: { seatsLeft: seats } });
        throw e;
      }
    }
    throw err;
  } finally {
    session.endSession();
  }
});

/** GET /bookings/my — list my bookings */
export const myBookings = asyncHandler(async (req: any, res: Response) => {
  ensureAuthed(req);
  const userId = new Types.ObjectId(req.user._id);

  const list = await Booking.find({ userId })
    .sort({ createdAt: -1 })
    .populate("tripId", "origin destination startTime pricePerSeat kind routeName")
    .lean();

  return res.json(new ApiResponse(200, list.map(shape)));
});

/** GET /bookings/:id — get booking (owner or admin) */
export const getBooking = asyncHandler(async (req: any, res: Response) => {
  ensureAuthed(req);
  const { id } = req.params;
  if (!isValidObjectId(id)) throw new ApiError(400, "Invalid booking id");
  const b = await Booking.findById(id)
  .populate("tripId", "origin destination startTime pricePerSeat kind routeName")
  .lean();
if (!b) throw new ApiError(404, "Booking not found");
const owner = String((b as any).userId);
if (owner !== String(req.user._id) && req.user.role !== "admin") {
  throw new ApiError(403, "Forbidden");
}

  return res.json(new ApiResponse(200, shape(b)));
});

/** POST /bookings/:id/cancel — rider cancels before cutoff; seats returned */
export const cancelBooking = asyncHandler(async (req: any, res: Response) => {
    ensureAuthed(req);
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) throw new ApiError(400, "Invalid booking id");
  
    const b = await Booking.findById(id);
    if (!b) throw new ApiError(404, "Booking not found");
    if (b.userId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      throw new ApiError(403, "Not allowed");
    }
    if (b.status === "cancelled")
      return res.json(new ApiResponse(200, shape(await Booking.findById(id).populate(
        "tripId", "origin destination startTime pricePerSeat kind routeName"
      ).lean()), "Already cancelled"));
  
    const trip = await Trip.findById(b.tripId);
    if (!trip) throw new ApiError(404, "Trip not found");
  
    const cutoff = new Date(trip.startTime.getTime() - CANCEL_CUTOFF_MINUTES * 60 * 1000);
    if (new Date() >= cutoff)
      throw new ApiError(400, `Cannot cancel within ${CANCEL_CUTOFF_MINUTES} minutes of start`);
  
    const session = await startSession();
    try {
      await session.withTransaction(async () => {
        const updatedB = await Booking.findOneAndUpdate(
          { _id: b._id, status: { $ne: "cancelled" } },
          { $set: { status: "cancelled" } },
          { new: true, session }
        );
        if (!updatedB) return;
  
        await Trip.updateOne({ _id: trip._id }, { $inc: { seatsLeft: b.seats } }, { session });
      });
    } finally {
      session.endSession();
    }
  
    // ✅ Return shaped doc with trip summary (consistent with other endpoints)
    const fresh = await Booking.findById(b._id)
      .populate("tripId", "origin destination startTime pricePerSeat kind routeName")
      .lean();
  
    return res.json(new ApiResponse(200, shape(fresh), "Booking cancelled"));
  });

/** POST /bookings/:id/otp — (re)generate OTP for rider (overwrites previous hash) */
export const regenerateOtp = asyncHandler(async (req: any, res: Response) => {
  ensureAuthed(req);
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) throw new ApiError(400, "Invalid booking id");

  const b = await Booking.findById(id);
  if (!b) throw new ApiError(404, "Booking not found");
  if (b.userId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    throw new ApiError(403, "Not allowed");
  }
  if (b.status === "cancelled") throw new ApiError(400, "Booking cancelled");

  const trip = await Trip.findById(b.tripId);
  if (!trip) throw new ApiError(404, "Trip not found");

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 12);
  const base = Math.max(Date.now(), trip.startTime.getTime());
  const otpExpiresAt = new Date(base + 2 * 60 * 60 * 1000);

  b.otpHash = otpHash;
  b.otpExpiresAt = otpExpiresAt;
  b.verifiedAt = undefined;
  await b.save();

  return res.json(new ApiResponse(200, { id: b._id, otp, otpExpiresAt }, "OTP regenerated"));
});

/** POST /bookings/:id/verify-otp — driver verifies rider OTP at pickup (sets confirmed) */

// --- NEW: driver verifies OTP with only tripId + code (no booking id) ---
export const verifyOtpForTrip = asyncHandler(async (req: any, res: Response) => {
    ensureDriver(req);
  
    const { id: tripIdStr } = req.params;
    if (!Types.ObjectId.isValid(tripIdStr)) throw new ApiError(400, "Invalid trip id");
  
    const parsed = verifyOtpSchema.safeParse(req.body);
    if (!parsed.success) {
      const issues = parsed.error.issues.map(i => ({ path: i.path.join("."), message: i.message }));
      throw new ApiError(400, "Invalid request body", issues);
    }
    const { code } = parsed.data;
  
    // Ensure driver owns this trip (or admin)
    const trip = await Trip.findById(tripIdStr).select("driverId startTime");
    if (!trip) throw new ApiError(404, "Trip not found");
    const isOwner = trip.driverId.toString() === req.user._id.toString() || req.user.role === "admin";
    if (!isOwner) throw new ApiError(403, "Not your trip");
  
    // Look for a pending, non-expired booking on this trip whose hashed OTP matches `code`
    const candidates = await Booking.find({
      tripId: trip._id,
      status: { $ne: "cancelled" },
      otpHash: { $exists: true, $ne: null },
      otpExpiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: 1 }); // oldest first, collisions are rare but this is deterministic
  
    let match: any = null;
    for (const b of candidates) {
      if (b.verifiedAt) continue;
      const ok = await bcrypt.compare(code, b.otpHash);
      if (ok) { match = b; break; }
    }
  
    if (!match) throw new ApiError(401, "Invalid or expired OTP");
  
    if (!match.verifiedAt) {
      match.verifiedAt = new Date();
      match.status = "confirmed";
      await match.save();
    }
  
    return res.json(new ApiResponse(200, { id: match._id, verifiedAt: match.verifiedAt }, "OTP verified"));
  });
  export const listBookingsByTripForDriver = asyncHandler(async (req: any, res: Response) => {
    ensureDriver(req);
    const { tripId } = req.params;
    if (!isValidObjectId(tripId)) throw new ApiError(400, "Invalid trip id");
  
    const trip = await Trip.findById(tripId).select("driverId");
    if (!trip) throw new ApiError(404, "Trip not found");
    if (trip.driverId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      throw new ApiError(403, "Not your trip");
    }
  
    const rows = await Booking.find({
      tripId,
      status: { $ne: "cancelled" },
    })
      .sort({ createdAt: -1 })
      .select("_id userId seats status verifiedAt createdAt")
      .populate("userId", "name email")
      .lean();
  
    const shaped = rows.map((b: any) => ({
      _id: b._id,
      seats: b.seats,
      status: b.status,
      verifiedAt: b.verifiedAt,
      createdAt: b.createdAt,
      user: b.userId
        ? { _id: b.userId._id, name: b.userId.name, email: b.userId.email }
        : undefined,
    }));
  
    return res.json(new ApiResponse(200, shaped, "OK"));
  });