'use client';

import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import type { NavigationSection } from '@/shared/design-system';
import type { NavGroup, NavItem } from './navItems';

/**
 * Adaptador entre el **modelo de navegación de la aplicación** (`navItems.ts`: rutas, claves i18n
 * y flag `exact`) y el **modelo presentacional del design system** (`NavigationSection`).
 *
 * Existe para que desktop (`AppSidebar`) y mobile (`MobileNavigationDrawer`) consuman
 * exactamente las mismas secciones: la navegación se define **una sola vez**
 * (UI-DEC-008 / Component Foundations §20).
 *
 * Aquí viven las tres piezas que el design system no puede conocer: la traducción del label,
 * el cálculo de la ruta activa y el `LucideIcon` ya instanciado.
 */

/** Regla de activación existente: `exact` compara el pathname completo; si no, prefijo de ruta. */
export function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export interface UseNavigationSectionsInput {
  /** Modo plano (organizer / vendor): una sección sin título. */
  items?: readonly NavItem[];
  /** Modo agrupado (admin): una sección por grupo, con título traducido. */
  groups?: readonly NavGroup[];
}

export function useNavigationSections({
  items,
  groups,
}: UseNavigationSectionsInput): NavigationSection[] {
  const pathname = usePathname();
  const t = useTranslations('navigation');

  return useMemo(() => {
    const toItem = (item: NavItem) => {
      const Icon = item.icon;
      return {
        href: item.href,
        label: t(item.labelKey),
        icon: <Icon aria-hidden="true" />,
        active: isNavItemActive(pathname, item),
      };
    };

    if (groups) {
      return groups.map((group) => ({
        id: group.titleKey,
        label: t(group.titleKey),
        items: group.items.map(toItem),
      }));
    }

    return [{ id: 'main', items: (items ?? []).map(toItem) }];
  }, [groups, items, pathname, t]);
}
