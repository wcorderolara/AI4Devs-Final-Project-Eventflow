# Technical Specification — PB-P2-024 / US-138: Configurar Secrets Manager

## 1. Metadata

| Field                                | Value                                                                             |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| User Story ID                        | US-138                                                                             |
| Source User Story                    | `management/user-stories/US-138-configure-secrets-manager.md`                      |
| Decision Resolution Artifact         | N/A — no existe `management/user-stories/decision-resolutions/US-138-decision-resolution.md` |
| Priority                             | P2 (Must Have)                                                                     |
| Backlog ID                           | PB-P2-024                                                                          |
| Backlog Title                        | Secrets en AWS Secrets Manager                                                     |
| Backlog Execution Order              | 24 (vigésimo cuarto ítem de P2)                                                    |
| User Story Position in Backlog Item  | 1 de 1                                                                             |
| Related User Stories in Backlog Item | US-138                                                                             |
| Epic                                 | EPIC-OPS-001                                                                       |
| Backlog Item Dependencies            | PB-P2-022 (backend en App Runner)                                                  |
| Feature                              | Secrets (AWS Secrets Manager)                                                      |
| Module / Domain                      | DevOps / Security                                                                  |
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
| Decision Resolution Artifact | No    | No   | No existe para US-138.                    |
| Product Backlog Prioritized  | Yes   | Yes  | PB-P2-024 (P2).                           |
| ADRs                         | Yes   | Yes  | ADR-SEC-001, ADR-DEVOPS-001.              |

---

## 3. Backlog Execution Context

### Product Backlog Item

**PB-P2-024 — Secrets Manager** (EPIC-OPS-001, P2, Must Have). Almacenar `OPENAI_API_KEY`, `CAPTCHA_SECRET`, `COOKIE_SIGNING_KEY` y otros secrets en Secrets Manager. Rotación documentada. Acceptance: secrets fuera del repo; IAM scope mínimo; rotación documentada en runbook. Dependencia: PB-P2-022. Trazabilidad: Doc 19, Doc 21 · ADR-SEC-001.

### Execution Order Rationale

Vigésimo cuarto ítem de P2. Depende del backend desplegado (PB-P2-022, consumidor de los secretos). Provee la gestión segura de secretos que consumen el backend (US-136) y la conexión a RDS (US-137).

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item                          | Suggested Order |
| ---------- | --------------------------------------------- | --------------- |
| US-138     | Única historia del ítem (Secrets Manager)     | 1               |

---

## 3.1 Executive Technical Summary

Se debe almacenar los **secretos del backend** en **AWS Secrets Manager** por entorno (QA/Demo) — `DATABASE_URL`, `SESSION_SECRET`, `COOKIE_SECRET`, `CAPTCHA_SECRET_KEY`, `OPENAI_API_KEY` (nombres canónicos de Doc 21 §14.2) — y referenciarlos en runtime desde **App Runner** (US-136). El acceso se otorga con **IAM de mínimo alcance** (el rol de App Runner lee solo los secretos de su entorno). Existe un **`.env.example`** con los nombres de todas las variables y sin valores reales (Doc 21 §14.6); **ningún secreto vive en el repo/imagen/env plano** ni aparece en logs. La **rotación es manual en el MVP** y se documenta en un **runbook**.

No incluye rotación automática, ni las variables de **configuración** (no secretas, que viven en App Runner env), ni la provisión de App Runner/RDS (se referencian).

---

## 4. Scope Boundary

### In Scope

* Crear los **secretos del backend** en Secrets Manager por entorno: `DATABASE_URL`, `SESSION_SECRET`, `COOKIE_SECRET`, `CAPTCHA_SECRET_KEY`, `OPENAI_API_KEY`.
* Referencia de los secretos desde **App Runner** en runtime.
* **IAM least-privilege** para el rol de App Runner (lee solo secretos de su entorno).
* **`.env.example`** con nombres (secretos + config) y sin valores.
* **Sin secretos en logs/artefactos**.
* **Runbook de rotación manual**.

### Out of Scope

* Rotación automática de secretos (manual en MVP).
* Variables de **configuración** no secretas (App Runner env).
* Provisión de App Runner (PB-P2-022) y RDS (PB-P2-023).
* Configuración de OIDC/GitHub Actions en detalle (US-136/US-132).

### Explicit Non-Goals

* No colocar secretos en el repositorio, imagen o env plano.
* No otorgar IAM más amplio del mínimo necesario.
* No exponer secretos en logs.

