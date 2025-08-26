import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listMyBookings, cancelBooking, BookingWithTrip } from "./api";
import { fmtDateTime } from "@/lib/dt";
import {
  IndianRupee,
  Users,
  ArrowRight,
  MapPin,
  XCircle,
  Loader2,
} from "lucide-react";

export default function MyBookingsPage() {
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["bookings", "my"],
    queryFn: listMyBookings,
    staleTime: 15_000,
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => cancelBooking(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings", "my"] }),
  });

  if (isLoading) {
    return (
      <div className="grid gap-2">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 animate-pulse h-24"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950 p-4">
        Couldn’t load your bookings.
      </div>
    );
  }

  const list = (data || []) as BookingWithTrip[];
  if (list.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
        <div className="text-lg font-semibold mb-1">No bookings yet</div>
        <div className="text-sm text-slate-500">Find a trip to get started.</div>
        <Link
          to="/find-trips"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-600 text-white px-3 py-2 hover:bg-brand-700 transition"
        >
          Find trips
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {list.map((b) => {
        const t = b.trip;
        const when = t?.startTime ? fmtDateTime(t.startTime) : "";

        // robust price computation
        const unitPrice =
          (b as any)?.pricePerSeat ??
          (t as any)?.pricePerSeat ??
          null;
        const priceNum =
          typeof unitPrice === "number"
            ? unitPrice
            : unitPrice != null
            ? Number(unitPrice)
            : null;
        const total =
          priceNum != null && typeof b.seats === "number"
            ? priceNum * b.seats
            : null;

        const canCancel =
          b.status === "pending" && (!t || new Date(t.startTime) > new Date());

        return (
          <div
            key={b._id}
            className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center justify-between gap-4"
          >
            <div className="min-w-0">
              <div className="text-sm text-slate-500 mb-1">{when}</div>

              <Link
                to={`/bookings/${b._id}`}
                className="font-semibold text-lg hover:underline break-words"
              >
                {t ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={16} />
                      {t.origin?.name}
                    </span>
                    <ArrowRight size={16} />
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={16} />
                      {t.destination?.name}
                    </span>
                  </span>
                ) : (
                  `Trip ${String(b.trip?._id).slice(-6)}`
                )}
              </Link>

              <div className="text-sm text-slate-500 mt-1 inline-flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <Users size={16} />
                  {b.seats} seat(s)
                </span>

                {priceNum != null && (
                  <span className="inline-flex items-center gap-1">
                    <IndianRupee size={16} />
                    {priceNum}
                    {total != null ? (
                      <span className="ml-2 opacity-70">· total ₹ {total}</span>
                    ) : null}
                  </span>
                )}

                <span
                  className={`uppercase text-[11px] tracking-wider px-2 py-0.5 rounded-full ${
                    b.status === "cancelled"
                      ? "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300"
                      : b.status === "confirmed"
                      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {b.status}
                </span>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <Link
                to={`/bookings/${b._id}`}
                className="rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-900 transition"
              >
                Open
              </Link>

              <button
                disabled={!canCancel || cancelMut.isPending}
                onClick={() => cancelMut.mutate(b._id)}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-300 px-3 py-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition disabled:opacity-60"
                title={canCancel ? "Cancel booking" : "Cannot cancel"}
              >
                {cancelMut.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <XCircle size={16} />
                )}
                Cancel
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
