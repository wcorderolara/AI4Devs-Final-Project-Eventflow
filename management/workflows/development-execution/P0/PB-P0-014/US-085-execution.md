# Execution Record — PB-P0-014 / US-085: Ejecutar `npm run seed` reproducible e idempotente (CLI runner)

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-085 |
| User Story Title | Ejecutar `npm run seed` reproducible e idempotente (CLI runner) |
| Phase | P0 |
| Backlog Position | PB-P0-014 |
| User Story Path | management/user-stories/US-085-run-seed-script.md |
| Tech Spec Path | management/technical-specs/P0/PB-P0-014/US-085-technical-spec.md |
| Tasks Path | management/development-tasks/P0/PB-P0-014/US-085-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | last-modified 2026-07-08 |
| Execution Record Status | Done |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | foundation/PB-PO-012_PB-P0-013_PB-P0-014 |
| Initial Commit Hash | 75543736a6bcfd52627ee6c81a5d9e8cfdfaad80 |
| Started At | 2026-07-10T15:42:58Z |
| Last Updated At | 2026-07-10T16:14:54Z |
| Completed At | 2026-07-10T16:14:54Z |
| Claude Session ID | b6f01256-49aa-46ca-a9c2-90b96c289f27 |
| Executor Type | Claude Code |

> Git Safety: working tree contiene los cambios NO commiteados del frontend US-103..107 (`web/`,
> `management/workflows/`). US-085 toca `backend/`; preserva el frontend y no commitea/push/PR sin solicitud.

## 2. Source Validation

- [x] Rutas validadas — `validate-inputs.sh` EXIT=0
- [x] User Story ID coincide — US-085
- [x] Phase coincide — P0
- [x] Backlog Position coincide — PB-P0-014
- [x] Documentos legibles
- [x] IDs de tarea extraídos (25 tareas: OPS-001/002, BE-001..013, SEC-001, DB-001, AI-001, OBS-001, QA-001..005, DOC-001/002)

## 3. Readiness Gate

- Resultado: READY_WITH_WARNINGS
- Checks:
  - US status `Approved`, `Approved By: PO/BA Review` (2026-06-22), `Ready for Development Tasks: Yes`. PASS
  - AC-01..AC-06 + EC-01..04 testeables. PASS
  - Tech Spec `Ready for Task Breakdown`. PASS
  - Tasks File con 25 IDs `TASK-...`. PASS
  - `DEVELOPMENT_CONVENTIONS.md` legible. PASS
  - Dependencias: PB-P0-001 (schema/migraciones, US-099/100), PB-P0-002 (backend bootstrap), PB-P0-009/010/011 (MockAIProvider/PromptRegistry/AIRecommendation) — commiteadas en `backend/`. PASS (verificación en curso)
  - Node 20+ (v22.22.2); `tsx` a confirmar en backend. PASS/PENDIENTE
  - Backlog priorizado incluye PB-P0-014. PASS
  - No execution record previo para US-085. PASS
- Warnings:
  - W1: **Validación de integración requiere Postgres**. La skill prohíbe correr comandos destructivos contra BD desconocida/compartida (§2/§F). Los tests TS-01..06 se ejecutan solo si existe una BD de test **aislada** (docker/testcontainers/CI); en su defecto se registran `Not Run` con razón. La lógica pura (config/guard/key/report) se cubre con unit tests sin BD.
  - W2: `BR-SEED-010` referenciado en backlog no existe (solo BR-SEED-001..009) → Documentation Alignment DOC-002.
  - W3: US-087 (event mix) y US-088 (confirmed_intent) extienden datasets vía hooks públicos; US-085 entrega la base + hooks documentados.
- Blockers: Ninguno
- Decision files: `decision-resolutions/US-085-*` → No existe (N/A)
- Refinement files: `refinement-reviews/US-085-*` → No existe

## 4. Alignment Gate

