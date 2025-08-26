import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getTrip, transitionTrip, TripDoc } from "./api";
import { getTripBookings, TripBookingRow } from "./api";
import { fmtDateTime } from "@/lib/dt";
import {
  ArrowLeft, CalendarClock, MapPin, Flag, Play, CheckCircle2, Ban,
  IndianRupee, Users, ChevronRight, Check, Clock, Route
} from "lucide-react";

function StatusChip({ s }: { s: TripDoc["status"] }) {
  const map: Record<TripDoc["status"], string> = {
    draft: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
    published: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    ongoing: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    completed: "bg-slate-100 text-slate-600 dark:bg-slate-900/40 dark:text-slate-300",
    cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[s]}`}>{s}</span>;
}

function BookingRow({ b }: { b: TripBookingRow }) {
  const name = b.user?.name || (b.user?.email ? b.user.email.split("@")[0] : "Rider");
  const shortId = String(b._id).slice(-6);
  const isConfirmed = b.status === "confirmed";
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3">
      <div className="min-w-0">
        <div className="font-medium truncate">{name}</div>
        <div className="text-xs text-slate-500">#{shortId} • {fmtDateTime(b.createdAt)}</div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-sm text-slate-500">Seats: <span className="font-semibold">{b.seats}</span></div>
        {isConfirmed ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-xs dark:bg-emerald-900/40 dark:text-emerald-300">
            <Check size={14}/> Confirmed
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-xs dark:bg-slate-900/40 dark:text-slate-300">
            <Clock size={14}/> Pending
          </span>
        )}
      </div>
    </div>
  );
}

export default function DriverTripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const qc = useQueryClient();

  const { data: t, isLoading, error } = useQuery({
    queryKey: ["trip", id],
    queryFn: () => getTrip(id!),
    enabled: !!id,
    staleTime: 10_000,
  });

  const { data: bookings, refetch: refetchBookings } = useQuery({
    queryKey: ["tripBookings", id],
    queryFn: () => getTripBookings(id!),
    enabled: !!id,
    // live-ish while the trip is active
    refetchInterval: (data) => (t && (t.status === "published" || t.status === "ongoing") ? 4000 : false),
  });

  const mut = useMutation({
    mutationFn: ({ action }: { action: "publish" | "start" | "complete" | "cancel" }) =>
      transitionTrip(id!, action),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trip", id] });
      refetchBookings();
      qc.invalidateQueries({ queryKey: ["myTrips"] });
    },
  });

  const onAction = (action: "publish" | "start" | "complete" | "cancel") => {
    if (!id) return;
    if (action === "cancel" && !confirm("Cancel this trip? Riders will be notified.")) return;
    mut.mutate({ action });
  };

  if (isLoading) {
    return (
      <div className="grid place-items-center min-h-[40vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
      </div>
    );
  }
  if (error || !t) {
    return (
      <div className="p-6">
        <Link to="/driver/my-trips" className="inline-flex items-center gap-1 text-brand-700 dark:text-brand-300 mb-4">
          <ArrowLeft size={16} /> Back to My Trips
        </Link>
        <div className="rounded-xl border border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950 p-4">
          Couldn’t load trip.
        </div>
      </div>
    );
  }

  const canPublish = t.status === "draft";
  const canStart = t.status === "published";
  const canComplete = t.status === "ongoing";
  const canCancel = t.status === "published" || t.status === "ongoing";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link to="/driver/my-trips" className="inline-flex items-center gap-1 text-brand-700 dark:text-brand-300">
          <ArrowLeft size={16} /> Back to My Trips
        </Link>
        <StatusChip s={t.status} />
      </div>

      <div className="grid lg:grid-cols-[1fr,340px] gap-4">
        {/* Left: details + bookings */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <div className="text-sm text-slate-500 mb-1">
            <CalendarClock className="inline -mt-1 mr-1" size={16} />
            {fmtDateTime(t.startTime)}
          </div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <span className="inline-flex items-center gap-1"><MapPin size={18} />{t.origin.name}</span>
            <span className="mx-1">→</span>
            <span className="inline-flex items-center gap-1"><MapPin size={18} />{t.destination.name}</span>
          </h1>

          <div className="mt-4 grid sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <div className="text-sm text-slate-500">Seats</div>
              <div className="text-xl font-semibold inline-flex items-center gap-1">
                <Users size={18} /> {t.seatsLeft} / {t.totalSeats}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <div className="text-sm text-slate-500">Price / seat</div>
              <div className="text-xl font-semibold inline-flex items-center gap-1">
                <IndianRupee size={18} /> {t.pricePerSeat}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <div className="text-sm text-slate-500">Trip ID</div>
              <div className="text-xs break-all">{t._id}</div>
            </div>
          </div>

          {/* Bookings list */}
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Bookings</div>
              <button
                onClick={() => refetchBookings()}
                className="text-xs rounded-lg border px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                Refresh
              </button>
            </div>

            {!bookings?.length ? (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4 text-sm text-slate-500">
                No riders yet. Share your trip link or wait for riders to join.
              </div>
            ) : (
              bookings.map((b) => <BookingRow key={b._id} b={b} />)
            )}
          </div>
        </div>

        {/* Right: actions */}
        <aside className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 h-fit">
          <div className="text-sm text-slate-500 mb-2">Driver actions</div>
          <div className="grid gap-2">
            <button
              disabled={!canPublish || mut.isPending}
              onClick={() => onAction("publish")}
              className="inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 hover:bg-slate-50 disabled:opacity-50"
            >
              <Flag size={16} /> Publish
            </button>
            <button
              disabled={!canStart || mut.isPending}
              onClick={() => onAction("start")}
              className="inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 hover:bg-slate-50 disabled:opacity-50"
            >
              <Play size={16} /> Start
            </button>
            <button
              disabled={!canComplete || mut.isPending}
              onClick={() => onAction("complete")}
              className="inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 hover:bg-slate-50 disabled:opacity-50"
            >
              <CheckCircle2 size={16} /> Complete
            </button>
            <button
              disabled={!canCancel || mut.isPending}
              onClick={() => onAction("cancel")}
              className="inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 hover:bg-slate-50 disabled:opacity-50"
            >
              <Ban size={16} /> Cancel
            </button>
          </div>

          {(t.status === "published" || t.status === "ongoing") && (
            <Link
              to={`/driver/verify-otp?tripId=${t._id}`}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white px-3 py-2 hover:bg-emerald-700"
            >
              Verify OTP <ChevronRight size={16} />
            </Link>
          )}
          {t.status === "ongoing" && (
           <Link
               to={`/driver/live/${t._id}`}
                className="mt-2 w-full inline-flex justify-center rounded-xl bg-slate-200 dark:bg-slate-800 px-3 py-2 hover:opacity-90"
            >
           <Route size={16} className="mr-1" /> Open Live Location
              </Link>
           )}

        </aside>
      </div>
    </div>
  );
}
