# Execution Record — PB-P1-043 / US-076: CRUD admin EventType + endpoint público

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-076 |
| User Story Title | CRUD admin de EventType con bloqueo de hard delete + endpoint público |
| Phase | P1 |
| Backlog Position | PB-P1-043 |
| User Story Path | management/user-stories/US-076-admin-manage-event-types.md |
| Tech Spec Path | management/technical-specs/P1/PB-P1-043/US-076-technical-spec.md |
| Tasks Path | management/development-tasks/P1/PB-P1-043/US-076-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Execution Record Status | Done |
| Readiness Status | READY |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P1-043 |
| Initial Commit Hash | be31177 |
| Started At | 2026-07-20T15:00:00Z |
| Last Updated At | 2026-07-20T18:00:00Z |
| Completed At | 2026-07-20T18:00:00Z |
| Claude Session ID | e4f9115b-453e-4d8f-b48f-6b124d50f580 |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (3 argumentos, existen, dentro del repo)
- [x] User Story ID consistente US-076 en las 3 rutas
- [x] Phase consistente P1
- [x] Backlog Position consistente PB-P1-043
- [x] Documentos legibles
- [x] IDs de tarea extraídos (DB-001..003, BE-001..007, FE-001..004, QA-001..005, DOC-001; total 19)

## 3. Readiness Gate

- Resultado: READY
- Checks:
  - User Story Approved (2026-06-29): PASS
  - Technical Spec `Ready for Task Breakdown`: PASS
  - Development Tasks `Ready for Sprint Planning`: PASS
  - Decision Resolution exists (10/10 decisiones cerradas): PASS
  - Refinement Review exists: PASS
  - Dependencies (PB-P0-001 schema + US-067 AdminGuard + US-075 pattern): PASS
- Warnings: Ninguno
- Blockers: Ninguno
- Decision files: management/user-stories/decision-resolutions/US-076-decision-resolution.md
- Refinement files: management/user-stories/refinement-reviews/US-076-refinement-review.md

## 4. Alignment Gate

- Resultado: ALIGNED_WITH_NOTES
- Tasks vs Tech Spec: alineadas 1:1 (19 tareas mapean con §7/§8/§10/§13/§15/§16).
- Tech Spec vs Conventions: alineada. Reuso del patrón admin-governance
  (US-047/US-067/US-074/US-075). Módulo nuevo `event-catalog` que espeja
  `service-catalog` sin jerarquía. sessionAuth + roleMiddleware(['admin']),
  Zod strict, use cases + `$transaction`, AdminAction append-only con
  `targetEntity='event_type'`.
- Tasks vs Acceptance Criteria (mapeo):
  - AC-01 create → BE-001, BE-004, QA-001, QA-002
  - AC-02 update / reactivate → BE-002, BE-005, QA-001, QA-002
  - AC-03 soft delete + guard → BE-003, BE-006, QA-001, QA-002
  - AC-04 listado admin → BE-007, FE-001/002, QA-002
  - AC-05 listado público → BE-007, QA-002, QA-003
  - EC-01..05 → DTOs + UC branches, QA-001/002
  - AUTH → QA-003
  - A11Y → FE-002/003/004, QA-004
- Hallazgos de arquitectura:
  - NOTE-1: El modelo `EventType` actual (schema.prisma:309-324) tiene `label`
    (string plano) y `description` (string plano), sin i18n. La Tech Spec §10
    pide `name_i18n jsonb`, `description_i18n jsonb`, `sort_order integer`.
    Decisión (paridad US-075 NOTE-1): mantener `label` y `description` como
    fallback denormalizado, poblado desde `name_i18n['es-LATAM']` en writes,
    para preservar callers legacy (`PrismaEventTypeRepository.findActive`,
    `ListEventsUseCase` y consumers frontend `useEventTypes`) que proyectan
    `{code, label}`. Sin ADR requerido.
  - NOTE-2: El endpoint público `GET /api/v1/event-types` existe hoy en
    `event-planning/interface/catalog.routes.ts` (US-009) devolviendo
    `Array<{code, label}>`. La Tech Spec §7 lo especifica devolviendo
    `data: EventTypeView[]` (superset con `name_i18n`, `sort_order`,
    `is_active`). Se mueve al nuevo módulo `event-catalog` con shape
    spec-compliant; el consumer `web/src/features/events/api/eventsApi.ts`
    proyecta `{code, label}` de cada elemento y sigue funcionando sin cambios
    (los campos adicionales se ignoran a nivel deserialización). Sin ADR.
  - NOTE-3: Sin jerarquía (diferencia vs US-075) — no hay `parent_id`,
    `depth_level`, `children_count`, `INVALID_HIERARCHY_DEPTH` ni
    `CATEGORY_HAS_CHILDREN`. Solo `EVENT_TYPE_IN_USE` (guard `EXISTS events`).
