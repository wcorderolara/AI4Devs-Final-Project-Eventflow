# Execution Record — PB-P1-041 / US-074: Admin Vendor Panel (listado global + UI panel + integración US-047)

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-074 |
| User Story Title | Panel admin de moderación de VendorProfiles (listado global con filtros) |
| Phase | P1 |
| Backlog Position | PB-P1-041 |
| User Story Path | management/user-stories/US-074-admin-approve-reject-vendor-extended.md |
| Tech Spec Path | management/technical-specs/P1/PB-P1-041/US-074-technical-spec.md |
| Tasks Path | management/development-tasks/P1/PB-P1-041/US-074-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Execution Record Status | Done |
| Readiness Status | READY |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P1-041 |
| Initial Commit Hash | 80e18db |
| Started At | 2026-07-20T13:35:00Z |
| Completed At | 2026-07-20T14:05:00Z |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] `validate-inputs.sh` OK — US-074 / P1 / PB-P1-041 coherentes.
- [x] User Story `Approved` (Approval Date 2026-06-29), Ready for Development Tasks = Yes.
- [x] Tech Spec `Ready for Task Breakdown`.
- [x] 16 tareas extraídas (1 DB + 4 BE + 5 FE + 5 QA + 1 DOC).

## 3. Readiness Gate

- Resultado: `READY`.
- Dependencias satisfechas:
  - US-047 (Done — endpoint `POST /admin/vendors/:id/moderate` + AdminAction chain + `is_hidden` columna operativa).
  - US-066/US-077 (Done — patrón cursor keyset base64 + mapper admin PII completa + hooks TanStack `useInfiniteQuery`).
  - US-067 (Done — `roleMiddleware(['admin'])` reusable como AdminGuard).
  - Migración de `is_hidden` + 4 columnas audit ya aplicadas (US-047 DB-002).

## 4. Alignment Gate

- Resultado: `ALIGNED_WITH_NOTES`.
- **Desviaciones documentadas**:
  - **DEV-01** — Ubicación del código admin: Tech Spec §18 sugiere `src/modules/admin/*`. Se coloca en `src/modules/admin-governance/*` (paridad con US-047 y US-016). El módulo `admin` genérico no existe; `admin-governance` es la ubicación canónica para endpoints admin.
  - **DEV-02** — Cursor helper intra-módulo (no cross-module import): Tech Spec §7 sugiere "reuso US-066 cursor utility". Por ADR-ARCH-001 (import boundaries), `admin-governance` no puede importar de `reviews-moderation`. Se crea `admin-vendors-cursor.ts` local con **shape idéntico** al de US-066/US-077 (base64url `{c: ISO, i: UUID}`) — la implementación es una duplicación intencional y trivial (~30 líneas) que preserva el contrato del cliente. La alternativa (mover el cursor a `shared`) queda como deuda técnica no bloqueante.
  - **DEV-03** — `Us074InvalidCursorError` como clase propia: se agrega un error de dominio scoped al módulo (mapea a `INVALID_CURSOR` reusando el código estable del catálogo). Paridad con `Us066InvalidCursorError` que también es intra-módulo.
  - **DEV-04** — `AdminVendorsQueryBaseSchema` sin refines para OpenAPI: `superRefine` produce `ZodEffects` que `zod-to-openapi` no acepta. Se exporta un schema base (`ZodObject`) sin refines y el schema completo (`AdminVendorsQuerySchema`) los añade — mismo criterio que US-077 `AdminReviewsQueryBaseSchema` (DEV-11 en US-047 record también).
  - **DEV-05** — `business_name` trim + colapso a undefined (EC-05): implementado como `.transform(v => v.trim()).transform(v => v.length === 0 ? undefined : v)` **antes** del `superRefine` que valida `> 100 chars`. Preserva la semántica de la User Story (whitespace-only equivale a "sin filtro") sin acumular cachés distintas por keys equivalentes en TanStack.
  - **DEV-06** — Filtro operativo por defecto (`status=['pending']`, Decisión PO D5): se aplica **client-side** en `VendorModerationTable` (`useState<AdminVendorListFilters>({ status: ['pending'] })`) antes del primer fetch. El backend permanece agnóstico — devuelve TODO cuando no se envía `status`. Esto permite que el usuario limpie el filtro con "Limpiar filtros" sin quedar atrapado en el default.
  - **DEV-07** — `useModerateVendor` invalida `['vendor-directory']` además del prefix `admin.vendors.*` y `public-vendor.detail.{slug}`. El directorio autenticado (US-045) también refleja los cambios de visibilidad — invalidar ese key garantiza que la UI del organizador vea la nueva selección sin recarga manual.
  - **DEV-08** — Debounce 300 ms sólo para `business_name`: los demás filtros se commitean en submit ("Aplicar") para preservar UX explícita y no invalidar la cache TanStack por cada checkbox toggle. La búsqueda por nombre es el único filtro donde tipear caracter por caracter tiene sentido semántico — el `useEffect` con `setTimeout(300ms)` es el patrón mínimo (sin librería externa `use-debounce`).
  - **DEV-09** — Regla `boundaries` extendida: `admin-governance` module ya tiene 2 archivos whitelisted por US-047 para importar `quote-flow/services`. Este trabajo NO necesita nuevas excepciones — sólo consume `AdminReviewsQueryBaseSchema` no; en su lugar creamos DTO/mapper propios (paridad con la estructura del módulo).
  - **DEV-10** — `owner.email` en la response admin: el Tech Spec §7 lo lista explícitamente en el Mapper (D4 PII completa). Se emite via `select: { user: { select: { id: true, email: true } } }` sin filtro adicional. El guard admin es la única frontera de autorización — el mapper no aplica anonimato (paridad con `admin-review.mapper.ts` de US-077).
  - **DEV-11** — QA-005 perf smoke: single-shot con 30 vendors sembrados en el mismo shard + filtros combinados < 500 ms. No equivale a p95 con concurrencia real; deuda documentada.

