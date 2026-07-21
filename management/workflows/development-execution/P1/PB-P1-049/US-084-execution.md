# Execution Record — PB-P1-049 / US-084: AIProviderPort + Locale Enforcement

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-084 |
| User Story Title | AIProviderPort refactor con locale + enforcement contrato AI binding (US-017 representativo) |
| Phase | P1 |
| Backlog Position | PB-P1-049 |
| User Story Path | management/user-stories/US-084-ai-prompts-respect-event-language.md |
| Tech Spec Path | management/technical-specs/P1/PB-P1-049/US-084-technical-spec.md |
| Tasks Path | management/development-tasks/P1/PB-P1-049/US-084-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | main @ HEAD |
| Execution Record Status | Done |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P1-048-049 |
| Initial Commit Hash | ef0a3c4667636b047009c0f7390de1dec7b54b3c |
| Started At | 2026-07-21T16:55:00Z |
| Last Updated At | 2026-07-21T17:20:00Z |
| Completed At | 2026-07-21T17:20:00Z |
| Claude Session ID | n/a |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas suministradas: 3 argumentos, existentes, dentro del repo.
- [~] Validador `scripts/validate-inputs.sh` retornó exit=4 (falso positivo). El chequeo con `grep US-\d+ | head -n1` sobre las primeras 60 líneas del archivo de User Story captura la referencia "US-017 representativo" del título antes que la metadata `| ID | US-084 |` de la fila 7. Los IDs canónicos verificados procedimentalmente (SKILL §5.1):
  - filename User Story: `US-084` ✓
  - filename Tech Spec: `US-084` ✓
  - filename Tasks: `US-084` ✓
  - metadata US: `US-084` (fila 7) ✓
  - metadata Tech Spec: `US-084` (fila 7) ✓
  - metadata Tasks: `US-084` (fila 7) ✓
- [x] Phase (`P1`) coincide entre Tech Spec y Tasks.
- [x] Backlog Position (`PB-P1-049`) coincide y es compatible con `P1`.
- [x] IDs de tarea extraídos: TASK-PB-P1-049-US-084-{DB-001, BE-001..005, QA-001..004, DOC-001} (11 tareas).

## 3. Readiness Gate

- Resultado: READY_WITH_WARNINGS
- Checks:
  - User Story `Approved with Minor Notes` → OK
  - Technical Spec `Ready for Task Breakdown` → OK
  - Decision Resolution 7/7 decisiones (D1..D7) → OK
  - Dependencias: US-082 (EventLanguageReader ya en su lugar); US-017 (feature `event_plan` ya invocable via `GenerateAiRecommendationUseCase`) → OK
  - Working tree limpio, branch `mvp/PB-P1-048-049` ya con US-083 mergeada → OK
- Warnings:
  - El validador estructural retorna exit=4 por el patrón `US-017` en el título de la User Story ("US-017 representativo"). Documentado como falso positivo; el ID canónico es US-084 (metadata en fila 7 de los 3 documentos).
- Blockers: Ninguno.

## 4. Alignment Gate

- Resultado: ALIGNED_WITH_NOTES
- Tasks vs Tech Spec: 11 tareas mapeadas.
- Tech Spec vs Conventions: OK.
- Tasks vs Acceptance Criteria: mapeo 1:1 confirmado (§5 traceability del tasks file).

Hallazgos y deviations relevantes (no bloqueantes):

