# Technical Specification — US-139: Migraciones Prisma ejecutadas automáticamente en CI/CD

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-139 |
| Source User Story | `management/user-stories/US-139-prisma-migrations-in-pipeline.md` |
| Decision Resolution Artifact | No existe — decisiones formalizadas en ADR-DB-001, ADR-DEVOPS-001 y Doc 18 §28 / Doc 21 §§16–18 |
| Priority | P0 |
| Backlog ID | PB-P0-018 |
| Backlog Title | Prisma Migrations en Pipeline |
| Backlog Execution Order | 18 (P0) |
| User Story Position in Backlog Item | 1 de 1 |
| Related User Stories in Backlog Item | US-139 |
| Epic | EPIC-OPS-001 — Deployment & DevOps on AWS |
| Backlog Item Dependencies | PB-P0-001 (Database Schema, Migrations & Constraints), PB-P0-017 (GitHub Actions CI Pipeline) |
| Feature | Migrations CI/CD (foundation) |
| Module / Domain | DevOps / DB |
| User Story Status | Approved |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-22 |
| Last Updated | 2026-06-22 |

---

## 2. Backlog Execution Context

### Product Backlog Item

`PB-P0-018 — Prisma Migrations en Pipeline`. Acceptance Summary: `migrate deploy` aplica en CI sin intervención manual; drift detectado en PR; rollback documentado; tests post-migración OK. Dependencias: PB-P0-001, PB-P0-017.

### Execution Order Rationale

US-139 = posición 18 (P0), última pieza DevOps Foundation. Depende del schema baseline (PB-P0-001) y del workflow `pr.yml` (PB-P0-017 / US-134). Habilita correr seed en CI/Demo y es prerequisito de PB-P2-023..026 (wiring real del deploy en App Runner).

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-139 | Job `migrations-validate` + composite action `migrate deploy` reusable | 1 |

---

## 3. Executive Technical Summary

Extender el workflow `pr.yml` (US-134) con un job `migrations-validate` que: (a) levante Postgres efímera vía service container pinneado, (b) ejecute `prisma migrate diff --exit-code` para drift detection, (c) ejecute `prisma migrate deploy` contra la base efímera para validar aplicabilidad, (d) ejecute un subset smoke de tests de integración que cargue Prisma client contra la base migrada. Además, crear una **composite action local** (`.github/actions/prisma-migrate/`) o un job reusable vía `workflow_call` que reciba `DATABASE_URL` por input y ejecute `prisma migrate deploy`, lista para que PB-P2-023..026 la invoque desde `main.yml`/`staging.yml` antes de servir tráfico en App Runner. Documentar política forward-only y checklist Doc 18 §28.5 en `README`/`CONTRIBUTING` + referencia en PR template. Mantener `permissions: contents: read`, secretos enmascarados y prohibición explícita de `prisma migrate reset` en CI/QA/Demo.

---

## 4. Scope Boundary

### In Scope

* Extender `.github/workflows/pr.yml` con job `migrations-validate`.
* Service container Postgres pinneado (`postgres:16-alpine` u otra acordada con Tech Lead) con healthcheck.
* `prisma migrate diff --exit-code` (drift).
* `prisma migrate deploy` contra base efímera del runner.
* Smoke post-migración (subset de `npm test` o script `test:integration:smoke`).
* Composite action local `.github/actions/prisma-migrate/action.yml` (o job `workflow_call`) reusable.
* `README`/`CONTRIBUTING` sección "Migraciones / Rollback" con política forward-only y checklist Doc 18 §28.5.
* PR template (`.github/pull_request_template.md`) o sección equivalente referenciando la checklist cuando se modifique `prisma/`.

### Out of Scope

* `main.yml`/`staging.yml` y deploys reales a App Runner / Amplify (PB-P2-023..026).
* Push de imagen Docker a ECR (PB-P2-023).
* Configuración OIDC GitHub ↔ AWS (PB-P2-023).
* Snapshots automáticos de RDS antes de migrar (futuro).
* `prisma migrate reset` (prohibido en CI/QA/Demo).
* Rollback automático del deploy backend (Doc 21 §16.4 — evaluación manual).
* `seed-reset.yml` y notificaciones (PB-P2-026 / futuro).

### Explicit Non-Goals

* No introducir lógica de seed (otras historias).
* No modificar `schema.prisma`.
* No introducir cambios en módulos backend más allá del subset smoke.

---

## 5. Architecture Alignment

### Backend Architecture

* No cambia. La app debe poder inicializar Prisma client contra la base migrada (responsabilidad del scaffold + esquema baseline de PB-P0-001).

### Frontend Architecture

No aplica.

### Database Architecture

* Política forward-only (Doc 18 §28.4).
* Multi-step para NOT NULL / índices grandes (Doc 18 §28.2).
* Raw SQL policy preservada (Doc 18 §28.3).

### API Architecture

No aplica.

### AI / PromptOps Architecture

No aplica.

### Security Architecture

* `permissions: contents: read` por defecto.
* Sin `pull_request_target`.
* `DATABASE_URL` enmascarada (`::add-mask::`).
* `prisma migrate reset` prohibido en CI/QA/Demo.
* `actions/*` pinneados por major (mínimo); SHA opcional.

