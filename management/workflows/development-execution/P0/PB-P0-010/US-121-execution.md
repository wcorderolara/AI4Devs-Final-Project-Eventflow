# Execution Record — PB-P0-010 / US-121: Implementar prompt registry versionado

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-121 |
| User Story Title | Implementar prompt registry versionado |
| Phase | P0 |
| Backlog Position | PB-P0-010 |
| User Story Path | management/user-stories/US-121-prompt-registry-versioned.md |
| Tech Spec Path | management/technical-specs/P0/PB-P0-010/US-121-technical-spec.md |
| Tasks Path | management/development-tasks/P0/PB-P0-010/US-121-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | last-modified 2026-07-08 |
| Execution Record Status | Done |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | foundation/PB-P0-010_PB-P0-011 |
| Initial Commit Hash | b7584d4df8dfcabe5a29537b7355175c3a8d4caf |
| Started At | 2026-07-09T19:58:10Z |
| Last Updated At | 2026-07-09T20:12:00Z |
| Completed At | 2026-07-09T20:12:00Z |
| Claude Session ID | 18124a39-5113-457a-bab2-2e289a014309 |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (3 argumentos, existen, dentro del repo) — `validate-inputs.sh` EXIT=0
- [x] User Story ID coincide en las 3 rutas (nombre + contenido) — US-121
- [x] Phase coincide entre Tech Spec y Tasks — P0
- [x] Backlog Position coincide entre Tech Spec y Tasks — PB-P0-010
- [x] Documentos legibles
- [x] IDs de tarea extraídos (rango: TASK-PB-P0-010-US-121-PO-001 … TASK-PB-P0-010-US-121-DOC-002; 25 tareas)

## 3. Readiness Gate

- Resultado: READY_WITH_WARNINGS
- Checks:
  - User Story status `Approved with Minor Notes`, `Ready for Development Tasks: Yes` → habilita. PASS
  - Acceptance Criteria AC-01..AC-10 testeables. PASS
  - Tech Spec `Ready for Task Breakdown`. PASS
  - Tasks File con 25 IDs `TASK-...`. PASS
  - `DEVELOPMENT_CONVENTIONS.md` existe y legible. PASS
  - Dependencia PB-P0-001 (schema): modelo `AIPromptVersion` presente en `backend/prisma/schema.prisma`. PASS
  - Dependencia PB-P0-009 (US-117..120 `Done`): `ai-contract.ts` (`AIContext`, `LanguageCode`, `PromptVersionId`), `ai-features.ts` presentes. PASS
  - Backlog priorizado incluye PB-P0-010. PASS
  - No execution record previo para US-121 (ejecución fresca). PASS
- Warnings:
  - W1: El enum real `AIPromptVersionStatus` de Prisma sólo declara `active | deprecated`, mientras la User Story/Tech Spec describen un ciclo de vida más amplio (`draft, reviewed, approved, active, deprecated, archived`). No bloquea: la Tech Spec §10 anticipa "mapear sin rediseñar schema salvo gap formal". El registry usa un ciclo de vida enriquecido en código (TS) y el export a `AIPromptVersion` mapea a `active|deprecated`. Ver Deviation D1.
  - W2: El modelo real `AIPromptVersion` es más delgado que el asumido por la spec (no tiene columnas `feature_type` ni `language`; sí `promptKey`, `version`, `provider`, `templateChecksum`). El mapping codifica identidad en `promptKey = <featureType>.<languageCode>`. Ver Deviation D2.
- Blockers: Ninguno
- Decision files relacionados: `management/user-stories/decision-resolutions/US-121-decision-resolution.md` → No existe (N/A; decisiones aplicadas en la US aprobada + ADR-AI-006)
- Refinement files relacionados: `management/user-stories/refinement-reviews/US-121-refinement-review.md` → No inspeccionado como bloqueante; la US declara "No blocking PO/BA decisions remain".

