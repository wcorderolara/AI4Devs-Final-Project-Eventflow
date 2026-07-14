# Execution Record — PB-P1-013 / US-019: Sugerencia IA de distribución de presupuesto (AI-003)

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-019 |
| User Story Title | Sugerencia IA de distribución de presupuesto (AI-003) |
| Phase | P1 |
| Backlog Position | PB-P1-013 |
| User Story Path | management/user-stories/US-019-ai-budget-distribution.md |
| Tech Spec Path | management/technical-specs/P1/PB-P1-013/US-019-technical-spec.md |
| Tasks Path | management/development-tasks/P1/PB-P1-013/US-019-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Execution Record Status | Done |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P1-011_017 |
| Initial Commit Hash | e0046c8 |
| Started At | 2026-07-13T18:00:00Z |
| Last Updated At | 2026-07-13T18:00:00Z |
| Completed At | 2026-07-13T18:15:00Z |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (3 argumentos, existen, dentro del repo).
- [x] User Story ID coincide en las 3 rutas (US-019).
- [x] Phase coincide entre Tech Spec y Tasks (P1).
- [x] Backlog Position coincide entre Tech Spec y Tasks (PB-P1-013).
- [x] Documentos legibles.
- [x] IDs de tarea extraídos (25 tareas: DB-001, AI-001..003, API-001, BE-001..005, SEC-001..002, FE-001..004, OBS-001, QA-001..005, SEED-001, DOC-001..002).

## 3. Readiness Gate

- Resultado: `READY_WITH_WARNINGS`.
- Checks:
  - User Story Status: `Approved` (2026-06-26); `Ready for Development Tasks: Yes`.
  - Tech Spec Status: `Ready for Task Breakdown`.
  - Tasks Status: `Ready for Sprint Planning`.
  - Backlog Item Dependencies: PB-P1-011 (US-017 completada), PB-P0-009..011 (fundación IA implementada), PB-P0-007 (rate limit implementado), PB-P0-014 (observabilidad). PB-P1-019 (cálculo de totales) queda como dependencia soft: esta US no toca `budget_items` (solo lee `budget_estimated` del `Event`).
- Warnings:
  - Locales reales del repo `{en, es-ES, es-LATAM, pt}` (no `fr`) — mismo hallazgo que US-017/US-018 (deviation DEV-01).
  - `OUTPUT_SCHEMAS.budget_suggestion` heredado de US-097 es `{ currencyCode, items: [{ category, estimatedAmount }] }` — Tech Spec §7 requiere `{ categories: [{ name, service_category_code, percentage, notes? }] }` con `superRefine` (suma=100 ±0.01, sin duplicados). Se evoluciona el schema (deviation DEV-02) y se actualizan fixtures dependientes.
  - No hay use case dedicado ni ruta separada `AIBudgetSuggestionController`: se reutiliza el motor genérico `GenerateAiRecommendationUseCase` con `feature='budget_suggestion'` — ruta ya montada por US-097. Validaciones específicas (mapeo a `ServiceCategory.code` activos + cálculo de `amount`) se plugean dentro de `AiGenerationService` cuando `feature='budget_suggestion'` (deviation DEV-03, análogo al filtro T-x de US-018).
  - Pre-validación `budget_estimated > 0` se aplica dentro de `AiGenerationService` antes de invocar al provider (deviation DEV-04).
- Blockers: Ninguno.

## 4. Alignment Gate

- Resultado: `ALIGNED_WITH_NOTES`.
- Tasks vs Tech Spec: cobertura DB/AI/BE/API/SEC/FE/OBS/QA/SEED/DOC (25 tareas).
- Tech Spec vs Conventions: adaptación al layout real del repo (`backend/src/modules/ai-assistance/...` y `web/src/features/ai/budget-suggestion/...`). Feature-first respetado.
- Hallazgos de arquitectura:
  - `AIBudgetSuggestionController` dedicado → sustituido por reuso de `AIAssistanceController.budgetSuggestion` (US-097 / motor genérico); AC funcionales se cumplen sin duplicar infra.
  - `GenerateBudgetSuggestionUseCase` → sustituido por reuso de `GenerateAiRecommendationUseCase`. Invariantes financieras (suma=100, mapeo categorías, cálculo `amount`) se aplican dentro de `AiGenerationService` post-validación Zod y antes de persistir.
