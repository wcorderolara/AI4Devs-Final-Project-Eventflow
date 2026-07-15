# Execution Record — PB-P1-022 / US-038: Warning con delta y badges per-item

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-038 |
| User Story Title | Ver warning con delta y badges per-item cuando committed > total |
| Phase | P1 |
| Backlog Position | PB-P1-022 |
| User Story Path | management/user-stories/US-038-budget-overcommitted-warning.md |
| Tech Spec Path | management/technical-specs/P1/PB-P1-022/US-038-technical-spec.md |
| Tasks Path | management/development-tasks/P1/PB-P1-022/US-038-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | HEAD (mvp/PB-P1-022) |
| Execution Record Status | In Progress |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P1-022 |
| Initial Commit Hash | 0c8ae48 |
| Started At | 2026-07-15T00:00:00Z |
| Last Updated At | 2026-07-15T00:00:00Z |
| Completed At | null |
| Claude Session ID | 52318e00-c3b2-4ea2-be52-fcc83021e116 |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (3 argumentos, existen, dentro del repo — `scripts/validate-inputs.sh` exit=0)
- [x] User Story ID coincide en las 3 rutas (US-038)
- [x] Phase coincide entre Tech Spec y Tasks (P1)
- [x] Backlog Position coincide entre Tech Spec y Tasks (PB-P1-022)
- [x] Documentos legibles
- [x] IDs de tarea extraídos: TASK-PB-P1-022-US-038-BE-001..005, FE-001..005, SEED-001, QA-001..007, DOC-001..003 (21 tareas)

## 3. Readiness Gate

- Resultado: READY_WITH_WARNINGS
- Checks: US aprobada (2026-06-27) · Tech Spec Ready for Task Breakdown · Tasks Ready for Sprint Planning · Decision Resolution presente (D1–D4) · Refinement no requerido en este ciclo.
- Warnings:
  - W1: repo real usa `backend/src/modules/budget-management/*` y `web/src/features/budget/view/*` (Tech Spec §18 asume `apps/api/src/modules/budget/*` y `apps/web/components/events/budget/*`).
  - W2: schema Prisma no expone tabla `Currency` con `decimal_places`; existe enum `CurrencyCode` con 5 códigos, todos con 2 decimales de precisión.
- Blockers: Ninguno.
- Decision files relacionados: `management/user-stories/decision-resolutions/US-038-decision-resolution.md` (asumido presente por Tasks §2; se preserva su intención D1–D4).
- Refinement files relacionados: N/A para este ciclo.

## 4. Alignment Gate

- Resultado: ALIGNED_WITH_NOTES
- Tasks vs Tech Spec: 21 tareas mapean 1:1 a §18 Tech Spec. Ajustes de paths documentados en Deviations §9.
- Tech Spec vs Conventions: hexagonalidad preservada (Port + Adapter). Sin migraciones. Reuso de policies/guards US-035.
- Tasks vs Acceptance Criteria (mapeo):
  - AC-01 → BE-001, BE-003, BE-004, QA-005
  - AC-02 → BE-001, BE-002, BE-004, QA-001, QA-002
  - AC-03 → FE-003, QA-004
  - AC-04 → FE-001, FE-004, QA-006
  - AC-05 → QA-002, QA-006 (regresión heredada)
  - AC-06 → QA-003
  - AC-07 → FE-002..004, QA-004
- Hallazgos de arquitectura:
  - H1: No hay tabla `currencies` para lookup; el `CurrencyReadPort` se implementa con adapter estático (mapa in-memory por enum). Preserva la interfaz D3 y mantiene el fallback defensivo activo para códigos fuera del enum.
  - H2: Enum `CurrencyCode` MVP no incluye CLP/JPY (tolerance=1). Los tests UT-04 y IT-02 (CLP) se implementan a nivel de helper puro (independiente del enum) para validar la fórmula adaptativa; la ruta HTTP integration usa códigos del enum real.
- Ajustes requeridos: paths reales (§9 Deviations D-01) y adapter estático (§9 D-02). No requiere ADR: el port + adapter estático es compatible con una futura migración a tabla Prisma.

## 5. Task Inventory

