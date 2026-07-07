# Technical Specification — PB-P2-020 / US-132: Quality gates en GitHub Actions

## 1. Metadata

| Field                                | Value                                                                             |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| User Story ID                        | US-132                                                                             |
| Source User Story                    | `management/user-stories/US-132-quality-gates-github-actions.md`                   |
| Decision Resolution Artifact         | N/A — no existe `management/user-stories/decision-resolutions/US-132-decision-resolution.md` |
| Priority                             | P2 (Must Have)                                                                     |
| Backlog ID                           | PB-P2-020                                                                          |
| Backlog Title                        | Quality gates en GitHub Actions (CI bloquea merge)                                  |
| Backlog Execution Order              | 20 (vigésimo ítem de P2)                                                           |
| User Story Position in Backlog Item  | 1 de 1                                                                             |
| Related User Stories in Backlog Item | US-132                                                                             |
| Epic                                 | EPIC-QA-001                                                                        |
| Backlog Item Dependencies            | PB-P0-017 (pipeline base CI), PB-P2-014..019 (suites de calidad US-126..131)       |
| Feature                              | CI quality gates — GitHub Actions                                                  |
| Module / Domain                      | QA / DevOps                                                                        |
| User Story Status                    | Approved with Minor Notes                                                          |
| Backlog Alignment Status             | Found                                                                              |
| Technical Spec Status                | Ready for Task Breakdown                                                           |
| Created Date                         | 2026-07-07                                                                         |
| Last Updated                         | 2026-07-07                                                                         |

---

## 2. Source Validation

| Source                       | Found | Used | Notes                                    |
| ---------------------------- | ----- | ---- | ---------------------------------------- |
| User Story                   | Yes   | Yes  | `Approved with Minor Notes`.              |
| Technical Specification      | N/A   | N/A  | Este documento.                          |
| Decision Resolution Artifact | No    | No   | No existe para US-132.                    |
| Product Backlog Prioritized  | Yes   | Yes  | PB-P2-020.                                |
| ADRs                         | Yes   | Yes  | ADR-DEVOPS-001 (GitHub Actions/AWS), ADR-TEST-001. |

---

## 3. Backlog Execution Context

### Product Backlog Item

**PB-P2-020 — Quality gates en GitHub Actions** (EPIC-QA-001, P2, Must Have). Configurar workflow GitHub Actions con quality gates: lint, typecheck, unit, integration, contract, E2E selectivo, RBAC, coverage. Acceptance: PR a `main` requiere gates verdes; cobertura ≥50% lógica crítica; E2E selectivo en main, completo en release. Dependencias: PB-P0-017, PB-P2-014..019. Trazabilidad: Doc 20, Doc 21.

### Execution Order Rationale

Vigésimo ítem de P2. Es la historia **consolidadora** de calidad: depende del pipeline base (PB-P0-017) y de las suites de calidad de P2 (US-126 unit+integration, US-127 contract, US-128 E2E, US-129 IA, US-130 RBAC negativa, US-131 A11Y), integrándolas en un workflow único con branch protection. Debe ejecutarse una vez que dichas suites existen o en paralelo, integrando cada una a medida que esté disponible.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item                          | Suggested Order |
| ---------- | --------------------------------------------- | --------------- |
| US-132     | Única historia del ítem (consolidación de gates)| 1               |

---

## 3.1 Executive Technical Summary

Se debe configurar un workflow de **GitHub Actions** (`pr.yml`) que corre en cada **PR a `main`** y ejecuta las **compuertas de calidad** obligatorias (Doc 20 §22, Doc 21 §16): **lint, typecheck, unit, integration, contract, E2E selectivo (smoke), RBAC negativa, A11Y, IA (Mock), cobertura, validación de migraciones, validación de seed, build**. Con **branch protection** sobre `main`, un PR con cualquier compuerta requerida en rojo **no puede mergearse**. El **E2E es selectivo (smoke)** en PRs y **completo** en release. CI usa **`MockAIProvider`** (sin `OPENAI_API_KEY`), cachea dependencias y no expone secretos. Esta historia **consolida** las suites US-126..131 (no las reimplementa) y **extiende** el pipeline base PB-P0-017. **No** incluye despliegue a AWS.

---

## 4. Scope Boundary

### In Scope

* Workflow **GitHub Actions `pr.yml`** (PR a `main`/`qa`) con jobs por compuerta.
* Compuertas: **lint, typecheck, unit, integration, contract, E2E smoke, RBAC negativa, A11Y, IA (Mock), cobertura, migraciones (`prisma migrate validate`), seed (idempotencia), build** (FE+BE).
* **Cobertura ≥50%** sobre lógica crítica como gate.
* **Branch protection** sobre `main`: required checks verdes para mergear.
* **E2E selectivo (smoke)** en PR; **completo** en release (workflow `main.yml`/release).
* **Cache** de dependencias (npm/pnpm); estado visible en checks.
* `MockAIProvider` en CI (sin `OPENAI_API_KEY`); sin secretos en logs.

