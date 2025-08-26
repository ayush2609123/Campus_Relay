import { Schema, model, Types } from "mongoose";

const TripLocationSchema = new Schema(
  {
    tripId: { type: Types.ObjectId, ref: "Trip", index: true, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    speed: Number,
    heading: Number,
    ts: { type: Date, default: () => new Date(), index: true },
  },
  { versionKey: false }
);

TripLocationSchema.index({ lat: 1, lng: 1 });

export type TripLocationDoc = {
  _id: string;
  tripId: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  ts: string;
};

export default model("TripLocation", TripLocationSchema);
