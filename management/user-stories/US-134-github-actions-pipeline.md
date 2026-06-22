# 🧾 User Story: Pipeline GitHub Actions de CI (lint / typecheck / tests / build)

## 🆔 Metadata

| Field              | Value                                       |
| ------------------ | ------------------------------------------- |
| ID                 | US-134                                      |
| Epic               | EPIC-OPS-001 — Deployment & DevOps on AWS   |
| Backlog Item       | PB-P0-017 — GitHub Actions CI Pipeline (lint/test/build) |
| Feature            | CI quality gates (foundation)               |
| Module / Domain    | DevOps                                      |
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
**I want** un workflow de GitHub Actions (`pr.yml`) que ejecute **lint, typecheck, tests unit/integration y build** del backend (Docker) y frontend (Next.js) en cada Pull Request a `main`/`qa`, con cache de dependencias y bloqueo de merge cuando algún job falla,
**So that** se detecten regresiones antes del merge y se construya la base sobre la que P2 (PB-P2-023..026) cableará el deploy a AWS App Runner y Amplify.

---

## 🧠 Business Context

### Context Summary

Doc 21 §16 define tres workflows: `pr.yml` (quality gates), `main.yml` y `staging.yml` (deploy). Esta historia entrega únicamente **`pr.yml`** — el bloque de quality gates sin deploy — porque PB-P0-017 acota su alcance a "lint + typecheck + tests + build" y deja deploy a App Runner/Amplify y push a ECR explícitamente para PB-P2-023..026. Es la primera pieza CI/CD del MVP y consume los scripts npm definidos por US-125 (Vitest/Supertest/Playwright/MSW) y la imagen Docker de US-133.

### Related Domain Concepts

* Quality gates (Doc 21 §17).
* Branch protection en `main` (Doc 21 §16.3).
* Cache de dependencias `actions/cache` o `cache: 'npm'` (Doc 21 §16.3).
* Cancel-in-progress en PRs.
* GitHub Actions con permisos mínimos (`contents: read`, `id-token: write` reservado para deploys futuros).

### Assumptions

* PB-P0-002 (scaffold backend) expone `npm run lint`, `npm run typecheck`, `npm run build`.
* PB-P0-012 (scaffold frontend) expone los mismos scripts.
* PB-P0-015 (US-125) ya entrega `npm test`, `npm run test:e2e` y `npm run test:ci`.
* PB-P0-016 (US-133) ya entrega `Dockerfile` listo para `docker build`.
* Repositorio en GitHub con permisos para crear workflows; branch protection puede configurarse manualmente por el repo admin.

### Dependencies

* PB-P0-002 — Backend Modular Monolith Bootstrap.
* PB-P0-012 — Frontend Next.js Bootstrap & i18n.
* PB-P0-015 (US-125) — QA Tooling Setup.
* PB-P0-016 (US-133) — Dockerfile Backend.
* ADR-DEVOPS-001 — AWS para deploy MVP (CI/CD GitHub Actions).
* Doc 21 §§16–17 — CI/CD strategy y Quality gates.

---

## ✅ PO/BA Decisions Applied

| Decisión                                                                                                                          | Fuente                |
| --------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| CI/CD se implementa con **GitHub Actions**.                                                                                        | ADR-DEVOPS-001 / Doc 21 §16 |
| Esta historia entrega únicamente el workflow `pr.yml` (quality gates).                                                              | PB-P0-017 Acceptance & Notes |
| Deploy a App Runner, push a ECR y triggers de Amplify se entregan en PB-P2-023..026.                                                | PB-P0-017 Notes / Doc 21 §16 |
| Quality gates obligatorios en este PR: lint, typecheck, tests unit/integration backend y frontend, build backend (Docker) y build frontend (`next build`). | Doc 21 §17, PB-P0-017 Acceptance |
| `prisma migrate diff` y validación de migraciones se incorporan en PB-P0-018 (no aquí).                                              | PB-P0-018, Doc 21 §17 |
| E2E Playwright en CI queda como opcional/futuro; la suite E2E completa se entrega en PB-P2-016.                                     | Doc 21 §17 (opcional), PB-P2-016 |
| Branch protection del repo se documenta como recomendación; su activación es responsabilidad del repo admin, no automatizable por el workflow. | Doc 21 §16.3 |

