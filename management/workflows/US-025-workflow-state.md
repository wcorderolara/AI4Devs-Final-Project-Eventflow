# Workflow State — US-025

## Metadata

- Workflow Version: 1.0
- User Story ID: US-025
- User Story Path: management/user-stories/US-025-accept-edit-discard-ai-suggestion.md
- Created At: 2026-06-26T14:10:00Z
- Updated At: 2026-06-26T15:25:00Z

## Refinement

- Status: Completed
- Last Execution At: 2026-06-26T14:35:00Z
- Refinement Review Path: management/user-stories/refinement-reviews/US-025-refinement-review.md
- Blocking Decisions: None
- Notes: Refinado in situ. Trazabilidad FR-AI-019 + FR-AI-018; UC-AI-002 + transversal UC-AI-001..008. Endpoint canónico de /docs/16 §35.3: dos POST (/apply y /discard), no PATCH. State machine pending → {accepted, discarded}; edited es flag boolean. Strategy AIRecommendationApplyStrategyRegistry con tabla canónica de side effects por los 8 type MVP. Backlog PB-P1-016. Sin migraciones. AC ampliados a 6, EC a 8, VR-01..09, SEC-01..09, AI-TS-01..07, AUTH-TS-01..06. Tres Documentation Alignment Required no bloqueantes (/docs/9, /docs/8, /docs/16).

## Decision Resolution

- Status: Not Required
- Last Execution At: null
- Source Review Path: null
- Remaining Decisions: 0
- Notes: No requerido. Decisiones HITL formalizadas en BR-AI-001..004, FR-AI-019, PO 8.1 nota canónica UC-AI-001..009, /docs/16 §35.3.

## Approval

- Status: Approved with Minor Notes
- Last Execution At: 2026-06-26T14:50:00Z
- Approval Artifact Path: management/user-stories/US-025-accept-edit-discard-ai-suggestion.md
- Notes: Aprobada por PO/BA Review. 3 notas no bloqueantes (Documentation Alignment): /docs/9 (FR-AI-015/016 → FR-AI-019/018), /docs/8 (UC-AI-009 → UC-AI-002 + transversal), /docs/16 (snapshot OpenAPI vía US-098). Side effects delegados a US-017..US-024, US-031/PB-P1-017, US-023/PB-P1-030.

## Technical Specification

- Status: Generated
- Last Execution At: 2026-06-26T15:05:00Z
- Path: management/technical-specs/P1/PB-P1-016/US-025-technical-spec.md
- Notes: Ready for Task Breakdown. PB-P1-016, execution order 34. Sin migraciones nuevas; reusa fundación AI-001 (US-017). Dos endpoints canónicos POST /apply (200) y POST /discard (204). ApplyAIRecommendationUseCase + DiscardAIRecommendationUseCase + AIRecommendationApplyStrategyRegistry con 8 strategies MVP. prismaService.$transaction con UPDATE ... WHERE status='pending' para idempotencia natural sin If-Match. Ownership backend-only; admin excluido (FR-ADMIN-010). editedPayload ≤256KB validado por OutputDtoResolver.schemaFor(type); edited es flag boolean. PII redaction reutiliza OrganizerPiiDetector de US-021. 6 logs estructurados + métricas hitl_*. Componente HITLActions reusable + invalidación de queries origen.

## Development Tasks

- Status: Generated
- Last Execution At: 2026-06-26T15:20:00Z
- Path: management/development-tasks/P1/PB-P1-016/US-025-development-tasks.md
- Task Count: 25
- Task ID Range: TASK-PB-P1-016-US-025-DB-001 … TASK-PB-P1-016-US-025-DOC-002
- Notes: Ready for Sprint Planning. Áreas DB(1), BE(6), API(2), SEC(2), FE(4), OBS(1), QA(6), SEED(1), DOC(2). AI(0) — HITL no invoca al LLMProvider. Componentes core: AIRecommendationHITLRepository, AIRecommendationApplyStrategyRegistry+contract+errores, OutputDtoResolver, 8 strategies MVP, ApplyAIRecommendationUseCase con prismaService.$transaction, DiscardAIRecommendationUseCase, controller con body limit 256KB scoped, AIRecommendationOwnershipPolicy con admin-exclusión + no-revelación, HITLActions+HITLEditModal+hooks con invalidación. Reusa fundación AI-001 (US-017), OrganizerPiiDetector (US-021), repositorios de US-017/018/019/020/021/022/024/031. Handoffs a US-023 y US-031/PB-P1-017. DOC-001 coordina OpenAPI vía US-098.

## Workflow

- Current Stage: completed
- Overall Status: Completed
- Stop Reason: null
- Next Eligible Stage: none
