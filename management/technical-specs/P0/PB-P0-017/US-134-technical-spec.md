# Technical Specification — US-134: Pipeline GitHub Actions de CI (lint / typecheck / tests / build)

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-134 |
| Source User Story | `management/user-stories/US-134-github-actions-pipeline.md` |
| Decision Resolution Artifact | No existe — decisiones formalizadas en ADR-DEVOPS-001, ADR-TEST-001/002 y Doc 21 §§16–17 |
| Priority | P0 |
| Backlog ID | PB-P0-017 |
| Backlog Title | GitHub Actions CI Pipeline (lint/test/build) |
| Backlog Execution Order | 17 (P0) |
| User Story Position in Backlog Item | 1 de 1 |
| Related User Stories in Backlog Item | US-134 |
| Epic | EPIC-OPS-001 — Deployment & DevOps on AWS |
| Backlog Item Dependencies | PB-P0-002, PB-P0-012, PB-P0-015, PB-P0-016 |
| Feature | CI quality gates (foundation) |
| Module / Domain | DevOps |
| User Story Status | Approved |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-22 |
| Last Updated | 2026-06-22 |

---

## 2. Backlog Execution Context

### Product Backlog Item

`PB-P0-017 — GitHub Actions CI Pipeline (lint/test/build)`. Acceptance Summary: workflow corre en PR a `main`; lint + typecheck + tests + build verde para merge; cache npm/pnpm activo; estado visible en checks. Notes: deploy a AWS se incorpora en P2 (PB-P2-023..026). Dependencias: PB-P0-002, PB-P0-012, PB-P0-015, PB-P0-016.

### Execution Order Rationale

US-134 ocupa la posición 17 dentro de P0. Debe completarse después de los scaffolds (PB-P0-002 / PB-P0-012), del tooling de tests (PB-P0-015 / US-125) y del `Dockerfile` (PB-P0-016 / US-133). Es prerequisito de PB-P2-023..026 (deploys). PB-P0-018 (Prisma migrations en pipeline) extenderá este workflow agregando el job de `prisma migrate diff`.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-134 | `pr.yml` con quality gates (lint, typecheck, tests, build) | 1 |

---

## 3. Executive Technical Summary

Crear `.github/workflows/pr.yml` con el set mínimo de quality gates definidos por Doc 21 §§16–17 para PRs a `main`/`qa`: lint backend+frontend, typecheck backend+frontend, tests Vitest backend+frontend (vía scripts de US-125), build backend Docker (sobre `Dockerfile` de US-133, sin push) y build frontend (`next build`). Configurar `permissions: contents: read`, `concurrency` con `cancel-in-progress: true`, cache de dependencias (`actions/setup-node` con `cache: 'npm'` o `actions/cache` parametrizado por hash del lockfile) y matrices opcionales por paquete. Pinning de `actions/*` por major. Documentar branch protection recomendada en `README`/`CONTRIBUTING`. No introducir credenciales de cloud, OIDC ni push a registros (queda para PB-P2-023..026).

---

## 4. Scope Boundary

### In Scope

* `.github/workflows/pr.yml` con jobs separados (install, lint, typecheck, test-backend, test-frontend, build-backend, build-frontend).
* Cache de dependencias por paquete.
* `concurrency` con `cancel-in-progress: true`.
* `permissions: contents: read`.
* Pinning de `actions/*` por major (al menos).
* Documentación operativa en `README`/`CONTRIBUTING` (branch protection recomendada, troubleshooting).
* PR canario o `workflow_dispatch` para validar quality gates positivo y negativo.

### Out of Scope

* `main.yml` y `staging.yml` (PB-P2-023..026).
* Push de imagen a Amazon ECR (PB-P2-023).
* Configuración OIDC GitHub ↔ AWS (PB-P2-023).
* `prisma migrate diff` y validación de migraciones (PB-P0-018).
* `seed-reset.yml` y `smoke.yml` post-deploy (PB-P2-026 / opcional futuro).
* Suite E2E completa de Playwright en CI (PB-P2-016).
* Notificaciones (Slack/email).
* Visual regression, mutation testing, security scan automatizado.
* Self-hosted runners (usamos `ubuntu-latest`).
* Activación automatizada de branch protection.

### Explicit Non-Goals

* No introducir credenciales ni secretos de cloud.
* No publicar artefactos (imagen ni build estático).
* No modificar código productivo de backend/frontend.

---

## 5. Architecture Alignment

### Backend Architecture

* Consume scripts npm del scaffold (PB-P0-002): `lint`, `typecheck`, `build`, `test`, `test:ci`.

### Frontend Architecture

* Consume scripts npm del scaffold (PB-P0-012): `lint`, `typecheck`, `build`, `test`, `test:ci`.

### Database Architecture

