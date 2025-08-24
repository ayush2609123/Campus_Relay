import { Link, useNavigate } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import api from "@/lib/api";
import { MapPin, LogOut } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
type Me = { name?: string; email?: string; role?: "rider" | "driver" | "admin" } | null;
const campusName = "IIIT Pune";

export default function TopNav({ me }: { me?: Me }) {
    const qc = useQueryClient();
  const nav = useNavigate();
  const authed = !!me;

  const onLogout = async () => {
    try { await api.post("/auth/logout"); }
    finally {
        qc.setQueryData(["me"], null);
         nav("/login", { replace: true }); }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-950/70 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/dashboard" className="text-xl font-semibold tracking-tight whitespace-nowrap">
            Campus <span className="text-brand-600">Relay</span>
          </Link>
          <span
            title={campusName}
            className="hidden sm:inline-flex items-center gap-1 text-xs rounded-full border border-slate-200 dark:border-slate-800 px-2 py-1 text-slate-600 dark:text-slate-300"
          >
            <MapPin size={14} /> {campusName}
          </span>
          {me?.role && (
            <span className="hidden md:inline text-[11px] ml-1 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-500 px-2 py-1 uppercase tracking-wider">
              {me.role}
            </span>
          )}
        </div>

        {/* Right actions only — keep navbar clean */}
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {authed ? (
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-900 transition"
              title="Logout"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-900 transition"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