## 4. Alignment Gate

- Resultado: ALIGNED_WITH_NOTES
- Tasks vs Tech Spec: Cada tarea deriva de la spec (§7, §10, §11, §13, §19). Orden respeta el grafo de dependencias (§7 del Tasks File). Cubre backend, AI/PromptOps, DB mapping, seed/export, security, QA, DevOps y docs. Sin scope no aprobado. PASS
- Tech Spec vs Conventions: Backend-only, módulo `ai-assistance`, npm + Vitest, límites de capa (domain no importa infra/SDK), tests en `tests/**/*.spec.ts`. PASS
- Tasks vs Acceptance Criteria (mapeo):
  - AC-01 → BE-001, BE-002, BE-003, AI-001, QA-001
  - AC-02 → BE-002, BE-003, QA-001
  - AC-03 → BE-003, QA-002, OBS-001, OPS-001
  - AC-04 → BE-001, BE-002, QA-003, OBS-001, SEC-002
  - AC-05 → BE-001, BE-003, BE-004, AI-001, QA-004, DOC-001
  - AC-06 → AI-002, SEC-001, SEC-002, SEC-003, QA-006
  - AC-07 → DB-001, BE-005, SEED-001, SEED-002, QA-005, OPS-001, DOC-002
  - AC-08 → BE-004, QA-004, OPS-001, DOC-001, DOC-002
  - AC-09 → AI-003, QA-006
  - AC-10 → QA-001..QA-006, OPS-001
  - Ningún AC huérfano. PASS
- Hallazgos de arquitectura: Ninguno bloqueante. Sin nuevo servicio/cola, sin bypass de autorización, sin fuga de Prisma al Domain (el registry vive en Infrastructure; sólo el export toca tipos de columna). ADR-AI-006 respetado (prompts en código + metadata `AIPromptVersion`).
- Ajustes requeridos: Ninguno bloqueante. Notas W1/W2 registradas como deviations D1/D2 (mapping documentado, sin rediseño de schema).

## 5. Task Inventory

