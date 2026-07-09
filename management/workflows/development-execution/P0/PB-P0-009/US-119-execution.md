# Execution Record — PB-P0-009 / US-119: Implementar MockAIProvider determinista

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-119 |
| User Story Title | Implementar MockAIProvider determinista |
| Phase | P0 |
| Backlog Position | PB-P0-009 |
| User Story Path | management/user-stories/US-119-mock-ai-provider.md |
| Tech Spec Path | management/technical-specs/P0/PB-P0-009/US-119-technical-spec.md |
| Tasks Path | management/development-tasks/P0/PB-P0-009/US-119-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | last-modified 2026-07-08 |
| Execution Record Status | Done |
| Readiness Status | READY |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | foundation/PB-P0-009 |
| Initial Commit Hash | f3cb61107fc274e370fd15653fc5ee31366b0197 |
| Started At | 2026-07-09T18:45:00Z |
| Last Updated At | 2026-07-09T18:57:41Z |
| Completed At | 2026-07-09T18:57:41Z |
| Claude Session ID | (no disponible) |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (3 argumentos, existen, dentro del repo) — `validate-inputs.sh` exit 0
- [x] User Story ID coincide en las 3 rutas — US-119
- [x] Phase coincide — P0 · Backlog Position coincide — PB-P0-009
- [x] Documentos legibles
- [x] IDs de tarea extraídos (rango: TASK-PB-P0-009-US-119-PO-001 … TASK-PB-P0-009-US-119-DOC-002)

## 3. Readiness Gate

- Resultado: `READY`
- Checks: US-119 `Approved` / `Ready for Development Tasks: Yes`; AC-01..AC-08 testeables; Tech Spec `Ready for Task Breakdown`; Tasks File con 24 tareas; `DEVELOPMENT_CONVENTIONS.md` legible; **dependencia US-117 `Done`** (contrato, tipos, errores disponibles); historia en backlog priorizado (PB-P0-009, posición 3 de 4). Todos OK.
- Warnings: US-117/US-118 aún sin commitear (working tree); compilan y pasan tests — no bloquea.
- Blockers: Ninguno
- Decision/Refinement files: No existen para US-119.

## 4. Alignment Gate

- Resultado: `ALIGNED_WITH_NOTES`

### Notas (no bloqueantes)

- **MockAIProvider preexistente:** existía desde US-097 en `infrastructure/mock-ai-provider.ts`. US-119 lo **formaliza y endurece**: se **movió** a `infrastructure/providers/mock/` (consistencia con `providers/openai/` de US-118 y con el módulo sugerido por la spec) y se agregó fixture registry, generic fallback + warning y errores tipados. Se **preservó** la conducta de US-097 (hooks `__simulate` timeout/unavailable/invalid; outputs `es-LATAM` idénticos; `provider='mock'`), por lo que `us097-ai.spec` y `us097-ai-security.spec` siguen verdes.
- **Puerto Opción B (US-117):** el request operativo `generate({ feature, input, languageCode })` no transporta `AIContext`, así que `promptVersionId`/`scenarioSeed`/matchers se leen de hooks opcionales del `input` (`__promptVersionId`, `__scenarioSeed`, `eventTypeCode`, `vendorProfileId`) con defaults deterministas; `correlationId` no está disponible en la frontera del puerto y no se loguea.
- **`AI_USE_MOCK_FALLBACK`** (mencionada en la spec para demo): pertenece a PB-P0-011 (fallback) y queda **fuera de US-119**; la config de mock para test/CI ya funciona con `LLM_PROVIDER=mock` sin secrets (OPS-001 satisfecho).

Tasks derivan de la Tech Spec; cobertura AC completa. Sin contradicción con ADR-AI-001/003, ADR-TEST-003.

## 5. Task Inventory

