# Execution Record — PB-P0-002 / US-091: Pipeline de middlewares global (Express)

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-091 |
| User Story Title | Pipeline de middlewares global (Express) |
| Phase | P0 |
| Backlog Position | PB-P0-002 |
| User Story Path | management/user-stories/US-091-middleware-pipeline.md |
| Tech Spec Path | management/technical-specs/P0/PB-P0-002/US-091-technical-spec.md |
| Tasks Path | management/development-tasks/P0/PB-P0-002/US-091-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | last-modified 2026-07-08 (§113 raíz `backend/`; §133 strict flags) |
| Execution Record Status | Done |
| Readiness Status | READY |
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
- [x] User Story ID coincide en las 3 rutas → `US-091`
- [x] Phase coincide entre Tech Spec y Tasks → `P0`
- [x] Backlog Position coincide → `PB-P0-002`
- [x] Documentos legibles
- [x] IDs de tarea extraídos (rango: TASK-PB-P0-002-US-091-BE-001 … TASK-PB-P0-002-US-091-DOC-001; 24 tareas)

## 3. Readiness Gate

- Resultado: **READY**
- Checks:
  - User Story legible, status `Approved` — Pass
  - AC testeables (AC-01..AC-08, EC-01..05, VR-01..06) — Pass
  - Tech Spec `Ready for Task Breakdown` — Pass
  - Tasks File con 24 IDs `TASK-...` — Pass
  - `DEVELOPMENT_CONVENTIONS.md` legible — Pass
  - Dependencias US-089 **Done** y US-090 **Done** (execution records) — Pass
  - `src/shared/interface/middlewares/` con 14 stubs disponibles (US-090) — Pass
  - Refinement review sin hallazgos bloqueantes; decision resolution (7 decisiones, ninguna bloqueante) — Pass
  - Pertenece al backlog priorizado (PB-P0-002, posición 3 de 3) — Pass
- Warnings: Ninguno
- Blockers: Ninguno
- Decision files: `management/user-stories/decision-resolutions/US-091-decision-resolution.md`
- Refinement files: `management/user-stories/refinement-reviews/US-091-refinement-review.md`

## 4. Alignment Gate

- Resultado: **ALIGNED_WITH_NOTES**
- Tasks vs Tech Spec: 24 tareas derivadas de la Tech Spec; 5 errores de dominio, `express.d.ts`,
  8 middlewares globales + 6 por-ruta, `app.ts` ordenado, deps, `.env.example`/config, 6 grupos de
  tests, 4 PR reviews de seguridad, OBS, DOC. Sin scope no aprobado.
- Tech Spec vs Conventions:
  - Nota 1: ESLint `.eslintrc.cjs` (heredado US-089); se añadió el elemento `app-config` a
    `eslint-plugin-boundaries` para permitir que la capa `interface` importe `src/config`
    (los middlewares leen `config`). No relaja las reglas de boundary de dominio.
  - Nota 2: imports relativos con extensión `.js` (NodeNext/ESM).
  - Nota 3: mapeo de errores de body-parser (`entity.too.large`) a **400** per Tech Spec §7 (el
    default de Express es 413) — alineación con AC/NT-08, no desviación de comportamiento esperado.
- Tasks vs AC (mapeo):
  - AC-01 → BE-003(correlationId), QA-001, OBS-001 · AC-02 → BE-005, QA-004
  - AC-03 → BE-006, QA-004/005 · AC-04 → BE-003(rateLimit), QA-006
  - AC-05 → BE-008, QA-005, SEC-003 · AC-06 → BE-009, QA-002
  - AC-07 → BE-003(errorHandler), QA-003, SEC-001 · AC-08 → BE-004, QA-006(TS-06)
  - NT-01/02→401, NT-03→403, NT-04→404 → BE-005/006/007, QA-004/005, SEC-004
- Hallazgos de arquitectura: Ninguno (conforme a ADR-BE-001, ADR-SEC-001/003/004/006).

## 5. Task Inventory

