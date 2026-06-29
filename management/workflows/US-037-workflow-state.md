# Workflow State — US-037

## Metadata

- Workflow Version: 1.0
- User Story ID: US-037
- User Story Path: management/user-stories/US-037-accept-ai-budget-distribution.md
- Created At: 2026-06-27T05:35:00Z
- Updated At: 2026-06-27T07:45:00Z

## Refinement

- Status: Completed
- Last Execution At: 2026-06-27T06:35:00Z
- Refinement Review Path: management/user-stories/refinement-reviews/US-037-refinement-review.md
- Blocking Decisions: Resolved
- Notes: Revalidación post-decisión confirmada. Q1–Q6 incorporadas. Traceability corregida (FR-BUDGET-010 + FR-AI-003/010; UC-BUDGET-001; BR-BUDGET-007/008/009 + BR-AI-001..003/008/011). AC ampliados (AC-01..10), EC-01..09, VR-01..10, SEC-01..06. 4 Documentation Alignment Required no bloqueantes. US lista para approval.

## Decision Resolution

- Status: Resolved
- Last Execution At: 2026-06-27T06:20:00Z
- Source Review Path: management/user-stories/refinement-reviews/US-037-refinement-review.md
- Remaining Decisions: 0
- Notes: 6/6 decisiones formalizadas en management/user-stories/decision-resolutions/US-037-decision-resolution.md. D1: reuso del endpoint genérico de US-025 (POST /api/v1/ai-recommendations/:id/apply); US-037 aporta handler ApplyBudgetSuggestionUseCase para type='budget_suggestion'. D2: soft delete solo de items ai_generated=true con ai_recommendation_id previo distinto; manuales preservados; UI confirma con conteo. D3: body `{ editedPayload?: { categories: [{ service_category_code, planned, label? }] } }`; subset implícito = descarte; vacío → 400. D4: status='accepted' (parcial y total), edited registra edición, accepted_at/by; sin estados nuevos. D5: bloqueo en event.status ∈ {cancelled, completed} → 409 EVENT_NOT_EDITABLE (consistente con US-036 D3). D6: 409 CATEGORY_INACTIVE con lista; UI ofrece regenerar (US-019) o aplicar manual (US-036). Traceability corregida (FR-BUDGET-010 + FR-AI-003/010; UC-BUDGET-001; BR-BUDGET-007/008/009 + BR-AI-001..003/008/011; NFR-PERF-001). Backlog Item PB-P1-021 declarado. AC reescritos (AC-01..10), EC-01..09, VR-01..10, SEC-01..06. User Story actualizada con Status=Ready for Approval.

## Approval

- Status: Approved with Minor Notes
- Last Execution At: 2026-06-27T06:45:00Z
- Approval Artifact Path: management/user-stories/US-037-accept-ai-budget-distribution.md
- Notes: Aprobada por PO/BA Review. 4 notas no bloqueantes (Documentation Alignment Required): docs/16 §35.3 con catálogo de errores por type, nota interpretativa en docs/8 §UC-BUDGET-001 §E1 (CATEGORY_INACTIVE), nota en docs/4 §BR-BUDGET-008 referenciando D3, housekeeping NFR-PERF-001. Sin routing nuevo: reusa endpoint de US-025. Sin migraciones. Cierre del ciclo Budget IA: US-019 → US-025 → US-037 → US-035/US-036. Tech Spec debe formalizar contrato port/adapter del dispatcher.

## Technical Specification

- Status: Generated
- Last Execution At: 2026-06-27T07:15:00Z
- Path: management/technical-specs/P1/PB-P1-021/US-037-technical-spec.md
- Notes: Ready for Task Breakdown. PB-P1-021 posición 1 de 1; execution order 39. US-037 implementa `ApplyBudgetSuggestionUseCase` y el adapter `BudgetSuggestionApplyHandler` registrado en el dispatcher de US-025 (sin routing nuevo). Reutiliza POST /api/v1/ai-recommendations/:id/apply de US-025. Lógica D1-D6 dentro de prisma.$transaction: (a) soft delete de items reemplazables D2, (b) inserts N BudgetItem con ai_generated=true, ai_recommendation_id, committed=0, paid=0, (c) update AIRecommendation {status=accepted, edited, accepted_at, accepted_by}. Zod estricto para editedPayload; resolución de service_category_code a service_category_id con verificación is_active. Verificaciones D5 (event.status), D8/AC-08 (currency_code), D4 (status pending). Acoplamiento hexagonal preservado mediante ports: AIRecommendationApplyHandlerPort (provisto por US-025/modules/ai-recommendations) y ServiceCategoryReadPort (modules/budget consume, modules/catalog provee). Frontend: ApplyAIBudgetDialog (preview + edición + toggle), ReplaceConfirmationDialog (D2 confirmación), CategoryInactiveErrorDialog (D6 con CTAs deeplink US-019/US-036), hook useApplyBudgetSuggestion que invalida `['event', eventId, 'budget']`. Sin migraciones; sin LLMProvider en runtime. Cobertura AC-01..10, EC-01..09, VR-01..10, SEC-01..06, A11Y-01..03, PERF-01, CONTRACT-01. Documentation Alignment Required (4 no bloqueantes): docs/16 §35.3 catálogo errores por type, UC-BUDGET-001 §E1 CATEGORY_INACTIVE, BR-BUDGET-008 nota interpretativa, housekeeping NFR-PERF-001.

## Development Tasks

- Status: Generated
- Last Execution At: 2026-06-27T07:45:00Z
- Path: management/development-tasks/P1/PB-P1-021/US-037-development-tasks.md
- Task Count: 26
- Task ID Range: TASK-PB-P1-021-US-037-BE-001 … TASK-PB-P1-021-US-037-DOC-003
- Notes: Ready for Sprint Planning. Áreas: BE(8), OBS(1), FE(6), SEED(1), QA(7), DOC(3). Backend: Zod schemas estrictos (rechazo de campos extras), ServiceCategoryReadPort + adapter (hexagonal con modules/catalog), extensiones de BudgetItemWriteRepository (findReplaceable D2, createMany, softDeleteMany) y AIRecommendationRepository (markAccepted), ApplyBudgetSuggestionUseCase con lógica D1-D6 en prisma.$transaction, BudgetSuggestionApplyHandler como adapter del port de US-025, DI wiring. Frontend: cliente apply (verificación de US-025), hook useApplyBudgetSuggestion con invalidación TanStack `['event', eventId, 'budget']`, 3 dialogs accesibles (ApplyAI/ReplaceConfirmation/CategoryInactive), integración con vista de US-035 + i18n CLDR en 4 locales con mapeo error_code → copy. Cobertura AC-01..10, EC-01..09, VR-01..10, SEC-01..06, A11Y-01..03, PERF-01, CONTRACT-01, regresión soft delete US-035 (IT-12). Reuso íntegro de policies/guards. Sin migraciones, sin LLMProvider en runtime. Documentation Alignment Required (3): docs/16 §35.3 catálogo errores por type, UC-BUDGET-001 §E1 CATEGORY_INACTIVE, BR-BUDGET-008 shape editedPayload. Cierre PB-P1-021 con handoff transversal: US-019 → US-025 → US-037 → US-035/US-036.

## Workflow

- Current Stage: completed
- Overall Status: Completed
- Stop Reason: null
- Next Eligible Stage: none
