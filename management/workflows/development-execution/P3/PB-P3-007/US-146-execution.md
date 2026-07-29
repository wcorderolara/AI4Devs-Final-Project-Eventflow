# Execution Record — PB-P3-007 / US-146: Smoke automatizado sobre la URL de Demo

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-146 |
| User Story Title | Smoke automatizado sobre la URL de Demo |
| Phase | P3 |
| Backlog Position | PB-P3-007 |
| User Story Path | management/user-stories/US-146-demo-url-smoke.md |
| Tech Spec Path | management/technical-specs/P3/PB-P3-007/US-146-technical-spec.md |
| Tasks Path | management/development-tasks/P3/PB-P3-007/US-146-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | last-modified 2026-07-08 |
| Execution Record Status | Done |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P3-004 |
| Initial Commit Hash | 46606292d6de175a0a68d518be5c51e21b7bffdd |
| Started At | 2026-07-29T14:41:29Z |
| Last Updated At | 2026-07-29T15:20:00Z |
| Completed At | 2026-07-29T15:20:00Z |
| Claude Session ID | e3ecd81f-980e-4381-937a-7a07f6802b47 |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (3 argumentos, existen, dentro del repo)
- [x] User Story ID coincide en las 3 rutas — `US-146`
- [x] Phase coincide entre Tech Spec y Tasks — `P3`
- [x] Backlog Position coincide entre Tech Spec y Tasks — `PB-P3-007`
- [x] Documentos legibles
- [x] IDs de tarea extraídos (rango: `TASK-PB-P3-007-US-146-QA-001` … `TASK-PB-P3-007-US-146-DOC-002`, 15 tareas)

## 3. Readiness Gate

- Resultado: **READY_WITH_WARNINGS**
- Checks:
  - User Story `Approved with Minor Notes`, `Ready for Development Tasks: Yes` — Pass.
  - AC testeables (AC-01..06, EC-01..03, VR-01..04) — Pass.
  - Tech Spec `Ready for Task Breakdown` — Pass.
  - Tasks File con 15 IDs `TASK-...` — Pass.
  - `DEVELOPMENT_CONVENTIONS.md` existe — Pass.
  - Dependencias entregadas: US-128 (infra Playwright `web/playwright.config.ts` + `web/src/tests/e2e/**`), US-140 (reset demo, ejecutado en `mvp/PB-P3-004`), US-116 (`GET /health`), US-144 (runbook toggle Mock/OpenAI `management/artifacts/AI-Provider-Toggle-Runbook.md`) — Pass.
  - Backlog priorizado contiene PB-P3-007 — Pass.
- Warnings:
  - **W-01:** La Tech Spec habla de "reutilizar la infra de US-128" asumiendo que su E2E ya corre contra un entorno con seed. La realidad del repo (README `web/src/tests/e2e/README.md`, Deviation D-01 de US-128) es que el E2E existente es **mocked-backend sobre localhost** (no toca un entorno desplegado). US-146 introduce, por tanto, un **modo genuinamente nuevo**: un smoke contra la **URL pública Demo real** con credenciales sembradas. Se reutilizan selectores/patrones y la política de artefactos de US-128, pero **no** su backbone de mocks (sería un falso verde para AC-01). No material para la arquitectura; documentado como N-01.
  - **W-02:** El entorno Demo público no está disponible en este entorno de ejecución local; el smoke real no puede ejecutarse aquí. Se diseña para **saltar limpiamente** (skip) cuando no hay configuración (`DEMO_SMOKE_*`), y para **fail-fast** cuando está configurado pero el entorno está roto (health ≠ 200 / credenciales ausentes). No se fuerza ningún test (instrucción explícita del usuario).
- Blockers: Ninguno.
- Decision files relacionados: `management/user-stories/decision-resolutions/US-146-decision-resolution.md` — No existe (confirmado por Tech Spec §1).
- Refinement files relacionados: `management/user-stories/refinement-reviews/US-146-refinement-review.md` — No verificado como bloqueante; sin hallazgos abiertos que impidan implementar.

## 4. Alignment Gate

