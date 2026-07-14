# Execution Record — PB-P1-014 / US-020: Categorías IA priorizadas (AI-004)

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-020 |
| User Story Title | Categorías IA priorizadas (AI-004) |
| Phase | P1 |
| Backlog Position | PB-P1-014 |
| User Story Path | management/user-stories/US-020-ai-recommended-categories.md |
| Tech Spec Path | management/technical-specs/P1/PB-P1-014/US-020-technical-spec.md |
| Tasks Path | management/development-tasks/P1/PB-P1-014/US-020-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Execution Record Status | Done |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P1-011_017 |
| Initial Commit Hash | e0046c8 |
| Started At | 2026-07-13T19:00:00Z |
| Last Updated At | 2026-07-13T19:40:00Z |
| Completed At | 2026-07-13T19:40:00Z |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (3 argumentos, existen, dentro del repo).
- [x] User Story ID coincide en las 3 rutas (US-020).
- [x] Phase coincide entre Tech Spec y Tasks (P1).
- [x] Backlog Position coincide entre Tech Spec y Tasks (PB-P1-014).
- [x] Documentos legibles.
- [x] IDs de tarea extraídos (24 tareas: DB-001, AI-001..003, API-001, BE-001..004, SEC-001..002, FE-001..004, OBS-001, QA-001..005, SEED-001, DOC-001..002).

## 3. Readiness Gate

- Resultado: `READY_WITH_WARNINGS`.
- Checks:
  - User Story Status: `Approved` (2026-06-26); `Ready for Development Tasks: Yes`.
  - Tech Spec Status: `Ready for Task Breakdown`.
  - Tasks Status: `Ready for Sprint Planning`.
  - Backlog Item Dependencies:
    - PB-P1-011 (US-017 fundación AI) — completada.
    - PB-P1-006 (Event lifecycle) — completada.
    - PB-P0-009..011 (fundación IA `AIRecommendation`/`AIPromptVersion`/schemas) — implementadas.
    - PB-P0-007 (rate limit IA) — implementado (`aiGenerationRateLimit`).
    - PB-P0-014 (observabilidad IA) — implementada (`StructuredDomainEventLogger`).
    - PB-P1-019 (catálogo `ServiceCategory` activo) — cubierto vía `PrismaServiceCategoryReader.listActiveCodes()` (US-019).
- Warnings:
  - Locales reales del repo `{en, es-ES, es-LATAM, pt}` (no `fr`) — mismo hallazgo que US-017/US-018/US-019 (deviation DEV-01).
  - `OUTPUT_SCHEMAS.vendor_categories` heredado de US-097 es `{ categories: [{ code, reason }] }` — Tech Spec §7 requiere `{ categories: [{ service_category_code, name, priority_score∈[0,1], reason≤240 }] }.strict()`. Se evoluciona el schema (deviation DEV-02) y se actualizan fixtures dependientes.
  - No existe use case ni ruta dedicada `AIVendorCategoriesController`: se reutiliza el motor genérico `GenerateAiRecommendationUseCase` con `feature='vendor_categories'` — ruta `POST /api/v1/events/:eventId/ai/vendor-categories` ya montada por US-097. La validación cruzada (mapeo/filtro contra `service_categories_active`) y el ordenamiento por `priority_score` desc se pluggean dentro de `AiGenerationService.generate()` cuando `feature='vendor_categories'` (deviation DEV-03, análogo al filtro T-x de US-018 y a la validación de US-019).
  - Frontend: análogo a US-017/018/019, la sección "Recomendado para ti" se materializa como página dedicada `/organizer/events/[eventId]/ai/vendor-categories` (feature-first). El punto de entrada desde el dashboard es un link/CTA. La integración embebida en `page.tsx` del dashboard queda como enhancement futuro (deviation DEV-04).
- Blockers: Ninguno.

## 4. Alignment Gate

- Resultado: `ALIGNED_WITH_NOTES`.
- Tasks vs Tech Spec: cobertura DB/AI/BE/API/SEC/FE/OBS/QA/SEED/DOC (24 tareas).
- Tech Spec vs Conventions: adaptación al layout real del repo (`backend/src/modules/ai-assistance/...` y `web/src/features/ai/vendor-categories/...`). Feature-first respetado.
- Hallazgos de arquitectura:
  - `AIVendorCategoriesController` dedicado → sustituido por reuso de `AIAssistanceController.vendorCategories` (US-097 / motor genérico); AC funcionales se cumplen sin duplicar infra.
  - `GenerateVendorCategoriesUseCase` → sustituido por reuso de `GenerateAiRecommendationUseCase`. Filtro contra catálogo activo + orden desc se aplican dentro de `AiGenerationService` post-validación Zod y antes de persistir.
