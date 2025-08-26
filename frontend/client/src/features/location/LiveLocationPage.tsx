import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "@/lib/leaflet"; // <-- the patch above

type Pt = { lat: number; lng: number; ts: number };

function FitToTrail({ pts }: { pts: Pt[] }) {
  const map = useMap();
  React.useEffect(() => {
    if (!pts.length) return;
    const b = L.latLngBounds(pts.map(p => [p.lat, p.lng] as [number, number]));
    map.fitBounds(b.pad(0.15));
  }, [pts, map]);
  return null;
}

export default function LiveLocationPage() {
  const [sp] = useSearchParams(); // optional: ?tripId=
  const tripId = sp.get("tripId") || "—";

  const [sending, setSending] = React.useState(false);
  const [sentCount, setSentCount] = React.useState(0);
  const [trail, setTrail] = React.useState<Pt[]>([]);

  // -- Fake small movement if geolocation denied (so you still see the map working)
  const fallbackStart = React.useRef<{ lat: number; lng: number }>({ lat: 18.5204, lng: 73.8567 }); // Pune

  React.useEffect(() => {
    if (!sending) return;

    let watchId: number | null = null;
    let timer: number | null = null;

    const pushPoint = (lat: number, lng: number) => {
      setTrail(t => {
        const next = [...t, { lat, lng, ts: Date.now() }];
        return next.slice(-100);
      });
      setSentCount(c => c + 1);

      // TODO: call your API to POST the point here if you want:
      // await postLiveLocation({ tripId, lat, lng, ts: Date.now() })
    };

    if ("geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          pushPoint(latitude, longitude);
        },
        () => {
          // Fallback path: nudge a synthetic point every 2s so UI is visible
          let i = 0;
          timer = window.setInterval(() => {
            i += 1;
            const base = fallbackStart.current;
            pushPoint(base.lat + i * 0.0007, base.lng + i * 0.0007);
          }, 2000);
        },
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 8000 }
      );
    } else {
      // No geolocation API — fallback
      let i = 0;
      timer = window.setInterval(() => {
        i += 1;
        const base = fallbackStart.current;
        pushPoint(base.lat + i * 0.0007, base.lng + i * 0.0007);
      }, 2000);
    }

    return () => {
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      if (timer != null) window.clearInterval(timer);
    };
  }, [sending]);

  const latest = trail.at(-1);
  const positions = trail.map(p => [p.lat, p.lng] as [number, number]);
  const initialCenter: [number, number] = latest
    ? [latest.lat, latest.lng]
    : [18.5204, 73.8567]; // Pune

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-4">
      <h1 className="text-xl font-semibold">Live Location</h1>

      {/* Controls */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 flex items-center gap-3">
        <button
          onClick={() => setSending(s => !s)}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 font-medium transition active:scale-[.99] ${
            sending
              ? "bg-rose-600 text-white hover:bg-rose-500"
              : "bg-emerald-600 text-white hover:bg-emerald-500"
          }`}
        >
          {sending ? "Stop" : "Start sharing"}
        </button>
        <div className="text-sm text-slate-400">
          Trip: <span className="font-mono">{tripId}</span> • Sent points: {sentCount}
        </div>
      </div>

      {/* Map + trail */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <MapContainer
          center={initialCenter}
          zoom={14}
          scrollWheelZoom
          className="h-[420px] w-full"
          preferCanvas
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {positions.length > 1 && (
            <Polyline positions={positions} pathOptions={{ weight: 5, opacity: 0.9 }} />
          )}
          {latest && <Marker position={[latest.lat, latest.lng]} />}
          <FitToTrail pts={trail} />
        </MapContainer>
      </div>

      {/* Recent list (kept from your previous UI) */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <div className="text-sm font-medium mb-2">Recent trail (latest 100)</div>
        <div className="font-mono text-xs whitespace-pre-wrap leading-6 text-slate-300/90">
          {trail
            .slice()
            .reverse()
            .map((p) => {
              const t = new Date(p.ts).toLocaleTimeString();
              return `${t} — ${p.lat.toFixed(5)},  ${p.lng.toFixed(5)}\n`;
            })}
        </div>
        <div className="text-xs text-slate-500 mt-2">
          Keep this page open while driving.
        </div>
      </div>
    </div>
  );
}
