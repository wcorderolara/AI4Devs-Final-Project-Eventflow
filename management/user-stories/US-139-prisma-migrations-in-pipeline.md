# 🧾 User Story: Migraciones Prisma ejecutadas automáticamente en CI/CD

## 🆔 Metadata

| Field              | Value                                       |
| ------------------ | ------------------------------------------- |
| ID                 | US-139                                      |
| Epic               | EPIC-OPS-001 — Deployment & DevOps on AWS   |
| Backlog Item       | PB-P0-018 — Prisma Migrations en Pipeline   |
| Feature            | Migrations CI/CD (foundation)               |
| Module / Domain    | DevOps / DB                                 |
| User Role          | System                                      |
| Priority           | Must Have (P0)                              |
| Status             | Approved                                    |
| Owner              | Product Owner / Business Analyst            |
| Approved By        | PO/BA Review                                |
| Approval Date      | 2026-06-22                                  |
| Ready for Development Tasks | Yes                                |
| Sprint / Milestone | MVP — P0 Foundation                         |
| Created Date       | 2026-06-09                                  |
| Last Updated       | 2026-06-22                                  |

---

## 🎯 User Story

**As the** equipo plataforma/DevOps de EventFlow,
**I want** que el pipeline de CI/CD valide migraciones Prisma en cada PR (drift detection con `prisma migrate diff`) y aplique `prisma migrate deploy` automáticamente antes de servir tráfico nuevo en CI/QA/Demo,
**So that** todos los entornos compartan el mismo esquema sin intervención manual, el drift entre `schema.prisma` y la base se detecte antes del merge, y el rollback siga la política forward-only documentada en Doc 18 §28.

---

## 🧠 Business Context

### Context Summary

Doc 21 §16/§17 incluye dos quality gates relacionados con migraciones: (a) validación en PRs (`prisma migrate diff` / `deploy --create-only`) y (b) aplicación de `prisma migrate deploy` antes de servir tráfico nuevo (paso previo al deploy en App Runner/Amplify). Doc 18 §28 fija la política forward-only sin rollback automático en producción y describe la checklist obligatoria por migración. Esta historia entrega ambos gates en el workflow CI: el gate de PR (drift detection) hoy, y la mecánica de `migrate deploy` lista para que PB-P2-023..026 la cablee al deploy real cuando se introduzcan los workflows `main.yml`/`staging.yml`.

### Related Domain Concepts

* Migraciones forward-only (Doc 18 §28.4).
* Drift detection (`prisma migrate diff --exit-code`) (Doc 22 §ADR-DB-001 / Doc 21 §17).
* Checklist por migración (Doc 18 §28.5).
* `migrate deploy` antes de servir tráfico nuevo (Doc 21 §18 / §16.2).
* `DATABASE_URL` desde Secrets Manager / SSM (Doc 21 §10.5 / §14.3).

### Assumptions

* PB-P0-001 (Database Schema, Migrations & Constraints) entrega `schema.prisma`, carpeta `prisma/migrations/` y migración baseline.
* PB-P0-017 (US-134) entrega `pr.yml` extensible con jobs adicionales.
* RDS / Postgres del entorno objetivo está disponible y la `DATABASE_URL` correspondiente es accesible (en CI: contenedor efímero; en QA/Demo: secret del entorno cuando se conecte).
* Prisma 5.x (ADR vigente; Doc 22 §ORM).

### Dependencies

* PB-P0-001 — Database Schema, Migrations & Constraints.
* PB-P0-017 (US-134) — GitHub Actions CI Pipeline (`pr.yml`).
* ADR-DB-001 — PostgreSQL.
* ADR-DEVOPS-001 — AWS / GitHub Actions.
* Doc 18 §28 — Migration strategy.
* Doc 21 §§16–18 — CI/CD workflows + quality gates + migration application.

---

## ✅ PO/BA Decisions Applied

| Decisión                                                                                                                                                       | Fuente                              |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Las migraciones son **forward-only** en producción; el rollback se aborda con migración correctiva (forward).                                                    | Doc 18 §28.4                        |
| `prisma migrate reset` se permite **solo en local/dev**, nunca en CI/QA/Demo.                                                                                  | Doc 18 §28.4                        |
| En PR a `main`/`qa`, el pipeline ejecuta `prisma migrate diff --exit-code` contra el estado esperado para detectar drift y bloquear el merge.                  | Doc 21 §17 / Doc 22 §ADR-DB-001     |
| `prisma migrate deploy` se ejecuta automáticamente antes de servir tráfico nuevo en CI/QA/Demo; el wiring concreto a App Runner se completa en PB-P2-023..026. | Doc 21 §16.2 / §18.2 / PB-P0-018 Acceptance |
| Tests post-migración (smoke de integración) verifican que la app sigue arrancando contra la base migrada.                                                       | PB-P0-018 Acceptance                |
| `DATABASE_URL` siempre se obtiene de secrets de GitHub Actions (mapeados a Secrets Manager / SSM en runtime); jamás hardcodeada.                                | Doc 21 §10.5 / §14.3                |
| Esta historia entrega los **steps de migraciones** en CI; el wiring al deploy real de App Runner queda en PB-P2-023..026.                                       | PB-P0-018 Notes                     |

