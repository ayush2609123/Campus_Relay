import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Pt = [number, number];

export default function LeafletMap({
  center,
  polyline,
  marker
}: {
  center: Pt;
  polyline?: Pt[];
  marker?: Pt;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const lineRef = useRef<L.Polyline | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!divRef.current || mapRef.current) return;
    const m = L.map(divRef.current).setView(center, 14);
    mapRef.current = m;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap'
    }).addTo(m);

    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
    });
  }, [center]);

  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;

    // polyline
    if (polyline && polyline.length) {
      if (!lineRef.current) {
        lineRef.current = L.polyline(polyline).addTo(m);
      } else {
        lineRef.current.setLatLngs(polyline);
      }
      m.fitBounds(lineRef.current.getBounds(), { padding: [24, 24] });
    }

    // latest marker
    if (marker) {
      if (!markerRef.current) {
        markerRef.current = L.marker(marker).addTo(m);
      } else {
        markerRef.current.setLatLng(marker);
      }
    }
  }, [polyline, marker]);

  return <div ref={divRef} style={{ height: 360, width: "100%", borderRadius: 12 }} />;
}
