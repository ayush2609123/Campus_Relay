import { Outlet } from "react-router-dom";
import TopNav from "./TopNav";
import ErrorBoundary from "./ErrorBoundary";

type Me = { name?: string; email?: string; role?: "rider" | "driver" | "admin" };

export default function AppShell({ me }: { me?: Me | null }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <ErrorBoundary label="TopNav">
        <TopNav me={me} />
      </ErrorBoundary>

      <div className="mx-auto max-w-7xl px-4 md:px-6 py-4">
        {/* If any child route crashes, show it instead of blank page */}
        <ErrorBoundary label="Page">
          <Outlet />
        </ErrorBoundary>
      </div>
    </div>
  );
}