---

## 🔗 Traceability

| Source                 | Reference                                                                  |
| ---------------------- | -------------------------------------------------------------------------- |
| Backlog Item           | PB-P0-018 — Prisma Migrations en Pipeline                                  |
| FRD Requirement(s)     | Transversal — no implementa directamente un FR; habilita integridad de schema. |
| Use Case(s)            | Transversal.                                                                |
| Business Rule(s)       | Transversal.                                                                |
| Permission Rule(s)     | No aplica runtime; permisos del workflow `contents: read` + acceso a `DATABASE_URL` via secrets. |
| Data Entity / Entities | Todas las entidades existentes; no se modela ninguna nueva.                |
| API Endpoint(s)        | No aplica.                                                                  |
| NFR Reference(s)       | NFR-DATA-001 (integridad), NFR-OBS-001 (logs migración), NFR-PERF-API-001 (cold deploy razonable). |
| Related ADR(s)         | ADR-DB-001, ADR-DEVOPS-001, ADR-TEST-001                                    |
| Related Document(s)    | Doc 18 §§28.1–28.5, Doc 21 §§16–18, Doc 22 §ADR-DB-001                       |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope (P0 Foundation DevOps/DB).
* MVP Relevance: Must Have.

### Explicitly Out of Scope

* Wiring real del deploy (App Runner / Amplify / push a ECR) — PB-P2-023..026.
* Configuración OIDC GitHub ↔ AWS — PB-P2-023.
* Snapshots automáticos de RDS antes de migrar — futuro (Doc 21 §11.4 menciona habilitar backups automáticos pero no automatiza pre-migration snapshot en MVP).
* Migraciones **down** automáticas en producción (política forward-only, Doc 18 §28.4).
* Rollback automático del deploy backend — fuera de scope; Doc 21 §16.4 documenta evaluación manual.
* `seed-reset.yml` (PB-P2-026).
* Tests E2E del flujo demo (PB-P2-016).
* Notificaciones (Slack/email).
* Dashboards de drift / observabilidad avanzada de migraciones.

### Scope Notes

* La historia añade jobs al workflow ya entregado por US-134 (`pr.yml`) y deja documentado el step de `migrate deploy` (incluido en el workflow como job condicional o como step claro listo para reuso en `main.yml`/`staging.yml` cuando existan).
* Cualquier nueva variable o secret se documenta en `README`/`CONTRIBUTING`.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Drift check en PR con `prisma migrate diff`

**Given** un PR a `main` o `qa`
**When** se ejecuta el job `migrations-validate` del workflow CI
**Then** corre `prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-migrations prisma/migrations --exit-code` (o equivalente acordado) y falla el job si detecta drift entre el `schema.prisma` y las migraciones aplicadas.

### AC-02: Validación de que la migración aplica limpiamente

**Given** un PR que agrega/modifica migraciones
**When** se ejecuta el job
**Then** se levanta una Postgres efímera en el runner (contenedor service), se ejecuta `prisma migrate deploy` contra ella y termina con código 0; cualquier migración que no aplique bloquea el merge.

### AC-03: Smoke post-migración

**Given** una migración recién aplicada en la Postgres efímera del runner
**When** el job ejecuta `npm test` (o un subset declarado como `test:integration:smoke`) que carga el cliente Prisma contra la base migrada
**Then** la app puede inicializar el cliente Prisma, ejecutar al menos una query mínima y la suite termina verde.

### AC-04: `prisma migrate deploy` reutilizable para CI/QA/Demo

**Given** la estructura del workflow
**When** un workflow futuro (`main.yml`/`staging.yml`) necesite aplicar migraciones antes de servir tráfico
**Then** existe un step parametrizable (composite action local en `.github/actions/prisma-migrate/` o job reusable vía `workflow_call`) que recibe `DATABASE_URL` por input y ejecuta `prisma migrate deploy` con logs claros.

### AC-05: `DATABASE_URL` via GitHub secrets

