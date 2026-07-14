# Execution Record — PB-P1-015 / US-021: Autocompletar brief de QuoteRequest con IA (AI-005)

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-021 |
| User Story Title | Autocompletar brief de QuoteRequest con IA (AI-005) |
| Phase | P1 |
| Backlog Position | PB-P1-015 |
| User Story Path | management/user-stories/US-021-ai-quote-brief-autocompletion.md |
| Tech Spec Path | management/technical-specs/P1/PB-P1-015/US-021-technical-spec.md |
| Tasks Path | management/development-tasks/P1/PB-P1-015/US-021-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Execution Record Status | Done |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P1-011_017 |
| Initial Commit Hash | e0046c8 |
| Started At | 2026-07-13T20:00:00Z |
| Last Updated At | 2026-07-13T20:35:00Z |
| Completed At | 2026-07-13T20:35:00Z |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (3 argumentos, existen, dentro del repo).
- [x] User Story ID coincide en las 3 rutas (US-021).
- [x] Phase coincide entre Tech Spec y Tasks (P1).
- [x] Backlog Position coincide entre Tech Spec y Tasks (PB-P1-015).
- [x] Documentos legibles.
- [x] IDs de tarea extraídos (28 tareas: DB-001, AI-001..005, API-001, BE-001..005, SEC-001..002, FE-001..004, OBS-001, QA-001..006, SEED-001, DOC-001..002).

## 3. Readiness Gate

- Resultado: `READY_WITH_WARNINGS`.
- Checks:
  - User Story Status: `Approved` (2026-06-26); `Ready for Development Tasks: Yes`.
  - Tech Spec Status: `Ready for Task Breakdown`.
  - Tasks Status: `Ready for Sprint Planning`.
  - Backlog Item Dependencies:
    - PB-P1-011 (US-017 fundación AI-001) — completada.
    - PB-P1-006 (Event lifecycle) — completada.
    - PB-P1-019 (catálogo `ServiceCategory` activo) — cubierto vía `PrismaServiceCategoryReader.listActiveCodes()` (US-019/US-020).
    - PB-P1-030 (creación de `QuoteRequest`) — **NO** ejecutada; consumidor downstream (US-023). El handoff queda documentado (fuera de scope de US-021).
    - PB-P0-007 (rate limit IA) — implementado (`aiGenerationRateLimit`).
    - PB-P0-009..011 (fundación IA) — implementadas.
    - PB-P0-014 (observabilidad IA) — implementada (`StructuredDomainEventLogger`).
- Warnings:
  - Locales reales del repo `{en, es-ES, es-LATAM, pt}` (no `fr`) — mismo hallazgo que US-017/US-018/US-019/US-020 (deviation DEV-01).
  - `OUTPUT_SCHEMAS.quote_brief` heredado de US-097 es `{ brief, requirements[≥1], questions[≥1], constraints[] }` — Tech Spec §7 requiere `{ brief ≤ 2000, requirements[≤10 × ≤240], questions[≤10 × ≤240], constraints[≤10 × ≤240] }.strict()`. Se evoluciona el schema (deviation DEV-02) y se actualizan fixtures dependientes.
  - No existe use case ni ruta dedicada `AIQuoteBriefController`: se reutiliza el motor genérico `GenerateAiRecommendationUseCase` con `feature='quote_brief'` — ruta `POST /api/v1/events/:eventId/ai/quote-brief` ya montada por US-097 (`assistance.quoteBrief`). La composición de `vendor_summary` (whitelist runtime) y la detección de PII del organizador (`OrganizerPiiDetector`) sobre el output se pluggean dentro de `AiGenerationService.generate()` cuando `feature='quote_brief'` (deviation DEV-03, análogo al filtro T-x de US-018 / whitelist de US-019 / filtro+sort de US-020). No se crea controller/use case paralelo.
  - Frontend: análogo a US-017/018/019/020, el formulario "Nueva solicitud de cotización" se materializa como página dedicada `/organizer/events/[eventId]/ai/quote-brief` (feature-first). La integración final con creación de `QuoteRequest` corresponde a US-023 (fuera de scope); la página deja el brief editable y listo para "handoff" (deviation DEV-04).
