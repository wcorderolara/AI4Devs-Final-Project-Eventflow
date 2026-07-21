import {
  Activity,
  Bell,
  Briefcase,
  Calendar,
  Database,
  FileText,
  LayoutDashboard,
  type LucideIcon,
  MessageSquare,
  Package,
  Star,
  Store,
  User,
  Users,
} from 'lucide-react';

export interface NavItem {
  href: string;
  /** Clave i18n relativa al namespace `navigation` (p. ej. `sidebar.organizer.events`). */
  labelKey: string;
  icon: LucideIcon;
  /** `true` → activo solo con match exacto de pathname; `false`/omitido → `startsWith`. */
  exact?: boolean;
}

export const ORGANIZER_NAV_ITEMS: NavItem[] = [
  { href: '/organizer/events', labelKey: 'sidebar.organizer.events', icon: Calendar },
  { href: '/organizer/vendors', labelKey: 'sidebar.organizer.vendors', icon: Store },
  { href: '/organizer/notifications', labelKey: 'sidebar.organizer.notifications', icon: Bell },
  { href: '/organizer/profile', labelKey: 'sidebar.organizer.profile', icon: User },
];

export const VENDOR_NAV_ITEMS: NavItem[] = [
  { href: '/vendor', labelKey: 'sidebar.vendor.dashboard', icon: LayoutDashboard, exact: true },
  { href: '/vendor/profile', labelKey: 'sidebar.vendor.profile', icon: User },
  { href: '/vendor/portfolio', labelKey: 'sidebar.vendor.portfolio', icon: Briefcase },
  { href: '/vendor/services', labelKey: 'sidebar.vendor.services', icon: Package },
  { href: '/vendor/quotes', labelKey: 'sidebar.vendor.quotes', icon: FileText },
  { href: '/vendor/reviews', labelKey: 'sidebar.vendor.reviews', icon: Star },
  { href: '/vendor/notifications', labelKey: 'sidebar.vendor.notifications', icon: Bell },
];

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { href: '/admin/metrics', labelKey: 'sidebar.admin.metrics', icon: Activity },
  { href: '/admin/vendors', labelKey: 'sidebar.admin.vendors', icon: Store },
  { href: '/admin/reviews', labelKey: 'sidebar.admin.reviews', icon: MessageSquare },
  { href: '/admin/users', labelKey: 'sidebar.admin.users', icon: Users },
  { href: '/admin/seed', labelKey: 'sidebar.admin.seed', icon: Database },
];
