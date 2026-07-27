/**
 * Modelo de navegación compartido por desktop (`AppSidebar`) y mobile (`MobileNavigationDrawer`).
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §20 y
 * `docs/ux-ui/EventFlow-UI-Foundations.md` §15 (UI-DEC-008: un solo shell, sidebar en desktop y
 * drawer en mobile).
 *
 * REGLA: este modelo es **resuelto y presentacional**. El label ya viene traducido y el estado
 * activo ya viene calculado por el consumidor (`shared/navigation`), de modo que el design system
 * no conoce `next-intl`, `usePathname`, rutas ni permisos. Desktop y mobile consumen exactamente
 * la misma estructura — no existe una segunda definición de navegación.
 */
import type { ReactNode } from 'react';

/** Contador opcional de un ítem de navegación (p. ej. cotizaciones nuevas). */
export interface NavigationItemBadge {
  count: number;
  /** Nombre accesible del contador ya traducido (p. ej. `3 notificaciones sin leer`). */
  label: string;
}

export interface NavigationItem {
  /** Ruta interna de Next.js. El design system no la valida ni la inventa. */
  href: string;
  /** Label visible **ya traducido**. Nunca puede sustituirse por el icono. */
  label: string;
  /** Icono `lucide-react`. Se renderiza `aria-hidden`: el nombre lo aporta el label visible. */
  icon: ReactNode;
  /** `true` cuando la ruta actual coincide → `aria-current="page"`. */
  active?: boolean;
  badge?: NavigationItemBadge;
  /**
   * Sólo para incapacidad técnica real (p. ej. destino aún no montado). **No** se usa para
   * comunicar falta de permisos: los ítems sin permiso se ocultan (Component Foundations §20).
   */
  disabled?: boolean;
  /** Se propaga a `next/link`; `undefined` conserva el prefetch por defecto de Next. */
  prefetch?: boolean;
}

export interface NavigationSection {
  /** Clave estable de React y ancla del `aria-labelledby` del grupo. */
  id: string;
  /** Título del grupo **ya traducido**. Ausente ⇒ lista plana sin encabezado. */
  label?: string;
  /**
   * Oculta visualmente el título conservando el nombre accesible del grupo (`sr-only`).
   * Sólo tiene efecto cuando `label` existe.
   */
  labelHidden?: boolean;
  items: readonly NavigationItem[];
}