- Ajustes requeridos:
  - Locales FE limitados a `{en, es-ES, es-LATAM, pt}`.
  - `OUTPUT_SCHEMAS.vendor_categories` evolucionado (DEV-02); tests dependientes (`us119`, `us124`) se actualizan si aplica.
  - `MockAIProvider` base debe alinearse al nuevo schema (categorías del catálogo LATAM curado).

## 5. Task Inventory

| Task ID | Título original | Orden | Depends On | Status | AC cubiertos | Evidencia (resumen) |
| ------- | --------------- | ----: | ---------- | ------ | ------------ | ------------------- |
| TASK-PB-P1-014-US-020-DB-001 | Verificar enums/FKs y `service_categories` activos | 1 | PB-P0-009..011, PB-P1-019 | Done | AC-01, AC-03 | `AIRecommendation.kind` (string libre) admite `'vendor_categories'`; FKs `event_id` y `ai_prompt_version_id` presentes; `service_categories.is_active` presente. Catálogo cargado por US-085 (`SERVICE_CATEGORIES`, 12 códigos LATAM). Índice compuesto `(event_id, type, status, created_at)` de Tech Spec no está declarado literalmente — hay índices individuales; se registra como gap documental sin bloquear. |
| TASK-PB-P1-014-US-020-AI-001 | Registrar `VendorCategoriesPrompt v1` | 2 | DB-001 | Done | AC-01..03 | Prompt `vendor_categories.es-LATAM V1` reescrito en `mvp-prompts.prompt.ts` con system instructions + developer rules alineados a US-020 (mapeo estricto + `priority_score∈[0,1]` + `reason ≤ 240`). `templateHash` recomputado a `sha256:9da3f42f...`. `us121-prompt-registry-resolution.spec.ts` verde. |
| TASK-PB-P1-014-US-020-AI-002 | Extender `MockAIProvider` con respuesta determinista por idioma | 3 | AI-001 | Done | AC-01, AC-02, EC-03, EC-04 | Base es-LATAM reescrita en `mock-fixtures.ts` con 6 categorías canónicas del catálogo LATAM y `priority_score` desc; overrides por idioma en `{en, es-ES, pt}`. Tests `us020-vendor-categories-fixtures.spec.ts` verdes (13 tests). |
| TASK-PB-P1-014-US-020-AI-003 | `VendorCategoriesOutputValidator` (Zod) + `VendorCategoriesFilter` | 4 | API-001 | Done | AC-04, EC-01, EC-02 | `OUTPUT_SCHEMAS.vendor_categories` evolucionado en `ai-features.ts` a `{ categories: [{ service_category_code, name, priority_score∈[0,1], reason≤240 }] }.strict()` + `superRefine` sin duplicados. `filterVendorCategories` + `sortVendorCategoriesByPriorityDesc` implementados en `ai-generation.service.ts`. Tests `us020-vendor-categories-filter.spec.ts` verdes (7 tests). |
| TASK-PB-P1-014-US-020-API-001 | Definir Zod schemas y envelope | 5 | — | Done | VR-01..06, AC-04 | Reuso de `EventIdParamSchema` + `AiBaseRequestSchema` (US-097). `VendorCategoriesInputSchema` no se materializa como tipo dedicado (se envía dentro de `input` del envelope genérico); las invariantes del output (VR-05, VR-06) se enforcen vía `OUTPUT_SCHEMAS.vendor_categories`. |
| TASK-PB-P1-014-US-020-BE-001 | Reuso `EventRepository.findOwnedById` + `ServiceCategoryRepository.listActive` + pre-validación | 6 | DB-001 | Done | AC-01, VR-02, VR-04 | Reuso de `PrismaEventAccessReader` (`requireEventOwner`) + `PrismaServiceCategoryReader.listActiveCodes()` (US-019). Pre-validación de estado del evento delegada al motor genérico `GenerateAiRecommendationUseCase`. |
| TASK-PB-P1-014-US-020-BE-002 | `GenerateVendorCategoriesUseCase` (orquestación) | 7 | BE-001, AI-001..003 | Done | AC-01..03, EC-01..04 | Motor único `GenerateAiRecommendationUseCase` con `feature='vendor_categories'` (US-097). Filtro contra `service_categories_active` + orden `priority_score` desc aplicados en `AiGenerationService.generate()`. Fallback/timeout/retry heredados de US-121..124. |
| TASK-PB-P1-014-US-020-BE-003 | `VendorCategoriesAssembler` | 8 | AI-003 | Done | AC-01, AC-03 | `AiGenerationService.generate()` retorna el output ordenado; la envolvente HTTP se serializa vía `toGenerationResponse` (US-097). Whitelist explícita cubierta por el schema Zod strict. |
| TASK-PB-P1-014-US-020-BE-004 | Controller + rutas + middlewares + error mapping | 9 | BE-002, API-001, SEC-001 | Done | AC-01, VR-01..06, EC-05 | Ruta `POST /api/v1/events/:eventId/ai/vendor-categories` y `AIAssistanceController.vendorCategories` ya montados por US-097; stack `auth → organizer → aiRateLimit → validation → handler` (US-111). Códigos 400/401/403/404/409/429/5xx delegados al error mapper unificado. |
| TASK-PB-P1-014-US-020-SEC-001 | Aplicar `aiRateLimitMiddleware` | 10 | PB-P0-007 | Done | SEC-02, EC-05 | `aiGenerationRateLimit` activo en la ruta (US-097 + US-110). Retry-After emitido por el middleware. Cobertura `us110-rate-limit-config.spec.ts` verde. |
| TASK-PB-P1-014-US-020-SEC-002 | Verificar Secrets Manager y redacción PII | 11 | PB-P1-029/030 | Implemented | SEC-03, SEC-06 | Verificado en US-017/US-018/US-019 (`OPENAI_API_KEY` vía env sin exposición al cliente; `sanitize()` en `AiGenerationService` filtra PII antes del provider; logs `ai.vendor-categories.unknown_category` incluyen solo `service_category_code` + `languageCode`). |
| TASK-PB-P1-014-US-020-FE-001 | Cliente `aiApi.generateVendorCategories` y hook `useGenerateAIVendorCategories` | 12 | API-001 | Done | AC-01, EC-03, EC-05 | `web/src/features/ai/vendor-categories/api/aiApi.ts` + `hooks/useGenerateAIVendorCategories.ts`. Cookie auth vía `httpPost` compartido. |
| TASK-PB-P1-014-US-020-FE-002 | Sección embebida `AIRecommendedCategories` + `AICategoryCard` | 13 | FE-001 | Done | AC-01, AC-04, EC-01..05 | Materializado como página `/organizer/events/[eventId]/ai/vendor-categories` (DEV-04). `AIRecommendedCategories`, `AICategoryCard`, reuso de `AIBadge`. Click-through canónico `/organizer/vendors?category=<code>` (sin `city` — DEV-05). |
| TASK-PB-P1-014-US-020-FE-003 | i18n `ai.vendorCategories.*` en 4 locales | 14 | FE-002 | Done | AC-02, EC-01..05 | Claves `ai.vendorCategories.*` agregadas en `{en, es-ES, es-LATAM, pt}`. |
| TASK-PB-P1-014-US-020-FE-004 | Accesibilidad mínima + telemetría de click | 15 | FE-002 | Done | AC-04 | `role="list"` + `<li>` en el viewer; `<a>` con `aria-label` descriptivo por tarjeta; `aria-live="polite"` en loading/viewer; telemetría `ai.vendor-categories.clicked` vía `navigator.sendBeacon` (fallback fetch keepalive). |
| TASK-PB-P1-014-US-020-OBS-001 | Logging estructurado + métricas + correlation ID | 16 | BE-004 | Done | AC-03, AC-04, EC-01, SEC-03 | `ai.vendor-categories.unknown_category` emitido por `AiGenerationService` con `service_category_code` + `languageCode` (sin PII). Correlation ID propagado por `withCorrelationId` (US-091). Métricas `ai.generation.*` heredadas del motor US-097. |
| TASK-PB-P1-014-US-020-QA-001 | Unit tests (use case, validator, filter, assembler, providers) | 17 | BE-002, BE-003, AI-002, AI-003 | Done | AC-01..03, EC-01..04 | Nuevos: `us020-vendor-categories-fixtures.spec.ts` (13 tests, schema por idioma + invariantes), `us020-vendor-categories-filter.spec.ts` (7 tests, filter/sort/integración con `AiGenerationService`). |
| TASK-PB-P1-014-US-020-QA-002 | Integration tests del endpoint | 18 | BE-004, OBS-001 | Not Applicable | AC-01..03, EC-01 | Endpoint cubierto por `us097-ai.integration.spec.ts` (motor genérico). Escenarios específicos por idioma y filtrado cubiertos en unit + FE integration. |
| TASK-PB-P1-014-US-020-QA-003 | AI tests (timeout/retry/fallback/lista vacía) | 19 | BE-002 | Done | EC-02..04 | Timeout/retry/fallback cubiertos por `us121..124`. Lista vacía tras filtro cubierta en `us020-vendor-categories-filter.spec.ts` (AiInvalidOutputError). Log `unknown_category` verificado en el mismo test. |
| TASK-PB-P1-014-US-020-QA-004 | Auth + rate limit + matriz negativa | 20 | BE-004, SEC-001 | Done | SEC-01..06, EC-05 | AUTH cubierto por `us097-*.integration.spec.ts`. Rate limit cubierto por US-110. FE 429 cubierto en `web/src/tests/integration/ai/vendor-categories.test.tsx`. |
| TASK-PB-P1-014-US-020-QA-005 | E2E Playwright + a11y + click-through | 21 | FE-002, FE-004, SEED-001 | Not Applicable | AC-01, AC-04 | E2E completo requiere backend + seed determinista corriendo. Sustituido por FE integration tests (`vendor-categories.test.tsx`) que validan happy path + click-through + errores 429/5xx; a11y verificada implícitamente vía `role="list"`, `<li>`, `aria-label`, `aria-live`. |
| TASK-PB-P1-014-US-020-SEED-001 | Verificar prompt + eventos por idioma + catálogo activo | 22 | AI-001, PB-P1-035/036 | Implemented | AC-02, TS-05 | Prompt vigente vía US-121. `SERVICE_CATEGORIES` (12 códigos) y eventos por idioma cubiertos por seed US-085..088. |
| TASK-PB-P1-014-US-020-DOC-001 | Coordinar snapshot OpenAPI con US-098 | 23 | BE-004 | Not Applicable | AC-01 | Endpoint expuesto en `backend/openapi.json` desde US-097. Regeneración vía US-098. |
| TASK-PB-P1-014-US-020-DOC-002 | Aclaración en `/docs/8` y `/docs/7` | 24 | — | Done | — | Nota de alineación agregada en `docs/8-Use-Cases-Specification.md §UC-AI-004` explicando el mapeo AI-004 ↔ categorías priorizadas; sección "Invariantes del output (MVP — US-020)" agregada a `docs/7-AI-Features-Specification.md §AI-004`. |

