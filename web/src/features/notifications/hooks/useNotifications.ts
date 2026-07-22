// US-071 (PB-P2-004 / FE-002). Hooks TanStack para el surface de notificaciones.
//
// Política (tech spec §8):
//   * `refetchOnWindowFocus: true`
//   * `refetchInterval: 60_000` (1 min) — badge unread se actualiza sin interacción
//   * `placeholderData: keepPreviousData` — paginación estable (AC-05)
//
// Query keys (declaradas para US-072 que las invalidará al mergearse):
//   * ['notifications', 'me', { channel, status, page, pageSize }]
//   * ['notifications', 'me', 'unreadCount'] — derivada del response principal
'use client';

import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  notificationsApi,
  type ListNotificationsParams,
  type ListNotificationsResult,
  type NotificationChannelFilter,
  type NotificationStatusFilter,
} from '../api/notificationsApi';

export const notificationsKeys = {
  all: ['notifications'] as const,
  me: ['notifications', 'me'] as const,
  list: (params: {
    channel: NotificationChannelFilter;
    status: NotificationStatusFilter;
    page: number;
    pageSize: number;
  }) => ['notifications', 'me', params] as const,
  unreadCount: ['notifications', 'me', 'unreadCount'] as const,
};

export interface UseNotificationsParams extends ListNotificationsParams {
  /** Habilita/deshabilita la query (por ejemplo, cuando el dropdown está cerrado). */
  enabled?: boolean;
}

/**
 * Listado paginado para el dropdown organizer. Default `channel=in_app` (D5) — sólo se
 * muestran los registros in-app, evitando duplicados con los `email_simulated` que el
 * emisor T-7 también persiste.
 */
export function useNotifications(
  params: UseNotificationsParams = {},
): UseQueryResult<ListNotificationsResult, Error> {
  const channel: NotificationChannelFilter = params.channel ?? 'in_app';
  const status: NotificationStatusFilter = params.status ?? 'all';
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;

  return useQuery<ListNotificationsResult, Error>({
    queryKey: notificationsKeys.list({ channel, status, page, pageSize }),
    queryFn: () => notificationsApi.list({ channel, status, page, pageSize }),
    enabled: params.enabled ?? true,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: false,
  });
}
