# Execution Record — PB-P1-003 / US-003: Iniciar sesión con email y contraseña

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-003 |
| User Story Title | Iniciar sesión con email y contraseña (captcha condicional N=3) |
| Phase | P1 |
| Backlog Position | PB-P1-003 |
| User Story Path | management/user-stories/US-003-login-email-password.md |
| Tech Spec Path | management/technical-specs/P1/PB-P1-003/US-003-technical-spec.md |
| Tasks Path | management/development-tasks/P1/PB-P1-003/US-003-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | v1.0.0 (Last updated 2026-07-08) |
| Execution Record Status | Done |
| Readiness Status | READY |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P1-001_PB-P1-004 |
| Initial Commit Hash | 81e2f55d74010a7cdc0976dd03e0146f32d3f38e (working tree contiene US-001/US-002 de esta sesión) |
| Started At | 2026-07-10T21:50:00Z |
| Last Updated At | 2026-07-10T22:35:00Z |
| Completed At | 2026-07-10T22:35:00Z |
| Claude Session ID | 87bcbf68-374a-480e-8726-be3ecc150e04 |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] `validate-inputs.sh` exit 0 (US-003 · P1 · PB-P1-003)
- [x] IDs consistentes; documentos legibles
- [x] IDs de tarea: TASK-PB-P1-003-US-003-BE-001..006, API-001, DB-001, FE-001..005, SEC-001/002, QA-001..005, OPS-001, OBS-001, DOC-001 (23 tareas)

## 3. Readiness Gate

- Resultado: **READY**
- Checks: US `Approved with Minor Notes` + `Ready for Development Tasks: Yes` (aprobación 2026-06-25); refinement review `Needs Refinement` **resuelto** por el decision resolution (US-003-decision-resolution.md aplicado a la US: N=3, ventana 10 min, Max-Age=30d, catálogo CAPTCHA_*/ALREADY_AUTHENTICATED, sin ADR requerido); Tech Spec `Ready for Task Breakdown`; Tasks File 23 tareas; dependencias PB-P0-004/006/007 `Done`/entregadas, PB-P1-001/PB-P1-002 `Done` (hoy); backlog contiene PB-P1-003; sin record previo.
- Warnings: Ninguno bloqueante.
- Blockers: Ninguno.
- Decision files relacionados: management/user-stories/decision-resolutions/US-003-decision-resolution.md (incorporado)
- Refinement files relacionados: management/user-stories/refinement-reviews/US-003-refinement-review.md (hallazgos resueltos vía decision resolution + versión final de la US)

## 4. Alignment Gate

- Resultado: **ALIGNED_WITH_NOTES**
- Notas:
  - N1 (estructura): rutas reales `backend/src/modules/identity-access/`, `backend/src/shared/security/auth-attempts/`, `web/src/features/auth/` (no `apps/api|apps/web`).
  - N2 (LoginUseCase): existe `LoginUserUseCase` (US-094); se extiende con verificación en tiempo constante (hash dummy), integración del contador IP+email y eventos — no se duplica clase (criterio N6 de US-001).
  - N3 (rutas frontend): `/login` sin prefijo de locale (conventions §10.10); catálogo i18n en `messages/<locale>/auth.json` bajo `auth.login.*` (patrón de namespaces establecido en P0/US-104), en lugar de `login.json`.
  - N4 (path de sesión frontend): el cliente `authApi.me` de US-106 apuntaba a `GET /auth/me` (mock-first); US-003 lo alinea al path canónico `GET /api/v1/users/me` (Doc 16 §23 + API-001), resolviendo la deuda registrada en US-001.
  - N5 (captcha condicional vs US-109): la aplicación incondicional de captcha en `/auth/login` (P0) se sustituye por el middleware condicional N=3 conforme a la Decisión PO US-003 #1/#2 (posterior); register y reset-request conservan captcha incondicional. Tests de US-109 sobre login se actualizan al nuevo contrato.
  - N6 (métricas): igual que D3 de US-001 — eventos estructurados con `reason`/`latencyMs`/`role` en lugar de stack Prometheus (no existe en MVP).
  - N7 (banner 429): `ApiError` se extiende con `retryAfterSeconds` (parse del header `Retry-After`) para el banner de FE-002.
- Tasks vs AC: matriz §5 del Tasks File verificada; todos los AC/EC mapean.
- Hallazgos de arquitectura: Ninguno (contador In-Memory por defecto — DB-001 no introduce persistencia nueva).

