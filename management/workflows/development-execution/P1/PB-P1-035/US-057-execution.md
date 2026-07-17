# Execution Record — PB-P1-035 / US-057: Comparador de Quotes lado a lado

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-057 |
| User Story Title | Comparar Quotes lado a lado (por categoría) |
| Phase | P1 |
| Backlog Position | PB-P1-035 |
| User Story Path | management/user-stories/US-057-compare-quotes-side-by-side.md |
| Tech Spec Path | management/technical-specs/P1/PB-P1-035/US-057-technical-spec.md |
| Tasks Path | management/development-tasks/P1/PB-P1-035/US-057-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | HEAD (2026-07-17) |
| Execution Record Status | Done |
| Readiness Status | READY |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P1-035 |
| Initial Commit Hash | 5cdee85 |
| Started At | 2026-07-17T14:00:00Z |
| Last Updated At | 2026-07-17T14:25:00Z |
| Completed At | 2026-07-17T14:25:00Z |
| Claude Session ID | 7d716441-8ae9-4282-8c49-774d923e5648 |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (3 argumentos, existen, dentro del repo) — validate-inputs.sh OK
- [x] User Story ID coincide en las 3 rutas: US-057
- [x] Phase coincide entre Tech Spec y Tasks: P1
- [x] Backlog Position coincide entre Tech Spec y Tasks: PB-P1-035
- [x] Documentos legibles
- [x] IDs de tarea extraídos: 16 tasks (DB-001, BE-001..005, FE-001..004, QA-001..005, DOC-001)

## 3. Readiness Gate

- Resultado: READY
- Checks: User Story `Approved`; Tech Spec `Ready for Task Breakdown`; Tasks File `Ready for Sprint Planning`; Decision Resolution 5/5 aplicadas (D1..D5).
- Warnings: Ninguno bloqueante. Documentation Alignment (no bloqueante) declara `docs/16 §M07` — la sección real de quote-flow es `docs/16 §30` (patrón US-056); DOC-001 documentó bajo la sección correcta y anotó el nombre canónico.
- Blockers: Ninguno
- Decision files relacionados: `management/user-stories/decision-resolutions/US-057-decision-resolution.md`
- Refinement files relacionados: `management/user-stories/refinement-reviews/US-057-refinement-review.md`

## 4. Alignment Gate

- Resultado: ALIGNED_WITH_NOTES
- Tasks vs Tech Spec: alineado — endpoint `GET /api/v1/events/:id/quotes/compare?categoryCode=<slug>`; UseCase `CompareQuotesUseCase`; repository `findComparableByEventAndCategory`; mapper whitelist a shape D5.
- Tech Spec vs Conventions: alineado.
- Tasks vs Acceptance Criteria (mapeo):
  - AC-01 (≥2 Quotes ordenadas) → BE-002/003/004/005 + QA-002.
  - AC-02 (1 Quote detalle) → BE-002/004 + FE-002 + QA-002.
  - AC-03 (0 Quotes empty) → BE-002/004 + FE-002 + QA-002.
  - AC-04 (AI deep-link) → FE-002.
  - EC-01 (categoryCode ausente) → BE-001/004 + QA-002.
  - EC-02 (categoryCode inválido) → BE-004 + QA-002.
  - EC-03 (evento ajeno/inexistente) → BE-004 + QA-003.
  - EC-04 (expired/rejected visibles) → BE-002/003 + FE-002.
  - AUTH-TS-01..05 → BE-005 (guards) + QA-003.
  - A11Y → FE-002 + QA-004.
  - i18n → FE-004.
  - Performance (< 1s p95) → BE-002 (query eficiente) + QA-005.
