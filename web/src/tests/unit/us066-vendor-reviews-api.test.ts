// US-066 (PB-P1-039 / FE-003) — Unit tests para `vendorReviewsApi.list` contra los MSW
// handlers. Cubre 200 happy (dos páginas 20+5, sin duplicados) + 400 VALIDATION_ERROR
// (pageSize fuera de rango) + 400 INVALID_CURSOR + 404 VENDOR_NOT_FOUND.
import { describe, expect, it } from 'vitest';
import { vendorReviewsApi } from '@/features/reviews';
import { vendorReviewsMswTriggers } from '../msw/handlers/vendor-reviews';
import type { ApiError } from '@/shared/api-client';

const HAPPY_VP = vendorReviewsMswTriggers.HAPPY;
const NOT_FOUND_VP = vendorReviewsMswTriggers.NOT_FOUND;

describe('US-066 · vendorReviewsApi.list (MSW)', () => {
  it('200 happy: primera página con 20 items + nextCursor no null', async () => {
    const view = await vendorReviewsApi.list(HAPPY_VP, { pageSize: 20 });
    expect(view.items).toHaveLength(20);
    expect(view.pagination.pageSize).toBe(20);
    expect(view.pagination.nextCursor).not.toBeNull();
    expect(view.vendor.reviewsCount).toBe(25);
  });

  it('paginación keyset: segunda página con 5 items + nextCursor null (sin duplicados)', async () => {
    const page1 = await vendorReviewsApi.list(HAPPY_VP, { pageSize: 20 });
    expect(page1.pagination.nextCursor).not.toBeNull();

    const page2 = await vendorReviewsApi.list(HAPPY_VP, {
      pageSize: 20,
      cursor: page1.pagination.nextCursor!,
    });
    expect(page2.items).toHaveLength(5);
    expect(page2.pagination.nextCursor).toBeNull();

    const idsP1 = new Set(page1.items.map((i) => i.id));
    for (const item of page2.items) {
      expect(idsP1.has(item.id)).toBe(false);
    }
  });

  it('AC-03 anonimato: items NO exponen authorId/bookingIntentId/vendorProfileId', async () => {
    const view = await vendorReviewsApi.list(HAPPY_VP);
    for (const item of view.items) {
      expect((item as Record<string, unknown>).authorId).toBeUndefined();
      expect((item as Record<string, unknown>).bookingIntentId).toBeUndefined();
      expect((item as Record<string, unknown>).vendorProfileId).toBeUndefined();
    }
  });

  it('EC-04 400 VALIDATION_ERROR cuando pageSize > 50', async () => {
    try {
      await vendorReviewsApi.list(HAPPY_VP, { pageSize: 100 });
      throw new Error('should have thrown');
    } catch (err) {
      const e = err as ApiError;
      expect(e.status).toBe(400);
      expect(e.code).toBe('VALIDATION_ERROR');
    }
  });

  it('EC-03 400 INVALID_CURSOR cuando cursor no decodifica', async () => {
    try {
      await vendorReviewsApi.list(HAPPY_VP, {
        cursor: vendorReviewsMswTriggers.INVALID_CURSOR_TOKEN,
      });
      throw new Error('should have thrown');
    } catch (err) {
      const e = err as ApiError;
      expect(e.status).toBe(400);
      expect(e.code).toBe('INVALID_CURSOR');
    }
  });

  it('EC-02 / NT-01 404 VENDOR_NOT_FOUND cuando vendor inexistente o no approved', async () => {
    try {
      await vendorReviewsApi.list(NOT_FOUND_VP);
      throw new Error('should have thrown');
    } catch (err) {
      const e = err as ApiError;
      expect(e.status).toBe(404);
      expect(e.code).toBe('VENDOR_NOT_FOUND');
    }
  });
});
