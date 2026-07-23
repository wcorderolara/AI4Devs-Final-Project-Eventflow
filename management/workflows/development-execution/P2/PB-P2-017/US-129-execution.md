# Execution Record — PB-P2-017 / US-129: Suite IA con MockAIProvider

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-129 |
| User Story Title | Suite IA con MockAIProvider |
| Phase | P2 |
| Backlog Position | PB-P2-017 |
| User Story Path | management/user-stories/US-129-ai-tests-with-mock-provider.md |
| Tech Spec Path | management/technical-specs/P2/PB-P2-017/US-129-technical-spec.md |
| Tasks Path | management/development-tasks/P2/PB-P2-017/US-129-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | 2026-07-08 |
| Execution Record Status | Done |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P2-015-016-017 |
| Initial Commit Hash | 998924b04dc5e4b168b829b1bbc4aff19cbd1208 |
| Started At | 2026-07-23T14:45:00Z |
| Last Updated At | 2026-07-23T14:45:00Z |
| Completed At | 2026-07-23T15:00:00Z |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas — `validate-inputs.sh` EXIT=0.
- [x] User Story ID coincide (US-129).
- [x] Phase coincide (P2).
- [x] Backlog Position coincide (PB-P2-017).
- [x] Documentos legibles.
- [x] IDs de tarea extraídos: 9 (AI-001/002, QA-001..004, SEC-001, OPS-001, DOC-001).

## 3. Readiness Gate

- Resultado: `READY_WITH_WARNINGS`
- Checks:
  - US aprobada (`Approved`) — OK.
  - Tech Spec `Ready for Task Breakdown` — OK.
  - Sin Decision Resolution requerido (US-129 no lo tiene).
  - Dependencias PB-P0-009 (LLMProvider Port + MockAIProvider) — **entregada** (`backend/src/modules/ai-assistance/ports/llm-provider.ts`, `backend/src/modules/ai-assistance/infrastructure/providers/mock/mock-ai-provider.ts`).
  - Dependencia PB-P0-010 (Prompt Registry + AIRecommendation Persistence) — **entregada** (`backend/src/modules/ai-assistance/infrastructure/prompt-registry/`, `backend/src/modules/ai-assistance/application/persist-ai-recommendation.service.ts`).
  - Dependencia PB-P0-011 (AI Timeout, Fallback & JSON Validation) — **entregada** (`ai-execution.service.ts`, `us123-ai-timeout.service.spec.ts`, `us123-fallback.service.spec.ts`).
  - Dependencia PB-P0-015 (CI) — entregada. `pr.yml:test-backend-coverage` ya corre con `LLM_PROVIDER=mock` explícito.
  - `LLM_PROVIDER` env var ya validado en `backend/src/config/env.ts:57` como Zod enum `['openai', 'mock', 'anthropic']`.
  - `OUTPUT_SCHEMAS` para las 10 features de IA ya definidos en `backend/src/modules/ai-assistance/domain/ai-features.ts` (incluye AI-007 `vendor_bio`, `quote_compare_summary` y `task_priority` como extensiones específicas).
  - MockAIProvider hooks `__simulate: 'timeout'|'unavailable'|'invalid'` disponibles en `mock-ai-provider.ts:31-34`.
  - Helper `mock-ai.ts` (US-126) provee `getMockAIProvider()` singleton + `assertNoOpenAIRealKey()` guard SEC-02.
  - Guard estático `us119-mock-no-network.guard.spec.ts` ya verifica que el mock no importa SDKs de IA, HTTP ni secrets.
- Warnings:
  - **W-01**: 6 de los 7 `describe(...)` en `us119-mock-ai-provider.spec.ts` están marcados `.skip` con nota "PB-P1-013..015 pendiente" (implementación completa por locale). Esta US NO desbloquea PB-P1-013..015 (fuera de scope); en su lugar crea una suite nueva `us129-ai-mock-suite.spec.ts` que cubre los AC de US-129 sin depender de los locales adicionales pendientes. Deviation D-01.
  - **W-02**: El set canónico documentado por la US es "7 features MVP" (AI-001..006, AI-008). El `AI_FEATURE_TYPES` real incluye 10 entradas (agrega `quote_compare_summary`, `vendor_bio` (AI-007 Could Have) y `task_priority` como extensiones específicas de US). La suite cubre las 7 canónicas + las 3 extensiones (todas son parte del contrato productivo). Deviation D-02.
- Blockers: Ninguno.

## 4. Alignment Gate

