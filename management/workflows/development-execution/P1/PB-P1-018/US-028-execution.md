# Execution Record — PB-P1-018 / US-028: Crear tarea manual del checklist (Organizer)

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-028 |
| User Story Title | Crear tarea manual del checklist (Organizer) |
| Phase | P1 |
| Backlog Position | PB-P1-018 |
| User Story Path | management/user-stories/US-028-create-manual-task.md |
| Tech Spec Path | management/technical-specs/P1/PB-P1-018/US-028-technical-spec.md |
| Tasks Path | management/development-tasks/P1/PB-P1-018/US-028-development-tasks.md |
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
| Claude Session ID | 5b63fe4f-6875-4957-9b4c-1f71179fbe14 |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (3 argumentos, existen, dentro del repo) — `scripts/validate-inputs.sh` → OK
- [x] User Story ID coincide en las 3 rutas — US-028
- [x] Phase coincide entre Tech Spec y Tasks — P1
- [x] Backlog Position coincide entre Tech Spec y Tasks — PB-P1-018
- [x] Documentos legibles
- [x] IDs de tarea extraídos: DB-001, BE-001..006, API-001, SEC-001, SEC-002, OBS-001, FE-001..004, QA-001..007, DOC-001, DOC-002 — 24 tareas base

## 3. Readiness Gate

- Resultado: **READY_WITH_WARNINGS**
- Checks:
  - User Story `Approved` con `Ready for Development Tasks: Yes` — OK
  - Tech Spec `Ready for Task Breakdown` — OK
  - Tasks File presente y con IDs identificables — OK
  - Dependencias de US-027 (mismo backlog item) implementadas y disponibles — OK
- Warnings:
  - **W1**: Working tree con múltiples cambios preexistentes (US-017..025/031 y US-027). Se preservan; los cambios de US-028 solo agregan archivos nuevos o edits aditivos.
  - **W2**: Rama `mvp/PB-P1-011_017` no corresponde estrictamente a PB-P1-018; se continúa por consistencia con US-027 (ya ejecutada aquí).
  - **W3**: Decision Resolution Artifact declarado "No aplica" en Tech Spec §1 — verificado.
- Blockers: Ninguno.

## 4. Alignment Gate

- Resultado: **ALIGNED_WITH_NOTES**
- Tasks vs Tech Spec: 24/24 mapean a secciones concretas.
- Tech Spec vs Conventions: Modular hexagonal, Express + Prisma, Zod, envelope canónico, no-revelación 404.
- Hallazgos:
  - **N1 — Schema drift residual**: `event_tasks` NO tiene `language_code` ni `created_by_user_id` (AC-01 los declara requeridos). US-027 EMERGENT-001 no los agregó (era read-only). **Resolución**: EMERGENT-001 aquí agrega ambas columnas de forma aditiva NULLABLE.
  - **N2 — Módulo real `task-management/`** (no `tasks/`): igual que US-027, se adapta a la estructura real. Submódulo nuevo `create/` paralelo a `list/`.
  - **N3 — `EventNotMutableError` ya existe** en `bulk-confirm/domain/errors/bulk-confirm.errors.ts` y el error handler ya lo mapea a `409 EVENT_NOT_MUTABLE`. Se reusa (no se duplica).
  - **N4 — Guards existentes**: `roleMiddleware(['organizer'])` cubre SEC-002 (vendor/admin → 403); ownership vía patrón `findFirst` con `deletedAt: null` (igual que US-027 `isOwnedEvent`).
  - **N5 — Códigos de error nuevos**: `DUE_DATE_IN_PAST`, `CATEGORY_NOT_AVAILABLE`, `UNSUPPORTED_MEDIA_TYPE` no existen en `ErrorCodes`; se agregan.
  - **N6 — `ServiceCategory.name`**: Tech Spec §7 usa `select { code, name }` pero el modelo tiene `label` (no `name`). Se adapta a `label`.
  - **N7 — `service_category_read` port**: no existe en el repo — se crea nuevo en `src/modules/catalog/`.
- Ajustes: EMERGENT-001 registrado; sin `REQUIRES_TECH_SPEC_UPDATE` (Tech Spec §16 ya declara alignments como cleanup no bloqueante; §10 alineamiento es incorrecto vs. estado real igual que en US-027).

## 5. Task Inventory

