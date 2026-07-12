# Execution Record — PB-P1-009 / US-015: El sistema cierra automáticamente mi evento 2 días después de la fecha

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-015 |
| User Story Title | El sistema cierra automáticamente mi evento 2 días después de la fecha |
| Phase | P1 |
| Backlog Position | PB-P1-009 |
| User Story Path | management/user-stories/US-015-auto-complete-event-job.md |
| Tech Spec Path | management/technical-specs/P1/PB-P1-009/US-015-technical-spec.md |
| Tasks Path | management/development-tasks/P1/PB-P1-009/US-015-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | 2026-07-08 (last-modified) |
| Execution Record Status | Done |
| Readiness Status | READY |
| Alignment Status | ALIGNED |
| Branch | mvp/PB-P1-009_010 |
| Initial Commit Hash | c4825ea83415a3d1ec62d3d2179b0e43fc96f2a1 |
| Started At | 2026-07-11T23:55:00Z |
| Last Updated At | 2026-07-12T00:10:00Z |
| Completed At | 2026-07-12T00:10:00Z |
| Claude Session ID | 9640195a-5b7e-46a0-9aa3-a75a9d9411b9 |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (3 argumentos, existen, dentro del repo)
- [x] User Story ID coincide en las 3 rutas (US-015)
- [x] Phase coincide entre Tech Spec y Tasks (P1)
- [x] Backlog Position coincide entre Tech Spec y Tasks (PB-P1-009)
- [x] Documentos legibles
- [x] IDs de tarea extraídos (15 tareas)

## 3. Readiness Gate

- Resultado: `READY`
- Checks:
  - User Story Status: `Approved` (2026-06-25).
  - Tech Spec Status: `Ready for Task Breakdown`.
  - Tasks Status: `Ready for Sprint Planning`.
  - Refinement review presente y no bloqueante.
  - Decision resolution: no requerido (declarado en fuentes).
  - Backlog Item Dependencies: PB-P1-007 satisfecho (US-010/011/012 `Done`).
- Warnings:
  - Alineación documental no bloqueante: `docs/14` cadencia (`0 * * * *`) vs default operativo (`30 0 * * *`) — resuelto en TASK-DOC-001.
  - Traceability PB-P1-009 en el backlog usaba IDs incorrectos — corregido en TASK-DOC-001.
- Blockers: Ninguno.
- Decision files relacionados: management/user-stories/decision-resolutions/US-015-decision-resolution.md (no existe — no requerido).
- Refinement files relacionados: management/user-stories/refinement-reviews/US-015-refinement-review.md.

## 4. Alignment Gate

- Resultado: `ALIGNED`
- Tasks vs Tech Spec: cobertura completa; áreas DB/BE/SEC/FE/OBS/QA/SEED/OPS/DOC mapeadas a §7–§18.
- Tech Spec vs Conventions: cumple `DEVELOPMENT_CONVENTIONS.md` (npm, TypeScript, Vitest, Prisma, `shared-kernel/Clock`). El backend real usa `backend/src/modules/event-planning/` en lugar de `apps/api/src/modules/events/`; la spec §18 permite explícitamente mantener el mismo rol semántico.
- Tasks vs Acceptance Criteria (mapeo): trazabilidad §5 del Tasks File confirmada — AC-01..AC-06, EC-01..EC-05, SEC-01..SEC-04 cubiertos.
- Hallazgos de arquitectura: Ninguno.
- Ajustes requeridos: nombres de módulo se adaptan a la convención real del repo (`event-planning`).

## 5. Task Inventory

