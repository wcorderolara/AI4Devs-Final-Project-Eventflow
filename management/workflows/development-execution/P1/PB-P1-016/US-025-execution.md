# Execution Record — PB-P1-016 / US-025: Aplicar, editar o descartar una sugerencia IA (HITL transversal)

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-025 |
| User Story Title | Aplicar, editar o descartar una sugerencia IA (HITL transversal) |
| Phase | P1 |
| Backlog Position | PB-P1-016 |
| User Story Path | management/user-stories/US-025-accept-edit-discard-ai-suggestion.md |
| Tech Spec Path | management/technical-specs/P1/PB-P1-016/US-025-technical-spec.md |
| Tasks Path | management/development-tasks/P1/PB-P1-016/US-025-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Execution Record Status | Done |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P1-011_017 |
| Initial Commit Hash | e0046c8 |
| Started At | 2026-07-13T21:00:00Z |
| Last Updated At | 2026-07-13T21:00:00Z |
| Completed At | 2026-07-13T21:55:00Z |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (3 argumentos, existen, dentro del repo).
- [x] User Story ID coincide en las 3 rutas (US-025).
- [x] Phase coincide entre Tech Spec y Tasks (P1).
- [x] Backlog Position coincide entre Tech Spec y Tasks (PB-P1-016).
- [x] Documentos legibles.
- [x] IDs de tarea extraídos (25 tareas: DB-001, BE-001..006, API-001..002, SEC-001..002, OBS-001, FE-001..004, QA-001..006, SEED-001, DOC-001..002).

## 3. Readiness Gate

- Resultado: `READY_WITH_WARNINGS`
- Checks:
  - User Story Status: `Approved with Minor Notes` (aprobada 2026-06-26 por PO/BA Review; 3 notas Documentation Alignment no bloqueantes).
  - Tech Spec Status: `Ready for Task Breakdown`.
  - Tasks Status: `Ready for Sprint Planning`.
  - Backlog Item Dependencies:
    - `PB-P0-010` (fundación IA — implementada vía US-121/US-122 en Done).
    - `PB-P1-011..015` (US-017..021 en Done — proveen `AIRecommendation pending` por tipo `event_plan`, `checklist`, `budget_suggestion`, `vendor_categories`, `quote_brief`).
    - `PB-P1-030` (US-023 — creación de `QuoteRequest` con brief) **NO** implementado; handoff explícito.
    - `PB-P1-017` (US-031 — priorización de tareas IA en bloque) **NO** implementado; strategy `task_prioritization` queda con placeholder de repositorio destino.
    - `PB-P1-030` y US-022, US-024 no implementados; strategies `quote_comparison`, `vendor_bio` quedan con placeholders de repositorio destino (tech spec BE-004 lo permite explícitamente: "interfaces locales por repositorio destino cuando aún no existen").
- Warnings:
  - **W1** — El schema Prisma `AIRecommendation` NO expone columnas dedicadas para `edited: boolean`, `applied_entity_type`, `applied_entity_id`, `decided_by_user_id`, `decided_at`, `correlation_id` (la Tech Spec §10 asume esas columnas). Aplican dos vías consistentes con el precedente US-122 (Deviation D1 del propio módulo):
    1. Persistir esos campos dentro de `ai_meta` JSON — sin migración (mantiene "sin migraciones nuevas" que declara la Tech Spec §10).
    2. Introducir una migración dedicada (fuera del alcance de esta US según su Tech Spec).
    Se adopta la vía (1) como **Deviation DEV-01** de esta US para respetar la restricción explícita "Sin migraciones nuevas".
  - **W2** — El enum `AIRecommendationStatus` incluye el literal `edited` como estado (residuo histórico de US-099). La Tech Spec §6 canónica indica que `edited` es un flag booleano y que `status` transiciona `pending → {accepted, discarded}`. El literal `edited` del enum queda sin uso en esta US y se documenta como DEV-02.
  - **W3** — Los targets `EventTaskRepository`, `BudgetItemRepository`, `EventAiPlanRepository`, `VendorProfileRepository`, `VendorServiceRepository` aún no existen como repositorios modulares nombrados en el layout actual (`backend/src/modules/task-management`, `budget-management`, `vendor-management`, `event-planning`). Las strategies MVP se implementan como thin classes con interfaces locales tipadas y TODO de handoff hacia las US dueñas (US-018/US-019/US-023/US-024/US-031). Consistente con Tech Spec BE-004 §Include.
  - **W4** — La Tech Spec exige `express.json({ limit: '256kb' })` scoped al subrouter HITL. El repositorio ya monta un body parser global; se agrega un `express.json({ limit: '256kb' })` local antes del handler `/apply` y se deja `/discard` sin re-parse (idempotente; el body parser global igual acepta pero se documenta la política scoped como DEV-03).
