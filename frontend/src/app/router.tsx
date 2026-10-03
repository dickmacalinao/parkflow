import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "../routes/ProtectedRoute";
import { RoleGuard } from "../routes/RoleGuard";
import { AppShell } from "../components/layout/AppShell";
import { LoginPage } from "../features/auth/LoginPage";
import { RegisterPage } from "../features/auth/RegisterPage";
import { ForgotPasswordPage } from "../features/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "../features/auth/ResetPasswordPage";
import { VerifyEmailPage } from "../features/auth/VerifyEmailPage";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { PropertiesListPage } from "../features/properties/PropertiesListPage";
import { PropertyDetailPage } from "../features/properties/PropertyDetailPage";
import { ParkingSlotsPage } from "../features/parking/ParkingSlotsPage";
import { ReservationsListPage } from "../features/reservations/ReservationsListPage";
import { NewReservationPage } from "../features/reservations/NewReservationPage";
import { VisitorPassesPage } from "../features/visitors/VisitorPassesPage";
import { UsersAdminPage } from "../features/admin/UsersAdminPage";
import { AuditLogPage } from "../features/admin/AuditLogPage";
import { ProfilePage } from "../features/profile/ProfilePage";
import { UnauthorizedPage } from "./UnauthorizedPage";
import { NotFoundPage } from "./NotFoundPage";

const STAFF_ROLES = [
  "SUPER_ADMIN",
  "SYSTEM_ADMIN",
  "PROPERTY_OWNER",
  "PROPERTY_MANAGER",
];
const PROPERTY_ROLES = ["SUPER_ADMIN", "SYSTEM_ADMIN", "PROPERTY_MANAGER"];
const ADMIN_ROLES = ["SUPER_ADMIN", "SYSTEM_ADMIN"];

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/dashboard" replace /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  { path: "/verify-email", element: <VerifyEmailPage /> },
  { path: "/accept-invite", element: <ResetPasswordPage /> },
  { path: "/unauthorized", element: <UnauthorizedPage /> },

  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: "/dashboard", element: <DashboardPage /> },
          { path: "/profile", element: <ProfilePage /> },
          { path: "/reservations", element: <ReservationsListPage /> },
          { path: "/reservations/new", element: <NewReservationPage /> },
          { path: "/visitors", element: <VisitorPassesPage /> },

          {
            element: <RoleGuard roles={PROPERTY_ROLES} />,
            children: [
              { path: "/properties", element: <PropertiesListPage /> },
              { path: "/properties/:id", element: <PropertyDetailPage /> },
            ],
          },
          {
            element: <RoleGuard roles={STAFF_ROLES} />,
            children: [{ path: "/parking", element: <ParkingSlotsPage /> }],
          },
          {
            element: <RoleGuard roles={ADMIN_ROLES} />,
            children: [
              { path: "/admin/users", element: <UsersAdminPage /> },
              { path: "/admin/audit-logs", element: <AuditLogPage /> },
            ],
          },
        ],
      },
    ],
  },

  { path: "*", element: <NotFoundPage /> },
]);