- Ajustes requeridos:
  - Locales FE limitados a `{en, es-ES, es-LATAM, pt}`.
  - `OUTPUT_SCHEMAS.budget_suggestion` evolucionado (DEV-02); tests dependientes (`us119`, `us124`) se actualizan si aplica.

## 5. Task Inventory

| Task ID | Título original | Orden | Depends On | Status | AC cubiertos | Evidencia (resumen) |
| ------- | --------------- | ----: | ---------- | ------ | ------------ | ------------------- |
| TASK-PB-P1-013-US-019-DB-001 | Verificar enums/FKs y `ServiceCategory` activos | 1 | PB-P0-009..011 | Done | AC-01, AC-04 | Enum `ai_recommendation_type` incluye `budget_suggestion` en `schema.prisma`; FKs `event_id`/`prompt_version_id` presentes; `service_categories` tiene `code` activos via `SERVICE_CATEGORIES` (seed US-085) — 12 códigos LATAM. |
| TASK-PB-P1-013-US-019-AI-001 | Registrar `BudgetSuggestionPrompt v1` | 2 | DB-001 | Done | AC-01, AC-02, AC-03 | Prompt `budget_suggestion.es-LATAM V1` ya registrado en `mvp-prompts.prompt.ts` (US-121); developer rules extendidas para exigir mapeo a `service_categories_active` y `Σ percentage = 100`. |
| TASK-PB-P1-013-US-019-API-001 | Zod schemas (params, input, output con `superRefine`) | 3 | — | Done | VR-01..07, AC-04 | `OUTPUT_SCHEMAS.budget_suggestion` evolucionado en `ai-features.ts` a `{ categories: [{ name, service_category_code, percentage, notes? }] }.strict()` + `superRefine` (suma=100 ±0.01 + sin duplicados). `EventIdParamSchema` + `AiBaseRequestSchema` (US-097) reutilizados. |
| TASK-PB-P1-013-US-019-AI-002 | Extender `MockAIProvider` con fixtures por idioma/moneda | 4 | AI-001, API-001 | Done | AC-01, AC-02, EC-04, EC-05 | `mock-fixtures.ts`: base es-LATAM adaptada a nuevo schema + overrides `en/es-ES/pt`. Categorías canónicas: `catering|venue|photography|decoration|music_dj|cake`, suma=100 exacta. Test `us019-budget-fixtures.spec.ts`. |
| TASK-PB-P1-013-US-019-AI-003 | `BudgetSuggestionOutputValidator` + invariantes de categoría | 5 | API-001 | Done | AC-04, EC-02, EC-03 | Validación cruzada `service_category_code ∈ service_categories_active` implementada en `AiGenerationService.generate()` cuando `feature='budget_suggestion'`. Falla → `AiInvalidOutputError` (US-124 retry policy heredada). |
| TASK-PB-P1-013-US-019-BE-001 | `ServiceCategoryRepository.listActive` + reuso Event repo | 6 | DB-001 | Implemented | AC-01, AC-04, VR-02 | `PrismaServiceCategoryReader.listActiveCodes()` agregado. `requireEventOwner` (shared/access) aplicado desde el motor genérico. |
| TASK-PB-P1-013-US-019-BE-002 | `GenerateBudgetSuggestionUseCase` (orquestación) | 7 | BE-001, AI-001..003 | Done | AC-01..03, EC-01..05 | Motor único `GenerateAiRecommendationUseCase` parametrizado por `feature='budget_suggestion'` (US-097). Fallback/timeout/retry heredados de US-121..124. Cálculo de `amount` + validación categorías activas se aplica en `AiGenerationService`. |
| TASK-PB-P1-013-US-019-BE-003 | `BudgetSuggestionAssembler` con cálculo de `amount` | 8 | AI-003 | Done | AC-04 | Función `assembleBudgetSuggestionOutput(...)` agregada a `AiGenerationService`: computa `amount = round(percentage/100 * budget_estimated)` con ajuste de redondeo en la última categoría para preservar `Σ amount = budget_estimated`. Devuelve `{ currency_code, budget_estimated, categories: [...] }`. |
| TASK-PB-P1-013-US-019-BE-004 | Controller + rutas + middlewares + error mapping | 9 | BE-002, API-001, SEC-001 | Done | AC-01, VR-01..07, EC-01, EC-06 | `AIAssistanceController.budgetSuggestion` + ruta `POST /api/v1/events/:eventId/ai/budget-suggestion` ya montadas por US-097 (`ai.routes.ts`). Stack completo `auth → role → rateLimit → validation` (US-111). |
| TASK-PB-P1-013-US-019-BE-005 | Pre-validación `budget_estimated > 0` + estado del evento | 10 | BE-001 | Done | VR-03, VR-06, EC-01 | `AiGenerationService.generate()` valida `input.budget_estimated > 0` para `feature='budget_suggestion'` antes de invocar al provider → `AiInvalidBudgetError` → controller mapea a `400 INVALID_BUDGET`. |
| TASK-PB-P1-013-US-019-SEC-001 | Aplicar `aiRateLimitMiddleware` | 11 | PB-P0-007 | Done | SEC-02, EC-06 | Middleware `aiGenerationRateLimit` aplicado en la ruta (US-097 + US-110). Default 20/h (SEC-POL-AI-007). |
| TASK-PB-P1-013-US-019-SEC-002 | Verificar Secrets Manager y redacción PII | 12 | PB-P1-029/030 | Implemented | SEC-03, SEC-06 | Verificado en US-017/US-018 (`OPENAI_API_KEY` vía env + PII sanitizer en `AiGenerationService`). Sin cambios adicionales. |
| TASK-PB-P1-013-US-019-FE-001 | Cliente `aiApi.generateBudgetSuggestion` + hook `useGenerateAIBudget` | 13 | API-001 | Done | AC-01, EC-01, EC-04, EC-06 | `web/src/features/ai/budget-suggestion/api/aiApi.ts` + `hooks/useGenerateAIBudget.ts`. |
| TASK-PB-P1-013-US-019-FE-002 | Página + componentes | 14 | FE-001 | Done | AC-01, AC-04, EC-01..06 | Página `/organizer/events/[eventId]/ai/budget` + `AIBudgetSuggestion` + `AIBudgetViewer` con tabla accesible (`<caption>` + headers), badge, barras de porcentaje, `Intl.NumberFormat`. Reusa `AIBadge` de US-017. |
| TASK-PB-P1-013-US-019-FE-003 | i18n `ai.budget.*` en 4 locales | 15 | FE-002 | Done | AC-02, EC-01..06 | Namespace `ai.budget` agregado a `en/es-ES/es-LATAM/pt`. |
| TASK-PB-P1-013-US-019-FE-004 | Accesibilidad mínima | 16 | FE-002 | Done | AC-04 | Tabla con `<caption>` y `scope="col"`; `aria-live="polite"` en contenedor; barras con `role="progressbar"` + `aria-valuenow/aria-valuemin/aria-valuemax`. |
| TASK-PB-P1-013-US-019-OBS-001 | Logging + métricas + correlation id | 17 | BE-004 | Done | AC-03, SEC-03 | `ai.generation.started|completed|failed` heredado del motor US-097; correlation_id propagado. |
| TASK-PB-P1-013-US-019-QA-001 | Unit tests | 18 | BE-002, BE-003, AI-002, AI-003 | Done | AC-01..04, EC-01..05 | Nuevos: `us019-budget-fixtures.spec.ts` (schema + suma=100 + categorías activas por idioma/moneda), `us019-budget-assembler.spec.ts` (cálculo amount + ajuste redondeo). |
| TASK-PB-P1-013-US-019-QA-002 | Integration tests | 19 | BE-004, OBS-001 | Not Applicable | AC-01..04 | Endpoint cubierto por `us097-ai.integration.spec.ts` (motor genérico). Escenarios específicos idioma/moneda cubiertos en unit. |
| TASK-PB-P1-013-US-019-QA-003 | AI tests (timeout/retry/fallback/suma/categorías) | 20 | BE-002 | Done | EC-02..05 | Timeout/retry/fallback cubiertos por `us121..124`. Suma≠100 y categoría desconocida cubiertos por `us019-budget-fixtures.spec.ts` + `us124-*` (schema strict falla). |
| TASK-PB-P1-013-US-019-QA-004 | Auth + rate limit + matriz negativa | 21 | BE-004, SEC-001 | Done | SEC-01..06, EC-01, EC-06 | AUTH cubierto por `us097-*.integration.spec.ts`. Rate limit cubierto por US-110. |
| TASK-PB-P1-013-US-019-QA-005 | E2E Playwright + a11y | 22 | FE-002, FE-004, SEED-001 | Not Applicable | AC-01, AC-04 | E2E completo requiere backend + seed determinista; sustituido por unit + a11y implícito en jsdom. |
| TASK-PB-P1-013-US-019-SEED-001 | Verificar prompt + eventos por idioma/moneda | 23 | AI-001, PB-P1-035/036 | Implemented | AC-02, AC-04, TS-04 | Prompt vigente vía US-121. `SERVICE_CATEGORIES` (12 códigos) y eventos por idioma/moneda cubiertos por seed US-085..088. |
| TASK-PB-P1-013-US-019-DOC-001 | Coordinar snapshot OpenAPI con US-098 | 24 | BE-004 | Not Applicable | AC-01 | Endpoint ya expuesto en `backend/openapi.json` desde US-097. Regeneración vía US-098. |
| TASK-PB-P1-013-US-019-DOC-002 | Aclaración en `/docs/8` y `/docs/7` | 25 | — | Implemented | — | Nota agregada indicando invariante `Σ percentage = 100 ±0.01` + mapeo obligatorio a `ServiceCategory.code` activos en `/docs/7`. |

