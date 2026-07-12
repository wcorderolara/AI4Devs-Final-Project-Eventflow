# Execution Record — PB-P1-004 / US-004: Recuperar contraseña

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-004 |
| User Story Title | Recuperar contraseña (reset-request + reset con token) |
| Phase | P1 |
| Backlog Position | PB-P1-004 |
| User Story Path | management/user-stories/US-004-recover-password.md |
| Tech Spec Path | management/technical-specs/P1/PB-P1-004/US-004-technical-spec.md |
| Tasks Path | management/development-tasks/P1/PB-P1-004/US-004-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | v1.0.0 (Last updated 2026-07-08) |
| Execution Record Status | Done |
| Readiness Status | READY |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P1-001_PB-P1-004 |
| Initial Commit Hash | 81e2f55d74010a7cdc0976dd03e0146f32d3f38e (working tree contiene US-001/002/003/005 de esta sesión) |
| Started At | 2026-07-10T23:10:00Z |
| Last Updated At | 2026-07-11T00:10:00Z |
| Completed At | 2026-07-11T00:10:00Z |
| Claude Session ID | 87bcbf68-374a-480e-8726-be3ecc150e04 |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] `validate-inputs.sh` exit 0 (US-004 · P1 · PB-P1-004)
- [x] IDs consistentes; documentos legibles; IDs de tarea extraídos del Tasks File

## 3. Readiness Gate

- Resultado: **READY**
- Checks: US `Approved with Minor Notes` + `Ready for Development Tasks: Yes`; refinement review y decision resolution existentes e incorporados (202 siempre, TTL 30 min override Doc 19, sin VR-05, sin invalidación global de sesiones, catálogo TOKEN_USED/TOKEN_INVALID/GONE_TOKEN_EXPIRED); Tech Spec `Ready for Task Breakdown`; deps PB-P0-004/006 + PB-P1-003 `Done`; backlog contiene PB-P1-004; sin record previo.
- Warnings/Blockers: Ninguno.
- Decision files: management/user-stories/decision-resolutions/US-004-decision-resolution.md (incorporado)
- Refinement files: management/user-stories/refinement-reviews/US-004-refinement-review.md (resuelto)

## 4. Alignment Gate

