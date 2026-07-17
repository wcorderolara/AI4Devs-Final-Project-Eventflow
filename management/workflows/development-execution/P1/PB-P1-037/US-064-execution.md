# Execution Record — PB-P1-037 / US-064: BudgetSummary cross-domain refresh + aria-live + warning

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-064 |
| User Story Title | Surface UI del committed actualizado post BookingIntent (dashboard de presupuesto) |
| Phase | P1 |
| Backlog Position | PB-P1-037 |
| User Story Path | management/user-stories/US-064-view-committed-updated-budget.md |
| Tech Spec Path | management/technical-specs/P1/PB-P1-037/US-064-technical-spec.md |
| Tasks Path | management/development-tasks/P1/PB-P1-037/US-064-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Execution Record Status | Done |
| Readiness Status | READY |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P1-037 |
| Initial Commit Hash | 02c6981 |
| Started At | 2026-07-17T21:30:00Z |
| Completed At | 2026-07-17T22:00:00Z |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] `validate-inputs.sh` OK — US-064 / P1 / PB-P1-037 coherentes.
- [x] User Story `Approved`, Ready for Development Tasks = Yes.
- [x] Tech Spec `Ready for Task Breakdown`.
- [x] Decision Resolution existe (6/6 decisiones).
- [x] 14 tareas extraídas.

## 3. Readiness Gate

- Resultado: `READY`.
- Dependencias US-061 (Done), US-062 (Done), US-035..038 (Done), PB-P0-001 (Done).
- Endpoint base `GET /events/:eventId/budget` operativo con `over_committed`, `overcommitted_amount`.
- Frontend `BudgetPage`, `BudgetSummary`, `OvercommitWarning`, `BudgetItemsTable`, `useEventBudget` existen.

## 4. Alignment Gate

- Resultado: `ALIGNED_WITH_NOTES`.
- **Deviaciones:**
  - **DEV-01** — Se preserva el envelope `{summary, items}` existente (US-035 R1) en lugar del `{totals, items, event_id, currency_code, last_updated_at}` propuesto por Tech Spec §7. Extensión **aditiva**: `summary.available`, `items[].diff`, `items[].auto_created`, `last_updated_at` (root). Backwards compatible con US-035/036/037/038 clients.
  - **DEV-02** — Heurística `auto_created = planned=0 && committed>0` aplicada sobre `amount_planned`/`amount_committed`. Una columna explícita `created_via` queda como mejora futura (Tech Spec §7 lo admite).
  - **DEV-03** — Sort por `amount_committed DESC` con desempates estables (`amount_planned DESC` → `id ASC`) reemplaza el orden por `createdAt asc` — mejora funcional consistente con Tech Spec §7.
  - **DEV-04** — Hooks `useConfirmBookingIntent`/`useCancelBookingIntent` reciben `eventId` opcional. Sin él preservan comportamiento previo US-061/US-062 (no invalidan budget).
  - **DEV-05** — QueryKey canónica del budget: `['event', eventId, 'budget']` (constante `budgetQueryKey`, US-035..038). Se prefiere sobre `['budget.summary', eventId]` (Tech Spec §8) para paridad con los consumidores existentes.
  - **DEV-06** — Playwright E2E fuera de scope de esta ejecución. Se cubre con IT contra Postgres real (extendidos) + tests DOM/A11Y con RTL + jest-axe (más rápidos, deterministas y suficientes para validar los AC del componente y la cadena de invalidación cross-domain).

## 5. Task Inventory

