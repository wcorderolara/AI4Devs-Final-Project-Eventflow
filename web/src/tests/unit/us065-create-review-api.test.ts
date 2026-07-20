// US-065 (PB-P1-038 / FE-003) — Unit tests para `organizerReviewsApi.create` contra los MSW
// handlers. Cubre 201 happy + 400 (VALIDATION_ERROR con rating fuera de rango / comment > 2000) +
// 401 + 403 (FORBIDDEN / REVIEW_NOT_ELIGIBLE con las 4 razones) + 404 (RESOURCE_NOT_FOUND).
import { describe, expect, it } from 'vitest';
import { organizerReviewsApi } from '@/features/reviews';
import { createReviewMswTriggers } from '../msw/handlers/organizer-reviews';
import type { ApiError } from '@/shared/api-client';

const HAPPY_VP = '99999999-9999-9999-9999-000000000065';
const HAPPY_EVENT = '99999999-9999-9999-9999-000000000066';

describe('US-065 · organizerReviewsApi.create (MSW)', () => {
  it('AC-01 201 happy: devuelve view con reviewId + rating + comment', async () => {
    const view = await organizerReviewsApi.create({
      eventId: HAPPY_EVENT,
      vendorProfileId: HAPPY_VP,
      rating: 5,
      comment: 'Excelente',
    });
    expect(view.rating).toBe(5);
    expect(view.comment).toBe('Excelente');
    expect(view.vendorProfileId).toBe(HAPPY_VP);
    expect(view.eventId).toBe(HAPPY_EVENT);
    expect(typeof view.reviewId).toBe('string');
    expect(typeof view.createdAt).toBe('string');
  });

  it('AC-02 comment omitido ⇒ 201 con comment=null en la view', async () => {
    const view = await organizerReviewsApi.create({
      eventId: HAPPY_EVENT,
      vendorProfileId: HAPPY_VP,
      rating: 3,
    });
    expect(view.comment).toBeNull();
  });

  it('EC-04 400 VALIDATION_ERROR cuando rating=0', async () => {
    try {
      await organizerReviewsApi.create({
        eventId: HAPPY_EVENT,
        vendorProfileId: HAPPY_VP,
        rating: 0,
      });
      throw new Error('should have thrown');
    } catch (err) {
      const e = err as ApiError;
      expect(e.status).toBe(400);
      expect(e.code).toBe('VALIDATION_ERROR');
    }
  });

  it('EC-05 400 VALIDATION_ERROR cuando comment > 2000 chars', async () => {
    try {
      await organizerReviewsApi.create({
        eventId: HAPPY_EVENT,
        vendorProfileId: HAPPY_VP,
        rating: 5,
        comment: 'x'.repeat(2001),
      });
      throw new Error('should have thrown');
    } catch (err) {
      const e = err as ApiError;
      expect(e.status).toBe(400);
      expect(e.code).toBe('VALIDATION_ERROR');
    }
  });

  it('AUTH-TS-06 401 AUTHENTICATION_REQUIRED', async () => {
    try {
      await organizerReviewsApi.create({
        eventId: HAPPY_EVENT,
        vendorProfileId: createReviewMswTriggers.UNAUTH,
        rating: 4,
      });
      throw new Error('should have thrown');
    } catch (err) {
      const e = err as ApiError;
      expect(e.status).toBe(401);
      expect(e.code).toBe('AUTHENTICATION_REQUIRED');
    }
  });

  it('AUTH-TS-04/05 403 FORBIDDEN', async () => {
    try {
      await organizerReviewsApi.create({
        eventId: HAPPY_EVENT,
        vendorProfileId: createReviewMswTriggers.FORBIDDEN,
        rating: 4,
      });
      throw new Error('should have thrown');
    } catch (err) {
      const e = err as ApiError;
      expect(e.status).toBe(403);
      expect(e.code).toBe('FORBIDDEN');
    }
  });

  it('EC-06/07 404 RESOURCE_NOT_FOUND (uniforme)', async () => {
    try {
      await organizerReviewsApi.create({
        eventId: HAPPY_EVENT,
        vendorProfileId: createReviewMswTriggers.NOT_FOUND,
        rating: 4,
      });
      throw new Error('should have thrown');
    } catch (err) {
      const e = err as ApiError;
      expect(e.status).toBe(404);
      expect(e.code).toBe('RESOURCE_NOT_FOUND');
    }
  });

  it.each([
    ['NOT_ELIGIBLE_NO_BOOKING', 'no_booking'],
    ['NOT_ELIGIBLE_EVENT_NOT_COMPLETED', 'event_not_completed'],
    ['NOT_ELIGIBLE_WINDOW_EXPIRED', 'window_expired'],
    ['NOT_ELIGIBLE_ALREADY_REVIEWED', 'already_reviewed'],
  ] as const)(
    'D6 403 REVIEW_NOT_ELIGIBLE reason=%s',
    async (trigger, expectedReason) => {
      try {
        await organizerReviewsApi.create({
          eventId: HAPPY_EVENT,
          vendorProfileId: createReviewMswTriggers[trigger],
          rating: 4,
        });
        throw new Error('should have thrown');
      } catch (err) {
        const e = err as ApiError;
        expect(e.status).toBe(403);
        expect(e.code).toBe('REVIEW_NOT_ELIGIBLE');
        const details = (e.details ?? []) as Array<{ field?: string; message?: string }>;
        expect(details).toContainEqual({ field: 'reason', message: expectedReason });
      }
    },
  );
});
