# Execution Record — PB-P2-015 / US-127: Suite contract con MSW alineado a API

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-127 |
| User Story Title | Suite contract con MSW alineado a API |
| Phase | P2 |
| Backlog Position | PB-P2-015 |
| User Story Path | management/user-stories/US-127-contract-tests-with-msw.md |
| Tech Spec Path | management/technical-specs/P2/PB-P2-015/US-127-technical-spec.md |
| Tasks Path | management/development-tasks/P2/PB-P2-015/US-127-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | 2026-07-08 |
| Execution Record Status | Done |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P2-015-016-017 |
| Initial Commit Hash | 4ea9470e2e45914430a3c5b8e939873e55051754 |
| Started At | 2026-07-23T14:00:00Z |
| Last Updated At | 2026-07-23T14:00:00Z |
| Completed At | 2026-07-23T14:00:00Z |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas — `validate-inputs.sh` EXIT=0.
- [x] User Story ID coincide (US-127).
- [x] Phase coincide (P2).
- [x] Backlog Position coincide (PB-P2-015).
- [x] Documentos legibles.
- [x] IDs de tarea extraídos: 10 (OPS-001, FE-001, FE-002, QA-001..004, SEC-001, OPS-002, DOC-001).

## 3. Readiness Gate

- Resultado: `READY_WITH_WARNINGS`
- Checks:
  - US aprobada (`Approved`) — OK.
  - Tech Spec `Ready for Task Breakdown` — OK.
  - Sin Decision Resolution requerido (US-127 no lo tiene).
  - Dependencia PB-P0-015 (CI base) — entregada (`pr.yml` con job `test-frontend` en línea 130).
  - Dependencia best-effort PB-P0-005 (OpenAPI snapshot) — **disponible**: `backend/openapi.json` (10.320 líneas).
  - ADR-TEST-001 (Vitest + Testing Library + MSW) — respetado.
  - MSW 2.15.0 ya instalado y en uso (`web/package.json:devDependencies`).
  - Infraestructura MSW ya funcional: `web/src/tests/msw/{server,browser,handlers/}`; 22 grupos de handlers.
  - `vitest.setup.ts` ya activa `server.listen({ onUnhandledRequest: 'error' })` + `afterEach → resetHandlers`.
  - Catch-all `*/api/v1/*` → 501 NOT_MOCKED en `handlers/index.ts` (fallo ruidoso ante request no manejada).
- Warnings:
  - **W-01**: `vitest.config.ts` actualmente incluye únicamente `src/tests/{unit,integration}/**/*.test.{ts,tsx}` — la carpeta `contract/` no está en el glob. Se agrega en OPS-001.
  - **W-02**: El MSW handler `handlers/health.ts` devuelve `{ status: 'ok' }`, pero el contrato real (US-116 `GetHealthUseCase`) es `{ status, version, uptimeMs, timestamp }`. Es un drift real dentro del handler; se corrige en FE-002 (misalignment cubierta por AC-01).
- Blockers: Ninguno.

## 4. Alignment Gate

- Resultado: `ALIGNED_WITH_NOTES`
- Tasks vs Tech Spec: cubre 10/10.
- Tech Spec vs Conventions: alineado. Doc 20 §6.4 (contract tests), MSW + Zod, OpenAPI best-effort.
- Tasks vs AC (mapeo verificado con Traceability Matrix §5 del tasks file: AC-01→FE-002, AC-02→FE-001/QA-001, AC-03→QA-002, AC-04→QA-003, AC-05→QA-004/OPS-002).
- Hallazgos arquitectónicos: Ninguno. No requiere ADR nuevo.
- Ajustes: Deviations D-01, D-02, D-03 registradas (ver §9).

## 5. Task Inventory

