# Execution Record — PB-P0-014 / US-086: Admin reset surgical del entorno Demo vía endpoint HTTP

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-086 |
| User Story Title | Admin reset surgical del entorno Demo vía endpoint HTTP |
| Phase | P0 |
| Backlog Position | PB-P0-014 |
| User Story Path | management/user-stories/US-086-admin-reset-demo.md |
| Tech Spec Path | management/technical-specs/P0/PB-P0-014/US-086-technical-spec.md |
| Tasks Path | management/development-tasks/P0/PB-P0-014/US-086-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | last-modified 2026-07-08 |
| Execution Record Status | Done |
| Readiness Status | READY |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | foundation/PB-PO-012_PB-P0-013_PB-P0-014 |
| Initial Commit Hash | 75543736a6bcfd52627ee6c81a5d9e8cfdfaad80 |
| Started At | 2026-07-10T16:16:00Z |
| Last Updated At | 2026-07-10T16:38:49Z |
| Completed At | 2026-07-10T16:38:49Z |
| Claude Session ID | b6f01256-49aa-46ca-a9c2-90b96c289f27 |
| Executor Type | Claude Code |

> Git Safety: working tree contiene cambios NO commiteados del frontend US-103..107 y del backend US-085.
> US-086 toca `backend/`; preserva todo lo previo y no commitea/push/PR sin solicitud.

## 2. Source Validation

- [x] Rutas validadas — los 3 documentos existen y son legibles
- [x] User Story ID coincide — US-086
- [x] Phase coincide — P0
- [x] Backlog Position coincide — PB-P0-014
- [x] Documentos legibles
- [x] IDs de tarea extraídos (20 tareas: OPS-001, BE-001..006, SEC-001/002, DB-001, OBS-001, QA-001..006, SEED-001, DOC-001/002)

## 3. Readiness Gate

- Resultado: READY
- Checks:
  - US status `Approved`, `Approved By: PO/BA Review` (2026-06-22), `Ready for Development Tasks: Yes`. PASS
  - AC-01..AC-04 + EC-01..03 + VR-01..05 + SEC-01..08 testeables. PASS
  - Tech Spec `Ready for Task Breakdown`. PASS
  - Tasks File con 20 IDs `TASK-...`. PASS
  - `DEVELOPMENT_CONVENTIONS.md` legible. PASS
  - Dependencias: PB-P0-001 (schema/`is_seed`/AdminAction), PB-P0-002 (backend bootstrap, middlewares auth/rol), **US-085 (`SeedDemoDataUseCase`)** — commiteadas/entregadas. PASS
  - No execution record previo para US-086. PASS
- Warnings: Ninguno bloqueante
- Blockers: Ninguno
- Decision files: `decision-resolutions/US-086-*` → No existe (N/A, no requerido)
- Refinement files: `refinement-reviews/US-086-*` → No existe

## 4. Alignment Gate

- Resultado: ALIGNED_WITH_NOTES
- Tasks vs Tech Spec: 20 tareas derivan de la spec (§7, §9, §12, §13, §18, §19). Cubren lock, `ResetDemoUseCase`,
  DTO+Zod, controller, registro condicional por flag, `GET /status`, auth/rol, `404` fingerprinting, índices,
  observabilidad+`AdminAction`, tests (unit/integration/authz/concurrencia/surgical), docs. PASS
- Tech Spec vs Conventions: módulo `seed-demo`, controller thin → use case → repos, Zod strict, errores tipados
  con mapper HTTP, `is_seed` filtro surgical, `AdminAction` auditoría, gating por env, sin PII. PASS
- Tasks vs Acceptance Criteria: AC-01→BE-002/003/004+QA-001/002; AC-02→BE-002+QA-002; AC-03→OBS-001+QA-003;
  AC-04→BE-006+QA-004; EC-01→BE-005+SEC-002+QA-005; EC-02→BE-002+OBS-001+QA-006; EC-03→BE-001+BE-002+QA-006.
  Ningún AC huérfano. PASS
