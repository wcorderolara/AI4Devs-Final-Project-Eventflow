# Execution Record — PB-P0-006 / US-109: Integrar captcha en auth

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-109 |
| User Story Title | Integrar captcha en auth |
| Phase | P0 |
| Backlog Position | PB-P0-006 |
| User Story Path | management/user-stories/US-109-integrate-captcha-auth.md |
| Tech Spec Path | management/technical-specs/P0/PB-P0-006/US-109-technical-spec.md |
| Tasks Path | management/development-tasks/P0/PB-P0-006/US-109-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | last-modified 2026-07-08 |
| Execution Record Status | Partially Completed |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | foundation/PB-P0-006 |
| Initial Commit Hash | 769bcc945f432c23b9decfad4b63f85f006b5671 |
| Started At | 2026-07-09T14:23:06Z |
| Last Updated At | 2026-07-09T14:40:00Z |
| Completed At | 2026-07-09T14:40:00Z |
| Claude Session ID | 7e3a6366-b628-4c2c-8eec-6232a628289b |
| Executor Type | Claude Code |

> Nota Git: en el working tree existen cambios sin commitear de la ejecución previa de **US-108**
> (misma rama `foundation/PB-P0-006`, mismo PB-P0-006). Se **preservan**; US-109 se implementa
> encima sin descartar ni mezclar de forma destructiva. Archivos compartidos tocados por ambas
> (`env.ts`, `.env.example`, `README.md`, `openapi.json`) se editan de forma aditiva.

## 2. Source Validation

- [x] Rutas validadas (3 argumentos, existen, dentro del repo) — `validate-inputs.sh` EXIT=0
- [x] User Story ID coincide en las 3 rutas — US-109
- [x] Phase coincide entre Tech Spec y Tasks — P0
- [x] Backlog Position coincide entre Tech Spec y Tasks — PB-P0-006
- [x] Documentos legibles
- [x] IDs de tarea extraídos (rango: TASK-PB-P0-006-US-109-PO-001 … TASK-PB-P0-006-US-109-DOC-002)

## 3. Readiness Gate

- Resultado: READY_WITH_WARNINGS
- Checks:
  - User Story `Approved` + `Ready for Development Tasks: Yes` → Pass
  - Acceptance Criteria testeables (AC-01..AC-08) → Pass
  - Tech Spec `Ready for Task Breakdown` → Pass
  - Tasks File con IDs `TASK-...` (25 tareas) → Pass
  - `DEVELOPMENT_CONVENTIONS.md` legible → Pass
  - Dependencias PB-P0-002/PB-P0-004 (Done) y US-108 (Partially Completed; política de cookie estable) → Pass
  - Decision Resolution `US-109-decision-resolution.md` **existe** e incorporada (endpoints; providers) → Pass
  - Refinement review existe, **sin hallazgos bloqueantes** (2 alineaciones documentales no bloqueantes) → Pass
  - Historia en backlog priorizado (§PB-P0-006) → Pass
- Warnings:
  - **W1** — Repo **backend-only**: no existe módulo `frontend/`/`web/`. FE-001, FE-002 y QA-005 (widget/hook captcha + integración de formularios + tests de UI) no son implementables como código; se difieren con justificación (las impl notes de la Tech Spec §8 y de los tasks contemplan UI existente/planificada).
- Blockers: Ninguno
- Decision files relacionados: `management/user-stories/decision-resolutions/US-109-decision-resolution.md` (incorporado)
- Refinement files relacionados: `management/user-stories/refinement-reviews/US-109-refinement-review.md`

## 4. Alignment Gate

- Resultado: ALIGNED_WITH_NOTES
- Tasks vs Tech Spec: cada tarea deriva de la Tech Spec (§4/§6/§7/§12/§13/§14). Cobertura: config, port+factory, mock/recaptcha/hcaptcha, middleware, route mapping, DTO/OpenAPI, seguridad, observabilidad, QA, docs. Sin scope no aprobado.
- Tech Spec vs Conventions: Node+Express+TS, Clean/Hexagonal (port `CaptchaVerifier` en `shared`, adapters en `infrastructure`), config Zod fail-fast, redacción de logs. Boundaries respetados (`shared`→`app-infra` permitido; middleware existente en `shared/interface/middlewares` no cambia el conteo estructural de US-090).
- Tasks vs Acceptance Criteria (mapeo):
  - AC-01/02/03 → BE-006, BE-007, QA-003, QA-004
  - AC-04 → BE-001, BE-002, OPS-001, QA-001
  - AC-05 → BE-003, OPS-001, QA-001, QA-003
  - AC-06 → BE-004, BE-005, SEC-001, QA-002
  - AC-07 → BE-006, SEC-002, OBS-001, QA-004, QA-006
  - AC-08 → FE-001, FE-002, QA-005 (diferidas, W1)