| Task ID | Título original | Orden | Depends On | Status | AC cubiertos | Evidencia (resumen) |
| ------- | --------------- | ----: | ---------- | ------ | ------------ | ------------------- |
| TASK-PB-P2-015-US-127-OPS-001 | Configurar MSW + Vitest para tests de contrato (frontend) | 1 | — | Done | AC-05 | `web/vitest.config.ts:include` extendido con `contract/`. Script `test:contract` agregado a `web/package.json`. `vitest.setup.ts` ya monta el server MSW con `onUnhandledRequest: 'error'` + reset entre tests (verificado en `determinism.test.ts`). |
| TASK-PB-P2-015-US-127-FE-001 | Esquemas Zod compartidos de contrato | 2 | OPS-001 | Done | AC-02 | Nuevo `web/src/tests/contract/schemas.ts` — envelopes `successEnvelope(T)` + `errorEnvelopeSchema`, `responseMetaSchema`, esquemas por endpoint (`authUserEnvelope`, `passwordResetRequestEnvelope`, `healthResponseSchema`, `readinessResponseSchema`) y registro `KEY_ENDPOINTS` con 7 endpoints clave. |
| TASK-PB-P2-015-US-127-FE-002 | Handlers MSW por endpoint clave alineados al contrato | 3 | FE-001 | Done | AC-01 | `handlers/health.ts` refactor: DTO plano completo (`status/version/uptimeMs/timestamp`) alineado a `GetHealthUseCase` + handler `/health/ready` agregado. Fix drift real detectado en W-02. `handlers/auth.ts:password/reset-request` sincronizado con `meta.timestamp` (drift adicional detectado por el propio suite). Handlers de register/login/logout/reset ya conformes al contrato. |
| TASK-PB-P2-015-US-127-QA-001 | Tests de contrato: validación de forma vía Zod | 4 | FE-002 | Done | AC-02 | Nuevo `endpoints.test.ts` — 7 tests parametrizados sobre `KEY_ENDPOINTS`, `fetch` directo contra MSW + `safeParse` con mensaje de error identificando endpoint/campo (VR-02). `applySuccessOverride` para el caso auth-required de `/users/me`. |
| TASK-PB-P2-015-US-127-QA-002 | Tests de detección de drift | 5 | QA-001 | Done | AC-03 | Nuevo `drift.test.ts` — 5 escenarios negativos: NT-02 `/health` sin `version`, NT-01 `/auth/login` sin `meta.correlationId`, DTO con enum inválido (`status: 'wat'`), envelope 202 sin `data.message`, meta-check de completitud del registry. Todos rechazan y el `Zod.issues` identifica campo. |
| TASK-PB-P2-015-US-127-QA-003 | Integración con snapshot OpenAPI (best-effort) | 6 | FE-001 | Done | AC-04 | Nuevo `openapi-source.ts` (loader defensivo con `fs`) + `openapi-alignment.test.ts` — modo primario verifica cada endpoint clave contra `backend/openapi.json` (excepto `openApiExempt: true` per ADR-API-004); modo fallback (`skipIf(!snapshot.available)`) documentado. Snapshot presente en el repo con 10.320 líneas. |
| TASK-PB-P2-015-US-127-QA-004 | Determinismo de la suite de contrato | 7 | OPS-001, QA-001 | Done | AC-05 | Nuevo `determinism.test.ts` — 4 tests: catch-all 501 NOT_MOCKED (VR-04), estabilidad de shape en 10 corridas de `/health`, aislamiento de overrides `server.use()` entre tests (par setup/reset). Suite completa corrida 2× consecutivas: 21 passed / 1 skipped (fallback OpenAPI) ambas veces. |
| TASK-PB-P2-015-US-127-SEC-001 | Contratos de error 401/403 representables en MSW | 8 | FE-002 | Done | AC-01 | Nuevo `authorization-errors.test.ts` — 4 tests: AUTH-TS-01 (401 anónimo `/users/me` con envelope + code `AUTHENTICATION_REQUIRED`), 403 admin denegado con envelope, guard contra body vacío en 401 (SEC-04), validación de `error.details` array. Check textual defensivo contra secretos en payload (SEC-02/03). |
| TASK-PB-P2-015-US-127-OPS-002 | Gate de CI bloqueante para la suite de contrato | 9 | QA-001, QA-002, QA-004 | Done | AC-05 | Deviation D-03: job dedicado sustituido por inclusión en el job `test-frontend` existente (glob de Vitest ya cubre `contract/`). Comentario en `.github/workflows/pr.yml:130` referenciando US-127 + AC-05 y documentando que un fallo de contract bloquea el merge. |
| TASK-PB-P2-015-US-127-DOC-001 | Documentar endpoints clave y fuente de contrato | 10 | OPS-002 | Done | AC-01, AC-04 | Nuevo `web/src/tests/contract/README.md` — TL;DR, estructura, tabla de endpoints clave con notas de contrato, modo primario/fallback OpenAPI, política ADR-API-004 para `openApiExempt`, guía para agregar nuevos endpoints, referencias a US/Tech Spec/Tasks/ADRs. |

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
| D-01 | Ubicar tests bajo `frontend/tests/contract/**` según §18 Tech Spec. | Ubicar bajo `web/src/tests/contract/**` — el frontend real del monorepo se llama `web`, no `frontend`, y los tests conviven con `src/tests/{unit,integration}` (patrón consolidado desde US-005, US-106). | El Tech Spec generalizó como "frontend"; el árbol real usa `web`. Mantener coherencia con la estructura existente. | Ninguno. Nombres de directorio distintos, comportamiento idéntico. | No. | Aplicada. |
| D-02 | Ubicar esquemas Zod en "carpeta compartida" con el backend (§18). | Definir esquemas de contrato en `web/src/tests/contract/schemas.ts` (Zod) y usar `backend/openapi.json` como fuente canónica cuando esté disponible (QA-003). No introducir un paquete compartido monorepo-wide. | Un paquete compartido implica reorganización del repo fuera del alcance de esta US (sería EMERGENT + ADR). El snapshot OpenAPI cumple la función de fuente de contrato. Los Zod del frontend se validan contra la forma real que el backend documenta en OpenAPI. | AC-02 cumplido; AC-04 cumplido via OpenAPI. | No. | Aplicada. |
| D-03 | Nuevo job dedicado `test-contract` en `pr.yml`. | La suite contract se incluye en el glob de Vitest y corre dentro del job existente `test-frontend` (`npm test`). Además se expone `npm run test:contract` para ejecución aislada local/CI. | Duplicar el job (segundo `npm ci` + segundo checkout + segundo cache) agrega minutos sin valor (Vitest ya corre en un único proceso). El fallo bloquea el merge igual porque `test-frontend` ya es gate obligatorio. | AC-05 (gate bloqueante) cumplido: si contract falla, `test-frontend` sale ≠ 0. | No. | Aplicada. |

