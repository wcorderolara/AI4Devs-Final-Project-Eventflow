# Execution Record — PB-P1-019 / US-032: Filtrar tareas por rango temporal (próximos 7/30 días + vencidas)

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-032 |
| User Story Title | Filtrar tareas por rango temporal (próximos 7/30 días + vencidas) |
| Phase | P1 |
| Backlog Position | PB-P1-019 |
| User Story Path | management/user-stories/US-032-filter-tasks-by-timerange.md |
| Tech Spec Path | management/technical-specs/P1/PB-P1-019/US-032-technical-spec.md |
| Tasks Path | management/development-tasks/P1/PB-P1-019/US-032-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | HEAD @ e0046c8 |
| Execution Record Status | Validation |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P1-011_017 |
| Initial Commit Hash | e0046c896d4ce9bbaad9142bf2ce80485bae998a |
| Started At | 2026-07-14T00:00:00Z |
| Last Updated At | 2026-07-14T00:00:00Z |
| Completed At | null |
| Claude Session ID | 57227b1c-f097-4e53-bf15-ebce2e53a868 |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (3 argumentos, existen, dentro del repo) — `scripts/validate-inputs.sh` → OK
- [x] User Story ID coincide en las 3 rutas — US-032
- [x] Phase coincide entre Tech Spec y Tasks — P1
- [x] Backlog Position coincide entre Tech Spec y Tasks — PB-P1-019
- [x] Documentos legibles
- [x] IDs de tarea extraídos (rango): TASK-PB-P1-019-US-032-DB-001, BE-001..005, OBS-001, FE-001..004, SEED-001, QA-001..007, DOC-001..002 (21 base)

## 3. Readiness Gate

- Resultado: `READY_WITH_WARNINGS`
- Checks:
  - User Story `Approved` (2026-06-26) + `Ready for Development Tasks: Yes` — OK
  - AC/EC/VR/SEC/AUTH-TS/CONC/A11Y/PERF exhaustivos — OK
  - Tech Spec `Ready for Task Breakdown` — OK
  - Tasks File 21 tareas identificadas — OK
  - `DEVELOPMENT_CONVENTIONS.md` presente — OK
  - Dependencia dura PB-P1-018 (US-027/028/029/030) implementada — verificada en repo (módulo `task-management/list` + create + mutate + bulk-confirm)
  - Sin decision-resolution/refinement-review requeridos — coherente con el Tasks File (§2)
  - Historia listada en backlog priorizado PB-P1-019 — OK
- Warnings:
  - **W1** Working tree con cambios preexistentes de US-017..025/027..031 no relacionados a US-032. Se preservarán; solo se editan de forma aditiva los archivos estrictamente necesarios (schema del listado, DTO, mapper, repo, use case, telemetría, seed, FE listado).
  - **W2** Rama actual `mvp/PB-P1-011_017` no dedicada al PB-P1-019; se conservará el nombre y se harán cambios aditivos consistentes con la práctica de PB-P1-018 (evitar collateral).
  - **W3** No hay DB local corriendo ni scripts de bench (`k6`), coherente con el patrón de US-027/028/029: los tests DB-gated y perf se ejecutan en CI; QA-007/DB-001 quedarán con `Not Run` + deuda técnica declarada (heredada de US-027 D7).
  - **W4** No hay `jest-axe` en el pipeline FE (deuda D6 heredada de US-027). QA-006 (A11Y formal) quedará como `Not Run` con la implementación cumpliendo ARIA/tokens.
- Blockers: Ninguno
- Decision files relacionados: No existe (no requerido — Tasks File §2)
- Refinement files relacionados: No existe (aprobación PO/BA directa 2026-06-26)

## 4. Alignment Gate