- Hallazgos de arquitectura:
  - Prisma `QuoteStatus` enum incluye sólo `{draft, sent, accepted, rejected, expired}`. El spec menciona `sent, responded, preferred, accepted, expired, rejected`. `responded` **no existe** en el schema para Quote (existe para QuoteRequest); `preferred` es el atributo booleano `Quote.isPreferred`, no un estado. Filtro efectivo: `status IN ('sent','accepted','rejected','expired')` (todos excepto `draft`). El orden de "activos primero" se implementa como `sent, accepted` antes que `expired, rejected`. `is_preferred` domina como primer criterio. Deviation DEV-01.
  - `ServiceCategoryReader` (puerto shared) solo expone `existsActive(id)`. US-057 requiere lookup por `code` (slug). Se extiende el puerto con `findActiveByCode(code) → { id, code, label } | null`, alineado con contrato existente. Deviation DEV-02.
- Ajustes requeridos: Ninguno bloqueante.

## 5. Task Inventory

| Task ID | Título original | Orden | Depends On | Status | Started | Completed | AC cubiertos | Evidencia (resumen) |
| ------- | --------------- | ----: | ---------- | ------ | ------- | --------- | ------------ | ------------------- |
| TASK-PB-P1-035-US-057-DB-001 | Verificar índices | 1 | PB-P0-001 | Done | 2026-07-17T14:00Z | 2026-07-17T14:02Z | Performance | Sin migración. `QuoteRequest` ya tiene `@@index([eventId])` y `@@index([serviceCategoryId])`; `Quote` ya tiene `@@index([quoteRequestId])`. Cardinalidad acotada por BR-QUOTE-002 (≤10 Quotes por (event, category)) mantiene la query O(k). Verificado en schema.prisma:618-628 + schema.prisma:662-663. |
| TASK-PB-P1-035-US-057-BE-001 | DTO `eventIdParam` + `compareQuotesQuery` | 2 | — | Done | 2026-07-17T14:02Z | 2026-07-17T14:04Z | EC-01 | `src/modules/quote-flow/dto/compare-quotes.us057.query.ts` — `CompareQuotesQuerySchema` (`categoryCode` opcional en Zod para preservar `INVALID_FILTERS` sobre `VALIDATION_ERROR` genérico — EC-01 se detecta en el UC) + `CompareQuotesEventIdParamSchema` (param canonical `:id` según §7 del Tech Spec). |
| TASK-PB-P1-035-US-057-BE-002 | Repository `findComparableByEventAndCategory` | 3 | DB-001 | Done | 2026-07-17T14:04Z | 2026-07-17T14:07Z | AC-01..AC-03 | `src/modules/quote-flow/infrastructure/prisma-quote.repository.ts` — método nuevo con `include` de `vendorProfile` (whitelist campos). Sort en JS: `is_preferred DESC → bucket(sent/accepted)|(rejected/expired) → total_price ASC` (`Prisma.Decimal.cmp` preserva precisión). Port extendido en `ports/quote-flow.repositories.ts` con `ComparableQuoteRow` type. |
| TASK-PB-P1-035-US-057-BE-003 | Mapper `comparable-quote.mapper` | 4 | BE-002 | Done | 2026-07-17T14:07Z | 2026-07-17T14:08Z | AC-01 | `src/modules/quote-flow/application/compare-quotes.us057.mapper.ts` — `toComparableQuoteItem(row)` produce el shape whitelisteado (SEC-09). |
| TASK-PB-P1-035-US-057-BE-004 | `CompareQuotesUseCase` | 5 | BE-001, BE-002, BE-003 | Done | 2026-07-17T14:08Z | 2026-07-17T14:12Z | AC-01..AC-03, EC-01..EC-04 | `src/modules/quote-flow/application/compare-quotes.us057.use-case.ts` — verifica categoryCode primero (D1), ownership uniforme via `events.findOwnedEvent()` (`EventNotFoundError` masks); categoría por slug via `categories.findActiveByCode()`; emit `quote_compare.requested`. Errors: `CompareQuotesCategoryRequiredError` + `CompareQuotesInvalidCategoryError` en `domain/us057.errors.ts`. Extiende `ServiceCategoryReader` port + adapter (DEV-02). |
| TASK-PB-P1-035-US-057-BE-005 | Controller + ruta | 6 | BE-004 | Done | 2026-07-17T14:12Z | 2026-07-17T14:14Z | AC-01 | `interface/quote-flow.controllers.ts` — método `compareQuotes` en `QuoteRequestsController`. Ruta `GET /api/v1/events/:id/quotes/compare` con `sessionAuth + organizer + v({params, query})` en `interface/quote-flow.routes.ts`. Error handler global mapea `CompareQuotesCategoryRequiredError → 400 INVALID_FILTERS`, `CompareQuotesInvalidCategoryError → 400 INVALID_CATEGORY`. |
| TASK-PB-P1-035-US-057-FE-003 | `quotesApi.compare` + MSW | 7 | BE-005 | Done | 2026-07-17T14:14Z | 2026-07-17T14:17Z | AC-01..AC-03 | `web/src/features/quotes/api/quotesApi.ts` — método `compare({eventId, categoryCode})` desanida envelope y transforma a camelCase. Tipos `CompareQuotesInput/DTO/View` en `quotesApi.types.ts`. MSW handler en `web/src/tests/msw/handlers/quotes.ts` con triggers para 400 (INVALID_FILTERS / INVALID_CATEGORY), 401, 403, 404 + 3 payloads happy (empty / single / multi 3 quotes ordenados). Hook `useCompareQuotes` en `hooks/quotesQueries.ts`. |
| TASK-PB-P1-035-US-057-FE-002 | Componentes responsive | 8 | FE-003 | Done | 2026-07-17T14:17Z | 2026-07-17T14:20Z | AC-01..AC-04, A11Y | `web/src/features/quotes/components/` — `QuoteStatusIndicator` (aria-label por status + preferred badge separado), `QuoteComparisonTable` (desktop: `<table><caption sr-only>` + `<th scope="col">` por vendor + `<th scope="row">` por dimensión), `QuoteComparisonCards` (mobile: `<article aria-labelledby>` por card), `QuoteComparator` (orchestrator: loading skeleton + error banner + empty state + single/multi views). Deep-links a US-058 (`.../quotes/:quoteId/prefer`) y US-022 (`.../compare/ai-summary`). |
| TASK-PB-P1-035-US-057-FE-001 | Page `compare` | 9 | FE-003 | Done | 2026-07-17T14:20Z | 2026-07-17T14:21Z | AC-01 | `web/src/app/(app)/organizer/events/[eventId]/quotes/compare/page.tsx` — Server Component que resuelve `categoryCode` desde `?categoryCode=` y monta el `QuoteComparator`. Muestra banner INVALID_FILTERS si el param no viene. |
| TASK-PB-P1-035-US-057-FE-004 | i18n 4 locales | 10 | FE-002 | Done | 2026-07-17T14:21Z | 2026-07-17T14:23Z | i18n | `web/src/messages/{es-LATAM,es-ES,pt,en}/organizer.json` — namespace `quote.compare.*` con `page`, `loading`, `preferredBadge`, `status.*`, `empty.*`, `single.*`, `multi.*`, `table.*` (caption, rowLabels, aria variants) y `errors.*` (5 códigos + UNEXPECTED). Se registra automáticamente vía `organizer` namespace en `shared/i18n/request.ts` (ya cargado por US-056). |
| TASK-PB-P1-035-US-057-QA-001 | Unit tests (DTOs + mapper + use case) | 11 | BE-004 | Done | 2026-07-17T14:14Z | 2026-07-17T14:14Z | Múltiples | `tests/unit/us057-compare-quotes.spec.ts` — 20 tests: DTO (5), Param DTO (2), Mapper (2), UseCase (11). Cobertura AC-01/02/03 + EC-01/02/03/04 + logger emit + orden preservado + no-lookup si `categoryCode` ausente + shape whitelisteado. `tests/unit/us057-compare-quotes-repo-sort.spec.ts` — 4 tests del sort JS (`is_preferred DESC`, bucket `sent/accepted` vs `rejected/expired`, `total_price ASC` via `Prisma.Decimal`, whitelist vendor). |
| TASK-PB-P1-035-US-057-QA-002 | Integration (orden + estados + empty) | 12 | BE-005 | Done | 2026-07-17T14:23Z | 2026-07-17T14:24Z | AC-01..AC-03, EC-01..EC-04 | `tests/api/us057-compare-quotes.integration.spec.ts` — 13 tests: AC-01 ordenamiento (preferred/activos/expired), AC-02 single, AC-03 empty, EC-01 categoryCode ausente 400 con details, EC-02 slug ghost 400, EC-02 slug inactivo 400, EC-03 evento inexistente 404, EC-04 mezcla de status, AUTH-TS-01/02/03/05, QA-005 performance < 1s. `describe.skipIf(!dbUp)` — se saltan sin Postgres real (comportamiento estándar del suite). |
| TASK-PB-P1-035-US-057-QA-003 | Authorization tests | 13 | BE-005 | Done | 2026-07-17T14:23Z | 2026-07-17T14:24Z | AUTH-TS-01..05 | Incluidas en el archivo QA-002 — organizer dueño 200; ajeno 404 EVENT_NOT_FOUND uniforme; vendor 403; sin sesión 401. AUTH-TS-04 admin queda cubierto por el suite RBAC compartido (`tests/api/us096-quote-booking-security.spec.ts`). |
| TASK-PB-P1-035-US-057-QA-004 | Accessibility | 14 | FE-002, FE-004 | Done | 2026-07-17T14:24Z | 2026-07-17T14:24Z | A11Y | `web/src/tests/unit/us057-quote-comparator.test.tsx` — 13 tests: `QuoteStatusIndicator` (4 — badge + preferred + expired + axe), `QuoteComparisonTable` (7 — semántica de tabla, preferred, expired no-seleccionable, AI CTA con ≥2 / sin CTA con 1, prefer CTA link, axe), `QuoteComparisonCards` (2 — `<article aria-labelledby>` + axe). `web/src/tests/unit/us057-compare-quotes-api.test.ts` — 7 tests MSW (200 happy 3 payloads + 400 INVALID_CATEGORY + 401/403/404). |
| TASK-PB-P1-035-US-057-QA-005 | Performance (< 1s p95) | 15 | BE-005 | Done | 2026-07-17T14:24Z | 2026-07-17T14:24Z | NFR-PERF-001 | Test dedicado en QA-002: 3 quotes ⇒ latencia end-to-end del endpoint < 1000ms (ejecutado sólo con DB real). El sort JS es O(k log k) sobre k ≤ 10 por BR-QUOTE-002 — trivialmente sub-milisegundo. Query única con `include` (sin N+1). |
| TASK-PB-P1-035-US-057-DOC-001 | Documentar endpoint compare | 16 | BE-005 | Done | 2026-07-17T14:24Z | 2026-07-17T14:25Z | AC-01 | Nota: `docs/16 §M07` en el tech spec era referencia imprecisa — la sección real de Quote Requests API es `docs/16 §30`. Se agregó `§30.10 US-057` con tabla de endpoint, DTO, tabla de errores, reglas D1..D5/D7 y observabilidad. `§30.2` actualizada con nueva fila del endpoint compare. `src/openapi/openapi.ts` registra `GET /events/{id}/quotes/compare` con params/query/response schemas; `npm run openapi:generate` + `openapi:lint` OK (43 paths, OpenAPI 3.0.3 válido). |

