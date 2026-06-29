# Workflow State — US-031

## Metadata

- Workflow Version: 1.0
- User Story ID: US-031
- User Story Path: management/user-stories/US-031-confirm-ai-tasks-bulk.md
- Created At: 2026-06-26T15:35:00Z
- Updated At: 2026-06-26T16:50:00Z

## Refinement

- Status: Completed
- Last Execution At: 2026-06-26T16:00:00Z
- Refinement Review Path: management/user-stories/refinement-reviews/US-031-refinement-review.md
- Blocking Decisions: None
- Notes: Refinado in situ. Trazabilidad FR-TASK-005, UC-TASK-001, BR-TASK-003/005, BR-AI-001..010, NFR-PERF-001. Backlog PB-P1-017. Endpoint POST /api/v1/events/:eventId/tasks/confirm-bulk. Decisión PO aplicada: éxito parcial controlado con { results, summary }; NO all-or-nothing. Cada ítem corre micro-transacción UPDATE ... WHERE status='pending'. Límite 50 IDs. Dedup silencioso. US-031 no modifica AIRecommendation (la padre ya quedó accepted en US-025). AC ampliados a 5, EC a 10, VR-01..10, SEC-01..09. Cinco Documentation Alignment Required no bloqueantes.

## Decision Resolution

- Status: Not Required
- Last Execution At: null
- Source Review Path: null
- Remaining Decisions: 0
- Notes: No requerido. Decisión PO formalizada en backlog PB-P1-017; semántica de éxito parcial controlado documentada en /docs/16. HITL canónico ya definido en US-025/BR-AI-001..010.

## Approval

- Status: Approved with Minor Notes
- Last Execution At: 2026-06-26T16:15:00Z
- Approval Artifact Path: management/user-stories/US-031-confirm-ai-tasks-bulk.md
- Notes: Aprobada por PO/BA Review. 5 notas no bloqueantes (Documentation Alignment): /docs/9 (FR-TASK-006 → FR-TASK-005), /docs/8 (UC-TASK-005 → UC-TASK-001), /docs/4 (BR expandidos), /docs/10 (NFR-PERF-API-001 → NFR-PERF-001), /docs/16 (snapshot OpenAPI vía US-098). Semántica de éxito parcial controlado formalizada en PB-P1-017.

## Technical Specification

- Status: Generated
- Last Execution At: 2026-06-26T16:30:00Z
- Path: management/technical-specs/P1/PB-P1-017/US-031-technical-spec.md
- Notes: Ready for Task Breakdown. PB-P1-017, execution order 35. Sin migraciones nuevas (verificación de schema event_tasks + enum). Módulo src/modules/tasks/bulk-confirm/ con ConfirmAITasksBulkUseCase, AITaskBulkRepository.confirmConditional, controller, Zod schemas, errores de dominio, mapper. Endpoint canónico POST /api/v1/events/:eventId/tasks/confirm-bulk con body { taskIds[] } 1..50 UUIDv4 y response 200 con { results, summary }. Semántica de éxito parcial: UPDATE conditional por ítem + SELECT diagnóstico solo si affected=0. Pre-checks globales: ownership, event mutable, admin-exclusion. Dedup silencioso pre-Zod-limit. Telemetría: 5 logs + 5 métricas Prometheus. Frontend: AITasksPendingSection, BulkConfirmBar sticky, BulkResultBanner, hook TanStack con invalidación, i18n 4 locales. Trazabilidad IA preservada por tarea; AIRecommendation padre intacta.

## Development Tasks

- Status: Generated
- Last Execution At: 2026-06-26T16:45:00Z
- Path: management/development-tasks/P1/PB-P1-017/US-031-development-tasks.md
- Task Count: 24
- Task ID Range: TASK-PB-P1-017-US-031-DB-001 … TASK-PB-P1-017-US-031-DOC-002
- Notes: Ready for Sprint Planning. Áreas DB(1), BE(6), API(1), SEC(2), FE(4), OBS(1), QA(6), SEED(1), DOC(2); AI(0) — endpoint no invoca LLMProvider y AIRecommendation padre no se modifica. Componentes core: Zod schemas + DTOs, AITaskBulkRepository.confirmConditional (UPDATE conditional + diagnóstico), ConfirmAITasksBulkUseCase (dedup + pre-checks + agregación), BulkConfirmResultMapper, errores de dominio, controller + ruta, adminExclusionGuard, AITasksPendingSection + BulkConfirmBar sticky + BulkResultBanner + hook TanStack. Cobertura completa AC-01..05, EC-01..10, VR-01..10, SEC-01..09, AI-TS-01..03, AUTH-TS-01..05, accesibilidad y NFR-PERF-001. DOC-001 coordina OpenAPI vía US-098; DOC-002 cubre cleanup en /docs/9, /docs/8, /docs/4, /docs/10.

## Workflow

- Current Stage: completed
- Overall Status: Completed
- Stop Reason: null
- Next Eligible Stage: none
