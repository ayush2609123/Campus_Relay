import { Schema, model, models, InferSchemaType, Types } from "mongoose";

const RefreshTokenSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", index: true, required: true },
    tokenHash: { type: String, required: true },
    userAgent: String,
    ip: String,
    revokedAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export type RefreshTokenDoc = InferSchemaType<typeof RefreshTokenSchema>;
export default models.RefreshToken || model("RefreshToken", RefreshTokenSchema);
