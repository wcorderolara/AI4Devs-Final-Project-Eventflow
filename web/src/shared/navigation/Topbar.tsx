'use client';

import { Menu as MenuIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LanguageSelector } from '@/shared/i18n';
import { NotificationsBell } from '@/features/notifications';
import { Logo } from './Logo';
import { UserMenu } from './UserMenu';

/**
 * Barra superior de las áreas autenticadas: hamburguesa (mobile), logo, bell,
 * switcher, user menu.
 *
 * US-073 (PB-P2-009 / FE-005): reemplaza el placeholder `NotificationsBadge`
 * (US-107) por el `NotificationsBell` real de US-071. El vendor layout no
 * tiene header propio — su header autenticado viene de este `Topbar`. Esto
 * satisface AC-01 (bell visible en el header del vendor) y simultáneamente
 * completa el mount pendiente del bell para organizer (US-071).
 */
export function Topbar({
  onMenuOpen,
  isMenuOpen,
}: {
  onMenuOpen: () => void;
  isMenuOpen: boolean;
}) {
  const t = useTranslations('navigation');
  return (
    <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onMenuOpen}
          aria-label={t('topbar.menuOpen')}
          aria-expanded={isMenuOpen}
          className="rounded p-2 hover:bg-neutral-100 focus:outline-none focus:ring-2 lg:hidden"
        >
          <MenuIcon className="h-5 w-5" aria-hidden="true" />
        </button>
        <Logo size="sm" />
      </div>
      <div className="flex items-center gap-2">
        <NotificationsBell />
        <LanguageSelector />
        <UserMenu />
      </div>
    </header>
  );
}
