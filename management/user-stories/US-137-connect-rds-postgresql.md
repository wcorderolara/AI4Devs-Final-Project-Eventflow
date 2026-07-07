# 🧾 User Story: Conectar RDS PostgreSQL

## 🆔 Metadata

| Field              | Value                                |
| ------------------ | ------------------------------------ |
| ID                 | US-137                               |
| Epic               | EPIC-OPS-001                         |
| Feature            | RDS PostgreSQL gestionado            |
| Backlog Item       | PB-P2-023                            |
| Module / Domain    | DevOps / DB                         |
| User Role          | System                               |
| Priority           | Must Have (P2)                       |
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

**As the** equipo DevOps
**I want** una instancia gestionada de Amazon RDS for PostgreSQL (Single-AZ para MVP) con backups automáticos, security group restringido al backend y `DATABASE_URL` vía Secrets Manager/SSM
**So that** los datos estén seguros, la operación sea simple y las migraciones corran contra RDS en el pipeline.

---

## 🧠 Business Context

### Context Summary
PostgreSQL se ejecuta en **Amazon RDS for PostgreSQL**, gestionado y respaldado (Doc 21 §11, ADR-DB-001). Para el MVP se usa una instancia pequeña (`db.t*`), storage GP3 mínimo escalable y **Single-AZ** (Multi-AZ queda como futuro). El acceso está restringido por **security group** exclusivamente al backend (App Runner, US-136); el frontend nunca accede directamente. La cadena de conexión `DATABASE_URL` vive en **Secrets Manager/SSM**. Las **migraciones Prisma** se validan en CI (`migrate diff`, `deploy --dry-run`) y se aplican (`migrate deploy`) antes de servir tráfico nuevo. Cada entorno (QA, Demo) tiene su propia base de datos.

### Related Domain Concepts
* Amazon RDS for PostgreSQL (Single-AZ MVP; Multi-AZ futuro).
* Security group restringido al backend.
* `DATABASE_URL` en Secrets Manager/SSM; pool de conexiones Prisma moderado.
* Backups automáticos (retención 7 días) + snapshots manuales pre-cambios mayores.

### Assumptions
* La estrategia de despliegue de BD está definida en `/docs/21-Deployment-and-DevOps-Design.md` §11 (ADR-DB-001).
* El esquema/migraciones Prisma existen (PB-P0-001).
* El backend está desplegado y es el único consumidor de la BD (PB-P2-022).
* Secrets Manager se aborda en PB-P2-024; esta historia lo consume/referencia.

### Dependencies
* PB-P0-001 — Database Schema, Migrations & Constraints (Prisma).
* PB-P2-022 — Backend desplegado en App Runner (único consumidor de la BD).

---

## 🔗 Traceability

| Source                 | Reference                                                        |
| ---------------------- | --------------------------------------------------------------- |
| FRD Requirement(s)     | Transversal — no implementa un UC; habilita la persistencia confiable. |
| Use Case(s)            | Transversal.                                                    |
| Business Rule(s)       | Transversal.                                                    |
| Permission Rule(s)     | No aplica runtime — configuración de infraestructura.           |
| Data Entity / Entities | Transversal — todas las entidades persistidas en RDS.           |
| API Endpoint(s)        | No aplica (acceso solo desde backend).                          |
| NFR Reference(s)       | NFR-OBS-001, NFR-PERF-API-001, NFR-TEST-* (integridad/persistencia). |
| Related ADR(s)         | ADR-DB-001 (PostgreSQL), ADR-DEVOPS-001 (AWS), ADR-TEST-001     |
| Related Document(s)    | /docs/21-Deployment-and-DevOps-Design.md (§11), /docs/18-Database-Physical-Design.md, /docs/11-Data-Seed-Strategy.md |
| Backlog Item           | PB-P2-023                                                        |

---

## 🧭 Scope Guardrails

### MVP Scope
* Scope Classification: In Scope
* MVP Relevance: Must Have (P2)

### In Scope
* Instancia **RDS PostgreSQL** gestionada por entorno (QA/Demo): `db.t*` pequeña, GP3, **Single-AZ**.
* **Security group** restringiendo el acceso exclusivamente al backend (App Runner).
* **Backups automáticos** (retención 7 días); **snapshots manuales** pre-cambios mayores/pre-demo.
* **`DATABASE_URL`** en Secrets Manager/SSM (env); pool de conexiones Prisma moderado.
* **Migraciones Prisma** contra RDS en el pipeline (`migrate diff`/`deploy --dry-run` en CI; `migrate deploy` antes de servir).
* **Base de datos propia por entorno** (QA/Demo).
* Procedimiento de **restore** documentado (restaurar snapshot a nueva instancia + rotar `DATABASE_URL`).