- Hallazgos de arquitectura: reset surgical (`is_seed=true`), `404` ante flag off (no `403`/`503`),
  `AdminAction` obligatorio, repoblado delegado en `SeedDemoDataUseCase` (no reimplementar). Sin nuevas entidades.
- Notas de alineación (no bloqueantes):
  - N1: Doc 16 §39.2 lista `/admin/seed/reset` sin prefijo; se implementa `/api/v1/admin/seed/reset` (Doc 16 §3.1).
  - N2: El spec referencia paths `apps/api/src/...`; el repo real usa `backend/src/modules/...` → se adapta.
  - N3: `AdminAction.action` — verificar si es enum Prisma (requeriría los valores `SEED_RESET`/`SEED_RESET_FAILED`)
    o String libre. Si es enum sin esos valores, se documenta desviación y se usa el valor válido más cercano.

## 5. Task Inventory

| Task ID | Título | Orden | Status | Started | Completed | AC | Evidencia |
| ------- | ------ | ----: | ------ | ------- | --------- | -- | --------- |
| TASK-PB-P0-014-US-086-OPS-001 | Config `SEED_DEMO_ENABLED` + `SEED_BATCH_SIZE` por entorno | 1 | Done | 16:16Z | 16:38Z | EC-01 | `config/env.ts` (+2 keys) + `.env.example`; test `env-example.spec.ts` verde. Ver D1 (coexiste con `SEED_ENABLED`) |
| TASK-PB-P0-014-US-086-DB-001 | Verificar índices `is_seed` (coord. US-101) | 2 | Done | 16:16Z | 16:38Z | NFR-PERF-001 | Índices `is_seed` (US-101) presentes en entidades de alta cardinalidad; sin cambio de schema. Ver D5 |
| TASK-PB-P0-014-US-086-BE-001 | Lock `seed-reset` (semáforo in-memory) | 3 | Done | 16:16Z | 16:38Z | EC-03 | `application/seed-reset.lock.ts` + 4 unit tests (`us086-seed-reset-lock.spec.ts`) |
| TASK-PB-P0-014-US-086-BE-003 | DTO `ResetReport` + `ResetRequestSchema` (Zod strict) | 4 | Done | 16:16Z | 16:38Z | AC-01,VR-01 | `interface/seed-demo.dto.ts` (`.strict()`); NT-04 verde (400) |
| TASK-PB-P0-014-US-086-BE-002 | `ResetDemoUseCase` (limpieza surgical + repoblado + audit) | 5 | Done | 16:16Z | 16:38Z | AC-01,02,03,EC-02,03 | `application/reset-demo.use-case.ts`; deletes FK-desc `is_seed=true`, `$transaction`, seedRunnerFactory, auditoría. 3 unit + integración |
| TASK-PB-P0-014-US-086-SEC-001 | `requireAuth` + `requireRole('admin')` en la ruta | 6 | Done | 16:16Z | 16:38Z | SEC-01,VR-03,04 | `sessionAuth` + `roleMiddleware(['admin'])` en `seed-demo.routes.ts`; NT-01 (401) y NT-02 (403) verdes |
| TASK-PB-P0-014-US-086-BE-004 | `POST /api/v1/admin/seed/reset` en `SeedDemoController` | 7 | Done | 16:16Z | 16:38Z | AC-01,03 | `interface/seed-demo.controller.ts` + `seed-demo.routes.ts`; TS-01 (202) verde |
| TASK-PB-P0-014-US-086-BE-005 | Registro condicional de rutas según flag | 8 | Done | 16:16Z | 16:38Z | EC-01 | `isSeedDemoEnabled()` + montaje condicional en `app.ts`; NT-03 (404) verde |
| TASK-PB-P0-014-US-086-BE-006 | `GET /api/v1/admin/seed/status` refleja último reset | 9 | Done | 16:16Z | 16:38Z | AC-04 | `application/get-seed-status.use-case.ts`; TS-04 verde (`lastRunAt` + `recordCount`) |
| TASK-PB-P0-014-US-086-OBS-001 | Logs estructurados + correlationId + `AdminAction` | 10 | Done | 16:16Z | 16:38Z | AC-03,EC-02 | Logs `seed.reset.{started,completed,failed,conflict}` + `AdminAction` con correlationId; TS-03 verde |
| TASK-PB-P0-014-US-086-SEC-002 | Test `404` indistinguible (fingerprinting) | 11 | Done | 16:16Z | 16:38Z | EC-01,SEC-02,03 | Test NT-03: `404` con mismo `error.code` que ruta inexistente |
| TASK-PB-P0-014-US-086-QA-001 | Unit tests `ResetDemoUseCase` | 12 | Done | 16:16Z | 16:38Z | AC-01,02,03,EC-02 | `us086-reset-demo-use-case.spec.ts` (3 tests): happy/orden/surgical/audit |
| TASK-PB-P0-014-US-086-QA-002 | Integration endpoint (happy+idempotencia+surgical) | 13 | Done | 16:16Z | 16:38Z | AC-01,02,SEC-04 | `us086-seed-reset.integration.spec.ts` TS-01/TS-02/TS-05 verdes contra BD real |
| TASK-PB-P0-014-US-086-QA-003 | Tests auditoría `AdminAction` | 14 | Done | 16:16Z | 16:38Z | AC-03 | TS-03: `SEED_RESET`, `is_seed=false`, correlationId en metadata |
| TASK-PB-P0-014-US-086-QA-004 | Tests `GET /status` post-reset | 15 | Done | 16:16Z | 16:38Z | AC-04 | TS-04 verde |
| TASK-PB-P0-014-US-086-QA-005 | Tests autorización (401/403/404) | 16 | Done | 16:16Z | 16:38Z | SEC-01..05,EC-01 | NT-01 (401), NT-02 (403), NT-03 (404) verdes |
| TASK-PB-P0-014-US-086-QA-006 | Tests concurrencia + falla parcial | 17 | Done | 16:16Z | 16:38Z | EC-02,03 | Unit deterministas: EC-03 (`SeedResetInProgressError`) + EC-02 (`SeedResetFailedError` + audit). Ver D3 |
| TASK-PB-P0-014-US-086-SEED-001 | Preservación filas `is_seed=false` (SD-T-02) | 18 | Done | 16:16Z | 16:38Z | SEC-04 | TS-05: admin (`is_seed=false`) sobrevive al reset; unit verifica filtro `is_seed=true` en todos los deletes |
| TASK-PB-P0-014-US-086-DOC-001 | Runbook demo + guía de API (`404`) | 19 | Done | 16:16Z | 16:38Z | AC-01,EC-01 | Sección "Reset surgical Demo" en `docs/operations/seed.md` (curl, códigos, nota 404) |
| TASK-PB-P0-014-US-086-DOC-002 | README módulo `seed-demo` + `ResetReportDto` | 20 | Done | 16:16Z | 16:38Z | AC-01 | `src/modules/seed-demo/README.md` (endpoints, DTOs, boundaries) |

