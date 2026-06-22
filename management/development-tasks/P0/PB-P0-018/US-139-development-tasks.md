# Development Tasks — PB-P0-018 / US-139: Migraciones Prisma ejecutadas automáticamente en CI/CD

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-139 |
| Source User Story | `management/user-stories/US-139-prisma-migrations-in-pipeline.md` |
| Source Technical Specification | `management/technical-specs/P0/PB-P0-018/US-139-technical-spec.md` |
| Decision Resolution Artifact | No existe — decisiones formalizadas en ADR-DB-001, ADR-DEVOPS-001 y Doc 18 §28 / Doc 21 §§16–18 |
| Priority | P0 |
| Backlog ID | PB-P0-018 |
| Backlog Title | Prisma Migrations en Pipeline |
| Backlog Execution Order | 18 (P0) |
| User Story Position in Backlog Item | 1 de 1 |
| Related User Stories in Backlog Item | US-139 |
| Epic | EPIC-OPS-001 — Deployment & DevOps on AWS |
| Backlog Item Dependencies | PB-P0-001, PB-P0-017 |
| Feature | Migrations CI/CD (foundation) |
| Module / Domain | DevOps / DB |
| Backlog Alignment Status | Found |
| Task Breakdown Status | Ready for Sprint Planning |
| Created Date | 2026-06-22 |
| Last Updated | 2026-06-22 |

---

## 2. Source Validation

| Source | Found | Used | Notes |
|---|---|---|---|
| User Story | Yes | Yes | Status `Approved`; 8 AC + 5 EC. |
| Technical Specification | Yes | Yes | Primary source; `Ready for Task Breakdown`. |
| Decision Resolution Artifact | No | No | No requerido. |
| Product Backlog Prioritized | Yes | Yes | PB-P0-018 mapeado; posición 18 P0. |
| ADRs | Yes | Yes | ADR-DB-001, ADR-DEVOPS-001, ADR-TEST-001. |

---

## 3. Backlog Execution Context

### Parent Backlog Item

`PB-P0-018 — Prisma Migrations en Pipeline`. Acceptance Summary: `migrate deploy` aplica en CI sin intervención manual; drift detectado en PR; rollback documentado; tests post-migración OK.

### Execution Order Rationale

US-139 = posición 18 (P0). Última pieza DevOps Foundation; depende de PB-P0-001 y PB-P0-017. Habilita seed runner en CI/Demo y prepara wiring de deploys de PB-P2-023..026.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-139 | Job `migrations-validate` + composite action `prisma-migrate` reusable | 1 |

---

## 4. Task Breakdown Summary

| Area | Number of Tasks | Notes |
|---|---:|---|
| Backend (BE) | 1 | Confirmar/crear `test:integration:smoke` con Prisma. |
| Database / Prisma (DB) | 1 | Pinning de imagen Postgres para service container. |
| DevOps / Environment (OPS) | 4 | Job `migrations-validate`, steps drift/deploy/smoke, composite action reusable, integración con `pr.yml`. |
| Security / Authorization (SEC) | 1 | Revisión YAML (masking, sin `migrate reset`, permisos). |
| QA / Testing (QA) | 3 | Canario positivo, canario con drift, canario con migración inválida. |
| Documentation / Traceability (DOC) | 2 | Sección "Migraciones / Rollback" + PR template. |
| **Total** | **12** | |

---

## 5. Traceability Matrix

| Acceptance Criterion | Technical Spec Section | Task IDs |
|---|---|---|
| AC-01 | §6, §13 | TASK-PB-P0-018-US-139-OPS-002 |
| AC-02 | §6, §13 | TASK-PB-P0-018-US-139-OPS-002, DB-001 |
| AC-03 | §6, §7, §13 | TASK-PB-P0-018-US-139-BE-001, OPS-002 |
| AC-04 | §6, §18 | TASK-PB-P0-018-US-139-OPS-003 |
| AC-05 | §12, §6 | TASK-PB-P0-018-US-139-OPS-002, OPS-003, SEC-001 |
| AC-06 | §18, §19 | TASK-PB-P0-018-US-139-DOC-001 |
| AC-07 | §18, §19 | TASK-PB-P0-018-US-139-DOC-002 |
| AC-08 | §6 (AC-08), §18 | TASK-PB-P0-018-US-139-OPS-002 |
| EC-01 | §17, §10 | TASK-PB-P0-018-US-139-DB-001, OPS-002 |
| EC-02 | §10, §18 | TASK-PB-P0-018-US-139-DOC-001 |
| EC-03 | §17 | TASK-PB-P0-018-US-139-DOC-001 |
| EC-04 | §17 | TASK-PB-P0-018-US-139-OPS-002 |
| EC-05 | §12, §6 | TASK-PB-P0-018-US-139-OPS-002, SEC-001 |
| SEC-01..05 + VR-02 | §12 | TASK-PB-P0-018-US-139-SEC-001 |

