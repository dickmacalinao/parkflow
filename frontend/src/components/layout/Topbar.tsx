import { useNavigate } from "react-router-dom";
import { Moon, Sun, LogOut, Bell, UserRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useProperties } from "../../features/properties/properties.hooks";
import { useTheme } from "../../hooks/useTheme";
import { Button } from "../ui/Button";
import { useNotificationsUnreadCount } from "../../features/dashboard/notifications.hooks";

export function Topbar() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const { data: unread } = useNotificationsUnreadCount();
  const { data: properties } = useProperties();
  const assignedProperty = properties?.find(
    (property) => property.id === user?.propertyId,
  );
  const initials =
    `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase() ||
    "?";

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-5">
      <div className="text-lg font-semibold">
        {user?.role !== "SUPER_ADMIN" && assignedProperty?.name}
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative"
        >
          <Bell className="h-4 w-4" />
          {!!unread && (
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="My profile"
          title="My profile"
          onClick={() => navigate("/profile")}
        >
          <UserRound className="h-4 w-4" />
        </Button>
        <div className="hidden items-center gap-2 sm:flex">
          <div
            aria-hidden="true"
            className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-semibold text-primary"
          >
            <span>{initials}</span>
            {user?.avatarUrl && (
              <img
                src={user.avatarUrl}
                alt=""
                className="absolute inset-0 h-full w-full rounded-full object-cover"
                onError={(event) => {
                  event.currentTarget.style.visibility = "hidden";
                }}
              />
            )}
          </div>
          <div className="text-right">
            <div className="text-sm font-medium">
              {user?.firstName} {user?.lastName}
            </div>
            <div className="text-xs capitalize text-muted-foreground">
              {user?.role.replace(/_/g, " ").toLowerCase()}
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="icon"
          aria-label="Log out"
          onClick={async () => {
            await logout();
            navigate("/login");
          }}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