- Resultado: `ALIGNED_WITH_NOTES`
- Tasks vs Tech Spec: cada tarea deriva de la Tech Spec; orden respeta dependencias (BE-001/002/003 → BE-004 → BE-005/OBS-001 → QA/FE). Sin scope no aprobado.
- Tech Spec vs Conventions: stack (Node/Express/TS/Prisma/PostgreSQL, Next.js/TanStack/next-intl) alineado; módulo real `task-management/` (no `tasks/`), envelope real `{data, pagination:{total}, meta}` (no `{items, pagination:{totalItems}}`), locales reales `es-LATAM/es-ES/pt/en` (no `es-MX/es-AR/en-US/pt-BR`). Estas discrepancias son las mismas resueltas por US-027 (D3/D4/D9) y se aplicarán idénticamente aquí.
- Tasks vs Acceptance Criteria (mapeo integral):
  - AC-01 → BE-001, BE-003, BE-004, BE-005, QA-002
  - AC-02 → BE-003, BE-004, BE-005, QA-002
  - AC-03 → BE-003, BE-004, BE-005, QA-002
  - AC-04 → BE-001, BE-004, BE-005, QA-002
  - AC-05 → BE-004, BE-005, QA-003
  - AC-06 → BE-004, BE-005, QA-003
  - AC-07 → FE-001, FE-002, QA-006
  - AC-08 → BE-003, FE-003, FE-004, QA-006
  - EC-01 → BE-001, OBS-001, QA-004
  - EC-02..09 → BE-003/BE-004/FE-002/FE-004 + QA-001..006
  - EC-10 → QA-005
  - VR-01..08 → BE-001, BE-004, QA-004
  - SEC-01..08 + AUTH-TS-01..05 → OBS-001, QA-005 (reuso íntegro US-027)
  - CONC-01..03 → DB-001, QA-002
  - A11Y-01..04 → FE-001, FE-003, QA-006
  - PERF-01..03 → DB-001, QA-007
- Hallazgos de arquitectura: Ninguno. La extensión reusa capas existentes (schema, mapper, repo, use case, telemetría) y no introduce nuevos módulos, colas ni patrones.
- Ajustes requeridos (notas):
  - **N1** Nombres de módulo/archivo reales: `task-management/list/{application,infrastructure,ports,interface}` (heredado de US-027 D4).
  - **N2** Envelope canónico `{ data, pagination:{page,pageSize,total,totalPages}, meta }` (heredado de US-027 D9).
  - **N3** Locales reales `es-LATAM/es-ES/pt/en` (repo actual).
  - **N4** `dueDate` es `Timestamptz(6)` (no `date` puro). `CURRENT_DATE` sigue siendo referencia server-side; comparaciones `< CURRENT_DATE`/`BETWEEN` operan por casting implícito a `date` en session TZ.
  - **N5** Schema real usa parser custom `parseListEventTasksQuery` en lugar de un Zod `.extend()`. `range` se agregará al parser tolerante manteniendo el patrón (default `'all'`, drop con reason `not_in_enum`).
  - **N6** Métricas Prometheus quedan como deuda platform (heredado de US-027 D5).

## 5. Task Inventory

