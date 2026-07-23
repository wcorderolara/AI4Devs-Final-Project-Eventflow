// US-072 (PB-P2-008 / FE-003). `MarkAsReadButton` — botón inline por
// `NotificationItem` para el single mark-as-read. Optimistic UI heredado del
// hook `useMarkNotificationAsRead`; el hook aplica el patch y hace rollback
// ante 4xx/5xx.
//
// A11Y (AC-09):
//   * `aria-label` localizado con el título de la notif.
//   * Foco visible (ring azul).
//   * Área táctil ≥ 44×44 px (mobile-first).
//   * `aria-busy` durante la mutation (feedback ARIA para lectores de pantalla).
//   * El toast de error se muestra a nivel de dropdown (patrón US-071) — este
//     componente NO renderiza el toast; sólo delega el error al hook.
'use client';

import { useTranslations } from 'next-intl';
import type { MouseEvent, ReactElement } from 'react';
import { useMarkNotificationAsRead } from '../hooks/useMarkNotifications';

export interface MarkAsReadButtonProps {
  notificationId: string;
  notificationTitle: string;
  /** Callback opcional invocado al fallar la mutation — el dropdown puede pintar el toast. */
  onMutationError?: (error: Error) => void;
}

export function MarkAsReadButton({
  notificationId,
  notificationTitle,
  onMutationError,
}: MarkAsReadButtonProps): ReactElement {
  const t = useTranslations('notifications');
  const mutation = useMarkNotificationAsRead();

  const handleClick = (event: MouseEvent<HTMLButtonElement>): void => {
    // El botón vive DENTRO del `<button>` del `NotificationItem` (que navega al
    // deep link). `stopPropagation` evita disparar la navegación al marcar.
    event.stopPropagation();
    if (mutation.isPending) return;
    mutation.mutate(notificationId, {
      onError: (err) => onMutationError?.(err),
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={mutation.isPending}
      aria-busy={mutation.isPending || undefined}
      aria-label={t('markAsReadAria', { title: notificationTitle })}
      data-testid={`us072-mark-as-read-${notificationId}`}
      className="inline-flex h-11 min-w-11 items-center justify-center rounded-md px-2 text-xs font-medium text-blue-700 outline-none hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-wait disabled:opacity-50"
    >
      {t('markAsRead')}
    </button>
  );
}