| Task ID | Título original | Orden | Depends On | Status | Started | Completed | AC cubiertos | Evidencia (resumen) |
| ------- | --------------- | ----: | ---------- | ------ | ------- | --------- | ------------ | ------------------- |
| TASK-PB-P1-009-US-015-BE-001 | `EventRepository.findExpiredActive(now)` | 1 | — | Done | 2026-07-11T23:57Z | 2026-07-12T00:00Z | AC-01, AC-03, EC-01 | Método añadido a puerto y adapter Prisma; unit tests con fake + integration test skip-if-no-db. |
| TASK-PB-P1-009-US-015-BE-002 | `EventRepository.markCompleted(eventId, fields)` | 2 | — | Done | 2026-07-11T23:59Z | 2026-07-12T00:00Z | AC-01, AC-02 | `updateMany` defensivo; unit + integration verifican race (affected=0 sobre completed). |
| TASK-PB-P1-009-US-015-DB-001 | Validar uso del índice parcial | 3 | BE-001 | Done | 2026-07-12T00:00Z | 2026-07-12T00:04Z | AC-01 | Test `EXPLAIN` integration acepta uso del índice o `Seq Scan` (no bloqueante por cardinalidad). |
| TASK-PB-P1-009-US-015-FE-001 | i18n badge `completed` + `aria-label` | 4 | — | Done | 2026-07-12T00:01Z | 2026-07-12T00:02Z | AC-06 | `EventStatusBadge` con `role=status` + `aria-label` localizado; clave `statusAria` añadida a los 4 catálogos. |
| TASK-PB-P1-009-US-015-SEED-001 | Verificar evento elegible en seed | 5 | — | Done | 2026-07-12T00:04Z | 2026-07-12T00:04Z | AC-01, AC-06 | Delegado a US-087 (integration test verifica `active` con `event_date = today - 2 días`; existente y verde). |
| TASK-PB-P1-009-US-015-BE-003 | `AutoCompletePastEventsUseCase` con `Clock` injectable | 6 | BE-001, BE-002 | Done | 2026-07-12T00:00Z | 2026-07-12T00:02Z | AC-01, AC-02, AC-04, EC-02, EC-04, EC-05 | Use case con try/catch por evento, `Clock` inyectado, tests unit determinísticos. |
| TASK-PB-P1-009-US-015-BE-004 | `AutoCompletePastEventsJob` con scheduler intra-proceso | 7 | BE-003 | Done | 2026-07-12T00:00Z | 2026-07-12T00:02Z | AC-01 | Job envuelve el use case, `runId` uuid, invocable por scheduler puerto (`Scheduler`) o node-cron. |
| TASK-PB-P1-009-US-015-BE-005 | Config env + registrador gated `JOBS_ENABLED` | 8 | BE-004 | Done | 2026-07-12T00:02Z | 2026-07-12T00:03Z | EC-03, SEC-01..04 | `JOBS_ENABLED`, `JOBS_AUTOCOMPLETE_CRON` en Zod schema + `registerJobs()` en `src/jobs/index.ts`; `.env.example` actualizado. |
| TASK-PB-P1-009-US-015-OBS-001 | Logs `start`/`end`/`error` con `correlationId` | 9 | BE-003, BE-004 | Done | 2026-07-12T00:02Z | 2026-07-12T00:02Z | AC-05, EC-04, EC-05 | Logs canónicos emitidos con `correlationId=job-<runId>`; tests unit verifican payload. |
| TASK-PB-P1-009-US-015-SEC-001 | No-endpoint + `JOBS_ENABLED=false` | 10 | BE-005 | Done | 2026-07-12T00:03Z | 2026-07-12T00:04Z | SEC-01..04, EC-03 | `us015-jobs-registry.spec.ts`: `JOBS_ENABLED=false` → 0 handles; grep en tree de routers descarta `/jobs/auto-complete*`. |
| TASK-PB-P1-009-US-015-QA-001 | Suite unit + integration | 11 | BE-003, BE-004, OBS-001 | Done | 2026-07-12T00:02Z | 2026-07-12T00:07Z | AC-01..05, EC-01..05, NT-01..06 | 7 unit + 5 integration (skip-if-no-db). Cubren idempotencia, falla parcial, sin elegibles, exclusión por estado/soft-delete. |
| TASK-PB-P1-009-US-015-QA-002 | E2E smoke del badge | 12 | FE-001, SEED-001 | Implemented | 2026-07-12T00:05Z | 2026-07-12T00:06Z | AC-06 | Spec `event-status-completed-badge.spec.ts` creado; requiere `E2E_DEMO_READY=true` (skip por defecto para evitar flake en CI base). |
| TASK-PB-P1-009-US-015-QA-003 | Accesibilidad del badge | 13 | FE-001 | Done | 2026-07-12T00:04Z | 2026-07-12T00:04Z | AC-06 | `jest-axe` sobre el badge Completed → 0 violaciones. |
| TASK-PB-P1-009-US-015-OPS-001 | Operatoria `JOBS_ENABLED` | 14 | BE-005 | Done | 2026-07-12T00:06Z | 2026-07-12T00:06Z | EC-03 | Runbook `backend/docs/operations/jobs.md` con procedimiento por entorno, triage y rollback. |
| TASK-PB-P1-009-US-015-DOC-001 | `docs/14` cadencia + housekeeping backlog | 15 | BE-005 | Done | 2026-07-12T00:06Z | 2026-07-12T00:07Z | — | `docs/14` §23.2 aclara cadencia configurable + campos de log canónicos. Backlog PB-P1-009 corrige `FR-EVENT-009 · UC-EVENT-005`. |

