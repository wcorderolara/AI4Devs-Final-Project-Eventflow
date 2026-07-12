# Execution Record — PB-P1-003 / US-005: Cerrar sesión (logout)

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-005 |
| User Story Title | Cerrar sesión (logout) |
| Phase | P1 |
| Backlog Position | PB-P1-003 |
| User Story Path | management/user-stories/US-005-logout-session.md |
| Tech Spec Path | management/technical-specs/P1/PB-P1-003/US-005-technical-spec.md |
| Tasks Path | management/development-tasks/P1/PB-P1-003/US-005-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | v1.0.0 (Last updated 2026-07-08) |
| Execution Record Status | Done |
| Readiness Status | READY |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P1-001_PB-P1-004 |
| Initial Commit Hash | 81e2f55d74010a7cdc0976dd03e0146f32d3f38e (working tree contiene US-001/002/003 de esta sesión) |
| Started At | 2026-07-10T22:40:00Z |
| Last Updated At | 2026-07-10T23:05:00Z |
| Completed At | 2026-07-10T23:05:00Z |
| Claude Session ID | 87bcbf68-374a-480e-8726-be3ecc150e04 |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] `validate-inputs.sh` exit 0 (US-005 · P1 · PB-P1-003)
- [x] IDs consistentes; documentos legibles
- [x] IDs de tarea: TASK-PB-P1-003-US-005-BE-001..003, API-001, FE-001..003, SEC-001, QA-001..004, OBS-001, DOC-001 (14 tareas)

## 3. Readiness Gate

- Resultado: **READY**
- Checks: US `Approved with Minor Notes` + `Ready for Development Tasks: Yes`; refinement review y decision resolution de US-005 existentes e incorporados a la US (endpoint estricto 401, 204 sin body, sin modal, cookie Max-Age=0); Tech Spec `Ready for Task Breakdown`; deps PB-P0-004/006 y US-003 (`Done` hoy, mismo backlog item); backlog contiene PB-P1-003; sin record previo.
- Warnings: Ninguno. Blockers: Ninguno.
- Decision files: management/user-stories/decision-resolutions/US-005-decision-resolution.md (incorporado)
- Refinement files: management/user-stories/refinement-reviews/US-005-refinement-review.md (resuelto)

## 4. Alignment Gate

- Resultado: **ALIGNED_WITH_NOTES**
- Notas:
  - N1 (estructura real): `backend/src/modules/identity-access/`, `web/src/shared/auth-session/` + `web/src/shared/navigation/UserMenu.tsx` (el botón vive en el `UserMenu` de US-107; `useLogout` se ubica en `shared/auth-session` porque `shared` no puede importar `features` — dirección de dependencias §10.2).
  - N2 (invalidación): la US asume "solo rotación de cookie, sin tabla sessions"; el repo YA tiene store server-side `sessions` con revocación (US-094/US-108, P0 aceptado). Se CONSERVA la revocación (supera el requisito: AC-03 queda garantizado sin la ventana de firma residual) y además se emite la cookie de limpieza canónica. No se elimina infraestructura aceptada (jerarquía §4: la implementación existente no se degrada para igualar un supuesto de la US).
  - N3 (eventos): rename `auth.logout.succeeded` → `auth.logout.success` + nuevo `auth.logout.no_session` (EC-01) emitido cuando el guard rechaza logout sin sesión.
  - N4 (405): no existía `methodNotAllowedHandler` global (PB-P0-004 no lo entregó); se agrega manejo 405 acotado a `/auth/logout` (`router.all` + `MethodNotAllowedError` → `405 METHOD_NOT_ALLOWED`), cumpliendo EC-03 sin re-arquitectura del router.
  - N5 (rutas): `/login` sin prefijo de locale (§10.10).
- Hallazgos de arquitectura: Ninguno.

## 5. Task Inventory