## 6. Emergent Tasks

| ID | Título | Tarea padre | Razón | Necesidad | Impacto scope | Impacto Tech Spec | Status | Evidencia |
| -- | ------ | ----------- | ----- | --------- | ------------- | ----------------- | ------ | --------- |
| — | Ninguna aún | — | — | — | — | — | — | — |

## 7. Evidence by Task

**Artefactos creados/modificados (backend/):**
- `src/config/env.ts` — `SEED_DEMO_ENABLED` (booleanFromEnv) + `SEED_BATCH_SIZE` en `configSchema`.
- `.env.example` — ambas vars documentadas bajo la sección SEED.
- `src/shared/domain/errors/error-codes.ts` — `SEED_RESET_IN_PROGRESS`, `SEED_RESET_FAILED`.
- `src/shared/domain/errors/seed-demo.errors.ts` (nuevo) — `SeedResetInProgressError` (409),
  `SeedResetFailedError` (500).
- `src/shared/interface/middlewares/error-handler.middleware.ts` — 2 branches (antes de `ConflictError`).
- `src/modules/seed-demo/application/seed-reset.lock.ts` (nuevo) — semáforo in-memory.
- `src/modules/seed-demo/application/reset-demo.use-case.ts` (nuevo) — orquestador surgical + audit.
- `src/modules/seed-demo/application/get-seed-status.use-case.ts` (nuevo) — `GET /status`.
- `src/modules/seed-demo/infrastructure/deterministic-seed-ai.provider.ts` (nuevo) — AI local (boundary).
- `src/modules/seed-demo/interface/{seed-demo.dto.ts, seed-demo.controller.ts, seed-demo.routes.ts}` (nuevos).
- `src/app.ts` — import + montaje condicional `/admin/seed` según `isSeedDemoEnabled()`.
- `docs/operations/seed.md` — sección "Reset surgical Demo" (DOC-001).
- `src/modules/seed-demo/README.md` (nuevo) — contrato del endpoint + boundaries (DOC-002).
- `tests/unit/us086-seed-reset-lock.spec.ts` (4) + `tests/unit/us086-reset-demo-use-case.spec.ts` (3).
- `tests/api/us086-seed-reset.integration.spec.ts` (9).