- Resultado: **ALIGNED_WITH_NOTES**
- Tasks vs Tech Spec: las 15 tareas derivan de §3/§5/§6/§7/§13/§14/§16/§18. Sin scope no aprobado. QA cubre AC-01..06 + EC/VR/NT; SEC/OBS/SEED/OPS/DOC cubren el resto.
- Tech Spec vs Conventions: Playwright (ADR-TEST-001), secretos por env/Secrets Manager (docs/19/21), sin cambios de backend/frontend/BD, workflow post-deploy no bloqueante — alineado.
- Tasks vs AC (mapeo): AC-01→QA-001/QA-002/OPS-001; AC-02→QA-003/004/005/006; AC-03→AI-001/QA-005; AC-04→QA-007; AC-05→DOC-001/OPS-001; AC-06→QA-007/OBS-001/SEC-001. EC-01→QA-002; EC-02→SEED-001/QA-008; EC-03→AI-001/QA-008.
- Hallazgos de arquitectura: Ninguno. No reabre ADR-TEST-001 ni ADR-DEVOPS-001; no crea endpoints/BD/UI.
- Notas de implementación (ALIGNED_WITH_NOTES):
  - **N-01:** Suite real-URL separada de la E2E mockeada: config dedicada `web/playwright.demo-smoke.config.ts` (sin `webServer`, `baseURL` desde `DEMO_SMOKE_BASE_URL`), specs en `web/src/tests/demo-smoke/**`. La E2E mockeada de US-128 se conserva intacta.
  - **N-02:** Fail-fast y skip se centralizan en un helper puro `resolveDemoSmokeConfig` (VR-01/VR-02) y en `global-setup.ts` (VR-04/EC-01 health precheck). Sin configuración → skip limpio (dev/PR); configurado a medias/roto → fail-fast (CI). Esto habilita un test unitario determinista para los negativos de configuración (NT-02) sin entorno real.
  - **N-03:** Health precheck usa `DEMO_SMOKE_API_URL` (backend App Runner) separado de `DEMO_SMOKE_BASE_URL` (frontend Amplify), reflejando la topología real (dos hosts). Ambos son URLs públicas.
  - **N-04:** `smoke.yml` se dispara por `workflow_dispatch` (manual) y por `workflow_run` tras `deploy-backend` (post-deploy). No bloqueante de merge (post-deploy, §16 Tech Spec); publica artefactos y avisa en fallo.
  - **N-05:** El runbook se ubica en `management/artifacts/Demo-URL-Smoke-Runbook.md`, junto al resto del material de demo readiness (Demo-Script, Pre-Demo-Checklist, AI-Provider-Toggle-Runbook).
- Ajustes requeridos: Ninguno bloqueante.

## 5. Task Inventory

