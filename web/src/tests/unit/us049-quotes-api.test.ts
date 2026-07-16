// US-049 (PB-P1-030 / FE-003 + QA-002 smoke) — Unit tests para `quotesApi.createRequest`
// contra los handlers MSW. Cubre 201 + 6 códigos de error mapeados a `ApiError.code`.
import { describe, expect, it } from 'vitest';
import { quotesApi } from '@/features/quotes/api/quotesApi';
import { quotesMswTriggers } from '../msw/handlers/quotes';
import { ApiError } from '@/shared/api-client';
import type { CreateQuoteRequestInput } from '@/features/quotes/api/quotesApi.types';

const OK_INPUT: CreateQuoteRequestInput = {
  event_id: '11111111-1111-1111-1111-111111111111',
  vendor_profile_id: '22222222-2222-2222-2222-222222222222',
  service_category_id: '33333333-3333-3333-3333-333333333333',
  brief: { budget: '5000.00', message: 'Buscamos servicio de catering.' },
  source: 'manual',
};

describe('US-049 · quotesApi.createRequest (MSW)', () => {
  it('201 happy path retorna la vista mapeada', async () => {
    const view = await quotesApi.createRequest(OK_INPUT);
    expect(view.status).toBe('sent');
    expect(view.brief.budget).toBe('5000.00');
    expect(view.brief.currencyCode).toBe('GTQ');
    expect(view.aiGeneratedBrief).toBe(false);
    expect(view.eventSnapshot.guestsCount).toBe(120);
  });

  it('201 con source=ai_generated marca ai_generated_brief=true', async () => {
    const view = await quotesApi.createRequest({ ...OK_INPUT, source: 'ai_generated' });
    expect(view.aiGeneratedBrief).toBe(true);
  });

  it('404 EVENT_NOT_FOUND', async () => {
    await expect(
      quotesApi.createRequest({ ...OK_INPUT, event_id: quotesMswTriggers.EVENT_NOT_FOUND }),
    ).rejects.toMatchObject({ status: 404, code: 'EVENT_NOT_FOUND' } as Partial<ApiError>);
  });

  it('409 EVENT_NOT_ACTIVE', async () => {
    await expect(
      quotesApi.createRequest({ ...OK_INPUT, event_id: quotesMswTriggers.EVENT_NOT_ACTIVE }),
    ).rejects.toMatchObject({ status: 409, code: 'EVENT_NOT_ACTIVE' } as Partial<ApiError>);
  });

  it('400 VENDOR_NOT_AVAILABLE', async () => {
    await expect(
      quotesApi.createRequest({
        ...OK_INPUT,
        vendor_profile_id: quotesMswTriggers.VENDOR_UNAVAILABLE,
      }),
    ).rejects.toMatchObject({ status: 400, code: 'VENDOR_NOT_AVAILABLE' } as Partial<ApiError>);
  });

  it('400 INVALID_CATEGORY', async () => {
    await expect(
      quotesApi.createRequest({
        ...OK_INPUT,
        service_category_id: quotesMswTriggers.CATEGORY_INVALID,
      }),
    ).rejects.toMatchObject({ status: 400, code: 'INVALID_CATEGORY' } as Partial<ApiError>);
  });

  it('409 QR_ALREADY_ACTIVE', async () => {
    await expect(
      quotesApi.createRequest({ ...OK_INPUT, event_id: quotesMswTriggers.QR_ALREADY_ACTIVE }),
    ).rejects.toMatchObject({ status: 409, code: 'QR_ALREADY_ACTIVE' } as Partial<ApiError>);
  });

  it('409 QR_CATEGORY_LIMIT_REACHED', async () => {
    await expect(
      quotesApi.createRequest({ ...OK_INPUT, event_id: quotesMswTriggers.QR_CATEGORY_LIMIT }),
    ).rejects.toMatchObject({ status: 409, code: 'QR_CATEGORY_LIMIT_REACHED' } as Partial<ApiError>);
  });

  it('429 RATE_LIMIT_EXCEEDED con Retry-After', async () => {
    await expect(
      quotesApi.createRequest({ ...OK_INPUT, event_id: quotesMswTriggers.RATE_LIMIT }),
    ).rejects.toMatchObject({
      status: 429,
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfterSeconds: 30,
    } as Partial<ApiError>);
  });

  it('401 AUTHENTICATION_REQUIRED', async () => {
    await expect(
      quotesApi.createRequest({ ...OK_INPUT, event_id: quotesMswTriggers.UNAUTH }),
    ).rejects.toMatchObject({ status: 401, code: 'AUTHENTICATION_REQUIRED' } as Partial<ApiError>);
  });

  it('403 FORBIDDEN', async () => {
    await expect(
      quotesApi.createRequest({ ...OK_INPUT, event_id: quotesMswTriggers.FORBIDDEN }),
    ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' } as Partial<ApiError>);
  });

  it('400 INVALID_BRIEF', async () => {
    await expect(
      quotesApi.createRequest({ ...OK_INPUT, event_id: quotesMswTriggers.INVALID_BRIEF }),
    ).rejects.toMatchObject({ status: 400, code: 'INVALID_BRIEF' } as Partial<ApiError>);
  });
});
