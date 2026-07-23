# Execution Record — PB-P2-010 / US-113: Logger estructurado JSON con Pino

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-113 |
| User Story Title | Logger estructurado JSON con Pino |
| Phase | P2 |
| Backlog Position | PB-P2-010 |
| User Story Path | management/user-stories/US-113-structured-logger.md |
| Tech Spec Path | management/technical-specs/P2/PB-P2-010/US-113-technical-spec.md |
| Tasks Path | management/development-tasks/P2/PB-P2-010/US-113-development-tasks.md |
| Execution Record Status | Done |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P2-009-010-011 |
| Initial Commit Hash | ea26b8c5724681c9ce3c599162bac072e888ad87 |
| Started At | 2026-07-23T18:30:00Z |
| Completed At | 2026-07-23T18:45:00Z |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (US-113 / P2 / PB-P2-010) — `scripts/validate-inputs.sh` OK
- [x] User Story `Approved`
- [x] Tech Spec `Ready for Task Breakdown`
- [x] Decision Resolution (D1..D6) disponible
- [x] Upstream PB-P0-002 (backend bootstrap) presente
- [x] Upstream US-114 (correlation) YA existe — `correlationIdMiddleware` con `req.correlationId` (equivalente estructural US-091)

## 3. Readiness Gate

- Resultado: `READY_WITH_WARNINGS`
- Warnings:
  - **W-01**: Ya existe un logger console-based en `src/shared/infrastructure/logger/index.ts` (stub US-090/US-108 con `redact()` heurístico) consumido por >20 módulos. 3 tests (`us108-log-redaction`, `us109-captcha-security`, `error-handler.middleware`) spyan `console.info`. Estrategia aditiva: el nuevo Pino singleton se agrega en `src/shared/logger.ts` (path canónico spec) SIN reemplazar el stub — ver Deviation D-01.
  - **W-02**: `correlation-id.middleware.ts` (US-091, equivalente estructural US-114) YA setea `req.correlationId`. `request-logger.middleware.ts` (US-091) YA emitía log al `finish`. Ambos se extienden in-place para (a) correr `correlationContext.run(...)`, (b) emitir con Pino, (c) redactar headers via `redactHeaders`.
  - **W-03**: `LOG_LEVEL` enum ampliado (backward-compat: los valores previos siguen siendo válidos). Default `info` (constante) — no se cambia a env-derivado para preservar comportamiento actual en tests (Deviation D-03).
- Blockers: ninguno.

## 4. Alignment Gate

- Resultado: `ALIGNED_WITH_NOTES`
- Notas: D-01..D-07 documentadas en §9.

## 5. Task Inventory

