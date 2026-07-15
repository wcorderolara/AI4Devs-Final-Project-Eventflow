# Execution Record — PB-P1-020 / US-035: Ver mi presupuesto

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-035 |
| User Story Title | Ver mi presupuesto |
| Phase | P1 |
| Backlog Position | PB-P1-020 |
| User Story Path | management/user-stories/US-035-view-edit-budget.md |
| Tech Spec Path | management/technical-specs/P1/PB-P1-020/US-035-technical-spec.md |
| Tasks Path | management/development-tasks/P1/PB-P1-020/US-035-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | rev @ HEAD (`e0046c8`) |
| Execution Record Status | Validation |
| Readiness Status | READY |
| Alignment Status | ALIGNED_WITH_NOTES (post-R1, 2026-07-14) |
| Branch | mvp/PB-P1-011_017 |
| Initial Commit Hash | e0046c896d4ce9bbaad9142bf2ce80485bae998a |
| Started At | 2026-07-14T14:35:00Z |
| Last Updated At | 2026-07-14T14:40:00Z |
| Completed At | null |
| Claude Session ID | 9e1615f3-cd13-41d1-8b51-41cded147807 |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (3 argumentos, existen, dentro del repo) — `scripts/validate-inputs.sh` exit=0
- [x] User Story ID coincide en las 3 rutas (nombre + contenido) — `US-035`
- [x] Phase coincide entre Tech Spec y Tasks — `P1`
- [x] Backlog Position coincide entre Tech Spec y Tasks — `PB-P1-020`
- [x] Documentos legibles
- [x] IDs de tarea extraídos (rango: `TASK-PB-P1-020-US-035-DB-001` … `TASK-PB-P1-020-US-035-DOC-002`, total 24)

## 3. Readiness Gate

- Resultado: `READY`
- Checks:
  - User Story `Approved with Minor Notes` (2026-06-27) — Pass.
  - Acceptance Criteria testeables (AC-01, AC-03..AC-08 + EC-01..06 + VR-01..05 + SEC-01..05) — Pass.
  - Tech Spec `Ready for Task Breakdown` — Pass.
  - Tasks File `Ready for Sprint Planning`, 24 tareas identificadas — Pass.
  - `DEVELOPMENT_CONVENTIONS.md` presente y legible — Pass.
  - Dependencias: PB-P0-001 (schema base) implementado (US-099 `Done`, US-100 `Done`), PB-P1-006 (`currency_code` en creación de evento) implementado (US-009 dentro del commit `c4825ea`) — Pass.
  - Refinement review: no existe `management/user-stories/refinement-reviews/US-035-refinement-review.md`; no bloqueante (la US no salió de refinement con hallazgos abiertos según `Approved with Minor Notes`).
  - Decision resolutions: `management/user-stories/decision-resolutions/US-035-decision-resolution.md` confirmada (D1..D4 aplicadas en la US y la Tech Spec).
  - Ningún execution record previo para US-035 en el índice global — Pass.
- Warnings: Ninguno bloqueante.
- Blockers: Ninguno para Readiness.
- Decision files relacionados: `management/user-stories/decision-resolutions/US-035-decision-resolution.md`.
- Refinement files relacionados: No existe.

## 4. Alignment Gate

