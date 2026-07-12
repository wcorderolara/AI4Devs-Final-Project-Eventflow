# Execution Record — PB-P1-001 / US-001: Registrarme como organizador con captcha

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-001 |
| User Story Title | Registrarme como organizador con captcha |
| Phase | P1 |
| Backlog Position | PB-P1-001 |
| User Story Path | management/user-stories/US-001-register-organizer-account.md |
| Tech Spec Path | management/technical-specs/P1/PB-P1-001/US-001-technical-spec.md |
| Tasks Path | management/development-tasks/P1/PB-P1-001/US-001-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | v1.0.0 (Last updated 2026-07-08) |
| Execution Record Status | Done |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P1-001_PB-P1-004 |
| Initial Commit Hash | 81e2f55d74010a7cdc0976dd03e0146f32d3f38e |
| Started At | 2026-07-10T20:14:32Z |
| Last Updated At | 2026-07-10T21:00:00Z |
| Completed At | 2026-07-10T21:00:00Z |
| Claude Session ID | 87bcbf68-374a-480e-8726-be3ecc150e04 |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (3 argumentos, existen, dentro del repo) — `validate-inputs.sh` exit 0
- [x] User Story ID coincide en las 3 rutas (nombre + contenido): US-001
- [x] Phase coincide entre Tech Spec y Tasks: P1
- [x] Backlog Position coincide entre Tech Spec y Tasks: PB-P1-001
- [x] Documentos legibles
- [x] IDs de tarea extraídos (rango: TASK-PB-P1-001-US-001-BE-001 … TASK-PB-P1-001-US-001-DOC-001; 21 tareas)

## 3. Readiness Gate

- Resultado: **READY_WITH_WARNINGS**
- Checks:
  - User Story existe, legible, status `Approved`, `Ready for Development Tasks: Yes` → Pass
  - Acceptance Criteria testeables (AC-01..03, EC-01..03) → Pass
  - Tech Spec legible, status `Ready for Task Breakdown` → Pass
  - Tasks File con 21 tareas identificables → Pass
  - `DEVELOPMENT_CONVENTIONS.md` legible (v1.0.0) → Pass
  - Dependencias PB-P0-004 (US-094..097 `Done`) → Pass
  - Dependencia PB-P0-006 (US-108/US-109 `Partially Completed`) → Warning (ver abajo)
  - Refinement review: no existe archivo para US-001 → N/A
  - Decision resolutions: no existe archivo para US-001 (decisiones formalizadas en la US) → N/A
  - Backlog priorizado contiene PB-P1-001 → Pass
  - Sin execution record previo bloqueante → Pass
- Warnings:
  - W1: PB-P0-006 quedó `Partially Completed` con tareas FE Skipped (US-108 FE-001/QA-005; US-109 FE-001/FE-002/QA-005) **diferidas explícitamente a la historia frontend de auth**, es decir, a esta US. No altera arquitectura ni scope: US-001 entrega ese frontend (CaptchaWidget, integración de cookie de sesión en cliente).
  - W2: El repositorio real usa `backend/` + `web/` y el módulo `identity-access` (convenciones §6.2/§8.1); la Tech Spec §18 sugiere rutas `apps/api`/`apps/web` y módulo `auth`. Se sigue la estructura real aprobada por convenciones (nivel 4 > Tech Spec nivel 7).
- Blockers: Ninguno
- Decision files relacionados: No existe
- Refinement files relacionados: No existe

## 4. Alignment Gate

- Resultado: **ALIGNED_WITH_NOTES**
- Tasks vs Tech Spec: cada tarea deriva de §7–§14; orden respeta dependencias; sin scope no aprobado.
- Tech Spec vs Conventions:
  - N1 (rutas/módulo): implementar en `backend/src/modules/identity-access/` y `web/src/` (no `apps/api`/`modules/auth`). Los archivos objetivo de cada tarea se mapean a la estructura real.
  - N2 (locale en URL): la Tech Spec usa `/[locale]/auth/register`; convenciones §10.10 fijan detección por cookie `Accept-Language` **sin** prefijo de locale en URL (MVP). Ruta real: `/register` bajo route group `(auth)` ya existente.
  - N3 (redirección post-registro): dashboard del organizador = `/organizer` (route group `(app)` real), no `/[locale]/dashboard`.
