import { Request, Response } from "express";
import { Types, isValidObjectId, startSession } from "mongoose";
import bcrypt from "bcrypt";
import Trip from "../models/Trip.model";
import Booking from "../models/Booking.model";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { createBookingSchema, verifyOtpSchema } from "../validators/booking.schema";

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
function pad6(n: number) {
  return n.toString().padStart(6, "0");
}
function generateOtp(): string {
  return pad6(Math.floor(Math.random() * 1_000_000));
}

/** shape booking (+trip summary) for client */
function shape(b: any) {
  const trip = b.tripId && typeof b.tripId === "object" ? b.tripId : b.trip;
  const pricePerSeat =
    b.pricePerSeat ?? trip?.pricePerSeat ?? null; // tolerate old shapes
  const total =
    pricePerSeat != null && b.seats != null ? pricePerSeat * b.seats : null;

  return {
    _id: b._id,
    userId: b.userId,
    tripId: trip?._id || b.tripId, 
    seats: b.seats,
    status: b.status,
    verifiedAt: b.verifiedAt,
    createdAt: b.createdAt,

    // 🔹 what the frontend expects to render amounts
    pricePerSeat,
    total,

    // compact trip summary for UI
    trip:
      trip && {
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
 * - Idempotent per (userId, tripId): if existing active booking found, return it.
 * - Generates OTP (hashed) with expiry = trip.startTime + 2h (can be regenerated later).
 * - Booking starts as "pending" (driver will verify OTP at pickup → "confirmed").
 */
export const createBooking = asyncHandler(async (req: any, res: Response) => {
  ensureAuthed(req);
  const body = createBookingSchema.parse(req.body);
  const userId = new Types.ObjectId(req.user._id);
  const tripId = new Types.ObjectId(body.tripId);
  const seatsReq = body.seats;

  // Idempotency: if a non-cancelled booking already exists, just return it
  const existing = await Booking.findOne({
    userId,
    tripId,
    status: { $ne: "cancelled" },
  })
    .populate(
      "tripId",
      "origin destination startTime pricePerSeat kind routeName"
    )
    .lean();

  if (existing) {
    return res
      .status(200)
      .json(new ApiResponse(200, shape(existing), "Already booked (idempotent)"));
  }

  const trip = await Trip.findById(tripId);
  if (!trip) throw new ApiError(404, "Trip not found");
  if (trip.status !== "published")
    throw new ApiError(400, "Trip not open for booking");
  if (trip.startTime.getTime() <= Date.now())
    throw new ApiError(400, "Trip already started");
  if (seatsReq > trip.seatsLeft)
    throw new ApiError(400, "Not enough seats left");
  if (String(trip.driverId) === String(userId))
    throw new ApiError(400, "Driver cannot book own trip");

  // Prepare OTP now (stored hashed). We allow regenerate later.
  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 12);
  const otpExpiresAt = new Date(
    trip.startTime.getTime() + 2 * 60 * 60 * 1000
  ); // valid until 2h after start

  // Try a transaction; fall back to best-effort with compensation if not supported.
  const session = await startSession();
  try {
    await session.withTransaction(async () => {
      const updated = await Trip.findOneAndUpdate(
        {
          _id: tripId,
          status: "published",
          startTime: { $gt: new Date() },
          seatsLeft: { $gte: seatsReq },
        },
        { $inc: { seatsLeft: -seatsReq } },
        { new: true, session }
      );
      if (!updated)
        throw new ApiError(409, "Seats just sold out, try fewer seats");

      await Booking.create(
        [
          {
            userId,
            tripId,
            seats: seatsReq,
            status: "pending", // <— start pending; confirm via OTP
            otpHash,
            otpExpiresAt,
          },
        ],
        { session }
      );
    });

    const created = await Booking.findOne({ userId, tripId })
      .sort({ createdAt: -1 })
      .populate(
        "tripId",
        "origin destination startTime pricePerSeat kind routeName"
      )
      .lean();

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { booking: shape(created), otp },
          "Booking created"
        )
      );
  } catch (err: any) {
    // If transactions are not supported, do a two-step with compensation.
    if (String(err?.message || "").includes("Transaction")) {
      try {
        const updated = await Trip.findOneAndUpdate(
          {
            _id: tripId,
            status: "published",
            startTime: { $gt: new Date() },
            seatsLeft: { $gte: seatsReq },
          },
          { $inc: { seatsLeft: -seatsReq } },
          { new: true }
        );
        if (!updated)
          throw new ApiError(409, "Seats just sold out, try fewer seats");

        const created = await Booking.create({
          userId,
          tripId,
          seats: seatsReq,
          status: "pending",
          otpHash,
          otpExpiresAt,
        });

        const withTrip = await Booking.findById(created._id)
          .populate(
            "tripId",
            "origin destination startTime pricePerSeat kind routeName"
          )
          .lean();

        return res
          .status(201)
          .json(
            new ApiResponse(
              201,
              { booking: shape(withTrip), otp },
              "Booking created"
            )
          );
      } catch (e) {
        // compensate seats if booking creation failed
        await Trip.updateOne(
          { _id: tripId },
          { $inc: { seatsLeft: seatsReq } }
        );
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
    .populate(
      "tripId",
      "origin destination startTime pricePerSeat kind routeName"
    )
    .lean();

  return res.json(new ApiResponse(200, list.map(shape)));
});

export const getBooking = asyncHandler(async (req: any, res: Response) => {
  ensureAuthed(req);
  const { id } = req.params;
  if (!isValidObjectId(id)) throw new ApiError(400, "Invalid booking id");

  const b = await Booking.findById(id)
    .populate(
      "tripId",
      "origin destination startTime pricePerSeat kind routeName"
    )
    .lean();
  if (!b) throw new ApiError(404, "Booking not found");

  if (
    b.userId.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    throw new ApiError(403, "Forbidden");
  }

  return res.json(new ApiResponse(200, shape(b)));
});

export const cancelBooking = asyncHandler(async (req: any, res: Response) => {
  ensureAuthed(req);
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) throw new ApiError(400, "Invalid booking id");

  const b = await Booking.findById(id);
  if (!b) throw new ApiError(404, "Booking not found");
  if (
    b.userId.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    throw new ApiError(403, "Not allowed");
  }
  if (b.status === "cancelled")
    return res.json(new ApiResponse(200, b, "Already cancelled"));

  const trip = await Trip.findById(b.tripId);
  if (!trip) throw new ApiError(404, "Trip not found");

  const cutoff = new Date(
    trip.startTime.getTime() - CANCEL_CUTOFF_MINUTES * 60 * 1000
  );
  if (new Date() >= cutoff)
    throw new ApiError(
      400,
      `Cannot cancel within ${CANCEL_CUTOFF_MINUTES} minutes of start`
    );

  // Transactional update: set booking cancelled + return seats
  const session = await startSession();
  try {
    await session.withTransaction(async () => {
      const updatedB = await Booking.findOneAndUpdate(
        { _id: b._id, status: { $ne: "cancelled" } },
        { $set: { status: "cancelled" } },
        { new: true, session }
      );
      if (!updatedB) return; // already cancelled in race

      await Trip.updateOne(
        { _id: trip._id },
        { $inc: { seatsLeft: b.seats } },
        { session }
      );
    });
  } finally {
    session.endSession();
  }

  const fresh = await Booking.findById(b._id);
  return res.json(new ApiResponse(200, fresh, "Booking cancelled"));
});

/** POST /bookings/:id/otp — (re)generate OTP for rider (overwrites previous hash) */
export const regenerateOtp = asyncHandler(async (req: any, res: Response) => {
  ensureAuthed(req);
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) throw new ApiError(400, "Invalid booking id");

  const b = await Booking.findById(id);
  if (!b) throw new ApiError(404, "Booking not found");
  if (
    b.userId.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
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

  return res.json(
    new ApiResponse(200, { id: b._id, otp, otpExpiresAt }, "OTP regenerated")
  );
});

/** POST /bookings/:id/verify-otp — driver verifies rider OTP at pickup (sets confirmed) */
export const verifyOtp = asyncHandler(async (req: any, res: Response) => {
  ensureDriver(req);
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) throw new ApiError(400, "Invalid booking id");

  const { code } = verifyOtpSchema.parse(req.body);

  const b = await Booking.findById(id);
  if (!b) throw new ApiError(404, "Booking not found");

  // Ensure this driver owns the trip
  const trip = await Trip.findById(b.tripId).select("driverId startTime");
  if (!trip) throw new ApiError(404, "Trip not found");
  if (
    trip.driverId.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    throw new ApiError(403, "Not your trip");
  }

  if (!b.otpHash || !b.otpExpiresAt)
    throw new ApiError(400, "OTP not set for this booking");
  if (b.otpExpiresAt.getTime() < Date.now())
    throw new ApiError(400, "OTP expired");

  const ok = await bcrypt.compare(code, b.otpHash);
  if (!ok) throw new ApiError(401, "Invalid OTP");

  if (!b.verifiedAt) {
    b.verifiedAt = new Date();
    b.status = "confirmed"; 
    await b.save();
  }

  return res.json(
    new ApiResponse(200, { id: b._id, verifiedAt: b.verifiedAt }, "OTP verified")
  );
});
