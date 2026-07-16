// US-056 (PB-P1-034 / FE-002) — Unit tests para `quotesApi.cancelQr` contra los MSW handlers.
// Cubre: 200 happy (con y sin reason) + 400 INVALID_CANCELLATION_REASON + 401 + 403 + 404 +
// 409 QR_NOT_CANCELLABLE + 409 QR_HAS_CONFIRMED_BOOKING (con `details.booking_intent_id`).
import { describe, expect, it } from 'vitest';
import { quotesApi } from '@/features/quotes/api/quotesApi';
import { cancelQrMswTriggers } from '../msw/handlers/quotes';
import type { ApiError } from '@/shared/api-client';

const HAPPY_ID = '11111111-1111-1111-1111-111111111111';

describe('US-056 · quotesApi.cancelQr (MSW)', () => {
  it('200 happy sin reason ⇒ cancellationReason=null, status=cancelled', async () => {
    const view = await quotesApi.cancelQr({ quoteRequestId: HAPPY_ID });
    expect(view.status).toBe('cancelled');
    expect(view.id).toBe(HAPPY_ID);
    expect(view.cancellationReason).toBeNull();
    expect(view.cancelledAt).toBeTruthy();
    expect(view.cancelledBy).toBeTruthy();
  });

  it('200 happy con reason ⇒ payload persistido y reflejado', async () => {
    const view = await quotesApi.cancelQr({
      quoteRequestId: HAPPY_ID,
      reason: 'Cambio de planes',
    });
    expect(view.cancellationReason).toBe('Cambio de planes');
  });

  it('reason vacío ⇒ enviado como omitido (null en response)', async () => {
    const view = await quotesApi.cancelQr({ quoteRequestId: HAPPY_ID, reason: '' });
    expect(view.cancellationReason).toBeNull();
  });

  it('400 INVALID_CANCELLATION_REASON (reason > 500 chars)', async () => {
    await expect(
      quotesApi.cancelQr({
        quoteRequestId: cancelQrMswTriggers.INVALID_REASON,
        reason: 'x'.repeat(501),
      }),
    ).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_CANCELLATION_REASON',
    } as Partial<ApiError>);
  });

  it('401 AUTHENTICATION_REQUIRED (sin sesión)', async () => {
    await expect(
      quotesApi.cancelQr({ quoteRequestId: cancelQrMswTriggers.UNAUTH }),
    ).rejects.toMatchObject({
      status: 401,
      code: 'AUTHENTICATION_REQUIRED',
    } as Partial<ApiError>);
  });

  it('403 FORBIDDEN (rol distinto de organizer)', async () => {
    await expect(
      quotesApi.cancelQr({ quoteRequestId: cancelQrMswTriggers.FORBIDDEN }),
    ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' } as Partial<ApiError>);
  });

  it('404 QR_NOT_FOUND (uniforme para QR ajena o inexistente)', async () => {
    await expect(
      quotesApi.cancelQr({ quoteRequestId: cancelQrMswTriggers.NOT_FOUND }),
    ).rejects.toMatchObject({ status: 404, code: 'QR_NOT_FOUND' } as Partial<ApiError>);
  });

  it('409 QR_NOT_CANCELLABLE con details.current_status', async () => {
    await expect(
      quotesApi.cancelQr({ quoteRequestId: cancelQrMswTriggers.NOT_CANCELLABLE }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'QR_NOT_CANCELLABLE',
    } as Partial<ApiError>);
  });

  it('409 QR_HAS_CONFIRMED_BOOKING con details.booking_intent_id', async () => {
    await expect(
      quotesApi.cancelQr({ quoteRequestId: cancelQrMswTriggers.HAS_CONFIRMED_BOOKING }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'QR_HAS_CONFIRMED_BOOKING',
    } as Partial<ApiError>);
  });
});