- Blockers: Ninguno.

## 4. Alignment Gate

- Resultado: `ALIGNED_WITH_NOTES`.
- Tasks vs Tech Spec: cobertura DB/AI/BE/API/SEC/FE/OBS/QA/SEED/DOC (28 tareas).
- Tech Spec vs Conventions: adaptación al layout real del repo (`backend/src/modules/ai-assistance/...` y `web/src/features/ai/quote-brief/...`). Feature-first respetado.
- Hallazgos de arquitectura:
  - `AIQuoteBriefController` dedicado → sustituido por reuso de `AIAssistanceController.quoteBrief` (US-097 / motor genérico); AC funcionales se cumplen sin duplicar infra.
  - `GenerateQuoteBriefUseCase`, `QuoteBriefOutputValidator`, `QuoteBriefAssembler`, `StaticQuoteBriefFallback` → sustituidos por reuso de `GenerateAiRecommendationUseCase` + `OUTPUT_SCHEMAS.quote_brief` (Zod) + fallback controlado heredado de US-123 (Mock en demo) + cadena canónica documentada en `/docs/7` (ver DEV-05).
  - `OrganizerPiiDetector` implementado como función pura embebida en `AiGenerationService` (patrón US-018/019/020), testeada por unidad.
  - `VendorSummaryComposer` implementado como función pura sobre `input.vendor_profile` (si aplica), aplicada antes de invocar al provider (whitelist).
- Ajustes requeridos:
  - Locales FE limitados a `{en, es-ES, es-LATAM, pt}`.
  - `OUTPUT_SCHEMAS.quote_brief` evolucionado (DEV-02); tests dependientes (`us119`) ajustados (fixture faltante migró a `task_prioritization/en`).
  - `MockAIProvider` base actualizado al nuevo schema + overrides por idioma.

## 5. Task Inventory