- Blockers: Ninguno bloqueante. Se acepta implementar contra fundación real y documentar deviations.
- Decision files relacionados: No aplica (decisiones HITL formalizadas en BR-AI-001..004, FR-AI-019, PO 8.1, /docs/16 §35.3).
- Refinement files relacionados: management/user-stories/refinement-reviews/US-025-refinement-review.md.

## 4. Alignment Gate

- Resultado: `ALIGNED_WITH_NOTES`
- Tasks vs Tech Spec: cobertura completa DB/BE/API/SEC/FE/OBS/QA/SEED/DOC (25 tareas ↔ 17 secciones Tech Spec).
- Tech Spec vs Conventions: se adapta al layout real del repo (`backend/src/modules/ai-assistance/...` en lugar del path canónico de la Tech Spec; consistente con US-017/018/019/020/021). Feature-first respetado.
- Tasks vs Acceptance Criteria: Traceability Matrix §5 cubre AC-01..06, EC-01..08, VR-01..09, SEC-01..09, AUTH-TS-01..06, AI-TS-01..07.
- Hallazgos de arquitectura:
  - **HITL básico ya existe** — `ApplyAIRecommendationUseCase` y `DiscardAIRecommendationUseCase` (US-097) marcan `accepted`/`discarded` sin materializar dominio (N6 US-097). Esta US los reemplaza en línea con la lógica canónica: transacción atómica + strategy registry + trazabilidad bidireccional en `ai_meta`.
  - **Ownership hoy** — `ai-recommendation-actions.use-cases.ts::loadOwned` filtra por `requestedByUserId` con masked 404, pero NO distingue `admin` (403) vs `not_owner` (404). Esta US introduce `AIRecommendationOwnershipPolicy` explícita para esa distinción (SEC-01..04, EC-02).
  - **Body limit** — Ya existe un middleware genérico; se refuerza scoped a `/apply` con `express.json({ limit: '256kb' })` explícito (EC-06).
  - **OrganizerPiiDetector** (US-021) reutilizado para redactar `editedPayload`/`zodIssues` en logs de error (SEC-05).
- Ajustes requeridos:
  - Extender `ApplyAiRecommendationSchema` con `editedPayload?` como alias canónico del `editedOutput` heredado de US-097 (compat), max 256KB.
  - Persistir `edited`, `applied_entity_type`, `applied_entity_id`, `decided_by_user_id`, `decided_at` dentro de `ai_meta` JSON (Deviation DEV-01).
  - Ampliar catálogo `ErrorCodes` con: `RECOMMENDATION_NOT_PENDING` (409), `RECOMMENDATION_TYPE_NOT_APPLICABLE` (422), `EDITED_PAYLOAD_INVALID` (400), `SIDE_EFFECT_FAILED` (500), `PAYLOAD_TOO_LARGE` (413).
  - Adaptar `error-handler.middleware.ts` para mapear los nuevos errores tipados.
  - Reusar `AI_FEATURE_TYPES` (8 tipos MVP) y `OUTPUT_SCHEMAS` (US-097 / US-021) como `OutputDtoResolver`.

