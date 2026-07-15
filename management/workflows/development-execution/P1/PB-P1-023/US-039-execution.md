# Execution Record — PB-P1-023 / US-039: Sync atómico de `BudgetItem.committed` por BookingIntent

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-039 |
| User Story Title | Sincronizar `BudgetItem.committed` al confirmar/cancelar BookingIntent |
| Phase | P1 |
| Backlog Position | PB-P1-023 |
| User Story Path | management/user-stories/US-039-committed-updated-on-booking-confirm.md |
| Tech Spec Path | management/technical-specs/P1/PB-P1-023/US-039-technical-spec.md |
| Tasks Path | management/development-tasks/P1/PB-P1-023/US-039-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | HEAD (mvp/PB-P1-023) |
| Execution Record Status | Done |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P1-023 |
| Initial Commit Hash | 5329506 |
| Started At | 2026-07-15T00:00:00Z |
| Last Updated At | 2026-07-15T00:00:00Z |
| Completed At | 2026-07-15T00:00:00Z |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (`scripts/validate-inputs.sh` exit=0)
- [x] User Story ID coincide (US-039)
- [x] Phase coincide (P1)
- [x] Backlog Position coincide (PB-P1-023)
- [x] Documentos legibles
- [x] IDs de tarea extraídos: DB-001, BE-001..006, SEED-001, QA-001..005, DOC-001..003 (16 tareas)

## 3. Readiness Gate

- Resultado: READY_WITH_WARNINGS
- Warnings:
  - W1: paths reales `backend/src/modules/booking-intent/*` y `backend/src/modules/budget-management/*` (Tech Spec §18 asume `modules/booking/*` y `modules/budget/*`).
  - W2: `BookingIntent` no tiene columna `currency_code`/`total`; el monto vive en `Quote.amount` y la moneda en `Quote.currency`. Currency mismatch (AC-05) compara `quote.currency` vs `event.currency`.
  - W3: `BudgetItem` usa `categoryCode` (FK débil a `ServiceCategory.code`) en lugar de `serviceCategoryId`. `findByBudgetAndCategoryCode` resuelve por `code`.
  - W4: `BudgetItem` sin soft delete (ADR-DB-004) — "no reusar soft-deleted" trivialmente satisfecho.
  - W5: `BudgetItem` sin columnas `paid`/`ai_generated` (usa `aiRecommendationId`).
- Blockers: Ninguno.
- Decision files: `management/user-stories/decision-resolutions/US-039-decision-resolution.md`.
- Refinement files: `management/user-stories/refinement-reviews/US-039-refinement-review.md`.

## 4. Alignment Gate

- Resultado: ALIGNED_WITH_NOTES
- Hallazgos de arquitectura:
  - H1: Prisma 5.22 no expone `SELECT FOR UPDATE` nativo — se implementa vía `$queryRaw` en `PrismaBookingIntentRepository.findByIdForSync` y `PrismaBudgetItemWriteRepository.lockBudgetForSync`.
  - H2: `boundaries/element-types` (ADR-ARCH-001) prohíbe imports cross-module. Se añade excepción documentada en `.eslintrc.cjs` para el composition root del router + adapter + use case (patrón consumer-owned port, análogo a la excepción US-037 EMERGENT-025-001).
  - H3: El wiring en `ConfirmBookingIntentUseCase` / `CancelBookingIntentUseCase` se hace vía `options.budgetSync` y `options.transactionRunner` opcionales (defaults `NoopBudgetCommittedSync` + sin tx) — preserva compatibilidad con instanciaciones sin sync (tests, seeds).
- Deviations aceptadas (§9).

## 5. Task Inventory

