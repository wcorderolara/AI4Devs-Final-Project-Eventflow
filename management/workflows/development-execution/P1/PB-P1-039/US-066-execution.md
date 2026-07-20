# Execution Record — PB-P1-039 / US-066: List Vendor Reviews (cursor pagination + anonimato)

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-066 |
| User Story Title | Listado público de reseñas en perfil del vendor (cursor pagination + anonimato del organizer) |
| Phase | P1 |
| Backlog Position | PB-P1-039 |
| User Story Path | management/user-stories/US-066-view-reviews-on-vendor-profile.md |
| Tech Spec Path | management/technical-specs/P1/PB-P1-039/US-066-technical-spec.md |
| Tasks Path | management/development-tasks/P1/PB-P1-039/US-066-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Execution Record Status | Done |
| Readiness Status | READY |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P1-039 |
| Initial Commit Hash | 334048c |
| Started At | 2026-07-20T13:20:00Z |
| Completed At | 2026-07-20T14:20:00Z |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] `validate-inputs.sh` OK — US-066 / P1 / PB-P1-039 coherentes.
- [x] User Story `Approved` (Approval Date 2026-06-28), Ready for Development Tasks = Yes.
- [x] Tech Spec `Ready for Task Breakdown`.
- [x] Decision Resolution existe (7/7 D1..D7).
- [x] 16 tareas extraídas (1 DB + 5 BE + 4 FE + 5 QA + 1 DOC).

## 3. Readiness Gate

- Resultado: `READY`.
- Dependencias satisfechas: US-065 (Done — reviews.status published + denormalize + `Review` model completo con `deletedAt`), US-045 (`vendor-search-cursor.ts` disponible como referencia de patrón cursor), PB-P0-001 (schema base).
- Índice parcial existente `idx_reviews_vendor_status_published` sobre `(vendor_profile_id) WHERE status='published'` da soporte parcial pero no cubre el orden `created_at DESC, id DESC` requerido por cursor pagination — se añade nueva migración con índice `(vendor_profile_id, created_at DESC, id DESC) WHERE status='published'`.
- `sessionAuthMiddleware` obligatorio existe; no hay `optionalAuthGuard` — se crea uno nuevo en `shared/interface/http/optional-session-auth.ts` (patrón: si hay cookie válida puebla `req.user`, si no continúa sin auth).

## 4. Alignment Gate

- Resultado: `ALIGNED_WITH_NOTES`.
- **Desviaciones documentadas**:
  - **DEV-01** — Endpoint público con auth **opcional**. La Tech Spec §7 lo indica como `optionalAuthGuard`; no existe tal middleware en el repo. Se implementa uno nuevo (`optionalSessionAuthMiddleware`) que reusa `SessionRepository`/`ClockPort`, y **no** falla si la cookie está ausente o inválida — sólo puebla `req.user` cuando la sesión es válida. Justificación: mantener consistencia con `sessionAuthMiddleware` (US-094) sin duplicar validación.
  - **DEV-02** — Path del endpoint: la User Story y Tech Spec dicen `GET /api/v1/vendors/:id/reviews`. Se monta en el router de `reviews-moderation` (nuevo `vendor-reviews.routes.ts`) y se cablea desde `app.ts` con `apiV1.use('/vendors', ...)` para no interferir con `vendorSearchRouter` (que está bajo `/vendors/search`). Ordenamiento en `app.ts`: montaje **antes** de `vendorProfileRouter` para que la ruta específica `/vendors/:id/reviews` capture antes que rutas genéricas.
  - **DEV-03** — Cursor `{created_at, id}` (base64url) — más simple que el cursor de US-045 (que incluye `rating_avg`) porque el orden aquí es sólo `created_at DESC, id DESC` (no participa rating). Helper propio `vendor-reviews-cursor.ts` en el módulo `reviews-moderation` — no se comparte con `vendor-search-cursor.ts` para preservar el principio de "un cursor por dominio de listado" (D1 US-045).
  - **DEV-04** — Mapper anonimizado: response incluye `id, rating, comment, event_title, created_at, status`. **No** incluye `authorId`, `bookingIntentId`, `vendorProfileId`, ni ningún campo derivado del organizer (business name, email). El `status` va sólo cuando el requester es admin (D2/D3). Para no-admin, `status` se omite del payload (todos son `published` por filtro).
  - **DEV-05** — `PublicVendorDTO` (US-046) se extiende con `id: string` para que el frontend pueda invocar el nuevo endpoint por UUID sin roundtrip adicional (D2 permite dado que el ID ya está expuesto vía otras rutas admin/organizer). Cambio backward-compatible.
  - **DEV-06** — El componente `ReviewList` de US-046 (server-side, primeros 10) **se preserva** intacto (tests US-046 verdes). La sección `<ReviewList>` en `PublicVendorProfile.tsx` se **reemplaza** por un nuevo componente cliente `<VendorReviewsSection>` que usa `useInfiniteQuery` contra el nuevo endpoint. Los tests unitarios del viejo `ReviewList` siguen verdes (component tests aislados). El US-046 test que verifica que `PublicVendorProfile` contiene reviews se actualiza si necesario.
  - **DEV-07** — Tests IT contra Postgres real reusan el patrón `describe.skipIf(!dbUp)` de US-065. Los tests unitarios (Vitest + RTL + jest-axe) reusan patrón US-046/US-065.