### Explicitly Out of Scope
* Multi-AZ, réplicas de lectura, particionamiento, sharding, multi-región (Doc 21 §11.8; futuro).
* Acceso directo desde el frontend (prohibido).
* Provisión de Secrets Manager (PB-P2-024) — se referencia.
* Contenido del seed (PB-P0-014) — se ejecuta vía backend en otra historia.
* Funciones futuras no listadas en el Epic Map.

### Scope Notes
* Sin acceso directo del frontend a la BD (Doc 21 §11.8).
* Cambios de migración destructivos requieren plan documentado (Doc 21 §11.3).

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Instancia RDS gestionada y restringida al backend
**Given** el entorno (QA/Demo)
**When** se provisiona la instancia RDS PostgreSQL (Single-AZ, `db.t*`, GP3)
**Then** la instancia está gestionada y su security group permite el acceso **solo desde el backend** (App Runner); el frontend no accede directamente.

### AC-02: Backups automáticos
**Given** la instancia RDS
**When** se configura
**Then** los backups automáticos están habilitados (retención 7 días) y es posible tomar snapshots manuales antes de cambios mayores/demo.

### AC-03: Conexión por env/secreto
**Given** el backend
**When** se conecta a la BD
**Then** `DATABASE_URL` se referencia desde Secrets Manager/SSM (no en el repo/imagen), con un pool de conexiones Prisma moderado.

### AC-04: Migraciones en el pipeline
**Given** el pipeline CI/CD
**When** se ejecuta
**Then** en CI se valida (`prisma migrate diff` / `migrate deploy --dry-run`) y en el entorno se aplican las migraciones (`prisma migrate deploy`) contra RDS antes de servir tráfico nuevo.

### AC-05: Restore documentado
**Given** un incidente de datos
**When** se requiere recuperar
**Then** existe un procedimiento documentado de restore (restaurar snapshot a una nueva instancia y rotar `DATABASE_URL`).

---

## ⚠️ Edge Cases

### EC-01: RDS no alcanzable
**Given** la instancia RDS caída o inalcanzable
**When** el backend intenta conectarse
**Then** el fallo es controlado (fail-fast con mensaje claro), sin exponer detalles sensibles.

#### Handling
* Fail-fast en el arranque/health si no hay conexión a la BD.

### EC-02: Migración destructiva
**Given** un cambio de esquema destructivo
**When** se planifica la migración
**Then** requiere un plan documentado antes de aplicarse (Doc 21 §11.3).

#### Handling
* Revisión y plan documentado para cambios destructivos.

---

## 🚫 Validation Rules

| ID    | Rule                                                        | Message / Behavior                          |
| ----- | ---------------------------------------------------------- | ------------------------------------------- |
| VR-01 | Security group permite acceso solo desde el backend         | Bloquear acceso externo                     |
| VR-02 | `DATABASE_URL` desde Secrets Manager/SSM (no en repo)       | Bloquear si está en texto plano/repo        |
| VR-03 | Backups automáticos habilitados (7 días)                    | Config inválida → fail-fast                 |
| VR-04 | Migración destructiva sin plan                              | Bloquear hasta plan documentado             |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                |
| ------ | ------------------------------------------------------------------- |
| SEC-01 | Aplicar políticas de seguridad del Doc 19/Doc 21.                    |
| SEC-02 | `DATABASE_URL` y credenciales vía Secrets Manager/SSM; nunca en repo/imagen. |
| SEC-03 | Sin secretos ni cadenas de conexión en logs.                        |
| SEC-04 | Security group restringido al backend; sin acceso público ni desde el frontend. |

### Negative Authorization Scenarios
* Acceso a RDS desde fuera del backend → bloqueado por security group.
* `DATABASE_URL` en texto plano/repo → bloqueo.

---

## 🤖 AI Behavior

This story does not invoke AI directly.

### AI Involvement
* AI Feature: None
* Provider Layer: Not applicable
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
| Accessibility Notes | N/A — historia de infraestructura/DB. |
| Responsive Notes    | N/A   |
| i18n Notes          | N/A   |
| Currency Notes      | No aplica. |

---

## 🛠 Technical Notes

### Frontend
* Route / Page: N/A (sin acceso directo a la BD).
* Components: N/A
* State Management: N/A
* Forms: N/A
* API Client: N/A

### Backend
* Use Case / Service: N/A (consume la BD vía `DATABASE_URL`; no modifica lógica).
* Controller / Route: N/A
* Authorization Policy: N/A
* Validation: Presencia de `DATABASE_URL`; conexión a RDS al arrancar.
* Transaction Required: N/A
* Herramientas: Amazon RDS for PostgreSQL, Prisma, Secrets Manager/SSM.

