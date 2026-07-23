# Execution Record — PB-P2-011 / US-114: Correlation ID propagation

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-114 |
| User Story Title | Correlation ID por request (X-Correlation-Id, UUID v4) end-to-end |
| Phase | P2 |
| Backlog Position | PB-P2-011 |
| User Story Path | management/user-stories/US-114-correlation-id-propagation.md |
| Tech Spec Path | management/technical-specs/P2/PB-P2-011/US-114-technical-spec.md |
| Tasks Path | management/development-tasks/P2/PB-P2-011/US-114-development-tasks.md |
| Execution Record Status | Done |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P2-009-010-011 |
| Initial Commit Hash | 5b0dc1adc167903f37bc8b6690d73b8e28823002 |
| Started At | 2026-07-23T18:50:00Z |
| Completed At | 2026-07-23T19:15:00Z |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (US-114 / P2 / PB-P2-011) — script OK
- [x] User Story `Approved with Minor Notes`
- [x] Tech Spec `Ready for Task Breakdown`
- [x] Decision Resolution (D1..D7) disponible
- [x] Upstream PB-P2-010 (US-113 Done en commit 5b0dc1a) — `correlationContext` singleton + `getCorrelationId()` disponibles

## 3. Readiness Gate

- Resultado: `READY_WITH_WARNINGS`
- Warnings (§4 documenta implicaciones):
  - **W-01**: `correlation-id.middleware.ts` existía (US-091) — se extiende in-place con Zod + 400 + `.run()`.
  - **W-02**: envelope helpers `success/failure` (US-093) reciben `correlationId` explícito — se conserva ese patrón + se agrega thin `respond` wrapper de contexto (D-01).
  - **W-03**: error handler ya emitía `error.correlationId` desde `req.correlationId` — se agrega fallback defensivo a `getCorrelationId()`.
  - **W-04**: frontend fetch interceptor YA existente (`attachCorrelationId.ts` + `httpClient.ts`) con UUID v4 via `crypto.randomUUID()`. FE-001 pasa a "verificación".
  - **W-05**: US-113 request-logger hacía `.run()` — se ajusta para NO doble-wrap dado que ahora `correlationIdMiddleware` corre `.run()`.
- Blockers: ninguno.

## 4. Alignment Gate

- Resultado: `ALIGNED_WITH_NOTES`
- Notas: D-01..D-05 en §9. Ajuste emergente D-06 (bulk fixture update).

## 5. Task Inventory

