// US-036 (PB-P1-020 / FE-001) — Cliente HTTP para mutaciones de BudgetItem.
import { httpDelete, httpPatchData, httpPostData, type Envelope } from '@/shared/api-client';
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

export const budgetItemsApi = {
  async create(eventId: string, body: CreateBudgetItemBody): Promise<BudgetItemDto> {
    return httpPostData<BudgetItemDto, CreateBudgetItemBody>(`/events/${eventId}/budget/items`, {
      body,
      timeoutMs: 30_000,
    });
  },
  async update(eventId: string, itemId: string, body: UpdateBudgetItemBody): Promise<BudgetItemDto> {
    return httpPatchData<BudgetItemDto, UpdateBudgetItemBody>(
      `/events/${eventId}/budget/items/${itemId}`,
      { body, timeoutMs: 30_000 },
    );
  },
  async remove(eventId: string, itemId: string): Promise<void> {
    await httpDelete<Envelope<null>>(`/events/${eventId}/budget/items/${itemId}`, {
      timeoutMs: 30_000,
    });
  },
};