- Hallazgos de arquitectura: Ninguno bloqueante. Sin contradicción con ADR-SEC-004/005/006; sin persistencia de captcha; sin fallback inseguro a mock; backend source of truth.
- Notas de implementación (no bloqueantes):
  - **N1 (error codes)** — US-091/US-094 mapean captcha inválido/ausente a `BAD_REQUEST`. US-109 (AC-05, VR-01, VR-02, EC-01, EC-02) **exige** códigos estables `CAPTCHA_REQUIRED` y `CAPTCHA_INVALID`. Se agregan al catálogo y se actualizan las aserciones de tests US-091/US-094 que verificaban `BAD_REQUEST` para captcha. Refinamiento de contrato dirigido por la propia US (no scope creep, no ADR).
  - **N2 (secret naming)** — La Tech Spec §7 usa `RECAPTCHA_SECRET_KEY`/`HCAPTCHA_SECRET_KEY`. El repo tenía `CAPTCHA_SECRET` genérico (US-091). Se **añaden** las dos vars provider-específicas; `CAPTCHA_SECRET` se conserva como legacy no requerido para no romper `.env.example`/tests.
  - **N3 (expectedAction)** — El middleware es un `const` compartido por 3 rutas (importado directamente, invariante estructural US-090). La `captchaAction` esperada se deriva del `req.path` dentro del middleware (register/login/password_reset_request) en lugar de convertirlo en factory, preservando el import directo.
  - **N4 (provider factory per-request)** — La selección de provider se resuelve en cada verificación leyendo `config.CAPTCHA_PROVIDER` (no en construcción), para respetar tests que mutan el provider en runtime y mantener config como fuente.
  - **N5 (entorno)** — Sin `APP_ENV`; el ban de `mock` fuera de Local/CI usa `NODE_ENV=production` (EC-06).
- Ajustes requeridos: Ninguno bloqueante (sin `REQUIRES_TECH_SPEC_UPDATE` ni `ARCHITECTURE_DECISION_REQUIRED`).

## 5. Task Inventory