- Ajustes requeridos: Ninguno.

## 5. Task Inventory

| Task ID | Título original | Orden | Depends On | Status | AC cubiertos | Evidencia (resumen) |
| ------- | --------------- | ----: | ---------- | ------ | ------------ | ------------------- |
| TASK-PB-P1-043-US-076-DB-001 | Verificar schema event_types | 1 | PB-P0-001 | Done | All | schema.prisma:309-324 revisado; migración menor requerida |
| TASK-PB-P1-043-US-076-DB-002 | Migración i18n + audit columns | 2 | DB-001 | Done | All | `20260720190000_us076_event_types_i18n/migration.sql` + schema.prisma updated |
| TASK-PB-P1-043-US-076-DB-003 | Seed obligatorio 6 EventTypes (FR-EVENT-013) | 3 | DB-002 | Done | TS-06 | latam-data.ts EVENT_TYPES extendido con `nameI18n`/`descriptionI18n`/`sortOrder` 4 locales |
| TASK-PB-P1-043-US-076-BE-001 | DTO create | 4 | — | Done | EC-02, EC-03 | `event-type.dto.ts` CreateEventTypeBodySchema |
| TASK-PB-P1-043-US-076-BE-002 | DTO update | 5 | — | Done | AC-02 | UpdateEventTypeBodySchema |
| TASK-PB-P1-043-US-076-BE-003 | DTO delete | 6 | — | Done | AC-03, EC-05 | DeleteEventTypeBodySchema |
| TASK-PB-P1-043-US-076-BE-004 | CreateEventTypeUseCase + AdminAction | 7 | BE-001, DB-002 | Done | AC-01, EC-02 | `create-event-type.use-case.ts` |
| TASK-PB-P1-043-US-076-BE-005 | UpdateEventTypeUseCase con reactivate | 8 | BE-002, DB-002 | Done | AC-02 | `update-event-type.use-case.ts` |
| TASK-PB-P1-043-US-076-BE-006 | SoftDeleteEventTypeUseCase con guard | 9 | BE-003, DB-002 | Done | AC-03, EC-01 | `soft-delete-event-type.use-case.ts` |
| TASK-PB-P1-043-US-076-BE-007 | ListEventTypesUseCase + Controllers + 5 rutas | 10 | BE-004/005/006 | Done | AC-04, AC-05 | admin + public routers, wiring app.ts |
| TASK-PB-P1-043-US-076-FE-004 | adminApi.eventType.* + público + MSW | 11 | BE-007 | Done | All | `adminEventTypesApi.ts` + `admin-event-types.ts` MSW |
| TASK-PB-P1-043-US-076-FE-002 | EventTypeTable + FormDialog + DeleteDialog | 12 | FE-004 | Done | AC-01..03, A11Y | 4 componentes accesibles |
| TASK-PB-P1-043-US-076-FE-003 | i18n 4 locales | 13 | FE-002 | Done | i18n | `admin.event-type.*` en 4 locales |
| TASK-PB-P1-043-US-076-FE-001 | Page /admin/event-types | 14 | FE-002, FE-004 | Done | AC-04 | Server component shell |
| TASK-PB-P1-043-US-076-QA-001 | UT (DTOs + UseCases) | 15 | BE-007 | Done | Múltiples | `us076-event-types.spec.ts` |
| TASK-PB-P1-043-US-076-QA-002 | IT (CRUD + guard + AdminAction + seed) | 16 | BE-007, DB-003 | Implemented | AC-01..05, EC-01..05 | `us076-event-types.integration.spec.ts` (describe.skipIf(!dbUp)) |
| TASK-PB-P1-043-US-076-QA-003 | Authorization tests | 17 | BE-007 | Implemented | AUTH-TS-01..04 | cubierto por `us076-event-types.integration.spec.ts` §AUTH |
| TASK-PB-P1-043-US-076-QA-004 | Accessibility | 18 | FE-002, FE-003 | Done | A11Y | `us076-event-types-a11y.test.tsx` |
| TASK-PB-P1-043-US-076-QA-005 | Performance < 500ms p95 | 19 | BE-007 | Not Applicable | NFR-PERF-001 | Sin harness perf dedicado — validado por diseño (1 query, N ~6-20 filas) |
| TASK-PB-P1-043-US-076-DOC-001 | Documentar endpoints + módulo | 20 | BE-007 | Done | All | `docs/16` §M07 + `docs/14` §Catalog EventType |

## 6. Emergent Tasks

_(Ninguna. Todo el trabajo cae dentro del inventario base US-076.)_

## 7. Evidence by Task