## 5. Task Inventory

| Task ID | Título original | Orden | Status | Started | Completed | AC | Evidencia (resumen) |
| ------- | --------------- | ----: | ------ | ------- | --------- | -- | ------------------- |
| TASK-PB-P1-003-US-003-DB-001 | Decidir y aplicar persistencia del contador (`InMemory` por defecto) | 1 | Done | 2026-07-10T21:55Z | 2026-07-10T22:30Z | EC-02 | Decisión In-Memory registrada (adapter default, nota en port); sin migración |
| TASK-PB-P1-003-US-003-BE-001 | Definir `LoginRequestSchema` (Zod) y `LoginInput` DTO | 2 | Done | 2026-07-10T21:55Z | 2026-07-10T22:30Z | AC-01, EC-01, EC-02 | `LoginUserRequestSchema` con captchaToken opcional; unit tests verdes |
| TASK-PB-P1-003-US-003-BE-002 | Implementar `ConstantTimePasswordVerifier` | 3 | Done | 2026-07-10T21:55Z | 2026-07-10T22:30Z | AC-01, EC-01 | Verificación en tiempo constante vía `TIMING_DUMMY_HASH` argon2id (verify SIEMPRE se ejecuta); test conductual verde (D1) |
| TASK-PB-P1-003-US-003-BE-004 | Implementar `AuthAttemptService` (contador IP+email, ventana 10 min) | 4 | Done | 2026-07-10T21:55Z | 2026-07-10T22:30Z | EC-02 | `InMemoryAuthAttemptTracker` (N=3, ventana 10min, clave IP+email, reset/expiración); 4 tests verdes |
| TASK-PB-P1-003-US-003-BE-003 | Implementar `LoginUseCase` | 5 | Done | 2026-07-10T21:55Z | 2026-07-10T22:30Z | AC-01, AC-03, EC-01 | `LoginUserUseCase` extendido (N2): dummy-hash + tracker + eventos con latencia/rol |
| TASK-PB-P1-003-US-003-BE-005 | Implementar cadena de middlewares de `/auth/login` | 6 | Done | 2026-07-10T21:55Z | 2026-07-10T22:30Z | AC-04, AC-05, EC-02 | Cadena: rateLimit → noActiveSessionGuard(409) → Zod → conditionalCaptcha → handler |
| TASK-PB-P1-003-US-003-BE-006 | Implementar `AuthController.login` y route binding | 7 | Done | 2026-07-10T21:55Z | 2026-07-10T22:30Z | AC-01 | Controller pasa `ip` al use case; cookie 30d; API tests verdes |
| TASK-PB-P1-003-US-003-API-001 | Documentar contrato `POST /auth/login` y alias `/me` ↔ `/api/v1/users/me` | 8 | Done | 2026-07-10T21:55Z | 2026-07-10T22:30Z | AC-01, AC-02, AC-04, AC-05 | OpenAPI login actualizado (captcha condicional, 409); path canónico /users/me documentado (sin alias — nota Doc 16 §23) |
| TASK-PB-P1-003-US-003-SEC-001 | Configurar rate limit `auth.login` y atributos canónicos de cookie | 9 | Done | 2026-07-10T21:55Z | 2026-07-10T22:30Z | AC-01, AC-03, AC-05 | Bucket login 10/IP/10min verificado (429+Retry-After); cookie Max-Age=2592000 aseverada en test |
| TASK-PB-P1-003-US-003-SEC-002 | Garantizar redacción de logs | 10 | Done | 2026-07-10T21:55Z | 2026-07-10T22:30Z | AC-01, EC-01, EC-02 | `redact.ts` central cubre password/captchaToken; test metadatos seguros actualizado (+role/latencyMs) |
| TASK-PB-P1-003-US-003-OBS-001 | Instrumentar eventos y métricas de login | 11 | Done | 2026-07-10T21:55Z | 2026-07-10T22:30Z | AC-01, EC-01, EC-02, AC-05 | Eventos `auth.login.success/failure` con reason/latencyMs/role; captcha emite failure con razón (D3: metrics-from-logs) |
| TASK-PB-P1-003-US-003-OPS-001 | Variables de entorno, secrets y captcha por entorno | 12 | Done | 2026-07-10T21:55Z | 2026-07-10T22:30Z | AC-01, AC-03, AC-05 | .env.example + config: AUTH_LOGIN_CAPTCHA_THRESHOLD=3, AUTH_LOGIN_ATTEMPT_WINDOW_MS=600000; captcha por entorno heredado |
| TASK-PB-P1-003-US-003-FE-001 | Implementar página `/[locale]/auth/login` | 13 | Done | 2026-07-10T21:55Z | 2026-07-10T22:30Z | AC-01, AC-02 | `/login` renderiza `LoginPage` (4 locales vía cookie/Accept-Language) |
| TASK-PB-P1-003-US-003-FE-002 | Implementar `LoginForm` con React Hook Form + Zod | 14 | Done | 2026-07-10T21:55Z | 2026-07-10T22:30Z | AC-01, EC-01 | `LoginForm` RHF+Zod, error genérico aria-live, banner 429 con segundos (N7/D2) |
| TASK-PB-P1-003-US-003-FE-003 | Integrar `CaptchaWidget` condicional | 15 | Done | 2026-07-10T21:55Z | 2026-07-10T22:30Z | EC-02 | CaptchaWidget condicional: solo aparece tras CAPTCHA_REQUIRED/INVALID; reset y token en retry |
| TASK-PB-P1-003-US-003-FE-004 | Implementar mutation `useLogin` (TanStack Query) | 16 | Done | 2026-07-10T21:55Z | 2026-07-10T22:30Z | AC-01, AC-04 | `useLogin` + `authRegisterApi.login`; invalida ['me']; tests MSW verdes |
| TASK-PB-P1-003-US-003-FE-005 | Redirección por rol e i18n de mensajes | 17 | Done | 2026-07-10T21:55Z | 2026-07-10T22:30Z | AC-02 | Redirect por rol (roleHome) + `from` interno validado (safeInternalPath); i18n auth.login.* en 4 locales (N3) |
| TASK-PB-P1-003-US-003-QA-001 | Tests unitarios (use case, schema, servicios) | 18 | Done | 2026-07-10T21:55Z | 2026-07-10T22:30Z | AC-01, EC-01, EC-02 | `us003-login.spec.ts` 10 tests Passed (schema, tracker, use case, dummy hash) |
| TASK-PB-P1-003-US-003-QA-002 | Tests de integración de middleware chain | 19 | Done | 2026-07-10T21:55Z | 2026-07-10T22:30Z | AC-04, AC-05, EC-02 | Cadena real verificada en `us003-login.api.spec.ts` (409/400/CAPTCHA_*/VALIDATION) |
| TASK-PB-P1-003-US-003-QA-003 | Tests de API con Supertest | 20 | Done | 2026-07-10T21:55Z | 2026-07-10T22:30Z | AC-01..05, EC-01, EC-02 | 8 escenarios API Passed (200+cookie 30d, /users/me, 401 idéntico, 409, captcha N=3 E2E-flow, 429) |
| TASK-PB-P1-003-US-003-QA-004 | E2E para los 3 roles con Playwright | 21 | Done | 2026-07-10T21:55Z | 2026-07-10T22:30Z | AC-01, AC-02, EC-02 | `auth-login.spec.ts` 4 tests Passed (3 roles + captcha condicional); suite E2E 42 Passed |
| TASK-PB-P1-003-US-003-QA-005 | Tests de seguridad (timing) y accesibilidad | 22 | Done | 2026-07-10T21:55Z | 2026-07-10T22:30Z | EC-01 | Timing conductual (D1) + jest-axe sin violaciones critical/serious — Passed |
| TASK-PB-P1-003-US-003-DOC-001 | Documentation Alignment (Doc 19 §10, Doc 8 UC-AUTH-002, Doc 16 §23) | 23 | Done | 2026-07-10T21:55Z | 2026-07-10T22:30Z | AC-03, EC-02 | Notas insertadas: Doc 19 §10 (30d), Doc 8 UC-AUTH-002 (N=3), Doc 16 §23 (/users/me) |