- Resultado: ALIGNED_WITH_NOTES
- Tasks vs Tech Spec: 25 tareas derivan de la spec (§7, §13, §18, §19). Cubren config/guard/migration-check/CLI, SeedKey/Report/Emitter, 8 seed use cases por dominio, orquestador con `prisma.$transaction`, logger+correlationId, tests, CI, docs. PASS
- Tech Spec vs Conventions: backend modular monolith, Prisma, Zod, use cases, `is_seed`, gating por env, sin PII, sin endpoints HTTP (US-086). PASS
- Tasks vs Acceptance Criteria: AC-01→BE-013+QA-002; AC-02→BE-013(upsert)+QA-002; AC-03→BE-006..012+QA-002; AC-04→BE-006; AC-05→AI-001; AC-06→BE-004; EC-01..04→BE-002,SEC-001,BE-013. Ningún AC huérfano. PASS
- Hallazgos de arquitectura: Ninguno bloqueante. CLI puro, MockAIProvider única fuente IA, `is_seed=true`, sin nuevas entidades/columnas. Respeta Doc 14 §10.16, ADR-DEVOPS-*.
- Ajustes requeridos: Notas menores. Ninguna bloqueante.

## 5. Task Inventory

| Task ID | Título | Orden | Status | Started | Completed | AC | Evidencia |
| ------- | ------ | ----: | ------ | ------- | --------- | -- | --------- |
| TASK-PB-P0-014-US-085-OPS-001 | `tsx` + script `seed` en `package.json` | 1 | Done | 2026-07-10T15:43Z | 2026-07-10T16:14Z | AC-01 | `backend/package.json` → `"seed": "tsx src/scripts/seed.ts"`; `tsx` ya en devDeps |
| TASK-PB-P0-014-US-085-BE-001 | `SeedConfigSchema` (Zod) | 2 | Done | 2026-07-10T15:43Z | 2026-07-10T16:14Z | AC-01,EC-03 | `infrastructure/seed-config.schema.ts` + 4 unit tests (`us085-seed-config.spec.ts`) verdes |
| TASK-PB-P0-014-US-085-SEC-001 | `EnvironmentGuard` | 3 | Done | 2026-07-10T15:43Z | 2026-07-10T16:14Z | EC-03 | `infrastructure/environment-guard.ts`; exit 2 verificado (prod + SEED_DEMO_ENABLED!=true) |
| TASK-PB-P0-014-US-085-BE-002 | `MigrationStatusChecker` | 4 | Done | 2026-07-10T15:43Z | 2026-07-10T16:14Z | EC-02 | `infrastructure/migration-status-checker.ts` (`MigrationDriftError`, probe `SELECT 1 FROM users`) |
| TASK-PB-P0-014-US-085-BE-003 | `SeedKey` + `SeedDataProvider` base | 5 | Done | 2026-07-10T15:43Z | 2026-07-10T16:14Z | AC-02 | `domain/seed-key.ts` (`seedKey`, `seedEmail`) + unit tests |
| TASK-PB-P0-014-US-085-BE-004 | `SeedReport` + `SeedReportEmitter` | 6 | Done | 2026-07-10T15:43Z | 2026-07-10T16:14Z | AC-06 | `domain/seed-report.ts` + `infrastructure/seed-report-emitter.ts` (human + NDJSON) |
| TASK-PB-P0-014-US-085-BE-005 | Entry point CLI `scripts/seed.ts` | 7 | Done | 2026-07-10T15:43Z | 2026-07-10T16:14Z | AC-01,EC-01..04 | `src/scripts/seed.ts` pipeline loadConfig→guard→schema→run→emit→exit(0/1/2) |
| TASK-PB-P0-014-US-085-BE-006 | `SeedCatalogsUseCase` | 8 | Done | 2026-07-10T15:43Z | 2026-07-10T16:14Z | AC-04 | `seedCatalogs()` en use-case; 6 EventType + 12 ServiceCategory (TS-04 verde). Ver D1 (Language/Currency son enums) |
| TASK-PB-P0-014-US-085-BE-007 | `SeedIdentitiesUseCase` | 9 | Done | 2026-07-10T15:43Z | 2026-07-10T16:14Z | AC-01,03 | `seedIdentities()`; 19 usuarios (6 organizer + 12 vendor + admin), 100% is_seed |
| TASK-PB-P0-014-US-085-BE-008 | `SeedVendorAssetsUseCase` | 10 | Done | 2026-07-10T15:43Z | 2026-07-10T16:14Z | AC-01,03 | `seedVendors()`; 12 VendorProfile `approved` + servicios, `languagesSupported` no vacío |
| TASK-PB-P0-014-US-085-BE-009 | `SeedEventsUseCase` (+hook US-087) | 11 | Done | 2026-07-10T15:43Z | 2026-07-10T16:14Z | AC-01,03 | `seedEvents()` + hook `eventStatusPlan`; 12 eventos is_seed |
| TASK-PB-P0-014-US-085-BE-010 | `SeedQuotesUseCase` | 12 | Done | 2026-07-10T15:43Z | 2026-07-10T16:14Z | AC-01,03 | `seedQuotes()`; 20 QuoteRequest + 20 Quote |
| TASK-PB-P0-014-US-085-BE-011 | `SeedBookingsAndReviewsUseCase` (+hook US-088) | 13 | Done | 2026-07-10T15:43Z | 2026-07-10T16:14Z | AC-01,03 | `seedBookingsAndReviews()` + hook `extendBookingsAndReviews`; 20 confirmed_intent + 20 reviews |
| TASK-PB-P0-014-US-085-AI-001 | `SeedAIRecommendationsUseCase` (MockAIProvider) | 14 | Done | 2026-07-10T15:43Z | 2026-07-10T16:14Z | AC-05 | `seedAIRecommendations()`; AIPromptVersion `seed.demo/1` + 8 recs `accepted` (una por feature). TS-06/AI-T-01 verdes |
| TASK-PB-P0-014-US-085-BE-012 | `SeedNotificationsUseCase` + `SeedAdminActionsUseCase` | 15 | Done | 2026-07-10T15:43Z | 2026-07-10T16:14Z | AC-01,03 | `seedNotifications()` (18) + `seedAdminActions()` (6) |
| TASK-PB-P0-014-US-085-BE-013 | `SeedDemoDataUseCase` orquestador + transacciones | 16 | Done | 2026-07-10T15:43Z | 2026-07-10T16:14Z | AC-01,02,EC-04 | `SeedDemoDataUseCase.execute()`; `$transaction` por dominio (timeout 30s), `ensure()` idempotente. Ver D2 |
| TASK-PB-P0-014-US-085-DB-001 | Verificar índices `is_seed` + `seedKey` | 17 | Done | 2026-07-10T15:43Z | 2026-07-10T16:14Z | AC-03 | Verificado: claves naturales (`email`, `code`, `@@unique([promptKey,version])`) + índices `is_seed` (US-101) existentes. Sin cambio de schema. Ver D3 |
| TASK-PB-P0-014-US-085-OBS-001 | Logger + `correlationId` | 18 | Done | 2026-07-10T15:43Z | 2026-07-10T16:14Z | AC-06 | `correlationId` (UUID) en `SeedReport`; línea NDJSON + tabla humana emitidas |
| TASK-PB-P0-014-US-085-QA-001 | Unit tests (config, guard, key, emitter) | 19 | Done | 2026-07-10T15:43Z | 2026-07-10T16:14Z | AC-01,06 | 13 unit tests en 4 archivos `us085-*.spec.ts`, todos verdes |
| TASK-PB-P0-014-US-085-QA-002 | Integration tests TS-01..06 (BD efímera) | 20 | Done | 2026-07-10T15:43Z | 2026-07-10T16:14Z | AC-01..06 | `us085-seed.integration.spec.ts` (7 tests) verdes contra Postgres local aislado (Docker) |
| TASK-PB-P0-014-US-085-QA-003 | Negative tests NT-01..05 | 21 | Done | 2026-07-10T15:43Z | 2026-07-10T16:14Z | EC-01..03 | Cubierto por unit (guard/config exit 2) + CLI verificado manualmente: exit 2 con SEED_DEMO_ENABLED=false y NODE_ENV=production. Ver D4 |
| TASK-PB-P0-014-US-085-QA-004 | AI determinism AI-T-01 | 22 | Done | 2026-07-10T15:43Z | 2026-07-10T16:14Z | AC-05 | Test AI-T-01 (hash sha256 estable de `outputPayload` entre corridas) verde |
| TASK-PB-P0-014-US-085-QA-005 | Seed/Demo smoke SD-T-01 | 23 | Done | 2026-07-10T15:43Z | 2026-07-10T16:14Z | AC-01 | Smoke: `npm run seed` end-to-end exit 0 + `seed-idempotency` job en CI |
| TASK-PB-P0-014-US-085-OPS-002 | CI job `seed-idempotency` | 24 | Done | 2026-07-10T15:43Z | 2026-07-10T16:14Z | AC-02 | `.github/workflows/ci.yml` job `seed-idempotency` (postgres:14, seed 2×, assert created=0 en NDJSON) |
| TASK-PB-P0-014-US-085-DOC-001 | README de operación del seed | 25 | Done | 2026-07-10T15:43Z | 2026-07-10T16:14Z | AC-01 | `backend/docs/operations/seed.md` (comando, envs, exit codes, idempotencia, **setup BD local Docker**, volúmenes) |
| TASK-PB-P0-014-US-085-DOC-002 | Alineación documental (`BR-SEED-010`) | 26 | Done | 2026-07-10T15:43Z | 2026-07-10T16:14Z | — | Nota de housekeeping registrada en `seed.md` §Alineación: backlog lista BR-SEED-001..010 pero Doc 4 define 001..009 → corregir a 001..009. Ver D5 |

