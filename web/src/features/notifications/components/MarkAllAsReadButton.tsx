// US-072 (PB-P2-008 / FE-004). `MarkAllAsReadButton` — botón del footer del
// dropdown para el bulk `POST /notifications/mark-all-read`. Se deshabilita
// cuando no hay unread (`unreadCount === 0`) y muestra `aria-busy` durante la
// mutation. El backend responde 204 en 0 filas afectadas (EC-02) — el botón
// deshabilitado evita el request innecesario.
'use client';

import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';
import { useMarkAllNotificationsAsRead } from '../hooks/useMarkNotifications';

export interface MarkAllAsReadButtonProps {
  /** Conteo actual de unread. Usado para deshabilitar el botón cuando es 0. */
  unreadCount: number;
  /** Callback opcional invocado al fallar la mutation — el dropdown puede pintar el toast. */
  onMutationError?: (error: Error) => void;
}

export function MarkAllAsReadButton({
  unreadCount,
  onMutationError,
}: MarkAllAsReadButtonProps): ReactElement {
  const t = useTranslations('notifications');
  const mutation = useMarkAllNotificationsAsRead();
  const disabled = mutation.isPending || unreadCount === 0;

  const handleClick = (): void => {
    if (disabled) return;
    mutation.mutate(undefined, {
      onError: (err) => onMutationError?.(err),
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-busy={mutation.isPending || undefined}
      aria-label={t('markAllAsReadAria')}
      data-testid="us072-mark-all-as-read"
      className="inline-flex h-11 items-center justify-center rounded-md px-3 text-sm font-medium text-blue-700 outline-none hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {t('markAllAsRead')}
    </button>
  );
}
