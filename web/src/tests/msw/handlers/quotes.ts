// MSW handlers — quotes (US-049 / PB-P1-030 / FE-003).
// Cubre `POST /api/v1/quote-requests` con 201 (happy), 400 (INVALID_BRIEF/INVALID_CATEGORY/
// VENDOR_NOT_AVAILABLE), 401 (AUTHENTICATION_REQUIRED), 403 (FORBIDDEN), 404 (EVENT_NOT_FOUND),
// 409 (EVENT_NOT_ACTIVE/QR_ALREADY_ACTIVE/QR_CATEGORY_LIMIT_REACHED) y 429 (RATE_LIMIT_EXCEEDED).
// Los disparadores viven en los UUIDs del payload (`event_id`/`vendor_profile_id`/`service_category_id`)
// para no requerir headers custom.
import { http, HttpResponse } from 'msw';

const CORRELATION = '00000000-0000-0000-0000-msw000000049';

// UUIDs disparadores por escenario (cualquier UUID que no matchee cae al happy path).
const TRIGGER_EVENT_NOT_FOUND = 'ffffffff-0000-0000-0000-000000000404';
const TRIGGER_EVENT_NOT_ACTIVE = 'ffffffff-0000-0000-0000-000000000409';
const TRIGGER_VENDOR_UNAVAILABLE = 'ffffffff-0000-0000-0000-000000000410';
const TRIGGER_CATEGORY_INVALID = 'ffffffff-0000-0000-0000-000000000420';
const TRIGGER_QR_ALREADY_ACTIVE = 'ffffffff-0000-0000-0000-000000000411';
const TRIGGER_QR_CATEGORY_LIMIT = 'ffffffff-0000-0000-0000-000000000412';
const TRIGGER_UNAUTH = 'ffffffff-0000-0000-0000-000000000401';
const TRIGGER_FORBIDDEN = 'ffffffff-0000-0000-0000-000000000403';
const TRIGGER_RATE_LIMIT = 'ffffffff-0000-0000-0000-000000000429';
const TRIGGER_INVALID_BRIEF = 'ffffffff-0000-0000-0000-000000000400';

interface CreateBody {
  event_id: string;
  vendor_profile_id: string;
  service_category_id: string;
  brief: { budget: string; message: string };
  source?: 'manual' | 'ai_generated';
}

function envelope<T>(data: T): { data: T; correlationId: string } {
  return { data, correlationId: CORRELATION };
}

function errorEnvelope(code: string, message: string, details?: unknown): {
  error: { code: string; message: string; correlationId: string; details?: unknown };
} {
  const error: {
    code: string;
    message: string;
    correlationId: string;
    details?: unknown;
  } = { code, message, correlationId: CORRELATION };
  if (details !== undefined) error.details = details;
  return { error };
}

export const quotesHandlers = [
  http.post('*/api/v1/quote-requests', async ({ request }) => {
    const body = (await request.json()) as CreateBody;

    if (body.event_id === TRIGGER_UNAUTH) {
      return HttpResponse.json(errorEnvelope('AUTHENTICATION_REQUIRED', 'Authentication required'), {
        status: 401,
      });
    }
    if (body.event_id === TRIGGER_FORBIDDEN) {
      return HttpResponse.json(errorEnvelope('FORBIDDEN', 'Only organizers can create quote requests'), {
        status: 403,
      });
    }
    if (body.event_id === TRIGGER_EVENT_NOT_FOUND) {
      return HttpResponse.json(errorEnvelope('EVENT_NOT_FOUND', 'Event not found'), { status: 404 });
    }
    if (body.event_id === TRIGGER_EVENT_NOT_ACTIVE) {
      return HttpResponse.json(
        errorEnvelope('EVENT_NOT_ACTIVE', 'Event is not active', [{ field: 'status', message: 'draft' }]),
        { status: 409 },
      );
    }
    if (body.vendor_profile_id === TRIGGER_VENDOR_UNAVAILABLE) {
      return HttpResponse.json(errorEnvelope('VENDOR_NOT_AVAILABLE', 'Vendor is not available'), {
        status: 400,
      });
    }
    if (body.service_category_id === TRIGGER_CATEGORY_INVALID) {
      return HttpResponse.json(
        errorEnvelope('INVALID_CATEGORY', 'Service category not available', [
          { field: 'service_category_id', message: 'not_available' },
        ]),
        { status: 400 },
      );
    }
    if (body.event_id === TRIGGER_QR_ALREADY_ACTIVE) {
      return HttpResponse.json(
        errorEnvelope('QR_ALREADY_ACTIVE', 'An active quote request already exists', [
          { field: 'existing_quote_request_id', message: '99999999-9999-9999-9999-999999999999' },
        ]),
        { status: 409 },
      );
    }
    if (body.event_id === TRIGGER_QR_CATEGORY_LIMIT) {
      return HttpResponse.json(
        errorEnvelope('QR_CATEGORY_LIMIT_REACHED', 'Quote request category limit reached', [
          { field: 'active_count', message: '5' },
        ]),
        { status: 409 },
      );
    }
    if (body.event_id === TRIGGER_RATE_LIMIT) {
      return HttpResponse.json(errorEnvelope('RATE_LIMIT_EXCEEDED', 'Too many requests'), {
        status: 429,
        headers: { 'Retry-After': '30' },
      });
    }
    if (body.event_id === TRIGGER_INVALID_BRIEF) {
      return HttpResponse.json(
        errorEnvelope('INVALID_BRIEF', 'Invalid brief', [{ field: 'budget', message: 'invalid' }]),
        { status: 400 },
      );
    }

    // Happy path 201.
    const now = new Date('2026-07-16T12:00:00Z').toISOString();
    return HttpResponse.json(
      envelope({
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        status: 'sent',
        sent_at: now,
        event_id: body.event_id,
        vendor_profile_id: body.vendor_profile_id,
        service_category_id: body.service_category_id,
        ai_generated_brief: body.source === 'ai_generated',
        brief: {
          budget: body.brief.budget,
          currency_code: 'GTQ',
          message: body.brief.message,
        },
        event_snapshot: {
          event_type_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
          event_date: '2026-12-01T00:00:00Z',
          location_id: 'llllllll-llll-llll-llll-llllllllllll',
          guests_count: 120,
        },
      }),
      { status: 201 },
    );
  }),
];

// Exports para tests que quieran forzar escenarios sin duplicar UUIDs.
export const quotesMswTriggers = {
  UNAUTH: TRIGGER_UNAUTH,
  FORBIDDEN: TRIGGER_FORBIDDEN,
  EVENT_NOT_FOUND: TRIGGER_EVENT_NOT_FOUND,
  EVENT_NOT_ACTIVE: TRIGGER_EVENT_NOT_ACTIVE,
  VENDOR_UNAVAILABLE: TRIGGER_VENDOR_UNAVAILABLE,
  CATEGORY_INVALID: TRIGGER_CATEGORY_INVALID,
  QR_ALREADY_ACTIVE: TRIGGER_QR_ALREADY_ACTIVE,
  QR_CATEGORY_LIMIT: TRIGGER_QR_CATEGORY_LIMIT,
  RATE_LIMIT: TRIGGER_RATE_LIMIT,
  INVALID_BRIEF: TRIGGER_INVALID_BRIEF,
} as const;
