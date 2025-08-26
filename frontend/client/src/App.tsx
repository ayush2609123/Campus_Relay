// client/src/App.tsx
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchMe, type CurrentUser } from "@/lib/auth";
import type { ReactNode } from "react";

import AppShell from "@/components/layout/AppShell";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";

// Rider features
import SearchPage from "@/features/trips/SearchPage";
import TripDetailPage from "@/features/trips/TripDetailPage";
import MyBookingsPage from "@/features/bookings/MyBookingsPage";
import BookingDetailPage from "@/features/bookings/BookingDetailPage";

// Driver features
import CreateTripPage from "@/features/trips/CreateTripPage";
import DriverVerifyPage from "@/features/bookings/DriverVerifyPage";
import DriverEnrollPage from "@/features/driver/DriverEnrollPage";
import MyTripsPage from "@/features/trips/MyTripsPage";
import VehiclesPage from "@/features/vehicles/VehiclesPage";
import DriverTripDetailPage from "@/features/trips/DriverTripDetailPage";
import DriverLivePage from "@/features/trips/DriverLivePage";

// Public live trail viewer (read-only)
import LiveTrailViewPage from "@/features/location/LiveTrailViewPage";

// ---------- Route guards ----------
function RequireAuth({ authed, children }: { authed: boolean; children: ReactNode }) {
  const loc = useLocation();
  if (!authed) return <Navigate to="/login" replace state={{ from: loc }} />;
  return <>{children}</>;
}

function RequireDriver({ me, children }: { me?: CurrentUser | null; children: ReactNode }) {
  const loc = useLocation();
  if (!me || me.role !== "driver") return <Navigate to="/login" replace state={{ from: loc }} />;
  return <>{children}</>;
}

// ---------- App ----------
export default function App() {
  const { data: me, isLoading } = useQuery({ queryKey: ["me"], queryFn: fetchMe });

  if (isLoading) {
    return (
      <div className="grid place-items-center min-h-screen">
        <div className="animate-spin h-8 w-8 rounded-full border-2 border-slate-300 border-t-transparent" />
      </div>
    );
  }

  const authed = Boolean(me);

  return (
    <Routes>
      {/* Auth (public) */}
      <Route path="/login" element={authed ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={authed ? <Navigate to="/dashboard" replace /> : <Register />} />

      {/* App shell wraps everything else */}
      <Route element={<AppShell me={me} />}>
        {/* Public landing */}
        <Route path="/" element={<Dashboard me={me} />} />
        <Route path="/dashboard" element={<Dashboard me={me} />} />
        <Route path="/find-trips" element={<RequireAuth authed={authed}><SearchPage /></RequireAuth>} />
        <Route path="/trips/:id" element={<RequireAuth authed={authed}><TripDetailPage /></RequireAuth>} />
        {/* Rider (requires login) */}
        <Route
          path="/carpool"
          element={<RequireAuth authed={authed}><Navigate to="/find-trips?kind=carpool" replace /></RequireAuth>}
        />
        <Route
          path="/shuttle"
          element={<RequireAuth authed={authed}><Navigate to="/find-trips?kind=shuttle" replace /></RequireAuth>}
        />
        <Route path="/find-trips" element={<RequireAuth authed={authed}><SearchPage /></RequireAuth>} />
        <Route path="/trips/:id" element={<RequireAuth authed={authed}><TripDetailPage /></RequireAuth>} />
        <Route path="/bookings" element={<RequireAuth authed={authed}><MyBookingsPage /></RequireAuth>} />
        <Route path="/bookings/:id" element={<RequireAuth authed={authed}><BookingDetailPage /></RequireAuth>} />

        {/* “Become a driver” (requires login) */}
        <Route path="/driver/join" element={<RequireAuth authed={authed}><DriverEnrollPage /></RequireAuth>} />

        {/* Driver-only */}
        <Route path="/driver/create-trip" element={<RequireDriver me={me}><CreateTripPage /></RequireDriver>} />
        <Route path="/driver/my-trips" element={<RequireDriver me={me}><MyTripsPage /></RequireDriver>} />
        <Route path="/driver/verify-otp" element={<RequireDriver me={me}><DriverVerifyPage /></RequireDriver>} />
        <Route path="/driver/vehicles" element={<RequireDriver me={me}><VehiclesPage /></RequireDriver>} />
        <Route path="/driver/trips/:id" element={<RequireDriver me={me}><DriverTripDetailPage /></RequireDriver>} />
        <Route path="/driver/live/:tripId" element={<RequireDriver me={me}><DriverLivePage /></RequireDriver>} />

        {/* Public read-only live trail (shareable link) */}
        <Route path="/live/:tripId" element={<LiveTrailViewPage />} />

        {/* Pretty aliases */}
        <Route path="/go/carpool" element={<Navigate to="/find-trips?kind=carpool" replace />} />
        <Route path="/go/shuttle" element={<Navigate to="/find-trips?kind=shuttle" replace />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
