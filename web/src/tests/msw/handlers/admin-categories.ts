// MSW handlers — admin service categories (US-075).
//
// Cobertura:
//   - GET    /api/v1/admin/service-categories                       → 200 con {tree, flat}
//   - POST   /api/v1/admin/service-categories                       → 201 + 409 (INVALID_HIERARCHY_DEPTH, DUPLICATE_CODE) + 400
//   - PATCH  /api/v1/admin/service-categories/:id                   → 200 + 404 + 409
//   - DELETE /api/v1/admin/service-categories/:id                   → 200 + 400/404/409
//   - GET    /api/v1/service-categories                             → 200 público (solo activas)
//
// UUIDs "mágicos" para disparar códigos de error deterministas desde los tests:
//   - `...401` → 401
//   - `...403` → 403
//   - `...404` → 404
//   - `...409a` → 409 INVALID_HIERARCHY_DEPTH (en PATCH)
//   - `...409b` → 409 CATEGORY_IN_USE (en DELETE)
//   - `...409c` → 409 CATEGORY_HAS_CHILDREN (en DELETE)
import { http, HttpResponse } from 'msw';

const CORRELATION = '00000000-0000-0000-0000-msw000000075';

const CATEGORY_UNAUTH = 'ffffffff-0000-0000-0075-000000000401';
const CATEGORY_FORBIDDEN = 'ffffffff-0000-0000-0075-000000000403';
const CATEGORY_NOT_FOUND = 'ffffffff-0000-0000-0075-000000000404';
const CATEGORY_INVALID_HIERARCHY = 'ffffffff-0000-0000-0075-00000000409a';
const CATEGORY_IN_USE = 'ffffffff-0000-0000-0075-00000000409b';
const CATEGORY_HAS_CHILDREN = 'ffffffff-0000-0000-0075-00000000409c';

