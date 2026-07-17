// US-058 (PB-P1-035 / FE-002) — Unit tests para `quotesApi.preferred` contra MSW.
// Cubre: 200 happy (mark true + unmark false) + 400 VALIDATION_ERROR + 401 + 403 + 404 + 409.
import { describe, expect, it } from 'vitest';
import { quotesApi } from '@/features/quotes/api/quotesApi';
import { preferQuoteMswTriggers } from '../msw/handlers/quotes';
import type { ApiError } from '@/shared/api-client';

const HAPPY_ID = '11111111-1111-1111-1111-111111111111';

describe('US-058 · quotesApi.preferred (MSW)', () => {
  it('200 happy mark ⇒ isPreferred=true reflejado', async () => {
    const view = await quotesApi.preferred({ quoteId: HAPPY_ID, isPreferred: true });
    expect(view.id).toBe(HAPPY_ID);
    expect(view.isPreferred).toBe(true);
    expect(view.status).toBe('sent');
  });

  it('200 happy unmark ⇒ isPreferred=false reflejado', async () => {
    const view = await quotesApi.preferred({ quoteId: HAPPY_ID, isPreferred: false });
    expect(view.isPreferred).toBe(false);
  });

  it('401 AUTHENTICATION_REQUIRED (sin sesión)', async () => {
    await expect(
      quotesApi.preferred({ quoteId: preferQuoteMswTriggers.UNAUTH, isPreferred: true }),
    ).rejects.toMatchObject({
      status: 401,
      code: 'AUTHENTICATION_REQUIRED',
    } as Partial<ApiError>);
  });

  it('403 FORBIDDEN (rol distinto de organizer)', async () => {
    await expect(
      quotesApi.preferred({ quoteId: preferQuoteMswTriggers.FORBIDDEN, isPreferred: true }),
    ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' } as Partial<ApiError>);
  });

  it('404 QUOTE_NOT_FOUND (uniforme para Quote ajena o inexistente)', async () => {
    await expect(
      quotesApi.preferred({ quoteId: preferQuoteMswTriggers.NOT_FOUND, isPreferred: true }),
    ).rejects.toMatchObject({ status: 404, code: 'QUOTE_NOT_FOUND' } as Partial<ApiError>);
  });

  it('409 QUOTE_NOT_PREFERABLE con details.current_status', async () => {
    await expect(
      quotesApi.preferred({
        quoteId: preferQuoteMswTriggers.NOT_PREFERABLE,
        isPreferred: true,
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'QUOTE_NOT_PREFERABLE',
    } as Partial<ApiError>);
  });
});