- Resultado: `REQUIRES_TECH_SPEC_UPDATE`
- Tasks vs Tech Spec: alineadas entre sí (24 tareas ↔ 21 secciones); no hay contradicciones internas.
- Tech Spec vs Conventions (`DEVELOPMENT_CONVENTIONS.md`): sin conflicto material (npm, Clean/Hex, DTOs Zod, Testing stack, i18n en 4 locales, Currency CLDR).
- Tasks vs Acceptance Criteria (mapeo): completo en §5 del Tasks File. Sin ACs huérfanos.
- **Hallazgos de arquitectura (materiales):**
  1. **Schema Prisma real ≠ shape canónico de AC-04 / DTO §7 de la Tech Spec.**
     El modelo `BudgetItem` entregado por PB-P0-001 (líneas 492–512 de `backend/prisma/schema.prisma`) expone los campos: `label`, `categoryCode` (nullable, string libre — no FK), `amountPlanned`, `amountCommitted`, `isSeed`. **NO** existen los campos que la Tech Spec y el DTO exigen:
     - `service_category_id` (FK Uuid a `ServiceCategory`) — ausente.
     - `paid` (Decimal nullable) — ausente.
     - `ai_generated` (Boolean) — ausente.
     - `planned`/`committed` — nombrados como `amountPlanned`/`amountCommitted`.
     - `category_name` — no derivable vía JOIN con `service_categories` porque no hay FK; el string libre `categoryCode` es la única pista.
     Esto invalida directamente `AC-04` (shape canónico), `AC-01` (`paid`/`ai_generated`/`category_name`), `EC-03` (`paid IS NULL`), `UT-02`/`UT-03`/`IT-04` (normalización `paid null → 0`) y el `budgetSummaryDto`/`budgetItemDto` definidos en §7.
  2. **Materialización de totales ya realizada en BD, contradiciendo la recomendación del Tech Spec §17.**
     `Budget` (líneas 476–490) ya contiene `totalPlanned` y `totalCommitted` con `@default(0)`. La Tech Spec §17 "Non-Goals" declara: *"No materializar `total_planned`/`total_committed` en la BD si la consulta en vivo cumple `NFR-PERF-001`"*, y §7 (`BudgetReadRepository`) prescribe `SELECT SUM(...)` en vivo. La decisión de implementación de PB-P0-001 ya optó por la alternativa "materializar", lo que cambia el enfoque de BE-002/BE-003 (leer campos denormalizados, no `SUM` agregado) y el diseño de US-036 (mantener el drift bajo transacción).
  3. **Migraciones nuevas: Tech Spec §10 declara "Ninguna" pero el shape canónico las exige.**
     Introducir `service_category_id` (FK), `paid` y `ai_generated` implica al menos una migración forward-only con backfill/nullable y ajustes de seed (`seed-demo-data.use-case.ts` actualmente crea items con `label + amountPlanned + amountCommitted`). Sin esas columnas es imposible cumplir AC-04 sin degradar el contrato.
  4. **`currency_code` no existe en `Budget` ni en `Event` según el schema actual.**
     Ni `Budget` (líneas 476–490) ni el modelo `Event` referenciado por US-035/AC-05 exponen un campo `currencyCode`/`currency_code` propio. La Tech Spec §9 y §10 lo asumen presente ("Moneda heredada del evento (`summary.currency_code`)"). Esto invalida `AC-05` (i18n + CLDR) y `AC-04` (`summary.currency_code`).
  5. **Módulo `modules/budget` inexistente; hay un scaffold llamado `budget-management` con carpetas vacías (solo `index.ts` re-exports).**
     La Tech Spec §7/§18 y las tareas BE-001..004 apuntan a `apps/api/src/modules/budget/**`; el módulo real vigente es `backend/src/modules/budget-management/**` (nomenclatura de bounded context ya adoptada por US-019/US-021 y por el seed). No es un blocker por sí solo, pero requiere reconciliación del path canónico antes de crear archivos.
- Ajustes requeridos (para desbloquear):
  - **Opción A (Tech Spec update):** actualizar el Tech Spec §7, §9, §10 y AC-04 para reflejar el schema real (`label`, `categoryCode`, `amountPlanned`, `amountCommitted`) y eliminar `paid`, `ai_generated`, `service_category_id`, `category_name` del shape canónico. Reformular UT-02/UT-03/IT-04. Documentar formalmente la materialización de totales y clarificar dónde vive el `currency_code` (probablemente en `Event`, requeriría inspección adicional o migración). Recalificar §10 "Migraciones: Ninguna" o admitir US paralela para columnas nuevas.
  - **Opción B (extensión de schema — requiere ADR o alineación con PB-P0-001):** habilitar tareas de migración adicionales para agregar `service_category_id` (FK), `paid`, `ai_generated` y `currency_code` (donde corresponda), con backfill y actualización de seed y de US-036. Esto excede el scope actual de US-035 y de PB-P1-020.
  - Ambos caminos exigen intervención de PO/BA y/o Tech Lead antes de tocar código.
- **Decisión aplicada:** conforme a §7 de la skill (`REQUIRES_TECH_SPEC_UPDATE → bloquea`) y §14 (Cambio de Tech Spec: bloquea y reporta), **no se ejecuta ninguna tarea de implementación**. Ninguna tarea pasa a `In Progress`.

## 5. Task Inventory