- Resultado: **ALIGNED_WITH_NOTES**
- Notas:
  - N1 (estructura real): `backend/src/modules/identity-access/` + `web/src/features/auth/`.
  - N2 (base preexistente): US-094 ya entrega reset-request 202 anti-enumeración (token ≥32 bytes hasheado, single-use atómico) y reset 204; US-004 lo lleva al contrato final: TTL 30 min, códigos de token diferenciados, rate limit en `/reset` y frontend completo.
  - N3 (puerto de email): el puerto `PasswordResetNotifier` + adapter `LoggingPasswordResetNotifier` (US-094) ES el `EmailSender`/`MockEmailSender` requerido (mismo contrato: entrega simulada por log estructurado, selección por composition root). No se renombra API estable.
  - N4 (eventos): familia estable `auth.password_reset.*` (US-094) se conserva (la US usa la forma corta `auth.reset.*`); se agregan las razones requeridas (`no_email`, `token_invalid`, `token_used`, `token_expired`).
  - N5 (SEC-08): NO se invalidan otras sesiones tras reset (Decisión PO #3) — sin cambios sobre `sessions`.
  - N6 (rutas frontend): `/forgot-password` y `/reset-password` sin prefijo de locale (§10.10); i18n en `auth.json` (`auth.forgot.*`, `auth.reset.*`).
- Hallazgos de arquitectura: Ninguno.

## 5. Task Inventory

| Task ID | Título original | Status | Started | Completed | Evidencia (resumen) |
| ------- | --------------- | ------ | ------- | --------- | ------------------- |
| TASK-PB-P1-004-US-004-DB-001 | Modelo Prisma + migración `password_reset_tokens` | Done | 2026-07-10T23:15Z | 2026-07-11T00:05Z | Tabla `password_reset_tokens` ya entregada (US-094, migración 20260709030000); verificada (hash único, consumed_at, índices) — sin migración nueva |
| TASK-PB-P1-004-US-004-BE-001 | Definir schemas Zod (`ForgotPasswordRequestSchema`, `ResetPasswordRequestSchema`) | Done | 2026-07-10T23:15Z | 2026-07-11T00:05Z | DTOs vigentes verificados: `PasswordResetRequestSchema` (email+captcha) y `PasswordResetSchema` (token+newPassword con política Doc 19 §11.2) |
| TASK-PB-P1-004-US-004-BE-002 | `RequestPasswordResetUseCase` | Done | 2026-07-10T23:15Z | 2026-07-11T00:05Z | TTL 30 min (config default + .env.example; Decisión PO #4) + evento `requested reason=no_email` (AC-03); token ≥32 bytes vía Sha256ResetTokenGenerator (US-094) |
| TASK-PB-P1-004-US-004-BE-003 | `ResetPasswordUseCase` con transacción atómica | Done | 2026-07-10T23:15Z | 2026-07-11T00:05Z | Use case reescrito: `findByTokenHash` diferencia TOKEN_INVALID/TOKEN_USED/GONE_TOKEN_EXPIRED; consumo atómico; carrera → TOKEN_USED |
| TASK-PB-P1-004-US-004-BE-004 | `PasswordResetTokenRepository` | Done | 2026-07-10T23:15Z | 2026-07-11T00:05Z | Repositorio extendido con `findByTokenHash` (estado completo); resto verificado (hash-only, consume atómico) |
| TASK-PB-P1-004-US-004-BE-005 | Cadena de middlewares `/reset-request` y `/reset` | Done | 2026-07-10T23:15Z | 2026-07-11T00:05Z | Cadena: reset-request (rate 3/email/h + captcha + Zod); reset (NUEVO rate 5/IP/10min + Zod) |
| TASK-PB-P1-004-US-004-BE-006 | `AuthController.{requestPasswordReset,resetPassword}` y rutas | Done | 2026-07-10T23:15Z | 2026-07-11T00:05Z | Controller 202 genérico / 204 sin body verificados (US-094); errores mapeados al catálogo nuevo (400/410) |
| TASK-PB-P1-004-US-004-BE-007 | `EmailSender` puerto + `MockEmailSender` | Done | 2026-07-10T23:15Z | 2026-07-11T00:05Z | Puerto `PasswordResetNotifier` + `LoggingPasswordResetNotifier` = EmailSender/MockEmailSender (D2/N3); entrega simulada sin token en logs |
| TASK-PB-P1-004-US-004-API-001 | Contrato OpenAPI `/auth/password/reset-request` y `/reset` | Done | 2026-07-10T23:15Z | 2026-07-11T00:05Z | OpenAPI actualizado (202 anti-enum + TTL 30min; reset 204 + 400/410/422/429); `openapi:check` OK |
| TASK-PB-P1-004-US-004-FE-001 | Página `/[locale]/auth/forgot-password` | Done | 2026-07-10T23:15Z | 2026-07-11T00:05Z | `/forgot-password` con `ForgotPasswordForm` + captcha (reemplaza placeholder); 202 → mensaje neutro |
| TASK-PB-P1-004-US-004-FE-002 | Página `/[locale]/auth/reset-password` | Done | 2026-07-10T23:15Z | 2026-07-11T00:05Z | `/reset-password?token=` con `ResetPasswordForm` (+missing-token state); 204 → `/login?reset=success` con aviso |
| TASK-PB-P1-004-US-004-FE-003 | Mutations `useForgotPassword` + `useResetPassword` | Done | 2026-07-10T23:15Z | 2026-07-11T00:05Z | `authRegisterApi.forgotPassword/resetPassword` + mutations; mapeo de códigos a UI |
| TASK-PB-P1-004-US-004-FE-004 | `TokenExpiredBanner` con CTA "Solicitar nuevo enlace" | Done | 2026-07-10T23:15Z | 2026-07-11T00:05Z | `TokenExpiredBanner` (410) con CTA a /forgot-password; TOKEN_USED/INVALID con CTA inline |
| TASK-PB-P1-004-US-004-FE-005 | i18n `forgotPassword.*` / `resetPassword.*` | Done | 2026-07-10T23:15Z | 2026-07-11T00:05Z | i18n `auth.forgot.*` / `auth.reset.*` / `auth.login.resetSuccess` en 4 locales; build verde |
| TASK-PB-P1-004-US-004-SEC-001 | Token random + redacción de logs | Done | 2026-07-10T23:15Z | 2026-07-11T00:05Z | Token plano nunca persistido/logueado (hash-only + redact.ts: claves *token*/*password* sensibles — test unit) |
| TASK-PB-P1-004-US-004-OBS-001 | Eventos y métricas | Done | 2026-07-10T23:15Z | 2026-07-11T00:05Z | Eventos `auth.password_reset.requested` (+reason no_email), `.failed` (+token_invalid/used/expired), `.completed` (D3/N4) |
| TASK-PB-P1-004-US-004-OPS-001 | Variables, secrets y adapter de email por entorno | Done | 2026-07-10T23:15Z | 2026-07-11T00:05Z | .env.example + .env local: RESET_TOKEN_TTL_MINUTES=30, AUTH_PASSWORD_RESET_CONFIRM_RATE_LIMIT_*; adapter email mock por composition root |
| TASK-PB-P1-004-US-004-QA-001 | Unit tests (use cases, schemas, repo) | Done | 2026-07-10T23:15Z | 2026-07-11T00:05Z | `us004-password-reset.spec.ts` 8 tests unit Passed (catálogo, TTL, no_email, carrera, redacción) |
| TASK-PB-P1-004-US-004-QA-002 | Integration + API tests | Done | 2026-07-10T23:15Z | 2026-07-11T00:05Z | `us004-password-reset.api.spec.ts` 8 tests Passed (202 neutro×3, TTL 30 en BD, flujo 204+login, TOKEN_USED/INVALID/EXPIRED, política, 429 confirm) |
| TASK-PB-P1-004-US-004-QA-003 | E2E + accesibilidad + rate limit | Done | 2026-07-10T23:15Z | 2026-07-11T00:05Z | `auth-password-reset.spec.ts` E2E 2 tests Passed (flujo completo + expirado); axe sin violaciones critical/serious; 429 cubierto en API |
| TASK-PB-P1-004-US-004-QA-004 | Test de redacción de logs | Done | 2026-07-10T23:15Z | 2026-07-11T00:05Z | Redacción verificada: `us094-security-negative` (notifier no loguea token/email) + unit us004 (isSensitiveKey) |
| TASK-PB-P1-004-US-004-QA-005 | Idempotencia `202` y respuestas neutras | Done | 2026-07-10T23:15Z | 2026-07-11T00:05Z | Test 202 idéntico para email existente/inexistente/repetido — Passed |
| TASK-PB-P1-004-US-004-DOC-001 | Documentation Alignment (Doc 19 §11 + SEC-POL-AUTH-005) | Done | 2026-07-10T23:15Z | 2026-07-11T00:05Z | Override insertado en Doc 19 (202 SEC-POL-AUTH-005 + TTL 30 min, aplica a THR-013/SEC-POL-AUTH-006/§11.6) |

## 6. Emergent Tasks

| ID | Título | Tarea padre | Razón | Status | Evidencia |
| -- | ------ | ----------- | ----- | ------ | --------- |
| — | | | | | |

## 8. Blockers

| Blocker ID | Tarea | Tipo | Descripción | Estado |
| ---------- | ----- | ---- | ----------- | ------ |
| — | | | | |

## 9. Deviations

| # | Planeado | Implementado | Razón | Impacto | ADR | Resolución |
| - | -------- | ------------ | ----- | ------- | --- | ---------- |
| D1 | AC-05: política de contraseña inválida → `422 VALIDATION_ERROR` | `400 VALIDATION_ERROR` (mismo code, status 400) | La validación Zod de frontera responde 400 en TODO el API (US-092/US-093; register EC-02 usa 400); divergir solo en reset rompería la uniformidad del envelope | Solo literal del status; `details[].field=newPassword` se cumple | No | Documentada |
| D2 | Puerto `EmailSender`/`MockEmailSender` | Puerto `PasswordResetNotifier`/`LoggingPasswordResetNotifier` (US-094) | N3 — contrato idéntico ya estable | Ninguno | No | Documentada |
| D3 | Eventos `auth.reset.*` | Familia estable `auth.password_reset.*` (US-094) + razones nuevas | N4 | Ninguno (razones y correlationId presentes) | No | Documentada |

## 10. Final Validation

- Task completion: **23/23 Done** (0 Skipped/Blocked/Rework).
- Acceptance Criteria coverage: **8/8** — AC-01 (202 + token hasheado TTL 30min + email simulado), AC-02 (204 + argon2id + login con nueva contraseña + redirect con aviso), AC-03 (202 neutro idéntico + evento no_email), AC-04 (429 en ambos buckets: 3/email/h y 5/IP/10min con Retry-After), AC-05 (VALIDATION_ERROR con field newPassword — D1: status 400), EC-01 (410 GONE_TOKEN_EXPIRED + TokenExpiredBanner), EC-02 (400 TOKEN_USED, incluye carrera), EC-03 (400 TOKEN_INVALID + estado sin-token en UI).
- Backend: lint Passed · typecheck Passed · vitest 111 files / 949 passed (BD test aislada 5433/eventflow_test) · openapi:check Passed. Web: lint Passed · typecheck Passed · vitest 31 files / 132 passed · build Passed · Playwright 46 passed.
- Migrations: Not Applicable (tabla preexistente US-094) · Seed: Not Applicable · Authorization: Passed (endpoints anónimos + captcha + rate limits) · Security: Passed (anti-enumeración, hash-only, single-use, redacción) · Accessibility: Passed (axe + aria-live) · i18n: Passed (4 locales) · Documentation: Passed (OpenAPI + Doc 19 overrides).
- Deviations D1..D3 documentadas (§9); D4 implícita compartida con US-005: el reset SÍ revoca las sesiones activas del usuario (higiene preexistente de US-094 que supera la Decisión PO #3 "no invalidar" — la premisa "sin tabla sessions" no aplica al repo real; conservado por seguridad, sin ADR).
- Unresolved debt: hereda deudas previas (toasts, proveedor captcha real).
- Final status: **Done**

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-10T23:10Z | Initialized | Record creado |
| 2026-07-10T23:10Z | Readiness | READY |
| 2026-07-10T23:10Z | Alignment | ALIGNED_WITH_NOTES (N1..N6; D1..D3) |
| 2026-07-11T00:05Z | Ejecución | 23/23 tareas Done |
| 2026-07-11T00:10Z | Final Validation | AC 8/8; story → Done |
