# Technical Specification — PB-P2-023 / US-137: Conectar RDS PostgreSQL

## 1. Metadata

| Field                                | Value                                                                             |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| User Story ID                        | US-137                                                                             |
| Source User Story                    | `management/user-stories/US-137-connect-rds-postgresql.md`                         |
| Decision Resolution Artifact         | N/A — no existe `management/user-stories/decision-resolutions/US-137-decision-resolution.md` |
| Priority                             | P2 (Must Have)                                                                     |
| Backlog ID                           | PB-P2-023                                                                          |
| Backlog Title                        | RDS PostgreSQL gestionado (conectado al backend)                                   |
| Backlog Execution Order              | 23 (vigésimo tercer ítem de P2)                                                    |
| User Story Position in Backlog Item  | 1 de 1                                                                             |
| Related User Stories in Backlog Item | US-137                                                                             |
| Epic                                 | EPIC-OPS-001                                                                       |
| Backlog Item Dependencies            | PB-P0-001 (schema/migraciones Prisma), PB-P2-022 (backend en App Runner)           |
| Feature                              | RDS PostgreSQL gestionado                                                          |
| Module / Domain                      | DevOps / DB                                                                        |
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
| Decision Resolution Artifact | No    | No   | No existe para US-137.                    |
| Product Backlog Prioritized  | Yes   | Yes  | PB-P2-023 (P2).                           |
| ADRs                         | Yes   | Yes  | ADR-DB-001 (PostgreSQL), ADR-DEVOPS-001.  |

---

## 3. Backlog Execution Context

### Product Backlog Item

**PB-P2-023 — RDS PostgreSQL gestionado** (EPIC-OPS-001, P2, Must Have). Instancia RDS PostgreSQL gestionada en QA/Demo, con security group restringido al backend, backups automáticos básicos y conexión por env var. Acceptance: RDS reachable solo desde backend; `DATABASE_URL` por env; migrations corren contra RDS en pipeline. Dependencias: PB-P0-001, PB-P2-022. Trazabilidad: Doc 21 · ADR-DB-001.

### Execution Order Rationale

Vigésimo tercer ítem de P2. Depende del esquema/migraciones (PB-P0-001) y del backend desplegado (PB-P2-022, único consumidor de la BD). Provee la persistencia gestionada que consume el backend vía `DATABASE_URL`.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item                          | Suggested Order |
| ---------- | --------------------------------------------- | --------------- |
| US-137     | Única historia del ítem (RDS gestionado)      | 1               |

---

## 3.1 Executive Technical Summary

Se debe provisionar una instancia gestionada de **Amazon RDS for PostgreSQL** (Doc 21 §11, ADR-DB-001) por entorno (QA/Demo): clase pequeña (`db.t*`), storage **GP3**, **Single-AZ** (Multi-AZ es futuro). El **security group** restringe el acceso **exclusivamente al backend** (App Runner, US-136); el frontend nunca accede directamente. Se habilitan **backups automáticos** (retención 7 días) y **snapshots manuales** antes de cambios mayores. La cadena `DATABASE_URL` vive en **Secrets Manager/SSM** (no en repo/imagen), con un **pool de conexiones Prisma moderado**. Las **migraciones Prisma** se validan en CI (`migrate diff`, `deploy --dry-run`) y se aplican (`migrate deploy`) contra RDS antes de servir tráfico nuevo. Se documenta el procedimiento de **restore** (snapshot → nueva instancia → rotar `DATABASE_URL`).

No incluye Multi-AZ, réplicas, particionamiento, sharding ni multi-región. No provisiona Secrets Manager (PB-P2-024); lo referencia.

---

## 4. Scope Boundary

### In Scope

* Instancia **RDS PostgreSQL** por entorno (QA/Demo): `db.t*`, GP3, Single-AZ.
* **Security group** restringido al backend (App Runner).
* **Backups automáticos** (7 días) + **snapshots manuales** pre-cambios.
* **`DATABASE_URL`** en Secrets Manager/SSM; pool Prisma moderado.
* **Migraciones Prisma** en pipeline (`migrate diff`/`--dry-run` en CI; `migrate deploy` en entorno).
* **DB propia por entorno** (QA/Demo).
* **Procedimiento de restore** documentado.

### Out of Scope

* Multi-AZ, réplicas, particionamiento, sharding, multi-región (Doc 21 §11.8; futuro).
* Acceso directo del frontend a la BD.
* Provisión de Secrets Manager (PB-P2-024).
* Contenido del seed (PB-P0-014).

### Explicit Non-Goals

* No exponer la BD públicamente ni al frontend.
* No poner `DATABASE_URL` en repo/imagen.
* No aplicar migraciones destructivas sin plan documentado.

---

## 5. Architecture Alignment

### Backend Architecture

