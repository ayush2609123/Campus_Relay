import { Link } from "react-router-dom";
import { Trip } from "../types";
import { fmtDateTime } from "@/lib/dt";
import { MapPin, ArrowRight, IndianRupee, Users } from "lucide-react";

export default function TripCard({ t }: { t: Trip }) {
  const isShuttle = t.kind === "shuttle";

  return (
    <Link
      to={`/trips/${t._id}`}
      className="block rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:shadow-card transition"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <span>{fmtDateTime(t.startTime)}</span>
            <span className="inline-block h-1 w-1 rounded-full bg-slate-400" />
            <span className="uppercase text-[11px] tracking-wider">{t.status}</span>
            {isShuttle && (
              <span className="ml-2 text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                Shuttle
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 font-semibold text-lg">
            <span className="inline-flex items-center gap-1"><MapPin size={16}/>{t.origin.name}</span>
            <ArrowRight className="mx-1" size={18}/>
            <span className="inline-flex items-center gap-1"><MapPin size={16}/>{t.destination.name}</span>
          </div>
          {isShuttle && t.routeName && (
            <div className="text-sm text-slate-500 mt-0.5 truncate">{t.routeName}</div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-xl font-bold inline-flex items-center gap-1">
            <IndianRupee size={18}/> {t.pricePerSeat}
          </div>
          <div className="text-sm text-slate-500 inline-flex items-center gap-1">
            <Users size={16}/> {t.seatsLeft} left
          </div>
        </div>
      </div>
    </Link>
  );
}