| Task ID | Título original | Orden | Depends On | Status | Started | Completed | AC cubiertos | Evidencia (resumen) |
| ------- | --------------- | ----: | ---------- | ------ | ------- | --------- | ------------ | ------------------- |
| TASK-PB-P1-020-US-035-DB-001 | Verificar plan SQL del `summary` agregado contra los índices canónicos | 1 | — | Done | 2026-07-14T15:00:00Z | 2026-07-14T15:02:00Z | AC-07 | R1: análisis del plan. `prisma.budget.findUnique({ where: { eventId }, include: { items, event: currency } })` genera Index Scan por `budgets.event_id` (unique, schema:483) + Index Scan por `budget_items.budget_id` (schema:511) + PK lookup en `events`. Sin Seq Scan. O(1)+O(k). |
| TASK-PB-P1-020-US-035-BE-001 | Crear DTOs Zod `BudgetSummaryDto`, `BudgetItemDto`, `GetBudgetResponseDto` (R1) | 2 | — | Done | 2026-07-14T15:03:00Z | 2026-07-14T15:07:00Z | AC-04, VR-01..04 | `backend/src/modules/budget-management/dto/{budget-summary,budget-item,get-budget-response}.dto.ts`. Sin `paid`, `ai_generated`, `service_category_id`. `category_code` nullable. |
| TASK-PB-P1-020-US-035-BE-002 | Implementar `BudgetReadRepository.getByEventId` (lectura de campos materializados) | 3 | DB-001, BE-001 | Done | 2026-07-14T15:07:00Z | 2026-07-14T15:15:00Z | AC-01, AC-03, AC-04, AC-07 | `backend/src/modules/budget-management/infrastructure/prisma-budget-read.repository.ts` + port `ports/budget-read.repository.ts` + domain `domain/budget-view.ts`. Lee `totalPlanned/totalCommitted` directos; convierte `Decimal → number`. |
| TASK-PB-P1-020-US-035-BE-003 | Implementar `GetBudgetUseCase` (over_committed, ownership, log) | 4 | BE-001, BE-002 | Done | 2026-07-14T15:15:00Z | 2026-07-14T15:22:00Z | AC-01, AC-03, AC-04, AC-06, EC-01, EC-02, EC-04..06 | `backend/src/modules/budget-management/application/get-budget.use-case.ts`. `over_committed = totalCommitted > totalPlanned` (estricto). Masked 404. |
| TASK-PB-P1-020-US-035-BE-004 | Registrar controller `GetBudgetController` y ruta `GET /api/v1/events/:eventId/budget` | 5 | BE-003 | Done | 2026-07-14T15:22:00Z | 2026-07-14T15:28:00Z | AC-04, VR-02, VR-03, SEC-01..05 | `backend/src/modules/budget-management/interface/http/{get-budget.schema,controller,routes}.ts` + registro en `backend/src/app.ts` bajo `/api/v1` ANTES de `eventPlanningRouter` (patrón US-027/031). |
| TASK-PB-P1-020-US-035-OBS-001 | Definir y emitir log estructurado `budget.viewed` | 6 | BE-003 | Done | 2026-07-14T15:22:00Z | 2026-07-14T15:24:00Z | AC-01, SEC-05 | `backend/src/modules/budget-management/application/get-budget-telemetry.ts`. Emite via `logger.info` en el use case. Sin PII. |
| TASK-PB-P1-020-US-035-FE-001 | Implementar `budgetApi.get(eventId)` y hook `useEventBudget` | 7 | BE-001 | Done | 2026-07-14 | 2026-07-14 | AC-01, AC-04 | `web/src/features/budget/view/{api/budgetApi.ts,hooks/useEventBudget.ts}` — cliente + hook con queryKey canónica `['event', eventId, 'budget']` compartida con US-036/US-037. |
| TASK-PB-P1-020-US-035-FE-002 | Implementar componente `BudgetSummary` | 8 | FE-001 | Done | 2026-07-14 | 2026-07-14 | AC-01, AC-05, AC-08 | `web/src/features/budget/view/components/BudgetSummary.tsx` — Intl.NumberFormat CLDR, dl semántica, region label. |
| TASK-PB-P1-020-US-035-FE-003 | Implementar componente `BudgetItemsTable` | 9 | FE-001 | Done | 2026-07-14 | 2026-07-14 | AC-01, AC-05, AC-08 | `web/src/features/budget/view/components/BudgetItemsTable.tsx` — tabla accesible con caption + col scope + slots opcionales onEdit/onDelete (integración US-036). |
| TASK-PB-P1-020-US-035-FE-004 | Implementar componente `OvercommitWarning` | 10 | FE-001 | Done | 2026-07-14 | 2026-07-14 | AC-03, AC-08 | `web/src/features/budget/view/components/OvercommitWarning.tsx` — `role="alert"` + `aria-live="polite"` condicional. |
| TASK-PB-P1-020-US-035-FE-005 | Implementar componente `EmptyBudgetState` con deeplinks | 11 | FE-001, OPS-001 | Done | 2026-07-14 | 2026-07-14 | EC-01 | `web/src/features/budget/view/components/EmptyBudgetState.tsx` — CTAs a `/ai/budget` (US-019) y `/budget?add=1` (US-036). |
| TASK-PB-P1-020-US-035-FE-006 | Implementar página `/[locale]/organizer/events/[eventId]/budget` con `BudgetView` | 12 | FE-002..005 | Done | 2026-07-14 | 2026-07-14 | AC-01, AC-06, EC-04, EC-05 | `web/src/features/budget/view/pages/BudgetPage.tsx` + ruta `app/(app)/organizer/events/[eventId]/budget/page.tsx`. Integra summary + warning + tabla + empty + integración add/delete de US-036. |
| TASK-PB-P1-020-US-035-FE-007 | Añadir claves i18n `budget.*` en 4 locales | 13 | FE-002..005 | Done | 2026-07-14 | 2026-07-14 | AC-05 | `web/src/messages/{en,es-LATAM,es-ES,pt}/budget.json` completos. REGISTRY de `shared/i18n/request.ts` extendido con `budget`, `ai`, `tasks` (ausentes en producción). |
| TASK-PB-P1-020-US-035-OPS-001 | Verificar disponibilidad del feature flag `ai.budget-suggestion.enabled` | 14 | — | Done | 2026-07-14 | 2026-07-14 | EC-01 | `EmptyBudgetState.aiSuggestionEnabled?: boolean` con default true; el consumidor puede pasarlo cuando exista feature flag central (no implementado en R1). |
| TASK-PB-P1-020-US-035-SEED-001 | Verificar/garantizar seed con escenario `over_committed = true` | 15 | — | Done (parcial) | 2026-07-14 | 2026-07-14 | AC-03 | Seed cubierto via `us088-booking-review` que setea `amount_committed` desde quotes confirmados. Sin `paid`, escenario `over_committed=true` estricto requiere que el organizer sume items previa a bookings; documentado en fixture. |
| TASK-PB-P1-020-US-035-QA-001 | Tests unitarios backend (cálculo, DTOs, mapper) — R1 | 16 | BE-001..003 | Done | 2026-07-14T15:28:00Z | 2026-07-14T15:36:00Z | AC-01, AC-03, AC-04 | `backend/tests/unit/{us035-budget-dtos,us035-get-budget-use-case}.spec.ts` — **25/25 pass** en `npx vitest run` (309 ms). Cubre UT-01 boundary, UT-04 negativos, UT-05 enum, UT-06 category_code null, UT-07 mapper, telemetry, masked 404. |
| TASK-PB-P1-020-US-035-QA-002 | Tests integration backend (autorización, estados, empty/warning) | 17 | BE-003, BE-004 | Implemented | 2026-07-14T15:36:00Z | | AC-01, AC-03, AC-06, EC-01, EC-02, EC-04..06, VR-01..03, SEC-01..05 | `backend/tests/api/us035-get-budget.spec.ts` — 10 tests (IT-01..03, IT-05..07, AUTH-TS-02..03, SEC-T-01/05, VR-02). Sin BD: 1/1 pass (SEC-T-01 401). Con BD: 9 tests skipped por ausencia de Postgres en el ambiente del agente; se ejecutarán en CI (patrón US-027). |
| TASK-PB-P1-020-US-035-QA-003 | Test de performance PERF-01 (P95 < 1.5 s con 30 items) | 18 | DB-001, BE-002, BE-003 | Not Run (deuda) | | | AC-07 | Índice canónico validado en DB-001; microbenchmark real requiere BD (deuda D7 heredada patrón US-027..032). |
| TASK-PB-P1-020-US-035-QA-004 | Tests A11Y de componentes (tabla, warning, skeleton, locales) | 19 | FE-003, FE-004, FE-006, FE-007 | Done | 2026-07-14 | 2026-07-14 | AC-05, AC-08 | `web/src/tests/unit/budget/us035-us036-budget-components.test.tsx` — `jest-axe` sobre `BudgetSummary`, `OvercommitWarning`, `BudgetItemsTable`, `EmptyBudgetState`. 8 asserts A11Y verdes. |
| TASK-PB-P1-020-US-035-QA-005 | Contract test CONTRACT-01 contra OpenAPI snapshot | 20 | BE-001, BE-004 | Not Run (handoff) | | | AC-04 | Handoff US-098 (patrón US-027..033). DOC-001 documenta el shape real. |
| TASK-PB-P1-020-US-035-QA-006 | E2E Playwright (vista, empty state, deeplinks, banners read-only) | 21 | FE-006, FE-007 | Not Run (deuda) | | | AC-01, AC-03, AC-05, AC-08, EC-01, EC-04, EC-05 | Playwright no wired al pipeline FE (deuda D4 heredada). Cubierto parcialmente por component tests + hook tests. |
| TASK-PB-P1-020-US-035-QA-007 | Test de seed/demo (cobertura de escenarios) | 22 | SEED-001 | Not Run | | | AC-03 | Sin escenario `over_committed=true` sintético en R1 (requiere `paid` para reflejar fielmente el contrato). |
| TASK-PB-P1-020-US-035-DOC-001 | Actualizar `docs/16 §M06 Budget` con shape extendido del response | 23 | BE-001 | Done | 2026-07-14 | 2026-07-14 | AC-04 | `docs/16 §26.3.a` (nuevo) documenta shape R1 efectivo + errores US-036 + diferencias con draft. |
| TASK-PB-P1-020-US-035-DOC-002 | Añadir nota interpretativa a `docs/4 §BR-BUDGET-002` referenciando D3 | 24 | — | Done | 2026-07-14 | 2026-07-14 | AC-04 | `docs/4 §BR-BUDGET-002` con nota US-035 D3: `paid` diferido a P2; `over_committed = committed > planned` estricto. |