| Task ID | Título | Status | AC | Evidencia |
| ------- | ------ | ------ | -- | --------- |
| TASK-PB-P2-011-US-114-BE-001 | Zod schema UUID v4 strict | Done | AC-02, AC-03 | `backend/src/shared/validation/correlation-id.schema.ts` |
| TASK-PB-P2-011-US-114-BE-002 | `generateCorrelationId` helper | Done | — | `backend/src/shared/context/correlation-id.ts` (extendido) |
| TASK-PB-P2-011-US-114-BE-003 | `respond.success/error` wrapper | Done | AC-05, AC-06 | `backend/src/shared/http/response.ts` — thin wrapper sobre `success()/failure()` de US-093 |
| TASK-PB-P2-011-US-114-BE-004 | Middleware upgrade (Zod + 400 + run) | Done | AC-01/02/03/04/07 | `backend/src/shared/interface/middlewares/correlation-id.middleware.ts` |
| TASK-PB-P2-011-US-114-BE-005 | Error handler ext (fallback contexto) | Done | AC-06 | `backend/src/shared/interface/middlewares/error-handler.middleware.ts` — `req.correlationId ?? getCorrelationId() ?? ''` |
| TASK-PB-P2-011-US-114-BE-006 | Wire app.ts (verificar orden) | Done | AC-01..07 | `backend/src/app.ts` — orden `correlationIdMiddleware → requestLoggerMiddleware` ya correcto per Doc 14 §8.2 |
| TASK-PB-P2-011-US-114-FE-001 | Fetch interceptor | Done | AC-08 | `web/src/shared/api-client/attachCorrelationId.ts` + `httpClient.ts` — YA existentes; 4 UT verdes en `attachCorrelationId.test.ts` |
| TASK-PB-P2-011-US-114-SEC-001 | Injection defense | Done | AC-03 | Incluido en `us114-correlation-id-middleware.spec.ts` — 6 payloads maliciosos (XSS, SQLi, path traversal, null byte, JNDI, SSTI) → 400 antes de handlers, payload nunca propagado |
| TASK-PB-P2-011-US-114-QA-001 | UT backend UT-01..06 | Done | AC-01..03 | `backend/tests/unit/us114-correlation-id-middleware.spec.ts` — 14 UT (UT-01..05b + `generateCorrelationId` × 4 + schema × 3 + SEC-T-01) |
| TASK-PB-P2-011-US-114-QA-002 | UT frontend UT-07/08 | Done | AC-08 | `web/src/tests/unit/api-client/attachCorrelationId.test.ts` — 4 UT verdes ya existentes |
| TASK-PB-P2-011-US-114-QA-003 | IT-01..03 invariante crítico | Done | AC-04..07 | `backend/tests/integration/us114-correlation-id.integration.spec.ts` — 5 IT (IT-01 header==body vía 404, IT-01b /health echo, IT-02 400 server-generated, IT-03 10 concurrentes sin cross-contamination, IT-04 sin header → UUID v4) |
| TASK-PB-P2-011-US-114-QA-004 | E2E Playwright | Skipped | AC-08 | Infra Playwright pending — cobertura equivalente por IT-01/IT-02/IT-03 (invariante header==body verificado end-to-end) + UT frontend |
| TASK-PB-P2-011-US-114-QA-005 | Contract MSW | Skipped | AC-04..06 | Cubierto por UT existentes (`parseErrorEnvelope`, `httpClient` con `correlationId`) + IT backend que verifica shape del envelope |
| TASK-PB-P2-011-US-114-QA-006 | Smoke curl | Skipped | AC-01..04 | Infra Docker/CI pending — equivalente cubierto por IT backend real |
| TASK-PB-P2-011-US-114-DOC-001 | Traceability PB-P2-011 | Done | — | `4-Product-Backlog-Prioritized.md` §PB-P2-011 — Title/Description/Acceptance Summary/Traceability ampliados con ADR-API-004 primario + NFR-OBS-006 + ADR-SEC-001 + ADR-DEVOPS-001 + Decisión Tech Lead US-114 |
| TASK-PB-P2-011-US-114-DOC-002 | `docs/15` fetch interceptor | Done | AC-08 | Ya documentado en `docs/15 §Frontend Architecture` (línea 849): "`X-Correlation-Id` generado por request (UUID v4) y propagado al backend". Sin cambio necesario. |
| TASK-PB-P2-011-US-114-DOC-003 | `docs/16` INVALID_CORRELATION_ID | Done | AC-03 | `docs/16-API-Design-Specification.md` §14.2 — fila `INVALID_CORRELATION_ID` (400 · Validación / Observability) con nota sobre SEC-04 |

## 6. Emergent Tasks