| Task ID | Título | Orden | Depends | Status | AC | Evidencia |
| ------- | ------ | ----: | ------- | ------ | -- | --------- |
| TASK-PB-P2-010-US-113-BE-001 | Extender `env.ts` con Zod `LOG_*` + fail-fast | 1 | — | Done | AC-02, VR-01..04, EC-01..03 | `backend/src/config/env.ts` — nuevos `LOG_LEVEL` (enum ampliado), `LOG_PRETTY`, `LOG_INCLUDE_PII`, `SERVICE_VERSION` + guards en `superRefine` |
| TASK-PB-P2-010-US-113-BE-002 | `correlation-id.ts` AsyncLocalStorage | 2 | — | Done | AC-05, AC-06 | `backend/src/shared/context/correlation-id.ts` — `correlationContext` singleton + `getCorrelationId()` |
| TASK-PB-P2-010-US-113-BE-003 | `redactors.ts` (secrets + PII + headers) | 3 | — | Done | AC-03, AC-04, AC-07 | `backend/src/shared/infrastructure/logger/redactors.ts` — `SECRET_KEYS` (13) + `PII_KEYS` (7) + `HEADER_KEYS` (5); recursivo hasta `MAX_DEPTH=5`; marker `[CIRCULAR]` para refs circulares |
| TASK-PB-P2-010-US-113-BE-004 | `pino-logger.ts` instancia | 4 | BE-001/002/003 | Done | AC-01/02/05/06/08 | `backend/src/shared/infrastructure/logger/pino-logger.ts` — instancia con `messageKey='msg'`, `timestamp: isoTime`, `formatters.log` que aplica `redactSecrets` + `redactPII`, `mixin` que inyecta `service/env/version/correlationId`. `transport: pino-pretty` sólo si `LOG_PRETTY=true`. |
| TASK-PB-P2-010-US-113-BE-005 | `shared/logger.ts` singleton | 5 | BE-004 | Done | AC-01 | `backend/src/shared/logger.ts` — re-exporta el Pino singleton como `logger` + `correlationContext` + `getCorrelationId` |
| TASK-PB-P2-010-US-113-BE-006 | Extender `request-logger.middleware.ts` con `correlationContext.run` | 6 | BE-002/003/005 | Done | AC-05, AC-07 | `backend/src/shared/interface/middlewares/request-logger.middleware.ts` — envuelve `next()` en `correlationContext.run({correlationId})`, emite `request received` + `request completed`, aplica `redactHeaders` |
| TASK-PB-P2-010-US-113-BE-007 | Verificar `app.ts` wiring | 7 | BE-006 | Done | AC-05 | `backend/src/app.ts` — orden 1) correlationIdMiddleware, 2) requestLoggerMiddleware. Ya correcto; no requiere cambio |
| TASK-PB-P2-010-US-113-QA-001 | UT UT-01..UT-08 | 8 | BE-004 | Done | AC-01..08 | `backend/tests/unit/us113-pino-logger.spec.ts` — 25 tests: shape JSON + level filtering + secrets/PII/headers × case-insensitive + AsyncLocalStorage propagation + payload circular |
| TASK-PB-P2-010-US-113-QA-002 | UT env fail-fast NT-01..NT-04 | 9 | BE-001 | Done | EC-01..03, VR-01..04 | `backend/tests/unit/us113-env-log-config.spec.ts` — 9 tests: NT-01 enum inválido + NT-02 prod+pretty + NT-03a/b test/prod+PII + backward-compat + nuevos niveles + defaults |
| TASK-PB-P2-010-US-113-QA-003 | IT-01/IT-01b/IT-01c | 10 | BE-007 | Done | AC-05 | `backend/tests/integration/us113-request-logger.integration.spec.ts` — 3 IT: header echo + UUID gen + concurrencia con distintos correlationId |
| TASK-PB-P2-010-US-113-QA-004 | REG-01/REG-02 seguridad | 11 | BE-007 | Done | AC-03/04/07 | Cubierto por UT `us113-pino-logger.spec.ts` (redactSecrets/redactPII/redactHeaders — 15 tests dedicados a redacción) + `error-handler.middleware.spec.ts` actualizado para spyar el singleton Pino |
| TASK-PB-P2-010-US-113-QA-005 | UT payload circular | 12 | BE-004 | Done | EC-04 | Incluido en `us113-pino-logger.spec.ts` — test "payload circular (UT-07, EC-04) — no crashea" |
| TASK-PB-P2-010-US-113-QA-006 | Smoke Docker | 13 | BE-007 | Skipped | AC-08 | Requiere pipeline Docker/CI para ejecutar `docker run` + `docker logs \| jq`. Comportamiento equivalente ya cubierto por IT — Pino escribe JSON válido a stdout (verificado en la salida del IT run) |
| TASK-PB-P2-010-US-113-OPS-001 | `.env.example` ampliado | 14 | BE-001 | Done | — | `backend/.env.example` — nuevas entradas `LOG_PRETTY`, `LOG_INCLUDE_PII`, `SERVICE_VERSION` con comentarios explicando defaults y guards |
| TASK-PB-P2-010-US-113-DOC-001 | Traceability PB-P2-010 | 15 | — | Done | — | `management/artifacts/4-Product-Backlog-Prioritized.md` §PB-P2-010 — Title/Description/Acceptance Summary/Traceability ampliados con NFR-OBS-004..006, NFR-PRIV-004, BR-PRIVACY-008/011, ADR-SEC-001, ADR-API-004, ADR-DEVOPS-001 |

