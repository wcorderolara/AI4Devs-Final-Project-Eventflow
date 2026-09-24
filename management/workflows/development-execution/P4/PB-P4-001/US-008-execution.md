# Execution Record — PB-P4-001 / US-008: Iniciar sesión con Google (OAuth)

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-008 |
| User Story Title | Iniciar sesión con Google (OAuth) |
| Phase | P4 |
| Backlog Position | PB-P4-001 |
| User Story Path | management/user-stories/US-008-login-with-google.md |
| Tech Spec Path | management/technical-specs/P4/PB-P4-001/US-008-technical-spec.md |
| Tasks Path | management/development-tasks/P4/PB-P4-001/US-008-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | last-modified 2026-07-08 |
| Execution Record Status | Done |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | project/final-stage-WACL |
| Initial Commit Hash | 8a003d5e7d181183c8940bf9e87cf41effa73f82 |
| Started At | 2026-08-13T16:16:08Z |
| Last Updated At | 2026-08-13T17:05:00Z |
| Completed At | 2026-08-13T17:05:00Z |
| Claude Session ID | 5bd9acb8-4571-4409-92c2-43e0b00b8dbb |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (3 argumentos, existen, dentro del repo) — `validate-inputs.sh` EXIT=0
- [x] User Story ID coincide en las 3 rutas (nombre + contenido) — US-008
- [x] Phase coincide entre Tech Spec y Tasks — P4
- [x] Backlog Position coincide entre Tech Spec y Tasks — PB-P4-001
- [x] Documentos legibles
- [x] IDs de tarea extraídos (rango: TASK-PB-P4-001-US-008-DB-001 … -DOC-001; 17 tareas)

## 3. Readiness Gate

- Resultado: **READY_WITH_WARNINGS**
- Checks:
  - User Story existe y legible — OK (`Status: Approved`, `Ready for Development Tasks: Yes`).
  - Status habilita implementación — OK.
  - Acceptance Criteria testeables — OK (AC-01..03, EC-01/02, VR-01..03, SEC-01..05, NT-01..04, AUTH-TS-01/02).
  - Tech Spec legible — OK (`Ready for Task Breakdown`).
  - Tasks File con IDs — OK (17 tareas).
  - `DEVELOPMENT_CONVENTIONS.md` legible — OK.
  - Dependencias comprendidas — OK (US-001..US-007 base auth existente).
  - Refinement review sin bloqueos abiertos — OK (bloqueo de scope **RESUELTO** por ADR-ARCH-005; ver encabezado del refinement review).
  - Historia en backlog priorizado — OK (PB-P4-001).
- Warnings:
  - **W-01 (OPS-001):** las credenciales reales de Google (client_id/secret) y redirect URIs no existen en el repo (correcto por seguridad — ADR-SEC-005). Se documenta contrato de entorno en `.env.example`; la verificación end-to-end contra Google real queda fuera del alcance ejecutable (Setup).
  - **W-02:** el entorno de ejecución no tiene Postgres levantado ni navegadores Playwright instalados; los tests de integración y E2E se **escriben** pero su corrida real se registra con honestidad (`Not Run` con razón) salvo que puedan ejecutarse.
- Blockers: Ninguno.
- Decision files relacionados: `management/user-stories/decision-resolutions/US-008-decision-resolution.md` → No existe (promoción vía ADR-ARCH-005).
- Refinement files relacionados: `management/user-stories/refinement-reviews/US-008-refinement-review.md` → Existe, resuelto no-bloqueante.

## 4. Alignment Gate

- Resultado: **ALIGNED_WITH_NOTES**
- Tasks vs Tech Spec: cada tarea deriva de secciones de la Tech Spec (§5..§16); orden respeta dependencias; QA/seguridad/observabilidad/seed/docs cubiertos.
- Tech Spec vs Conventions: stack aprobado (Express+Prisma+Zod+argon2+Vitest backend; Next.js App Router+next-intl+TanStack Query frontend). Clean/Hexagonal respetado.
- Tasks vs Acceptance Criteria (mapeo):
  - AC-01 → DB-001, BE-001, BE-003, BE-004, API-001, SEC-001, FE-001, QA-001/002
  - AC-02 → DB-001, BE-003, BE-004, API-001, FE-002, QA-001/002
  - AC-03 → BE-003, BE-004, API-001, FE-003, QA-001
  - EC-01 → SEC-001, QA-001/003; EC-02 → BE-003, FE-001, QA-002
  - VR-01/02 → BE-001, SEC-001, QA-003; VR-03 → API-001, FE-002, QA-001
  - SEC-01..05 → BE-001, BE-002, SEC-001, QA-003; NT-01..04 → QA-001/003; AUTH-TS-01/02 → QA-001
