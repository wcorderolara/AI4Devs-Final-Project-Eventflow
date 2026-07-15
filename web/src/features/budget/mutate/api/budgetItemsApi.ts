// US-036 (PB-P1-020 / FE-001) — Cliente HTTP para mutaciones de BudgetItem.
import { httpPost, httpPatch, httpDelete } from '@/shared/api-client';
import type { BudgetItemDto } from '@/features/budget/view/api/budgetApi';

export interface CreateBudgetItemBody {
  label: string;
  category_code?: string | null;
  amount_planned: number;
}

export interface UpdateBudgetItemBody {
  label?: string;
  category_code?: string | null;
  amount_planned?: number;
}

interface Envelope<T> {
  data: T;
  meta: { correlationId: string; timestamp: string };
}

export const budgetItemsApi = {
  async create(eventId: string, body: CreateBudgetItemBody): Promise<BudgetItemDto> {
    const dto = await httpPost<Envelope<BudgetItemDto>, CreateBudgetItemBody>(
      `/events/${eventId}/budget/items`,
      { body, timeoutMs: 30_000 },
    );
    return dto.data;
  },
  async update(eventId: string, itemId: string, body: UpdateBudgetItemBody): Promise<BudgetItemDto> {
    const dto = await httpPatch<Envelope<BudgetItemDto>, UpdateBudgetItemBody>(
      `/events/${eventId}/budget/items/${itemId}`,
      { body, timeoutMs: 30_000 },
    );
    return dto.data;
  },
  async remove(eventId: string, itemId: string): Promise<void> {
    await httpDelete<Envelope<null>>(`/events/${eventId}/budget/items/${itemId}`, {
      timeoutMs: 30_000,
    });
  },
};