| Task ID | Título original | Orden | Depends On | Status | Started | Completed | AC cubiertos | Evidencia (resumen) |
| ------- | --------------- | ----: | ---------- | ------ | ------- | --------- | ------------ | ------------------- |
| TASK-PB-P0-002-US-091-OPS-001 | Instalar dependencias npm de middlewares | 1 | US-089-BE-001 | Done | 2026-07-08 | 2026-07-08 | — | multer + @types/multer (resto ya presentes) |
| TASK-PB-P0-002-US-091-BE-001 | Clases de error de dominio adicionales | 2 | US-090-BE-002 | Done | 2026-07-08 | 2026-07-08 | AC-02/03/04/07 | 5 errores: Unauthorized/Forbidden/NotFound/BadRequest/TooManyRequests |
| TASK-PB-P0-002-US-091-BE-002 | express.d.ts augmentación de Request | 3 | US-090-BE-001 | Done | 2026-07-08 | 2026-07-08 | AC-01/02/06 | correlationId, user, validated tipados |
| TASK-PB-P0-002-US-091-BE-003 | 8 middlewares globales | 4 | BE-001, BE-002, OPS-001 | Done | 2026-07-08 | 2026-07-08 | AC-01/04/07/08 | correlationId/requestLogger/jsonBody/cors/helmet/rateLimit/notFound/errorHandler |
| TASK-PB-P0-002-US-091-BE-004 | Actualizar app.ts (orden Doc 14 §8.2) | 5 | BE-003 | Done | 2026-07-08 | 2026-07-08 | AC-08 | 9 registros en orden; /health con correlationId; app sin listen |
| TASK-PB-P0-002-US-091-OPS-002 | .env.example + config con vars del pipeline | 6 | US-089-OPS-001 | Done | 2026-07-08 | 2026-07-08 | SEC-02 | +AUTH_RATE_LIMIT_MAX, +FILE_SIZE_LIMIT (schema + .env.example) |
| TASK-PB-P0-002-US-091-BE-005 | authMiddleware (JWT + req.user) | 7 | BE-001, BE-002 | Done | 2026-07-08 | 2026-07-08 | AC-02, NT-01/02 | jwt.verify; 401 fail-fast; log AUTH_FAILURE |
| TASK-PB-P0-002-US-091-BE-006 | roleMiddleware (factory RBAC) | 8 | BE-001, BE-002 | Done | 2026-07-08 | 2026-07-08 | AC-03, NT-03 | 403 rol incorrecto; 401 sin user |
| TASK-PB-P0-002-US-091-BE-007 | ownershipMiddleware (OwnershipResolver) | 9 | BE-001, BE-002 | Done | 2026-07-08 | 2026-07-08 | NT-04, AUTH-TS-04 | 404 enmascarado; tipo OwnershipResolver exportado |
| TASK-PB-P0-002-US-091-BE-008 | captchaVerificationMiddleware (mock mode) | 10 | BE-001, OPS-001 | Done | 2026-07-08 | 2026-07-08 | AC-05, NT-05 | mock '__test__'; guard no-mock |
| TASK-PB-P0-002-US-091-BE-009 | validateRequestMiddleware (Zod) | 11 | BE-001, BE-002 | Done | 2026-07-08 | 2026-07-08 | AC-06, NT-06 | safeParse; details {field,message}; req.validated |
| TASK-PB-P0-002-US-091-BE-010 | fileUploadMiddleware (multer) | 12 | OPS-001 | Done | 2026-07-08 | 2026-07-08 | prereq attachments | memoryStorage + MIME allow-list + FILE_SIZE_LIMIT |
| TASK-PB-P0-002-US-091-QA-001 | Unit tests correlationId | 13 | BE-003 | Done | 2026-07-08 | 2026-07-08 | AC-01 | TS-01, EC-01 (2 tests) |
| TASK-PB-P0-002-US-091-QA-002 | Unit tests validateRequest | 14 | BE-009 | Done | 2026-07-08 | 2026-07-08 | AC-06 | TS-04, NT-06 (2 tests) |
| TASK-PB-P0-002-US-091-QA-003 | Unit tests errorHandler + logger spy | 15 | BE-001, BE-003 | Done | 2026-07-08 | 2026-07-08 | AC-07 | TS-05, 401, 400+details, logger sin authorization (4 tests) |
| TASK-PB-P0-002-US-091-QA-004 | Integration auth/role | 16 | BE-004, BE-005 | Done | 2026-07-08 | 2026-07-08 | AC-02, NT-01/02 | TS-02, NT-01/02/03, AUTH-TS-01/02/03 (7 tests) |
| TASK-PB-P0-002-US-091-QA-005 | Integration ownership/captcha | 17 | BE-006/007/008 | Done | 2026-07-08 | 2026-07-08 | AC-03/05, NT-03/04/05 | NT-04/AUTH-TS-04, TS-03, NT-05, SEC-003 (5 tests) |
| TASK-PB-P0-002-US-091-QA-006 | Integration rate-limit/CORS/body/orden | 18 | BE-003, BE-004 | Done | 2026-07-08 | 2026-07-08 | AC-04/08, NT-07/08/09 | rate 429+Retry-After, CORS 403, body 400, TS-06 orden (6 tests) |
| TASK-PB-P0-002-US-091-SEC-001 | Review errorHandler sin stack | 19 | BE-003 | Done | 2026-07-08 | 2026-07-08 | AC-07, VR-04 | código + test TS-05 (stack undefined; 5xx genérico) |
| TASK-PB-P0-002-US-091-SEC-002 | Review logger sin Authorization | 20 | BE-003 | Done | 2026-07-08 | 2026-07-08 | NFR-OBS-003 | código + test (spy console.info sin 'authorization') |
| TASK-PB-P0-002-US-091-SEC-003 | Review captcha mock guard | 21 | BE-008 | Done | 2026-07-08 | 2026-07-08 | AC-05 | código + test ('__test__' rechazado con provider=recaptcha) |
| TASK-PB-P0-002-US-091-SEC-004 | Review distinción 401/403/404 | 22 | BE-005/006/007 | Done | 2026-07-08 | 2026-07-08 | NT-01..04, VR-01..03 | código + tests NT-01(401)/NT-03(403)/NT-04(404) |
| TASK-PB-P0-002-US-091-OBS-001 | Propagación de correlationId | 23 | BE-003, BE-004 | Done | 2026-07-08 | 2026-07-08 | AC-01, AC-07 | /health con x-correlation-id; reuse; correlationId en 401 envelope |
| TASK-PB-P0-002-US-091-DOC-001 | Formalizar OwnershipResolver type | 24 | BE-007 | Done | 2026-07-08 | 2026-07-08 | — | `export type OwnershipResolver` en ownership.middleware.ts |

