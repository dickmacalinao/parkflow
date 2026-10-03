import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  ParkingSquare,
  CalendarCheck,
  Users,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../../lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: string[];
}

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/profile", label: "My Profile", icon: UserRound },
  {
    to: "/properties",
    label: "Properties",
    icon: Building2,
    roles: ["SUPER_ADMIN", "SYSTEM_ADMIN", "PROPERTY_MANAGER"],
  },
  {
    to: "/parking",
    label: "Parking Slots",
    icon: ParkingSquare,
    roles: [
      "SUPER_ADMIN",
      "SYSTEM_ADMIN",
      "PROPERTY_OWNER",
      "PROPERTY_MANAGER",
    ],
  },
  { to: "/reservations", label: "Reservations", icon: CalendarCheck },
  // { to: "/visitors", label: "Visitor Passes", icon: Ticket },
  {
    to: "/admin/users",
    label: "Users",
    icon: Users,
    roles: ["SUPER_ADMIN", "SYSTEM_ADMIN", "PROPERTY_MANAGER"],
  },
  {
    to: "/admin/audit-logs",
    label: "Audit Log",
    icon: ShieldCheck,
    roles: ["SUPER_ADMIN", "SYSTEM_ADMIN"],
  },
];

export function Sidebar() {
  const { user } = useAuth();
  const items = NAV.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role)),
  );

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-card md:block">
      <div className="flex h-16 items-center gap-2 border-b border-border px-5">
        <ParkingSquare className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold">ParkFlow</span>
      </div>
      <nav className="space-y-1 p-3">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
