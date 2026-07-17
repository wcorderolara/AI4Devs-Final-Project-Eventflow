// US-061 (PB-P1-036 / FE-002) — Unit tests para `vendorBookingsApi.confirm` contra los MSW
// handlers. Cubre 200 happy + 200 idempotente + 401/403/404/409/429.
import { describe, expect, it } from 'vitest';
import { vendorBookingsApi } from '@/features/booking/api/vendorBookingsApi';
import { confirmBookingIntentMswTriggers } from '../msw/handlers/booking-intents';
import type { ApiError } from '@/shared/api-client';

const HAPPY_INTENT_ID = '99999999-9999-9999-9999-000000000061';

describe('US-061 · vendorBookingsApi.confirm (MSW)', () => {
  it('AC-01 200 happy: devuelve view con status=confirmed_intent + confirmedAt', async () => {
    const view = await vendorBookingsApi.confirm({ bookingIntentId: HAPPY_INTENT_ID });
    expect(view.status).toBe('confirmed_intent');
    expect(view.bookingIntentId).toBe(HAPPY_INTENT_ID);
    expect(typeof view.confirmedAt).toBe('string');
  });

  it('AC-03 200 idempotente: intent ya confirmed_intent devuelve mismo shape (confirmedAt preexistente)', async () => {
    const view = await vendorBookingsApi.confirm({
      bookingIntentId: confirmBookingIntentMswTriggers.IDEMPOTENT,
    });
    expect(view.status).toBe('confirmed_intent');
    expect(view.confirmedAt).toBe('2026-07-16T00:00:00Z');
  });

  it('AUTH-TS-05 401 AUTHENTICATION_REQUIRED', async () => {
    try {
      await vendorBookingsApi.confirm({ bookingIntentId: confirmBookingIntentMswTriggers.UNAUTH });
      throw new Error('should have thrown');
    } catch (err) {
      const e = err as ApiError;
      expect(e.status).toBe(401);
      expect(e.code).toBe('AUTHENTICATION_REQUIRED');
    }
  });

  it('AUTH-TS-03/04 403 FORBIDDEN', async () => {
    try {
      await vendorBookingsApi.confirm({ bookingIntentId: confirmBookingIntentMswTriggers.FORBIDDEN });
      throw new Error('should have thrown');
    } catch (err) {
      const e = err as ApiError;
      expect(e.status).toBe(403);
      expect(e.code).toBe('FORBIDDEN');
    }
  });

  it('EC-02/EC-03 404 BOOKING_INTENT_NOT_FOUND (uniforme)', async () => {
    try {
      await vendorBookingsApi.confirm({ bookingIntentId: confirmBookingIntentMswTriggers.NOT_FOUND });
      throw new Error('should have thrown');
    } catch (err) {
      const e = err as ApiError;
      expect(e.status).toBe(404);
      expect(e.code).toBe('BOOKING_INTENT_NOT_FOUND');
    }
  });

  it('EC-01 409 BOOKING_INTENT_NOT_CONFIRMABLE', async () => {
    try {
      await vendorBookingsApi.confirm({ bookingIntentId: confirmBookingIntentMswTriggers.NOT_CONFIRMABLE });
      throw new Error('should have thrown');
    } catch (err) {
      const e = err as ApiError;
      expect(e.status).toBe(409);
      expect(e.code).toBe('BOOKING_INTENT_NOT_CONFIRMABLE');
    }
  });

  it('429 RATE_LIMIT_EXCEEDED', async () => {
    try {
      await vendorBookingsApi.confirm({ bookingIntentId: confirmBookingIntentMswTriggers.RATE_LIMIT });
      throw new Error('should have thrown');
    } catch (err) {
      const e = err as ApiError;
      expect(e.status).toBe(429);
      expect(e.code).toBe('RATE_LIMIT_EXCEEDED');
    }
  });
});
