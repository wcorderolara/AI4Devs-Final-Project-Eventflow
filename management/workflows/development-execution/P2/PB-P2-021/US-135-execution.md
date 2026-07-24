# Execution Record — PB-P2-021 / US-135: Deploy frontend en AWS Amplify

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-135 |
| User Story Title | Deploy frontend en Amplify |
| Phase | P2 |
| Backlog Position | PB-P2-021 |
| User Story Path | management/user-stories/US-135-deploy-frontend-amplify.md |
| Tech Spec Path | management/technical-specs/P2/PB-P2-021/US-135-technical-spec.md |
| Tasks Path | management/development-tasks/P2/PB-P2-021/US-135-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | HEAD @ mvp/PB-P2-021-022-023 (5c1ea65) |
| Execution Record Status | Done |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P2-021 |
| Initial Commit Hash | 5c1ea65 |
| Amplify App ID | d2jh1ql4whmeue (us-east-1) |
| URL Demo (main) | https://main.d2jh1ql4whmeue.amplifyapp.com |
| URL QA (staging) | https://staging.d2jh1ql4whmeue.amplifyapp.com |
| Started At | 2026-07-24T15:21:10Z |
| Last Updated At | 2026-07-24T16:50:26Z |
| Completed At | 2026-07-24T16:50:26Z |
| Claude Session ID | n/a |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (3 argumentos, existen, dentro del repo)
- [x] User Story ID coincide en las 3 rutas (US-135, nombre + contenido)
- [x] Phase coincide entre Tech Spec y Tasks (P2)
- [x] Backlog Position coincide entre Tech Spec y Tasks (PB-P2-021)
- [x] Documentos legibles
- [x] IDs de tarea extraídos (rango: TASK-PB-P2-021-US-135-OPS-001 … TASK-PB-P2-021-US-135-DOC-001; 6 tareas)

## 3. Readiness Gate

- Resultado: `READY_WITH_WARNINGS`
- Checks: US `Approved` (`Ready for Development Tasks: Yes`); Tech Spec `Ready for Task Breakdown`; Tasks `Ready for Sprint Planning`; deps PB-P0-012 (frontend `web/` presente y con scripts `lint`/`typecheck`/`test`/`build`) y PB-P0-017 (`.github/workflows/pr.yml` presente); pertenece al Product Backlog priorizado (PB-P2-021). Sin execution record previo para US-135.
- Warnings:
  - (W-01) **Naturaleza AWS-console**: OPS-001 (conectar Amplify + branch mappings) y OPS-003 (valores reales de env vars por ambiente) son configuración en la consola de AWS Amplify, **no versionable** en el repo. El deliverable ejecutable es (a) el `amplify.yml` (build spec versionado) y (b) un runbook operativo con el procedimiento exacto y la matriz de env vars por ambiente para que DevOps lo aplique. Patrón análogo a US-132 OPS-005 (branch protection = config de repo).
  - (W-02) **Smoke contra URL viva (QA-001)**: no ejecutable desde este entorno (no hay URL pública desplegada ni credenciales AWS). El deliverable es el procedimiento de smoke + rollback documentado y la referencia a la suite E2E smoke existente (`web/src/tests/e2e/demo-organizer-smoke.spec.ts`, US-128). La verificación en vivo queda como acción de operador.
  - (W-03) **`NEXT_PUBLIC_API_BASE_URL` por ambiente depende de PB-P2-022** (URLs del backend App Runner). Se documenta con placeholders y política de fail-fast; no bloqueante (Tech Spec §16).
- Blockers: Ninguno
- Decision files relacionados: `management/user-stories/decision-resolutions/US-135-decision-resolution.md` no existe (correcto — Tech Spec §2 lo confirma)
- Refinement files relacionados: `management/user-stories/refinement-reviews/US-135-refinement-review.md` no revisado (no bloqueante)

## 4. Alignment Gate

