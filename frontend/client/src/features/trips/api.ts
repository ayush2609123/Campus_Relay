// client/src/features/trips/api.ts
import api from "@/lib/api";
import { Trip, Hub } from "./type";

/* ---------------------------------- Search --------------------------------- */
export async function searchTrips(params: {
  q?: string;
  date?: string;           // YYYY-MM-DD
  seats?: number;
  limit?: number;
  kind?: "carpool" | "shuttle";
}) {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.date) qs.set("date", params.date);
  if (params.seats) qs.set("seats", String(params.seats));
  if (params.kind) qs.set("kind", params.kind);
  qs.set("limit", String(params.limit ?? 20));

  const r = await api.get(`/trips/search?${qs.toString()}`);
  return (r.data?.data || r.data) as Trip[];
}

/* ------------------------------ Create helpers ------------------------------ */
export type PlaceInput = {
  name: string;
  lat: number;
  lng: number;
  address?: string;
  hubId?: string; // may be a real ObjectId or a static stub like "static:iiit"
};
export type TripKind = "carpool" | "shuttle";

const DEFAULT_HUBS: Hub[] = [
  { _id: "static:iiit", name: "IIIT Pune (Talegaon)", lat: 18.7407, lng: 73.6813, address: "Talegaon Dabhade, Pune" },
  { _id: "static:junction", name: "Pune Junction", lat: 18.5286, lng: 73.8740, address: "Pune Railway Station" },
  { _id: "static:airport", name: "Pune Airport (PNQ)", lat: 18.5814, lng: 73.9200, address: "Lohegaon, Pune" },
  { _id: "static:hinj", name: "Hinjawadi Phase 1", lat: 18.5919, lng: 73.7389 },
  { _id: "static:shivajinagar", name: "Shivajinagar Bus Stand", lat: 18.5309, lng: 73.8478 },
];

// keep hubId only if it looks like a real Mongo ObjectId
const isHex24 = (s?: string) => !!s && /^[a-f\d]{24}$/i.test(s);

const sanitizePlace = (p: PlaceInput) => ({
  name: p.name,
  lat: Number(p.lat),
  lng: Number(p.lng),
  ...(p.address ? { address: p.address } : {}),
  ...(isHex24(p.hubId) ? { hubId: p.hubId } : {}), // drop "static:*" ids
});

/* --------------------------------- Create ---------------------------------- */
export async function createTrip(payload: {
  origin: PlaceInput;
  destination: PlaceInput;
  startTime: string;        // ISO string
  pricePerSeat: number;
  totalSeats: number;
  kind?: TripKind;          // default 'carpool' on server
  routeName?: string;       // only for shuttle
  vehicleId?: string;       // optional
}) {
  const body = {
    ...payload,
    origin: sanitizePlace(payload.origin),
    destination: sanitizePlace(payload.destination),
    // drop vehicleId if not a real ObjectId
    ...(isHex24(payload.vehicleId) ? { vehicleId: payload.vehicleId } : { vehicleId: undefined }),
  };
  const r = await api.post("/trips", body);
  return r.data?.data || r.data; // expect { _id, ... }
}

/* ------------------------------ Hub suggestions ---------------------------- */
export async function suggestHubs(q: string): Promise<Hub[]> {
  const needle = (q || "").trim();
  if (!needle) return [];

  // Try backend first (if /hubs exists); otherwise fall back to static list
  try {
    const r = await api.get("/hubs", { params: { q: needle, limit: 8 } });
    const hubs = (r.data?.data || r.data) as Hub[];
    if (Array.isArray(hubs) && hubs.length) return hubs;
  } catch {
    // ignore and fallback
  }

  const low = needle.toLowerCase();
  return DEFAULT_HUBS.filter((h) => h.name.toLowerCase().includes(low)).slice(0, 8);
}

/* --------------------------------- Details --------------------------------- */
export async function getTrip(id: string): Promise<Trip> {
  const r = await api.get(`/trips/${id}`);
  return (r.data?.data || r.data) as Trip;
}

/* ----------------------------- Driver: my trips ---------------------------- */
export type TripDoc = {
  _id: string;
  origin: { name: string };
  destination: { name: string };
  startTime: string;
  pricePerSeat: number;
  seatsLeft: number;
  totalSeats: number;
  status: "draft" | "published" | "ongoing" | "completed" | "cancelled";
  driverId: string;
};

export async function fetchMyTrips(): Promise<TripDoc[]> {
  const r = await api.get("/trips/my");
  return r.data?.data ?? r.data ?? [];
}

export async function transitionTrip(
  id: string,
  action: "publish" | "start" | "complete" | "cancel"
): Promise<TripDoc> {
  const r = await api.post(`/trips/${id}/${action}`);
  return r.data?.data ?? r.data;
}

export type TripBookingRow = {
    _id: string;
    seats: number;
    status: "pending" | "confirmed" | "cancelled";
    createdAt: string;
    verifiedAt?: string;
    user?: { _id: string; name?: string; email?: string };
  };
  
  export async function getTripBookings(tripId: string): Promise<TripBookingRow[]> {
    const { data } = await api.get(`/bookings/by-trip/${tripId}`);
    return data.data;
  }
  export async function verifyTripOtp(tripId: string, code: string) {
    const { data } = await api.post(`/trips/${tripId}/verify-otp`, { code });
    return data.data as {
      bookingId: string;
      verifiedAt: string;
      userId: string;
      seats: number;
      status: "confirmed";
    };
  }