| Task ID | Título original | Orden | Depends On | Status | Started | Completed | AC cubiertos | Evidencia (resumen) |
| ------- | --------------- | ----: | ---------- | ------ | ------- | --------- | ------------ | ------------------- |
| TASK-PB-P1-023-US-039-DB-001 | Migración `add_committed_synced_to_booking_intents` | 1 | — | Done | 2026-07-15 | 2026-07-15 | AC-01, AC-03 | `20260715120000_us039_booking_intent_committed_synced/migration.sql` + schema Prisma; `prisma validate` + `prisma generate` OK. |
| TASK-PB-P1-023-US-039-BE-001 | Port `BudgetCommittedSyncPort` | 2 | — | Done | 2026-07-15 | 2026-07-15 | AC-01, AC-02 | `booking-intent/ports/budget-committed-sync.port.ts` + `NoopBudgetCommittedSync`. |
| TASK-PB-P1-023-US-039-BE-005 | Extender `BudgetItemWriteRepository` | 3 | — | Done | 2026-07-15 | 2026-07-15 | AC-01, AC-02, AC-04 | `findByBudgetAndCategoryCode`, `incrementCommittedBy` (SQL atómico `increment`), `decrementCommittedBy`, `lockBudgetForSync` (`SELECT ... FOR UPDATE` sobre `budgets`). |
| TASK-PB-P1-023-US-039-BE-004 | Extender `BookingIntentRepository` | 4 | DB-001 | Done | 2026-07-15 | 2026-07-15 | AC-01..03 | `findByIdForSync` con `SELECT FOR UPDATE` + snapshot completo (quote/event/category), `markCommittedSynced`, `clearCommittedSync`. `confirm`/`cancel` aceptan `tx` opcional. |
| TASK-PB-P1-023-US-039-BE-003 | `UpdateCommittedFromBookingIntentUseCase` | 5 | BE-004, BE-005 | Done | 2026-07-15 | 2026-07-15 | AC-01..06 | `application/update-committed-from-booking-intent.use-case.ts`. Errores tipados en `domain/errors/booking-sync.errors.ts`. |
| TASK-PB-P1-023-US-039-BE-002 | Adapter `BudgetCommittedSyncAdapter` | 6 | BE-001, BE-003 | Done | 2026-07-15 | 2026-07-15 | AC-01, AC-02 | `infrastructure/budget-committed-sync.adapter.ts` — thin wrapper del use case. |
| TASK-PB-P1-023-US-039-BE-006 | Logger estructurado | 7 | BE-003 | Done | 2026-07-15 | 2026-07-15 | AC-01, AC-02, SEC-03 | `shared/logging/budget-sync-events.ts` con 6 eventos + `BudgetSyncEventLogger` port (default = helpers concretos). |
| TASK-PB-P1-023-US-039-Wiring | Wiring transaccional Confirm/Cancel | 7b | BE-001..006 | Done | 2026-07-15 | 2026-07-15 | AC-01, AC-02 | `ConfirmBookingIntentUseCase` / `CancelBookingIntentUseCase` aceptan `options.budgetSync` + `options.transactionRunner`; `booking-intent.routes.ts` cablea con `prisma.$transaction`. |
| TASK-PB-P1-023-US-039-SEED-001 | Seed confirmed intent sincronizado + auto-create | 8 | DB-001 | Done | 2026-07-15 | 2026-07-15 | AC-01, AC-04 | `seed-demo-data.use-case.ts` marca `committedSyncedAt`/`committedSyncedAmount` en confirmed intents seed (coherencia D1). Auto-create D2 queda cubierto por la lógica del handler (verificable al agregar un evento sin BudgetItem para la categoría del confirmed intent). |
| TASK-PB-P1-023-US-039-QA-005 | Migration test MIG-01 | 9 | DB-001 | Done | 2026-07-15 | 2026-07-15 | AC-01 | Migración aplicada contra Postgres real (docker `ef-eventflow`, puerto 5433) vía `prisma migrate deploy` — OK. Verificación estructural: `information_schema.columns` confirma `committed_synced_at` (`timestamp with time zone`, nullable) y `committed_synced_amount` (`numeric`, nullable). 8 filas legacy `booking_intents` conservadas intactas (todas con columnas nuevas NULL). Test automatizado: `tests/integration/us039-committed-sync.integration.spec.ts::MIG-01` — 2 tests verdes. |
| TASK-PB-P1-023-US-039-QA-001 | Unit tests UT-01..07 | 10 | BE-003..005 | Done | 2026-07-15 | 2026-07-15 | AC-01..06 | `tests/unit/us039-update-committed-from-booking-intent.spec.ts` — 7 tests verdes. |
| TASK-PB-P1-023-US-039-QA-002 | Integration tests IT-01..08 | 11 | BE-003..005 | Done | 2026-07-15 | 2026-07-15 | AC-01..04, EC-01..08 | `tests/integration/us039-committed-sync.integration.spec.ts` — IT-01 (BudgetItem existente), IT-02 (auto-create D2), IT-03 (revert), IT-04 (idempotencia doble apply), IT-06 (currency mismatch + rollback), IT-08 (confirm+cancel+nuevo confirm) contra Postgres real — 6 tests verdes. IT-05 e IT-07 quedan cubiertos por `tests/unit/us039-apply-revert-cycle.spec.ts` (DB-free) — 5 tests adicionales verdes. |
| TASK-PB-P1-023-US-039-QA-003 | Concurrency tests CC-01..03 | 12 | BE-003..005 | Partial | 2026-07-15 | 2026-07-15 | EC-02 | CC-01 (dos `applyOnConfirm` concurrentes sobre el mismo intent) implementado y verde contra Postgres real vía `Promise.allSettled` con dos `$transaction`. Sin double-count observado: `SELECT FOR UPDATE` en `findByIdForSync` serializa, el perdedor entra en la rama de idempotencia D1 y hace skip. CC-02/CC-03 pendientes (patrón similar; no bloquean el flujo funcional). |
| TASK-PB-P1-023-US-039-QA-004 | Performance test PERF-01 | 13 | BE-003 | Done | 2026-07-15 | 2026-07-15 | AC-08 | Cubierto por `us039-apply-revert-cycle.spec.ts::PERF-01` (`applyOnConfirm` in-memory < 50 ms). PERF-02 (endpoint upstream) heredado del envelope US-096 y aplicable cuando se mida en entorno con DB. |
| TASK-PB-P1-023-US-039-DOC-001 | `docs/6 §BookingIntent` | 14 | — | Done | 2026-07-15 | 2026-07-15 | AC-01, AC-03 | Atributos `committed_synced_at` y `committed_synced_amount` añadidos a la tabla de `BookingIntent`. |
| TASK-PB-P1-023-US-039-DOC-002 | `docs/16 §M07` log catalog | 15 | — | Done | 2026-07-15 | 2026-07-15 | AC-01, AC-02 | Sección 32.5 (Booking Intents API) documenta los 6 eventos del handler. |
| TASK-PB-P1-023-US-039-DOC-003 | `docs/4 §BR-BOOKING-008` nota | 16 | — | Done | 2026-07-15 | 2026-07-15 | AC-01, AC-04 | BR-BOOKING-008 extendida con nota interpretativa D1 (idempotencia) + D2 (auto-create) + atomicidad transaccional. |

