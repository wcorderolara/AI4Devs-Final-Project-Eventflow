import {
  Activity,
  Bell,
  Briefcase,
  Calendar,
  Database,
  FileText,
  History,
  LayoutDashboard,
  type LucideIcon,
  ListTree,
  MessageSquare,
  Package,
  Star,
  Store,
  Tags,
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
  { href: '/organizer', labelKey: 'sidebar.organizer.dashboard', icon: LayoutDashboard, exact: true },
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

export interface NavGroup {
  /** Clave i18n relativa a `navigation` (p. ej. `sidebar.admin.groups.overview`). */
  titleKey: string;
  items: NavItem[];
}

/**
 * Menú admin agrupado por dominio funcional (US-105 / ADR-FE-003). El admin ve todo el sistema;
 * los grupos facilitan el scan visual sin ocultar entradas.
 * - overview  → home + métricas del sistema
 * - content   → eventos + catálogos (categorías, tipos de evento)
 * - moderation→ vendors + reseñas (colas de aprobación)
 * - accounts  → usuarios
 * - system    → auditoría + seed demo
 */
export const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    titleKey: 'sidebar.admin.groups.overview',
    items: [{ href: '/admin/metrics', labelKey: 'sidebar.admin.metrics', icon: Activity }],
  },
  {
    titleKey: 'sidebar.admin.groups.content',
    items: [
      { href: '/admin/events', labelKey: 'sidebar.admin.events', icon: Calendar },
      { href: '/admin/categories', labelKey: 'sidebar.admin.categories', icon: ListTree },
      { href: '/admin/event-types', labelKey: 'sidebar.admin.eventTypes', icon: Tags },
    ],
  },
  {
    titleKey: 'sidebar.admin.groups.moderation',
    items: [
      { href: '/admin/vendors', labelKey: 'sidebar.admin.vendors', icon: Store },
      { href: '/admin/reviews', labelKey: 'sidebar.admin.reviews', icon: MessageSquare },
    ],
  },
  {
    titleKey: 'sidebar.admin.groups.accounts',
    items: [{ href: '/admin/users', labelKey: 'sidebar.admin.users', icon: Users }],
  },
  {
    titleKey: 'sidebar.admin.groups.system',
    items: [
      { href: '/admin/admin-actions', labelKey: 'sidebar.admin.adminActions', icon: History },
      { href: '/admin/seed', labelKey: 'sidebar.admin.seed', icon: Database },
    ],
  },
];

/** Vista plana del menú admin (retrocompatibilidad para consumers que esperan `NavItem[]`). */
export const ADMIN_NAV_ITEMS: NavItem[] = ADMIN_NAV_GROUPS.flatMap((g) => g.items);
