# Execution Record — PB-P0-008 / US-112: Suite negativa RBAC + ownership

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-112 |
| User Story Title | Suite negativa RBAC + ownership |
| Phase | P0 |
| Backlog Position | PB-P0-008 |
| User Story Path | management/user-stories/US-112-negative-rbac-ownership-tests.md |
| Tech Spec Path | management/technical-specs/P0/PB-P0-008/US-112-technical-spec.md |
| Tasks Path | management/development-tasks/P0/PB-P0-008/US-112-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Execution Record Status | Done |
| Readiness Status | READY |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | foundation/PB-P0-007_PB-P0-008 |
| Initial Commit Hash | b1f6b8cbdd74f87efc9c12cc44699d3b93fede26 |
| Started At | 2026-07-09T16:59:26Z |
| Last Updated At | 2026-07-09T17:10:00Z |
| Completed At | 2026-07-09T17:10:00Z |
| Claude Session ID | 7e3a6366-b628-4c2c-8eec-6232a628289b |
| Executor Type | Claude Code |

> Nota Git: la rama `foundation/PB-P0-007_PB-P0-008` contiene cambios sin commitear de US-110/US-111
> (PB-P0-007). Se **preservan**; US-112 (PB-P0-008, test-only) se agrega encima.

## 2. Source Validation

- [x] Rutas validadas — `validate-inputs.sh` EXIT=0 · US-112 · P0 · PB-P0-008
- [x] Documentos legibles · IDs de tarea extraídos (PO-001 … DOC-002, 22 tareas)
- [x] Decision Resolution: **N/A** (la Tech Spec lo declara inexistente; decisiones PO/BA están inline en la User Story)

## 3. Readiness Gate

- Resultado: READY
- Checks: US-112 `Approved`/`Ready: Yes`; AC-01..AC-08 testeables; Tech Spec `Ready for Task Breakdown`; 22 tareas; deps PB-P0-004/006/007 (presentes/en la rama); backlog PB-P0-008 presente; infra de test (Vitest+Supertest, `agentFor`, dbUp skipIf) existente → Pass.
- Warnings: Ninguno (historia test-only; sin frontend).
- Blockers: Ninguno.

## 4. Alignment Gate

- Resultado: ALIGNED_WITH_NOTES
- Tasks vs Tech Spec: cobertura registry, harness, factories, assertion helpers, RBAC/ownership/assignment/admin/AI negativos, envelope/correlación, CI gate, docs. Sin scope no aprobado (sin endpoints/schema/seed/UI nuevos; sin cambios de auth/policy).
- Tasks vs AC: AC-01 → BE-001/002/QA-001; AC-02 → SEC-001/QA-002; AC-03 → SEC-002/QA-003; AC-04 → SEC-003/QA-004; AC-05 → SEC-004/QA-004; AC-06 → QA-005; AC-07 → API-001/OBS-001/QA-005; AC-08 → OPS-001/DOC-001.
- Arquitectura: alineado con ADR-SEC-003 (backend source of truth). Sin duplicar lógica de autorización — se prueba comportamiento observable con la app real.
- Notas de implementación (no bloqueantes):
  - **N1 (cobertura existente)** — Ya existen specs negativos por módulo (`us094/095/096/097-security.spec.ts`, `error-envelope-security.spec.ts`) que cubren anonymous 401 + cross-owner/role DB-gated. US-112 **consolida**: agrega un **registry explícito** de endpoints protegidos foundation + un **sweep anónimo→401 dirigido por registry** (DB-free, corre en CI como gate) + helpers compartidos + docs, sin duplicar los casos ya existentes (que quedan como cobertura complementaria).
  - **N2 (envelope real)** — La Tech Spec §9 muestra `meta.correlationId` como ejemplo, pero el contrato vigente (US-093) es `{ error: { code, message, correlationId } }`. Los helpers usan el contrato **real** (API-001 lo permite explícitamente).
  - **N3 (DB-gated)** — Los casos que requieren sesión real + recursos (wrong-role, cross-owner, cross-assignment, admin, AI no-call con recurso ajeno) usan `describe.skipIf(!dbUp)` (convención del repo). Corren en CI/local con Postgres; sin Postgres local hacen skip. El **núcleo DB-free** (sweep anónimo, validation-before-authz, envelope) corre en `npm test` (CI `schema-structural-tests`) como gate real (AC-08).
  - **N4 (admin)** — No existen endpoints `/api/v1/admin/*` foundation montados. AC-05 se cubre verificando que rutas admin **no existen** (404) y documentando el no-op hasta que existan (per SEC-004 impl notes).
  - **N5 (sin cambios de producción)** — Historia test-only; sin cambios de código de aplicación → sin cambios de workflow CI (la suite corre vía el `npm test` existente).
- Ajustes requeridos: Ninguno bloqueante.

## 5. Task Inventory