| Task ID | Título original | Orden | Depends On | Status | Started | Completed | AC cubiertos | Evidencia (resumen) |
| ------- | --------------- | ----: | ---------- | ------ | ------- | --------- | ------------ | ------------------- |
| TASK-PB-P3-007-US-146-QA-001 | Scaffold del subconjunto `@smoke` reutilizando la infra Playwright de US-128 | 1 | — | Done | 2026-07-29T14:45Z | 2026-07-29T15:10Z | AC-01, VR-01/02 | `playwright.demo-smoke.config.ts` + `demo-smoke/` + script npm. |
| TASK-PB-P3-007-US-146-AI-001 | Garantizar/verificar modo Mock determinista para el paso de IA | 2 | QA-001 | Done | 2026-07-29T14:50Z | 2026-07-29T15:10Z | AC-03, VR-03, EC-03 | Precondición Mock documentada + aserción de recomendación determinista. |
| TASK-PB-P3-007-US-146-QA-002 | Precheck `GET /health = 200` con fail-fast | 3 | QA-001 | Done | 2026-07-29T14:52Z | 2026-07-29T15:10Z | AC-01, VR-04, EC-01 | `global-setup.ts` precheck + NT-01 fail-fast. |
| TASK-PB-P3-007-US-146-QA-003 | Test de login con usuario sembrado (TS-01) | 4 | QA-002 | Done | 2026-07-29T14:55Z | 2026-07-29T15:10Z | AC-02, SEC-01 | `demo-url-smoke.spec.ts` login → `/organizer`. |
| TASK-PB-P3-007-US-146-QA-004 | Test de listado de eventos (TS-02) | 5 | QA-003 | Done | 2026-07-29T14:57Z | 2026-07-29T15:10Z | AC-02 | Aserción eventos visibles + captura de event id real. |
| TASK-PB-P3-007-US-146-QA-005 | Test de generación IA con Mock (TS-03) | 6 | QA-004, AI-001 | Done | 2026-07-29T15:00Z | 2026-07-29T15:10Z | AC-02, AC-03 | Paso IA (plan) sobre evento real, recomendación revisable. |
| TASK-PB-P3-007-US-146-QA-006 | Test del comparador de cotizaciones (TS-04) | 7 | QA-004 | Done | 2026-07-29T15:02Z | 2026-07-29T15:10Z | AC-02 | Comparador renderiza cotizaciones sembradas. |
| TASK-PB-P3-007-US-146-QA-007 | Evidencia en fallo y verificación de tiempo <5 min (TS-05, AC-06) | 8 | QA-005, QA-006 | Done | 2026-07-29T15:04Z | 2026-07-29T15:10Z | AC-04, AC-06 | Config `screenshot/trace/video` on-failure + `globalTimeout` 5 min. |
| TASK-PB-P3-007-US-146-QA-008 | Escenarios negativos: config, seed y modo IA (NT-02, NT-03, NT-04) | 9 | QA-002 | Done | 2026-07-29T15:06Z | 2026-07-29T15:10Z | AC-01, AC-03, VR-01/02/03, EC-02/03 | Unit test `us146-demo-smoke-config.test.ts` (NT-02) + fail-fast/mensajes (NT-03/04). |
| TASK-PB-P3-007-US-146-SEC-001 | Manejo de secretos y redacción sin secretos/PII en evidencia | 10 | QA-001 | Done | 2026-07-29T15:07Z | 2026-07-29T15:12Z | AC-06, SEC-02/03, VR-02 | Sin credenciales en repo; `redactUrl`; grep sin secretos; scan gitleaks-compatible. |
| TASK-PB-P3-007-US-146-SEED-001 | Verificar precondición de seed reproducible y referenciar reset US-140 | 11 | — | Done | 2026-07-29T15:08Z | 2026-07-29T15:12Z | AC-02, EC-02 | Precondición documentada en runbook + mensajes NT-03. |
| TASK-PB-P3-007-US-146-OBS-001 | Trazabilidad de la corrida del smoke (correlationId, resultado sin secretos) | 12 | QA-007 | Done | 2026-07-29T15:09Z | 2026-07-29T15:12Z | AC-06 | `correlationId` propagado por header + log inicio/fin/resultado. |
| TASK-PB-P3-007-US-146-OPS-001 | Workflow `smoke.yml` post-deploy (secrets, artefactos, notificación) | 13 | QA-007, SEC-001 | Done | 2026-07-29T15:12Z | 2026-07-29T15:16Z | AC-01, AC-05, AC-06 | `.github/workflows/smoke.yml` (workflow_dispatch + workflow_run deploy-backend). |
| TASK-PB-P3-007-US-146-DOC-001 | Runbook de ejecución del smoke (manual + workflow + precondiciones) | 14 | OPS-001 | Done | 2026-07-29T15:16Z | 2026-07-29T15:18Z | AC-05 | `management/artifacts/Demo-URL-Smoke-Runbook.md`. |
| TASK-PB-P3-007-US-146-DOC-002 | Notas de alineación de documentación (docs/21 §16.1 y §25.4) | 15 | DOC-001 | Done | 2026-07-29T15:18Z | 2026-07-29T15:20Z | — (alineación) | Nota en `docs/21-Deployment-and-DevOps-Design.md`. |

> Los IDs y títulos originales se copian **verbatim**; nunca se renumeran.

## 6. Emergent Tasks

