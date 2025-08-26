import { Request, Response } from "express";
import { Types, isValidObjectId } from "mongoose";
import Trip from "../models/Trip.model";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { createTripSchema, updateTripSchema } from "../validators/trip.schema";

/** Helper: ensure current user is driver (role check kept local for now) */
function ensureDriver(req: any) {
  if (!req.user?._id) throw new ApiError(401, "Unauthorized");
  if (req.user.role !== "driver" && req.user.role !== "admin") {
    throw new ApiError(403, "Driver role required");
  }
}

/** Helper: ensure ownership of a trip */
function assertOwner(req: any, trip: any) {
  const uid = req.user?._id?.toString();
  if (!uid) throw new ApiError(401, "Unauthorized");
  if (trip.driverId.toString() !== uid && req.user.role !== "admin") {
    throw new ApiError(403, "Not your trip");
  }
}

/** ---- Place sanitizers --------------------------------------------------- */
type PlaceIn = { name: string; lat: number; lng: number; address?: string; hubId?: string };
function normalizePlace(p?: PlaceIn | null) {
  if (!p || p.lat == null || p.lng == null || !p.name?.trim()) {
    throw new ApiError(400, "Place requires name, lat, lng");
  }
  const out: any = {
    name: String(p.name).trim(),
    lat: Number(p.lat),
    lng: Number(p.lng),
  };
  if (p.address) out.address = String(p.address);
  // only include hubId if it’s a valid Mongo ObjectId
  if (p.hubId && isValidObjectId(p.hubId)) {
    out.hubId = new Types.ObjectId(p.hubId);
  }
  return out;
}

function normalizeStops(stops: any[] = []) {
  return stops.map((s) => normalizePlace(s));
}

/** POST /trips — create (driver only) */
export const createTrip = asyncHandler(async (req: any, res: Response) => {
    const user = req.user;
    if (!user || (user.role !== "driver" && user.role !== "admin")) {
      throw new ApiError(403, "Only driver/admin can create trips");
    }
  
    const {
      kind = "carpool",
      routeName,
      stops = [],
      origin,
      destination,
      startTime,
      pricePerSeat,
      totalSeats,
      vehicleId,
    } = req.body;
  
    if (!origin?.name || origin.lat == null || origin.lng == null) {
      throw new ApiError(400, "origin requires name, lat, lng");
    }
    if (!destination?.name || destination.lat == null || destination.lng == null) {
      throw new ApiError(400, "destination requires name, lat, lng");
    }
    if (!startTime || pricePerSeat == null || totalSeats == null) {
      throw new ApiError(400, "startTime, pricePerSeat, totalSeats are required");
    }
  
    // Sanitize hubId: keep only real ObjectId values
    const cleanPlace = (p: any) => ({
      name: p.name,
      lat: Number(p.lat),
      lng: Number(p.lng),
      address: p.address,
      ...(p.hubId && isValidObjectId(p.hubId) ? { hubId: new Types.ObjectId(p.hubId) } : {}),
    });
  
    const cleanOrigin = cleanPlace(origin);
    const cleanDestination = cleanPlace(destination);
  
    // Optional: basic sanity for shuttle stops
    if (kind === "shuttle") {
      for (const s of stops) {
        if (!s?.name || typeof s.lat !== "number" || typeof s.lng !== "number") {
          throw new ApiError(400, "Each stop must have name, lat, lng");
        }
      }
    }
  
    const trip = await Trip.create({
      kind,
      routeName: routeName ?? (kind === "shuttle" ? `${origin.name} → ${destination.name} Shuttle` : undefined),
      stops,
      driverId: user._id,
      vehicleId: vehicleId && isValidObjectId(vehicleId) ? new Types.ObjectId(vehicleId) : undefined,
      origin: cleanOrigin,
      destination: cleanDestination,
      startTime: new Date(startTime),
      pricePerSeat: Number(pricePerSeat),
      totalSeats: Number(totalSeats),
      seatsLeft: Number(totalSeats),
      status: "published",
    });
  
    return res.status(201).json(new ApiResponse(201, trip, "Trip created"));
  });

/** GET /trips/:id — fetch details */
export const getTrip = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) throw new ApiError(400, "Invalid trip id");
  const trip = await Trip.findById(id);
  if (!trip) throw new ApiError(404, "Trip not found");
  return res.json(new ApiResponse(200, trip, "OK"));
});

/** GET /trips/search — query by hub/date/time */
export const searchTrips = asyncHandler(async (req: any, res: Response) => {
  const { q, date, seats, limit = 20, kind } = req.query as Record<string, string>;
  const match: any = { status: "published" };

  if (kind === "carpool") {
    match.$or = [{ kind: "carpool" }, { kind: { $exists: false } }];
  } else if (kind === "shuttle") {
    match.kind = "shuttle";
  }

  if (q) {
    match.$or = (match.$or || []).concat([
      { "origin.name": { $regex: q, $options: "i" } },
      { "destination.name": { $regex: q, $options: "i" } },
    ]);
  }

  if (date) {
    const d0 = new Date(date);
    const d1 = new Date(d0);
    d1.setDate(d1.getDate() + 1);
    match.startTime = { $gte: d0, $lt: d1 };
  }

  if (seats) {
    const n = Number(seats);
    if (!Number.isNaN(n) && n > 0) match.seatsLeft = { $gte: n };
  }

  const docs = await Trip.find(match).sort({ startTime: 1 }).limit(Math.min(Number(limit) || 20, 100));
  return res.json(new ApiResponse(200, docs));
});

