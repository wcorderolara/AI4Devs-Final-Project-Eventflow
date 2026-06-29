# Technical Specification — US-045: Buscar proveedores en directorio (autenticado)

## 1. Metadata

| Field                                | Value                                                                                                          |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| User Story ID                        | US-045                                                                                                         |
| Source User Story                    | `management/user-stories/US-045-search-vendors.md`                                                             |
| Decision Resolution Artifact         | `management/user-stories/decision-resolutions/US-045-decision-resolution.md`                                   |
| Priority                             | P1                                                                                                             |
| Backlog ID                           | PB-P1-028                                                                                                      |
| Backlog Title                        | Búsqueda de directorio de proveedores (organizer)                                                              |
| Backlog Execution Order              | 47                                                                                                              |
| User Story Position in Backlog Item  | 1 de 1                                                                                                          |
| Related User Stories in Backlog Item | US-045                                                                                                         |
| Epic                                 | EPIC-VND-001                                                                                                   |
| Backlog Item Dependencies            | PB-P1-024 (US-040), PB-P1-027 (US-044), US-047, PB-P0-001 (schema)                                              |
| Feature                              | Búsqueda autenticada con cursor pagination                                                                      |
| Module / Domain                      | Vendors                                                                                                        |
| User Story Status                    | Approved with Minor Notes                                                                                     |
| Backlog Alignment Status             | Found                                                                                                          |
| Technical Spec Status                | Ready for Task Breakdown                                                                                       |
| Created Date                         | 2026-06-27                                                                                                     |
| Last Updated                         | 2026-06-27                                                                                                     |

---

## 2. Backlog Execution Context

PB-P1-028 single-story. Execution order 47. Depende de US-040 (vendors), US-044 (servicios para filtro de precio), US-047 (approval para que existan `approved`).

| User Story | Role in Backlog Item                          | Suggested Order |
| ---------- | --------------------------------------------- | --------------- |
| US-045     | Búsqueda autenticada.                          | 1               |

---

## 3. Executive Technical Summary

US-045 introduce `SearchVendorsUseCase` y `GET /api/v1/vendors`. La pipeline:

1. Auth middleware (cualquier rol).
2. Zod query schema con refine cross-field (currency required with price, `priceMin <= priceMax`).
3. Resolver slugs (`categoryCode` → ID, `locationCode` → ID) — fallo ⇒ `400 INVALID_FILTERS`.
4. Decodificar `cursor` si presente (base64 → `{ created_at, id }`) — fallo ⇒ `400 INVALID_CURSOR`.
5. Construir query Prisma (raw o builder) con:
   - `WHERE vp.status='approved' AND vp.deleted_at IS NULL`
   - `EXISTS` para `vendor_profile_categories` si `categoryCode`
   - `vp.location_id = ?` si `locationCode`
   - `EXISTS` para `vendor_services` activos en rango si `priceMin`/`priceMax`
   - Excluir self si vendor (`vp.vendor_user_id != currentUser.id`)
   - Cursor predicate: `(rating_avg, created_at, id) < (?, ?, ?)` (keyset pagination)
   - `ORDER BY rating_avg DESC NULLS LAST, created_at DESC, id DESC`
   - `LIMIT (limit + 1)` para detectar `hasNext`.
6. Encode cursor del último item si `hasNext=true`.
7. Mapear a response shape.

Sin migraciones. Reuso del schema PB-P0-001. Considerar índice compuesto adicional `(status, rating_avg, created_at, id) WHERE deleted_at IS NULL` para keyset.

---

## 4. Scope Boundary

### In Scope

- `SearchVendorsUseCase`.
- DTO Zod query schema.
- Helper `encodeCursor/decodeCursor`.
- Repository extension (`searchApprovedVendors`).
- Controller + ruta.
- Frontend: page + filtros + grid + infinite scroll.
- i18n 4 locales.
- Tests.
- Documentación.

### Out of Scope

- Cache.
- Full-text avanzado.
- Búsqueda geoespacial.
- Conversión de moneda.
- Sugerencias.
- US-046 (pública).

### Explicit Non-Goals

- No insertar `AdminAction`.
- No emitir logs custom más allá del `correlation_id` heredado.

---

## 5. Architecture Alignment

### Backend

Reuso del stack. Query Prisma (puede ser `$queryRaw` para keyset pagination eficiente o builder con `cursor`).

### Frontend

