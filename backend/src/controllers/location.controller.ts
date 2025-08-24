import { Request, Response } from "express";
import { Types } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import Trip from "../models/Trip.model";
import TripLocation from "../models/TripLocation.model";
import Booking from "../models/Booking.model";
import { postLocationSchema, getTrailQuerySchema } from "../validators/location.schema";

/** simple in-memory rate limiter: max 2 posts/sec per (driverId, tripId) */
const lastPostMap = new Map<string, number>();
function rateLimit(driverId: string, tripId: string) {
  const key = `${driverId}:${tripId}`;
  const now = Date.now();
  const last = lastPostMap.get(key) || 0;
  if (now - last < 500) return false; // 2 per second
  lastPostMap.set(key, now);
  return true;
}

/** ensure driver owns the trip */
async function ensureTripOwner(req: any, tripId: string) {
  if (!req.user?._id) throw new ApiError(401, "Unauthorized");
  const trip = await Trip.findById(tripId).select("_id driverId status startTime");
  if (!trip) throw new ApiError(404, "Trip not found");

  const isOwner = trip.driverId.toString() === req.user._id.toString() || req.user.role === "admin";
  if (!isOwner) throw new ApiError(403, "Not your trip");
  return trip;
}

/** POST /locations/:tripId — driver posts a live location point */
export const postLiveLocation = asyncHandler(async (req: any, res: Response) => {
  const { tripId } = req.params;
  if (!Types.ObjectId.isValid(tripId)) throw new ApiError(400, "Invalid trip id");

  const trip = await ensureTripOwner(req, tripId);

  // optional: allow while published/ongoing; typically expected during 'ongoing'
  if (!["published", "ongoing"].includes(trip.status)) {
    throw new ApiError(400, `Cannot post location for ${trip.status} trip`);
  }

  if (!rateLimit(req.user._id.toString(), tripId)) {
    throw new ApiError(429, "Too many updates; max 2 per second");
  }

  const body = postLocationSchema.parse(req.body);
  const doc = await TripLocation.create({
    tripId: new Types.ObjectId(tripId),
    lat: body.lat,
    lng: body.lng,
    speed: body.speed,
    heading: body.heading,
    ts: body.ts ? new Date(body.ts) : new Date()
  });

  // (optional) prune very old points: keep last 2000 per trip (best-effort)
  void TripLocation.deleteMany({ tripId, ts: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }).exec();

  return res.status(201).json(new ApiResponse(201, { id: doc._id, ts: doc.ts }, "Location appended"));
});

/** GET /locations/:tripId — authorized users fetch recent trail
 * Allowed:
 *  - Trip driver/admin
 *  - Riders who have a booking on that trip
 */
export const getLiveTrail = asyncHandler(async (req: any, res: Response) => {
  const { tripId } = req.params;
  if (!Types.ObjectId.isValid(tripId)) throw new ApiError(400, "Invalid trip id");

  const q = getTrailQuerySchema.parse(req.query);

  if (!req.user?._id) throw new ApiError(401, "Unauthorized");

  const trip = await Trip.findById(tripId).select("_id driverId");
  if (!trip) throw new ApiError(404, "Trip not found");

  const isDriver = trip.driverId.toString() === req.user._id.toString() || req.user.role === "admin";
  let isRider = false;

  if (!isDriver) {
    const booking = await Booking.findOne({ tripId, userId: req.user._id, status: { $ne: "cancelled" } }).select("_id");
    if (booking) isRider = true;
  }
  if (!isDriver && !isRider) throw new ApiError(403, "Not allowed to view this trail");

  const filter: any = { tripId };
  if (q.since) filter.ts = { $gte: new Date(q.since) };

  const points = await TripLocation.find(filter)
    .sort({ ts: -1 })
    .limit(q.limit);

  // return in ascending time order for easier plotting
  const ordered = points.reverse();

  return res.json(new ApiResponse(200, ordered, "OK"));
});