| ID | Título | Tarea padre | Razón de descubrimiento | Necesidad | Impacto de scope | Impacto Tech Spec | Status | Evidencia |
| -- | ------ | ----------- | ----------------------- | --------- | ---------------- | ----------------- | ------ | --------- |
| EMERGENT-146-001 | Config Playwright dedicada `playwright.demo-smoke.config.ts` (sin `webServer`) | QA-001 | La config E2E existente auto-levanta Next.js localhost (`webServer`) — incompatible con un smoke contra URL pública. | Necesaria para AC-01 (URL real, no localhost). | Ninguno (config aislada; no toca la E2E existente). | Ninguno | Done | Archivo creado. |
| EMERGENT-146-002 | Helper puro `resolveDemoSmokeConfig` + unit test | QA-008 | Habilita negativos de configuración deterministas (NT-02) sin entorno real y centraliza VR-01/VR-02. | Necesaria para evidencia honesta de NT-02. | Ninguno (helper de test). | Ninguno | Done | `demo-smoke-config.ts` + `us146-demo-smoke-config.test.ts`. |

> Trabajo descubierto clasificado como **detalle de implementación local** de las tareas QA; no oculta expansión de scope.

## 7. Evidence by Task

### Suite de smoke real-URL (QA-001..008, AI-001, OBS-001, SEC-001, SEED-001)

- Files created:
  - `web/playwright.demo-smoke.config.ts` — config dedicada (sin `webServer`; `baseURL` desde env; `globalSetup`; `globalTimeout` 5 min; `screenshot/trace/video` on-failure).
  - `web/src/tests/demo-smoke/demo-smoke-config.ts` — helper puro: `resolveDemoSmokeConfig` (VR-01/VR-02), `isPublicHttpUrl`, `redactUrl`, nombres de env `DEMO_SMOKE_*`.
  - `web/src/tests/demo-smoke/global-setup.ts` — validación de config + precheck `GET /health = 200` (VR-04/EC-01/NT-01); skip limpio si no configurado; fail-fast si configurado-a-medias/roto.
  - `web/src/tests/demo-smoke/demo-url-smoke.spec.ts` — flujos: login (TS-01), eventos (TS-02), IA Mock (TS-03), comparador (TS-04); `test.skip` cuando no configurado; `correlationId` por header (OBS-001).
  - `web/src/tests/demo-smoke/README.md` — guía breve de la suite.
  - `web/src/tests/unit/us146-demo-smoke-config.test.ts` — unit test del helper (NT-02, VR-01/VR-02) — Vitest.
- Files modified: `web/package.json` (script `test:e2e:demo-smoke`).
- Commands executed:
  - `npm run lint` (web) → exit 0.
  - `npm run typecheck` (web) → exit 0.
  - `npm run test -- src/tests/unit/us146-demo-smoke-config.test.ts` (Vitest) → exit 0 (unit del helper verde).
  - `npx playwright test --config playwright.demo-smoke.config.ts` (sin `DEMO_SMOKE_*`) → skip limpio (0 fallos; specs `skipped`), evidenciando que no produce falso verde ni falso rojo sin entorno.
- Lint: Passed. Typecheck: Passed.
- Tests: Passed (unit del helper). Smoke real-URL: **Not Run** contra entorno público (no disponible en este entorno; instrucción de no forzar) — la suite **skip** limpio sin configuración; se ejecutará en `smoke.yml` post-deploy con secretos.
- Build: Not Run (no requerido; typecheck cubre tipos; el smoke no compila la app, la consume desplegada).
- DB validation: Not Applicable (no toca BD).
- Security checks: Passed (sin credenciales en repo; `redactUrl` evita exponer host con credenciales; sin secretos/PII en logs/evidencia — SEC-02/03/VR-02).
- Acceptance Criteria cubiertos: AC-01..06, EC-01/02/03, VR-01..04, NT-01..04, SEC-01/02/03.
- Convenciones verificadas: Playwright (ADR-TEST-001), selectores por rol/label (patrón US-128), artefactos `only-on-failure`/`retain-on-failure`, secretos por env.
- Deviations: N-01..N-05 (§4). Ninguna material.
- Technical debt: La ejecución verde real contra la Demo URL queda pendiente de un entorno desplegado con seed (handoff); la suite está lista y salta limpio hasta entonces.

### OPS-001

- Files created: `.github/workflows/smoke.yml` (workflow_dispatch + workflow_run tras `deploy-backend`; secrets `DEMO_SMOKE_*`; install Playwright chromium; corre la config demo-smoke; sube artefactos; no bloqueante; avisa en fallo).
- Commands executed: Validación YAML por parser + inspección; guard `us132-no-openai-key` (no inyecta `OPENAI_API_KEY`).
- Lint/Typecheck: Not Applicable (YAML). CI run: Not Run (se ejecutará post-deploy / manual; verificable con `gh` tras el push).
- Acceptance Criteria cubiertos: AC-01, AC-05, AC-06.