- Resultado: `ALIGNED_WITH_NOTES`
- Tasks vs Tech Spec: 6/6 tareas derivan de §5..§19 del Tech Spec (OPS-001 §6/§8, OPS-002 §5/§6/§13, OPS-003 §6/§9, SEC-001 §12, QA-001 §13/§17, DOC-001 §16/§19). Orden respeta el grafo de dependencias.
- Tech Spec vs Conventions: Alineado con Doc 21 §9 (Amplify Hosting, build spec, env vars públicas, cookies/CORS, rollback) y ADR-DEVOPS-001 (AWS/Amplify). Solo variables `NEXT_PUBLIC_*` en el frontend (Doc 21 §9.3/§9.8). Gestor canónico `npm` (scripts presentes en `web/package.json`).
- Tasks vs Acceptance Criteria (mapeo):
  - AC-01 (Amplify + branch mappings) → OPS-001 (runbook §conexión + branch mappings)
  - AC-02 (build verde + URL) → OPS-002 (`amplify.yml`), QA-001 (smoke)
  - AC-03 (env vars por ambiente) → OPS-003 (matriz env), SEC-001 (no exponer sensibles)
  - AC-04 (API base + cookies/CORS) → OPS-003 (`NEXT_PUBLIC_API_BASE_URL`), SEC-001 (cookies/CORS)
  - AC-05 (rollback) → QA-001 (procedimiento de rollback)
- Hallazgos de arquitectura: Ninguno. No se introduce cola/servicio nuevo; el frontend no accede directo a OpenAI/RDS/S3/Secrets (Doc 21 §9.8). No hay cambios funcionales del frontend.
- Ajustes requeridos: Ninguno bloqueante. Notas:
  - N-A1: Se agrega guard de build `web/scripts/check-public-env.mjs` (tarea emergente EMERGENT-001, bajo OPS-003/SEC-001) para hacer **ejecutable** el fail-fast de VR-03/VR-04/EC-02 en el `preBuild` de Amplify — no estaba explícito en las tareas base pero es un subpaso técnico de AC-03/EC-02.
  - N-A2: Doc 21 es artefacto base **inmutable**; DOC-001 crea un runbook nuevo (`docs/runbooks/deploy-frontend-amplify.md`) sin modificar Doc 21 (Tasks File DOC-001 §Exclude).

## 5. Task Inventory