**Given** los jobs que requieren acceso a una base
**When** el workflow corre
**Then** `DATABASE_URL` se obtiene de `${{ secrets.* }}` (o se construye desde el contenedor service del runner en PR); ningún valor sensible se loggea (uso de `::add-mask::` cuando aplica).

### AC-06: Rollback documentado (forward-only) en `README`/`CONTRIBUTING`

**Given** la política Doc 18 §28.4
**When** un desarrollador consulta la documentación de migraciones
**Then** encuentra una sección explícita que detalla: la regla forward-only, cuándo y cómo crear una migración correctiva, y la prohibición de `prisma migrate reset` en CI/QA/Demo.

### AC-07: Checklist Doc 18 §28.5 referenciada en PR template

**Given** la apertura de un PR que modifica migraciones
**When** GitHub crea el PR
**Then** el template del PR (o una sección del `CONTRIBUTING`) referencia la checklist de Doc 18 §28.5 (backward-compat, backfill, constraints sobre datos existentes, índices `CONCURRENTLY`, tests de integración, actualización de docs).

### AC-08: El workflow falla con mensaje claro cuando faltan migraciones

**Given** un PR con cambios en `schema.prisma` pero sin migración generada
**When** corre el job de drift
**Then** falla con mensaje guía hacia `npx prisma migrate dev --name <descripcion>` local antes de pushear.

---

## ⚠️ Edge Cases

### EC-01: Postgres efímera no disponible en el runner

**Given** falla la imagen del service container o credenciales mal definidas
**When** se ejecuta el job
**Then** el job falla con mensaje claro indicando el servicio caído (no enmascarar como éxito); ningún job dependiente continúa.

#### Handling

* `services.postgres.image` pinneada por versión (ej. `postgres:16-alpine`) con `options: --health-cmd pg_isready` y reintentos limitados antes de fallar.

### EC-02: Migración con backfill requiere paso multi-step

**Given** una migración que agrega columna NOT NULL (Doc 18 §28.2)
**When** se intenta aplicar con `migrate deploy` sin backfill previo
**Then** el job debe fallar el step de smoke porque queda en estado inválido; el `CONTRIBUTING` documenta el patrón multi-step (nullable + backfill + SET NOT NULL).

### EC-03: Drift por cambio manual en una base ya desplegada

**Given** una base con cambios fuera de Prisma
**When** corre `migrate diff` o `migrate deploy`
**Then** el job falla; mensaje guía hacia `prisma db pull` y migración correctiva (forward).

### EC-04: Migración tarda más del tiempo razonable

**Given** una migración costosa (ej. índice grande sin `CONCURRENTLY`)
**When** se ejecuta en CI sobre Postgres efímera
**Then** el step de migración respeta un timeout (configurable, default razonable, ej. 10–15 min) y falla con mensaje sugerente (revisar índice `CONCURRENTLY`, raw SQL, multi-step).

### EC-05: Variable `DATABASE_URL` ausente

**Given** un job que requiere `DATABASE_URL` y el secret no está configurado en el repo
**When** corre el step
**Then** un check previo (`if [ -z "$DATABASE_URL" ]; then echo "missing"; exit 1; fi`) falla con mensaje claro; sin exponer otros secrets.

---

## 🚫 Validation Rules

| ID    | Rule                                                                                                            | Message / Behavior                                                |
| ----- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| VR-01 | `prisma migrate diff --exit-code` debe ejecutarse en PRs a `main` y `qa`.                                        | Fail-fast del job si retorna no-cero.                              |
| VR-02 | `prisma migrate reset` **nunca** debe aparecer en workflows de CI/QA/Demo.                                       | Bloqueo en code review.                                            |
| VR-03 | El step de `migrate deploy` debe ser parametrizable por `DATABASE_URL`.                                          | Reusabilidad obligatoria para PB-P2-023..026.                       |
| VR-04 | Logs de los steps de migración no deben imprimir `DATABASE_URL` ni `PGPASSWORD`.                                  | Uso de `::add-mask::`.                                              |
| VR-05 | Pinning de la imagen Postgres en el service container (`postgres:16-alpine` u otro acordado con Tech Lead).      | Builds reproducibles.                                               |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                            |
| ------ | --------------------------------------------------------------------------------------------------------------- |
| SEC-01 | `DATABASE_URL` para CI proviene del contenedor service efímero; no se hardcodea ni se loggea.                    |
| SEC-02 | `DATABASE_URL` para QA/Demo proviene de Secrets Manager / SSM y se inyecta vía GitHub secrets (Doc 21 §14.3).    |
| SEC-03 | Cualquier valor sensible se enmascara (`::add-mask::`).                                                          |
| SEC-04 | Permisos del workflow se mantienen mínimos (`contents: read`); `id-token: write` solo se introduce cuando PB-P2-023 cablee OIDC. |
| SEC-05 | `prisma migrate reset` prohibido fuera de local (VR-02).                                                         |

