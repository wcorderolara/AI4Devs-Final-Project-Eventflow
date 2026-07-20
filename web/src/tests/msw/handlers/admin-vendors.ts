// MSW handlers — admin vendors (US-074 list + US-047 moderate).
//
// - `GET  /api/v1/admin/vendors`             (US-074) — 200 happy con fixtures deterministas +
//                                              400 INVALID_CURSOR + filtros cliente-side.
// - `POST /api/v1/admin/vendors/:id/moderate` (US-047) — 200 happy + 400/401/403/404/409.
//
// Los disparadores del POST viven en el `:id`; los del GET reaccionan a filtros específicos:
//   - `cursor=__invalid__` ⇒ 400 INVALID_CURSOR.
//   - `status=X` ⇒ filtro cliente-side sobre las fixtures.
//   - `is_hidden=true`/`false` ⇒ filtro cliente-side.
//   - `business_name=<query>` ⇒ substring case-insensitive contra las fixtures.
//   - default ⇒ 25 fixtures con mezcla de status.
import { http, HttpResponse } from 'msw';

const CORRELATION = '00000000-0000-0000-0000-msw000000074';

const VENDOR_UNAUTH = 'ffffffff-0000-0000-0074-000000000401';
const VENDOR_FORBIDDEN = 'ffffffff-0000-0000-0074-000000000403';
const VENDOR_NOT_FOUND = 'ffffffff-0000-0000-0074-000000000404';
const VENDOR_APPROVED_APPROVE = 'ffffffff-0000-0000-0074-000000000409';

export const moderateVendorMswTriggers = {
  UNAUTH: VENDOR_UNAUTH,
  FORBIDDEN: VENDOR_FORBIDDEN,
  NOT_FOUND: VENDOR_NOT_FOUND,
  INVALID_TRANSITION: VENDOR_APPROVED_APPROVE,
} as const;

interface ModerateBody {
  action?: unknown;
  reason?: unknown;
  [k: string]: unknown;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_ACTIONS = new Set(['approve', 'reject', 'hide', 'unhide']);
const REASON_REQUIRED = new Set(['reject', 'hide']);

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

export const adminVendorsHandlers = [
  http.post('*/api/v1/admin/vendors/:id/moderate', async ({ params, request }) => {
    const id = String(params.id ?? '');
    if (!UUID_RE.test(id)) {
      return HttpResponse.json(errorEnvelope('INVALID_UUID', 'Invalid UUID'), { status: 400 });
    }

    const raw = await request.text();
    const body = (raw ? JSON.parse(raw) : {}) as ModerateBody;

    if (typeof body.action !== 'string' || !ALLOWED_ACTIONS.has(body.action)) {
      return HttpResponse.json(
        errorEnvelope('VALIDATION_ERROR', 'Invalid action', [
          { field: 'action', message: 'must be approve|reject|hide|unhide' },
        ]),
        { status: 400 },
      );
    }
    // Cross-field refine D4: reject/hide requieren reason [10..500].
    if (REASON_REQUIRED.has(body.action)) {
      if (typeof body.reason !== 'string') {
        return HttpResponse.json(
          errorEnvelope('VALIDATION_ERROR', 'Reason required', [
            { field: 'body.reason', message: 'REASON_REQUIRED' },
          ]),
          { status: 400 },
        );
      }
      if (body.reason.length < 10 || body.reason.length > 500) {
        return HttpResponse.json(
          errorEnvelope('VALIDATION_ERROR', 'Invalid reason length', [
            { field: 'reason', message: 'length must be 10..500' },
          ]),
          { status: 400 },
        );
      }
    } else if (body.reason !== undefined && (typeof body.reason !== 'string' || body.reason.length > 500)) {
      return HttpResponse.json(
        errorEnvelope('VALIDATION_ERROR', 'Invalid reason length', [
          { field: 'reason', message: 'length must be <= 500' },
        ]),
        { status: 400 },
      );
    }
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
      case VENDOR_UNAUTH:
        return HttpResponse.json(
          errorEnvelope('AUTHENTICATION_REQUIRED', 'Authentication required'),
          { status: 401 },
        );
      case VENDOR_FORBIDDEN:
        return HttpResponse.json(errorEnvelope('FORBIDDEN', 'Forbidden'), { status: 403 });
      case VENDOR_NOT_FOUND:
        return HttpResponse.json(errorEnvelope('VENDOR_NOT_FOUND', 'Vendor not found'), {
          status: 404,
        });
      case VENDOR_APPROVED_APPROVE:
        return HttpResponse.json(
          errorEnvelope('INVALID_TRANSITION', 'Invalid vendor moderation transition', [
            { field: 'from_status', message: 'approved' },
            { field: 'from_is_hidden', message: 'false' },
            { field: 'to_status', message: 'approved' },
            { field: 'to_is_hidden', message: 'false' },
            { field: 'action', message: body.action },
            { field: 'allowed', message: 'hide' },
          ]),
          { status: 409 },
        );
      default: {
        // Simular las postcondiciones del server-side según la acción.
        const action = body.action as 'approve' | 'reject' | 'hide' | 'unhide';
        const toStatus =
          action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'approved';
        const toIsHidden = action === 'hide' ? true : action === 'unhide' ? false : false;
        return HttpResponse.json(
          envelope({
            id,
            status: toStatus,
            isHidden: toIsHidden,
            moderatedAt: new Date('2026-07-20T12:00:00Z').toISOString(),
            moderatedBy: '00000000-0000-0000-0074-admin00000001',
            moderationReason: typeof body.reason === 'string' ? body.reason : null,
            adminActionId: '00000000-0000-0000-0074-adminAction001',
          }),
          { status: 200 },
        );
      }
    }
  }),

