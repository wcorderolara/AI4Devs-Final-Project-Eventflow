// MSW handlers — admin event types (US-076).
//
// Cobertura:
//   - GET    /api/v1/admin/event-types                          → 200 con EventTypeView[]
//   - POST   /api/v1/admin/event-types                          → 201 + 409 (DUPLICATE_CODE) + 400 (INVALID_NAME_I18N)
//   - PATCH  /api/v1/admin/event-types/:id                      → 200 + 401/403/404
//   - DELETE /api/v1/admin/event-types/:id                      → 200 + 400/401/403/404/409 (EVENT_TYPE_IN_USE)
//   - GET    /api/v1/event-types                                → 200 público (solo activas)
//
// UUIDs "mágicos" para disparar códigos de error deterministas desde los tests:
//   - `...401` → 401
//   - `...403` → 403
//   - `...404` → 404
//   - `...409` → 409 EVENT_TYPE_IN_USE (en DELETE)
import { http, HttpResponse } from 'msw';

const CORRELATION = '00000000-0000-0000-0000-msw000000076';

const ET_UNAUTH = 'ffffffff-0000-0000-0076-000000000401';
const ET_FORBIDDEN = 'ffffffff-0000-0000-0076-000000000403';
const ET_NOT_FOUND = 'ffffffff-0000-0000-0076-000000000404';
const ET_IN_USE = 'ffffffff-0000-0000-0076-000000000409';

export const adminEventTypesMswTriggers = {
  UNAUTH: ET_UNAUTH,
  FORBIDDEN: ET_FORBIDDEN,
  NOT_FOUND: ET_NOT_FOUND,
  IN_USE: ET_IN_USE,
} as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function envelope<T>(data: T): { data: T; correlationId: string } {
  return { data, correlationId: CORRELATION };
}

function errorEnvelope(code: string, message: string, details?: unknown) {
  const error: { code: string; message: string; correlationId: string; details?: unknown } = {
    code,
    message,
    correlationId: CORRELATION,
  };
  if (details !== undefined) error.details = details;
  return { error };
}

interface EtNode {
  id: string;
  code: string;
  label: string;
  description: string | null;
  name_i18n: Record<string, string>;
  description_i18n: Record<string, string> | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const NOW = '2026-07-20T00:00:00.000Z';

function makeEt(overrides: Partial<EtNode> & { id: string; code: string; label: string }): EtNode {
  return {
    id: overrides.id,
    code: overrides.code,
    label: overrides.label,
    description: overrides.description ?? null,
    name_i18n: overrides.name_i18n ?? { 'es-LATAM': overrides.label },
    description_i18n: overrides.description_i18n ?? null,
    sort_order: overrides.sort_order ?? 0,
    is_active: overrides.is_active ?? true,
    created_at: overrides.created_at ?? NOW,
    updated_at: overrides.updated_at ?? NOW,
  };
}

const WEDDING = makeEt({ id: 'aaaaaaaa-0000-0000-0076-000000000001', code: 'wedding', label: 'Boda', sort_order: 10 });
const XV = makeEt({ id: 'aaaaaaaa-0000-0000-0076-000000000002', code: 'xv', label: 'XV Años', sort_order: 20 });
const BAPTISM = makeEt({ id: 'aaaaaaaa-0000-0000-0076-000000000003', code: 'baptism', label: 'Bautizo', sort_order: 30 });
const INACTIVE_LEGACY = makeEt({
  id: 'aaaaaaaa-0000-0000-0076-000000000099',
  code: 'legacy-inactive',
  label: 'Legacy (inactivo)',
  is_active: false,
  sort_order: 999,
});

const FIXTURES: EtNode[] = [WEDDING, XV, BAPTISM, INACTIVE_LEGACY];

export const adminEventTypesHandlers = [
  // ── Admin listing ──────────────────────────────────────────────────────
  http.get('*/api/v1/admin/event-types', () => {
    return HttpResponse.json(envelope(FIXTURES), { status: 200 });
  }),

  // NOTA: `GET /api/v1/event-types` (público) NO se mockea aquí. Ese path lo mockea
  // `eventsHandlers` (US-009 legacy) con `eventTypesFixture` (6 items) — el shape
  // `{code, label}` sigue siendo válido porque `EventTypeView` es un superset y los
  // callers solo proyectan esos dos campos.


  // ── Create ─────────────────────────────────────────────────────────────
  http.post('*/api/v1/admin/event-types', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const code = String(body.code ?? '');
    if (!code) return HttpResponse.json(errorEnvelope('VALIDATION_ERROR', 'code required'), { status: 400 });
    if (code === '__duplicate__') {
      return HttpResponse.json(errorEnvelope('DUPLICATE_CODE', 'code exists'), { status: 409 });
    }
    const nameI18n = (body.name_i18n ?? {}) as Record<string, string>;
    if (typeof nameI18n['es-LATAM'] !== 'string' || nameI18n['es-LATAM'].trim() === '') {
      return HttpResponse.json(
        errorEnvelope('INVALID_NAME_I18N', "name_i18n['es-LATAM'] required"),
        { status: 400 },
      );
    }
    const created = makeEt({
      id: 'bbbbbbbb-0000-0000-0076-000000000001',
      code,
      label: nameI18n['es-LATAM']!,
      name_i18n: nameI18n,
      sort_order: typeof body.sort_order === 'number' ? body.sort_order : 0,
    });
    return HttpResponse.json(envelope(created), { status: 201 });
  }),

