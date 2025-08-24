import { z } from "zod";

export const postLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  speed: z.number().min(0).max(300).optional(),
  heading: z.number().min(0).max(360).optional(),
  ts: z.string().datetime().optional() // allow client timestamp; fallback to server time
});

export const getTrailQuerySchema = z.object({
  limit: z.string().optional().transform(v => (v ? Math.min(500, Math.max(1, parseInt(v, 10))) : 100)),
  since: z.string().datetime().optional() // ISO string; returns points >= since
});