## 6. Emergent Tasks

| ID | Título | Tarea padre | Razón | Necesidad | Impacto scope | Impacto Tech Spec | Status | Evidencia |
| -- | ------ | ----------- | ----- | --------- | ------------- | ----------------- | ------ | --------- |
| EMERGENT-001 | Alinear frontend de sesión a `GET /users/me` (authApi.me, mappers, MSW, tests, E2E) | API-001 / FE-005 | El cliente de US-106 apuntaba a `/auth/me` (mock); el path canónico es `/users/me` | Requerida para AC-02 real | Ninguno (corrige deuda registrada en US-001) | No | Done | types/mappers/authApi/MSW/units/E2E migrados a envelope `/users/me`; suites verdes |

## 8. Blockers

| Blocker ID | Tarea afectada | Tipo | Descripción | Estado |
| ---------- | -------------- | ---- | ----------- | ------ |
| — | | | | |

## 9. Deviations

| # | Planeado | Implementado | Razón | Impacto | ADR | Resolución |
| - | -------- | ------------ | ----- | ------- | --- | ---------- |
| D1 | QA-005 "timing p95 comparable" con muestreo | Garantía **conductual**: test unitario asevera que `verify` del hasher se ejecuta SIEMPRE (hash dummy) aunque el email no exista; medición p95 en entorno de CI es no determinista y produciría flakes (prohibidos por conventions §14) | Anti-flaky | La mitigación real (hash incondicional) queda cubierta y verificada | No | Documentada |
| D2 | FE-002 "cuenta regresiva Retry-After" | Banner 429 con segundos de `Retry-After` (estático, sin countdown animado) | Alcance mínimo coherente; countdown decorativo | UX equivalente | No | Documentada |
| D3 | Métricas Prometheus (`auth_login_total{result}`…) | Eventos estructurados `auth.login.success/failure` con `reason`/`latencyMs` (metrics-from-logs) | Sin stack de métricas en MVP (conventions §15) | Igual que D3 US-001 | No | Documentada |

