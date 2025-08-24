import { Schema, model, Types } from 'mongoose';
export const VehicleSchema = new Schema({
  userId: { type: Types.ObjectId, ref: 'User', index: true, required: true },
  make: String, model: String,
  plateNumber: { type: String, unique: true },
  seats: { type: Number, min: 1 }
}, { timestamps: false });
export default model('Vehicle', VehicleSchema);