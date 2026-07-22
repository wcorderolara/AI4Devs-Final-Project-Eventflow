'use client';

import { useQuery } from '@tanstack/react-query';
import type { ApiError } from '@/shared/api-client';
import { adminUsersApi } from '../api/adminUsersApi';
import type { AdminUsersListDTO, AdminUsersQuery } from '../api/adminUsersApi.types';

export const adminUsersKeys = {
  all: ['admin', 'users'] as const,
  list: (q: AdminUsersQuery) => ['admin', 'users', 'list', q] as const,
} as const;

export function useAdminUsers(query: AdminUsersQuery) {
  return useQuery<AdminUsersListDTO, ApiError>({
    queryKey: adminUsersKeys.list(query),
    queryFn: () => adminUsersApi.list(query),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
