import { Schema, model, models, InferSchemaType, Types } from "mongoose";

const TripLocationSchema = new Schema(
  {
    tripId: { type: Types.ObjectId, ref: "Trip", index: true, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    speed: Number,
    heading: Number,
    ts: { type: Date, default: () => new Date(), index: true },
  },
  { timestamps: false }
);

TripLocationSchema.index({ lat: 1, lng: 1 });

export type TripLocationDoc = InferSchemaType<typeof TripLocationSchema>;
export default models.TripLocation || model("TripLocation", TripLocationSchema);