> IDs y títulos originales copiados **verbatim**; nunca renumerados.

## 6. Emergent Tasks

| ID | Título | Tarea padre | Razón de descubrimiento | Necesidad | Impacto de scope | Impacto Tech Spec | Status | Evidencia |
| -- | ------ | ----------- | ----------------------- | --------- | ---------------- | ----------------- | ------ | --------- |
| EMERGENT-001 | Helper de mocks Express (`tests/helpers/express-mocks.ts`) | QA-001/002/003 | Los tests unitarios de middleware requieren mocks tipados de req/res/next sin `any` | Helper reutilizable con `createMockRequest/Response`/`asResponse` | Nulo (solo test) | Ninguno | Done | tests/helpers/express-mocks.ts |
| EMERGENT-002 | Elemento `app-config` en boundaries ESLint | OPS-001/BE-003 | La capa `interface` (middlewares) importa `src/config`, no cubierto por los elementos de US-090 | Añadir `app-config` y permitir shared/module→app-config | Nulo (config de lint) | Ninguno | Done | .eslintrc.cjs |

> Ninguna tarea emergente oculta expansión de scope.

## 7. Evidence by Task (resumen consolidado)

### Backend (BE-001..BE-010)
- Files created: `src/shared/domain/errors/{unauthorized,forbidden,not-found,bad-request,too-many-requests}.error.ts`,
  `src/shared/interface/express.d.ts`.
- Files modified (reemplazo de stubs US-090): los 14 `src/shared/interface/middlewares/*.ts`,
  `src/app.ts` (pipeline real ordenado), `src/config/env.ts` (+2 vars), `package.json` (multer + @types/multer).
- Detalles clave:
  - `authMiddleware`: `jwt.verify` con `JWT_SECRET`; sin acceso a BD; 401 en cualquier fallo; log `AUTH_FAILURE`.
  - `roleMiddleware`/`ownershipMiddleware`: factories; 403 / 404-enmascarado. `OwnershipResolver` exportado (DOC-001).
  - `captchaVerificationMiddleware`: mock `'__test__'`; guard que rechaza `'__test__'` fuera de mock.
  - `errorHandlerMiddleware`: mapea AppError → HTTP; 5xx genérico; **nunca** stack en respuesta; body-parser `entity.too.large` → 400.
  - `corsMiddleware`: allowlist; origin no permitido → ForbiddenError → 403.
  - `rateLimitMiddleware`: `standardHeaders:true` (Retry-After); `authRateLimit` exportado para feature stories.