### Database
* Main Tables: Todas (persistidas en RDS).
* Constraints: Definidas en el esquema (PB-P0-001); no se modifican aquí.
* Index Considerations: Según diseño físico (Doc 18); no se modifican aquí.
* Instancia: `db.t*` pequeña, GP3, Single-AZ; pool Prisma moderado.

### API

| Method | Endpoint | Purpose                          |
| ------ | -------- | -------------------------------- |
| —      | —        | No aplica — acceso solo backend. |

### Observability / Audit
* Correlation ID Required: N/A a nivel de RDS.
* Log Event Required: Sin cadenas de conexión/secretos en logs.
* AdminAction Required: No (el reset de seed audita en `AdminAction`, en su historia).
* AIRecommendation Required: No

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                    | Type   |
| ----- | ---------------------------------------------------------- | ------ |
| TS-01 | Backend conecta a RDS vía `DATABASE_URL`                    | Config |
| TS-02 | Migraciones (`migrate deploy`) corren contra RDS            | Deploy |
| TS-03 | Backups automáticos habilitados (7 días)                   | Config |
| TS-04 | Snapshot manual pre-cambio mayor                           | Config |

### Negative Tests

| ID    | Scenario                                   | Expected Result                     |
| ----- | ------------------------------------------ | ----------------------------------- |
| NT-01 | Acceso a RDS desde fuera del backend       | Bloqueado por security group        |
| NT-02 | RDS no alcanzable                          | Fail-fast controlado                |
| NT-03 | `DATABASE_URL` en texto plano/repo         | Bloqueado                           |
| NT-04 | Migración destructiva sin plan             | Bloqueada hasta plan documentado    |

### AI Tests
Not applicable for this story.

### Authorization Tests

| ID         | Scenario                          | Expected Result |
| ---------- | --------------------------------- | --------------- |
| AUTH-TS-01 | RDS reachable solo desde backend  | Success (SG restringido) |

### Accessibility Tests
* No aplica — historia de infraestructura.

---

## 📊 Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | Confiabilidad de datos, demo readiness                |
| Expected Impact     | Persistencia confiable y respaldada para QA/Demo      |
| Success Criteria    | RDS reachable solo desde backend; `DATABASE_URL` por env; migraciones contra RDS en pipeline |
| Academic Demo Value | Alto — persistencia gestionada y respaldada           |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks
* No aplica.

### Potential Backend Tasks
* Configurar la conexión (`DATABASE_URL`) y el pool de Prisma.

### Potential Database Tasks
* Provisionar RDS por entorno; security group; backups; snapshots.

### Potential AI / PromptOps Tasks
* No aplica.

### Potential QA Tasks
* Verificar conexión, migraciones y restricción del security group.

### Potential DevOps / Config Tasks
* RDS, security group, backups, `DATABASE_URL` en Secrets Manager/SSM, migraciones en pipeline, procedimiento de restore.

---

## ✅ Definition of Ready

* [x] Rol claro (System / equipo DevOps).
* [x] Goal técnico claro.
* [x] Referencias a Docs (Doc 21 §11, ADR-DB-001).
* [x] Permisos / Seguridad (SG restringido; secretos fuera del repo).
* [x] Entidades listadas (transversal).
* [x] AC en GWT.
* [x] Edge cases documentados.
* [x] Validación clara.
* [x] Out of Scope explícito (Multi-AZ/replicas/sharding fuera).
* [x] Dependencias conocidas (PB-P0-001, PB-P2-022).
* [x] UX states identificados (N/A — infra).
* [x] API definida (N/A — solo backend).
* [x] Tests definidos.
* [ ] Tech Lead validó.

---

## 🏁 Definition of Done

* [ ] RDS PostgreSQL gestionado por entorno (Single-AZ) provisionado.
* [ ] Security group restringido al backend; sin acceso público ni frontend.
* [ ] Backups automáticos (7 días); snapshot manual posible.
* [ ] `DATABASE_URL` desde Secrets Manager/SSM; pool Prisma moderado.
* [ ] Migraciones corren contra RDS en el pipeline.
* [ ] Procedimiento de restore documentado.
* [ ] Tech Lead valida.

---

## 📝 Notes
* Documentation Alignment: la metadata original marcaba "Priority: Must Have (P0)", pero el Product Backlog ubica esta historia en **PB-P2-023 (P2)**. Se alinea a **P2** (fuente autoritativa: Product Backlog Prioritized).
* No incluye Multi-AZ, réplicas, particionamiento, sharding ni multi-región (futuro).
* No provisiona Secrets Manager (PB-P2-024); referencia `DATABASE_URL` desde allí.
* Confirmar con Tech Lead la estrategia por entorno (mismo cluster con DBs distintas vs instancias separadas).