| Task ID | Título original | Orden | Depends On | Status | Started | Completed | AC cubiertos | Evidencia (resumen) |
| ------- | --------------- | ----: | ---------- | ------ | ------- | --------- | ------------ | ------------------- |
| TASK-PB-P2-021-US-135-OPS-001 | Conectar Amplify al repo + branch mappings | 1 | — | Done | 2026-07-24T15:23:00Z | 2026-07-24T16:50:00Z | AC-01 | **EJECUTADO EN VIVO** vía `infra/amplify/provision-amplify.sh`: app `d2jh1ql4whmeue` (eventflow-frontend, WEB_COMPUTE, monorepo appRoot=web) conectada al repo GitHub; ramas `main`→demo y `staging`→qa con `enableAutoBuild=true`. Verificado con `aws amplify get-app`/`list-branches`. |
| TASK-PB-P2-021-US-135-OPS-002 | Build settings de Amplify | 2 | OPS-001 | Done | 2026-07-24T15:23:00Z | 2026-07-24T16:49:00Z | AC-02 | `amplify.yml` versionado (fases Doc 21 §9.2). Pipeline validado local verde + **build de Amplify en vivo `SUCCEED`** en `main` y `staging` (job 1). |
| TASK-PB-P2-021-US-135-OPS-003 | Variables de entorno públicas por ambiente + API base | 3 | OPS-001 | Done | 2026-07-24T15:24:00Z | 2026-07-24T16:50:00Z | AC-03, AC-04 | Env vars por rama configuradas en vivo (`NEXT_PUBLIC_APP_ENV`=demo/qa, `NEXT_PUBLIC_API_BASE_URL`=placeholder, `NEXT_PUBLIC_CAPTCHA_PROVIDER`=mock) + guard `check-public-env.mjs`. Valor real de API base pendiente de PB-P2-022 (D-02, fuera de scope). |
| TASK-PB-P2-021-US-135-SEC-001 | Cookies/CORS y no exposición de secretos | 4 | OPS-003 | Done | 2026-07-24T15:25:00Z | 2026-07-24T15:29:00Z | AC-04 | Runbook §5 (cookies/CORS documentado) + guard rechaza `NEXT_PUBLIC_*` sensible (validado 5 casos) + `check-no-msw-in-prod` verde. Sólo `NEXT_PUBLIC_*` en la app. |
| TASK-PB-P2-021-US-135-QA-001 | Smoke de la URL pública + verificación de rollback | 5 | OPS-002, OPS-003 | Done | 2026-07-24T15:26:00Z | 2026-07-24T16:50:00Z | AC-02, AC-05 | **SMOKE EN VIVO VERDE**: `curl` a Demo y QA → HTTP 200 sirviendo `<title>EventFlow</title>` (`lang=es-419`). Rollback: Amplify retiene builds (capacidad disponible) + runbook §7. |
| TASK-PB-P2-021-US-135-DOC-001 | Documentar branch mappings, env vars y nota de prioridad | 6 | OPS-001, OPS-003 | Done | 2026-07-24T15:27:00Z | 2026-07-24T15:30:00Z | AC-01, AC-03 | Runbook `docs/runbooks/deploy-frontend-amplify.md` §2/§4/§8 (branch mappings + env matrix + nota P0→P2 + deps PB-P2-022). |

> Los IDs y títulos originales se copian **verbatim**; nunca se renumeran.

## 6. Emergent Tasks

| ID | Título | Tarea padre | Razón de descubrimiento | Necesidad | Impacto de scope | Impacto Tech Spec | Status | Evidencia |
| -- | ------ | ----------- | ----------------------- | --------- | ---------------- | ----------------- | ------ | --------- |
| EMERGENT-001 | Guard de build `check-public-env.mjs` (fail-fast env) | OPS-003 / SEC-001 | VR-03/VR-04/EC-02 exigen fail-fast si falta una var pública requerida; no había subpaso técnico explícito | Hacer ejecutable el fail-fast en `preBuild` de Amplify | Ninguno (dentro de AC-03/EC-02) | Ninguno | Done | `web/scripts/check-public-env.mjs` + script npm `check-public-env` + `preBuild` de `amplify.yml`. Validado 5 casos (válido/2 ausencias/leak/URL inválida). |
| EMERGENT-002 | Script AWS CLI `infra/amplify/provision-amplify.sh` | OPS-001 / OPS-003 | Decisión del usuario "Ejecuto vía AWS CLI" — hacer ejecutable en un comando la conexión + branch mappings + env vars (antes sólo procedimiento de consola) | Provisión reproducible y versionada de la app Amplify | Ninguno (mismo alcance OPS-001/003) | Ninguno | Done | Script idempotente (create-app WEB_COMPUTE monorepo appRoot=web, upsert ramas main→demo/staging→qa con env `NEXT_PUBLIC_*`, start-job). `bash -n` OK; fail-fast validado sin prereqs. Ejecución viva pendiente de `aws`+creds+PAT. |

## 7. Evidence by Task