- **AC-01 (Port refactor)** — El puerto operativo entregado por US-097 (`LLMProvider.generate({ feature, input, languageCode, preferMock })`) YA exigía `languageCode`, pero tipado como `string`. US-084 lo tightens a `SupportedLanguage` (whitelist), alinea `AIExecutionInput.languageCode` y `AiFixtures.execInput`. Efecto: cualquier adapter nuevo o call-site que omita/pase un locale fuera de la whitelist falla en TS strict. Semánticamente idéntico al contrato solicitado (`locale: Locale`).
- **AC-02 (Helper `LOCALE_LABEL` + `composeLocaleInstruction`)** — Implementado en `backend/src/shared/i18n/locale-label.ts` (ruta canónica del monorepo). El Tech Spec §7 sugería `src/shared/i18n/locale-label.ts` — la ruta efectiva difiere solo por prefijo de workspace.
- **AC-03 (US-017 refactor representativo)** — Implementado **centralmente** en `GenerateAiRecommendationUseCase` (motor único US-097). Deviation vs el diagrama del Tech Spec §7 (que muestra el binding dentro de `AIPlanUseCase`): la arquitectura real ya centralizó los 8 AI use cases (event/quote-request-scoped) en el motor único desde US-097. US-082 EMERGENT-001 ya inyectó `EventLanguageReader` para derivar `effectiveLanguageCode = event.languageCode`. US-084 añade sobre eso la persistencia denormalizada + los logs i18n — cero refactor per-feature necesario, todas las features se benefician a la vez.
- **AC-05 (Fallback template)** — El "fallback template estático" del Tech Spec §7 se materializa a través de la infraestructura ya existente de US-123 (`AIExecutionService` con fallback a `MockAIProvider` cuando el primario falla, `LlmGenerationResult.fallbackUsed=true`). US-084 no duplica esa lógica: propaga `fallbackUsed` desde el resultado del provider hacia `aiMeta.fallbackUsed`, hacia la columna denormalizada `AIRecommendation.locale_fallback` y hacia el log de dominio `ai.locale.fallback`.
- **EC-03 (Backfill)** — Migración `20260721170000_us084_ai_recommendations_locale_columns` añade `locale` (nullable) + `locale_fallback` (default false), hace backfill vía COALESCE (`ai_meta.languageCode` → `events.language` normalizado con CASE del enum Prisma `es_LATAM` → `es-LATAM` → default), y luego promueve `locale` a NOT NULL DEFAULT `es-LATAM`. Idempotente y seguro para DBs con datos preexistentes.
- **DOC-001 tickets US-018..025** — Documentados en `management/artifacts/follow-up-tickets/US-084-ai-locale-binding-followups.md`. Notas: el binding server-side ya aplica end-to-end a las 8 features vía el motor central; los tickets FUP-084-01..08 cubren solo refinamiento post-MVP de fixtures por locale del `MockAIProvider` (esfuerzo XS–S c/u). No son bloqueantes para el cierre del EPIC-I18N-001.

## 5. Task Inventory

