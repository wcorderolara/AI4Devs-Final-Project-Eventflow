// MSW handlers — admin moderate review (US-067 / PB-P1-040 / FE-003).
//
// Cubre `POST /api/v1/admin/reviews/:id/moderate` con 200 happy path + errores del contrato §9:
//   - `400 VALIDATION_ERROR` (body sin reason o reason fuera de [10..500] o action inválido).
//   - `400 INVALID_UUID` (path `:id` no es UUID).
//   - `401 AUTHENTICATION_REQUIRED`.
//   - `403 FORBIDDEN` (organizer/vendor — rol no autorizado).
//   - `404 REVIEW_NOT_FOUND` (Decisión PO D6 — código específico de dominio review).
//   - `409 INVALID_TRANSITION` con `details = [{from},{to},{allowed}]` (EC-01/EC-02).
//
// Los disparadores viven en el `:id` de la review para no requerir headers custom — cualquier
// UUID que no matchee explícitamente cae al happy path (`hidden` o `removed` según action).
import { http, HttpResponse } from 'msw';

const CORRELATION = '00000000-0000-0000-0000-msw000000067';

// Trigger UUIDs — el `:id` de la review selecciona el escenario negativo.
const REVIEW_UNAUTH = 'ffffffff-0000-0000-0067-000000000401';
const REVIEW_FORBIDDEN = 'ffffffff-0000-0000-0067-000000000403';
const REVIEW_NOT_FOUND = 'ffffffff-0000-0000-0067-000000000404';
const REVIEW_ALREADY_REMOVED = 'ffffffff-0000-0000-0067-000000000409';
const REVIEW_HIDDEN_TO_HIDDEN = 'ffffffff-0000-0000-0067-000000000410';

export const moderateReviewMswTriggers = {
  UNAUTH: REVIEW_UNAUTH,
  FORBIDDEN: REVIEW_FORBIDDEN,
  NOT_FOUND: REVIEW_NOT_FOUND,
  ALREADY_REMOVED: REVIEW_ALREADY_REMOVED,
  HIDDEN_TO_HIDDEN: REVIEW_HIDDEN_TO_HIDDEN,
} as const;

interface ModerateBody {
  action?: unknown;
  reason?: unknown;
  [k: string]: unknown;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function envelope<T>(data: T): { data: T; correlationId: string } {
  return { data, correlationId: CORRELATION };
}

function errorEnvelope(
  code: string,
  message: string,
  details?: unknown,
): { error: { code: string; message: string; correlationId: string; details?: unknown } } {
  const error: { code: string; message: string; correlationId: string; details?: unknown } = {
    code,
    message,
    correlationId: CORRELATION,
  };
  if (details !== undefined) error.details = details;
  return { error };
}

function isAllowedAction(a: unknown): a is 'hide' | 'remove' {
  return a === 'hide' || a === 'remove';
}

function isValidReason(r: unknown): r is string {
  return typeof r === 'string' && r.length >= 10 && r.length <= 500;
}

export const adminReviewsHandlers = [
  http.post('*/api/v1/admin/reviews/:id/moderate', async ({ params, request }) => {
    const id = String(params.id ?? '');
    if (!UUID_RE.test(id)) {
      return HttpResponse.json(errorEnvelope('INVALID_UUID', 'Invalid UUID'), { status: 400 });
    }

    const raw = await request.text();
    const body = (raw ? JSON.parse(raw) : {}) as ModerateBody;

    // Validación mínima paridad con backend Zod `.strict()`.
    if (!isAllowedAction(body.action)) {
      return HttpResponse.json(
        errorEnvelope('VALIDATION_ERROR', 'Invalid action', [
          { field: 'action', message: 'must be hide|remove' },
        ]),
        { status: 400 },
      );
    }
    if (!isValidReason(body.reason)) {
      return HttpResponse.json(
        errorEnvelope('VALIDATION_ERROR', 'Invalid reason', [
          { field: 'reason', message: 'length must be 10..500' },
        ]),
        { status: 400 },
      );
    }
    // Campos extra ⇒ 400 VALIDATION_ERROR (`.strict()` en backend).
    const extra = Object.keys(body).filter((k) => k !== 'action' && k !== 'reason');
    if (extra.length > 0) {
      return HttpResponse.json(
        errorEnvelope('VALIDATION_ERROR', 'Unknown fields', [
          { field: 'body', message: `unknown: ${extra.join(',')}` },
        ]),
        { status: 400 },
      );
    }

    switch (id) {
      case REVIEW_UNAUTH:
        return HttpResponse.json(errorEnvelope('AUTHENTICATION_REQUIRED', 'Authentication required'), {
          status: 401,
        });
      case REVIEW_FORBIDDEN:
        return HttpResponse.json(errorEnvelope('FORBIDDEN', 'Forbidden'), { status: 403 });
      case REVIEW_NOT_FOUND:
        return HttpResponse.json(errorEnvelope('REVIEW_NOT_FOUND', 'Review not found'), { status: 404 });
      case REVIEW_ALREADY_REMOVED:
        return HttpResponse.json(
          errorEnvelope('INVALID_TRANSITION', 'Invalid review status transition', [
            { field: 'from', message: 'removed' },
            { field: 'to', message: body.action === 'hide' ? 'hidden' : 'removed' },
            { field: 'allowed', message: '' },
          ]),
          { status: 409 },
        );
      case REVIEW_HIDDEN_TO_HIDDEN:
        return HttpResponse.json(
          errorEnvelope('INVALID_TRANSITION', 'Invalid review status transition', [
            { field: 'from', message: 'hidden' },
            { field: 'to', message: 'hidden' },
            { field: 'allowed', message: 'removed' },
          ]),
          { status: 409 },
        );
      default: {
        const targetStatus: 'hidden' | 'removed' = body.action === 'hide' ? 'hidden' : 'removed';
        return HttpResponse.json(
          envelope({
            id,
            status: targetStatus,
            moderatedAt: new Date('2026-07-20T12:00:00Z').toISOString(),
            moderatedBy: '00000000-0000-0000-0067-admin00000001',
            moderationReason: body.reason,
            adminActionId: '00000000-0000-0000-0067-adminAction001',
          }),
          { status: 200 },
        );
      }
    }
  }),
];