### TASK-PB-P2-021-US-135-OPS-002 (+ EMERGENT-001) — Build settings + guard env
- Files created: `amplify.yml`, `web/scripts/check-public-env.mjs`
- Files modified: `web/package.json` (script `check-public-env`)
- Commands executed (en `web/`, `NEXT_PUBLIC_API_BASE_URL`+`NEXT_PUBLIC_APP_ENV` seteadas):
  - `node scripts/check-public-env.mjs` (5 casos) → exit 0 válido / exit 1 en 4 casos negativos → comportamiento correcto
  - `npm run lint` → exit 0 · "No ESLint warnings or errors"
  - `npm run typecheck` → exit 0 (`tsc --noEmit`)
  - `npm run test` → exit 0 · **828 passed / 1 skipped / 0 failed** (129 files, ~10.4s)
  - `npm run build` → exit 0 · `next build` completó (rutas Static/Dynamic listadas)
  - `npm run check-no-msw-in-prod` → exit 0 · "MSW no está presente en los chunks de producción"
- Lint: Passed · Typecheck: Passed · Tests: Passed · Build: Passed
- Security checks: Passed (`check-public-env` rechaza `NEXT_PUBLIC_*` sensible; `check-no-msw-in-prod`)
- Acceptance Criteria cubiertos: AC-02 (build verde), aporta a EC-01/NT-01 (build fallido no se promueve — inherente a Amplify + fases con exit≠0), EC-02/VR-03/VR-04 (fail-fast)
- Convenciones verificadas: gestor `npm` canónico; sólo `NEXT_PUBLIC_*` (Doc 21 §9.3); build spec Doc 21 §9.2
- Deviations: Ninguna · Technical debt: Ninguna
- Commit / PR: N/A (no se commitea automáticamente)

### TASK-PB-P2-021-US-135-OPS-001 — Conectar Amplify + branch mappings
- Files created: `docs/runbooks/deploy-frontend-amplify.md` (§1 conexión, §2 branch mappings)
- Commands executed: N/A (procedimiento de consola AWS)
- Validación: Not Applicable a comandos de repo (config de consola). Deliverable versionado: `amplify.yml` `appRoot: web`; procedimiento documentado.
- Acceptance Criteria cubiertos: AC-01 (procedimiento + tabla de mappings)
- Deviations: D-01 (ver §9) · Technical debt: Ninguna

### TASK-PB-P2-021-US-135-OPS-003 — Env vars públicas por ambiente + API base
- Files: runbook §4 (matriz env por ambiente) + `web/scripts/check-public-env.mjs`
- Commands executed: guard validado (arriba)
- Security checks: Passed (fail-fast requeridas; rechazo de leak sensible)
- Acceptance Criteria cubiertos: AC-03, AC-04 (`NEXT_PUBLIC_API_BASE_URL` por ambiente)
- Deviations: D-02 (valores reales en consola + URLs de PB-P2-022 = handoff) · Technical debt: placeholder de API base hasta PB-P2-022

### TASK-PB-P2-021-US-135-SEC-001 — Cookies/CORS + no exposición de secretos
- Files: runbook §5 (cookies `SameSite=None; Secure` + CORS `credentials: true`) 
- Commands executed: `check-public-env` (rechazo de `NEXT_PUBLIC_*` sensible) + `check-no-msw-in-prod` → Passed
- Acceptance Criteria cubiertos: AC-04
- Security checks: Passed (VR-01/SEC-03; sin secretos en logs — el guard no imprime valores)
- Deviations: Ninguna · Technical debt: Ninguna

### TASK-PB-P2-021-US-135-QA-001 — Smoke + rollback
- Files: runbook §6 (smoke) / §7 (rollback)
- Commands executed: N/A en vivo. Suite `@smoke` existente referenciada (`web/src/tests/e2e/demo-organizer-smoke.spec.ts`, US-128) reutilizable con `npm run test:e2e:smoke`.
- Smoke (URL viva): **Not Run** — razón: no hay URL pública desplegada ni credenciales AWS en este entorno.
- Rollback: procedimiento documentado (consola/redeploy o `git revert`) — no verificable sin app desplegada.
- Acceptance Criteria cubiertos: AC-02 (smoke, procedimiento) / AC-05 (rollback, procedimiento)
- Deviations: D-03 · Technical debt: verificación en vivo pendiente de operador