No aplica. Validación de migraciones en PB-P0-018.

### API Architecture

No aplica.

### AI / PromptOps Architecture

No aplica.

### Security Architecture

* `permissions: contents: read` por defecto (Doc 21 §19 / §20).
* Sin `pull_request_target`.
* Sin credenciales de cloud.
* Pinning de `actions/*` por major (recomendación: SHA si Tech Lead lo solicita).
* `::add-mask::` cuando sea inevitable manejar valores sensibles.

### Testing Architecture

* PR canario que ejercita positivo y negativo de cada gate.
* No introducir suites nuevas; consume las de US-125.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 | Triggers `on: pull_request: branches: [main, qa]` (opcional + `workflow_dispatch`). | DevOps |
| AC-02 | Job `lint`: matriz por paquete (backend/frontend); `npm ci` + `npm run lint`. | DevOps |
| AC-03 | Job `typecheck`: `tsc --noEmit` o `npm run typecheck`. | DevOps |
| AC-04 | Jobs `test-backend` y `test-frontend`: `npm test` (Vitest); Playwright opcional/no-bloqueante. | DevOps, QA |
| AC-05 | Job `build-backend`: `docker build --no-cache -t eventflow-backend:ci .` (sin push). | DevOps |
| AC-06 | Job `build-frontend`: `npm run build` (`next build`). | DevOps |
| AC-07 | `actions/setup-node@v4` con `cache: 'npm'` (o `pnpm`) por paquete + restore por lockfile hash. | DevOps |
| AC-08 | Cada job declara `name:` claro; los reviewers configuran Required status checks manualmente. | DevOps / Docs |
| AC-09 | `concurrency.group: pr-${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}` + `cancel-in-progress: true`; `permissions: contents: read` a nivel workflow. | DevOps / Security |
| AC-10 | Runners `ubuntu-latest`; cache reduce install; build paralelizable. Tiempo total razonable ≤15 min con cache cálida. | DevOps |

---

## 7. Backend Technical Design

No introduce código backend. Consume scripts del scaffold y el `Dockerfile` de US-133.

---

## 8. Frontend Technical Design

No introduce código frontend. Consume scripts del scaffold.

---

## 9. API Contract Design

No aplica.

---

## 10. Database / Prisma Design

No aplica. PB-P0-018 extenderá el workflow con `prisma migrate diff`.

---

## 11. AI / PromptOps Design

No aplica.

---

## 12. Security & Authorization Design

### Authentication

No aplica runtime.

### Authorization

* `permissions: contents: read` a nivel workflow.
* Jobs no elevan permisos.

### Ownership Rules

No aplica.

### Role Rules

No aplica.

### Negative Authorization Scenarios

* Uso de `pull_request_target` con checkout de PR externo → bloqueo PR.
* Solicitud injustificada de `id-token: write` → bloqueo PR (se reserva para PB-P2-023..026).

### Audit Requirements

* Logs del workflow son la evidencia (UI de GitHub Actions).

### Sensitive Data Handling

* Sin secretos de cloud en este workflow.
* Si un step requiere un valor sensible futuro, usar `secrets.<NOMBRE>` + `::add-mask::`.

---

## 13. Testing Strategy

### Unit Tests

No aplica (los tests unit los cubre US-125).

### Integration Tests

No aplica (cubierto por US-125; aquí solo invocación).

### API Tests

No aplica (cubierto por US-125).

### E2E Tests

* Playwright queda **opcional** en este workflow (puede invocarse con `continue-on-error: true` o como job separado no-bloqueante hasta PB-P2-016).

### Security Tests

* Inspección YAML: `permissions`, ausencia de `pull_request_target`, pinning de `actions/*`, ausencia de credenciales cloud.

### Accessibility Tests

No aplica.

### AI Tests

No aplica.

### Seed / Demo Tests

No aplica.

### CI Checks

* PR canario que demuestra cada gate (positivo y negativo).
* Re-run para validar cache.

---

## 14. Observability & Audit

* Logs: por job en la UI de GitHub Actions.
* Correlation ID: N/A.
* AdminAction: No.
* Error Tracking: logs propios de GitHub Actions (mensajes claros por gate).
* Metrics: tiempo total y por job, visible en la UI.

---

## 15. Seed / Demo Data Impact

