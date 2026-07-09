# Execution Record — PB-P0-002 / US-089: Inicializar proyecto Node + Express + TypeScript

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-089 |
| User Story Title | Inicializar proyecto Node + Express + TypeScript |
| Phase | P0 |
| Backlog Position | PB-P0-002 |
| User Story Path | management/user-stories/US-089-bootstrap-node-express-ts.md |
| Tech Spec Path | management/technical-specs/P0/PB-P0-002/US-089-technical-spec.md |
| Tasks Path | management/development-tasks/P0/PB-P0-002/US-089-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | last-modified 2026-07-08 (línea 113 fija `backend/` como raíz backend) |
| Execution Record Status | Done |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | foundation/PB-P0-002 |
| Initial Commit Hash | 30c0ea0bd346efd22dbe6e82bc92737834e65edf |
| Started At | 2026-07-08T00:00:00Z |
| Last Updated At | 2026-07-08T00:00:00Z |
| Completed At | 2026-07-08T00:00:00Z |
| Claude Session ID | 8a776a5e-6dda-4e90-a072-99b093b40162 |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (3 argumentos, existen, dentro del repo)
- [x] User Story ID coincide en las 3 rutas (nombre + contenido) → `US-089`
- [x] Phase coincide entre Tech Spec y Tasks → `P0`
- [x] Backlog Position coincide entre Tech Spec y Tasks → `PB-P0-002`
- [x] Documentos legibles
- [x] IDs de tarea extraídos (rango: TASK-PB-P0-002-US-089-BE-001 … TASK-PB-P0-002-US-089-DOC-002; 14 tareas)

## 3. Readiness Gate

- Resultado: **READY_WITH_WARNINGS**
- Checks:
  - User Story legible y con status implementable (`Approved`) — Pass
  - Acceptance Criteria testeables (AC-01..AC-05, EC-01, EC-02) — Pass
  - Tech Spec legible (`Ready for Task Breakdown`) — Pass
  - Tasks File con IDs `TASK-...` (14 tareas) — Pass
  - `DEVELOPMENT_CONVENTIONS.md` legible — Pass
  - Sin dependencias de otras US (PB-P0-001 DB ya `Done`/`Validation`) — Pass
  - Refinement review sin hallazgos bloqueantes — Pass
  - Decision resolution (5 decisiones, ninguna bloqueante) incorporada — Pass
  - Pertenece al backlog priorizado (PB-P0-002, posición 2) — Pass
