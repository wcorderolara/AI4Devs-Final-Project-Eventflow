# Execution Record — PB-P0-003 / US-093: Error Envelope Unificado

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-093 |
| User Story Title | Error envelope unificado |
| Phase | P0 |
| Backlog Position | PB-P0-003 |
| User Story Path | management/user-stories/US-093-unified-error-envelope.md |
| Tech Spec Path | management/technical-specs/P0/PB-P0-003/US-093-technical-spec.md |
| Tasks Path | management/development-tasks/P0/PB-P0-003/US-093-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | last-modified 2026-07-08 |
| Execution Record Status | Done |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | foundation/PB-P0-003 |
| Initial Commit Hash | 45b210e58049f9f8a98f5cd4f8e9f8316099c029 |
| Started At | 2026-07-09T02:09:50Z |
| Last Updated At | 2026-07-09T02:18:03Z |
| Completed At | 2026-07-09T02:18:03Z |
| Claude Session ID | e566c5ef-c365-4300-ba8d-0265d7178445 |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas — `validate-inputs.sh` EXIT=0
- [x] User Story ID coincide (US-093)
- [x] Phase P0 coincide; Backlog PB-P0-003 coincide
- [x] Documentos legibles
- [x] IDs de tarea extraídos (TASK-PB-P0-003-US-093-BE-001 … DOC-001; 12 tareas)

## 3. Readiness Gate

- Resultado: **READY_WITH_WARNINGS**
- Checks: US Story `Approved`/`Ready for Development Tasks: Yes` (Pass); ACs testeables AC-01..06 + EC-01..04 (Pass); Tech Spec `Ready for Task Breakdown` (Pass); Tasks con IDs (Pass); dependencia US-089 `Done` (Pass); 7 decisiones PO/BA incorporadas (Pass); backlog contiene PB-P0-003 (Pass).
- Warnings:
  1. El bootstrap (US-090/US-091) ya creó una infra de errores parcial en `src/shared/domain/errors/` (AppError + 7 clases) y middlewares `error-handler`/`correlation-id`/`not-found`/`rate-limit` que emiten un **envelope plano** `{ code, message, correlationId }`. US-093 (ADR-API-002) exige el **envelope anidado** `{ error: { code, message, details?, correlationId } }` y códigos canónicos → **migración obligatoria** de los 3 emisores planos.
  2. La Tech Spec ubica los errores en `src/shared/errors/`; el repo real ya los tiene en `src/shared/domain/errors/` (Doc 14 §7.1, consumido por US-092 y tests). Se adapta a la ubicación real (ver §9 Deviation 1).
  3. `correlationIdMiddleware` ya existe y cumple AC-02/EC-01 (BE-005 en gran parte satisfecho). `app.ts` ya registra correlationId primero y errorHandler último (BE-007 satisfecho; se verifica el orden).
- Blockers: Ninguno
- Decision files: management/user-stories/decision-resolutions/US-093-decision-resolution.md (existe, 7 decisiones)
- Refinement files: (no verificado como bloqueante; no requerido)

## 4. Alignment Gate

- Resultado: **ALIGNED_WITH_NOTES**
- Tasks vs Tech Spec: cada tarea deriva de la spec; DAG con BE-001 raíz.
- Tech Spec vs Conventions: stack (TS, Express, Vitest, Supertest); errores en shared-kernel; naming kebab `<name>.error.ts` (repo) vs `ErrorCodes.ts`/`camel-error.ts` (spec) → se usa convención del repo.
- Tasks vs AC: AC-01→BE-004/BE-006; AC-02→BE-005; AC-03→BE-001/002/003/BE-006; AC-04→BE-004; AC-05→BE-006/SEC-001; AC-06→QA-002; EC-01→BE-005; EC-02→BE-006; EC-03→BE-004; EC-04→BE-002/BE-006/SEC-001.
- Notas:
  1. **Migración de envelope (plano→anidado)**: ADR-API-002 (nivel 1) supera la implementación existente (nivel 9). US-093 es la historia chartered para el envelope canónico; se migran `error-handler`, `not-found` y `rate-limit`, y se **actualizan los tests consumidores** de US-091 (error-handler, pipeline, auth, ownership-captcha) y US-092 (zod-validation integration) al envelope anidado + códigos canónicos. Trabajo descubierto, no expansión de scope.
  2. **Reconciliación de jerarquía sin duplicar**: se evoluciona `src/shared/domain/errors/` en su lugar. Clases canónicas nuevas (AuthenticationError, AuthorizationError con maskedAs404, ConflictError, BusinessRuleViolationError, RateLimitError, InfrastructureError + 4, UnexpectedError). Las clases existentes usadas por middlewares (UnauthorizedError, ForbiddenError, TooManyRequestsError) se re-basan por **herencia** de las canónicas para no reescribir auth/role/ownership/cors/captcha.
  3. Códigos canonicalizados: `UNAUTHORIZED`→`AUTHENTICATION_REQUIRED`, `NOT_FOUND`→`RESOURCE_NOT_FOUND`, `INTERNAL_SERVER_ERROR`→`INTERNAL_ERROR`.
  4. DOC-001 (Doc 14 §18.3) ya fue aplicado durante US-092; se confirma alineado.

