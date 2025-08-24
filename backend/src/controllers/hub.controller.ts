import { Request, Response } from "express";
import { Types } from "mongoose";
import Hub from "../models/Hub.model";
import Trip from "../models/Trip.model";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { createHubSchema, updateHubSchema, listHubsQuerySchema } from "../validators/hub.schema";

function ensureAdmin(req: any) {
  if (!req.user?._id) throw new ApiError(401, "Unauthorized");
  if (req.user.role !== "admin") throw new ApiError(403, "Admin only");
}

/** GET /hubs?q=&tag=&limit= */
export const listHubs = asyncHandler(async (req: Request, res: Response) => {
  const qv = listHubsQuerySchema.parse(req.query);

  const filter: any = {};
  if (qv.q) filter.name = { $regex: qv.q, $options: "i" };
  if (qv.tag) filter.tags = { $in: [qv.tag] };

  const hubs = await Hub.find(filter).sort({ name: 1 }).limit(qv.limit);
  return res.json(new ApiResponse(200, hubs, "OK"));
});

/** GET /hubs/:id */
export const getHub = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) throw new ApiError(400, "Invalid hub id");
  const hub = await Hub.findById(id);
  if (!hub) throw new ApiError(404, "Hub not found");
  return res.json(new ApiResponse(200, hub, "OK"));
});

/** POST /hubs (admin) */
export const createHub = asyncHandler(async (req: any, res: Response) => {
  ensureAdmin(req);
  const body = createHubSchema.parse(req.body);

  const exists = await Hub.findOne({ name: new RegExp(`^${body.name}$`, "i") });
  if (exists) throw new ApiError(409, "Hub with this name already exists");

  const hub = await Hub.create({
    name: body.name.trim(),
    lat: body.lat,
    lng: body.lng,
    address: body.address,
    tags: body.tags ?? []
  });

  return res.status(201).json(new ApiResponse(201, hub, "Hub created"));
});

/** PATCH /hubs/:id (admin) */
export const updateHub = asyncHandler(async (req: any, res: Response) => {
  ensureAdmin(req);
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) throw new ApiError(400, "Invalid hub id");
  const payload = updateHubSchema.parse(req.body);

  if (payload.name) {
    const dup = await Hub.findOne({ _id: { $ne: id }, name: new RegExp(`^${payload.name}$`, "i") });
    if (dup) throw new ApiError(409, "Another hub with this name exists");
  }

  const updated = await Hub.findByIdAndUpdate(id, { $set: payload }, { new: true, runValidators: true });
  if (!updated) throw new ApiError(404, "Hub not found");
  return res.json(new ApiResponse(200, updated, "Hub updated"));
});

/** DELETE /hubs/:id (admin; blocked if any trip references it) */
export const deleteHub = asyncHandler(async (req: any, res: Response) => {
  ensureAdmin(req);
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) throw new ApiError(400, "Invalid hub id");

  const inUse = await Trip.findOne({
    $or: [{ "origin.hubId": id }, { "destination.hubId": id }],
    status: { $in: ["published", "ongoing"] }
  }).select("_id");

  if (inUse) throw new ApiError(400, "Hub is referenced by active trips");

  const hub = await Hub.findById(id);
  if (!hub) throw new ApiError(404, "Hub not found");

  await hub.deleteOne();
  return res.json(new ApiResponse(200, { id: hub._id.toString() }, "Hub deleted"));
});