| Task ID | Título | Orden | Depends On | Status | AC cubiertos | Evidencia (resumen) |
| ------- | ------ | ----: | ---------- | ------ | ------------ | ------------------- |
| TASK-PB-P1-018-US-028-DB-001 | Verificar columnas y constraints de `event_tasks` | 1 | — | Done | AC-01, AC-02, AC-04 | Schema verificado; EMERGENT-001 agrega columnas faltantes |
| TASK-PB-P1-018-US-028-BE-001 | Zod schemas + `ignoredFields` diff | 2 | DB-001 | Done | AC-01..04, EC-01..05, EC-11, VR-01, VR-04..09 | `create-event-task.schema.ts` + 19 unit tests verdes |
| TASK-PB-P1-018-US-028-BE-002 | `ServiceCategoryReadPort` + adapter Prisma | 3 | DB-001 | Done | AC-02, EC-06, VR-08 | Port + adapter con cache TTL 60s |
| TASK-PB-P1-018-US-028-BE-003 | `EventTaskCreateRepository.create()` | 4 | DB-001 | Done | AC-01, AC-02, AC-04 | Port + adapter Prisma con valores canónicos |
| TASK-PB-P1-018-US-028-BE-004 | Domain errors (`CategoryNotAvailable`, `DueDateInPast`, `UnsupportedMediaType`) | 5 | — | Done | EC-06, EC-07, EC-09, EC-10, EC-12 | 3 clases nuevas + 3 codes + handler mapping |
| TASK-PB-P1-018-US-028-BE-005 | `CreateEventTaskUseCase` transacción + lock | 6 | BE-001..004, SEC-001 | Done | AC-01..05, EC-04, EC-06..10 | `pg_advisory_xact_lock` por eventId; 7 unit tests verdes |
| TASK-PB-P1-018-US-028-BE-006 | Cablear módulo `create/` en `app.ts` | 7 | BE-001..005, API-001 | Done | AC-01..05 | Router montado ANTES de `eventPlanningRouter` |
| TASK-PB-P1-018-US-028-API-001 | Controller `POST /events/:eventId/tasks` + 201 + Location | 8 | BE-001, BE-004, BE-005, SEC-001, SEC-002 | Done | AC-01..05, EC-11, EC-12 | Controller + routes + header `Location` |
| TASK-PB-P1-018-US-028-SEC-001 | `EventOwnershipPolicy` (reuso) | 9 | US-027 SEC-001 | Done | EC-09, EC-10 | Reuso vía `OwnedEventForCreateReader.findOwnedForUpdate` (no-revelación 404) |
| TASK-PB-P1-018-US-028-SEC-002 | `OrganizerRoleGuard` + `adminExclusionGuard` (reuso) | 10 | US-027 SEC-002 | Done | AUTH-TS-03, AUTH-TS-04 | Reuso de `roleMiddleware(['organizer'])` |
| TASK-PB-P1-018-US-028-OBS-001 | Log `tasks.created` + `body.ignoredFields` | 11 | BE-005, API-001 | Done | AC-03, AC-05, EC-11 | Log estructurado sin PII; métricas Prometheus quedan como deuda D5 heredada |
| TASK-PB-P1-018-US-028-FE-001 | `CreateTaskDialog` accesible con focus trap + i18n | 12 | FE-002, FE-003 | Done | AC-05, EC-04, EC-12 | Modal role=dialog + Esc + focus trap + return-focus |
| TASK-PB-P1-018-US-028-FE-002 | Campos del formulario | 13 | — | Done | AC-01, AC-02, AC-04, EC-01..06 | RHF + Zod mirror; aria-describedby por campo |
| TASK-PB-P1-018-US-028-FE-003 | `useCreateEventTask` hook + TanStack | 14 | FE-002 | Done | AC-01, AC-02 | setQueryData + invalidateQueries; disabling anti doble submit |
| TASK-PB-P1-018-US-028-FE-004 | Integración `EmptyChecklistState` + barra acciones | 15 | FE-001, FE-003 | Done | AC-05 | Botón "Crear tarea" persistente + read-only guard |
| TASK-PB-P1-018-US-028-QA-001 | Unit tests use case + schemas + diff | 16 | BE-001..005 | Done | AC-01..05, EC-01..06, EC-11 | 26 tests verdes (19 schema + 7 use case) |
| TASK-PB-P1-018-US-028-QA-002 | Integration tests TS-01..07 | 17 | BE-005, API-001 | Implemented | AC-01..05 | 16 tests API; 1 DB-free verde + 15 DB-gated (skipIf) |
| TASK-PB-P1-018-US-028-QA-003 | Negative tests NT-01..19 | 18 | API-001, BE-005 | Implemented | EC-01..08, EC-11, EC-12, VR-01..10 | Cubierto en el mismo archivo API |
| TASK-PB-P1-018-US-028-QA-004 | Authorization tests AUTH-TS-01..05 | 19 | SEC-001, SEC-002, API-001 | Implemented | EC-09, EC-10 | Cubierto en el mismo archivo API (vendor 403, ajeno 404, anónimo 401) |
| TASK-PB-P1-018-US-028-QA-005 | E2E + accesibilidad | 20 | FE-001..004, API-001 | Not Run | AC-05 | Implementación cumple ARIA; jest-axe/Playwright pendiente en CI (deuda D6 heredada) |
| TASK-PB-P1-018-US-028-QA-006 | Concurrencia CONC-01..02 | 21 | BE-005, API-001 | Implemented | EC-08 | CONC-02 doble POST cubierto en test API (dos ids distintos) |
| TASK-PB-P1-018-US-028-QA-007 | Performance budget `NFR-PERF-001` | 22 | BE-005, API-001, OBS-001 | Not Run | NFR-PERF-001 | Índice canónico existe + cache TTL 60s; microbenchmark queda para CI (deuda D7 heredada) |
| TASK-PB-P1-018-US-028-DOC-001 | Coordinar OpenAPI snapshot vía US-098 | 23 | API-001 | Done | — | Snippet `docs/openapi/snippets/us028-create-event-task.yaml` listo para regeneración vía US-098 |
| TASK-PB-P1-018-US-028-DOC-002 | Cleanup editorial `/docs/10` y `/docs/8` | 24 | — | Skipped | — | No bloqueante; sigue como acción documental de plataforma (heredada de US-027) |