### Out of Scope

* Despliegue a AWS (Amplify/App Runner/RDS/Secrets) — PB-P2-021..026.
* Implementación de las suites individuales (US-126..131) — se **consolidan**.
* Reimplementar el pipeline base PB-P0-017 — se **extiende**.
* Certificación de cumplimiento formal.

### Explicit Non-Goals

* No desplegar ni promover artefactos.
* No introducir compuertas fuera de Doc 20 §22 / Doc 21 §16.
* No relajar los umbrales definidos (cobertura, no-skip crítico, seguridad).

---

## 5. Architecture Alignment

### Backend Architecture

No se modifica; sus suites (unit/integration/RBAC/IA) se ejecutan como jobs de CI sobre PostgreSQL efímero y `MockAIProvider`.

### Frontend Architecture

No se modifica; sus suites (contract/E2E/A11Y/build) se ejecutan como jobs de CI.

### Database Architecture

Validación de migraciones (`prisma migrate validate`) y seed (idempotencia) como jobs de CI (Doc 20 §22, Doc 21).

### API Architecture

No aplica directamente (las suites API/contract se ejecutan).

### AI / PromptOps Architecture

CI fuerza `MockAIProvider` (sin `OPENAI_API_KEY`); regla crítica de Doc 20 §21.

### Security Architecture

Secrets vía GitHub Secrets (OIDC hacia AWS recomendado para deploy futuro); sin secretos en logs; la compuerta de RBAC negativa fallada bloquea el merge (Doc 20 §22).

### Testing Architecture

Orquesta las suites de Doc 20 §22 en `pr.yml`; smoke E2E en PR, completo en release (Doc 21 §16). Cache de dependencias; retries acotados donde aplique.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 (compuertas en PR) | `pr.yml` con jobs por compuerta; checks visibles. | CI/DevOps |
| AC-02 (branch protection) | Required status checks en `main`; merge bloqueado si rojo. | CI/DevOps, repo settings |
| AC-03 (cobertura gate) | Job de cobertura con umbral ≥50% crítico. | CI/DevOps, testing |
| AC-04 (E2E selectivo/completo) | Smoke E2E en PR; suite completa en release. | CI/DevOps, E2E |
| AC-05 (determinismo/seguridad) | `MockAIProvider`, sin secretos, cache, determinismo. | CI/DevOps, AI infra |

---

## 7. Backend Technical Design

No modifica el backend. Ejecuta sus suites en CI: unit/integration (US-126), RBAC negativa (US-130), IA (US-129) sobre PostgreSQL efímero + `MockAIProvider`. Valida migraciones y seed.

---

## 8. Frontend Technical Design

No modifica el frontend. Ejecuta sus suites en CI: contract/MSW (US-127), E2E smoke (US-128), A11Y (US-131), build.

---

## 9. API Contract Design

No aplica — la compuerta de contract (US-127) se ejecuta como job; esta historia no define contratos.

---

## 10. Database / Prisma Design

Sin cambios de esquema. Jobs de CI: `prisma migrate validate` y validación de idempotencia del seed (Doc 20 §22).

---

## 11. AI / PromptOps Design

CI fuerza `MockAIProvider` (sin `OPENAI_API_KEY`). La compuerta de IA (US-129) se ejecuta como job. Sin llamadas externas.

---

## 12. Security & Authorization Design

### Authentication / Authorization
No aplica runtime; configuración de CI y branch protection.

### Secrets
GitHub Secrets; OIDC hacia AWS recomendado (deploy futuro); sin secretos en repo/logs (SEC-02, SEC-03).

### Negative Authorization Scenarios
La compuerta de RBAC negativa (US-130) fallada bloquea el merge (SEC-04, Doc 20 §22).

### Audit Requirements
Estado de checks visible en el PR como evidencia.

### Sensitive Data Handling
Sin secretos ni PII en logs/artefactos de CI.

---

## 13. Testing Strategy

### Compuertas orquestadas (Doc 20 §22)
| Compuerta | Fuente | Bloqueante |
|---|---|---|
| Lint (ESLint FE+BE) | PB-P0-017 | Sí |
| Typecheck (TS strict) | PB-P0-017 | Sí |
| Unit + Integration (backend) | US-126 | Sí |
| Contract (MSW) | US-127 | Sí |
| E2E smoke (Playwright) | US-128 | Sí (completo en release) |
| IA (MockAIProvider) | US-129 | Sí |
| RBAC negativa | US-130 | Sí |
| A11Y (axe-core) | US-131 | Sí (violaciones críticas) |
| Cobertura ≥50% crítica | US-126 + agregada | Sí |
| Migration validation | Doc 20 §22 | Sí |
| Seed validation (idempotencia) | Doc 20 §22 | Sí |
| Build verification (FE+BE) | PB-P0-017 | Sí |
| Sin `.skip`/`xfail` crítico | Doc 20 §22 | Sí |

### CI Checks
`pr.yml` ejecuta lo anterior en PR; branch protection exige verdes; release ejecuta E2E completo.