| Task ID | Título original | Orden | Depends On | Status | Started | Completed | AC cubiertos | Evidencia (resumen) |
| ------- | --------------- | ----: | ---------- | ------ | ------- | --------- | ------------ | ------------------- |
| TASK-PB-P0-010-US-121-PO-001 | Confirmar contratos previos y límites PromptOps | 1 | — | Done | 2026-07-09 | 2026-07-09 | AC-01, AC-07 | Dependencias PB-P0-001/PB-P0-009 verificadas; estrategia híbrida confirmada |
| TASK-PB-P0-010-US-121-BE-001 | Definir tipos y errores de `PromptRegistry` | 2 | PO-001 | Done | 2026-07-09 | 2026-07-09 | AC-01, AC-04, AC-05 | `prompt-template.ts`, `prompt-registry-errors.ts` |
| TASK-PB-P0-010-US-121-DB-001 | Mapear `AIPromptVersion` sin rediseñar schema | 3 | PO-001 | Done | 2026-07-09 | 2026-07-09 | AC-07 | Mapping documentado (D2); sin migración |
| TASK-PB-P0-010-US-121-BE-002 | Implementar resolución `active` y `specific` | 4 | BE-001 | Done | 2026-07-09 | 2026-07-09 | AC-01, AC-02, AC-04 | `prompt-registry.ts` resolve() |
| TASK-PB-P0-010-US-121-BE-003 | Implementar builder y validación de registry | 5 | BE-002 | Done | 2026-07-09 | 2026-07-09 | AC-01, AC-02, AC-03, AC-05 | validación en constructor |
| TASK-PB-P0-010-US-121-BE-004 | Implementar hash/checksum y version discipline | 6 | BE-003 | Done | 2026-07-09 | 2026-07-09 | AC-05, AC-08 | `prompt-hash.ts` + drift check |
| TASK-PB-P0-010-US-121-AI-001 | Crear templates MVP iniciales con metadata completa | 7 | BE-003 | Done | 2026-07-09 | 2026-07-09 | AC-01, AC-05 | `prompts/*.prompt.ts` |
| TASK-PB-P0-010-US-121-AI-002 | Definir safety constraints obligatorias | 8 | AI-001 | Done | 2026-07-09 | 2026-07-09 | AC-06 | `safety-constraints.ts` + templates |
| TASK-PB-P0-010-US-121-AI-003 | Bloquear prompts Future/P4 en estado active | 9 | AI-001 | Done | 2026-07-09 | 2026-07-09 | AC-09 | `mvp-feature-allowlist.ts` |
| TASK-PB-P0-010-US-121-BE-005 | Exponer export de metadata `AIPromptVersion` | 10 | BE-004, DB-001 | Done | 2026-07-09 | 2026-07-09 | AC-07 | `aipromptversion-export.ts` |
| TASK-PB-P0-010-US-121-SEED-001 | Implementar seed/sync o export determinístico | 11 | BE-005 | Done | 2026-07-09 | 2026-07-09 | AC-07 | export estático determinístico (registry-only) |
| TASK-PB-P0-010-US-121-SEED-002 | Validar idempotencia e integridad demo | 12 | SEED-001 | Done | 2026-07-09 | 2026-07-09 | AC-07 | test idempotencia |
| TASK-PB-P0-010-US-121-OBS-001 | Registrar eventos seguros de validación fallida | 13 | BE-003 | Done | 2026-07-09 | 2026-07-09 | AC-03, AC-04, AC-06 | `prompt-registry-logger.ts` |
| TASK-PB-P0-010-US-121-SEC-001 | Escanear prompts contra secrets y PII real | 14 | AI-001 | Done | 2026-07-09 | 2026-07-09 | AC-06, AC-10 | `secret-pii-scan.ts` + test |
| TASK-PB-P0-010-US-121-SEC-002 | Asegurar logs y errores sin prompt leakage | 15 | BE-001, OBS-001 | Done | 2026-07-09 | 2026-07-09 | AC-04, AC-06 | errores con metadata segura |
| TASK-PB-P0-010-US-121-SEC-003 | Verificar ausencia de endpoints y edición dinámica | 16 | BE-005 | Done | 2026-07-09 | 2026-07-09 | AC-01, AC-06 | review + guard test |
| TASK-PB-P0-010-US-121-QA-001 | Probar resolución active y specific | 17 | BE-002, AI-001 | Done | 2026-07-09 | 2026-07-09 | AC-01, AC-02, AC-10 | `us121-*-resolution.spec.ts` |
| TASK-PB-P0-010-US-121-QA-002 | Probar duplicate active rejection | 18 | BE-003 | Done | 2026-07-09 | 2026-07-09 | AC-03, AC-10 | spec duplicate active |
| TASK-PB-P0-010-US-121-QA-003 | Probar errores de feature, idioma y versión no soportados | 19 | BE-002 | Done | 2026-07-09 | 2026-07-09 | AC-04, AC-10 | spec unsupported |
| TASK-PB-P0-010-US-121-QA-004 | Probar metadata requerida y hash drift | 20 | BE-004, AI-001 | Done | 2026-07-09 | 2026-07-09 | AC-05, AC-08, AC-10 | spec metadata+hash |
| TASK-PB-P0-010-US-121-QA-005 | Probar sync/export `AIPromptVersion` | 21 | BE-005, SEED-001 | Done | 2026-07-09 | 2026-07-09 | AC-07, AC-10 | spec export |
| TASK-PB-P0-010-US-121-QA-006 | Probar safety constraints y bloqueo Future/P4 | 22 | AI-002, AI-003, SEC-001 | Done | 2026-07-09 | 2026-07-09 | AC-06, AC-09, AC-10 | spec safety |
| TASK-PB-P0-010-US-121-OPS-001 | Integrar checks PromptOps en CI | 23 | QA-001, QA-004, QA-005, QA-006 | Done | 2026-07-09 | 2026-07-09 | AC-03, AC-07, AC-08, AC-10 | script `promptops:check` + step CI |
| TASK-PB-P0-010-US-121-DOC-001 | Documentar disciplina de versionado de prompts | 24 | BE-004, AI-001 | Done | 2026-07-09 | 2026-07-09 | AC-05, AC-08 | `prompt-registry/README.md` |
| TASK-PB-P0-010-US-121-DOC-002 | Registrar alignment documental pendiente | 25 | DOC-001 | Done | 2026-07-09 | 2026-07-09 | AC-07, AC-08 | nota de alignment en README |

