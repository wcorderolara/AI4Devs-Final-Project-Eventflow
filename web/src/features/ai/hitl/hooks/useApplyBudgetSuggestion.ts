'use client';

// US-037 (PB-P1-021 / FE-002) — Wrapper específico para budget del hook HITL genérico.
// Encapsula:
//   1. Envío del `editedPayload` con shape canónico `{ currencyCode, items: [{ category, estimatedAmount, label? }] }`.
//   2. Invalidación de `['event', eventId, 'budget']` tras éxito (AC-06).
//   3. Clasificación de errores 409/400/422 para que el UI elija el modal apropiado
//      (CATEGORY_INACTIVE / EVENT_NOT_EDITABLE / CURRENCY_MISMATCH / INVALID_VALUE / PAYLOAD_INVALID).
import type { QueryKey } from '@tanstack/react-query';
import { ApiError } from '@/shared/api-client';
import type { AIRecommendationResponseDto } from '../api/hitlApi';
import { useApplyAIRecommendation } from './useApplyAIRecommendation';

export interface EditedBudgetItem {
  category: string;
  estimatedAmount: string;
  label?: string;
}

export interface EditedBudgetPayload {
  currencyCode: string;
  items: EditedBudgetItem[];
}

export type BudgetApplyErrorKind =
  | 'CATEGORY_INACTIVE'
  | 'EVENT_NOT_EDITABLE'
  | 'CURRENCY_MISMATCH'
  | 'INVALID_VALUE'
  | 'PAYLOAD_INVALID'
  | 'RECOMMENDATION_NOT_PENDING'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'UNKNOWN';

/** Extrae el `error.code` del backend y lo clasifica en un enum estable para el UI. */
export function classifyBudgetApplyError(err: unknown): BudgetApplyErrorKind {
  if (!(err instanceof ApiError)) return 'UNKNOWN';
  switch (err.code) {
    case 'CATEGORY_INACTIVE':
      return 'CATEGORY_INACTIVE';
    case 'EVENT_NOT_EDITABLE':
      return 'EVENT_NOT_EDITABLE';
    case 'CURRENCY_MISMATCH':
      return 'CURRENCY_MISMATCH';
    case 'INVALID_VALUE':
      return 'INVALID_VALUE';
    case 'PAYLOAD_INVALID':
      return 'PAYLOAD_INVALID';
    case 'RECOMMENDATION_NOT_PENDING':
      return 'RECOMMENDATION_NOT_PENDING';
    case 'AUTHENTICATION_REQUIRED':
      return 'UNAUTHORIZED';
    case 'FORBIDDEN':
      return 'FORBIDDEN';
    case 'RESOURCE_NOT_FOUND':
      return 'NOT_FOUND';
    default:
      return 'UNKNOWN';
  }
}

/**
 * Detalle de categorías inactivas retornado por el backend cuando `code === 'CATEGORY_INACTIVE'`.
 * El error-handler serializa `inactive_categories` como `details[]` con `field: 'inactive_categories'`
 * y `message: '<code>:<name>'`. Este helper extrae la lista tipada.
 */
export interface InactiveCategoryDetail {
  code: string;
  name: string;
}
export function extractInactiveCategories(err: unknown): InactiveCategoryDetail[] {
  if (!(err instanceof ApiError)) return [];
  const details = (err.details ?? []) as Array<{ field?: string; message?: string }>;
  return details
    .filter((d) => d.field === 'inactive_categories' && typeof d.message === 'string')
    .map((d) => {
      const [code, ...rest] = String(d.message).split(':');
      return { code: code ?? '', name: rest.join(':') || (code ?? '') };
    })
    .filter((c) => c.code.length > 0);
}

interface UseArgs {
  aiRecommendationId: string;
  eventId: string;
  extraInvalidateKeys?: QueryKey[];
}

interface ApplyVars {
  editedPayload?: EditedBudgetPayload;
}

export function useApplyBudgetSuggestion(args: UseArgs): ReturnType<
  typeof useApplyAIRecommendation
> {
  const invalidateQueryKeys: QueryKey[] = [
    ['event', args.eventId, 'budget'],
    ...(args.extraInvalidateKeys ?? []),
  ];
  return useApplyAIRecommendation({
    aiRecommendationId: args.aiRecommendationId,
    invalidateQueryKeys,
  });
}

export type { AIRecommendationResponseDto };
export type { ApplyVars as UseApplyBudgetSuggestionVars };
