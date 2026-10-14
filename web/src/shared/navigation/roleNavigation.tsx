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
import type { NavigationSection } from '@/shared/design-system';

/**
 * Fuente **única** de la navegación del shell autenticado: destinos por rol, en el modelo de
 * secciones del design system (`NavigationSection`), con claves i18n en vez de labels resueltos.
 *
 * Existe para que el rol deje de deducirse de la URL: hasta PB-P2-029 el layout de `(app)`
 * miraba `pathname.startsWith('/vendor')` para elegir el menú, de modo que un organizer que
 * abriese una ruta `/vendor/*` veía navegación de proveedor. Ahora el rol llega de la sesión
 * (ver `AuthenticatedShell`) y este módulo es el **único** punto donde se decide qué ve cada rol.
 *
 * Reglas:
 * - Desktop (`AppSidebar`) y mobile (`MobileNavigationDrawer`) consumen la misma salida de
 *   `resolveNavigationSections`; no hay una segunda definición de navegación (UI-DEC-008).
 * - El filtro por `allowedRoles` se aplica aquí, no en JSX: ninguna vista decide visibilidad.
 * - Es un filtro de **UX**. No autoriza nada: el backend valida cada request y
 *   `roleGuardMiddleware` protege el routing aunque la URL se escriba a mano (ADR-FE-003).
 */
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

/**
 * Sección de navegación sin resolver: la forma de `NavigationSection` con la clave i18n del
 * título en vez del texto. Sin `titleKey` ⇒ lista plana sin encabezado (organizer / vendor); la
 * clave hace también de `id` de la sección.
 */
export interface NavSectionDefinition {
  titleKey?: string;
  items: readonly NavItem[];
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

/**
 * Menú admin agrupado por dominio funcional (US-105 / ADR-FE-003). El admin ve todo el sistema;
 * los grupos facilitan el scan visual sin ocultar entradas.
 * - overview  → home + métricas del sistema
 * - content   → eventos + catálogos (categorías, tipos de evento)
 * - moderation→ vendors + reseñas (colas de aprobación)
 * - accounts  → usuarios
 * - system    → auditoría + seed demo
 */
export const ADMIN_NAV_GROUPS: NavSectionDefinition[] = [
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

/** Vista plana del menú admin. */
export const ADMIN_NAV_ITEMS: NavItem[] = ADMIN_NAV_GROUPS.flatMap((g) => g.items);

export interface RoleNavigation {
  role: Role;
  /** Clave i18n del nombre accesible del landmark `<nav>` (namespace `navigation`). */
  ariaLabelKey: string;
  /** Clave i18n del título de workspace mostrado como `Badge` de rol (UI-DEC-009). */
  workspaceKey: string;
  sections: readonly NavSectionDefinition[];
}

function sectionsForRole(
  role: Role,
  sections: readonly NavSectionDefinition[],
): NavSectionDefinition[] {
  return (
    sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.allowedRoles.includes(role)),
      }))
      // Una sección que se queda sin entradas visibles para el rol no se renderiza: evita
      // encabezados de grupo vacíos en la sidebar (UI Foundations §15).
      .filter((section) => section.items.length > 0)
  );
}

// Se resuelve una vez por rol: la salida es estable entre renders.
const ROLE_NAVIGATION: Record<Role, RoleNavigation> = {
  organizer: {
    role: 'organizer',
    ariaLabelKey: 'sidebar.organizer.label',
    workspaceKey: 'workspace.organizer',
    sections: sectionsForRole('organizer', [{ items: ORGANIZER_NAV_ITEMS }]),
  },
  vendor: {
    role: 'vendor',
    ariaLabelKey: 'sidebar.vendor.label',
    workspaceKey: 'workspace.vendor',
    sections: sectionsForRole('vendor', [{ items: VENDOR_NAV_ITEMS }]),
  },
  admin: {
    role: 'admin',
    ariaLabelKey: 'sidebar.admin.label',
    workspaceKey: 'workspace.admin',
    sections: sectionsForRole('admin', ADMIN_NAV_GROUPS),
  },
};

/**
 * Devuelve la navegación del rol, o `null` cuando no hay rol activo (sesión anónima, sesión aún
 * sin resolver y sin claim previo, o un valor de rol no soportado). `null` ⇒ el shell se monta
 * **sin navegación**: nunca se cae a `organizer` por defecto ni se muestran todas las opciones
 * mientras la sesión carga.
 */
export function getRoleNavigation(role: Role | null | undefined): RoleNavigation | null {
  if (!role || !Object.prototype.hasOwnProperty.call(ROLE_NAVIGATION, role)) return null;
  return ROLE_NAVIGATION[role];
}

/** Vista plana de los destinos visibles de un rol. Pensada para tests y verificaciones. */
export function navigationHrefsForRole(role: Role | null | undefined): string[] {
  const navigation = getRoleNavigation(role);
  if (!navigation) return [];
  return navigation.sections.flatMap((section) => section.items.map((item) => item.href));
}

/** Regla de activación: `exact` compara el pathname completo; si no, prefijo de ruta. */
export function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/**
 * Resuelve las secciones al modelo presentacional del design system: label traducido, icono
 * instanciado y ruta activa — lo que el design system no puede conocer.
 */
export function resolveNavigationSections(
  sections: readonly NavSectionDefinition[],
  pathname: string,
  t: (key: string) => string,
): NavigationSection[] {
  return sections.map((section) => ({
    id: section.titleKey ?? 'main',
    ...(section.titleKey ? { label: t(section.titleKey) } : {}),
    items: section.items.map((item) => {
      const Icon = item.icon;
      return {
        href: item.href,
        label: t(item.labelKey),
        icon: <Icon aria-hidden="true" />,
        active: isNavItemActive(pathname, item),
      };
    }),
  }));
}
