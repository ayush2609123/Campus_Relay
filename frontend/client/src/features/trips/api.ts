import api from "@/lib/api";
import { Trip, Hub } from "./types";

export async function searchTrips(params: {
  q?: string;
  date?: string;
  seats?: number;
  limit?: number;
  kind?: "carpool" | "shuttle";  // NEW
}) {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.date) qs.set("date", params.date);
  if (params.seats) qs.set("seats", String(params.seats));
  if (params.kind) qs.set("kind", params.kind);      // NEW
  qs.set("limit", String(params.limit ?? 20));

  const r = await api.get(`/trips/search?${qs.toString()}`);
  return (r.data?.data || r.data) as Trip[];
}
export type PlaceInput = {
    name: string;
    lat: number;
    lng: number;
    address?: string;
    hubId?: string;
  };
  export type TripKind = "carpool" | "shuttle";
const DEFAULT_HUBS: Hub[] = [
    { _id: "static:iiit", name: "IIIT Pune (Talegaon)", lat: 18.7407, lng: 73.6813, address: "Talegaon Dabhade, Pune" },
    { _id: "static:junction", name: "Pune Junction", lat: 18.5286, lng: 73.8740, address: "Pune Railway Station" },
    { _id: "static:airport", name: "Pune Airport (PNQ)", lat: 18.5814, lng: 73.9200, address: "Lohegaon, Pune" },
    { _id: "static:hinj", name: "Hinjawadi Phase 1", lat: 18.5919, lng: 73.7389 },
    { _id: "static:shivajinagar", name: "Shivajinagar Bus Stand", lat: 18.5309, lng: 73.8478 },
  ];
  
  export async function createTrip(payload: {
    origin: PlaceInput;
    destination: PlaceInput;
    startTime: string;        // ISO string
    pricePerSeat: number;
    totalSeats: number;
    kind?: TripKind;          // default carpool
    routeName?: string;       // only for shuttle
    vehicleId?: string;       // optional
  }) {
    const r = await api.post("/trips", payload);
    return r.data?.data || r.data; // expect { _id, ... }
  }
  // Try backend first (if you later add GET /api/hubs?q=), else fallback to static
  export async function suggestHubs(q: string): Promise<Hub[]> {
    const needle = (q || "").trim().toLowerCase();
    if (!needle) return [];
  
    try {
      // If you implement hubs later, expose it at /api/hubs?q=...
      const r = await api.get("/hubs", { params: { q: needle, limit: 8 } });
      const hubs = (r.data?.data || r.data) as Hub[];
      if (Array.isArray(hubs) && hubs.length) return hubs;
    } catch {
      // ignore and fallback
    }
  
    // Fallback filter from static list
    return DEFAULT_HUBS.filter(h => h.name.toLowerCase().includes(needle)).slice(0, 8);
  }

  export async function getTrip(id: string): Promise<Trip> {
    const r = await api.get(`/trips/${id}`);
    return (r.data?.data || r.data) as Trip;
  }
  