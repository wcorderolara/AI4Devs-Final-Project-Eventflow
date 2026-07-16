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
} as const;

export function __resetVendorQrMswState(): void {
  stateByQrId.clear();
}