| Task ID | Título original | Depends On | Status | AC | Evidencia |
| ------- | --------------- | ---------- | ------ | -- | --------- |
| TASK-PB-P0-009-US-119-PO-001 | Confirmar contrato US-117 y límites | — | Done | AC-01 | US-117 `Done`; non-goals confirmados |
| TASK-PB-P0-009-US-119-BE-001 | `MockFixtureKey` y builder determinístico | PO-001 | Done | AC-02/03/04 | `mock-fixture-key.ts` |
| TASK-PB-P0-009-US-119-BE-002 | Registry/loader de fixtures | BE-001 | Done | AC-02/04 | `mock-fixtures.ts` (`resolveFixture`) |
| TASK-PB-P0-009-US-119-BE-003 | Generic deterministic output | BE-002 | Done | AC-05 | `baseOutput` + fallback en provider |
| TASK-PB-P0-009-US-119-BE-004 | `MockAIProvider` contra `LLMProvider` | BE-003 | Done | AC-01 | `mock-ai-provider.ts` (movido+endurecido) |
| TASK-PB-P0-009-US-119-BE-005 | Metadata + separar fallback ownership | BE-004 | Done | AC-08 | `fallbackUsed=false`, provider='mock', rawOutputHash |
| TASK-PB-P0-009-US-119-AI-001 | Fixtures base versionables | BE-002 | Done | AC-02/04/05 | `mock-fixtures.ts` (8 features + `en` event_plan) |
| TASK-PB-P0-009-US-119-AI-002 | Validar fixtures/generic vs schemas | AI-001, BE-003 | Done | AC-07 | test schema compatibility (8 features) |
| TASK-PB-P0-009-US-119-AI-003 | Documentar dimensiones de lookup | BE-001, AI-001 | Done | AC-03 | `providers/mock/README.md` §Dimensiones |
| TASK-PB-P0-009-US-119-SEC-001 | Bloquear red/SDK/secrets | BE-004 | Done | AC-06 | `us119-mock-no-network.guard.spec.ts` |
| TASK-PB-P0-009-US-119-SEC-002 | Fixtures ficticias + logs seguros | AI-001, OBS-001 | Done | AC-05/06 | fixtures sin PII; test warning sin raw input |
| TASK-PB-P0-009-US-119-SEC-003 | Separación auth/ownership/fallback | BE-005 | Done | AC-08 | review: sin auth/fallback en provider; `fallbackUsed=false` |
| TASK-PB-P0-009-US-119-OBS-001 | Logs estructurados seguros | BE-003, BE-004 | Done | AC-05/06 | `ai.mock.fixture_missing` warn seguro |
| TASK-PB-P0-009-US-119-SEED-001 | Fixtures alineadas a demo sin seed DB | AI-001 | Done | AC-02/04/05 | fixtures en código, sin DB; README §alignment |
| TASK-PB-P0-009-US-119-QA-001 | Contrato + metadata directa | BE-004, BE-005 | Done | AC-01/08 | test provider=mock, fallbackUsed=false |
| TASK-PB-P0-009-US-119-QA-002 | Determinismo + lookup exacto | BE-001/002, AI-001 | Done | AC-02/03/04 | deep-equal x3; key dims; `en` fixture |
| TASK-PB-P0-009-US-119-QA-003 | Missing fixture + warning | BE-003, OBS-001 | Done | AC-05 | test generic + warn seguro |
| TASK-PB-P0-009-US-119-QA-004 | Schema compatibility | AI-002 | Done | AC-07 | test 8 features vs OUTPUT_SCHEMAS |
| TASK-PB-P0-009-US-119-QA-005 | No network/SDK/secrets | SEC-001, OPS-001 | Done | AC-06 | guard test |
| TASK-PB-P0-009-US-119-QA-006 | Safe logging + fixtures ficticias | SEC-002 | Done | AC-05/06 | test warning sin PII/raw |
| TASK-PB-P0-009-US-119-QA-007 | Config mock test/demo | OPS-001, BE-004 | Done | AC-06 | env.setup `LLM_PROVIDER=mock`; sin secrets |
| TASK-PB-P0-009-US-119-OPS-001 | Entorno test/CI mock sin secrets | BE-004 | Done | AC-06 | `.env.example`/env ya soportan mock sin OpenAI secret |
| TASK-PB-P0-009-US-119-DOC-001 | Responsabilidades/non-goals | BE-004, AI-003 | Done | AC-01/03/06 | `providers/mock/README.md` |
| TASK-PB-P0-009-US-119-DOC-002 | Alignment seed/fallback | DOC-001 | Done | AC-08 | README §Documentation alignment |

> 24 tareas. IDs/títulos verbatim. Ninguna renumerada; ninguna `In Progress` residual.

## 6. Emergent Tasks

Ninguna.

## 7. Evidence by Task

### Archivos creados
- `backend/src/modules/ai-assistance/infrastructure/providers/mock/mock-fixture-key.ts`
- `backend/src/modules/ai-assistance/infrastructure/providers/mock/mock-fixtures.ts`
- `backend/src/modules/ai-assistance/infrastructure/providers/mock/mock-ai-provider.ts` (movido desde `infrastructure/mock-ai-provider.ts` + endurecido)
- `backend/src/modules/ai-assistance/infrastructure/providers/mock/README.md`
- `backend/tests/unit/us119-mock-ai-provider.spec.ts` (8 tests)
- `backend/tests/unit/us119-mock-no-network.guard.spec.ts` (1 test)

