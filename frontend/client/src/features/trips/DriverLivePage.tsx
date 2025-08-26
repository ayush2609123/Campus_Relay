// client/src/features/trips/DriverLivePage.tsx
import * as React from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LatLngTuple } from "leaflet";
import { MapContainer, TileLayer, Marker, Polyline, CircleMarker, useMap } from "react-leaflet";
import "@/lib/leaflet"; // fixes default marker icons
import { postLivePoint, fetchTrail } from "@/features/tracking/api";

function FitToTrail({ points }: { points: LatLngTuple[] }) {
  const map = useMap();
  React.useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) {
      map.setView(points[0], 16, { animate: true });
    } else {
      map.fitBounds(points, { padding: [28, 28] });
    }
  }, [points, map]);
  return null;
}

export default function DriverLivePage() {
  const { id: tripId } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [watchId, setWatchId] = React.useState<number | null>(null);
  const [sent, setSent] = React.useState<number>(0);
  const [err, setErr] = React.useState<string | null>(null);

  const { data: trail = [] } = useQuery({
    queryKey: ["trail", tripId],
    queryFn: () => fetchTrail(tripId!, 200),
    enabled: !!tripId,
    refetchInterval: 10_000,
  });

  const mut = useMutation({
    mutationFn: ({ lat, lng, speed, heading }: { lat: number; lng: number; speed?: number; heading?: number }) =>
      postLivePoint(tripId!, { lat, lng, speed, heading, ts: new Date().toISOString() }),
    onSuccess: () => {
      setSent((n) => n + 1);
      qc.invalidateQueries({ queryKey: ["trail", tripId] });
    },
  });

  const start = () => {
    if (!tripId) return;
    if (!navigator.geolocation) {
      setErr("Geolocation not supported in this browser.");
      return;
    }
    setErr(null);
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed, heading } = pos.coords;
        if (!mut.isPending) mut.mutate({ lat: latitude, lng: longitude, speed: speed ?? undefined, heading: heading ?? undefined });
      },
      (e) => setErr(e.message || "Location error"),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
    setWatchId(id);
  };

  const stop = () => {
    if (watchId != null) navigator.geolocation.clearWatch(watchId);
    setWatchId(null);
  };

  const isDark = document.documentElement.classList.contains("dark");
const tile = isDark
  ? {
      url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }
  : {
      // Voyager is lighter and works well even in dark UI
      url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    };
  // Map points
  const points: LatLngTuple[] = React.useMemo(
    () => trail.map((p) => [p.lat, p.lng] as LatLngTuple),
    [trail]
  );
  const latest = points.at(-1);
  const mapCenter: LatLngTuple = latest ?? ([18.5204, 73.8567] as LatLngTuple); // fallback: Pune

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Live Location</h1>

      {/* Controls */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur p-4">
        <div className="flex items-center gap-3">
          {watchId == null ? (
            <button
              onClick={start}
              className="rounded-xl bg-emerald-600 text-white px-4 py-2 hover:bg-emerald-700 transition"
            >
              Start sharing
            </button>
          ) : (
            <button
              onClick={stop}
              className="rounded-xl bg-rose-600 text-white px-4 py-2 hover:bg-rose-700 transition"
            >
              Stop
            </button>
          )}
          <div className="text-sm text-slate-600 dark:text-slate-300">
            Sent points: <strong>{sent}</strong>
            {mut.isPending ? " • sending…" : ""}
          </div>
        </div>
        {err && <div className="mt-2 text-sm text-rose-500">Error: {err}</div>}
      </div>

      {/* Map */}
      <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="h-[420px]">
          <MapContainer
            center={mapCenter}
            zoom={13}
            className="h-full w-full"
            preferCanvas
          >
           <TileLayer url={tile.url} attribution={tile.attribution} />
            {!!points.length && (
              <>
                <FitToTrail points={points} />
                <Polyline positions={points} weight={5} opacity={0.9} />
                {latest && (
                  <>
                    <Marker position={latest} />
                    <CircleMarker center={latest} radius={6} />
                  </>
                )}
              </>
            )}
          </MapContainer>
        </div>
        {!points.length && (
          <div className="p-3 text-center text-sm text-slate-500">
            No points yet. Start sharing to see your live trail.
          </div>
        )}
      </div>

      {/* Trail list */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
        <div className="text-sm font-medium mb-2">Recent trail (latest 100)</div>
        {trail.length ? (
          <ol className="text-xs space-y-1 max-h-60 overflow-auto font-mono">
            {trail
              .slice()
              .reverse()
              .map((p, i) => (
                <li key={i}>
                  {new Date(p.ts).toLocaleTimeString()} — {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
                  {typeof p.speed === "number" ? ` • ${p.speed.toFixed(1)} m/s` : ""}
                </li>
              ))}
          </ol>
        ) : (
          <div className="text-sm text-slate-500">No points yet.</div>
        )}
      </div>

      <p className="text-xs text-slate-500">
        Keep this page open while driving. We draw your route in real time and auto-fit the map to the latest trail.
      </p>
    </div>
  );
}