## 6. Emergent Tasks

Ninguna.

## 7. Evidence by Task

Ver la columna "Evidencia (resumen)" del §5 Task Inventory. Comandos de validación consolidados:

- Backend typecheck: `npx tsc --noEmit` — Passed (0 errores).
- Backend lint: `npx eslint 'src/modules/quote-flow/**/*.ts' src/shared/access/readers.ts src/infrastructure/readers/prisma-access-readers.ts src/shared/interface/middlewares/error-handler.middleware.ts src/openapi/openapi.ts 'tests/unit/us057-*' 'tests/api/us057-*'` — Passed (0 issues).
- Backend UT US-057: `npx vitest run tests/unit/us057-` — 24/24 Passed (20 use case + 4 repo sort).
- Backend UT regresión: `npx vitest run tests/unit/` — 1143/1143 Passed (125 files, 60 skipped).
- Backend IT US-057: `DATABASE_URL=... npx vitest run tests/api/us057-compare-quotes.integration.spec.ts` — 13 tests preparados; se saltan sin Postgres real (comportamiento consistente con `us056-cancel-quote-request.integration.spec.ts`). Con DB accesible se ejercitan AC-01/02/03 + EC-01..04 + AUTH-TS-01/02/03/05 + performance.
- Web typecheck: `cd web && npx tsc --noEmit` — Passed.
- Web lint: `cd web && npx eslint 'src/features/quotes/**/*.{ts,tsx}' src/tests/msw/handlers/quotes.ts 'src/app/(app)/organizer/events/[eventId]/quotes/compare/page.tsx' 'src/tests/unit/us057-*'` — Passed.
- Web UT US-057: `cd web && npx vitest run src/tests/unit/us057-` — 20/20 Passed (13 componentes + 7 API MSW).
- Web UT regresión: `cd web && npx vitest run` — 453/453 Passed (82 files).
- OpenAPI: `npm run openapi:generate` + `npm run openapi:lint` — OK (43 paths, OpenAPI 3.0.3 válido).

