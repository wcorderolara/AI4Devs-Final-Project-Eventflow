# Workflow State — US-038

## Metadata

- Workflow Version: 1.0
- User Story ID: US-038
- User Story Path: management/user-stories/US-038-budget-overcommitted-warning.md
- Created At: 2026-06-27T07:50:00Z
- Updated At: 2026-06-27T09:45:00Z

## Refinement

- Status: Completed
- Last Execution At: 2026-06-27T08:40:00Z
- Refinement Review Path: management/user-stories/refinement-reviews/US-038-refinement-review.md
- Blocking Decisions: Resolved
- Notes: Revalidación post-decisión confirmada. Q1–Q4 incorporadas. Traceability corregida (FR-BUDGET-004/005; UC-BUDGET-003; BR-BUDGET-003/004). AC reescritos (AC-01..07), EC-01..06. 4 Documentation Alignment Required no bloqueantes. US lista para approval.

## Decision Resolution

- Status: Resolved
- Last Execution At: 2026-06-27T08:25:00Z
- Source Review Path: management/user-stories/refinement-reviews/US-038-refinement-review.md
- Remaining Decisions: 0
- Notes: 4/4 decisiones formalizadas en management/user-stories/decision-resolutions/US-038-decision-resolution.md. D1: extiende US-035 (no subsume) con summary.overcommitted_amount, items[].over_committed, items[].overcommitted_amount; sin endpoint nuevo, sin migraciones. D2: CTA único "Editar items" con scroll/focus a primera fila over_committed=true; badge per-item informativo con aria-label localizado; "Ajustar total" ELIMINADO (total derivado). D3: tolerancia adaptativa `10^(-currency.decimal_places)` (USD/EUR/MXN/COP/GTQ=0.01; CLP/JPY=1); fallback defensivo `decimal_places=2`. D4: `item.over_committed = (item.committed - item.planned) > tolerance` con D3; caso planned=0 ∧ committed>0 ⇒ badge. Traceability corregida (FR-BUDGET-004/005; UC-BUDGET-003; BR-BUDGET-003/004; NFR-PERF-001). Backlog Item PB-P1-022 declarado. User Story actualizada con Status=Ready for Approval.

## Approval

- Status: Approved with Minor Notes
- Last Execution At: 2026-06-27T08:50:00Z
- Approval Artifact Path: management/user-stories/US-038-budget-overcommitted-warning.md
- Notes: Aprobada por PO/BA Review. 4 notas no bloqueantes (Documentation Alignment Required): docs/16 §M06 con shape extendido, docs/4 §BR-BUDGET-004 nota interpretativa D3, verificación Currency.decimal_places en docs/6 + PB-P0-001, housekeeping NFR-PERF-001. Extensión incremental de US-035 sin endpoint nuevo; coordinar evolución forward-compatible del DTO. Sin migraciones. Reuso íntegro de policies/guards. Cierre de PB-P1-022 con handoff transversal US-035 ↔ US-036 ↔ US-039.

## Technical Specification

- Status: Generated
- Last Execution At: 2026-06-27T09:20:00Z
- Path: management/technical-specs/P1/PB-P1-022/US-038-technical-spec.md
- Notes: Ready for Task Breakdown. PB-P1-022 posición 1 de 1; execution order 40. Extensión incremental de GetBudgetUseCase (US-035) con helper puro `calculateOvercommitFields`, CurrencyReadPort + adapter en modules/catalog, extensión de DTOs Zod (BudgetSummaryDto + BudgetItemDto), extensión del UseCase con lookup de Currency.decimal_places y fallback defensivo `2` + log warning. Frontend: hook useOvercommitFocus, extensión de BudgetSummary (delta), BudgetItemsTable (badge per-fila con role="img"/role="status" + aria-label localizado + data-overcommit), OvercommitWarning (CTA único "Editar items" con scrollIntoView + focus). i18n CLDR en 4 locales. Forward-compat: campos nuevos siempre presentes con default `0`/`false`. Sin migraciones, sin endpoints, sin breaking changes. Reuso íntegro de policies/guards. Cobertura AC-01..07, EC-01..06, VR-01..04, SEC-01, A11Y-01..03, PERF-01 (sin regresión), CONTRACT-01. Documentation Alignment Required (4 no bloqueantes): docs/16 §M06 shape extendido, docs/4 §BR-BUDGET-004 nota D3, verificación currencies.decimal_places, housekeeping NFR-PERF-001.

## Development Tasks

- Status: Generated
- Last Execution At: 2026-06-27T09:45:00Z
- Path: management/development-tasks/P1/PB-P1-022/US-038-development-tasks.md
- Task Count: 21
- Task ID Range: TASK-PB-P1-022-US-038-BE-001 … TASK-PB-P1-022-US-038-DOC-003
- Notes: Ready for Sprint Planning. Áreas: BE(5), FE(5), SEED(1), QA(7), DOC(3). Backend: helper puro `calculateOvercommitFields` testeable, CurrencyReadPort + adapter en modules/catalog (hexagonal), DTOs extendidos forward-compat, extensión de GetBudgetUseCase con lookup currency + fallback defensivo `decimal_places=2` + log warning `currency.decimal_places.missing`, extensión del log `budget.viewed` con `overcommitted_amount` y `over_committed_items_count`. Frontend: hook useOvercommitFocus (scroll + focus a primera fila over_committed), extensión BudgetSummary (delta con CLDR), extensión BudgetItemsTable (badge per-fila con role="img"/role="status" + aria-label localizado + data-overcommit), extensión OvercommitWarning con CTA "Editar items", i18n en 4 locales. Cobertura AC-01..07, EC-01..06, VR-01..04, SEC-01 (regresión), A11Y-01..03, PERF-01 sin regresión vs US-035, CONTRACT-01 forward-compat. Sin migraciones, sin endpoints nuevos, sin breaking changes. Documentation Alignment Required (3): docs/16 §M06 shape extendido, docs/4 §BR-BUDGET-004 nota D3, verificación currencies.decimal_places en docs/6 + PB-P0-001. Cierre PB-P1-022 con extensión incremental de US-035 sin afectar a US-036/US-037/US-039.

## Workflow

- Current Stage: completed
- Overall Status: Completed
- Stop Reason: null
- Next Eligible Stage: none
