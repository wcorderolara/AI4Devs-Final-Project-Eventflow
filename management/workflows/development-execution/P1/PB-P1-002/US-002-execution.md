# Execution Record — PB-P1-002 / US-002: Registrarme como proveedor con captcha

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-002 |
| User Story Title | Registrarme como proveedor con captcha |
| Phase | P1 |
| Backlog Position | PB-P1-002 |
| User Story Path | management/user-stories/US-002-register-vendor-account.md |
| Tech Spec Path | management/technical-specs/P1/PB-P1-002/US-002-technical-spec.md |
| Tasks Path | management/development-tasks/P1/PB-P1-002/US-002-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | v1.0.0 (Last updated 2026-07-08) |
| Execution Record Status | Done |
| Readiness Status | READY |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P1-001_PB-P1-004 |
| Initial Commit Hash | 81e2f55d74010a7cdc0976dd03e0146f32d3f38e (working tree contiene US-001 sin commitear, ver §Git) |
| Started At | 2026-07-10T21:05:00Z |
| Last Updated At | 2026-07-10T21:40:00Z |
| Completed At | 2026-07-10T21:40:00Z |
| Claude Session ID | 87bcbf68-374a-480e-8726-be3ecc150e04 |
| Executor Type | Claude Code |

> Git Safety: el working tree contiene los cambios de US-001 (ejecutada inmediatamente antes en
> esta misma sesión, misma rama, aún sin commit por política de no-auto-commit). US-002 se
> construye deliberadamente **sobre** esa base (dependencia PB-P1-001); no hay conflicto.

## 2. Source Validation

- [x] `validate-inputs.sh` exit 0 (US-002 · P1 · PB-P1-002)
- [x] IDs consistentes en las 3 rutas; documentos legibles
- [x] IDs de tarea extraídos: TASK-PB-P1-002-US-002-BE-001 … DOC-001 (17 tareas)

## 3. Readiness Gate

- Resultado: **READY**
- Checks: US `Approved` + `Ready for Development Tasks: Yes`; AC testeables (AC-01..03, EC-01..03); Tech Spec `Ready for Task Breakdown`; Tasks File 17 tareas; conventions legibles; dependencias PB-P0-004/PB-P0-006 (evaluadas en US-001, warning W1 heredado y ya resuelto: el frontend diferido fue entregado por US-001) y PB-P1-001 → `Done` (este record, hoy); sin refinement/decision files para US-002 (N/A); backlog contiene PB-P1-002; sin record previo bloqueante.
- Warnings: Ninguno nuevo.
- Blockers: Ninguno.
- Decision files relacionados: No existe · Refinement files relacionados: No existe

## 4. Alignment Gate

- Resultado: **ALIGNED_WITH_NOTES**
- Tasks vs Tech Spec: derivan de §7–§14; orden correcto; sin scope extra.
- Tech Spec vs Conventions (notas):
  - N1 (estructura): igual que US-001 — `backend/src/modules/identity-access/` y `web/src/features/auth/` (no `apps/api`/`modules/auth`).
  - N2 (naming body): la Tech Spec escribe `business_name`; Doc 16 §9 exige body keys **camelCase** (autoridad del contrato REST) → el campo del DTO es `businessName` (persistido en `users.name`).
  - N3 (ruta onboarding): sin prefijo `/[locale]/` (conventions §10.10) → `/vendor/onboarding` (placeholder de US-040), bajo route group `(app)` que ya exige sesión (UX guard US-105); el enforcement real de rol es del backend.
  - N4 (RegisterVendorUseCase): espejo exacto del flujo organizer → se reutiliza `RegisterUserUseCase` parametrizado por rol (mismo criterio N6 de US-001; evita duplicación ceremonial). El branching pedido por BE-003 ocurre en el controller (mapea `businessName` → `name`).
- Tasks vs AC (mapeo): AC-01 → BE-001..003/API-001/FE-001..003/QA-001..003; AC-02 → FE-001/FE-004/DOC-001/QA-004; AC-03 → BE-002/FE-005/QA-002; EC-01 → BE-001..003/SEC-001/QA-003; EC-02 → BE-001/QA-003; EC-03 → BE-001/FE-002/QA-001/QA-003.
- Hallazgos de arquitectura: Ninguno.

## 5. Task Inventory