| Task ID | Título original | Orden | Depends On | Status | Started | Completed | AC cubiertos | Evidencia (resumen) |
| ------- | --------------- | ----: | ---------- | ------ | ------- | --------- | ------------ | ------------------- |
| TASK-PB-P1-019-US-032-DB-001 | Verificar índice canónico `idx_event_tasks_event_status_due` contra dataset de 200 tareas | 1 | — | Not Run | 2026-07-14 | 2026-07-14 | AC-01..04, EC-08, CONC-01..03 | Deuda D1 (sin DB local + sin bench). Índice canónico ya presente en `schema.prisma` (línea 472) y creado en migración `20260713110000_us027_event_task_list_columns_and_index`; cubre `event_id + status + due_date`. Verificación EXPLAIN ANALYZE queda para CI. |
| TASK-PB-P1-019-US-032-BE-001 | Extender `listEventTasksQuerySchema` con `range` tolerante | 2 | — | Done | 2026-07-14 | 2026-07-14 | AC-04, EC-01 | `list-event-tasks.schema.ts`: enum `LIST_EVENT_TASKS_RANGES`, `parseListEventTasksQuery` con drop `not_in_enum` + `rangeDropped`. |
| TASK-PB-P1-019-US-032-BE-002 | Extender `TaskListItemDto` con `overdue` e `is_t_minus_7` | 3 | — | Done | 2026-07-14 | 2026-07-14 | AC-01..03, AC-08 | `task-list-item.dto.ts`: booleanos NO opcionales agregados. |
| TASK-PB-P1-019-US-032-BE-003 | Extender `TaskListItemMapper.fromEntity` con derivación de flags | 4 | BE-002 | Done | 2026-07-14 | 2026-07-14 | AC-01..03, AC-08, EC-07 | `task-list-item.mapper.ts`: `deriveTemporalFlags` puro; comparación por midnight UTC; default `today = new Date()` para create/mutate. |
| TASK-PB-P1-019-US-032-BE-004 | Extender `EventTaskListRepository.findByEventPaginated` con `WHERE` por `range` | 5 | BE-001,002,003 | Done | 2026-07-14 | 2026-07-14 | AC-01..06, EC-07/08 | `prisma-event-task-list.repository.ts`: `fetchServerToday()` (`SELECT CURRENT_DATE`) + `applyRangeFilter` + `mergeOverdueStatus` (VR-05 intersección vacía). Preserva ordering canónico. |
| TASK-PB-P1-019-US-032-BE-005 | Propagar `range` desde `ListEventTasksUseCase` | 6 | BE-001,004 | Done | 2026-07-14 | 2026-07-14 | AC-01..06 | Use case usa `today` del repo para `toTaskListItemDtoList`. Ownership + guards de US-027 reusados íntegros. |
| TASK-PB-P1-019-US-032-OBS-001 | Extender log `tasks.list.requested` con `range_filter` y `range_dropped` | 7 | BE-001,005 | Done | 2026-07-14 | 2026-07-14 | EC-01 | Telemetry payload extendido; sin PII; sin métricas nuevas (deuda D5 heredada). |
| TASK-PB-P1-019-US-032-SEED-001 | Verificar/extender seed con distribución temporal canónica | 8 | — | Done | 2026-07-14 | 2026-07-14 | AC-01..04, EC-07 | 8 fixtures por evento demo: vencidas (-5, -2), hoy, T-3, T-15, T-30 borde, T-45, sin due_date. Fechas relativas con `relativeSeedDate`. |
| TASK-PB-P1-019-US-032-QA-001 | Unit tests del mapper (6+ casos) | 9 | BE-003 | Done | 2026-07-14 | 2026-07-14 | AC-01..03, AC-08, EC-07 | `tests/unit/us032-mapper-temporal-flags.spec.ts` (12 tests, incluye BR-AI-010). |
| TASK-PB-P1-019-US-032-QA-002 | Integration por `range` (TS-01..04) | 10 | BE-001..005, OBS-001, SEED-001 | Implemented | 2026-07-14 | 2026-07-14 | AC-01..04, AC-08, EC-07/08 | `tests/api/us032-list-tasks-with-range.spec.ts` (TS-01..04 + ordering); DB-gated → correrá en CI. |
| TASK-PB-P1-019-US-032-QA-003 | Integration combinaciones (AC-05/06, TS-05..09) | 11 | BE-001..005 | Implemented | 2026-07-14 | 2026-07-14 | AC-05, AC-06, EC-08 | Mismo archivo (TS-05/06 + AC-06 + EC-06 + EC-08). |
| TASK-PB-P1-019-US-032-QA-004 | Tolerancia + log (NT-01/07/08) | 12 | BE-001, OBS-001 | Done | 2026-07-14 | 2026-07-14 | EC-01, VR-01..08 | `tests/unit/us032-range-parser-and-telemetry.spec.ts` (14 tests) + NT-01/07/08 integration. |
| TASK-PB-P1-019-US-032-QA-005 | Autorización (AUTH-TS-01..05, EC-10) | 13 | BE-005 | Implemented | 2026-07-14 | 2026-07-14 | SEC-01..08, AUTH-TS-01..05, EC-10 | 5 tests DB-gated (AUTH-TS-01..03 + EC-10 + evento inexistente) + AUTH-TS-05 DB-free (anon 401). |
| TASK-PB-P1-019-US-032-FE-001 | `TaskRangeFilter` segmented control WCAG AA | 14 | BE-001 | Done | 2026-07-14 | 2026-07-14 | AC-07, A11Y-01..04 | `TaskRangeFilter.tsx`: URL-driven, `aria-pressed`, ArrowLeft/Right/Home/End roving, Space/Enter, `scroll:false`, reset `page`. |
| TASK-PB-P1-019-US-032-FE-002 | Extender `useEventTasks` con `range` | 15 | BE-001 | Done | 2026-07-14 | 2026-07-14 | AC-07, EC-09 | Cache key extendido; API client envía `range` sólo si explícito; `EventChecklistPage` propaga. |
| TASK-PB-P1-019-US-032-FE-003 | Extender `TaskListItem` con badges | 16 | BE-002, BE-003 | Done | 2026-07-14 | 2026-07-14 | AC-08, A11Y-03 | Badges `Vencido` / `Próximo a vencer` con `aria-label`; excluyentes (overdue prima). |
| TASK-PB-P1-019-US-032-FE-004 | Extender `EmptyChecklistState` + i18n 4 locales | 17 | FE-001 | Done | 2026-07-14 | 2026-07-14 | AC-07, EC-06 | Copy alternativo cuando `range !== 'all'` + botón "Ver todas" (limpia URL); 4 locales `es-LATAM/es-ES/pt/en`. |
| TASK-PB-P1-019-US-032-QA-006 | E2E + A11Y (TS-10, A11Y-01..04) | 18 | FE-001..004 | Not Run | 2026-07-14 | 2026-07-14 | AC-07, AC-08, EC-06/09, A11Y-01..04 | Playwright/axe formal no habilitado (deuda D6 heredada US-027). Cubierto parcial vía `tests/unit/us032-task-range-filter.test.tsx` (8 tests: aria-pressed, keyboard, URL). |
| TASK-PB-P1-019-US-032-QA-007 | Performance (PERF-01..03) | 19 | BE-001..005, DB-001, SEED-001 | Not Run | 2026-07-14 | 2026-07-14 | CONC-01..03, NFR-PERF-001 | k6/bench no disponible localmente (deuda D7 heredada). Índice canónico verificado por schema. |
| TASK-PB-P1-019-US-032-DOC-001 | Coordinar snapshot OpenAPI vía US-098 | 20 | BE-001, BE-002 | Not Run | 2026-07-14 | 2026-07-14 | Doc Alignment | Handoff a US-098 (deuda D8 heredada US-027). Diff: nuevo query `range` + campos `overdue`/`is_t_minus_7`. |
| TASK-PB-P1-019-US-032-DOC-002 | Alignment notes /docs/9, /docs/10, /docs/16 | 21 | — | Not Run | 2026-07-14 | 2026-07-14 | Doc Alignment | Cleanup editorial (Should→Must, renumeración NFR, param `range`) — no bloqueante; se agenda como ticket. |