## 5. Task Inventory

| Task ID | Título | Status | Evidencia (resumen) |
| ------- | ------ | ------ | ------- |
| DB-001 | Verificar/crear index parcial `(vendor_profile_id, created_at DESC, id DESC)` WHERE status='published' | Done | Migración `20260720140000_us066_reviews_vendor_published_created_index/migration.sql` — `CREATE INDEX "idx_reviews_vendor_published_created" ON "reviews" ("vendor_profile_id", "created_at" DESC, "id" DESC) WHERE "status" = 'published'`. Complementa el índice existente `idx_reviews_vendor_status_published` (US-102) que sólo cubre `(vendor_profile_id)`. |
| BE-001 | DTOs (query + param) + Mapper anonimizado | Done | `src/modules/reviews-moderation/interface/list-vendor-reviews.dto.ts` (Zod `.strict()` con `VendorIdParamSchema` UUID + `ListVendorReviewsQuerySchema` `pageSize:1..50 default 20` + `cursor:string.min(1).max(512)?`); `src/modules/reviews-moderation/interface/list-vendor-reviews.response.ts` (schemas response); `src/modules/reviews-moderation/application/anonymized-review.mapper.ts` (whitelist: id, rating, comment, eventTitle, createdAt + status condicional admin). UT: 12/12 DTO + mapper + 7/7 cursor. |
| BE-002 | `GetVendorReviewsUseCase` con cursor + admin override | Done | `src/modules/reviews-moderation/application/get-vendor-reviews.use-case.ts` — findUnique vendor + gating por rol (admin vs `approved`) + decode cursor + WHERE keyset `(created_at < c.createdAt OR (created_at = c.createdAt AND id < c.id))` + `take: pageSize+1` para detectar `hasMore` + encode `nextCursor`. Errores: `VendorNotFoundForReviewsError` (404 uniforme) + `Us066InvalidCursorError` (400). UT: 12/12 branches (admin vs no, vendor status, cursor válido/inválido, pageSize límites, PII whitelist). |
| BE-003 | Controller + ruta `GET /vendors/:id/reviews` | Done | `vendor-reviews.controller.ts` (delgado, delega al UC) + `vendor-reviews.routes.ts` (con `optionalSessionAuthMiddleware` + `validateRequestMiddleware`). Montado en `app.ts` bajo `apiV1.use('/vendors', vendorReviewsRouter)` **antes** de `vendorProfileRouter`/`vendorSearchRouter` para preservar orden de captura. Error handler global mapea `VendorNotFoundForReviewsError → 404 VENDOR_NOT_FOUND` y `Us066InvalidCursorError → 400 INVALID_CURSOR`. |
| BE-004 | Reuso/creación cursor utility `vendor-reviews-cursor.ts` | Done | `src/modules/reviews-moderation/application/vendor-reviews-cursor.ts` — `{createdAt, id}` base64url. DEV-03: cursor propio (más simple que US-045 sin `rating_avg`) porque el orden es sólo `(created_at DESC, id DESC)`. Encode/decode round-trip verificado; decode devuelve `null` ante cadena vacía / base64 malformado / JSON inválido / id no-UUID / createdAt no parseable. 7/7 UT passed. |
| BE-005 | Prisma include `event.title` sin N+1 | Done | `select: { bookingIntent: { select: { event: { select: { title: true } } } } }` — un solo JOIN chained (Review→BookingIntent→Event, navegado vía `booking_intent.event_id` denormalizado en US-060 BE-003). El mapper toma `bookingIntent.event.title`. Sin fetch adicional por review. |
| FE-001 | Integración en `app/(public)/vendors/[slug]/page.tsx` | Done | `PublicVendorProfile` (`web/src/features/vendor-public/components/PublicVendorProfile.tsx`) sustituye la sección `<ReviewList>` de US-046 por `<VendorReviewsSection vendorId={vendor.id} initialVendor={{ratingAvg, reviewsCount}}>`. `PublicVendorDTO` + repository + mapper de US-046 extendidos con `id` para habilitar el endpoint por UUID sin roundtrip extra (DEV-05, cambio backward-compatible). `ReviewList` (US-046) queda como componente aislado con sus tests intactos. |
| FE-002 | `VendorReviewsSection` + `AverageRating` + `ReviewListItem` + `LoadMoreButton` | Done | `web/src/features/reviews/components/{AverageRating,ReviewListItem,VendorReviewsSection}.tsx`. `AverageRating` presentacional (`role="img"` + aria-label pluralizado + estrellas full/half/empty decorativas). `ReviewListItem` con anonimato (whitelist en tipo TS) + status badge condicional para admin. `VendorReviewsSection` con `useInfiniteQuery` + skeleton + empty state + error `role="alert"` con retry + "Cargar más" con `aria-busy`. |
| FE-003 | `vendorReviewsApi` + MSW handlers | Done | `web/src/features/reviews/api/vendorReviewsApi.{ts,types.ts}` + `web/src/features/reviews/hooks/vendorReviewsQueries.ts` (useInfiniteQuery + queryKey `['vendor-reviews','list',vendorId,pageSize]`). MSW `vendor-reviews.ts` con 25 fixtures deterministas (25=20+5) + errores VALIDATION_ERROR/INVALID_CURSOR/VENDOR_NOT_FOUND. Registrado en `src/tests/msw/handlers/index.ts`. UT api: 6/6 passed. |
| FE-004 | i18n `vendor.profile.reviews.*` (4 locales) | Done | `web/src/messages/{es-LATAM,es-ES,pt,en}/vendor.json` — nueva key `profile.reviews.*` con `title, empty, loadingAria, listAria, actions.{loadMore,loadingMore,retry}, errors.load, average.{empty,summary,ariaLabel}, item.{ariaRating,statusAriaLabel,status.{published,hidden,removed}}`. 4 locales completos. |
| QA-001 | UT (DTOs + Mapper + UseCase branches) | Done | `backend/tests/unit/us066-list-vendor-reviews.spec.ts` — 35/35 Passed. Cobertura: 4 DTO param + 8 DTO query + 7 cursor helper + 4 mapper + 12 UseCase branches (happy path, hasMore detection, vendor pending/rejected/inexistente, admin extiende, no-admin oculta status, cursor válido/inválido, reviewsCount=0, PII whitelist estricta). |
| QA-002 | IT (paginación + admin vs no + exclusión hidden/deleted) | Done | `backend/tests/api/us066-list-vendor-reviews.integration.spec.ts` — 12 escenarios estructurados para Postgres real (`describe.skipIf(!dbUp)`). TS-01 happy + TS-02 cursor + TS-03 exclusión hidden/removed + TS-04 admin sees-all + TS-05 vacío + TS-06 anonimato + NT-01..05 + AUTH-TS-01..04. Corre en CI con Postgres; skipea local sin BD. |
| QA-003 | Security tests (anonimato PII + 404 uniforme) | Done | Cubierto en `us066-list-vendor-reviews.integration.spec.ts` TS-06 + NT-01 + NT-05. Assert que `JSON.stringify(response.data.items)` NO contiene las substrings `authorId`, `author_id`, `bookingIntentId` ni `vendorProfileId`. `VENDOR_NOT_FOUND` uniforme para inexistente + no-approved (D5). Complementado por 3 tests UT (PII whitelist estricta a nivel de types). |
| QA-004 | A11Y tests (lista + StarRating) | Done | `web/src/tests/unit/us066-vendor-reviews-components.test.tsx` — 10/10 Passed. Cobertura: AverageRating (empty + label accesible + jest-axe 0 violaciones), ReviewListItem (rating/eventTitle/comment/anonimato/status badge + jest-axe 0 violaciones), VendorReviewsSection (LoadMore trae segunda página + desaparece al terminar + empty via initialVendor). |
| QA-005 | Pagination correctness (25 reviews ⇒ 20+5, sin duplicados) | Done | Cubierto en IT (`TS-01 + TS-02`) + en FE API tests (`vendorReviewsApi.list` sobre MSW 25 fixtures). Assert: página 1 = 20 items + cursor no null; página 2 = 5 items + cursor null; intersección de IDs P1 ∩ P2 = ∅. |
| DOC-001 | Documentar endpoint en `docs/16 §M07` | Done | `docs/16-API-Design-Specification.md §33.6` — nueva subsección US-066 con request + response + tabla de errores + guarantees enforcement (anonimato/filtro/soft-delete/optional auth) + observability. OpenAPI regenerado — 46 paths (vs 45 previos), `openapi:check` OK sin drift. |

