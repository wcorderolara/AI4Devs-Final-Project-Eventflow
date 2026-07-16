// US-054 (PB-P1-032 / FE-002) — Unit tests para `quotesApi.rejectQuote` contra los MSW handlers.
// Cubre 200 happy (con y sin reason) + 400/401/403/404/409 con códigos estables.
import { describe, expect, it } from 'vitest';
import { quotesApi } from '@/features/quotes/api/quotesApi';
import { rejectQuoteMswTriggers } from '../msw/handlers/quotes';
import type { ApiError } from '@/shared/api-client';

const HAPPY_QUOTE_ID = '99999999-9999-9999-9999-000000000054';

describe('US-054 · quotesApi.rejectQuote (MSW)', () => {
  it('AC-01 200 happy con reason: devuelve status=rejected + rejectionReason', async () => {
    const view = await quotesApi.rejectQuote({ quoteId: HAPPY_QUOTE_ID, reason: 'Precio alto' });
    expect(view.id).toBe(HAPPY_QUOTE_ID);
    expect(view.status).toBe('rejected');
    expect(view.rejectionReason).toBe('Precio alto');
    expect(typeof view.rejectedAt).toBe('string');
  });

  it('AC-03 200 sin reason: `rejectionReason` es null', async () => {
    const view = await quotesApi.rejectQuote({ quoteId: HAPPY_QUOTE_ID });
    expect(view.status).toBe('rejected');
    expect(view.rejectionReason).toBeNull();
  });

  it('AC-03 reason string vacío también se persiste como null', async () => {
    const view = await quotesApi.rejectQuote({ quoteId: HAPPY_QUOTE_ID, reason: '' });
    expect(view.rejectionReason).toBeNull();
  });

  it('EC-03 400 INVALID_REJECTION_REASON', async () => {
    try {
      await quotesApi.rejectQuote({ quoteId: rejectQuoteMswTriggers.INVALID_REASON, reason: 'x'.repeat(600) });
      throw new Error('should have thrown');
    } catch (err) {
      const e = err as ApiError;
      expect(e.status).toBe(400);
      expect(e.code).toBe('INVALID_REJECTION_REASON');
    }
  });

  it('AUTH-TS-05 401 AUTHENTICATION_REQUIRED', async () => {
    try {
      await quotesApi.rejectQuote({ quoteId: rejectQuoteMswTriggers.UNAUTH });
      throw new Error('should have thrown');
    } catch (err) {
      const e = err as ApiError;
      expect(e.status).toBe(401);
      expect(e.code).toBe('AUTHENTICATION_REQUIRED');
    }
  });

  it('AUTH-TS-03/04 403 FORBIDDEN', async () => {
    try {
      await quotesApi.rejectQuote({ quoteId: rejectQuoteMswTriggers.FORBIDDEN });
      throw new Error('should have thrown');
    } catch (err) {
      const e = err as ApiError;
      expect(e.status).toBe(403);
      expect(e.code).toBe('FORBIDDEN');
    }
  });

  it('AUTH-TS-02 404 QUOTE_NOT_FOUND uniforme (SEC-03)', async () => {
    try {
      await quotesApi.rejectQuote({ quoteId: rejectQuoteMswTriggers.NOT_FOUND });
      throw new Error('should have thrown');
    } catch (err) {
      const e = err as ApiError;
      expect(e.status).toBe(404);
      expect(e.code).toBe('QUOTE_NOT_FOUND');
    }
  });

  it('EC-01/EC-05 409 QUOTE_NOT_REJECTABLE con current_status', async () => {
    try {
      await quotesApi.rejectQuote({ quoteId: rejectQuoteMswTriggers.NOT_REJECTABLE });
      throw new Error('should have thrown');
    } catch (err) {
      const e = err as ApiError;
      expect(e.status).toBe(409);
      expect(e.code).toBe('QUOTE_NOT_REJECTABLE');
    }
  });
});