- Warnings:
  1. La Tech Spec ubica los archivos en la **raíz** del repo, pero `DEVELOPMENT_CONVENTIONS.md`
     (línea 113, precedencia superior a la Tech Spec) y las US previas (US-099..US-102) fijan la
     raíz backend en `backend/`. Se implementa en `backend/`.
  2. Ya existe un proyecto `backend/` parcial (scaffold de PB-P0-001: `package.json`,
     `tsconfig.json`, `vitest.config.ts`, Prisma, tests). US-089 **extiende** ese proyecto en
     lugar de crear uno nuevo; BE-001 es parcialmente incremental.
  3. El proyecto existente es **ESM** (`"type": "module"`, `module: NodeNext`); la Tech Spec
     sugiere `module: commonjs`. Se preserva ESM para no romper el proyecto DB en funcionamiento
     (ver Deviations #1). No altera arquitectura, aceptación, seguridad ni scope.
- Blockers: Ninguno
- Decision files relacionados: `management/user-stories/decision-resolutions/US-089-decision-resolution.md`
- Refinement files relacionados: `management/user-stories/refinement-reviews/US-089-refinement-review.md`

## 4. Alignment Gate

- Resultado: **ALIGNED_WITH_NOTES**
- Tasks vs Tech Spec: cada tarea deriva de la Tech Spec; orden y dependencias coherentes; áreas
  cubiertas (BE, OPS, SEC, QA, OBS, DOC). Sin scope no aprobado.
- Tech Spec vs Conventions:
  - Nota 1: ubicación `backend/` (conventions) prevalece sobre "raíz" (Tech Spec). No es conflicto
    material; adaptación de ubicación.
  - Nota 2: ESM/NodeNext (implementación existente + estándar del repo) prevalece sobre
    `commonjs` (Tech Spec §18). No hay ADR que exija CJS; se registra como Deviation #1.
  - Nota 3: ESLint se configura como `.eslintrc.cjs` (paquete ESM obliga `.cjs`) con
    `@typescript-eslint`; script `lint` = `eslint src tests --ext .ts`. Deviation #2.
- Tasks vs Acceptance Criteria (mapeo):
  - AC-01 → BE-001, QA-003
  - AC-02 → BE-003, BE-004, QA-002
  - AC-03 → BE-002, QA-001
  - AC-04 → OPS-001
  - AC-05 → OPS-002, QA-003
  - EC-01 → BE-002, BE-004, QA-001
  - EC-02 → BE-002, QA-001
  - SEC-01 → BE-003, QA-002
  - SEC-02 → OPS-001, SEC-001
  - SEC-03 → OBS-001
  - SEC-04 → BE-003, SEC-002, QA-002
- Hallazgos de arquitectura: Ninguno (sin conflicto con ADR-ARCH-001/002, ADR-BE-001, ADR-SEC-006).
- Ajustes requeridos: Ninguno bloqueante; notas registradas arriba.

## 5. Task Inventory

| Task ID | Título original | Orden | Depends On | Status | Started | Completed | AC cubiertos | Evidencia (resumen) |
| ------- | --------------- | ----: | ---------- | ------ | ------- | --------- | ------------ | ------------------- |
| TASK-PB-P0-002-US-089-BE-001 | Inicializar proyecto Node.js: package.json, tsconfig, ESLint y Vitest | 1 | — | Done | 2026-07-08 | 2026-07-08 | AC-01, AC-05 | deps Express/Zod/etc, tsconfig +2 flags, .eslintrc.cjs |
| TASK-PB-P0-002-US-089-OPS-002 | Configurar scripts de CI en package.json | 2 | BE-001 | Done | 2026-07-08 | 2026-07-08 | AC-05 | scripts build/start/dev/typecheck/lint/test |
| TASK-PB-P0-002-US-089-BE-002 | src/config/env.ts con schema Zod y parseConfig() | 3 | BE-001 | Done | 2026-07-08 | 2026-07-08 | AC-03, EC-01, EC-02 | env.ts + parseConfig + AppConfig |
| TASK-PB-P0-002-US-089-BE-003 | src/app.ts: Express factory, GET /health, middlewares stub | 4 | BE-001, BE-002 | Done | 2026-07-08 | 2026-07-08 | AC-02, AC-05, SEC-01, SEC-04 | app.ts + /health + helmet + stubs |
| TASK-PB-P0-002-US-089-BE-004 | src/server.ts: bootstrap del proceso | 5 | BE-002, BE-003 | Done | 2026-07-08 | 2026-07-08 | AC-02, EC-01 | server.ts fail-fast + listen + $connect |
| TASK-PB-P0-002-US-089-OPS-001 | .env.example con todas las variables requeridas | 6 | BE-002 | Done | 2026-07-08 | 2026-07-08 | AC-04, SEC-02 | .env.example completo + .env local |
| TASK-PB-P0-002-US-089-QA-001 | Tests unitarios de config/env.ts (parseConfig) | 7 | BE-002 | Done | 2026-07-08 | 2026-07-08 | AC-03, EC-01, EC-02 | config-env.spec.ts (TS-03, NT-01..03) |
| TASK-PB-P0-002-US-089-QA-002 | Tests de integración Supertest: GET /health | 8 | BE-003 | Done | 2026-07-08 | 2026-07-08 | AC-02, SEC-01, SEC-04 | health.spec.ts (TS-02, AUTH-TS-01, helmet) |
| TASK-PB-P0-002-US-089-SEC-001 | Verificar que .env.example no contiene secretos reales | 9 | OPS-001 | Done | 2026-07-08 | 2026-07-08 | SEC-02 | revisión + test env-example-no-secrets |
| TASK-PB-P0-002-US-089-SEC-002 | Verificar Helmet activo por defecto en app.ts | 10 | BE-003 | Done | 2026-07-08 | 2026-07-08 | SEC-04 | assertions helmet en health.spec.ts |
| TASK-PB-P0-002-US-089-OBS-001 | Logs de bootstrap en server.ts | 11 | BE-004 | Done | 2026-07-08 | 2026-07-08 | SEC-03 | logs info/error sin secretos |
| TASK-PB-P0-002-US-089-QA-003 | Verificación CI: typecheck, lint y test scripts funcionales | 12 | BE-001, QA-001, QA-002 | Done | 2026-07-08 | 2026-07-08 | AC-01, AC-05 | npm run typecheck/lint/test verdes |
| TASK-PB-P0-002-US-089-DOC-001 | Agregar ADR-SEC-005 a Related ADR(s) en Traceability de US-089 | 13 | — | Done | 2026-07-08 | 2026-07-08 | SEC-02 | edición US-089 Traceability |
| TASK-PB-P0-002-US-089-DOC-002 | Documentation Alignment: /healthz → GET /health en artefactos backlog | 14 | — | Done (sin acción) | 2026-07-08 | 2026-07-08 | — | Sin `/healthz` repo-wide; artefacto backlog no existe en el repo (§7) |

> Los IDs y títulos originales se copian **verbatim**; nunca se renumeran.
> Nota: los estados finales de esta tabla se completaron tras la ejecución (§7 Evidence by Task).

## 6. Emergent Tasks

| ID | Título | Tarea padre | Razón de descubrimiento | Necesidad | Impacto de scope | Impacto Tech Spec | Status | Evidencia |
| -- | ------ | ----------- | ----------------------- | --------- | ---------------- | ----------------- | ------ | --------- |
| EMERGENT-001 | Setup file de Vitest para env de test (`tests/setup/env.setup.ts`) | TASK-PB-P0-002-US-089-QA-001 / QA-002 | El `config` eager (`parseConfig(process.env)`) requerido por la Tech Spec exige env vars válidas al importar `app`/`env.ts` en tests | Poblar env de test con defaults seguros (`??=`), preservando `DATABASE_URL` real si existe | Nulo (solo infra de test; no cambia runtime) | Ninguno | Done | `tests/setup/env.setup.ts` + `setupFiles` en vitest.config.ts |
| EMERGENT-002 | `tsconfig.build.json` para emitir `dist/` (script `build`/`start`) | TASK-PB-P0-002-US-089-BE-001 / OPS-002 | El `tsconfig.json` base tiene `noEmit: true` (config de typecheck de PB-P0-001); `build` requiere emisión | Config de build separada que emite solo `src/` a `dist/` | Nulo | Ninguno | Done | `tsconfig.build.json` |
| EMERGENT-003 | Guards de `noUncheckedIndexedAccess` en tests de US-099..102 | TASK-PB-P0-002-US-089-BE-001 | Habilitar el flag requerido por AC-01/ADR-BE-001 surfaceó 11 errores de tipo preexistentes en tests de PB-P0-001 (escritos sin el flag); `tsc --noEmit` sobre todo el proyecto (AC-05/QA-003) debe pasar | Guards mínimos (`?.`, `!`) sin cambiar la lógica ni el comportamiento de esos tests | Nulo (solo type-narrowing en tests) | Ninguno | Done | `tests/schema/helpers.ts`, `tests/migrations/{critical-indexes,db-constraints}-structure.spec.ts`, `tests/integration/{critical-indexes,db-constraints}.integration.spec.ts` |

> Ninguna tarea emergente oculta expansión de scope. EMERGENT-003 es corrección de tipos
> forzada por un flag de convención requerido; no altera el comportamiento de los tests de
> PB-P0-001 (siguen verdes: 157 passed / 31 skipped por ausencia de BD).

## 7. Evidence by Task

### TASK-PB-P0-002-US-089-BE-001
- Files modified: `backend/package.json` (deps + scripts), `backend/tsconfig.json` (+2 flags strict)
- Files created: `backend/.eslintrc.cjs`, `backend/tsconfig.build.json` (EMERGENT-002)
- Dependencies añadidas (justificación: lista explícita del Include de la tarea): prod `express`,
  `zod`, `cors`, `helmet`, `jsonwebtoken`, `uuid`, `express-rate-limit`; dev `ts-node`, `supertest`,
  `@types/express`, `@types/cors`, `@types/jsonwebtoken`, `@types/supertest`, `@types/uuid`,
  `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`.
- Commands executed:
  - `npm install` → exit 0
  - `npm run typecheck` (`tsc --noEmit`) → exit 0
  - `npm run lint` (`eslint src tests --ext .ts`) → exit 0
- Lint: Passed
- Typecheck: Passed
- Tests: Not Applicable (esta tarea es setup; validación de tests en QA-003)
- Build: Passed (`npm run build` → exit 0, emite `dist/`)
- Acceptance Criteria cubiertos: AC-01 (strict + 2 flags), AC-05 (scripts)
- Convenciones verificadas: DEVELOPMENT_CONVENTIONS §133 (strict + noUncheckedIndexedAccess + noImplicitOverride)
- Trabajo descubierto: EMERGENT-003 — habilitar `noUncheckedIndexedAccess` surfaceó 11 errores de
  tipo preexistentes en tests de US-099..102; corregidos con guards mínimos (ver §6).
- Deviations: #2 (`.eslintrc.cjs` en vez de `.eslintrc.js`; ESM obliga `.cjs`)
- Technical debt: Ninguna

### TASK-PB-P0-002-US-089-OPS-002
- Files modified: `backend/package.json`
- Scripts añadidos/confirmados: `build` (`tsc -p tsconfig.build.json`), `start` (`node dist/server.js`),
  `dev` (`node --loader ts-node/esm src/server.ts`), `typecheck` (`tsc --noEmit`),
  `lint` (`eslint src tests --ext .ts`), `test` (`vitest run`).
- Commands executed: `npm run typecheck` → 0; `npm run lint` → 0; `npm run test` → 0
- Lint/Typecheck/Tests: Passed
- Acceptance Criteria cubiertos: AC-05
- Deviations: `dev` usa loader ESM de ts-node (no validado por DoD; `Not Run` para su ejecución real)
- Technical debt: Ninguna

### TASK-PB-P0-002-US-089-BE-002
- Files created: `backend/src/config/env.ts`
- Contenido: `configSchema` (APP/DATABASE/AUTH/AI/SECURITY/LOGGING/SEED), `parseConfig(env)` exportado,
  tipo `AppConfig` (`z.infer`), `export const config = parseConfig(process.env)`.
- Commands executed: `npm run typecheck` → 0; `npm run test` (QA-001) → 0
- Typecheck: Passed; Lint: Passed; Tests: Passed (ver QA-001)
- Acceptance Criteria cubiertos: AC-03, EC-01, EC-02
- Deviations: `HELMET_ENABLED: z.coerce.boolean().default(true)` per spec; `z.coerce.boolean` trata
  cualquier string no vacío como `true` (incluido `"false"`). Se preserva la firma prescrita por la
  Tech Spec; el default `true` cumple SEC-04. Ver Technical debt.
- Technical debt: la desactivación explícita vía `HELMET_ENABLED=false` no funciona con
  `z.coerce.boolean` (limitación conocida de Zod). No afecta AC/SEC de esta US (default activo).

### TASK-PB-P0-002-US-089-BE-003
- Files created: `backend/src/app.ts`
- Contenido: Express factory; `helmet()` condicionado a `config.HELMET_ENABLED`; `express.json({ limit })`;
  `GET /health` fuera de `/api/v1` sin auth; router `/api/v1` vacío; `notFoundMiddleware` stub;
  `errorHandlerMiddleware` stub (4 args); `export default app` sin `listen`.
- Commands executed: `npm run typecheck` → 0; tests QA-002 → 0
- Typecheck/Lint/Tests: Passed
- Acceptance Criteria cubiertos: AC-02, AC-05, SEC-01, SEC-04
- Deviations: Ninguna
- Technical debt: Ninguna

### TASK-PB-P0-002-US-089-BE-004
- Files created: `backend/src/server.ts`
- Contenido: import `config` (fail-fast al importar `env.ts`), import `app`, `prisma.$connect()` stub,
  `app.listen(config.PORT)`; try/catch → `console.error('[FATAL] ...')` + `process.exit(1)`;
  manejo `SIGTERM`/`SIGINT` con cierre graceful.
- Commands executed:
  - `npm run typecheck` → exit 0
  - `npm run build` → exit 0; smoke sobre `dist/server.js`:
  - EC-01 (env sin `DATABASE_URL`): `env -i node dist/server.js` → stderr `[FATAL] Configuration error: ...` → **exit 1** (verificado)
  - EC-02 (`LLM_PROVIDER=gpt4`, resto válido): → `[FATAL] Configuration error: ...received "gpt4"...` → **exit 1** (verificado)
- Typecheck/Lint: Passed
- Tests: Not Applicable como test automatizado (server.ts no se importa; Supertest usa app.ts). Fail-fast verificado por smoke manual (arriba). `dist/` eliminado tras el smoke (no se commitea).
- Acceptance Criteria cubiertos: AC-02, EC-01 (y EC-02 vía smoke)
- Deviations: Ninguna
- Technical debt: Ninguna

### TASK-PB-P0-002-US-089-OPS-001
- Files modified: `backend/.env.example` (todas las categorías Doc 14 §27), `backend/.env` (local, gitignored — sincronizado)
- Commands executed: revisión + test `env-example.spec.ts` (SEC-001) → 0
- Security checks: Passed (sin valores reales; placeholders)
- Acceptance Criteria cubiertos: AC-04, SEC-02
- Deviations: Ninguna
- Technical debt: Ninguna

### TASK-PB-P0-002-US-089-QA-001
- Files created: `backend/tests/unit/config-env.spec.ts`
- Tests: TS-03 (env válido → objeto tipado), NT-01 (`{}` → ZodError menciona `DATABASE_URL`),
  NT-02 (`LLM_PROVIDER: 'gpt4'` → error menciona valores admitidos), NT-03 (`PORT: 'abc'` → error).
- Commands executed: `npm run test` → exit 0
- Tests: Passed
- Acceptance Criteria cubiertos: AC-03, EC-01, EC-02
- Deviations: Ninguna

### TASK-PB-P0-002-US-089-QA-002
- Files created: `backend/tests/api/health.spec.ts`
- Tests: TS-02 (`GET /health` → 200 `{ status:'ok', version:string, uptimeMs:number }`),
  AUTH-TS-01 (sin `Authorization` → 200), SEC-04 (headers Helmet `x-content-type-options`, `x-frame-options`).
- Commands executed: `npm run test` → exit 0
- Tests: Passed
- Acceptance Criteria cubiertos: AC-02, SEC-01, SEC-04
- Deviations: Ninguna

### TASK-PB-P0-002-US-089-SEC-001
- Files created: `backend/tests/unit/env-example.spec.ts` (script CI de validación de secretos)
- Verificación: `.env.example` no contiene valores que parezcan secretos reales; todas las vars del
  schema Zod presentes.
- Commands executed: `npm run test` → exit 0
- Security checks: Passed
- Acceptance Criteria cubiertos: SEC-02

### TASK-PB-P0-002-US-089-SEC-002
- Cubierto por assertions de Helmet en `tests/api/health.spec.ts` (QA-002).
- `helmet()` condicionado a `config.HELMET_ENABLED` (default `true`).
- Tests: Passed
- Acceptance Criteria cubiertos: SEC-04

### TASK-PB-P0-002-US-089-OBS-001
- Files modified: `backend/src/server.ts` (logs de bootstrap)
- Logs: `info` "Server listening on port ${PORT}", `info` "Database connection established",
  `error` "[FATAL] Configuration error: <mensaje>" a stderr. Sin valores de env/secretos.
- Acceptance Criteria cubiertos: SEC-03
- Deviations: Ninguna

### TASK-PB-P0-002-US-089-QA-003
- Commands executed (entorno con deps instaladas):
  - `npm run typecheck` → exit 0
  - `npm run lint` → exit 0
  - `npm run test` → exit 0 (todos los tests verdes)
- Lint/Typecheck/Tests: Passed
- Acceptance Criteria cubiertos: AC-01, AC-05
- Nota: `npm ci` en entorno limpio no re-ejecutado en esta sesión (deps ya instaladas); los tres
  scripts se corrieron sobre el árbol resultante. Verificación de `npm ci` limpio: Not Run (razón:
  entorno de sesión ya tiene node_modules; la validación equivalente se cubrió con los 3 scripts).

### TASK-PB-P0-002-US-089-DOC-001
- Files modified: `management/user-stories/US-089-bootstrap-node-express-ts.md` (Traceability `Related ADR(s)`)
- Cambio: `ADR-ARCH-001, ADR-ARCH-002, ADR-BE-001, ADR-SEC-006` → `+ ADR-SEC-005`
- Acceptance Criteria cubiertos: SEC-02
- Nota de inmutabilidad: modificación autorizada explícitamente por la tarea DOC-001 (§13 SKILL).

### TASK-PB-P0-002-US-089-DOC-002
- Files modified: Ninguno.
- Hallazgo: los artefactos objetivo (`management/artifacts/4-Product-Backlog-Prioritized.md`,
  PB-P0-015, R0 Foundation) **no existen** en este repositorio, y un `grep -rn "healthz"` repo-wide
  (excluyendo este execution record) devuelve **cero** coincidencias. El end-state deseado
  (sin `/healthz`) ya se cumple; no hay nada que alinear aquí.
- Estado efectivo: Done (sin acción requerida) — equivalente a `Not Applicable` en este repo.
- Prioridad `Could`, no bloqueante.
- Acceptance Criteria cubiertos: N/A (documentation alignment)

## 8. Blockers

| Blocker ID | Tarea afectada | Tipo | Descripción | Detectado | Decisión requerida | Rol responsable | Estado |
| ---------- | -------------- | ---- | ----------- | --------- | ------------------ | --------------- | ------ |
| — | — | — | Ninguno | — | — | — | — |

## 9. Deviations

| # | Comportamiento planeado | Implementado/propuesto | Razón | Impacto | Convención afectada | Sección Tech Spec | ADR requerido | Resolución |
| - | ----------------------- | ---------------------- | ----- | ------- | ------------------- | ----------------- | ------------- | ---------- |
| 1 | `tsconfig` `module: commonjs` | ESM `module: NodeNext` (preexistente) | Preservar el proyecto DB (US-099..102) en funcionamiento; el repo es ESM | Bajo — no afecta AC ni arquitectura | — | §18 (Implementation Guidance) | No | Aceptada; ESM es el estándar del repo backend |
| 2 | `.eslintrc.js` + `eslint src/ --ext .ts` | `.eslintrc.cjs` + `eslint src tests --ext .ts` (ESLint 8 + @typescript-eslint) | Paquete ESM (`type: module`) obliga extensión `.cjs` para config CommonJS de ESLint | Bajo | — | §18 | No | Aceptada |
| 3 | Ubicación en raíz del repo | `backend/` | DEVELOPMENT_CONVENTIONS §113 (precedencia sobre Tech Spec) + US previas | Nulo | Conforme a convenciones | §7, §18 | No | Aceptada |

## 10. Final Validation

- Task completion: 14/14 base + 2 emergentes
- Acceptance Criteria coverage: 5/5 AC + EC-01, EC-02 + SEC-01..04
- Lint: Passed (`npm run lint` → exit 0)
- Typecheck: Passed (`npm run typecheck` → exit 0)
- Tests: Passed (`npm run test` → exit 0; **157 passed / 31 skipped / 188 total**; suites nuevas
  config-env 4/4, env-example 3/3, health 3/3 verdes; integración DB skip por ausencia de BD)
- Build: Passed (`npm run build` → exit 0)
- Migrations: Not Applicable (US-089 no crea migraciones; scope DB en PB-P0-001)
- Seed: Not Applicable
- Authorization: Passed (`GET /health` público confirmado por AUTH-TS-01)
- Security: Passed (helmet activo; `.env.example` sin secretos; logs sin PII)
- Accessibility: Not Applicable (sin UI)
- i18n: Not Applicable
- Documentation: Passed (DOC-001, DOC-002 aplicadas)
- Unresolved debt: Limitación `z.coerce.boolean` en `HELMET_ENABLED` (no afecta esta US; registrada)
- Final status: Done

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-08T00:00:00Z | Initialized | Execution record creado |
| 2026-07-08T00:00:00Z | Readiness | READY_WITH_WARNINGS (3 warnings de ubicación/ESM/scaffold preexistente) |
| 2026-07-08T00:00:00Z | Alignment | ALIGNED_WITH_NOTES |
| 2026-07-08T00:00:00Z | Ejecución | Fases 1–4 implementadas en `backend/`; evidencia registrada por tarea |
| 2026-07-08T00:00:00Z | Final | US-089 → Done (14/14 tareas; typecheck/lint/test/build verdes) |
</content>
</invoke>
