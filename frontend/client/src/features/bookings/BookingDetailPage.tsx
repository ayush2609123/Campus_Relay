import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getBooking, createPaymentIntent } from "./api";
import { fmtDateTime } from "@/lib/dt";
import { toQRDataURL } from "@/lib/qr";
import { ArrowLeft, Copy, Check } from "lucide-react";
import api from "@/lib/api";

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: b, isLoading, error, refetch } = useQuery({
    queryKey: ["booking", id],
    queryFn: () => getBooking(id!),
    enabled: !!id
  });

  const amount = useMemo(() => {
    // backend may not return totals; compute best-effort from price*seats if present
    const price = (b as any)?.pricePerSeat ?? undefined;
    if (price && b?.seats) return Number(price) * Number(b.seats);
    return undefined;
  
  }, [b]);


  const [upiUri, setUpiUri] = useState<string | null>(null);
  const [qrData, setQrData] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [upiUri]);

  const onCreateIntent = async () => {
    if (!b?._id) return;
    try {
      const idemKey = `intent-${b._id}`; // idempotent per booking
      const res = await createPaymentIntent(b._id, amount, idemKey);
      setUpiUri(res.upiUri);
      // prefer backend QR if you expose paymentId: /payments/:id/qr.png
      setQrData(await toQRDataURL(res.upiUri));
    } catch (e) {
      console.error(e);
      alert("Could not create UPI intent.");
    }
  };

  const copy = async () => {
    if (!upiUri) return;
    await navigator.clipboard.writeText(upiUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  if (isLoading) return <div className="grid place-items-center min-h-[40vh]">
    <div className="animate-spin h-8 w-8 rounded-full border-2 border-slate-300 border-t-transparent" />
  </div>;

  if (error || !b) return <div className="p-6">
    <Link to="/bookings" className="inline-flex items-center gap-1 text-brand-700 dark:text-brand-300 mb-4"><ArrowLeft size={16}/> Back</Link>
    <div className="rounded-xl border border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950 p-4">Couldn’t load booking.</div>
  </div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link to="/bookings" className="inline-flex items-center gap-1 text-brand-700 dark:text-brand-300"><ArrowLeft size={16}/> My bookings</Link>
        <span className="text-xs uppercase tracking-wide px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800">{b.status}</span>
      </div>

      <div className="grid lg:grid-cols-[1fr,360px] gap-4">
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <h1 className="text-xl font-semibold">Booking #{b._id.slice(-6)}</h1>
          <div className="text-sm text-slate-500 mb-4">Created {fmtDateTime(b.createdAt)}</div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <div className="text-sm text-slate-500">Seats</div>
              <div className="text-xl font-semibold">{b.seats}</div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <div className="text-sm text-slate-500">Price/seat</div>
              <div className="text-xl font-semibold">{(b as any)?.pricePerSeat ?? "—"}</div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <div className="text-sm text-slate-500">Total</div>
              <div className="text-xl font-semibold">{amount ?? "—"}</div>
            </div>
          </div>
        </div>

        <aside className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 h-fit">
          <div className="text-sm text-slate-500 mb-2">Pay via UPI</div>

          {!upiUri ? (
            <button
              onClick={onCreateIntent}
              className="w-full rounded-xl bg-brand-600 text-white py-2 hover:bg-brand-700 transition"
            >
              Create UPI intent{amount ? ` (₹${amount})` : ""}
            </button>
          ) : (
            <div className="space-y-3">
              {qrData && (
                <img
                  src={qrData}
                  alt="UPI QR"
                  className="w-full max-w-[260px] mx-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white p-2"
                />
              )}

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3 text-sm break-words">
                <div className="text-slate-500 mb-1">UPI Link</div>
                <div className="font-mono text-xs">{upiUri}</div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={upiUri}
                  className="flex-1 inline-flex justify-center items-center gap-2 rounded-xl bg-brand-600 text-white px-3 py-2 hover:bg-brand-700 transition"
                >
                  Open UPI app
                </a>
                <button
                  onClick={copy}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-900 transition"
                >
                  {copied ? <Check size={16}/> : <Copy size={16}/>}
                  <span className="text-sm">{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>
          )}

          <div className="text-xs text-slate-500 mt-3">
            After paying, meet the driver and share the <strong>OTP</strong> at pickup. Driver will verify to confirm boarding.
          </div>
        </aside>
      </div>
    </div>
  );
}