/** GET /trips/my — driver’s own trips */
export const myTrips = asyncHandler(async (req: any, res: Response) => {
  ensureDriver(req);
  const trips = await Trip.find({ driverId: req.user._id })
    .sort({ startTime: -1 })
    .limit(100)
    .lean();
  return res.json(new ApiResponse(200, trips, "OK"));
});

/** PATCH /trips/:id — update editable fields (owner only, before start) */
export const updateTrip = asyncHandler(async (req: any, res: Response) => {
  ensureDriver(req);
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) throw new ApiError(400, "Invalid trip id");

  const payload = updateTripSchema.parse(req.body);
  const trip = await Trip.findById(id);
  if (!trip) throw new ApiError(404, "Trip not found");
  assertOwner(req, trip);

  if (new Date(trip.startTime).getTime() <= Date.now()) {
    throw new ApiError(400, "Cannot modify a trip that has started");
  }
  if (["cancelled", "completed"].includes(trip.status)) {
    throw new ApiError(400, `Cannot modify a ${trip.status} trip`);
  }

  if (typeof payload.totalSeats === "number") {
    const booked = trip.totalSeats - trip.seatsLeft;
    if (payload.totalSeats < booked) {
      throw new ApiError(400, `totalSeats cannot be less than already booked (${booked})`);
    }
    trip.seatsLeft = payload.totalSeats - booked;
    trip.totalSeats = payload.totalSeats;
  }

  if (payload.pricePerSeat !== undefined) trip.pricePerSeat = payload.pricePerSeat;
  if (payload.startTime) trip.startTime = new Date(payload.startTime);
  if (payload.vehicleId && isValidObjectId(payload.vehicleId)) {
    if (payload.vehicleId) {
        (trip as any).vehicleId = payload.vehicleId; // let mongoose cast
      } else {
        (trip as any).vehicleId = undefined;
      }  }

  if (payload.origin) trip.origin = normalizePlace(payload.origin as any);
  if (payload.destination) trip.destination = normalizePlace(payload.destination as any);
//   if (Array.isArray(payload.stops)) trip.set("stops", normalizeStops(payload.stops as any[]));

  await trip.save();
  return res.json(new ApiResponse(200, trip, "Trip updated"));
});

/** POST /trips/:id/publish — set status=published (owner/admin) */
export const publishTrip = asyncHandler(async (req: any, res: Response) => {
  ensureDriver(req);
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) throw new ApiError(400, "Invalid trip id");

  const trip = await Trip.findById(id);
  if (!trip) throw new ApiError(404, "Trip not found");
  assertOwner(req, trip);

  if (trip.status === "cancelled" || trip.status === "completed") {
    throw new ApiError(400, `Cannot publish a ${trip.status} trip`);
  }
  trip.status = "published";
  await trip.save();
  return res.json(new ApiResponse(200, trip, "Trip published"));
});

/** POST /trips/:id/cancel — cancel (owner/admin) */
export const cancelTrip = asyncHandler(async (req: any, res: Response) => {
  ensureDriver(req);
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) throw new ApiError(400, "Invalid trip id");

  const trip = await Trip.findById(id);
  if (!trip) throw new ApiError(404, "Trip not found");
  assertOwner(req, trip);

  if (trip.status === "completed" || trip.status === "cancelled") {
    throw new ApiError(400, `Trip already ${trip.status}`);
  }
  trip.status = "cancelled";
  await trip.save();
  return res.json(new ApiResponse(200, trip, "Trip cancelled"));
});

/** POST /trips/:id/start — mark ongoing (owner/admin) */
export const startTrip = asyncHandler(async (req: any, res: Response) => {
  ensureDriver(req);
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) throw new ApiError(400, "Invalid trip id");

  const trip = await Trip.findById(id);
  if (!trip) throw new ApiError(404, "Trip not found");
  assertOwner(req, trip);

  if (trip.status !== "published") throw new ApiError(400, "Trip must be published to start");
  trip.status = "ongoing";
  await trip.save();
  return res.json(new ApiResponse(200, trip, "Trip started"));
});

/** POST /trips/:id/complete — mark completed (owner/admin) */
export const completeTrip = asyncHandler(async (req: any, res: Response) => {
  ensureDriver(req);
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) throw new ApiError(400, "Invalid trip id");

  const trip = await Trip.findById(id);
  if (!trip) throw new ApiError(404, "Trip not found");
  assertOwner(req, trip);

  if (trip.status !== "ongoing") throw new ApiError(400, "Trip must be ongoing to complete");
  trip.status = "completed";
  await trip.save();
  return res.json(new ApiResponse(200, trip, "Trip completed"));
});
