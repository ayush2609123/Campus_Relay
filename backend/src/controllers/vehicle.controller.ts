import { Request, Response } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import Vehicle from "../models/Vehicle.model"; // or ../models/Vehicle if your file name differs
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";

function ensureDriver(req: any) {
  if (!req.user?._id) throw new ApiError(401, "Unauthorized");
  if (!["driver","admin"].includes(req.user.role)) {
    throw new ApiError(403, "Driver role required");
  }
}

const upsertSchema = z.object({
  make: z.string().min(1, "Make required"),
  model: z.string().min(1, "Model required"),
  plateNumber: z.string().min(2, "Plate required"),
  seats: z.number().int().min(1).max(8),
});

export const listMyVehicles = asyncHandler(async (req: any, res: Response) => {
  ensureDriver(req);
  const docs = await Vehicle.find({ userId: req.user._id }).sort({ _id: -1 });
  res.json(new ApiResponse(200, docs, "OK"));
});

export const createVehicle = asyncHandler(async (req: any, res: Response) => {
  ensureDriver(req);
  const body = upsertSchema.parse({
    ...req.body,
    seats: Number(req.body?.seats),
  });

  const v = await Vehicle.create({
    userId: req.user._id,
    ...body,
  });

  res.status(201).json(new ApiResponse(201, v, "Vehicle created"));
});

export const updateVehicle = asyncHandler(async (req: any, res: Response) => {
  ensureDriver(req);
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) throw new ApiError(400, "Invalid vehicle id");

  const body = upsertSchema.partial().refine(v => Object.keys(v).length > 0, {
    message: "No fields to update",
  }).parse({
    ...req.body,
    seats: req.body?.seats != null ? Number(req.body.seats) : undefined,
  });

  const v = await Vehicle.findOne({ _id: id, userId: req.user._id });
  if (!v) throw new ApiError(404, "Vehicle not found");

  Object.assign(v, body);
  await v.save();
  res.json(new ApiResponse(200, v, "Vehicle updated"));
});

export const deleteVehicle = asyncHandler(async (req: any, res: Response) => {
  ensureDriver(req);
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) throw new ApiError(400, "Invalid vehicle id");

  const v = await Vehicle.findOneAndDelete({ _id: id, userId: req.user._id });
  if (!v) throw new ApiError(404, "Vehicle not found");

  res.json(new ApiResponse(200, { id }, "Vehicle deleted"));
});