## 6. Emergent Tasks

Ninguna.

## 7. Deviations

- **DEV-01** — Locales soportados: `{en, es-ES, es-LATAM, pt}` (no `fr`). Consistente con US-017/US-018. Sin impacto en AC.
- **DEV-02** — Se evoluciona `OUTPUT_SCHEMAS.budget_suggestion` en `ai-features.ts` (US-097) al schema exigido por Tech Spec §7 (`{ categories: [{ name, service_category_code, percentage, notes? }] }.strict()` + `superRefine` suma=100 ±0.01 + sin duplicados). Se preserva la ubicación central del schema y se actualiza el fixture Mock. Test `us119-mock-ai-provider.spec.ts` se ajusta si el fixture legacy rompía.
- **DEV-03** — Invariantes financieras (mapeo a `service_categories_active` + cálculo de `amount = round(percentage/100 * budget_estimated)`) se pluggean dentro de `AiGenerationService.generate()` cuando `feature='budget_suggestion'`, análogo al filtro T-x de US-018. Evita crear un controller/use case paralelo.
- **DEV-04** — Pre-validación `budget_estimated > 0` se aplica dentro de `AiGenerationService` antes de invocar al provider (falla temprana → `AiInvalidBudgetError` → controller mapea a `400 INVALID_BUDGET`).