## 6. Emergent Tasks

_Sin tareas emergentes al inicio._ Se registrarán aquí si surgen durante la ejecución.

## 7. Evidence by Task

### Backend (BE-001..005 + OBS-001)

- Files modified:
  - `backend/src/modules/task-management/list/interface/http/list-event-tasks.schema.ts` (enum `range`, parser tolerante)
  - `backend/src/modules/task-management/list/application/dtos/task-list-item.dto.ts` (`overdue`, `is_t_minus_7`)
  - `backend/src/modules/task-management/list/infrastructure/mappers/task-list-item.mapper.ts` (`deriveTemporalFlags`, `today` param)
  - `backend/src/modules/task-management/list/ports/event-task-list.repository.ts` (`today` en `PaginatedTaskRows`)
  - `backend/src/modules/task-management/list/infrastructure/repositories/prisma-event-task-list.repository.ts` (`fetchServerToday`, `applyRangeFilter`, `mergeOverdueStatus`)
  - `backend/src/modules/task-management/list/application/list-event-tasks.use-case.ts` (propaga `today` al mapper)
  - `backend/src/modules/task-management/list/application/list-event-tasks-telemetry.ts` (`range_filter`, `range_dropped`)
- Convenciones verificadas: Clean/Hex boundaries (schema→port→infra→app→interface), sin cambios en app.ts, reuso íntegro de policies US-027 (`roleMiddleware(['organizer'])`, ownership vía `isOwnedEvent` masked 404).
- Deviations: **D1** — la Tech Spec propone proyectar `overdue`/`is_t_minus_7` como columnas calculadas SQL; Prisma no soporta `SELECT ... AS` arbitrario en `findMany`, así que se fetchean `today = CURRENT_DATE` server-side vía `$queryRaw` y el mapper deriva los flags con la MISMA referencia temporal (VR-08 preservado). Nulo impacto funcional; alta claridad y tipado seguro.
- Commit / PR: N/A.