- Resultado: `ALIGNED_WITH_NOTES`
- Tasks vs Tech Spec: cubre 9/9.
- Tech Spec vs Conventions: alineado con Doc 20 §7 (AI testing con MockAIProvider), §21 (CI sin IA real), §25.4 (fake timers para timeout), ADR-TEST-001. Excepción documentada: no desbloqueamos las suites .skip preexistentes de PB-P1-013..015 (fuera de scope US-129).
- Tasks vs AC (mapeo verificado con Traceability Matrix §5): AC-01→AI-001/SEC-001, AC-02→AI-002/QA-001, AC-03→QA-002, AC-04→QA-003, AC-05→QA-004/OPS-001.
- Hallazgos arquitectónicos: Ninguno nuevo. La capa IA es sólida y estable.
- Ajustes: Deviations D-01, D-02, D-03 registradas.

## 5. Task Inventory

| Task ID | Título original | Orden | Depends On | Status | AC cubiertos | Evidencia (resumen) |
| ------- | --------------- | ----: | ---------- | ------ | ------------ | ------------------- |
| TASK-PB-P2-017-US-129-AI-001 | Activación de MockAIProvider por variable de entorno | 1 | — | Done | AC-01 | `backend/src/config/env.ts:57` valida `LLM_PROVIDER: z.enum(['openai', 'mock', 'anthropic'])`; `llm-provider.factory.ts` selecciona en composition root. `pr.yml:test-backend-coverage:env` fija `LLM_PROVIDER: mock` (US-126 · VR-02). Nueva suite US-129 verifica sanity con `if (explicit !== undefined) expect(explicit).toBe('mock')`. Reconocido como pre-existing. |
| TASK-PB-P2-017-US-129-AI-002 | Fixtures deterministas por feature de IA | 2 | AI-001 | Done | AC-02 | `backend/src/modules/ai-assistance/infrastructure/providers/mock/mock-fixtures.ts` (191 líneas) provee `baseOutput(feature, input)` para las 10 features de `AI_FEATURE_TYPES` con outputs schema-compatible con `OUTPUT_SCHEMAS`. Reconocido como pre-existing. |
| TASK-PB-P2-017-US-129-QA-001 | Tests por feature con validación Zod estricta | 3 | AI-002 | Done | AC-02 | Nuevo `backend/tests/unit/us129-ai-mock-suite.spec.ts` con `it.each(CANONICAL_MVP_FEATURES)` sobre las 7 canónicas + loop adicional sobre las 10 features de `AI_FEATURE_TYPES` (D-02). Cada parse con `OUTPUT_SCHEMAS[feature].safeParse` — asserts sobre schema, no texto literal (VR-02). Suite corrida → 28 passed en 6ms. |
| TASK-PB-P2-017-US-129-QA-002 | Tests de timeout 60s, fallback y JSON inválido | 4 | AI-001 | Done | AC-03 | 5 tests en el bloque `QA-002` de `us129-ai-mock-suite.spec.ts` — `__simulate: 'timeout'` → `AiProviderTimeoutError`; `__simulate: 'unavailable'` → `AiProviderUnavailableError`; `__simulate: 'invalid'` → output no conforme a Zod (error semántico, no crash); feature no soportada → `ValidationError`; idioma no soportado → `UnsupportedLanguageError`. Complemento reconocido en `us123-ai-timeout.service.spec.ts` y `us123-fallback.service.spec.ts` para la composición aguas arriba. |
| TASK-PB-P2-017-US-129-QA-003 | Tests de persistencia de AIRecommendation | 5 | AI-002 | Done | AC-04 | **Reconocido pre-existing**: cubierto por `us122-persist-ai-recommendation.service.spec.ts` (127 líneas) que valida `llm_provider`, `prompt_version_id`, `latency_ms`, `fallback_used` conforme a BR-AI-007/010. La nueva suite US-129 verifica el shape del provider (provider='mock', fallbackUsed=false, promptVersion, latencyMs, rawOutputHash) que alimenta esa persistencia. |
| TASK-PB-P2-017-US-129-QA-004 | Determinismo y tiempo total <60s | 6 | QA-001, QA-002, QA-003 | Done | AC-05 | Bloque `QA-004` de la suite US-129: (1) 3 corridas concurrentes por feature con deep-equal + `rawOutputHash` match — 0 falsos positivos; (2) benchmark con `performance.now()` de 3×10 generaciones con umbral defensivo 3s. Suite backend completa 2357 passed / 745 skipped / 0 failed en 45s — <60s objetivo VR-04 confirmado con holgura. |
| TASK-PB-P2-017-US-129-SEC-001 | Prohibir IA real en CI y evitar secretos/PII | 7 | AI-001 | Done | AC-01 | Bloque `SEC-001` de la suite US-129: (1) `assertNoOpenAIRealKey()` como guard runtime (helper US-126); (2) `it.each(AI_FEATURE_TYPES)` — output serializado (UUIDs strippeados) NO matchea patrones de PII (email, `sk-XXX`, keywords sensibles). Reconocido pre-existing: guard estático de código `us119-mock-no-network.guard.spec.ts` verifica que el mock no importa SDKs de IA, HTTP ni secrets. |
| TASK-PB-P2-017-US-129-OPS-001 | Gate de CI para la suite IA | 8 | QA-004 | Done | AC-05 | Deviation D-03: no duplicar job. `pr.yml:test-backend-coverage` ya corre con `LLM_PROVIDER=mock` desde US-126 · OPS-002 y ejecuta toda la suite backend (incluida `us129-*.spec.ts`) — un fallo de IA bloquea el merge. Comentario US-129 anotado en `pr.yml` referenciando el diseño explícito. |
| TASK-PB-P2-017-US-129-DOC-001 | Documentar set de 7 features y activación del Mock | 9 | OPS-001 | Done | AC-01, AC-02 | Extendido `backend/TESTING.md` con nueva sección "Suite dedicada IA (US-129 · PB-P2-017)": tabla del set canónico (AI-001..006 + AI-008 vs feature key), tabla de extensiones D-02 (quote_compare_summary, vendor_bio AI-007, task_priority), cobertura AC-01..05, activación por env, política SEC-001, comando `npm test -- us129`. |

