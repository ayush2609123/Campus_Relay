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

// types:  type Hub = { _id: string; name: string; lat: number; lng: number; address?: string };

export const DEFAULT_HUBS: Hub[] = [
    // --- existing ---
    { _id: "static:iiit",         name: "IIIT Pune (Talegaon)",      lat: 18.7407, lng: 73.6813, address: "Talegaon Dabhade, Pune" },
    { _id: "static:junction",     name: "Pune Junction",             lat: 18.5286, lng: 73.8740, address: "Pune Railway Station" },
    { _id: "static:airport",      name: "Pune Airport (PNQ)",        lat: 18.5814, lng: 73.9200, address: "Lohegaon, Pune" },
    { _id: "static:hinj",         name: "Hinjawadi Phase 1",         lat: 18.5919, lng: 73.7389 },
    { _id: "static:shivajinagar", name: "Shivajinagar Bus Stand",    lat: 18.5309, lng: 73.8478 },
  
    // --- Talegaon / Outer NW ---
    { _id: "static:talegaon-stn", name: "Talegaon Railway Station",  lat: 18.7310, lng: 73.6760 },
    { _id: "static:lonavala",     name: "Lonavala Station",          lat: 18.7500, lng: 73.4057 },
  
    // --- Hinjawadi cluster ---
    { _id: "static:hinj2",        name: "Hinjawadi Phase 2",         lat: 18.5869, lng: 73.7339 },
    { _id: "static:hinj3",        name: "Hinjawadi Phase 3",         lat: 18.5905, lng: 73.7188 },
    { _id: "static:wakad",        name: "Wakad Chowk",               lat: 18.5972, lng: 73.7646 },
    { _id: "static:balewadi",     name: "Balewadi High Street",      lat: 18.5646, lng: 73.7726 },
    { _id: "static:baner",        name: "Baner",                     lat: 18.5590, lng: 73.7865 },
    { _id: "static:aundh",        name: "Aundh",                     lat: 18.5603, lng: 73.8077 },
    { _id: "static:itpark",       name: "Pune IT Park (Aundh)",      lat: 18.5617, lng: 73.8178 },
  
    // --- University / Deccan belt ---
    { _id: "static:sppu",         name: "SPPU Main Gate",            lat: 18.5523, lng: 73.8245, address: "Savitribai Phule Pune University" },
    { _id: "static:fcroad",       name: "FC Road",                   lat: 18.5165, lng: 73.8417 },
    { _id: "static:deccan",       name: "Deccan Gymkhana",           lat: 18.5161, lng: 73.8448 },
  
    // --- Central / South ---
    { _id: "static:swargate",     name: "Swargate Bus Stand",        lat: 18.5018, lng: 73.8645 },
    { _id: "static:kothrud",      name: "Kothrud Depot",             lat: 18.5074, lng: 73.8074 },
    { _id: "static:mgroad",       name: "Camp (MG Road)",            lat: 18.5160, lng: 73.8793 },
    { _id: "static:katraj",       name: "Katraj",                    lat: 18.4575, lng: 73.8675 },
  
    // --- East / Airport side ---
    { _id: "static:viman",        name: "Viman Nagar",               lat: 18.5660, lng: 73.9143 },
    { _id: "static:kalyani",      name: "Kalyani Nagar",             lat: 18.5510, lng: 73.9028 },
    { _id: "static:yerwada",      name: "Yerwada",                   lat: 18.5566, lng: 73.8997 },
    { _id: "static:kharadi",      name: "Kharadi",                   lat: 18.5511, lng: 73.9433 },
    { _id: "static:hadapsar",     name: "Hadapsar",                  lat: 18.5089, lng: 73.9257 },
    { _id: "static:magarpatta",   name: "Magarpatta City",           lat: 18.5161, lng: 73.9340 },
  
    // --- PCMC belt ---
    { _id: "static:pimpri",       name: "Pimpri (PCMC)",             lat: 18.6289, lng: 73.7997 },
    { _id: "static:chinchwad",    name: "Chinchwad Station",         lat: 18.6280, lng: 73.8009 },
    { _id: "static:nigdi",        name: "Nigdi Bhakti Shakti",       lat: 18.6513, lng: 73.7673 },
    { _id: "static:akurdi",       name: "Akurdi Railway Station",    lat: 18.6481, lng: 73.7602 },
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