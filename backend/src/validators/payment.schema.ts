import { z } from "zod";

export const createPaymentIntentSchema = z.object({
  bookingId: z.string().min(1, "bookingId required"),
  amount: z.number().positive("amount must be > 0")
});

export const updatePaymentStatusSchema = z.object({
  status: z.enum(["success", "failed"])
});