## 6. Emergent Tasks

| ID | Título | Tarea padre | Razón de descubrimiento | Necesidad | Impacto de scope | Impacto Tech Spec | Status | Evidencia |
| -- | ------ | ----------- | ----------------------- | --------- | ---------------- | ----------------- | ------ | --------- |
| — | Ninguna | — | — | — | — | — | — | — |

## 7. Evidence by Task

> Validación agregada en §10. Comandos globales corridos desde `backend/`:
> `npm run typecheck` → exit 0; `npm run lint` → exit 0; `npm test` → 613 passed / 0 failed /
> 83 skipped (pre-existentes); `npm run promptops:check` → 44 passed; `npm run build` → exit 0.

### TASK-PB-P0-010-US-121-PO-001 (Done)
- Verificado: `AIPromptVersion` en `backend/prisma/schema.prisma`; tipos compartidos `AIContext`/`LanguageCode`/`PromptVersionId` en `ports/ai-contract.ts`; `ai-features.ts` con features y `OUTPUT_SCHEMAS`. PB-P0-009 (US-117..120) `Done` en el índice.
- Confirmado: US-121 no invoca provider, no crea endpoints, no persiste `AIRecommendation`, no habilita edición dinámica. AC-01/AC-07. Deviations D1/D2 registradas.

### TASK-PB-P0-010-US-121-BE-001 (Done)
- Files created: `infrastructure/prompt-registry/prompt-template.ts`, `prompt-registry-errors.ts`.
- Files modified: `src/shared/domain/errors/error-codes.ts` (+6 codes PROMPT_*).
- Errores tipados extienden `AppError` con `code` estable + metadata segura. Typecheck Passed.

### TASK-PB-P0-010-US-121-DB-001 (Done)
- Mapping documentado `PromptTemplate → AIPromptVersion` (README §Divergencias). Sin migración (schema intacto). Deviations D1 (enum `active|deprecated`) y D2 (sin columnas feature/language; `prompt_key=<feature>.<lang>`; `id`/`prompt_id` uuidv5; `provider=mock`). AC-07.

### TASK-PB-P0-010-US-121-BE-002 / BE-003 (Done)
- Files created: `prompt-registry.ts` (`build()` valida fail-fast; `resolveActive`/`resolveSpecific`/`resolve`).
- Sin fallback silencioso. AC-01/AC-02/AC-03/AC-04/AC-05. Tests QA-001/002/003.

### TASK-PB-P0-010-US-121-BE-004 (Done)
- Files created: `prompt-hash.ts` (`computeTemplateHash`, `isTemplateHashValid`). Hash cubre contenido relevante, excluye status/metadata volátil. Drift → `PROMPT_HASH_DRIFT`. AC-05/AC-08. Test QA-004.

### TASK-PB-P0-010-US-121-AI-001 (Done)
- Files created: `prompts/mvp-prompts.prompt.ts` (10 templates), `prompts/index.ts`.
- 7 features MVP `active` en es-LATAM + `event_plan` en `en` + `event_plan` V1 `deprecated` + `vendor_bio` `draft`. Metadata completa + hashes reales (`npm run promptops:hash`). AC-01/AC-05.