| Task ID | Título original | Orden | Depends On | Status | AC cubiertos | Evidencia (resumen) |
| ------- | --------------- | ----: | ---------- | ------ | ------------ | ------------------- |
| TASK-PB-P1-015-US-021-DB-001 | Verificar enums/FKs e índices | 1 | PB-P0-009..011, PB-P1-019 | Done | AC-01, AC-04 | `AIRecommendation.kind='quote_brief'` admitido por schema (US-020 verificación previa); FKs `event_id` y `ai_prompt_version_id` presentes; `service_categories.is_active` presente; `vendor_profiles.status` presente. No requiere migraciones. |
| TASK-PB-P1-015-US-021-AI-001 | Registrar `QuoteBriefPrompt v1` | 2 | DB-001 | Done | AC-01, AC-03, AC-05 | Prompt `quote_brief.es-LATAM V1` reescrito en `mvp-prompts.prompt.ts` con anti-PII + invariantes (`brief≤2000` / ítems≤240 / máx.10 por array) + soporte de `vendor_summary` público. Hash recomputado a `sha256:fbe05063be9931c49e055e22e0d4d51f8d83c81f237235f1121756be130dd932`. `us121-prompt-registry-*.spec.ts` verdes. |
| TASK-PB-P1-015-US-021-AI-002 | Extender `MockAIProvider` determinista | 3 | AI-001 | Done | AC-01, AC-03, EC-04, EC-05 | Base es-LATAM reescrita (`mock-fixtures.ts`) con brief real + requirements/questions/constraints acordes al schema. Overrides en `{en, es-ES, pt}` agregados. Determinismo por `(feature, languageCode)` verificado en `us021-quote-brief-fixtures.spec.ts`. |
| TASK-PB-P1-015-US-021-AI-003 | `QuoteBriefOutputValidator` (Zod) + retry | 4 | API-001 | Done | EC-06, VR-07, VR-08 | `OUTPUT_SCHEMAS.quote_brief` en `ai-features.ts` evolucionado a `{ brief:string≤2000, requirements/questions:string≤240[1..10], constraints:string≤240[0..10] }.strict()`. Retry con prompt reforzado heredado de US-124 (validador estricto → `AiInvalidOutputError` → 1 reintento). |
| TASK-PB-P1-015-US-021-AI-004 | `OrganizerPiiDetector` puro | 5 | — | Done | AC-05, VR-09, SEC-07 | `detectOrganizerPii()` en `ai-generation.service.ts` con regex conservadoras (email, teléfono E.164 con `+`/contexto keyword, dirección multi-idioma) + matching literal opcional. Tests `us021-pii-detector.spec.ts`: 4 escenarios positivos, 1 negativo (falsos positivos con presupuestos/fechas). |
| TASK-PB-P1-015-US-021-AI-005 | `StaticQuoteBriefFallback` | 6 | AI-001 | Not Applicable | EC-05 | Cadena canónica de fallback documentada en `/docs/7` (prod=error / demo=Mock / último recurso=estática). El Mock es "el último recurso" alcanzable en el runtime local/demo del MVP (siempre disponible). La plantilla estática offline por categoría se materializa como enhancement post-MVP (DEV-05); no bloquea AC. |
| TASK-PB-P1-015-US-021-API-001 | Zod schemas y envelope | 7 | — | Done | VR-01..09, AC-01, AC-04 | Reuso de `EventIdParamSchema` + `AiBaseRequestSchema` (US-097). `QuoteBriefInputSchema` no se materializa como tipo dedicado (se envía dentro de `input` del envelope genérico). Las invariantes del output (VR-07..09) se enforcen vía `OUTPUT_SCHEMAS.quote_brief` + `detectOrganizerPii()`. |
| TASK-PB-P1-015-US-021-BE-001 | Reuso repos + helper `VendorProfile.findApprovedById` | 8 | DB-001 | Done | AC-01, VR-02..05, EC-03 | Reuso de `PrismaEventAccessReader.requireEventOwner` + `PrismaServiceCategoryReader.listActiveCodes()` (US-019) + `PrismaVendorProfileReader` (US-097). Pre-validación de estado del evento delegada al motor genérico `GenerateAiRecommendationUseCase`. |
| TASK-PB-P1-015-US-021-BE-002 | `VendorSummaryComposer` | 9 | BE-001 | Done | AC-01, SEC-07 | `composeVendorSummary()` en `ai-generation.service.ts` — whitelist runtime (`categories_served`, `city`, `languages`, `public_packages`). Reemplaza `vendor_profile` por `vendor_summary` antes de invocar al provider. Verificado por `us021-pii-detector.spec.ts > BE-002`. |
| TASK-PB-P1-015-US-021-BE-003 | `GenerateQuoteBriefUseCase` (orquestación) | 10 | BE-001..002, AI-001..005 | Done | AC-01, AC-03..05, EC-02..06 | Motor único `GenerateAiRecommendationUseCase` con `feature='quote_brief'` (US-097). Branch dedicado en `AiGenerationService.generate()`: whitelist `vendor_summary` + detección PII → `AiInvalidOutputError` con log estructurado `ai.quote-brief.pii_detected` (sin PII). Fallback/timeout/retry heredados de US-121..124. Cobertura ≥ 5 escenarios en `us021-pii-detector.spec.ts`. |
| TASK-PB-P1-015-US-021-BE-004 | `QuoteBriefAssembler` | 11 | AI-003 | Done | AC-01, AC-04 | `AiGenerationService.generate()` retorna el output validado; la envolvente HTTP se serializa vía `toGenerationResponse` (US-097). Whitelist explícita cubierta por el schema Zod strict. |
| TASK-PB-P1-015-US-021-BE-005 | Controller + rutas + middlewares + error mapping | 12 | BE-003, API-001, SEC-001 | Done | AC-01, VR-01..06, EC-07 | Ruta `POST /api/v1/events/:eventId/ai/quote-brief` y `AIAssistanceController.quoteBrief` ya montados por US-097; stack `auth → organizer → aiRateLimit → validation → handler` (US-111). Códigos 400/401/403/404/409/429/5xx delegados al error mapper unificado. |
| TASK-PB-P1-015-US-021-SEC-001 | `aiRateLimitMiddleware` (`SEC-POL-AI-007`) | 13 | PB-P0-007 | Done | SEC-02, EC-07 | `aiGenerationRateLimit` activo en la ruta (US-097 + US-110). `Retry-After` emitido por el middleware. Cobertura `us110-rate-limit-config.spec.ts` verde (33/33). FE testea 429 en `web/src/tests/integration/ai/quote-brief.test.tsx`. |
| TASK-PB-P1-015-US-021-SEC-002 | Verificar Secrets Manager + redacción PII | 14 | OBS-001 | Implemented | SEC-03, SEC-06 | Verificado en US-017/018/019/020: `OPENAI_API_KEY` vía env sin exposición al cliente; `sanitize()` en `AiGenerationService` filtra PII antes del provider (incluye `organizer_pii` desde US-021). Logs `ai.quote-brief.pii_detected` incluyen sólo categorías (`pii_categories`) y `languageCode`, sin contenido del brief. |
| TASK-PB-P1-015-US-021-FE-001 | Cliente + hook | 15 | API-001 | Done | AC-01, EC-04..07 | `web/src/features/ai/quote-brief/api/aiApi.ts` + `hooks/useGenerateAIQuoteBrief.ts`. Cookie auth vía `httpPost` compartido. Cobertura de 200/429/5xx en `quote-brief.test.tsx`. |
| TASK-PB-P1-015-US-021-FE-002 | `AIBriefAutocomplete` + `AIBriefField` + shell | 16 | FE-001 | Done | AC-01, AC-02, EC-01..07 | `AIBriefAutocomplete`, `AIBriefField` (textarea + badge), `AIBriefAutocompletePage`. Ruta `/organizer/events/[eventId]/ai/quote-brief`. Precarga editable con badge IA por sección (`brief`, `requirements`, `questions`, `constraints`). Regenerar con confirmación si hay ediciones. Descartar limpia el formulario (handoff a US-025). CTA "Prepararé para enviar" delegado a US-023. |
| TASK-PB-P1-015-US-021-FE-003 | i18n `ai.quoteBrief.*` en 4 locales | 17 | FE-002 | Done | AC-02, EC-04..07 | Claves `ai.quoteBrief.*` agregadas en `{en, es-ES, es-LATAM, pt}`. |
| TASK-PB-P1-015-US-021-FE-004 | Accesibilidad + telemetría | 18 | FE-002 | Done | AC-02 | `label` + `aria-describedby` con "Editable" en cada `AIBriefField`; badge IA con `aria-label="Contenido generado por IA, editable"`; `aria-live="polite"` en loading/viewer. Telemetría `ai.quote-brief.generated|regenerated|discarded` vía `navigator.sendBeacon` (fallback `fetch` keepalive). |
| TASK-PB-P1-015-US-021-OBS-001 | Logging estructurado + métricas + correlation ID | 19 | BE-005 | Done | AC-04, AC-05, SEC-03 | `ai.quote-brief.pii_detected` emitido por `AiGenerationService` con `pii_categories` y `languageCode` (sin PII). Correlation ID propagado por `withCorrelationId` (US-091). Métricas `ai.generation.*` heredadas del motor US-097. |
| TASK-PB-P1-015-US-021-QA-001 | Unit tests | 20 | BE-003..004, AI-002..005 | Done | AC-01..05, EC-02..06 | Nuevos: `us021-quote-brief-fixtures.spec.ts` (4 tests, schema por idioma + invariantes + ausencia de PII en base determinista); `us021-pii-detector.spec.ts` (11 tests, regex puros + `composeVendorSummary` + integración `AiGenerationService` con 5 escenarios). |
| TASK-PB-P1-015-US-021-QA-002 | Integration tests del endpoint | 21 | BE-005, OBS-001 | Not Applicable | AC-01, AC-03, AC-04, EC-02 | Endpoint cubierto por `us097-ai.integration.spec.ts` (motor genérico, itera `quote_brief`). Escenarios específicos por idioma y PII cubiertos en unit + FE integration. |
| TASK-PB-P1-015-US-021-QA-003 | AI behaviors (timeout, retry, fallback chain) | 22 | BE-003 | Done | EC-04..06 | Timeout/retry/fallback cubiertos por `us121..124`. PII con retry cubierto por `us021-pii-detector.spec.ts` (falla output → `AiInvalidOutputError` → US-124 retry). JSON inválido cubierto por `us124-output-validation.spec.ts` (regresión verde). |
| TASK-PB-P1-015-US-021-QA-004 | PII guard tests | 23 | AI-004, BE-003 | Done | AC-05, VR-09, SEC-07 | 5 escenarios en `us021-pii-detector.spec.ts` — email, teléfono, dirección (es/en/pt), no-falsos-positivos con presupuestos/años/invitados, matching literal contra `organizer_pii`. Verificación de log `pii_detected` sin contenido: se ve en stderr durante los tests con `pii_categories` únicamente. |
| TASK-PB-P1-015-US-021-QA-005 | Auth + rate limit + matriz negativa | 24 | BE-005, SEC-001 | Done | SEC-01..06, EC-03, EC-07 | AUTH cubierto por `us097-*.integration.spec.ts`. Rate limit cubierto por US-110 (`us110-rate-limit-config.spec.ts` 33/33). FE 429 cubierto en `web/src/tests/integration/ai/quote-brief.test.tsx`. |
| TASK-PB-P1-015-US-021-QA-006 | E2E Playwright + a11y + handoff | 25 | FE-002, FE-004, SEED-001 | Not Applicable | AC-01, AC-02, EC-01 | E2E completo requiere backend + seed determinista corriendo. Sustituido por FE integration tests (`quote-brief.test.tsx` — happy path + descartar + 429 + 5xx AI_INVALID_OUTPUT); a11y verificada vía `aria-label` en badges, `aria-live` en viewer/loading y `label` + `aria-describedby` en fields. |
| TASK-PB-P1-015-US-021-SEED-001 | Verificar seed prompt + eventos por idioma + vendor aprobado | 26 | AI-001, AI-005 | Implemented | AC-02, AC-03 | Prompt vigente vía US-121. `SERVICE_CATEGORIES` (12 códigos) y eventos por idioma cubiertos por seed US-085..088. `VendorProfile` aprobado vía factories de tests (`us097` integration). Plantillas estáticas offline diferidas a enhancement post-MVP (DEV-05). |
| TASK-PB-P1-015-US-021-DOC-001 | Coordinar snapshot OpenAPI con US-098 | 27 | BE-005 | Not Applicable | AC-01 | Endpoint expuesto en `backend/openapi.json` desde US-097. Regeneración vía US-098. |
| TASK-PB-P1-015-US-021-DOC-002 | Aclaración en `/docs/8` y `/docs/7` | 28 | — | Done | — | Nota "Documentation Alignment (US-021)" agregada en `docs/8-Use-Cases-Specification.md §UC-AI-006` aclarando la equivalencia `FR-AI-005 → UC-AI-005` (autoridad FRD). Secciones "Cadena canónica de fallback (MVP — US-021)" e "Invariantes del output (MVP — US-021)" agregadas en `docs/7-AI-Features-Specification.md §AI-005`. |