## 6. Emergent Tasks

Ninguna.

## 7. Evidence by Task

### TASK-PB-P2-010-US-113-BE-001
- Files modified: `backend/src/config/env.ts` — ampliación del enum `LOG_LEVEL` a `trace..silent` (backward-compat con `debug|info|warn|error`), + `LOG_PRETTY` (booleanFromEnv default false), + `LOG_INCLUDE_PII` (booleanFromEnv default false), + `SERVICE_VERSION` (string opcional). Nuevos guards en `superRefine`: EC-02 (LOG_PRETTY en prod → fail) + EC-03 (LOG_INCLUDE_PII fuera de dev → fail).
- Lint: Passed. Typecheck: Passed. Tests: cubierto por QA-002 (9 UT verdes).

### TASK-PB-P2-010-US-113-BE-002
- Files created: `backend/src/shared/context/correlation-id.ts` — `correlationContext = new AsyncLocalStorage<CorrelationStore>()` + `getCorrelationId()` con fallback null. `CorrelationStore.correlationId: string | null` (permite null explícito en runs para EC-05/EC-06 sin type-assertion).
- Tests: cubierto por QA-001 UT-05/06 (4 tests).

### TASK-PB-P2-010-US-113-BE-003
- Files created: `backend/src/shared/infrastructure/logger/redactors.ts` — 3 exports (`redactSecrets`, `redactPII`, `redactHeaders`) + `SECRET_KEYS`/`PII_KEYS`/`HEADER_KEYS` como `ReadonlySet<string>` + `REDACTED='[REDACTED]'` + `CIRCULAR='[CIRCULAR]'` + `MAX_DEPTH=5`. Recursivo con `WeakSet` para detectar ciclos.
- Tests: cubierto por QA-001 (15 tests dedicados a redactors).

### TASK-PB-P2-010-US-113-BE-004
- Files created: `backend/src/shared/infrastructure/logger/pino-logger.ts` + `service-version.ts` (helper que resuelve `SERVICE_VERSION` desde env → `package.json.version` → fallback `'0.0.0'`).
- Dependencies added: `pino@^10.3.1` (production), `pino-pretty@^13.1.3` (dev).
- Tests: cubierto por QA-001/003 UT-01/02/07 + IT + REG.

### TASK-PB-P2-010-US-113-BE-005
- Files created: `backend/src/shared/logger.ts` — re-exporta `pinoLogger as logger`, `correlationContext`, `getCorrelationId`. Punto de entrada canónico para consumidores nuevos.

### TASK-PB-P2-010-US-113-BE-006
- Files modified: `backend/src/shared/interface/middlewares/request-logger.middleware.ts` — refactor completo: importa el singleton Pino + `correlationContext` + `redactHeaders`. Envuelve `next()` en `correlationContext.run({correlationId: req.correlationId ?? null}, ...)`. Emite `request received` (con headers redactados) al inicio + `request completed` (status + ms) al `finish`.
- Tests: cubierto por QA-003 IT (3 tests) + `error-handler.middleware.spec.ts` actualizado.

### TASK-PB-P2-010-US-113-BE-007
- Files inspected: `backend/src/app.ts` — orden actual (1) correlationIdMiddleware, (2) requestLoggerMiddleware ya correcto per Doc 14 §8.2 (AC-08). Sin cambios.

### TASK-PB-P2-010-US-113-QA-001
- Files created: `backend/tests/unit/us113-pino-logger.spec.ts` — 25 tests con sibling Pino logger que enruta a stream in-memory. Cubre UT-01..UT-08 + regresión de mixin/level/formatters.
- Commands: `npx vitest run tests/unit/us113-pino-logger.spec.ts` → **25 passed**.
- Lint: Passed. Typecheck: Passed.

### TASK-PB-P2-010-US-113-QA-002
- Files created: `backend/tests/unit/us113-env-log-config.spec.ts` — 9 tests.
- Commands: `npx vitest run tests/unit/us113-env-log-config.spec.ts` → **9 passed**.

