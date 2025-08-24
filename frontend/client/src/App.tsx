// client/src/App.tsx
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchMe } from "@/lib/auth";

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
// (Add MyTripsPage, DriverTripDetailPage later when ready)

function RequireAuth({ authed, children }: { authed: boolean; children: JSX.Element }) {
  const loc = useLocation();
  return authed ? children : <Navigate to="/login" replace state={{ from: loc }} />;
}

function RequireDriver({ me, children }: { me: any; children: JSX.Element }) {
  const loc = useLocation();
  return me && me.role === "driver" ? children : <Navigate to="/login" replace state={{ from: loc }} />;
}

export default function App() {
  const { data: me, isLoading } = useQuery({ queryKey: ["me"], queryFn: fetchMe });

  if (isLoading) {
    return (
      <div className="grid place-items-center min-h-screen">
        <div className="animate-spin h-8 w-8 rounded-full border-2 border-slate-300 border-t-transparent" />
      </div>
    );
  }

  const authed = !!me;

  return (
    <Routes>
      {/* Public auth routes — if already logged in, send to dashboard */}
      <Route path="/login" element={authed ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={authed ? <Navigate to="/dashboard" replace /> : <Register />} />

      {/* App shell with TopNav; pages render via <Outlet/> inside AppShell */}
      <Route element={<AppShell me={me} />}>
        {/* Public landing: Dashboard (greets if logged in, generic if guest) */}
        <Route path="/" element={<Dashboard me={me} />} />
        <Route path="/dashboard" element={<Dashboard me={me} />} />

        {/* Rider features (require login) */}
        <Route
          path="/carpool"
          element={
            <RequireAuth authed={authed}>
              {/* Same SearchPage, but we enforce kind=carpool via URL for filtering/UI */}
              <SearchPage />
            </RequireAuth>
          }
        />
        <Route
          path="/shuttle"
          element={
            <RequireAuth authed={authed}>
              <SearchPage />
            </RequireAuth>
          }
        />
        <Route
          path="/find-trips"
          element={
            <RequireAuth authed={authed}>
              <SearchPage />
            </RequireAuth>
          }
        />
        <Route
          path="/trips/:id"
          element={
            <RequireAuth authed={authed}>
              <TripDetailPage />
            </RequireAuth>
          }
        />
        <Route
          path="/bookings"
          element={
            <RequireAuth authed={authed}>
              <MyBookingsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/bookings/:id"
          element={
            <RequireAuth authed={authed}>
              <BookingDetailPage />
            </RequireAuth>
          }
        />

        {/* Driver-only */}
        <Route
          path="/driver/create-trip"
          element={
            <RequireDriver me={me}>
              <CreateTripPage />
            </RequireDriver>
          }
        />
        {/* Add these when pages exist:
        <Route
          path="/driver/my-trips"
          element={<RequireDriver me={me}><MyTripsPage /></RequireDriver>}
        />
        <Route
          path="/driver/trips/:id"
          element={<RequireDriver me={me}><DriverTripDetailPage /></RequireDriver>}
        />
        */}

        {/* Carpool/Shuttle “pretty” aliases → force correct kind via redirect */}
        <Route path="/go/carpool" element={<Navigate to="/find-trips?kind=carpool" replace />} />
        <Route path="/go/shuttle" element={<Navigate to="/find-trips?kind=shuttle" replace />} />
      </Route>

      {/* Fallback: send to dashboard (public) */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