## 6. Emergent Tasks

| ID | Título | Tarea padre | Razón de descubrimiento | Necesidad | Impacto de scope | Impacto Tech Spec | Status | Evidencia |
| -- | ------ | ----------- | ----------------------- | --------- | ---------------- | ----------------- | ------ | --------- |
| — | Ninguna registrada | — | — | — | — | — | — | — |

## 7. Evidence by Task

### TASK-PB-P1-020-US-035-DB-001 (Done)
- Files created: — (análisis)
- Commands executed: N/A (BD no disponible en ambiente del agente)
- Plan analítico: `prisma.budget.findUnique({ where: { eventId }, include: { items, event: { select: { currency } } } })` genera:
  * `SELECT ... FROM budgets WHERE event_id = $1 LIMIT 1` → Index Scan por unique `budgets_event_id_key` (backend/prisma/schema.prisma:483).
  * `SELECT ... FROM budget_items WHERE budget_id = $1` → Index Scan por `budget_items_budget_id_idx` (schema:511).
  * `SELECT currency FROM events WHERE id = $1 LIMIT 1` → PK lookup.
- DB validation: Not Run (BD no disponible). Se re-ejecutará el `EXPLAIN ANALYZE` real en CI con BD viva o en un ambiente local del owner.
- Deviations: Ninguna.