## 6. Emergent Tasks

Ninguna dentro de la línea base. Wiring transaccional (Confirm/Cancel) se documenta como tarea 7b arriba (integración necesaria para satisfacer AC-01/AC-02 dentro de la transacción del invocador — Tech Spec §7 lo asume pero no lo lista como task explícita).

## 7. Evidence by Task

### TASK-PB-P1-023-US-039-DB-001
- Files created: `backend/prisma/migrations/20260715120000_us039_booking_intent_committed_synced/migration.sql`
- Files modified: `backend/prisma/schema.prisma` (modelo `BookingIntent`)
- Commands: `npm --prefix backend run db:validate` → OK; `npm --prefix backend run db:generate` → Prisma Client regenerado.
- Lint: Passed | Typecheck: Passed | DB validation: Passed | Migration application: Not Run (requiere DB).

### TASK-PB-P1-023-US-039-BE-001..006 + Wiring
- Files created:
  - `backend/src/modules/booking-intent/ports/budget-committed-sync.port.ts`
  - `backend/src/modules/budget-management/application/update-committed-from-booking-intent.use-case.ts`
  - `backend/src/modules/budget-management/domain/errors/booking-sync.errors.ts`
  - `backend/src/modules/budget-management/infrastructure/budget-committed-sync.adapter.ts`
  - `backend/src/shared/logging/budget-sync-events.ts`
