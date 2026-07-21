// US-080 / FE-005 — Hooks TanStack para listar el audit log admin. QueryKey único
// `['admin', 'admin-actions']` (no colisiona con `['admin', 'events']`, `['admin', 'reviews']`
// ni con `['admin', 'metrics']` de US-079).
import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { adminActionsApi } from '../api/adminActionsApi';
import type {
  AdminActionsListDTO,
  AdminActionsListFilters,
} from '../api/adminActionsApi.types';
import type { ApiError } from '@/shared/api-client';

export const adminActionsListKeys = {
  all: ['admin', 'admin-actions'] as const,
  list: (filters: AdminActionsListFilters) =>
    ['admin', 'admin-actions', 'list', filters] as const,
} as const;

export interface UseAdminActionsListOptions {
  enabled?: boolean;
}

export function useAdminActionsList(
  filters: AdminActionsListFilters,
  { enabled = true }: UseAdminActionsListOptions = {},
) {
  return useInfiniteQuery<
    AdminActionsListDTO,
    ApiError,
    InfiniteData<AdminActionsListDTO, string | undefined>,
    ReturnType<typeof adminActionsListKeys.list>,
    string | undefined
  >({
    queryKey: adminActionsListKeys.list(filters),
    initialPageParam: undefined,
    queryFn: ({ pageParam }) => adminActionsApi.list({ ...filters, cursor: pageParam }),
    getNextPageParam: (last) => last.pagination.nextCursor ?? undefined,
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