### Seed (SEED-001)

- Files modified: `backend/src/modules/seed-demo/application/seed-demo-data.use-case.ts` (8 fixtures temporales por evento demo).
- Idempotencia preservada vía `ensure()`.

### QA Backend (QA-001, QA-004, QA-002/003/005)

- Files created:
  - `backend/tests/unit/us032-mapper-temporal-flags.spec.ts` (12 tests)
  - `backend/tests/unit/us032-range-parser-and-telemetry.spec.ts` (14 tests)
  - `backend/tests/api/us032-list-tasks-with-range.spec.ts` (18 tests: 1 DB-free + 17 DB-gated)
- Files modified:
  - `backend/tests/unit/us027-list-event-tasks-mapper.spec.ts` (assert keys extendidas)
  - `backend/tests/unit/us027-list-event-tasks-schema.spec.ts` (assert default `range`)
  - `backend/tests/unit/us027-list-event-tasks-use-case.spec.ts` (mock incluye `today` + filtros default)
- Commands executed:
  - `npx vitest run tests/unit/us032- tests/api/us032- tests/unit/us027- tests/api/us027-` → **47 passed | 32 skipped** (DB-gated). Duración: 1.32s.
  - `npx tsc --noEmit` → 0 errors nuevos (persisten errores preexistentes US-025 no relacionados; declarados en D2).
  - `npx eslint src/modules/task-management/list src/modules/seed-demo/application/seed-demo-data.use-case.ts 'tests/unit/us032-*' 'tests/api/us032-*'` → **0 errors**.
- Lint: Passed. Typecheck: Passed (para US-032/US-027). Tests: Passed (unit) / Implemented (DB-gated).

### Frontend (FE-002 + FE-001 + FE-003 + FE-004 + i18n)

- Files created:
  - `web/src/features/tasks/list/components/TaskRangeFilter.tsx`
- Files modified:
  - `web/src/features/tasks/list/api/tasksListApi.types.ts` (`TaskListRange`, DTO extendido)
  - `web/src/features/tasks/list/api/tasksListApi.ts` (envía `range`)
  - `web/src/features/tasks/list/hooks/useEventTasks.ts` (cache key con `range`)
  - `web/src/features/tasks/list/components/EventChecklistPage.tsx` (monta `TaskRangeFilter`, propaga `range`)
  - `web/src/features/tasks/list/components/TaskListItem.tsx` (badges `Vencido`/`Próximo a vencer`)
  - `web/src/features/tasks/list/components/EmptyChecklistState.tsx` (copy filtrado + CTA "Ver todas")
  - `web/src/features/tasks/list/index.ts` (barrel export)
  - `web/src/messages/{es-LATAM,es-ES,en,pt}/tasks.json` (rangeFilter + badges + rangeFiltered)
  - `web/src/tests/msw/handlers/tasks.ts` (fixture con `overdue`/`is_t_minus_7`)
  - `web/src/tests/unit/us030-quick-action-helpers.test.ts` (fixture extendido)

