// client/src/pages/Dashboard.tsx
import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Car, Bus, Clock, Sparkles, ShieldCheck, ChevronRight,
  Users, KeyRound, CreditCard, Mail, Phone, MapPin, Wrench
} from "lucide-react";

type Props = { me?: { name?: string; email?: string; role?: "rider" | "driver" | "admin" } | null };

export default function Dashboard({ me }: Props) {
  const nav = useNavigate();
  const firstName =
    (me?.name && me.name.split(" ")[0]) ||
    (me?.email && me.email.split("@")[0]) ||
    "there";
  const isDriver = me?.role === "driver" || me?.role === "admin";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-10">
      {/* HERO — Aurora glass */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8 lg:p-10">
        {/* aurora blobs */}
        <div className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-white/5" />

        <div className="relative">
          <div className="mb-5 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1">Made for campuses</span>
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1">UPI-ready</span>
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1">Dark mode</span>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 items-start">
            {/* Greeting + CTAs */}
            <div className="lg:col-span-2">
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
                Hi {firstName} <span className="inline-block">👋</span>
              </h1>
              <p className="mt-2 max-w-2xl text-slate-300/90">
                Fixed-route shuttles and carpools you can trust. Book a seat, pay via UPI, and confirm
                boarding with a simple OTP.
              </p>

              {/* Rider actions (row 1) */}
              <div className="mt-6">
                <RowLabel>For riders</RowLabel>
                <div className="mt-3 flex flex-wrap gap-3">
                  <ActionButton to="/find-trips?kind=carpool" icon={<Car size={16} />}>
                    Find Carpool
                  </ActionButton>
                  <ActionButton to="/find-trips?kind=shuttle" icon={<Bus size={16} />}>
                    Find Shuttle
                  </ActionButton>
                  <ActionButton to="/bookings" icon={<CreditCard size={16} />}>
                    My Bookings
                  </ActionButton>
                </div>
              </div>

              {/* Driver actions (row 2) */}
              <div className="mt-6">
                <RowLabel>Driver tools</RowLabel>
                {isDriver ? (
                  <div className="mt-3 flex flex-wrap gap-3">
                    <ActionButton to="/driver/create-trip" icon={<Sparkles size={16} />} >
                      Create Trip
                    </ActionButton>
                    <ActionButton to="/driver/my-trips" icon={<Users size={16} />}>
                      Manage Trips
                    </ActionButton>
                    <ActionButton to="/driver/vehicles" icon={<Wrench size={16} />}>
                      Vehicles
                    </ActionButton>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-3">
                    <ActionButton to="/driver/join" icon={<ShieldCheck size={16} />} variant="soft">
                      Become a driver
                    </ActionButton>
                  </div>
                )}
              </div>
            </div>

            {/* Compact stats */}
            <div className="grid gap-4">
              <StatCard icon={<Clock size={16} />} title="Avg. pickup radius" value="6–12 min" hint="around campus" />
              <StatCard icon={<Sparkles size={16} />} title="Successful rides" value="3K+" hint="pilots & demos" />
              <StatCard icon={<ShieldCheck size={16} />} title="Simple verification" value="OTP on pickup" hint="privacy-safe" />
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES — max 3 per row */}
      <section>
        <SectionTitle title="Our services" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ServiceCard
            icon={<Car />}
            title="Carpool"
            desc="Share seats with verified peers. Split costs fairly, reduce traffic."
            cta="Browse carpools"
            to="/find-trips?kind=carpool"
          />
          <ServiceCard
            icon={<Bus />}
            title="Campus Shuttle"
            desc="Fixed routes to junctions & airports. Predictable timings."
            cta="View shuttles"
            to="/find-trips?kind=shuttle"
          />
          <ServiceCard
            icon={<ShieldCheck />}
            title="Driver Tools"
            desc="Create trips, verify OTP at pickup, manage vehicles—fast."
            cta={isDriver ? "Open driver panel" : "Become a driver"}
            to={isDriver ? "/driver/my-trips" : "/driver/join"}
          />
        </div>
      </section>

      {/* WHY — product pillars */}
      <section>
        <SectionTitle title="Why Campus Relay" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <PillarCard title="Hub-based search" icon={<MapPin />}>
            Try preset hubs like “IIIT Pune”, “Pune Junction” or “PNQ Airport”—fast and accurate.
          </PillarCard>
          <PillarCard title="UPI intent" icon={<CreditCard />}>
            Generate a UPI link/QR on the booking page and pay in your favorite app.
          </PillarCard>
          <PillarCard title="OTP on pickup" icon={<KeyRound />}>
            Privacy-first boarding. Driver verifies your 6-digit code—no phone numbers shared.
          </PillarCard>
          <PillarCard title="Fair & safe" icon={<ShieldCheck />}>
            Basic KYC for drivers; transparent pricing; cancel windows that respect everyone’s time.
          </PillarCard>
          <PillarCard title="Made for campuses" icon={<Users />}>
            Works great within campus radius; repeat routes make shuttles reliable.
          </PillarCard>
          <PillarCard title="Dark-mode native" icon={<Sparkles />}>
            Subtle shadows, high-contrast text, and motion that’s gentle on the eyes.
          </PillarCard>
        </div>
      </section>

      {/* CONTACT */}
      <section>
        <SectionTitle title="Support & contact" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ContactCard
            icon={<Mail />}
            title="Email us"
            line="product@campusrelay.app"
            onClick={() => (window.location.href = "mailto:product@campusrelay.app")}
          />
          <ContactCard
            icon={<Phone />}
            title="Help center"
            line="Common questions & guides"
            onClick={() => nav("/bookings")}
          />
          <ContactCard
            icon={<Users />}
            title="Community"
            line="Join our Discord (soon)"
            onClick={() => alert("Coming soon ✨")}
          />
        </div>
      </section>
    </div>
  );
}

