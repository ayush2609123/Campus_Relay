import { z } from "zod";

export const createVehicleSchema = z.object({
  make: z.string().min(1).max(60),
  model: z.string().min(1).max(60),
  plateNumber: z.string().min(3).max(20),
  seats: z.number().int().min(1).max(8)
});

export const updateVehicleSchema = z.object({
  make: z.string().min(1).max(60).optional(),
  model: z.string().min(1).max(60).optional(),
  plateNumber: z.string().min(3).max(20).optional(),
  seats: z.number().int().min(1).max(8).optional()
}).refine(v => Object.keys(v).length > 0, { message: "Provide at least one field" });

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