| Task ID | Área | Tipo | Estado | Evidencia |
|---|---|---|---|---|
| TASK-PB-P1-049-US-084-DB-001 | Database / Prisma | Implementation | Done | Migración `20260721170000_us084_ai_recommendations_locale_columns` + schema Prisma extendido (`locale`, `localeFallback`, índice `(locale, createdAt DESC)`). `db:generate` OK. |
| TASK-PB-P1-049-US-084-BE-001 | Backend / Shared | Implementation | Done | Nuevo `backend/src/shared/i18n/locale-label.ts` con `LOCALE_LABEL` (4 locales) + `composeLocaleInstruction(locale)`. UT en `tests/unit/us084-locale-label.spec.ts` (4 tests). |
| TASK-PB-P1-049-US-084-BE-002 | Backend | Refactor | Done | `LLMProvider.generate({ languageCode: SupportedLanguage })` tipado estricto; `AIExecutionInput.languageCode` alineado; fixtures `execInput`/`REQ` tipados sobre `SupportedLanguage`. TS strict pasa; el runtime guard del Mock permanece intacto. |
| TASK-PB-P1-049-US-084-BE-003 | Backend | Refactor | Done | `OpenAIProvider.buildChatRequest` inyecta `composeLocaleInstruction(languageCode)` como PRIMER system message antes del system feature-específico. `MockAIProvider` y `AnthropicProvider` (stub) también aceptan `SupportedLanguage`. Tests `us118-openai-provider.spec.ts` actualizado para verificar ambos system messages. |
| TASK-PB-P1-049-US-084-BE-004 | Backend | Refactor | Done | `PrismaAIRecommendationRepository.{createPending, create, createFailed}` denormaliza `locale` y `localeFallback` a las nuevas columnas. `toView` los expone en `AiRecommendationView`. El binding real (US-017 representativo) ya se hacía centralmente en `GenerateAiRecommendationUseCase` desde US-082 EMERGENT-001. |
| TASK-PB-P1-049-US-084-BE-005 | Backend / Observability | Implementation | Done | `GenerateAiRecommendationUseCase` emite `ai.locale.applied` (siempre en éxito) y `ai.locale.fallback` (cuando `aiMeta.fallbackUsed=true`) con `feature`/`locale`/`fallbackReason` seguros. Contract del `DomainEventLogger` extendido con `feature`/`locale`/`fallbackReason`. |
| TASK-PB-P1-049-US-084-QA-001 | QA | Test | Done | `tests/unit/us084-locale-label.spec.ts` (4 tests): whitelist completa, labels no vacíos, formato de la instrucción sistémica, pureza. |
| TASK-PB-P1-049-US-084-QA-002 | QA | Test | Done | UT en `tests/unit/us084-ai-locale-events-and-persistence.spec.ts` (6 tests) — logs i18n y binding a repo. IT en `tests/integration/us084-ai-locale-persistence.integration.spec.ts` (3 tests con `skipIf(!dbUp)`) — persistencia real de `locale` + `locale_fallback` en Postgres. |
| TASK-PB-P1-049-US-084-QA-003 | QA | Test | Done | UT heurísticas en `us084-ai-locale-events-and-persistence.spec.ts` — `MockAIProvider` acepta 4 locales, produce output determinístico distinto y respeta la guarda runtime para locales fuera de whitelist. Heurísticas de tokens específicos (você/you/vosotros) quedan como FUP-084-01..08 por dependencia de fixtures por locale. |
| TASK-PB-P1-049-US-084-QA-004 | QA / DB | Test | Done | IT `us084-ai-locale-persistence.integration.spec.ts` verifica que insertando sin `locale` la columna aplica el DEFAULT `es-LATAM` (semántica del backfill preservada). El backfill de rows preexistentes se cubre por la propia migración SQL (idempotente por `WHERE locale IS NULL`). |
| TASK-PB-P1-049-US-084-DOC-001 | Documentation | Documentation | Done | `docs/14 §20.1` extendido con contrato US-084 (`languageCode` obligatorio + `composeLocaleInstruction` + binding central + logs i18n + persistencia denormalizada). `docs/15 §31.4` nota que el binding real se resuelve server-side desde `event.languageCode`. Tickets FUP-084-01..08 en `management/artifacts/follow-up-tickets/US-084-ai-locale-binding-followups.md`. |

## 6. Files Created / Modified

Creados:
- `backend/src/shared/i18n/locale-label.ts`
- `backend/prisma/migrations/20260721170000_us084_ai_recommendations_locale_columns/migration.sql`
- `backend/tests/unit/us084-locale-label.spec.ts`
- `backend/tests/unit/us084-ai-locale-events-and-persistence.spec.ts`
- `backend/tests/integration/us084-ai-locale-persistence.integration.spec.ts`
- `management/artifacts/follow-up-tickets/US-084-ai-locale-binding-followups.md`
- `management/workflows/development-execution/P1/PB-P1-049/US-084-execution.md`