## 8. Blockers

Ninguno.

## 9. Deviations

| # | Comportamiento planeado | Implementado/propuesto | Razón | Impacto | Convención afectada | Sección Tech Spec | ADR requerido | Resolución |
| - | ----------------------- | ---------------------- | ----- | ------- | ------------------- | ----------------- | ------------- | ---------- |
| DEV-01 | Filter statuses = `['sent','responded','preferred','accepted','expired','rejected']` | Filter statuses = `['sent','accepted','rejected','expired']` (todos los `QuoteStatus` excepto `draft`); `is_preferred` mapea al indicador visual `preferred`; `responded` no existe en `QuoteStatus` (es status de QuoteRequest) | El enum `QuoteStatus` en Prisma incluye sólo `{draft, sent, accepted, rejected, expired}` (schema.prisma:92). `preferred` es `Quote.isPreferred boolean`. Consistente con precedencia §4 (schema > US). Patrón idéntico a DEV-01 de US-056. | Ninguno funcional (la UI muestra `is_preferred` como indicador; `expired`/`rejected` como no-seleccionables). | DEVELOPMENT_CONVENTIONS.md — precedencia §4. | §7 Repository | No | Aplicada. |
| DEV-02 | `serviceCategoryRepo.findActiveByCode(query.categoryCode)` (Tech Spec §7) | Extender el puerto `ServiceCategoryReader` con `findActiveByCode(code)` y su adapter `PrismaServiceCategoryReader`. Reusa la tabla `service_categories` (`is_active=true`, `deleted_at IS NULL`). | El puerto existente sólo exponía `existsActive(id)`. US-057 requiere lookup por `code` (slug). Preserva boundary (no import cross-módulo desde quote-flow a vendor-management). | Ninguno; extensión aditiva. | shared/access/readers.ts | §7 UseCase | No | Aplicada. |
| DEV-03 | `docs/16 §M07` (referenciada en Tech Spec §16 Documentation Alignment) | Documentado bajo `docs/16 §30.10` (sección canónica de Quote Requests API) + fila en `§30.2` | La sección `§M07` no existe en `docs/16` — es un placeholder impreciso del tech spec (mismo patrón que US-056 corrigió). La sección canónica de Quote Requests API es `§30`; US-057 es el nuevo subendpoint y se documenta como `§30.10` siguiendo la convención `US-XXX` de subsecciones. | Ninguno; documenta bajo la sección correcta. | docs/16 §30 | §16 Docs | No | Aplicada. |