export const adminCategoriesMswTriggers = {
  UNAUTH: CATEGORY_UNAUTH,
  FORBIDDEN: CATEGORY_FORBIDDEN,
  NOT_FOUND: CATEGORY_NOT_FOUND,
  INVALID_HIERARCHY: CATEGORY_INVALID_HIERARCHY,
  IN_USE: CATEGORY_IN_USE,
  HAS_CHILDREN: CATEGORY_HAS_CHILDREN,
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

interface CatNode {
  id: string;
  code: string;
  label: string;
  description: string | null;
  name_i18n: Record<string, string>;
  description_i18n: Record<string, string> | null;
  parent_id: string | null;
  sort_order: number;
  depth_level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TreeNode extends CatNode {
  children: TreeNode[];
}

const NOW = '2026-07-20T00:00:00.000Z';

function makeCat(overrides: Partial<CatNode> & { id: string; code: string; label: string }): CatNode {
  return {
    id: overrides.id,
    code: overrides.code,
    label: overrides.label,
    description: overrides.description ?? null,
    name_i18n: overrides.name_i18n ?? { 'es-LATAM': overrides.label },
    description_i18n: overrides.description_i18n ?? null,
    parent_id: overrides.parent_id ?? null,
    sort_order: overrides.sort_order ?? 0,
    depth_level: overrides.depth_level ?? (overrides.parent_id ? 2 : 1),
    is_active: overrides.is_active ?? true,
    created_at: overrides.created_at ?? NOW,
    updated_at: overrides.updated_at ?? NOW,
  };
}

const CATERING = makeCat({
  id: 'aaaaaaaa-0000-0000-0075-000000000001',
  code: 'catering',
  label: 'Banquetes y Catering',
  sort_order: 10,
});
const MUSIC = makeCat({
  id: 'aaaaaaaa-0000-0000-0075-000000000002',
  code: 'music',
  label: 'Música',
  sort_order: 20,
});
const MARIMBA = makeCat({
  id: 'aaaaaaaa-0000-0000-0075-000000000003',
  code: 'marimba',
  label: 'Marimba',
  parent_id: MUSIC.id,
  depth_level: 2,
  sort_order: 10,
});
const INACTIVE_LEGACY = makeCat({
  id: 'aaaaaaaa-0000-0000-0075-000000000099',
  code: 'legacy-inactive',
  label: 'Legacy (inactiva)',
  is_active: false,
  sort_order: 999,
});

const FIXTURES: CatNode[] = [CATERING, MUSIC, MARIMBA, INACTIVE_LEGACY];

function buildTree(flat: CatNode[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  for (const c of flat) byId.set(c.id, { ...c, children: [] });
  const roots: TreeNode[] = [];
  for (const c of flat) {
    const node = byId.get(c.id)!;
    if (c.parent_id === null) roots.push(node);
    else {
      const p = byId.get(c.parent_id);
      if (p) p.children.push(node);
    }
  }
  return roots;
}

export const adminCategoriesHandlers = [
  // ── Admin listing ──────────────────────────────────────────────────────
  http.get('*/api/v1/admin/service-categories', () => {
    return HttpResponse.json(
      envelope({ tree: buildTree(FIXTURES), flat: FIXTURES }),
      { status: 200 },
    );
  }),

  // ── Public listing (activas) ────────────────────────────────────────────
  http.get('*/api/v1/service-categories', () => {
    const activeOnly = FIXTURES.filter((c) => c.is_active);
    return HttpResponse.json(
      envelope({ tree: buildTree(activeOnly), flat: activeOnly }),
      { status: 200 },
    );
  }),

  // ── Create ─────────────────────────────────────────────────────────────
  http.post('*/api/v1/admin/service-categories', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const code = String(body.code ?? '');
    if (!code) return HttpResponse.json(errorEnvelope('VALIDATION_ERROR', 'code required'), { status: 400 });
    if (code === '__duplicate__') {
      return HttpResponse.json(errorEnvelope('DUPLICATE_CODE', 'code exists'), { status: 409 });
    }
    if (code === '__invalid_parent__') {
      return HttpResponse.json(errorEnvelope('INVALID_PARENT_ID', 'parent not found'), { status: 400 });
    }
    if (code === '__depth__') {
      return HttpResponse.json(errorEnvelope('INVALID_HIERARCHY_DEPTH', 'max depth 2'), { status: 409 });
    }
    const nameI18n = (body.name_i18n ?? {}) as Record<string, string>;
    if (typeof nameI18n['es-LATAM'] !== 'string' || nameI18n['es-LATAM'].trim() === '') {
      return HttpResponse.json(
        errorEnvelope('INVALID_NAME_I18N', "name_i18n['es-LATAM'] required"),
        { status: 400 },
      );
    }
    const created = makeCat({
      id: 'bbbbbbbb-0000-0000-0075-000000000001',
      code,
      label: nameI18n['es-LATAM']!,
      name_i18n: nameI18n,
      parent_id: (body.parent_id as string | null | undefined) ?? null,
      sort_order: typeof body.sort_order === 'number' ? body.sort_order : 0,
    });
    return HttpResponse.json(envelope(created), { status: 201 });
  }),

  // ── Update ─────────────────────────────────────────────────────────────
  http.patch('*/api/v1/admin/service-categories/:id', async ({ params, request }) => {
    const id = String(params.id ?? '');
    if (!UUID_RE.test(id)) return HttpResponse.json(errorEnvelope('VALIDATION_ERROR', 'invalid uuid'), { status: 400 });
    if (id === CATEGORY_UNAUTH) return HttpResponse.json(errorEnvelope('AUTHENTICATION_REQUIRED', ''), { status: 401 });
    if (id === CATEGORY_FORBIDDEN) return HttpResponse.json(errorEnvelope('FORBIDDEN', ''), { status: 403 });
    if (id === CATEGORY_NOT_FOUND) {
      return HttpResponse.json(errorEnvelope('SERVICE_CATEGORY_NOT_FOUND', 'not found'), { status: 404 });
    }
    if (id === CATEGORY_INVALID_HIERARCHY) {
      return HttpResponse.json(errorEnvelope('INVALID_HIERARCHY_DEPTH', 'max depth 2'), { status: 409 });
    }
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const base = FIXTURES.find((c) => c.id === id) ?? MUSIC;
    const updated: CatNode = {
      ...base,
      id,
      updated_at: NOW,
      is_active: typeof body.is_active === 'boolean' ? body.is_active : base.is_active,
      sort_order: typeof body.sort_order === 'number' ? body.sort_order : base.sort_order,
      name_i18n: (body.name_i18n as Record<string, string> | undefined) ?? base.name_i18n,
      description_i18n:
        (body.description_i18n as Record<string, string> | undefined) ?? base.description_i18n,
      parent_id: body.parent_id === undefined ? base.parent_id : (body.parent_id as string | null),
    };
    return HttpResponse.json(envelope(updated), { status: 200 });
  }),

  // ── Soft delete ────────────────────────────────────────────────────────
  http.delete('*/api/v1/admin/service-categories/:id', async ({ params, request }) => {
    const id = String(params.id ?? '');
    if (!UUID_RE.test(id)) return HttpResponse.json(errorEnvelope('VALIDATION_ERROR', 'invalid uuid'), { status: 400 });
    if (id === CATEGORY_UNAUTH) return HttpResponse.json(errorEnvelope('AUTHENTICATION_REQUIRED', ''), { status: 401 });
    if (id === CATEGORY_FORBIDDEN) return HttpResponse.json(errorEnvelope('FORBIDDEN', ''), { status: 403 });
    if (id === CATEGORY_NOT_FOUND) {
      return HttpResponse.json(errorEnvelope('SERVICE_CATEGORY_NOT_FOUND', 'not found'), { status: 404 });
    }
    if (id === CATEGORY_IN_USE) {
      return HttpResponse.json(
        errorEnvelope('CATEGORY_IN_USE', 'in use', [{ field: 'usage_count', message: '3' }]),
        { status: 409 },
      );
    }
    if (id === CATEGORY_HAS_CHILDREN) {
      return HttpResponse.json(
        errorEnvelope('CATEGORY_HAS_CHILDREN', 'has children', [
          { field: 'children_count', message: '2' },
        ]),
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
    const base = FIXTURES.find((c) => c.id === id) ?? MUSIC;
    return HttpResponse.json(envelope({ ...base, id, is_active: false, updated_at: NOW }), {
      status: 200,
    });
  }),
];