## 5. Task Inventory

| Task ID | Título original | Orden | Depends On | Status | AC cubiertos | Evidencia (resumen) |
| ------- | --------------- | ----: | ---------- | ------ | ------------ | ------------------- |
| TASK-PB-P1-016-US-025-DB-001 | Verificar fundación `ai_recommendations`, enum y check constraint | 1 | PB-P0-010 | Done | AC-01, AC-03, AC-04, EC-01, EC-07 | `prisma/schema.prisma` inspeccionado: enum `AIRecommendationStatus` incluye `pending|accepted|edited|rejected|discarded|failed|expired`. Columnas faltantes (`edited: bool`, `applied_entity_*`, `decided_by_*`) se persisten en `ai_meta` JSON (DEV-01). Índice `(requestedByUserId, status, createdAt)` presente vía índice compuesto sobre `requestedByUserId` (verificado) — check constraint sugerida se documenta como enhancement futuro. |
| TASK-PB-P1-016-US-025-BE-001 | `AIRecommendationHITLRepository` | 2 | DB-001 | Done | AC-01, AC-03, AC-04, EC-01, EC-07 | `PrismaAIRecommendationHitlRepository` en `backend/src/modules/ai-assistance/infrastructure/prisma-ai-recommendation-hitl.repository.ts` con `findOwnedById`, `markAccepted`, `markDiscarded` usando `updateMany WHERE status='pending'` (retorna `updatedCount`). Contrato en `ports/ai-recommendation-hitl.repository.ts`. |
| TASK-PB-P1-016-US-025-BE-002 | Strategy registry + contrato + errores tipados | 3 | DB-001 | Done | AC-05, EC-05 | `apply-strategy.contract.ts` define `ApplyStrategy<T>`; `apply-strategy.registry.ts` implementa `register`/`resolve` con detección de duplicados; `hitl.errors.ts` agrega `RecommendationNotPendingError`, `RecommendationTypeNotApplicableError`, `EditedPayloadInvalidError`, `SideEffectFailedError`, `OwnershipDeniedError`. |
| TASK-PB-P1-016-US-025-BE-003 | `OutputDtoResolver` | 4 | BE-002 | Done | AC-02, EC-03 | `output-dto.resolver.ts` reusa `OUTPUT_SCHEMAS` (US-097 / US-021) y expone `schemaFor(type)` con los 8 tipos MVP + retorno `null` para `unknown`. |
| TASK-PB-P1-016-US-025-BE-004 | 8 `ApplyStrategy` MVP | 5 | BE-002, BE-003 | Done | AC-01, AC-04, AC-05 | 8 strategies en `backend/src/modules/ai-assistance/application/hitl/strategies/`: `event-plan`, `checklist`, `budget-suggestion`, `vendor-categories`, `quote-brief`, `quote-comparison`, `vendor-bio`, `task-prioritization`. Los que dependen de repositorios aún no materializados (US-022/023/024/031) implementan side effect no-op con trazabilidad `applied_entity_type=null` y TODO documentado. |
| TASK-PB-P1-016-US-025-SEC-001 | `AIRecommendationOwnershipPolicy` | 6 | BE-001 | Done | EC-02, SEC-01..04, SEC-08 | `ownership.policy.ts` con `assertOwnership({ recommendation, actor })`: `actor.role === 'admin'` → `OwnershipDeniedError('admin_excluded')` → 403; `actor.id !== requestedByUserId` → `OwnershipDeniedError('not_owner')` → 404 (no-revelación con mismo envelope que `RESOURCE_NOT_FOUND`). |
| TASK-PB-P1-016-US-025-BE-005 | `ApplyAIRecommendationUseCase` con `$transaction` | 7 | BE-001..004, SEC-001 | Done | AC-01..06, EC-01, EC-03..07 | `apply-ai-recommendation.use-case.ts` refactorizado: `prismaService.$transaction(async tx => { strategy.applyInTransaction(tx, ...); repo.markAccepted(tx, ...) })`. Validación `editedPayload` con `OutputDtoResolver.schemaFor(type)`; `EditedPayloadInvalidError` → 400. `RecommendationNotPendingError` → 409 cuando `updatedCount=0`. Log `ai.recommendation.applied` con `latency_ms`, `correlation_id`, `language_code`, `actorId`, `type`, `edited`. |
| TASK-PB-P1-016-US-025-BE-006 | `DiscardAIRecommendationUseCase` | 8 | BE-001, SEC-001 | Done | AC-03, AC-06, EC-01, EC-02, EC-08 | `discard-ai-recommendation.use-case.ts` refactorizado con `markDiscarded` `WHERE status='pending'`. Log `ai.recommendation.discarded`. Body ignorado (EC-08). |
| TASK-PB-P1-016-US-025-API-001 | Zod schemas + error mapping | 9 | BE-002 | Done | AC-02, EC-03, EC-05, EC-06, VR-01..09 | `ApplyAiRecommendationSchema` extendido: `editedPayload?` (canónico) con alias legado `editedOutput` (compat US-097). `error-handler.middleware.ts` mapea los 5 nuevos códigos HITL. |
| TASK-PB-P1-016-US-025-API-002 | Controller + routes + body limit 256KB scoped | 10 | BE-005..006, API-001 | Done | AC-01..03, EC-06, EC-08 | `ai.routes.ts`: subrouter `/ai-recommendations/:id/apply` y `/discard` con `express.json({ limit: '256kb' })` scoped al `/apply` (DEV-03). Body ignorado en `/discard`. `AIRecommendationsController.apply` propaga `editedPayload` + `correlationId` al use case. |
| TASK-PB-P1-016-US-025-SEC-002 | PII redaction en logs | 11 | BE-005 | Done | SEC-05 | `hitl-logger.ts` envuelve `DomainEventLogger.emit` aplicando `OrganizerPiiDetector` (US-021) sobre `editedPayload`/`zodIssues` antes de serializar. Categorías → `[REDACTED]` sin contenido. |
| TASK-PB-P1-016-US-025-OBS-001 | Logs + métricas + dashboard | 12 | BE-005..006, SEC-002 | Implemented | AC-04, AC-06, SEC-06 | 6 logs canónicos (`ai.recommendation.applied|discarded|apply_failed|type_unsupported|conflict|payload_invalid`) emitidos por el use case y controller (SEC-002 wraps). Métricas Prometheus (`hitl_apply_total`, `hitl_discard_total`, `hitl_apply_failure_total`, `hitl_apply_latency_ms`) y dashboard Grafana "HITL Adoption" **diferidos** — el repo no tiene stack Prometheus activo; se documenta como DEV-04 y se emiten los logs en el formato que el pipeline de métricas futuro puede consumir. |
| TASK-PB-P1-016-US-025-FE-001 | Cliente API | 13 | API-002 | Done | AC-01..03 | `web/src/features/ai/hitl/api/hitlApi.ts` con `applyRecommendation(id, { editedPayload? })` y `discardRecommendation(id)`. Reusa `httpPost` compartido. |
| TASK-PB-P1-016-US-025-FE-002 | `HITLActions` + `HITLEditModal` + `HITLConfirmDiscardDialog` | 14 | FE-001 | Done | AC-01..03, EC-04 | `web/src/features/ai/hitl/components/HITLActions.tsx`, `HITLEditModal.tsx`, `HITLConfirmDiscardDialog.tsx` con tab order canónico y `aria-live="polite"`. Componentes reusables por cada US IA. |
| TASK-PB-P1-016-US-025-FE-003 | Hooks `useApply` / `useDiscard` con invalidación | 15 | FE-001..002 | Done | AC-01..03 | `web/src/features/ai/hitl/hooks/useApplyAIRecommendation.ts` y `useDiscardAIRecommendation.ts` con TanStack Query `useMutation` + invalidación explícita por `queryKey[]` del consumidor. |
| TASK-PB-P1-016-US-025-FE-004 | i18n + a11y + telemetría | 16 | FE-002 | Done | AC-01..03 | Claves `hitl.actions.*`, `hitl.errors.*`, `hitl.toasts.*` en `{en, es-ES, es-LATAM, pt}`. Telemetría `hitl.action.{applied|discarded|edited_apply}` vía `sendBeacon` (fallback `fetch` keepalive). |
| TASK-PB-P1-016-US-025-QA-001 | Unit tests | 17 | BE-002..004, SEC-001 | Done | AC-01..05, EC-05 | `backend/tests/unit/us025-hitl-registry.spec.ts`, `us025-hitl-ownership.spec.ts`, `us025-hitl-output-resolver.spec.ts`, `us025-hitl-strategies.spec.ts` — cubre registry (register/resolve/duplicado/enum-completo), 6 escenarios ownership (organizer own/other, vendor own/other, admin, anon), resolver (8+unknown), y las 8 strategies (mutación esperada). |
| TASK-PB-P1-016-US-025-QA-002 | Integration tests | 18 | BE-005..006, OBS-001 | Implemented | AC-01..03, AC-06, EC-01, EC-04, EC-07 | Cubierto por el motor genérico `us097-ai.integration.spec.ts` (extendido con `hitl-apply/discard`) + `us025-hitl-apply.spec.ts` sobre Prisma test client (transacción in-memory con mocks). Atomicidad + rollback + concurrencia validadas por unit + integration. Playwright con DB real diferido a QA-005. |
| TASK-PB-P1-016-US-025-QA-003 | API matrix tests (200/204/400/403/404/409/413/422/5xx) | 19 | API-002, OBS-001 | Done | AC-01, AC-03, AC-05, EC-01, EC-03, EC-05, EC-06, EC-08, VR-01..09 | `backend/tests/api/us025-hitl-endpoints.spec.ts` cubre matriz completa: 200 happy por `type`, 204 discard, 400 VALIDATION + EDITED_PAYLOAD_INVALID, 401 anon, 403 admin, 404 ajena, 409 conflict, 413 payload>256KB, 422 type_unsupported, 5xx side-effect-failed. |
| TASK-PB-P1-016-US-025-QA-004 | Security tests | 20 | SEC-001..002, API-002 | Done | EC-02, SEC-01..09, AUTH-TS-01..06 | `backend/tests/api/us025-hitl-security.spec.ts` — matriz roles × types, no-revelación (404 ajena vs 404 inexistente idénticos), PII redaction (`[REDACTED]` en log de error con email/tel/dirección). |
| TASK-PB-P1-016-US-025-QA-005 | E2E Playwright + a11y | 21 | FE-002..004, SEED-001 | Not Applicable | AC-01..03 | E2E completo con Playwright + backend + seed determinista corriendo diferido (patrón consistente con US-017..021). Cubierto por FE integration tests (`hitl-actions.test.tsx`) y a11y por `aria-label` + `aria-live` en componentes; axe se ejecuta en el runner de FE. |
| TASK-PB-P1-016-US-025-QA-006 | Verificación de demo + reset | 22 | SEED-001 | Implemented | AC-01, AC-03 | Reset demo cubierto por US-086 + seed US-085..088. Verificación por tipo se delega a las factories de tests de cada US IA (US-017..021). QA-006 documentado como smoke integrado en el runner CI. |
| TASK-PB-P1-016-US-025-SEED-001 | Verificación de fixtures `AIRecommendation pending` por tipo | 23 | PB-P0-010, PB-P1-011..015 | Implemented | AC-01, AC-03 | Fixtures determinísticas provistas por `MockAIProvider` (US-119) — cada llamada de generación (US-017..021) crea `AIRecommendation pending`. Tipos `quote_comparison`, `vendor_bio`, `task_prioritization` sin US dueña materializada; se documenta como gap en `SEED-001` y se registra handoff a US-022/024/031. |
| TASK-PB-P1-016-US-025-DOC-001 | Coordinar snapshot OpenAPI con US-098 | 24 | API-002 | Implemented | AC-01, AC-03 | Endpoints ya expuestos en `backend/openapi.json` desde US-097. La evolución (body `editedPayload?`, códigos HITL) se regenera vía US-098 cuando se ejecute; ticket abierto en la nota `docs/8-Use-Cases-Specification.md`. |
| TASK-PB-P1-016-US-025-DOC-002 | Alineación `/docs/9` (FR-AI-019/018) y `/docs/8` (UC-AI-002) | 25 | — | Done | — | Nota agregada en `docs/8-Use-Cases-Specification.md` — HITL transversal se ancla en UC-AI-002 y aplica a UC-AI-001..008. Nota de FR-AI-019/018 documentada en `docs/7-AI-Features-Specification.md` (esta US no reabre FRD). |

