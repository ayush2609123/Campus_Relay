import { Request, Response } from "express";
import { Types } from "mongoose";
import Vehicle from "../models/Vehicle.model";
import Trip from "../models/Trip.model";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { createVehicleSchema, updateVehicleSchema } from "../validators/vehicle.schema";

function ensureDriver(req: any) {
  if (!req.user?._id) throw new ApiError(401, "Unauthorized");
  if (req.user.role !== "driver" && req.user.role !== "admin") {
    throw new ApiError(403, "Driver role required");
  }
}

/** POST /vehicles — add a vehicle (driver only) */
export const createVehicle = asyncHandler(async (req: any, res: Response) => {
  ensureDriver(req);
  const body = createVehicleSchema.parse(req.body);

  const vehicle = await Vehicle.create({
    userId: new Types.ObjectId(req.user._id),
    make: body.make.trim(),
    model: body.model.trim(),
    plateNumber: body.plateNumber.trim().toUpperCase(),
    seats: body.seats
  });

  return res.status(201).json(new ApiResponse(201, vehicle, "Vehicle created"));
});

/** GET /vehicles/my — list my vehicles (driver only) */
export const listMyVehicles = asyncHandler(async (req: any, res: Response) => {
  ensureDriver(req);
  const items = await Vehicle.find({ userId: req.user._id }).sort({ _id: -1 });
  return res.json(new ApiResponse(200, items, "OK"));
});

/** PATCH /vehicles/:id — update (owner only) */
export const updateVehicle = asyncHandler(async (req: any, res: Response) => {
  ensureDriver(req);
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) throw new ApiError(400, "Invalid vehicle id");

  const payload = updateVehicleSchema.parse(req.body);
  const v = await Vehicle.findById(id);
  if (!v) throw new ApiError(404, "Vehicle not found");
  if (v.userId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    throw new ApiError(403, "Not your vehicle");
  }

  if (payload.make) v.make = payload.make.trim();
  if (payload.model) v.model = payload.model.trim();
  if (payload.plateNumber) v.plateNumber = payload.plateNumber.trim().toUpperCase();
  if (typeof payload.seats === "number") v.seats = payload.seats;

  try {
    await v.save();
    return res.json(new ApiResponse(200, v, "Vehicle updated"));
  } catch (err: any) {
    if (err?.code === 11000) throw new ApiError(409, "plateNumber already exists");
    throw err;
  }
});

/** DELETE /vehicles/:id — delete (owner only, blocked if used in future trips) */
export const deleteVehicle = asyncHandler(async (req: any, res: Response) => {
  ensureDriver(req);
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) throw new ApiError(400, "Invalid vehicle id");

  const v = await Vehicle.findById(id);
  if (!v) throw new ApiError(404, "Vehicle not found");
  if (v.userId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    throw new ApiError(403, "Not your vehicle");
  }

  // block deletion if any upcoming trip references this vehicle
  const inUse = await Trip.findOne({
    vehicleId: v._id,
    startTime: { $gte: new Date() },
    status: { $in: ["published", "ongoing"] }
  }).select("_id");
  if (inUse) throw new ApiError(400, "Vehicle is assigned to upcoming trips");

  await v.deleteOne();
  return res.json(new ApiResponse(200, { id: v._id.toString() }, "Vehicle deleted"));
});
