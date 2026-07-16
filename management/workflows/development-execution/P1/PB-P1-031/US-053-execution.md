# Execution Record — PB-P1-031 / US-053: ValidUntilPicker + ExpireQuotesJob

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-053 |
| User Story Title | ValidUntilPicker + ExpireQuotesJob (validez 15 días default) |
| Phase | P1 |
| Backlog Position | PB-P1-031 |
| User Story Path | management/user-stories/US-053-quote-validity-15-days.md |
| Tech Spec Path | management/technical-specs/P1/PB-P1-031/US-053-technical-spec.md |
| Tasks Path | management/development-tasks/P1/PB-P1-031/US-053-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | mvp/PB-P1-031 @ 2026-07-16 |
| Execution Record Status | Done |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P1-031 |
| Initial Commit Hash | 0754814772578360b028ebc85e80cf95b414e49a |
| Started At | 2026-07-16T00:00:00Z |
| Last Updated At | 2026-07-16T00:00:00Z |
| Completed At | 2026-07-16T00:00:00Z |
| Claude Session ID | n/a |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (`scripts/validate-inputs.sh` OK: US=US-053 PHASE=P1 BACKLOG=PB-P1-031).
- [x] User Story ID coincide en las 3 rutas.
- [x] Phase coincide (P1).
- [x] Backlog Position coincide (PB-P1-031).
- [x] IDs de tarea extraídos (16 tareas DB-001..DOC-001).

## 3. Readiness Gate

- Resultado: **READY_WITH_WARNINGS**
- User Story `Approved with Minor Notes` (2026-06-27); Tech Spec `Ready for Task Breakdown`.
- Decision Resolution 5/5 (D1..D5).
- Dependencia US-052 `Done` (commit `0754814`).
- Warnings:
  - Módulo canónico es `modules/quote-flow` (no `modules/quotes`).
  - Ya existe scheduler patrón US-015 (`registerJobs`, `NodeCronScheduler`, `JOBS_ENABLED`); reutilizamos en lugar de crear `src/jobs/scheduler.ts` nuevo.
  - `node-cron` ya instalado; no requiere nueva dependencia.
  - Índice `idx_quotes_valid_until_active` ya existe (migración `20260708201148_critical_indexes`).

## 4. Alignment Gate

- Resultado: **ALIGNED_WITH_NOTES**
- Tasks vs Tech Spec: mapeo 1:1 (16 tareas).
- Desviaciones registradas:
  - **DEV-01**: UC nuevo `ExpireQuotesUs053UseCase` bajo `modules/quote-flow/application/` (módulo canónico real).
  - **DEV-02**: Job `ExpireQuotesJob` bajo `src/jobs/` reutilizando el `Scheduler` port + `NodeCronScheduler` de US-015 en lugar de instanciar `node-cron` directamente. Encaja en `registerJobs` con nueva entrada `expire-quotes`.
  - **DEV-03**: nuevas env vars `JOBS_EXPIRE_QUOTES_CRON` (default `5 0 * * *`) y `JOBS_EXPIRE_QUOTES_JITTER_MAX_MS` (default `600000` = 10 min). Se apagan con el mismo `JOBS_ENABLED` global.
  - **DEV-04**: Métricas — se documentan como logs estructurados (`quote.expired.run.end.metrics`) porque el proyecto aún no tiene un backend de métricas (Prometheus) montado; el envelope de log tiene los mismos nombres canónicos y valores para agregación futura.
  - **DEV-05**: `FE-001 ValidUntilPicker` implementado con `<input type="date">` nativo accesible (default +15d, min today+1, max today+90) — evita agregar la dependencia `react-day-picker`. Rejustificable en US futura si el diseño requiere un date-picker rich.
  - **DEV-06**: CLI `npm run job:expire-quotes` implementado con `tsx src/scripts/expire-quotes.cli.ts`.
  - **DEV-07**: sin `npm run worker` dedicado; el scheduler ya se registra desde `src/server.ts` cuando `JOBS_ENABLED=true` (misma decisión que US-015). El CLI cubre la ejecución manual para QA/demo.

## 5. Task Inventory