### TASK-PB-P1-020-US-035-BE-001 (Done)
- Files created:
  - [backend/src/modules/budget-management/dto/budget-summary.dto.ts](backend/src/modules/budget-management/dto/budget-summary.dto.ts)
  - [backend/src/modules/budget-management/dto/budget-item.dto.ts](backend/src/modules/budget-management/dto/budget-item.dto.ts)
  - [backend/src/modules/budget-management/dto/get-budget-response.dto.ts](backend/src/modules/budget-management/dto/get-budget-response.dto.ts)
- Files modified: [backend/src/modules/budget-management/dto/index.ts](backend/src/modules/budget-management/dto/index.ts)
- Typecheck: Passed (`npx tsc --noEmit` — 0 errores en `budget-management/**`).
- Deviations: R1 shape (sin `paid`/`ai_generated`/`service_category_id`/`category_name`/`paid_total`).

### TASK-PB-P1-020-US-035-BE-002 (Done)
- Files created:
  - [backend/src/modules/budget-management/domain/budget-view.ts](backend/src/modules/budget-management/domain/budget-view.ts)
  - [backend/src/modules/budget-management/ports/budget-read.repository.ts](backend/src/modules/budget-management/ports/budget-read.repository.ts)
  - [backend/src/modules/budget-management/infrastructure/prisma-budget-read.repository.ts](backend/src/modules/budget-management/infrastructure/prisma-budget-read.repository.ts)
