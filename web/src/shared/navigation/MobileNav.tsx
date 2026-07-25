'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { MobileNavigationDrawer } from '@/shared/design-system';
import type { NavGroup, NavItem } from './navItems';
import { useNavigationSections } from './useNavigationSections';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  ariaLabel: string;
  /** Modo plano (organizer/vendor). */
  items?: NavItem[];
  /** Modo agrupado (admin). */
  groups?: NavGroup[];
  /** Bloque de cuenta al pie del drawer (nombre, email, cerrar sesión). */
  footer?: ReactNode;
  /** `id` del panel, para enlazarlo con el `aria-controls` del trigger del `Topbar`. */
  panelId?: string;
}

/**
 * Drawer de navegación mobile.
 *
 * PB-P2-029: delega en `MobileNavigationDrawer` del design system, que sigue apoyándose en el
 * `<Dialog>` de Headless UI (focus trap + `Escape` + clic fuera + retorno de foco al trigger +
 * bloqueo del scroll del body) y añade título accesible, objetivos táctiles de 44 px y zona de
 * cuenta al pie. Consume `useNavigationSections`, la **misma** fuente que la sidebar desktop.
 */
export function MobileNav({
  items,
  groups,
  isOpen,
  onClose,
  ariaLabel,
  footer,
  panelId,
}: MobileNavProps): React.JSX.Element {
  const t = useTranslations('navigation');
  const sections = useNavigationSections({ items, groups });

  return (
    <MobileNavigationDrawer
      open={isOpen}
      onClose={onClose}
      ariaLabel={ariaLabel}
      title={t('mobile.title')}
      closeLabel={t('mobile.close')}
      sections={sections}
      footer={footer}
      panelId={panelId}
    />
  );
}