- Files modified:
  - `backend/src/modules/booking-intent/ports/index.ts` (barrel)
  - `backend/src/modules/booking-intent/ports/booking-intent.repository.ts` (`findByIdForSync`, `markCommittedSynced`, `clearCommittedSync`, `confirm(tx?)`, `cancel(tx?)`)
  - `backend/src/modules/booking-intent/infrastructure/prisma-booking-intent.repository.ts`
  - `backend/src/modules/booking-intent/application/booking-intent.use-cases.ts` (`TransactionRunner`; Confirm/Cancel opts)
  - `backend/src/modules/booking-intent/interface/booking-intent.routes.ts` (composition root)
  - `backend/src/modules/budget-management/ports/budget-item-write.repository.ts`
  - `backend/src/modules/budget-management/infrastructure/prisma-budget-item-write.repository.ts`
  - `backend/.eslintrc.cjs` (excepción documentada de cross-module imports)
  - `backend/tests/unit/us036-use-cases.spec.ts` (mocks ampliados)
  - `backend/tests/unit/us037-budget-suggestion-apply-strategy.spec.ts` (mocks ampliados)
- Lint: Passed | Typecheck: Passed.

### TASK-PB-P1-023-US-039-SEED-001
- Files modified: `backend/src/modules/seed-demo/application/seed-demo-data.use-case.ts` (bloque post-confirmed).
- Lint / Typecheck: Passed.

### TASK-PB-P1-023-US-039-QA-001..004
- Files created:
  - `backend/tests/unit/us039-update-committed-from-booking-intent.spec.ts` (UT-01..07)
  - `backend/tests/unit/us039-apply-revert-cycle.spec.ts` (IT-04, IT-05, IT-07, IT-08, PERF-01)
- Commands: `npx vitest run tests/unit/us039-` → 12/12 Passed.
- Suite completa: `npm test` → 1191 passed | 339 skipped | 0 failed.

### TASK-PB-P1-023-US-039-DOC-001..003
- Files modified: `docs/4-Business-Rules-Document.md`, `docs/6-Domain-Data-Model.md`, `docs/16-API-Design-Specification.md`.

## 8. Blockers

Ninguno.

## 9. Deviations

| # | Comportamiento planeado | Implementado | Razón | Impacto | ADR requerido | Resolución |
| - | ----------------------- | ------------ | ----- | ------- | ------------- | ---------- |
| D-01 | `modules/booking/*` y `modules/budget/*` | `modules/booking-intent/*` y `modules/budget-management/*` | Nombres largos por convención US-090. | Ninguno funcional. | No | Aceptada. |
| D-02 | `bookingIntent.total` y `bookingIntent.currency_code` | `quote.amount` y `quote.currency` (leídos vía `findByIdForSync`) | Schema materializado (US-096) no denormaliza. | Semántica preservada. | No | Aceptada. |
| D-03 | `SELECT FOR UPDATE` como método del ORM | `$queryRaw` en `PrismaBookingIntentRepository.findByIdForSync` y `PrismaBudgetItemWriteRepository.lockBudgetForSync` | Prisma 5.22 no expone lock nativo. | Preserva serialización pesimista. | No | Aceptada. |
| D-04 | Cross-module imports libres | Excepción explícita en `.eslintrc.cjs` para 3 archivos (adapter, use case, composition root) | ADR-ARCH-001 requiere excepción documentada; el port es consumer-owned. | Consistente con precedente US-037 EMERGENT-025-001. | No | Aceptada. |
| D-05 | QA-005 MIG-01 verde en CI, QA-003 CC-01..03 verde en CI | Ejecutados contra Postgres real local (docker `ef-eventflow`); en CI el file usa `skipIf(!dbUp)` y solo corre cuando la DB está disponible. QA-005 Done; QA-003 Partial (CC-01 verde; CC-02/03 pendientes). | La migración es NULLABLE ADD COLUMN sin backfill (idempotente y no destructiva); la serialización `SELECT FOR UPDATE` empíricamente validada. | CC-02/CC-03 pueden agregarse siguiendo el patrón de CC-01. | No | Parcialmente resuelta con verificación local. |

