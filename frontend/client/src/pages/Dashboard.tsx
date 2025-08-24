import * as React from "react";
import { Link } from "react-router-dom";
import { CarFront, Bus, ChevronRight } from "lucide-react";

type Me = { name?: string; role?: "rider" | "driver" | "admin" } | null;

function Typewriter({
    phrases,
    speed = 28,      // ms per typed character
    pause = 2000,    // <- keep full sentence visible for 2s
  }: {
    phrases: string[];
    speed?: number;
    pause?: number;
  }) {
    const [idx, setIdx] = React.useState(0);
    const [text, setText] = React.useState("");
    const [phase, setPhase] = React.useState<"type" | "erase">("type");
  
    React.useEffect(() => {
      const current = phrases[idx];
      let timer: number | undefined;
  
      if (phase === "type") {
        if (text.length < current.length) {
          // keep typing
          timer = window.setTimeout(
            () => setText(current.slice(0, text.length + 1)),
            speed
          );
        } else {
          // full sentence shown — hold for `pause` ms, then start erasing
          timer = window.setTimeout(() => setPhase("erase"), pause);
        }
      } else if (phase === "erase") {
        if (text.length > 0) {
          // erase a bit faster for snappiness
          const eraseSpeed = Math.max(12, speed - 10);
          timer = window.setTimeout(() => setText(text.slice(0, -1)), eraseSpeed);
        } else {
          // move to next phrase and type again
          setIdx((idx + 1) % phrases.length);
          setPhase("type");
        }
      }
  
      return () => {
        if (timer) clearTimeout(timer);
      };
    }, [phrases, idx, text, speed, pause, phase]);
  
    return (
      <span className="tabular-nums">
        {text}
        <span className="ml-0.5 inline-block h-5 w-[2px] align-baseline bg-current animate-pulse" />
      </span>
    );
  }
  

export default function Dashboard({ me }: { me?: Me }) {
  const name = me?.name?.split(" ")[0] || "there";
  const isDriver = me?.role === "driver";
  const phrases = [
    "Going to the airport?",
    "Bored on campus?",
    "Need a quick shuttle?",
    "Share a ride back home?",
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* HERO with the ONLY set of CTAs */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200/50 dark:border-slate-800/50 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 p-6 md:p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative z-10 grid gap-6 md:grid-cols-2 items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              Hi {name} <span className="inline-block">👋</span>
            </h1>
            <p className="mt-2 text-slate-600 dark:text-slate-300">
              <Typewriter phrases={phrases} />
            </p>

            {/* Single CTA row */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                to="/carpool"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 text-white px-4 py-2 hover:bg-brand-700 transition"
              >
                <CarFront size={18} />
                Find Carpool
              </Link>
              <Link
                to="/shuttle"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-900 transition"
              >
                <Bus size={18} />
                Find Shuttle
              </Link>
              <Link
                to="/bookings"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-900 transition"
              >
                My Bookings
              </Link>
              {isDriver && (
                <Link
                  to="/driver/create-trip"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 text-white px-4 py-2 hover:bg-emerald-700 transition"
                >
                  Create Trip
                </Link>
              )}
            </div>

            {!me && (
              <p className="mt-3 text-sm text-slate-500">
                You can browse the dashboard without logging in. Using any feature will prompt you to sign in.
              </p>
            )}
          </div>

          {/* Small info panel (no extra buttons) */}
          <div className="relative">
            <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur shadow-xl p-5 border border-slate-200/60 dark:border-slate-800/60">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-4 border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-500 text-xs mb-1">Campus → City</div>
                  <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <CarFront />
                    <span className="font-medium">Carpool</span>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">Share seats, split costs.</div>
                </div>
                <div className="rounded-xl p-4 border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-500 text-xs mb-1">Fixed Routes</div>
                  <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <Bus />
                    <span className="font-medium">Shuttle</span>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">Campus ↔ Junction/Airport.</div>
                </div>
                <div className="col-span-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                    Quick search by hub <ChevronRight size={16} className="opacity-60" />
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    Try “IIIT Pune” or “Pune Junction” on the search page.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* (Optional) info cards without duplicate buttons */}
      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 p-5">
          <div className="text-sm font-semibold mb-1">Find a Trip</div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Search rides from campus to city hubs and back. Use the buttons above to get started.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 p-5">
          <div className="text-sm font-semibold mb-1">Driver Tools</div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Create trips and verify OTP at pickup. Visible only for driver-enabled accounts.
          </p>
        </div>
      </section>
    </div>
  );
}
