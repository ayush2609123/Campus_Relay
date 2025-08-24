import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchTrips, suggestHubs } from "./api";
import TripCard from "./components/TripCard";
import TripSkeleton from "./components/TripSkeleton";
import { useDebounce } from "@/lib/useDebounce";
import { useSearchParams } from "react-router-dom";
import { Search, CalendarDays, Users as UsersIcon, Wand2 } from "lucide-react";

type Kind = "carpool" | "shuttle" | undefined;
const { pathname, search } = location;
const params = new URLSearchParams(search);
const urlKind = params.get("kind");
const kind: "carpool" | "shuttle" =
  (pathname.includes("/shuttle") && "shuttle") ||
  (pathname.includes("/carpool") && "carpool") ||
  (urlKind === "shuttle" ? "shuttle" : "carpool");

export default function SearchPage() {
  const [sp, setSp] = useSearchParams();

  const [kind, setKind] = useState<Kind>(
    (sp.get("kind") as Kind) || undefined
  );
  const [q, setQ] = useState(sp.get("q") || "");
  const [date, setDate] = useState(sp.get("date") || "");
  const [seats, setSeats] = useState<number>(Number(sp.get("seats") || 1));
  const [hubSuggestions, setHubSuggestions] = useState<{value:string,label:string}[]>([]);

  // sync URL on change
  useEffect(() => {
    const next = new URLSearchParams();
    if (kind) next.set("kind", kind);
    if (q) next.set("q", q);
    if (date) next.set("date", date);
    if (seats) next.set("seats", String(seats));
    setSp(next, { replace: true });
  }, [kind, q, date, seats, setSp]);

  const dq = useDebounce(q, 350);
  const queryKey = useMemo(() => ["trips/search", { kind, q: dq, date, seats }], [kind, dq, date, seats]);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: () => searchTrips({
      kind: kind || undefined,
      q: dq || undefined,
      date: date || undefined,
      seats: seats || undefined,
      limit: 30
    }),
    staleTime: 15_000,
    keepPreviousData: true
  });

  // typeahead (optional hubs)
  useEffect(() => {
    let act = true;
    if (q.length >= 2) {
      suggestHubs(q).then(hubs => {
        if (!act) return;
        setHubSuggestions(hubs.map(h => ({ value: h.name, label: h.name })));
      }).catch(() => {});
    } else {
      setHubSuggestions([]);
    }
    return () => { act = false; };
  }, [q]);

  return (
    <div className="space-y-4">
      {/* Sticky filter bar */}
      <div className="sticky top-[56px] z-30 -mx-4 md:-mx-6 bg-white/80 dark:bg-slate-950/80 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-3 space-y-2">
          {/* Kind segmented control */}
          <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <button
              onClick={() => setKind("carpool")}
              className={`px-3 py-1.5 text-sm ${kind === "carpool" ? "bg-slate-100 dark:bg-slate-900 font-semibold" : "hover:bg-slate-50 dark:hover:bg-slate-900"}`}
            >
              Carpool
            </button>
            <button
              onClick={() => setKind("shuttle")}
              className={`px-3 py-1.5 text-sm ${kind === "shuttle" ? "bg-slate-100 dark:bg-slate-900 font-semibold" : "hover:bg-slate-50 dark:hover:bg-slate-900"}`}
            >
              Shuttle
            </button>
            <button
              onClick={() => setKind(undefined)}
              className={`px-3 py-1.5 text-sm ${!kind ? "bg-slate-100 dark:bg-slate-900 font-semibold" : "hover:bg-slate-50 dark:hover:bg-slate-900"}`}
              title="Show all"
            >
              All
            </button>
          </div>

          <div className="grid md:grid-cols-[1fr,180px,120px,auto] gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Origin or destination… (e.g., Pune, IIIT)"
              />
              {hubSuggestions.length > 0 && (
                <div className="absolute mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card max-h-56 overflow-auto">
                  {hubSuggestions.map(s => (
                    <button key={s.value}
                      onClick={() => setQ(s.value)}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <CalendarDays className="absolute left-3 top-2.5 text-slate-400" size={18}/>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="relative">
              <UsersIcon className="absolute left-3 top-2.5 text-slate-400" size={18}/>
              <input
                type="number" min={1} max={6}
                value={seats}
                onChange={e => setSeats(Math.max(1, Math.min(6, Number(e.target.value || 1))))}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <button
              onClick={() => refetch()}
              className="rounded-xl bg-brand-600 text-white px-4 py-2 hover:bg-brand-700 transition inline-flex items-center gap-1 justify-center"
            ><Wand2 size={18}/> Search</button>
          </div>
        </div>
      </div>

      {/* Results */}
      <section className="grid gap-3">
        {(isLoading || isFetching) && (<><TripSkeleton/><TripSkeleton/><TripSkeleton/></>)}

        {error && (
          <div className="rounded-xl border border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950 p-4">
            <div className="font-semibold mb-1">Couldn’t load trips</div>
            <div className="text-sm opacity-80">{(error as any)?.message || "Unknown error"}</div>
          </div>
        )}

        {data && data.length === 0 && !isLoading && (
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
            <div className="text-lg font-semibold mb-1">No trips found</div>
            <div className="text-sm text-slate-500">Try changing your date or search a nearby hub.</div>
          </div>
        )}

        {data?.map(t => <TripCard key={t._id} t={t} />)}
      </section>
    </div>
  );
}
