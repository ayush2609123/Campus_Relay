export default function TripSkeleton() {
    return (
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 animate-pulse">
        <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded mb-2" />
        <div className="h-6 w-64 bg-slate-200 dark:bg-slate-800 rounded mb-2" />
        <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
      </div>
    );
  }
  