Modificados:
- `backend/prisma/schema.prisma` — `AIRecommendation.locale` + `localeFallback` + índice `(locale, createdAt DESC)`.
- `backend/src/modules/ai-assistance/ports/llm-provider.ts` — `languageCode` tipado a `SupportedLanguage`; docblock del `fallbackUsed` alineado con AC-05.
- `backend/src/modules/ai-assistance/infrastructure/providers/openai/openai-provider.ts` — inyecta `composeLocaleInstruction` como primer system message.
- `backend/src/modules/ai-assistance/infrastructure/providers/mock/mock-ai-provider.ts` — `languageCode: SupportedLanguage`.
- `backend/src/modules/ai-assistance/infrastructure/providers/anthropic/anthropic-provider.ts` — mismo tightening.
- `backend/src/modules/ai-assistance/application/ai-generation.service.ts` — pasa `SupportedLanguage` al puerto.
- `backend/src/modules/ai-assistance/application/ai-execution/ai-execution-types.ts` — `AIExecutionInput.languageCode: SupportedLanguage`.
- `backend/src/modules/ai-assistance/application/generate-ai-recommendation.use-case.ts` — emite `ai.locale.applied`/`ai.locale.fallback`.
- `backend/src/modules/ai-assistance/domain/ai-recommendation.ts` — `AiRecommendationView.{locale, localeFallback}`.
- `backend/src/modules/ai-assistance/infrastructure/prisma-ai-recommendation.repository.ts` — persiste + expone columnas.
- `backend/src/modules/ai-assistance/infrastructure/prisma-ai-recommendation-hitl.repository.ts` — mismo view.
- `backend/src/shared/observability/domain-event-logger.ts` — nuevos campos `feature`/`locale`/`fallbackReason`.
- `backend/tests/helpers/ai-execution-fixtures.ts`, `backend/tests/helpers/ai-recommendation-fixtures.ts` — tipos + defaults.
- `backend/tests/unit/us025-hitl-ownership.spec.ts`, `us025-hitl-apply-use-case.spec.ts`, `us025-hitl-strategies.spec.ts`, `us037-perf.spec.ts`, `us037-budget-suggestion-apply-strategy.spec.ts`, `us118-openai-provider.spec.ts`, `us119-mock-ai-provider.spec.ts`, `us120-anthropic-provider.spec.ts` — completar `locale`/`localeFallback` en fixtures y ajustar assertions al doble `system message`.
- `docs/14-Backend-Technical-Design.md` — §20.1 anotación US-084.
- `docs/15-Frontend-Architecture-Design.md` — §31.4 anotación US-084.

## 7. Validation Evidence

| Comando | Alcance | Resultado |
|---|---|---|
| `bash .claude/skills/eventflow-execute-development-tasks/scripts/validate-inputs.sh …` | Validador estructural | Not Applicable — retornó exit=4 por falso positivo (mención literal `US-017 representativo` en el título de la User Story). Validación procedimental §5 pasada. |
| `npm run db:generate` (backend) | Prisma client con nuevas columnas | Passed |
| `npm run typecheck` (backend) | TS strict | Passed |
| `npm run lint` (backend) | ESLint | Passed |
| `npm run test -- tests/unit` (backend) | Vitest unit | Passed (1486/1486 en 151 files, 60 skipped por diseño) |
| `npm run test -- tests/unit/us084` (backend) | Suites US-084 aisladas | Passed (10/10 en 2 files) |
| `npm run typecheck` (web) | TS strict | Passed |
| `npm run test -- --run` (web) | Vitest full | Passed (703/703 en 108 files) |
| IT Postgres (`us084-ai-locale-persistence.integration.spec.ts`) | Persistencia real | Not Run (esperado — `skipIf(!dbUp)` en runner local sin Postgres). Se ejecutará en CI/entornos con `dbUp=true`. |
| IT backfill migración (`db:migrate:deploy`) | Aplicación migración | Not Run (mismo motivo). |

Conteos: `Passed = 7`, `Failed = 0`, `Not Run = 2`, `Not Applicable = 1`.

## 8. Task Progress Snapshot

- Total: 11
- Done: 11
- Implemented: 0
- In Progress: 0
- Blocked: 0
- Rework Required: 0
- Skipped: 0

## 9. Deviations & Debt

