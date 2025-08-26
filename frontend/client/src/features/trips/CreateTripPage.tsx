// client/src/features/trips/CreateTripPage.tsx
import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createTrip, suggestHubs, TripKind, PlaceInput } from "./api";
import { useDebounce } from "@/lib/useDebounce";
import {
  MapPin, Loader2, Check, CalendarDays, Clock, Car as CarIcon,
  IndianRupee, Users, ShieldCheck, Sparkles
} from "lucide-react";
import { listMyVehicles, Vehicle } from "@/features/vehicles/api";

/* -------------------------- small utils for inputs ------------------------- */
function pad(n: number) { return String(n).padStart(2, "0"); }
function toDateInputValue(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function toTimeInputValue(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Hub = { _id: string; name: string; lat: number; lng: number; address?: string };

/* ----------------------------- SuggestInput box ---------------------------- */
function SuggestInput({
  label,
  value,
  onChange,
  onPick,
  picked,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onPick: (p: PlaceInput | null) => void;
  picked: boolean;
  placeholder?: string;
}) {
  const [suggestions, setSuggestions] = useState<Hub[]>([]);
  const [highlight, setHighlight] = useState(0);
  const debounced = useDebounce(value, 200);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!debounced?.trim()) {
        setSuggestions([]);
        return;
      }
      try {
        const hubs = await suggestHubs(debounced);
        if (!cancelled) {
          setSuggestions(hubs);
          setHighlight(0);
        }
      } catch {
        if (!cancelled) setSuggestions([]);
      }
    })();
    return () => { cancelled = true; };
  }, [debounced]);

  const pick = (h: Hub) => {
    onPick({ name: h.name, lat: h.lat, lng: h.lng, address: h.address, hubId: h._id });
    onChange(h.name);
    setSuggestions([]);
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium mb-1">
        {label} {picked && <Check size={14} className="inline -mt-0.5 text-emerald-500" />}
      </label>
      <div className="relative">
        <MapPin size={18} className="absolute left-3 top-2.5 text-slate-400" />
        <input
          className="w-full pl-9 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400/60"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            onPick(null);
          }}
          placeholder={placeholder}
          autoComplete="off"
          onKeyDown={(e) => {
            if (!suggestions.length) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              pick(suggestions[highlight]);
            } else if (e.key === "Escape") {
              setSuggestions([]);
            }
          }}
          onBlur={() => setTimeout(() => setSuggestions([]), 120)}
        />
      </div>

      {suggestions.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur shadow-lg max-h-64 overflow-auto">
          {suggestions.map((h, i) => (
            <button
              key={h._id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); pick(h); }}
              className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-white/[0.06] ${
                i === highlight ? "bg-white/[0.06]" : ""
              }`}
            >
              <MapPin size={16} className="text-slate-400" />
              <div className="min-w-0">
                <div className="truncate">{h.name}</div>
                {h.address && <div className="text-xs text-slate-400 truncate">{h.address}</div>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* --------------------------------- Page ------------------------------------ */
export default function CreateTripPage() {
  const nav = useNavigate();

  // origin/destination
  const [originText, setOriginText] = useState("");
  const [originPlace, setOriginPlace] = useState<PlaceInput | null>(null);
  const [destText, setDestText] = useState("");
  const [destPlace, setDestPlace] = useState<PlaceInput | null>(null);

  // date + time
  const initial = useMemo(() => new Date(Date.now() + 5 * 60 * 1000), []);
  const [dateStr, setDateStr] = useState<string>(toDateInputValue(initial));
  const [timeStr, setTimeStr] = useState<string>(toTimeInputValue(initial));

  // numbers & kind
  const [price, setPrice] = useState<number>(99);
  const [seats, setSeats] = useState<number>(3);
  const [kind, setKind] = useState<TripKind>("carpool");
  const [routeName, setRouteName] = useState<string>("");

  // vehicle
  const [vehicleId, setVehicleId] = useState<string>("");
  const { data: myVehicles } = useQuery({
    queryKey: ["vehicles", "my"],
    queryFn: listMyVehicles,
    staleTime: 30_000,
  });

  const mut = useMutation({
    mutationFn: createTrip,
    onSuccess: (t: any) => {
      const id = t?._id || t?.id;
      nav(id ? `/trips/${id}` : "/dashboard", { replace: true });
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

  // submit
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!originPlace || !destPlace) {
      alert("Please pick both Origin and Destination from suggestions.");
      return;
    }
    if (!dateStr || !timeStr) {
      alert("Please select both a date and a time.");
      return;
    }

    const dt = new Date(`${dateStr}T${timeStr}`);
    if (Number.isNaN(dt.getTime())) {
      alert("Please select a valid date & time.");
      return;
    }
    if (dt.getTime() < Date.now() + 5 * 60 * 1000) {
      alert("Start time must be at least 5 minutes from now.");
      return;
    }

    mut.mutate({
      origin: originPlace,
      destination: destPlace,
      startTime: dt.toISOString(),
      pricePerSeat: Number(price),
      totalSeats: Number(seats),
      kind,
      routeName: kind === "shuttle" ? (routeName || `${originPlace.name} → ${destPlace.name}`) : undefined,
      vehicleId: vehicleId || undefined,
    });
  };

  /* --------------------------------- UI ----------------------------------- */
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      {/* Page header with aurora accents */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] p-6">
        <div className="pointer-events-none absolute -top-20 -left-16 h-56 w-56 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-16 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative">
          <div className="mb-2 text-xs inline-flex items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 inline-flex items-center gap-1">
              <Sparkles size={14}/> Create trip
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 inline-flex items-center gap-1">
              <ShieldCheck size={14}/> OTP on pickup
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">New ride</h1>
          <p className="mt-1 text-slate-300/90">Add origin, destination, a future time, and your seats & price.</p>
        </div>
      </div>

      {/* Two-column: form + tips */}
      <div className="grid lg:grid-cols-[1fr,360px] gap-5">
        {/* LEFT: form card */}
        <form onSubmit={onSubmit} className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 space-y-5">
          {/* Origin / Destination */}
          <div className="grid md:grid-cols-2 gap-4">
            <SuggestInput
              label="Origin"
              value={originText}
              onChange={setOriginText}
              onPick={setOriginPlace}
              picked={!!originPlace}
              placeholder="IIIT Pune (Talegaon)…"
            />
            <SuggestInput
              label="Destination"
              value={destText}
              onChange={setDestText}
              onPick={setDestPlace}
              picked={!!destPlace}
              placeholder="Pune Junction…"
            />
          </div>

          <div className="text-xs text-slate-400 -mt-2">
            {!originPlace && originText && "Pick an origin from the list • "}
            {!destPlace && destText && "Pick a destination from the list"}
          </div>

          {/* Date + Time + Vehicle */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-sm font-medium mb-1">Date</span>
                <div className="relative">
                  <CalendarDays size={18} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="date"
                    className="w-full pl-9 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400/60"
                    value={dateStr}
                    min={toDateInputValue(new Date())}
                    onChange={(e) => setDateStr(e.target.value)}
                    required
                  />
                </div>
              </label>
              <label className="block">
                <span className="block text-sm font-medium mb-1">Time</span>
                <div className="relative">
                  <Clock size={18} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="time"
                    className="w-full pl-9 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400/60"
                    value={timeStr}
                    onChange={(e) => setTimeStr(e.target.value)}
                    required
                  />
                </div>
              </label>
            </div>

            <label className="block">
              <span className="block text-sm font-medium mb-1">Vehicle (optional)</span>
              <div className="relative">
                <CarIcon size={18} className="absolute left-3 top-2.5 text-slate-400" />
                <select
                  className="w-full pl-9 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400/60"
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                >
                  <option value="">— Select vehicle —</option>
                  {(myVehicles || []).map((v: Vehicle) => (
                    <option key={v._id} value={v._id}>
                      {v.make} {v.model} • {v.plateNumber} • {v.seats} seats
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-xs text-slate-400 mt-1">Manage vehicles in Driver → Vehicles.</div>
            </label>
          </div>

          {/* Price / Seats + Kind */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-sm font-medium mb-1">Price / seat (₹)</span>
                <div className="relative">
                  <IndianRupee size={18} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="number"
                    min={0}
                    className="w-full pl-9 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400/60"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    required
                  />
                </div>
              </label>
              <label className="block">
                <span className="block text-sm font-medium mb-1">Total seats</span>
                <div className="relative">
                  <Users size={18} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="number"
                    min={1}
                    max={8}
                    className="w-full pl-9 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400/60"
                    value={seats}
                    onChange={(e) => setSeats(Number(e.target.value))}
                    required
                  />
                </div>
              </label>
            </div>

            <div>
              <span className="block text-sm font-medium mb-2">Kind</span>
              <div className="inline-flex rounded-xl border border-white/10 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setKind("carpool")}
                  className={`px-3 py-2 text-sm transition ${
                    kind === "carpool"
                      ? "bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 text-white"
                      : "hover:bg-white/5"
                  }`}
                >
                  Carpool
                </button>
                <button
                  type="button"
                  onClick={() => setKind("shuttle")}
                  className={`px-3 py-2 text-sm transition ${
                    kind === "shuttle"
                      ? "bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 text-white"
                      : "hover:bg-white/5"
                  }`}
                >
                  Shuttle
                </button>
              </div>

              {kind === "shuttle" && (
                <div className="mt-3">
                  <label className="block text-sm font-medium mb-1">Route name (optional)</label>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400/60"
                    placeholder="IIIT Pune → Pune Junction"
                    value={routeName}
                    onChange={(e) => setRouteName(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={mut.isPending || !originPlace || !destPlace}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 text-white px-5 py-2.5 hover:from-emerald-500 hover:to-indigo-500 transition active:scale-[.99] disabled:opacity-60"
            >
              {mut.isPending ? <Loader2 size={18} className="animate-spin" /> : null}
              {mut.isPending ? "Creating…" : "Create trip"}
            </button>
            <div className="mt-2 text-xs text-slate-400">
              Start time must be at least 5 minutes from now. You can edit or cancel later from “My Trips”.
            </div>
          </div>
        </form>

        {/* RIGHT: soft tips / help */}
        <aside className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 h-fit space-y-3">
          <div className="text-sm text-slate-400">Tips</div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-sm font-medium mb-1">Pick exact hubs</div>
            <div className="text-sm text-slate-400">
              Use hub suggestions so riders see precise locations and timings.
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-sm font-medium mb-1">Shuttle routes</div>
            <div className="text-sm text-slate-400">
              For repeated runs, choose <b>Shuttle</b> and add a route name so riders can recognize it.
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-sm font-medium mb-1">Vehicle</div>
            <div className="text-sm text-slate-400">
              Adding a vehicle helps show seats & plate info. You can manage vehicles anytime.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