El backend (App Runner, US-136) es el único consumidor de la BD, vía `DATABASE_URL` (Secrets Manager/SSM) y Prisma con pool moderado.

### Frontend Architecture

No aplica — sin acceso directo del frontend (Doc 21 §11.8).

### Database Architecture

Amazon RDS for PostgreSQL gestionado, Single-AZ MVP, GP3, `db.t*`; DB propia por entorno; backups automáticos 7 días; ADR-DB-001.

### API Architecture

No aplica — acceso solo desde backend.

### AI / PromptOps Architecture

No aplica.

### Security Architecture

Security group restringido al backend; sin acceso público; `DATABASE_URL`/credenciales en Secrets Manager/SSM; sin secretos en logs (Doc 21 §11.5, §19).

### Testing Architecture

Verificación de conexión, restricción del security group, backups y ejecución de migraciones contra RDS en el pipeline.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 (RDS gestionado + SG) | Provisionar RDS por entorno; SG solo backend. | DevOps/DB |
| AC-02 (backups) | Backups automáticos 7 días; snapshots manuales. | DevOps/DB |
| AC-03 (conexión por secreto) | `DATABASE_URL` en Secrets Manager/SSM; pool Prisma moderado. | DevOps, Backend |
| AC-04 (migraciones en pipeline) | CI valida (`diff`/`dry-run`); entorno aplica (`migrate deploy`). | CI/DevOps, DB |
| AC-05 (restore) | Documentar restore (snapshot → nueva instancia → rotar `DATABASE_URL`). | DevOps/DB |

---

## 7. Backend Technical Design

### Connection
`DATABASE_URL` desde Secrets Manager/SSM; pool Prisma moderado (acorde a App Runner).

### Validation Rules
* VR-01: SG solo backend.
* VR-02: `DATABASE_URL` desde Secrets Manager/SSM (no repo).
* VR-03: backups habilitados (7 días).
* VR-04: migración destructiva requiere plan.

### Error Handling
Fail-fast si no hay conexión a la BD al arrancar/health.

### Observability
Sin cadenas de conexión/secretos en logs.

---

## 8. Frontend Technical Design

No aplica — sin acceso directo del frontend.

---

## 9. API Contract Design

No aplica — acceso solo desde backend.

---

## 10. Database / Prisma Design

### Instancia
`db.t*` pequeña, GP3 escalable, Single-AZ, versión PostgreSQL compatible con Prisma.

### Connection String
`DATABASE_URL` en Secrets Manager/SSM.

### Migrations Impact
CI: `prisma migrate diff` + `migrate deploy --dry-run` (validación). Entorno: `prisma migrate deploy` antes de servir tráfico. Migraciones versionadas; cambios destructivos con plan documentado (Doc 21 §11.3).

### Backups / Snapshots
Backups automáticos (7 días); snapshots manuales pre-cambios/demo; restore documentado (§11.4).

### Per-environment
DB propia por entorno (QA/Demo) — mismo cluster con DBs distintas o instancias separadas (a confirmar con Tech Lead).

### Seed Impact
No incluye contenido del seed; el seed se ejecuta vía backend en su historia (PB-P0-014), auditado en `AdminAction`.

---

## 11. AI / PromptOps Design

No aplica.

---

## 12. Security & Authorization Design

### Authentication / Authorization
No aplica runtime; configuración de infraestructura.

### Secrets
`DATABASE_URL`/credenciales vía Secrets Manager/SSM; nunca en repo/imagen.

### Network / Security Group
SG restringe el acceso a RDS exclusivamente al backend (App Runner); sin acceso público ni frontend.

### Negative Authorization Scenarios
Acceso a RDS fuera del backend → bloqueado por SG.

### Audit Requirements
Sin secretos en logs; el reset de seed audita en `AdminAction` (otra historia).

### Sensitive Data Handling
Cadenas de conexión fuera de logs; sin PII expuesta.

---

## 13. Testing Strategy

### Deploy / Config Tests
Verificar que el backend conecta a RDS vía `DATABASE_URL`; SG restringido; backups habilitados; snapshot manual posible.

### Migration Tests
`prisma migrate deploy` corre contra RDS en el pipeline; `diff`/`dry-run` en CI.

### Negative Tests
Acceso externo → bloqueado; RDS no alcanzable → fail-fast; `DATABASE_URL` en texto plano → bloqueado; migración destructiva sin plan → bloqueada.

### CI Checks
Validación de migraciones en CI (Doc 20 §22 / Doc 21 §11.3).

---

## 14. Observability & Audit

### Logs
Sin cadenas de conexión/secretos en logs.

### Metrics
Métricas básicas de RDS (CPU/almacenamiento/conexiones) vía CloudWatch (opcional MVP).