---

## 14. Observability & Audit

### Logs / Reports
Reportes de cada compuerta (cobertura, axe, E2E) como artefactos de CI; sin secretos.

### Correlation ID / AdminAction / Error Tracking
N/A a nivel de CI.

### Metrics
Estado de checks y duración de jobs como referencia (objetivos de Doc 20 §21).

---

## 15. Seed / Demo Data Impact

### Seed Data Required
No modifica el seed; valida su idempotencia como compuerta.

### Demo Scenario Supported
Indirecto: protege la calidad que sostiene la demo.

### Reset / Isolation Notes
BD efímera para los jobs que la requieran (integration/RBAC/IA).

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| Lista final de compuertas requeridas | La US enumera el conjunto; la marca de "required" por check la fija Tech Lead | Adoptar la lista de Doc 20 §22 como requeridas | Confirmar con Tech Lead qué checks son "required" en branch protection | No |
| E2E selectivo vs completo | Política de smoke en PR vs completo en release | Smoke en PR; completo en release (Doc 21 §16) | Documentar la política y su trigger | No |
| Disponibilidad de suites US-126..131 | Las suites se integran a medida que existen | Integrar cada compuerta cuando su suite esté disponible; marcar pendientes | Registrar en `log`/notas qué compuertas aún no integradas | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Suite requerida ausente interpretada como verde | Falsa calidad | Fail-fast; no marcar verde si falta la compuerta |
| Flakiness de E2E en el gate | CI inestable | Smoke acotado en PR; retries acotados; completo en release |
| CI lento | Merge lento | Cache de dependencias; paralelizar jobs; smoke en PR |
| IA real en CI | Costos/flakiness | `MockAIProvider`; sin `OPENAI_API_KEY` |
| Branch protection mal configurada | Merge de PRs rojos | Configurar required checks explícitamente |

---

## 18. Implementation Guidance for Coding Agents

* **Archivos/carpetas probablemente impactados:** `.github/workflows/pr.yml` (y `main.yml`/release), configuración de branch protection del repo (documentada), scripts npm agregados por compuerta, cache config.
* **Orden recomendado:** (1) `pr.yml` con jobs base (lint/typecheck/build) extendiendo PB-P0-017; (2) integrar unit/integration + cobertura; (3) contract, IA, RBAC, A11Y; (4) E2E smoke; (5) migraciones + seed; (6) branch protection con required checks; (7) release con E2E completo.
* **Decisiones que no deben reabrirse:** GitHub Actions (ADR-DEVOPS-001); gates de Doc 20 §22; smoke en PR / completo en release; `MockAIProvider` en CI; cobertura ≥50% crítica.
* **Qué no implementar:** deploy a AWS, reimplementar suites, relajar umbrales.
* **Suposiciones a preservar:** PB-P0-017 y las suites US-126..131 existen o se integran; secrets en GitHub Secrets.

---

## 19. Task Generation Notes

* **Grupos de tareas sugeridos:** (OPS) `pr.yml` base + cache; (OPS) integración de compuertas de test (unit/integration/contract/IA/RBAC/A11Y/E2E); (OPS) cobertura + migraciones + seed + build; (OPS) branch protection; (OPS) release con E2E completo; (SEC) secrets/sin-IA-real; (DOC) lista de required checks + política E2E.
* **Tareas QA requeridas:** verificar que cada compuerta requerida sea bloqueante; caso negativo (gate rojo → no merge).
* **Tareas de seguridad requeridas:** secrets vía GitHub Secrets; forzar `MockAIProvider`; compuerta RBAC bloqueante.
* **Tareas de seed/demo requeridas:** validación de idempotencia del seed como compuerta.
* **Tareas de documentación requeridas:** lista de required checks + política E2E selectivo/completo.
* **Dependencias entre tareas:** `pr.yml` base antes de integrar compuertas; compuertas antes de branch protection.
* **Consolidación:** PB-P2-020 puede consolidar sus tareas en un `tasks.md` propio.

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass (Approved with Minor Notes) |
| Product Backlog mapping found | Pass (PB-P2-020) |
| Decision Resolution reviewed if present | N/A (no existe) |
| Scope clear | Pass |
| Architecture alignment clear | Pass |
| API impact clear | N/A |
| DB impact clear | Pass (validación migraciones/seed; sin cambios) |
| AI impact clear | Pass (MockAIProvider en CI) |
| Security impact clear | Pass (secrets, RBAC gate) |
| Testing strategy clear | Pass |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`

La historia está aprobada, mapeada a PB-P2-020, con alcance claro (consolidación de compuertas en `pr.yml` + branch protection, E2E selectivo/completo, cobertura ≥50%, `MockAIProvider` en CI), sin despliegue a AWS. Las alertas de Documentation Alignment (lista de required checks, política E2E, disponibilidad de suites) son **no bloqueantes**. CI, seguridad de secrets y testing están suficientemente definidos para generar Development Tasks.
