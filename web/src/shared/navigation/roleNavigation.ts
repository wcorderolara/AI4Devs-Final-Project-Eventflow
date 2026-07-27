import type { Role } from '@/shared/authorization';
import {
  ADMIN_NAV_GROUPS,
  ORGANIZER_NAV_ITEMS,
  VENDOR_NAV_ITEMS,
  type NavGroup,
  type NavItem,
} from './navItems';

/**
 * Resolución **única y tipada** de la navegación del shell autenticado a partir del rol activo.
 *
 * Existe para que el rol deje de deducirse de la URL: hasta PB-P2-029 el layout de `(app)`
 * miraba `pathname.startsWith('/vendor')` para elegir el menú, de modo que un organizer que
 * abriese una ruta `/vendor/*` veía navegación de proveedor. Ahora el rol llega de la sesión
 * (ver `AuthenticatedShell`) y este módulo es el **único** punto donde se decide qué ve cada rol.
 *
 * Reglas:
 * - Desktop (`AppSidebar`) y mobile (`MobileNavigationDrawer`) consumen esta misma salida; no hay
 *   una segunda definición de navegación (UI-DEC-008).
 * - El filtro por `allowedRoles` se aplica aquí, no en JSX: ninguna vista decide visibilidad.
 * - Es un filtro de **UX**. No autoriza nada: el backend valida cada request y
 *   `roleGuardMiddleware` protege el routing aunque la URL se escriba a mano (ADR-FE-003).
 */
export interface RoleNavigation {
  role: Role;
  /** Clave i18n del nombre accesible del landmark `<nav>` (namespace `navigation`). */
  ariaLabelKey: string;
  /** Clave i18n del título de workspace mostrado como `Badge` de rol (UI-DEC-009). */
  workspaceKey: string;
  /** Modo plano (organizer / vendor): una sección sin título. */
  items?: readonly NavItem[];
  /** Modo agrupado (admin): una sección por grupo. */
  groups?: readonly NavGroup[];
}

function itemsForRole(role: Role, items: readonly NavItem[]): NavItem[] {
  return items.filter((item) => item.allowedRoles.includes(role));
}

function groupsForRole(role: Role, groups: readonly NavGroup[]): NavGroup[] {
  return (
    groups
      .map((group) => ({ ...group, items: itemsForRole(role, group.items) }))
      // Una sección que se queda sin entradas visibles para el rol no se renderiza: evita
      // encabezados de grupo vacíos en la sidebar (UI Foundations §15).
      .filter((group) => group.items.length > 0)
  );
}

/**
 * Devuelve la navegación del rol, o `null` cuando no hay rol activo (sesión anónima, sesión aún
 * sin resolver y sin claim previo, o un valor de rol no soportado). `null` ⇒ el shell se monta
 * **sin navegación**: nunca se cae a `organizer` por defecto ni se muestran todas las opciones
 * mientras la sesión carga.
 */
export function getRoleNavigation(role: Role | null | undefined): RoleNavigation | null {
  switch (role) {
    case 'organizer':
      return {
        role,
        ariaLabelKey: 'sidebar.organizer.label',
        workspaceKey: 'workspace.organizer',
        items: itemsForRole(role, ORGANIZER_NAV_ITEMS),
      };
    case 'vendor':
      return {
        role,
        ariaLabelKey: 'sidebar.vendor.label',
        workspaceKey: 'workspace.vendor',
        items: itemsForRole(role, VENDOR_NAV_ITEMS),
      };
    case 'admin':
      return {
        role,
        ariaLabelKey: 'sidebar.admin.label',
        workspaceKey: 'workspace.admin',
        groups: groupsForRole(role, ADMIN_NAV_GROUPS),
      };
    default:
      return null;
  }
}

/** Vista plana de los destinos visibles de un rol. Pensada para tests y verificaciones. */
export function navigationHrefsForRole(role: Role | null | undefined): string[] {
  const navigation = getRoleNavigation(role);
  if (!navigation) return [];
  if (navigation.groups)
    return navigation.groups.flatMap((group) => group.items.map((i) => i.href));
  return (navigation.items ?? []).map((item) => item.href);
}