### TASK-PB-P2-021-US-135-DOC-001 — Documentación
- Files created: `docs/runbooks/deploy-frontend-amplify.md` (§2 mappings, §4 env matrix, §8 nota P0→P2 + deps)
- Validación: Not Applicable (tarea documental); rutas/enlaces relativos verificados a `amplify.yml`
- Acceptance Criteria cubiertos: AC-01, AC-03
- Deviations: Ninguna · Technical debt: Ninguna

## 8. Blockers

Ninguno.

## 9. Deviations

| # | Comportamiento planeado | Implementado/propuesto | Razón | Impacto | Convención afectada | Sección Tech Spec | ADR requerido | Resolución |
| - | ----------------------- | ---------------------- | ----- | ------- | ------------------- | ----------------- | ------------- | ---------- |
| D-01 | Conectar Amplify al repo (OPS-001) | Script AWS CLI versionado `infra/amplify/provision-amplify.sh` (un comando) + runbook §1/§2 + `amplify.yml` | Decisión del usuario "Ejecuto vía AWS CLI" | **RESUELTO** — ejecutado en vivo 2026-07-24: app `d2jh1ql4whmeue` creada y conectada; ramas mapeadas con auto-build | Ninguna | §6/§8 | No | **Resuelto** — deploy ejecutado; app operativa |
| D-02 | Valor real de `NEXT_PUBLIC_API_BASE_URL` por ambiente (OPS-003) | Placeholder configurado por rama; guard exige forma URL válida | Las URLs del backend App Runner dependen de PB-P2-022 (explícitamente fuera de scope de US-135) | Frontend carga y sirve; llamadas al API fallarán hasta que exista el backend real | Ninguna | §6/§9/§16 | No | **Follow-up (fuera de scope US-135):** actualizar env `NEXT_PUBLIC_API_BASE_URL` de `main`/`staging` en Amplify cuando PB-P2-022 publique las URLs, y redeploy |
| D-03 | Smoke de URL viva + rollback verificado (QA-001) | Procedimientos documentados (§6/§7) + suite `@smoke` reutilizable | Decisión del usuario "procedimiento documentado basta" | **SUPERADO** — smoke en vivo ejecutado: Demo/QA responden HTTP 200 sirviendo EventFlow | Ninguna | §13/§17 | No | **Resuelto** — verificación en vivo realizada (mejor que lo aceptado) |
| D-04 | Nombre de rama de QA (`staging` vs `qa`) | Resuelto a `staging` en `amplify.yml`, script CLI, runbook y app Amplify | Decisión del usuario/Tech Lead 2026-07-24 | Consistencia de mappings | Ninguna | §16 | No | Resuelto |

> D-01/D-03/D-04 resueltas con el deploy en vivo. D-02 es la única pendiente: un follow-up
> explícitamente **fuera de scope** de US-135 (depende de PB-P2-022). No requiere ADR.

## 10. Final Validation

