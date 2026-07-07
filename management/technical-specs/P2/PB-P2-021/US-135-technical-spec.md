# Technical Specification — PB-P2-021 / US-135: Deploy frontend en AWS Amplify

## 1. Metadata

| Field                                | Value                                                                             |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| User Story ID                        | US-135                                                                             |
| Source User Story                    | `management/user-stories/US-135-deploy-frontend-amplify.md`                        |
| Decision Resolution Artifact         | N/A — no existe `management/user-stories/decision-resolutions/US-135-decision-resolution.md` |
| Priority                             | P2 (Must Have)                                                                     |
| Backlog ID                           | PB-P2-021                                                                          |
| Backlog Title                        | Deploy frontend en AWS Amplify Hosting                                              |
| Backlog Execution Order              | 21 (vigésimo primer ítem de P2)                                                    |
| User Story Position in Backlog Item  | 1 de 1                                                                             |
| Related User Stories in Backlog Item | US-135                                                                             |
| Epic                                 | EPIC-OPS-001                                                                       |
| Backlog Item Dependencies            | PB-P0-012 (Frontend Bootstrap & i18n), PB-P0-017 (pipeline CI)                     |
| Feature                              | Amplify Hosting — deploy del frontend Next.js                                       |
| Module / Domain                      | DevOps                                                                             |
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
| Decision Resolution Artifact | No    | No   | No existe para US-135.                    |
| Product Backlog Prioritized  | Yes   | Yes  | PB-P2-021 (P2).                           |
| ADRs                         | Yes   | Yes  | ADR-DEVOPS-001 (AWS/Amplify).             |

---

## 3. Backlog Execution Context

### Product Backlog Item

**PB-P2-021 — Deploy frontend en AWS Amplify** (EPIC-OPS-001, P2, Must Have). Configurar Amplify Hosting conectado al repo, build automatizado por branch, env vars, dominio QA/Demo. Acceptance: URL Amplify operativa; build verde por push; variables de entorno por ambiente. Dependencias: PB-P0-012, PB-P0-017. Trazabilidad: Doc 21 · ADR-DEVOPS-001.

### Execution Order Rationale

Vigésimo primer ítem de P2. Depende del frontend base (PB-P0-012) y del pipeline CI (PB-P0-017, quality gates antes de desplegar). Primera de la franja de despliegue AWS de P2 (PB-P2-021..026); consume la URL del backend que provee PB-P2-022.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item                          | Suggested Order |
| ---------- | --------------------------------------------- | --------------- |
| US-135     | Única historia del ítem (deploy frontend Amplify)| 1               |

---

## 3.1 Executive Technical Summary

Se debe configurar **AWS Amplify Hosting** conectado al repositorio GitHub para desplegar el **frontend Next.js (App Router)** (Doc 21 §9). Los builds se disparan por **push a ramas mapeadas** (`main` → Demo, `staging`/`qa` → QA), ejecutan el **build command** (`npm ci`, `lint`, `typecheck`, `test`, `build`) y publican una **URL pública** por ambiente. Se configuran **variables de entorno públicas** (`NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_APP_ENV`, `NEXT_PUBLIC_CAPTCHA_SITE_KEY`) por ambiente; las **sensibles no se exponen** al cliente. Se documenta la asunción de **cookies/CORS** (`SameSite=None; Secure`, `credentials: true`) para el cruce Amplify ↔ App Runner, y se verifica el **rollback** a builds anteriores.

No despliega el backend, RDS ni Secrets Manager (otras historias de la franja). No modifica el código del frontend salvo ajustes de configuración de build si Amplify lo requiere.

---

## 4. Scope Boundary

### In Scope

* Conectar **Amplify Hosting** al repo GitHub del frontend.
* **Branch mappings**: `main` → Demo, `staging`/`qa` → QA.
* **Build settings** de Amplify (`npm ci` → `lint` → `typecheck` → `test` → `build`).
* **Variables públicas** por ambiente (`NEXT_PUBLIC_*`).
* **`NEXT_PUBLIC_API_BASE_URL`** hacia el backend (App Runner) por ambiente.
* Documentar **cookies/CORS** (`SameSite=None; Secure`, `credentials: true`).
* Verificar **rollback** (build anterior de Amplify).
* **Smoke** de la URL pública tras el deploy.

### Out of Scope

* Deploy del backend (App Runner) — PB-P2-022.
* RDS PostgreSQL (PB-P2-023), Secrets Manager (PB-P2-024).
* Custom domain / Route 53 (opcional/futuro).
* El workflow de quality gates (US-132 / PB-P0-017).
* Cambios funcionales del frontend.

