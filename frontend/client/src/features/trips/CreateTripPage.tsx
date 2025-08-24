import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createTrip, suggestHubs, TripKind, PlaceInput } from "./api";
import { useDebounce } from "@/lib/useDebounce";
import { MapPin, Loader2 } from "lucide-react";

type Hub = { _id: string; name: string; lat: number; lng: number; address?: string };

function SuggestInput({
  label,
  value,
  onChange,
  onPick,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onPick: (p: PlaceInput) => void;
  placeholder?: string;
}) {
  const [suggestions, setSuggestions] = useState<Hub[]>([]);
  const debounced = useDebounce(value, 200);

  // fetch suggestions
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!debounced?.trim()) {
        setSuggestions([]);
        return;
      }
      try {
        const hubs = await suggestHubs(debounced);
        if (!cancelled) setSuggestions(hubs);
      } catch {
        if (!cancelled) setSuggestions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <div className="relative">
        <input
          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
        />
        {suggestions.length > 0 && (
          <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow">
            {suggestions.map((h) => (
              <button
                key={h._id}
                type="button"
                onClick={() => {
                  onPick({ name: h.name, lat: h.lat, lng: h.lng, address: h.address, hubId: h._id });
                  onChange(h.name);
                  setSuggestions([]);
                }}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
              >
                <MapPin size={16} />
                <div className="min-w-0">
                  <div className="truncate">{h.name}</div>
                  {h.address && <div className="text-xs text-slate-500 truncate">{h.address}</div>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CreateTripPage() {
  const nav = useNavigate();

  // origin/destination inputs
  const [originText, setOriginText] = useState("");
  const [originPlace, setOriginPlace] = useState<PlaceInput | null>(null);
  const [destText, setDestText] = useState("");
  const [destPlace, setDestPlace] = useState<PlaceInput | null>(null);

  const [start, setStart] = useState<string>(""); // datetime-local value
  const [price, setPrice] = useState<number>(99);
  const [seats, setSeats] = useState<number>(3);
  const [kind, setKind] = useState<TripKind>("carpool");
  const [routeName, setRouteName] = useState<string>("");

  const mut = useMutation({
    mutationFn: createTrip,
    onSuccess: (t: any) => {
      const id = t?._id || t?.id;
      if (id) nav(`/trips/${id}`, { replace: true });
      else nav("/dashboard", { replace: true });
    },
    onError: (e: any) => {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.errors?.[0]?.message ||
        e?.message ||
        "Could not create trip.";
      alert(msg);
    },
  });

  function toISO(dtLocal: string) {
    // datetime-local returns "YYYY-MM-DDTHH:mm"
    // Interpret as local time and convert to ISO.
    if (!dtLocal) return "";
    const d = new Date(dtLocal);
    // Some browsers treat it as local already; ensure it’s valid
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString();
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!originPlace || !destPlace) {
      alert("Please select both Origin and Destination (pick from suggestions).");
      return;
    }
    const iso = toISO(start);
    if (!iso) {
      alert("Please select a valid future date & time.");
      return;
    }
    mut.mutate({
      origin: originPlace,
      destination: destPlace,
      startTime: iso,
      pricePerSeat: Number(price),
      totalSeats: Number(seats),
      kind,
      routeName: kind === "shuttle" ? routeName || `${originPlace.name} → ${destPlace.name}` : undefined,
    });
  };

  return (
    <div className="max-w-3xl mx-auto py-6">
      <h1 className="text-2xl font-semibold mb-4">Create Trip</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <SuggestInput
            label="Origin"
            value={originText}
            onChange={(v) => {
              setOriginText(v);
              setOriginPlace(null); // require pick again if edited
            }}
            onPick={setOriginPlace}
            placeholder="IIIT Pune (Talegaon)…"
          />
          <SuggestInput
            label="Destination"
            value={destText}
            onChange={(v) => {
              setDestText(v);
              setDestPlace(null);
            }}
            onPick={setDestPlace}
            placeholder="Pune Junction…"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start time</label>
            <input
              type="datetime-local"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              min={new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Price / seat (₹)</label>
              <input
                type="number"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
                min={0}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Total seats</label>
              <input
                type="number"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
                min={1}
                max={8}
                value={seats}
                onChange={(e) => setSeats(Number(e.target.value))}
                required
              />
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Kind</label>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="kind"
                  value="carpool"
                  checked={kind === "carpool"}
                  onChange={() => setKind("carpool")}
                />
                Carpool
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="kind"
                  value="shuttle"
                  checked={kind === "shuttle"}
                  onChange={() => setKind("shuttle")}
                />
                Shuttle
              </label>
            </div>
          </div>

          {kind === "shuttle" && (
            <div>
              <label className="block text-sm font-medium mb-1">Route name (optional)</label>
              <input
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
                placeholder="IIIT Pune → Pune Junction"
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={mut.isLoading || !originPlace || !destPlace}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 text-white px-4 py-2 hover:bg-brand-700 transition disabled:opacity-60"
          >
            {mut.isLoading ? <Loader2 size={18} className="animate-spin" /> : null}
            {mut.isLoading ? "Creating…" : "Create trip"}
          </button>
        </div>
      </form>

      <p className="text-xs text-slate-500 mt-4">
        Tips: Pick from suggestions so we save exact coordinates. You can edit or cancel later from
        “My Trips”.
      </p>
    </div>
  );
}
