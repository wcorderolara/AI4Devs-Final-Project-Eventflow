// US-080 (PB-P1-046) / FE-005 — MSW handlers para el visor admin del audit log.
// Cobertura:
//   - GET /api/v1/admin/admin-actions           → 200 con fixture determinista.
//   - GET /api/v1/admin/admin-actions?cursor=X  → 400 INVALID_CURSOR cuando `X === 'invalid'`.
//   - POST/PATCH/DELETE /api/v1/admin/admin-actions[/**]
//                                               → 404 NOT_FOUND (AC-03 inmutabilidad; el
//                                                 backend real no registra esas rutas).
import { http, HttpResponse } from 'msw';

const CORRELATION = '00000000-0000-0000-0000-msw000000080';

const ADMIN_ID = '11111111-1111-1111-1111-111111111111';
const REVIEW_TARGET = '22222222-2222-2222-2222-222222222222';
const VENDOR_TARGET = '33333333-3333-3333-3333-333333333333';

export const adminActionsFixture = {
  items: [
    {
      id: 'aa000001-0000-0000-0000-000000000001',
      admin: { id: ADMIN_ID, businessName: 'Admin Demo', email: 'admin@eventflow.test' },
      target_type: 'review',
      target_id: REVIEW_TARGET,
      action: 'hide',
      reason: 'Contenido inapropiado',
      payload: { from_status: 'published', to_status: 'hidden', rating_snapshot: 1 },
      created_at: '2026-07-20T15:30:00.000Z',
    },
    {
      id: 'aa000002-0000-0000-0000-000000000002',
      admin: { id: ADMIN_ID, businessName: 'Admin Demo', email: 'admin@eventflow.test' },
      target_type: 'vendor_profile',
      target_id: VENDOR_TARGET,
      action: 'approve',
      reason: null,
      payload: { from_status: 'pending', to_status: 'approved' },
      created_at: '2026-07-20T14:00:00.000Z',
    },
  ],
  pagination: { nextCursor: null, pageSize: 25 },
} as const;

const invalidCursorResponse = () =>
  HttpResponse.json(
    {
      error: {
        code: 'INVALID_CURSOR',
        message: 'Invalid cursor',
        correlationId: CORRELATION,
      },
    },
    { status: 400 },
  );

const notFoundResponse = () =>
  HttpResponse.json(
    {
      error: {
        code: 'RESOURCE_NOT_FOUND',
        message: 'Not Found',
        correlationId: CORRELATION,
      },
    },
    { status: 404 },
  );

export const adminActionsHandlers = [
  http.get('*/api/v1/admin/admin-actions', ({ request }) => {
    const url = new URL(request.url);
    const cursor = url.searchParams.get('cursor');
    if (cursor === 'invalid') {
      return invalidCursorResponse();
    }
    return HttpResponse.json(
      { data: adminActionsFixture, meta: { correlationId: CORRELATION } },
      { status: 200 },
    );
  }),
  // AC-03: inmutabilidad — cualquier verbo de escritura ⇒ 404.
  http.post('*/api/v1/admin/admin-actions', notFoundResponse),
  http.post('*/api/v1/admin/admin-actions/*', notFoundResponse),
  http.patch('*/api/v1/admin/admin-actions/*', notFoundResponse),
  http.delete('*/api/v1/admin/admin-actions/*', notFoundResponse),
];