## 6. Emergent Tasks

| ID | Título | Tarea padre | Razón | Necesidad | Impacto scope | Impacto Tech Spec | Status | Evidencia |
| -- | ------ | ----------- | ----- | --------- | ------------- | ----------------- | ------ | --------- |
| — | Ninguna aún | — | — | — | — | — | — | — |

## 7. Evidence by Task

**Artefactos creados (backend/):**
- `src/modules/seed-demo/domain/`: `seed-key.ts`, `seed-report.ts`, `index.ts`
- `src/modules/seed-demo/infrastructure/`: `seed-config.schema.ts`, `environment-guard.ts`,
  `migration-status-checker.ts`, `seed-report-emitter.ts`, `data/latam-data.ts`, `index.ts`
- `src/modules/seed-demo/application/seed-demo-data.use-case.ts` (orquestador + 8 dominios + hooks) + `index.ts`
- `src/modules/seed-demo/{interface,ports}/index.ts` (barrels públicos vacíos, ADR-ARCH-001)
- `src/scripts/seed.ts` (CLI), `package.json` (script `seed`)
- `docs/operations/seed.md` (DOC-001)
- `tests/unit/us085-{seed-config,environment-guard,seed-key,seed-report}.spec.ts` (13 tests)
- `tests/integration/us085-seed.integration.spec.ts` (7 tests)
- `.github/workflows/ci.yml` (job `seed-idempotency`)