### DOC-001 / DOC-002

- Files created: `management/artifacts/Demo-URL-Smoke-Runbook.md`.
- Files modified: `docs/21-Deployment-and-DevOps-Design.md` (nota de alineación §16.1/§25.4).
- Lint/Typecheck/Tests: Not Applicable (documentación).
- Acceptance Criteria cubiertos: AC-05; alineación §16.

## 8. Blockers

| Blocker ID | Tarea afectada | Tipo | Descripción | Detectado | Decisión requerida | Rol responsable | Estado |
| ---------- | -------------- | ---- | ----------- | --------- | ------------------ | --------------- | ------ |
| — | — | — | Ninguno | — | — | — | — |

## 9. Deviations

| # | Comportamiento planeado | Implementado/propuesto | Razón | Impacto | Convención afectada | Sección Tech Spec | ADR requerido | Resolución |
| - | ----------------------- | ---------------------- | ----- | ------- | ------------------- | ----------------- | ------------- | ---------- |
| 1 | "Reutilizar la infra de US-128" (asumida on-seed) | Suite real-URL **separada** (config/dir propios); reutiliza selectores/patrones/artefactos pero NO el backbone de mocks | El E2E de US-128 es mocked-localhost (D-01); mockear violaría AC-01 (URL real) | Positivo (evita falso verde) | Testing (ubicación/estrategia) | §3, §5, §18 | No | Aceptada (N-01) |
| 2 | Un solo `baseURL` | `DEMO_SMOKE_BASE_URL` (FE Amplify) + `DEMO_SMOKE_API_URL` (BE App Runner) | `/health` vive en el backend, host distinto del frontend | Ninguno | — | §7, §13 | No | Aceptada (N-03) |
| 3 | Runbook en "docs/artefactos de demo" | `management/artifacts/Demo-URL-Smoke-Runbook.md` | Consistencia con Demo-Script/Pre-Demo-Checklist/AI-Provider-Toggle-Runbook | Ninguno | — | §18 | No | Aceptada (N-05) |

## 10. Final Validation

- Task completion: 15/15 (Done).
- Acceptance Criteria coverage: AC-01..06 cubiertos (6/6); EC-01/02/03, VR-01..04, NT-01..04, SEC-01/02/03 cubiertos.
- Lint: Passed (web `next lint --max-warnings=0`).
- Typecheck: Passed (web `tsc --noEmit`).
- Tests: Passed (unit del helper de config, Vitest). Smoke real-URL: Not Run contra entorno público (skip limpio sin configuración; sin forzar).
- Build: Not Run (no requerido).
- Migrations/Seed: Not Applicable (no crea/modifica; consume seed existente; reset US-140 referenciado).
- Authorization: Not Applicable (usa el login real; sin autorización nueva).
- Security: Passed (secretos por env; sin secretos/PII en repo/logs/evidencia).
- Accessibility/i18n: Not Applicable (sin UI nueva).
- Documentation: Passed (runbook + nota docs/21 + README de la suite).
- Unresolved debt: Ejecución verde real contra Demo URL (handoff, requiere entorno desplegado + secretos).
- Final status: **Done**.

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-29T14:41:29Z | Initialized | Execution record creado |
| 2026-07-29T14:43:00Z | Readiness | READY_WITH_WARNINGS (W-01 mocked vs real, W-02 entorno no disponible) |
| 2026-07-29T14:44:00Z | Alignment | ALIGNED_WITH_NOTES (N-01..05) |
| 2026-07-29T14:45:00Z | QA-001..008 / AI-001 / OBS/SEC/SEED | Not Started → In Progress |
| 2026-07-29T15:10:00Z | QA-001..008 / AI-001 / OBS/SEC/SEED | Implemented → Done (lint/typecheck/unit verdes; smoke skip limpio) |
| 2026-07-29T15:16:00Z | OPS-001 | Implemented → Done (`smoke.yml`) |
| 2026-07-29T15:20:00Z | DOC-001 / DOC-002 | Implemented → Done; Story → Done |
