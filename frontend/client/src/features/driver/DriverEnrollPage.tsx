import  React from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound, ArrowLeft } from "lucide-react";
import { becomeDriver } from "./api";

export default function DriverEnrollPage() {
  const [code, setCode] = React.useState("");
  const [show, setShow] = React.useState(false);

  const nav = useNavigate();
  const qc = useQueryClient();

  const enrollMut = useMutation({
    mutationFn: async () => becomeDriver(code.trim()),
    onSuccess: async () => {
      // Refresh /me so role === 'driver'
      await qc.invalidateQueries({ queryKey: ["me"] });
      nav("/driver/create-trip", { replace: true });
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || enrollMut.isLoading) return;
    enrollMut.mutate();
  };

  const errMsg =
    (enrollMut.error as any)?.response?.data?.message ||
    (enrollMut.error as any)?.message;

  return (
    <div className="mx-auto max-w-lg p-6 space-y-4">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1 text-brand-700 dark:text-brand-300"
      >
        <ArrowLeft size={16} /> Back
      </Link>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <div className="flex items-center gap-2 mb-1">
          <KeyRound />
          <h1 className="text-xl font-semibold">Enable Driver Mode</h1>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Enter the driver enroll code provided by the campus admin.
        </p>

        <form className="mt-4 space-y-3" onSubmit={onSubmit}>
          <label className="block text-sm font-medium">Enroll code</label>
          <div className="flex gap-2">
            <input
              type={show ? "text" : "password"}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 outline-none"
              placeholder="IIIT-2025"
              required
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 px-3"
              title={show ? "Hide" : "Show"}
            >
              {show ? "Hide" : "Show"}
            </button>
          </div>

          <button
            type="submit"
            disabled={!code.trim() || enrollMut.isLoading}
            className="w-full rounded-xl bg-emerald-600 text-white py-2 hover:bg-emerald-700 transition disabled:opacity-60"
          >
            {enrollMut.isLoading ? "Upgrading…" : "Upgrade to Driver"}
          </button>

          {enrollMut.isError && (
            <div className="text-sm text-rose-600 dark:text-rose-400">
              {errMsg || "Upgrade failed"}
            </div>
          )}
        </form>
      </div>

      <div className="text-xs text-slate-500">
        Server env var required: <code>DRIVER_ENROLL_CODE</code>.
      </div>
    </div>
  );
}