---

## 🔗 Traceability

| Source                 | Reference                                                                  |
| ---------------------- | -------------------------------------------------------------------------- |
| Backlog Item           | PB-P0-017 — GitHub Actions CI Pipeline (lint/test/build)                   |
| FRD Requirement(s)     | Transversal — no implementa directamente un FR; habilita quality gates.    |
| Use Case(s)            | Transversal — no implementa directamente un UC.                             |
| Business Rule(s)       | Transversal.                                                                |
| Permission Rule(s)     | No aplica runtime; permisos del workflow `contents: read`.                  |
| Data Entity / Entities | No aplica.                                                                  |
| API Endpoint(s)        | No aplica.                                                                  |
| NFR Reference(s)       | NFR-TEST-* (Doc 10), NFR-OBS-001 (logs CI legibles), NFR-PERF-API-001 (build razonable). |
| Related ADR(s)         | ADR-DEVOPS-001, ADR-TEST-001, ADR-TEST-002                                  |
| Related Document(s)    | Doc 21 §§16–17, Doc 20 (Testing Strategy), Doc 22 (ADRs)                    |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope (P0 Foundation DevOps).
* MVP Relevance: Must Have.

### Explicitly Out of Scope

* `main.yml` y `staging.yml` (deploys a App Runner / Amplify) — PB-P2-023..026.
* Push de imagen a Amazon ECR — PB-P2-023.
* Configuración OIDC entre GitHub y AWS — PB-P2-023 (se reserva el campo `id-token: write` sin usar).
* `prisma migrate diff` / migrations validation — PB-P0-018.
* `seed-reset.yml` y `smoke.yml` post-deploy — PB-P2-026 / opcional futuro.
* E2E completo de Playwright en CI — PB-P2-016 (E2E del flujo demo); aquí solo se permite invocar `npm test` (que ya cubre los 3 niveles a nivel de humo via US-125 `test:ci`).
* Notificaciones (Slack, email) — futuro.
* Visual regression, mutation testing, security scan automatizado — futuro.
* Activación de branch protection (decisión del repo admin; se documenta como recomendación).
* Self-hosted runners — usamos hosted Linux.

### Scope Notes

* Esta historia entrega un único workflow `pr.yml` y, opcionalmente, un workflow disparable manualmente para validar el mismo conjunto de jobs.
* Las versiones de Node y los gestores de paquetes (npm o pnpm) se toman del scaffold.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Workflow `pr.yml` se ejecuta en PRs a `main` y `qa`

**Given** un PR abierto contra `main` (o `qa`)
**When** GitHub recibe el evento
**Then** se dispara `.github/workflows/pr.yml`, visible en la pestaña Checks del PR.

### AC-02: Job de lint backend y frontend verde

**Given** el workflow corriendo
**When** se ejecuta el job de lint
**Then** corre `npm run lint` (o equivalente del scaffold) en backend y frontend, y el job termina con código 0; cualquier error de lint bloquea el merge.

### AC-03: Job de typecheck backend y frontend verde

**Given** el workflow corriendo
**When** se ejecuta el job de typecheck
**Then** corre `tsc --noEmit` (o `npm run typecheck`) en backend y frontend; errores de tipos bloquean el merge.

### AC-04: Job de tests unit/integration backend y frontend verde

**Given** el workflow corriendo
**When** se ejecuta el job de tests
**Then** corre `npm test` (Vitest) en backend y frontend; ambas suites pasan; el job se reporta como obligatorio. La invocación de Playwright queda opcional/no-bloqueante para esta historia.

### AC-05: Build backend (Docker) verde

**Given** el `Dockerfile` entregado por US-133
**When** se ejecuta el job de build backend
**Then** corre `docker build -t eventflow-backend:ci .` con BuildKit habilitado y la imagen se construye sin warnings ni errores. **No se hace push a ningún registro.**

### AC-06: Build frontend (`next build`) verde