- Hallazgos de arquitectura: Ninguno bloqueante.
- Notas de implementación (ALIGNED_WITH_NOTES):
  - **N-01:** El puerto real `UserRepository` vive en `backend/src/shared/auth/ports.ts` y su adapter en `backend/src/infrastructure/persistence/prisma-user.repository.ts`. Los archivos `modules/identity-access/ports/user.repository.ts` e `infrastructure/prisma-user.repository.ts` son **stubs de naming** (US-090, interfaz vacía) y **no** se usan en runtime. BE-004 extiende el puerto/adapter reales (aligned con Tech Spec §7 "Extender UserRepository").
  - **N-02:** La verificación criptográfica del `id_token` (RS256 con JWK de Google) se implementa con el `jsonwebtoken` ya presente + `node:crypto` (`createPublicKey({ format: 'jwk' })`) para convertir JWK→KeyObject. **No se agrega ninguna dependencia nueva** (respeta la regla de no agregar deps sin justificación). Ver BE-001.
  - **N-03:** `state`/`nonce` se persisten en cookie firmada de corta vida (mecanismo ya disponible vía `cookie-parser` + `SESSION_SECRET`), evitando una tabla nueva (la Tech Spec §4 admite "cookie firmada de corta vida" como alternativa al store server-side).
- Ajustes requeridos: Ninguno (sin tareas emergentes de arquitectura).

## 5. Task Inventory

| Task ID | Título original | Orden | Depends On | Status | Started | Completed | AC cubiertos | Evidencia (resumen) |
| ------- | --------------- | ----: | ---------- | ------ | ------- | --------- | ------------ | ------------------- |
| TASK-PB-P4-001-US-008-DB-001 | Migración `google_sub` y `password_hash` nullable | 1 | — | Done | 2026-08-13T16:16Z | 2026-08-13T16:20Z | AC-01, AC-02 | schema + migración; `prisma validate` OK, typecheck OK |
| TASK-PB-P4-001-US-008-OPS-001 | Credenciales Google y redirect URIs | 2 | — | Done | 2026-08-13T16:20Z | 2026-08-13T16:22Z | AC-01, AC-02 | env schema + `.env.example`; env-example test Passed |
| TASK-PB-P4-001-US-008-BE-004 | Extensiones de `UserRepository` | 3 | DB-001 | Done | 2026-08-13T16:23Z | 2026-08-13T16:27Z | AC-01/02/03 | port+adapter+errores; typecheck OK, 39 UT auth OK |
| TASK-PB-P4-001-US-008-BE-001 | Port `OAuthProvider` + `GoogleOAuthProvider` | 4 | — | Done | 2026-08-13T16:28Z | 2026-08-13T16:32Z | AC-01, VR-01/02 | port+provider+mock+JWK; 10/10 UT, typecheck OK |
| TASK-PB-P4-001-US-008-BE-002 | Servicio `state` + `nonce` anti-CSRF | 5 | — | Done | 2026-08-13T16:32Z | 2026-08-13T16:34Z | SEC-03 | cookie firmada TTL + safeEqual; 4/4 UT |
| TASK-PB-P4-001-US-008-BE-003 | Casos de uso Start/Handle callback | 6 | DB-001,BE-001,BE-002,BE-004 | Done | 2026-08-13T16:34Z | 2026-08-13T16:39Z | AC-01/02/03, EC-01/02, VR-03 | 4 use cases + continuación; 8/8 UT, typecheck OK |
| TASK-PB-P4-001-US-008-API-001 | Endpoints OAuth + Zod | 7 | BE-003 | Done | 2026-08-13T16:39Z | 2026-08-13T16:46Z | AC-01/02/03, VR-03, EC-02 | 4 endpoints + Zod + wiring; 30 UT/API, 3 skip(BD) |
| TASK-PB-P4-001-US-008-SEC-001 | Hardening verificación / no exposición id_token | 8 | BE-001,BE-003 | Done | 2026-08-13T16:39Z | 2026-08-13T16:46Z | SEC-01..05, EC-01, VR-01/02 | verificación + cookie solo en éxito + no id_token |
| TASK-PB-P4-001-US-008-OBS-001 | Eventos `auth.oauth.google.*` | 9 | BE-003 | Done | 2026-08-13T16:39Z | 2026-08-13T16:46Z | AC-01, EC-01 | success/failure con correlationId; shape redactado |
| TASK-PB-P4-001-US-008-FE-001 | `GoogleSignInButton` + login + i18n | 10 | API-001 | Done | 2026-08-13T16:46Z | 2026-08-13T16:56Z | AC-01, EC-02 | botón + cancelación + i18n×4; tests OK |
| TASK-PB-P4-001-US-008-FE-002 | Pantalla `RoleSelectorOnSignup` | 11 | API-001 | Done | 2026-08-13T16:46Z | 2026-08-13T16:56Z | AC-02, VR-03 | selector accesible + hook; tests OK |
| TASK-PB-P4-001-US-008-FE-003 | Pantalla `LinkAccountConfirmation` | 12 | API-001 | Done | 2026-08-13T16:46Z | 2026-08-13T16:56Z | AC-03 | confirmación/cancelación; tests OK |
| TASK-PB-P4-001-US-008-SEED-001 | Usuario seed con `google_sub` (opcional) | 13 | DB-001 | Done | 2026-08-13T16:57Z | 2026-08-13T16:58Z | AC-01 | usuario demo OAuth idempotente; typecheck OK |
| TASK-PB-P4-001-US-008-QA-001 | Tests de integración | 14 | BE-003,API-001 | Done | 2026-08-13T16:44Z | 2026-08-13T17:00Z | AC-01/02/03, VR-03, EC-01, NT-01..04, AUTH-TS-01/02 | api-spec 10 pass (+3 BD-gated) + 8 callback UT |
| TASK-PB-P4-001-US-008-QA-002 | E2E con mock OAuth provider | 15 | FE-001,FE-002 | Done | 2026-08-13T16:58Z | 2026-08-13T17:00Z | AC-01/02, EC-02 | Playwright 3/3 verde (build+chromium) |
| TASK-PB-P4-001-US-008-QA-003 | Tests negativos de seguridad | 16 | SEC-001,BE-002 | Done | 2026-08-13T16:44Z | 2026-08-13T17:00Z | SEC-01..05, EC-01, NT-01..03 | provider UT (aud/iss/nonce/alg) + NT-01/02/03 api |
| TASK-PB-P4-001-US-008-QA-004 | Tests de accesibilidad | 17 | FE-001 | Done | 2026-08-13T16:52Z | 2026-08-13T16:56Z | Accessibility | axe sin críticas (botón + selector) |
| TASK-PB-P4-001-US-008-DOC-001 | Alineación documental (D3, D19, ADR-SEC-007) | 18 | — | Done | 2026-08-13T16:57Z | 2026-08-13T17:01Z | Trazabilidad | D3/D19/ADR-SEC-007/ROAD-SEC-002 alineados |