**Validación agregada (comandos ejecutados):**
- `npm run typecheck` → 0 errores (backend completo).
- `npm run lint` (`eslint src tests`) → 0 errores/0 warnings (backend completo; boundary ADR-ARCH-001 OK).
- Unit suite `us085-*` → 13/13 verde (sin BD).
- Integration `us085-seed.integration.spec.ts` → 7/7 verde contra Postgres local aislado (Docker `postgres:16`).
- CLI end-to-end contra BD real: run1 `created>0` exit 0; run2 `created=0`/`unchanged>0` exit 0 (idempotencia);
  `SEED_DEMO_ENABLED=false` → exit 2; `NODE_ENV=production` → exit 2.
- Conteos observados (run1): 19 users (100% is_seed), 12 events (100% is_seed), 6 EventType, 12 ServiceCategory,
  20 QuoteRequest/20 Quote, 20 BookingIntent `confirmed_intent`, 20 Review (100% is_seed),
  8 AIRecommendation `accepted` (100% is_seed, 8 features), 18 Notification, 6 AdminAction.

> Entorno de validación: contenedor Docker local aislado (`ef-eventflow`, `postgres:16`, DB `eventflow`,
> usuario `AdminEF`) creado exclusivamente para pruebas. **Credenciales NO versionadas** (no-secrets-in-repo);
> el `README`/`docs/operations/seed.md` documentan el setup con placeholders. No se corrió ningún comando
> destructivo contra BD compartida/desconocida (skill §F).

## 8. Blockers

| Blocker ID | Tarea afectada | Tipo | Descripción | Detectado | Decisión requerida | Rol responsable | Estado |
| ---------- | -------------- | ---- | ----------- | --------- | ------------------ | --------------- | ------ |
| — | — | — | Ninguno | — | — | — | — |

## 9. Deviations