TanStack `useInfiniteQuery` + filtros con URL state (Next.js `useSearchParams`).

### Database

Considerar índice compuesto adicional para keyset; verificar en DB-001.

### API

REST JSON. Query params slug-based. Response shape estable.

### AI / PromptOps

No aplica.

### Security

Auth requerido. Vendor exclusion en service layer.

### Testing

Vitest + Supertest + RTL + Playwright opcional + performance smoke.

---

## 6. Functional Interpretation

| Acceptance Criterion       | Technical Interpretation                                                                          | Impacted Layer(s) |
| -------------------------- | ------------------------------------------------------------------------------------------------- | ----------------- |
| AC-01 búsqueda combinada    | `SearchVendorsUseCase` con joins + EXISTS + keyset pagination.                                    | BE, DB            |
| AC-02 cursor next            | Cursor opaque + keyset predicate.                                                                  | BE                |
| AC-03 empty state           | `items=[]`, `hasNext=false`, `cursor=null`.                                                       | BE, FE            |
| AC-04 auth                   | Auth middleware.                                                                                   | BE                |
| EC-01..EC-05                 | Validación Zod + decodificación cursor + strict.                                                  | BE                |
| AUTH-TS-01..04              | Guards + matriz.                                                                                  | BE                |
| A11Y                       | Labels semánticos, `aria-busy`.                                                                    | FE                |
| i18n 4 locales              | `directory.*`.                                                                                    | FE                |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

`modules/vendors` (extensión con sub-feature `search`).

### Use Cases / Application Services

**`SearchVendorsUseCase`**

```ts
async execute({ currentUser, query }) {
  const filters = await this.resolveFilters(query); // slugs → IDs
  const cursor = query.cursor ? decodeCursor(query.cursor) : null;
  const rows = await this.repository.searchApprovedVendors({
    filters,
    cursor,
    limit: query.limit + 1, // detect hasNext
    excludeUserId: currentUser.role === 'vendor' ? currentUser.id : null,
  });
  const hasNext = rows.length > query.limit;
  const items = rows.slice(0, query.limit);
  const lastItem = items[items.length - 1];
  return {
    items: items.map(this.mapToCard),
    page: {
      cursor: hasNext ? encodeCursor({ created_at: lastItem.createdAt, id: lastItem.id }) : null,
      limit: query.limit,
      hasNext,
    },
  };
}
```

### Controllers / Routes

```ts
router.get(
  '/vendors',
  authenticatedGuard,
  asyncHandler(controller.search.bind(controller))
);
```

### DTOs / Schemas

```ts
export const searchVendorsQuery = z.object({
  categoryCode: z.string().min(1).max(64).optional(),
  locationCode: z.string().min(1).max(64).optional(),
  priceMin: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  priceMax: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  currency: z.enum(CURRENCY_CODES).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
}).strict().refine(
  q => !(q.priceMin && parseFloat(q.priceMin) > parseFloat(q.priceMax ?? Infinity.toString())),
  { message: 'priceMin > priceMax', path: ['priceMin'] }
).refine(
  q => !((q.priceMin || q.priceMax) && !q.currency),
  { message: 'currency_required_with_price', path: ['currency'] }
);
```

### Repository / Persistence

`VendorSearchRepository.searchApprovedVendors({ filters, cursor, limit, excludeUserId })`. Implementación con `$queryRaw` o builder. Selecciona columnas mínimas para el card + `priceRange` (subquery agg).

### Cursor Helper

```ts
export function encodeCursor(payload: { created_at: Date; id: string }): string {
  return Buffer.from(JSON.stringify({ c: payload.created_at.toISOString(), i: payload.id })).toString('base64url');
}

export function decodeCursor(token: string): { created_at: Date; id: string } | null {
  try {
    const obj = JSON.parse(Buffer.from(token, 'base64url').toString('utf-8'));
    if (!obj.c || !obj.i) throw new Error();
    return { created_at: new Date(obj.c), id: String(obj.i) };
  } catch {
    return null;
  }
}
```

### Validation Rules

Ver §VR-01..VR-06.

### Error Handling

`400 INVALID_FILTERS`, `400 INVALID_CURSOR`, `401`, `403` (improbable; cualquier rol válido).

### Transactions

No requeridas.

### Observability

Sólo `correlation_id` heredado. Sin eventos custom.

---

## 8. Frontend Technical Design

### Routes / Pages

- `app/[locale]/organizer/vendors/page.tsx`.

