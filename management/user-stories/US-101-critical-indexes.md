# 🧾 User Story: Implementar índices críticos vía raw SQL (parciales, funcionales) y verificar el catálogo físico de índices

## 🆔 Metadata

| Field              | Value                                                 |
| ------------------ | ----------------------------------------------------- |
| ID                 | US-101                                                |
| Epic               | EPIC-DB-001 — Database & Prisma Physical Model        |
| Backlog Item       | PB-P0-001 — Database Schema, Migrations & Constraints |
| Feature            | Critical Indexes — raw SQL migration + catalog verification |
| Module / Domain    | Platform / DB                                         |
| User Role          | System                                                |
| Priority           | Must Have (P0)                                        |
| Status             | Approved                                              |
| Owner              | Tech Lead / Backend Lead                              |
| Approved By        | PO/BA Review (Approved with Minor Notes)              |
| Approval Date      | 2026-06-10                                            |
| Ready for Development Tasks | Yes                                          |
| Sprint / Milestone | MVP                                                   |
| Created Date       | 2026-06-09                                            |
| Last Updated       | 2026-06-10 (PO/BA approval gate)                      |

---

## 🎯 User Story

**As the** sistema EventFlow
**I want** implementar los índices críticos no representables en Prisma (índices parciales y funcionales) mediante migration(s) raw SQL separadas, y verificar que el catálogo completo de índices de Doc 18 §25 quede materializado en PostgreSQL
**So that** las consultas frecuentes del MVP (listados con filtros, bandejas, jobs de expiración/cierre, directorio público, badge de notificaciones y reset de seed) cumplan los objetivos de performance (NFR-PERF-001, NFR-PERF-005) sin escaneos completos de tabla.

---

## 🧠 Business Context

### Context Summary

US-099 entregó el schema declarativo (`prisma/schema.prisma`, incluyendo `@@index` y `@@unique` simples) y US-100 entregó la baseline init migration sin raw SQL. Esta historia completa la capa física de índices entregando, vía migration(s) raw SQL separadas (conforme a ADR-DB-005 y Doc 18 §28.3):

* El **índice funcional único** `uq_users_email_lower ON users (LOWER(email))` para login y unicidad case-insensitive.
* Los **12 índices parciales no-únicos** del catálogo Doc 18 §25 (filtros por status activo, jobs de expiración/cierre, directorio público, badge unread, límite de imágenes por trabajo).
* Los **índices parciales `is_seed`** (`idx_<tabla>_is_seed (is_seed) WHERE is_seed = true`) en todas las tablas operativas que declaran `is_seed` (Doc 18 §27.5), habilitando el reset quirúrgico del entorno demo.
* La **verificación de inventario** de que todos los índices obligatorios del catálogo Doc 18 §25 existen físicamente tras `migrate deploy` (los `@@index` simples de US-099 + los raw SQL de esta historia), excluyendo los unique parciales (US-102) y el índice GIN/trigram (diferido por Doc 18 §25.1).

Sin US-101, los listados paginados, las bandejas de proveedor/organizador, los jobs (`auto-complete` de eventos, expiración de cotizaciones, expiración de AIRecommendation) y el reset de seed degradan a sequential scans, comprometiendo NFR-PERF-001 (P95 < 1.5 s) y NFR-PERF-005 (directorio usable).

---

### Related Domain Concepts

Esta historia opera sobre las 19 tablas físicas materializadas por US-100 (`users`, `events`, `event_types`, `event_tasks`, `budgets`, `budget_items`, `vendor_profiles`, `vendor_services`, `service_categories`, `locations`, `quote_requests`, `quotes`, `booking_intents`, `reviews`, `notifications`, `attachments`, `admin_actions`, `ai_recommendations`, `ai_prompt_versions`).

Aplica las convenciones físicas EventFlow ya formalizadas: naming `idx_<tabla>_<columnas>[_partial]` / `uq_<tabla>_<columnas>` (Doc 18 §7), raw SQL comentado `-- Raw SQL: <motivo>` (Doc 18 §28.3), migraciones forward-only (US-100).

---

### PO/BA Decisions Applied