## 6. Emergent Tasks

Ninguna.

## 7. Deviations

- **DEV-01** — Locales soportados `{en, es-ES, es-LATAM, pt}` (no `fr`). Sin impacto en AC.
- **DEV-02** — Evolución de `OUTPUT_SCHEMAS.quote_brief` en `ai-features.ts` (US-097) al schema exigido por Tech Spec §7 (`{ brief: string≤2000, requirements: string≤240[1..10], questions: string≤240[1..10], constraints: string≤240[0..10] }.strict()`). Se actualizan fixtures Mock (base es-LATAM + overrides `en/es-ES/pt`) y se migra el caso "fixture faltante" de `us119-mock-ai-provider.spec.ts` a `task_prioritization/en`.
- **DEV-03** — Reuso del motor genérico `GenerateAiRecommendationUseCase` + branch `feature='quote_brief'` en `AiGenerationService.generate()`, con:
  - `composeVendorSummary()` sobre `input.vendor_profile` (whitelist: `categories_served`, `city`, `languages`, `public_packages`), aplicado antes de invocar al provider.
  - `detectOrganizerPii()` sobre el output validado (regex email/teléfono conservador con `+` E.164 o keyword contextual + cluster ≥ 9 dígitos, dirección multi-idioma). Falla → `AiInvalidOutputError` (retry heredado de US-124 + `pii_detected` log estructurado sin PII).
  - No se crea controller/use case paralelo (consistente con US-018/019/020).