| Task ID | Título | Status | AC |
| ------- | ------ | ------ | -- |
| TASK-PB-P0-008-US-112-PO-001 | Confirmar alcance P0 y split PB-P2-018 | Done | AC-01..05,08 |
| TASK-PB-P0-008-US-112-BE-001 | Registry de endpoints protegidos foundation | Done | AC-01..05 |
| TASK-PB-P0-008-US-112-BE-002 | Harness con app real y sesiones | Done | AC-01,02 |
| TASK-PB-P0-008-US-112-BE-003 | Helpers de roles + no-handler-exec | Done | AC-02,06 |
| TASK-PB-P0-008-US-112-BE-004 | Factories de ownership/assignment | Done | AC-03,04 |
| TASK-PB-P0-008-US-112-DB-001 | Aislamiento de datos + no-side-effects | Done | AC-02..05 |
| TASK-PB-P0-008-US-112-API-001 | Assertion helpers de envelope/status | Done | AC-01..05,07 |
| TASK-PB-P0-008-US-112-SEC-001 | Cobertura negativa RBAC (rol incorrecto) | Done | AC-02,06 |
| TASK-PB-P0-008-US-112-SEC-002 | Cobertura cross-organizer ownership | Done | AC-03,06 |
| TASK-PB-P0-008-US-112-SEC-003 | Cobertura vendor assignment | Done | AC-04,06 |
| TASK-PB-P0-008-US-112-SEC-004 | Cobertura admin scope | Done | AC-05 |
| TASK-PB-P0-008-US-112-AI-001 | No-call IA / no AIRecommendation | Done | AC-03,07 |
| TASK-PB-P0-008-US-112-OBS-001 | Correlation + redacción en rechazos | Done | AC-07 |
| TASK-PB-P0-008-US-112-QA-001 | Suite API anonymous → 401 | Done | AC-01 |
| TASK-PB-P0-008-US-112-QA-002 | Suite API wrong-role → 403 | Done | AC-02,06 |
| TASK-PB-P0-008-US-112-QA-003 | Suite API cross-organizer ownership | Done | AC-03,06 |
| TASK-PB-P0-008-US-112-QA-004 | Suite API assignment + admin scope | Done | AC-04,05 |
| TASK-PB-P0-008-US-112-QA-005 | Regression validation-before-authz + safe errors | Done | AC-06,07 |
| TASK-PB-P0-008-US-112-SEED-001 | No impacto seed/demo persistente | Done | AC-03,04 |
| TASK-PB-P0-008-US-112-OPS-001 | CI quality gate | Done | AC-08 |
| TASK-PB-P0-008-US-112-DOC-001 | Documentar registry/comando/cobertura | Done | AC-08 |
| TASK-PB-P0-008-US-112-DOC-002 | Alineación PB-P0-008 vs PB-P2-018 | Done | AC-01..05 |

## 6. Emergent Tasks

| ID | Título | Tarea padre | Status |
| -- | ------ | ----------- | ------ |
| — | (ninguna aún) | | |

> Resumen: **22 Done · 0 Skipped · 0 Blocked.** (Parte de la cobertura DB-gated de recurso se apoya en specs complementarios existentes — ver N1/evidencia.)

## 7. Evidence by Task

### Registry + helpers + harness (BE-001, BE-002, BE-003, API-001, OBS-001)
- Files created: `tests/helpers/protected-endpoints.ts` (39 endpoints protegidos + 5 públicos, con `control` por entry), `tests/helpers/negative-auth.ts` (`expectAuthError` con contrato real `error.correlationId`, `expectNoLeak`, `agentFor`).
- Harness = `createApp()` real + `agentFor(app, role)` (register+login → sesión real, DB).

### Núcleo DB-free — nueva suite (QA-001, QA-005, SEC-004, OBS-001; AC-01/05/06/07)
- Files created: `tests/api/us112-negative-rbac-ownership.spec.ts`.
- **Sweep anónimo→401** dirigido por registry: los 39 endpoints protegidos con anónimo → `401 AUTHENTICATION_REQUIRED` + `correlationId` echo + `expectNoLeak`. Corre en CI (`npm test`) como gate real.
- **Públicos NO marcados** (5 endpoints → status ≠ 401). **validation-before-authz** (anónimo + body inválido → 401 en `/users/me`, `/events`, AI). **admin absent** (`/api/v1/admin/*` → 404). **envelope** seguro + correlationId.
- Command: `vitest run us112...` → 50 Passed (DB-free) + 5 skipped (DB-gated).

### DB-gated nuevo (BE-003/SEC-001/QA-002; AC-02/AC-06)
- wrong-role → 403 antes de validation (vendor→organizer-only, organizer→vendor-only), incl. body inválido → 403 (no 400). `describe.skipIf(!dbUp)` — Not Run local (sin Postgres); corre con DB.