| Task ID | Título original | Orden | Depends On | Status | Started | Completed | AC cubiertos | Evidencia (resumen) |
| ------- | --------------- | ----: | ---------- | ------ | ------- | --------- | ------------ | ------------------- |
| TASK-PB-P1-002-US-002-BE-001 | Refactor RegisterUserDTO a discriminated union | 1 | — | Done | 2026-07-10T21:10Z | 2026-07-10T21:35Z | AC-01, EC-02, EC-03 | DTO discriminado organizer|vendor (businessName 2..150); unit tests + regression US-001 verdes |
| TASK-PB-P1-002-US-002-FE-005 | i18n keys auth.register.vendor | 2 | — | Done | 2026-07-10T21:10Z | 2026-07-10T21:35Z | AC-01, AC-03 | `auth.register.vendor.*` + `auth.vendorOnboarding.*` en 4 locales; build verde |
| TASK-PB-P1-002-US-002-BE-002 | Implementar RegisterVendorUseCase | 3 | BE-001 | Done | 2026-07-10T21:10Z | 2026-07-10T21:35Z | AC-01, AC-03, EC-01 | Flujo vendor vía `RegisterUserUseCase` parametrizado (N4); welcome.vendor; test unit verde |
| TASK-PB-P1-002-US-002-BE-003 | Branching del registerHandler por role | 4 | BE-001, BE-002 | Done | 2026-07-10T21:10Z | 2026-07-10T21:35Z | AC-01, EC-01 | Controller mapea `businessName`→`name` por variant; contrato estable; API tests verdes |
| TASK-PB-P1-002-US-002-API-001 | Documentar variant role=vendor del endpoint | 5 | BE-003 | Done | 2026-07-10T21:10Z | 2026-07-10T21:35Z | AC-01, EC-01 | `openapi:generate`+`openapi:check` OK (union discriminada en el body) |
| TASK-PB-P1-002-US-002-OBS-001 | Métricas/logs etiquetados por role | 6 | BE-002 | Done | 2026-07-10T21:10Z | 2026-07-10T21:35Z | AC-01 | Eventos `auth.register.*` con `role` + `latencyMs`; welcome.vendor; test verde |
| TASK-PB-P1-002-US-002-FE-002 | Implementar RegisterVendorForm | 7 | BE-001 | Done | 2026-07-10T21:10Z | 2026-07-10T21:35Z | AC-01, EC-03 | `RegisterVendorForm` (businessName focus, reuso Captcha/Strength); tests verdes |
| TASK-PB-P1-002-US-002-FE-003 | Mutation useRegisterVendor | 8 | API-001 | Done | 2026-07-10T21:10Z | 2026-07-10T21:35Z | AC-01, AC-02, EC-01..03 | `useRegisterVendor` + `authRegisterApi.registerVendor`; EMAIL_TAKEN neutro compartido |
| TASK-PB-P1-002-US-002-FE-004 | Configurar redirección post-registro a /[locale]/vendor/onboarding | 9 | FE-003 | Done | 2026-07-10T21:10Z | 2026-07-10T21:35Z | AC-02 | Redirect a `/vendor/onboarding` + página placeholder con CTA (N3); E2E verde |
| TASK-PB-P1-002-US-002-FE-001 | Render condicional de RegisterVendorForm | 10 | FE-002 | Done | 2026-07-10T21:10Z | 2026-07-10T21:35Z | AC-01, AC-02 | `RegisterPage` condicional por `?role=vendor` (prop roleParam); test + E2E verdes |
| TASK-PB-P1-002-US-002-SEC-001 | Equivalencia de mensajes neutros entre flujos | 11 | BE-003, FE-003 | Done | 2026-07-10T21:10Z | 2026-07-10T21:35Z | EC-01 | Test cross-flow: code+message EMAIL_TAKEN idénticos organizer/vendor — Passed |
| TASK-PB-P1-002-US-002-QA-001 | Unit tests (RegisterVendorUseCase, schema) | 12 | BE-001, BE-002 | Done | 2026-07-10T21:10Z | 2026-07-10T21:35Z | AC-01, EC-02, EC-03 | `us002-register-vendor.spec.ts` 8 tests Passed |
| TASK-PB-P1-002-US-002-QA-002 | Integration tests (use case + repo + Postgres test) | 13 | BE-002 | Done | 2026-07-10T21:10Z | 2026-07-10T21:35Z | AC-01, AC-03 | Escenarios integration en `us002-register-vendor.api.spec.ts` (preferred_language, persistencia) Passed |
| TASK-PB-P1-002-US-002-QA-003 | API tests (Supertest) incluido cross-role email_taken | 14 | BE-003, API-001 | Done | 2026-07-10T21:10Z | 2026-07-10T21:35Z | AC-01, EC-01..03 | 7 escenarios API Passed (201, AC-03, cross-role 409, captcha, débil, D2, regression) |
| TASK-PB-P1-002-US-002-QA-004 | E2E con Playwright (vendor + fake captcha) | 15 | FE-001..005, BE-003 | Done | 2026-07-10T21:10Z | 2026-07-10T21:35Z | AC-01, AC-02 | `auth-register-vendor.spec.ts` Passed; suite E2E completa 38 Passed |
| TASK-PB-P1-002-US-002-QA-005 | Tests de accesibilidad en /auth/register?role=vendor | 16 | FE-002 | Done | 2026-07-10T21:10Z | 2026-07-10T21:35Z | AC-01 | jest-axe sin violaciones critical/serious en form vendor — Passed |
| TASK-PB-P1-002-US-002-DOC-001 | Actualizar PB-P1-002 Acceptance Summary y sincronizar ruta de onboarding con US-040 | 17 | FE-004 | Done | 2026-07-10T21:10Z | 2026-07-10T21:35Z | AC-02 | PB-P1-002 summary (cross-role + onboarding) + nota en US-040 |

