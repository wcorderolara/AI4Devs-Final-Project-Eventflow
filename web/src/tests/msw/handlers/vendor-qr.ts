// MSW handlers — vendor QR (US-051 / PB-P1-031 / FE-003).
// Cubre GET `/api/v1/vendor/quote-requests/:id` y POST `/api/v1/vendor/quote-requests/:id/mark-viewed`
// con 200/400/401/403/404 uniformes (`QR_NOT_FOUND`). Los disparadores viven en el UUID de path
// para no requerir headers custom.
import { http, HttpResponse } from 'msw';

const CORRELATION = '00000000-0000-0000-0000-msw000000051';

const TRIGGER_UNAUTH = 'ffffffff-0000-0000-0051-000000000401';
const TRIGGER_FORBIDDEN = 'ffffffff-0000-0000-0051-000000000403';
const TRIGGER_NOT_FOUND = 'ffffffff-0000-0000-0051-000000000404';
// UUIDs que fuerzan estados iniciales específicos para probar la orquestación.
const TRIGGER_STATUS_VIEWED = 'ffffffff-0000-0000-0051-000000000200';
const TRIGGER_STATUS_RESPONDED = 'ffffffff-0000-0000-0051-000000000201';
// US-052 triggers específicos del endpoint respond.
const TRIGGER_QR_NOT_RESPONDABLE = 'ffffffff-0000-0000-0052-000000000409';
const TRIGGER_QUOTE_ALREADY_EXISTS = 'ffffffff-0000-0000-0052-000000000410';
const TRIGGER_INVALID_TOTAL = 'ffffffff-0000-0000-0052-000000000400';
const TRIGGER_INVALID_BREAKDOWN_SUM = 'ffffffff-0000-0000-0052-000000000401';
const TRIGGER_INVALID_VALID_UNTIL = 'ffffffff-0000-0000-0052-000000000402';

interface StoredQr {
  id: string;
  status: 'sent' | 'viewed' | 'responded' | 'expired' | 'cancelled';
  viewedAt: string | null;
  viewedBy: string | null;
}

// In-memory store per handler-scope. Se resetea entre tests vía `server.resetHandlers()`.
const stateByQrId = new Map<string, StoredQr>();

function envelope<T>(data: T): { data: T; correlationId: string } {
  return { data, correlationId: CORRELATION };
}

function errorEnvelope(code: string, message: string) {
  return { error: { code, message, correlationId: CORRELATION } };
}

function initialFor(id: string): StoredQr {
  if (id === TRIGGER_STATUS_VIEWED) {
    return { id, status: 'viewed', viewedAt: '2026-07-16T10:00:00Z', viewedBy: 'user-msw' };
  }
  if (id === TRIGGER_STATUS_RESPONDED) {
    return { id, status: 'responded', viewedAt: '2026-07-16T10:00:00Z', viewedBy: 'user-msw' };
  }
  return { id, status: 'sent', viewedAt: null, viewedBy: null };
}

function currentFor(id: string): StoredQr {
  let stored = stateByQrId.get(id);
  if (!stored) {
    stored = initialFor(id);
    stateByQrId.set(id, stored);
  }
  return stored;
}

function toDto(qr: StoredQr, extras?: { brief?: unknown }) {
  return {
    id: qr.id,
    eventId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    serviceCategoryId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    vendorProfileId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    status: qr.status,
    brief: extras?.brief ?? {
      budget: '10000',
      currency_code: 'GTQ',
      message: 'MSW happy brief',
      event_snapshot: {
        event_type_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        event_date: '2026-12-01T00:00:00Z',
        location_id: null,
        guests_count: 120,
      },
    },
    aiRecommendationId: null,
    viewedAt: qr.viewedAt,
    viewedBy: qr.viewedBy,
    cancelledAt: null,
    createdAt: '2026-07-15T09:00:00Z',
    updatedAt: qr.viewedAt ?? '2026-07-15T09:00:00Z',
  };
}

