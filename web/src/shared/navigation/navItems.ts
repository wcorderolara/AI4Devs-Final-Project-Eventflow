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
import type { Role } from '@/shared/authorization';

export interface NavItem {
  href: string;
  /** Clave i18n relativa al namespace `navigation` (p. ej. `sidebar.organizer.events`). */
  labelKey: string;
  icon: LucideIcon;
  /**
   * Roles a los que la entrada puede mostrarse. Es un **filtro de UX declarado en el modelo**, no
   * una autorización: `getRoleNavigation()` lo aplica para que ningún destino de otro rol pueda
   * llegar al DOM ni al árbol de accesibilidad. La autorización real la ejerce el backend
   * (ADR-FE-003 / BR-AUTH-009/010) y, para el routing, `roleGuardMiddleware`.
   */
  allowedRoles: readonly Role[];
  /** `true` → activo solo con match exacto de pathname; `false`/omitido → `startsWith`. */
  exact?: boolean;
}

const ORGANIZER_ONLY: readonly Role[] = ['organizer'];
const VENDOR_ONLY: readonly Role[] = ['vendor'];
const ADMIN_ONLY: readonly Role[] = ['admin'];

/**
 * Entradas presentes en **más de un rol** con la misma responsabilidad («mis notificaciones»,
 * «mi perfil»), definidas una sola vez y parametrizadas por el área del rol. Cada rol las coloca
 * en la posición que le corresponde en su propio menú, de modo que se comparte la definición sin
 * imponer un orden común.
 *
 * Las acciones de cuenta comunes a los **tres** roles (perfil, idioma, cerrar sesión) no se
 * duplican aquí: viven una única vez en el `UserMenu` / `LanguageSelector` del `Topbar`.
 */
type SelfServiceArea = 'organizer' | 'vendor';

function notificationsItem(area: SelfServiceArea): NavItem {
  return {
    href: `/${area}/notifications`,
    labelKey: `sidebar.${area}.notifications`,
    icon: Bell,
    allowedRoles: [area],
  };
}

function profileItem(area: SelfServiceArea): NavItem {
  return {
    href: `/${area}/profile`,
    labelKey: `sidebar.${area}.profile`,
    icon: User,
    allowedRoles: [area],
  };
}

export const ORGANIZER_NAV_ITEMS: NavItem[] = [
  {
    href: '/organizer',
    labelKey: 'sidebar.organizer.dashboard',
    icon: LayoutDashboard,
    allowedRoles: ORGANIZER_ONLY,
    exact: true,
  },
  {
    href: '/organizer/events',
    labelKey: 'sidebar.organizer.events',
    icon: Calendar,
    allowedRoles: ORGANIZER_ONLY,
  },
  {
    href: '/organizer/vendors',
    labelKey: 'sidebar.organizer.vendors',
    icon: Store,
    allowedRoles: ORGANIZER_ONLY,
  },
  notificationsItem('organizer'),
  profileItem('organizer'),
];

export const VENDOR_NAV_ITEMS: NavItem[] = [
  {
    href: '/vendor',
    labelKey: 'sidebar.vendor.dashboard',
    icon: LayoutDashboard,
    allowedRoles: VENDOR_ONLY,
    exact: true,
  },
  profileItem('vendor'),
  {
    href: '/vendor/portfolio',
    labelKey: 'sidebar.vendor.portfolio',
    icon: Briefcase,
    allowedRoles: VENDOR_ONLY,
  },
  {
    href: '/vendor/services',
    labelKey: 'sidebar.vendor.services',
    icon: Package,
    allowedRoles: VENDOR_ONLY,
  },
  {
    href: '/vendor/quotes',
    labelKey: 'sidebar.vendor.quotes',
    icon: FileText,
    allowedRoles: VENDOR_ONLY,
  },
  {
    href: '/vendor/reviews',
    labelKey: 'sidebar.vendor.reviews',
    icon: Star,
    allowedRoles: VENDOR_ONLY,
  },
  notificationsItem('vendor'),
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
    items: [
      {
        href: '/admin/metrics',
        labelKey: 'sidebar.admin.metrics',
        icon: Activity,
        allowedRoles: ADMIN_ONLY,
      },
    ],
  },
  {
    titleKey: 'sidebar.admin.groups.content',
    items: [
      {
        href: '/admin/events',
        labelKey: 'sidebar.admin.events',
        icon: Calendar,
        allowedRoles: ADMIN_ONLY,
      },
      {
        href: '/admin/categories',
        labelKey: 'sidebar.admin.categories',
        icon: ListTree,
        allowedRoles: ADMIN_ONLY,
      },
      {
        href: '/admin/event-types',
        labelKey: 'sidebar.admin.eventTypes',
        icon: Tags,
        allowedRoles: ADMIN_ONLY,
      },
    ],
  },
  {
    titleKey: 'sidebar.admin.groups.moderation',
    items: [
      {
        href: '/admin/vendors',
        labelKey: 'sidebar.admin.vendors',
        icon: Store,
        allowedRoles: ADMIN_ONLY,
      },
      {
        href: '/admin/reviews',
        labelKey: 'sidebar.admin.reviews',
        icon: MessageSquare,
        allowedRoles: ADMIN_ONLY,
      },
    ],
  },
  {
    titleKey: 'sidebar.admin.groups.accounts',
    items: [
      {
        href: '/admin/users',
        labelKey: 'sidebar.admin.users',
        icon: Users,
        allowedRoles: ADMIN_ONLY,
      },
    ],
  },
  {
    titleKey: 'sidebar.admin.groups.system',
    items: [
      {
        href: '/admin/admin-actions',
        labelKey: 'sidebar.admin.adminActions',
        icon: History,
        allowedRoles: ADMIN_ONLY,
      },
      {
        href: '/admin/seed',
        labelKey: 'sidebar.admin.seed',
        icon: Database,
        allowedRoles: ADMIN_ONLY,
      },
    ],
  },
];

/** Vista plana del menú admin (retrocompatibilidad para consumers que esperan `NavItem[]`). */
export const ADMIN_NAV_ITEMS: NavItem[] = ADMIN_NAV_GROUPS.flatMap((g) => g.items);
