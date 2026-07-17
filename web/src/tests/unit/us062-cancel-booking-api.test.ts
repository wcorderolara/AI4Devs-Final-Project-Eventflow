// US-062 (PB-P1-036 / FE-002) — Unit tests para `bookingsApi.cancel` contra los MSW handlers.
// Cubre 200 happy (con y sin reason) + 400 (INVALID_CANCELLATION_REASON) + 401/403/404/409/429.
import { describe, expect, it } from 'vitest';
import { bookingsApi } from '@/features/booking/api/bookingsApi';
import { cancelBookingIntentMswTriggers } from '../msw/handlers/booking-intents';
import type { ApiError } from '@/shared/api-client';

const HAPPY_INTENT_ID = '99999999-9999-9999-9999-000000000062';

describe('US-062 · bookingsApi.cancel (MSW)', () => {
  it('AC-01 200 happy con reason: devuelve view con status=cancelled + cancellationReason', async () => {
    const view = await bookingsApi.cancel({ bookingIntentId: HAPPY_INTENT_ID, reason: 'Cambio de fecha' });
    expect(view.status).toBe('cancelled');
    expect(view.bookingIntentId).toBe(HAPPY_INTENT_ID);
    expect(view.cancellationReason).toBe('Cambio de fecha');
    expect(typeof view.cancelledAt).toBe('string');
  });

  it('AC-03 200 sin reason (body vacío): cancellationReason es null', async () => {
    const view = await bookingsApi.cancel({ bookingIntentId: HAPPY_INTENT_ID });
    expect(view.status).toBe('cancelled');
    expect(view.cancellationReason).toBeNull();
  });

  it('AC-03 reason vacío tras trim ⇒ omit en body ⇒ null persistido', async () => {
    const view = await bookingsApi.cancel({ bookingIntentId: HAPPY_INTENT_ID, reason: '   ' });
    expect(view.cancellationReason).toBeNull();
  });

  it('EC-05 400 INVALID_CANCELLATION_REASON cuando > 500 chars', async () => {
    try {
      await bookingsApi.cancel({ bookingIntentId: HAPPY_INTENT_ID, reason: 'x'.repeat(600) });
      throw new Error('should have thrown');
    } catch (err) {
      const e = err as ApiError;
      expect(e.status).toBe(400);
      expect(e.code).toBe('INVALID_CANCELLATION_REASON');
    }
  });

  it('AUTH-TS-05 401 AUTHENTICATION_REQUIRED', async () => {
    try {
      await bookingsApi.cancel({ bookingIntentId: cancelBookingIntentMswTriggers.UNAUTH });
      throw new Error('should have thrown');
    } catch (err) {
      const e = err as ApiError;
      expect(e.status).toBe(401);
      expect(e.code).toBe('AUTHENTICATION_REQUIRED');
    }
  });

  it('AUTH-TS-04 403 FORBIDDEN (admin)', async () => {
    try {
      await bookingsApi.cancel({ bookingIntentId: cancelBookingIntentMswTriggers.FORBIDDEN });
      throw new Error('should have thrown');
    } catch (err) {
      const e = err as ApiError;
      expect(e.status).toBe(403);
      expect(e.code).toBe('FORBIDDEN');
    }
  });

  it('EC-02/EC-03 404 BOOKING_INTENT_NOT_FOUND (uniforme bilateral)', async () => {
    try {
      await bookingsApi.cancel({ bookingIntentId: cancelBookingIntentMswTriggers.NOT_FOUND });
      throw new Error('should have thrown');
    } catch (err) {
      const e = err as ApiError;
      expect(e.status).toBe(404);
      expect(e.code).toBe('BOOKING_INTENT_NOT_FOUND');
    }
  });

  it('EC-01 409 BOOKING_INTENT_NOT_CANCELLABLE', async () => {
    try {
      await bookingsApi.cancel({ bookingIntentId: cancelBookingIntentMswTriggers.NOT_CANCELLABLE });
      throw new Error('should have thrown');
    } catch (err) {
      const e = err as ApiError;
      expect(e.status).toBe(409);
      expect(e.code).toBe('BOOKING_INTENT_NOT_CANCELLABLE');
    }
  });

  it('429 RATE_LIMIT_EXCEEDED', async () => {
    try {
      await bookingsApi.cancel({ bookingIntentId: cancelBookingIntentMswTriggers.RATE_LIMIT });
      throw new Error('should have thrown');
    } catch (err) {
      const e = err as ApiError;
      expect(e.status).toBe(429);
      expect(e.code).toBe('RATE_LIMIT_EXCEEDED');
    }
  });
});