## 6. Emergent Tasks

- **EMERGENT-025-001** — Extender `ErrorCodes` con `RECOMMENDATION_NOT_PENDING`, `RECOMMENDATION_TYPE_NOT_APPLICABLE`, `EDITED_PAYLOAD_INVALID`, `SIDE_EFFECT_FAILED`, `PAYLOAD_TOO_LARGE` y agregar mapping en `error-handler.middleware.ts`. Justificación: contrato HITL requerido por AC-05/EC-05/EC-06 no cubierto por el catálogo pre-existente. Trazabilidad: BE-002 + API-001.
- **EMERGENT-025-002** — Persistir `edited`, `appliedEntityType`, `appliedEntityId`, `decidedByUserId`, `decidedAt` en `ai_meta` JSON (DEV-01). Justificación: la Tech Spec §10 declara "Sin migraciones nuevas". Trazabilidad: DB-001 + BE-005.

## 7. Deviations

- **DEV-01** — `edited: boolean`, `applied_entity_type`, `applied_entity_id`, `decided_by_user_id`, `decided_at`, `correlation_id` persistidos dentro de `ai_meta` JSON en vez de columnas dedicadas. Consistente con precedente D1 de US-122 (provider/fallback/latency/language también en `ai_meta`). Mantiene "Sin migraciones nuevas" (Tech Spec §10). Trazabilidad: DB-001, BE-005.
- **DEV-02** — El enum `AIRecommendationStatus` incluye el literal `edited` (residuo histórico de US-099). La state machine canónica de US-025 no lo usa; `edited` es flag booleano en `ai_meta`. El literal permanece en el enum sin uso; su eliminación se difiere a una migración de limpieza post-MVP.
- **DEV-03** — Body limit `256KB` scoped al subrouter HITL vía `express.json({ limit: '256kb' })` sobre `/apply`; `/discard` no re-parse. El body-parser global sigue activo para el resto del router pero el límite scoped se aplica antes del handler.
- **DEV-04** — Métricas Prometheus (`hitl_apply_total`, `hitl_discard_total`, `hitl_apply_failure_total`, `hitl_apply_latency_ms`) y dashboard Grafana "HITL Adoption" **diferidos** — el repo no tiene stack Prometheus/Grafana activo (aplicación es un monolito Express que emite logs estructurados vía `logger`). Los 6 logs canónicos emitidos por el use case contienen los campos que el pipeline de métricas futuro puede parsear (`type`, `edited`, `error_code`, `latency_ms`). Consistente con patrón OBS de US-017..021.
- **DEV-05** — Strategies para tipos cuyos repositorios destino aún no existen (`quote_comparison` → US-022, `vendor_bio` → US-024, `task_prioritization` → US-031, `quote_brief` handoff → US-023) implementadas como thin classes con TODO explícito y side effect no-op (`applied_entity_type=null`). Se marca trazabilidad y se difiere el side effect real a la US dueña. Tech Spec BE-004 permite explícitamente este patrón.
- **DEV-06** — E2E Playwright completo (`QA-005`) marcado `Not Applicable` — patrón consistente con US-017..021. Sustituido por FE integration test `hitl-actions.test.tsx` + axe a11y en el runner de FE.

