'use client';

// Hooks TanStack — admin categories (US-075 / FE-005). Mutations invalidan la lista.
// Además propagan a `['vendor-profile','service-categories']` (US-042) y
// `['service-categories']` (`vendor/services` page) para que consumers públicos vean
// el catálogo actualizado tras cambios admin.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminCategoriesApi } from '../api/adminCategoriesApi';
import type {
  AdminCategoriesListDTO,
  AdminCategoryNode,
  CreateCategoryBodyDTO,
  DeleteCategoryBodyDTO,
  UpdateCategoryBodyDTO,
} from '../api/adminCategoriesApi.types';
import type { ApiError } from '@/shared/api-client';

export const adminCategoriesKeys = {
  all: ['admin', 'categories'] as const,
  list: () => ['admin', 'categories', 'list'] as const,
} as const;

/** Prefijos externos que también deben invalidarse cuando el catálogo cambia. */
const PUBLIC_CATEGORY_QUERY_KEYS: readonly (readonly unknown[])[] = [
  ['vendor-profile', 'service-categories'],
  ['service-categories'],
];

function invalidatePublic(qc: ReturnType<typeof useQueryClient>): void {
  for (const key of PUBLIC_CATEGORY_QUERY_KEYS) {
    void qc.invalidateQueries({ queryKey: key });
  }
}

export function useAdminCategoriesList(enabled = true) {
  return useQuery<AdminCategoriesListDTO, ApiError>({
    queryKey: adminCategoriesKeys.list(),
    queryFn: () => adminCategoriesApi.list(),
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation<AdminCategoryNode, ApiError, CreateCategoryBodyDTO>({
    mutationFn: (body) => adminCategoriesApi.create(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminCategoriesKeys.all });
      invalidatePublic(qc);
    },
  });
}

export interface UpdateCategoryInput extends UpdateCategoryBodyDTO {
  id: string;
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation<AdminCategoryNode, ApiError, UpdateCategoryInput>({
    mutationFn: ({ id, ...body }) => adminCategoriesApi.update(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminCategoriesKeys.all });
      invalidatePublic(qc);
    },
  });
}

export interface DeleteCategoryInput extends DeleteCategoryBodyDTO {
  id: string;
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation<AdminCategoryNode, ApiError, DeleteCategoryInput>({
    mutationFn: ({ id, reason }) => adminCategoriesApi.softDelete(id, { reason }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminCategoriesKeys.all });
      invalidatePublic(qc);
    },
  });
}