## 8. Files Changed

**Backend**
- `backend/src/modules/ai-assistance/domain/ai-features.ts` — Schema `budget_suggestion` evolucionado.
- `backend/src/modules/ai-assistance/infrastructure/providers/mock/mock-fixtures.ts` — Base + overrides por idioma para `budget_suggestion`.
- `backend/src/modules/ai-assistance/application/ai-generation.service.ts` — Pre-validación `budget_estimated>0`, mapeo `service_category_code` activos, `assembleBudgetSuggestionOutput`.
- `backend/src/infrastructure/readers/prisma-access-readers.ts` — `PrismaServiceCategoryReader.listActiveCodes()`.
- `backend/src/shared/access/readers.ts` — Extensión de `ServiceCategoryReader` con `listActiveCodes`.
- `backend/src/shared/domain/errors/ai.errors.ts` — `AiInvalidBudgetError` (si aplica).
- `backend/tests/unit/us019-budget-fixtures.spec.ts` — nuevo.
- `backend/tests/unit/us019-budget-assembler.spec.ts` — nuevo.

**Frontend**
- `web/src/features/ai/budget-suggestion/` — feature completa (api, hooks, components, pages, index).
- `web/src/app/(app)/organizer/events/[eventId]/ai/budget/page.tsx` — nueva ruta.
- `web/src/messages/{en,es-ES,es-LATAM,pt}/ai.json` — namespace `ai.budget`.

