// US-071 (PB-P2-004 / FE-005). Toggle "Sólo no leídas" ↔ "Mostrar todas" (D2).
// Botón de tipo switch accesible.
'use client';

import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';
import type { NotificationStatusFilter } from '../api/notificationsApi';

export interface NotificationsFilterToggleProps {
  status: NotificationStatusFilter;
  onChange: (status: NotificationStatusFilter) => void;
}

export function NotificationsFilterToggle({
  status,
  onChange,
}: NotificationsFilterToggleProps): ReactElement {
  const t = useTranslations('notifications');
  const isUnreadOnly = status === 'unread';
  const label = isUnreadOnly ? t('showAll') : t('unreadOnly');

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isUnreadOnly}
      onClick={() => onChange(isUnreadOnly ? 'all' : 'unread')}
      className="rounded px-3 py-1 text-sm font-medium text-blue-700 outline-none hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-500"
      data-testid="us071-filter-toggle"
    >
      {label}
    </button>
  );
}