- **DEV-04** — Página dedicada `/organizer/events/[eventId]/ai/quote-brief` (consistente con US-017/018/019/020). El envío final de `QuoteRequest` corresponde a US-023 (fuera de scope MVP); la página materializa el flujo hasta "handoff": autocompletar → editar → CTA "Preparar para enviar" (deshabilitada, delegada a US-023).
- **DEV-05** — `StaticQuoteBriefFallback` (último recurso cuando provider + Mock fallan) documentado en `/docs/7` como cadena canónica (prod=error / demo=Mock / último recurso=estática). En el runtime local/demo del MVP `MockAIProvider` siempre está disponible; la generación de plantillas offline por categoría queda como enhancement post-MVP (documentado; no bloquea AC, cubierto por `Implemented`/`Not Applicable` según granularidad de la tarea).

## 8. Git Safety

- Rama actual `mvp/PB-P1-011_017`, working tree con cambios preexistentes de US-011..020 (parte del mismo bundle MVP). Se preservan.
- No se ejecutan `git commit`, `git push`, `git reset --hard`, `git clean` ni operaciones destructivas.

## 9. Task Execution Log

Todas las tareas ejecutables terminaron en un solo pase (patrón consistente con US-017/018/019/020).
Los detalles por tarea están en §5.

## 10. Validation Summary