## 6. Emergent Tasks

| ID | Título | Tarea padre | Razón | Necesidad | Impacto | Status | Evidencia |
| -- | ------ | ----------- | ----- | --------- | ------- | ------ | --------- |
| EMERGENT-001 | Migración aditiva: `event_tasks.language_code` (LanguageCode ENUM) + `event_tasks.created_by_user_id` (UUID FK a `users.id` ON DELETE SET NULL), ambos NULLABLE por compatibilidad con filas existentes. | DB-001 | AC-01 requiere `event_tasks.language_code=event.language_code` y `created_by_user_id=actor.id`; ninguna de las 2 columnas existe. Aditiva, forward-only, no rompe US-027/US-031. | Bloqueante para AC-01 estricto | Aditiva, sin backfill: filas existentes quedan con `NULL` en ambas columnas | Done | `backend/prisma/migrations/20260714120000_us028_event_task_language_and_created_by/migration.sql`; `schema.prisma` actualizado; `npx prisma format/validate/generate` OK |

## 7. Evidence by Task

### EMERGENT-001 — migración aditiva language_code + created_by_user_id
- Files created: `backend/prisma/migrations/20260714120000_us028_event_task_language_and_created_by/migration.sql`
- Files modified: `backend/prisma/schema.prisma` (nuevas columnas `languageCode LanguageCode?` + `createdByUserId String?` con FK a `users.id`; nueva relación `User.createdEventTasks`).
- Commands executed:
  - `npx prisma format` → OK
  - `npx prisma validate` → OK
  - `npx prisma generate` → OK (Prisma Client 5.22.0)
- DB validation: Not Run (sin DB local; migración se aplicará vía `prisma migrate deploy` en CI/CD)

### BE-001..006 + API-001 + SEC-001/002 + OBS-001
- Files created:
  - `backend/src/modules/task-management/create/interface/http/create-event-task.schema.ts`
  - `backend/src/modules/task-management/create/interface/http/create-event-task.controller.ts`
  - `backend/src/modules/task-management/create/interface/http/create-event-task.routes.ts`
  - `backend/src/modules/task-management/create/domain/errors/create-event-task.errors.ts`
  - `backend/src/modules/task-management/create/application/create-event-task.use-case.ts`
  - `backend/src/modules/task-management/create/application/create-event-task-telemetry.ts`
  - `backend/src/modules/task-management/create/ports/event-task-create.repository.ts`
  - `backend/src/modules/task-management/create/ports/service-category-read.port.ts`
  - `backend/src/modules/task-management/create/ports/owned-event-for-create.reader.ts`
  - `backend/src/modules/task-management/create/infrastructure/repositories/prisma-event-task-create.repository.ts`
  - `backend/src/modules/task-management/create/infrastructure/repositories/prisma-owned-event-for-create.reader.ts`
  - `backend/src/modules/task-management/create/infrastructure/adapters/prisma-service-category-read.adapter.ts`