### Components

- `VendorSearch` (orquesta).
- `VendorFilters` (con URL state).
- `VendorCard`.
- "Cargar más" con `useInfiniteQuery`.

### Forms

RHF para `priceMin`/`priceMax`/`currency`; selects para `categoryCode`/`locationCode`.

### State Management

`useInfiniteQuery` keyed por filtros normalizados.

### Data Fetching

`vendorsApi.search(...)`.

### Loading / Empty / Error / Success States

- Loading: skeleton de cards.
- Empty: mensaje i18n + CTA "Limpiar filtros".
- Error: banner i18n.
- Success: grid + "Cargar más" si `hasNext`.

### Accessibility

Filtros con labels; cards con `aria-labelledby`; "Cargar más" con `aria-busy`.

### i18n

`directory.*` en 4 locales.

---

## 9. API Contract Design

| Method | Endpoint            | Purpose                       | Auth Required | Request                                                                  | Response                                                                                              | Error Cases                                                                                |
| ------ | ------------------- | ----------------------------- | ------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| GET    | `/api/v1/vendors`   | Buscar vendors approved.       | Sí            | Query params (§9 US).                                                    | `200 { items: [...], page: { cursor, limit, hasNext } }`.                                            | `400 INVALID_FILTERS`, `400 INVALID_CURSOR`, `401`.                                         |

---

## 10. Database / Prisma Design

### Models Impacted

`VendorProfile` (read), `VendorService` (read), `ServiceCategory` (read), `Location` (read).

### Fields / Columns

Sin nuevos.

### Relations

Reuso.

### Indexes

Existentes:
- `idx_vendor_profiles_status_location (status, location_id) WHERE status='approved'`.
- `idx_vendor_services_active (vendor_profile_id) WHERE is_active=true`.

Considerar nuevo (DB-001 decide):
- `idx_vendor_profiles_directory (rating_avg DESC NULLS LAST, created_at DESC, id DESC) WHERE status='approved' AND deleted_at IS NULL` para keyset.

### Constraints

Sin nuevos.

### Migrations Impact

Posible 1 migración menor si DB-001 decide agregar índice compuesto.

### Seed Impact

Reuso de US-040+044. Verificar que el seed produce ≥ 10 vendors aprobados en diferentes ciudades/categorías/precios para demo.

---

## 11. AI / PromptOps Design

No aplica.

---

## 12. Security & Authorization Design

### Authentication

HTTP-only cookie.

### Authorization

`authenticatedGuard` (todos los roles autenticados).

### Ownership Rules

Vendor exclusion en service layer.

### Role Rules

Cualquier rol válido.

### Negative Authorization Scenarios

Ver §SEC.

### Audit Requirements

N/A.

### Sensitive Data Handling

N/A.

---

## 13. Testing Strategy

### Unit Tests

- DTO Zod (refines cross-field).
- Cursor encode/decode.
- Use case branches.

### Integration Tests

- TS-01..TS-07.
- NT-01..NT-07.
- Vendor exclusion.
- Visibilidad por status (hidden, pending, rejected, soft-deleted no aparecen).

### API Tests

Supertest cubriendo todos los códigos.

### E2E Tests

Playwright para flujo completo (filtros + cargar más + empty state).

### Security Tests

- Sin sesión → 401.
- Visibilidad por status.

### Accessibility Tests

- Filtros con labels.
- `aria-busy` en cargar más.

### AI Tests

No aplica.

### Seed / Demo Tests

Verificar que demo cubre ≥ 10 vendors variados.

### CI Checks

Lint + Vitest + Supertest. Considerar smoke de performance.

### Performance Tests

Verificar `< 1s p95` con seed completo (NFR-PERF-001). Smoke test con N=1000.

---

## 14. Observability & Audit

### Logs

Sólo log estándar de request + `correlation_id`. Sin eventos custom.

### Correlation ID

Heredado.

### AdminAction

N/A.

### Error Tracking

Heredado.

### Metrics

Considerar contar tiempo de query (request_duration_seconds bucket vendor_search).

---

## 15. Seed / Demo Data Impact

Verificar que el seed produce ≥ 10 vendors aprobados con cobertura de categorías y ciudades distintas para demo de filtros.

---

## 16. Documentation Alignment Required

