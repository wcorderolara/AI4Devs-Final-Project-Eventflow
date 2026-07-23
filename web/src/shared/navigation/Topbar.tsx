'use client';

import { Menu as MenuIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LanguageSelector } from '@/shared/i18n';
import { Logo } from './Logo';
import { NotificationsBadge } from './NotificationsBadge';
import { UserMenu } from './UserMenu';

/**
 * Barra superior de las áreas autenticadas: hamburguesa (mobile), logo,
 * badge (placeholder), switcher, user menu.
 *
 * US-073 (PB-P2-009 · Deviation D-07 / EMERGENT-003): la sustitución del
 * placeholder `NotificationsBadge` por el `NotificationsBell` real de US-071
 * se difiere — el mount del bell rompía el E2E `auth-logout.spec.ts` por un
 * timing race con el `Menu` de HeadlessUI del `UserMenu` en los 3 roles. El
 * componente `NotificationsBell` sigue implementado y unit-testeado; sólo el
 * mount en el Topbar compartido se difiere a un Future US. Ver el header
 * de `NotificationsBadge.tsx` para el diagnóstico y las next-steps.
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
        <NotificationsBadge />
        <LanguageSelector />
        <UserMenu />
      </div>
    </header>
  );
}