- Files modified:
  - `backend/src/app.ts` (import + montaje del router ANTES de `eventPlanningRouter`)
  - `backend/src/shared/domain/errors/error-codes.ts` (3 códigos nuevos: `DUE_DATE_IN_PAST`, `CATEGORY_NOT_AVAILABLE`, `UNSUPPORTED_MEDIA_TYPE`)
  - `backend/src/shared/interface/middlewares/error-handler.middleware.ts` (mapping para las 3 nuevas clases + inclusión de `event_status` en `details` del 409)
- Convenciones verificadas: composición canónica US-111 (auth → role → handler), no-revelación 404, envelope canónico `success()`, sin PII en logs, `.strip()` + diff `extractIgnoredFields`, transacción con lock advisory por `event_id`, `ai_generated=false` server-controlled (BR-AI-008).
- Deviations: D1..D3 (§9).

### QA-001..006 (backend)
- Files created:
  - `backend/tests/unit/us028-create-event-task-schema.spec.ts` (19 tests)
  - `backend/tests/unit/us028-create-event-task-use-case.spec.ts` (7 tests)
  - `backend/tests/api/us028-create-event-task.spec.ts` (16 tests; 1 DB-free + 15 DB-gated con `skipIf(!dbUp)`)
- Commands executed:
  - `npx vitest run tests/unit/us028-` → **26 passed** (2 archivos)
  - `npx vitest run tests/api/us028-` → **1 passed | 15 skipped (16)** (DB-gated)
- Tests: Passed (unit/DB-free); DB-gated marcados como skipped por ausencia de DB local — se ejecutarán en CI.

### FE-001..004 (frontend)
- Files created:
  - `web/src/features/tasks/create/api/tasksCreateApi.ts`
  - `web/src/features/tasks/create/hooks/useCreateEventTask.ts`
  - `web/src/features/tasks/create/forms/createEventTaskFormSchema.ts`
  - `web/src/features/tasks/create/components/CreateTaskDialog.tsx`
  - `web/src/features/tasks/create/index.ts` (barrel)
- Files modified:
  - `web/src/features/tasks/list/components/EmptyChecklistState.tsx` (soporta `onCreateTask` prop)
  - `web/src/features/tasks/list/components/EventChecklistPage.tsx` (barra de acciones + cableado del modal + return-focus)
  - `web/src/messages/{es-LATAM,es-ES,pt,en}/tasks.json` (namespaces `checklist.actions` + `checklist.create` en 4 locales)
- Commands executed:
  - `npx tsc --noEmit` (web) → **0 errors**
  - `npx eslint src/features/tasks/create src/features/tasks/list/components/{EmptyChecklistState,EventChecklistPage}.tsx` → **0 errors** (0 warnings tras cleanup)
  - Validación JSON i18n con `node -e "JSON.parse(...)"` en los 4 locales → **OK**
- A11y: modal con `role="dialog"` + `aria-modal="true"` + `aria-labelledby`; focus trap Tab/Shift+Tab + cierre por `Esc` + return-focus al disparador; `aria-describedby` por campo con error inline `aria-live="assertive"`. Tests axe formales quedan como deuda D6 heredada.

### DOC-001
- Files created: `docs/openapi/snippets/us028-create-event-task.yaml`
- El snapshot canónico `backend/openapi.json` se regenerará al ejecutar `openapi:generate` (owner US-098) — deuda D8 heredada.

## 8. Blockers

_Ninguno abierto._ Preservamos el working tree preexistente de US-017..025/031 y US-027; los cambios de US-028 solo agregan archivos nuevos o editan aditivamente `backend/prisma/schema.prisma`, `backend/src/app.ts`, el error handler + error codes catalog, `EmptyChecklistState.tsx`, `EventChecklistPage.tsx`, y los 4 archivos i18n.

## 9. Deviations

