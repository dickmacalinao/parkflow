import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useNavItems } from './navItems';

/**
 * Bottom tab bar for phones (hidden from md up, where Sidebar takes over). Scrolls
 * horizontally when a role has more tabs than fit (e.g. admins), and pads for the iPhone
 * home indicator via the safe-area inset so tabs aren't tucked under it.
 */
export function MobileNav() {
  const items = useNavItems();

  return (
    <nav
      aria-label="Main"
      className="shrink-0 border-t border-border bg-card md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <ul className="flex overflow-x-auto">
        {items.map(({ to, label, shortLabel, icon: Icon }) => (
          <li key={to} className="min-w-[4.75rem] flex-1">
            <NavLink
              to={to}
              aria-label={label}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 px-2 py-2.5 text-[11px] font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )
              }
            >
              <Icon className="h-5 w-5" />
              <span className="whitespace-nowrap">{shortLabel ?? label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