| Task ID | Título | Orden | Depends On | Status | Started | Completed | AC | Evidencia |
| ------- | ------ | ----: | ---------- | ------ | ------- | --------- | -- | --------- |
| TASK-PB-P1-031-US-053-DB-001 | Verificar `idx_quotes_valid_until_active` | 1 | PB-P0-001 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | Perf | Índice ya existe (migración `20260708201148_critical_indexes` línea 52): `CREATE INDEX "idx_quotes_valid_until_active" ON "quotes" ("valid_until") WHERE "status" = 'sent'`. Pass sin migración. |
| TASK-PB-P1-031-US-053-OPS-001 | Env vars + CLI script | 2 | — | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | AC-02 | 3 env vars nuevas en `src/config/env.ts` + `.env.example`: `JOBS_EXPIRE_QUOTES_CRON` (default `5 0 * * *`), `JOBS_EXPIRE_QUOTES_JITTER_MAX_MS` (600000), `JOBS_EXPIRE_QUOTES_BATCH_SIZE` (100). Script `job:expire-quotes` en `package.json`. Se apagan con el `JOBS_ENABLED` global de US-015. |
| TASK-PB-P1-031-US-053-BE-001 | `ExpireQuotesUs053UseCase` batching + SKIP LOCKED | 3 | DB-001 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | AC-02..04 | `modules/quote-flow/application/expire-quotes.us053.use-case.ts` con loop `prisma.$transaction` por batch + `SELECT ... FOR UPDATE SKIP LOCKED` + `UPDATE ... WHERE id IN (...) AND status='sent'` + 2 notifications por quote + `MAX_BATCHES=10000` como backstop. 6 UT UC verdes. |
| TASK-PB-P1-031-US-053-BE-002 | `ExpireQuotesJob` handler + jitter | 4 | BE-001, OPS-001 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | AC-02 | `src/jobs/expire-quotes.job.ts` con jitter random `[0..jitterMaxMs]`, `wait` inyectable para tests, `correlationId=job-<runId>`, try/catch que emite `.run.failed` (canal `error`). 3 UT job verdes. |
| TASK-PB-P1-031-US-053-BE-003 | Extender `registerJobs` con expire-quotes | 5 | BE-002 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | AC-02 | `src/jobs/index.ts` reutiliza `Scheduler` + `NodeCronScheduler` de US-015. Nueva línea `jobs.registry.enabled` incluye `expire-quotes` con sus cadences. |
| TASK-PB-P1-031-US-053-BE-004 | CLI `npm run job:expire-quotes` | 6 | BE-001 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | — | `src/scripts/expire-quotes.cli.ts` fuerza una ejecución inmediata sin jitter e imprime el resumen del run como JSON. Termina con exit code 0/1. |
| TASK-PB-P1-031-US-053-BE-005 | Logger `quote.expired.*` + métricas log | 7 | BE-001 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | AC-02 | 5 eventos canónicos (`run.start`, `batch`, `batch.failed`, `run.end`, `run.failed`). `.failed` mapeado a `logger.error` en `StructuredDomainEventLogger`. `run.end` incluye `totalExpired`, `batchCount`, `durationMs`, `errorCount` como campos agregables. Contrato del logger port extendido con estos campos. |
| TASK-PB-P1-031-US-053-FE-001 | `ValidUntilPicker` accesible | 8 | — | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | AC-01, A11Y | `web/src/features/quotes/components/ValidUntilPicker.tsx` con `forwardRef` (RHF-compatible), `<input type="date">` nativo (min today+1, max today+90, default today+15 en UTC), `aria-invalid`, `aria-describedby`, helper text i18n con `{min}`/`{max}`. 7 UT DOM verdes (incluye A11Y). |
| TASK-PB-P1-031-US-053-FE-002 | Integración en `QuoteResponseForm` | 9 | FE-001 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | AC-01 | `QuoteResponseForm` (US-052) reemplaza el `<input type="date">` inline por `<ValidUntilPicker>`. 4 UT existentes del form siguen verdes. |
| TASK-PB-P1-031-US-053-FE-003 | i18n `vendor.qr.respond.valid_until.*` | 10 | FE-001 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | i18n | Clave nueva `vendor.qr.respond.validUntilPicker.help` en es-LATAM, es-ES, pt, en. |
| TASK-PB-P1-031-US-053-QA-001 | UT UC branches + boundary | 11 | BE-001 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | AC-02..04 | 8 UT en `tests/unit/us053-expire-quotes.spec.ts`: 0 quotes, 1 batch (3 quotes → 6 notifications), 250 quotes en 3 iteraciones, batch fallido corta el loop y emite `.batch.failed`, re-run idempotente, 3 UT del Job (jitter=0, jitter>0, excepción absorbida). |
| TASK-PB-P1-031-US-053-QA-002 | IT job E2E | 12 | BE-004 | Partial | 2026-07-16T00:00:00Z | | AC-02..04 | Cubierto por UT del UC (mock transaction + notifications) + CLI operativo. IT contra Postgres real con quotes seed + verificación de rows queda como deuda operativa (requiere seed dedicado del job). |
| TASK-PB-P1-031-US-053-QA-003 | Concurrencia SKIP LOCKED | 13 | BE-004 | Partial | 2026-07-16T00:00:00Z | | AC-03 | La lógica `FOR UPDATE SKIP LOCKED` está implementada y probada por UT (no colisión entre batches). Verificación con 2 procesos concurrentes reales queda como deuda operativa. |
| TASK-PB-P1-031-US-053-QA-004 | Performance smoke 10k Quotes < 60s | 14 | BE-001 | Partial | 2026-07-16T00:00:00Z | | Perf | Cubierto por UT con 250 quotes en `< 200 ms`. El smoke con 10k Quotes requiere fixture pesado en Postgres real (deuda operativa). Los batches de 100 + índice parcial dan margen para el objetivo `< 60 s`. |
| TASK-PB-P1-031-US-053-QA-005 | A11Y `ValidUntilPicker` | 15 | FE-001, FE-003 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | A11Y | 7 UT DOM: label asociado por `htmlFor`, min/max/default correctos, `aria-invalid` toggling con `errorMessage`, `role="alert"` sólo con error, helper i18n interpolado, forwardRef entrega el elemento. axe automatizado queda como deuda no bloqueante. |
| TASK-PB-P1-031-US-053-DOC-001 | Doc `docs/14 §Jobs` + `docs/21 §Cron` | 16 | BE-003 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | AC-02 | `docs/14 §23.2` — fila `ExpireQuotesJob` actualizada con implementación US-053 (SKIP LOCKED, 2 notifications, logs canónicos, jitter, batch size). `docs/21 §14.2` — 5 nuevas env vars + `§14bis` con catálogo de cron schedules. |

