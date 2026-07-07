# 🧾 User Story: Quality gates en GitHub Actions

## 🆔 Metadata

| Field              | Value                                |
| ------------------ | ------------------------------------ |
| ID                 | US-132                               |
| Epic               | EPIC-QA-001                          |
| Feature            | CI quality gates                     |
| Backlog Item       | PB-P2-020                            |
| Module / Domain    | QA / DevOps                         |
| User Role          | System                               |
| Priority           | Must Have                            |
| Status             | Approved                             |
| Owner              | Product Owner / Business Analyst     |
| Approved By        | PO/BA Review                         |
| Approval Date      | 2026-07-07                           |
| Ready for Development Tasks | Yes                         |
| Sprint / Milestone | MVP                                  |
| Created Date       | 2026-06-09                           |
| Last Updated       | 2026-07-07                           |

---

## 🎯 User Story

**As the** equipo QA / DevOps
**I want** consolidar las compuertas de calidad (lint, typecheck, unit, integration, contract, E2E selectivo, RBAC negativa, cobertura) en un workflow de GitHub Actions exigido en cada PR a `main`, con branch protection
**So that** el merge a `main` mantenga la calidad como contrato no negociable (PRs que fallan no se mergen).

---

## 🧠 Business Context

### Context Summary
Esta historia consolida las compuertas de calidad definidas en Doc 20 §22 y Doc 21 §16 en un workflow único de **GitHub Actions** (`pr.yml`) que corre en cada Pull Request a `main`. Extiende el pipeline base (PB-P0-017: lint, typecheck, tests, build) integrando las suites de calidad de P2: unit+integration (US-126), contract con MSW (US-127), E2E selectivo (US-128), IA con MockAIProvider (US-129), RBAC negativa (US-130) y A11Y mínima (US-131), más cobertura, validación de migraciones y de seed. Con **branch protection**, los PRs con compuertas rojas no pueden mergearse. El E2E corre selectivo (smoke) en PRs y completo en release.

### Related Domain Concepts
* Quality gates de CI (Doc 20 §22): lint, typecheck, unit, integration, API, frontend, E2E smoke, build, migraciones, seed, cobertura, no-skip crítico, sin fallos de seguridad.
* Branch protection sobre `main` (Doc 21 §16).
* `MockAIProvider` obligatorio en CI (sin IA real).

### Assumptions
* El pipeline base (PB-P0-017) y las suites de calidad (PB-P2-014..019) existen o se integran aquí.
* El stack de CI es GitHub Actions (ADR-DEVOPS-001, Doc 21).
* Esta historia **no** despliega a AWS (eso es PB-P2-021..026).

### Dependencies
* PB-P0-017 — Pipeline base CI (lint/typecheck/tests/build).
* PB-P2-014..019 — Suites de calidad: US-126 (unit+integration), US-127 (contract), US-128 (E2E), US-129 (IA), US-130 (RBAC negativa), US-131 (A11Y).

---

## 🔗 Traceability

| Source                 | Reference                                                        |
| ---------------------- | --------------------------------------------------------------- |
| FRD Requirement(s)     | Transversal — no implementa un UC; habilita la compuerta de calidad de todo el MVP. |
| Use Case(s)            | Transversal.                                                    |
| Business Rule(s)       | Transversal — quality gates como contrato de calidad.           |
| Permission Rule(s)     | No aplica runtime — configuración de CI/branch protection.      |
| Data Entity / Entities | No aplica.                                                      |
| API Endpoint(s)        | No aplica.                                                      |
| NFR Reference(s)       | NFR-TEST-*, NFR-OBS-001, NFR-PERF-API-001                       |
| Related ADR(s)         | ADR-DEVOPS-001 (GitHub Actions / AWS), ADR-TEST-001 (Vitest/Supertest/Playwright) |
| Related Document(s)    | /docs/20-Testing-Strategy.md (§22), /docs/21-Deployment-and-DevOps-Design.md (§16), /docs/22-Architecture-Decision-Records.md |
| Backlog Item           | PB-P2-020                                                        |

---

## 🧭 Scope Guardrails

### MVP Scope
* Scope Classification: In Scope
* MVP Relevance: Must Have

### In Scope
* Workflow **GitHub Actions** (`pr.yml`) para PR a `main` con las compuertas obligatorias.
* Gates: **lint**, **typecheck**, **unit**, **integration**, **contract**, **E2E selectivo (smoke)**, **RBAC negativa**, **cobertura**, **A11Y**, **IA (Mock)**.
* Validación de **migraciones** (`prisma migrate validate`) y de **seed** (idempotencia).
* **Build verification** (frontend + backend).
* **Cobertura ≥50%** sobre lógica crítica como gate.
* **Branch protection** sobre `main`: requiere checks verdes para mergear.
* **E2E selectivo (smoke)** en PRs; **E2E completo** en release.
* **Cache de dependencias**; estado visible en checks.
* `MockAIProvider` en CI (sin IA real; sin `OPENAI_API_KEY`).