| Decision                                  | Resolution                                                                                                                                                                                                                 |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope of US-101                           | US-101 entrega exclusivamente migration(s) raw SQL para índices **funcionales** y **parciales no-únicos**, más la verificación de inventario del catálogo Doc 18 §25. Deriva de DR-099 Decisión 1 y DR-100 Decisión 1 (Q1). |
| Boundary con US-099                       | Los índices btree simples y compuestos representables en Prisma (`@@index`, incluyendo `sort: Desc`) pertenecen al schema declarativo de US-099 y se materializaron con la baseline de US-100. US-101 los **verifica**; si detecta un índice obligatorio del §25 faltante en el schema, lo agrega vía `@@index` + migration dentro de esta historia (gap-fill). |
| Boundary con US-102                       | Los **unique parciales** (`uq_quote_requests_event_vendor_active`, `uq_quotes_request_active`, `uq_booking_intents_event_category_confirmed`, `uq_prompt_versions_active`), check constraints y enforcement append-only pertenecen a **US-102** (DR-100 Q1). US-101 NO los crea. |
| `uq_users_email_lower` ownership          | Se clasifica como **índice funcional** (categoría raw SQL #3 de Doc 18 §28.3, ejemplo canónico `LOWER(email)`), por lo tanto pertenece a **US-101**, no a US-102. Aunque impone unicidad, no es un "unique parcial" (no tiene cláusula `WHERE`). |
| GIN / trigram                             | `idx_vendor_profiles_business_name_trgm` queda **diferido** conforme a Doc 18 §25.1 ("Índices GIN/GIST sólo se evalúan si MVP detecta latencia crítica en búsqueda libre del directorio; out of scope inicial"). Su promoción futura requiere decisión PO + evidencia de latencia. No se instala la extensión `pg_trgm` en esta historia. |
| Índices `is_seed`                         | Los índices parciales `idx_<tabla>_is_seed (is_seed) WHERE is_seed = true` son índices parciales → pertenecen a US-101, sobre todas las tablas operativas que declaran `is_seed` (Doc 18 §27.5 y §35.4).                    |
| Mecánica de entrega                       | Migration raw SQL separada `prisma/migrations/<YYYYMMDDHHMMSS>_critical_indexes/migration.sql` con timestamp posterior a la baseline de US-100, aplicada con el flujo `db:migrate:*` y validada por los jobs CI ya entregados por US-100. |
| Rollback strategy                         | Forward-only canónico, heredado de US-100 (Q2). Correcciones vía migraciones correctivas adicionales.                                                                                                                       |
| `CREATE INDEX CONCURRENTLY`               | No se usa: Prisma ejecuta migrations dentro de transacción y el volumen de datos MVP (seed 10–20 vendors) no justifica builds concurrentes. `CREATE INDEX` estándar es aceptado.                                            |
| Validación de performance                 | La validación estructural (existencia y definición de índices vía `pg_indexes`) es el criterio de aceptación de US-101. La medición de NFR-PERF-001/005 (P95) ocurre con seed cargado (EPIC-SEED-001 + Doc 20), fuera de esta historia. |

---

### Assumptions

* `prisma/schema.prisma` (US-099) y la baseline init migration (US-100) están mergeadas en la rama base.
* Los scripts `db:migrate:dev`, `db:migrate:deploy`, `db:migrate:status`, `db:migrate:diff` y los jobs CI `prisma-migrate-diff` / `prisma-migrate-smoke` (US-100) están operativos.
* `DATABASE_URL` disponible vía env vars / Secrets Manager (no en repo).
* PostgreSQL 14+ en todos los entornos (Local Docker, CI service container, QA/Demo managed).
* Las tablas están vacías o con volumen MVP al aplicar la migration (no se requieren builds concurrentes ni ventanas de mantenimiento).
* Los `@@index` simples del catálogo §25 fueron declarados en US-099; cualquier faltante se gap-fillea en esta historia.

---

### Dependencies

* `US-099 — Prisma schema declarativo` (mergeada; define `@@index` simples e `is_seed`).
* `US-100 — Prisma migrations baseline + flujo migrate` (mergeada; provee baseline, scripts y jobs CI).
* Coordinación con `US-102 — DB constraints` (unique parciales y checks van en migration separada de US-102; evitar duplicación).
* `Doc 16 — API Design Specification` (queries que justifican los índices).
* `Doc 18 — Database Physical Design` §7, §25, §25.1, §27.5, §28.3, §35.4.
* `Doc 22 — Architecture Decision Records` (ADR-DB-001, ADR-DB-005).

---

## 🔗 Traceability

| Source                 | Reference                                                                                                                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FRD Requirement(s)     | Transversal — soporta el performance de FR-EVENT-*, FR-VENDOR-*, FR-QUOTE-*, FR-REVIEW-*, FR-AI-*, FR-ADMIN-*, FR-ATTACH-* sin implementar directamente ninguno                                     |
| Use Case(s)            | Transversal — no implementa directamente un UC; habilita performance de listados, bandejas, jobs y directorio                                                                                       |
| Business Rule(s)       | Soporte de consulta (sin enforcement): BR-EVENT-013 (job cierre automático), BR-VENDOR-005 (límite 10 imágenes), conteo C-027b (5 solicitudes activas por categoría), job expiración 15 días (US-055) |
| Permission Rule(s)     | No aplica directamente — capacidad técnica; ejecución limitada a pipeline backend y desarrolladores en local                                                                                         |
| Data Entity / Entities | Las 19 tablas físicas MVP; índices nuevos sobre `users`, `events`, `event_tasks`, `vendor_profiles`, `vendor_services`, `service_categories`, `quote_requests`, `quotes`, `reviews`, `notifications`, `attachments`, `ai_recommendations` + `is_seed` en todas las operativas |
| API Endpoint(s)        | No aplica — capa de persistencia; índices derivados de los endpoints de Doc 16 (query-driven)                                                                                                       |
| NFR Reference(s)       | NFR-PERF-001 (P95 < 1.5 s endpoints no-IA), NFR-PERF-005 (directorio usable — Must Have), NFR-DEMO-003 (reset seed idempotente vía índices `is_seed`), NFR-OBS-001 (los índices de `admin_actions` del catálogo §25, verificados por AC-05, soportan la consulta eficiente de auditoría)              |
| Related ADR(s)         | ADR-ARCH-001, ADR-BE-001, ADR-DB-001, ADR-DB-005                                                                                                                                                    |
| Related Document(s)    | `/docs/16-API-Design-Specification.md`, `/docs/18-Database-Physical-Design.md` §7/§25/§25.1/§27.5/§28.3/§35.4, `/docs/20-Testing-Strategy.md`, `/docs/21-Deployment-and-DevOps-Design.md` §10, `/docs/22-Architecture-Decision-Records.md` |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: **In Scope**
* MVP Relevance: **Must Have (P0)**
* Delivery Type: **Technical foundation**
* Scope Boundary: **Migration(s) raw SQL para índices funcionales y parciales no-únicos + verificación de inventario del catálogo Doc 18 §25**

---

### Explicitly Out of Scope

* Unique parciales, check constraints y enforcement append-only → **US-102**
* Baseline migration y flujo `migrate dev`/`migrate deploy` → **US-100** (ya entregado)
* Declaración de `@@index` simples como parte natural del modelo → **US-099** (ya entregado; US-101 solo verifica y gap-fillea)
* Índice GIN/trigram `idx_vendor_profiles_business_name_trgm` y extensión `pg_trgm` → **diferido** (Doc 18 §25.1; requiere evidencia de latencia + decisión PO)
* `CREATE INDEX CONCURRENTLY`, particionamiento, sharding, tuning de `work_mem`/planner
* Medición de performance P95 con carga (pertenece a QA/Doc 20 con seed cargado)
* Seed data y fixtures → EPIC-SEED-001
* Integración CD → US-139; provisioning RDS → US-137
* Base vectorial / RAG, multi-tenant enterprise, pagos reales, contratos firmados, WhatsApp, push notifications

---

### Scope Notes

* Todo raw SQL va comentado inline con `-- Raw SQL: <motivo>` (Doc 18 §28.3).
* La migration de US-101 es **forward-only** e inmutable una vez mergeada (política US-100).
* Naming de índices conforme a Doc 18 §7: `idx_<tabla>_<columnas>[_partial]`, `uq_<tabla>_<columnas>`.
* Los unique parciales de Doc 18 §25 **no** se crean aquí aunque aparezcan en el catálogo: su justificación es regla de negocio (C-027, C-030, C-037) y pertenecen a US-102.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Migration raw SQL de índices críticos creada y aplicable

**Given** la baseline init migration de US-100 aplicada en una DB local
**When** se ejecuta `npx prisma migrate dev` con la nueva migration `prisma/migrations/<YYYYMMDDHHMMSS>_critical_indexes/migration.sql`
**Then** la migration se aplica sin errores
**And** el timestamp del directorio es posterior al de la baseline `<ts>_init`
**And** cada bloque raw SQL incluye el comentario `-- Raw SQL: <motivo>`.

---

### AC-02: Índice funcional único de email creado

**Given** la migration de AC-01 aplicada
**When** se consulta `pg_indexes` para la tabla `users`
**Then** existe `uq_users_email_lower` definido como `UNIQUE INDEX ... ON users (LOWER(email))`
**And** un `INSERT` de un email que solo difiere en mayúsculas de uno existente (`Ana@eventflow.demo` vs `ana@eventflow.demo`) falla con violación de unicidad.

---

### AC-03: Índices parciales no-únicos del catálogo §25 creados

**Given** la migration de AC-01 aplicada
**When** se consulta `pg_indexes` (campo `indexdef`)
**Then** existen los 12 índices parciales con sus predicados `WHERE` exactos:

| Índice | Tabla | Definición |
| --- | --- | --- |
| `idx_users_is_seed` | `users` | `(is_seed) WHERE is_seed = true` (cubierto también por AC-04) |
| `idx_events_status_event_date_active` | `events` | `(status, event_date) WHERE status IN ('active','draft')` |
| `idx_events_auto_complete_candidates` | `events` | `(event_date) WHERE status = 'active'` |
| `idx_event_tasks_due_date_pending` | `event_tasks` | `(due_date) WHERE status = 'pending'` |
| `idx_vendor_profiles_status_location` | `vendor_profiles` | `(status, location_id) WHERE status = 'approved'` |
| `idx_vendor_services_active` | `vendor_services` | `(vendor_profile_id) WHERE is_active = true` |
| `idx_service_categories_active` | `service_categories` | `(is_active) WHERE is_active = true` |
| `idx_quote_requests_event_category_active` | `quote_requests` | `(event_id, service_category_id) WHERE status IN ('sent','viewed','responded')` |
| `idx_quotes_valid_until_active` | `quotes` | `(valid_until) WHERE status = 'sent'` |
| `idx_reviews_vendor_status_published` | `reviews` | `(vendor_profile_id) WHERE status = 'published'` |
| `idx_notifications_user_unread` | `notifications` | `(user_id) WHERE status = 'unread'` |
| `idx_attachments_vendor_work_active` | `attachments` | `(owner_id, work_label) WHERE owner_type = 'vendor_work' AND status = 'active'` |
| `idx_ai_rec_pending_expires` | `ai_recommendations` | `(expires_at) WHERE status = 'pending'` |

---

### AC-04: Índices parciales `is_seed` en todas las tablas operativas

**Given** la migration de AC-01 aplicada
**When** se consulta `pg_indexes`
**Then** toda tabla física que declara la columna `is_seed` tiene su índice `idx_<tabla>_is_seed (is_seed) WHERE is_seed = true` (Doc 18 §27.5)
**And** la lista de tablas cubiertas se deriva del schema de US-099 (sin omisiones).

---

### AC-05: Inventario completo del catálogo Doc 18 §25 verificado

**Given** una DB con todas las migrations aplicadas (`migrate deploy`)
**When** se ejecuta el test de inventario que compara `pg_indexes` contra el catálogo obligatorio de Doc 18 §25
**Then** todos los índices obligatorios existen (los `@@index`/`@@unique` simples de US-099 + los raw SQL de esta historia)
**And** quedan explícitamente excluidos de la verificación: los 4 unique parciales (US-102) y `idx_vendor_profiles_business_name_trgm` (diferido §25.1)
**And** si un índice btree simple del §25 falta en el schema de US-099, se agrega vía `@@index` + migration dentro de esta historia (gap-fill documentado en el PR).

---

### AC-06: `migrate deploy` idempotente con la nueva migration

**Given** una BD con la migration de índices ya aplicada
**When** se ejecuta `npx prisma migrate deploy` por segunda vez
**Then** termina con exit code 0 sin cambios en la BD.

---

### AC-07: Jobs CI de US-100 permanecen verdes

**Given** el PR que agrega la migration de índices
**When** corren los jobs CI `prisma-migrate-diff` y `prisma-migrate-smoke` (US-100)
**Then** ambos jobs terminan verdes
**And** el smoke test se extiende para verificar el inventario de índices (AC-05) tras `migrate deploy` en la DB ephemeral
**And** si `prisma migrate diff` reporta como drift los índices raw SQL no representables en PSL, el ajuste del job se documenta en el README conforme al Handling de EC-01.

---

### AC-08: La migration NO incluye artefactos de otras historias

**Given** el archivo `migration.sql` de esta historia
**When** se inspecciona su contenido
**Then** NO contiene unique parciales, check constraints, triggers, enforcement append-only (US-102), `CREATE EXTENSION pg_trgm`, índices GIN, seed data ni secretos.

---

## ⚠️ Edge Cases

### EC-01: Drift detection vs índices raw SQL no representables en Prisma

**Given** índices parciales/funcionales creados vía raw SQL que el Prisma Schema Language no puede expresar
**When** corre el job CI `prisma-migrate-diff` (`--from-migrations --to-schema-datamodel --exit-code`)
**Then** el job podría reportar estos índices como divergencia (limitación conocida de Prisma).

#### Handling

* Validar el comportamiento real de la versión de Prisma del stack en el PR de esta historia.
* Si hay falso positivo: ajustar el job de drift (p. ej. allowlist documentada o diff dirigido a tablas/objetos representables) **sin desactivar** la detección de drift para el resto del schema.
* Documentar el comportamiento y el ajuste en el README backend, sección `Database Migrations`.

---

### EC-02: `CREATE INDEX` sobre tablas con datos (re-deploy en QA/Demo)

**Given** un entorno QA/Demo con datos seed existentes
**When** `migrate deploy` aplica la migration de índices
**Then** los `CREATE INDEX` toman locks de escritura durante el build.

#### Handling

* Aceptado para MVP: volumen seed (10–20 vendors, decenas de filas) hace el lock despreciable.
* `CREATE INDEX CONCURRENTLY` descartado (no ejecutable dentro de la transacción de Prisma migrate); documentado como deuda consciente si el volumen crece post-MVP.

---

### EC-03: Índice duplicado entre `@@index` (US-099) y raw SQL (US-101)

**Given** un índice btree ya declarado vía `@@index` en `schema.prisma`
**When** se redacta el raw SQL de esta historia
**Then** la migration NO debe recrear índices ya materializados por la baseline.

#### Handling

* El raw SQL de US-101 se limita a índices funcionales y parciales (no representables en PSL).
* El test de inventario (AC-05) detecta tanto faltantes como duplicados por nombre.

---

### EC-04: Migration de índices con timestamp anterior a la baseline

**Given** un directorio de migration generado con timestamp incorrecto
**When** Prisma ordena las migrations cronológicamente
**Then** la migration de índices fallaría al referenciar tablas inexistentes.

#### Handling

* Generar la migration con `prisma migrate dev --create-only` después de la baseline; CI smoke (deploy desde cero) captura cualquier error de orden.

---

## 🚫 Validation Rules

| ID    | Rule                                                                                   | Message / Behavior                                  |
| ----- | --------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| VR-01 | Todo bloque raw SQL lleva comentario `-- Raw SQL: <motivo>` (Doc 18 §28.3)             | Revisión PR falla si falta                           |
| VR-02 | Naming conforme a Doc 18 §7 (`idx_*`, `uq_*`)                                           | Revisión PR / test estructural falla                 |
| VR-03 | La migration NO contiene unique parciales, checks, triggers, GIN ni `CREATE EXTENSION`  | Test estructural (regex) falla → bloquea merge       |
| VR-04 | Inventario §25 completo tras `migrate deploy` (excluyendo US-102 y GIN diferido)        | Test de inventario falla → bloquea merge             |
| VR-05 | `migrate deploy` idempotente con la nueva migration                                     | Smoke CI falla → bloquea merge                       |
| VR-06 | Migration mergeada es inmutable; correcciones vía migration correctiva (forward-only)   | Job `prisma-migrate-diff` detecta y bloquea          |
| VR-07 | La migration NO contiene secretos ni `DATABASE_URL`                                     | Secret scanner CI (US-100) falla → bloquea merge     |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                                  |
| ------ | ---------------------------------------------------------------------------------------------------------------------- |
| SEC-01 | El archivo `migration.sql` NO debe contener `DATABASE_URL`, contraseñas ni cadenas de conexión reales.                  |
| SEC-02 | `DATABASE_URL` vive en env vars / Secrets Manager; nunca en repo (alineado con US-099/US-100/US-138).                    |
| SEC-03 | Logs CI de `migrate deploy` NO deben imprimir `DATABASE_URL` ni datos sensibles.                                         |
| SEC-04 | La ejecución de `migrate deploy` en QA/Demo queda limitada al pipeline (política heredada de US-100 SEC-04).             |

### Negative Authorization Scenarios

No aplica directamente — esta historia no introduce endpoints ni runtime authorization. La ejecución de migrations queda restringida al pipeline backend y a desarrolladores en local.

---

## 🤖 AI Behavior

This story does not invoke AI directly.

### AI Involvement

| Field                     | Value          |
| ------------------------- | -------------- |
| AI Feature                | None           |
| Provider Layer            | Not applicable |
| Human Validation Required | Not applicable |
| Persist AIRecommendation  | No             |
| Fallback Required         | Not applicable |

### Human-in-the-loop Rules

No aplica — esta historia no invoca IA directamente. (Los índices sobre `ai_recommendations` solo soportan los jobs y auditoría definidos en otras historias.)

---

## 🎨 UX / UI Notes

No aplica — capacidad técnica sin UI.

| UX Area        | Applicability |
| -------------- | ------------- |
| Screens        | No aplica     |
| Forms          | No aplica     |
| Loading states | No aplica     |
| Error states   | No aplica     |
| Empty states   | No aplica     |
| Success states | No aplica     |
| Accessibility  | No aplica     |
| i18n UI Copy   | No aplica     |

---

## 🛠 Technical Notes

### Frontend

No aplica — esta historia no requiere cambios frontend.

---

### Backend

| Topic                | Guidance                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| Use Case / Service   | No aplica — capa física de persistencia                                                                       |
| Controller / Route   | No aplica                                                                                                     |
| Authorization Policy | No aplica runtime                                                                                             |
| Validation           | Test de inventario de índices + test estructural sobre `migration.sql` + jobs CI de US-100                    |
| Transaction Required | Prisma aplica la migration dentro de su transacción estándar                                                  |
| Scripts              | Reutiliza `db:migrate:dev`, `db:migrate:deploy`, `db:migrate:status`, `db:migrate:diff` (US-100); sin scripts nuevos |
| Runbook              | README backend § Database Migrations: agregar nota sobre migration de índices y manejo de drift (EC-01)       |

---

### Database

#### Migration de índices críticos

* **Path**: `prisma/migrations/<YYYYMMDDHHMMSS>_critical_indexes/migration.sql` (timestamp posterior a la baseline `<ts>_init`).
* **Generación**: `npx prisma migrate dev --create-only --name critical_indexes` + edición manual con el raw SQL.
* **Contenido**:
  * `-- Raw SQL: índice funcional para login case-insensitive` → `CREATE UNIQUE INDEX uq_users_email_lower ON users (LOWER(email));`
  * `-- Raw SQL: índice parcial <motivo>` → los 12 índices parciales de AC-03 con sus predicados exactos de Doc 18 §25.
  * `-- Raw SQL: índice parcial reset seed` → `CREATE INDEX idx_<tabla>_is_seed ON <tabla> (is_seed) WHERE is_seed = true;` por cada tabla operativa con `is_seed`.
* **Contenido NO permitido**: unique parciales / checks / triggers (US-102), `CREATE EXTENSION pg_trgm` e índices GIN (diferidos), seed data, secretos.

#### Verificación de inventario (AC-05)

* Query de referencia: `SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public';` comparada contra el catálogo obligatorio de Doc 18 §25.
* Exclusiones explícitas: `uq_quote_requests_event_vendor_active`, `uq_quotes_request_active`, `uq_booking_intents_event_category_confirmed`, `uq_prompt_versions_active` (US-102) y `idx_vendor_profiles_business_name_trgm` (diferido).

#### Política

* Forward-only, inmutable post-merge, sin `CONCURRENTLY` (ver EC-02), naming Doc 18 §7.

---

### API

| Method | Endpoint | Purpose   |
| ------ | -------- | --------- |
| —      | —        | No aplica |

---

### Observability / Audit

| Topic                             | Required                                                          |
| --------------------------------- | ------------------------------------------------------------------ |
| Correlation ID                    | No aplica                                                          |
| Runtime logs                      | No aplica                                                          |
| AdminAction                       | No aplica                                                          |
| AIRecommendation runtime creation | No aplica                                                          |
| CI logs                           | Sí, para `migrate deploy` (smoke), test de inventario y drift job   |

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                                                      | Type        |
| ----- | --------------------------------------------------------------------------------------------------------------- | ----------- |
| TS-01 | Migration `<ts>_critical_indexes` se aplica sin errores sobre DB con baseline                                   | Integration |
| TS-02 | `uq_users_email_lower` existe y rechaza emails duplicados case-insensitive                                      | Integration |
| TS-03 | Los 12 índices parciales de AC-03 existen con sus predicados `WHERE` exactos (`pg_indexes.indexdef`)            | Integration |
| TS-04 | Índices `is_seed` parciales presentes en todas las tablas operativas con `is_seed`                              | Integration |
| TS-05 | Inventario §25 completo (excluyendo US-102 y GIN diferido); sin duplicados por nombre                           | Integration / CI |
| TS-06 | `migrate deploy` idempotente: segunda ejecución exit code 0                                                     | Integration |
| TS-07 | Jobs CI `prisma-migrate-diff` y `prisma-migrate-smoke` verdes con la nueva migration                            | CI          |
| TS-08 | `migration.sql` cumple VR-01..VR-03 (comentarios raw SQL, naming, sin artefactos de US-102/GIN) — regex check   | Unit        |

### Negative Tests

| ID    | Scenario                                                                  | Expected Result                                  |
| ----- | -------------------------------------------------------------------------- | ------------------------------------------------- |
| NT-01 | `INSERT` en `users` con email duplicado en distinto case                   | Falla con unique violation (`uq_users_email_lower`) |
| NT-02 | `migration.sql` contiene `CREATE UNIQUE INDEX ... WHERE` (unique parcial)  | Test estructural TS-08 falla                       |
| NT-03 | `migration.sql` contiene `CREATE EXTENSION` o `USING gin`                  | Test estructural TS-08 falla                       |
| NT-04 | Índice obligatorio del §25 ausente tras `migrate deploy`                   | Test de inventario TS-05 falla                     |
| NT-05 | Migration mergeada modificada retroactivamente                             | Job `prisma-migrate-diff` detecta y falla          |
| NT-06 | `migration.sql` contiene secretos o `DATABASE_URL`                         | Secret scanner CI falla                            |

### AI Tests

No aplica para esta historia.

### Authorization Tests

No aplica para esta historia.

### Accessibility Tests

No aplica para esta historia.

---

## 📊 Business Impact

| Field               | Value                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| KPI Affected        | Latencia P95 endpoints no-IA (NFR-PERF-001), usabilidad del directorio (NFR-PERF-005), tiempo de reset demo (NFR-DEMO-003) |
| Expected Impact     | Listados, bandejas, jobs de expiración/cierre y reset seed operan con index scans; desbloquea el cierre de PB-P0-001 junto con US-102 |
| Success Criteria    | Test de inventario §25 verde en CI + jobs `prisma-migrate-diff`/`prisma-migrate-smoke` verdes + migration mergeada        |
| Academic Demo Value | Evidencia de diseño físico query-driven (Doc 18 §25) y política raw SQL controlada (ADR-DB-005)                            |

---

## 🧩 Task Breakdown Readiness

### Potential Database Tasks

* Generar migration `<ts>_critical_indexes` con `--create-only` y redactar el raw SQL (funcional + 12 parciales + `is_seed` por tabla) con comentarios `-- Raw SQL:`.
* Derivar del schema US-099 la lista exacta de tablas con `is_seed` para los índices parciales de reset.
* Verificar gap-fill: contrastar `@@index` declarados en US-099 contra los btree simples obligatorios del §25.

### Potential Backend Tasks

* Nota en README backend (sección `Database Migrations`) sobre la migration de índices y el manejo de drift (EC-01).

### Potential QA Tasks

* Test de inventario de índices contra `pg_indexes` (TS-03..TS-05).
* Test estructural regex sobre `migration.sql` (TS-08, NT-02, NT-03).
* Test de unicidad case-insensitive de email (TS-02, NT-01).
* Extender el job `prisma-migrate-smoke` (US-100) con la verificación de inventario.

### Potential DevOps Tasks

* Validar comportamiento del job `prisma-migrate-diff` frente a índices raw SQL (EC-01) y ajustar/documentar si reporta falso drift.

---

## ✅ Definition of Ready

* [x] Rol claro: System.
* [x] Goal técnico claro: índices funcionales + parciales vía raw SQL + verificación de catálogo §25.
* [x] Boundary formalizado con US-099 / US-100 / US-102 (DR-099 Decisión 1, DR-100 Decisión 1).
* [x] Ownership de `uq_users_email_lower` resuelto (funcional → US-101).
* [x] GIN/trigram diferido conforme a Doc 18 §25.1.
* [x] Índices `is_seed` incluidos conforme a Doc 18 §27.5/§35.4.
* [x] Out of Scope explícito.
* [x] Acceptance Criteria testables (AC-01..AC-08).
* [x] Edge cases documentados, incluyendo riesgo drift Prisma (EC-01).
* [x] Dependencias conocidas (US-099, US-100 mergeadas; coordinación US-102).
* [x] Tests definidos (TS-01..TS-08, NT-01..NT-06).
* [ ] Tech Lead validó.

---

## 🏁 Definition of Done

* [ ] Migration `prisma/migrations/<YYYYMMDDHHMMSS>_critical_indexes/migration.sql` versionada y revisada en PR.
* [ ] `uq_users_email_lower` operativo (unicidad case-insensitive verificada).
* [ ] 12 índices parciales de AC-03 creados con predicados exactos.
* [ ] Índices `is_seed` parciales en todas las tablas operativas.
* [ ] Test de inventario §25 verde (exclusiones US-102 y GIN documentadas).
* [ ] `migrate deploy` idempotente verificado en smoke CI.
* [ ] Jobs CI `prisma-migrate-diff` y `prisma-migrate-smoke` verdes (con ajuste de drift documentado si aplicó EC-01).
* [ ] Tests funcionales TS-01..TS-08 verdes.
* [ ] Tests negativos NT-01..NT-06 verdes.
* [ ] README backend actualizado (migration de índices + nota drift).
* [ ] PR revisado por Tech Lead.

---

## 📝 Notes

* Las decisiones de alcance y boundary de esta historia están formalizadas en `management/user-stories/decision-resolutions/US-101-decision-resolution.md` (9 decisiones consolidadas; ninguna bloqueante).
* La US-101 **no crea unique parciales ni check constraints**; eso pertenece a US-102 (incluye `uq_quote_requests_event_vendor_active`, `uq_quotes_request_active`, `uq_booking_intents_event_category_confirmed`, `uq_prompt_versions_active`).
* La US-101 **no instala `pg_trgm` ni índices GIN**; `idx_vendor_profiles_business_name_trgm` queda diferido por Doc 18 §25.1 hasta tener evidencia de latencia y decisión PO.
* `uq_users_email_lower` se entrega aquí por ser **índice funcional** (categoría raw SQL #3 de Doc 18 §28.3), aunque imponga unicidad.
* La validación de performance real (P95) se mide con seed cargado conforme a Doc 20; esta historia garantiza la estructura, no la medición.
* El riesgo de falso drift en `prisma migrate diff` por índices no representables en PSL (EC-01) debe validarse en el PR y documentarse; no desactivar drift detection global.

### Documentation Alignment Required (no bloqueante)

* **Doc 18 §35.2** — Ya rastreado por US-100: la baseline descrita ahí agrupa raw SQL que en la decomposición aprobada pertenece a US-101 (índices) y US-102 (constraints). Amendar post-merge.
* **Doc 18 §25 vs §25.1** — El catálogo §25 lista `idx_vendor_profiles_business_name_trgm` como "opcional MVP" y §25.1 lo declara out of scope inicial; esta historia formaliza su diferimiento. Amendar §25 para marcarlo explícitamente como diferido post-MVP si se desea mayor claridad.