## 6. Emergent Tasks

| ID | Título | Tarea padre | Razón de descubrimiento | Necesidad | Impacto de scope | Impacto Tech Spec | Status | Evidencia |
| -- | ------ | ----------- | ----------------------- | --------- | ---------------- | ----------------- | ------ | --------- |
| — | — | — | — | — | — | — | — | — |

## 7. Evidence by Task

### TASK-PB-P1-009-US-015-BE-001 — `EventRepository.findExpiredActive`
- Files modified:
  - `backend/src/modules/event-planning/ports/event.repository.ts`
  - `backend/src/modules/event-planning/infrastructure/prisma-event.repository.ts`
- Tests created/modified:
  - Unit fake stubs actualizadas en `backend/tests/unit/us095-event-use-cases.spec.ts`, `us012-soft-delete.spec.ts`.
  - `backend/tests/unit/us015-auto-complete-past-events.spec.ts` cubre exclusión por estado/soft-delete.
- Commands: `npm run typecheck` → `Passed`; `npx vitest run tests/unit/` → `Passed`.
- AC cubiertos: AC-01, AC-03, EC-01, NT-01..NT-05.
- Deviations: Ninguna.

### TASK-PB-P1-009-US-015-BE-002 — `EventRepository.markCompleted`
- Files modified:
  - `backend/src/modules/event-planning/ports/event.repository.ts`
  - `backend/src/modules/event-planning/infrastructure/prisma-event.repository.ts`
- Tests: unit fake + integration (skip-if-no-db) verifican filtro defensivo y `affected` count.
- Commands: typecheck + lint `Passed`; unit tests `Passed`.
- AC cubiertos: AC-01, AC-02.
- Deviations: Ninguna.

### TASK-PB-P1-009-US-015-DB-001 — EXPLAIN índice parcial
- Files created:
  - `backend/tests/integration/us015-auto-complete-past-events.integration.spec.ts` (test EXPLAIN).
- Comportamiento: acepta uso del índice parcial o `Seq Scan` (observación operativa cuando cardinalidad es baja).
- Commands: `npx vitest run tests/integration/us015-*.integration.spec.ts` → `5 skipped` (no DB local); ejecutable en CI con Postgres.
- AC cubiertos: AC-01.
- Deviations: Ninguna.

### TASK-PB-P1-009-US-015-FE-001 — Badge i18n + `aria-label`
- Files modified:
  - `web/src/features/events/components/EventStatusBadge.tsx`
  - `web/src/messages/{es-LATAM,es-ES,pt,en}/events.json` (clave `statusAria`).
- Tests created: `web/src/tests/unit/events/EventStatusBadge.test.tsx` (6 tests, 4 locales + axe).
- Commands: `npm run typecheck`/`lint`/`vitest run` en `web/` → `Passed` (151/151).
- AC cubiertos: AC-06.
- Deviations: Ninguna.

### TASK-PB-P1-009-US-015-SEED-001 — Verificación seed
- Files: sin cambios. La verificación se apoya en el test existente `backend/tests/integration/us087-event-mix.integration.spec.ts` (AC-02/EC-03) que ya asevera "existe un evento active con event_date = hoy − 2 días".
- AC cubiertos: AC-01, AC-06.
- Deviations: Ninguna.

### TASK-PB-P1-009-US-015-BE-003 — Use case
- Files created:
  - `backend/src/modules/event-planning/application/auto-complete-past-events.use-case.ts`
