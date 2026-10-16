import {
  LayoutDashboard, Building2, ParkingSquare, CalendarCheck, CalendarDays, Users, ShieldCheck, Check, Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export interface NavItem {
  to: string;
  label: string;
  /** Shorter label for the mobile bottom bar, where each tab is narrow. */
  shortLabel?: string;
  icon: typeof LayoutDashboard;
  roles?: string[];
}

const SUPER_ADMIN = ['SUPER_ADMIN'];
const ADMIN = ['SUPER_ADMIN', 'PROPERTY_MANAGER'];
const MANAGER = ['PROPERTY_MANAGER'];
const STAFF = ['SUPER_ADMIN', 'PROPERTY_MANAGER', 'PROPERTY_OWNER'];
const OWNER = ['PROPERTY_OWNER'];
const USER = ['PROPERTY_OWNER', 'TENANT'];

// Single source of truth for navigation: the desktop Sidebar and the mobile bottom bar both
// render from this list, so a new page only has to be added here once.
export const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', shortLabel: 'Dashboard', icon: LayoutDashboard },
  { to: '/properties', label: 'Properties', icon: Building2, roles: SUPER_ADMIN },
  { to: '/zones', label: 'Zones', icon: Layers, roles: MANAGER },
  { to: '/availability', label: 'Slots Availability', shortLabel: 'Slots', icon: Check },
  { to: '/my-parking-slots', label: 'My Parking Slots', shortLabel: 'My Parking', icon: ParkingSquare, roles: OWNER },  
  { to: '/reservations', label: 'Reservations', shortLabel: 'Reserv...', icon: CalendarCheck, roles: STAFF },  
  { to: '/my-reservations', label: 'My Reservations', shortLabel: 'My Reserv...', icon: CalendarDays, roles: USER },  
  { to: '/admin/users', label: 'Users', icon: Users, roles: ADMIN },
  { to: '/admin/audit-logs', label: 'Audit Log', shortLabel: 'Audit', icon: ShieldCheck, roles: SUPER_ADMIN },
];

/** Nav items the current user's role is allowed to see. */
export function useNavItems(): NavItem[] {
  const { user } = useAuth();
  return NAV.filter((item) => !item.roles || (user && item.roles.includes(user.role)));
}