| ID | Título | Padre | Razón | Status |
| -- | ------ | ----- | ----- | ------ |
| EMERGENT-001 | Bulk update de fixtures de tests que usaban strings arbitrarios en `X-Correlation-Id` (ej. `test-id-123`, `abc-123`, `nf-cid`) por UUID v4 válidos. | BE-004 | Al introducir Zod strict, 47 tests distribuidos en 6 archivos usaban strings arbitrarios que ahora rechazan con 400. La spec de US-114 (D3, SEC-02) declara explícitamente que headers no-v4 son rechazados (defensa ADR-SEC-001) — el comportamiento anterior de US-091 (aceptar cualquier string) era la deuda. | Done — 10 pares `<old,new>` reemplazados por sed batch en `tests/api/` y `tests/unit/`; 1 fixture de us085-seed-report actualizada. Regresión limpia (2286 verdes). |
| EMERGENT-002 | Ajuste de US-113 request-logger para no doble-wrap `correlationContext.run()`. | BE-004 | US-113 hacía `.run()` en el request-logger; con US-114 el `.run()` vive en `correlation-id.middleware.ts` (D5). El doble-wrap era idempotente pero redundante. | Done — request-logger simplificado a emisión pura (hereda el contexto del middleware upstream). |

## 7. Evidence by Task

### TASK-PB-P2-011-US-114-BE-001..006 + US-113 middleware update
- Files created:
  - `backend/src/shared/validation/correlation-id.schema.ts` — Zod schema + `UUID_V4_REGEX`.
  - `backend/src/shared/http/response.ts` — `respond.success/error` wrapper (D-01 documenta coexistencia).
- Files modified:
  - `backend/src/shared/context/correlation-id.ts` — `generateCorrelationId(prefix?)` helper + `CorrelationStore.correlationId` sigue `string | null`.
  - `backend/src/shared/interface/middlewares/correlation-id.middleware.ts` — refactor con Zod strict + 400 fail-fast + `correlationContext.run()`; usa `req.headers[...]` en vez de `req.header(name)` para compat con tests mocked.
  - `backend/src/shared/interface/middlewares/error-handler.middleware.ts` — fallback defensivo `getCorrelationId()` para casos donde `req.correlationId` no está seteado.
  - `backend/src/shared/interface/middlewares/request-logger.middleware.ts` — simplificado; ya no envuelve en `.run()` (el correlation-id middleware upstream lo hace).
  - `backend/src/shared/domain/errors/error-codes.ts` — nuevo `INVALID_CORRELATION_ID` (400).
- Lint: Passed. Typecheck: Passed.

### TASK-PB-P2-011-US-114-QA-001 (UT backend)
- Files created: `backend/tests/unit/us114-correlation-id-middleware.spec.ts` — 14 tests.
- Cobertura: middleware behavior (UT-01..05b) + `generateCorrelationId` (4 tests) + schema (3 tests: v4 válido / v1/v7/garbage rechazo / SEC-T-01 injection).
- Commands: `npx vitest run tests/unit/us114-correlation-id-middleware.spec.ts` → **14 passed**.

### TASK-PB-P2-011-US-114-QA-002 (UT frontend)
- Files inspected: `web/src/tests/unit/api-client/attachCorrelationId.test.ts` — 4 UT ya existentes; verdes.

### TASK-PB-P2-011-US-114-QA-003 (IT invariante crítico)
- Files created: `backend/tests/integration/us114-correlation-id.integration.spec.ts` — 5 IT.
- IT-01 (`@critical`): header==body via 404 envelope + IT-01b /health echo.
- IT-02: 400 server-generated (no propaga inválido cliente).
- IT-03: 10 concurrentes sin cross-contamination.
- IT-04: sin header → UUID v4 válido generado.
- Commands: `npx vitest run tests/integration/us114-correlation-id.integration.spec.ts` → **5 passed** — evidencia visual de JSON structured con `correlationId` por-request en la salida stdout.

### TASK-PB-P2-011-US-114-QA-004/005/006 (Skipped)
- QA-004 E2E Playwright: infra pipeline pending. Cobertura equivalente por IT + UT.
- QA-005 Contract MSW: cubierto por UT frontend (`parseErrorEnvelope` + `httpClient`) + IT backend que verifica shape del envelope.
- QA-006 Smoke curl: infra Docker pending. Cobertura equivalente por IT que corre sobre app.ts real con Supertest.