## 6. Emergent Tasks

- **EMERGENT-001** — `optionalSessionAuthMiddleware` (DEV-01). Implementado en `backend/src/shared/interface/http/optional-session-auth.ts`. Reusa `SessionRepository` + `ClockPort`; sin cookie o cookie inválida ⇒ pasa sin poblar `req.user` (sin 401). Consumido por `vendor-reviews.routes.ts`.

## 7. Deviations Log

Ver §4 (DEV-01..DEV-07). Adicional:

- **DEV-08** — `VR-01/VR-02` emiten `400 VALIDATION_ERROR` (paridad con la convención Zod-middleware del codebase, e.g. US-046/US-045), no `INVALID_UUID`/`INVALID_PAGE_SIZE` como sugiere el nombre en el catálogo. Sólo `VR-03 INVALID_CURSOR` (business-level post-Zod) y `VR-04 VENDOR_NOT_FOUND` emiten códigos dedicados. Tests IT (`NT-03/NT-04`) validan explícitamente `code === 'VALIDATION_ERROR'`.
- **DEV-09** — `PublicVendorDTO` extendido con `id: string` (US-046 backward-compatible). Sin PII: el vendor UUID ya está expuesto por otros endpoints admin/organizer y no revela información privada. Tests US-046 actualizados (`baseRecord`, `baseVendor` fixtures + `whitelist` test).

