import { Schema, model, models, InferSchemaType, Types } from "mongoose";

const BookingSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", index: true, required: true },
    tripId: { type: Types.ObjectId, ref: "Trip", index: true, required: true },
    seats: { type: Number, min: 1, default: 1 },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
      index: true,
    },
    otpHash: { type: String, required: true }, // store hash only
    otpExpiresAt: { type: Date, index: true },
    verifiedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// NOTE: TTL index would delete docs; we only expire validation in code.

export type BookingDoc = InferSchemaType<typeof BookingSchema>;
export default models.Booking || model("Booking", BookingSchema);