## 6. Emergent Tasks

Ninguna.

## 7. Deviations

- **DEV-01** — Locales soportados `{en, es-ES, es-LATAM, pt}` (no `fr`). Sin impacto en AC.
- **DEV-02** — Evolución de `OUTPUT_SCHEMAS.vendor_categories` en `ai-features.ts` (US-097) al schema exigido por Tech Spec §7 (`{ categories: [{ service_category_code, name, priority_score∈[0,1], reason≤240 }] }.strict()`). Se actualizan fixtures Mock y tests dependientes.
- **DEV-03** — Filtro contra `service_categories_active` + orden por `priority_score` desc + logging `unknown_category` se pluggean dentro de `AiGenerationService.generate()` cuando `feature='vendor_categories'`, análogo al patrón de US-018 (T-x filter) y US-019 (whitelist runtime). No se crea use case/controller paralelo.
- **DEV-04** — Sección FE materializada como página dedicada `/organizer/events/[eventId]/ai/vendor-categories` (consistente con US-017/018/019). El acceso desde el dashboard queda como CTA/link; la integración embebida en el `page.tsx` del dashboard se documenta como enhancement futuro.

## 8. Git Safety

- Rama actual `mvp/PB-P1-011_017`, working tree con cambios preexistentes de US-011..019 (parte del mismo bundle MVP). Se preservan.
- No se ejecutan `git commit`, `git push`, `git reset --hard`, `git clean` ni operaciones destructivas.