### Negative Authorization Scenarios

* Step que imprime `DATABASE_URL` → bloqueo PR.
* Step que usa `prisma migrate reset` en CI → bloqueo PR.
* Step que usa `pull_request_target` con checkout de PR externo → bloqueo PR.

---

## 🤖 AI Behavior

Esta historia no invoca IA directamente.

### AI Involvement

* AI Feature: None
* Provider Layer: Not applicable
* Human Validation Required: Not applicable
* Persist AIRecommendation: No
* Fallback Required: Not applicable

### AI Input
* No aplica — esta historia no invoca IA directamente.

### AI Output
* No aplica — esta historia no invoca IA directamente.

### Human-in-the-loop Rules
* No aplica — esta historia no invoca IA directamente.

### AI Error / Fallback Behavior
* No aplica — esta historia no invoca IA directamente.

---

## 🎨 UX / UI Notes

No aplica — esta historia no introduce UI.

| Area                | Notes |
| ------------------- | ----- |
| Screen / Route      | N/A   |
| Main UI Pattern     | N/A   |
| Primary Action      | N/A   |
| Secondary Actions   | N/A   |
| Empty State         | N/A   |
| Loading State       | N/A   |
| Error State         | N/A   |
| Success State       | N/A   |
| Accessibility Notes | N/A   |
| Responsive Notes    | N/A   |
| i18n Notes          | N/A   |
| Currency Notes      | N/A   |

---

## 🛠 Technical Notes

### Frontend

* No aplica.

### Backend

* Use Case / Service: Capacidad técnica.
* Controller / Route: N/A.
* Authorization Policy: N/A runtime.
* Validation: N/A.
* Transaction Required: N/A.
* La app no cambia; solo se asegura que la base con la que arranca está al día con `prisma/migrations`.

### Database

* Main Tables: ninguna nueva; afecta operacionalmente a todas las migraciones existentes.
* Constraints: respetar política Doc 18 §28.5 (backward-compat, backfill, `CONCURRENTLY` para índices grandes).
* Index Considerations: índices nuevos sobre tablas grandes deben usar `CREATE INDEX CONCURRENTLY` en raw SQL anexada (Doc 18 §28.2).
* Notas: Postgres efímera del runner usa imagen pinneada (`postgres:16-alpine` u otra acordada con Tech Lead).

### API

| Method | Endpoint   | Purpose             |
| ------ | ---------- | ------------------- |
| N/A    | N/A        | No aplica.           |

### Observability / Audit

* Correlation ID: N/A.
* Log Event: cada step imprime el comando ejecutado, sin valores sensibles.
* AdminAction: No.
* AIRecommendation: No.
* En CI, los logs del job son la evidencia operativa.

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                                  | Type             |
| ----- | ----------------------------------------------------------------------------------------- | ---------------- |
| TS-01 | PR limpio no introduce drift; `migrate diff` retorna 0.                                    | CI / quality gate |
| TS-02 | PR con nueva migración aplica en Postgres efímera con `migrate deploy`.                    | CI / quality gate |
| TS-03 | Smoke `test:integration:smoke` verde contra base migrada.                                   | Integration smoke |
| TS-04 | Composite action / job reusable invocable con `DATABASE_URL` parametrizado.                 | Reusability       |

### Negative Tests

| ID    | Scenario                                                                                                       | Expected Result                                                          |
| ----- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| NT-01 | Cambio en `schema.prisma` sin migración generada.                                                               | `migrate diff` falla con mensaje guía hacia `prisma migrate dev`.         |
| NT-02 | Migración inválida (sintaxis SQL rota).                                                                          | `migrate deploy` falla; job bloquea el merge.                             |
| NT-03 | Step que intenta `prisma migrate reset` en CI.                                                                  | Bloqueo en code review (regla VR-02).                                     |
| NT-04 | `DATABASE_URL` ausente.                                                                                          | Check previo falla con mensaje claro; sin exponer otros secrets.          |
| NT-05 | Postgres service container no arranca.                                                                          | EC-01: job falla rápido con mensaje claro.                                |

### AI Tests

No aplica.

### Authorization Tests

| ID         | Scenario                                                                                  | Expected Result |
| ---------- | ----------------------------------------------------------------------------------------- | --------------- |
| AUTH-TS-01 | Inspección del YAML: `permissions: contents: read` por defecto; no se usa `pull_request_target`. | Pass.            |
| AUTH-TS-02 | Inspección del YAML: ningún step imprime `DATABASE_URL` ni credenciales.                   | Pass.            |
| AUTH-TS-03 | Inspección del YAML: ninguna invocación de `prisma migrate reset`.                          | Pass.            |