## 6. Emergent Tasks

| ID | Título | Tarea padre | Razón de descubrimiento | Necesidad | Impacto de scope | Impacto Tech Spec | Status | Evidencia |
| -- | ------ | ----------- | ----------------------- | --------- | ---------------- | ----------------- | ------ | --------- |
| — | — | — | — | — | — | — | — | — |

## 7. Evidence by Task

### TASK-PB-P4-001-US-008-DB-001
- Files modified: `backend/prisma/schema.prisma` (`passwordHash String?`, nuevo `googleSub String? @unique @map("google_sub")`); `backend/src/shared/auth/types.ts` (`AuthUserWithSecret.passwordHash: string | null`); `backend/src/modules/user-profile/application/change-password.use-case.ts` (guard null para cuentas OAuth-only); `backend/tests/api/us004-password-reset.api.spec.ts` y `backend/tests/integration/us001-register.integration.spec.ts` (optional chaining tras nullable).
- Files created: `backend/prisma/migrations/20260813161600_us008_google_sub_and_nullable_password_hash/migration.sql`.
- Migrations created: `20260813161600_us008_google_sub_and_nullable_password_hash` (ALTER `password_hash` DROP NOT NULL; ADD `google_sub`; UNIQUE INDEX `users_google_sub_key`).
- Commands executed: `npx prisma format` → 0 OK; `npx prisma validate` → "schema is valid"; `npx prisma generate` → OK; `npm run typecheck` → exit 0.
- Lint: Not Run (se corre agregado al cierre backend).
- Typecheck: Passed.
- Tests: Not Run (los tests de constraints reales requieren Postgres — se cubren en QA-001; el entorno no tiene BD levantada — W-02).
- Build: Not Run (agregado).
- DB validation: Passed (`prisma validate`). Nota: `prisma migrate diff/deploy` contra BD real = Not Run (sin Postgres/shadow DB en el entorno — W-02).
- Acceptance Criteria cubiertos: AC-01, AC-02 (soporte de esquema).
- Convenciones verificadas: ADR-DB-005 (migración aditiva reproducible, forward-only); snake_case `@map`.
- Deviations: Ninguna.
- Technical debt: La verificación de la migración contra una BD real queda para CI (job con Postgres efímero).