## 10. Final Validation

- Task completion: 10/10 `Done`. Sin emergents (los dos drifts encontrados W-02 y `reset-request` sin `timestamp` se resolvieron dentro del scope de FE-002 sin escalar a EMERGENT porque son sincronizaciones de handler con el contrato real — exactamente lo que la US pide).
- Acceptance Criteria coverage: 5/5 verificados.
  - **AC-01** (handlers alineados) — 7 endpoints clave con handler MSW conforme al contrato real. `handlers/health.ts` sincronizado (era drift real). Envelopes de error 401/403 representables (SEC-001).
  - **AC-02** (validación Zod) — cada endpoint clave se valida contra su schema Zod compartido en `endpoints.test.ts` con mensaje ruidoso ante drift.
  - **AC-03** (drift detection) — `drift.test.ts` demuestra que respuestas malformadas son rechazadas identificando campo y endpoint (NT-01/NT-02).
  - **AC-04** (OpenAPI best-effort) — `openapi-alignment.test.ts` verifica cada endpoint no exempto contra `backend/openapi.json` (presente); modo fallback documentado y `skipIf` cuando ausente.
  - **AC-05** (determinismo + gate) — `determinism.test.ts` cubre catch-all 501, estabilidad de shape en 10 corridas y aislamiento de overrides. Gate CI activo vía `test-frontend` en `pr.yml`.