- Tasks vs Acceptance Criteria (mapeo): AC-01 → BE-001..005/API-001/FE-001..005/SEC-001/QA-001..004; AC-02 → BE-001/FE-005/QA-002; AC-03 → BE-004/API-001/QA-003; EC-01 → BE-001/SEC-001/QA-003/QA-004; EC-02 → BE-003/FE-002/QA-001/QA-003; EC-03 → BE-003/FE-002/QA-001.
- Hallazgos de arquitectura: Ninguno (sin nueva tecnología salvo `argon2`, dependencia justificada explícitamente por BE-005 y ADR-SEC-003/Doc 19 §11.1).
- Ajustes requeridos (notas, no bloqueantes):
  - N4 (códigos captcha): US-001 EC-01 espera `400 VALIDATION_ERROR` con `details[].field='captchaToken'`; la implementación aceptada de PB-P0-006/US-109 y las historias posteriores US-003 (PO Decision: catálogo `400 CAPTCHA_REQUIRED`/`400 CAPTCHA_INVALID`) y US-004 (VR-02, NT-07/NT-08) formalizan códigos dedicados `CAPTCHA_REQUIRED`/`CAPTCHA_INVALID`. Para mantener un único contrato consistente en todo el flujo auth se conservan los códigos dedicados (HTTP 400, mensaje neutro, sin crear el User, evento de auditoría con razón — el comportamiento observable de EC-01 se cumple). Registrado como Deviation D1; DOC-001 deja la nota de catálogo anticipada por la propia US-001 (Notes) y su Tasks File.
  - N5 (rol forzado): la US pide "forzar role='organizer' ignorando payload"; el endpoint es compartido con US-002 (vendor). El DTO vigente restringe `role ∈ {organizer, vendor}` con Zod `.strict()`: un intento `role='admin'` se rechaza con `400 VALIDATION_ERROR` y jamás se persiste. Garantía SEC-02/VR-06 cumplida (admin imposible); registrado como Deviation D2.
  - N6 (RegisterOrganizerUseCase): existe `RegisterUserUseCase` (US-094) parametrizado por rol, que cubre la intención; se extiende (emisión de sesión + idioma inferido + eventos) en lugar de duplicar una clase paralela (convenciones §5: evitar abstracciones duplicadas). Tarea BE-001 se ejecuta sobre ese use case.

## 5. Task Inventory

