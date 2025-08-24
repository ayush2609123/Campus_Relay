import { Schema, model, Types } from "mongoose";

const PaymentIntentSchema = new Schema({
  bookingId: { type: Types.ObjectId, ref: "Booking", index: true, required: true },
  upiUri: { type: String, required: true },
  status: { type: String, enum: ["initiated", "success", "failed"], index: true, default: "initiated" },
  idem: { type: String, index: true },
  createdAt: { type: Date, default: () => new Date() },
  completedAt: Date,
});

// Helpful uniqueness (optional): one record per (booking, idem)
PaymentIntentSchema.index({ bookingId: 1, idem: 1 }, { unique: true, sparse: true });

export default model("PaymentIntent", PaymentIntentSchema);