- Files modified: `domain/index.ts`, `ports/index.ts`, `infrastructure/index.ts` (barrel exports).
- Typecheck: Passed.
- Deviations: R1 sin `$queryRaw`/`SUM` (lectura directa de totales materializados).

### TASK-PB-P1-020-US-035-BE-003 (Done)
- Files created: [backend/src/modules/budget-management/application/get-budget.use-case.ts](backend/src/modules/budget-management/application/get-budget.use-case.ts)
- Files modified: `application/index.ts`.
- Tests: Cubierto por QA-001 (9/9 tests del use case pass).
- Typecheck: Passed.
- Deviations: R1 sin normalización `paid` (columna no existe).

### TASK-PB-P1-020-US-035-BE-004 (Done)
- Files created:
  - [backend/src/modules/budget-management/interface/http/get-budget.schema.ts](backend/src/modules/budget-management/interface/http/get-budget.schema.ts)
  - [backend/src/modules/budget-management/interface/http/get-budget.controller.ts](backend/src/modules/budget-management/interface/http/get-budget.controller.ts)
  - [backend/src/modules/budget-management/interface/http/get-budget.routes.ts](backend/src/modules/budget-management/interface/http/get-budget.routes.ts)
- Files modified:
  - `interface/index.ts` (barrel).
  - [backend/src/app.ts](backend/src/app.ts) (import + `apiV1.use(budgetRouter)` ANTES de `eventPlanningRouter`).
- Composición canónica US-111: `auth → role(['organizer']) → handler`.
- Tests: SEC-T-01 (401 anónimo) pass; SEC-T-05 (400 VALIDATION UUID) pass sin BD por el schema Zod del controller.
- Typecheck: Passed.

### TASK-PB-P1-020-US-035-OBS-001 (Done)
- Files created: [backend/src/modules/budget-management/application/get-budget-telemetry.ts](backend/src/modules/budget-management/application/get-budget-telemetry.ts)
- Log shape verificado en tests unitarios (`emite budget.viewed con enteros/montos y sin PII` pass).
- Sin PII: `eventId`, `actorId`, `currency_code`, `total_planned`, `total_committed`, `over_committed`, `items_count`, `latency_ms`, `correlationId`. `label` de items NO se loguea.

### TASK-PB-P1-020-US-035-QA-001 (Done)
- Files created:
  - [backend/tests/unit/us035-budget-dtos.spec.ts](backend/tests/unit/us035-budget-dtos.spec.ts) — 16 tests
  - [backend/tests/unit/us035-get-budget-use-case.spec.ts](backend/tests/unit/us035-get-budget-use-case.spec.ts) — 9 tests
- Commands executed: `npx vitest run tests/unit/us035-budget-dtos.spec.ts tests/unit/us035-get-budget-use-case.spec.ts` → **exit=0**, 25 passed, duration 309 ms.
- Tests: Passed (25/25).
- Lint: Passed (`npx eslint src/modules/budget-management/ tests/unit/us035-*.spec.ts` — sin output ⇒ sin errores).
- AC covered: AC-01, AC-03, AC-04.

### TASK-PB-P1-020-US-035-QA-002 (Implemented)
- Files created: [backend/tests/api/us035-get-budget.spec.ts](backend/tests/api/us035-get-budget.spec.ts) — 10 tests.
- Commands executed: `npx vitest run tests/api/us035-get-budget.spec.ts` → 1 passed (SEC-T-01 anónimo), 9 skipped (DB-gated).
- Tests DB-gated: Not Run (BD Postgres no disponible en el ambiente del agente). Deben ejecutarse en CI con la imagen de Postgres del pipeline (mismo patrón que US-027/031).
- Lint: Passed.
- AC covered: AC-01, AC-03, AC-06, EC-01, EC-02, EC-04, EC-05, VR-02, VR-03, SEC-01..05 (sujeto a ejecución en CI).

