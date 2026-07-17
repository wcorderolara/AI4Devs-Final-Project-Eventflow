// MSW handlers — organizer booking-intents (US-060 / PB-P1-036 / FE-002).
//
// Cubre `POST /api/v1/booking-intents` con 201 (happy path), 400 (VALIDATION_ERROR con campo
// de pago o DISCLAIMER_REQUIRED), 401, 403, 404 (QUOTE_NOT_FOUND uniforme), 409
// (QUOTE_NOT_ACCEPTABLE / QUOTE_EXPIRED / BOOKING_INTENT_ALREADY_EXISTS). Los disparadores viven
// en el `quote_id` del body para no requerir headers custom — cualquier UUID que no matchee cae
// al happy path.
import { http, HttpResponse } from 'msw';

const CORRELATION = '00000000-0000-0000-0000-msw000000060';

// Triggers por `quote_id`.
const CREATE_TRIGGER_UNAUTH = 'ffffffff-0000-0000-0060-000000000401';
const CREATE_TRIGGER_FORBIDDEN = 'ffffffff-0000-0000-0060-000000000403';
const CREATE_TRIGGER_QUOTE_NOT_FOUND = 'ffffffff-0000-0000-0060-000000000404';
const CREATE_TRIGGER_QUOTE_NOT_ACCEPTABLE = 'ffffffff-0000-0000-0060-000000000409';
const CREATE_TRIGGER_QUOTE_EXPIRED = 'ffffffff-0000-0000-0060-000000000410';
const CREATE_TRIGGER_ALREADY_EXISTS = 'ffffffff-0000-0000-0060-000000000411';
const CREATE_TRIGGER_RATE_LIMIT = 'ffffffff-0000-0000-0060-000000000429';

interface CreateBody {
  quote_id?: string;
  disclaimer_accepted?: boolean;
  // FR-BOOKING-007: campos de pago que el `.strict()` server-side rechaza; el mock los detecta
  // y responde `400 VALIDATION_ERROR` para probar el banner i18n desde el frontend.
  payment_method?: unknown;
  card_token?: unknown;
  card_number?: unknown;
  amount_paid?: unknown;
  payment_intent_id?: unknown;
}

function envelope<T>(data: T): { data: T; correlationId: string } {
  return { data, correlationId: CORRELATION };
}

function errorEnvelope(code: string, message: string, details?: unknown): {
  error: { code: string; message: string; correlationId: string; details?: unknown };
} {
  const error: { code: string; message: string; correlationId: string; details?: unknown } = {
    code,
    message,
    correlationId: CORRELATION,
  };
  if (details !== undefined) error.details = details;
  return { error };
}

function hasPaymentField(body: CreateBody): boolean {
  return (
    body.payment_method !== undefined ||
    body.card_token !== undefined ||
    body.card_number !== undefined ||
    body.amount_paid !== undefined ||
    body.payment_intent_id !== undefined
  );
}