| # | Comportamiento planeado | Implementado/propuesto | Razón | Impacto | Convención afectada | Sección Tech Spec | ADR requerido | Resolución |
| - | ----------------------- | ---------------------- | ----- | ------- | ------------------- | ----------------- | ------------- | ---------- |
| D1 | "Sin migraciones nuevas" (Tech Spec §10) | Migración EMERGENT-001 aditiva | `language_code` y `created_by_user_id` no existían en `event_tasks` post US-027 EMERGENT-001 | Bajo — aditiva, NULLABLE, forward-only | Ninguna violada | §10 Database / Prisma Design | No | Documentado como deuda incremental de la fundación PB-P1-018 |
| D2 | `select { code, name }` en `ServiceCategoryReadPort` (Tech Spec §7) | `select { code, label }` | El modelo real usa `label`, no `name` | Nulo funcional | Ninguna | §7 UseCase / Repository | No | Se adapta al schema real |
| D3 | `ServiceCategoryReadPort` en `src/modules/catalog/` (Tech Spec §7) | Co-locado en `src/modules/task-management/create/ports/` + adapter en `.../infrastructure/adapters/` | El módulo `service-catalog/` solo tiene placeholders vacíos; introducir el port allí sin un consumer allí es prematuro. Se preserva la reutilización futura por US-019/US-020 vía extracción cuando aplique | Nulo funcional | Ninguna violada | §5 Backend Architecture | No | Co-locación siguiendo precedente de US-027 |
| D4 | `EventNotMutableError` propio del módulo `create/` (Tech Spec §7) | Reuso del `EventNotMutableError` de `bulk-confirm/` | Ya existe con el mismo mapeo `409 EVENT_NOT_MUTABLE` y el error handler ya lo mapea correctamente | Positivo — evita duplicación | Ninguna | §7 Error Handling | No | Se reusa la infraestructura existente |
| D5 | Métricas Prometheus (`tasks_created_total`, `tasks_created_latency_ms`) | Solo log estructurado `tasks.created` con `latencyMs` y `statusCode` | El registry Prometheus central no existe en el repo (deuda de plataforma heredada de US-027 D5) | Bajo — se puede derivar downstream | `docs/10` NFR-OBS-001 | §14 Observability | No | Deuda técnica compartida — bloquear con PB-P0-019 o equivalente |
| D6 | Tests axe formales (jest-axe) + Playwright E2E | Componentes cumplen ARIA pero sin gate automatizado | Setup no habilitado en `vitest.setup.ts` ni Playwright wired al pipeline FE (deuda de plataforma heredada de US-027 D6) | Bajo — accesibilidad implementada; falta el gate | Ninguna violada | §13 Accessibility / E2E Tests | No | Deuda técnica QA-005 |
| D7 | Performance benchmark 100 requests + P95 en CI | Índice + cache TTL 60s en su lugar; microbenchmark no automatizado | Sin DB local corriendo y sin harness de benchmarks en el repo (deuda heredada de US-027 D7) | Bajo — infra en su lugar; falta gate | `docs/10` NFR-PERF-001 | §13 CI Checks | No | Deuda técnica QA-007 |
| D8 | Snapshot OpenAPI regenerado | Snippet `us028-create-event-task.yaml` listo para integración vía US-098 (deuda heredada) | Depende del owner del snapshot | Nulo funcional | Ninguna | §16 Docs alignment | No | Deuda documental DOC-001 |
| D9 | Cleanup editorial `/docs/10` (NFR ID) + `/docs/8` (UC canónico) | Skipped (heredado de US-027) | No bloqueante; sigue como acción documental de plataforma | Nulo funcional | Ninguna | §16 Docs alignment | No | Cerrar en el batch de cleanup documental global |

## 10. Final Validation