| Task ID | Título original | Orden | Depends On | Status | Started | Completed | AC cubiertos | Evidencia (resumen) |
| ------- | --------------- | ----: | ---------- | ------ | ------- | --------- | ------------ | ------------------- |
| TASK-PB-P1-001-US-001-OPS-001 | Configurar Secrets y env por ambiente | 1 | — | Done | 2026-07-10T20:16Z | 2026-07-10T20:36Z | AC-01, EC-01 | `.env.example` backend ya completo (P0); `web/.env.local.example` + `NEXT_PUBLIC_CAPTCHA_PROVIDER` |
| TASK-PB-P1-001-US-001-BE-003 | Definir RegisterOrganizerDTO con Zod | 2 | — | Done | 2026-07-10T20:16Z | 2026-07-10T20:36Z | AC-01, EC-02, EC-03 | DTO + política Doc 19 §11.2 + localpart + acceptedTerms; unit tests verdes |
| TASK-PB-P1-001-US-001-BE-005 | Implementar PasswordHasher (argon2id) | 3 | — | Done | 2026-07-10T20:16Z | 2026-07-10T20:36Z | AC-01 | `argon2id-password-hasher.ts` (m=19456,t=2,p=1) + fallback bcrypt; tests verdes |
| TASK-PB-P1-001-US-001-BE-004 | Extender UserRepository.createWithRole | 4 | — | Done | 2026-07-10T20:16Z | 2026-07-10T20:36Z | AC-01, AC-03 | Ya cubierto por `create`/`findByEmailNormalized` (US-094); integration test LOWER(email) verde |
| TASK-PB-P1-001-US-001-SEC-001 | Configurar middleware rateLimit('register') y cookie session por ambiente | 5 | — | Done | 2026-07-10T20:16Z | 2026-07-10T20:36Z | AC-01, EC-01 | Bucket `register` 5/IP/10min (US-110) verificado; test 429 + Retry-After verde; flags cookie por env (US-108) |
| TASK-PB-P1-001-US-001-BE-001 | Implementar RegisterOrganizerUseCase | 6 | BE-002..005 | Done | 2026-07-10T20:18Z | 2026-07-10T20:36Z | AC-01, AC-02, EC-01 | `RegisterUserUseCase` extendido (N6): sesión + Accept-Language + eventos + welcome |
| TASK-PB-P1-001-US-001-BE-002 | Wirear controller y ruta POST /api/v1/auth/register | 7 | BE-001, BE-003, SEC-001 | Done | 2026-07-10T20:18Z | 2026-07-10T20:36Z | AC-01, EC-01..03 | Cookie en 201 + `noActiveSessionGuard` (409 ALREADY_AUTHENTICATED); API tests verdes |
| TASK-PB-P1-001-US-001-API-001 | Documentar y validar contrato POST /api/v1/auth/register | 8 | BE-002 | Done | 2026-07-10T20:26Z | 2026-07-10T20:36Z | AC-01, AC-03, EC-01 | `openapi:generate` + `openapi:check` OK (acceptedTerms + Set-Cookie + 409 doc) |
| TASK-PB-P1-001-US-001-OBS-001 | Eventos y métricas de registro | 9 | BE-001 | Done | 2026-07-10T20:18Z | 2026-07-10T20:36Z | AC-01, EC-01 | `auth.register.success/failure` (+reason+latencyMs), `email_simulated` welcome; ver D3 (métricas) |
| TASK-PB-P1-001-US-001-FE-005 | i18n keys auth.register (es-LATAM, es-ES, pt, en) | 10 | — | Done | 2026-07-10T20:40Z | 2026-07-10T20:52Z | AC-01, AC-02 | `messages/{4 locales}/auth.json` + REGISTRY; build i18n verde |
| TASK-PB-P1-001-US-001-FE-002 | Implementar RegisterOrganizerForm (RHF + Zod) | 11 | BE-003 | Done | 2026-07-10T20:40Z | 2026-07-10T20:52Z | AC-01, EC-02, EC-03 | Form RHF+zodResolver, errores accesibles, strength indicator; 11 tests verdes |
| TASK-PB-P1-001-US-001-FE-003 | Integrar CaptchaWidget | 12 | — | Done | 2026-07-10T20:40Z | 2026-07-10T20:52Z | AC-01, EC-01 | Widget mock provider + reset en error; E2E verde |
| TASK-PB-P1-001-US-001-FE-004 | Mutation useRegisterOrganizer | 13 | API-001 | Done | 2026-07-10T20:40Z | 2026-07-10T20:52Z | AC-01, AC-03, EC-01, EC-02 | TanStack mutation + invalidate ['me'] + redirect /organizer; tests MSW verdes |
| TASK-PB-P1-001-US-001-FE-001 | Crear página /[locale]/auth/register | 14 | FE-002 | Done | 2026-07-10T20:40Z | 2026-07-10T20:52Z | AC-01 | `/register` (N2: sin prefijo de locale); 4 locales por cookie/Accept-Language |
| TASK-PB-P1-001-US-001-SEC-002 | Garantizar redacción de logs y respuestas | 15 | OBS-001 | Done | 2026-07-10T20:30Z | 2026-07-10T20:36Z | AC-01 | `redact.ts` central (US-108/109) cubre password/token/set-cookie; welcome redacta email; tests us108-log-redaction + us001 unit verdes |
| TASK-PB-P1-001-US-001-QA-001 | Unit tests (use case, schema, hasher) | 16 | BE-001, BE-003, BE-005 | Done | 2026-07-10T20:28Z | 2026-07-10T20:36Z | AC-01, EC-02, EC-03 | `us001-register-organizer.spec.ts` 17 tests + `us094-auth-use-cases` actualizado — Passed |
| TASK-PB-P1-001-US-001-QA-002 | Integration tests (use case + repo + Postgres test) | 17 | BE-001, BE-004 | Done | 2026-07-10T20:28Z | 2026-07-10T20:36Z | AC-01..03 | `us001-register.integration.spec.ts` 4 tests Passed vs Postgres test (5433/eventflow_test) |
| TASK-PB-P1-001-US-001-QA-003 | API tests con Supertest | 18 | BE-002, API-001, SEC-001 | Done | 2026-07-10T20:28Z | 2026-07-10T20:36Z | AC-01, AC-03, EC-01, EC-02 | `us001-register.api.spec.ts` 8 tests Passed (201 cookie, captcha, débil, 409×2, admin, 429) |
| TASK-PB-P1-001-US-001-QA-004 | E2E con Playwright + fake captcha | 19 | FE-001..005, BE-002 | Done | 2026-07-10T20:48Z | 2026-07-10T20:55Z | AC-01 | `auth-register.spec.ts` 2 tests Passed (es-419); suite E2E completa 37 Passed |
| TASK-PB-P1-001-US-001-QA-005 | Tests de accesibilidad en /auth/register | 20 | FE-002 | Done | 2026-07-10T20:48Z | 2026-07-10T20:55Z | AC-01 | jest-axe (0 violaciones critical/serious) + aria-describedby/labels — Passed |
| TASK-PB-P1-001-US-001-DOC-001 | Actualizar Acceptance Summary del backlog y notas de alineación | 21 | — | Done | 2026-07-10T20:56Z | 2026-07-10T20:58Z | AC-01 | PB-P1-001 summary → argon2id; Doc 16 §14.2 formaliza EMAIL_TAKEN/CAPTCHA_*/ALREADY_AUTHENTICATED |