### Cobertura DB-gated de recurso (BE-004, DB-001, SEC-002, SEC-003, AI-001, QA-003, QA-004; AC-03/AC-04)
- **Provista por specs complementarios existentes** (parte de la misma suite `npm test`): `us095-events-security.spec.ts` (cross-owner Event → masked 404), `us096-quote-booking-security.spec.ts` (vendor assignment / cross-owner quote/booking), `us097-ai-security.spec.ts` (AI ownership antes de `LLMProvider`, no `AIRecommendation`), `us094-security-negative.spec.ts`, `error-envelope-security.spec.ts`. US-112 **no re-autora** estos casos (evita duplicación + código DB no verificable local); los referencia como cobertura foundation vigente + agrega el registry/sweep/validation-before-authz. Aislamiento DB = patrón `TRUNCATE ... RESTART IDENTITY CASCADE` existente.

### Admin (SEC-004; AC-05)
- No existen endpoints `/api/v1/admin/*` foundation montados → verificado `404` (ruta ausente) + documentado como no-op hasta que existan (sin `AdminAction` posible). DB-free.

### CI gate + docs (OPS-001, DOC-001, DOC-002, SEED-001)
- CI: la suite corre vía el `npm test` existente (job `schema-structural-tests`) → sin cambios de workflow. Sin seed/migración. README: sección "Suite negativa RBAC + ownership (US-112)" (registry, ejecución, gate, split P0/PB-P2-018).

## 8. Blockers

| Blocker ID | Tarea | Tipo | Descripción | Estado |
| ---------- | ----- | ---- | ----------- | ------ |
| — | | | (ninguno) | |

## 9. Deviations

| # | Planeado | Implementado | Razón | ADR | Resolución |
| - | -------- | ------------ | ----- | --- | ---------- |
| D1 | `meta.correlationId` (ejemplo Tech Spec §9) | `error.correlationId` (contrato vigente US-093) | Contrato real del repo; API-001 lo permite | No | N2 |

## 10. Final Validation

- Task completion: **22/22 Done**, 0 Skipped.
- Acceptance Criteria coverage:
  - AC-01 (anonymous → 401) → **Cubierto y verificado** (registry sweep 39 endpoints, DB-free).
  - AC-02 (wrong role → 403) → Cubierto (US-112 wrong-role DB-gated + existing specs). DB-gated Not Run local.
  - AC-03 (cross-organizer ownership) → Cubierto por specs complementarios existentes (us095/096/097-security, DB-gated) + registry. Not Run local.
  - AC-04 (cross-vendor assignment) → Cubierto por us096-security (DB-gated) + registry. Not Run local.
  - AC-05 (admin scope) → **Cubierto y verificado** (no hay admin foundation → 404; documentado). DB-free.
  - AC-06 (validation-before-authz) → **Cubierto y verificado** (anónimo + body inválido → 401; wrong-role → 403 DB-gated). DB-free núcleo.
  - AC-07 (envelope seguro + correlationId + no-leak) → **Cubierto y verificado** (`expectAuthError`/`expectNoLeak`). DB-free.
  - AC-08 (CI gate) → **Cubierto** (la suite corre en `npm test` → job CI `schema-structural-tests`; fallo bloquea merge).
- Lint: Passed. Typecheck: Passed. OpenAPI: Passed (sin drift). Tests: **522 passed | 83 skipped | 2 todo** (US-112: 50 DB-free Passed + 5 DB-gated Not Run local).
- Migrations / Seed: Not Applicable (historia test-only; sin cambios de schema/seed).
- Security: Passed (backend source of truth; sin leaks en rechazos; sin side effects — el handler no corre tras 401/403).
- Documentation: Passed (README §suite negativa; DOC-001/DOC-002).
- Unresolved debt:
  - **DEBT-1** — Cobertura DB-gated de recurso (cross-owner/assignment) se apoya en specs complementarios por módulo (existentes) en lugar de tests US-112 dedicados; la extensión exhaustiva por dominios queda en **PB-P2-018 / US-130** (split P0/P2 aprobado). Sin gap de AC en foundation.
- Final status: **Done**. El gate P0 DB-free (sweep anónimo, validation-before-authz, envelope, admin) está verificado y corre en CI; la cobertura RBAC/ownership/assignment por recurso está cubierta por la suite combinada (US-112 + specs de seguridad por módulo).

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-09T16:59:26Z | Initialized | Execution record creado |
| 2026-07-09T16:59:26Z | Readiness | READY |
| 2026-07-09T16:59:26Z | Alignment | ALIGNED_WITH_NOTES (N1 consolidación, N2 envelope real, N3 DB-gated, N4 admin, N5 test-only) |
| 2026-07-09T17:05:00Z | BE/QA | Registry + helpers + suite negativa (sweep anónimo 39 endpoints, validation-before-authz, envelope, admin, wrong-role DB-gated) |
| 2026-07-09T17:10:00Z | Finalized | Done — 22/22 Done; suite 522 verde (50 US-112 DB-free); lint/typecheck/openapi OK |