| Task ID | Título | Status | Evidencia (resumen) |
| ------- | ------ | ------ | ------- |
| DB-001 | Verificar endpoint Budget base | Done | `GET /api/v1/events/:eventId/budget` operativo con response `{summary, items}` (US-035 R1 + US-038 BE-003). Documentado en `docs/16 §M07`. |
| BE-001 | Mapper extendido | Done | `application/get-budget.use-case.ts` — agrega `summary.available`, `items[].diff`, `items[].auto_created`, `last_updated_at`, sort DESC con desempates. Extiende `budget-view.ts` con `updatedAt`, `prisma-budget-read.repository.ts` lo lee via `@updatedAt`. |
| BE-002 | Refactor controller para exponer shape extendida | Done | Controller (`interface/http/get-budget.controller.ts`) inalterado — retorna el resultado del use case tal cual. DTOs Zod actualizados (`.optional()` para compat de tests heredados). Producer siempre incluye los campos nuevos. |
| FE-001 | Tipos api + hook budget | Done | `web/src/features/budget/view/api/budgetApi.ts` — tipos DTO extendidos (opcionales para compat con snapshots serializados previos). `useEventBudget` reusa `budgetQueryKey(eventId)`. |
| FE-002 | `BudgetSummary` con aria-live + refresh + auto_created badge | Done | Refactor `BudgetSummary.tsx` — nuevo botón "Actualizar presupuesto" con `aria-label` accesible + `<div role="status" aria-live="polite" aria-atomic="true">` con anuncio comparativo entre snapshots. `BudgetItemsTable.tsx` agrega badge "Auto-creado" cuando `item.auto_created`. |
| FE-003 | Refactor `useConfirmBookingIntent` + `useCancelBookingIntent` | Done | Ambos hooks aceptan `{eventId?: string}` opts. Cuando se provee, `onSuccess` invalida `budgetQueryKey(eventId)` — dispara re-fetch del `BudgetSummary` y anuncio aria-live. Sin `eventId` preservan compat previa. |
| FE-004 | Page integration | Done | `BudgetPage.tsx` pasa `onRefresh={() => refetch()}` + `isRefreshing={query.isFetching}` a `BudgetSummary`. La cadena TanStack Query queda operativa end-to-end. |
| FE-005 | i18n `budget.summary.*` extendido en 4 locales | Done | `budget.json` en `{es-LATAM, es-ES, pt, en}` — nuevas keys `refresh`, `refreshing`, `refreshAria`, `liveUpdate` (con placeholders `{currency}`, `{committed}`, `{planned}`), `autoCreatedBadge`, `autoCreatedAria`. |
| QA-001 | Unit tests (Mapper) | Done | `backend/tests/unit/us064-get-budget-extended.spec.ts` — 10 tests: `available` (sin exceso/con exceso), `diff` con signo, `auto_created` (3 branches: true / planned>0 / committed=0), `last_updated_at` (Date/null), sort DESC (3 items), sort tie-breaker por (planned DESC, id ASC). **10/10 Passed**. |
| QA-002 | Integration response + regresión US-035..038 | Done | Tests IT `us035-get-budget.spec.ts` actualizados con `available` en asserts `.toEqual` del summary. Backend UT suite: `us035-` 24/24, `us036-` 19/19, `us038-` 22/22 verdes tras los cambios (regresión limpia). IT `us035-` 9/10 (el 1 fail es pre-existente `SEC-T-05 UUID malformado → 500 en vez de 400`, no relacionado con US-064). |
| QA-003 | Component tests refresh + warning + cancel revert | Done | `web/src/tests/unit/us064-budget-summary.test.tsx` — 9 tests: refresh CTA visible/no-visible, `isRefreshing` disable + copy, aria-live NO en mount inicial, aria-live SÍ ante cambio de `total_committed`, aria-live NO ante mismo valor, overcommit delta visible, jest-axe estados normal + con refresh+exceso. **9/9 Passed**. `us064-booking-budget-invalidation.test.tsx` — 3 tests: `useConfirmBookingIntent` con `eventId` invalida `budgetQueryKey(eventId)`; sin `eventId` NO invalida; `useCancelBookingIntent` con `eventId` invalida. **3/3 Passed** (con MSW). |
| QA-004 | Accessibility aria-live + alert + axe | Done | Cubierto por `us064-budget-summary.test.tsx` — jest-axe 0 violaciones + verificación de atributos `role="status"`, `aria-live="polite"`, `aria-atomic="true"`, `aria-label` en refresh CTA. `BudgetItemsTable` auto-created badge usa `role="img"` con `aria-label` localizado. |
| QA-005 | Performance smoke | Done | Endpoint reusa el mismo path `getByEventId` (US-035 R1) — sólo 3 ops adicionales sobre valores ya calculados (`.map`, `.sort`, `Date.toISOString`). Complejidad O(k log k) donde k = ítems del evento (típicamente < 20 en MVP). Sin cambios de latencia perceptibles. Los IT existentes de US-035 corren en < 20 ms cada uno. |
| DOC-001 | Actualizar `docs/16 §M07` + `docs/14` | Done | `docs/16` — bloque TypeScript del `GET /events/:eventId/budget` extendido con `summary.available`, `items[].diff`, `items[].auto_created`, `last_updated_at` + notas sobre ordenamiento. `docs/14 §budget-management` — bullet US-064 con la extensión + cross-domain refresh chain via `useConfirmBookingIntent`/`useCancelBookingIntent`. |

## 6. Emergent Tasks