**Validación agregada (comandos ejecutados):**
- `npm run typecheck` → 0 errores (backend completo).
- `npm run lint` (`eslint src tests`) → 0 errores/0 warnings (boundary ADR-ARCH-001 respetado: seed-demo
  NO importa `ai-assistance`; usa AI determinista local).
- **Suite completa `npx vitest run` contra Postgres local real → 97 archivos, 839 tests verdes + 2 todo**
  (sin regresiones por los cambios en `env.ts`/`error-handler`/`app.ts`).
- US-086: 16 tests (7 unit + 9 integración). Códigos HTTP verificados end-to-end contra BD real:
  202 (happy), 401 (sin sesión), 403 (organizer), 400 (Zod strict), 404 (flag off, indistinguible),
  idempotencia (recordCount estable), surgical (admin `is_seed=false` sobrevive), `AdminAction` SEED_RESET.

> Entorno de validación: contenedor Docker local aislado (`ef-eventflow`). Credenciales NO versionadas.
> Helper de auth admin en tests: registrar organizer → `prisma.user.update` rol admin → login (el endpoint
> público de registro no permite crear admin directamente; `findValid` resuelve el rol vivo desde BD).

## 8. Blockers

| Blocker ID | Tarea afectada | Tipo | Descripción | Detectado | Decisión requerida | Rol responsable | Estado |
| ---------- | -------------- | ---- | ----------- | --------- | ------------------ | --------------- | ------ |
| — | — | — | Ninguno | — | — | — | — |

## 9. Deviations