/* ———————————— UI bits ———————————— */

function RowLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wider text-slate-400">
      <span className="h-[1px] w-4 bg-slate-600/50" />
      {children}
    </div>
  );
}

function ActionButton({
  to,
  icon,
  children,
  variant = "neutral",
}: {
  to: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  variant?: "neutral" | "accent" | "soft";
}) {
  const base =
    "group relative inline-flex items-center gap-2 rounded-xl px-4 py-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50";
  const styles = {
    neutral:
      "border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(0,0,0,0.25)]",
    soft:
      "border border-emerald-400/20 bg-emerald-400/10 hover:bg-emerald-400/15 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(16,185,129,0.25)]",
    accent:
      "border border-emerald-500/30 bg-emerald-600 text-white hover:bg-emerald-500 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(16,185,129,0.35)]",
  }[variant];

  return (
    <Link to={to} className={`${base} ${styles}`}>
      {/* subtle shine */}
      <span className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition bg-gradient-to-r from-white/0 via-white/10 to-white/0" />
      <span className="relative z-10 flex items-center gap-2">
        {icon ? <span className="rounded-lg border border-white/10 bg-white/[0.06] p-1.5">{icon}</span> : null}
        <span className="font-medium">{children}</span>
      </span>
    </Link>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
    </div>
  );
}

function StatCard({
  icon,
  title,
  value,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-xs text-slate-400 flex items-center gap-2">
        {icon} <span>{title}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {hint ? <div className="text-xs text-slate-400 mt-1">{hint}</div> : null}
    </div>
  );
}

function ServiceCard({
  icon,
  title,
  desc,
  cta,
  to,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  cta: string;
  to: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition hover:bg-white/[0.04]">
      <div className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-white/5 blur-2xl group-hover:bg-white/10" />
      <div className="flex items-start gap-3">
        <div className="mt-1 rounded-xl border border-white/10 bg-white/[0.06] p-2">{icon}</div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-slate-300/90">{desc}</p>
          <Link
            to={to}
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-emerald-400 hover:text-emerald-300"
          >
            {cta} <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function PillarCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="mb-2 flex items-center gap-2 text-emerald-300">
        <div className="rounded-lg border border-white/10 bg-white/[0.06] p-1.5">{icon}</div>
        <div className="text-sm font-semibold text-white">{title}</div>
      </div>
      <div className="text-sm text-slate-300/90">{children}</div>
    </div>
  );
}

function ContactCard({
  icon,
  title,
  line,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  line: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition hover:bg-white/[0.04]"
    >
      <div className="mb-1 flex items-center gap-2">
        <div className="rounded-lg border border-white/10 bg-white/[0.06] p-2">{icon}</div>
        <div className="font-semibold">{title}</div>
      </div>
      <div className="text-sm text-slate-300/90">{line}</div>
    </button>
  );
}