| Task ID | Título original | Orden | Depends On | Status | AC | Evidencia (resumen) |
| ------- | --------------- | ----: | ---------- | ------ | -- | ------------------- |
| TASK-PB-P0-006-US-109-PO-001 | Confirm captcha scope and non-goals | 1 | — | Done | AC-01..08 | Scope 3 endpoints + providers confirmados vía decision resolution |
| TASK-PB-P0-006-US-109-BE-001 | Implement captcha environment configuration validation | 2 | PO-001 | Done | AC-04 | `env.ts`: hcaptcha, secrets, threshold, timeout + superRefine; QA-001 verde |
| TASK-PB-P0-006-US-109-BE-002 | Create CaptchaVerifier port and provider factory | 3 | BE-001 | Done | AC-04 | Port + `CaptchaProviderFactory` per-request; QA-001 verde |
| TASK-PB-P0-006-US-109-BE-003 | Implement MockCaptchaProvider | 4 | BE-002 | Done | AC-05 | Sólo `'__test__'`; QA-001 verde |
| TASK-PB-P0-006-US-109-BE-004 | Implement RecaptchaProvider | 5 | BE-002 | Done | AC-06 | fetch+timeout+action+score; QA-002 verde (fetch mock) |
| TASK-PB-P0-006-US-109-BE-005 | Implement HcaptchaProvider | 6 | BE-002 | Done | AC-06 | fetch+timeout; QA-002 verde (fetch mock) |
| TASK-PB-P0-006-US-109-BE-006 | Implement captchaVerificationMiddleware | 7 | BE-003,004,005 | Done | AC-01,02,03,07 | async + CAPTCHA_REQUIRED/INVALID + eventos; QA-004 verde |
| TASK-PB-P0-006-US-109-BE-007 | Apply middleware to selected auth routes only | 8 | BE-006 | Done | AC-01,02,03 | captcha antes de validación en 3 rutas (D3); QA-004 route mapping verde |
| TASK-PB-P0-006-US-109-API-001 | Update auth DTOs and OpenAPI contract | 9 | BE-007 | Done | contrato | `captchaToken` requerido en 3 DTOs (US-094) + OpenAPI (6 refs); `openapi:check` OK |
| TASK-PB-P0-006-US-109-FE-001 | Implement CaptchaWidget or useCaptchaToken abstraction | 10 | API-001 | Skipped | AC-08 | Sin módulo frontend en repo (W1); diferido |
| TASK-PB-P0-006-US-109-FE-002 | Integrate captcha into register/login/forgot-password forms | 11 | FE-001 | Skipped | AC-08 | Sin módulo frontend en repo (W1); diferido |
| TASK-PB-P0-006-US-109-SEC-001 | Verify backend-only captcha validation and secret isolation | 12 | BE-004,005 | Done | AC-06 | Verificación backend-only; secret sólo en config backend; sin persistencia |
| TASK-PB-P0-006-US-109-SEC-002 | Implement safe redaction for captcha logs and errors | 13 | BE-006 | Done | AC-07 | `redact.ts` ampliado (includes) cubre `*SECRET_KEY`; QA-006 verde |
| TASK-PB-P0-006-US-109-SEC-003 | Verify route protection boundaries and no mock fallback | 14 | BE-007 | Done | AC-06,07 | Guard `__test__`+no-mock; route mapping; QA-004/QA-006 |
| TASK-PB-P0-006-US-109-OBS-001 | Add structured captcha verification logs | 15 | BE-006,SEC-002 | Done | AC-07 | `captcha-event-logger.ts`: succeeded/failed/timeout |
| TASK-PB-P0-006-US-109-OPS-001 | Configure environment variables for local/CI/QA/demo | 16 | BE-001 | Done | AC-04,05 | `.env.example` con providers/secrets/threshold/timeout |
| TASK-PB-P0-006-US-109-QA-001 | Unit tests for captcha config, factory, and mock provider | 17 | BE-001,002,003 | Done | AC-04,05 | `us109-captcha-config.spec.ts` Passed |
| TASK-PB-P0-006-US-109-QA-002 | Unit tests for real provider adapters | 18 | BE-004,005 | Done | AC-06 | `us109-captcha-providers.spec.ts` 11 Passed (fetch mock) |
| TASK-PB-P0-006-US-109-QA-003 | Integration tests for protected auth happy paths (mock) | 19 | BE-007 | Done | AC-01,02,03,05 | `us109-captcha-enforcement.spec.ts` DB-gated Not Run local |
| TASK-PB-P0-006-US-109-QA-004 | API and negative-flow tests for captcha enforcement | 20 | BE-006,007 | Done | AC-01,02,03,07 | Parte no-DB (required/invalid/route-mapping) Passed |
| TASK-PB-P0-006-US-109-QA-005 | Frontend component and accessibility tests | 21 | FE-001,002 | Skipped | AC-08 | Sin módulo frontend en repo (W1); diferido |
| TASK-PB-P0-006-US-109-QA-006 | Security-focused regression tests | 22 | SEC-001,002,003 | Done | AC-07 | `us109-captcha-security.spec.ts` 3 Passed |
| TASK-PB-P0-006-US-109-SEED-001 | Validate CI and demo captcha configuration | 23 | OPS-001 | Done | AC-04,05 | Sin seed/migración; CI mock, QA/Demo real documentado |
| TASK-PB-P0-006-US-109-DOC-001 | Document captcha provider contract and setup | 24 | API-001,OPS-001 | Done | contrato | Sección README "Captcha anti-bot en auth (US-109)" |
| TASK-PB-P0-006-US-109-DOC-002 | Register documentation alignment notes | 25 | DOC-001 | Done | contrato | README: alcance reset-request + provider naming |

> Resumen: **22 Done · 3 Skipped** (FE-001, FE-002, QA-005 — sin módulo frontend; diferidas con justificación) · 0 In Progress · 0 Blocked · 0 Rework.

## 6. Emergent Tasks

