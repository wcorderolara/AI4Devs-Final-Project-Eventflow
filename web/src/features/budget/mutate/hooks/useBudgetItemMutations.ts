'use client';

// US-036 (PB-P1-020 / FE-002..004) — Hooks TanStack Query para create/update/delete de BudgetItem.
// Todos invalidan la query key canónica `['event', eventId, 'budget']` compartida con US-035/037.
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { ApiError } from '@/shared/api-client';
import type { BudgetItemDto } from '@/features/budget/view/api/budgetApi';
import { budgetQueryKey } from '@/features/budget/view/api/budgetApi';
import {
  budgetItemsApi,
  type CreateBudgetItemBody,
  type UpdateBudgetItemBody,
} from '../api/budgetItemsApi';

export function useCreateBudgetItem(eventId: string): UseMutationResult<
  BudgetItemDto,
  ApiError,
  CreateBudgetItemBody
> {
  const qc = useQueryClient();
  return useMutation<BudgetItemDto, ApiError, CreateBudgetItemBody>({
    mutationFn: (body) => budgetItemsApi.create(eventId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: budgetQueryKey(eventId) });
    },
  });
}

export function useUpdateBudgetItem(eventId: string): UseMutationResult<
  BudgetItemDto,
  ApiError,
  { itemId: string; body: UpdateBudgetItemBody }
> {
  const qc = useQueryClient();
  return useMutation<BudgetItemDto, ApiError, { itemId: string; body: UpdateBudgetItemBody }>({
    mutationFn: ({ itemId, body }) => budgetItemsApi.update(eventId, itemId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: budgetQueryKey(eventId) });
    },
  });
}

export function useDeleteBudgetItem(eventId: string): UseMutationResult<
  void,
  ApiError,
  { itemId: string }
> {
  const qc = useQueryClient();
  return useMutation<void, ApiError, { itemId: string }>({
    mutationFn: ({ itemId }) => budgetItemsApi.remove(eventId, itemId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: budgetQueryKey(eventId) });
    },
  });
}