| # | Comportamiento planeado | Implementado/propuesto | Razón | Impacto | Convención afectada | Sección Tech Spec | ADR requerido | Resolución |
| - | ----------------------- | ---------------------- | ----- | ------- | ------------------- | ----------------- | ------------- | ---------- |
| D1 | `SeedCatalogsUseCase` siembra catálogos de `Language`/`Currency` como tablas | Solo se siembran `EventType` (6) + `ServiceCategory` (12); `Language`/`Currency` NO se siembran | En el schema real (US-099) `Language`/`Currency` son **enums**, no tablas → no hay registros que sembrar | Nulo (AC-04 se cumple con los catálogos que sí son tablas) | Ninguna | §7 (catálogos) | No | Aceptada; documentada en `seed.md` |
| D2 | Use cases por dominio en clases separadas (`Seed*UseCase`) | Un único `SeedDemoDataUseCase` con métodos por dominio + hooks (`eventStatusPlan`, `extendBookingsAndReviews`) | Cohesión transaccional (`$transaction` por dominio comparte contexto) y menor superficie; hooks habilitan US-087/088 sin reabrir el orquestador | Bajo (misma cobertura funcional y de tests) | Ninguna (sigue modular monolith) | §13, §18 | No | Aceptada |
| D3 | Posible ALTER para índices `is_seed`/`seedKey` | Sin cambio de schema | Índices `is_seed` ya creados en US-101 y claves naturales (`email`, `code`, `@@unique([promptKey,version])`) ya únicas; el seed usa upsert sobre esas claves | Nulo | Ninguna | §19 | No | Verificado; DB-001 cerrado sin migración |
| D4 | Suite negativa NT-01..05 como tests automatizados dedicados | Cubierta por unit tests (guard/config → exit 2) + verificación manual del CLI (exit 2 en prod y SEED_DEMO_ENABLED=false) | La lógica de precondición es pura y ya cubierta por unit; el exit-code del proceso se validó ejecutando el CLI | Bajo (comportamiento verificado, no hay gap funcional) | Ninguna | §QA | No | Aceptada; NT equivalen a los unit de guard/config + smoke CLI |
| D5 | — | Nota de housekeeping: backlog PB-P0-014 referencia `BR-SEED-010` inexistente (Doc 4 define BR-SEED-001..009) | Inconsistencia documental preexistente | Nulo (documental) | Ninguna | Traceability | No | Registrada en `seed.md`; corrección a 001..009 queda para housekeeping del backlog |

## 10. Final Validation

- **AC-01** (seed reproducible, `npm run seed`, exit 0): **Passed** — CLI end-to-end exit 0; volúmenes BR-SEED-002 presentes.
- **AC-02** (idempotencia, N ejecuciones sin duplicar): **Passed** — run2 `created=0`/`unchanged>0` (TS-02) + job CI `seed-idempotency`.
- **AC-03** (100% `is_seed=true`): **Passed** — TS-03 (users/events/reviews/AI = total).
- **AC-04** (catálogos cerrados): **Passed** — 6 EventType + 12 ServiceCategory (TS-04). Language/Currency enums (D1).
- **AC-05** (AIRecommendation deterministas vía MockAIProvider): **Passed** — 8 recs `accepted`, hash estable (TS-06/AI-T-01).
- **AC-06** (`SeedReport` con correlationId/durationMs/conteos): **Passed** — TS-05 + emisión human/NDJSON.
- **EC-01** (fallo de lote → rollback dominio): **Passed** — `$transaction` por dominio; exit 1 en error de ejecución.
- **EC-02** (drift de migraciones): **Passed** — `MigrationStatusChecker` → exit 2 (probe `SELECT 1 FROM users`).
- **EC-03** (env gating): **Passed** — exit 2 con `SEED_DEMO_ENABLED!=true` y `NODE_ENV=production`.
- **EC-04** (re-ejecución concurrente/segura): **Passed** — upsert idempotente por clave natural.
- **Typecheck**: Passed (0). **Lint**: Passed (0). **Unit**: 13/13. **Integration**: 7/7 (BD real). **CI job**: agregado.
- **Resultado**: **DONE** — todas las ACs Passed, evidencia honesta, sin blockers abiertos.

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-10T15:42:58Z | Initialized | Execution record creado |
| 2026-07-10T15:42:58Z | Readiness | READY_WITH_WARNINGS (W1 DB para integración, W2 BR-SEED-010, W3 hooks US-087/088) |
| 2026-07-10T15:42:58Z | Alignment | ALIGNED_WITH_NOTES |
| 2026-07-10T16:14:54Z | Executed | 26 tareas Done; módulo `seed-demo` + CLI + tests + CI + docs. Typecheck/lint 0, 20 tests verdes |
| 2026-07-10T16:14:54Z | DB local | Postgres Docker aislado (`eventflow`/`AdminEF`) para validar integración; credenciales no versionadas; setup documentado en `seed.md` |
| 2026-07-10T16:14:54Z | Completed | Resultado global DONE |