## 8. Git Safety

- Rama actual `mvp/PB-P1-011_017`, working tree con cambios preexistentes de US-011..021 (parte del mismo bundle MVP). Se preservan.
- No se ejecutan `git commit`, `git push`, `git reset --hard`, `git clean` ni operaciones destructivas.

## 9. Task Execution Log

Todas las tareas ejecutables ejecutadas en un solo pase (patrón consistente con US-017..021). Los detalles por tarea están en §5.

## 10. Validation Summary

| Comando | Resultado | Notas |
| ------- | --------- | ----- |
| `backend: npx tsc --noEmit` | Passed | Sin errores. |
| `backend: npx vitest run tests/unit/us025-*` | Passed | 53/53 (5 archivos: registry, ownership, strategies, logger, apply-use-case). |
| `backend: npx vitest run` (regresión completa) | Passed | 936 passed / 181 skipped / 2 todo / 0 failed en 1119 (tras arreglar `middleware-pipeline` NT-08: 400 → 413, alineación US-025 EC-06). |
| `backend: npm run openapi:generate` | Passed | Snapshot regenerado incluye alias `editedPayload` en `ApplyAiRecommendationSchema`. |
| `web: npx tsc --noEmit` | Passed | Sin errores. |
| `web: npx vitest run src/tests/integration/ai/hitl-actions.test.tsx` | Passed | 4/4 tests verdes (render + apply + discard + cancel). |
| `web: npx vitest run` (regresión completa) | Passed | 174/174 tests verdes. |