  // ── Update ─────────────────────────────────────────────────────────────
  http.patch('*/api/v1/admin/event-types/:id', async ({ params, request }) => {
    const id = String(params.id ?? '');
    if (!UUID_RE.test(id)) return HttpResponse.json(errorEnvelope('VALIDATION_ERROR', 'invalid uuid'), { status: 400 });
    if (id === ET_UNAUTH) return HttpResponse.json(errorEnvelope('AUTHENTICATION_REQUIRED', ''), { status: 401 });
    if (id === ET_FORBIDDEN) return HttpResponse.json(errorEnvelope('FORBIDDEN', ''), { status: 403 });
    if (id === ET_NOT_FOUND) {
      return HttpResponse.json(errorEnvelope('EVENT_TYPE_NOT_FOUND', 'not found'), { status: 404 });
    }
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const base = FIXTURES.find((c) => c.id === id) ?? WEDDING;
    const updated: EtNode = {
      ...base,
      id,
      updated_at: NOW,
      is_active: typeof body.is_active === 'boolean' ? body.is_active : base.is_active,
      sort_order: typeof body.sort_order === 'number' ? body.sort_order : base.sort_order,
      name_i18n: (body.name_i18n as Record<string, string> | undefined) ?? base.name_i18n,
      description_i18n:
        (body.description_i18n as Record<string, string> | undefined) ?? base.description_i18n,
    };
    return HttpResponse.json(envelope(updated), { status: 200 });
  }),

  // ── Soft delete ────────────────────────────────────────────────────────
  http.delete('*/api/v1/admin/event-types/:id', async ({ params, request }) => {
    const id = String(params.id ?? '');
    if (!UUID_RE.test(id)) return HttpResponse.json(errorEnvelope('VALIDATION_ERROR', 'invalid uuid'), { status: 400 });
    if (id === ET_UNAUTH) return HttpResponse.json(errorEnvelope('AUTHENTICATION_REQUIRED', ''), { status: 401 });
    if (id === ET_FORBIDDEN) return HttpResponse.json(errorEnvelope('FORBIDDEN', ''), { status: 403 });
    if (id === ET_NOT_FOUND) {
      return HttpResponse.json(errorEnvelope('EVENT_TYPE_NOT_FOUND', 'not found'), { status: 404 });
    }
    if (id === ET_IN_USE) {
      return HttpResponse.json(
        errorEnvelope('EVENT_TYPE_IN_USE', 'in use', [{ field: 'usage_count', message: '5' }]),
        { status: 409 },
      );
    }
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const reason = body.reason;
    if (typeof reason !== 'string' || reason.length === 0) {
      return HttpResponse.json(errorEnvelope('REASON_REQUIRED', 'reason required'), { status: 400 });
    }
    if (reason.length < 10 || reason.length > 500) {
      return HttpResponse.json(errorEnvelope('INVALID_REASON_LENGTH', 'invalid length'), { status: 400 });
    }
    const base = FIXTURES.find((c) => c.id === id) ?? WEDDING;
    return HttpResponse.json(envelope({ ...base, id, is_active: false, updated_at: NOW }), {
      status: 200,
    });
  }),
];