### Explicit Non-Goals

* No exponer variables sensibles al cliente.
* No permitir acceso directo del frontend a OpenAI/RDS/S3/Secrets Manager.
* No desplegar builds fallidos.

---

## 5. Architecture Alignment

### Backend Architecture

No aplica — el backend (App Runner) es una dependencia externa; el frontend consume su URL vía `NEXT_PUBLIC_API_BASE_URL`.

### Frontend Architecture

Next.js App Router en Amplify Hosting (Doc 21 §9, Doc 15). Páginas públicas de proveedor SEO-friendly (Server Components/metadata API).

### Database Architecture

No aplica.

### API Architecture

El frontend consume el API REST del backend; CORS con `credentials: true` y cookies `SameSite=None; Secure` para el cruce de dominios.

### AI / PromptOps Architecture

No aplica. El frontend nunca accede directamente a OpenAI (Doc 21 §9.8).

### Security Architecture

Solo variables públicas en el frontend; sensibles vía Secrets Manager (no al cliente); OIDC hacia AWS recomendado; sin secretos en logs de build (SEC-02, SEC-03).

### Testing Architecture

Smoke de la URL pública tras el deploy; el build ejecuta lint/typecheck/test como parte del pipeline de Amplify.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 (Amplify + branch mappings) | Conectar repo; configurar mappings `main`→Demo, `staging`/`qa`→QA. | DevOps/Amplify |
| AC-02 (build verde + URL) | Build settings ejecutan ci/lint/typecheck/test/build; URL pública sirve la app. | DevOps/Amplify, Frontend |
| AC-03 (env vars por ambiente) | Definir `NEXT_PUBLIC_*` por ambiente; sin sensibles. | DevOps/Amplify config |
| AC-04 (API base + cookies/CORS) | `NEXT_PUBLIC_API_BASE_URL` por ambiente; documentar SameSite/CORS. | DevOps/Amplify, API |
| AC-05 (rollback) | Verificar rollback a build anterior de Amplify. | DevOps/Amplify |

---

## 7. Backend Technical Design

No aplica — esta historia no modifica el backend. Requiere que la URL del backend (App Runner) por ambiente exista (PB-P2-022) para configurar `NEXT_PUBLIC_API_BASE_URL`.

---

## 8. Frontend Technical Design

### Routes / Pages
Se despliega la app existente; páginas públicas SEO-friendly (Doc 21 §9.6).

### Components / Forms / State
No se modifican (posibles ajustes de config de build).

### Data Fetching
`NEXT_PUBLIC_API_BASE_URL` hacia App Runner; cookies HTTP-only emitidas por el backend.

### Loading / Empty / Error / Success States
No aplica como cambio.

### Accessibility / i18n
A11Y en US-131; i18n activo (PB-P0-012); páginas SEO servidas por Amplify.

---

## 9. API Contract Design

No aplica — el frontend consume el contrato existente; se configura la base URL y CORS/cookies.

---

## 10. Database / Prisma Design

No aplica — sin cambios de base de datos.

---

## 11. AI / PromptOps Design

No aplica.

---

## 12. Security & Authorization Design

### Authentication / Authorization
No aplica runtime; config de hosting.

### Secrets
Variables sensibles vía Secrets Manager (no al frontend); solo `NEXT_PUBLIC_*` públicas; OIDC hacia AWS recomendado.

### Cookies / CORS
`SameSite=None; Secure`, `credentials: true` para Amplify ↔ App Runner (Doc 21 §9.5).

### Negative Authorization Scenarios
Intento de exponer variable sensible → bloqueo.

### Audit Requirements
Sin secretos en logs de build.

### Sensitive Data Handling
El frontend no accede directamente a OpenAI/RDS/S3/Secrets Manager (Doc 21 §9.8).

---

## 13. Testing Strategy

### Unit / Integration / API / E2E Tests
No aplica como cambio; el build ejecuta las suites existentes como parte del pipeline.

### Smoke Tests
Smoke de la URL pública tras el deploy (accesibilidad de rutas, carga básica).

### Security Tests
Verificar que no se exponen variables sensibles al cliente.

### CI Checks
El build de Amplify ejecuta lint/typecheck/test/build; deploy solo si verde.

---

## 14. Observability & Audit

### Logs
Logs de build de Amplify sin secretos.

### Correlation ID / AdminAction / Error Tracking / Metrics
N/A a nivel de hosting; el estado del build es visible en Amplify.