export const vendorQrHandlers = [
  http.get('*/api/v1/vendor/quote-requests/:id', ({ params }) => {
    const id = String(params.id);
    if (id === TRIGGER_UNAUTH) {
      return HttpResponse.json(errorEnvelope('AUTHENTICATION_REQUIRED', 'Authentication required'), {
        status: 401,
      });
    }
    if (id === TRIGGER_FORBIDDEN) {
      return HttpResponse.json(errorEnvelope('FORBIDDEN', 'Only vendors'), { status: 403 });
    }
    if (id === TRIGGER_NOT_FOUND) {
      return HttpResponse.json(errorEnvelope('QR_NOT_FOUND', 'Quote request not found'), {
        status: 404,
      });
    }
    return HttpResponse.json(envelope(toDto(currentFor(id))), { status: 200 });
  }),

  http.post('*/api/v1/vendor/quote-requests/:id/respond', async ({ params, request }) => {
    const id = String(params.id);
    if (id === TRIGGER_UNAUTH) {
      return HttpResponse.json(errorEnvelope('AUTHENTICATION_REQUIRED', 'Authentication required'), {
        status: 401,
      });
    }
    if (id === TRIGGER_FORBIDDEN) {
      return HttpResponse.json(errorEnvelope('FORBIDDEN', 'Only vendors'), { status: 403 });
    }
    if (id === TRIGGER_NOT_FOUND) {
      return HttpResponse.json(errorEnvelope('QR_NOT_FOUND', 'Quote request not found'), {
        status: 404,
      });
    }
    if (id === TRIGGER_QR_NOT_RESPONDABLE) {
      return HttpResponse.json(errorEnvelope('QR_NOT_RESPONDABLE', 'Quote request is not respondable'), {
        status: 409,
      });
    }
    if (id === TRIGGER_QUOTE_ALREADY_EXISTS) {
      return HttpResponse.json(
        errorEnvelope('QUOTE_ALREADY_EXISTS', 'An active quote already exists'),
        { status: 409 },
      );
    }
    if (id === TRIGGER_INVALID_TOTAL) {
      return HttpResponse.json(errorEnvelope('INVALID_TOTAL', 'Invalid total'), { status: 400 });
    }
    if (id === TRIGGER_INVALID_BREAKDOWN_SUM) {
      return HttpResponse.json(errorEnvelope('INVALID_BREAKDOWN_SUM', 'Invalid breakdown sum'), {
        status: 400,
      });
    }
    if (id === TRIGGER_INVALID_VALID_UNTIL) {
      return HttpResponse.json(errorEnvelope('INVALID_VALID_UNTIL', 'valid_until out of range'), {
        status: 400,
      });
    }

    const body = (await request.json()) as {
      total_price: string;
      breakdown: { label: string; amount: string }[];
      conditions?: string;
      valid_until?: string;
    };

    const now = '2026-07-16T12:00:00Z';
    return HttpResponse.json(
      envelope({
        id: '99999999-9999-9999-9999-000000000052',
        quoteRequestId: id,
        vendorProfileId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        status: 'sent',
        totalPrice: body.total_price,
        currencyCode: 'GTQ',
        breakdown: body.breakdown,
        conditions: body.conditions ?? null,
        validUntil: body.valid_until ? `${body.valid_until}T23:59:59Z` : '2026-07-31T23:59:59Z',
        sentAt: now,
        createdAt: now,
        updatedAt: now,
      }),
      { status: 201 },
    );
  }),

  http.post('*/api/v1/vendor/quote-requests/:id/mark-viewed', ({ params }) => {
    const id = String(params.id);
    if (id === TRIGGER_UNAUTH) {
      return HttpResponse.json(errorEnvelope('AUTHENTICATION_REQUIRED', 'Authentication required'), {
        status: 401,
      });
    }
    if (id === TRIGGER_FORBIDDEN) {
      return HttpResponse.json(errorEnvelope('FORBIDDEN', 'Only vendors'), { status: 403 });
    }
    if (id === TRIGGER_NOT_FOUND) {
      return HttpResponse.json(errorEnvelope('QR_NOT_FOUND', 'Quote request not found'), {
        status: 404,
      });
    }
    const current = currentFor(id);
    if (current.status === 'sent') {
      const updated: StoredQr = {
        id,
        status: 'viewed',
        viewedAt: '2026-07-16T12:00:00Z',
        viewedBy: 'user-msw-viewer',
      };
      stateByQrId.set(id, updated);
      return HttpResponse.json(envelope(toDto(updated)), { status: 200 });
    }
    // Idempotente: devuelve estado actual.
    return HttpResponse.json(envelope(toDto(current)), { status: 200 });
  }),
];

export const vendorQrMswTriggers = {
  UNAUTH: TRIGGER_UNAUTH,
  FORBIDDEN: TRIGGER_FORBIDDEN,
  NOT_FOUND: TRIGGER_NOT_FOUND,
  STATUS_VIEWED: TRIGGER_STATUS_VIEWED,
  STATUS_RESPONDED: TRIGGER_STATUS_RESPONDED,
  QR_NOT_RESPONDABLE: TRIGGER_QR_NOT_RESPONDABLE,
  QUOTE_ALREADY_EXISTS: TRIGGER_QUOTE_ALREADY_EXISTS,
  INVALID_TOTAL: TRIGGER_INVALID_TOTAL,
  INVALID_BREAKDOWN_SUM: TRIGGER_INVALID_BREAKDOWN_SUM,
  INVALID_VALID_UNTIL: TRIGGER_INVALID_VALID_UNTIL,
} as const;

export function __resetVendorQrMswState(): void {
  stateByQrId.clear();
}