| Task ID | Título original | Orden | Status | Started | Completed | AC | Evidencia (resumen) |
| ------- | --------------- | ----: | ------ | ------- | --------- | -- | ------------------- |
| TASK-PB-P1-003-US-005-BE-001 | Implementar LogoutUseCase | 1 | Done | 2026-07-10T22:45Z | 2026-07-10T23:05Z | AC-01, AC-03 | LogoutUserUseCase (US-094) validado y actualizado: evento `auth.logout.success`; revocación idempotente (D1) |
| TASK-PB-P1-003-US-005-BE-002 | Rotación/limpieza de cookie canónica en logout | 2 | Done | 2026-07-10T22:45Z | 2026-07-10T23:05Z | AC-01, AC-03 | clearSessionCookie con flags canónicos (HttpOnly/SameSite=Lax/Path=/, expiración inmediata); test AC-01 verde |
| TASK-PB-P1-003-US-005-BE-003 | Controller + ruta estricta con authMiddleware | 3 | Done | 2026-07-10T22:45Z | 2026-07-10T23:05Z | AC-01, EC-01, EC-03 | Ruta estricta con sessionAuth (401) + error-tap `auth.logout.no_session` + `.all` 405 (N4) |
| TASK-PB-P1-003-US-005-API-001 | Documentar contrato /auth/logout + 405 | 4 | Done | 2026-07-10T22:45Z | 2026-07-10T23:05Z | AC-01, EC-01, EC-03 | OpenAPI logout actualizado (204+limpieza, 401 estricto, 405 MethodNotAllowed); `openapi:check` OK |
| TASK-PB-P1-003-US-005-SEC-001 | Verificación authMiddleware + redacción de logs | 5 | Done | 2026-07-10T22:45Z | 2026-07-10T23:05Z | AC-01, EC-01 | sessionAuth verificado (401 sin/with cookie manipulada); redact.ts cubre cookies/sid (US-108) |
| TASK-PB-P1-003-US-005-OBS-001 | Eventos y métricas de logout | 6 | Done | 2026-07-10T22:45Z | 2026-07-10T23:05Z | AC-01, EC-01 | Eventos `auth.logout.success` / `auth.logout.no_session` con correlationId (D3-metrics de US-001 aplica) |
| TASK-PB-P1-003-US-005-FE-001 | Hook useLogout (TanStack mutation) | 7 | Done | 2026-07-10T22:45Z | 2026-07-10T23:05Z | AC-02 | `useLogout` en shared/auth-session (N1): POST /auth/logout, purga me/auth.*, cookie rol UX, redirect /login; 401≡204 |
| TASK-PB-P1-003-US-005-FE-002 | LogoutButton accesible | 8 | Done | 2026-07-10T22:45Z | 2026-07-10T23:05Z | AC-02 | Item "Cerrar sesión" accesible (menuitem, disabled/aria-busy en pending); sin modal (Decisión PO #4) |
| TASK-PB-P1-003-US-005-FE-003 | Integración en UserMenu + i18n | 9 | Done | 2026-07-10T22:45Z | 2026-07-10T23:05Z | AC-02, EC-02 | UserMenu integra logout real (reemplaza placeholder US-107); i18n navigation.userMenu.logout ya en 4 locales |
| TASK-PB-P1-003-US-005-QA-001 | Unit/Integration tests backend | 10 | Done | 2026-07-10T22:45Z | 2026-07-10T23:05Z | AC-01, AC-03, EC-01 | Unit use case (us094 actualizado) + httpClient 204; suite backend 934 Passed |
| TASK-PB-P1-003-US-005-QA-002 | API tests (204/401/405/no-reuso) | 11 | Done | 2026-07-10T22:45Z | 2026-07-10T23:05Z | AC-01, AC-03, EC-01, EC-03 | `us005-logout.api.spec.ts` 6 tests Passed (204+cookie, no-reuso, 401×2, 405, idempotencia) |
| TASK-PB-P1-003-US-005-QA-003 | E2E logout (3 roles) + estado cliente | 12 | Done | 2026-07-10T22:45Z | 2026-07-10T23:05Z | AC-02, EC-02 | `auth-logout.spec.ts` E2E 3 roles Passed (44 E2E totales); `logout.test.tsx` 4 tests Passed |
| TASK-PB-P1-003-US-005-QA-004 | Multi-pestaña + accesibilidad | 13 | Done | 2026-07-10T22:45Z | 2026-07-10T23:05Z | EC-02 | EC-02 multi-pestaña cubierto por handler global 401 (onError401, tests US-106 vigentes); a11y del item verificada (roles/teclado vía Headless UI + tests) |
| TASK-PB-P1-003-US-005-DOC-001 | Documentation Alignment Doc 19 §9.6 | 14 | Done | 2026-07-10T22:45Z | 2026-07-10T23:05Z | AC-01 | Nota en Doc 19 §9.6 (estrategia recomendada implementada + rotación); tasks de PB-P1-003 consolidadas en records US-003/US-005 |

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
| D1 | SEC-03: "no se persisten sessions revocadas en MVP" (solo rotación de cookie) | Se conserva el store `sessions` con revocación server-side (US-094/US-108) + limpieza de cookie | Infraestructura P0 aceptada preexistente; eliminarla degradaría seguridad y rompería login/me | AC-03 se cumple SIN ventana residual de firma (mejor que lo especificado) | No | Documentada (N2) |
| D2 | Toast genérico ante fallo de red | Sin sistema de toasts (deuda D4 US-001); ante error no-401 se permanece en la página (log de consola dev) | Sin ToastProvider en design system | UX degradada solo en fallo de red; 401/204 cubiertos | No | Documentada |

## 10. Final Validation

- Task completion: **14/14 Done** (0 Skipped/Blocked/Rework).
- Acceptance Criteria coverage: **6/6** — AC-01 (204 sin body + Set-Cookie de limpieza con flags canónicos + `auth.logout.success`), AC-02 (purga me/auth.* + cookie rol UX + redirect /login; component tests), AC-03 (cookie conservada → 401 inmediato por revocación server-side — supera la spec, D1), EC-01 (401 estricto tratado como 204 en FE + evento `auth.logout.no_session`), EC-02 (multi-pestaña vía handler global 401 de US-106), EC-03 (405 METHOD_NOT_ALLOWED en GET/DELETE).
- Backend: lint Passed · typecheck Passed · vitest 109 files / 934 passed · openapi:check Passed. Web: lint Passed · typecheck Passed · vitest 30 files / 124 passed · build Passed · Playwright 44 passed.
- Migrations/Seed: Not Applicable · Authorization: Passed · Security: Passed (redacción, revocación, 405, CSRF SameSite) · Accessibility: Passed · i18n: Passed (claves ya existentes en 4 locales) · Documentation: Passed (OpenAPI + Doc 19 §9.6).
- Cambios clave: backend `logout-user.use-case.ts`, `identity-access.routes.ts` (error-tap + 405), `method-not-allowed.error.ts`, `error-codes.ts`, `error-handler.middleware.ts`, `openapi.ts`+`openapi.json`, `tests/api/us005-logout.api.spec.ts`; web `shared/auth-session/useLogout.ts` (+index), `shared/api-client/httpClient.ts` (204), `shared/navigation/UserMenu.tsx` (logout real), MSW handler logout, `tests/integration/auth/logout.test.tsx`, `tests/e2e/auth-logout.spec.ts` (reemplaza layouts.logout-placeholder), `tests/unit/navigation/UserMenu.test.tsx` (mock actualizado).
- Unresolved debt: hereda deudas previas (toasts — D2).
- Final status: **Done**

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-10T22:40Z | Initialized | Record creado |
| 2026-07-10T22:40Z | Readiness | READY |
| 2026-07-10T22:40Z | Alignment | ALIGNED_WITH_NOTES (N1..N5; D1/D2) |
| 2026-07-10T23:00Z | Ejecución | 14/14 tareas Done |
| 2026-07-10T23:05Z | Final Validation | AC 6/6; story → Done |