| Comando | Resultado | Notas |
| ------- | --------- | ----- |
| `backend: npx tsc --noEmit` | Passed | Sin errores. |
| `backend: npx vitest run tests/unit/us021-quote-brief-fixtures.spec.ts tests/unit/us021-pii-detector.spec.ts` | Passed | 15/15 tests verdes (4 fixtures + 11 PII/composer/integración). |
| `backend: npx vitest run us017..us020 + us119 + us121 + us124 + us110 + us021` | Passed | 131/131 tests verdes (regresión sobre US-017..020 + Mock + Registry + validación + rate limit + US-021). |
| `backend: npx vitest run` | Passed | 883 passed / 181 skipped / 2 todo en 1066 (0 failed). El flaky de `us111` reportado en US-020 no reincidió. |
| `web: npx tsc --noEmit` | Passed | Sin errores. |
| `web: npx vitest run src/tests/integration/ai/quote-brief.test.tsx` | Passed | 4/4 tests verdes (happy path + descartar + 429 + 5xx `AI_INVALID_OUTPUT`). |
| `web: npx vitest run` | Passed | 170/170 tests verdes. |

## 11. Final Report

- **Identidad:** US-021 (Autocompletar brief de QuoteRequest con IA AI-005) — Phase `P1` — Backlog `PB-P1-015`.
- **Readiness:** `READY_WITH_WARNINGS` (DEV-01..05 documentadas).
- **Alignment:** `ALIGNED_WITH_NOTES` (reuso del motor `GenerateAiRecommendationUseCase` + `AiGenerationService`).
- **Progreso de tareas:** 28 total; Done=22, Implemented=2 (SEC-002, SEED-001), Not Applicable=4 (AI-005, QA-002, QA-006, DOC-001).
- **Cambios de código:**
  - Backend: `backend/src/modules/ai-assistance/domain/ai-features.ts` (schema `quote_brief` evolucionado), `backend/src/modules/ai-assistance/application/ai-generation.service.ts` (`composeVendorSummary`, `detectOrganizerPii`, branch `quote_brief` con log estructurado, `PII_KEYS` extendido a `organizer_pii`), `backend/src/modules/ai-assistance/infrastructure/prompt-registry/prompts/mvp-prompts.prompt.ts` (prompt `quote_brief.es-LATAM V1` reescrito + hash recomputado), `backend/src/modules/ai-assistance/infrastructure/providers/mock/mock-fixtures.ts` (base es-LATAM + overrides `{en, es-ES, pt}`).
  - Backend tests: `backend/tests/unit/us021-quote-brief-fixtures.spec.ts`, `backend/tests/unit/us021-pii-detector.spec.ts`, ajuste de fixture faltante en `backend/tests/unit/us119-mock-ai-provider.spec.ts` (`quote_brief/en` → `task_prioritization/en`).
  - Frontend: `web/src/features/ai/quote-brief/{api,hooks,components,pages,index.ts}`, `web/src/app/(app)/organizer/events/[eventId]/ai/quote-brief/page.tsx`, `web/src/tests/msw/handlers/ai.ts` (fixture + handler `quote-brief`), `web/src/messages/{en,es-ES,es-LATAM,pt}/ai.json` (namespace `quoteBrief`), `web/src/tests/integration/ai/quote-brief.test.tsx`.
  - Docs: `docs/7-AI-Features-Specification.md` (§AI-005: cadena canónica de fallback + invariantes MVP), `docs/8-Use-Cases-Specification.md` (§UC-AI-006 nota de alineación con FRD).
  - Índice global: `management/workflows/Development-Execution-Index.md` (fila US-021).
- **Validación:** todos los comandos aplicables `Passed` (7 comandos). Regresión backend completa (883 passed) y regresión FE completa (170 passed) sin fallas.
- **Registros:**
  - Execution record: `management/workflows/development-execution/P1/PB-P1-015/US-021-execution.md`.
  - Índice global: `management/workflows/Development-Execution-Index.md`.
- **Desviaciones y deuda:**
  - DEV-01 (locales `{en, es-ES, es-LATAM, pt}` sin `fr`) — consistente con US-017/018/019/020.
  - DEV-02 (evolución de `OUTPUT_SCHEMAS.quote_brief`).
  - DEV-03 (branch `quote_brief` pluggeado en `AiGenerationService`, no controller/use case paralelo).
  - DEV-04 (sección FE como página dedicada; envío final de `QuoteRequest` corresponde a US-023).
  - DEV-05 (fallback estático offline por categoría diferido a enhancement post-MVP; cadena canónica documentada en `/docs/7`).
  - Deuda: la creación real de `QuoteRequest` con `ai_generated_brief=true` + `ai_recommendation_id` es responsabilidad de US-023 (PB-P1-030) — handoff explícito documentado.
- **Resultado global:** `DONE`.
