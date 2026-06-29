# Workflow State — US-036

## Metadata

- Workflow Version: 1.0
- User Story ID: US-036
- User Story Path: management/user-stories/US-036-crud-budget-items.md
- Created At: 2026-06-27T03:35:00Z
- Updated At: 2026-06-27T05:30:00Z

## Refinement

- Status: Completed
- Last Execution At: 2026-06-27T04:20:00Z
- Refinement Review Path: management/user-stories/refinement-reviews/US-036-refinement-review.md
- Blocking Decisions: Resolved
- Notes: Revalidación post-decisión confirmada. Q1–Q5 incorporadas, traceability corregida (FR-BUDGET-001/003/006/007/008; UC-BUDGET-002; BR-BUDGET-002/005/007/009 + BR-AI-008 + BR-BOOKING-007/008), AC ampliados (AC-01..10), EC-01..09, VR-01..10, SEC-01..06. 4 Documentation Alignment Required no bloqueantes. US lista para approval.

## Decision Resolution

- Status: Resolved
- Last Execution At: 2026-06-27T04:05:00Z
- Source Review Path: management/user-stories/refinement-reviews/US-036-refinement-review.md
- Remaining Decisions: 0
- Notes: 5/5 decisiones formalizadas en management/user-stories/decision-resolutions/US-036-decision-resolution.md. D1: `committed` no editable (Zod schema excluye; 400 INVALID_FIELD). D2: DELETE soft delete con bloqueos `committed>0` (409 ITEM_HAS_COMMITMENT), `BookingIntent.pending` por (event_id, service_category_id) (409 ITEM_HAS_PENDING_INTENT), `paid>0` (409 ITEM_HAS_PAID_AMOUNT); items soft-deleted filtrados en US-035. D3: mutaciones bloqueadas en `cancelled` y `completed` (409 EVENT_NOT_EDITABLE). D4: regla `paid ≤ committed` eliminada; solo `paid ≥ 0`; warnings advisory client-side. D5: `service_category_id` editable solo si committed=0 (409 ITEM_HAS_COMMITMENT_CATEGORY_LOCKED); múltiples items por categoría permitidos. Traceability corregida (FR-BUDGET-001/003/006/007/008; UC-BUDGET-002; BR-BUDGET-002/005/007/009 + BR-AI-008 + BR-BOOKING-007/008; NFR-PERF-001). Backlog Item PB-P1-020 declarado. AC ampliados (AC-01..10), EC ampliados (EC-01..09), VR-01..10, SEC-01..06. User Story actualizada en sitio con Status=Ready for Approval.

## Approval

- Status: Approved with Minor Notes
- Last Execution At: 2026-06-27T04:30:00Z
- Approval Artifact Path: management/user-stories/US-036-crud-budget-items.md
- Notes: Aprobada por PO/BA Review. 3 notas no bloqueantes (Documentation Alignment Required): docs/8 §UC-BUDGET-002 §E2 extender con `completed`, docs/16 §M06 con request/response shapes y nuevos error_codes, housekeeping ID NFR-PERF-001. Cierra PB-P1-020 con handoff a US-035 vía invalidación de cache TanStack. Sin migraciones nuevas. Cross-module check de BookingIntent.pending por (event_id, service_category_id) a documentar en Tech Spec.

## Technical Specification

- Status: Generated
- Last Execution At: 2026-06-27T05:00:00Z
- Path: management/technical-specs/P1/PB-P1-020/US-036-technical-spec.md
- Notes: Ready for Task Breakdown. PB-P1-020 posición 2 de 2 (US-035 → US-036); execution order 38. Extiende modules/budget de US-035 con tres use cases write (Create/Update/Delete), BudgetItemWriteRepository, port `BookingIntentReadPort` (con adaptador en modules/booking) y controller con tres rutas POST/PATCH/DELETE /api/v1/events/:eventId/budget/items[/:itemId]. Validación Zod estricta (`.strict()`) que rechaza `committed` (D1, 400 INVALID_FIELD). Use cases verifican event.status (D3, 409 EVENT_NOT_EDITABLE), bloqueos de DELETE (D2: committed>0, BookingIntent.pending por (event_id, service_category_id), paid>0) y bloqueo de cambio de categoría con committed>0 (D5). Sin migraciones; extensión leve del BudgetReadRepository de US-035 con filtro `deleted_at IS NULL`. Frontend: 3 componentes (AddBudgetItemModal, EditBudgetItemRow, DeleteBudgetItemDialog), 3 hooks de mutación que invalidan `['event', eventId, 'budget']`, integración con BudgetItemsTable de US-035, warnings advisory client-side cuando paid > committed o paid > planned (D4). i18n CLDR en 4 locales con mapeo error_code → copy. Documentation Alignment Required (3): UC-BUDGET-002 §E2 extender con completed, docs/16 §M06 y §error format con shapes + nuevos códigos, housekeeping NFR-PERF-001. Patrón hexagonal preservado mediante port/adapter.

## Development Tasks

- Status: Generated
- Last Execution At: 2026-06-27T05:30:00Z
- Path: management/development-tasks/P1/PB-P1-020/US-036-development-tasks.md
- Task Count: 25
- Task ID Range: TASK-PB-P1-020-US-036-BE-001 … TASK-PB-P1-020-US-036-DOC-002
- Notes: Ready for Sprint Planning. Áreas: DB(0), BE(7), API(0), SEC(0), OBS(1), FE(9), SEED(1), QA(7), AI(0), OPS(0), DOC(2). Backend: Zod schemas estrictos (rechazo de `committed`), BookingIntentReadPort + adapter (port hexagonal), BudgetItemWriteRepository, 3 use cases (Create/Update/Delete) con verificaciones de estado del evento, categoría, soft delete y cross-module check de BookingIntent.pending, controller con 3 rutas POST/PATCH/DELETE. Frontend: API client items.*, 3 hooks de mutación con invalidación TanStack de `['event', eventId, 'budget']`, 3 componentes (AddBudgetItemModal, EditBudgetItemRow, DeleteBudgetItemDialog), integración en BudgetItemsTable con badges advisory, i18n CLDR en 4 locales con mapeo error_code → copy. Cobertura AC-01..10, EC-01..09, VR-01..10, SEC-01..06, A11Y-01..03, PERF-01, CONTRACT-01, IT-11 regresión de US-035 (filtro soft delete). Reuso íntegro de policies/guards. Sin migraciones, sin endpoints nuevos. Documentation Alignment Required (3): UC-BUDGET-002 §E2 extender con completed, docs/16 §M06 y §error format con shapes + nuevos códigos, housekeeping NFR-PERF-001. Cierre de PB-P1-020 con handoff a US-035 vía invalidación de cache TanStack.

## Workflow

- Current Stage: completed
- Overall Status: Completed
- Stop Reason: null
- Next Eligible Stage: none