### AdminAction / Correlation ID / Error Tracking
N/A a nivel de RDS (el backend gestiona su observabilidad).

---

## 15. Seed / Demo Data Impact

### Seed Data Required
No incluye contenido del seed; el seed se ejecuta vía backend (PB-P0-014).

### Demo Scenario Supported
Persistencia confiable para QA/Demo.

### Reset / Isolation Notes
DB propia por entorno; reset de seed idempotente (en su historia).

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| Metadata US (Priority "(P0)") vs Backlog (P2) | La US marcaba P0; el backlog ubica PB-P2-023 en P2 | Se alinea a P2 (backlog autoritativo) | Corregido en la US | No |
| Estrategia por entorno | DBs distintas en un cluster vs instancias separadas | Confirmar con Tech Lead | Documentar la estrategia elegida | No |
| Secrets Manager provisioning | Depende de PB-P2-024 | Referenciar `DATABASE_URL` desde allí | Coordinar con PB-P2-024 | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Acceso público a RDS | Riesgo de seguridad | SG restringido al backend; sin IP pública |
| `DATABASE_URL` filtrada | Riesgo de seguridad | Secrets Manager/SSM; sin secretos en logs |
| Migración destructiva sin plan | Pérdida de datos | Plan documentado obligatorio (Doc 21 §11.3) |
| Pérdida de datos | Indisponibilidad | Backups automáticos 7 días + snapshots + restore documentado |
| Pool de conexiones inadecuado | Saturación | Pool Prisma moderado acorde a App Runner |

---

## 18. Implementation Guidance for Coding Agents

* **Archivos/carpetas probablemente impactados:** configuración de RDS (consola/IaC si se versiona), security group, referencias a `DATABASE_URL` en Secrets Manager/SSM, paso de migraciones en el pipeline (GitHub Actions), documentación de restore.
* **Orden recomendado:** (1) provisionar RDS por entorno (Single-AZ, `db.t*`, GP3); (2) security group solo backend; (3) backups automáticos 7 días; (4) `DATABASE_URL` en Secrets Manager/SSM + pool Prisma; (5) paso de migraciones (`migrate deploy`) en el pipeline; (6) documentar restore/snapshots.
* **Decisiones que no deben reabrirse:** PostgreSQL (ADR-DB-001); Single-AZ MVP; SG solo backend; `DATABASE_URL` fuera del repo; sin acceso frontend.
* **Qué no implementar:** Multi-AZ/replicas/sharding/multi-región; Secrets Manager provisioning; contenido del seed.
* **Suposiciones a preservar:** PB-P0-001 (migraciones) y PB-P2-022 (backend) existen; Secrets Manager se coordina con PB-P2-024.

---

## 19. Task Generation Notes

* **Grupos de tareas sugeridos:** (OPS) provisionar RDS + SG; (OPS) backups + snapshots; (SEC) `DATABASE_URL` en Secrets Manager/SSM + SG; (OPS) migraciones en pipeline; (QA) verificación de conexión/SG/backups; (DOC) restore + estrategia por entorno + nota de prioridad.
* **Tareas QA requeridas:** conexión backend↔RDS; restricción del SG; migraciones contra RDS.
* **Tareas de seguridad requeridas:** SG restringido; `DATABASE_URL` vía Secrets Manager/SSM; sin secretos en logs.
* **Tareas de seed/demo requeridas:** ninguna (seed en PB-P0-014).
* **Tareas de documentación requeridas:** restore, estrategia por entorno, nota de prioridad.
* **Dependencias entre tareas:** RDS antes del SG/backups; `DATABASE_URL` antes de las migraciones; migraciones antes del smoke.
* **Consolidación:** PB-P2-023 puede consolidar sus tareas en un `tasks.md` propio.

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass (Approved with Minor Notes) |
| Product Backlog mapping found | Pass (PB-P2-023) |
| Decision Resolution reviewed if present | N/A (no existe) |
| Scope clear | Pass |
| Architecture alignment clear | Pass |
| API impact clear | N/A |
| DB impact clear | Pass (RDS gestionado; migraciones en pipeline) |
| AI impact clear | N/A |
| Security impact clear | Pass (SG + secretos) |
| Testing strategy clear | Pass |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`

La historia está aprobada, mapeada a PB-P2-023, con alcance claro (RDS PostgreSQL gestionado Single-AZ + SG restringido al backend + backups + `DATABASE_URL` vía Secrets Manager/SSM + migraciones en pipeline + restore documentado), sin Multi-AZ/replicas ni provisión de Secrets. Las alertas de Documentation Alignment (prioridad P0→P2 reconciliada; estrategia por entorno; Secrets dependiente de PB-P2-024) son **no bloqueantes**. Infraestructura de BD, seguridad y migraciones están suficientemente definidas para generar Development Tasks.