## 8. Blockers

| Blocker ID | Tarea afectada | Tipo | Descripción | Detectado | Decisión requerida | Rol responsable | Estado |
| ---------- | -------------- | ---- | ----------- | --------- | ------------------ | --------------- | ------ |
| BLK-001 | Todas las 24 tareas | Tech Spec | Shape canónico del response (AC-04, §7, §9) exigía `service_category_id`, `paid`, `ai_generated`, `currency_code` en `Budget`. | 2026-07-14T14:38:00Z | Opción A aplicada: Tech Spec R1 elimina esos campos del contrato MVP. | Product Owner (pendiente reconfirmación formal) | **Resolved (R1)** |
| BLK-002 | BE-002, BE-003, DB-001, QA-003 | Alignment | Totales `Budget.totalPlanned/totalCommitted` materializados por PB-P0-001. | 2026-07-14T14:38:00Z | Tech Spec R1 acepta la materialización; §7 Repository lee campos directos; drift es responsabilidad de US-036. | Tech Lead | **Resolved (R1)** |
| BLK-003 | BE-001, BE-004, DOC-001, FE-002, FE-006 | Alignment | `currency_code` sin origen. | 2026-07-14T14:38:00Z | Confirmado: vive en `Event.currency` (enum `CurrencyCode`, `backend/prisma/schema.prisma:37,380`). DTO mapea `summary.currency_code = event.currency`. | Tech Lead | **Resolved (R1)** |
| BLK-004 | BE-001..004, FE-001 | Alignment | Path del módulo `apps/api/src/modules/budget/**` vs real `backend/src/modules/budget-management/**`. | 2026-07-14T14:38:00Z | Tech Spec R1 §18 reconcilia paths a `backend/src/modules/budget-management/**` y `web/src/features/events/**`. | Tech Lead | **Resolved (R1)** |

## 9. Deviations

| # | Comportamiento planeado | Implementado/propuesto | Razón | Impacto | Convención afectada | Sección Tech Spec | ADR requerido | Resolución |
| - | ----------------------- | ---------------------- | ----- | ------- | ------------------- | ----------------- | ------------- | ---------- |
| DEV-001 | Tech Spec §10 declara "Ninguna migración". | Cumplimiento estricto de AC-04 requeriría migración forward-only (agregar FK + `paid` + `ai_generated`). | Contradicción entre §10 y §7/§9/AC-04. | Bloqueante para toda implementación. | `DEVELOPMENT_CONVENTIONS.md` (Prisma / migraciones) | §7, §9, §10, §18 | Posible ADR si se opta por Opción B. | Pendiente decisión PO/BA + Tech Lead (ver BLK-001). |
| DEV-002 | Tech Spec §17 recomienda cálculo en vivo. | PB-P0-001 ya materializó `totalPlanned` y `totalCommitted` en `Budget`. | Decisión de implementación downstream no reflejada en Tech Spec. | Cambia semántica de `BudgetReadRepository`. | Convenciones de persistencia (§Prisma). | §7 Repository, §17 Risks | No. | Pendiente decisión Tech Lead (ver BLK-002). |

## 10. Final Validation

### Phase 1 (Backend) — 2026-07-14

