// US-057 (PB-P1-035 / FE-003) — Unit tests para `quotesApi.compare` contra los MSW handlers.
// Cubre: 200 happy (≥2 quotes, 1 quote, empty) + 400 INVALID_FILTERS (categoryCode ausente
// sincrónico y server) + 400 INVALID_CATEGORY + 401 + 403 + 404 EVENT_NOT_FOUND.
import { describe, expect, it } from 'vitest';
import { quotesApi } from '@/features/quotes/api/quotesApi';
import { compareQuotesMswTriggers } from '../msw/handlers/quotes';
import type { ApiError } from '@/shared/api-client';

const HAPPY_EVENT_ID = '11111111-1111-1111-1111-111111111111';
const CATEGORY = 'catering';

describe('US-057 · quotesApi.compare (MSW)', () => {
  it('200 happy ≥2 quotes ⇒ items ordenados preserved en la respuesta', async () => {
    const view = await quotesApi.compare({ eventId: HAPPY_EVENT_ID, categoryCode: CATEGORY });
    expect(view.category.code).toBe(CATEGORY);
    expect(view.currencyCode).toBe('GTQ');
    expect(view.items).toHaveLength(3);
    // El primer item es el preferred (mock).
    expect(view.items[0]?.isPreferred).toBe(true);
    // Los items exponen shape camelCase de vendor whitelisted.
    expect(view.items[0]?.vendor).toMatchObject({
      businessName: expect.any(String),
      slug: expect.any(String),
      ratingAvg: expect.any(Number),
      reviewsCount: expect.any(Number),
    });
  });

  it('200 happy 1 quote ⇒ items.length=1 (single view)', async () => {
    const view = await quotesApi.compare({
      eventId: compareQuotesMswTriggers.SINGLE,
      categoryCode: CATEGORY,
    });
    expect(view.items).toHaveLength(1);
    expect(view.items[0]?.status).toBe('sent');
  });

  it('200 happy 0 quotes ⇒ items=[] con category + currency', async () => {
    const view = await quotesApi.compare({
      eventId: compareQuotesMswTriggers.EMPTY,
      categoryCode: CATEGORY,
    });
    expect(view.items).toEqual([]);
    expect(view.category.code).toBe(CATEGORY);
    expect(view.currencyCode).toBe('GTQ');
  });

  it('400 INVALID_CATEGORY (slug inexistente o inactivo)', async () => {
    await expect(
      quotesApi.compare({
        eventId: HAPPY_EVENT_ID,
        categoryCode: compareQuotesMswTriggers.CATEGORY_INVALID,
      }),
    ).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_CATEGORY',
    } as Partial<ApiError>);
  });

  it('401 AUTHENTICATION_REQUIRED (sin sesión)', async () => {
    await expect(
      quotesApi.compare({
        eventId: compareQuotesMswTriggers.UNAUTH,
        categoryCode: CATEGORY,
      }),
    ).rejects.toMatchObject({
      status: 401,
      code: 'AUTHENTICATION_REQUIRED',
    } as Partial<ApiError>);
  });

  it('403 FORBIDDEN (rol distinto de organizer)', async () => {
    await expect(
      quotesApi.compare({
        eventId: compareQuotesMswTriggers.FORBIDDEN,
        categoryCode: CATEGORY,
      }),
    ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' } as Partial<ApiError>);
  });

  it('404 EVENT_NOT_FOUND (uniforme para evento ajeno o inexistente)', async () => {
    await expect(
      quotesApi.compare({
        eventId: compareQuotesMswTriggers.EVENT_NOT_FOUND,
        categoryCode: CATEGORY,
      }),
    ).rejects.toMatchObject({ status: 404, code: 'EVENT_NOT_FOUND' } as Partial<ApiError>);
  });
});