---

## 6. Development Tasks

### TASK-PB-P0-018-US-139-BE-001 — Confirmar/crear `test:integration:smoke`

| Field | Value |
|---|---|
| Area | Backend |
| Type | Implementation |
| Priority | Must |
| Estimate | S |
| Depends On | — |
| Source AC(s) | AC-03 |
| Technical Spec Section(s) | §7 Backend, §13 Testing Strategy |
| Backlog ID | PB-P0-018 |
| User Story ID | US-139 |
| Owner Role | Backend |
| Status | To Do |

#### Objective

Confirmar que existe (o crear) un script `npm run test:integration:smoke` que instancia `PrismaClient`, ejecuta una query trivial (`SELECT 1` o `prisma.$queryRaw`) y cierra la conexión. Reutilizar la suite de US-125 cuando sea posible.

#### Scope

##### Include

* Script en `package.json` del backend.
* Test mínimo que valide conectividad Prisma ↔ Postgres.

##### Exclude

* Cobertura funcional de dominio (otras historias).

#### Acceptance Criteria Covered

* AC-03.

#### Definition of Done

- [ ] `npm run test:integration:smoke` verde localmente contra una Postgres con `DATABASE_URL` definida.

---

### TASK-PB-P0-018-US-139-DB-001 — Pinning de imagen Postgres para service container

| Field | Value |
|---|---|
| Area | Database / Prisma |
| Type | Setup |
| Priority | Must |
| Estimate | XS |
| Depends On | — |
| Source AC(s) | AC-02, EC-01 |
| Technical Spec Section(s) | §10, §17 |
| Backlog ID | PB-P0-018 |
| User Story ID | US-139 |
| Owner Role | DevOps / DB |
| Status | To Do |

#### Objective

Definir y documentar la versión exacta de Postgres a usar en el service container del runner.

#### Scope

##### Include

* Tag pinneado (recomendado `postgres:16-alpine`).
* Razón documentada (compatibilidad con Prisma + tamaño).

##### Exclude

* Pinning por SHA salvo solicitud de Tech Lead.

#### Acceptance Criteria Covered

* AC-02 (estabilidad), EC-01 (healthcheck).

#### Definition of Done

- [ ] Tag definido y referenciado en `pr.yml` y en `README`/`CONTRIBUTING`.

---

### TASK-PB-P0-018-US-139-OPS-001 — Esqueleto job `migrations-validate` en `pr.yml`

| Field | Value |
|---|---|
| Area | DevOps / Environment |
| Type | Implementation |
| Priority | Must |
| Estimate | S |
| Depends On | DB-001 |
| Source AC(s) | AC-01, AC-02, AC-03 |
| Technical Spec Section(s) | §6, §18 (paso 2) |
| Backlog ID | PB-P0-018 |
| User Story ID | US-139 |
| Owner Role | DevOps |
| Status | To Do |

#### Objective

Agregar el job `migrations-validate` en `.github/workflows/pr.yml` (entregado por US-134) con `services.postgres` pinneado, healthcheck y `env.DATABASE_URL` apuntando al contenedor.

#### Scope

##### Include

* `services.postgres` con imagen pinneada (DB-001), `POSTGRES_USER/PASSWORD/DB`, `options: --health-cmd "pg_isready -U postgres"`.
* `env.DATABASE_URL: postgres://postgres:postgres@localhost:5432/eventflow_ci`.
* `actions/checkout@v4` + `actions/setup-node@v4` con cache.

##### Exclude

* Lógica de drift/apply (cubierta por OPS-002).

#### Acceptance Criteria Covered

* AC-01, AC-02, AC-03 (preparación).

#### Definition of Done

- [ ] Job presente y arranca el container hasta `healthy`.

---

### TASK-PB-P0-018-US-139-OPS-002 — Steps drift + apply + smoke

| Field | Value |
|---|---|
| Area | DevOps / Environment |
| Type | Implementation |
| Priority | Must |
| Estimate | M |
| Depends On | BE-001, OPS-001 |
| Source AC(s) | AC-01, AC-02, AC-03, AC-05, AC-08, EC-04, EC-05 |
| Technical Spec Section(s) | §6, §13, §17 |
| Backlog ID | PB-P0-018 |
| User Story ID | US-139 |
| Owner Role | DevOps |
| Status | To Do |

