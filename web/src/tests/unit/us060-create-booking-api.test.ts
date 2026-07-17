// US-060 (PB-P1-036 / FE-002) — Unit tests para `organizerBookingsApi.create` contra los MSW
// handlers. Cubre 201 happy + 400 (VALIDATION_ERROR con campo de pago, DISCLAIMER_REQUIRED) +
// 401/403 + 404 (QUOTE_NOT_FOUND) + 409 (QUOTE_NOT_ACCEPTABLE, QUOTE_EXPIRED,
// BOOKING_INTENT_ALREADY_EXISTS) + 429.
import { describe, expect, it } from 'vitest';
import { organizerBookingsApi } from '@/features/booking/api/organizerBookingsApi';
import { createBookingIntentMswTriggers } from '../msw/handlers/booking-intents';
import type { ApiError } from '@/shared/api-client';
import { httpPost } from '@/shared/api-client';

const HAPPY_QUOTE_ID = '99999999-9999-9999-9999-000000000060';

describe('US-060 · organizerBookingsApi.create (MSW)', () => {
  it('AC-01 201 happy: devuelve view con status=pending + bookingIntentId', async () => {
    const view = await organizerBookingsApi.create({ quoteId: HAPPY_QUOTE_ID, disclaimerAccepted: true });
    expect(view.status).toBe('pending');
    expect(view.quoteId).toBe(HAPPY_QUOTE_ID);
    expect(typeof view.bookingIntentId).toBe('string');
    expect(typeof view.createdAt).toBe('string');
  });

  it('AC-02 400 DISCLAIMER_REQUIRED cuando el body llega con disclaimer_accepted=false', async () => {
    try {
      await organizerBookingsApi.create({ quoteId: HAPPY_QUOTE_ID, disclaimerAccepted: false });
      throw new Error('should have thrown');
    } catch (err) {
      const e = err as ApiError;
      expect(e.status).toBe(400);
      expect(e.code).toBe('DISCLAIMER_REQUIRED');
    }
  });

  it('AC-03 / FR-BOOKING-007 400 VALIDATION_ERROR cuando el body incluye un campo de pago (payment_method)', async () => {
    // Este test invoca el httpClient directo con un body extendido (attacker-crafted) — el DTO
    // frontend nunca dejaría pasar campos de pago; el mock server los detecta y responde 400.
    try {
      await httpPost<unknown, Record<string, unknown>>(`/booking-intents`, {
        body: {
          quote_id: HAPPY_QUOTE_ID,
          disclaimer_accepted: true,
          payment_method: 'stripe',
        },
      });
      throw new Error('should have thrown');
    } catch (err) {
      const e = err as ApiError;
      expect(e.status).toBe(400);
      expect(e.code).toBe('VALIDATION_ERROR');
    }
  });

  it('AUTH-TS-05 401 AUTHENTICATION_REQUIRED', async () => {
    try {
      await organizerBookingsApi.create({
        quoteId: createBookingIntentMswTriggers.UNAUTH,
        disclaimerAccepted: true,
      });
      throw new Error('should have thrown');
    } catch (err) {
      const e = err as ApiError;
      expect(e.status).toBe(401);
      expect(e.code).toBe('AUTHENTICATION_REQUIRED');
    }
  });

  it('AUTH-TS-03/04 403 FORBIDDEN', async () => {
    try {
      await organizerBookingsApi.create({
        quoteId: createBookingIntentMswTriggers.FORBIDDEN,
        disclaimerAccepted: true,
      });
      throw new Error('should have thrown');
    } catch (err) {
      const e = err as ApiError;
      expect(e.status).toBe(403);
      expect(e.code).toBe('FORBIDDEN');
    }
  });

  it('EC-04 404 QUOTE_NOT_FOUND (uniforme)', async () => {
    try {
      await organizerBookingsApi.create({
        quoteId: createBookingIntentMswTriggers.QUOTE_NOT_FOUND,
        disclaimerAccepted: true,
      });
      throw new Error('should have thrown');
    } catch (err) {
      const e = err as ApiError;
      expect(e.status).toBe(404);
      expect(e.code).toBe('QUOTE_NOT_FOUND');
    }
  });

  it('EC-02 409 QUOTE_NOT_ACCEPTABLE', async () => {
    try {
      await organizerBookingsApi.create({
        quoteId: createBookingIntentMswTriggers.QUOTE_NOT_ACCEPTABLE,
        disclaimerAccepted: true,
      });
      throw new Error('should have thrown');
    } catch (err) {
      const e = err as ApiError;
      expect(e.status).toBe(409);
      expect(e.code).toBe('QUOTE_NOT_ACCEPTABLE');
    }
  });

  it('EC-01 409 QUOTE_EXPIRED', async () => {
    try {
      await organizerBookingsApi.create({
        quoteId: createBookingIntentMswTriggers.QUOTE_EXPIRED,
        disclaimerAccepted: true,
      });
      throw new Error('should have thrown');
    } catch (err) {
      const e = err as ApiError;
      expect(e.status).toBe(409);
      expect(e.code).toBe('QUOTE_EXPIRED');
    }
  });

  it('EC-03 409 BOOKING_INTENT_ALREADY_EXISTS', async () => {
    try {
      await organizerBookingsApi.create({
        quoteId: createBookingIntentMswTriggers.ALREADY_EXISTS,
        disclaimerAccepted: true,
      });
      throw new Error('should have thrown');
    } catch (err) {
      const e = err as ApiError;
      expect(e.status).toBe(409);
      expect(e.code).toBe('BOOKING_INTENT_ALREADY_EXISTS');
    }
  });

  it('429 RATE_LIMIT_EXCEEDED', async () => {
    try {
      await organizerBookingsApi.create({
        quoteId: createBookingIntentMswTriggers.RATE_LIMIT,
        disclaimerAccepted: true,
      });
      throw new Error('should have thrown');
    } catch (err) {
      const e = err as ApiError;
      expect(e.status).toBe(429);
      expect(e.code).toBe('RATE_LIMIT_EXCEEDED');
    }
  });
});
