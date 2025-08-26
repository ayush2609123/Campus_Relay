// src/pages/Home.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { login } from "@/lib/auth";

export default function Home() {
  const [warmed, setWarmed] = useState(false);
  const [logging, setLogging] = useState<"rider"|"driver"|null>(null);
  const nav = useNavigate();

  useEffect(() => {
    // warm backend (Render cold start)
    api.get("/healthz").finally(() => setWarmed(true));
  }, []);

  const demo = async (kind: "rider"|"driver") => {
    try {
      setLogging(kind);
      const email = import.meta.env[`VITE_DEMO_${kind.toUpperCase()}_EMAIL`] as string;
      const pass  = import.meta.env[`VITE_DEMO_${kind.toUpperCase()}_PASS`] as string;
      await login(email, pass);
      if (kind === "driver") nav("/driver/my-trips", { replace: true });
      else nav("/find-trips", { replace: true });
    } catch {
      alert("Demo login failed — try the Sign in page.");
    } finally {
      setLogging(null);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center px-6">
      <div className="max-w-3xl w-full text-center">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">Campus Relay</h1>
        <p className="mt-3 text-slate-300">
          Find rides between hubs, book seats, and manage your trips.
        </p>

        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Link className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 transition"
                to="/find-trips">
            Explore trips (no login)
          </Link>

          {import.meta.env.VITE_DEMO_RIDER_EMAIL && (
            <button onClick={() => demo("rider")}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 transition disabled:opacity-60"
                    disabled={!!logging}>
              {logging==="rider" ? "Signing in…" : "Try as Rider (demo)"}
            </button>
          )}

          {import.meta.env.VITE_DEMO_DRIVER_EMAIL && (
            <button onClick={() => demo("driver")}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition disabled:opacity-60"
                    disabled={!!logging}>
              {logging==="driver" ? "Signing in…" : "Try as Driver (demo)"}
            </button>
          )}

          <Link className="px-5 py-2 rounded-xl border border-slate-600 hover:bg-slate-800/40 transition"
                to="/login">
            Sign in
          </Link>
          <Link className="px-5 py-2 rounded-xl border border-slate-600 hover:bg-slate-800/40 transition"
                to="/register">
            Create account
          </Link>
        </div>

        {!warmed && <p className="mt-4 text-sm text-slate-400">Warming up server…</p>}
      </div>
    </div>
  );
}