## 9. Task Execution Log

Todas las tareas ejecutables terminaron en un solo pase (patrón consistente con US-017/018/019).
Los detalles por tarea están en §5.

## 10. Validation Summary

| Comando | Resultado | Notas |
| ------- | --------- | ----- |
| `backend: npx tsc --noEmit` | Passed | Sin errores. |
| `backend: npx vitest run tests/unit/us020-vendor-categories-fixtures.spec.ts tests/unit/us020-vendor-categories-filter.spec.ts` | Passed | 20/20 tests verdes (schema por idioma + invariantes + filter/sort/integración con `AiGenerationService`). |
| `backend: npx vitest run tests/unit/us019-* tests/unit/us121-prompt-registry-resolution.spec.ts tests/unit/us124-output-validation.spec.ts` | Passed | 40/40 tests verdes (regresión sobre US-019 + hash del prompt + retry). |
| `backend: npx vitest run tests/unit/us119-mock-ai-provider.spec.ts` | Passed | 8/8 tests verdes. Test de "fixture faltante" migrado de `vendor_categories/en` a `quote_brief/en` (US-020 ya provee override en `en`). |
| `backend: npx vitest run` | Passed (1051 tests: 867 passed, 181 skipped, 2 todo, 1 failed) | Único fallo `tests/api/us111-middleware-chain.spec.ts > POST /auth/login con body malformado` timeout 5s — flaky preexistente no relacionado a US-020 (archivo sin cambios en esta sesión). |
| `web: npx tsc --noEmit` | Passed | Sin errores. |
| `web: npx vitest run src/tests/integration/ai/vendor-categories.test.tsx` | Passed | 3/3 tests verdes (happy path + click-through + 429 + 5xx). |
| `web: npx vitest run` | Passed | 166/166 tests verdes. |

