'use client';

import type { ReactNode } from 'react';
import { AppSidebar } from '@/shared/design-system';
import type { NavGroup, NavItem } from './navItems';
import { useNavigationSections } from './useNavigationSections';

interface SidebarProps {
  ariaLabel: string;
  /** Modo plano: lista simple de items sin secciones (organizer/vendor). */
  items?: NavItem[];
  /** Modo agrupado: items divididos en secciones con título (admin). */
  groups?: NavGroup[];
  /** Contexto de workspace/rol en la cabecera de la sidebar. */
  header?: ReactNode;
}

/**
 * Sidebar de navegación (desktop). Oculta por debajo de `lg`, donde la sustituye `<MobileNav>`.
 *
 * PB-P2-029: pasa a ser el adaptador entre el modelo de navegación de la aplicación y
 * `AppSidebar` del design system. Las rutas, los grupos y los permisos no cambian; sólo cambia
 * quién pinta el markup. Desktop y mobile comparten `useNavigationSections`, de modo que existe
 * **una única** definición de navegación.
 */
export function Sidebar({ items, groups, ariaLabel, header }: SidebarProps): React.JSX.Element {
  const sections = useNavigationSections({ items, groups });
  return <AppSidebar ariaLabel={ariaLabel} sections={sections} header={header} />;
}
