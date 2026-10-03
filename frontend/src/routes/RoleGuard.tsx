import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** Restricts a nested route tree to one or more roles; sends anyone else to /unauthorized. */
export function RoleGuard({ roles }: { roles: string[] }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return <Outlet />;
}