## 6. Emergent Tasks

| ID | Título | Tarea padre | Razón de descubrimiento | Necesidad | Impacto de scope | Impacto Tech Spec | Status | Evidencia |
| -- | ------ | ----------- | ----------------------- | --------- | ---------------- | ----------------- | ------ | --------- |
| — | | | | | | | | |

## 7. Evidence by Task

### Backend (BE-001..003, API-001, OBS-001)
- Files modified: `backend/src/modules/identity-access/dto/register-user.request.ts` (discriminated union), `backend/src/modules/identity-access/interface/identity-access.controller.ts` (branching businessName→name), `backend/src/shared/auth/ports.ts` + `backend/src/infrastructure/observability/structured-auth-event-logger.ts` (+role/latencyMs), `backend/src/modules/identity-access/application/register-user.use-case.ts` (role en eventos), `backend/openapi.json` (regenerado).
- Tests: `backend/tests/unit/us002-register-vendor.spec.ts` (nuevo, 8), `backend/tests/api/us002-register-vendor.api.spec.ts` (nuevo, 7); actualizados al union: `us094-auth-schemas`, `us094-auth.integration`, `us094-security-negative` (metadatos seguros +role/latencyMs), helpers y suites 095/096/097 (payload vendor con businessName).
- Commands: `npm run typecheck` → 0 · `npm run lint` → 0 · `npm run openapi:generate && npm run openapi:check` → OK · vitest suite completa (BD test 5433/eventflow_test) → 106 files / 910 passed.
- Lint: Passed · Typecheck: Passed · Tests: Passed · Build: Not Run (imagen backend se valida en CI) · DB validation: Passed (sin cambios de schema; persistencia verificada) · Security: Passed (SEC-001 cross-flow, whitelist rol).

### Frontend (FE-001..005)
- Files created: `web/src/features/auth/schemas/registerVendorSchema.ts`, `web/src/features/auth/hooks/useRegisterVendor.ts`, `web/src/features/auth/components/RegisterVendorForm.tsx`, `web/src/features/auth/pages/RegisterPage.tsx`, `web/src/app/(app)/vendor/onboarding/page.tsx`.
- Files modified: `web/src/app/(auth)/register/page.tsx` (searchParams), `web/src/features/auth/api/authApi.ts`/`authApi.types.ts` (union + registerVendor), `web/src/features/auth/hooks/useRegisterOrganizer.ts` (tipos), `web/src/features/auth/index.ts`, `web/src/messages/{4 locales}/auth.json` (vendor + onboarding).
- Tests: `web/src/tests/integration/auth/register-vendor-form.test.tsx` (5), `web/src/tests/e2e/auth-register-vendor.spec.ts` (1).
- Commands: `npm run typecheck` → 0 · `npm run lint` → 0 · `npx vitest run` → 28 files / 110 passed · `npm run build` → 0 · `npx playwright test` → 38 passed.
- Lint: Passed · Typecheck: Passed · Tests: Passed · Build: Passed · Accessibility: Passed (axe) · i18n: Passed (4 locales).

