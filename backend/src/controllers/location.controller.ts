import { Request, Response } from "express";
import { Types, isValidObjectId } from "mongoose";
import Trip from "../models/Trip.model";
import Booking from "../models/Booking.model";
import TripLocation from "../models/TripLocation.model";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";

/** helpers */
function ensureAuthed(req: any) {
  if (!req.user?._id) throw new ApiError(401, "Unauthorized");
}

/** Can this user view trip trail? driver/admin OR rider with a booking (not cancelled) */
async function canView(user: any, tripId: string) {
  if (user?.role === "admin") return true;
  const trip = await Trip.findById(tripId).select("driverId");
  if (!trip) throw new ApiError(404, "Trip not found");
  if (String(trip.driverId) === String(user._id)) return true;
  const b = await Booking.findOne({
    tripId,
    userId: user._id,
    status: { $ne: "cancelled" },
  }).select("_id");
  return !!b;
}

/** Can this user post driver location? driver/admin only + trip ongoing */
async function canPost(user: any, tripId: string) {
  const trip = await Trip.findById(tripId).select("driverId status");
  if (!trip) throw new ApiError(404, "Trip not found");
  const isOwner = String(trip.driverId) === String(user._id);
  if (!isOwner && user.role !== "admin") throw new ApiError(403, "Not your trip");
  if (trip.status !== "ongoing") throw new ApiError(400, "Trip must be ongoing");
  return true;
}

/** POST /api/locations/:tripId  body:{lat,lng,speed?,heading?} */
export const postLiveLocation = asyncHandler(async (req: any, res: Response) => {
  ensureAuthed(req);
  const { tripId } = req.params;
  if (!isValidObjectId(tripId)) throw new ApiError(400, "Invalid trip id");

  const { lat, lng, speed, heading } = req.body || {};
  if (typeof lat !== "number" || typeof lng !== "number") {
    throw new ApiError(400, "lat & lng are required numbers");
  }

  await canPost(req.user, tripId);

  const point = await TripLocation.create({
    tripId: new Types.ObjectId(tripId),
    lat,
    lng,
    speed,
    heading,
  });

  res.status(201).json(new ApiResponse(201, point, "ok"));
});

/** GET /api/locations/:tripId?limit=200 */
export const getTrail = asyncHandler(async (req: any, res: Response) => {
  ensureAuthed(req);
  const { tripId } = req.params;
  const limit = Math.min(Number(req.query.limit ?? 200), 1000);

  if (!isValidObjectId(tripId)) throw new ApiError(400, "Invalid trip id");
  const allowed = await canView(req.user, tripId);
  if (!allowed) throw new ApiError(403, "Not allowed");

  const trail = await TripLocation.find({ tripId })
    .sort({ ts: -1 })
    .limit(limit)
    .lean();

  // return oldest→newest for polylines
  res.json(new ApiResponse(200, trail.reverse(), "ok"));
});
