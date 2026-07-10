'use client';

import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * Placeholder visual de notificaciones (US-107). Icono campana + punto. Al click no abre nada;
 * el contador real y el dropdown los entrega la historia de notificaciones.
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