### TASK-PB-P0-010-US-121-AI-002 (Done)
- Files created: `safety-constraints.ts` (`MVP_ACTIVE_SAFETY`, `SAFETY_INSTRUCTION_BLOCK`). Safety como estructura validable + texto JSON-only/HITL/boundary. AC-06. Test QA-006.

### TASK-PB-P0-010-US-121-AI-003 (Done)
- Files created: `mvp-feature-allowlist.ts`. `vendor_bio` clasificado Future/P4; `active` → `PROMPT_FUTURE_FEATURE_ACTIVE`. AC-09. Test QA-006.

### TASK-PB-P0-010-US-121-BE-005 / SEED-001 (Done)
- Files created: `aipromptversion-export.ts` (`exportAIPromptVersionMetadata`, uuidv5 determinístico). Patrón MVP registry-only export estático (Tech Spec §7). Excluye drafts. AC-07. Tests QA-005/SEED-002.

### TASK-PB-P0-010-US-121-SEED-002 (Done)
- Test `us121-aipromptversion-export.spec.ts`: determinismo (deep-equal), sin duplicados, mismatch detectable, missing-row detectable. AC-07.

### TASK-PB-P0-010-US-121-OBS-001 (Done)
- Files created: `prompt-registry-logger.ts` (`ai.prompt_registry.validation_failed`, sólo metadata segura; reusa logger shared con `redact()`). AC-03/AC-04/AC-06.

### TASK-PB-P0-010-US-121-SEC-001 (Done)
- Files created: `secret-pii-scan.ts` (patrones secret/PII; findings sin exponer el valor). Registry limpio. AC-06/AC-10. Test QA-006/SEC.

### TASK-PB-P0-010-US-121-SEC-002 (Done)
- Errores del registry transportan sólo `featureType/languageCode/promptKey/version/errorCode`. Tests verifican que meta no contiene contenido de prompt. AC-04/AC-06.

### TASK-PB-P0-010-US-121-SEC-003 (Done)
- Files created: `us121-prompt-registry-backend-only.guard.spec.ts` (no express/router/controller, no PrismaClient/upsert en el módulo). AC-01/AC-06.

### TASK-PB-P0-010-US-121-QA-001..006 (Done)
- Files created: `tests/unit/us121-prompt-registry-resolution.spec.ts`, `-duplicate-active.spec.ts`, `-unsupported.spec.ts`, `-metadata-hash.spec.ts`, `us121-aipromptversion-export.spec.ts`, `us121-prompt-safety.spec.ts`, `tests/helpers/prompt-fixtures.ts`. 44 tests Passed. AC-01..AC-10.

### TASK-PB-P0-010-US-121-OPS-001 (Done)
- Files modified: `backend/package.json` (`promptops:hash`, `promptops:check`), `.github/workflows/ci.yml` (step `npm run promptops:check` en job `schema-structural-tests`, tras `typecheck` + `test`). Sin red ni secrets. AC-03/AC-07/AC-08/AC-10.

### TASK-PB-P0-010-US-121-DOC-001 / DOC-002 (Done)
- Files created: `prompt-registry/README.md` (ciclo de vida, cuándo nueva versión, reviewers, resolución, relación `AIPromptVersion`/US-122, alignment documental DOC-002, divergencias D1/D2). AC-05/AC-07/AC-08.

## 8. Blockers

| Blocker ID | Tarea afectada | Tipo | Descripción | Detectado | Decisión requerida | Rol responsable | Estado |
| ---------- | -------------- | ---- | ----------- | --------- | ------------------ | --------------- | ------ |
| — | — | — | Ninguno | — | — | — | — |

## 9. Deviations

