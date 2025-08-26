// client/src/features/trips/SearchPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchTrips, suggestHubs } from "./api";
import TripCard from "./components/TripCard";
import TripSkeleton from "./components/TripSkeleton";
import { useDebounce } from "@/lib/useDebounce";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  CalendarDays,
  Users as UsersIcon,
  Wand2,
  Clock,
  Car,
  Bus,
} from "lucide-react";

type Kind = "carpool" | "shuttle" | undefined;
type WindowKey = "any" | "morning" | "afternoon" | "evening" | "night";

const TIME_WINDOWS: Record<WindowKey, (h: number) => boolean> = {
  any: () => true,
  morning: (h) => h >= 5 && h < 11,      // 5am–11am
  afternoon: (h) => h >= 11 && h < 17,   // 11am–5pm
  evening: (h) => h >= 17 && h < 21,     // 5pm–9pm
  night: (h) => h >= 21 || h < 5,        // 9pm–5am
};

export default function SearchPage() {
  const [sp, setSp] = useSearchParams();

  // URL → initial state
  const [kind, setKind] = useState<Kind>((sp.get("kind") as Kind) || "carpool");
  const [q, setQ] = useState(sp.get("q") || "");
  const [date, setDate] = useState(sp.get("date") || "");
  const [seats, setSeats] = useState<number>(Math.max(1, Number(sp.get("seats") || 1)));
  const [win, setWin] = useState<WindowKey>((sp.get("tw") as WindowKey) || "any");

  const [hubSuggestions, setHubSuggestions] = useState<{ value: string; label: string }[]>([]);
  const dq = useDebounce(q, 300);

  // keep URL in sync (time window "tw" is client-side only, but we keep it in URL for consistency)
  useEffect(() => {
    const next = new URLSearchParams();
    if (kind) next.set("kind", kind);
    if (dq) next.set("q", dq);
    if (date) next.set("date", date);
    if (seats) next.set("seats", String(seats));
    if (win && win !== "any") next.set("tw", win);
    setSp(next, { replace: true });
  }, [kind, dq, date, seats, win, setSp]);

  const queryKey = useMemo(
    () => ["trips/search", { kind, q: dq, date, seats }],
    [kind, dq, date, seats]
  );

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: () =>
      searchTrips({
        kind: kind || undefined,
        q: dq || undefined,
        date: date || undefined,
        seats: seats || undefined,
        limit: 40,
      }),
    staleTime: 15_000,
    keepPreviousData: true,
  });

  // Client-side time-of-day filter
  const filtered = useMemo(() => {
    if (!data) return data;
    if (win === "any") return data;
    return data.filter((t) => {
      const h = new Date(t.startTime).getHours();
      return TIME_WINDOWS[win](h);
    });
  }, [data, win]);

  // Typeahead: hubs
  useEffect(() => {
    let act = true;
    if ((q || "").trim().length >= 2) {
      suggestHubs(q)
        .then((hubs) => {
          if (!act) return;
          setHubSuggestions(hubs.map((h) => ({ value: h.name, label: h.name })));
        })
        .catch(() => {});
    } else {
      setHubSuggestions([]);
    }
    return () => {
      act = false;
    };
  }, [q]);

  // Helpers
  const todayLocal = new Date().toISOString().slice(0, 10); // YYYY-MM-DD for min attr

  return (
    <div className="space-y-6">
      {/* HERO TILE (blue→green) */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 p-6 sm:p-8">
        {/* gradient */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_400px_at_-10%_-20%,rgba(59,130,246,0.25),transparent),radial-gradient(1000px_500px_at_110%_120%,rgba(16,185,129,0.28),transparent)]" />
        <div className="relative grid gap-5">
          {/* Kind segmented */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex overflow-hidden rounded-xl border border-white/10 bg-white/10 backdrop-blur-sm">
              <button
                onClick={() => setKind("carpool")}
                className={`px-3 py-1.5 text-sm flex items-center gap-1 ${
                  kind === "carpool"
                    ? "bg-white/20 font-semibold"
                    : "hover:bg-white/10"
                }`}
              >
                <Car size={16} /> Carpool
              </button>
              <button
                onClick={() => setKind("shuttle")}
                className={`px-3 py-1.5 text-sm flex items-center gap-1 ${
                  kind === "shuttle"
                    ? "bg-white/20 font-semibold"
                    : "hover:bg-white/10"
                }`}
              >
                <Bus size={16} /> Shuttle
              </button>
              <button
                onClick={() => setKind(undefined)}
                className={`px-3 py-1.5 text-sm ${
                  !kind ? "bg-white/20 font-semibold" : "hover:bg-white/10"
                }`}
                title="Show all"
              >
                All
              </button>
            </div>
          </div>

          {/* Search controls */}
          <div className="grid md:grid-cols-[1.3fr,220px,220px,auto] gap-3">
            {/* Query (origin/destination/hub) */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-300/80" size={18} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-white/10 bg-white/10 text-white placeholder:text-slate-200/70 outline-none focus:ring-2 focus:ring-emerald-400/60"
                placeholder="Origin or destination… (e.g., IIIT Pune, Airport)"
              />
              {hubSuggestions.length > 0 && (
                <div className="absolute mt-1 w-full rounded-xl border border-white/10 bg-slate-900/80 backdrop-blur shadow-lg max-h-56 overflow-auto">
                  {hubSuggestions.map((s) => (
                    <button
                      key={s.value}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setQ(s.value)}
                      className="w-full text-left px-3 py-2 hover:bg-white/5"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Date (calendar) */}
            <div className="relative">
              <CalendarDays className="absolute left-3 top-2.5 text-slate-300/80" size={18} />
              <input
                type="date"
                value={date}
                min={todayLocal}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-white/10 bg-white/10 text-white outline-none focus:ring-2 focus:ring-emerald-400/60"
              />
            </div>

            {/* Seats */}
            <div className="relative">
              <UsersIcon className="absolute left-3 top-2.5 text-slate-300/80" size={18} />
              <input
                type="number"
                min={1}
                max={6}
                value={seats}
                onChange={(e) => setSeats(Math.max(1, Math.min(6, Number(e.target.value || 1))))}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-white/10 bg-white/10 text-white outline-none focus:ring-2 focus:ring-emerald-400/60"
              />
            </div>

            {/* Search button */}
            <button
              onClick={() => refetch()}
              className="rounded-xl bg-emerald-600 text-white px-4 py-2.5 hover:bg-emerald-700 transition inline-flex items-center gap-2 justify-center shadow-sm"
            >
              <Wand2 size={18} /> Search
            </button>
          </div>

          {/* Time-of-day window (client-side filter) */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs text-slate-200/80 inline-flex items-center gap-2">
              <Clock size={16} /> Departure window:
            </div>
            <div className="inline-flex overflow-hidden rounded-xl border border-white/10">
              {(["any", "morning", "afternoon", "evening", "night"] as WindowKey[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setWin(k)}
                  className={`px-3 py-1.5 text-xs capitalize ${
                    win === k ? "bg-white/20 font-semibold" : "hover:bg-white/10"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* RESULTS */}
      <section className="grid gap-3">
        {(isLoading || isFetching) && (
          <>
            <TripSkeleton />
            <TripSkeleton />
            <TripSkeleton />
          </>
        )}

        {error && (
          <div className="rounded-xl border border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950 p-4">
            <div className="font-semibold mb-1">Couldn’t load trips</div>
            <div className="text-sm opacity-80">{(error as any)?.message || "Unknown error"}</div>
          </div>
        )}

        {!isLoading && filtered && filtered.length === 0 && (
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
            <div className="text-lg font-semibold mb-1">No trips found</div>
            <div className="text-sm text-slate-500">Try another date or a nearby hub.</div>
          </div>
        )}

        {filtered?.map((t) => (
          <TripCard key={t._id} t={t} />
        ))}
      </section>
    </div>
  );
}