export const bookingIntentsHandlers = [
  http.post('*/api/v1/booking-intents', async ({ request }) => {
    const raw = await request.text();
    const body = raw ? (JSON.parse(raw) as CreateBody) : {};
    const quoteId = String(body.quote_id ?? '');

    // FR-BOOKING-007 — DTO `.strict()` rechaza campos de pago antes de validar disclaimer.
    if (hasPaymentField(body)) {
      return HttpResponse.json(
        errorEnvelope('VALIDATION_ERROR', 'Payment fields are not allowed', [
          { field: 'body', message: 'unrecognized_keys' },
        ]),
        { status: 400 },
      );
    }

    if (quoteId === CREATE_TRIGGER_UNAUTH) {
      return HttpResponse.json(errorEnvelope('AUTHENTICATION_REQUIRED', 'Authentication required'), {
        status: 401,
      });
    }
    if (quoteId === CREATE_TRIGGER_FORBIDDEN) {
      return HttpResponse.json(errorEnvelope('FORBIDDEN', 'Only organizers can create booking intents'), {
        status: 403,
      });
    }
    if (quoteId === CREATE_TRIGGER_QUOTE_NOT_FOUND) {
      return HttpResponse.json(errorEnvelope('QUOTE_NOT_FOUND', 'Quote not found'), { status: 404 });
    }
    if (quoteId === CREATE_TRIGGER_QUOTE_NOT_ACCEPTABLE) {
      return HttpResponse.json(
        errorEnvelope('QUOTE_NOT_ACCEPTABLE', 'Quote cannot be accepted in its current state', [
          { field: 'current_status', message: 'accepted' },
        ]),
        { status: 409 },
      );
    }
    if (quoteId === CREATE_TRIGGER_QUOTE_EXPIRED) {
      return HttpResponse.json(errorEnvelope('QUOTE_EXPIRED', 'Quote has expired'), { status: 409 });
    }
    if (quoteId === CREATE_TRIGGER_ALREADY_EXISTS) {
      return HttpResponse.json(
        errorEnvelope('BOOKING_INTENT_ALREADY_EXISTS', 'A booking intent is already active for this quote', [
          { field: 'booking_intent_id', message: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' },
        ]),
        { status: 409 },
      );
    }
    if (quoteId === CREATE_TRIGGER_RATE_LIMIT) {
      return HttpResponse.json(errorEnvelope('RATE_LIMIT_EXCEEDED', 'Too many requests'), { status: 429 });
    }
    if (body.disclaimer_accepted !== true) {
      return HttpResponse.json(
        errorEnvelope('DISCLAIMER_REQUIRED', 'Booking intent requires explicit disclaimer acceptance', [
          { field: 'disclaimer_accepted', message: 'required' },
        ]),
        { status: 400 },
      );
    }
    if (typeof body.quote_id !== 'string' || body.quote_id.length < 8) {
      return HttpResponse.json(
        errorEnvelope('VALIDATION_ERROR', 'Invalid body', [{ field: 'quote_id', message: 'uuid' }]),
        { status: 400 },
      );
    }

    // Happy path (201).
    const now = new Date('2026-07-17T15:00:00Z').toISOString();
    return HttpResponse.json(
      envelope({
        id: '99999999-8888-7777-6666-555555555555',
        quoteId: quoteId,
        eventId: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
        serviceCategoryId: '99999999-9999-9999-9999-999999999999',
        vendorProfileId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        status: 'pending' as const,
        isSimulated: true,
        confirmedAt: null,
        cancelledAt: null,
        cancelledBy: null,
        cancellationReason: null,
        createdAt: now,
        updatedAt: now,
      }),
      { status: 201 },
    );
  }),
];

export const createBookingIntentMswTriggers = {
  UNAUTH: CREATE_TRIGGER_UNAUTH,
  FORBIDDEN: CREATE_TRIGGER_FORBIDDEN,
  QUOTE_NOT_FOUND: CREATE_TRIGGER_QUOTE_NOT_FOUND,
  QUOTE_NOT_ACCEPTABLE: CREATE_TRIGGER_QUOTE_NOT_ACCEPTABLE,
  QUOTE_EXPIRED: CREATE_TRIGGER_QUOTE_EXPIRED,
  ALREADY_EXISTS: CREATE_TRIGGER_ALREADY_EXISTS,
  RATE_LIMIT: CREATE_TRIGGER_RATE_LIMIT,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// US-061 · POST /api/v1/booking-intents/:id/confirm (vendor).
// US-063 (FE-003 / D1): el body ahora exige `{ disclaimer_accepted: true }` — bypass ⇒ 400
// `DISCLAIMER_REQUIRED` (paridad con US-060). Los triggers de path se mantienen para los otros
// códigos de error.
// ─────────────────────────────────────────────────────────────────────────────
const CONFIRM_TRIGGER_UNAUTH = 'ffffffff-0000-0000-0061-000000000401';
const CONFIRM_TRIGGER_FORBIDDEN = 'ffffffff-0000-0000-0061-000000000403';
const CONFIRM_TRIGGER_NOT_FOUND = 'ffffffff-0000-0000-0061-000000000404';
const CONFIRM_TRIGGER_NOT_CONFIRMABLE = 'ffffffff-0000-0000-0061-000000000409';
const CONFIRM_TRIGGER_RATE_LIMIT = 'ffffffff-0000-0000-0061-000000000429';
// Trigger que fuerza el response idempotente: el intent ya está `confirmed_intent` — el backend
// responde 200 con el mismo shape del confirm exitoso (AC-03).
const CONFIRM_TRIGGER_IDEMPOTENT = 'ffffffff-0000-0000-0061-000000000200';

bookingIntentsHandlers.push(
  http.post('*/api/v1/booking-intents/:bookingIntentId/confirm', async ({ params, request }) => {
    const id = String(params.bookingIntentId ?? '');
    // US-063 (FE-003 / EC-02): bypass del disclaimer server-side ⇒ 400 DISCLAIMER_REQUIRED.
    // Body ausente o `disclaimer_accepted !== true` dispara el mismo código que emite el backend.
    let body: { disclaimer_accepted?: unknown } = {};
    try {
      body = (await request.json()) as { disclaimer_accepted?: unknown };
    } catch {
      body = {};
    }
    if (body.disclaimer_accepted !== true) {
      return HttpResponse.json(
        errorEnvelope('DISCLAIMER_REQUIRED', 'Disclaimer acceptance required', [
          { field: 'disclaimer_accepted', message: 'must be true' },
        ]),
        { status: 400 },
      );
    }
    if (id === CONFIRM_TRIGGER_UNAUTH) {
      return HttpResponse.json(errorEnvelope('AUTHENTICATION_REQUIRED', 'Authentication required'), {
        status: 401,
      });
    }
    if (id === CONFIRM_TRIGGER_FORBIDDEN) {
      return HttpResponse.json(errorEnvelope('FORBIDDEN', 'Only the assigned vendor can confirm'), {
        status: 403,
      });
    }
    if (id === CONFIRM_TRIGGER_NOT_FOUND) {
      return HttpResponse.json(errorEnvelope('BOOKING_INTENT_NOT_FOUND', 'Booking intent not found'), {
        status: 404,
      });
    }
    if (id === CONFIRM_TRIGGER_NOT_CONFIRMABLE) {
      return HttpResponse.json(
        errorEnvelope('BOOKING_INTENT_NOT_CONFIRMABLE', 'Booking intent cannot be confirmed in its current state', [
          { field: 'current_status', message: 'cancelled' },
        ]),
        { status: 409 },
      );
    }
    if (id === CONFIRM_TRIGGER_RATE_LIMIT) {
      return HttpResponse.json(errorEnvelope('RATE_LIMIT_EXCEEDED', 'Too many requests'), { status: 429 });
    }
    // Happy path (200): confirm exitoso — incluye AC-03 idempotencia, dado que el backend
    // devuelve el mismo shape para ambos casos.
    const isIdempotent = id === CONFIRM_TRIGGER_IDEMPOTENT;
    const now = new Date('2026-07-17T18:00:00Z').toISOString();
    return HttpResponse.json(
      envelope({
        id,
        quoteId: '22222222-2222-4222-8222-222222222222',
        eventId: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
        serviceCategoryId: '99999999-9999-9999-9999-999999999999',
        vendorProfileId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        status: 'confirmed_intent' as const,
        isSimulated: true,
        confirmedAt: isIdempotent ? '2026-07-16T00:00:00Z' : now,
        cancelledAt: null,
        cancelledBy: null,
        cancellationReason: null,
        createdAt: '2026-07-15T00:00:00Z',
        updatedAt: now,
      }),
      { status: 200 },
    );
  }),
);

export const confirmBookingIntentMswTriggers = {
  UNAUTH: CONFIRM_TRIGGER_UNAUTH,
  FORBIDDEN: CONFIRM_TRIGGER_FORBIDDEN,
  NOT_FOUND: CONFIRM_TRIGGER_NOT_FOUND,
  NOT_CONFIRMABLE: CONFIRM_TRIGGER_NOT_CONFIRMABLE,
  RATE_LIMIT: CONFIRM_TRIGGER_RATE_LIMIT,
  IDEMPOTENT: CONFIRM_TRIGGER_IDEMPOTENT,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// US-062 · POST /api/v1/booking-intents/:id/cancel (organizer o vendor bilateral).
// Triggers viven en el `:bookingIntentId`. Body opcional `{reason?:string}` — AC-03 permite
// cancelar sin razón. `reason` > 500 chars ⇒ 400 INVALID_CANCELLATION_REASON.
// ─────────────────────────────────────────────────────────────────────────────
const CANCEL_TRIGGER_UNAUTH = 'ffffffff-0000-0000-0062-000000000401';
const CANCEL_TRIGGER_FORBIDDEN = 'ffffffff-0000-0000-0062-000000000403';
const CANCEL_TRIGGER_NOT_FOUND = 'ffffffff-0000-0000-0062-000000000404';
const CANCEL_TRIGGER_NOT_CANCELLABLE = 'ffffffff-0000-0000-0062-000000000409';
const CANCEL_TRIGGER_RATE_LIMIT = 'ffffffff-0000-0000-0062-000000000429';

interface CancelBody {
  reason?: unknown;
}

bookingIntentsHandlers.push(
  http.post('*/api/v1/booking-intents/:bookingIntentId/cancel', async ({ request, params }) => {
    const id = String(params.bookingIntentId ?? '');
    const raw = await request.text();
    const body = raw ? (JSON.parse(raw) as CancelBody) : {};

    if (id === CANCEL_TRIGGER_UNAUTH) {
      return HttpResponse.json(errorEnvelope('AUTHENTICATION_REQUIRED', 'Authentication required'), {
        status: 401,
      });
    }
    if (id === CANCEL_TRIGGER_FORBIDDEN) {
      return HttpResponse.json(errorEnvelope('FORBIDDEN', 'Admin cannot cancel bookings'), {
        status: 403,
      });
    }
    if (id === CANCEL_TRIGGER_NOT_FOUND) {
      return HttpResponse.json(errorEnvelope('BOOKING_INTENT_NOT_FOUND', 'Booking intent not found'), {
        status: 404,
      });
    }
    if (id === CANCEL_TRIGGER_NOT_CANCELLABLE) {
      return HttpResponse.json(
        errorEnvelope('BOOKING_INTENT_NOT_CANCELLABLE', 'Booking intent cannot be cancelled in its current state', [
          { field: 'current_status', message: 'cancelled' },
        ]),
        { status: 409 },
      );
    }
    if (id === CANCEL_TRIGGER_RATE_LIMIT) {
      return HttpResponse.json(errorEnvelope('RATE_LIMIT_EXCEEDED', 'Too many requests'), { status: 429 });
    }
    // Defensa: `reason` > 500 chars ⇒ 400 INVALID_CANCELLATION_REASON.
    if (typeof body.reason === 'string' && body.reason.length > 500) {
      return HttpResponse.json(
        errorEnvelope('INVALID_CANCELLATION_REASON', 'Cancellation reason must not exceed 500 characters', [
          { field: 'reason', message: 'too_long' },
        ]),
        { status: 400 },
      );
    }
    // Happy path (200) — devuelve el shape del BookingIntent con `status='cancelled'`.
    const now = new Date('2026-07-17T19:00:00Z').toISOString();
    const reason = typeof body.reason === 'string' && body.reason.trim().length > 0
      ? body.reason.trim()
      : null;
    return HttpResponse.json(
      envelope({
        id,
        quoteId: '22222222-2222-4222-8222-222222222222',
        eventId: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
        serviceCategoryId: '99999999-9999-9999-9999-999999999999',
        vendorProfileId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        status: 'cancelled' as const,
        isSimulated: true,
        confirmedAt: null,
        cancelledAt: now,
        cancelledBy: '88888888-8888-4888-8888-888888888888',
        cancellationReason: reason,
        createdAt: '2026-07-15T00:00:00Z',
        updatedAt: now,
      }),
      { status: 200 },
    );
  }),
);

export const cancelBookingIntentMswTriggers = {
  UNAUTH: CANCEL_TRIGGER_UNAUTH,
  FORBIDDEN: CANCEL_TRIGGER_FORBIDDEN,
  NOT_FOUND: CANCEL_TRIGGER_NOT_FOUND,
  NOT_CANCELLABLE: CANCEL_TRIGGER_NOT_CANCELLABLE,
  RATE_LIMIT: CANCEL_TRIGGER_RATE_LIMIT,
} as const;
