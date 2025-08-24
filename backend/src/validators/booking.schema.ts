import { z } from "zod";

export const createBookingSchema = z.object({
  tripId: z.string().min(1, "tripId required"),
  seats: z.number().int().min(1).max(6).default(1)
});

export const verifyOtpSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "6-digit code required")
});