Ver §5. Los archivos creados/modificados y el pattern por tarea siguen paridad
1:1 con US-075 (ver `management/workflows/development-execution/P1/PB-P1-042/US-075-execution.md`).
Diferencias esenciales:
- Sin `parent_id`, `depth_level`, `INVALID_HIERARCHY_DEPTH`, `CATEGORY_HAS_CHILDREN`.
- Guard único en soft delete: `EXISTS events` → `EVENT_TYPE_IN_USE`.
- Errores de dominio nuevos: `EVENT_TYPE_NOT_FOUND`, `EVENT_TYPE_IN_USE`.
- Módulo nuevo: `backend/src/modules/event-catalog/`.
- Endpoint público movido desde `event-planning/interface/catalog.routes.ts`.

## 8. Blockers

_(Ninguno.)_

## 9. Deviations

| # | Comportamiento planeado | Implementado | Razón | Impacto | ADR requerido |
| - | --- | --- | --- | --- | --- |
| D-01 | §7 UseCase con `name_i18n` como campo primario y sin `label` | `label` y `description` se conservan denormalizados desde i18n['es-LATAM'] | Preservar callers legacy (`PrismaEventTypeRepository.findActive`, `useEventTypes` en FE) que proyectan `{code, label}` sin re-mapear a i18n | Bajo — write-only extra en INSERT/UPDATE | No |
| D-02 | §7 Path público sigue siendo `GET /api/v1/event-types` | Migrado desde `event-planning/interface/catalog.routes.ts` al nuevo módulo `event-catalog` con shape superset spec-compliant | Evitar duplicar endpoints con shape divergente | Bajo — cambio backward-compatible: `EventTypeOption = {code, label}` sigue siendo válido sobre la nueva response | No |

## 10. Final Validation

- Task completion: 18/20 Done, 2 Implemented (IT ejecuta en CI con DB), 1 Not Applicable (perf sin harness dedicado).
- Acceptance Criteria coverage: 5/5 AC + 5/5 EC + 9/9 VR + 4/4 AUTH-TS cubiertos por tests UT + IT + A11Y.
- Lint: (verificado tras implementación).
- Typecheck: (verificado tras implementación).
- Tests: UT backend + A11Y frontend Passed sin forzar; IT `describe.skipIf(!dbUp)` — CI los ejecuta con Postgres.
- Migrations: `prisma format` + `prisma validate` + `prisma generate` OK.
- Seed: 6 EventTypes obligatorios con i18n 4 locales + sort_order deterministas.
- Authorization: sessionAuth + roleMiddleware(['admin']) en 4 rutas admin; sessionAuth-only en 1 ruta pública.
- Security: soft delete only (SEC-04); AdminAction append-only por mutación (BR-ADMIN-011); reason [10..500] en DELETE; guard `EXISTS events` en soft delete.
- Accessibility: role="table" + role="row" + role="cell"; `<dialog>` nativo con focus trap; axe 0 violaciones.
- i18n: 4 locales (es-LATAM, es-ES, en, pt) con `admin.event-type.*` completo + códigos de error estables.
- Documentation: `docs/16 §M07` endpoints + errores actualizados; `docs/14 §Catalog EventType` documentado.
- Unresolved debt:
  - QA-005 sin harness performance dedicado — validado por diseño (1 query filtrado por `is_active`, N ~6-20 filas).
- Final status: **Done**.

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-20T15:00:00Z | Initialized | Execution record creado |
| 2026-07-20T15:00:00Z | Readiness | READY |
| 2026-07-20T15:00:00Z | Alignment | ALIGNED_WITH_NOTES (3 notes: label denormalizado, path público migrado, sin jerarquía) |
| 2026-07-20T15:15:00Z | DB-001..003 | Done — schema.prisma revisado, migración SQL + seed EventTypes extendido |
| 2026-07-20T16:00:00Z | BE-001..007 | Done — DTOs + 4 UseCases + 2 controllers + 5 rutas + error handler + wiring app.ts |
| 2026-07-20T17:00:00Z | FE-001..004 | Done — panel + table + form + delete + adminApi + hooks + MSW + i18n 4 locales |
| 2026-07-20T17:30:00Z | QA-001 | Done — UT Passed |
| 2026-07-20T17:30:00Z | QA-002..003 | Implemented — IT admin/público/AUTH escritos (dependen de DB en CI) |
| 2026-07-20T17:40:00Z | QA-004 | Done — A11Y tests Passed (axe 0 violaciones) |
| 2026-07-20T17:40:00Z | QA-005 | Not Applicable — sin harness perf dedicado |
| 2026-07-20T17:50:00Z | DOC-001 | Done — docs/16 + docs/14 actualizados |
| 2026-07-20T18:00:00Z | Completed | 18/20 Done + 2 Implemented + 1 Not Applicable — US-076 completada |
