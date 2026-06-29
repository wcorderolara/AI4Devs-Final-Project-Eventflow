# Workflow State — US-027

## Metadata

- Workflow Version: 1.0
- User Story ID: US-027
- User Story Path: management/user-stories/US-027-view-event-checklist.md
- Created At: 2026-06-26T17:00:00Z
- Updated At: 2026-06-26T18:15:00Z

## Refinement

- Status: Completed
- Last Execution At: 2026-06-26T17:25:00Z
- Refinement Review Path: management/user-stories/refinement-reviews/US-027-refinement-review.md
- Blocking Decisions: None
- Notes: Refinado in situ. Backlog PB-P1-018 (compartido con US-028/029/030). Trazabilidad FR-TASK-001/002, FR-AI-019, UC-TASK-001/002, BR-TASK-001/002/008/009, BR-AI-008/010, NFR-PERF-001/005, NFR-OBS-001/002. Endpoint GET /api/v1/events/:eventId/tasks con paginación canónica pageSize=20 default/100 máx; filtros tolerantes status, aiGenerated, categoryCode (descarte silencioso). TaskListItemDto minimal con trazabilidad IA (ai_generated, ai_recommendation_id?, confirmed_at?). Filtros temporales y % progreso fuera de scope (US-032/033/PB-P1-019). Empty state con doble CTA (US-028 + US-018). AC ampliados a 8, EC a 8, VR-01..08, SEC-01..08, AUTH-TS-01..05, NT-01..11. Tres Documentation Alignment Required no bloqueantes.

## Decision Resolution

- Status: Not Required
- Last Execution At: null
- Source Review Path: null
- Remaining Decisions: 0
- Notes: No requerido. Decisiones formalizadas en /docs/16 §28, US-013 sibling, /docs/4 BR-TASK-*/AI-*, /docs/10 NFR-PERF/OBS, PB-P1-018 Acceptance Summary.

## Approval

- Status: Approved with Minor Notes
- Last Execution At: 2026-06-26T17:40:00Z
- Approval Artifact Path: management/user-stories/US-027-view-event-checklist.md
- Notes: Aprobada por PO/BA Review. 3 notas no bloqueantes (Documentation Alignment): /docs/16 (paginación canónica pageSize=20/100 vs draft 10), /docs/10 (NFR-PERF-API-001 → NFR-PERF-001 + NFR-PERF-005), snapshot OpenAPI vía US-098. Mutaciones delegadas a US-028..030, US-031 y US-032/033.

## Technical Specification

- Status: Generated
- Last Execution At: 2026-06-26T17:55:00Z
- Path: management/technical-specs/P1/PB-P1-018/US-027-technical-spec.md
- Notes: Ready for Task Breakdown. PB-P1-018, execution order 36. Sin migraciones nuevas; reusa índice canónico idx_event_tasks_event_status_due. Endpoint canónico GET /api/v1/events/:eventId/tasks con paginación page-based (pageSize=20/máx 100) y filtros tolerantes Zod .catch() + log filters.dropped (sin 400). Módulo src/modules/tasks/list/ con ListEventTasksUseCase, EventTaskListRepository.findByEventPaginated, TaskListItemMapper, controller, Zod schemas, errores de dominio. TaskListItemDto con trazabilidad IA mínima (sin payloads LLM). Orden canónico due_date ASC NULLS LAST, created_at DESC. Soft delete enforced. Ownership backend-only; vendor/admin 403; ajeno/inexistente 404. i18n 4 locales con fallback es-LATAM. Telemetría: log tasks.list.requested + 3 métricas Prometheus. Frontend SSR primera página + TanStack con URL-driven filters.

## Development Tasks

- Status: Generated
- Last Execution At: 2026-06-26T18:10:00Z
- Path: management/development-tasks/P1/PB-P1-018/US-027-development-tasks.md
- Task Count: 22
- Task ID Range: TASK-PB-P1-018-US-027-DB-001 … TASK-PB-P1-018-US-027-DOC-002
- Notes: Ready for Sprint Planning. Áreas DB(1), BE(5), API(1), SEC(2), FE(4), OBS(1), QA(6), DOC(2); AI(0) — endpoint de lectura puro, no invoca LLMProvider; SEED(0) — el seed lo cubren US-018 y US-028..030. Componentes core: schemas Zod con .catch() por filtro, TaskListItemDto / ListEventTasksResponseDto, EventTaskListRepository.findByEventPaginated, TaskListItemMapper (IA-mínimo), ListEventTasksUseCase, EventOwnershipPolicy (no-revelación 404), OrganizerRoleGuard + adminExclusionGuard, log tasks.list.requested + 3 métricas Prometheus, EventChecklistPage SSR + TaskList/TaskListItem/TaskFilters/Pagination/EmptyChecklistState + i18n 4 locales. Cobertura AC-01..08, EC-01..08, VR-01..08, SEC-01..08, AUTH-TS-01..05, NT-01..11. Sin migraciones (DB-001 verifica schema + índice canónico). Handoffs: mutaciones a US-028..030, bulk a US-031, filtros temporales y % progreso a US-032/033/PB-P1-019, endpoint admin a US-016. DOC-001 coordina OpenAPI vía US-098; DOC-002 cubre /docs/10 + /docs/16.

## Workflow

- Current Stage: completed
- Overall Status: Completed
- Stop Reason: null
- Next Eligible Stage: none
