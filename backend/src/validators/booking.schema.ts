// src/validators/booking.schema.ts
import { z } from "zod";

export const createBookingSchema = z.object({
  // accept only valid 24-char hex, but give a clear error if missing
  tripId: z
    .string({ required_error: "tripId is required" })
    .regex(/^[0-9a-fA-F]{24}$/, "tripId must be a valid ObjectId"),
  // accept number OR numeric string (e.g. "3")
  seats: z
    .coerce.number({ required_error: "seats is required" })
    .int()
    .min(1, "seats must be at least 1")
    .max(6, "seats cannot exceed 6"),
});

export const verifyOtpSchema = z.object({
  code: z
    .coerce.string({ required_error: "code is required" })
  .trim()
  .regex(/^\d{6}$/, "code must be 6 digits"),
});