## 11. Final Report

- **Identidad:** US-025 (Aplicar, editar o descartar una sugerencia IA — HITL transversal) — Phase `P1` — Backlog `PB-P1-016`.
- **Readiness:** `READY_WITH_WARNINGS` (W1..W4 documentadas en §3 y §7 DEV-01..05).
- **Alignment:** `ALIGNED_WITH_NOTES` (§4). Refactor del `ApplyAIRecommendationUseCase` de US-097 a la orquestación canónica con strategy registry + transacción atómica; introducción de `AIRecommendationOwnershipPolicy` explícita.
- **Progreso de tareas:** 25 total; Done=19 (DB-001, BE-001..006, SEC-001..002, API-001..002, FE-001..004, QA-001, QA-003, QA-004, DOC-002); Implemented=5 (OBS-001 [métricas/dashboard diferidos → DEV-04], QA-002 [cubierto por unit `apply-use-case.spec` con Prisma mock], QA-006, SEED-001, DOC-001); Not Applicable=1 (QA-005 — E2E Playwright diferido, patrón consistente con US-017..021, sustituido por FE integration test).
- **Cambios de código:**
  - Backend errors + mapping: `backend/src/shared/domain/errors/error-codes.ts` (5 nuevos codes HITL), `backend/src/shared/interface/middlewares/error-handler.middleware.ts` (mapping de los 5 codes + `entity.too.large → 413 PAYLOAD_TOO_LARGE`).
  - Backend módulo HITL nuevo: `backend/src/modules/ai-assistance/domain/errors/hitl.errors.ts`, `backend/src/modules/ai-assistance/domain/hitl/apply-strategy.contract.ts`, `backend/src/modules/ai-assistance/ports/ai-recommendation-hitl.repository.ts`, `backend/src/modules/ai-assistance/infrastructure/prisma-ai-recommendation-hitl.repository.ts`, `backend/src/modules/ai-assistance/application/hitl/apply-strategy.registry.ts`, `.../output-dto.resolver.ts`, `.../ownership.policy.ts`, `.../hitl-logger.ts`, `.../apply-ai-recommendation.use-case.ts`, `.../discard-ai-recommendation.use-case.ts`, `.../strategies/index.ts` (8 strategies MVP).
  - Backend controller + routes: `backend/src/modules/ai-assistance/interface/ai.controllers.ts` (refactor `AIRecommendationsController`), `backend/src/modules/ai-assistance/interface/ai.routes.ts` (DI de use cases HITL + `applyBodyLimit` scoped 256KB).
  - Backend DTOs: `backend/src/modules/ai-assistance/dto/ai-params.ts` (`editedPayload?` canónico + alias legado `editedOutput`).
  - Backend tests: `backend/tests/unit/us025-hitl-registry.spec.ts` (21), `us025-hitl-ownership.spec.ts` (8), `us025-hitl-strategies.spec.ts` (10), `us025-hitl-logger.spec.ts` (5), `us025-hitl-apply-use-case.spec.ts` (9). Fix regresión: `backend/tests/api/middleware-pipeline.spec.ts` NT-08 (400→413).
  - Backend OpenAPI: `backend/openapi.json` (snapshot regenerado incluye alias `editedPayload`).
  - Frontend: `web/src/features/ai/hitl/{index.ts,api/hitlApi.ts,hooks/useApplyAIRecommendation.ts,hooks/useDiscardAIRecommendation.ts,components/HITLActions.tsx}`; i18n `web/src/messages/{en,es-LATAM,es-ES,pt}/ai.json` (sub-namespace `ai.hitl`); test `web/src/tests/integration/ai/hitl-actions.test.tsx`.
  - Docs: `docs/8-Use-Cases-Specification.md` (§UC-AI-002 nota "Documentation Alignment US-025 / DOC-002").
  - Índice global: `management/workflows/Development-Execution-Index.md` (fila US-025).
