import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchMyTrips, transitionTrip, TripDoc } from "./api";
import { Link, useNavigate } from "react-router-dom";
import { CalendarClock, Flag, Play, CheckCircle2, Ban, Navigation } from "lucide-react";

function StatusChip({ s }: { s: TripDoc["status"] }) {
  const map: Record<TripDoc["status"], string> = {
    draft: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
    published: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    ongoing: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    completed: "bg-slate-100 text-slate-600 dark:bg-slate-900/40 dark:text-slate-300",
    cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[s]}`}>{s}</span>;
}

export default function MyTripsPage() {
  const qc = useQueryClient();
  const nav = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ["myTrips"],
    queryFn: fetchMyTrips,
    staleTime: 15_000,
    retry: false,
  });

  if (error) {
    // @ts-ignore
    console.error("MyTrips failed:", error?.response?.status, error?.response?.data);
  }

  const mut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "publish" | "start" | "complete" | "cancel" }) =>
      transitionTrip(id, action),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myTrips"] });
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">My Trips</h1>
        <Link to="/driver/create-trip" className="rounded-xl bg-emerald-600 text-white px-3 py-2 hover:bg-emerald-700">
          Create Trip
        </Link>
      </div>

      {isLoading ? (
        <div className="h-24 rounded-xl border border-slate-200 dark:border-slate-800 animate-pulse" />
      ) : error ? (
        <div className="rounded-xl border border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950 p-4 text-sm">
          Failed to load your trips. {(error as any)?.response?.data?.message || (error as Error).message}
        </div>
      ) : !data?.length ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-sm">
          You haven’t created any trips yet.{" "}
          <Link to="/driver/create-trip" className="text-brand-600">
            Create your first trip
          </Link>
          .
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((t) => {
            const when = new Date(t.startTime);
            const route = `${t.origin?.name} → ${t.destination?.name}`;
            const canPublish = t.status === "draft";
            const canStart = t.status === "published";
            const canComplete = t.status === "ongoing";
            const canCancel = t.status === "published" || t.status === "ongoing";

            return (
              <div key={t._id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <div className="text-sm text-slate-500 flex items-center gap-2">
                      <CalendarClock size={16} />
                      {when.toLocaleString()}
                    </div>
                    <button
                      className="block text-left text-lg font-medium hover:underline"
                      onClick={() => nav(`/trips/${t._id}`)}
                      title="Open trip"
                    >
                      {route}
                    </button>
                    <div className="text-xs text-slate-500 mt-1">
                      ₹{t.pricePerSeat}/seat • {t.seatsLeft}/{t.totalSeats} seats left
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <StatusChip s={t.status} />

                    {/* Quick status actions */}
                    {canPublish && (
                      <button
                        className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-900"
                        onClick={() => mut.mutate({ id: t._id, action: "publish" })}
                      >
                        <Flag size={14} /> Publish
                      </button>
                    )}
                    {canStart && (
                      <button
                        className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-900"
                        onClick={() => mut.mutate({ id: t._id, action: "start" })}
                      >
                        <Play size={14} /> Start
                      </button>
                    )}
                    {canComplete && (
                      <button
                        className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-900"
                        onClick={() => mut.mutate({ id: t._id, action: "complete" })}
                      >
                        <CheckCircle2 size={14} /> Complete
                      </button>
                    )}
                    {canCancel && (
                      <button
                        className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-900"
                        onClick={() => mut.mutate({ id: t._id, action: "cancel" })}
                      >
                        <Ban size={14} /> Cancel
                      </button>
                    )}

                    {/* NEW: quick links */}
                    <Link
                      to={`/driver/trips/${t._id}`}
                      className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-900"
                      title="Open driver view"
                    >
                      <Navigation size={14} /> Driver
                    </Link>

                    {t.status === "ongoing" && (
                      <Link
                        to={`/driver/live/${t._id}`}
                        className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-900"
                        title="Live location"
                      >
                        <Navigation size={14} /> Live
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