### Archivos modificados / eliminados
- `backend/src/modules/ai-assistance/infrastructure/llm-provider.factory.ts` — import del mock actualizado a `./providers/mock/mock-ai-provider.js`.
- `backend/tests/unit/us097-ai.spec.ts` — import path del mock actualizado (sin cambio de lógica).
- **Eliminado:** `backend/src/modules/ai-assistance/infrastructure/mock-ai-provider.ts` (movido, `git rm`).

### Comandos ejecutados (verbatim → exit → resumen)
- `npm run typecheck` → 0 → sin errores.
- `npx vitest run` (suite completa) → 0 → **561 passed | 83 skipped (BD ausente) | 2 todo | 0 failed** (+9 tests US-119; US-097 sin regresión).
- `npx eslint src tests --ext .ts` → 0 → sin findings.
- `npm run openapi:check` → 0 → snapshot sin drift.

### Resultados de validación
- Lint: **Passed** · Typecheck: **Passed** · Tests: **Passed** (561, 0 failed)
- Build: **Not Run** (no requerido) · DB/Migrations/Seed: **Not Applicable**
- Security: **Passed** (guard no-red/no-SDK/no-secrets; warning sin PII/raw input)
- Structure (`check:structure`): **Failed (preexistente, ajeno)** — 88≠80 en HEAD; `providers/mock/` es depth-3/4, no altera el conteo depth-2.

### Acceptance Criteria cubiertos
- AC-01 implementa `LLMProvider` → `MockAIProvider implements LLMProvider` + contract test.
- AC-02 determinismo → deep-equal x3, `latencyMs` constante, sin `Date.now`/`Math.random`.
- AC-03 dimensiones de key → `MockFixtureKey` + builder + test de key.
- AC-04 idioma → fixture `en` específica para event_plan; fallback genérico si no existe.
- AC-05 missing fixture → output genérico + `ai.mock.fixture_missing` warn seguro; test.
- AC-06 sin dependencia externa → guard test (no red/SDK/secrets); CI con `LLM_PROVIDER=mock`.
- AC-07 schema compatibility → test valida 8 features vs `OUTPUT_SCHEMAS`.
- AC-08 fallback ownership → `fallbackUsed=false`, `provider='mock'`; review sin fallback en provider.

### Convenciones verificadas
Clean/Hex (adapter en Infrastructure/providers); eslint boundaries; logger + `redact()`; determinismo (sin randomness/tiempo real); npm canónico.

### Deviations / Technical debt: ver §9. · Commit/PR: N/A.

## 8. Blockers

Ninguno.

## 9. Deviations

| # | Planeado | Implementado | Razón | Impacto | AC | ADR | Resolución |
| - | -------- | ------------ | ----- | ------- | -- | --- | ---------- |
| 1 | `AIContext` con promptVersionId/scenarioSeed/correlationId | Dimensiones vía hooks de `input` con defaults; correlationId no logueado | Puerto US-117 (Opción B) no transporta AIContext | Bajo | AC-02/03/04/05 | No | Aceptada; documentada en README |
| 2 | Fixtures como archivos por feature (`fixtures/<feature>/`) | Fixtures en módulo TS (`mock-fixtures.ts`) | Menor superficie, tipado y schema-check directo; sin estado global mutable | Muy bajo | AC-02 | No | Aceptada |
| 3 | `check:structure` = 80 dirs | Repo real 88 (8 módulos con capa `dto/`) | Invariante hardcodeado desactualizado desde antes de US-119 | Nulo para US-119 | US-090 script | No | Deuda preexistente ajena |

## 10. Final Validation

- Task completion: 24/24 Done
- Acceptance Criteria coverage: 8/8 con evidencia
- Lint: Passed · Typecheck: Passed · Tests: Passed (561, 0 failed)
- Build: Not Run · Migrations/Seed: Not Applicable
- Authorization: Not Applicable · Security: Passed
- Accessibility/i18n: Not Applicable (sin UI; el mock respeta `languageCode`)
- Documentation: Passed (`providers/mock/README.md`)
- Unresolved debt: `check:structure` (preexistente, ajeno); correlationId en logs pendiente de que el puerto lleve `AIContext`
- Final status: **Done**

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-09T18:45:00Z | Initialized | Execution record creado |
| 2026-07-09T18:45:00Z | Readiness | READY (dependencia US-117 Done) |
| 2026-07-09T18:45:00Z | Alignment | ALIGNED_WITH_NOTES (mock preexistente US-097; puerto Opción B) |
| 2026-07-09T18:57:41Z | Implemented | Mock movido a `providers/mock/` + endurecido; 6 creados, 2 modificados, 1 eliminado |
| 2026-07-09T18:57:41Z | Validated | typecheck 0 · vitest 561 passed/0 failed · eslint 0 · openapi:check sin drift |
| 2026-07-09T18:57:41Z | Done | 24/24 tareas Done; AC 8/8 |
