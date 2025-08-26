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
import DriverVerifyPage from "@/features/bookings/DriverVerifyPage";
import DriverEnrollPage from "@/features/driver/DriverEnrollPage";
import MyTripsPage from "@/features/trips/MyTripsPage"; 

import VehiclesPage from "@/features/vehicles/VehiclesPage";
import DriverTripDetailPage from "@/features/trips/DriverTripDetailPage";
import DriverLivePage from "@/features/trips/DriverLivePage";
import LiveTrailViewPage from "@/features/location/LiveTrailViewPage";

import LiveLocationPage from "./features/location/LiveLocationPage";
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
      {/* Auth (public) */}
      <Route path="/login" element={authed ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={authed ? <Navigate to="/dashboard" replace /> : <Register />} />

      {/* App shell */}
      <Route element={<AppShell me={me} />}>
        {/* Public landing */}
        <Route path="/" element={<Dashboard me={me} />} />
        <Route path="/dashboard" element={<Dashboard me={me} />} />

        {/* Rider features (login required) */}
        <Route path="/carpool" element={<RequireAuth authed={authed}><Navigate to="/find-trips?kind=carpool" replace /></RequireAuth>} />
        <Route path="/shuttle" element={<RequireAuth authed={authed}><Navigate to="/find-trips?kind=shuttle" replace /></RequireAuth>} />
        <Route path="/find-trips" element={<RequireAuth authed={authed}><SearchPage /></RequireAuth>} />
        <Route path="/trips/:id" element={<RequireAuth authed={authed}><TripDetailPage /></RequireAuth>} />
        <Route path="/bookings" element={<RequireAuth authed={authed}><MyBookingsPage /></RequireAuth>} />
        <Route path="/bookings/:id" element={<RequireAuth authed={authed}><BookingDetailPage /></RequireAuth>} />

        {/* Driver “join” (rider -> driver upgrade) */}
        <Route path="/driver/join" element={<RequireAuth authed={authed}><DriverEnrollPage /></RequireAuth>} />

        {/* Driver-only */}
        <Route path="/driver/create-trip" element={<RequireDriver me={me}><CreateTripPage /></RequireDriver>} />
        <Route path="/driver/my-trips" element={<RequireDriver me={me}><MyTripsPage /></RequireDriver>} /> {/* NEW */}
        <Route path="/driver/verify-otp" element={<RequireDriver me={me}><DriverVerifyPage /></RequireDriver>} />
        <Route path="/driver/vehicles" element={<RequireDriver me={me}><VehiclesPage /></RequireDriver>}/>
        <Route path="/driver/trips/:id" element={<RequireDriver me={me}><DriverTripDetailPage /></RequireDriver>} />
        <Route path="/driver/live/:id" element={<RequireDriver me={me}><DriverLivePage /></RequireDriver>} />
        <Route path="/live/:tripId" element={<LiveTrailViewPage />} />
        { /* driver live */ }
         <Route path="/driver/live/:tripId" element={<LiveLocationPage />} />

        {/* Pretty aliases */}
        <Route path="/go/carpool" element={<Navigate to="/find-trips?kind=carpool" replace />} />
        <Route path="/go/shuttle" element={<Navigate to="/find-trips?kind=shuttle" replace />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