#### Objective

Implementar los steps del job `migrations-validate`: drift detection, `migrate deploy` contra la base efímera, smoke post-migración y mensajes de error claros.

#### Scope

##### Include

* Step `Drift check`: `npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-migrations prisma/migrations --exit-code`.
* Step `Apply migrations`: `npx prisma migrate deploy` con `timeout-minutes: 15` (EC-04).
* Step `Smoke`: `npm run test:integration:smoke`.
* Step previo `Check DATABASE_URL`: `if [ -z "$DATABASE_URL" ]; then echo "missing DATABASE_URL"; exit 1; fi` (EC-05).
* Mensajes de guía (AC-08).
* `::add-mask::` cuando se manejen secretos.

##### Exclude

* `prisma migrate reset` (VR-02).
* Push a registros.

#### Acceptance Criteria Covered

* AC-01, AC-02, AC-03, AC-05, AC-08, EC-04, EC-05.

#### Definition of Done

- [ ] Steps presentes; canario sin drift termina verde.
- [ ] Canario con schema modificado sin migración falla con mensaje guía.

---

### TASK-PB-P0-018-US-139-OPS-003 — Composite action `prisma-migrate` reusable

| Field | Value |
|---|---|
| Area | DevOps / Environment |
| Type | Implementation |
| Priority | Must |
| Estimate | S |
| Depends On | OPS-002 |
| Source AC(s) | AC-04, AC-05 |
| Technical Spec Section(s) | §6 (AC-04), §18 |
| Backlog ID | PB-P0-018 |
| User Story ID | US-139 |
| Owner Role | DevOps |
| Status | To Do |

#### Objective

Crear `.github/actions/prisma-migrate/action.yml` (composite) que reciba `DATABASE_URL` por input y ejecute `prisma migrate deploy` con masking, lista para invocación futura desde `main.yml`/`staging.yml`.

#### Scope

##### Include

* `inputs.database-url` requerido; `runs.using: composite`; steps con `::add-mask::`.
* Documentar uso en el propio `action.yml` (description + ejemplo).

##### Exclude

* Wiring desde workflows de deploy (PB-P2-023..026).

#### Acceptance Criteria Covered

* AC-04, AC-05.

#### Definition of Done

- [ ] Composite action presente.
- [ ] Invocada al menos una vez (job `migrations-validate` puede usarla internamente para evitar duplicación).

---

### TASK-PB-P0-018-US-139-OPS-004 — Pinning de `actions/*` agregadas

| Field | Value |
|---|---|
| Area | DevOps / Environment |
| Type | Setup |
| Priority | Must |
| Estimate | XS |
| Depends On | OPS-001, OPS-002, OPS-003 |
| Source AC(s) | SEC-04 (User Story) |
| Technical Spec Section(s) | §12, §17 |
| Backlog ID | PB-P0-018 |
| User Story ID | US-139 |
| Owner Role | DevOps |
| Status | To Do |

#### Objective

Garantizar que toda nueva `actions/*` referenciada en este job y en la composite action está pinneada al menos por major.

#### Definition of Done

- [ ] Inspección del YAML: sin tags flotantes.

---

### TASK-PB-P0-018-US-139-SEC-001 — Revisión YAML (masking, `migrate reset`, permisos)

| Field | Value |
|---|---|
| Area | Security / Authorization |
| Type | Review |
| Priority | Must |
| Estimate | XS |
| Depends On | OPS-002, OPS-003, OPS-004 |
| Security Concern | Cumplir SEC-01..05 y VR-02 |
| Source AC(s) | SEC-01..05, AUTH-TS-01..03 |
| Technical Spec Section(s) | §12 |
| Backlog ID | PB-P0-018 |
| User Story ID | US-139 |
| Owner Role | Security / DevOps |
| Status | To Do |

#### Objective

Verificar que el YAML cumple: `permissions: contents: read`, sin `pull_request_target`, sin `prisma migrate reset`, `DATABASE_URL` enmascarada, `actions/*` pinneados.

#### Definition of Done

- [ ] Checklist registrado en el PR.

---

### TASK-PB-P0-018-US-139-QA-001 — Canario positivo (sin drift, migración aplica, smoke verde)

| Field | Value |
|---|---|
| Area | QA / Testing |
| Type | Test |
| Priority | Must |
| Estimate | S |
| Depends On | OPS-002 |
| Source AC(s) | AC-01..03 |
| Technical Spec Section(s) | §13 (CI Checks) |
| Backlog ID | PB-P0-018 |
| User Story ID | US-139 |
| Owner Role | QA / DevOps |
| Status | To Do |