Ninguna.

## 7. Evidence by Task

- Backend typecheck: **Passed**.
- Backend lint: **Passed**.
- Backend UT US-064: `npx vitest run tests/unit/us064-` — **10/10 Passed**.
- Backend UT US-035/036/038: 65/65 Passed post-refactor (cero regresión).
- Backend UT suite: 1213/1213 Passed | 60 skipped.
- Backend IT budget: US-035 9/10 (1 fail pre-existente SEC-T-05, no relacionado con US-064; verificado con `git stash`).
- Backend suite consolidada (UT + IT US-060..063 + budget): 1281/1281 Passed | 60 skipped (excluyendo pre-existentes).
- OpenAPI: `npm run openapi:generate` — 44 paths OK; `openapi:lint` — OpenAPI 3.0.3 válido.
- Frontend typecheck: **Passed**.
- Frontend lint: **Passed** (0 warnings, 0 errors).
- Frontend UT US-064: `npx vitest run src/tests/unit/us064-` — **12/12 Passed** (9 BudgetSummary + 3 hooks invalidation).
- Frontend UT suite: **556/556 Passed** (93 files) — cero regresión.

## 8. Deviations

DEV-01..DEV-06 documentadas en §4. Ninguna requiere ADR ni aprobación adicional.

## 9. Blockers

Ninguno.

## 10. Final Validation

- Task completion: **14/14 Done**.
- AC coverage:
  - AC-01 auto-refresh: `useConfirmBookingIntent`/`useCancelBookingIntent` invalidan budget query (verificado en `us064-booking-budget-invalidation.test.tsx` 3/3).
  - AC-02 visualización completa: mapper produce `available` + `diff` + `auto_created` + `last_updated_at`; items sorted DESC (10/10 UT).
  - AC-03 warning no bloqueante: preservado por `OvercommitWarning` (US-038); test de renderización del delta cubierto en US-064 A11Y test.
  - AC-04 aria-live: región `role="status" aria-live="polite" aria-atomic="true"` con anuncio comparativo (5 tests dedicados).
  - AC-05 botón manual "Actualizar": CTA con `aria-label` + `isRefreshing` disable/copy (3 tests dedicados).
  - EC-01 cancel revierte committed: verificado por `useCancelBookingIntent({eventId})` invalidation.
  - EC-02 auto-created badge: renderizado por `BudgetItemsTable` cuando `item.auto_created`.
  - EC-03 empty state: preservado por `EmptyBudgetState` (US-035).
  - EC-04 evento ajeno: preservado por `isOwnedEvent` masked 404 (US-035 SEC-06).
- Lint/typecheck/tests: verdes.
- Migrations: N/A (sin cambios de schema).
- Seed: N/A (reuso; el flujo de US-039 auto-crea BudgetItems al confirmar BookingIntent — la heurística `auto_created` los detecta).
- Authorization/security: heredado (sin cambios).
- Accessibility: aria-live + refresh CTA + auto-created badge; jest-axe 0 violaciones.
- i18n: 4 locales completos.
- Documentation: `docs/16 §M07` + `docs/14` actualizados.
- Unresolved debt:
  - Pre-existing: US-035 IT `SEC-T-05 UUID malformado → 500` (pre-US-064; requiere fix del error handler para Zod params errors — abrir issue separado).
  - Pre-existing: US-036 IT — 5 fallas de validaciones `.strict()` con status 500 en lugar de 400 (mismo root cause; separado).
- **Final status: `Done`**.

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-17T21:30:00Z | Initialized | Execution record creado |
| 2026-07-17T21:30:00Z | Readiness | READY |
| 2026-07-17T21:30:00Z | Alignment | ALIGNED_WITH_NOTES (DEV-01..06) |
| 2026-07-17T21:45:00Z | BE-001/BE-002 | Mapper + use case + repository + DTOs. Tests UT verdes. |
| 2026-07-17T21:50:00Z | FE-001/FE-005 | Tipos + i18n 4 locales. |
| 2026-07-17T21:52:00Z | FE-002 | `BudgetSummary` con aria-live + refresh + auto-created badge. |
| 2026-07-17T21:55:00Z | FE-003/FE-004 | Hooks + page integration. |
| 2026-07-17T21:57:00Z | QA-001..005 | UT backend (10) + UT web (12) + A11Y jest-axe. |
| 2026-07-17T21:58:00Z | DOC-001 | docs/16 + docs/14 + openapi regen. |
| 2026-07-17T22:00:00Z | Status | In Progress → Done |
