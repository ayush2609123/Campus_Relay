import { Schema, model } from 'mongoose';
export const HubSchema = new Schema({
  name: { type: String, index: true },
  lat: Number, lng: Number,
  address: String,
  tags: [String]
});
HubSchema.index({ lat: 1, lng: 1 }); // basic; upgrade to 2dsphere if using GeoJSON
export default model('Hub', HubSchema);