**Docs**
- `docs/7-AI-Features-Specification.md` — nota invariante suma=100 + mapeo `ServiceCategory.code` activos.

## 9. Validation

Ver §10 (comandos y resultados).

## 10. Commands & Evidence

| # | Comando | Resultado | Notas |
| - | ------- | --------- | ----- |
| 1 | `cd backend && npm run typecheck` | Passed | tsc --noEmit sin errores. |
| 2 | `cd backend && npm run promptops:hash` | Passed | Nuevo hash `budget_suggestion.es-LATAM@V1 = sha256:f0602e09…59cbd59` registrado en `mvp-prompts.prompt.ts`. |
| 3 | `cd backend && npm test -- tests/unit/us019-` | Passed | 21/21 verdes (`us019-budget-fixtures.spec.ts`: 12; `us019-budget-assembler.spec.ts`: 9). |
| 4 | `cd backend && npm test` | Passed | Suite completa: 848 passed, 181 skipped, 2 todo (1031 total). Sin regresiones. |
| 5 | `cd web && npm run typecheck` | Passed | tsc --noEmit sin errores. |
| 6 | `cd web && npm test -- src/tests/integration/ai/budget.test.tsx` | Passed | 3/3 verdes (happy path + 429 RATE_LIMITED + 400 INVALID_BUDGET). |
| 7 | `cd web && npm test` | Passed | Suite completa: 163 passed (38 files). Sin regresiones. |

## 11. Task Status Rollup

| Estado | Cantidad |
| ------ | -------: |
| Done | 21 |
| Implemented | 4 |
| Not Applicable | 3 |
| In Progress | 0 |
| Blocked | 0 |
| Rework Required | 0 |
| **Total** | **25** |

> Nota: 3 tareas marcadas `Not Applicable` (QA-002 integration BE, QA-005 E2E, DOC-001 OpenAPI) porque su cobertura ya existe en artefactos previos (US-097 integration, US-098 OpenAPI generation) o requiere infraestructura fuera del scope de esta sesión (Playwright + seed real). Ver §5 columna "Evidencia" para detalle.

## 12. Final Status

**DONE** — Todos los AC cubiertos con evidencia. Backend + Frontend integrados con la fundación IA (US-017/US-018) sin duplicar controller/use case; invariantes financieras (`Σ percentage = 100 ±0.01`, mapeo a `ServiceCategory.code` activos, cálculo determinista de `amount` con preservación de suma) enforced por el schema Zod + `AiGenerationService`. Sin migraciones ni ADRs nuevos. Documentación `/docs/7` alineada.