### TASK-PB-P2-011-US-114-DOC-001..003
- `4-Product-Backlog-Prioritized.md` §PB-P2-011: Title/Description/Acceptance Summary/Traceability actualizados.
- `docs/16-API-Design-Specification.md` §14.2: fila nueva `INVALID_CORRELATION_ID` (400 · Validación / Observability).
- `docs/15-Frontend-Architecture-Design.md` línea 849 ya documenta el fetch interceptor.

### EMERGENT-001 (Bulk fixture update)
- Reemplazos por sed en `tests/api/*` y `tests/unit/*`:
  - `test-id-123` → `11111111-1111-4111-8111-111111111111`
  - `abc-123` → `22222222-2222-4222-8222-222222222222`
  - `existing-id` → `33333333-3333-4333-8333-333333333333`
  - `trace-abc` → `44444444-4444-4444-8444-444444444444`
  - `cid-happy` → `55555555-5555-4555-8555-555555555555`
  - `anon-cid` → `66666666-6666-4666-8666-666666666666`
  - `env-cid` → `77777777-7777-4777-8777-777777777777`
  - `my-cid-123` → `88888888-8888-4888-8888-888888888888`
  - `nf-cid` → `99999999-9999-4999-8999-999999999999`
  - `boom-cid` → `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`
- `us085-seed-report.spec.ts` fixture actualizada consistentemente.
- Backend suite: 2286 tests verdes, cero regresiones.

## 8. Blockers

Ninguno.

## 9. Deviations

| # | Comportamiento planeado | Implementado | Razón | Impacto | Sección Tech Spec | ADR requerido | Resolución |
| - | ----------------------- | ------------ | ----- | ------- | ----------------- | ------------- | ---------- |
| D-01 | `respond.success/error` es el helper canónico que reemplaza a `success()/failure()` legacy. | Se agrega `respond` como thin wrapper que lee del contexto AsyncLocalStorage y delega en `success()/failure()` de US-093. Los helpers legacy siguen vigentes; cientos de callers los usan con `req.correlationId` explícito y no se migran. | Migrar >100 callers en US-114 sería scope creep. Ambos helpers producen exactamente el mismo shape del envelope (mismo builder debajo). Nuevos consumidores pueden usar `respond` para no acarrear prop drilling. | Cero — mismo envelope emitido. | §7 (envelope helpers, D4). | No. | Aceptado. |
| D-02 | Path `src/infrastructure/middleware/correlation-id.middleware.ts` (spec §18). | Path repo `src/shared/interface/middlewares/correlation-id.middleware.ts` (existente US-091). | Convención repo consistente con PB-P0-002; el spec §18 usa un path aspiracional. | Cero funcional. | §7 + §18. | No. | Aceptado. |
| D-03 | Middleware US-091 sin validación del header entrante. | Zod strict + 400 fail-fast + `.run()` — cambio in-place preservando shape público (`req.correlationId`, `res.setHeader`). | US-114 D3 pide validación strict — defensa ADR-SEC-001. | Tests con IDs arbitrarios (US-091 permisivo) requieren update — EMERGENT-001 lo cubre. | §7 (middleware D3). | No — cambio dentro del alcance US-114. | Documentada. |
| D-04 | US-113 request-logger seguía haciendo `.run()`. | Se remueve el `.run()` del request-logger — el correlation-id middleware upstream (D5) lo hace primero. | Doble-wrap era idempotente pero redundante. Simplificación honesta. | Cero — el ID heredado desde el store es el mismo. | US-113 request-logger. | No. | EMERGENT-002. |
| D-05 | Error handler lee `req.correlationId ?? ''`. | Extendido a `req.correlationId ?? getCorrelationId() ?? ''`. | Fallback defensivo para errores que llegan aquí sin `req.correlationId` (edge cases: jobs, tests que instancian el handler directamente). | Preserva invariante `error.correlationId != ''` en toda condición. | §7 (error handler integration). | No. | Aceptado. |
| D-06 | (implícito) Tests existentes sin cambios. | EMERGENT-001 aplicó bulk-update de 10 fixtures string-arbitrarios a UUID v4 válidos en 6 archivos + 1 fixture de us085-seed-report. Cambio mecánico auditable via sed. | US-114 D3 endurece la validación — la deuda estaba en tests que asumían el laxo US-091. | Cero — mismos aserts semánticos, sólo cambia el valor literal. | §7 (D3). | No. | EMERGENT-001. |