---

## 5. Architecture Alignment

### Backend Architecture

El backend (App Runner, US-136) referencia los secretos en runtime; valida su presencia al arrancar (fail-fast).

### Frontend Architecture

No aplica — el frontend usa solo variables públicas `NEXT_PUBLIC_*` (no secretos).

### Database Architecture

`DATABASE_URL` es uno de los secretos gestionados (RDS en PB-P2-023).

### API Architecture

No aplica.

### AI / PromptOps Architecture

`OPENAI_API_KEY` como secreto, usado solo cuando `LLM_PROVIDER=openai`; en CI se usa Mock (Doc 21 §14.4).

### Security Architecture

Núcleo (ADR-SEC-001, Doc 19/Doc 21 §14): secretos fuera del repo/imagen; IAM least-privilege; `.env.example` con nombres; sin secretos en logs; OIDC hacia AWS recomendado para CI.

### Testing Architecture

Verificar lectura de secretos en runtime, IAM mínimo, `.env.example`, ausencia de secretos en logs y el runbook de rotación.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 (secretos fuera del repo) | Crear secretos en Secrets Manager por entorno; ninguno en repo/env plano. | DevOps/Security |
| AC-02 (IAM mínimo) | Rol de App Runner con permiso de lectura solo a los secretos de su entorno. | IAM |
| AC-03 (`.env.example`) | `.env.example` con nombres (secretos+config) sin valores. | Repo/DevOps |
| AC-04 (sin secretos en logs) | Verificar que logs/artefactos no contienen secretos. | Observability/Security |
| AC-05 (rotación) | Runbook de rotación manual (actualizar secreto + refrescar/redeploy). | Docs/DevOps |

---

## 7. Backend Technical Design

### Secrets Consumption
El backend lee los secretos referenciados por App Runner; valida presencia al arrancar (EC-01 fail-fast).

### Validation Rules
* VR-01: ningún secreto en repo.
* VR-02: secretos desde Secrets Manager en runtime; fail-fast si falta.
* VR-03: IAM de mínimo alcance.
* VR-04: `.env.example` presente con nombres/sin valores.

### Error Handling
Fail-fast al arrancar si falta un secreto requerido, sin exponer el valor.

### Observability
Sin secretos en logs; enmascarar valores sensibles.

---

## 8. Frontend Technical Design

No aplica — el frontend solo usa variables públicas `NEXT_PUBLIC_*`.

---

## 9. API Contract Design

No aplica.

---

## 10. Database / Prisma Design

No aplica — `DATABASE_URL` es un secreto gestionado; RDS en PB-P2-023.

---

## 11. AI / PromptOps Design

`OPENAI_API_KEY` como secreto (solo `LLM_PROVIDER=openai`); en CI se usa `MockAIProvider` (sin la key). No ejecuta IA.

---

## 12. Security & Authorization Design

### Authentication / Authorization
No aplica runtime; IAM para lectura de secretos.

### Secrets
`DATABASE_URL`, `SESSION_SECRET`, `COOKIE_SECRET`, `CAPTCHA_SECRET_KEY`, `OPENAI_API_KEY` en Secrets Manager por entorno.

### IAM
Rol de App Runner con política de mínimo alcance (lee solo los secretos de su entorno); OIDC hacia AWS recomendado para CI.

### Negative Authorization Scenarios
Secreto en repo → bloqueo; IAM excesivo → señalado/bloqueado.

### Audit Requirements
Sin secretos en logs; runbook de rotación.

### Sensitive Data Handling
Valores enmascarados; `.env.example` sin valores reales.

---

## 13. Testing Strategy

### Config / Security Tests
Verificar lectura de secretos en runtime; IAM mínimo; `.env.example` con nombres/sin valores; ausencia de secretos en logs.

### Negative Tests
Secreto ausente → fail-fast; secreto en repo → bloqueado; IAM excesivo → señalado; secreto en logs → falla.

### CI Checks
Escaneo de secretos en el repo (recomendado); sin `OPENAI_API_KEY` real en CI.

---

## 14. Observability & Audit

### Logs
Enmascarar/omitir secretos; sin cadenas de conexión en logs.

### Metrics / AdminAction / Correlation ID
N/A a nivel de secretos.

### Error Tracking
Errores de acceso a secretos visibles (sin exponer valores).

---

## 15. Seed / Demo Data Impact