## 5. Task Inventory

| Task ID | Título | Status | Evidencia (resumen) |
| ------- | ------ | ------ | ------- |
| DB-001 | Verificar índices vendor_profiles | Done | `idx_vendor_profiles_status_hidden ON (status, is_hidden) WHERE deleted_at IS NULL` ya persiste desde la migración US-047 DB-002. Índice cubre el filtro base del listado (`status`, `is_hidden`, `deleted_at`). `business_name ILIKE` sin índice trigram — deuda documentada (§17 riesgo). |
| BE-001 | DTOs + Mapper | Done | `interface/admin-vendors-query.dto.ts` con `AdminVendorsQueryBaseSchema` (ZodObject sin refines, para OpenAPI) + `AdminVendorsQuerySchema` (con `superRefine` cross-field `from ≤ to`). Multi-status normalizado a array, `is_hidden` boolean coercion, `business_name` trim + colapso. Mapper `application/admin-vendor.mapper.ts` con `owner.email` (PII completa D4) + `lastAdminAction` extraído desde `admin_actions.metadata.reason`. Cursor helper `application/admin-vendors-cursor.ts`. UT: 20/20. |
| BE-002 | `ListVendorsForAdminUseCase` | Done | `application/list-vendors-for-admin.use-case.ts` — `prisma.vendorProfile.findMany` con WHERE compuesto (status IN, isHidden, createdAt range, businessName contains-insensitive), orden `[createdAt DESC, id DESC]`, cursor keyset `AND [OR(createdAt<, createdAt=+id<)]`, `select` chain sin N+1 (user + adminAction). Página `take: pageSize+1`; `nextCursor` codificado con el helper local. Sin `$transaction` (lectura pura). |
| BE-003 | Controller + ruta `GET /admin/vendors` | Done | Controller `interface/admin-vendor.controller.ts` extendido con `list` (delegación pura, `req.validated?.query`). Router `admin-vendor.routes.ts` monta `GET /` **antes** del `POST /:id/moderate` para preservar el match order (paridad con US-077). OpenAPI actualizado (`op(...)` con `AdminVendorsQueryBaseSchema` + response envelope + errores 400/401/403); `openapi:generate` regenerado (50 paths, +1); `openapi.spec.ts` 9/9 verde. |
| BE-004 | Reuso cursor + AdminGuard | Done | `roleMiddleware(['admin'])` ya reusado en el router (US-047). El "cursor utility" se implementa como archivo local del módulo (`admin-vendors-cursor.ts`) con shape idéntico al de US-066/077 — ver DEV-02. |
| FE-001 | Page `/admin/vendors` con filtro default pending | Done | `app/(admin)/admin/vendors/page.tsx` reemplaza el placeholder por `<VendorModerationTable />` (Server Component shell → Client Component). El default `status=['pending']` (Decisión PO D5) se aplica dentro del componente antes del primer fetch — la URL no cambia (client-side state). |
| FE-002 | `VendorModerationTable` + `VendorStatusBadge` | Done | `components/VendorModerationTable.tsx` con tabla accesible (`<caption sr-only>`, `<th scope>`, `aria-label` con `businessName` en el botón "Moderar"). `components/VendorStatusBadge.tsx` con literal i18n + color complementario (no color-only) + badge secundario "Oculto" cuando `isHidden=true`. Paginación con `useInfiniteQuery` + botón "Cargar más" (paridad US-077). |
| FE-003 | `VendorFiltersPanel` con debounce | Done | `components/VendorFiltersPanel.tsx` — checkboxes multi-status bajo `<fieldset><legend>`, select `is_hidden` (any/only-hidden/only-visible), input `business_name` con **debounce 300 ms** (Tech Spec §8; `useEffect` + `setTimeout`), rango de fechas nativo con cross-field alert (`role="alert"` + `aria-invalid`). Botón "Aplicar" para commit explícito de los demás filtros; "Limpiar filtros" resetea draft + commit externo. UT 6/6. |
| FE-004 | `VendorModerationDialog` + `useModerateVendor` hook | Done | `components/VendorModerationDialog.tsx` — `<dialog>` nativo (focus/Esc trap), radios con whitelist client-side espejo de US-047 D5 (`pending→{approve,reject}`, `approved+visible→{hide}`, `approved+hidden→{unhide}`, `rejected→sin acciones + banner`). Textarea con `required` variable según acción (D3/D4), contador reactivo, `aria-describedby`. Hook `hooks/adminVendorsQueries.ts::useModerateVendor` invalida `adminVendorsKeys.all` (prefix) + `public-vendor.detail.{slug}` + `vendor-directory`. UT 9/9. |
| FE-005 | `adminVendorsApi.list` + `.moderate` + MSW + i18n | Done | `api/adminVendorsApi.ts` (list + moderate) + `api/adminVendorsApi.types.ts` (contrato espejo backend). MSW `tests/msw/handlers/admin-vendors.ts` con 30 fixtures deterministas + filtros cliente-side + 4 triggers UUID para 401/403/404/409; registrado en `handlers/index.ts`. i18n `admin.vendor.panel.*` + `admin.vendor.moderate.*` con paridad EXACTA de claves entre los 4 locales (es-LATAM, es-ES, pt, en). |
| QA-001 | UT (DTOs + Mapper + Cursor) | Done | `backend/tests/unit/us074-list-vendors-for-admin.spec.ts` — 20/20 Passed. Cobertura: DTO 11 tests (default pageSize, multi-status normalize, boolean coerce, business_name trim + upper bound VR-06, cross-field VR-03 dates, pageSize VR-01, .strict() VR-04); cursor 6 tests (roundtrip idempotente, malformed, UUID inválido, ISO inválido, empty); Mapper 3 tests (sin adminAction, con reason, reason no-string defensivo). |
| QA-002 | IT (filtros + cursor + regresión US-047) | Done | `backend/tests/api/us074-list-vendors-for-admin.integration.spec.ts` — 12/12 Passed contra Postgres real. TS-01 default (DESC + owner.email + lastAdminAction null); TS-02 filtro status=pending; TS-03 filtros combinados status+is_hidden; TS-04 ILIKE substring; TS-05 cursor pagination sin repetición de ids; EC-02 cursor malformado; EC-04 fechas invertidas; AUTH-TS-02/03/04; **Regresión US-047**: POST moderate reject → GET admin/vendors muestra `lastAdminAction.action='reject'` en el mismo request; QA-005 perf smoke <500ms con 30+ vendors. |
| QA-003 | Authorization (admin only) | Done | Incluidos en IT US-074: AUTH-TS-02 organizer ⇒ 403, AUTH-TS-03 vendor ⇒ 403, AUTH-TS-04 sin sesión ⇒ 401. AUTH-TS-01 admin ⇒ 200 cubierto por TS-01. |
| QA-004 | Accessibility (tabla + filtros + dialog) | Done | `web/src/tests/unit/us074-vendor-moderation-dialog.test.tsx` (9/9) + `us074-vendor-filters-panel.test.tsx` (6/6). Cobertura: `<dialog>` con `aria-labelledby`, whitelist client-side (pending/approved+visible/approved+hidden/rejected), textarea con label + `aria-describedby`, contador reactivo, submit disabled si reason < 10 en reject/hide, submit habilitado sin reason en approve/unhide; filtros con `<fieldset><legend>`, cross-field alert `role="alert"` + `aria-invalid`, debounce 300 ms con `vi.useFakeTimers`. |
| QA-005 | Performance < 500ms p95 con ILIKE | Done | IT smoke incluido en QA-002 (`QA-005 perf smoke`): siembra 30 vendors + request con pageSize=25 + filtros default < 500 ms wall-clock single-shot. Nota de deuda: no equivale a p95 con concurrencia; load test dedicado con k6 queda fuera de scope. |
| DOC-001 | Documentar endpoint admin vendors list + panel | Done | `docs/16-API-Design-Specification.md §27.9` — nueva subsección US-074 completa (query params, response, errores, comportamiento, frontend, deuda ILIKE). Tabla §27.3 endpoints ampliada con la fila `GET /admin/vendors`. `docs/14-Backend-Technical-Design.md` §Tabla de UseCases con transacciones: nueva fila `ListVendorsForAdminUseCase` (US-074) con detalle de PII completa, cursor keyset, filtros, sin `$transaction`. |

