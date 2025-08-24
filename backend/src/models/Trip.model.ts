// src/models/Trip.model.ts
import { Schema, model, Types } from "mongoose";

const PlaceSchema = new Schema(
  {
    name: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String },
    hubId: { type: Types.ObjectId, ref: "Hub" }, // optional, for preset hubs
  },
  { _id: false }
);

const TripSchema = new Schema(
  {
    // NEW: Shuttle vs Carpool
    kind: {
      type: String,
      enum: ["carpool", "shuttle"],
      default: "carpool",
      index: true,
    },
    // Optional display label for shuttles
    routeName: { type: String },
    // Optional intermediate stops (same shape as origin/destination)
    stops: { type: [PlaceSchema], default: [] },

    driverId: { type: Types.ObjectId, ref: "User", index: true, required: true },
    vehicleId: { type: Types.ObjectId, ref: "Vehicle" },

    origin: { type: PlaceSchema, required: true },
    destination: { type: PlaceSchema, required: true },

    startTime: { type: Date, index: true, required: true },
    pricePerSeat: { type: Number, min: 0, required: true },
    totalSeats: { type: Number, min: 1, required: true },
    seatsLeft: { type: Number, min: 0, required: true },

    status: {
      type: String,
      enum: ["draft", "published", "ongoing", "completed", "cancelled"],
      default: "published",
      index: true,
    },
  },
  { timestamps: true }
);

// helpful indexes
TripSchema.index({ "origin.lat": 1, "origin.lng": 1 });
TripSchema.index({ "destination.lat": 1, "destination.lng": 1 });

export const Trip = model("Trip", TripSchema);
export default Trip;