**Given** el frontend con scaffold (PB-P0-012)
**When** se ejecuta el job de build frontend
**Then** corre `npm run build` (`next build`) y termina con código 0; los artefactos no se publican en esta historia.

### AC-07: Cache de dependencias activo

**Given** el workflow corriendo dos veces seguidas sobre el mismo lockfile
**When** se inspeccionan los logs
**Then** el segundo run reutiliza la caché de dependencias (`cache: 'npm'` en `setup-node`, o `actions/cache` con clave por hash de `package-lock.json` / `pnpm-lock.yaml`), reduciendo el tiempo del job de install.

### AC-08: Estado visible en checks y bloqueo de merge

**Given** un PR con un job fallando
**When** el reviewer intenta mergear
**Then** GitHub muestra el job como `Failed` en Checks; el merge se bloquea si la rama tiene branch protection con `Required status checks` configurado. La configuración de branch protection se documenta como recomendación operacional.

### AC-09: Cancel-in-progress y permisos mínimos

**Given** un nuevo push al mismo PR
**When** ya hay un run anterior en curso
**Then** el workflow lo cancela vía `concurrency: { group: <pr-${{ github.ref }}>, cancel-in-progress: true }`. El workflow declara `permissions: { contents: read }` por defecto.

### AC-10: Workflow corre en runners Linux y termina en tiempo razonable

**Given** runners hosted `ubuntu-latest`
**When** el workflow se ejecuta sobre un repo de tamaño actual
**Then** el wall-clock total se mantiene en un orden razonable para MVP (referencia: ≤15 min con cache cálida).

---

## ⚠️ Edge Cases

### EC-01: Lockfile desactualizado o ausente

**Given** un PR sin `package-lock.json`/`pnpm-lock.yaml` actualizado
**When** corre el job de install
**Then** falla rápido con mensaje claro (`npm ci` exige lockfile presente y coherente); el job termina rojo sin enmascarar el error.

#### Handling

* Mensaje guía hacia `npm ci` y a reinstalar el lockfile localmente.

### EC-02: Tests requieren `DATABASE_URL` o servicios externos

**Given** un job de tests que invoca la suite de integración backend
**When** corre en CI sin Postgres efímero configurado
**Then** la suite unit pasa y la integración se skippea con warning explícito (consistente con US-125 BE-002), sin marcar el job como verde si las suites unit/API fallan.

#### Handling

* Convención de skip de integración cuando `DATABASE_URL` no está; documentado en `README` por US-125.

### EC-03: Build backend Docker falla por contexto pesado

**Given** el contexto del `docker build` contiene `node_modules` o `coverage`
**When** corre el job de build
**Then** el `.dockerignore` entregado por US-133 excluye los paths; si aun así falla por contexto, el log debe señalar el path conflictivo.

#### Handling

* Reusar `.dockerignore` de US-133.

### EC-04: Secretos referenciados pero no definidos

**Given** un step que referencia `${{ secrets.NOMBRE }}` no configurado en el repo
**When** corre el job
**Then** el workflow falla con mensaje claro indicando el secret faltante; ningún secret se imprime en logs.

#### Handling

* `pr.yml` para quality gates **no requiere secretos** (la imagen no se publica). Si se agrega algún secret futuro, validar con un step previo `if [ -z "$VAR" ]; then echo "missing secret"; exit 1; fi`.

### EC-05: Cache corrupto

**Given** un cache con entradas inválidas
**When** la restauración falla
**Then** el job no debe quedarse colgado: continúa instalando desde registry; en el siguiente run la caché se reconstruye por nueva clave de hash.

---

## 🚫 Validation Rules