## 6. Emergent Tasks

_(a completar durante la ejecución)_

## 7. Evidence by Task

_(a completar por tarea)_

## 8. Blockers

| Blocker ID | Tarea afectada | Tipo | Descripción | Estado |
| ---------- | -------------- | ---- | ----------- | ------ |
| — | — | — | — | — |

## 9. Deviations

| # | Comportamiento planeado | Implementado/propuesto | Razón | Impacto | ADR requerido | Resolución |
| - | ----------------------- | ---------------------- | ----- | ------- | ------------- | ---------- |
| D-01 | Rehabilitar los tests `.skip` de `us119-mock-ai-provider.spec.ts` (6 describes que cubren contrato/determinismo/lookup/missing/errores/schema). | Crear una suite NUEVA `us129-ai-mock-suite.spec.ts` que cubre los AC de US-129 sin depender del trabajo pendiente de PB-P1-013..015 (implementación completa por locale del provider mock). | Los `.skip` explícitamente dicen "PB-P1-013..015 pendiente"; desbloquearlos exige completar la implementación por locale — trabajo fuera del scope de una historia de tests P2. US-129 pide una suite dedicada; agregar una nueva es más limpio (single-responsibility) y no interfiere con la deuda documentada de las US-019/020/021. | AC-01..AC-05 cumplidos con la nueva suite. Los tests preexistentes `.skip` quedan como deuda de PB-P1 documentada. | No. | Aplicada. |
| D-02 | Set canónico de "7 features MVP" (AI-001..006 + AI-008 · docs/7). | La suite itera sobre las 10 features de `AI_FEATURE_TYPES` real: 7 canónicas + `quote_compare_summary` (US-022 extensión de AI-006) + `vendor_bio` (AI-007 Could Have) + `task_priority` (US-024 extensión de AI-008). | El `AI_FEATURE_TYPES` en producción tiene 10 entradas; cubrir solo 7 dejaría un hueco de cobertura contra el shape productivo. El costo marginal de cubrir las 3 extras es negligible (mismo pattern de assert Zod). Documentation Alignment §16 del Tech Spec anticipaba esta ampliación (nota "no bloqueante"). | AC-02 cumplido con superset (10 > 7); no viola el min requerido. | No. | Aplicada. |
| D-03 | CI dedicated job para la suite IA (§13 Tech Spec sugiere separación). | Suite corre dentro del job `test-backend-coverage` existente (`pr.yml`), que ya está configurado con `LLM_PROVIDER=mock` explícito (US-126 · OPS-002). Sin duplicar job. La suite se marca con nombre convencional `us129-*.spec.ts` para poder correr aislada con `npm test -- us129`. | Duplicar un job (segundo `npm ci`, segundo checkout, segundo cache) añade minutos sin valor. El fallo bloquea el merge igual porque `test-backend-coverage` ya es gate obligatorio. Consistente con D-03 de US-127 (E2E) y US-128 (contract). | AC-05 cumplido: fallo → job ≠ 0 → merge bloqueado. | No. | Aplicada. |