No aplica — la historia no modifica seed/datos.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| Metadata US (Priority "(P0)") vs Backlog (P2) | La US marcaba P0; el backlog ubica PB-P2-024 en P2 | Se alinea a P2 (backlog autoritativo) | Corregido en la US | No |
| Naming de secretos | Backlog: `CAPTCHA_SECRET`, `COOKIE_SIGNING_KEY`; Doc 21 §14.2: `CAPTCHA_SECRET_KEY`, `COOKIE_SECRET`, `SESSION_SECRET` | Se adoptan los nombres canónicos de Doc 21 §14.2 | Confirmar con Tech Lead; unificar el backlog | No |
| Provisión de App Runner/RDS | Dependen de PB-P2-022/023 | Referenciar; configurar cuando existan | Coordinar con PB-P2-022/023 | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Secreto en el repo | Exposición de credenciales | Escaneo de secretos; `.env.example` sin valores; revisión |
| IAM demasiado amplio | Exposición lateral | Política de mínimo alcance por entorno |
| Secreto en logs | Fuga | Enmascarar/omitir; revisión de logs |
| Secreto ausente en runtime | Servicio caído | Fail-fast al arrancar con mensaje sin valor |
| Rotación no documentada | Riesgo operativo | Runbook de rotación manual |

---

## 18. Implementation Guidance for Coding Agents

* **Archivos/carpetas probablemente impactados:** configuración de Secrets Manager (consola/IaC si se versiona), política IAM del rol de App Runner, `.env.example`, referencias de secretos en la config de App Runner, runbook de rotación, validación de presencia de secretos en el arranque del backend.
* **Orden recomendado:** (1) crear los secretos en Secrets Manager por entorno; (2) política IAM least-privilege para el rol de App Runner; (3) referenciar los secretos en App Runner; (4) `.env.example` con nombres; (5) validación fail-fast en el arranque; (6) verificación de ausencia de secretos en logs; (7) runbook de rotación.
* **Decisiones que no deben reabrirse:** secretos fuera del repo (P-04, Doc 21 §14.6); IAM least-privilege; nombres canónicos de Doc 21 §14.2; rotación manual en MVP.
* **Qué no implementar:** rotación automática; variables de config no secretas; provisión de App Runner/RDS.
* **Suposiciones a preservar:** PB-P2-022 (backend) existe; RDS (PB-P2-023) provee `DATABASE_URL`.

---

## 19. Task Generation Notes

* **Grupos de tareas sugeridos:** (SEC) crear secretos en Secrets Manager; (SEC) política IAM least-privilege; (OPS) referencia de secretos en App Runner; (OPS) `.env.example`; (SEC) validación fail-fast + sin secretos en logs; (DOC) runbook de rotación + naming + nota de prioridad.
* **Tareas QA requeridas:** verificar lectura de secretos, IAM mínimo, `.env.example`, ausencia de secretos en logs.
* **Tareas de seguridad requeridas:** todas (núcleo de la historia).
* **Tareas de seed/demo requeridas:** ninguna.
* **Tareas de documentación requeridas:** runbook de rotación, naming de secretos, nota de prioridad.
* **Dependencias entre tareas:** secretos antes de la referencia en App Runner; IAM antes de la lectura; validación antes de considerar completo.
* **Consolidación:** PB-P2-024 puede consolidar sus tareas en un `tasks.md` propio.

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass (Approved with Minor Notes) |
| Product Backlog mapping found | Pass (PB-P2-024) |
| Decision Resolution reviewed if present | N/A (no existe) |
| Scope clear | Pass |
| Architecture alignment clear | Pass |
| API impact clear | N/A |
| DB impact clear | Pass (`DATABASE_URL` gestionado; RDS en PB-P2-023) |
| AI impact clear | Pass (`OPENAI_API_KEY` como secreto) |
| Security impact clear | Pass (núcleo de la historia) |
| Testing strategy clear | Pass |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`

La historia está aprobada, mapeada a PB-P2-024, con alcance claro (secretos del backend en Secrets Manager por entorno + IAM least-privilege + `.env.example` + sin secretos en logs + runbook de rotación manual), sin rotación automática ni provisión de App Runner/RDS. Las alertas de Documentation Alignment (prioridad P0→P2 reconciliada; naming de secretos canónico Doc 21 §14.2; dependencias PB-P2-022/023) son **no bloqueantes**. Seguridad de secretos, IAM y observabilidad están suficientemente definidos para generar Development Tasks.
