import { Schema, model } from 'mongoose';
export const UserSchema = new Schema({
  name: String,
  email: { 
    type: String,
     unique: true,
      index: true,
       lowercase: true, 
       trim: true,
       required: true
     },
  passwordHash: { type: String, required: true },
  phone: { type: String, unique: true, sparse: true },
  role: { type: String, enum: ['rider','driver','admin'], default: 'rider' }
}, { timestamps: true });
export default model('User', UserSchema);