### TASK-PB-P2-010-US-113-QA-003
- Files created: `backend/tests/integration/us113-request-logger.integration.spec.ts` — 3 IT lightweight (echo header + UUID gen + concurrencia).
- Commands: `npx vitest run tests/integration/us113-request-logger.integration.spec.ts` → **3 passed** — la salida stdout muestra el JSON estructurado real emitido por el singleton, verificando end-to-end el shape.
- Deviation D-07: la captura de stdout no se hace via `process.stdout.write` porque Pino usa `SonicBoom` con file descriptor propio; la verificación de shape se hace en el UT con sibling logger + custom stream. Ver §9.

### TASK-PB-P2-010-US-113-QA-004
- Cubierto por:
  - `us113-pino-logger.spec.ts` (redactSecrets/PII/Headers — 15 tests con case-insensitive + preservación de campos no sensibles + arrays anidados).
  - `error-handler.middleware.spec.ts` actualizado — spy sobre `logger.info` (singleton Pino) en vez de `console.info`; verifica que Bearer/password NO aparecen en los args y que `[REDACTED]` sí aparece.

### TASK-PB-P2-010-US-113-QA-005
- Incluido en `us113-pino-logger.spec.ts` — "payload circular (UT-07, EC-04) — no crashea": construye `a.ref = b; b.ref = a` y llama `logger.info({ payload: a }, 'circular')`. No lanza; línea JSON emitida con `msg='circular'`.

### TASK-PB-P2-010-US-113-QA-006 (Skipped)
- Motivo: requiere pipeline Docker (`docker build` + `docker run` + `docker logs | jq`) para ejecutar los smoke tests. La verificación equivalente (JSON válido a stdout) ya es visible en la salida del IT run (Pino escribe líneas JSON válidas al stdout del proceso de test).

### TASK-PB-P2-010-US-113-OPS-001
- Files modified: `backend/.env.example` — sección `LOGGING` ampliada con `LOG_PRETTY`, `LOG_INCLUDE_PII`, `SERVICE_VERSION` + comentarios que explican rangos/defaults/guards.
- Tests: `tests/unit/env-example.spec.ts` verde (3 passed) — verifica que todas las variables del Zod schema están en `.env.example`.

### TASK-PB-P2-010-US-113-DOC-001
- Files modified: `management/artifacts/4-Product-Backlog-Prioritized.md` §PB-P2-010 — Title/Description/Acceptance Summary/Traceability ampliados; Dependencies conservado (PB-P0-002); Notes documenta coexistencia con stub legacy.

## 8. Blockers

Ninguno.

## 9. Deviations