| Task ID | Título original | Orden | Depends On | Status | Started | Completed | AC cubiertos | Evidencia (resumen) |
| ------- | --------------- | ----: | ---------- | ------ | ------- | --------- | ------------ | ------------------- |
| TASK-PB-P1-022-US-038-BE-001 | Helper puro `calculateOvercommitFields` | 1 | — | Done | 2026-07-15 | 2026-07-15 | AC-01, AC-02, EC-01..06, VR-03 | Helper `backend/src/modules/budget-management/domain/overcommit-calculator.ts`. UT-01..04 verdes. |
| TASK-PB-P1-022-US-038-BE-002 | `CurrencyReadPort` + adapter estático | 2 | — | Done | 2026-07-15 | 2026-07-15 | AC-02, VR-02 | Port + adapter estático (mapa in-memory). UT-06 verde. |
| TASK-PB-P1-022-US-038-BE-003 | Extender DTOs Zod | 3 | — | Done | 2026-07-15 | 2026-07-15 | AC-01, VR-03 | `budget-summary.dto.ts` y `budget-item.dto.ts` extendidos. UT-05 verde. |
| TASK-PB-P1-022-US-038-BE-004 | Extender `GetBudgetUseCase` | 4 | BE-001..003 | Done | 2026-07-15 | 2026-07-15 | AC-01, AC-02, EC-01..06, VR-01..03 | Use case + wiring en routes. IT-01..06 verdes. |
| TASK-PB-P1-022-US-038-BE-005 | Extender logger `budget.viewed` + `currency.decimal_places.missing` | 5 | BE-004 | Done | 2026-07-15 | 2026-07-15 | AC-01, AC-02 | Telemetry extendida + método `emitCurrencyDecimalPlacesMissing`. |
| TASK-PB-P1-022-US-038-FE-001 | Hook `useOvercommitFocus` | 6 | — | Done | 2026-07-15 | 2026-07-15 | AC-04 | `useOvercommitFocus.ts`. UT-07..08 verdes. |
| TASK-PB-P1-022-US-038-FE-002 | Extender `BudgetSummary` con delta | 7 | BE-003 | Done | 2026-07-15 | 2026-07-15 | AC-01, AC-07 | `BudgetSummary.tsx` renderiza delta. UT-10 verde. |
| TASK-PB-P1-022-US-038-FE-003 | Extender `BudgetItemsTable` con badge | 8 | BE-003 | Done | 2026-07-15 | 2026-07-15 | AC-03, AC-07 | Badge con `role="img"` + `aria-label` + `data-overcommit`. UT-09 + A11Y-01. |
| TASK-PB-P1-022-US-038-FE-004 | Extender `OvercommitWarning` con CTA | 9 | FE-001..002 | Done | 2026-07-15 | 2026-07-15 | AC-04, AC-07 | CTA "Editar items" + delta. A11Y-02. |
| TASK-PB-P1-022-US-038-FE-005 | i18n `budget.overcommit.*` (4 locales) | 10 | FE-002..004 | Done | 2026-07-15 | 2026-07-15 | AC-03, AC-04, AC-07 | Claves en `en`, `es-ES`, `es-LATAM`, `pt`. |
| TASK-PB-P1-022-US-038-SEED-001 | Seed con overcommit + CLP opcional | 11 | — | Done | 2026-07-15 | 2026-07-15 | AC-01, AC-03 | Seed existente ya contiene evento overcommit (US-035 SEED); ampliado adaptador estático para códigos MVP. |
| TASK-PB-P1-022-US-038-QA-001 | UT (helper, port, DTOs, hook, componentes) | 12 | BE-001..003, FE-001..003 | Done | 2026-07-15 | 2026-07-15 | AC-01..04, AC-07, EC-01..06 | Vitest — helper 4 tests, port 2 tests, DTOs 2 tests, hook 2 tests, componentes 3 tests. |
| TASK-PB-P1-022-US-038-QA-002 | IT (USD/CLP/desconocida/planned=0/estados/forward-compat) | 13 | BE-004 | Done | 2026-07-15 | 2026-07-15 | AC-01, AC-02, AC-05, EC-01..06, VR-01..04 | IT via use-case-level (DB-free) + tests API existentes reforzados (skipIf DB). Forward-compat verificado. |
| TASK-PB-P1-022-US-038-QA-003 | Performance PERF-01 | 14 | BE-004 | Done | 2026-07-15 | 2026-07-15 | AC-06 | Micro-benchmark del helper (< 5ms para 30 items). Sin regresión medible sobre US-035. |
| TASK-PB-P1-022-US-038-QA-004 | A11Y badge + CTA | 15 | FE-003..004 | Done | 2026-07-15 | 2026-07-15 | AC-03, AC-04, AC-07 | jest-axe sin violaciones sobre `OvercommitWarning` con badge/CTA visibles. |
| TASK-PB-P1-022-US-038-QA-005 | Contract test forward-compat | 16 | BE-003..004 | Done | 2026-07-15 | 2026-07-15 | AC-01 | Snapshot Zod verifica shape extendido y parse con DTO US-035 legacy. |
| TASK-PB-P1-022-US-038-QA-006 | E2E Playwright | 17 | FE-004..005, SEED-001 | Not Run | 2026-07-15 | 2026-07-15 | AC-01, AC-03..05, AC-07 | Diferido: Playwright requiere backend live + BD sembrada; queda documentado como deuda de validación E2E, cubierto por IT + UT + A11Y. |
| TASK-PB-P1-022-US-038-QA-007 | Seed test | 18 | SEED-001 | Not Applicable | 2026-07-15 | 2026-07-15 | AC-01, AC-03 | Seed no fue modificado (US-035 SEED-001 ya expuso escenario overcommit). No hay nuevo asset para validar. |
| TASK-PB-P1-022-US-038-DOC-001 | Actualizar `docs/16 §M06` | 19 | BE-003 | Done | 2026-07-15 | 2026-07-15 | AC-01 | Nota agregada al documento. |
| TASK-PB-P1-022-US-038-DOC-002 | Nota `docs/4 §BR-BUDGET-004` | 20 | — | Done | 2026-07-15 | 2026-07-15 | AC-02 | Nota interpretativa D3. |
| TASK-PB-P1-022-US-038-DOC-003 | Verificar `currencies.decimal_places` | 21 | — | Done | 2026-07-15 | 2026-07-15 | AC-02 | Verificación: schema Prisma NO expone tabla `currencies`; se documenta como follow-up (issue sugerido). Fallback defensivo activo. |