### Explicitly Out of Scope
* Despliegue a AWS (Amplify/App Runner/RDS/Secrets) — PB-P2-021..026.
* Implementación de las suites individuales (US-126..131) — esta historia las **consolida**, no las reimplementa.
* Reimplementar el pipeline base PB-P0-017 — lo **extiende**.
* Certificación de cumplimiento formal (PCI/SOC2/etc.).
* Funciones futuras no listadas en el Epic Map.

### Scope Notes
* Respetar Doc 20 §22 (lista de compuertas) y Doc 21 §16 (workflows y branch protection).
* Calidad como contrato no negociable: gates rojos → no merge.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Compuertas obligatorias en PR a main
**Given** un Pull Request a `main`
**When** se ejecuta el workflow de GitHub Actions
**Then** corren todas las compuertas obligatorias (lint, typecheck, unit, integration, contract, E2E selectivo, RBAC negativa, cobertura, A11Y, IA Mock, migraciones, seed, build) y su estado es visible en los checks del PR.

### AC-02: Branch protection bloquea el merge
**Given** una compuerta en rojo
**When** se intenta mergear el PR a `main`
**Then** la branch protection impide el merge hasta que todas las compuertas requeridas estén verdes.

### AC-03: Cobertura mínima como gate
**Given** el reporte de cobertura de la suite
**When** se evalúa la compuerta de cobertura
**Then** el gate exige ≥50% sobre lógica crítica y falla el PR si no se cumple.

### AC-04: E2E selectivo en PR y completo en release
**Given** el flujo de CI
**When** corre en un PR a `main` vs en un release
**Then** el E2E es selectivo (smoke) en PRs y completo en release, según la política definida.

### AC-05: Determinismo y seguridad de CI
**Given** la ejecución del workflow
**When** corre
**Then** usa `MockAIProvider` (sin IA real ni `OPENAI_API_KEY`), no expone secretos en logs, cachea dependencias y es determinístico.

---

## ⚠️ Edge Cases

### EC-01: Suite requerida ausente o mal configurada
**Given** que una compuerta requerida no está disponible
**When** se ejecuta el workflow
**Then** el workflow falla de forma controlada (fail-fast) señalando la compuerta faltante, sin permitir el merge.

#### Handling
* Fail-fast; la ausencia de una compuerta requerida no debe interpretarse como "verde".

### EC-02: Flakiness de una compuerta (p. ej. E2E)
**Given** un fallo intermitente
**When** corre el gate
**Then** se aplican retries acotados definidos por política, sin ocultar fallos reales.

#### Handling
* Retries acotados y visibles; los fallos persistentes bloquean el merge.

---

## 🚫 Validation Rules

| ID    | Rule                                                        | Message / Behavior                          |
| ----- | ---------------------------------------------------------- | ------------------------------------------- |
| VR-01 | Todas las compuertas requeridas deben estar verdes         | Branch protection bloquea el merge          |
| VR-02 | Cobertura de lógica crítica ≥50%                           | Gate de cobertura falla si no se cumple     |
| VR-03 | Compuerta requerida ausente                                | Fail-fast (no cuenta como verde)            |
| VR-04 | Uso de IA real en CI                                       | Bloqueado (sin `OPENAI_API_KEY`)            |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                |
| ------ | ------------------------------------------------------------------- |
| SEC-01 | Aplicar políticas de seguridad del Doc 19/Doc 21 en la config de CI. |
| SEC-02 | Secrets vía GitHub Secrets / Secrets Manager (OIDC hacia AWS recomendado); sin secretos en el repo. |
| SEC-03 | Sin secretos en logs de CI ni en artefactos.                        |
| SEC-04 | La suite de seguridad/autorización (RBAC negativa) fallada bloquea el merge (Doc 20 §22). |

### Negative Authorization Scenarios
* PR con compuerta de seguridad/autorización roja → merge bloqueado.
* Configuración insegura del workflow → bloqueo (fail-fast).

---

## 🤖 AI Behavior

This story does not invoke AI directly.

### AI Involvement
* AI Feature: None (garantiza que CI usa `MockAIProvider`, sin IA real).
* Provider Layer: `MockAIProvider` en CI.
* Human Validation Required: Not applicable
* Persist AIRecommendation: No
* Fallback Required: Not applicable

### AI Input
* Not applicable for this story.

### AI Output
* Not applicable for this story.

### Human-in-the-loop Rules
* Not applicable for this story.

### AI Error / Fallback Behavior
* Not applicable for this story.

---

## 🎨 UX / UI Notes

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
| Accessibility Notes | N/A — historia de CI/DevOps sin UI. |
| Responsive Notes    | N/A   |
| i18n Notes          | N/A   |
| Currency Notes      | No aplica. |

---

## 🛠 Technical Notes