| ID    | Rule                                                                                            | Message / Behavior                                                |
| ----- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| VR-01 | `.github/workflows/pr.yml` debe existir y ser parseable por GitHub Actions.                      | Fail-fast en CI/syntax check.                                     |
| VR-02 | El workflow debe declarar `permissions: contents: read` como default; ningún job sin justificación puede pedir más permisos. | Fail-fast en code review.                                          |
| VR-03 | Todos los jobs obligatorios deben aparecer como Required en branch protection (recomendación documentada). | No bloqueante en CI; cubre AC-08.                                  |
| VR-04 | `pr.yml` **no** debe hacer push a registros ni invocar credenciales de cloud.                    | Fail-fast en code review.                                          |
| VR-05 | El workflow debe usar versiones pinneadas de `actions/*` (al menos por major, ej. `actions/checkout@v4`). | Fail-fast en code review.                                          |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                      |
| ------ | --------------------------------------------------------------------------------------------------------- |
| SEC-01 | Workflow declara `permissions: contents: read` por defecto (Doc 21 §19 / §20).                              |
| SEC-02 | Sin secretos de cloud (AWS keys) en este workflow; OIDC y deploys se introducen en PB-P2-023..026.          |
| SEC-03 | Ningún step debe imprimir secretos en logs; usar `::add-mask::` cuando sea inevitable.                      |
| SEC-04 | Pinning de versiones de `actions/*` por major mínimo (ideal: pin por SHA si Tech Lead lo solicita).         |
| SEC-05 | `pull_request_target` **no** se utiliza; sólo `pull_request` y `push` controlados (evitar ejecución de PR externos con secretos). |

### Negative Authorization Scenarios

* Workflow que pide `id-token: write` sin razón → bloqueo PR.
* Workflow que usa `pull_request_target` con checkout de PR externo → bloqueo PR.
* Workflow que imprime variables que parecen secretos → bloqueo PR.

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

* Use el script `npm run lint`, `npm run typecheck` (o `tsc --noEmit`), `npm test`, `npm run build` (`next build`) provistos por PB-P0-012 y US-125.

### Backend

* Use Case / Service: Capacidad técnica.
* Controller / Route: N/A.
* Authorization Policy: N/A runtime.
* Validation: N/A.
* Transaction Required: N/A.
* Use scripts `npm run lint`, `npm run typecheck`, `npm test`, y `docker build` (sobre el `Dockerfile` de US-133) provistos por PB-P0-002 y US-125/US-133.

### Database

* Main Tables: —
* Constraints: N/A.
* Index Considerations: N/A.
* Nota: validación de migraciones Prisma en CI se entrega en PB-P0-018.

### API

| Method | Endpoint   | Purpose             |
| ------ | ---------- | ------------------- |
| N/A    | N/A        | No aplica.           |

### Observability / Audit

* Correlation ID: N/A.
* Log Event: Logs de Actions visibles en UI de GitHub; cada step debe imprimir comandos ejecutados.
* AdminAction: No.
* AIRecommendation: No.

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                                  | Type             |
| ----- | ----------------------------------------------------------------------------------------- | ---------------- |
| TS-01 | PR abierto a `main` dispara `pr.yml`.                                                      | CI workflow      |
| TS-02 | Lint backend + frontend verde en PR canario.                                              | Quality gate     |
| TS-03 | Typecheck backend + frontend verde en PR canario.                                         | Quality gate     |
| TS-04 | `npm test` backend + frontend verde en PR canario.                                        | Quality gate     |
| TS-05 | `docker build` verde en PR canario.                                                       | Build            |
| TS-06 | `next build` verde en PR canario.                                                         | Build            |
| TS-07 | Re-run del mismo PR reutiliza caché y reduce tiempo de install.                            | Cache validation |

### Negative Tests

| ID    | Scenario                                                                          | Expected Result                                                         |
| ----- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| NT-01 | Introducir error de lint deliberado en PR canario.                                 | Job de lint falla; merge bloqueado (con branch protection).             |
| NT-02 | Introducir error de tipos.                                                        | Job de typecheck falla.                                                  |
| NT-03 | Romper un test unit.                                                               | Job de tests falla.                                                      |
| NT-04 | Modificar `Dockerfile` para introducir un comando inválido.                        | Job de build backend falla.                                              |
| NT-05 | Romper `next build`.                                                              | Job de build frontend falla.                                             |
| NT-06 | Push consecutivo al mismo PR.                                                     | El run anterior se cancela (`cancel-in-progress`).                       |
| NT-07 | Workflow referencia `${{ secrets.NOMBRE }}` no definido.                          | El job falla con mensaje claro sin imprimir secretos.                    |

### AI Tests

No aplica — esta historia no invoca IA directamente.

### Authorization Tests

