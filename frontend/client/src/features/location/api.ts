import api from "@/lib/api";

export type TrailPoint = {
  _id: string;
  tripId: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  ts: string;
};

export async function fetchTrail(tripId: string, limit = 200): Promise<TrailPoint[]> {
  const { data } = await api.get(`/locations/${tripId}?limit=${limit}`);
  return data.data;
}

export async function pushPoint(tripId: string, p: { lat: number; lng: number; speed?: number; heading?: number }) {
  const { data } = await api.post(`/locations/${tripId}`, p);
  return data.data as TrailPoint;
}
