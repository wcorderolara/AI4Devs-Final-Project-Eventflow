// US-050 (PB-P1-030 / FE-001 + QA-002 smoke) — Unit tests para `quotesApi.activeCount`
// contra los MSW handlers. Cubre 200 (happy/count=4/count=5) + 400 + 401 + 403 + 404.
import { describe, expect, it } from 'vitest';
import { quotesApi } from '@/features/quotes/api/quotesApi';
import { quotesActiveCountMswTriggers } from '../msw/handlers/quotes';
import type { ApiError } from '@/shared/api-client';

const CATEGORY = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

describe('US-050 · quotesApi.activeCount (MSW)', () => {
  it('200 happy: 0 activas ⇒ available_slots=5', async () => {
    const view = await quotesApi.activeCount({
      eventId: '99999999-9999-9999-9999-999999999999',
      serviceCategoryId: CATEGORY,
    });
    expect(view).toEqual({
      activeCount: 0,
      limit: 5,
      availableSlots: 5,
      statusesCounted: ['sent', 'viewed', 'responded'],
    });
  });

  it('200 con 4 activas ⇒ available_slots=1', async () => {
    const view = await quotesApi.activeCount({
      eventId: quotesActiveCountMswTriggers.COUNT_FOUR,
      serviceCategoryId: CATEGORY,
    });
    expect(view.activeCount).toBe(4);
    expect(view.availableSlots).toBe(1);
  });

  it('200 con 5 activas ⇒ available_slots=0 (dispara disable del CTA)', async () => {
    const view = await quotesApi.activeCount({
      eventId: quotesActiveCountMswTriggers.COUNT_FIVE,
      serviceCategoryId: CATEGORY,
    });
    expect(view.activeCount).toBe(5);
    expect(view.availableSlots).toBe(0);
  });

  it('404 EVENT_NOT_FOUND (evento ajeno o inexistente)', async () => {
    await expect(
      quotesApi.activeCount({
        eventId: quotesActiveCountMswTriggers.EVENT_NOT_FOUND,
        serviceCategoryId: CATEGORY,
      }),
    ).rejects.toMatchObject({ status: 404, code: 'EVENT_NOT_FOUND' } as Partial<ApiError>);
  });

  it('400 INVALID_CATEGORY', async () => {
    await expect(
      quotesApi.activeCount({
        eventId: '99999999-9999-9999-9999-999999999999',
        serviceCategoryId: quotesActiveCountMswTriggers.CATEGORY_INVALID,
      }),
    ).rejects.toMatchObject({ status: 400, code: 'INVALID_CATEGORY' } as Partial<ApiError>);
  });

  it('401 AUTHENTICATION_REQUIRED', async () => {
    await expect(
      quotesApi.activeCount({
        eventId: quotesActiveCountMswTriggers.UNAUTH,
        serviceCategoryId: CATEGORY,
      }),
    ).rejects.toMatchObject({ status: 401, code: 'AUTHENTICATION_REQUIRED' } as Partial<ApiError>);
  });

  it('403 FORBIDDEN', async () => {
    await expect(
      quotesApi.activeCount({
        eventId: quotesActiveCountMswTriggers.FORBIDDEN,
        serviceCategoryId: CATEGORY,
      }),
    ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' } as Partial<ApiError>);
  });
});
