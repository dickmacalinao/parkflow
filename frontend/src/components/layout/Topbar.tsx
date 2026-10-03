import { useNavigate } from 'react-router-dom';
import { Moon, Sun, LogOut, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../ui/Button';
import { useNotificationsUnreadCount } from '../../features/dashboard/notifications.hooks';

export function Topbar() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const { data: unread } = useNotificationsUnreadCount();

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-5">
      <div />
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="h-4 w-4" />
          {!!unread && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <div className="hidden text-right sm:block">
          <div className="text-sm font-medium">{user?.firstName} {user?.lastName}</div>
          <div className="text-xs capitalize text-muted-foreground">{user?.role.replace(/_/g, ' ').toLowerCase()}</div>
        </div>
        <Button
          variant="outline"
          size="icon"
          aria-label="Log out"
          onClick={async () => {
            await logout();
            navigate('/login');
          }}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
