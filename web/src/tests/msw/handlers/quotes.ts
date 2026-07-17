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

// US-050 · GET active-count triggers (por `event_id` o `service_category_id`).
const AC_TRIGGER_EVENT_NOT_FOUND = 'ffffffff-0000-0000-0050-000000000404';
const AC_TRIGGER_CATEGORY_INVALID = 'ffffffff-0000-0000-0050-000000000400';
const AC_TRIGGER_UNAUTH = 'ffffffff-0000-0000-0050-000000000401';
const AC_TRIGGER_FORBIDDEN = 'ffffffff-0000-0000-0050-000000000403';
// UUIDs que fuerzan un count específico (para probar el badge en 0/4/5).
const AC_TRIGGER_COUNT_FIVE = 'ffffffff-0000-0000-0050-000000000005';
const AC_TRIGGER_COUNT_FOUR = 'ffffffff-0000-0000-0050-000000000004';

// ─────────────────────────────────────────────────────────────────────────────
// US-054 · reject quote triggers (via :quoteId path param).
// ─────────────────────────────────────────────────────────────────────────────
const REJECT_TRIGGER_UNAUTH = 'ffffffff-0000-0000-0054-000000000401';
const REJECT_TRIGGER_FORBIDDEN = 'ffffffff-0000-0000-0054-000000000403';
const REJECT_TRIGGER_NOT_FOUND = 'ffffffff-0000-0000-0054-000000000404';
const REJECT_TRIGGER_NOT_REJECTABLE = 'ffffffff-0000-0000-0054-000000000409';
const REJECT_TRIGGER_INVALID_REASON = 'ffffffff-0000-0000-0054-000000000400';

// ─────────────────────────────────────────────────────────────────────────────
// US-056 · cancel quote request triggers (via :quoteRequestId path param).
// ─────────────────────────────────────────────────────────────────────────────
const CANCEL_QR_TRIGGER_UNAUTH = 'ffffffff-0000-0000-0056-000000000401';
const CANCEL_QR_TRIGGER_FORBIDDEN = 'ffffffff-0000-0000-0056-000000000403';
const CANCEL_QR_TRIGGER_NOT_FOUND = 'ffffffff-0000-0000-0056-000000000404';
const CANCEL_QR_TRIGGER_NOT_CANCELLABLE = 'ffffffff-0000-0000-0056-000000000409';
const CANCEL_QR_TRIGGER_HAS_CONFIRMED = 'ffffffff-0000-0000-0056-000000000410';
const CANCEL_QR_TRIGGER_INVALID_REASON = 'ffffffff-0000-0000-0056-000000000400';

// ─────────────────────────────────────────────────────────────────────────────
// US-057 · compare quotes triggers (via :id event path param and categoryCode).
// ─────────────────────────────────────────────────────────────────────────────
const COMPARE_TRIGGER_UNAUTH = 'ffffffff-0000-0000-0057-000000000401';
const COMPARE_TRIGGER_FORBIDDEN = 'ffffffff-0000-0000-0057-000000000403';
const COMPARE_TRIGGER_EVENT_NOT_FOUND = 'ffffffff-0000-0000-0057-000000000404';
const COMPARE_TRIGGER_EMPTY = 'ffffffff-0000-0000-0057-000000000010';
const COMPARE_TRIGGER_SINGLE = 'ffffffff-0000-0000-0057-000000000011';
const COMPARE_CATEGORY_INVALID = 'category-invalid-trigger';