#### Objective

Abrir un PR sin cambios en `prisma/` y verificar que `migrations-validate` pasa verde dentro del timeout.

#### Definition of Done

- [ ] Logs anexados al PR.

---

### TASK-PB-P0-018-US-139-QA-002 — Canario negativo: drift en PR

| Field | Value |
|---|---|
| Area | QA / Testing |
| Type | Test |
| Priority | Must |
| Estimate | S |
| Depends On | QA-001 |
| Source AC(s) | AC-01, AC-08 |
| Technical Spec Section(s) | §13 |
| Backlog ID | PB-P0-018 |
| User Story ID | US-139 |
| Owner Role | QA |
| Status | To Do |

#### Objective

Modificar `schema.prisma` sin generar migración y abrir PR; verificar que el job falla con el mensaje guía hacia `prisma migrate dev`.

#### Definition of Done

- [ ] Evidencia (logs) anexada al PR principal.

---

### TASK-PB-P0-018-US-139-QA-003 — Canario negativo: migración inválida

| Field | Value |
|---|---|
| Area | QA / Testing |
| Type | Test |
| Priority | Must |
| Estimate | S |
| Depends On | QA-001 |
| Source AC(s) | AC-02 |
| Technical Spec Section(s) | §13, §17 |
| Backlog ID | PB-P0-018 |
| User Story ID | US-139 |
| Owner Role | QA |
| Status | To Do |

#### Objective

Introducir una migración con SQL inválido (en branch canario) y verificar que `migrate deploy` falla y bloquea el merge.

#### Definition of Done

- [ ] Logs anexados al PR principal.

---

### TASK-PB-P0-018-US-139-DOC-001 — Sección "Migraciones / Rollback" en `README`/`CONTRIBUTING`

| Field | Value |
|---|---|
| Area | Documentation / Traceability |
| Type | Documentation |
| Priority | Must |
| Estimate | S |
| Depends On | OPS-002, OPS-003 |
| Source AC(s) | AC-06, EC-02, EC-03 |
| Technical Spec Section(s) | §18, §19 |
| Backlog ID | PB-P0-018 |
| User Story ID | US-139 |
| Owner Role | DevOps / DB |
| Status | To Do |

#### Objective

Documentar política forward-only, cómo crear una migración correctiva, multi-step para NOT NULL / índices grandes (Doc 18 §28.2), prohibición de `prisma migrate reset` en CI/QA/Demo y comandos locales (`npx prisma migrate dev`).

#### Definition of Done

- [ ] `README`/`CONTRIBUTING` actualizado y aprobado en code review.

---

### TASK-PB-P0-018-US-139-DOC-002 — PR template referenciando checklist Doc 18 §28.5

| Field | Value |
|---|---|
| Area | Documentation / Traceability |
| Type | Documentation |
| Priority | Must |
| Estimate | XS |
| Depends On | DOC-001 |
| Source AC(s) | AC-07 |
| Technical Spec Section(s) | §18 |
| Backlog ID | PB-P0-018 |
| User Story ID | US-139 |
| Owner Role | DevOps |
| Status | To Do |

#### Objective

Crear/ampliar `.github/pull_request_template.md` con una sección condicional para cambios en `prisma/` que referencie la checklist Doc 18 §28.5 (backward-compat, backfill, constraints sobre datos existentes, índices `CONCURRENTLY`, tests de integración, actualización de docs).

#### Definition of Done

- [ ] PR template creado/ampliado.

---

## 7. Required QA Tasks

| Task ID | Test Type | Purpose |
|---|---|---|
| TASK-PB-P0-018-US-139-QA-001 | Canario positivo | Validar `migrations-validate` verde sin drift. |
| TASK-PB-P0-018-US-139-QA-002 | Canario negativo (drift) | Validar bloqueo y mensaje guía. |
| TASK-PB-P0-018-US-139-QA-003 | Canario negativo (migración inválida) | Validar bloqueo en `migrate deploy`. |

---

## 8. Required Security Tasks

| Task ID | Security Concern | Purpose |
|---|---|---|
| TASK-PB-P0-018-US-139-SEC-001 | Masking, `migrate reset`, permisos, pinning | Cumplir SEC-01..05 y VR-02. |

---

## 9. Required Seed / Demo Tasks

`No aplica`.

---

## 10. Observability / Audit Tasks

`No aplica`. Logs de Actions son la evidencia operativa.

---

## 11. Documentation / Traceability Tasks