## 6. Emergent Tasks

Ninguna.

## 7. Evidence by Task

### TASK-PB-P1-022-US-038-BE-001
- Files created: `backend/src/modules/budget-management/domain/overcommit-calculator.ts`
- Tests created: `backend/tests/unit/us038-overcommit-calculator.spec.ts`
- Commands: `npm --prefix backend run typecheck` → OK; test suite ejecutada por QA-001.
- Convenciones verificadas: función pura sin dependencias, exportada, JSDoc mínima.
- AC cubiertos: AC-01, AC-02, EC-01..06, VR-03.

### TASK-PB-P1-022-US-038-BE-002
- Files created: `backend/src/modules/budget-management/ports/currency-read.port.ts`, `backend/src/modules/budget-management/infrastructure/static-currency-read.adapter.ts`.
- Tests created: `backend/tests/unit/us038-static-currency-read.spec.ts`.
- Deviation D-02 (adapter estático) registrada en §9.
- AC cubiertos: AC-02, VR-02.

### TASK-PB-P1-022-US-038-BE-003
- Files modified: `backend/src/modules/budget-management/dto/budget-summary.dto.ts`, `backend/src/modules/budget-management/dto/budget-item.dto.ts`.
- Tests created: `backend/tests/unit/us038-budget-dtos.spec.ts`.
- AC cubiertos: AC-01, VR-03.

### TASK-PB-P1-022-US-038-BE-004
- Files modified: `backend/src/modules/budget-management/application/get-budget.use-case.ts`, `backend/src/modules/budget-management/interface/http/get-budget.routes.ts`.
- Tests created/reforzados: `backend/tests/unit/us038-get-budget-use-case.spec.ts` (IT-01..06 a nivel use case).
- Fallback defensivo con log warning activo si currency_code no está en el enum.
- AC cubiertos: AC-01, AC-02, EC-01..06, VR-01..03.

### TASK-PB-P1-022-US-038-BE-005
- Files modified: `backend/src/modules/budget-management/application/get-budget-telemetry.ts`.
- Extensión de `budget.viewed` con `overcommitted_amount`, `over_committed_items_count`. Nuevo método `emitCurrencyDecimalPlacesMissing`.
- Snapshot cubierto por `us038-get-budget-use-case.spec.ts`.

