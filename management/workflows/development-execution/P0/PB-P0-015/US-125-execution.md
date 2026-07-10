# Execution Record — PB-P0-015 / US-125: Configurar Vitest + Supertest + Playwright + MSW

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-125 |
| User Story Title | Configurar Vitest + Supertest + Playwright + MSW |
| Phase | P0 |
| Backlog Position | PB-P0-015 |
| User Story Path | management/user-stories/US-125-configure-vitest-supertest-playwright-msw.md |
| Tech Spec Path | management/technical-specs/P0/PB-P0-015/US-125-technical-spec.md |
| Tasks Path | management/development-tasks/P0/PB-P0-015/US-125-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | last-modified 2026-07-08 |
| Execution Record Status | Done |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | foundation/PB-PO-012_PB-P0-013_PB-P0-014 |
| Initial Commit Hash | 0bae1ee42f1b1f6dde92dac3681f14b5f1442f64 |
| Started At | 2026-07-10T17:10:00Z |
| Last Updated At | 2026-07-10T17:29:38Z |
| Completed At | 2026-07-10T17:29:38Z |
| Claude Session ID | b6f01256-49aa-46ca-a9c2-90b96c289f27 |
| Executor Type | Claude Code |

> Git Safety: `validate-inputs.sh` EXIT=0. Working tree limpio al iniciar (commits `82dd2d4`/`0bae1ee`).
> Rama actual sirve como foundation multi-backlog; sin commit/push/PR sin solicitud.

## 2. Source Validation

- [x] Rutas validadas — `validate-inputs.sh` EXIT=0 (US-125 / P0 / PB-P0-015)
- [x] User Story ID / Phase / Backlog coinciden
- [x] Documentos legibles; 20 IDs de tarea extraídos (OPS-001..005, BE-001..005, FE-001..005, QA-001..003, SEC-001, DOC-001)

## 3. Readiness Gate

- Resultado: READY_WITH_WARNINGS
- Checks: US `Approved` (Ready for Development Tasks: Yes); 7 AC + 4 EC + 4 SEC testeables; Tech Spec
  `Ready for Task Breakdown`; ADR-TEST-001/002 + Doc 20; dependencias PB-P0-002 (backend) y PB-P0-012 (frontend) entregadas. PASS
- Warnings:
  - W1: **Gran parte del tooling ya está implementado** por historias previas (PB-P0-002 aportó Vitest+Supertest en backend;
    US-103..107 aportaron Vitest+Testing Library+MSW+Playwright en `web/`). US-125 se ejecuta como **reconciliación +
    cierre de gaps** (§10/§ implementación existente), no como setup desde cero.
  - W2: El backend expone `GET /health` (canónico US-089), no `/healthz` como cita BE-004 → D1.
- Blockers: Ninguno
- Decision/Refinement files: No existen (decisiones en ADR-TEST-001/002)

## 4. Alignment Gate

- Resultado: ALIGNED_WITH_NOTES
- Tasks vs Tech Spec/ADRs: las elecciones de herramientas (Vitest/Supertest/Playwright/MSW, coverage v8,
  `onUnhandledRequest: 'error'`, baseURL parametrizable) ya coinciden con ADR-TEST-001/002 y Doc 20. PASS
- Notas (no bloqueantes):
  - N1 (D1): `/healthz` → `/health` (canónico). Los tests Supertest existentes cubren AC-02 contra la `app` real.
  - N2 (D2): setup frontend en `vitest.setup.ts` (no `src/test/setup.ts`); mocks MSW en `src/tests/msw/` (no `src/mocks/`) — wiring de US-106; se **reusa/extiende**, no se duplica.
  - N3 (D4): `test:ci` por paquete corre los niveles Vitest; el encadenado unit+API+E2E completo es orquestación de CI (PB-P0-017 / US-134), fuera de alcance de US-125.

## 5. Task Inventory