| ID         | Scenario                                                                                  | Expected Result |
| ---------- | ----------------------------------------------------------------------------------------- | --------------- |
| AUTH-TS-01 | Inspección del YAML: `permissions: contents: read` declarado.                              | Pass.            |
| AUTH-TS-02 | Inspección del YAML: no se usa `pull_request_target`.                                      | Pass.            |
| AUTH-TS-03 | Inspección del YAML: no hay credenciales de AWS ni push a ECR.                              | Pass.            |

### Accessibility Tests

No aplica.

---

## 📊 Business Impact

| Field               | Value                                                                                                                |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| KPI Affected        | Tiempo a merge, escape rate de bugs, time-to-deploy futuro.                                                            |
| Expected Impact     | Bloquea regresiones antes de merge; base obligatoria para deploys de PB-P2-023..026.                                  |
| Success Criteria    | PR canario con error deliberado se bloquea; PR limpio se vuelve verde; cache reutilizada en run sucesivo.              |
| Academic Demo Value | Foundation — evidencia de quality gates y prácticas DevOps alineadas con ADR-DEVOPS-001.                              |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Confirmar scripts npm `lint`, `typecheck`, `build` en frontend.

### Potential Backend Tasks

* Confirmar scripts npm `lint`, `typecheck`, `build` y disponibilidad del `Dockerfile`.

### Potential Database Tasks

* No aplica (PB-P0-018 cubre validación de migraciones).

### Potential AI / PromptOps Tasks

* No aplica.

### Potential QA Tasks

* PR canario que demuestra cada quality gate funciona (positivo/negativo).
* Verificación de cache.

### Potential DevOps / Config Tasks

* Crear `.github/workflows/pr.yml` con jobs: install, lint, typecheck, test (backend + frontend), build-backend (docker), build-frontend (next).
* Configurar `concurrency` y `permissions`.
* Documentar branch protection recomendada en `README` / `CONTRIBUTING`.

---

## ✅ Definition of Ready

* [x] Rol claro (System).
* [x] Goal técnico claro y acotado a `pr.yml` (sin deploy).
* [x] Referencias a Docs (21 §§16–17) y ADR-DEVOPS-001 / ADR-TEST-*.
* [x] Permisos / Seguridad explicitados (SEC-01..05).
* [x] Entidades listadas (No aplica).
* [x] AC en GWT (10 AC específicos al workflow).
* [x] Edge cases documentados (5).
* [x] Validación clara (5 reglas).
* [x] Out of Scope explícito (deploy, OIDC, ECR, migraciones, E2E completo, notifs, security scan).
* [x] Dependencias conocidas (PB-P0-002, PB-P0-012, PB-P0-015, PB-P0-016).
* [x] UX states marcados N/A.
* [x] API marcada N/A.
* [x] Tests definidos por verificación canaria.
* [ ] Tech Lead validó (gate de aprobación formal).

---

## 🏁 Definition of Done

* [ ] `.github/workflows/pr.yml` presente y parseable.
* [ ] PR canario muestra todos los jobs obligatorios verdes.
* [ ] PR canario con error deliberado bloquea el merge en cada quality gate (lint, typecheck, test, build).
* [ ] Cache de dependencias activa y validada.
* [ ] `cancel-in-progress` activo.
* [ ] `permissions: contents: read` por defecto.
* [ ] Sin secretos de cloud ni `pull_request_target`.
* [ ] Documentación en `README`/`CONTRIBUTING` sobre branch protection recomendada y troubleshooting.
* [ ] PR revisado por Tech Lead y, si aplica, Security Lead.

---

## 📝 Notes

* El título original mencionaba "lint/test/build/**deploy**". El alcance MVP de PB-P0-017 excluye deploy (Doc 21 §16 + Notes PB-P0-017); deploy queda para PB-P2-023..026.
* `prisma migrate diff` se cubre en PB-P0-018, no aquí, para mantener atomicidad.
* Si Tech Lead lo solicita, considerar pinning de `actions/*` por SHA (decisión técnica menor, no bloqueante).
* La activación de branch protection no es automatizable desde el workflow; queda como recomendación operativa documentada.