| ID | Título | Tarea padre | Razón | Status |
| -- | ------ | ----------- | ----- | ------ |
| — | (ninguna aún) | | | |

## 7. Evidence by Task

### Backend (BE-001..007)
- Files created: `src/shared/security/captcha/captcha-verifier.port.ts`, `src/infrastructure/captcha/{mock-captcha-provider,recaptcha-provider,hcaptcha-provider,siteverify-client,captcha-provider.factory}.ts`, `src/shared/domain/errors/captcha.errors.ts`, `src/infrastructure/observability/captcha-event-logger.ts`.
- Files modified: `src/config/env.ts` (captcha config + superRefine fail-fast), `src/shared/domain/errors/error-codes.ts` (CAPTCHA_REQUIRED/CAPTCHA_INVALID), `src/shared/interface/middlewares/captcha-verification.middleware.ts` (reescrito async con verifier), `src/modules/identity-access/interface/identity-access.routes.ts` (captcha antes de validación en 3 rutas), `backend/.env.example`.
- Error mapping: `CaptchaRequiredError`/`CaptchaInvalidError` extienden `AppError` → 400 con su código vía el catch-all `AppError` del error-handler (sin cambios en el handler).
- Commands: `npm run typecheck` → Passed; `npm run lint` → Passed.

### SEC-002 (redacción)
- Files modified: `src/shared/infrastructure/logger/redact.ts` — `isSensitiveKey` pasa de `endsWith` a `includes` para cubrir `RECAPTCHA_SECRET_KEY`/`HCAPTCHA_SECRET_KEY` (`*_SECRET_KEY`). US-108 `us108-log-redaction.spec.ts` sigue verde.

### API-001 (OpenAPI)
- `captchaToken` ya requerido en los 3 DTOs (US-094); OpenAPI lo documenta (6 refs) y no expone secrets. `npm run openapi:check` → OK (sin drift, sin regeneración necesaria).

### QA (tests)
- Files created: `tests/unit/us109-captcha-config.spec.ts`, `tests/unit/us109-captcha-providers.spec.ts`, `tests/unit/us109-captcha-security.spec.ts`, `tests/api/us109-captcha-enforcement.spec.ts`.
- Files modified (contrato N1): `tests/api/middleware-ownership-captcha.spec.ts`, `tests/api/us094-security-negative.spec.ts` (BAD_REQUEST → CAPTCHA_REQUIRED/CAPTCHA_INVALID); `tests/unit/us108-cookie-config.spec.ts` (fixtures de producción usan `recaptcha`+secret, ya que US-109 prohíbe `mock` en producción).
- Command: `vitest run` → **419 passed | 78 skipped | 2 todo** (78 skip = DB-gated sin Postgres; sin fallos). US-109 nuevos: ~30 Passed + 3 DB-gated (QA-003) Not Run local.

### FE-001 / FE-002 / QA-005 — Skipped
- No existe módulo `frontend/`/`web/` en el estado Current del repo. El backend ya es source of truth de la validez del captcha (verificación server-side; el frontend sólo obtendría/enviaría el token). Diferido a la historia frontend/auth. Deuda registrada (§10).

## 8. Blockers

| Blocker ID | Tarea afectada | Tipo | Descripción | Estado |
| ---------- | -------------- | ---- | ----------- | ------ |
| — | | | (ninguno) | |

## 9. Deviations

| # | Planeado | Implementado | Razón | ADR | Resolución |
| - | -------- | ------------ | ----- | --- | ---------- |
| D1 | Captcha inválido/ausente → `BAD_REQUEST` (US-091/094) | `CAPTCHA_REQUIRED` / `CAPTCHA_INVALID` | Exigido por US-109 AC-05/VR-01/VR-02 | No | N1; tests US-091/094 actualizados |
| D2 | `CAPTCHA_SECRET` genérico (US-091) | + `RECAPTCHA_SECRET_KEY` / `HCAPTCHA_SECRET_KEY` (legacy conservado) | Tech Spec §7 provider-específico | No | N2; DOC-001 |
| D3 | Orden `validación → captcha` (US-094; Assumption US-109 "captcha tras validación de payload") | `captcha → validación` en las 3 rutas | Necesario para que token ausente devuelva `CAPTCHA_REQUIRED` (AC-05/EC-01/NT-01) y NO `VALIDATION_ERROR`, preservando `captchaToken` requerido en DTO/OpenAPI (Tech Spec §7/API-001) y los tests de schema US-094 | No | Diverge de una Assumption suave; honra las AC/VR/NT duras. Documentado en routes + README |
| D4 | Redacción por `endsWith(secret/token/password)` (US-108) | `includes(...)` | Cubrir `*_SECRET_KEY` (RECAPTCHA/HCAPTCHA) — hueco de redacción detectado por QA-006 | No | Mejora de seguridad; US-108 redaction tests siguen verdes |

