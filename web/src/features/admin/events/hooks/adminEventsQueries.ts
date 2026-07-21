'use client';

// US-078 / FE-004 — Hooks TanStack para listar eventos admin. Reusa el prefix `['admin','events']`
// definido en `useAdminEvent.ts` de US-016 para permitir invalidación conjunta si aparecen
// mutaciones futuras (por ahora el módulo es sólo lectura arquitectónico — AC-03).
import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { adminEventsApi } from '../api/adminEventsApi';
import type {
  AdminEventsListDTO,
  AdminEventsListFilters,
} from '../api/adminEventsApi.types';
import type { ApiError } from '@/shared/api-client';

export const adminEventsListKeys = {
  all: ['admin', 'events'] as const,
  list: (filters: AdminEventsListFilters) =>
    ['admin', 'events', 'list', filters] as const,
} as const;

export interface UseAdminEventsListOptions {
  enabled?: boolean;
}

export function useAdminEventsList(
  filters: AdminEventsListFilters,
  { enabled = true }: UseAdminEventsListOptions = {},
) {
  return useInfiniteQuery<
    AdminEventsListDTO,
    ApiError,
    InfiniteData<AdminEventsListDTO, string | undefined>,
    ReturnType<typeof adminEventsListKeys.list>,
    string | undefined
  >({
    queryKey: adminEventsListKeys.list(filters),
    initialPageParam: undefined,
    queryFn: ({ pageParam }) => adminEventsApi.list({ ...filters, cursor: pageParam }),
    getNextPageParam: (last) => last.pagination.nextCursor ?? undefined,
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