No aplica.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| Doc 21 §17 "Prisma migration validation" en PR | Doc 21 sugiere migrations dry-run en PR; PB-P0-018 cubre `prisma migrate diff`. | Aquí no se incluye. | Aclarar en Doc 21 que la fila se introduce con PB-P0-018. | No |
| PB-P0-017 Description menciona "lint/test/build" sin Docker explícito | Backlog dice "build" en general; Doc 21 §17 incluye "Build backend Docker". | Incluir `docker build` en build-backend. | Sin cambio en backlog; alineación implícita. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Tiempos largos por instalación repetida | UX dev pobre | `actions/setup-node` con `cache: 'npm'` (o `pnpm`) + `actions/cache` adicional si aplica. |
| Cache corrupto | Falsos negativos | Clave de cache por hash exacto de lockfile; fallback a install limpio. |
| Build Docker pesado en runner hosted | Tiempo total alto | BuildKit (`DOCKER_BUILDKIT=1`); evaluar `actions/cache` con backend `--cache-to=type=gha` (opcional). |
| Scripts npm con nombres diferentes en backend vs frontend | Workflow rompe | Confirmar nombres exactos con scaffolds antes del PR; matriz parametrizada. |
| Secretos en logs por descuido | Riesgo de exposición | `permissions` mínimos; revisión de YAML como parte de DoD; sin secretos cloud en MVP. |
| Pinning por SHA vs major | Solidez vs mantenimiento | Pin por major MVP; pin por SHA si Tech Lead lo solicita. |

---

## 18. Implementation Guidance for Coding Agents

### Files or folders likely impacted

* `.github/workflows/pr.yml` (nuevo).
* `README.md` y/o `CONTRIBUTING.md` raíz (sección "CI / Branch Protection").

### Recommended order of implementation

1. Esqueleto `pr.yml` con `on`, `permissions`, `concurrency`, `defaults`.
2. Job `lint` con matriz `{ pkg: [backend, frontend] }` + cache.
3. Job `typecheck` análogo.
4. Job `test-backend` y `test-frontend` (Vitest).
5. Job `build-backend` (`docker build` con BuildKit, sin push).
6. Job `build-frontend` (`next build`).
7. Documentación operativa (`README`/`CONTRIBUTING`).
8. PR canario para validar positivo y negativo.

### Decisions that must not be reopened

* GitHub Actions como CI (ADR-DEVOPS-001).
* Esta historia entrega solo `pr.yml` (sin deploy).
* `permissions: contents: read` por defecto; sin `pull_request_target`.
* Sin push a ECR ni credenciales AWS.
* `prisma migrate diff` en PB-P0-018.

### What must not be implemented

* Deploy, OIDC, ECR, migraciones, E2E completo, notifs, security scan, self-hosted, activación de branch protection.

### Assumptions to preserve

* Scaffolds exponen `lint`, `typecheck`, `build`, `test` por paquete.
* `Dockerfile` de US-133 está listo en el paquete backend.
* `npm`/`pnpm` y versión de Node definidos por el scaffold.

---

## 19. Task Generation Notes

### Suggested task groups

* DevOps: crear `pr.yml`, configurar `permissions`/`concurrency`/cache, pinning de `actions/*`.
* Backend (apoyo): confirmar scripts `lint`/`typecheck`/`build`/`test` del scaffold.
* Frontend (apoyo): confirmar lo mismo.
* Security: revisión de YAML para `permissions`/secretos/`pull_request_target`/pinning.
* QA: PR canario positivo y negativo por gate; validación de cache.
* Documentation: sección "CI / Branch Protection" en `README`/`CONTRIBUTING`.

### Required QA tasks

* Verificar verde de los 5 gates en PR canario limpio.
* Verificar falla en cada uno con error deliberado.
* Verificar `cancel-in-progress` al re-push.
* Verificar cache reutilizada en run sucesivo.

### Required security tasks

* Revisión YAML: `permissions`, sin secretos cloud, sin `pull_request_target`, `actions/*` pinneados.

### Required seed/demo tasks

Ninguna.

### Required documentation tasks

* Sección "CI / Branch Protection" en `README`/`CONTRIBUTING`.

### Dependencies between tasks

* Scripts confirmados antes de crear los jobs del workflow.
* Workflow básico antes de PR canario.
* PR canario antes de la documentación final (para incluir capturas/logs reales si Tech Lead lo pide).

### Whether the parent backlog item should later generate a consolidated `tasks.md`

PB-P0-017 contiene una sola User Story (US-134); `tasks.md` consolidado opcional.

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass |
| Product Backlog mapping found | Pass |
| Decision Resolution reviewed if present | N/A |
| Scope clear | Pass |
| Architecture alignment clear | Pass |
| API impact clear | N/A |
| DB impact clear | N/A |
| AI impact clear | N/A |
| Security impact clear | Pass |
| Testing strategy clear | Pass |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`.

La especificación traduce los 10 AC y 5 EC en jobs concretos, mantiene el alcance estrictamente sobre `pr.yml`, se apoya en ADR-DEVOPS-001 + Doc 21 §§16–17 + ADR-TEST-001/002 y deja explícitamente fuera deploy/OIDC/ECR/migraciones/E2E completo. Próximo paso: invocar `eventflow-user-story-to-development-tasks`.