> Los IDs y títulos originales se copian **verbatim**; nunca se renumeran. El "Orden" refleja el orden de implementación sugerido (§13 del Tasks File).

## 6. Emergent Tasks

| ID | Título | Tarea padre | Razón de descubrimiento | Necesidad | Impacto de scope | Impacto Tech Spec | Status | Evidencia |
| -- | ------ | ----------- | ----------------------- | --------- | ---------------- | ----------------- | ------ | --------- |
| — | (ninguna aún) | | | | | | | |

## 7. Evidence by Task

### Backend (BE-001..005, SEC-001/002, OBS-001, API-001, OPS-001)
- Files created: `backend/src/infrastructure/security/argon2id-password-hasher.ts`, `backend/src/infrastructure/notifications/logging-welcome-email-notifier.ts`, `backend/src/shared/domain/errors/already-authenticated.error.ts`, `backend/src/shared/interface/http/no-active-session.guard.ts`, `backend/src/shared/interface/http/accept-language.ts`.
- Files modified: `backend/src/shared/validation/password.ts` (política Doc 19 §11.2), `backend/src/modules/identity-access/dto/register-user.request.ts` (name 2..120, acceptedTerms, localpart), `backend/src/modules/identity-access/application/register-user.use-case.ts` (sesión + welcome + eventos + latencia), `backend/src/modules/identity-access/interface/identity-access.controller.ts` (cookie + Accept-Language), `backend/src/modules/identity-access/interface/identity-access.routes.ts` (guard), `backend/src/infrastructure/auth-composition.ts` (argon2id), `backend/src/shared/auth/ports.ts` (eventos + WelcomeEmailNotifier), `backend/src/shared/domain/errors/error-codes.ts` (+ALREADY_AUTHENTICATED), `backend/src/shared/interface/middlewares/error-handler.middleware.ts`, `backend/src/shared/interface/middlewares/captcha-verification.middleware.ts` (evento auth.*.failure con razón), `backend/src/openapi/openapi.ts` + `backend/openapi.json` (regenerado), `backend/package.json`/`package-lock.json` (dependencia `argon2` — justificada por BE-005/ADR-SEC-003).
- Dependencia agregada: `argon2@^0.44` (justificación: BE-005 exige argon2id; Doc 19 §11.1 lo fija como default MVP). `bcryptjs` se conserva como fallback de verificación.
- Migrations created: N/A (sin cambios de schema — Tech Spec §10).
- Commands: `npm run typecheck` → exit 0 · `npm run lint` → exit 0 · `npm run test` (DATABASE_URL de test aislada `localhost:5433/eventflow_test`) → 104 files / 895 passed · `npm run openapi:generate && npm run openapi:check` → OK.
- Lint: Passed · Typecheck: Passed · Tests: Passed · Build: Not Run (backend build se valida en CI `main.yml`; sin cambios de tooling) · DB validation: Passed (migraciones aplicadas a BD de test; constraint `uq_users_email_lower` verificado por test) · Security checks: Passed (redacción, cookie flags, guard, rate limit).