| Task ID | Document / Artifact | Purpose |
|---|---|---|
| TASK-PB-P0-018-US-139-DOC-001 | `README`/`CONTRIBUTING` | Política forward-only + multi-step + comandos locales. |
| TASK-PB-P0-018-US-139-DOC-002 | `.github/pull_request_template.md` | Checklist Doc 18 §28.5 para PRs con `prisma/` modificado. |

---

## 12. Dependency Graph

```mermaid
flowchart TD
  BE001[BE-001 test:integration:smoke] --> OPS002[OPS-002 steps drift + apply + smoke]
  DB001[DB-001 Postgres pinning] --> OPS001[OPS-001 job migrations-validate skeleton]
  OPS001 --> OPS002
  OPS002 --> OPS003[OPS-003 composite action prisma-migrate]
  OPS001 --> OPS004[OPS-004 pinning actions/*]
  OPS002 --> OPS004
  OPS003 --> OPS004
  OPS002 --> SEC001[SEC-001 YAML review]
  OPS003 --> SEC001
  OPS004 --> SEC001
  OPS002 --> QA001[QA-001 canary positive]
  QA001 --> QA002[QA-002 canary drift]
  QA001 --> QA003[QA-003 canary invalid migration]
  OPS002 --> DOC001[DOC-001 README rollback]
  OPS003 --> DOC001
  DOC001 --> DOC002[DOC-002 PR template]
```

---

## 13. Suggested Implementation Order

### Phase 1 — Foundation

* BE-001 (`test:integration:smoke`).
* DB-001 (pinning Postgres).

### Phase 2 — Core Implementation

* OPS-001 (esqueleto job).
* OPS-002 (steps drift + apply + smoke).
* OPS-003 (composite action).
* OPS-004 (pinning `actions/*`).

### Phase 3 — Validation / Security / QA

* SEC-001 (review YAML).
* QA-001 (canario positivo), QA-002 (drift), QA-003 (migración inválida).

### Phase 4 — Documentation / Review

* DOC-001 (README rollback).
* DOC-002 (PR template).
* Code review + Tech Lead + DB Lead + Security review cuando aplique.

---

## 14. Risks & Mitigations

| Risk | Impact | Mitigation | Related Task |
| ---- | ------ | ---------- | ------------ |
| Postgres service container no arranca | Job rojo recurrente | Pinning + healthcheck (DB-001) | DB-001, OPS-001 |
| `test:integration:smoke` no existe en backend | AC-03 sin script | BE-001 confirma/crea reusando US-125 | BE-001 |
| Falta `DATABASE_URL` o mal mapeo al service | Apply falla | Check previo + URL determinística | OPS-002 |
| Drift por cambios manuales en QA/Demo | Drift recurrente futuro | Documentación `db pull` + migración correctiva (DOC-001) | DOC-001 |
| `prisma migrate reset` introducido por copy-paste | Pérdida de datos | SEC-001 + grep en code review | SEC-001 |
| Migración costosa supera timeout | Job rojo intermitente | `timeout-minutes: 15` + guía CONCURRENTLY/multi-step | OPS-002, DOC-001 |

---

## 15. Out of Scope Confirmation

No se implementará como parte de esta User Story:

* `main.yml`/`staging.yml` y deploy real (PB-P2-023..026).
* Push a ECR y configuración OIDC (PB-P2-023).
* Snapshots automáticos de RDS antes de migrar.
* `prisma migrate reset` en CI/QA/Demo (prohibido).
* Rollback automático del deploy backend.
* `seed-reset.yml` y notificaciones.
* Dashboards de drift / observabilidad avanzada.

---

## 16. Readiness for Sprint Planning

| Check                                      | Status |
| ------------------------------------------ | ------ |
| Product Backlog mapping found              | Pass   |
| Every AC maps to tasks                     | Pass   |
| Technical Spec used when available         | Pass   |
| QA tasks included                          | Pass   |
| Security tasks included if applicable      | Pass   |
| Seed/demo tasks included if applicable     | N/A    |
| Observability tasks included if applicable | N/A    |
| Documentation tasks included if applicable | Pass   |
| Task dependencies clear                    | Pass   |
| Tasks small enough                         | Pass (XS/S/M) |
| Ready for Sprint Planning                  | Yes    |

---

## 17. Final Recommendation

`Ready for Sprint Planning`.

12 tareas atómicas (XS/S/M) cubren los 8 AC y 5 EC, respetando Foundation → Implementation → Validation → Documentation. Decisiones apoyadas en ADR-DB-001/DEVOPS-001/TEST-001 y Doc 18 §28 / Doc 21 §§16–18. Recomendado ejecutar después de US-134 (que entrega `pr.yml`) y antes de PB-P2-023..026 (que invocará la composite action).