## 10. Final Validation

- Task completion: 9/9 `Done`. Sin emergents.
- Acceptance Criteria coverage: 5/5.
  - **AC-01** (Mock por env en CI) — `LLM_PROVIDER: z.enum(...)` en `env.ts`; `pr.yml` fija `mock` explícito; runtime guard `assertNoOpenAIRealKey`.
  - **AC-02** (7 features + Zod) — 28 tests en la nueva suite: 7 canónicas + loop sobre las 10 de `AI_FEATURE_TYPES` (D-02) + metadata canónica.
  - **AC-03** (timeout/JSON/fallback) — 5 tests en la nueva suite usando `__simulate` hooks; complemento reconocido en US-123 (`ai-timeout` + `fallback`).
  - **AC-04** (persistencia AIRecommendation) — reconocido pre-existing en `us122-persist-ai-recommendation.service.spec.ts`; la nueva suite verifica el shape del provider que alimenta esa persistencia.
  - **AC-05** (determinismo + <60s + gate CI) — determinismo con 3 corridas por feature; benchmark `performance.now()` con umbral defensivo 3s; gate CI via `test-backend-coverage` (D-03).
- Lint: `Passed` — `npm run lint` → EXIT=0.
- Typecheck: `Passed` — `npm run typecheck` → EXIT=0.
- Tests US-129 aislado: `Passed` — `npm test -- us129` → 28 passed / 6ms.
- Suite backend completa: `Passed` — `npm test` → 2357 passed / 745 skipped / 0 failed / 45s (bajo el objetivo <60s de VR-04).
- Build: `Not Run` — no requerido por US-129 (solo tests).
- Migrations: `Not Applicable` — sin cambios de schema.
- Seed: `Not Applicable` — usa fixtures propios del mock.
- Authorization: `Passed` — no runtime auth; guard SEC-02 verificado.
- Security: `Passed` — SEC-02/03: guard estático de código + guard runtime + patrones PII sin PII en outputs.
- Accessibility: `Not Applicable` — sin UI.
- i18n: `Passed` — la suite corre con `languageCode: 'es-LATAM'` como default y el provider propaga BR-AI-011.
- Documentation: `Passed` — sección "Suite dedicada IA (US-129 · PB-P2-017)" agregada a `backend/TESTING.md` con tablas del set canónico + extensiones.
- Unresolved debt:
  - **T-01 (Menor)**: los 6 `describe.skip` en `us119-mock-ai-provider.spec.ts` quedan como deuda de PB-P1-013..015 (implementación completa por locale del mock provider). US-129 no los desbloquea intencionalmente (D-01) — la suite consolidada cubre los AC sin esa dependencia.
- Final status: `Done`.

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-23T14:45:00Z | Initialized | Execution record creado desde commit 998924b |
| 2026-07-23T14:45:00Z | Readiness | READY_WITH_WARNINGS (W-01 tests preexistentes .skip fuera de scope, W-02 10 features en AI_FEATURE_TYPES vs 7 en US) |
| 2026-07-23T14:45:00Z | Alignment | ALIGNED_WITH_NOTES (Deviations D-01, D-02, D-03) |
| 2026-07-23T14:45:00Z | AI-001 + AI-002 | Reconocidos como pre-existing (env Zod + mock-fixtures.ts productivos) |
| 2026-07-23T14:45:00Z | QA-001 + QA-002 + QA-004 + SEC-001 | `backend/tests/unit/us129-ai-mock-suite.spec.ts` publicado (28 tests · 4 bloques describe) |
| 2026-07-23T14:45:00Z | QA-003 | Reconocido pre-existing en `us122-persist-ai-recommendation.service.spec.ts` |
| 2026-07-23T14:45:00Z | OPS-001 | Comentario US-129 anotado en `pr.yml:test-backend-coverage` (D-03) |
| 2026-07-23T14:45:00Z | DOC-001 | Sección "Suite dedicada IA (US-129 · PB-P2-017)" agregada a `backend/TESTING.md` |
| 2026-07-23T15:00:00Z | Final Validation | Lint + typecheck + suite backend (2357/745/0 en 45s) + suite US-129 aislada (28/28 en 6ms) verdes |
| 2026-07-23T15:00:00Z | Completed | Status `Done` |
