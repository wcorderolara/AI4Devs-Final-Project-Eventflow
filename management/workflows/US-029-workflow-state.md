# Workflow State — US-029

## Metadata

- Workflow Version: 1.0
- User Story ID: US-029
- User Story Path: management/user-stories/US-029-edit-delete-task.md
- Created At: 2026-06-26T19:50:00Z
- Updated At: 2026-06-26T20:55:00Z

## Refinement

- Status: Completed
- Last Execution At: 2026-06-26T20:00:00Z
- Refinement Review Path: management/user-stories/refinement-reviews/US-029-refinement-review.md
- Blocking Decisions: None
- Notes: Refinado in situ. Backlog PB-P1-018 (compartido con US-027/028/030). Tres endpoints canónicos /docs/16 §25.2: PATCH /events/:eventId/tasks/:taskId (content), PATCH .../status (state machine), DELETE (soft delete 204). State machine canónica pending → in_progress → done|skipped; idempotencia same-state 200 no_op; transición inválida 409 INVALID_TRANSITION. ai_generated/ai_recommendation_id/confirmed_at INMUTABLES; server-controlled fields descartados con log body.ignoredFields (consistente con US-028). confirmed_at exclusivo de US-025/US-031. Mutabilidad atómica vía pg_advisory_xact_lock(hashtext(eventId)); 409 EVENT_NOT_MUTABLE en cancelled/completed; 404 soft-deleted. Doble DELETE → 404 (no-revelación). due_date pasada rechazada solo en pending. Response 200 OK con TaskListItemDto consistente con US-027/028. AC 6, EC 14, VR-01..14, SEC-01..09. Telemetría 5 logs + 4 métricas. Tres Documentation Alignment Required no bloqueantes.

## Decision Resolution

- Status: Not Required
- Last Execution At: null
- Source Review Path: null
- Remaining Decisions: 0
- Notes: No requerido. Decisiones formalizadas en /docs/16 §25.2/§25.4, FR-TASK-003/004/005/011/012, UC-TASK-003, BR-TASK-002/004/005/006/010, PO Decision PB-P1-018.

## Approval

- Status: Approved with Minor Notes
- Last Execution At: 2026-06-26T20:15:00Z
- Approval Artifact Path: management/user-stories/US-029-edit-delete-task.md
- Notes: Aprobada por PO/BA Review. 3 notas no bloqueantes (Documentation Alignment): /docs/10 NFR renumeración, /docs/9 UC canónico, /docs/16 snapshot OpenAPI vía US-098. State machine canónica pending → in_progress → done|skipped formalizada en FR-TASK-004. ai_generated INMUTABLE garantizado por FR-TASK-012.

## Technical Specification

- Status: Generated
- Last Execution At: 2026-06-26T20:30:00Z
- Path: management/technical-specs/P1/PB-P1-018/US-029-technical-spec.md
- Notes: Ready for Task Breakdown. PB-P1-018, US-029 posición 3 de 4 (US-027 → US-028 → US-029 → US-030). Sin migraciones nuevas; reusa event_tasks + enum event_task_status + idx_event_tasks_event_active. Tres endpoints canónicos: PATCH content (200 + TaskListItemDto), PATCH .../status (200 idempotente con log tasks.updated.no_op), DELETE (204). Módulo nuevo src/modules/tasks/mutate/ con UpdateEventTaskContentUseCase, UpdateEventTaskStatusUseCase, SoftDeleteEventTaskUseCase, EventTaskStateMachineService (puro), EventTaskMutateRepository, errores de dominio. State machine canónica pending → {in_progress, done, skipped}; in_progress → {done, skipped}; done/skipped terminales; 409 INVALID_TRANSITION. Mutabilidad atómica vía prismaService.$transaction + pg_advisory_xact_lock. UPDATE condicional para status y DELETE. ai_generated/ai_recommendation_id/confirmed_at INMUTABLES vía Zod .strip() + log body.ignoredFields. Reuso EventOwnershipPolicy, OrganizerRoleGuard, adminExclusionGuard, EventTaskRepository, TaskListItemMapper (US-027) y ServiceCategoryReadPort (US-028). Frontend: TaskItemInlineEdit, TaskStatusMenu, DeleteTaskDialog con focus trap; 3 hooks TanStack; i18n 4 locales; WCAG AA. Telemetría: 5 logs + 4 métricas Prometheus.

## Development Tasks

- Status: Generated
- Last Execution At: 2026-06-26T20:50:00Z
- Path: management/development-tasks/P1/PB-P1-018/US-029-development-tasks.md
- Task Count: 27
- Task ID Range: TASK-PB-P1-018-US-029-DB-001 … TASK-PB-P1-018-US-029-DOC-002
- Notes: Ready for Sprint Planning. Áreas DB(1), BE(7), API(3), SEC(2), OBS(1), FE(4), QA(7), DOC(2); AI(0) — no invoca LLMProvider; preserva ai_* y confirmed_at como inmutables. SEED(0) — fundación PB-P1-018 ya sembrada. Componentes core: EventTaskStateMachineService puro, schemas Zod + helper extractIgnoredFields (reuso US-028), EventTaskMutateRepository con pg_advisory_xact_lock + UPDATE condicional + SELECT diagnóstico, tres use cases (UpdateEventTaskContentUseCase, UpdateEventTaskStatusUseCase con no_op idempotente, SoftDeleteEventTaskUseCase), tres controllers (200/200/204), reuso EventOwnershipPolicy + OrganizerRoleGuard + adminExclusionGuard (US-027/028), reuso ServiceCategoryReadPort (US-028), reuso TaskListItemMapper + TaskListItemDto (US-027); FE: TaskItemInlineEdit + TaskStatusMenu (transiciones permitidas del state machine) + DeleteTaskDialog con focus trap + 3 hooks TanStack con invalidación de ['tasks', eventId] + i18n 4 locales WCAG AA; OBS: 5 logs sin PII + 4 métricas Prometheus incluida tasks_transition_rejected_total{reason}. Cobertura AC-01..06, EC-01..14, VR-01..14, SEC-01..09, AUTH-TS-01..05, CONC-01..03. Sin migraciones. Handoffs: US-030 (auditoría admin de soft-deleted requiere deleted_at/deleted_by_user_id poblados aquí); US-032/033 (filtros temporales y % progreso consumen state machine).

## Workflow

- Current Stage: completed
- Overall Status: Completed
- Stop Reason: null
- Next Eligible Stage: none
