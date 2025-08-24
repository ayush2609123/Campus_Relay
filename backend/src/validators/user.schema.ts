import { z } from "zod";

export const updateMeSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  phone: z.string().min(8).max(20).optional()
}).refine((v) => Object.keys(v).length > 0, {
  message: "Provide at least one field to update"
});

export type UpdateMeInput = z.infer<typeof updateMeSchema>;