export const quotesHandlers = [
  http.get('*/api/v1/quote-requests/active-count', ({ request }) => {
    const url = new URL(request.url);
    const eventId = url.searchParams.get('event_id') ?? '';
    const serviceCategoryId = url.searchParams.get('service_category_id') ?? '';

    if (eventId === AC_TRIGGER_UNAUTH) {
      return HttpResponse.json(errorEnvelope('AUTHENTICATION_REQUIRED', 'Authentication required'), {
        status: 401,
      });
    }
    if (eventId === AC_TRIGGER_FORBIDDEN) {
      return HttpResponse.json(errorEnvelope('FORBIDDEN', 'Only organizers'), { status: 403 });
    }
    if (eventId === AC_TRIGGER_EVENT_NOT_FOUND) {
      return HttpResponse.json(errorEnvelope('EVENT_NOT_FOUND', 'Event not found'), { status: 404 });
    }
    if (serviceCategoryId === AC_TRIGGER_CATEGORY_INVALID) {
      return HttpResponse.json(
        errorEnvelope('INVALID_CATEGORY', 'Service category not available', [
          { field: 'service_category_id', message: 'not_available' },
        ]),
        { status: 400 },
      );
    }

    const activeCount =
      eventId === AC_TRIGGER_COUNT_FIVE ? 5 : eventId === AC_TRIGGER_COUNT_FOUR ? 4 : 0;
    return HttpResponse.json(
      envelope({
        active_count: activeCount,
        limit: 5,
        available_slots: Math.max(0, 5 - activeCount),
        statuses_counted: ['sent', 'viewed', 'responded'],
      }),
      { status: 200 },
    );
  }),

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

  // US-054 · POST /api/v1/quotes/:quoteId/reject (organizer).
  // Los disparadores viven en el `:quoteId` — el `reason` del body se refleja en la respuesta
  // 200 para permitir aserciones desde los tests del dialog.
  http.post('*/api/v1/quotes/:quoteId/reject', async ({ request, params }) => {
    const quoteId = String(params.quoteId ?? '');
    const raw = await request.text();
    const body: { reason?: string } = raw ? JSON.parse(raw) : {};

    if (quoteId === REJECT_TRIGGER_UNAUTH) {
      return HttpResponse.json(errorEnvelope('AUTHENTICATION_REQUIRED', 'Authentication required'), {
        status: 401,
      });
    }
    if (quoteId === REJECT_TRIGGER_FORBIDDEN) {
      return HttpResponse.json(errorEnvelope('FORBIDDEN', 'Only organizers can reject quotes'), {
        status: 403,
      });
    }
    if (quoteId === REJECT_TRIGGER_NOT_FOUND) {
      return HttpResponse.json(errorEnvelope('QUOTE_NOT_FOUND', 'Quote not found'), { status: 404 });
    }
    if (quoteId === REJECT_TRIGGER_NOT_REJECTABLE) {
      return HttpResponse.json(
        errorEnvelope('QUOTE_NOT_REJECTABLE', 'Quote is not rejectable in its current state', [
          { field: 'current_status', message: 'accepted' },
        ]),
        { status: 409 },
      );
    }
    if (quoteId === REJECT_TRIGGER_INVALID_REASON) {
      return HttpResponse.json(
        errorEnvelope('INVALID_REJECTION_REASON', 'reason exceeds maximum length of 500 characters', [
          { field: 'reason', message: 'too_long' },
        ]),
        { status: 400 },
      );
    }

    const now = new Date('2026-07-16T12:00:00Z').toISOString();
    return HttpResponse.json(
      envelope({
        id: quoteId,
        status: 'rejected',
        rejectedAt: now,
        rejectionReason: body.reason && body.reason.length > 0 ? body.reason : null,
      }),
      { status: 200 },
    );
  }),

  // US-056 · PATCH /api/v1/quote-requests/:quoteRequestId/cancel (organizer).
  // Los disparadores viven en el `:quoteRequestId` — el `reason` del body se refleja en la
  // respuesta 200 para permitir aserciones desde los tests del dialog.
  http.patch('*/api/v1/quote-requests/:quoteRequestId/cancel', async ({ request, params }) => {
    const quoteRequestId = String(params.quoteRequestId ?? '');
    const raw = await request.text();
    const body: { reason?: string } = raw ? JSON.parse(raw) : {};

    if (quoteRequestId === CANCEL_QR_TRIGGER_UNAUTH) {
      return HttpResponse.json(errorEnvelope('AUTHENTICATION_REQUIRED', 'Authentication required'), {
        status: 401,
      });
    }
    if (quoteRequestId === CANCEL_QR_TRIGGER_FORBIDDEN) {
      return HttpResponse.json(errorEnvelope('FORBIDDEN', 'Only organizers can cancel quote requests'), {
        status: 403,
      });
    }
    if (quoteRequestId === CANCEL_QR_TRIGGER_NOT_FOUND) {
      return HttpResponse.json(errorEnvelope('QR_NOT_FOUND', 'Quote request not found'), {
        status: 404,
      });
    }
    if (quoteRequestId === CANCEL_QR_TRIGGER_NOT_CANCELLABLE) {
      return HttpResponse.json(
        errorEnvelope('QR_NOT_CANCELLABLE', 'Quote request cannot be cancelled in its current state', [
          { field: 'current_status', message: 'expired' },
        ]),
        { status: 409 },
      );
    }
    if (quoteRequestId === CANCEL_QR_TRIGGER_HAS_CONFIRMED) {
      return HttpResponse.json(
        errorEnvelope('QR_HAS_CONFIRMED_BOOKING', 'Quote request has a confirmed booking intent', [
          { field: 'booking_intent_id', message: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' },
        ]),
        { status: 409 },
      );
    }
    if (quoteRequestId === CANCEL_QR_TRIGGER_INVALID_REASON) {
      return HttpResponse.json(
        errorEnvelope('INVALID_CANCELLATION_REASON', 'reason exceeds maximum length of 500 characters', [
          { field: 'reason', message: 'too_long' },
        ]),
        { status: 400 },
      );
    }

    const now = new Date('2026-07-16T12:00:00Z').toISOString();
    const actorId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    return HttpResponse.json(
      envelope({
        id: quoteRequestId,
        status: 'cancelled',
        cancelledAt: now,
        cancelledBy: actorId,
        cancellationReason: body.reason && body.reason.length > 0 ? body.reason : null,
      }),
      { status: 200 },
    );
  }),

  // US-057 · GET /api/v1/events/:id/quotes/compare?categoryCode=<slug> (organizer).
  // Triggers viven en el `:id` para 4xx; el `categoryCode` puede forzar 400 INVALID_CATEGORY.
  // Payload happy: 3 quotes ordenados por `is_preferred DESC, activos primero, total_price ASC`.
  http.get('*/api/v1/events/:id/quotes/compare', ({ request, params }) => {
    const url = new URL(request.url);
    const eventId = String(params.id ?? '');
    const categoryCode = url.searchParams.get('categoryCode') ?? '';

    if (categoryCode === '') {
      return HttpResponse.json(
        errorEnvelope('INVALID_FILTERS', 'categoryCode is required', [
          { field: 'categoryCode', message: 'required' },
        ]),
        { status: 400 },
      );
    }
    if (categoryCode === COMPARE_CATEGORY_INVALID) {
      return HttpResponse.json(
        errorEnvelope('INVALID_CATEGORY', 'Service category is not available', [
          { field: 'categoryCode', message: categoryCode },
        ]),
        { status: 400 },
      );
    }
    if (eventId === COMPARE_TRIGGER_UNAUTH) {
      return HttpResponse.json(errorEnvelope('AUTHENTICATION_REQUIRED', 'Authentication required'), {
        status: 401,
      });
    }
    if (eventId === COMPARE_TRIGGER_FORBIDDEN) {
      return HttpResponse.json(errorEnvelope('FORBIDDEN', 'Only organizers can compare quotes'), {
        status: 403,
      });
    }
    if (eventId === COMPARE_TRIGGER_EVENT_NOT_FOUND) {
      return HttpResponse.json(errorEnvelope('EVENT_NOT_FOUND', 'Event not found'), { status: 404 });
    }

    const emptyPayload = {
      category: { code: categoryCode, name: 'Catering' },
      currency_code: 'GTQ',
      items: [] as unknown[],
    };
    if (eventId === COMPARE_TRIGGER_EMPTY) {
      return HttpResponse.json(envelope(emptyPayload), { status: 200 });
    }

    const singleItem = {
      quote_id: 'q1111111-1111-1111-1111-111111111111',
      vendor: {
        profile_id: 'v1111111-1111-1111-1111-111111111111',
        business_name: 'Catering Aurora',
        slug: 'catering-aurora',
        rating_avg: 4.6,
        reviews_count: 24,
      },
      status: 'sent' as const,
      total_price: '5000.00',
      breakdown: [{ label: 'Menú por persona', amount: '5000.00' }],
      valid_until: '2026-08-01T00:00:00.000Z',
      conditions: 'Requiere 50% de anticipo.',
      is_preferred: false,
      created_at: '2026-07-01T12:00:00.000Z',
    };
    if (eventId === COMPARE_TRIGGER_SINGLE) {
      return HttpResponse.json(
        envelope({
          category: { code: categoryCode, name: 'Catering' },
          currency_code: 'GTQ',
          items: [singleItem],
        }),
        { status: 200 },
      );
    }

    // Happy path (≥2 quotes). Orden: preferred primero, luego activos ASC, luego expired/rejected.
    const items = [
      {
        quote_id: 'q2222222-2222-2222-2222-222222222222',
        vendor: {
          profile_id: 'v2222222-2222-2222-2222-222222222222',
          business_name: 'Catering Bellavista',
          slug: 'catering-bellavista',
          rating_avg: 4.8,
          reviews_count: 42,
        },
        status: 'sent' as const,
        total_price: '4500.00',
        breakdown: [{ label: 'Menú por persona', amount: '4500.00' }],
        valid_until: '2026-08-05T00:00:00.000Z',
        conditions: null,
        is_preferred: true,
        created_at: '2026-07-02T09:00:00.000Z',
      },
      singleItem,
      {
        quote_id: 'q3333333-3333-3333-3333-333333333333',
        vendor: {
          profile_id: 'v3333333-3333-3333-3333-333333333333',
          business_name: 'Catering Cielo',
          slug: 'catering-cielo',
          rating_avg: null,
          reviews_count: 0,
        },
        status: 'expired' as const,
        total_price: '3500.00',
        breakdown: null,
        valid_until: '2026-07-10T00:00:00.000Z',
        conditions: null,
        is_preferred: false,
        created_at: '2026-06-25T15:00:00.000Z',
      },
    ];

    return HttpResponse.json(
      envelope({
        category: { code: categoryCode, name: 'Catering' },
        currency_code: 'GTQ',
        items,
      }),
      { status: 200 },
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

// US-054 (FE-002) — triggers para el `RejectQuoteDialog` y los tests de mutations.
export const rejectQuoteMswTriggers = {
  UNAUTH: REJECT_TRIGGER_UNAUTH,
  FORBIDDEN: REJECT_TRIGGER_FORBIDDEN,
  NOT_FOUND: REJECT_TRIGGER_NOT_FOUND,
  NOT_REJECTABLE: REJECT_TRIGGER_NOT_REJECTABLE,
  INVALID_REASON: REJECT_TRIGGER_INVALID_REASON,
} as const;

// US-056 (FE-002) — triggers para el `CancelQRDialog` y los tests de mutations.
export const cancelQrMswTriggers = {
  UNAUTH: CANCEL_QR_TRIGGER_UNAUTH,
  FORBIDDEN: CANCEL_QR_TRIGGER_FORBIDDEN,
  NOT_FOUND: CANCEL_QR_TRIGGER_NOT_FOUND,
  NOT_CANCELLABLE: CANCEL_QR_TRIGGER_NOT_CANCELLABLE,
  HAS_CONFIRMED_BOOKING: CANCEL_QR_TRIGGER_HAS_CONFIRMED,
  INVALID_REASON: CANCEL_QR_TRIGGER_INVALID_REASON,
} as const;

// US-057 (FE-003) — triggers para el `QuoteComparator` y los tests de queries.
export const compareQuotesMswTriggers = {
  UNAUTH: COMPARE_TRIGGER_UNAUTH,
  FORBIDDEN: COMPARE_TRIGGER_FORBIDDEN,
  EVENT_NOT_FOUND: COMPARE_TRIGGER_EVENT_NOT_FOUND,
  EMPTY: COMPARE_TRIGGER_EMPTY,
  SINGLE: COMPARE_TRIGGER_SINGLE,
  CATEGORY_INVALID: COMPARE_CATEGORY_INVALID,
} as const;

export const quotesActiveCountMswTriggers = {
  UNAUTH: AC_TRIGGER_UNAUTH,
  FORBIDDEN: AC_TRIGGER_FORBIDDEN,
  EVENT_NOT_FOUND: AC_TRIGGER_EVENT_NOT_FOUND,
  CATEGORY_INVALID: AC_TRIGGER_CATEGORY_INVALID,
  COUNT_FOUR: AC_TRIGGER_COUNT_FOUR,
  COUNT_FIVE: AC_TRIGGER_COUNT_FIVE,
} as const;