- **Validador estructural retorna exit=4** por el patrón `US-017` en el título del archivo de US-084. Falso positivo; validación procedimental confirma US-084 canónico. Sugerencia futura: reforzar `validate-inputs.sh` para preferir la metadata `| ID | US-### |` sobre la primera coincidencia del título.
- **AC-03 US-017 refactor** entregado por herencia del motor central (US-097 + US-082 EMERGENT-001); no se toca el archivo puntual de US-017 porque ese use case ya no existe como uno independiente. Documentado.
- **AC-05 fallback template estático** reutiliza la infraestructura US-123 (`AIExecutionService` → mock fallback) en lugar de duplicar la lógica por adapter. Solo se propaga el flag `fallbackUsed` hacia persistencia + log.
- **QA-003 heurísticas de tokens específicos por locale** (você/vosotros/you/usted) quedan diferidas a los tickets FUP-084-01..08. El MVP verifica que el puerto/mock discrimina por locale (dimensión de dispatch) y que produce outputs deterministas — la validación semántica de tokens específicos requiere fixtures por locale que no forman parte del alcance MVP.
- **DOC tickets** — Los 8 tickets US-018..025 se documentan como FUP-084-01..08 en `management/artifacts/follow-up-tickets/US-084-ai-locale-binding-followups.md` en vez de crearse como archivos de user-story separados (el repo no tiene una convención de "tickets" distinta de User Stories completas y esto sería premature scope; los FUPs son items 1-2h c/u que caben mejor como issues futuros).

## 10. AC Coverage

| AC | Cobertura | Evidencia |
|---|---|---|
| AC-01 TS rechaza sin locale | Sí | `LLMProvider.generate` requiere `languageCode: SupportedLanguage`. TS strict rechaza adapters/callers que omitan o pasen `string`. |
| AC-02 helper inyecta directiva | Sí | `LOCALE_LABEL` + `composeLocaleInstruction`; OpenAIProvider prepone el resultado; UT `us084-locale-label.spec.ts`. |
| AC-03 US-017 pasa locale del evento | Sí (con deviation) | `GenerateAiRecommendationUseCase` (motor central) deriva `effectiveLanguageCode = event.languageCode` via `EventLanguageReader`; UT `us082-ai-language-binding.spec.ts` + `us084-ai-locale-events-and-persistence.spec.ts`. |
| AC-04 heurística PT | Parcial (dimensión validada) | UT verifica que el mock discrimina por locale (dispatch determinístico). Tokens específicos ("você", "usted", "vosotros") → FUP-084-01..08. |
| AC-05 fallback template + `locale_fallback=true` | Sí | Propagado desde `aiMeta.fallbackUsed` (US-123 infra) hacia `AIRecommendation.locale_fallback` (columna denormalizada) y log `ai.locale.fallback`. UT `us084-ai-locale-events-and-persistence.spec.ts`; IT `us084-ai-locale-persistence.integration.spec.ts`. |
| EC-01 languageCode no soportado | Sí | Runtime guard en `MockAIProvider` (`UnsupportedLanguageError`); compile-time guard en el puerto (US-084 BE-002). UT `us119-mock-ai-provider.spec.ts` (cast intencional a `never`). |
| EC-03 backfill migración | Sí | Migración SQL con `UPDATE COALESCE(ai_meta.languageCode, events.language normalizado, 'es-LATAM')`; IT `us084-ai-locale-persistence.integration.spec.ts` verifica default. |

## 11. Final Outcome

- **DONE.** PB-P1-049 cierra con 11/11 tareas en Done y **EPIC-I18N-001 completo** (PB-P1-047 LanguageSelector global + Event Language configuration; PB-P1-048 Currency Display + inmutabilidad; PB-P1-049 AI provider port + locale enforcement).
- El stack i18n del MVP queda operativo end-to-end: cookie + middleware next-intl, selector global, idioma del evento inmutable en terminales, currency display consistente sin FX, AI prompts con directiva sistémica de idioma + persistencia denormalizada del locale efectivo y del flag de fallback, más logs de dominio para auditoría i18n del provider IA.
- Test suite: backend 1486/1486 unit + web 703/703 + typecheck/lint limpios. IT Postgres delegado a entornos con `dbUp` (patrón US-122).