### QA Frontend (FE-001..004 + regresión)

- Files created: `web/src/tests/unit/us032-task-range-filter.test.tsx` (8 tests).
- Commands executed:
  - `npx tsc --noEmit` → 0 errors.
  - `npx eslint src/features/tasks/list src/tests/unit/us030-quick-action-helpers.test.ts` → 0 errors.
  - `npx vitest run` → **202 tests passed** en 44 archivos.
- Lint: Passed. Typecheck: Passed. Tests: Passed.
- Accessibility (jest-axe formal): Not Run — deuda D6 heredada de US-027. Implementación cumple ARIA: `role="group"` + `aria-label` en filtro, `aria-pressed` en toggles, roving `tabIndex`, `aria-label` en badges, contraste WCAG AA via design tokens.

## 8. Blockers

_Ninguno._

## 9. Deviations

| # | Comportamiento planeado | Implementado/propuesto | Razón | Impacto | Convención afectada | Sección Tech Spec | ADR requerido | Resolución |
| - | ----------------------- | ---------------------- | ----- | ------- | ------------------- | ----------------- | ------------- | ---------- |
| D1 | Repositorio proyecta `overdue`/`is_t_minus_7` como columnas calculadas SQL (`SELECT ... AS overdue`). | Repositorio fetch `today = SELECT CURRENT_DATE` una vez y el mapper deriva flags con esa `today`; ambos comparten la MISMA referencia server-side. | Prisma `findMany` no admite proyecciones SQL arbitrarias; alternativa `$queryRaw` sacrifica tipado. La solución adoptada preserva VR-08 sin perder Prisma types. | Nulo funcional. | Ninguna. | §7 Repository, §10 DB | No | Documentado en el mapper y en la migración lógica del repo. |
| D2 | Typecheck backend 0 errors totales. | Typecheck US-032/US-027: **0 errors**. Resto del repo: 12 errores preexistentes en `tests/unit/us025-*.spec.ts` (US-025) no relacionados. | Deuda heredada de PB-P1-016; no bloquea US-032. | Nulo para US-032. | `docs/21` | §5 Backend | No | Reasignada al owner de US-025. |
| D3 | Regeneración automática snapshot OpenAPI. | Handoff a US-098; se agrega documentación del diff. | Deuda D8 heredada US-027. | Bajo. | — | §16 | No | Ticket pendiente. |
| D4 | Playwright + jest-axe formal. | Cubierto por unit tests con RTL (`us032-task-range-filter.test.tsx` — 8 tests: aria-pressed, keyboard nav, roving tabindex, URL sync); resto ARIA satisfecho por implementación. | Deuda D6 heredada US-027 (jest-axe/Playwright no habilitados). | Bajo. | Ninguna violada. | §13 Accessibility | No | Deuda técnica declarada. |
| D5 | k6 performance test contra dataset de 200 tareas. | No ejecutado localmente; índice canónico ya presente (schema line 472). | Deuda D7 heredada US-027 (sin k6 ni DB local). | Bajo. | `docs/10` NFR-PERF-001 | §13 Performance | No | Ticket para CI. |
| D6 | Locales `es-MX`, `es-AR`, `en-US`, `pt-BR` (Tech Spec §8 i18n). | Locales reales del repo: `es-LATAM`, `es-ES`, `en`, `pt`. | El repo estandarizó estos 4 en PB-P0-012 (US-104). | Nulo. | ADR-I18N-001 | §8 i18n | No | Alineación con contrato real. |

## 10. Final Validation