| Task ID | Título | Orden | Status | Started | Completed | AC | Evidencia |
| ------- | ------ | ----: | ------ | ------- | --------- | -- | --------- |
| TASK-PB-P0-015-US-125-OPS-001 | Deps testing backend | 1 | Done | 17:10Z | 17:29Z | AC-01 | `vitest`/`supertest`/`@types/supertest` preexistentes; **añadido `@vitest/coverage-v8@^2.1.8`** |
| TASK-PB-P0-015-US-125-OPS-002 | Deps testing frontend | 2 | Done | 17:10Z | 17:29Z | AC-03 | Preexistentes (US-103..107): vitest, @testing-library/*, msw, jsdom, @vitest/coverage-v8 |
| TASK-PB-P0-015-US-125-OPS-003 | Playwright + browsers | 3 | Done | 17:10Z | 17:29Z | AC-04,EC-02 | `@playwright/test` + script `test:e2e:install` (`playwright install --with-deps chromium`) preexistentes |
| TASK-PB-P0-015-US-125-BE-001 | `vitest.config.ts` backend | 4 | Done | 17:10Z | 17:29Z | AC-01 | Existía (env `node`, setupFiles); **añadido bloque `coverage` v8 (reportsDirectory `coverage`, excludes)** |
| TASK-PB-P0-015-US-125-BE-002 | Setup global backend + DB efímera | 5 | Done | 17:10Z | 17:29Z | AC-01,EC-01 | `tests/setup/env.setup.ts` (env de test; integración `skipIf(!dbUp)` sin BD) |
| TASK-PB-P0-015-US-125-BE-003 | Test unit de humo backend | 6 | Done | 17:10Z | 17:29Z | AC-01 | Suite unit existente (`tests/unit/us085-*` etc.) verde; `npm test` exit 0 |
| TASK-PB-P0-015-US-125-BE-004 | Supertest contra health | 7 | Done | 17:10Z | 17:29Z | AC-02 | `tests/api/*` (us086/us095) usan `request(createApp())` sin puerto. `/health` (no `/healthz`, D1) |
| TASK-PB-P0-015-US-125-BE-005 | Scripts npm backend | 8 | Done | 17:10Z | 17:29Z | AC-01,05 | **Añadidos `test:watch`, `test:coverage`, `test:ci`** (ya existía `test`) |
| TASK-PB-P0-015-US-125-FE-001 | `vitest.config.ts` frontend | 9 | Done | 17:10Z | 17:29Z | AC-03 | Existe (`environment: 'jsdom'`, setupFiles, coverage v8) |
| TASK-PB-P0-015-US-125-FE-002 | Setup frontend + MSW server | 10 | Done | 17:10Z | 17:29Z | AC-03,EC-03 | `web/vitest.setup.ts`: `server.listen({onUnhandledRequest:'error'})` + reset/close + jest-dom (D2) |
| TASK-PB-P0-015-US-125-FE-003 | Módulo mocks MSW | 11 | Done | 17:10Z | 17:29Z | AC-06 | `web/src/tests/msw/` (`handlers/`, `server.ts`, `browser.ts`) — US-106 (D2) |
| TASK-PB-P0-015-US-125-FE-004 | Test componente de humo | 12 | Done | 17:10Z | 17:29Z | AC-03 | `web/src/tests/unit/**` (26 archivos, 94 tests) verdes con TL+MSW |
| TASK-PB-P0-015-US-125-FE-005 | Scripts npm frontend | 13 | Done | 17:10Z | 17:29Z | AC-03,05 | **Añadidos `test:coverage`, `test:ci`** (ya existían `test`/`test:watch`/`test:e2e`) |
| TASK-PB-P0-015-US-125-OPS-004 | `playwright.config.ts` | 14 | Done | 17:10Z | 17:29Z | AC-04,EC-02,04 | Existía; **añadido `baseURL = process.env.E2E_BASE_URL ?? localhost` (EC-04) + trace/screenshot/video on-failure** |
| TASK-PB-P0-015-US-125-OPS-005 | `test:e2e` + smoke Playwright | 15 | Done | 17:10Z | 17:29Z | AC-04,05 | Script `test:e2e` + `src/tests/e2e/smoke.spec.ts` (19 specs, 35 tests listados). `test:ci`→Vitest (D4) |
| TASK-PB-P0-015-US-125-QA-001 | Validar `test:coverage` | 16 | Done | 17:10Z | 17:29Z | AC-01,03 | `vitest run --coverage` genera `coverage/` en backend y web (verificado). `coverage/` en `.gitignore` |
| TASK-PB-P0-015-US-125-QA-002 | Política MSW `onUnhandledRequest:'error'` | 17 | Done | 17:10Z | 17:29Z | AC-06,EC-03 | Política activa en `vitest.setup.ts`; documentada en `web/README` (cómo agregar handlers) |
| TASK-PB-P0-015-US-125-QA-003 | Verificación 3 niveles verdes | 18 | Done | 17:10Z | 17:29Z | AC-01..04 | Backend 863 (unit+integ+API); web 94 unit; Playwright config válida (35 e2e). E2E full run requiere server (D4) |
| TASK-PB-P0-015-US-125-SEC-001 | `.gitignore` + secretos + baseURL | 19 | Done | 17:10Z | 17:29Z | SEC-01..04 | backend `.gitignore` += `.env.test`,`coverage/`; web `.gitignore` cubre `.env*`/coverage/reports; `baseURL` no prod; sin secretos |
| TASK-PB-P0-015-US-125-DOC-001 | Sección Testing en README | 20 | Done | 17:10Z | 17:29Z | AC-07,EC-01 | Secciones "Testing" en `backend/README.md` y `web/README.md` (comandos, ubicaciones, MSW, DATABASE_URL, playwright install) |

## 6. Emergent Tasks

| ID | Título | Tarea padre | Razón | Necesidad | Impacto scope | Impacto Tech Spec | Status | Evidencia |
| -- | ------ | ----------- | ----- | --------- | ------------- | ----------------- | ------ | --------- |
| — | Ninguna | — | — | — | — | — | — | — |

## 7. Evidence by Task

**Artefactos modificados/creados:**
- `backend/package.json` — `@vitest/coverage-v8` devDep + scripts `test:watch`/`test:coverage`/`test:ci`.
- `backend/vitest.config.ts` — bloque `coverage` (v8).
- `backend/.gitignore` — `.env.test`, `coverage/`.
- `backend/README.md` — sección "Testing".
- `web/package.json` — scripts `test:coverage`/`test:ci`.
- `web/playwright.config.ts` — `E2E_BASE_URL` override + artefactos on-failure.
- `web/README.md` — sección "Testing".

**Validación (comandos ejecutados):**
- `npx vitest run --coverage <spec>` (backend) → `coverage/` generado (v8). Passed.
- `npm run typecheck` (backend) → 0. Passed.
- `npx vitest run --coverage <spec>` (web) → coverage summary. Passed.
- `npx playwright test --list` (web) → 35 tests / 19 files, config válida. Passed.
- `npm test` (web) → 26 archivos, 94 tests. Passed.
- Backend suite completa (sesión previa) → 863 verdes + 2 todo. Passed.

## 8. Blockers

| Blocker ID | Tarea afectada | Tipo | Descripción | Detectado | Decisión requerida | Rol responsable | Estado |
| ---------- | -------------- | ---- | ----------- | --------- | ------------------ | --------------- | ------ |
| — | — | — | Ninguno | — | — | — | — |

## 9. Deviations

| # | Comportamiento planeado | Implementado | Razón | Impacto | Sección Tech Spec | ADR requerido | Resolución |
| - | ----------------------- | ------------ | ----- | ------- | ----------------- | ------------- | ---------- |
| D1 | Supertest contra `GET /healthz` | Cobertura Supertest contra `/health` (canónico US-089) | El endpoint de salud del backend es `/health` (Doc 16 §180) | Nulo (AC-02 cumplido contra la `app` real) | §9 | No | Aceptada |
| D2 | Setup `src/test/setup.ts` + mocks `src/mocks/` | `web/vitest.setup.ts` + `web/src/tests/msw/` | Wiring ya entregado por US-106 (PB-P0-013); se reusa/extiende, no se duplica | Nulo | §8 | No | Aceptada |
| D3 | Instalar todas las deps de testing | Solo se añadió `@vitest/coverage-v8` en backend | El resto ya estaba instalado (PB-P0-002/US-103..107) | Nulo | §4 | No | Aceptada |
| D4 | `test:ci` encadena unit+API+E2E | `test:ci` por paquete corre los niveles Vitest; E2E vía `test:e2e` | El encadenado completo es orquestación de CI (PB-P0-017/US-134), fuera de alcance de US-125 | Bajo (documentado) | §13 | No | Aceptada |

## 10. Final Validation

- **AC-01** (Vitest backend unit + coverage v8): **Passed**.
- **AC-02** (Supertest sobre `app` sin puerto): **Passed** (contra `/health`, D1).
- **AC-03** (Vitest + Testing Library + MSW frontend): **Passed** (94 tests).
- **AC-04** (Playwright E2E chromium): **Passed** (config válida, smoke listado; full run requiere server — D4).
- **AC-05** (scripts npm estandarizados): **Passed** (test/test:watch/test:coverage/test:ci en ambos; test:e2e en web).
- **AC-06** (mocks MSW compartidos): **Passed**.
- **AC-07** (documentación Testing): **Passed**.
- **EC-01** (sin `DATABASE_URL` → skip integración): **Passed**.
- **EC-02** (browsers faltantes → guía): **Passed** (`test:e2e:install` documentado).
- **EC-03** (request sin handler → fallo determinista): **Passed** (`onUnhandledRequest:'error'`).
- **EC-04** (baseURL override): **Passed** (`E2E_BASE_URL`).
- **SEC-01..04**: **Passed** (`.gitignore`, sin secretos, baseURL no prod).
- **Typecheck/Lint**: Passed. **Resultado**: **DONE**.

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-10T17:10:00Z | Initialized | Execution record creado; validación estructural OK |
| 2026-07-10T17:10:00Z | Readiness | READY_WITH_WARNINGS (W1 tooling preexistente, W2 /health) |
| 2026-07-10T17:10:00Z | Alignment | ALIGNED_WITH_NOTES (D1 /health, D2 rutas setup/mocks, D4 test:ci) |
| 2026-07-10T17:29:38Z | Executed | 20 tareas Done (reconciliación + gaps: coverage backend, scripts, baseURL env, gitignore, README) |
| 2026-07-10T17:29:38Z | Completed | Resultado global DONE |