## 5. Task Inventory

| Task ID | Título original | Orden | Depends On | Status | AC cubiertos | Evidencia (resumen) |
| ------- | --------------- | ----: | ---------- | ------ | ------------ | ------------------- |
| TASK-PB-P0-003-US-093-BE-001 | Jerarquía base: DomainError, InfrastructureError, UnexpectedError, ErrorCodes.ts | 1 | US-089 | Done | AC-03 | `error-codes.ts` (12 códigos), `infrastructure.error.ts`, `unexpected.error.ts`, `index.ts`; AppError = base DomainError |
| TASK-PB-P0-003-US-093-BE-002 | 7 subclases de DomainError | 2 | BE-001 | Done | AC-03, EC-04 | Authentication/Authorization(maskedAs404)/NotFound/Conflict/BusinessRuleViolation/RateLimit + ValidationError; Unauthorized/Forbidden/TooManyRequests re-basados |
| TASK-PB-P0-003-US-093-BE-003 | 4 subclases de InfrastructureError | 3 | BE-001 | Done | AC-03 | AIProvider/AITimeout/ExternalIntegration/PrismaPersistence; originalError interno |
| TASK-PB-P0-003-US-093-BE-004 | Tipos envelope + helpers success()/failure() | 4 | BE-001 | Done | AC-01, AC-04, EC-03 | response/{types,success,failure,index}.ts; overloads fuerzan details en 2 códigos |
| TASK-PB-P0-003-US-093-BE-005 | correlationIdMiddleware | 5 | US-089 | Done | AC-02, EC-01 | Ya existente (bootstrap) cumple AC-02/EC-01; express.d.ts tiene correlationId; verificado por UT-04/05 |
| TASK-PB-P0-003-US-093-BE-006 | errorHandlerMiddleware | 6 | BE-001..004 | Done | AC-01, AC-03, AC-05, EC-02, EC-04 | Reescrito: envelope anidado, mapeo 12+ casos, logging warn/error, masking, Retry-After; not-found + rate-limit migrados |
| TASK-PB-P0-003-US-093-BE-007 | Registrar en app.ts | 7 | BE-005, BE-006 | Done | AC-01, AC-02 | Ya cumplido (correlationId primero, errorHandler último); orden verificado por TS-06 (pipeline spec) |
| TASK-PB-P0-003-US-093-QA-001 | Unit tests (UT-01..07) | 8 | BE-002, BE-004, BE-005 | Done | AC-01, AC-02, AC-04, EC-01, EC-03 | response-and-errors.spec.ts (7 tests Passed) |
| TASK-PB-P0-003-US-093-QA-002 | Integration tests (IT-01..10 + NT-01..10) | 9 | BE-006, BE-007 | Done | AC-01, AC-03, AC-05, AC-06, EC-02, EC-04 | error-envelope.spec.ts (11 tests Passed) + error-test-app helper |
| TASK-PB-P0-003-US-093-SEC-001 | Security tests (SEC-T-01..03, AUTH-TS-01..02) | 10 | BE-006, BE-007 | Done | AC-05, EC-04 | error-envelope-security.spec.ts (4 tests Passed) |
| TASK-PB-P0-003-US-093-OBS-001 | Log estructurado warn/error | 11 | BE-006, QA-001 | Done | AC-05 | error-handler-logging.spec.ts (3 tests Passed) |
| TASK-PB-P0-003-US-093-DOC-001 | Doc 14 §18.3 alignment | 12 | — | Done | N/A (doc) | Ya aplicado en US-092 (VALIDATION_ERROR/RESOURCE_NOT_FOUND/RATE_LIMIT_EXCEEDED); confirmado alineado |