| # | Comportamiento planeado | Implementado/propuesto | Razón | Impacto | Convención afectada | Sección Tech Spec | ADR requerido | Resolución |
| - | ----------------------- | ---------------------- | ----- | ------- | ------------------- | ----------------- | ------------- | ---------- |
| D1 | Flag operativo `SEED_DEMO_ENABLED` como única var de seed | Se añade `SEED_DEMO_ENABLED` a `configSchema` coexistiendo con el `SEED_ENABLED` genérico preexistente | El repo ya tenía `SEED_ENABLED` (gate genérico); US-086 exige `SEED_DEMO_ENABLED` (Doc 14 §15.2, THR-012) | Bajo (dos flags con propósitos distintos; documentado) | Ninguna | §5, §12 | No | Aceptada; documentada en `.env.example` y `seed.md` |
| D2 | Repoblado del reset usa `MockAIProvider` (como el CLI) | Usa `DeterministicSeedAiProvider` local a `seed-demo` | ADR-ARCH-001 prohíbe que `seed-demo` importe `ai-assistance` desde código de módulo (solo scripts/tests exentos) | Bajo (ambos deterministas; payloads AI pueden diferir entre CLI y reset, idempotencia por-fuente intacta) | ADR-ARCH-001 (se respeta) | §7, §11 | No | Aceptada |
| D3 | Tests de concurrencia/falla parcial como integración | Cubiertos a nivel **unit** determinista (control de timing con prisma mock) | La concurrencia real vía HTTP es no determinista (flaky); el lock síncrono y el rollback se prueban de forma exacta con mocks | Nulo (comportamiento verificado sin flakiness) | Ninguna | §13 (QA-006) | No | Aceptada |
| D4 | `AdminAction` con `target_id=null`, columnas `reason`/`correlationId` | `targetId` = UUID centinela `0000...0000`; `reason`/`correlationId` en `metadata` (JsonB) | El schema real (US-099) tiene `targetId` **requerido `@db.Uuid`** y no tiene columnas `reason`/`correlationId` | Nulo (auditoría completa preservada en `metadata`) | Ninguna | §14 | No | Aceptada |
| D5 | Posible ALTER de índices `is_seed` | Sin cambio de schema | Índices `is_seed` (US-101) ya presentes; volúmenes demo pequeños | Nulo | Ninguna | §10 | No | Verificado; DB-001 cerrado |
| N1 | Doc 16 §39.2 lista `/admin/seed/reset` sin prefijo | Implementado `/api/v1/admin/seed/reset` | Prefijo canónico Doc 16 §3.1 | Nulo (documental) | Ninguna | §16 | No | Housekeeping documental |

## 10. Final Validation

- **AC-01** (reset surgical `202` + `ResetReport`): **Passed** — TS-01 (202, entitiesDeleted/Reseeded/seedVersion/correlationId/durationMs).
- **AC-02** (idempotencia): **Passed** — TS-02 (recordCount idéntico entre dos resets).
- **AC-03** (`AdminAction` SEED_RESET + correlationId): **Passed** — TS-03 (`is_seed=false`, correlationId en metadata) + OBS logs.
- **AC-04** (`GET /status` refleja `lastRunAt`/`recordCount`): **Passed** — TS-04.
- **EC-01** (flag off → `404`): **Passed** — NT-03/SEC-002 (`404` indistinguible de ruta inexistente).
- **EC-02** (falla parcial → `500` + rollback + `SEED_RESET_FAILED`): **Passed** — unit determinista (`SeedResetFailedError` + audit).
- **EC-03** (concurrencia → `409 SEED_RESET_IN_PROGRESS`): **Passed** — unit determinista (`SeedResetInProgressError`, sin tocar BD).
- **SEC-01/VR-03/04** (auth + rol admin): **Passed** — NT-01 (401), NT-02 (403).
- **SEC-04** (surgical, `is_seed=false` preservado): **Passed** — TS-05 + unit (filtro `is_seed=true` en todos los deletes).
- **VR-01** (Zod strict): **Passed** — NT-04 (400).
- **Typecheck**: Passed (0). **Lint**: Passed (0). **Suite completa**: 839 tests verdes + 2 todo (97 archivos). **US-086**: 16 tests.
- **Resultado**: **DONE** — todas las ACs/ECs Passed, evidencia honesta contra BD real, sin blockers abiertos.

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-10T16:16:00Z | Initialized | Execution record creado |
| 2026-07-10T16:16:00Z | Readiness | READY (US Approved; dependencias US-085/PB-P0-001/002 satisfechas) |
| 2026-07-10T16:16:00Z | Alignment | ALIGNED_WITH_NOTES (N1 prefijo API, N2 paths repo, N3 AdminAction.action enum) |
| 2026-07-10T16:38:49Z | Executed | 20 tareas Done; módulo seed-demo interface/application + errores + config + docs. Typecheck/lint 0, 839 tests verdes |
| 2026-07-10T16:38:49Z | Validation | AdminAction.action confirmado String libre (sin migración); 16 tests US-086 contra BD real |
| 2026-07-10T16:38:49Z | Completed | Resultado global DONE |