### Frontend (FE-001..005)
- Files created: `web/src/features/auth/**` (schemas, api, mappers, types, hooks, components CaptchaWidget/PasswordStrengthIndicator/RegisterOrganizerForm, pages, index), `web/src/messages/{es-LATAM,es-ES,pt,en}/auth.json`.
- Files modified: `web/src/app/(auth)/register/page.tsx`, `web/src/shared/i18n/request.ts` (namespace `auth`), `web/src/tests/msw/handlers/auth.ts` (handler register), `web/.env.local.example` (+`NEXT_PUBLIC_CAPTCHA_PROVIDER`), `web/package.json` (+`jest-axe` devDependency — justificada por QA-005/axe-core).
- Commands: `npm run typecheck` → exit 0 · `npm run lint` → exit 0 (1 `eslint-disable` puntual justificado: autofocus exigido por la US) · `npx vitest run` → 27 files / 105 passed · `npm run build` → exit 0 · `npx playwright test` → 37 passed.
- Lint: Passed · Typecheck: Passed · Tests: Passed · Build: Passed · Accessibility: Passed (jest-axe sin violaciones critical/serious; labels/aria/teclado) · i18n: Passed (4 locales completos; smoke fallback activo).

### QA (QA-001..005)
- `backend/tests/unit/us001-register-organizer.spec.ts` (17), `backend/tests/integration/us001-register.integration.spec.ts` (4, Postgres test), `backend/tests/api/us001-register.api.spec.ts` (8), `web/src/tests/integration/auth/register-form.test.tsx` (11), `web/src/tests/e2e/auth-register.spec.ts` (2).
- Tests preexistentes actualizados al contrato de US-001 (acceptedTerms, política de contraseña, resultado `{user, sessionId}`, eventos renombrados): `us094-*`, `us109-captcha-enforcement`, `zod-validation`, `validate-request-us092`, helpers de tests.

### DOC-001
- `management/artifacts/4-Product-Backlog-Prioritized.md` (PB-P1-001 Acceptance Summary → argon2id default) y `docs/16-API-Design-Specification.md` §14.2 (formalización de códigos ya entregados; nota fechada). Modificaciones limitadas a lo que la tarea incluye explícitamente (skill §13).

## 8. Blockers

| Blocker ID | Tarea afectada | Tipo | Descripción | Detectado | Decisión requerida | Rol responsable | Estado |
| ---------- | -------------- | ---- | ----------- | --------- | ------------------ | --------------- | ------ |
| — | | | | | | | |

## 9. Deviations

| # | Comportamiento planeado | Implementado/propuesto | Razón | Impacto | Convención afectada | Sección Tech Spec | ADR requerido | Resolución |
| - | ----------------------- | ---------------------- | ----- | ------- | ------------------- | ----------------- | ------------- | ---------- |
| D1 | EC-01: captcha inválido → `400 VALIDATION_ERROR` (`details[].field='captchaToken'`) | `400 CAPTCHA_REQUIRED` / `400 CAPTCHA_INVALID` (códigos estables de US-109, formalizados por US-003/US-004) | Contrato único y consistente en todo el flujo auth; US-003/US-004 (aprobadas después) y la implementación aceptada de PB-P0-006 fijan códigos dedicados | Solo literal del `code`; el comportamiento observable de EC-01 (400, mensaje neutro, sin persistir User, evento con razón) se cumple | §9 (catálogo Doc 16) | §7 Error Handling | No (nota de catálogo vía DOC-001) | Documentada |
| D2 | VR-06: backend "fuerza" `organizer` ante `role='admin'` | Zod `.strict()` con `role ∈ {organizer, vendor}` → `400 VALIDATION_ERROR` ante `admin` (endpoint compartido con US-002) | Endpoint compartido organizer/vendor (Tech Spec §12 Role Rules); rechazo explícito ≥ forzado silencioso en seguridad | `admin` jamás se crea (SEC-02 cumplido); test NT-04 asevera rechazo + no persistencia | §13 | §12 | No | Documentada |
| D3 | OBS-001: métricas `auth_register_outcome_total` / `auth_register_latency_ms` en dashboards | Eventos estructurados `auth.register.success/failure` con `reason` y `latencyMs` (métricas derivables de logs en CloudWatch) | Conventions §15: MVP sin stack de métricas/APM (solo logs estructurados a CloudWatch); no hay librería de métricas aprobada (nueva dependencia requeriría justificación mayor) | Los datos del counter/histogram están presentes en los eventos; la agregación se hace en el sink | §15 | §14 | No | Documentada |
| D4 | Tech Spec §8: toast "Cuenta creada con éxito" al redirigir | Redirección inmediata al dashboard con anuncio `aria-live` en el form; sin sistema de toasts | No existe `ToastProvider` en el design system actual (P0 no lo entregó); introducirlo excede el scope de US-001 | UX equivalente (feedback de éxito + aterrizaje en dashboard); deuda registrada | §10.7 | §8 | No | Deuda técnica (ver §10) |