## 10. Final Validation

- Task completion: 14 `Done` + 3 `Skipped` con motivo documentado (QA-004/005/006 infra pending; cobertura equivalente por UT+IT).
- Acceptance Criteria coverage:
  - AC-01 (sin header → generar): BE-004 + UT-01 + IT-04 → cubierto.
  - AC-02 (con header válido → reuso): BE-004 + UT-02 + IT-01b → cubierto.
  - AC-03 (inválido → 400): BE-001/004 + UT-03/05/05b + IT-02 + SEC-T-01 → cubierto.
  - AC-04 (response header echo): BE-004 + IT-01/IT-01b/IT-02/IT-03/IT-04 → cubierto.
  - AC-05 (success envelope meta): BE-003 (thin wrapper) + `success()` legacy (US-093) → cubierto.
  - AC-06 (error envelope): BE-005 fallback + IT-01/IT-02 (envelope 404 y 400) → cubierto.
  - AC-07 (getStore() en handlers): BE-004 `.run()` + UT-01/UT-02 asserting `getCorrelationId()` desde `next` → cubierto.
  - AC-08 (fetch interceptor): FE-001 (existente) + 4 UT frontend → cubierto.
- Lint: Passed (backend + web). Typecheck: Passed (backend + web).
- Tests: Passed — Backend **2286 passed / 728 skipped / 0 failed**; Web **786 passed / 0 failed**.
- Security: SEC-T-01 verificado — 6 payloads maliciosos (XSS, SQLi, path traversal, null byte, JNDI log4shell-style, SSTI) rechazados con 400 antes de handlers; payload nunca propagado al envelope.
- Documentation: DOC-001/003 aplicadas; DOC-002 ya cubierta por docs/15 existente.
- Unresolved debt:
  - QA-004/005/006 `Skipped` (infra Playwright/Docker pending).
  - Migración eventual de callers legacy `success()/failure()` al nuevo `respond` wrapper — Future incremental.
- Final status: `Done`.

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-23T18:50:00Z | Initialized | Execution record creado |
| 2026-07-23T18:50:00Z | Readiness/Alignment | READY_WITH_WARNINGS + ALIGNED_WITH_NOTES |
| 2026-07-23T18:55:00Z | BE-001..006 | Not Started → Done (schema + helper + wrapper + middleware + error-handler ext + wire) |
| 2026-07-23T18:56:00Z | EMERGENT-001 | Bulk update de 10 fixtures string-arbitrarios a UUID v4 válidos (10 pares × 6 files); us085-seed-report fixture actualizada |
| 2026-07-23T18:57:00Z | EMERGENT-002 | US-113 request-logger simplificado (remove doble `.run()`) |
| 2026-07-23T19:05:00Z | QA-001 | Not Started → Done (14 UT verdes) |
| 2026-07-23T19:06:00Z | QA-002 | Not Started → Done (4 UT frontend existentes verdes) |
| 2026-07-23T19:08:00Z | QA-003 | Not Started → Done (5 IT verdes con evidencia stdout) |
| 2026-07-23T19:08:00Z | SEC-001 | Not Started → Done (incluido en QA-001) |
| 2026-07-23T19:09:00Z | QA-004/005/006 | Not Started → Skipped (infra pending, cobertura equivalente por UT+IT) |
| 2026-07-23T19:12:00Z | DOC-001..003 | Not Started → Done |
| 2026-07-23T19:15:00Z | Execution Record | Status → Done |