  // ── US-074 · GET /admin/vendors ──────────────────────────────────────────
  http.get('*/api/v1/admin/vendors', ({ request }) => {
    const url = new URL(request.url);
    const cursor = url.searchParams.get('cursor');
    if (cursor === '__invalid__') {
      return HttpResponse.json(errorEnvelope('INVALID_CURSOR', 'Invalid cursor'), { status: 400 });
    }

    const statusFilter = url.searchParams.getAll('status');
    const isHiddenRaw = url.searchParams.get('is_hidden');
    const businessNameFilter = (url.searchParams.get('business_name') ?? '').toLowerCase();
    const pageSize = Number(url.searchParams.get('pageSize') ?? '25');

    const all = adminVendorsFixtures();
    let filtered = all;
    if (statusFilter.length > 0) {
      filtered = filtered.filter((v) => statusFilter.includes(v.status));
    }
    if (isHiddenRaw === 'true') filtered = filtered.filter((v) => v.isHidden);
    else if (isHiddenRaw === 'false') filtered = filtered.filter((v) => !v.isHidden);
    if (businessNameFilter.length > 0) {
      filtered = filtered.filter((v) =>
        v.businessName.toLowerCase().includes(businessNameFilter),
      );
    }

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
// 30 vendors mezclando status; los approved incluyen algunos con is_hidden=true. Los últimos
// 10 traen `lastAdminAction` poblado para demoar el chain.
function adminVendorsFixtures() {
  const items = [];
  for (let i = 0; i < 30; i += 1) {
    const status: 'pending' | 'approved' | 'rejected' =
      i < 10 ? 'pending' : i < 22 ? 'approved' : 'rejected';
    const isHidden = status === 'approved' && i % 5 === 0;
    const isModerated = status !== 'pending' || i >= 20;
    const idSuffix = String(i + 1).padStart(3, '0');
    items.push({
      id: `00000000-0000-0000-0074-${idSuffix}00000001`,
      businessName: `Vendor Demo ${i + 1}`,
      slug: `vendor-demo-${i + 1}`,
      status,
      isHidden,
      createdAt: new Date(2026, 5, 20 - (i % 20), 12, 0, 0).toISOString(),
      owner: {
        userId: `00000000-0000-0000-0074-owner${idSuffix}`,
        email: `owner-${i + 1}@eventflow.test`,
      },
      lastAdminAction: isModerated
        ? {
            action: status === 'rejected' ? 'reject' : status === 'approved' ? 'approve' : 'hide',
            reason:
              status === 'pending'
                ? null
                : 'Acción admin demo (msw fixture).',
            adminId: '00000000-0000-0000-0074-adminuser001',
            createdAt: new Date(2026, 5, 22, 12, 0, 0).toISOString(),
          }
        : null,
    });
  }
  return items;
}
