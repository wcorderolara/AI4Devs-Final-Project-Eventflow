# Workflow State — US-032

## Metadata

- Workflow Version: 1.0
- User Story ID: US-032
- User Story Path: management/user-stories/US-032-filter-tasks-by-timerange.md
- Created At: 2026-06-26T22:20:00Z
- Updated At: 2026-06-26T23:20:00Z

## Refinement

- Status: Completed
- Last Execution At: 2026-06-26T22:35:00Z
- Refinement Review Path: management/user-stories/refinement-reviews/US-032-refinement-review.md
- Blocking Decisions: None
- Notes: Refinada in situ. Backlog PB-P1-019 (compartido con US-033). Extiende endpoint existente de US-027 (GET /api/v1/events/:eventId/tasks); NO crea nuevo endpoint. Enum único range ∈ {overdue, 7d, 30d, all} mutuamente excluyente. Tolerancia Zod .catch('all') consistente con US-027 EC-01; log filters.dropped. Vencidas canónico: due_date < CURRENT_DATE AND status NOT IN ('done', 'skipped'). Tareas con due_date IS NULL excluidas de overdue/7d/30d; solo en all. DTO extendido: overdue y is_t_minus_7 derivados server-side. CURRENT_DATE PostgreSQL como referencia canónica. Sin migraciones; reusa idx_event_tasks_event_status_due. AC 8, EC 10, VR-01..08, SEC-01..08, TS 10, NT 9, AUTH-TS 5, CONC 3, A11Y 4, PERF 3. Tres Documentation Alignment Required no bloqueantes.

## Decision Resolution

- Status: Not Required
- Last Execution At: null
- Source Review Path: null
- Remaining Decisions: 0
- Notes: No requerido. Decisiones formalizadas en /docs/9 FR-TASK-009/010, /docs/8 UC-TASK-006, /docs/4 BR-TASK-007/008/009/010, /docs/16 §28, PB-P1-019 Acceptance Summary.

## Approval

- Status: Approved with Minor Notes
- Last Execution At: 2026-06-26T22:45:00Z
- Approval Artifact Path: management/user-stories/US-032-filter-tasks-by-timerange.md
- Notes: Aprobada por PO/BA Review. 3 notas no bloqueantes (Documentation Alignment): /docs/9 Should→Must, /docs/10 NFR-PERF-API-001 → NFR-PERF-001, /docs/16 snapshot OpenAPI vía US-098. Extiende endpoint de US-027 con range enum único; sin endpoints nuevos.

## Technical Specification

- Status: Generated
- Last Execution At: 2026-06-26T23:00:00Z
- Path: management/technical-specs/P1/PB-P1-019/US-032-technical-spec.md
- Notes: Ready for Task Breakdown. PB-P1-019, execution order 37; US-032 posición 1 de 2 (US-032 → US-033). Extensión scope sin endpoint nuevo: extiende GET /api/v1/events/:eventId/tasks de US-027. Sin nuevo controller, use case ni módulo. Range enum único range ∈ {overdue, 7d, 30d, all} con tolerancia .catch('all') consistente con US-027 EC-01. DTO TaskListItemDto extendido con overdue: boolean e is_t_minus_7: boolean derivados server-side por TaskListItemMapper. CURRENT_DATE PostgreSQL como referencia canónica (date puro sin TZ, /docs/6 C-028); due_date IS NULL excluido de overdue/7d/30d; tareas done/skipped excluidas de overdue. Reuso íntegro EventOwnershipPolicy, OrganizerRoleGuard, adminExclusionGuard, controller, use case, repositorio paginado y logger de US-027. Frontend: TaskRangeFilter segmented control URL-driven (4 toggles, WCAG AA, i18n 4 locales, aria-pressed), extensión TaskListItem con badges Vencido / Próximo a vencer. Log extendido tasks.list.requested gana range_filter y range_dropped. Sin migraciones; reuso idx_event_tasks_event_status_due.

## Development Tasks

- Status: Generated
- Last Execution At: 2026-06-26T23:15:00Z
- Path: management/development-tasks/P1/PB-P1-019/US-032-development-tasks.md
- Task Count: 21
- Task ID Range: TASK-PB-P1-019-US-032-DB-001 … TASK-PB-P1-019-US-032-DOC-002
- Notes: Ready for Sprint Planning. Áreas DB(1), BE(5), API(0), SEC(0), OBS(1), FE(4), SEED(1), QA(7), AI(0), OPS(0), DOC(2). Componentes core: extensión listEventTasksQuerySchema con range tolerante .catch('all'); extensión TaskListItemDto con overdue e is_t_minus_7; extensión TaskListItemMapper (flags derivados server-side); extensión EventTaskListRepository.findByEventPaginated con WHERE por range (CURRENT_DATE PostgreSQL); extensión ListEventTasksUseCase (propagación); extensión log tasks.list.requested con range_filter + range_dropped; componente TaskRangeFilter segmented control URL-driven WCAG AA; extensión useEventTasks (cache key con range); extensión TaskListItem con badges Vencido/Próximo a vencer; extensión EmptyChecklistState con copy filtrado + i18n 4 locales. Cobertura AC-01..08, EC-01..10, VR-01..08, SEC-01..08, AUTH-TS-01..05, CONC-01..03, A11Y-01..04, PERF-01..03. Reuso íntegro de US-027: controller GET, EventOwnershipPolicy, OrganizerRoleGuard, adminExclusionGuard, ownership backend-only, no-revelación 404, paginación page-based, ordenamiento canónico, métricas Prometheus existentes. Sin migraciones (DB-001 verifica cobertura del índice canónico contra dataset de 200 tareas). Handoff a US-033: consume DTO extendido y filtros por range para % done.

## Workflow

- Current Stage: completed
- Overall Status: Completed
- Stop Reason: null
- Next Eligible Stage: none