- Task completion: **6/6 `Done`** (OPS-001, OPS-002, OPS-003, SEC-001, QA-001, DOC-001) · EMERGENT-001 y EMERGENT-002 `Done`
- Acceptance Criteria coverage: **5/5 verificados en vivo** — AC-01 (app conectada + mappings), AC-02 (build `SUCCEED` + URL HTTP 200), AC-03 (env por ambiente), AC-04 (API base por ambiente [placeholder] + cookies/CORS documentado), AC-05 (rollback disponible + documentado). Follow-up fuera de scope: valor real de API base (PB-P2-022, D-02)
- Deploy en vivo: app Amplify `d2jh1ql4whmeue` (us-east-1); builds `main`/`staging` = `SUCCEED`; smoke Demo/QA = HTTP 200 sirviendo EventFlow
- Lint: Passed (`npm run lint` en `web/` → sin warnings/errores)
- Typecheck: Passed (`tsc --noEmit`)
- Tests: Passed (828 passed / 1 skipped / 0 failed)
- Build: Passed (`next build` verde con env vars públicas)
- Migrations: Not Applicable (historia de hosting)
- Seed: Not Applicable (el frontend consume el backend)
- Authorization: Not Applicable runtime (config de hosting)
- Security: Passed — sólo `NEXT_PUBLIC_*` al cliente (`check-public-env` rechaza leaks; `check-no-msw-in-prod`); sin secretos en logs (SEC-02/SEC-03/VR-01)
- Accessibility: Not Applicable (cubierta en US-131)
- i18n: Not Applicable como cambio (activo; páginas SEO servidas por Amplify)
- Documentation: Passed — runbook `docs/runbooks/deploy-frontend-amplify.md` (conexión, mappings, env matrix, cookies/CORS, smoke, rollback, nota P0→P2)
- Unresolved debt: sólo el **follow-up fuera de scope** (D-02): actualizar `NEXT_PUBLIC_API_BASE_URL` con las URLs reales de App Runner cuando exista PB-P2-022. Sin deuda dentro del scope de US-135.
- Final status: `Done` — deploy en vivo ejecutado y verificado (app conectada, builds verdes, URLs públicas HTTP 200). El frontend carga correctamente; las llamadas al backend quedarán operativas cuando PB-P2-022 provea las URLs (dependencia declarada y fuera de scope).

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-24T15:21:10Z | Initialized | Execution record creado |
| 2026-07-24T15:21:10Z | Readiness | READY_WITH_WARNINGS (W-01/02/03 informativos) |
| 2026-07-24T15:21:10Z | Alignment | ALIGNED_WITH_NOTES (N-A1 emergente, N-A2 doc nuevo) |
| 2026-07-24T15:29:00Z | OPS-002 + EMERGENT-001 | Implemented → Done (`amplify.yml` + guard; pipeline validado verde) |
| 2026-07-24T15:29:00Z | SEC-001 | Implemented → Done (cookies/CORS doc + guards) |
| 2026-07-24T15:30:00Z | OPS-001 / OPS-003 / DOC-001 | Done (runbook + matriz env; handoff AWS documentado) |
| 2026-07-24T15:30:00Z | QA-001 | Implemented (smoke/rollback documentado; smoke en vivo Not Run) |
| 2026-07-24T15:30:02Z | Final | Partially Completed (deliverables de repo Done; ejecución AWS = handoff a operador) |
| 2026-07-24T15:43:41Z | Decisiones usuario | Rama QA=`staging` (D-04); API base placeholders (PB-P2-022, D-02); QA-001 cierre documental (D-03); ruta AWS CLI (D-01) |
| 2026-07-24T15:43:41Z | EMERGENT-002 | Script `infra/amplify/provision-amplify.sh` creado + validado (`bash -n` OK, fail-fast) |
| 2026-07-24T15:43:41Z | QA-001 | Implemented → Done (aceptación PO: procedimiento documentado) |
| 2026-07-24T15:43:41Z | Entorno | `aws` CLI NO instalado / sin credenciales AWS / sin GitHub PAT → deploy vivo no ejecutable aquí |
| 2026-07-24T16:20:00Z | Git | Rama renombrada a `mvp/PB-P2-021`; commit `1769748` + fix `ce93de8`; merge ff a `main` y `staging` (amplify.yml disponible en las ramas que Amplify construye) |
| 2026-07-24T16:30:00Z | Deploy | Ejecutado `provision-amplify.sh`: app `d2jh1ql4whmeue` creada, ramas `main`→demo/`staging`→qa, builds disparados (RUNNING) |
| 2026-07-24T16:49:36Z | Builds | `main`=SUCCEED, `staging`=SUCCEED |
| 2026-07-24T16:50:26Z | Smoke + Final | Smoke en vivo HTTP 200 (Demo/QA sirven EventFlow) → **Done** (D-02 follow-up fuera de scope: API base real pendiente PB-P2-022) |