---

## 15. Seed / Demo Data Impact

### Seed Data Required
No aplica (el frontend consume el backend; el seed lo gestiona el backend/PB-P0-014).

### Demo Scenario Supported
URL pública del frontend para demo/QA.

### Reset / Isolation Notes
No aplica.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| Metadata US (Priority "(P0)") vs Backlog (P2) | La US marcaba P0; el backlog ubica PB-P2-021 en P2 | Se alinea a P2 (backlog autoritativo) | Corregido en la US; sin acción adicional | No |
| Nombres de rama por ambiente | `staging` vs `qa` no fijado | Confirmar con Tech Lead | Documentar branch mappings finales | No |
| `NEXT_PUBLIC_API_BASE_URL` por ambiente | Depende de las URLs del backend (PB-P2-022) | Configurar cuando las URLs existan | Coordinar con PB-P2-022 | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Cookies cross-domain no funcionan | Sesión rota en demo | `SameSite=None; Secure` + CORS `credentials: true` (Doc 21 §9.5/§19/§20) |
| Variable sensible expuesta al cliente | Riesgo de seguridad | Solo `NEXT_PUBLIC_*`; revisión de config |
| Build falla y publica versión rota | Demo caída | Amplify no promueve builds fallidos; rollback disponible |
| URL del backend no disponible aún | Config incompleta | Coordinar con PB-P2-022; placeholder documentado |
| Nombres de rama inconsistentes | Deploy al ambiente equivocado | Documentar y confirmar branch mappings |

---

## 18. Implementation Guidance for Coding Agents

* **Archivos/carpetas probablemente impactados:** configuración de Amplify (consola/`amplify.yml` si se versiona), variables de entorno por ambiente (consola Amplify), documentación de branch mappings y CORS/cookies.
* **Orden recomendado:** (1) conectar Amplify al repo; (2) configurar branch mappings; (3) build settings (`amplify.yml`); (4) env vars públicas por ambiente; (5) `NEXT_PUBLIC_API_BASE_URL` por ambiente; (6) verificar cookies/CORS; (7) smoke de la URL; (8) verificar rollback.
* **Decisiones que no deben reabrirse:** Amplify Hosting (ADR-DEVOPS-001); solo variables públicas en el frontend; frontend sin acceso directo a servicios sensibles.
* **Qué no implementar:** backend/RDS/Secrets/custom domain; cambios funcionales del frontend.
* **Suposiciones a preservar:** PB-P0-012 (frontend) y PB-P0-017 (CI) existen; la URL del backend se coordina con PB-P2-022.

---

## 19. Task Generation Notes

* **Grupos de tareas sugeridos:** (OPS) conectar Amplify + branch mappings; (OPS) build settings; (OPS) env vars por ambiente + API base; (SEC) cookies/CORS + no exponer sensibles; (QA) smoke de URL + verificación de rollback; (DOC) branch mappings + env vars + nota de prioridad.
* **Tareas QA requeridas:** smoke de la URL pública; verificación de rollback.
* **Tareas de seguridad requeridas:** solo variables públicas; cookies/CORS; sin secretos en logs.
* **Tareas de seed/demo requeridas:** ninguna.
* **Tareas de documentación requeridas:** branch mappings, env vars por ambiente, nota de reconciliación de prioridad.
* **Dependencias entre tareas:** conectar Amplify antes de branch mappings/build; env vars antes del deploy funcional; smoke tras el deploy.
* **Consolidación:** PB-P2-021 puede consolidar sus tareas en un `tasks.md` propio.

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass (Approved with Minor Notes) |
| Product Backlog mapping found | Pass (PB-P2-021) |
| Decision Resolution reviewed if present | N/A (no existe) |
| Scope clear | Pass |
| Architecture alignment clear | Pass |
| API impact clear | Pass (consume API base; CORS/cookies) |
| DB impact clear | N/A |
| AI impact clear | N/A |
| Security impact clear | Pass (solo vars públicas; sin secretos al cliente) |
| Testing strategy clear | Pass (smoke + build gates) |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`

La historia está aprobada, mapeada a PB-P2-021, con alcance claro (Amplify Hosting + branch mappings + build + env vars públicas + rollback), sin desplegar backend/RDS/Secrets. Las alertas de Documentation Alignment (prioridad P0→P2 ya reconciliada; nombres de rama; URLs de backend dependientes de PB-P2-022) son **no bloqueantes**. Hosting, seguridad de variables y smoke están suficientemente definidos para generar Development Tasks.