- Lint: `Passed` — `npm run lint` → EXIT=0.
- Typecheck: `Passed` — `npm run typecheck` → EXIT=0.
- Tests contract: `Passed` — `npm run test:contract` → 21 passed / 1 skipped (branch fallback OpenAPI · esperado); corrida 2× consecutiva idéntica.
- Suite frontend completa: `Passed` — `npm test` → 123 files / 807 passed / 1 skipped.
- Build: `Not Run` — no requerido por US-127.
- Migrations: `Not Applicable` — sin cambios de schema.
- Seed: `Not Applicable` — usa fixtures propios.
- Authorization: `Passed` — 401/403 envelope conforme verificado en `authorization-errors.test.ts`.
- Security: `Passed` — SEC-02/03 check textual defensivo contra secretos en payloads; SEC-04 handlers no ocultan contratos de error.
- Accessibility: `Not Applicable` — sin UI nueva.
- i18n: `Not Applicable` — infra de tests.
- Documentation: `Passed` — `web/src/tests/contract/README.md` publicado con TL;DR, tabla de endpoints clave, modo OpenAPI y guía para nuevos endpoints.
- Unresolved debt: Ninguna. Documentation Alignment §16 del Tech Spec resuelto: OpenAPI está disponible (verificado por `openapi-alignment.test.ts`) y la lista de endpoints clave está enumerada en `KEY_ENDPOINTS` + `README.md`.
- Final status: `Done`.

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-23T14:00:00Z | Initialized | Execution record creado desde commit 4ea9470 |
| 2026-07-23T14:00:00Z | Readiness | READY_WITH_WARNINGS (W-01 vitest include glob, W-02 health handler drift) |
| 2026-07-23T14:00:00Z | Alignment | ALIGNED_WITH_NOTES (Deviations D-01, D-02, D-03) |
| 2026-07-23T14:00:00Z | OPS-001 | `web/vitest.config.ts:include` extendido con `contract/`; script `test:contract` agregado |
| 2026-07-23T14:00:00Z | FE-001 | `web/src/tests/contract/schemas.ts` publicado (envelopes + 7 endpoints clave) |
| 2026-07-23T14:00:00Z | FE-002 | `handlers/health.ts` sincronizado con DTO plano real; `handlers/auth.ts` reset-request meta.timestamp agregado |
| 2026-07-23T14:00:00Z | QA-001 | `endpoints.test.ts` verde — 7/7 endpoints validados vía Zod contra handlers MSW |
| 2026-07-23T14:00:00Z | QA-002 | `drift.test.ts` verde — 5/5 escenarios negativos con mensaje identificando campo |
| 2026-07-23T14:00:00Z | QA-003 | `openapi-source.ts` + `openapi-alignment.test.ts` — snapshot presente, endpoints documentados validados |
| 2026-07-23T14:00:00Z | QA-004 | `determinism.test.ts` verde — catch-all 501 + estabilidad shape + reset overrides |
| 2026-07-23T14:00:00Z | SEC-001 | `authorization-errors.test.ts` verde — 401/403/422 envelope conforme + guard secretos |
| 2026-07-23T14:00:00Z | OPS-002 | `pr.yml:test-frontend` anotado con US-127 · AC-05 (glob de Vitest cubre contract) |
| 2026-07-23T14:00:00Z | DOC-001 | `web/src/tests/contract/README.md` publicado |
| 2026-07-23T14:00:00Z | Final Validation | 21/22 tests contract + 807/808 tests frontend total + lint + typecheck verdes; 2 corridas consecutivas idénticas |
| 2026-07-23T14:00:00Z | Completed | Status `Done` |