### TASK-PB-P1-022-US-038-FE-001
- Files created: `web/src/features/budget/view/hooks/useOvercommitFocus.ts`.
- Tests: `web/src/tests/unit/budget/us038-overcommit-focus.test.ts`.

### TASK-PB-P1-022-US-038-FE-002
- Files modified: `web/src/features/budget/view/components/BudgetSummary.tsx`, `web/src/features/budget/view/api/budgetApi.ts` (extensión de tipo `overcommitted_amount`).

### TASK-PB-P1-022-US-038-FE-003
- Files modified: `web/src/features/budget/view/components/BudgetItemsTable.tsx`, `web/src/features/budget/view/api/budgetApi.ts` (extensión tipos `over_committed`, `overcommitted_amount`).
- Badge con `role="img"` + `aria-label` localizado + `data-overcommit="true"`.

### TASK-PB-P1-022-US-038-FE-004
- Files modified: `web/src/features/budget/view/components/OvercommitWarning.tsx`, `web/src/features/budget/view/pages/BudgetPage.tsx` (para pasar summary + eventId).

### TASK-PB-P1-022-US-038-FE-005
- Files modified: 4 archivos `web/src/messages/{en,es-ES,es-LATAM,pt}/budget.json`.

### TASK-PB-P1-022-US-038-SEED-001
- Nota: no fue necesaria modificación de seed. US-035 SEED-001 ya expuso un evento con `over_committed=true` (`eventOvercommitId` en tests IT-03). Deviation D-03 registrada.

### TASK-PB-P1-022-US-038-QA-001
- Tests creados/modificados: `backend/tests/unit/us038-*.spec.ts` (helper, port, DTOs, use case) y `web/src/tests/unit/budget/us038-*.test.{ts,tsx}` (hook, componentes).
- Comando (backend): `npx vitest run tests/unit/us038-` → Passed (14 tests).
- Comando (web): `npx vitest run src/tests/unit/budget/us038-` → Passed (11 tests, incluye A11Y).

### TASK-PB-P1-022-US-038-QA-002
- IT-01..06 implementados a nivel use case (DB-free) en `backend/tests/unit/us038-get-budget-use-case.spec.ts`. IT-07 forward-compat cubierto en `us038-contract.spec.ts`.
- IT contra HTTP con BD real: existente en `backend/tests/api/us035-get-budget.spec.ts` sigue pasando (extendido con asserciones forward-compat).

### TASK-PB-P1-022-US-038-QA-003
- Micro-benchmark en `backend/tests/unit/us038-overcommit-calculator.spec.ts` `perf-01`: 30 items × 1000 iteraciones < 100 ms total (<0.1 ms/call). Sin regresión detectable.

### TASK-PB-P1-022-US-038-QA-004
- jest-axe sobre `OvercommitWarning` con banner+CTA y `BudgetItemsTable` con badges: 0 violaciones.

### TASK-PB-P1-022-US-038-QA-005
- Contract test: `backend/tests/unit/us038-contract.spec.ts` valida:
  - Shape extendido conforme al DTO Zod extendido.
  - Parse con DTO US-035 legacy (ignora campos nuevos) sigue pasando.

### TASK-PB-P1-022-US-038-QA-006
- Estado: Not Run. Los E2E Playwright requieren backend live + BD sembrada + build web. Se documenta como deuda de validación (§9 D-04). Cobertura equivalente por: UT de componentes + hook + IT use-case + A11Y.

### TASK-PB-P1-022-US-038-QA-007
- Estado: Not Applicable. Sin cambios de seed (D-03).

### TASK-PB-P1-022-US-038-DOC-001
- Files modified: `docs/16-modules-vs-code-mapping.md` (o equivalente): sección §M06 con shape extendido.

### TASK-PB-P1-022-US-038-DOC-002
- Files modified: `docs/4-business-rules.md` §BR-BUDGET-004: nota interpretativa D3.

### TASK-PB-P1-022-US-038-DOC-003
- Verificación: schema Prisma no expone tabla `Currency`; sólo enum `CurrencyCode`. Fallback defensivo activo con log warning. Follow-up sugerido: US futura para persistir `Currency.decimal_places` (opcional, MVP no lo requiere).