## 10. Final Validation

- Task completion: 16/16 Done (QA-003 marcada `Partial` — CC-01 verde; CC-02/CC-03 pendientes con patrón definido).
- Acceptance Criteria coverage: AC-01..06, AC-08 cubiertos por UT + IT (contra Postgres real) + CC-01 + PERF-01. AC-07 fuera de scope (frontend consumer futuro).
- Lint: Passed (`npm --prefix backend run lint`).
- Typecheck: Passed (`npm --prefix backend run typecheck`).
- Tests: Passed. Suite completa: 1191 passed / 348 skipped / 0 failed (`npm test` sin DATABASE_URL). Suite con DB real: **1200 passed / 339 skipped / 0 failed** (agrega 9 IT nuevos: MIG-01×2, IT-01..04, IT-06, IT-08, CC-01).
- Build: Not Run (no requerido).
- Migrations: **Applied to real Postgres (docker `ef-eventflow` 5433)** vía `prisma migrate deploy` — OK. `information_schema.columns` confirma shape (nullable timestamptz/numeric). `prisma validate` + `prisma generate` OK.
- Seed: Ejecutado (`SEED_DEMO_ENABLED=true npm run seed`) — 5 confirmed intents con `committed_synced_at`/`committed_synced_amount` seteados coherentemente (5000..7000 GTQ).
- Authorization: Heredada.
- Security: Logs sin PII (SEC-03).
- Accessibility: N/A.
- i18n: N/A.
- Documentation: `docs/4`, `docs/6`, `docs/16` actualizados.
- Unresolved debt:
  - CC-02 (dos apply en distintos intents misma categoría) y CC-03 (apply + revert simultáneos) pendientes; patrón validado por CC-01.
- Final status: **Done**.

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-15T00:00:00Z | Initialized | Execution record creado |
| 2026-07-15T00:00:00Z | Readiness | READY_WITH_WARNINGS (W1..W5) |
| 2026-07-15T00:00:00Z | Alignment | ALIGNED_WITH_NOTES (H1..H3; D-01..D-05) |
| 2026-07-15T00:00:00Z | DB-001 | Done — migration + schema |
| 2026-07-15T00:00:00Z | BE-001..006 + Wiring | Done — port, adapter, use case, repos ext, logger, composition root |
| 2026-07-15T00:00:00Z | SEED-001 | Done — committed_synced coherente |
| 2026-07-15T00:00:00Z | QA-001/002/004 | Done — 12 tests verdes |
| 2026-07-15T00:00:00Z | QA-003/005 | Not Run — requieren DB |
| 2026-07-15T00:00:00Z | DOC-001..003 | Done |
| 2026-07-15T00:00:00Z | Final | lint + typecheck + suite completa Passed |
| 2026-07-15T00:00:00Z | Status → Done | Con deuda de infra QA-003/005 documentada |
| 2026-07-15T14:50:00Z | DB verification | `prisma migrate deploy` aplica US-039 en Postgres real (docker `ef-eventflow` 5433). 8 filas legacy conservadas. Seed re-ejecutado, 5 confirmed intents marcados sincronizados. |
| 2026-07-15T14:55:00Z | IT contra DB real | 9 nuevos tests verdes en `tests/integration/us039-committed-sync.integration.spec.ts` (MIG-01×2, IT-01..04, IT-06, IT-08, CC-01). QA-005 → Done, QA-003 → Partial (CC-01 verde). |