| Document / Source            | Conflict                                                              | Current Decision                              | Recommended Action                                          | Blocks Implementation? |
| ---------------------------- | --------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------- | ---------------------- |
| `docs/16 §M07`               | Falta documentar `GET /api/v1/vendors`.                                | Documentar.                                    | Actualizar `docs/16`.                                       | No                     |
| PB-P1-028 Traceability       | El backlog item cita IDs incorrectos.                                  | Trazabilidad real en US.                       | Housekeeping del backlog item.                              | No                     |

---

## 17. Technical Risks & Mitigations

| Risk                                                            | Impact                | Mitigation                                              |
| --------------------------------------------------------------- | --------------------- | ------------------------------------------------------- |
| N+1 al cargar `priceRange` por vendor.                           | Performance degradation. | Subquery agg en el SELECT principal o LATERAL join.   |
| Cursor inconsistente si `rating_avg` cambia entre páginas.       | Duplicados/saltos.    | Snapshot in cursor del orden completo (3 fields). Aceptable inconsistencia mínima en MVP. |
| Keyset slow sin índice.                                          | `> 1s` p95.            | DB-001 decide agregar índice compuesto.                  |
| Inyección SQL via cursor.                                        | RCE / data leak.       | Decode estricto + validación de tipos antes de usar.    |

---

## 18. Implementation Guidance for Coding Agents

### Archivos impactados

**Backend**:
- `src/modules/vendors/dto/search-vendors.query.ts`
- `src/modules/vendors/use-cases/search-vendors.use-case.ts`
- `src/modules/vendors/repositories/vendor-search.repository.ts`
- `src/modules/vendors/controllers/vendor-search.controller.ts`
- `src/modules/vendors/routes/vendor-search.routes.ts`
- `src/modules/vendors/helpers/cursor.ts`

**Frontend**:
- `app/[locale]/organizer/vendors/page.tsx`
- `components/directory/VendorSearch.tsx`
- `components/directory/VendorFilters.tsx`
- `components/directory/VendorCard.tsx`
- `lib/api/vendorsApi.ts` (extender con `search`)
- `messages/{es-LATAM,es-ES,pt,en}.json`

### Orden sugerido

1. DB-001.
2. Cursor helper + UT.
3. DTO Zod + UT.
4. Repository + UT.
5. Use case + UT.
6. Controller + ruta.
7. Frontend page + filtros + grid + i18n.
8. Tests + performance smoke.
9. Documentación.

### Decisiones que no deben reabrirse

D1–D8.

### Qué no implementar

- Cache, full-text, geoespacial, conversión moneda, sugerencias, sort override.

### Assumptions to preserve

- Schema entregado por PB-P0-001.
- Vendor exclusion en service layer.

---

## 19. Task Generation Notes

| Grupo | Tasks |
| ----- | ----: |
| DB    | 1 (verificación + posible índice) |
| BE    | 6 (cursor helper, DTO, repository, use case, controller + ruta, refactor query) |
| FE    | 4 (page, filtros, grid + cargar más, i18n) |
| QA    | 5 (UT, IT, AUTH, Performance, A11Y) |
| DOC   | 1 (docs/16) |

**Total estimado ~17 tareas.**

### Required QA tasks

- UT + IT + AUTH + Performance smoke + A11Y.

### Required security tasks

- AUTH matrix + visibilidad por status.

### Required seed/demo tasks

- Verificación (reuso).

### Required documentation tasks

- `docs/16 §M07`.

### Dependencies between tasks

- DB → BE → FE → QA.

### Backlog consolidated `tasks.md`

Single-story.

---

## 20. Technical Spec Readiness

| Check                                                       | Status |
| ----------------------------------------------------------- | ------ |
| User Story approved or explicitly allowed for draft spec    | Pass   |
| Product Backlog mapping found                                | Pass   |
| Decision Resolution reviewed if present                      | Pass   |
| Scope clear                                                  | Pass   |
| Architecture alignment clear                                 | Pass   |
| API impact clear                                             | Pass   |
| DB impact clear                                              | Pass   |
| AI impact clear                                              | N/A    |
| Security impact clear                                        | Pass   |
| Testing strategy clear                                       | Pass   |
| Ready for Development Task Breakdown                         | Yes    |

---

## 21. Final Recommendation

`Ready for Task Breakdown`.

US-045 cierra `PB-P1-028` con un `SearchVendorsUseCase` con keyset pagination + EXISTS subqueries + filtros slug-based. Sin migraciones nuevas obligatorias (1 índice compuesto opcional). 1 acción documental no bloqueante.
