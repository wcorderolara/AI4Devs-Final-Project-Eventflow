// MSW handlers — organizer reviews (US-065 / PB-P1-038 / FE-003).
//
// Cubre `POST /api/v1/organizer/reviews` con 201 happy path + errores del contrato §9:
//   - `400 VALIDATION_ERROR` (body con rating fuera de 1..5 o comment > 2000).
//   - `401 AUTHENTICATION_REQUIRED`.
//   - `403 FORBIDDEN` (vendor/admin — rol no autorizado).
//   - `403 REVIEW_NOT_ELIGIBLE` con las 4 razones (`no_booking`, `event_not_completed`,
//     `window_expired`, `already_reviewed`) — via `details[0].message`.
//   - `404 RESOURCE_NOT_FOUND` (event/vendor inexistente o ajeno — uniforme).
//
// Los disparadores viven en el par (`event_id`, `vendor_profile_id`) del body para no requerir
// headers custom — cualquier UUID que no matchee cae al happy path.
import { http, HttpResponse } from 'msw';

const CORRELATION = '00000000-0000-0000-0000-msw000000065';

// Trigger UUIDs — `vendor_profile_id` selecciona el escenario negativo.
const VP_UNAUTH = 'ffffffff-0000-0000-0065-000000000401';
const VP_FORBIDDEN = 'ffffffff-0000-0000-0065-000000000403';
const VP_NOT_FOUND = 'ffffffff-0000-0000-0065-000000000404';
const VP_NOT_ELIGIBLE_NO_BOOKING = 'ffffffff-0000-0000-0065-000000000431';
const VP_NOT_ELIGIBLE_EVENT_NOT_COMPLETED = 'ffffffff-0000-0000-0065-000000000432';
const VP_NOT_ELIGIBLE_WINDOW_EXPIRED = 'ffffffff-0000-0000-0065-000000000433';
const VP_NOT_ELIGIBLE_ALREADY_REVIEWED = 'ffffffff-0000-0000-0065-000000000434';

export const createReviewMswTriggers = {
  UNAUTH: VP_UNAUTH,
  FORBIDDEN: VP_FORBIDDEN,
  NOT_FOUND: VP_NOT_FOUND,
  NOT_ELIGIBLE_NO_BOOKING: VP_NOT_ELIGIBLE_NO_BOOKING,
  NOT_ELIGIBLE_EVENT_NOT_COMPLETED: VP_NOT_ELIGIBLE_EVENT_NOT_COMPLETED,
  NOT_ELIGIBLE_WINDOW_EXPIRED: VP_NOT_ELIGIBLE_WINDOW_EXPIRED,
  NOT_ELIGIBLE_ALREADY_REVIEWED: VP_NOT_ELIGIBLE_ALREADY_REVIEWED,
} as const;

interface CreateReviewBody {
  event_id?: string;
  vendor_profile_id?: string;
  rating?: unknown;
  comment?: unknown;
}

function envelope<T>(data: T): { data: T; correlationId: string } {
  return { data, correlationId: CORRELATION };
}

function errorEnvelope(
  code: string,
  message: string,
  details?: unknown,
): {
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

function isValidRating(rating: unknown): rating is number {
  return typeof rating === 'number' && Number.isInteger(rating) && rating >= 1 && rating <= 5;
}

export const organizerReviewsHandlers = [
  http.post('*/api/v1/organizer/reviews', async ({ request }) => {
    const raw = await request.text();
    const body = raw ? (JSON.parse(raw) as CreateReviewBody) : {};

    // Validación mínima paridad con backend Zod `.strict()`.
    if (!isValidRating(body.rating)) {
      return HttpResponse.json(
        errorEnvelope('VALIDATION_ERROR', 'Invalid rating', [
          { field: 'rating', message: 'must be integer 1..5' },
        ]),
        { status: 400 },
      );
    }
    if (typeof body.comment === 'string' && body.comment.length > 2000) {
      return HttpResponse.json(
        errorEnvelope('VALIDATION_ERROR', 'Comment too long', [
          { field: 'comment', message: 'max 2000 chars' },
        ]),
        { status: 400 },
      );
    }

    const vendorProfileId = String(body.vendor_profile_id ?? '');
    switch (vendorProfileId) {
      case VP_UNAUTH:
        return HttpResponse.json(errorEnvelope('AUTHENTICATION_REQUIRED', 'Authentication required'), {
          status: 401,
        });
      case VP_FORBIDDEN:
        return HttpResponse.json(errorEnvelope('FORBIDDEN', 'Forbidden'), { status: 403 });
      case VP_NOT_FOUND:
        return HttpResponse.json(errorEnvelope('RESOURCE_NOT_FOUND', 'Resource not found'), { status: 404 });
      case VP_NOT_ELIGIBLE_NO_BOOKING:
        return HttpResponse.json(
          errorEnvelope('REVIEW_NOT_ELIGIBLE', 'Not eligible', [
            { field: 'reason', message: 'no_booking' },
          ]),
          { status: 403 },
        );
      case VP_NOT_ELIGIBLE_EVENT_NOT_COMPLETED:
        return HttpResponse.json(
          errorEnvelope('REVIEW_NOT_ELIGIBLE', 'Not eligible', [
            { field: 'reason', message: 'event_not_completed' },
          ]),
          { status: 403 },
        );
      case VP_NOT_ELIGIBLE_WINDOW_EXPIRED:
        return HttpResponse.json(
          errorEnvelope('REVIEW_NOT_ELIGIBLE', 'Not eligible', [
            { field: 'reason', message: 'window_expired' },
          ]),
          { status: 403 },
        );
      case VP_NOT_ELIGIBLE_ALREADY_REVIEWED:
        return HttpResponse.json(
          errorEnvelope('REVIEW_NOT_ELIGIBLE', 'Not eligible', [
            { field: 'reason', message: 'already_reviewed' },
          ]),
          { status: 403 },
        );
      default: {
        const nowIso = new Date().toISOString();
        return HttpResponse.json(
          envelope({
            id: '00000000-0000-0000-0065-000000000001',
            eventId: String(body.event_id ?? '00000000-0000-0000-0065-000000000002'),
            vendorProfileId,
            bookingIntentId: '00000000-0000-0000-0065-000000000003',
            authorUserId: '00000000-0000-0000-0065-000000000004',
            rating: body.rating,
            comment: typeof body.comment === 'string' && body.comment.trim().length > 0 ? body.comment : null,
            status: 'published' as const,
            createdAt: nowIso,
          }),
          { status: 201 },
        );
      }
    }
  }),
];
