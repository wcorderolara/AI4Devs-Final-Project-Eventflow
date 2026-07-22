// US-071 (PB-P2-004 / FE-004). `NotificationItem` — renderiza una fila del dropdown
// con destacado visual para `task_due_soon`, hora relativa localizada y click sobre
// el deep link server-side. Sin CTA si `link=null` (EC-03, `aria-disabled="true"`).
'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactElement } from 'react';
import type { NotificationDto } from '../api/notificationsApi';

export interface NotificationItemProps {
  notification: NotificationDto;
}

/** Formatea la hora relativa usando `Intl.RelativeTimeFormat` respetando el locale. */
function formatRelative(sentAt: string, locale: string): string {
  const diffMs = new Date(sentAt).getTime() - Date.now();
  const seconds = Math.round(diffMs / 1000);
  const abs = Math.abs(seconds);
  const fmt = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (abs < 60) return fmt.format(seconds, 'second');
  if (abs < 3600) return fmt.format(Math.round(seconds / 60), 'minute');
  if (abs < 86_400) return fmt.format(Math.round(seconds / 3600), 'hour');
  return fmt.format(Math.round(seconds / 86_400), 'day');
}

export function NotificationItem({ notification }: NotificationItemProps): ReactElement {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('notifications');
  const disabled = notification.link === null;
  const isT7 = notification.type === 'task_due_soon';
  const isUnread = notification.status === 'unread';

  const handleActivate = (): void => {
    if (disabled || !notification.link) return;
    router.push(notification.link);
  };

  // US-068 (PB-P2-005): destacado visual también para `quote_request_received` (vendor).
  const isQrReceived = notification.type === 'quote_request_received';
  const containerClass = [
    'group flex w-full flex-col items-start gap-1 border-b border-gray-100 px-4 py-3 text-left outline-none focus-visible:bg-gray-50',
    isT7 ? 'border-l-4 border-l-amber-500 bg-amber-50/40' : '',
    isQrReceived ? 'border-l-4 border-l-emerald-500 bg-emerald-50/40' : '',
    isUnread ? 'bg-blue-50/60' : '',
    disabled ? 'cursor-default opacity-60' : 'cursor-pointer hover:bg-gray-50',
  ].join(' ');

  return (
    <li
      data-testid={`us071-notification-item-${notification.id}`}
      data-us071-type={notification.type}
    >
      <button
        type="button"
        disabled={disabled}
        aria-disabled={disabled || undefined}
        aria-label={t('itemAria', { title: notification.title })}
        onClick={handleActivate}
        className={containerClass}
      >
        <span className="flex items-center gap-2">
          {isUnread ? (
            <span
              aria-hidden="true"
              className="inline-block h-2 w-2 flex-shrink-0 rounded-full bg-blue-600"
            />
          ) : null}
          <span className="text-sm font-semibold text-gray-900">{notification.title}</span>
        </span>
        {notification.body ? (
          <span className="text-sm text-gray-700">{notification.body}</span>
        ) : null}
        <span className="flex w-full items-center justify-between text-xs text-gray-500">
          <time dateTime={notification.sent_at}>
            {formatRelative(notification.sent_at, locale)}
          </time>
          {disabled ? <span>{t('linkUnavailable')}</span> : null}
        </span>
      </button>
    </li>
  );
}