## 10. Final Validation

- Task completion: **21/21 Done** (0 Skipped, 0 Blocked, 0 Rework Required).
- Acceptance Criteria coverage: **6/6** —
  - AC-01 → BE-001/002/005 + FE-001..004 + QA-001..004 (201 + argon2id + cookie HttpOnly/SameSite=Lax + aterrizaje /organizer).
  - AC-02 → Accept-Language → `preferred_language` (unit + integration + API `pt-BR→pt`; fallback es-LATAM).
  - AC-03 → 409 EMAIL_TAKEN case-insensitive + mensaje neutro (integration + API).
  - EC-01 → 400 `CAPTCHA_INVALID` (Deviation D1), sin persistencia, evento `auth.register.failure reason=captcha_failed`, widget reiniciado (API + component + E2E).
  - EC-02 → política Doc 19 §11.2 + localpart en FE y BE (unit + API + component).
  - EC-03 → Zod rechaza email malformado sin tocar DB (unit + API + component).
- Lint: Passed (backend y web) · Typecheck: Passed (backend y web) · Tests: Passed (backend 895; web 105 + 37 E2E) · Build: Passed (web `next build`; imagen backend se valida en CI) · Migrations: Not Applicable (sin cambios de schema) · Seed: Not Applicable (Tech Spec §15) — nota: el hasher argon2id verifica hashes bcrypt del seed (fallback) · Authorization: Passed (guard solo-anónimo + role enum + tests negativos) · Security: Passed (redacción, cookie flags, rate limit, captcha server-side) · Accessibility: Passed (axe + ARIA + teclado) · i18n: Passed (4 locales) · Documentation: Passed (OpenAPI + backlog + Doc 16 nota).
- Unresolved debt: (1) sistema de toasts del design system pendiente (D4); (2) integración de proveedor de captcha real (reCAPTCHA/hCaptcha) en frontend cuando el PO elija proveedor (config por ambiente; contrato listo); (3) `GET /auth/me` del frontend (US-106) vs `GET /users/me` del backend — se alinea en US-003 (login/session hydration).
- Final status: **Done**

## 10.bis Working tree
- Cambios no relacionados: ninguno. Todos los archivos tocados trazan a tareas de US-001.

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-10T20:14:32Z | Initialized | Execution record creado |
| 2026-07-10T20:14:32Z | Readiness | READY_WITH_WARNINGS (W1 frontend diferido de PB-P0-006; W2 estructura real backend/web) |
| 2026-07-10T20:14:32Z | Alignment | ALIGNED_WITH_NOTES (N1..N6; Deviations D1/D2 registradas) |
| 2026-07-10T20:36Z | Phase 1+2 backend | OPS-001, BE-001..005, SEC-001/002, API-001, OBS-001, QA-001..003 → Done |
| 2026-07-10T20:55Z | Phase 2+3 frontend | FE-001..005, QA-004, QA-005 → Done |
| 2026-07-10T20:58Z | DOC-001 | Done (backlog summary + Doc 16 §14.2) |
| 2026-07-10T21:00Z | Final Validation | 21/21 Done; AC 6/6; story → Done |