## 6. Emergent Tasks

| ID | Título | Tarea padre | Razón | Necesidad | Status |
| -- | ------ | ----------- | ----- | --------- | ------ |
| EMERGENT-001 | Migrar tests consumidores US-091/US-092 al envelope anidado | BE-006 | La migración plano→anidado (ADR-API-002) rompe los asserts de envelope de US-091 (error-handler, pipeline, auth, ownership-captcha) y US-092 (zod-validation integration) | Requerida para que la suite pase con el envelope canónico | Done |

## 7. Evidence by Task

### BE-001..003 (jerarquía)
- Files created: `error-codes.ts`, `infrastructure.error.ts`, `unexpected.error.ts`, `authentication.error.ts`, `conflict.error.ts`, `business-rule-violation.error.ts`, `rate-limit.error.ts`, `ai-provider.error.ts`, `ai-timeout.error.ts`, `external-integration.error.ts`, `prisma-persistence.error.ts`, `index.ts` (todos en `src/shared/domain/errors/`).
- Files modified: `authorization.error.ts` (repurpose a 403 + maskedAs404), `not-found.error.ts` (code RESOURCE_NOT_FOUND), `unauthorized.error.ts` (extends AuthenticationError), `forbidden.error.ts` (extends AuthorizationError), `too-many-requests.error.ts` (extends RateLimitError).
- Typecheck/Lint: Passed. UT-06/UT-07 Passed.

### BE-004 (helpers)
- Files created: `src/shared/response/{types.ts, success.ts, failure.ts, index.ts}`.
- UT-01/UT-02/UT-03 Passed. `failure()` overloads fuerzan `details[]` en VALIDATION_ERROR/BUSINESS_RULE_VIOLATION.

### BE-005 (correlationId)
- Sin cambios de código: `correlation-id.middleware.ts` (bootstrap) ya cumple AC-02/EC-01; `express.d.ts` ya declara `correlationId`. UT-04/UT-05 Passed.

### BE-006 (errorHandler) + migración de emisores
- Files modified: `error-handler.middleware.ts` (reescrito: envelope anidado, `mapError` con 12+ ramas, logging warn/error, masking 404, Retry-After); `not-found.middleware.ts` y `rate-limit.middleware.ts` (envelope anidado).
- Typecheck/Lint: Passed. IT-01..10, SEC-T-01..03, OBS-01..03 Passed.

### BE-007 (app.ts)
- Verificado sin cambios: `correlationIdMiddleware` primero, `errorHandlerMiddleware` último. TS-06 (pipeline order) Passed.

### QA-001 / QA-002 / SEC-001 / OBS-001
- Files created: `tests/unit/response-and-errors.spec.ts` (7), `tests/api/error-envelope.spec.ts` (11), `tests/api/error-envelope-security.spec.ts` (4), `tests/unit/error-handler-logging.spec.ts` (3), `tests/helpers/error-test-app.ts`.
- `npm test` → todos Passed.

### EMERGENT-001 (migración de tests consumidores)
- Files modified: `tests/unit/error-handler.middleware.spec.ts`, `tests/api/middleware-pipeline.spec.ts`, `tests/api/middleware-auth.spec.ts`, `tests/api/middleware-ownership-captcha.spec.ts` (US-091), `tests/api/zod-validation.spec.ts` (US-092) → envelope anidado `res.body.error.*` + códigos canónicos (AUTHENTICATION_REQUIRED, RESOURCE_NOT_FOUND, INTERNAL_ERROR). Todos Passed.

### DOC-001
- `docs/14-Backend-Technical-Design.md §18.3/§18.2` ya alineado (aplicado en US-092). Confirmado.

> Nota: el controlador placeholder de identity-access (US-092 BE-006) sigue devolviendo `{ code: 'NOT_IMPLEMENTED' }` a 501 (no pasa por el errorHandler; su body no es aserido por ningún test). Se reemplazará por el handler real en PB-P0-004.

