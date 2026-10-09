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
import { SlotsAvailabilityPage } from "../features/parking/SlotsAvailabilityPage";
import { MyParkingSlotsPage } from "../features/parking/MyParkingSlotsPage";
import { ZonesPage } from "../features/parking/ZonesPage";
import { ReservationsPage } from "../features/reservations/ReservationsPage";
import { MyReservationsPage } from "../features/reservations/MyReservationsPage";
import { NewReservationPage } from "../features/reservations/NewReservationPage";
import { ReservationDetailPage } from "../features/reservations/ReservationDetailPage";
//import { VisitorPassesPage } from "../features/visitors/VisitorPassesPage";
import { UsersAdminPage } from "../features/admin/UsersAdminPage";
import { UserProfilePage } from "@/features/profile/UserProfilePage";
import { AuditLogPage } from "../features/admin/AuditLogPage";
import { ProfilePage } from "../features/profile/ProfilePage";
import { UnauthorizedPage } from "./UnauthorizedPage";
import { NotFoundPage } from "./NotFoundPage";

const PROPERTY_ROLES = ["SUPER_ADMIN", "PROPERTY_MANAGER"];
const ADMIN_ROLES = ["SUPER_ADMIN"];
const ZONE_ROLES = ["PROPERTY_MANAGER"];
const OWNER_ROLES = ["PROPERTY_OWNER"];

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
          {
            path: "/reservations",
            element: <ReservationsPage />,
          },
          {
            path: "/my-reservations",
            element: <MyReservationsPage />,
          },
          { path: "/reservations/:id", element: <ReservationDetailPage /> },
          { path: "/my-reservations/new", element: <NewReservationPage /> },
          { path: "/my-reservations/:id", element: <ReservationDetailPage /> },
          { path: "/availability", element: <SlotsAvailabilityPage /> },
          {
            element: <RoleGuard roles={ZONE_ROLES} />,
            children: [{ path: "/zones", element: <ZonesPage /> }],
          },
          /*
          { path: "/visitors", element: <VisitorPassesPage /> },
          */
          {
            element: <RoleGuard roles={PROPERTY_ROLES} />,
            children: [
              { path: "/properties", element: <PropertiesListPage /> },
              { path: "/properties/:id", element: <PropertyDetailPage /> },
            ],
          },
          {
            element: <RoleGuard roles={OWNER_ROLES} />,
            children: [
              { path: "/my-parking-slots", element: <MyParkingSlotsPage /> },
            ],
          },
          {
            element: <RoleGuard roles={PROPERTY_ROLES} />,
            children: [{ path: "/admin/users", element: <UsersAdminPage /> }],
          },
          {
            element: <RoleGuard roles={PROPERTY_ROLES} />,
            children: [
              { path: "/admin/users/:userId", element: <UserProfilePage /> },
            ],
          },

          {
            element: <RoleGuard roles={ADMIN_ROLES} />,
            children: [
              { path: "/admin/audit-logs", element: <AuditLogPage /> },
            ],
          },
        ],
      },
    ],
  },

  { path: "*", element: <NotFoundPage /> },
]);