## 6. Emergent Tasks

- Ninguna emergente. Todo el trabajo cabía en las 16 tareas planificadas.

## 7. Deviations Log

Ver §4 (DEV-01..DEV-11).

## 8. Technical Debt

- **Cursor helper duplicado** (DEV-02): `admin-vendors-cursor.ts` (US-074), `vendor-reviews-cursor.ts` (US-066/077) tienen shape idéntico. Un `shared/pagination/keyset-cursor.ts` genérico consolidaría los tres. No bloquea DoD; el costo actual es ~30 líneas duplicadas × 2 módulos.
- **ILIKE sin índice trigram** (DEV-11 + Tech Spec §17): `business_name ILIKE '%pattern%'` degradará con volumen alto. `gin_trgm_ops` post-MVP resuelve; hoy con volumen seed pasa el perf smoke. Documentado.
- **QA-005 perf single-shot ≠ p95**: mismo caveat que US-047. Load test dedicado con k6 queda como deuda.
- **`vendor-directory` invalidation** (DEV-07): asume que existe una queryKey exacta `['vendor-directory']`. Si el key real cambia (p. ej. incluye filtros), la invalidación no se aplica al item específico. Aceptable en MVP; auditar cuando US futuras extiendan el directorio.

## 9. Final Validation

- **Readiness:** `READY` (US-047 + US-066/067/077 satisfechas).
- **Alignment:** `ALIGNED_WITH_NOTES` (DEV-01..DEV-11 documentados).
- **Tareas:** 16/16 `Done`.
- **Validaciones ejecutadas**:
  - Backend `typecheck` (`npx tsc --noEmit`) ✅ sin errores.
  - Backend UT `us074-list-vendors-for-admin.spec.ts` 20/20 ✅.
  - Backend IT `us074-list-vendors-for-admin.integration.spec.ts` 12/12 ✅ (Postgres real).
  - Backend `openapi:generate` — 50 paths (+1 respecto de 49).
  - Backend `openapi.spec.ts` — 9/9 ✅ sin drift.
  - Regresión US-047 IT — 17/17 ✅.
  - Regresión US-067 IT — 13/13 ✅.
  - Regresión US-085 seed IT — 7/7 ✅.
  - Frontend `typecheck` ✅.
  - Frontend `lint` ✅ (0 errores/warnings).
  - Frontend `vitest` full suite — **637/637** ✅ (incluye 15 tests nuevos de US-074).
- **AC coverage:**
  - AC-01 (default pending) — BE devuelve todo sin filtro; FE pre-aplica `status=['pending']`; verificado por UT/IT.
  - AC-02 (filtros combinados) — TS-03 IT.
  - AC-03 (owner.email + last_admin_action) — TS-01 IT + Mapper UT.
  - AC-04 (UI panel) — FE-001/002/003/004 + UT dialog/filters.
  - AC-05 (refresh post-moderate) — IT regresión US-047 + hook invalidation `adminVendorsKeys.all`.
  - EC-01..05 — DTO UT + IT.
  - AUTH-TS-01..04 — IT.
  - A11Y — UT dialog + filters (`<fieldset><legend>`, `aria-labelledby`, `aria-describedby`, cross-field `role="alert"`).
  - Performance — QA-005 smoke.

## 10. Result

`DONE`. **PB-P1-041 CIERRA** (US-047 + US-074 completos). Panel admin de moderación de vendors operativo end-to-end.