### Frontend
* Route / Page: N/A
* Components: N/A
* State Management: N/A
* Forms: N/A
* API Client: N/A

### Backend
* Use Case / Service: N/A (no modifica el backend; ejecuta sus suites en CI).
* Controller / Route: N/A
* Authorization Policy: N/A
* Validation: `prisma migrate validate`; seed idempotencia.
* Transaction Required: N/A

### Database
* Main Tables: N/A
* Constraints: N/A
* Index Considerations: N/A

### CI / DevOps
* Workflow: GitHub Actions `pr.yml` (PR a `main`), con jobs por compuerta y branch protection.
* Compuertas: lint, typecheck, unit, integration, contract, E2E smoke, RBAC negativa, A11Y, IA (Mock), cobertura, migraciones, seed, build.
* Cache: npm/pnpm.
* Secrets: GitHub Secrets; OIDC hacia AWS recomendado (para fases de deploy futuras).

### Observability / Audit
* Correlation ID Required: N/A a nivel de CI.
* Log Event Required: Sin secretos en logs.
* AdminAction Required: No
* AIRecommendation Required: No

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                    | Type |
| ----- | ---------------------------------------------------------- | ---- |
| TS-01 | PR a main ejecuta todas las compuertas y muestra checks     | CI   |
| TS-02 | Cobertura ≥50% lógica crítica evaluada como gate            | CI   |
| TS-03 | E2E selectivo en PR; completo en release                   | CI   |

### Negative Tests

| ID    | Scenario                                   | Expected Result                     |
| ----- | ------------------------------------------ | ----------------------------------- |
| NT-01 | Compuerta en rojo (lint/typecheck/test/coverage/RBAC/A11Y) | Merge bloqueado por branch protection |
| NT-02 | Compuerta requerida ausente                | Fail-fast (no cuenta como verde)    |
| NT-03 | Intento de usar IA real en CI              | Bloqueado (sin `OPENAI_API_KEY`)     |

### AI Tests
* CI usa `MockAIProvider`; sin IA real.

### Authorization Tests

| ID         | Scenario                                     | Expected Result |
| ---------- | -------------------------------------------- | --------------- |
| AUTH-TS-01 | Compuerta de RBAC negativa roja              | Merge bloqueado |

### Accessibility Tests
* La compuerta A11Y (US-131) integrada; violaciones críticas bloquean el merge.

---

## 📊 Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | Calidad, estabilidad de main, time-to-deploy         |
| Expected Impact     | Calidad como contrato no negociable; PRs rojos no se mergen |
| Success Criteria    | PR a main requiere gates verdes; cobertura ≥50%; branch protection activa |
| Academic Demo Value | Alto — evidencia de disciplina de CI/quality gates    |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks
* No aplica (se ejecutan sus suites).

### Potential Backend Tasks
* No aplica (se ejecutan sus suites).

### Potential Database Tasks
* Validación de migraciones y seed en CI.

### Potential AI / PromptOps Tasks
* Forzar `MockAIProvider` en CI (sin `OPENAI_API_KEY`).

### Potential QA Tasks
* Verificar que cada compuerta requerida esté integrada y sea bloqueante.

### Potential DevOps / Config Tasks
* Escribir `pr.yml` con jobs por compuerta.
* Configurar branch protection sobre `main`.
* E2E selectivo (PR) vs completo (release).
* Cache de dependencias.

---

## ✅ Definition of Ready

* [x] Rol claro (System / equipo QA-DevOps).
* [x] Goal técnico claro.
* [x] Referencias a Docs (Doc 20 §22, Doc 21 §16, ADR-DEVOPS-001).
* [x] Permisos / Seguridad (secrets vía GitHub Secrets; sin IA real).
* [x] Entidades listadas (N/A).
* [x] AC en GWT.
* [x] Edge cases documentados.
* [x] Validación clara.
* [x] Out of Scope explícito (deploy fuera de alcance).
* [x] Dependencias conocidas (PB-P0-017, PB-P2-014..019).
* [x] UX states identificados (N/A — sin UI).
* [x] API definida (N/A — CI).
* [x] Tests definidos.
* [ ] Tech Lead validó.

---

## 🏁 Definition of Done

* [ ] `pr.yml` ejecuta todas las compuertas obligatorias en PR a `main`.
* [ ] Branch protection bloquea el merge ante gates rojos.
* [ ] Cobertura ≥50% lógica crítica como gate.
* [ ] E2E selectivo en PR; completo en release.
* [ ] CI usa `MockAIProvider`; sin secretos en logs.
* [ ] Tech Lead valida.

---

## 📝 Notes
* Esta historia consolida las compuertas de las suites US-126..131; no las reimplementa.
* No incluye despliegue a AWS (PB-P2-021..026).
* Confirmar con Tech Lead la lista final de compuertas **requeridas** para el merge y la política de E2E selectivo vs completo.
