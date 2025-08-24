import { Navigate, Outlet, useLocation } from 'react-router-dom'

export default function ProtectedRoute({ authed }: { authed: boolean }) {
  const loc = useLocation()
  if (!authed) return <Navigate to="/login" replace state={{ from: loc }} />
  return <Outlet />
}