- Commands: `npm run typecheck` → 0; `npm run lint` → 0
- Typecheck/Lint: Passed
- Deviations: Ver §9. Technical debt: `HELMET_ENABLED` con `z.coerce.boolean` (heredado US-089; no afecta esta US).

### Testing (QA-001..QA-006) + Security (SEC-001..004) + OBS-001
- Files created: `tests/unit/{correlation-id,validate-request,error-handler}.middleware.spec.ts`,
  `tests/api/{middleware-auth,middleware-ownership-captcha,middleware-pipeline}.spec.ts`,
  `tests/helpers/express-mocks.ts`.
- Command: `npm run test` → exit 0 — **189 passed / 31 skipped / 220 total** (+27 tests US-091).
- Cobertura de los 15 test cases del spec: TS-01..06, NT-01..09, AUTH-TS-01..04, + tests de seguridad
  (errorHandler sin stack, logger sin authorization, captcha guard).
- NT-07 (rate limit): app dinámico con `RATE_LIMIT_MAX=2` vía `vi.stubEnv`+`resetModules`+import →
  429 `RATE_LIMIT_EXCEEDED` + cabecera `Retry-After`. TS-03/SEC-003 (captcha): mutación temporal de
  `config.CAPTCHA_PROVIDER` con restore en `afterEach`.
- Tests: Passed
- Acceptance Criteria cubiertos: AC-01..AC-08, EC-01..05, VR-01..06.

### OPS-002 / .env.example
- `.env.example` con las 8 variables del pipeline (sin secretos reales — verificado por el test
  env-example de US-089/SEC-001). `config/env.ts` extendido con `AUTH_RATE_LIMIT_MAX`, `FILE_SIZE_LIMIT`.

## 8. Blockers

| Blocker ID | Tarea afectada | Tipo | Descripción | Detectado | Decisión requerida | Rol responsable | Estado |
| ---------- | -------------- | ---- | ----------- | --------- | ------------------ | --------------- | ------ |
| — | — | — | Ninguno | — | — | — | — |

## 9. Deviations

| # | Comportamiento planeado | Implementado/propuesto | Razón | Impacto | Convención afectada | Sección Tech Spec | ADR requerido | Resolución |
| - | ----------------------- | ---------------------- | ----- | ------- | ------------------- | ----------------- | ------------- | ---------- |
| 1 | `.eslintrc.js` | `.eslintrc.cjs` + elemento `app-config` | ESM (heredado US-089); interface importa config | Bajo | — | §18 | No | Aceptada |
| 2 | Imports sin extensión | Imports relativos con `.js` (NodeNext/ESM) | Módulo ESM del proyecto | Nulo | — | §18 | No | Aceptada |

## 10. Final Validation

- Task completion: 24/24 base + 2 emergentes
- Acceptance Criteria coverage: 8/8 AC + EC-01..05 + VR-01..06 + NT-01..09 + AUTH-TS-01..04
- Lint: Passed (`npm run lint` → exit 0; boundaries + no-restricted-imports intactos)
- Typecheck: Passed (`npm run typecheck` → exit 0; incluye `express.d.ts` augmentation)
- Tests: Passed (`npm run test` → exit 0; **189 passed / 31 skipped / 220**; integración DB skip sin BD)
- Structure check: Passed (`npm run check:structure` → 16 × 5 = 80)
- Migrations/Seed: Not Applicable
- Authorization: Passed (distinción 401/403/404 verificada por NT-01/03/04)
- Security: Passed (errorHandler sin stack, logger sin authorization, captcha guard, CORS allowlist, helmet)
- Accessibility/i18n: Not Applicable
- Documentation: Passed (OwnershipResolver formalizado)
- Unresolved debt: Ninguna nueva (deuda `HELMET_ENABLED` heredada de US-089, no afecta esta US)
- Final status: Done

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-08T00:00:00Z | Initialized | Execution record creado |
| 2026-07-08T00:00:00Z | Readiness | READY (US-089 + US-090 Done; stubs disponibles) |
| 2026-07-08T00:00:00Z | Alignment | ALIGNED_WITH_NOTES (app-config boundary, imports .js, body-parser→400) |
| 2026-07-08T00:00:00Z | Ejecución | 5 errores + express.d.ts + 14 middlewares reales + app.ts ordenado + 27 tests |
| 2026-07-08T00:00:00Z | Final | US-091 → Done (24/24 tareas; typecheck/lint/test verdes; 15 test cases cubiertos) |
</content>