## 10. Final Validation

- Task completion: **23/23 Done** + EMERGENT-001 Done (0 Skipped/Blocked/Rework).
- Acceptance Criteria coverage: **7/7** — AC-01 (200 + cookie HttpOnly/Lax/Path=/ + Max-Age=30d, argon2id constante), AC-02 (GET /users/me + redirect organizer/vendor/admin, component+E2E), AC-03 (Max-Age=2592000 + sesión server-side 30d), AC-04 (409 ALREADY_AUTHENTICATED sin nueva cookie), AC-05 (429 + Retry-After, sin procesar credenciales), EC-01 (401 genérico idéntico + hash dummy incondicional), EC-02 (N=3: CAPTCHA_REQUIRED→CAPTCHA_INVALID→éxito con token→reset; widget condicional en FE).
- Backend: lint Passed · typecheck Passed · vitest 108 files / 928 passed (BD test aislada) · openapi:check Passed. Web: lint Passed · typecheck Passed · vitest 29 files / 120 passed · build Passed · Playwright 42 passed.
- Migrations/Seed: Not Applicable (contador In-Memory — DB-001) · Authorization: Passed · Security: Passed (anti-enumeración, timing conductual, redacción, guard) · Accessibility: Passed · i18n: Passed (4 locales) · Documentation: Passed (Doc 19/8/16 + OpenAPI).
- Evidence archivos: backend `src/shared/security/auth-attempts/`, `src/infrastructure/security/in-memory-auth-attempt-tracker.ts`, `src/shared/interface/http/conditional-captcha.ts`, `login-user.use-case.ts`, DTO login, routes/controller, config/env + .env.example, `tests/unit/us003-login.spec.ts`, `tests/api/us003-login.api.spec.ts`; web `features/auth` (loginSchema/useLogin/LoginForm/LoginPage), `shared/auth-session` (path canónico), `shared/api-client` (retryAfterSeconds), messages auth.login.*, `tests/integration/auth/login-form.test.tsx`, `tests/e2e/auth-login.spec.ts` + specs migrados a /users/me. Tests preexistentes actualizados: us109/us111/us094-security-negative (captcha condicional — N5).
- Unresolved debt: contador In-Memory no compartido entre instancias (documentado; multi-instancia requerirá tabla `auth_attempts`); resto hereda de US-001/002.
- Final status: **Done**

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-10T21:50Z | Initialized | Record creado |
| 2026-07-10T21:50Z | Readiness | READY (refinement resuelto por decision resolution) |
| 2026-07-10T21:50Z | Alignment | ALIGNED_WITH_NOTES (N1..N7; EMERGENT-001) |
| 2026-07-10T22:30Z | Ejecución | 23/23 + EMERGENT-001 Done |
| 2026-07-10T22:35Z | Final Validation | AC 7/7; story → Done |