| # | Comportamiento planeado | Implementado/propuesto | Razón | Impacto | Convención afectada | Sección Tech Spec | ADR requerido | Resolución |
| - | ----------------------- | ---------------------- | ----- | ------- | ------------------- | ----------------- | ------------- | ---------- |
| D1 | Ciclo de vida `draft/reviewed/approved/active/deprecated/archived` en DB | Registry (TS) mantiene el ciclo completo; export a `AIPromptVersion` mapea a `active\|deprecated` (enum real) | Enum Prisma `AIPromptVersionStatus` sólo tiene `active\|deprecated`; no se rediseña schema (Tech Spec §10) | Bajo — sólo `active`/`deprecated` se persisten; estados intermedios viven en código | Ninguna | §10, §16 | No | Documentado en README + export; sin gap bloqueante |
| D2 | `AIPromptVersion` con columnas `feature_type`/`language` | Modelo real sólo tiene `promptKey/version/provider/templateChecksum`; identidad codificada en `promptKey=<feature>.<lang>` | Schema real más delgado que la spec | Bajo — identidad determinística preservada | Ninguna | §10, §16 | No | Mapping documentado (README + DB-001) |

## 10. Final Validation

- Task completion: 25/25 Done (0 In Progress, 0 Blocked, 0 Rework Required, 0 Skipped)
- Acceptance Criteria coverage: 10/10 (AC-01..AC-10) cubiertos con evidencia (ver §5 mapeo + tests)
- Lint: `npm run lint` → **Passed** (exit 0)
- Typecheck: `npm run typecheck` (tsc --noEmit) → **Passed** (exit 0)
- Tests: `npm test` → **Passed** — 613 passed / 0 failed / 83 skipped / 2 todo (698). US-121: 44/44 passed (`npm run promptops:check`)
- Build: `npm run build` (tsc -p tsconfig.build.json) → **Passed** (exit 0)
- Migrations: **Not Applicable** — US-121 no modifica el schema Prisma (export estático registry-only; mapping documentado, ver D1/D2)
- Seed: **Not Applicable** (patrón MVP = export determinístico, no seed persistido; idempotencia cubierta por test SEED-002)
- Authorization: **Not Applicable** — infra backend-only sin endpoints ni acción de usuario (SEC-01/SEC-03; guard SEC-003)
- Security: **Passed** — escáner secret/PII sin findings sobre templates; errores/logs con sólo metadata segura; no secrets en prompts
- Accessibility: **Not Applicable** — sin UI
- i18n: **Passed** — registry resuelve por `LanguageCode` aprobado; demo multi-idioma (es-LATAM + en)
- Documentation: **Passed** — `prompt-registry/README.md` (versionado + alignment DOC-002)
- `check:structure`: **Not Applicable a US-121** — el script `check:structure` espera 80 dirs de capa (US-090) pero el repo ya tiene 88 en HEAD (capas `dto`/`ports` añadidas por US-097/US-117). Los archivos de US-121 son depth-3 bajo `infrastructure/prompt-registry/` y NO alteran el conteo depth-2; no está en CI. Falla pre-existente ajena a esta historia.
- Unresolved debt: Ninguna material. Deuda menor documentada: (a) provider en export fijado a `mock` por columna requerida no propiedad del registry (US-122 asignará el real); (b) `input schema` formal aún no existe como artefacto (se usa ref estable), consistente con Tech Spec §11.
- Final status: **Done**

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-09T19:58:10Z | Initialized | Execution record creado |
| 2026-07-09T19:58:10Z | Readiness | READY_WITH_WARNINGS (W1, W2) |
| 2026-07-09T19:58:10Z | Alignment | ALIGNED_WITH_NOTES (D1, D2) |
| 2026-07-09T20:12:00Z | Implementación | 25 tareas Not Started → Done; módulo `prompt-registry` + 7 specs (44 tests) |
| 2026-07-09T20:12:00Z | Validación | typecheck/lint/test/build Passed; promptops:check 44/44 |
| 2026-07-09T20:12:00Z | Done | User Story US-121 completada (Execution Record Status → Done) |
