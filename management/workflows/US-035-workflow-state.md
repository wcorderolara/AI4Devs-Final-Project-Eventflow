# Workflow State — US-035

## Metadata

- Workflow Version: 1.0
- User Story ID: US-035
- User Story Path: management/user-stories/US-035-view-edit-budget.md
- Created At: 2026-06-27T01:30:00Z
- Updated At: 2026-06-27T03:30:00Z

## Refinement

- Status: Completed
- Last Execution At: 2026-06-27T02:20:00Z
- Refinement Review Path: management/user-stories/refinement-reviews/US-035-refinement-review.md
- Blocking Decisions: Resolved
- Notes: Revalidación post-decisión confirmada. Q1–Q4 incorporadas, traceability corregida, AC reescritos (AC-02 eliminada). 4 Documentation Alignment Required no bloqueantes registradas. US lista para approval.

## Decision Resolution

- Status: Resolved
- Last Execution At: 2026-06-27T02:05:00Z
- Source Review Path: management/user-stories/refinement-reviews/US-035-refinement-review.md
- Remaining Decisions: 0
- Notes: 4/4 decisiones formalizadas en management/user-stories/decision-resolutions/US-035-decision-resolution.md. D1: solo vista (única ruta GET /api/v1/events/:eventId/budget; sin PATCH; mutaciones delegadas a US-036). D2: CTA "Sugerir IA" = deeplink a US-037 condicionado por feature flag. D3: columna `paid` siempre visible, backend normaliza null→0, `summary.paid_total` expuesto. D4: `summary.over_committed` calculado server-side (UI no recalcula). Traceability corregida (FR-BUDGET-001/004/005/007/010; UC-BUDGET-003; BR-BUDGET-001/002/003/004/006/007/010; NFR-PERF-001). Backlog Item PB-P1-020 declarado. AC-02 eliminada. AC nuevas (AC-03..AC-08), EC ampliados, VR/SEC/Test ampliados. User Story actualizada en sitio con Status=Ready for Approval.

## Approval

- Status: Approved with Minor Notes
- Last Execution At: 2026-06-27T02:30:00Z
- Approval Artifact Path: management/user-stories/US-035-view-edit-budget.md
- Notes: Aprobada por PO/BA Review. 3 notas no bloqueantes (Documentation Alignment Required): docs/16 §M06 con shape extendido, nota interpretativa en BR-BUDGET-002, housekeeping ID NFR-PERF-001 en backlog. Sin endpoint nuevo: única ruta GET /api/v1/events/:eventId/budget. Sin migraciones. CRUD delegado a US-036; sugerencia IA a US-037. Feature flag `ai.budget-suggestion.enabled` pendiente de verificación (no bloqueante).

## Technical Specification

- Status: Generated
- Last Execution At: 2026-06-27T03:00:00Z
- Path: management/technical-specs/P1/PB-P1-020/US-035-technical-spec.md
- Notes: Ready for Task Breakdown. PB-P1-020 posición 1 de 2 (US-035 → US-036); execution order 38. Única ruta GET /api/v1/events/:eventId/budget (consistente con docs/16 §M06). Response extendido con bloque `summary { total_planned, total_committed, paid_total, over_committed, currency_code }` + items[] con normalización paid null→0 y `category_name` resuelto vía join. Sin migraciones; reuso de índices canónicos (PB-P0-001). Módulo nuevo `modules/budget` con GetBudgetController, GetBudgetUseCase y BudgetReadRepository. Frontend: BudgetView, BudgetSummary, BudgetItemsTable, OvercommitWarning, EmptyBudgetState + hook useEventBudget con query key `['event', eventId, 'budget']`. Reuso íntegro de EventOwnershipPolicy, OrganizerRoleGuard, adminExclusionGuard y no-revelación 404. D1 (sólo vista), D2 (CTA IA = deeplink condicional), D3 (paid normalizado), D4 (over_committed server-side) formalizadas. Documentation Alignment Required (3): docs/16 §M06 con shape extendido, BR-BUDGET-002 nota interpretativa, ID NFR-PERF-001 housekeeping. Handoff a US-036 con invalidación del cache TanStack.

## Development Tasks

- Status: Generated
- Last Execution At: 2026-06-27T03:30:00Z
- Path: management/development-tasks/P1/PB-P1-020/US-035-development-tasks.md
- Task Count: 24
- Task ID Range: TASK-PB-P1-020-US-035-DB-001 … TASK-PB-P1-020-US-035-DOC-002
- Notes: Ready for Sprint Planning. Áreas: DB(1), BE(4), API(0), SEC(0), OBS(1), FE(7), SEED(1), QA(7), AI(0), OPS(1), DOC(2). Módulo nuevo `modules/budget` con scope mínimo (1 controller, 1 use case, 1 repository read). Backend: DTOs Zod (BudgetSummaryDto, BudgetItemDto, GetBudgetResponseDto); BudgetReadRepository con SUM agregado; GetBudgetUseCase con `over_committed` server-side y normalización `paid null→0`; controller GET /api/v1/events/:eventId/budget; logger budget.viewed. Frontend: BudgetSummary, BudgetItemsTable, OvercommitWarning, EmptyBudgetState (con deeplinks US-036/US-037 condicional por feature flag), BudgetView page; hook useEventBudget con query key `['event', eventId, 'budget']`; i18n CLDR en 4 locales. Cobertura AC-01..08, EC-01..06, VR-01..05, SEC-01..05, A11Y-01..04, PERF-01, CONTRACT-01. Reuso íntegro de policies/guards de US-027. Sin endpoints nuevos, sin migraciones, sin LLMProvider, sin cache server-side. Handoff a US-036 con invalidación del cache TanStack.

## Workflow

- Current Stage: completed
- Overall Status: Completed
- Stop Reason: null
- Next Eligible Stage: none
