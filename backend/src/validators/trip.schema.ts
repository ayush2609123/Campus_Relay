import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

const placeSchema = z.object({
  name: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  address: z.string().optional(),
  hubId: objectId.optional(),
});

export const createTripSchema = z.object({
  origin: placeSchema,
  destination: placeSchema,
  startTime: z.string().datetime(),
  pricePerSeat: z.number().min(0),
  totalSeats: z.number().int().min(1),
  kind: z.enum(["carpool", "shuttle"]).optional(),
  routeName: z.string().optional(),
  vehicleId: objectId.optional(),
});

// allow partial updates
export const updateTripSchema = createTripSchema.partial();
