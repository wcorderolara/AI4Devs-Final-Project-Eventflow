// US-072 (PB-P2-008 / FE-002). Hooks TanStack para las mutations de mark-as-read.
//
// Estrategia optimistic + rollback:
//   * `onMutate` — cancela queries en vuelo, hace snapshot del cache activo bajo
//     `['notifications', 'me', ...]`, aplica el patch (marca leído + decrementa
//     `unreadCount`).
//   * `onError` — restaura el snapshot completo. El caller decide si mostrar un
//     toast (fuera del hook para no acoplar UI).
//   * `onSettled` — invalida `['notifications', 'me']` para re-sync con el server
//     (funciona tanto en éxito como en error para asegurar consistencia final).
//
// Query keys canónicas heredadas de US-071 `notificationsKeys.me`.
'use client';

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import {
  notificationsApi,
  type ListNotificationsResult,
  type NotificationChannelFilter,
  type NotificationDto,
} from '../api/notificationsApi';
import { notificationsKeys } from './useNotifications';

/**
 * Snapshot completo de todas las queries `['notifications', 'me', ...]` activas
 * en el cache antes del optimistic update. Usado para restaurar ante error.
 */
type CacheSnapshot = Array<[readonly unknown[], ListNotificationsResult | undefined]>;

/**
 * Aplica el patch optimistic a una entrada `ListNotificationsResult` — marca la
 * notif objetivo como `read` (o TODAS si `notificationId` es `null`) y
 * recomputa `unreadCount` basándose en el conteo de `unread` restantes.
 */
function patchListWithRead(
  previous: ListNotificationsResult | undefined,
  notificationId: string | null,
  channelFilter: NotificationChannelFilter | null,
): ListNotificationsResult | undefined {
  if (!previous) return previous;
  const nowIso = new Date().toISOString();
  const items = previous.items.map((n) => {
    if (n.status === 'read') return n;
    const matchesTarget =
      notificationId === null ||
      (notificationId !== null && n.id === notificationId);
    const matchesChannel =
      channelFilter === null ||
      channelFilter === 'all' ||
      n.channel === channelFilter;
    if (!matchesTarget || !matchesChannel) return n;
    return { ...n, status: 'read' as const, read_at: nowIso };
  });
  const unreadCount = items.filter((n) => n.status === 'unread').length;
  return { ...previous, items, unreadCount };
}

async function snapshotAndPatch(
  queryClient: ReturnType<typeof useQueryClient>,
  patch: (prev: ListNotificationsResult | undefined) => ListNotificationsResult | undefined,
): Promise<CacheSnapshot> {
  await queryClient.cancelQueries({ queryKey: notificationsKeys.me });
  const entries = queryClient.getQueriesData<ListNotificationsResult>({
    queryKey: notificationsKeys.me,
  });
  const snapshot: CacheSnapshot = entries.map(([key, data]) => [key, data]);
  for (const [key, data] of entries) {
    queryClient.setQueryData<ListNotificationsResult>(key, patch(data));
  }
  return snapshot;
}

function restoreSnapshot(
  queryClient: ReturnType<typeof useQueryClient>,
  snapshot: CacheSnapshot,
): void {
  for (const [key, data] of snapshot) {
    queryClient.setQueryData(key, data);
  }
}

export type UseMarkNotificationAsReadResult = UseMutationResult<
  void,
  Error,
  string,
  { snapshot: CacheSnapshot }
>;

/**
 * Mark single hook. `mutate(notificationId)` aplica optimistic patch y hace
 * rollback ante 4xx/5xx. Invalida al terminar para reconciliar con el server.
 */
export function useMarkNotificationAsRead(): UseMarkNotificationAsReadResult {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string, { snapshot: CacheSnapshot }>({
    mutationFn: (notificationId) => notificationsApi.markAsRead(notificationId),
    onMutate: async (notificationId) => {
      const snapshot = await snapshotAndPatch(queryClient, (prev) =>
        patchListWithRead(prev, notificationId, null),
      );
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) restoreSnapshot(queryClient, ctx.snapshot);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationsKeys.me });
    },
  });
}

export type UseMarkAllNotificationsAsReadResult = UseMutationResult<
  void,
  Error,
  NotificationChannelFilter | void,
  { snapshot: CacheSnapshot }
>;

/**
 * Mark-all bulk hook. `mutate()` usa el default `in_app`; se puede pasar un
 * `channel` explícito. Patch optimistic marca TODAS las notifs `unread` del
 * cache que matcheen el `channel` (o todas si `channel='all'`).
 */
export function useMarkAllNotificationsAsRead(): UseMarkAllNotificationsAsReadResult {
  const queryClient = useQueryClient();
  return useMutation<
    void,
    Error,
    NotificationChannelFilter | void,
    { snapshot: CacheSnapshot }
  >({
    mutationFn: (channel) => notificationsApi.markAllAsRead(channel ?? 'in_app'),
    onMutate: async (channel) => {
      const effectiveChannel: NotificationChannelFilter =
        (channel ?? 'in_app') as NotificationChannelFilter;
      const snapshot = await snapshotAndPatch(queryClient, (prev) =>
        patchListWithRead(prev, null, effectiveChannel),
      );
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) restoreSnapshot(queryClient, ctx.snapshot);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationsKeys.me });
    },
  });
}

/** Export interno para tests que necesiten construir un patch determinista. */
export const __internal = { patchListWithRead };

/** Re-export para consumidores externos que quieran el shape del item. */
export type { NotificationDto };
