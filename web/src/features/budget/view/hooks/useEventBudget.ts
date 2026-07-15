'use client';

// US-035 (PB-P1-020 / FE-001) — Hook TanStack Query para GET budget de un evento.
// Query key canónica `['event', eventId, 'budget']` compartida con US-036 (mutaciones)
// y US-037 (apply IA), permitiendo invalidación cross-feature transparente.
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { ApiError } from '@/shared/api-client';
import { budgetApi, budgetQueryKey, type GetBudgetResponseDto } from '../api/budgetApi';

export function useEventBudget(eventId: string): UseQueryResult<GetBudgetResponseDto, ApiError> {
  return useQuery<GetBudgetResponseDto, ApiError>({
    queryKey: budgetQueryKey(eventId),
    queryFn: () => budgetApi.get(eventId),
    staleTime: 30_000,
  });
}
