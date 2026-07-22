'use client';

// Hook TanStack Query — surface del último `AIRecommendation` `quote_compare_summary` persistido
// (US-059 / FE-001 · AC-01, AC-03).
//
//   * `retry: false` → un 404 del backend se propaga tal cual; el componente lo interpreta como
//     "empty state + CTA" (AC-02), no como error transitorio.
//   * `isStale`: comparación estable (sets no-ordenados) del `quote_ids_snapshot` persistido con
//     los `currentQuoteIds` del comparador activo. Detecta ambos casos: quote nueva no incluida y
//     quote removida (AC-03 / EC-05).
//   * `exists` / `notFound`: flags derivados sin acoplar al `error?.status` en los llamadores.
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiError } from '@/shared/api-client';
import type { UseQueryResult } from '@tanstack/react-query';
import {
  aiQuoteSummaryApi,
  type GenerateQuoteSummaryResponse,
} from '../api/aiApi';

export const aiLatestQuoteSummaryKeys = {
  all: ['ai', 'quote-summary', 'latest'] as const,
  detail: (eventId: string, categoryCode: string) =>
    ['ai', 'quote-summary', 'latest', eventId, categoryCode] as const,
};

export interface UseLatestQuoteSummaryParams {
  eventId: string;
  categoryCode: string;
  currentQuoteIds: readonly string[];
  /** Deshabilita la query cuando el comparador aún no tiene quotes elegibles (evita 404 ruidoso). */
  enabled?: boolean;
}

export type UseLatestQuoteSummaryResult = UseQueryResult<
  GenerateQuoteSummaryResponse,
  ApiError
> & {
  isStale: boolean;
  exists: boolean;
  notFound: boolean;
};

/**
 * Compara dos conjuntos de UUIDs sin ordenar (paridad con la semántica del snapshot: el orden es
 * irrelevante). Devuelve `true` si difieren en cardinalidad o contenido.
 */
export function computeQuoteIdsMismatch(
  snapshot: readonly string[],
  current: readonly string[],
): boolean {
  if (snapshot.length !== current.length) return true;
  const snap = new Set(snapshot);
  return current.some((id) => !snap.has(id));
}

export function useLatestQuoteSummary(
  params: UseLatestQuoteSummaryParams,
): UseLatestQuoteSummaryResult {
  const { eventId, categoryCode, currentQuoteIds, enabled = true } = params;
  const query = useQuery<GenerateQuoteSummaryResponse, ApiError>({
    queryKey: aiLatestQuoteSummaryKeys.detail(eventId, categoryCode),
    queryFn: () => aiQuoteSummaryApi.getLatest({ eventId, categoryCode }),
    retry: false,
    enabled: enabled && Boolean(eventId) && Boolean(categoryCode),
  });

  const isStale = useMemo(() => {
    if (!query.data) return false;
    return computeQuoteIdsMismatch(query.data.quote_ids_snapshot, currentQuoteIds);
  }, [query.data, currentQuoteIds]);

  const notFound = query.isError && query.error instanceof ApiError && query.error.status === 404;
  const exists = Boolean(query.data);

  return { ...query, isStale, exists, notFound } as UseLatestQuoteSummaryResult;
}