### DOC-001
- `management/artifacts/4-Product-Backlog-Prioritized.md` (PB-P1-002 Acceptance Summary: EMAIL_TAKEN cross-role + ruta onboarding) y `management/user-stories/US-040-create-vendor-profile.md` (nota de sincronización de ruta). Modificaciones limitadas a lo incluido por la tarea.

## 8. Blockers

| Blocker ID | Tarea afectada | Tipo | Descripción | Detectado | Decisión requerida | Rol responsable | Estado |
| ---------- | -------------- | ---- | ----------- | --------- | ------------------ | --------------- | ------ |
| — | | | | | | | |

## 9. Deviations

| # | Comportamiento planeado | Implementado/propuesto | Razón | Impacto | Convención afectada | Sección Tech Spec | ADR requerido | Resolución |
| - | ----------------------- | ---------------------- | ----- | ------- | ------------------- | ----------------- | ------------- | ---------- |
| D1 | EC-02: captcha inválido → `400 VALIDATION_ERROR` (`field='captchaToken'`) | `400 CAPTCHA_REQUIRED`/`CAPTCHA_INVALID` (contrato único formalizado en Doc 16 §14.2 por US-001/DOC-001) | Idéntica a D1 de US-001 | Solo literal del `code` | §9 | §7 | No | Documentada |
| D2 | NT-04: `role='admin'`/`role='organizer'` → "forzado a vendor" | `role='admin'` → `400 VALIDATION_ERROR` (whitelist); `role='organizer'` con payload organizer es el flujo legítimo de US-001 (endpoint compartido). El form vendor SIEMPRE envía `role='vendor'` fijo (no editable) | Endpoint único compartido por diseño (Tech Spec §3); "forzar vendor" a un payload organizer rompería US-001 | `admin` imposible; el usuario no puede elevar rol desde el form vendor | §13 | §7 | No | Documentada |
| D3 | Tech Spec: campo `business_name` | `businessName` (body keys camelCase — Doc 16 §9, autoridad del contrato) | N2 | Ninguno (columna sigue siendo `users.name`) | §9 | §7 | No | Documentada |
| D4 | Toast de éxito | Igual que D4 de US-001 (sin ToastProvider); anuncio aria-live + redirección | Reuso del patrón US-001 | UX equivalente | §10.7 | §8 | No | Deuda registrada en US-001 |

## 10. Final Validation

- Task completion: **17/17 Done** (0 Skipped, 0 Blocked, 0 Rework Required).
- Acceptance Criteria coverage: **6/6** — AC-01 (201 vendor + cookie + name=businessName), AC-02 (redirect `/vendor/onboarding` + CTA, E2E), AC-03 (Accept-Language pt → preferred_language=pt), EC-01 (409 EMAIL_TAKEN cross-role neutro e idéntico entre flujos), EC-02 (400 CAPTCHA_INVALID — D1 — sin persistencia), EC-03 (política de contraseña en FE y BE).
- Lint/Typecheck/Tests/Build: Passed en backend y web (ver §7) · Migrations/Seed: Not Applicable · Authorization: Passed (whitelist rol; guard solo-anónimo compartido) · Security: Passed (SEC-001) · Accessibility: Passed · i18n: Passed · Documentation: Passed.
- Unresolved debt: hereda las de US-001 (toasts, proveedor captcha real, alineación /auth/me); nueva: el CTA de onboarding enlaza a `/vendor/profile` provisional hasta que US-040 fije la ruta (nota dejada en US-040).
- Final status: **Done**

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-10T21:05Z | Initialized | Execution record creado |
| 2026-07-10T21:05Z | Readiness | READY |
| 2026-07-10T21:05Z | Alignment | ALIGNED_WITH_NOTES (N1..N4; D1..D4) |
| 2026-07-10T21:35Z | Ejecución | 17/17 tareas Done (backend+frontend+QA+DOC) |
| 2026-07-10T21:40Z | Final Validation | AC 6/6; story → Done |