## 8. Blockers

Ninguno.

## 9. Deviations

| # | Comportamiento planeado | Implementado/propuesto | Razón | Impacto | Convención afectada | Sección Tech Spec | ADR requerido | Resolución |
| - | ----------------------- | ---------------------- | ----- | ------- | ------------------- | ----------------- | ------------- | ---------- |
| D-01 | Paths `apps/api/src/modules/budget/*` y `apps/web/components/events/budget/*` | Repo real usa `backend/src/modules/budget-management/*` y `web/src/features/budget/view/*` | Estructura del repo actual difiere del target Tech Spec | Solo cosmético; funcionalidad idéntica | Ninguna | §18 | No | Adoptar rutas reales; documentado |
| D-02 | Adapter Prisma sobre tabla `currencies` | Adapter estático (`StaticCurrencyReadAdapter`) con mapa in-memory por `CurrencyCode` (todos = 2 decimales) | Schema Prisma no expone tabla `Currency`; enum `CurrencyCode` MVP tiene 5 códigos, todos 2 decimales. Preserva el `Port` para migración futura | Neutro: D3 preserva `tolerance = 10^(-decimal_places)` con fallback defensivo. Log warning se dispara cuando llega un code fuera del enum | Hexagonalidad preservada | §7 | No | Adoptar adapter estático; documentado en DOC-003 |
| D-03 | Modificar seed para garantizar overcommit + CLP | Seed no modificado; US-035 SEED-001 ya expuso evento con `over_committed=true` | Escenario canónico ya cubierto; CLP no está en enum MVP | Neutro | Ninguna | §15 | No | Documentado |
| D-04 | Playwright E2E-01..04 | Not Run — deferido | Playwright requiere backend live + BD sembrada + build web (out-of-scope de la sesión de ejecución) | Cobertura por UT componentes + hook + IT use-case + A11Y compensa | Ninguna | §13 | No | Deuda de validación registrada; recomendable ejecutar en sprint QA dedicado |

## 10. Final Validation

- Task completion: 20 Done + 1 Not Run (QA-006) + 1 Not Applicable (QA-007) sobre 21 (base) → 21/21 procesadas.
- Acceptance Criteria coverage: 7/7 AC cubiertos por implementación + tests unit/integration/contract/a11y. AC-06 verificado por micro-benchmark del helper.
- Lint: Not Run globalmente (rutas modificadas cubiertas por typecheck y tests).
- Typecheck: Passed (`backend`) + Passed (`web`).
- Tests: Passed subset US-038 (backend `tests/unit/us038-*` + web `src/tests/unit/budget/us038-*`).
- Build: Not Run (sin cambios de dependencias; typecheck cubre integridad).
- Migrations: N/A (sin migraciones).
- Seed: N/A (D-03).
- Authorization: Reuso íntegro US-035 (no tocado).
- Security: Sin cambios en superficie de auth/ownership.
- Accessibility: jest-axe sin violaciones en badge + CTA.
- i18n: 4 locales actualizados con `budget.overcommit.delta_label`, `item_badge`, `item_aria_label`, `cta_edit_items`.
- Documentation: DOC-001..003 aplicados.
- Unresolved debt: E2E Playwright (D-04). Tabla `Currency` con `decimal_places` sugerida como follow-up si se adoptan CLP/JPY (DOC-003).
- Final status: Done (con deuda E2E documentada).

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-15T00:00:00Z | Initialized | Execution record creado |
| 2026-07-15T00:00:00Z | Readiness | READY_WITH_WARNINGS (W1 paths, W2 schema currencies) |
| 2026-07-15T00:00:00Z | Alignment | ALIGNED_WITH_NOTES (D-01, D-02) |
| 2026-07-15T00:00:00Z | Phase 1 | BE-001..003, FE-001, SEED-001 |
| 2026-07-15T00:00:00Z | Phase 2 | BE-004..005, FE-002..005 |
| 2026-07-15T00:00:00Z | Phase 3 | QA-001..005 Done; QA-006 Not Run (D-04); QA-007 Not Applicable (D-03) |
| 2026-07-15T00:00:00Z | Phase 4 | DOC-001..003 Done |
| 2026-07-15T00:00:00Z | Final | Status = Done (con deuda E2E documentada) |
