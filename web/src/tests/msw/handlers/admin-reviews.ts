// MSW handlers — admin reviews (US-067 moderate + US-077 list).
//
// - `POST /api/v1/admin/reviews/:id/moderate` (US-067) — 200 happy + 400/401/403/404/409.
// - `GET  /api/v1/admin/reviews` (US-077) — 200 happy con fixtures deterministas + 400 INVALID_CURSOR.
//
// Los disparadores del POST viven en el `:id`; los del GET reaccionan a filtros específicos:
//   - `cursor=__invalid__` ⇒ 400 INVALID_CURSOR.
//   - `vendor_id=<uuid trigger>` ⇒ conjunto filtrado deterministá para el UI de filtros.
//   - `has_admin_action=true` ⇒ sólo items con lastAdminAction poblado.
//   - `status=X` ⇒ filtro cliente-side sobre las fixtures.
//   - default ⇒ 25 fixtures con mezcla de status.
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

  // ── US-077 · GET /admin/reviews ──────────────────────────────────────────
  http.get('*/api/v1/admin/reviews', ({ request }) => {
    const url = new URL(request.url);
    const cursor = url.searchParams.get('cursor');
    if (cursor === '__invalid__') {
      return HttpResponse.json(errorEnvelope('INVALID_CURSOR', 'Invalid cursor'), { status: 400 });
    }

    const statusFilter = url.searchParams.getAll('status');
    const hasAdminActionRaw = url.searchParams.get('has_admin_action');
    const vendorIdFilter = url.searchParams.get('vendor_id');
    const pageSize = Number(url.searchParams.get('pageSize') ?? '25');

    const all = adminReviewsFixtures();
    let filtered = all;
    if (statusFilter.length > 0) {
      filtered = filtered.filter((r) => statusFilter.includes(r.status));
    }
    if (hasAdminActionRaw === 'true') {
      filtered = filtered.filter((r) => r.lastAdminAction !== null);
    } else if (hasAdminActionRaw === 'false') {
      filtered = filtered.filter((r) => r.lastAdminAction === null);
    }
    if (vendorIdFilter) {
      filtered = filtered.filter((r) => r.vendor.id === vendorIdFilter);
    }

    // Cursor simplificado — segundo pageParam entrega los últimos `pageSize` restantes.
    const startIndex = cursor === 'cursor-page-2' ? pageSize : 0;
    const slice = filtered.slice(startIndex, startIndex + pageSize);
    const nextCursor =
      startIndex === 0 && filtered.length > pageSize ? 'cursor-page-2' : null;

    return HttpResponse.json(
      envelope({
        items: slice,
        pagination: { nextCursor, pageSize },
      }),
      { status: 200 },
    );
  }),
];

// ── Fixtures deterministas ──────────────────────────────────────────────────
// 30 reviews: 15 published + 8 hidden + 7 removed. Los últimos 15 tienen `lastAdminAction`.
function adminReviewsFixtures() {
  const items = [];
  for (let i = 0; i < 30; i += 1) {
    const status: 'published' | 'hidden' | 'removed' =
      i < 15 ? 'published' : i < 23 ? 'hidden' : 'removed';
    const idSuffix = String(i + 1).padStart(3, '0');
    const isModerated = status !== 'published';
    items.push({
      id: `00000000-0000-0000-0077-${idSuffix}00000001`,
      rating: 1 + (i % 5),
      comment: `Comentario demo #${i + 1}`,
      status,
      createdAt: new Date(2026, 5, 20 - i, 12, 0, 0).toISOString(),
      author: {
        userId: `00000000-0000-0000-0077-author${idSuffix}`,
        displayName: `Organizador ${i + 1}`,
      },
      vendor: {
        id: `00000000-0000-0000-0077-vendor${idSuffix.slice(0, 3)}`,
        businessName: `Vendor ${i + 1}`,
        slug: `vendor-${i + 1}`,
      },
      event: {
        id: `00000000-0000-0000-0077-event${idSuffix}`,
        title: `Evento demo #${i + 1}`,
      },
      lastAdminAction: isModerated
        ? {
            action: status === 'hidden' ? 'hide' : 'remove',
            reason: 'Contenido marcado para revisión (demo msw).',
            adminId: '00000000-0000-0000-0077-adminuser001',
            createdAt: new Date(2026, 5, 22, 12, 0, 0).toISOString(),
          }
        : null,
    });
  }
  return items;
}