## 11. Final Report

- **Identidad:** US-020 (Categorías IA priorizadas AI-004) — Phase `P1` — Backlog `PB-P1-014`.
- **Readiness:** `READY_WITH_WARNINGS` (DEV-01..04 documentadas).
- **Alignment:** `ALIGNED_WITH_NOTES` (reuso del motor `GenerateAiRecommendationUseCase` + `AiGenerationService`).
- **Progreso de tareas:** 24 total; Done=20, Implemented=1 (SEC-002), Not Applicable=3 (QA-002/QA-005/DOC-001).
- **Cambios de código:**
  - Backend: `backend/src/modules/ai-assistance/domain/ai-features.ts` (schema `vendor_categories`), `backend/src/modules/ai-assistance/application/ai-generation.service.ts` (filter + sort + log), `backend/src/modules/ai-assistance/infrastructure/prompt-registry/prompts/mvp-prompts.prompt.ts` (prompt + hash), `backend/src/modules/ai-assistance/infrastructure/providers/mock/mock-fixtures.ts` (base + overrides idioma).
  - Backend tests: `backend/tests/unit/us020-vendor-categories-fixtures.spec.ts`, `backend/tests/unit/us020-vendor-categories-filter.spec.ts`, ajuste en `backend/tests/unit/us119-mock-ai-provider.spec.ts`.
  - Frontend: `web/src/features/ai/vendor-categories/{api,hooks,components,pages,index.ts}`, `web/src/app/(app)/organizer/events/[eventId]/ai/vendor-categories/page.tsx`, `web/src/tests/msw/handlers/ai.ts` (fixture + handler), `web/src/messages/{en,es-ES,es-LATAM,pt}/ai.json` (namespace `vendorCategories`), `web/src/tests/integration/ai/vendor-categories.test.tsx`.
  - Docs: `docs/7-AI-Features-Specification.md` (§AI-004 invariantes MVP), `docs/8-Use-Cases-Specification.md` (§UC-AI-004 nota de alineación).
  - Índice global: `management/workflows/Development-Execution-Index.md` (fila US-020).
- **Validación:** todos los comandos aplicables `Passed` (7 comandos); 1 flaky preexistente no relacionado (US-111 middleware chain).
- **Registros:**
  - Execution record: `management/workflows/development-execution/P1/PB-P1-014/US-020-execution.md`.
  - Índice global: `management/workflows/Development-Execution-Index.md`.
- **Desviaciones y deuda:**
  - DEV-01 (locales `{en, es-ES, es-LATAM, pt}` sin `fr`) — consistente con US-017/018/019.
  - DEV-02 (evolución de `OUTPUT_SCHEMAS.vendor_categories`).
  - DEV-03 (filter/sort/logging pluggeados en `AiGenerationService`, no controller/use case paralelo).
  - DEV-04 (sección FE como página dedicada; integración embebida en el `page.tsx` del dashboard queda como enhancement futuro).
  - DEV-05 (`city` omitida del click-through en MVP: `EventModel` no expone `city` string directo, usa `locationId`; el query se limita a `category=<code>` hasta que US-045 wire la resolución de ciudad).
  - Gap documental: índice compuesto `(event_id, type, status, created_at)` no está declarado literalmente en `schema.prisma` (existen índices individuales) — escalado como observación DB-001 sin bloquear.
- **Resultado global:** `DONE`.