## 8. Blockers

| Blocker ID | Tarea | Tipo | Descripción | Estado |
| ---------- | ----- | ---- | ----------- | ------ |
| — | | | Ninguno | |

## 9. Deviations

| # | Planeado | Implementado | Razón | Impacto | ADR |
| - | -------- | ------------ | ----- | ------- | --- |
| 1 | Errores en `src/shared/errors/`, archivos `ErrorCodes.ts`/`x-error.ts` | Errores en `src/shared/domain/errors/`, archivos `<name>.error.ts` + `error-codes.ts` | Repo real (Doc 14 §7.1) ya ubica la jerarquía ahí; US-092 y tests dependen de esa ruta; evita duplicar | Menor — misma semántica; sin duplicación | No |
| 2 | Clases nuevas independientes (AuthenticationError/AuthorizationError/RateLimitError) | Clases canónicas nuevas + re-base por herencia de las existentes (UnauthorizedError extends AuthenticationError, ForbiddenError extends AuthorizationError, TooManyRequestsError extends RateLimitError) | No reescribir auth/role/ownership/cors/captcha que ya lanzan las clases existentes | Menor — jerarquía coherente única | No |
| 3 | Envelope de US-091 (plano) permanece | Migrado a anidado `{ error: {...} }` + tests consumidores actualizados | ADR-API-002 (nivel 1) exige envelope anidado; US-093 es la historia que lo implementa | Materialmente correcto; cambia contrato emitido de US-091 (placeholder) | No |

## 10. Final Validation

- Task completion: 12/12 Done + EMERGENT-001 Done
- Acceptance Criteria coverage: 6/6 AC + 4/4 EC cubiertos con evidencia
  - AC-01→QA-002 IT-01..10; AC-02→UT-04/05, IT-10; AC-03→IT-01..08; AC-04→UT-01/02/03; AC-05→SEC-T-01, OBS-02, IT-08; AC-06→QA-002; EC-01→UT-05; EC-02→IT-08; EC-03→UT-03/IT-01; EC-04→IT-04, SEC-T-02, OBS-03.
- Lint: **Passed** — `npm run lint` exit 0
- Typecheck: **Passed** — `npm run typecheck` exit 0
- Tests: **Passed** — `npm test` → 231 passed | 31 skipped | 2 todo (264); +25 tests nuevos de US-093; tests consumidores migrados en verde
- Build: Not Run (no requerido; typecheck cubre la compilación)
- Migrations / Seed / DB: Not Applicable (capa Interface/Shared Kernel)
- Security: **Passed** — SEC-T-01 (no stack/SQL en 500), SEC-T-02/AUTH-TS-01 (masking 404), AUTH-TS-02 (500 genérico sin campos extra), SEC-T-03 (correlationId body==header)
- Observability: **Passed** — warn 4xx, error 5xx con stack (no en response), masking logueado
- Documentation: **Passed** — Doc 14 §18.3/§18.2 alineado (DOC-001)
- Unresolved debt: Ninguna material. Pendiente por diseño: consumo de InfrastructureError (AIProvider/AITimeout) en features IA (PB-P0-009/011); PrismaPersistenceError como wrapper de repositorio (feature stories); controlador identity-access real (PB-P0-004).
- Final status: **Done**

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-09T02:09:50Z | Initialized | Execution record creado |
| 2026-07-09T02:09:50Z | Readiness | READY_WITH_WARNINGS |
| 2026-07-09T02:09:50Z | Alignment | ALIGNED_WITH_NOTES (migración de envelope + reconciliación de jerarquía) |
| 2026-07-09T02:14:00Z | BE-001..004 | Done (jerarquía + ErrorCodes + response helpers) |
| 2026-07-09T02:16:00Z | BE-006 | Done (errorHandler nested + not-found/rate-limit migrados) |
| 2026-07-09T02:17:00Z | QA-001/QA-002/SEC-001/OBS-001 | Done (25 tests nuevos) |
| 2026-07-09T02:17:30Z | EMERGENT-001 | Done (migración de tests consumidores US-091/US-092) |
| 2026-07-09T02:18:03Z | Story | In Progress → Done (231 passed) |
