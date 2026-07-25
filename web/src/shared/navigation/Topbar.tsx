'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { MobileNavigationTrigger, TopBar } from '@/shared/design-system';
import { LanguageSelector } from '@/shared/i18n';
import { Logo } from './Logo';
import { NotificationsBadge } from './NotificationsBadge';
import { UserMenu } from './UserMenu';

/**
 * Barra superior de las áreas autenticadas: trigger del drawer (mobile), logo, contexto de
 * página, notificaciones, selector de idioma y menú de usuario.
 *
 * PB-P2-029: la composición y la altura (`layout.header.height`) las aporta `TopBar` del design
 * system; aquí se decide **qué** se monta. La sesión, el locale y los destinos no cambian.
 */
export function Topbar({
  onMenuOpen,
  isMenuOpen,
  drawerId,
  title,
  breadcrumb,
}: {
  onMenuOpen: () => void;
  isMenuOpen: boolean;
  /** `id` del panel del drawer, para el `aria-controls` del trigger. */
  drawerId?: string;
  /** Título contextual de la vista actual. */
  title?: ReactNode;
  /** `Breadcrumb` cuando la jerarquía aporta contexto. */
  breadcrumb?: ReactNode;
}): React.JSX.Element {
  const t = useTranslations('navigation');
  return (
    <TopBar
      menuTrigger={
        <MobileNavigationTrigger
          label={t('topbar.menuOpen')}
          isOpen={isMenuOpen}
          onOpen={onMenuOpen}
          controls={drawerId}
        />
      }
      brand={<Logo size="sm" />}
      title={title}
      breadcrumb={breadcrumb}
      actions={
        <>
          <NotificationsBadge />
          <LanguageSelector />
          <UserMenu />
        </>
      }
    />
  );
}
