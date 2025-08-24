import { useQuery } from "@tanstack/react-query";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getTrip } from "./api";
import { fmtDateTime } from "@/lib/dt";
import { ArrowLeft, MapPin, IndianRupee, Users } from "lucide-react";
import { useState } from "react";
import { createBooking } from "@/features/bookings/api";

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [creating, setCreating] = useState(false);

  const { data: t, isLoading, error } = useQuery({
    queryKey: ["trip", id],
    queryFn: () => getTrip(id!),
    enabled: !!id
  });

  const onBook = async () => {
    if (!t?._id) return;
    try {
      setCreating(true);
      const res = await createBooking({ tripId: t._id, seats: 1 });
      const bookingId =
        (res as any)?.booking?._id ||
        (res as any)?._id;
      if (!bookingId) throw new Error("No booking id returned");
      nav(`/bookings/${bookingId}`, { replace: true });
    }  catch (e: any) {
        const msg =
          e?.response?.data?.message ||
          e?.response?.data?.errors?.[0]?.message ||
          e?.message ||
          "Could not create booking.";
        console.error("Create booking failed:", e?.response?.data || e);
        alert(msg);
      } finally {
        setCreating(false);
      }
      
  };

  if (isLoading) return <div className="grid place-items-center min-h-[40vh]">
    <div className="animate-spin h-8 w-8 rounded-full border-2 border-slate-300 border-t-transparent" />
  </div>;
  if (error || !t) return <div className="p-6">
    <Link to="/find-trips" className="inline-flex items-center gap-1 text-brand-700 dark:text-brand-300 mb-4"><ArrowLeft size={16}/> Back</Link>
    <div className="rounded-xl border border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950 p-4">Couldn’t load trip.</div>
  </div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link to="/find-trips" className="inline-flex items-center gap-1 text-brand-700 dark:text-brand-300"><ArrowLeft size={16}/> Back</Link>
        <span className="text-xs uppercase tracking-wide px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800">{t.status}</span>
      </div>

      <div className="grid lg:grid-cols-[1fr,320px] gap-4">
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <div className="text-sm text-slate-500 mb-1">{fmtDateTime(t.startTime)}</div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <span className="inline-flex items-center gap-1"><MapPin size={18}/>{t.origin.name}</span>
            <span className="mx-1">→</span>
            <span className="inline-flex items-center gap-1"><MapPin size={18}/>{t.destination.name}</span>
          </h1>
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <div className="text-sm text-slate-500">Seats left</div>
              <div className="text-xl font-semibold inline-flex items-center gap-1"><Users size={18}/> {t.seatsLeft} / {t.totalSeats}</div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <div className="text-sm text-slate-500">Price per seat</div>
              <div className="text-xl font-semibold inline-flex items-center gap-1"><IndianRupee size={18}/> {t.pricePerSeat}</div>
            </div>
          </div>
        </div>

        <aside className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 h-fit">
          <div className="text-sm text-slate-500 mb-1">Ready to go?</div>
          <button
            className="w-full rounded-xl bg-brand-600 text-white py-2 hover:bg-brand-700 transition disabled:opacity-60"
            disabled={t.status !== "published" || t.seatsLeft <= 0 || creating}
            onClick={onBook}
          >
            {creating ? "Creating booking…" : t.seatsLeft > 0 ? "Book this trip" : "Sold out"}
          </button>
          <div className="text-xs text-slate-500 mt-2">You’ll pay via UPI on the next step.</div>
        </aside>
      </div>
    </div>
  );
}