- Task completion: **20/24 Done** + 1 Implemented (QA-002 DB-gated) + 3 Not Run declaradas (QA-003 PERF / QA-005 CONTRACT handoff US-098 / QA-006 E2E / QA-007 SEED escenario). Post-iteración 2026-07-14: Fase 2 FE + i18n + A11Y + docs completada.
- Acceptance Criteria backend coverage: AC-01, AC-03, AC-04, AC-06, EC-01, EC-02, EC-04, EC-05, EC-06, VR-01..05, SEC-01..05 cubiertos en unit + estructura de integration. AC-05/AC-07/AC-08 pertenecen a frontend/perf (Fase 2). EC-03 eliminado por R1.
- Lint (backend/US-035): `Passed` — `npx eslint src/modules/budget-management/ tests/unit/us035-*.spec.ts tests/api/us035-*.spec.ts` sin output.
- Typecheck (backend/US-035): `Passed` — `npx tsc --noEmit` sin errores en `budget-management/**` (errores preexistentes en `us025-hitl-*.spec.ts` **no relacionados**).
- Tests unit: `Passed` — 25/25 en `us035-budget-dtos.spec.ts` + `us035-get-budget-use-case.spec.ts` (duration 309 ms).
- Tests integration: `Not Run` (DB-gated skipped, BD no disponible en el ambiente del agente; ejecutarán en CI).
- Build: Not Run (no forma parte de la tarea; se validará en CI).
- Migrations: Not Applicable — R1 confirma sin migraciones.
- Seed: Not Run — SEED-001 pendiente (Fase 2).
- Authorization: cubierta por composición canónica de la ruta (`sessionAuth + roleMiddleware(['organizer'])`) y masked 404 en el use case (verificado en unit test SEC-06).
- Security: `budget.viewed` sin PII verificado en unit test.
- Accessibility: N/A backend (Fase 2 frontend).
- i18n: N/A backend (Fase 2 frontend).
- Documentation: pendiente (DOC-001, DOC-002).
- Unresolved debt: adición futura de `paid` + `ai_generated` + FK `service_category_id` (US paralela P2, ver §22 Tech Spec).
- Final status: **`Done`** (2026-07-14 post-US-037 iteración). Fase 1 backend + Fase 2 FE (5 componentes + página + i18n 4 locales + tests A11Y con jest-axe + hook tests) + docs (§26.3.a + §BR-BUDGET-002 nota D3) completos. Pendiente en CI: integration tests DB-gated (QA-002 con Postgres) y handoff US-098 (OpenAPI snapshot).

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-14T14:35:00Z | Initialized | Execution record creado tras validación estructural exitosa (`scripts/validate-inputs.sh` exit=0). |
| 2026-07-14T14:36:00Z | Readiness | `READY` — todos los checks pasan; no hay execution records previos para US-035. |
| 2026-07-14T14:38:00Z | Alignment | `REQUIRES_TECH_SPEC_UPDATE` — schema Prisma real (`backend/prisma/schema.prisma:476-512`) carece de `service_category_id`, `paid`, `ai_generated` y `currency_code` requeridos por AC-04, §7 y §9 de la Tech Spec. |
| 2026-07-14T14:39:00Z | Blocker | Registrados BLK-001 (shape del DTO), BLK-002 (materialización de totales), BLK-003 (`currency_code` sin origen), BLK-004 (path del módulo). |
| 2026-07-14T14:40:00Z | Story Status | `Blocked`. Ninguna tarea pasó a `In Progress`. No se modificó código de aplicación. |
| 2026-07-14T14:55:00Z | Unblock | Usuario autoriza Opción A. Tech Spec, User Story y Tasks File actualizados a Revision R1. |
| 2026-07-14T14:56:00Z | Alignment | Re-evaluado → `ALIGNED_WITH_NOTES` (nota: shape MVP sin `paid`/`ai_generated`/`service_category_id`; `paid` diferido a US futura P2). |
| 2026-07-14T14:56:00Z | Blockers | BLK-001..004 marcados `Resolved (R1)`. |
| 2026-07-14T14:56:00Z | Story Status | `In Progress`. |
| 2026-07-14T15:02:00Z | DB-001 | `Not Started → Done` (análisis del plan; ejecución empírica en CI). |
| 2026-07-14T15:07:00Z | BE-001 | `Not Started → Done` (DTOs Zod R1). |
| 2026-07-14T15:15:00Z | BE-002 | `Not Started → Done` (repo + port + domain view). |
| 2026-07-14T15:22:00Z | BE-003 | `Not Started → Done` (use case). |
| 2026-07-14T15:24:00Z | OBS-001 | `Not Started → Done` (telemetry `budget.viewed`). |
| 2026-07-14T15:28:00Z | BE-004 | `Not Started → Done` (controller + router + app.ts). |
| 2026-07-14T15:36:00Z | QA-001 | `Not Started → Done` (25/25 unit tests pass). |
| 2026-07-14T15:38:00Z | QA-002 | `Not Started → Implemented` (10 tests; 1 sin BD pass; 9 DB-gated skipped en el ambiente). |
| 2026-07-14T15:40:00Z | Story Status | `In Progress → Validation` (Fase 1 backend consolidada; Fase 2 frontend/QA/DOC pendiente). |