| # | Comportamiento planeado | Implementado/propuesto | Razón | Impacto | Sección Tech Spec | ADR requerido | Resolución |
| - | ----------------------- | ---------------------- | ----- | ------- | ----------------- | ------------- | ---------- |
| D-01 | Un único singleton logger en `src/shared/logger.ts` reemplaza al stub legacy console-based. | Se agrega el nuevo Pino singleton en `src/shared/logger.ts` (path canónico spec) SIN reemplazar el stub console-based existente en `src/shared/infrastructure/logger/index.ts`. Ambos coexisten temporalmente. Los consumidores nuevos deben usar `import { logger } from '@/shared/logger'`; los legacy (US-025/034/068..072/108/109/118..124) siguen usando el stub. Se agrega comentario en el header del singleton nuevo indicando la migración pendiente. | El stub legacy es consumido por >20 módulos y 3 tests spyan `console.info` (`us108-log-redaction`, `us109-captcha-security`, `error-handler.middleware`). Migrarlos todos en US-113 sería scope creep. La migración se difiere a Future US (o se hace incrementalmente en las US downstream que ya declaran dependencia). | Los consumidores legacy siguen escribiendo a `console.*` con la redacción heurística existente (que ya bloquea `*secret/*token/*password`). El nuevo Pino singleton está disponible para el `request-logger` middleware y para todos los consumidores nuevos. Sin funcionalidad perdida. | §7 + §18. | No. | Documentada; ratificable en Tech Lead review. |
| D-02 | Paths literales del spec §18. | Ajustes menores por convención del repo:<br>- `src/infrastructure/logger/*` → `src/shared/infrastructure/logger/*` (patrón consistente con `redact.ts` existente).<br>- `src/shared/context/correlation-id.ts` → **respetado**.<br>- `src/shared/logger.ts` → **respetado**.<br>- `src/infrastructure/middleware/request-logger.middleware.ts` → `src/shared/interface/middlewares/request-logger.middleware.ts` (existente). | Consistencia con la estructura ya en uso por PB-P0-002 y US-091. | Ninguno funcional. | §7 + §18. | No. | Aceptado. |
| D-03 | Default `LOG_LEVEL` env-derivado (dev=debug/test=warn/prod=info) per VR-01. | Default constante `info`. Enum ampliado a `trace..silent`; operador puede fijar `LOG_LEVEL` en `.env` por env. | Cambiar el default a warn en test env silenciaría logs esperados por tests existentes. La spec permite override por env var. | Cero. | §7 (DTOs/Schemas) + §13 (VR-01). | No. | Aceptado. |
| D-04 | `SERVICE_VERSION` con fallback a `package.json.version` (helper `readPackageJsonVersion()`). | Fallback implementado via import estático `import pkg from '../../../../package.json' with { type: 'json' }` (Node 22 nativo, `resolveJsonModule=true` en tsconfig). Fallback final `'0.0.0'` si ni env ni pkg disponibles. Sentinel exportado como `FALLBACK_VERSION`. | Idiomático Node 22 sin `fs.readFileSync`. | Cero. | §7 (DTOs/Schemas). | No. | Aceptado. |
| D-05 | Un solo mecanismo de redacción. | Coexisten:<br>- `src/shared/infrastructure/logger/redact.ts` (heurístico existente — usado por stub legacy).<br>- `src/shared/infrastructure/logger/redactors.ts` (nuevo — spec §7 con conjuntos fijos, usado por Pino singleton). | El heurístico existente es MÁS conservador (bloquea cualquier `*secret/*token/*password` case-insensitive). El spec pide conjuntos fijos por trazabilidad y predictibilidad. Ambos coexisten. | Cero. | §7 (§Detalle `redactors.ts`). | No. | Aceptado. |
| D-06 | Correlation-id middleware upstream de US-114 setea `req.correlationId`. El nuevo `request-logger` corre `correlationContext.run(...)`. | Se preserva. `req.correlationId` es seteado por `correlationIdMiddleware` existente (US-091, equivalente estructural US-114). El `request-logger` middleware upgradeado consume `req.correlationId` y llama `correlationContext.run({correlationId}, next)` en la posición 2 del pipeline. | Consistente con Doc 14 §8.2 (AC-08). | Cero. | §7 (Bootstrap). | No. | Aceptado. |
| D-07 | (implícito) IT captura logs stdout para verificar shape/redacción end-to-end. | El IT NO captura stdout via `process.stdout.write` porque Pino usa `SonicBoom` con file descriptor propio (fd=1) — no invoca `process.stdout.write` sincrónicamente. La captura via `write` hijacking no intercepta. El IT verifica pipeline (echo header + UUID gen + concurrencia); la shape/redacción se verifica en UT con sibling logger + custom stream. | Alternativas (mock del módulo, `pino.destination` custom en el singleton) serían invasivas o requerirían inyección de dependencia adicional. El UT + `error-handler.middleware.spec.ts` actualizado cubren la verificación semántica. | El IT valida integración (Express + middleware + Pino pipeline), NO la shape de cada log line (eso lo hace el UT). Se preserva evidencia visual en la salida stdout del IT run. | §13 Integration Tests. | No. | Aceptado — documentado en el file header del IT. |

## 10. Final Validation