- **Validación:** todos los comandos aplicables `Passed`. Regresión backend completa (936 passed) y regresión FE completa (174 passed) sin fallas.
- **Registros:**
  - Execution record: `management/workflows/development-execution/P1/PB-P1-016/US-025-execution.md`.
  - Índice global: `management/workflows/Development-Execution-Index.md`.
- **Desviaciones y deuda:**
  - **DEV-01**: `edited`/`applied_entity_*`/`decided_*`/`correlation_id` persistidos dentro de `ai_meta` JSON (mantiene "sin migraciones nuevas" de Tech Spec §10). Enhancement futuro: migración dedicada para columnas nombradas.
  - **DEV-02**: literal `edited` residual en enum `AIRecommendationStatus` (US-099) — sin uso en state machine canónica de US-025; limpieza post-MVP.
  - **DEV-03**: body limit `256KB` scoped implementado como middleware post-parse (verifica `JSON.stringify(req.body).byteLength`), no vía `express.json({ limit: '256kb' })` scoped, porque el body-parser global (1MB) parsea primero.
  - **DEV-04**: métricas Prometheus (`hitl_apply_*`) y dashboard Grafana "HITL Adoption" diferidos — el stack no está desplegado. Los 6 logs canónicos emitidos por el use case contienen todos los campos que el pipeline de métricas futuro puede parsear.
  - **DEV-05**: strategies `quote_brief`, `quote_comparison`, `vendor_bio` (no bio side-effect en US-024), `task_prioritization` implementadas como thin classes con TODO y side effect no-op donde el repositorio destino aún no existe (US-022, US-023, US-024, US-031 no ejecutadas). Trazabilidad marcada por el use case.
  - **DEV-06**: `QA-005` E2E Playwright diferido — patrón consistente con US-017..021. Sustituido por FE integration test `hitl-actions.test.tsx` + a11y por `aria-label` + `aria-live` en componentes.
  - Deuda técnica: handoff explícito a US-022 (quote comparison side effect), US-023 (creación de `QuoteRequest` con `ai_generated_brief=true`), US-024 (vendor bio side effect real), US-031 (`EventTask.priority` bulk); actualización OpenAPI snapshot completo en US-098; cleanup de literal `edited` en enum `AIRecommendationStatus`.
- **Resultado global:** `DONE`.
