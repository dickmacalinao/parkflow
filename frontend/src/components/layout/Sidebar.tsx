import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  ParkingSquare,
  CalendarCheck,
  Users,
  ShieldCheck,
  UserRound,
  PanelLeftClose,
  PanelLeftOpen,
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
  {
    to: "/properties",
    label: "Properties",
    icon: Building2,
    roles: ["SUPER_ADMIN"],
  },
  {
    to: "/parking",
    label: "Parking Slots",
    icon: ParkingSquare,
    roles: ["SUPER_ADMIN", "PROPERTY_OWNER", "PROPERTY_MANAGER"],
  },
  { to: "/reservations", label: "Reservations", icon: CalendarCheck },
  // { to: "/visitors", label: "Visitor Passes", icon: Ticket },
  {
    to: "/admin/users",
    label: "Users",
    icon: Users,
    roles: ["SUPER_ADMIN", "PROPERTY_MANAGER"],
  },
  {
    to: "/admin/audit-logs",
    label: "Audit Log",
    icon: ShieldCheck,
    roles: ["SUPER_ADMIN"],
  },
];

export function Sidebar() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const items = NAV.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role)),
  );

  return (
    <aside
      className={cn(
        "hidden h-screen shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200 md:flex",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-border",
          collapsed ? "justify-center px-2" : "justify-between px-4",
        )}
      >
        {!collapsed && (
          <div className="flex min-w-0 items-center gap-2">
            <ParkingSquare className="h-6 w-6 shrink-0 text-primary" />
            <span className="text-lg font-bold">ParkFlow</span>
          </div>
        )}
        <button
          type="button"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsed((current) => !current)}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            aria-label={label}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                "flex items-center rounded-md py-2 text-sm font-medium transition-colors",
                collapsed ? "justify-center px-2" : "gap-3 px-3",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto border-t border-border p-3">
        <NavLink
          to="/profile"
          aria-label="My Profile"
          title={collapsed ? "My Profile" : undefined}
          className={({ isActive }) =>
            cn(
              "flex items-center rounded-md py-2 text-sm font-medium transition-colors",
              collapsed ? "justify-center px-2" : "gap-3 px-3",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )
          }
        >
          <UserRound className="h-4 w-4 shrink-0" />
          {!collapsed && <span>My Profile</span>}
        </NavLink>
      </div>
    </aside>
  );
}
