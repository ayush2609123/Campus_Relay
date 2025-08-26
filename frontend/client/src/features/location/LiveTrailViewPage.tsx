// client/src/features/location/LiveTrailViewPage.tsx
import * as React from "react";
import { useParams, Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "@/lib/leaflet"; // fixes default marker icons

type Point = { lat: number; lng: number; ts?: string };

export default function LiveTrailViewPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const [points, setPoints] = React.useState<Point[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const fetchTrail = React.useCallback(async () => {
    try {
      // Adjust the URL to match your backend
      const res = await fetch(`/api/locations/${tripId}?limit=500`, { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}`);
      const data: Point[] = await res.json();
      setPoints(data || []);
      setError(null);
    } catch (e: any) {
      setError("Couldn’t load live trail.");
    }
  }, [tripId]);

  React.useEffect(() => {
    fetchTrail();
    const id = setInterval(fetchTrail, 5000);
    return () => clearInterval(id);
  }, [fetchTrail]);

  const latest = points[points.length - 1];
  const center: [number, number] = latest ? [latest.lat, latest.lng] : [18.5204, 73.8567]; // Pune fallback
  const path: [number, number][] = points.map(p => [p.lat, p.lng]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Live Map</h1>
        <div className="text-sm text-slate-500">{points.length} points</div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950 p-3 text-sm">
          {error}
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2">
        <MapContainer center={center} zoom={14} className="h-[420px] rounded-2xl overflow-hidden">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap"
          />
          {path.length > 1 && <Polyline positions={path} />}
          {latest && <Marker position={center} />}
          <FitToTrail points={path} />
        </MapContainer>
      </div>

      <p className="text-xs text-slate-500">
        Tip: Keep the <strong>Share live location</strong> page open on the driver device while driving.
      </p>
    </div>
  );
}

function FitToTrail({ points }: { points: [number, number][] }) {
  const map = useMap();
  React.useEffect(() => {
    if (points.length > 1) {
      const bounds = L.latLngBounds(points.map(([lat, lng]) => L.latLng(lat, lng)));
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [points, map]);
  return null;
}
