// US-071 (PB-P2-004 / FE-003). `NotificationsBell` — botón + badge unread + dropdown
// accesible con `role="menu"`, navegación por teclado y foco visible.
//
// Interacción soportada:
//   * Enter/Space sobre el bell → abre el menú y foco al primer item.
//   * Esc → cierra y regresa foco al bell.
//   * ↑/↓ → navegación entre items.
//   * Tab / click fuera → cierra el menú (patrón menú vs modal).
//
// Sin dependencia de librerías de dropdown externas (Radix está disponible en el
// proyecto pero mantenemos el componente autocontenido para simplificar el testing
// con jest-axe).
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { KeyboardEvent, ReactElement } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import type { NotificationStatusFilter } from '../api/notificationsApi';
import { UnreadBadge } from './UnreadBadge';
import { NotificationItem } from './NotificationItem';
import { NotificationsFilterToggle } from './NotificationsFilterToggle';
import {
  NotificationsEmptyState,
  NotificationsErrorBanner,
  NotificationsLoadingState,
} from './NotificationsStates';
// US-072 (PB-P2-008 / FE-004): botón bulk en el footer del dropdown.
import { MarkAllAsReadButton } from './MarkAllAsReadButton';

export interface NotificationsBellProps {
  /**
   * Cuando `true`, el dropdown arranca abierto. Útil para pruebas de A11Y sin
   * simular la interacción del bell. Default `false`.
   */
  initialOpen?: boolean;
}

export function NotificationsBell({ initialOpen = false }: NotificationsBellProps): ReactElement {
  const t = useTranslations('notifications');
  const [open, setOpen] = useState(initialOpen);
  const [statusFilter, setStatusFilter] = useState<NotificationStatusFilter>('all');
  const [page, setPage] = useState(1);
  // US-072 (FE-002/003/004): toast de error localizado — se muestra si la mutation falla.
  const [markError, setMarkError] = useState<string | null>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError, refetch } = useNotifications({
    status: statusFilter,
    page,
    pageSize: 10,
    enabled: open, // sólo consulta al abrir el dropdown (evita fetch inicial oculto)
  });

  // Cierra el dropdown al hacer click fuera.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (event: MouseEvent): void => {
      const target = event.target as Node | null;
      if (menuRef.current?.contains(target) || bellRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return (): void => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  // Esc cierra y regresa foco al bell.
  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      setOpen(false);
      bellRef.current?.focus();
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const items =
        menuRef.current?.querySelectorAll<HTMLButtonElement>('li[data-us071-type] button') ?? [];
      const list = Array.from(items).filter((it) => !it.disabled);
      if (list.length === 0) return;
      const currentIndex = list.findIndex((it) => it === document.activeElement);
      const next =
        event.key === 'ArrowDown'
          ? list[(currentIndex + 1) % list.length]
          : list[(currentIndex - 1 + list.length) % list.length];
      next?.focus();
    }
  };

  const unreadCount = data?.unreadCount ?? 0;
  const total = data?.pagination.total ?? 0;
  const showLoadMore = useMemo(
    () => (data ? data.pagination.page * data.pagination.pageSize < data.pagination.total : false),
    [data],
  );

  return (
    <div className="relative">
      <button
        ref={bellRef}
        type="button"
        aria-label={t('bellAria', { count: unreadCount })}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-700 outline-none hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-blue-500"
        data-testid="us071-bell"
      >
        <span aria-hidden="true" className="text-lg">
          {'\u{1F514}'}
        </span>
        <span className="absolute -right-1 -top-1">
          <UnreadBadge count={unreadCount} ariaLabel={t('unreadCountAria', { count: unreadCount })} />
        </span>
      </button>

      {open ? (
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-static-element-interactions -- role="dialog" makes this an interactive container; onKeyDown implements ESC/arrows navigation (AC-07)
        <div
          ref={menuRef}
          role="dialog"
          aria-modal="false"
          aria-labelledby="us071-notifications-title"
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 z-50 mt-2 w-96 rounded-lg border border-gray-200 bg-white shadow-lg outline-none"
          data-testid="us071-dropdown"
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h2 id="us071-notifications-title" className="text-sm font-semibold text-gray-900">
              {t('title')}
            </h2>
            <NotificationsFilterToggle
              status={statusFilter}
              onChange={(next) => {
                setStatusFilter(next);
                setPage(1);
              }}
            />
          </div>
          {isLoading ? <NotificationsLoadingState /> : null}
          {!isLoading && isError ? (
            <NotificationsErrorBanner onRetry={() => void refetch()} />
          ) : null}
          {!isLoading && !isError && data ? (
            data.items.length === 0 ? (
              <NotificationsEmptyState />
            ) : (
              <>
                <ul className="max-h-96 overflow-y-auto" data-testid="us071-list">
                  {data.items.map((n) => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      onMarkError={() => setMarkError(t('markErrorToast'))}
                    />
                  ))}
                </ul>
                {showLoadMore ? (
                  <div className="flex justify-center border-t border-gray-100 px-4 py-2">
                    <button
                      type="button"
                      onClick={() => setPage((p) => p + 1)}
                      className="rounded px-3 py-1 text-sm font-medium text-blue-700 outline-none hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-500"
                      data-testid="us071-load-more"
                    >
                      {t('loadMore', { current: data.items.length, total })}
                    </button>
                  </div>
                ) : null}
                {/* US-072 (FE-004): footer con el botón bulk mark-all-read. */}
                <div className="flex items-center justify-end border-t border-gray-100 px-4 py-2">
                  <MarkAllAsReadButton
                    unreadCount={unreadCount}
                    onMutationError={() => setMarkError(t('markErrorToast'))}
                  />
                </div>
              </>
            )
          ) : null}
          {markError ? (
            <div
              role="alert"
              className="border-t border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800"
              data-testid="us072-mark-error-toast"
            >
              {markError}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