### Accessibility Tests

No aplica.

---

## 📊 Business Impact

| Field               | Value                                                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| KPI Affected        | Integridad de schema entre entornos, time-to-deploy, evitar incidentes por drift.                                                   |
| Expected Impact     | Quality gate adicional bloquea PRs con drift; mecanismo listo para `main.yml`/`staging.yml` cuando se conecte App Runner (PB-P2-023..026). |
| Success Criteria    | Drift detectado en canario; `migrate deploy` aplica limpio en Postgres efímera; smoke post-migración verde.                          |
| Academic Demo Value | Foundation — evidencia de buenas prácticas de DB DevOps (forward-only, drift detection, política documentada).                       |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* No aplica.

### Potential Backend Tasks

* Asegurar que existe `npm run test:integration:smoke` (o equivalente) que ejecuta una query mínima — puede vivir como subset del `npm test` actual.
* Confirmar que `npm run prisma:migrate:deploy` (o invocación directa de `npx prisma migrate deploy`) está disponible.

### Potential Database Tasks

* Documentar pinning de Postgres usado en CI.

### Potential AI / PromptOps Tasks

* No aplica.

### Potential QA Tasks

* PR canarios positivo y negativo (con drift y sin drift; migración válida/inválida).

### Potential DevOps / Config Tasks

* Extender `.github/workflows/pr.yml` con job `migrations-validate` que incluya el Postgres service container.
* Crear composite action local `.github/actions/prisma-migrate` (o job reusable vía `workflow_call`) para `migrate deploy`.
* Pinning de imagen Postgres y de `actions/*`.
* PR template / sección `CONTRIBUTING` con checklist Doc 18 §28.5.
* Sección "Migraciones / Rollback" en `README`/`CONTRIBUTING`.

---

## ✅ Definition of Ready

* [x] Rol claro (System / DevOps / DB).
* [x] Goal técnico claro y acotado a quality gate de migraciones en `pr.yml` + step reusable de `migrate deploy`.
* [x] Referencias a Docs (18 §§28.1–28.5, 21 §§16–18) y ADRs (DB-001, DEVOPS-001, TEST-001).
* [x] Permisos / Seguridad explicitados (SEC-01..05).
* [x] Entidades listadas (ninguna nueva).
* [x] AC en GWT (8 AC específicos al pipeline de migraciones).
* [x] Edge cases documentados (5).
* [x] Validación clara (5 reglas).
* [x] Out of Scope explícito (deploy real, OIDC/ECR, snapshots automáticos, rollback automático).
* [x] Dependencias conocidas (PB-P0-001, PB-P0-017).
* [x] UX states marcados N/A.
* [x] API marcada N/A.
* [x] Tests definidos por canario y por inspección YAML.
* [ ] Tech Lead validó.

---

## 🏁 Definition of Done

* [ ] `pr.yml` extendido con job `migrations-validate` (drift + apply + smoke).
* [ ] Composite action local (o `workflow_call`) reusable para `migrate deploy`.
* [ ] PR canario con drift es bloqueado.
* [ ] PR canario con migración válida pasa drift + apply + smoke.
* [ ] Postgres service container pinneado.
* [ ] `permissions: contents: read` mantenido; sin `pull_request_target`.
* [ ] `DATABASE_URL` y otros secretos enmascarados; sin `prisma migrate reset` en CI/QA/Demo.
* [ ] Sección "Migraciones / Rollback" en `README`/`CONTRIBUTING` con política forward-only y checklist Doc 18 §28.5.
* [ ] PR template referencia la checklist cuando se modifica `prisma/`.
* [ ] PR revisado por Tech Lead, DB Lead y Security Lead cuando aplique.

---

## 📝 Notes

* "Migraciones reversibles cuando aplica" en el backlog se interpreta como **forward-correction** (migración correctiva) conforme a Doc 18 §28.4, **no** como `down` automático.
* El wiring real al deploy en App Runner (`main.yml`/`staging.yml`) queda explícitamente en PB-P2-023..026; esta historia solo entrega la mecánica reusable.
* Si en implementación se decide separar `migrations-validate` en un workflow propio (`migrations.yml`), debe seguir respetando `permissions: contents: read` y las reglas SEC.
* Snapshots automáticos de RDS antes de migrar quedan como futuro (Doc 21 §11.4 menciona backups automáticos, no automatización pre-migration en MVP).
