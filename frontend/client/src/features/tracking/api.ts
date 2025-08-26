// client/src/features/tracking/api.ts
import api from "@/lib/api";

export type LivePoint = {
  _id?: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  ts: string; // ISO
};

export async function postLivePoint(tripId: string, p: Omit<LivePoint, "_id">) {
  const r = await api.post(`/locations/${tripId}`, p);
  return r.data?.data || r.data;
}

export async function fetchTrail(tripId: string, limit = 200): Promise<LivePoint[]> {
  const r = await api.get(`/locations/${tripId}`, { params: { limit } });
  return r.data?.data || r.data || [];
}

export async function fetchLatest(tripId: string): Promise<LivePoint | null> {
  const r = await api.get(`/locations/${tripId}/latest`);
  return r.data?.data ?? r.data ?? null;
}
