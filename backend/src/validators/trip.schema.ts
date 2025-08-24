import { z } from "zod";

// helper: coerce to number (handles strings sent by forms)
const zNum = z.coerce.number();

// Place subdoc used in trip inputs
export const zPlace = z.object({
  name: z.string().min(1, "place.name required"),
  lat: zNum,
  lng: zNum,
  address: z.string().optional(),
  hubId: z.string().trim().min(1).optional(), // required for shuttle via superRefine
});

// POST /trips
export const zCreateTrip = z.object({
  kind: z.enum(["carpool", "shuttle"]).optional().default("carpool"),
  routeName: z.string().min(1).max(80).optional(),
  stops: z.array(zPlace).max(10).optional(), // only for shuttle (enforced below)

  origin: zPlace,
  destination: zPlace,

  startTime: z.preprocess(
    (v) => (typeof v === "string" || v instanceof Date ? new Date(v) : v),
    z.date().refine((d) => d.getTime() > Date.now() + 5 * 60_000, {
      message: "startTime must be at least 5 minutes in the future",
    })
  ),
  pricePerSeat: zNum.min(0),
  totalSeats: zNum.int().min(1).max(60),
  vehicleId: z.string().trim().min(1).optional(),
}).superRefine((data, ctx) => {
  // Shuttle-specific requirements
  if (data.kind === "shuttle") {
    if (!data.origin.hubId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["origin", "hubId"], message: "Shuttle must start at a hub" });
    }
    if (!data.destination.hubId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["destination", "hubId"], message: "Shuttle must end at a hub" });
    }
  }
  // Prevent stops on carpool (optional rule)
  if (data.kind === "carpool" && (data.stops?.length ?? 0) > 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["stops"], message: "Stops are only allowed for shuttle trips" });
  }
});

// GET /trips/search
export const zSearchTrips = z.object({
  q: z.string().trim().min(1).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD
  seats: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  kind: z.enum(["carpool", "shuttle"]).optional(),
});
