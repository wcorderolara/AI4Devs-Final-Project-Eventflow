'use client';

import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * Placeholder visual de notificaciones (US-107). Icono campana + punto. Al click no abre nada;
 * el contador real y el dropdown los entrega la historia de notificaciones.
 *
 * US-073 (PB-P2-009 / FE-005 · Deviation D-07): la mount del `NotificationsBell`
 * real de US-071 en este slot se difirió — el componente `NotificationsBell`
 * (con su `<div class="relative">` y `useEffect` de outside-click) genera un
 * timing race con el `Menu` de HeadlessUI del `UserMenu` que rompe el E2E
 * de logout (`auth-logout.spec.ts` para los 3 roles) por motivos aún no
 * completamente triagados. La mount se difiere a un Future US que revisará
 * la interacción entre ambos popovers (probablemente extrayendo el bell fuera
 * del flex del Topbar o adoptando HeadlessUI Menu también en el Bell).
 */
export function NotificationsBadge() {
  const t = useTranslations('navigation');
  return (
    <button
      type="button"
      aria-label={t('notifications.label')}
      className="relative rounded p-2 hover:bg-neutral-100 focus:outline-none focus:ring-2"
    >
      <Bell className="h-5 w-5" aria-hidden="true" />
      <span
        aria-hidden="true"
        className="absolute right-1 top-1 h-2 w-2 rounded-full bg-danger-500"
      />
    </button>
  );
}