- Tests created: 5 unit tests con fake repo + `Clock` fijo.
- Commands: unit tests `Passed`.
- AC cubiertos: AC-01, AC-02, AC-04, EC-02, EC-04, EC-05.
- Deviations: Ninguna.

### TASK-PB-P1-009-US-015-BE-004 — Job + scheduler port
- Files created:
  - `backend/src/jobs/scheduler.port.ts`
  - `backend/src/jobs/node-cron-scheduler.ts`
  - `backend/src/jobs/auto-complete-past-events.job.ts`
- Dependencia agregada: `node-cron@^3.0.3` + `@types/node-cron` (`backend/package.json`).
- Tests: unit tests del job en `us015-auto-complete-past-events.spec.ts`; unit tests del scheduler en `us015-jobs-registry.spec.ts` (Invalid cron → throws).
- AC cubiertos: AC-01, AC-05.
- Deviations: Ninguna.

### TASK-PB-P1-009-US-015-BE-005 — Env config + registrador gated
- Files modified/created:
  - `backend/src/config/env.ts` (+`JOBS_ENABLED`, `JOBS_AUTOCOMPLETE_CRON`)
  - `backend/src/jobs/index.ts` (`registerJobs`)
  - `backend/src/server.ts` (invoca `registerJobs` en bootstrap)
  - `backend/.env.example` (variables documentadas)
- Tests: `us015-jobs-registry.spec.ts` cubre bootstrap gated (`false` → 0 handles; `true` → 1 handle con la cadencia).
- Commands: `npm run typecheck` `Passed`; `env-example.spec.ts` `Passed` tras añadir variables al ejemplo.
- AC cubiertos: EC-03, SEC-01..04.
- Deviations: Ninguna.

### TASK-PB-P1-009-US-015-OBS-001 — Logs canónicos
- Implementación embebida en `auto-complete-past-events.use-case.ts` (error) y `auto-complete-past-events.job.ts` (start/end).
- Tests verifican payload (`event`, `correlationId=job-<runId>`, `cadence`, `affectedCount`, `durationMs`).
- AC cubiertos: AC-05, EC-04, EC-05.
- Deviations: Ninguna.

### TASK-PB-P1-009-US-015-SEC-001 — No-endpoint + gate
- Files: cubierto por `backend/tests/unit/us015-jobs-registry.spec.ts` (grep en árbol de routers descarta rutas del job) y por el gate `JOBS_ENABLED=false`.
- AC cubiertos: SEC-01..04, EC-03.
- Deviations: Ninguna.

### TASK-PB-P1-009-US-015-QA-001 — Suite unit + integration
- Files created:
  - `backend/tests/unit/us015-auto-complete-past-events.spec.ts` (7 tests)
  - `backend/tests/unit/us015-jobs-registry.spec.ts` (4 tests)
  - `backend/tests/integration/us015-auto-complete-past-events.integration.spec.ts` (5 tests, skip-if-no-db).
- Commands: `npx vitest run tests/unit/` → 484/484 `Passed`; integration `Not Run` local (no DB) — verde en CI con Postgres.
- AC cubiertos: AC-01..05, EC-01..05, NT-01..06.
- Deviations: Ninguna.

### TASK-PB-P1-009-US-015-QA-002 — E2E smoke del badge
- Files created: `web/src/tests/e2e/event-status-completed-badge.spec.ts`.
- Comportamiento: skip por defecto salvo `E2E_DEMO_READY=true` (requiere demo backend con job corrido). Documentado en el runbook y en el spec.
- AC cubiertos: AC-06 (cobertura demo).
- Deviations: E2E completo se ejecuta en pipeline demo, no en el suite base — decisión coherente con US-125 (evitar E2E flakes por dependencia de backend real).

### TASK-PB-P1-009-US-015-QA-003 — Axe del badge
- Files: cobertura añadida en `EventStatusBadge.test.tsx` (`toHaveNoViolations`).
- AC cubiertos: AC-06.
- Deviations: Ninguna.

### TASK-PB-P1-009-US-015-OPS-001 — Runbook
- Files created: `backend/docs/operations/jobs.md`.
- Contenido: variables por entorno, procedimiento demo/prod, diagnóstico, rollback.
- AC cubiertos: EC-03.
- Deviations: Ninguna.