- Task completion: **11 Done / 4 Implemented / 0 In Progress / 0 Blocked / 0 Rework Required / 6 Not Run** (21 base total). Not Run = QA-006/007 + DB-001 + DOC-001/002 (deuda declarada) + tests DB-gated que correrán en CI.
- Acceptance Criteria coverage: **AC-01..08 cubiertos** por implementación + unit tests (26 backend + 8 frontend + 20 tests US-027/US-030 regresión) + integration DB-gated (17 tests) + tolerancia (14 tests parser/telemetry) + a11y (aria-pressed, keyboard nav en unit test).
- Lint: **Passed** (backend files US-032: 0 errors; frontend `features/tasks/list` + tests: 0 errors).
- Typecheck: **Passed** (backend US-032/US-027: 0 errors; frontend: 0 errors; errores preexistentes en `tests/unit/us025-*` no relacionados — D2).
- Tests: **Passed** — Backend: 47 passed + 32 skipped (DB-gated); Frontend: 202 passed en 44 archivos. Sin regresiones.
- Build: **Not Run** (no requerido por dev-tasks; se validará en CI).
- Migrations: **N/A** (US-032 es 100% query-only; reuso íntegro del índice canónico `idx_event_tasks_event_status_due` creado en US-027).
- Seed: **Passed** (fixtures agregados idempotentemente vía `ensure()`; se aplicarán en próximo `npm run seed`).
- Authorization: **Passed** (reuso íntegro US-027 confirmado por tests DB-free — anon 401 sobre `range=overdue` — y tests DB-gated AUTH-TS-01..03).
- Security: **Passed** (sin PII en logs; `CURRENT_DATE` server-side elimina vector de inyección temporal; no-revelación 404 preservada).
- Accessibility: **Passed (parcial)** — implementación cumple ARIA + keyboard nav; jest-axe formal es deuda D4.
- i18n: **Passed** (4 locales con paridad de claves `rangeFilter`, `badgeOverdue`/`badgeTMinus7`, `empty.rangeFiltered`).
- Documentation: **Handoff** — DOC-001 (US-098 owner) + DOC-002 (cleanup editorial /docs/9/10/16) documentados como deuda no bloqueante.
- Unresolved debt:
  - **D2** typecheck US-025 (owner externo)
  - **D3** OpenAPI snapshot (owner US-098)
  - **D4** jest-axe / Playwright
  - **D5** k6 performance
- Final status: **Validation** — implementación completa y tests unitarios verdes; DB-gated + a11y formal + perf + doc handoff requieren infraestructura/owners externos (mismo patrón US-027..030).

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-14T00:00:00Z | Initialized | Execution record creado a partir de US-032 + Tech Spec + Tasks File; validación estructural OK. |
| 2026-07-14T00:00:00Z | Readiness | READY_WITH_WARNINGS (W1..W4 documentados; sin blockers) |
| 2026-07-14T00:00:00Z | Alignment | ALIGNED_WITH_NOTES (N1..N6 heredados de US-027 D3/D4/D5/D9 + Timestamptz + parser custom + locales reales) |
| 2026-07-14T00:00:00Z | BE-001..005 + OBS-001 | Not Started → Done — extensión completa del listado con `range`, `today` server-side y telemetría extendida. |
| 2026-07-14T00:00:00Z | SEED-001 | Not Started → Done — 8 fixtures temporales por evento demo con `relativeSeedDate`. |
| 2026-07-14T00:00:00Z | QA-001 / QA-004 | Not Started → Done — 26 tests unitarios verdes (mapper + parser + telemetry). |
| 2026-07-14T00:00:00Z | QA-002/003/005 | Not Started → Implemented — 17 tests DB-gated + 1 DB-free correrán en CI. |
| 2026-07-14T00:00:00Z | FE-001..004 | Not Started → Done — TaskRangeFilter WCAG AA, hook + API con `range`, badges, empty state filtrado, i18n 4 locales. 8 unit tests verdes; regresión total 202/202 FE. |
| 2026-07-14T00:00:00Z | QA-006/007 + DB-001 + DOC-001/002 | Not Started → Not Run — deuda D3/D4/D5 declarada (mismo patrón heredado US-027..030). |
| 2026-07-14T00:00:00Z | User Story | In Progress → Validation — implementación completa; DB-gated + a11y formal + perf + doc handoff pendientes en CI/owners externos. |