### Testing Architecture

* Smoke post-migración como subset de tests integración (US-125 BE-002 + BE-004 ya tienen `tests/setup.ts` con DB efímera opcional).
* Canarios positivo y negativo para validar drift, migración inválida, secret ausente.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 | Step `npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-migrations prisma/migrations --exit-code` en `migrations-validate`. | DevOps / DB |
| AC-02 | Step `npx prisma migrate deploy` contra `DATABASE_URL` del service container. | DevOps / DB |
| AC-03 | Step `npm run test:integration:smoke` (o subset existente) usando la `DATABASE_URL` del runner. | DevOps / QA / Backend |
| AC-04 | `.github/actions/prisma-migrate/action.yml` (composite) recibe `DATABASE_URL` por input y ejecuta `migrate deploy`. | DevOps |
| AC-05 | `DATABASE_URL` del service container expuesto por env del job; secrets `${{ secrets.DATABASE_URL_QA }}` previstos para futuras invocaciones via `workflow_call`. | DevOps / Security |
| AC-06 | Sección "Migraciones / Rollback" en `README`/`CONTRIBUTING`: forward-only, migración correctiva, prohibición `migrate reset`. | Docs |
| AC-07 | `.github/pull_request_template.md` con bloque condicional referenciando Doc 18 §28.5 cuando hay cambios en `prisma/`. | Docs |
| AC-08 | Step previo o el propio `migrate diff` retorna mensaje guía hacia `prisma migrate dev --name <descripcion>`. | DevOps |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

No cambia. Solo se asegura que `npm run test:integration:smoke` (existente o nuevo subset) puede consumir `DATABASE_URL`.

### Use Cases / Application Services

No aplica.

### Controllers / Routes

No aplica.

### DTOs / Schemas

No aplica.

### Repository / Persistence

* El subset smoke debe instanciar `PrismaClient`, ejecutar una query trivial (`SELECT 1` o `prisma.$queryRaw`) y cerrar la conexión. Si el scaffold ya tiene un test que hace esto, reutilizar.

### Validation Rules

No aplica.

### Error Handling

* Mensajes guía explícitos en cada step.

### Transactions

No aplica.

### Observability

* Logs del job son la evidencia operativa.

---

## 8. Frontend Technical Design

No aplica.

---

## 9. API Contract Design

No aplica.

---

## 10. Database / Prisma Design

* Models Impacted: ninguno nuevo.
* Migrations Impact: ninguno nuevo en esta historia; se ejercita la mecánica.
* Seed Impact: ninguno aquí. Habilitada para PB-P2-026.
* Notas:
  * Postgres efímera pinneada (recomendado `postgres:16-alpine`).
  * `DATABASE_URL` para el job: `postgres://user:password@localhost:5432/eventflow_ci` (alineado con service container).
  * Multi-step para NOT NULL e índices grandes (`CONCURRENTLY`) sigue siendo política Doc 18 §28.

---

## 11. AI / PromptOps Design

No aplica.

---

## 12. Security & Authorization Design

### Authentication

No aplica.

### Authorization

* `permissions: contents: read` a nivel workflow; jobs no elevan.

### Ownership Rules

No aplica.

### Role Rules

No aplica.

### Negative Authorization Scenarios

* Uso de `pull_request_target` → bloqueo PR.
* Step que imprime `DATABASE_URL` → bloqueo PR.
* Step que invoca `prisma migrate reset` → bloqueo PR (VR-02).

### Audit Requirements

* Logs de Actions son evidencia.

### Sensitive Data Handling

* `DATABASE_URL` enmascarado (`::add-mask::`).
* Secretos futuros (`DATABASE_URL_QA`, `DATABASE_URL_DEMO`) declarados como `${{ secrets.* }}`; no se introducen en esta historia.

---

## 13. Testing Strategy

### Unit Tests

No aplica.

### Integration Tests

* Subset smoke `npm run test:integration:smoke` que ejecuta una query mínima usando Prisma client.

### API Tests

No aplica directamente.

### E2E Tests

No aplica.

### Security Tests

* Inspección YAML: `permissions`, `pull_request_target`, ausencia de `migrate reset`, ausencia de `DATABASE_URL` en logs, pinning de `actions/*` y de Postgres image.

### Accessibility Tests

No aplica.

### AI Tests

No aplica.

### Seed / Demo Tests

No aplica.

### CI Checks

* Job `migrations-validate` agregado a `pr.yml`.
* PR canarios positivo y negativo (con drift, sin drift, migración válida, migración inválida, secret ausente, `prisma migrate reset` introducido — debe bloquearse en review).

---

## 14. Observability & Audit

* Logs por step en UI de GitHub Actions.
* Cada step imprime el comando ejecutado (sin variables sensibles).

---

## 15. Seed / Demo Data Impact