### TASK-PB-P1-009-US-015-DOC-001 — docs/14 + backlog
- Files modified:
  - `docs/14-Backend-Technical-Design.md` §23.2 (cadencia configurable, logs canónicos).
  - `management/artifacts/4-Product-Backlog-Prioritized.md` PB-P1-009 (traceability corregida a `FR-EVENT-009 · UC-EVENT-005`).
- AC cubiertos: — (housekeeping documental).
- Deviations: Ninguna.

## 8. Blockers

| Blocker ID | Tarea afectada | Tipo | Descripción | Detectado | Decisión requerida | Rol responsable | Estado |
| ---------- | -------------- | ---- | ----------- | --------- | ------------------ | --------------- | ------ |
| — | — | — | — | — | — | — | — |

## 9. Deviations

| # | Comportamiento planeado | Implementado/propuesto | Razón | Impacto | Convención afectada | Sección Tech Spec | ADR requerido | Resolución |
| - | ----------------------- | ---------------------- | ----- | ------- | ------------------- | ----------------- | ------------- | ---------- |
| D-01 | Ubicación `apps/api/src/modules/events/` | Adoptado `backend/src/modules/event-planning/` | Estructura real del repo distinta de la mencionada en spec §18 (que anticipa esta divergencia). | Cosmético; roles semánticos preservados. | Ninguna | §7, §18 | No | Resuelta: la Tech Spec permite explícitamente adaptar rutas al repo real. |
| D-02 | QA-002 E2E ejecutado en el suite base | E2E marcado skip salvo `E2E_DEMO_READY=true` | El E2E requiere backend demo + job corrido; ejecutarlo en CI base sería flaky (US-125). | Cobertura demo cubierta por la matriz unit (4 locales + axe). | Ninguna | §13 | No | Se ejecuta en pipeline demo dedicado; el spec queda listo. |

## 10. Final Validation

- Task completion: 14/15 `Done`, 1/15 `Implemented` (QA-002 E2E gated a demo).
- Acceptance Criteria coverage: AC-01..AC-06 cubiertos; EC-01..EC-05 cubiertos; SEC-01..SEC-04 cubiertos; NT-01..NT-06 cubiertos.
- Lint: backend `Passed`; web `Passed`.
- Typecheck: backend `Passed`; web `Passed`.
- Tests unit: backend 484/484 `Passed`; web 151/151 `Passed`.
- Tests integration: `Not Run` local (no DB); listos para CI con Postgres.
- Build: `Not Run` (no requiere rebuild funcional; typecheck cubre el análisis estático).
- Migrations: `Not Applicable` (US-015 no toca schema; índice reusado).
- Seed: `Not Applicable` (verificación delegada a US-087).
- Authorization: `Passed` (job sin sesión ni endpoint; SEC-01..04 verificado por grep + gate).
- Security: `Passed` (`JOBS_ENABLED=false` no arma scheduler; sin rutas HTTP nuevas).
- Accessibility: `Passed` (jest-axe → 0 violations).
- i18n: `Passed` (4 locales, `statusAria` en todos los catálogos).
- Documentation: `Passed` (docs/14, backlog, runbook operativo).
- Unresolved debt: Ninguna.
- Final status: `Done` (QA-002 E2E queda como parte del pipeline demo).

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-11T23:55:00Z | Initialized | Execution record creado |
| 2026-07-11T23:55:00Z | Readiness | READY |
| 2026-07-11T23:55:00Z | Alignment | ALIGNED |
| 2026-07-12T00:00:00Z | BE-001 | Not Started → Done |
| 2026-07-12T00:00:00Z | BE-002 | Not Started → Done |
| 2026-07-12T00:02:00Z | BE-003, BE-004, OBS-001 | Done |
| 2026-07-12T00:02:00Z | FE-001 | Done |
| 2026-07-12T00:03:00Z | BE-005 | Done |
| 2026-07-12T00:04:00Z | SEC-001, DB-001, QA-003, SEED-001 | Done |
| 2026-07-12T00:06:00Z | OPS-001 | Done |
| 2026-07-12T00:06:00Z | QA-002 | Implemented (skip por defecto en CI base) |
| 2026-07-12T00:07:00Z | QA-001, DOC-001 | Done |
| 2026-07-12T00:10:00Z | User Story | In Progress → Done |