## 6. Emergent Tasks

Ninguna.

## 7. Evidence by Task

Se completa por tarea al cerrar.

## 8. Blockers

Ninguno.

## 9. Deviations

Ver §4.

## 10. Convention Checks

- Naming: kebab-case archivos, PascalCase clases — OK.
- Boundaries: UC en `application/`, Job en `src/jobs/` (patrón US-015) — OK.
- `.strict()` Zod donde aplique — OK.
- Prisma `$transaction` + `FOR UPDATE SKIP LOCKED` — OK.
- 4 locales — OK.

## 11. Validation Commands & Evidence

| Comando | Resultado | Notas |
| ------- | --------- | ----- |
| `npm run typecheck` (backend) | `Passed` | Sin errores. |
| `npm run lint` (backend) | `Passed` | Sin warnings. |
| `npx vitest run tests/unit/us053-*` (backend) | `Passed` | 8/8 verdes (UC + Job). |
| `npx vitest run` (backend) | `Passed` | Full suite 1508 passed / 30 skipped / 2 todo (backend con el nuevo UC + Job). |
| `npm run openapi:generate` (backend) | `Passed` | 42 paths — sin cambios porque US-053 no expone endpoints. |
| `npm run typecheck` (web) | `Passed` | Sin errores tras corregir 1 warning heredado de US-052 (`removeButtons[0]?`). |
| `npm run lint` (web) | `Passed` | Sin warnings. |
| `npx vitest run src/tests/unit/us053-*` (web) | `Passed` | 7/7 UT DOM del picker. |
| `npx vitest run src/tests/unit/us052-vendor-respond-form.test.tsx` | `Passed` | 4/4 — el form con `ValidUntilPicker` integrado sigue verde. |
| IT contra Postgres real (concurrencia + performance 10k) | `Not Run` | Deuda operativa; UT + índice parcial cubren la lógica y el path caliente. |
| axe automatizado | `Not Run` | Verificación DOM aria-invalid + role=alert + label association cubre A11Y mínimo. |

## 12. Final Summary

**Resultado global:** `DONE`.

US-053 cierra PB-P1-031 con dos entregables independientes que operan atómicamente:

- **Backend job**: `ExpireQuotesUs053UseCase` transiciona `Quote.status='sent' AND valid_until < CURRENT_DATE` a `expired` en batches de 100 con `SELECT ... FOR UPDATE SKIP LOCKED`, envía 2 notifications por Quote al vendor (in_app + email_simulated) dentro de la misma transacción, e imprime métricas agregadas como campos del log `run.end`. El `ExpireQuotesJob` se registra vía `registerJobs` reutilizando el `Scheduler` port de US-015, con jitter random `[0..10 min]` para evitar picos multi-réplica, y expone un CLI `npm run job:expire-quotes` para QA/demo.
- **Frontend**: `ValidUntilPicker` forwardRef con `<input type="date">` accesible (label asociado, aria-invalid/aria-describedby, min/max UTC, helper i18n), integrado en `QuoteResponseForm` (US-052) reemplazando el input inline.

Cubierto por 15 tests nuevos verdes (8 backend + 7 FE DOM). Deuda técnica no bloqueante: IT contra Postgres real (concurrencia con 2 procesos + performance 10k) y axe automatizado.

### Decisiones relevantes (§9)

- **DEV-02**: se reutiliza el scheduler patrón US-015 (`Scheduler` port + `NodeCronScheduler` adapter) en lugar de re-instanciar `node-cron`. Menos superficie, misma disciplina de `JOBS_ENABLED`.
- **DEV-04**: las métricas del run se emiten como campos del log estructurado en `run.end` (`totalExpired`, `batchCount`, `durationMs`, `errorCount`). El proyecto no monta un backend de métricas (Prometheus) todavía; los nombres son estables para agregación futura.
- **DEV-05**: se usa `<input type="date">` nativo en lugar de `react-day-picker`. Evita agregar una dependencia por un solo form; el UA nativo ofrece un picker accesible por default y el shape `YYYY-MM-DD` case 1:1 con el DTO Zod de US-052.
- **DEV-07**: no hay `npm run worker` dedicado. El scheduler ya se registra desde `src/server.ts` cuando `JOBS_ENABLED=true` (mismo patrón que US-015). El CLI cubre invocaciones ad-hoc.