## 10. Final Validation

- Task completion: **22/25 Done**, 3 Skipped (FE-001, FE-002, QA-005 — sin frontend).
- Acceptance Criteria coverage:
  - AC-01/02/03 (captcha antes de crear usuario / credenciales / reset token) → Cubierto (BE-006/007; QA-004 no-DB; QA-003 DB en CI).
  - AC-04 (provider por entorno, fail-fast) → Cubierto (BE-001, QA-001).
  - AC-05 (mock determinista `'__test__'`) → Cubierto (BE-003, QA-001, QA-004).
  - AC-06 (provider real: success/action/score) → Cubierto (BE-004/005, QA-002 con fetch mock).
  - AC-07 (error seguro + observable; sin datos sensibles) → Cubierto (BE-006, SEC-002, OBS-001, QA-006).
  - AC-08 (frontend obtiene/envía/renueva token sin secretos) → **Parcial**: garantía backend (verificación server-side, sin persistencia, sin exponer secretos) cubierta; parte frontend (FE-001/FE-002/QA-005) **diferida** por ausencia de módulo frontend.
- Lint: Passed (`npm run lint`, exit 0). Typecheck: Passed (`tsc --noEmit`).
- Tests: Passed — `vitest run` → **419 passed | 78 skipped | 2 todo** (78 skip = DB-gated sin Postgres local; sin fallos).
- Build: Not Run (no requerido; `tsc --noEmit` cubre typecheck).
- Migrations / Seed: Not Applicable (captcha stateless; sin cambios de schema/seed).
- Authorization: Passed (endpoints siguen públicos/anonymous; captcha es pre-auth; downstream RBAC/ownership sin cambios).
- Security: Passed (verificación server-side; guard mock; fail-fast config insegura; redacción de token/secret; sin persistencia; OpenAPI sin secretos).
- Observability: Passed (eventos `captcha.*` con correlationId, sin datos sensibles).
- Accessibility / i18n: Not Applicable en backend (pertenecen a FE-001/QA-005 diferidas).
- Documentation: Passed (README backend; DOC-001/DOC-002).
- OpenAPI: Passed (`openapi:check` sin drift; `captchaToken` documentado).
- Unresolved debt:
  - **DEBT-1** — AC-08 frontend (FE-001, FE-002, QA-005): widget/hook captcha + integración de formularios + tests de UI/a11y **no implementados** por falta de módulo frontend. Pendiente para la historia frontend/auth. Riesgo residual bajo: el backend rechaza cualquier request sin captcha válido (server-side source of truth).
- Final status: **Partially Completed** (3 tareas requeridas Skipped por dependencia de módulo frontend inexistente; AC-08 parcial).

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-09T14:23:06Z | Initialized | Execution record creado |
| 2026-07-09T14:23:06Z | Readiness | READY_WITH_WARNINGS (W1: repo backend-only) |
| 2026-07-09T14:23:06Z | Alignment | ALIGNED_WITH_NOTES (N1 error codes, N2 secret naming, N3 action, N4 factory, N5 env) |
| 2026-07-09T14:30:00Z | BE-001..007 | Config + port/factory + mock/recaptcha/hcaptcha + middleware + routes; error codes CAPTCHA_* |
| 2026-07-09T14:34:00Z | SEC/OBS/API | Redacción ampliada (`includes`), eventos captcha, OpenAPI verificado |
| 2026-07-09T14:38:00Z | QA-001..006 | ~30 tests US-109; contrato N1/D1 aplicado a tests US-091/094; fixtures US-108 ajustadas |
| 2026-07-09T14:40:00Z | Finalized | Partially Completed — 22 Done, 3 Skipped (FE-001/FE-002/QA-005 sin frontend); suite 419 verde |