No aplica directamente. Esta historia habilita correr seed en CI/Demo (Notes PB-P0-018), pero la implementación del seed runner queda en otras historias.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| PB-P0-018 "reversibles cuando aplica" vs Doc 18 §28.4 | Backlog sugiere reversibilidad; Doc 18 §28.4 fija forward-only. | Forward-only en producción; rollback = migración correctiva. | Aclarar redacción del backlog (cosmético). | No |
| Doc 21 §17 "Prisma migration validation" en PR | Mencionado en quality gates sin wiring concreto. | Wiring se introduce con esta historia. | Actualizar Doc 21 §17 referenciando PB-P0-018. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Postgres service container no arranca | Job rojo recurrente | `image: postgres:16-alpine` pinneada con `options: --health-cmd "pg_isready -U postgres"` y reintentos limitados. |
| Migración tarda más del esperado | Job timeout / bloqueo CI | Timeout en step (`timeout-minutes: 15`); mensaje guía sobre `CONCURRENTLY` y multi-step. |
| `DATABASE_URL` mal mapeado a service container | Drift apply falla | URL determinística `postgres://postgres:postgres@localhost:5432/eventflow_ci`; consistencia con `env` del job. |
| Falta `npm run test:integration:smoke` | AC-03 sin script | Coordinar con US-125 BE-002/BE-004 para reusar la suite de integración existente o agregar el subset. |
| Cambios manuales en bases QA/Demo | Drift recurrente | EC-03 documenta `db pull` + migración correctiva. |
| Risk de `prisma migrate reset` por copy-paste | Pérdida de datos en QA/Demo | VR-02 + grep en code review como check informal; opcional regla custom de lint YAML. |

---

## 18. Implementation Guidance for Coding Agents

### Files or folders likely impacted

* `.github/workflows/pr.yml` (extendido por US-134).
* `.github/actions/prisma-migrate/action.yml` (nuevo).
* `.github/pull_request_template.md` (nuevo o ampliado).
* `README.md` / `CONTRIBUTING.md` (sección "Migraciones / Rollback").
* `apps/backend/package.json` (script `test:integration:smoke` si no existe).

### Recommended order of implementation

1. Confirmar/crear `test:integration:smoke` en backend (coordinado con US-125).
2. Extender `pr.yml` con job `migrations-validate` + service container Postgres.
3. Implementar steps: `migrate diff` → `migrate deploy` → `test:integration:smoke`.
4. Crear composite action `.github/actions/prisma-migrate/action.yml`.
5. Documentación `README`/`CONTRIBUTING` y PR template.
6. PR canarios positivo y negativo.

### Decisions that must not be reopened

* Forward-only en producción (Doc 18 §28.4).
* `prisma migrate reset` prohibido en CI/QA/Demo.
* `permissions: contents: read` por defecto; sin `pull_request_target`.
* Wiring real del deploy a App Runner queda en PB-P2-023..026.
* GitHub Actions como CI (ADR-DEVOPS-001).

### What must not be implemented

* `main.yml`/`staging.yml`, push a ECR, OIDC, snapshots pre-migración, rollback automático, `seed-reset.yml`, notifs.

### Assumptions to preserve

* PB-P0-001 entrega `schema.prisma` + baseline migration.
* US-134 entrega `pr.yml` extensible.
* US-125 entrega tooling de tests con `tests/setup.ts` y soporte de `DATABASE_URL`.

---

## 19. Task Generation Notes

### Suggested task groups

* DevOps: extender `pr.yml`, composite action `prisma-migrate`, pinning.
* Backend (apoyo): confirmar/crear `test:integration:smoke`.
* Security: revisión YAML (permissions, masking, `migrate reset`, `pull_request_target`).
* QA: canarios positivo/negativo (drift, migración inválida, secret ausente).
* Documentation: `README`/`CONTRIBUTING` y PR template.

### Required QA tasks

* PR canario sin drift → verde.
* PR canario con `schema.prisma` modificado sin migración → falla con mensaje guía.
* PR canario con migración inválida → falla.
* Secret `DATABASE_URL` ausente → falla rápida con mensaje.

### Required security tasks

* Revisión YAML.
* Verificar masking de `DATABASE_URL`.

### Required seed/demo tasks

Ninguna.

### Required documentation tasks

* `README`/`CONTRIBUTING` sección "Migraciones / Rollback".
* PR template referenciando Doc 18 §28.5.

### Dependencies between tasks

* `test:integration:smoke` listo antes del job `migrations-validate`.
* Job operativo antes de la composite action (para reusar lógica).
* Composite action antes de los canarios negativos que la prueben en aislamiento.

### Whether the parent backlog item should later generate a consolidated `tasks.md`

PB-P0-018 contiene una sola User Story (US-139); `tasks.md` consolidado opcional.

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
| DB impact clear | Pass |
| AI impact clear | N/A |
| Security impact clear | Pass |
| Testing strategy clear | Pass |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`.

La especificación traduce los 8 AC y 5 EC en jobs/steps concretos, separa los dos gates (drift en PR vs `migrate deploy` reusable), mantiene la política forward-only y se apoya en ADR-DB-001/DEVOPS-001 + Doc 18 §28 / Doc 21 §§16–18. Próximo paso: invocar `eventflow-user-story-to-development-tasks`.
