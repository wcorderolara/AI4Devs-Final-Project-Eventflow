// US-035 (PB-P1-020 / FE-001) — Cliente HTTP para `GET /events/:eventId/budget`.
import { httpGet } from '@/shared/api-client';

export interface BudgetItemDto {
  id: string;
  label: string;
  category_code: string | null;
  amount_planned: number;
  amount_committed: number;
  // US-038 (PB-P1-022 / BE-003): bandera + delta per-item (AC-01, AC-03, VR-03).
  // Siempre presentes; default `false` / `0` cuando no aplica.
  over_committed: boolean;
  overcommitted_amount: number;
}

export interface BudgetSummaryDto {
  currency_code: string;
  total_planned: number;
  total_committed: number;
  over_committed: boolean;
  // US-038 (PB-P1-022 / BE-003): monto bruto del exceso a nivel evento (AC-01).
  overcommitted_amount: number;
}

export interface GetBudgetResponseDto {
  summary: BudgetSummaryDto;
  items: BudgetItemDto[];
}

interface Envelope<T> {
  data: T;
  meta: { correlationId: string; timestamp: string };
}

export const budgetApi = {
  async get(eventId: string): Promise<GetBudgetResponseDto> {
    const dto = await httpGet<Envelope<GetBudgetResponseDto>>(`/events/${eventId}/budget`, {
      timeoutMs: 30_000,
    });
    return dto.data;
  },
};

/** Query key canónica compartida por FE (US-035/US-036/US-037). */
export const budgetQueryKey = (eventId: string): readonly ['event', string, 'budget'] =>
  ['event', eventId, 'budget'] as const;