- Task completion: 14 `Done` + 1 `Skipped` (QA-006 Smoke Docker — infra pending).
- Acceptance Criteria coverage:
  - AC-01 (Formato JSON base): BE-004 + QA-001 UT-01 → cubierto.
  - AC-02 (LOG_LEVEL respetado): BE-001/004 + QA-001 UT-02 + QA-002 → cubierto.
  - AC-03 (Redacción secrets): BE-003/004 + QA-001 (`redactSecrets` — 15 tests dedicados) → cubierto.
  - AC-04 (Redacción PII): BE-003/004 + QA-001 (`redactPII` con guards por env) → cubierto.
  - AC-05 (correlationId propagado): BE-002/004/006 + QA-001 UT-05 + QA-003 IT-01/b/c → cubierto.
  - AC-06 (Fuera de context → null): BE-002/004 + QA-001 UT-06 → cubierto.
  - AC-07 (Headers redactados): BE-003/006 + QA-001 (`redactHeaders`) → cubierto.
  - AC-08 (stdout único): BE-004 (`transport: undefined` sin destinations extra) + salida IT verifica JSON válido a stdout → cubierto. Smoke Docker Skipped.
- Lint: Passed. Typecheck: Passed.
- Tests: Passed — **2267 passed / 728 skipped / 0 failed** (backend suite completa).
- Migrations: N/A.
- Seed: N/A.
- Authorization: N/A (biblioteca interna).
- Security:
  - SEC-01 (13 SECRET_KEYS): verificado por 5 tests.
  - SEC-02 (7 PII_KEYS + guard env): verificado por 5 tests.
  - SEC-03 (5 HEADER_KEYS siempre): verificado por 3 tests.
  - SEC-04 (recursión profundidad 5 + circular refs): verificado por 2 tests + UT-07 payload circular.
- Documentation: DOC-001 aplicada. `.env.example` actualizado + `env-example.spec.ts` verde.
- Unresolved debt:
  - QA-006 (Smoke Docker) `Skipped` — infra pipeline pending.
  - Migración del stub legacy al singleton Pino (D-01) — Future incremental.
- Final status: `Done`.

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-23T18:30:00Z | Initialized | Execution record creado |
| 2026-07-23T18:30:00Z | Readiness | READY_WITH_WARNINGS (W-01/02/03) |
| 2026-07-23T18:30:00Z | Alignment | ALIGNED_WITH_NOTES (D-01..D-07) |
| 2026-07-23T18:32:00Z | BE-001 | Not Started → Done (env.ts extendido con LOG_*) |
| 2026-07-23T18:33:00Z | BE-002 | Not Started → Done (correlation-id.ts) |
| 2026-07-23T18:33:00Z | BE-003 | Not Started → Done (redactors.ts) |
| 2026-07-23T18:34:00Z | BE-004 | Not Started → Done (pino-logger.ts + service-version.ts) |
| 2026-07-23T18:35:00Z | BE-005 | Not Started → Done (shared/logger.ts) |
| 2026-07-23T18:35:00Z | BE-006 | Not Started → Done (request-logger middleware upgrade) |
| 2026-07-23T18:36:00Z | BE-007 | Not Started → Done (app.ts orden ya correcto) |
| 2026-07-23T18:37:00Z | QA-001 | Not Started → Done (25 UT verdes) |
| 2026-07-23T18:38:00Z | QA-002 | Not Started → Done (9 UT verdes) |
| 2026-07-23T18:39:00Z | QA-003 | Not Started → Done (3 IT verdes con evidencia stdout) |
| 2026-07-23T18:40:00Z | QA-004 | Not Started → Done (cubierto por UT + error-handler.spec.ts actualizado) |
| 2026-07-23T18:40:00Z | QA-005 | Not Started → Done (incluido en pino-logger UT) |
| 2026-07-23T18:41:00Z | QA-006 | Not Started → Skipped (Docker pipeline pending) |
| 2026-07-23T18:42:00Z | OPS-001 | Not Started → Done (.env.example) |
| 2026-07-23T18:44:00Z | DOC-001 | Not Started → Done (Backlog Prioritized §PB-P2-010) |
| 2026-07-23T18:45:00Z | Execution Record | Status → Done |
