import { z } from "zod";

export const createHubSchema = z.object({
  name: z.string().min(1).max(120),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().optional(),
  tags: z.array(z.string()).optional()
});

export const updateHubSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  address: z.string().optional(),
  tags: z.array(z.string()).optional()
}).refine(v => Object.keys(v).length > 0, { message: "Provide at least one field" });

export const listHubsQuerySchema = z.object({
  q: z.string().optional(),
  tag: z.string().optional(),
  limit: z.string().optional().transform(v => (v ? Math.min(100, Math.max(1, parseInt(v, 10))) : 50))
});
