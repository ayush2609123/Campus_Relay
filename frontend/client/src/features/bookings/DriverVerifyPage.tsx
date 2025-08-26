// client/src/features/bookings/DriverVerifyPage.tsx
import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { verifyTripOtp } from "@/features/trips/api";

export default function DriverVerifyPage() {
  const [sp] = useSearchParams();
  const tripId = sp.get("tripId") || "";
  const [code, setCode] = React.useState("");

  const mut = useMutation({
    mutationFn: () => verifyTripOtp(tripId, code),
    onSuccess: (r) => {
      alert(`Booking confirmed ✓\nID: ${r.bookingId}\nAt: ${new Date(r.verifiedAt).toLocaleString()}`);
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message || "Could not verify OTP.";
      alert(msg);
    },
  });

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <h1 className="text-xl font-semibold">Verify Rider OTP</h1>
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
        <label className="block">
          <div className="text-sm text-slate-500 mb-1">OTP</div>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            maxLength={6}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 tracking-[.5em] text-center"
            placeholder="••••••"
          />
        </label>
        <button
          onClick={() => mut.mutate()}
          disabled={!tripId || code.length !== 6 || mut.isPending}
          className="w-full rounded-xl bg-emerald-600 text-white py-2 hover:bg-emerald-700 transition disabled:opacity-60"
        >
          {mut.isPending ? "Confirming…" : "Confirm booking"}
        </button>
        <div className="text-xs text-slate-500">
          Tip: Open this screen from <b>Driver → My Trips → (trip) → Verify OTP</b> so it’s auto-scoped.
        </div>
      </div>
    </div>
  );
}