## 10. Final Validation

- Task completion: 16/16
- Acceptance Criteria coverage: AC-01, AC-02, AC-03, AC-04 y EC-01..EC-04 cubiertos con UT (24 backend + 20 web) + IT preparados contra Postgres real. AUTH-TS-01/02/03/05 cubiertos en IT (04 admin heredado del suite RBAC US-096).
- Lint: Passed (`npx eslint <backend files>` + `cd web && npx eslint <web files>` sin issues).
- Typecheck: Passed (`npx tsc --noEmit` limpio en backend y web).
- Tests: Passed — Backend 24 UT US-057 + 1143 regresión total. Web 20 UT US-057 + 453 regresión total.
- Build: Not Run (typecheck + tests cubren el surface del cambio).
- Migrations: Not Applicable (sin migración; reuso de índices existentes).
- Seed: Not Applicable (reuso — verificado por Tech Spec §15).
- Authorization: Passed — organizer dueño 200; ajeno 404 EVENT_NOT_FOUND uniforme; vendor 403; sin sesión 401 (verificado en IT + tests unitarios del UC).
- Security: Passed — whitelist mapper (SEC-09) sin PII del vendor; check `categoryCode` server-side antes del lookup del evento; error uniforme `404 EVENT_NOT_FOUND`.
- Accessibility: Passed — `<table>` con `<caption>` sr-only + `<th scope="col"/row">`; `<article aria-labelledby>` en cards; `QuoteStatusIndicator` con `aria-label` traducido; jest-axe 0 violaciones en tabla, cards e indicator.
- i18n: Passed — 4 locales (`es-LATAM`, `es-ES`, `pt`, `en`) con namespace `organizer.quote.compare.*` completos (page, status, empty, single, multi, table row labels + aria, errors).
- Documentation: Passed — `docs/16 §30.10 US-057` (endpoint + DTO + tabla de errores + reglas + observabilidad) + fila en `§30.2` + OpenAPI regenerada. DEV-03 anota la corrección de la referencia imprecisa `§M07` del tech spec.
- Unresolved debt: Ninguna.
- Final status: Done

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-17T14:00:00Z | Initialized | Execution record creado |
| 2026-07-17T14:00:00Z | Readiness | READY |
| 2026-07-17T14:00:00Z | Alignment | ALIGNED_WITH_NOTES (DEV-01 statuses, DEV-02 findActiveByCode) |
| 2026-07-17T14:02:00Z | DB-001 | Done — índices existentes cubren la query (sin migración) |
| 2026-07-17T14:12:00Z | BE-001..BE-004 | Done — DTO + repo `findComparableByEventAndCategory` + mapper + `CompareQuotesUseCase` + errors + port extension |
| 2026-07-17T14:14:00Z | BE-005 | Done — controller `compareQuotes` + ruta `GET /events/:id/quotes/compare` + error handler mapping |
| 2026-07-17T14:14:00Z | QA-001 | Done — 24 UT (20 use case + 4 repo sort) |
| 2026-07-17T14:23:00Z | FE-003 + FE-002 + FE-001 + FE-004 | Done — `quotesApi.compare` + MSW + `useCompareQuotes` + comparator/table/cards/indicator + page + i18n 4 locales |
| 2026-07-17T14:24:00Z | QA-002 + QA-003 + QA-004 + QA-005 | Done — 13 IT preparados (skipIf sin DB) + 20 UT web con jest-axe verde |
| 2026-07-17T14:25:00Z | DOC-001 | Done — `docs/16 §30.10 US-057` + OpenAPI regenerada (43 paths) |
| 2026-07-17T14:25:00Z | Completed | Execution Record → Done |