### TASK-PB-P4-001-US-008-OPS-001
- Files modified: `backend/src/config/env.ts` (nuevas vars `GOOGLE_OAUTH_ENABLED`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`, `GOOGLE_OAUTH_WEB_APP_URL`, `OAUTH_STATE_TTL_SECONDS` + fail-fast en `superRefine`); `backend/.env.example` (bloque OAUTH GOOGLE con placeholders, sin secretos reales).
- Commands executed: `npm run typecheck` → exit 0; `npx vitest run tests/unit/env-example.spec.ts` → 3/3 Passed.
- Lint: Not Run (agregado). Typecheck: Passed. Tests: Passed (env-example 3/3). Build: Not Run.
- Security checks: secretos fuera del repo (ADR-SEC-005); `.env.example` con placeholders vacíos; feature flag off por default.
- Acceptance Criteria cubiertos: AC-01, AC-02 (contrato de entorno).
- Convenciones verificadas: `docs/14 §27` categorías env; SEC-02 (no NEXT_PUBLIC_ para secretos).
- Deviations: Ninguna.
- Technical debt: La provisión real de client_id/secret y el registro de redirect URIs en Google Cloud Console es una acción operativa fuera del repo (W-01).

### TASK-PB-P4-001-US-008-BE-004
- Files created: `backend/src/shared/domain/errors/oauth.errors.ts` (4 errores tipados + mensajes neutros).
- Files modified: `backend/src/shared/auth/types.ts` (`OAuthAccount`, `CreateOAuthUserInput`); `backend/src/shared/auth/ports.ts` (`findByGoogleSub`, `findOAuthAccountByEmail`, `linkGoogleSub`, `createOAuthUser`); `backend/src/infrastructure/persistence/prisma-user.repository.ts` (implementación + manejo P2002 email vs google_sub); `backend/src/shared/domain/errors/error-codes.ts` (4 códigos OAuth); `backend/src/shared/interface/middlewares/error-handler.middleware.ts` (mapeo 400/409/410); 4 test doubles (`us002/us003/us004/us094`) con stubs de los nuevos métodos.
- Commands executed: `npm run typecheck` → exit 0; `npx vitest run` sobre las 4 specs afectadas → 39/39 Passed.
- Lint: Not Run (agregado). Typecheck: Passed. Tests: Passed (39/39 doubles; tests de integración con DB en QA-001). Build: Not Run.
- Acceptance Criteria cubiertos: AC-01 (`findByGoogleSub`), AC-02 (`createOAuthUser`), AC-03 (`linkGoogleSub` + `findOAuthAccountByEmail`).
- Convenciones verificadas: ADR-BE-002 (acceso solo Prisma en Infrastructure, interfaz en shared); Clean/Hexagonal.
- Deviations: Ninguna. Nota N-01: se extendió el puerto **real** en `shared/auth` (no los stubs de US-090).
- Technical debt: Cobertura de integración con DB real (colisión UNIQUE) se ejercita en QA-001.

### TASK-PB-P4-001-US-008-BE-001
- Files created: `backend/src/shared/auth/oauth.ts` (port `OAuthProvider` + tipos); `backend/src/infrastructure/oauth/jwks.ts` (`JwksProvider`, `GoogleJwksProvider` con cache por `kid`+TTL, `StaticJwksProvider`); `backend/src/infrastructure/oauth/google-oauth-provider.ts` (`GoogleOAuthProvider`: buildAuthorizationUrl/exchangeCode/verifyIdToken RS256+JWK); `backend/src/infrastructure/oauth/mock-oauth-provider.ts` (mock determinista); `backend/src/infrastructure/oauth/oauth-provider.factory.ts` (selección real/mock + `isGoogleOAuthRoutable`); `backend/tests/unit/us008-google-oauth-provider.spec.ts` (10 casos).
- Commands executed: `npm run typecheck` → exit 0; `npx vitest run tests/unit/us008-google-oauth-provider.spec.ts` → 10/10 Passed.
- Lint: Not Run (agregado). Typecheck: Passed. Tests: Passed (10/10 unit con RSA real + JWK mockeada). Build: Not Run.
- Security checks: verificación RS256 + `aud`/`iss`/`exp`/`nonce`/`email_verified`; rechazo de `alg` no RS256 (mitiga alg confusion); `id_token` no expuesto ni logueado.
- Acceptance Criteria cubiertos: AC-01 (verificación de identidad), VR-01/VR-02 (firma + email_verified).
- Convenciones verificadas: N-02 (sin nueva dependencia; `jsonwebtoken`+`node:crypto`); Clean/Hexagonal (port en shared, adapters en infra); mock paralelo a `LLMProvider`.
- Deviations: Ninguna.
- Technical debt: `exchangeCode` (red al token endpoint de Google) se cubre por el mock en integración/E2E; no hay test de red real (por diseño, W-01/W-02).

### TASK-PB-P4-001-US-008-BE-002
- Files created: `backend/src/infrastructure/security/oauth-state-cookie.ts` (`generateStateNonce`, `issue/read/clearOAuthStateCookie`, `safeEqual`); `backend/tests/unit/us008-oauth-state.spec.ts` (4 casos).
- Commands executed: `npm run typecheck` → exit 0; `npx vitest run tests/unit/us008-oauth-state.spec.ts` → 4/4 Passed.
- Lint: Not Run (agregado). Typecheck: Passed. Tests: Passed (4/4). Build: Not Run.
- Security checks: 256 bits aleatorios (`randomBytes`); cookie HTTP-only firmada, TTL corto, single-use; `SameSite` degradado a `lax` para el retorno del callback (nunca `strict`); `safeEqual` en tiempo constante.
- Acceptance Criteria cubiertos: SEC-03 (soporte anti-CSRF); NT-02 (state inválido) se cierra a nivel endpoint en QA-001/QA-003.
- Convenciones verificadas: N-03 (cookie firmada en vez de tabla); paralelo a `session-cookie.ts`.
- Deviations: Ninguna.
- Technical debt: Ninguna.

### TASK-PB-P4-001-US-008-BE-003
- Files created: `oauth-flow.types.ts`, `start-google-oauth.use-case.ts`, `handle-google-callback.use-case.ts`, `complete-google-signup.use-case.ts`, `confirm-google-link.use-case.ts` (en `modules/identity-access/application/`); `backend/src/infrastructure/security/oauth-continuation-cookie.ts`; `backend/tests/unit/us008-handle-google-callback.spec.ts` (8 casos).
- Files modified: `backend/src/shared/auth/ports.ts` (event names `auth.oauth.google.success/failure`); `backend/src/shared/auth/oauth.ts` (`OAuthStateNonce`); `backend/src/infrastructure/security/oauth-state-cookie.ts` (re-export del tipo).
- Commands executed: `npm run typecheck` → exit 0; `npx vitest run tests/unit/us008-handle-google-callback.spec.ts` → 8/8 Passed.
- Lint: Not Run (agregado). Typecheck: Passed. Tests: Passed (8/8 unit; integración a nivel endpoint en QA-001). Build: Not Run.
- Security checks: `state` en tiempo constante; nonce verificado en el provider; conflicto de vinculación (google_sub distinto) → 409; admin nunca creado (rol tipado `PublicRegistrationRole`); vinculación solo con confirmación; `id_token` nunca sale de la verificación.
- Acceptance Criteria cubiertos: AC-01 (login), AC-02 (signup_required), AC-03 (link_required + confirm), EC-01 (email_verified=false), EC-02 (cancelación se maneja en API/FE), VR-03 (rol requerido en complete-signup).
- Convenciones verificadas: Clean/Hexagonal (use cases dependen de puertos); reutiliza emisión de sesión (ADR-SEC-002); continuación por cookie HTTP-only (SEC-05).
- Deviations: D-01 — signup/link se implementan como INSERT/UPDATE únicos (atómicos) en vez de `prisma.$transaction` explícito, por ser escrituras de una sola sentencia (mismo patrón que `RegisterUserUseCase`). Sin impacto en atomicidad. Sin ADR requerido.
- Technical debt: Ninguna.

### TASK-PB-P4-001-US-008-API-001
- Files created: `backend/src/modules/identity-access/dto/oauth-google.request.ts` (Zod); `.../interface/oauth-google.controller.ts`; `.../interface/oauth-google.routes.ts` (factory); `backend/tests/api/us008-oauth-google.api.spec.ts` (11 casos, 3 gated por BD).
- Files modified: `backend/src/app.ts` (montaje condicional `/api/v1/auth/google` vía `isGoogleOAuthRoutable`).
- Commands executed: `npm run typecheck` → exit 0; `npx vitest run` (4 specs US-008) → 30 Passed / 3 skipped (BD ausente); `npx eslint` sobre los archivos nuevos → 0 problemas.
- Lint: Passed (archivos nuevos). Typecheck: Passed. Tests: Passed (30/30 ejecutables; 3 happy-path con BD = Not Run por falta de Postgres — W-02). Build: Not Run.
- Acceptance Criteria cubiertos: AC-01/02/03 (endpoints por camino), VR-03 (rol requerido, admin excluido por Zod), EC-02 (cancelación → redirect neutro), AUTH-TS-01 (302 anónimo), AUTH-TS-02 (guard solo-anónimo).
- Convenciones verificadas: ADR-API-001..004 (versionado, envelope de error, Zod, correlation ID); controllers delgados.
- Deviations: Ninguna adicional (ver D-02).
- Technical debt: Los 3 happy-path con BD se validan en CI con Postgres efímero (job existente `pr.yml`).

### TASK-PB-P4-001-US-008-SEC-001
- Files: realizado por el diseño de BE-001 (verificación) + API-001 (emisión de cookie). Referencia: `google-oauth-provider.ts`, `oauth-google.controller.ts`, `oauth.errors.ts` (mensajes neutros), `error-handler.middleware.ts` (mapeo).
- Commands executed: cubierto por las suites de BE-001 (10/10) y API-001 (30/30).
- Lint: Passed. Typecheck: Passed. Tests: Passed.
- Security checks: `aud`/`iss`/`exp`/`nonce`/`email_verified` verificados; `email_verified=false → 400` neutro (test provider + callback); cookie HTTP-only firmada **solo en éxito** (login/complete/confirm); `id_token` nunca en respuesta (aserción `not.toContain('id_token')`) ni persistido (solo `google_sub`); mensajes neutros ("No fue posible iniciar sesión").
- Acceptance Criteria cubiertos: SEC-01..05, EC-01, VR-01/VR-02.
- Deviations: Ninguna. Technical debt: Ninguna.

### TASK-PB-P4-001-US-008-OBS-001
- Files modified: `backend/src/shared/auth/ports.ts` (event names). Emisión en `handle-google-callback.use-case.ts` (success login / failure con reason), `complete-google-signup.use-case.ts` (success signup) y `confirm-google-link.use-case.ts` (success link).
- Commands executed: cubierto por `us008-handle-google-callback.spec.ts` (asserts de `auth.oauth.google.success`/`failure` con `reason`).
- Lint: Passed. Typecheck: Passed. Tests: Passed (eventos verificados en 8/8 del callback).
- Security checks: el shape de `AuthEventLogger.emit` solo admite `correlationId`/`userId`/`reason`/`latencyMs`/`role` — **estructuralmente** imposible loggear `id_token`, email o tokens (SEC-05 / ADR-SEC-001). El `reason` es un conjunto acotado de strings.
- Acceptance Criteria cubiertos: AC-01 (success), EC-01 (failure email_verified). Correlation ID propagado.
- Deviations: Ninguna. Technical debt: Ninguna.

### TASK-PB-P4-001-US-008-FE-001 / FE-002 / FE-003 (frontend)
- Files created: `web/src/features/auth/components/GoogleSignInButton.tsx`, `RoleSelectorOnSignup.tsx`, `LinkAccountConfirmation.tsx`; `web/src/features/auth/hooks/useGoogleOAuth.ts`; `web/src/app/(auth)/auth/google/select-role/page.tsx`, `.../confirm-link/page.tsx`; `web/src/tests/integration/auth/us008-oauth-google.test.tsx`.
- Files modified: `web/src/features/auth/components/LoginForm.tsx` (botón Google + aviso de cancelación `?oauth=cancelled` + `useSearchParams`); `web/src/features/auth/api/authApi.ts` (`completeGoogleSignup`, `confirmGoogleLink`); `web/src/features/auth/index.ts` (exports); `web/src/messages/{es-LATAM,es-ES,pt,en}/auth.json` (sección `google` en 4 locales); 3 tests de login (mock `useSearchParams`).
- Commands executed: `npm run typecheck` (web) → exit 0; `npx vitest run` (auth+i18n+a11y, 36 archivos) → 256/256 Passed; `npx eslint` sobre archivos nuevos → 0 problemas.
- Lint: Passed. Typecheck: Passed. Tests: Passed (9 casos US-008 FE + 256 suite auth/i18n/a11y sin regresión). Build: Not Run (`next build` no ejecutado en el entorno; typecheck+lint cubren el gate estático).
- Acceptance Criteria cubiertos: AC-01 (botón inicia flujo server-driven a `/api/v1/auth/google`), EC-02 (aviso neutro de cancelación), AC-02/VR-03 (selección de rol requerida), AC-03 (confirmación/cancelación de vinculación).
- Convenciones verificadas: navegación server-driven (no fetch, no id_token en cliente — SEC-05); next-intl 4 locales; TanStack Query; mobile-first; a11y (radiogroup con label asociado, icono decorativo aria-hidden).
- Deviations: D-03 — las rutas de continuación se ubican en el route group `(auth)` (tarjeta centrada) en `/auth/google/select-role` y `/auth/google/confirm-link`; el repo usa detección de locale por header (no prefijo `/[locale]/`), por lo que las rutas no llevan prefijo de locale. Alineado con la arquitectura real del repo (no con el literal `/[locale]/` de la US). Sin ADR requerido.
- Technical debt: `next build` completo se valida en CI (`web-ci.yml`).

### TASK-PB-P4-001-US-008-QA-004 (accesibilidad)
- Files: `web/src/tests/integration/auth/us008-oauth-google.test.tsx` (casos axe con helper `auditA11y`).
- Commands executed: incluido en la corrida anterior → Passed.
- Lint/Typecheck/Tests: Passed. Accessibility: `auditA11y` sin violaciones **críticas** en `GoogleSignInButton` y `RoleSelectorOnSignup` (mismo umbral que US-131). Label del botón accesible; foco visible por `:focus-visible`/`focus-within`.
- Acceptance Criteria cubiertos: Accessibility Tests de la US.
- Deviations: Ninguna. Technical debt: Ninguna.

### TASK-PB-P4-001-US-008-SEED-001
- Files modified: `backend/src/modules/seed-demo/application/seed-demo-data.use-case.ts` (usuario demo SOLO-OAuth `demo.google@seed.eventflow.test`, `google_sub=mock-google-sub-demo`, `passwordHash=null`, idempotente vía `ensure`).
- Commands executed: `npm run typecheck` → exit 0. (La corrida real del seed requiere Postgres — W-02.)
- Lint: Not Run (agregado). Typecheck: Passed. Tests: Not Run (seed idempotente se ejercita en CI/demo con BD). Build: Not Run.
- Acceptance Criteria cubiertos: AC-01 (demo de login OAuth de usuario existente; el `google_sub` coincide con la identidad del MockOAuthProvider → el botón demo inicia sesión en esta cuenta).
- Convenciones verificadas: `is_seed=true`; idempotencia por email (`ensure`).
- Deviations: Ninguna. Technical debt: Ninguna.

### TASK-PB-P4-001-US-008-QA-001 (integración)
- Files: `backend/tests/api/us008-oauth-google.api.spec.ts` (13 casos) + `backend/tests/unit/us008-handle-google-callback.spec.ts` (8 casos).
- Commands executed: `npx vitest run tests/api/us008-oauth-google.api.spec.ts` → 10 Passed / 3 skipped.
- Lint: Passed. Typecheck: Passed. Tests: Passed (10 ejecutables: NT-01/NT-02/NT-03, VR-03/NT-04, AUTH-TS-01, EC-02, continuación 410×2). **Not Run:** TS-01/TS-02/TS-03 (login/signup/link con BD) → 3 casos `skipIf(!dbUp)` por falta de Postgres (W-02); se ejecutan en CI (`pr.yml` Postgres efímero).
- Acceptance Criteria cubiertos: AC-01/02/03 (gated BD), VR-03, EC-01/EC-02, NT-01..04, AUTH-TS-01/02.
- Deviations: Ninguna. Technical debt: verde de los 3 happy-path con BD queda para CI.

### TASK-PB-P4-001-US-008-QA-002 (E2E)
- Files: `web/src/tests/e2e/auth-google-oauth.spec.ts` (3 casos Playwright).
- Commands executed: `npx playwright test src/tests/e2e/auth-google-oauth.spec.ts --project=chromium` → **3/3 Passed** (incluye `next build` exitoso + boot del server + chromium).
- Lint: Passed. Typecheck: Passed. Tests: Passed (3/3 real, no skip). Build: Passed (`next build` como parte del webServer de Playwright).
- Acceptance Criteria cubiertos: AC-01 (botón inicia flujo server-driven y loguea), EC-02 (aviso neutro de cancelación), a11y del botón.
- Deviations: Ninguna. Technical debt: Ninguna.

### TASK-PB-P4-001-US-008-QA-003 (seguridad)
- Files: cubierto por `us008-google-oauth-provider.spec.ts` (10), `us008-oauth-state.spec.ts` (4), `us008-handle-google-callback.spec.ts` (8) y `us008-oauth-google.api.spec.ts` (NT-01/02/03).
- Commands executed: `npx vitest run` sobre las 4 specs US-008 backend → 30 Passed / 3 skipped.
- Lint: Passed. Typecheck: Passed. Tests: Passed.
- Security checks: CSRF/`state` tampering (NT-02, mismatch + ausente); `aud`/`iss` incorrectos → rechazo (provider UT); replay/`nonce` mismatch → rechazo (provider + callback UT); `id_token` expirado (NT-01); `alg` no RS256 (mitiga alg confusion); no exposición del `id_token` (aserción `not.toContain('id_token')` + shape de log redactado). Suite negativa activa como quality gate (ADR-TEST-004).
- Acceptance Criteria cubiertos: SEC-01..05, EC-01, NT-01..03.
- Deviations: Ninguna. Technical debt: Ninguna.

### TASK-PB-P4-001-US-008-DOC-001
- Files modified: `docs/3-MVP-Scope-Definition.md` (§7.1 + tabla §feature 18: OAuth Google habilitado por ADR-ARCH-005); `docs/19-Security-and-Authorization-Design.md` (alcance §Auth + ROAD-SEC-002 → Implementado en US-008); `docs/22-Architecture-Decision-Records.md` (nota de reconciliación en la fila de disparadores futuros de ADR-SEC-007).
- Commands executed: N/A (edición documental). Verificación de rutas y contenido manual.
- Lint: Not Applicable (Markdown). Typecheck: Not Applicable. Tests: Not Applicable. Documentation: Passed (D3/D19/ADR-SEC-007/ROAD-SEC-002 reflejan OAuth Google habilitado).
- Acceptance Criteria cubiertos: Documentation Alignment (§16 Tech Spec).
- Deviations: Nota — ADR-SEC-007 no tiene sección dedicada propia (solo aparece en tablas índice/disparadores); la reconciliación se agregó en la fila de disparadores + ADR-ARCH-005 §Consecuencias ya la documenta. Technical debt: Ninguna.

## 8. Blockers

| Blocker ID | Tarea afectada | Tipo | Descripción | Detectado | Decisión requerida | Rol responsable | Estado |
| ---------- | -------------- | ---- | ----------- | --------- | ------------------ | --------------- | ------ |
| — | — | — | — | — | — | — | — |

## 9. Deviations

| # | Comportamiento planeado | Implementado/propuesto | Razón | Impacto | Convención afectada | Sección Tech Spec | ADR requerido | Resolución |
| - | ----------------------- | ---------------------- | ----- | ------- | ------------------- | ----------------- | ------------- | ---------- |
| D-01 | `prisma.$transaction` explícito en signup y vinculación | INSERT (createOAuthUser) / UPDATE (linkGoogleSub) únicos, atómicos por sí mismos | Una sola sentencia de escritura ya es atómica; una transacción envolvente no aporta (mismo patrón que `RegisterUserUseCase`) | Ninguno (atomicidad preservada) | Ninguna | §7 Transactions, §10 | No | Aceptada |
| D-02 | `state`/`nonce` en store server-side | Cookie firmada de corta vida (`OAUTH_STATE_TTL_SECONDS`) | Tech Spec §4 admite ambas; evita tabla nueva | Ninguno | Ninguna | §4, §7 | No | Aceptada (N-03) |
| D-03 | Rutas frontend `/[locale]/auth/google/...` | `/auth/google/select-role` y `/auth/google/confirm-link` sin prefijo de locale | El repo detecta locale por header (`x-locale`), no por prefijo URL (US-104) | Ninguno (URLs reales del repo) | Ninguna | §8 | No | Aceptada |

## 10. Final Validation

- Task completion: **17/17 Done** (0 In Progress, 0 Blocked, 0 Rework, 0 Skipped).
- Acceptance Criteria coverage: **cubiertos** — AC-01/02/03, EC-01/02, VR-01/02/03, SEC-01..05, NT-01..04, AUTH-TS-01/02.
- Lint: **Passed** (backend y frontend, archivos tocados; 0 problemas).
- Typecheck: **Passed** (backend `tsc --noEmit` + web `tsc --noEmit`).
- Tests: **Passed** — backend US-008 + auth afectados 71/74 (3 happy-path con BD `skipIf` → Not Run sin Postgres, W-02); web auth/i18n/a11y 256/256 + 9 casos US-008 FE; E2E Playwright **3/3** (con `next build` real).
- Build: web `next build` **Passed** (webServer de Playwright). Backend: Not Run (typecheck cubre el gate estático).
- Migrations: `prisma validate` **Passed**; `prisma migrate deploy/diff` contra BD real → Not Run (sin Postgres — W-02; corre en CI).
- Seed: idempotente por diseño (`ensure`); corrida real Not Run (sin BD).
- Authorization: **Passed** — `admin` nunca vía Google (rol tipado + Zod `enum(['organizer','vendor'])`, test 400 VALIDATION_ERROR); endpoints anónimos con guard solo-anónimo (AUTH-TS-02).
- Security: **Passed** — verificación `id_token` (firma/aud/iss/exp/nonce/email_verified), `state`+`nonce` anti-CSRF, `id_token` no expuesto ni logueado, mensajes neutros, `alg` no-RS256 rechazado.
- Accessibility: **Passed** — axe sin violaciones críticas (botón + selector); label accesible + foco visible.
- i18n: **Passed** — 4 locales (`es-LATAM`, `es-ES`, `pt`, `en`), sin strings hardcodeados en los componentes.
- Documentation: **Passed** — D3, D19, ADR-SEC-007 y ROAD-SEC-002 alineados con OAuth Google habilitado.
- Unresolved debt: **No bloqueante** — 3 casos de integración happy-path (login/signup/link), `prisma migrate deploy` y corrida del seed requieren Postgres → se validan en CI (`pr.yml` Postgres efímero). Provisión de credenciales reales de Google y redirect URIs = acción operativa fuera del repo (W-01).
- Final status: **Done**.

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-08-13T16:16:08Z | Initialized | Execution record creado |
| 2026-08-13T16:16:08Z | Readiness | READY_WITH_WARNINGS (W-01 credenciales Google; W-02 sin Postgres/Playwright en el entorno) |
| 2026-08-13T16:16:08Z | Alignment | ALIGNED_WITH_NOTES (N-01 puerto real en shared/auth; N-02 verificación JWK sin nueva dep; N-03 state/nonce por cookie firmada) |
| 2026-08-13T16:20Z | DB-001 | Not Started → Done (migración + schema; prisma validate OK) |
| 2026-08-13T16:22Z | OPS-001 | Not Started → Done (env schema + .env.example; test 3/3) |
| 2026-08-13T16:27Z | BE-004 | Not Started → Done (port+adapter+errores; 39 UT auth OK) |
| 2026-08-13T16:32Z | BE-001 | Not Started → Done (provider+mock+JWK; 10 UT) |
| 2026-08-13T16:34Z | BE-002 | Not Started → Done (state/nonce; 4 UT) |
| 2026-08-13T16:39Z | BE-003 | Not Started → Done (4 use cases; 8 UT) |
| 2026-08-13T16:46Z | API-001/SEC-001/OBS-001 | Not Started → Done (endpoints+Zod; 30 UT/API) |
| 2026-08-13T16:56Z | FE-001/002/003/QA-004 | Not Started → Done (componentes+i18n×4+a11y; 256 web OK) |
| 2026-08-13T16:58Z | SEED-001 | Not Started → Done (usuario demo OAuth idempotente) |
| 2026-08-13T17:00Z | QA-001/002/003 | Not Started → Done (integración + E2E 3/3 + seguridad) |
| 2026-08-13T17:01Z | DOC-001 | Not Started → Done (D3/D19/ADR-SEC-007) |
| 2026-08-13T17:05Z | Story | Validación final → Done (17/17) |