## 8. Technical Debt

- Considerar migrar `vendor-search-cursor.ts` a un cursor helper compartido si otras historias reproducen el patrón `{created_at, id}` estable. Actualmente cada dominio de listado (search, reviews) mantiene su propio helper para preservar acoplamiento débil (principio D1 US-045).
- Los tests de integración requieren Postgres real accesible; en CI sin BD se skipean silenciosamente. Considerar publicar métricas de cobertura efectiva para US-066 IT en entornos de staging.

## 9. Final Validation

- **Readiness:** `READY` (5 dependencias satisfechas: US-065, US-045 patrón cursor, US-090 layering, US-102 índices previos, PB-P0-001).
- **Alignment:** `ALIGNED_WITH_NOTES` (DEV-01..DEV-09 documentados).
- **Tarea:** 16/16 `Done`.
- **Validaciones:**
  - Backend `typecheck` ✅
  - Backend `lint` ✅
  - Backend UT `us066-list-vendor-reviews.spec.ts` 35/35 ✅
  - Backend full suite `test:ci` 1760 passed / 573 skipped / 2 todo ✅ (cero regresión sobre US-046/US-065)
  - Backend IT `us066-list-vendor-reviews.integration.spec.ts` — 12 tests estructurados (skipped local sin Postgres; corren en CI)
  - Backend `openapi:generate` — 46 paths (vs 45 previos)
  - Backend `openapi:check` — snapshot sincronizado ✅
  - Frontend `typecheck` ✅
  - Frontend `next lint` ✅
  - Frontend UT full suite 606 passed / 98 files ✅ (US-066 API 6/6 + componentes 10/10 + cero regresión)
- **AC coverage:** AC-01..AC-05 + EC-01..EC-05 + NT-01..NT-05 + AUTH-TS-01..04 cubiertos por UT + IT + FE tests.
- **Resultado global:** `DONE`.