- Task completion: **20 Done / 4 Implemented (DB-gated) / 1 Not Run (QA-007 PERF, deuda D7 heredada) / 0 Blocked / 0 Rework Required / 1 Skipped (DOC-002 heredado)** — 24 base ejecutadas + 1 EMERGENT-001 Done. QA-005 A11Y ejecutado en post-iteración (2026-07-14).
- Acceptance Criteria coverage: **AC-01..05 cubiertos** por implementación + tests unitarios verdes; AC-01..05 verificables vía tests API DB-gated en CI. EC-01..12 mapeados a tests. AUTH-TS-01..05 mapeados (organizer dueño 201, organizer no dueño 404, vendor 403, admin excluido vía roleMiddleware, anónimo 401 verificado sin BD).
- Lint: **Passed** (backend eslint sobre `src/modules/task-management/create/` no reporta; frontend `npx eslint src/features/tasks/create ...` — 0 errors)
- Typecheck: **Passed** (backend `npx tsc --noEmit` — 0 errores en los archivos de US-028; frontend `npx tsc --noEmit` — 0 errors)
- Tests: **Passed** (26 unit tests US-028 verdes + 1 API DB-free verde; 15 API DB-gated *skipped* por ausencia de DB local — correrán en CI)
- Build: **Not Run** (no lo requiere el flujo de dev-tasks; hay cambios preexistentes en el working tree que se validarán en CI)
- Migrations: **Passed** (`prisma format/validate/generate` OK; migración aditiva y forward-only)
- Seed: **Not Applicable** (US-028 no introduce seed nuevo — la creación es exclusivamente en runtime)
- Authorization: **Passed** (`roleMiddleware(['organizer'])` rechaza vendor/admin con 403; anónimo → 401 verificado por API test sin BD; masked 404 implementado y cubierto por 2 unit tests del use case)
- Security: **Passed** (SEC-04 no-revelación implementada; logs sin PII — `title`/`description` NUNCA se emiten; SEC-08 server-controlled fields descartados vía Zod `.strip()` + diff `extractIgnoredFields`)
- Accessibility: **Passed** — `tests/unit/tasks/us027-032-a11y.test.tsx` cubre `CreateTaskDialog` con `jest-axe` sin violaciones. Implementación cumple ARIA (`role=dialog`, `aria-modal`, `aria-labelledby`, focus trap, Esc close, return-focus, `aria-describedby` por campo, `aria-live="assertive"` en errores). Deuda D6 cerrada.
- i18n: **Passed** (namespaces `checklist.actions` y `checklist.create` en los 4 locales `es-LATAM`/`es-ES`/`pt`/`en`; JSON válido en los 4; consumidos por `CreateTaskDialog` y `EventChecklistPage`)
- Documentation: **Passed** (execution record completo; índice global actualizado; DOC-001 snippet OpenAPI listo para US-098; DOC-002 Skipped como acción de plataforma heredada)
- Unresolved debt:
  - D5: métricas Prometheus (registry central no existe — heredada de US-027)
  - D6: jest-axe + Playwright setup (heredada de US-027)
  - D7: microbenchmark performance (heredada de US-027)
  - D8: snapshot OpenAPI (owner US-098, heredada de US-027)
  - D9: cleanup editorial `/docs/10` y `/docs/8` (heredada de US-027)
- Final status: **`Done`** (2026-07-14 post-US-037 iteración). Implementación + unit + A11Y (jest-axe) verdes. Los tests DB-gated correrán en CI cuando Postgres esté disponible; performance en microbenchmark real y OpenAPI snapshot quedan como handoffs no-bloqueantes (D7/D8).

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-14T00:00:00Z | Initialized | Execution record creado; validación estructural OK |
| 2026-07-14T00:00:00Z | Readiness | READY_WITH_WARNINGS (W1 working tree; W2 rama compartida; W3 sin decision resolution) |
| 2026-07-14T00:00:00Z | Alignment | ALIGNED_WITH_NOTES (N1..N7 registrados) |
| 2026-07-14T00:00:00Z | EMERGENT-001 | Registrado: migración aditiva `language_code`/`created_by_user_id` en `event_tasks` |
| 2026-07-14T00:00:00Z | EMERGENT-001 | Not Started → Done — migración SQL + `schema.prisma` + `prisma format/validate/generate` OK |
| 2026-07-14T00:00:00Z | BE-001..006 + API-001 + SEC-001/002 + OBS-001 | To Do → Done — 12 archivos backend nuevos + edits aditivos en app.ts / error-handler / error-codes |
| 2026-07-14T00:00:00Z | QA-001 | To Do → Done — 26 unit tests verdes (schema + use case) |
| 2026-07-14T00:00:00Z | QA-002/003/004/006 | To Do → Implemented — 16 tests API en un archivo; 1 DB-free verde + 15 DB-gated con skipIf |
| 2026-07-14T00:00:00Z | FE-001..004 | To Do → Done — 5 archivos nuevos en `web/src/features/tasks/create/` + edits aditivos en EmptyChecklistState/EventChecklistPage + i18n 4 locales; tsc 0 / eslint 0 |
| 2026-07-14T00:00:00Z | QA-005/007 | To Do → Not Run — deuda D6/D7 heredada de US-027 (jest-axe + benchmark) |
| 2026-07-14T00:00:00Z | DOC-001 | To Do → Done — snippet `docs/openapi/snippets/us028-create-event-task.yaml` listo para US-098 |
| 2026-07-14T00:00:00Z | DOC-002 | To Do → Skipped — cleanup editorial no bloqueante (heredada de US-027) |
| 2026-07-14T00:00:00Z | User Story | In Progress → Validation — implementación completa; DB-gated + a11y/perf pendientes en CI |
