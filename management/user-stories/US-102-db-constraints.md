# 🧾 User Story: Implementar constraints físicos vía raw SQL (checks, unique parciales) y validar el catálogo C-001..C-062

## 🆔 Metadata

| Field              | Value                                                 |
| ------------------ | ----------------------------------------------------- |
| ID                 | US-102                                                |
| Epic               | EPIC-DB-001 — Database & Prisma Physical Model        |
| Backlog Item       | PB-P0-001 — Database Schema, Migrations & Constraints |
| Feature            | DB Constraints — raw SQL migration + C-catalog validation matrix |
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
**I want** implementar los constraints físicos no representables en Prisma (check constraints y unique parciales) mediante migration(s) raw SQL separadas, y producir la matriz de validación del catálogo completo C-001..C-062 (mecanismo de enforcement + historia owner por constraint)
**So that** la integridad de datos quede garantizada en el motor como última línea de defensa (NFR-DATA-001..008) y PB-P0-001 cierre con evidencia trazable de los 62 constraints del Domain Data Model.

---

## 🧠 Business Context

### Context Summary

US-099 entregó el schema declarativo (FKs, NOT NULL, enums, `@unique`/`@@unique` simples, defaults), US-100 la baseline migration y US-101 los índices críticos raw SQL. Esta historia cierra la decomposición física de PB-P0-001 entregando, vía migration raw SQL separada (ADR-DB-005, Doc 18 §28.3):

* Los **16 check constraints** del diseño físico (Doc 18 §13.3, §14.1, §14.4, §14.5, §15.1, §15.2, §15.3, §16.2, §16.3, §17.1, §19.1, §21.1, §24, §35.3): no-vacíos de `users`, rangos y montos no negativos de `events`/`budgets`/`budget_items`/`vendor_services`/`quotes`/`attachments`/`reviews`/`ai_recommendations`, límites de `vendor_profiles`/`service_categories` y el invariante `is_simulated = true` de `booking_intents`.
* Los **4 unique parciales** que materializan reglas de negocio dependientes de estado: `uq_quote_requests_event_vendor_active` (C-027), `uq_quotes_request_active` (C-030), `uq_booking_intents_event_category_confirmed` (C-037) y `uq_prompt_versions_active` (Doc 18 §21.2).
* La **matriz de validación C-001..C-062**: clasificación versionada de cada constraint del catálogo (Doc 6 §17 / Doc 18 §24) según su mecanismo (DB baseline US-099 / DB raw SQL US-102 / service layer / job / middleware / ausencia de tabla) y su historia owner, cumpliendo el Acceptance Summary de PB-P0-001 ("validar los 62 constraints").
* Los **tests de violación**: por cada constraint DB-enforced nuevo, un test que intenta violarlo y asserta el rechazo del motor.

Sin US-102, las invariantes críticas del negocio (una cotización vigente por solicitud, un booking confirmado por categoría, rating 1–5, montos no negativos) dependerían únicamente del service layer, sin defensa en el motor ante bugs o accesos directos.

---

### Related Domain Concepts

Opera sobre las 19 tablas físicas materializadas por US-100, con foco en `users`, `events`, `budget_items`, `vendor_profiles`, `service_categories`, `quote_requests`, `quotes`, `booking_intents`, `reviews`, `ai_recommendations`, `ai_prompt_versions`, `admin_actions`.

Convenciones EventFlow: naming `chk_<tabla>_<regla>` / `uq_<tabla>_<columnas>` (Doc 18 §7, §13.3), raw SQL comentado `-- Raw SQL: <motivo>` (Doc 18 §28.3), forward-only (US-100).

---

### PO/BA Decisions Applied

| Decision                                  | Resolution                                                                                                                                                                                                                 |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope of US-102                           | US-102 entrega exclusivamente: raw SQL para check constraints + los 4 unique parciales, la matriz de validación C-001..C-062 y los tests de violación. Deriva de DR-100 Decisión 1 (Q1) y DR-101 Decisión 3.                  |
| `uq_users_email_lower`                    | **NO se crea aquí**: es índice funcional entregado por US-101 (DR-101 Decisión 4). La matriz lo clasifica como C-001 → US-101.                                                                                                |
| Boundary con US-099                       | FKs, NOT NULL, enums, `@unique`/`@@unique` simples (C-015 `budgets.event_id`, C-019 `vendor_profiles.user_id`, C-040 `uq_reviews_event_vendor`, `uq_prompt_versions_prompt_version`) y defaults (`C-046`, `timeout_ms` 60000) ya viven en el schema US-099 y la baseline US-100. US-102 los **verifica vía matriz**, no los recrea. |
| Constraints service-layer                 | Los constraints cuyo mecanismo canónico es service layer (C-003, C-006, C-007, C-008, C-016, C-020, C-022, C-027b, C-029, C-034, C-039, C-048, C-049, C-052, C-061, entre otros), jobs (C-032, C-056) o middleware (C-059) **no se implementan aquí**: quedan clasificados en la matriz con su historia owner (backend/API/jobs). |
| Append-only `admin_actions` (C-050)       | Se aplica por **convención + service layer** (sin code paths de UPDATE/DELETE) + test de matriz. El `REVOKE UPDATE, DELETE` al rol de aplicación queda **diferido**: Doc 18 §20.1 lo marca "opcional MVP" y requiere separación de roles DB (provisioning US-137+). |
| `ai_prompt_versions` immutability         | Se garantiza por **versionado** (filas nuevas por versión, nunca edición de versiones publicadas — enfoque híbrido Doc 18 §21.2, `template_hash` detecta drift) + el unique parcial `uq_prompt_versions_active` entregado aquí. Sin trigger. La mención "enforcement append-only (ai_prompt_versions)" en DR-100 se precisa como Documentation Alignment (la tabla append-only canónica es `admin_actions`). |
| Triggers                                  | **No se crean triggers** en US-102: Doc 18 §28.3 no los lista entre los casos válidos de raw SQL y §14.1 descarta explícitamente el trigger de inmutabilidad de `currency_code` como overengineering MVP.                      |
| `DEFAULT valid_until` en motor (C-031)    | **Descartado para MVP**: la regla aplica al transicionar la quote a `sent`, no al INSERT, por lo que un DEFAULT de motor sería semánticamente incorrecto. Service layer es el mecanismo canónico (Doc 18 §16.2); el "refuerzo opcional" queda diferido. |
| Mecánica de entrega                       | Migration raw SQL separada `prisma/migrations/<YYYYMMDDHHMMSS>_db_constraints/migration.sql`, con timestamp posterior a `<ts>_critical_indexes` (US-101), aplicada con el flujo `db:migrate:*` y los jobs CI de US-100 (con el manejo de drift validado en US-101). |
| Rollback strategy                         | Forward-only canónico heredado de US-100 (Q2).                                                                                                                                                                              |
| Validación                                | Estructural (existencia/definición vía `pg_constraint`/`pg_indexes`) + tests de violación contra PostgreSQL real. Sin medición de performance.                                                                                |

---

### Assumptions

* `prisma/schema.prisma` (US-099), baseline migration (US-100) y migration de índices (US-101) mergeadas en la rama base.
* Scripts `db:migrate:*` y jobs CI `prisma-migrate-diff` / `prisma-migrate-smoke` operativos (US-100), con el comportamiento ante raw SQL ya validado empíricamente en US-101 (DR-101 Decisión 8).
* PostgreSQL 14+ en todos los entornos; tablas vacías o con volumen MVP al aplicar (los `ALTER TABLE ... ADD CONSTRAINT` validan datos existentes).
* La numeración C-001..C-062 incluye sub-IDs (C-022b, C-026b, C-027b) conforme a Doc 6 §17; la matriz cubre todas las filas del catálogo.

---

### Dependencies

* `US-099 — Prisma schema declarativo` (mergeada).
* `US-100 — Prisma migrations baseline + flujo migrate + CI` (mergeada).
* `US-101 — Critical indexes` (recomendado mergeada antes, por orden cronológico de migrations y por el manejo de drift ya resuelto; DR-101 Decisiones 3–4 citadas).
* `Doc 6 — Domain Data Model` §17 (catálogo C-001..C-062).
* `Doc 18 — Database Physical Design` §7, §13.3, §14.1, §16.x, §20.1, §21.1, §21.2, §24, §28.3, §35.3.
* `Doc 22 — ADRs` (ADR-DB-001, ADR-DB-005).

---

## 🔗 Traceability

| Source                 | Reference                                                                                                                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FRD Requirement(s)     | Transversal — protege la integridad de FR-EVENT-*, FR-VENDOR-*, FR-QUOTE-*, FR-REVIEW-*, FR-AI-*, FR-ADMIN-* sin implementar directamente ninguno                                                   |
| Use Case(s)            | Transversal — no implementa directamente un UC; defiende invariantes consumidas por múltiples casos de uso                                                                                          |
| Business Rule(s)       | Enforcement DB directo: BR-QUOTE-004 (C-027), BR-QUOTE-013 (C-030), BR-BOOKING-007 (C-037), BR-BOOKING-004 (C-038), BR-REVIEW-003 (C-041), BR-VENDOR-004 (C-022b), BR-SERVICE-005 (C-026b). El resto del catálogo C-001..C-062 queda clasificado en la matriz con su mecanismo y owner |
| Permission Rule(s)     | No aplica directamente — capacidad técnica; ejecución limitada a pipeline backend y desarrolladores en local                                                                                         |
| Data Entity / Entities | Las 19 tablas físicas MVP; constraints nuevos sobre `users`, `events`, `budget_items`, `vendor_profiles`, `service_categories`, `quote_requests`, `quotes`, `booking_intents`, `reviews`, `ai_recommendations`, `ai_prompt_versions` |
| API Endpoint(s)        | No aplica — capa de persistencia                                                                                                                                                                    |
| NFR Reference(s)       | NFR-DATA-001..NFR-DATA-008 (integridad de datos — Must Have), NFR-DEMO-003 (seed válido contra constraints), NFR-OBS-001 (C-050 `admin_actions` append-only soporta la auditoría)                    |
| Related ADR(s)         | ADR-ARCH-001, ADR-BE-001, ADR-DB-001, ADR-DB-005                                                                                                                                                    |
| Related Document(s)    | `/docs/6-Domain-Data-Model.md` §17, `/docs/18-Database-Physical-Design.md` §13.3/§14.1/§20.1/§21.1/§21.2/§24/§28.3/§35.3, `/docs/20-Testing-Strategy.md`, `/docs/22-Architecture-Decision-Records.md` |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: **In Scope**
* MVP Relevance: **Must Have (P0)**
* Delivery Type: **Technical foundation**
* Scope Boundary: **Migration(s) raw SQL para check constraints y unique parciales + matriz de validación C-001..C-062 + tests de violación**

---

### Explicitly Out of Scope

* `uq_users_email_lower` (índice funcional) → **US-101** (entregado; DR-101 Decisión 4).
* Índices parciales no-únicos e `is_seed` → **US-101** (entregado).
* Constraints de mecanismo service layer, jobs o middleware → historias backend/API correspondientes (clasificados en la matriz, no implementados aquí).
* `REVOKE UPDATE, DELETE` sobre `admin_actions` → **diferido** (Doc 18 §20.1 "opcional MVP"; requiere separación de roles DB, US-137+).
* Triggers de cualquier tipo (incluido inmutabilidad `currency_code`, descartado por Doc 18 §14.1).
* `DEFAULT (CURRENT_DATE + INTERVAL '15 days')` para `quotes.valid_until` → service layer (Doc 18 §16.2).
* Cambios a schema declarativo, baseline, scripts `db:migrate:*` o pipeline CD.
* Seed data → EPIC-SEED-001; RDS → US-137; medición de performance → Doc 20 post-seed.
* Pagos reales, contratos, WhatsApp, push, RAG, multi-tenant enterprise.

---

### Scope Notes

* Todo raw SQL comentado `-- Raw SQL: <motivo>` (Doc 18 §28.3; casos válidos #1 unique parciales y #2 check constraints).
* Migration forward-only e inmutable post-merge.
* La matriz C-001..C-062 es **evidencia de validación**, no re-implementación: cada fila cita el mecanismo de Doc 18 §24 y la historia owner.
* Los errores de constraint del motor se traducen a error envelope en las historias backend (US-093); aquí solo se garantiza el rechazo.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Migration raw SQL de constraints creada y aplicable

**Given** la baseline (US-100) y la migration de índices (US-101) aplicadas en una DB local
**When** se ejecuta `npx prisma migrate dev` con la nueva migration `prisma/migrations/<YYYYMMDDHHMMSS>_db_constraints/migration.sql`
**Then** la migration se aplica sin errores
**And** el timestamp del directorio es posterior al de `<ts>_critical_indexes`
**And** cada bloque raw SQL incluye el comentario `-- Raw SQL: <motivo>`.

---

### AC-02: 16 check constraints creados con definiciones exactas

**Given** la migration de AC-01 aplicada
**When** se consulta `pg_constraint` (contype = 'c') con `pg_get_constraintdef`
**Then** existen los siguientes check constraints:

| Constraint | Tabla | Regla | Fuente |
| --- | --- | --- | --- |
| `chk_users_email_not_empty` | `users` | `email <> ''` | Doc 18 §13.3 |
| `chk_users_password_hash_not_empty` | `users` | `password_hash <> ''` | Doc 18 §13.3 |
| `chk_events_guests_count_positive` | `events` | `guests_count >= 1` | C-009 |
| `chk_events_estimated_budget_nonneg` | `events` | `estimated_budget >= 0` | C-010 |
| `chk_budgets_totals_nonneg` | `budgets` | `total_planned >= 0 AND total_committed >= 0` | Doc 18 §14.4 |
| `chk_budget_items_amounts_nonneg` | `budget_items` | `planned >= 0 AND committed >= 0 AND paid >= 0` | C-017 |
| `chk_vendor_profiles_category_change_max` | `vendor_profiles` | `category_change_count <= 5` | C-022b / Doc 18 §15.1 |
| `chk_vendor_profiles_languages_not_empty` | `vendor_profiles` | `cardinality(languages_supported) > 0` | Doc 18 §15.1 |
| `chk_vendor_services_base_price_nonneg` | `vendor_services` | `base_price >= 0` | Doc 18 §15.2 |
| `chk_service_categories_depth_level` | `service_categories` | `depth_level BETWEEN 1 AND 2` | C-026b |
| `chk_quotes_total_price_nonneg` | `quotes` | `total_price >= 0` | Doc 18 §16.2 |
| `chk_booking_intents_is_simulated` | `booking_intents` | `is_simulated = true` | C-038 |
| `chk_reviews_rating_range` | `reviews` | `rating BETWEEN 1 AND 5` | C-041 |
| `chk_attachments_size_bytes_nonneg` | `attachments` | `size_bytes >= 0` | Doc 18 §19.1 |
| `chk_ai_recommendations_timeout_positive` | `ai_recommendations` | `timeout_ms > 0` | Doc 18 §21.1 |
| `chk_ai_recommendations_retry_max` | `ai_recommendations` | `retry_count BETWEEN 0 AND 1` | Doc 18 §21.1 |

**Nota de naming:** los constraints sin nombre explícito en Doc 18 (checks de columna: `languages_supported`, `base_price`, `total_price`, `size_bytes`) siguen la convención `chk_<tabla>_<descripcion>` de Doc 18 §7.

---

### AC-03: 4 unique parciales creados con predicados exactos

**Given** la migration de AC-01 aplicada
**When** se consulta `pg_indexes` (campo `indexdef`)
**Then** existen los 4 unique parciales:

| Índice único parcial | Tabla | Definición | Constraint |
| --- | --- | --- | --- |
| `uq_quote_requests_event_vendor_active` | `quote_requests` | `(event_id, vendor_profile_id) WHERE status IN ('sent','viewed','responded')` | C-027 |
| `uq_quotes_request_active` | `quotes` | `(quote_request_id) WHERE status NOT IN ('expired','rejected')` | C-030 |
| `uq_booking_intents_event_category_confirmed` | `booking_intents` | `(event_id, service_category_id) WHERE status = 'confirmed_intent'` | C-037 |
| `uq_prompt_versions_active` | `ai_prompt_versions` | `(prompt_id) WHERE status = 'active'` | Doc 18 §21.2 |

---

### AC-04: El motor rechaza violaciones de cada check constraint

**Given** la migration aplicada sobre PostgreSQL real
**When** se intenta insertar/actualizar una fila que viola cada check de AC-02 (ej. `rating = 6`, `guests_count = 0`, `is_simulated = false`, `depth_level = 3`, montos negativos)
**Then** cada operación falla con violación del constraint correspondiente (SQLSTATE `23514`)
**And** el nombre del constraint violado coincide con el esperado.

---

### AC-05: Los unique parciales rechazan duplicados activos y permiten coexistencia con históricos

**Given** la migration aplicada
**When** se intenta crear: (a) una segunda `quote_request` en estado activo para el mismo `(event_id, vendor_profile_id)`; (b) una segunda `quote` vigente para la misma `quote_request`; (c) un segundo `booking_intent` `confirmed_intent` para el mismo `(event_id, service_category_id)`; (d) una segunda versión `active` para el mismo `prompt_id`
**Then** cada inserción falla con unique violation (SQLSTATE `23505`)
**And** la inserción SÍ es permitida cuando la fila preexistente está en estado fuera del predicado (ej. `quote_request` `cancelled`/`expired`, `quote` `expired`/`rejected`, `booking_intent` `cancelled`, prompt version `deprecated`).

---

### AC-06: Matriz de validación C-001..C-062 completa y versionada

**Given** el catálogo C-001..C-062 de Doc 6 §17 / Doc 18 §24 (incluyendo sub-IDs C-022b, C-026b, C-027b)
**When** se inspecciona la matriz entregada (documento versionado en el repositorio)
**Then** cada constraint del catálogo tiene exactamente una clasificación: `DB — US-099 baseline (FK/NOT NULL/enum/unique/default)` / `DB — US-101 (índice funcional)` / `DB — US-102 (check / unique parcial)` / `Service layer (historia owner)` / `Job (historia owner)` / `Middleware (historia owner)` / `Ausencia de tabla/campo (out of scope estructural)`
**And** ninguna fila queda sin mecanismo ni owner
**And** las filas DB-enforced referencian su test de violación o verificación estructural.

---

### AC-07: `migrate deploy` idempotente y jobs CI verdes

**Given** el PR con la migration de constraints
**When** corren `prisma-migrate-smoke` (extendido en US-101) y `prisma-migrate-diff`
**Then** ambos jobs terminan verdes (aplicando el manejo de drift ya validado/ajustado en US-101 si los objetos raw SQL lo requieren)
**And** una segunda ejecución de `migrate deploy` termina con exit code 0 sin cambios.

---

### AC-08: La migration NO incluye artefactos excluidos

**Given** el archivo `migration.sql` de esta historia
**When** se inspecciona su contenido
**Then** NO contiene: `uq_users_email_lower` ni ningún índice de US-101, triggers, `REVOKE`, `DEFAULT` para `quotes.valid_until`, índices GIN/`pg_trgm`, seed data ni secretos.

---

## ⚠️ Edge Cases

### EC-01: Datos preexistentes que violan un constraint nuevo (re-deploy sobre entorno con datos)

**Given** un entorno QA/Demo con datos que violan un check o unique parcial nuevo
**When** `migrate deploy` ejecuta `ALTER TABLE ... ADD CONSTRAINT` / `CREATE UNIQUE INDEX`
**Then** la migration falla y queda `failed` en `_prisma_migrations`.

#### Handling

* Entornos MVP son reproducibles (seed reset); el smoke CI aplica desde DB vacía y captura incompatibilidades de definición.
* Si ocurriera con datos reales: migración correctiva forward-only que sanea datos antes de reintentar (procedimiento documentado en README, heredado de US-100 EC-02).

---

### EC-02: Falso drift de `prisma migrate diff` por objetos raw SQL

**Given** checks y unique parciales no representables en Prisma Schema Language
**When** corre el job `prisma-migrate-diff`
**Then** podría reportar divergencia (limitación conocida).

#### Handling

* Aplicar el manejo ya validado empíricamente en US-101 (DR-101 Decisión 8): ajuste documentado sin desactivar drift detection global. Si US-101 no requirió ajuste, validar igualmente con los nuevos objetos.

---

### EC-03: Diferencia de semántica entre rechazo del motor y mensajes de usuario

**Given** una violación de constraint llega al motor (bug de service layer o acceso directo)
**When** PostgreSQL rechaza con SQLSTATE `23514`/`23505`
**Then** el error crudo del motor no es apto para el usuario final.

#### Handling

* El mapeo a error envelope unificado pertenece a US-093 y a las historias backend; la matriz documenta esta relación. US-102 solo garantiza el rechazo.

---

### EC-04: Migration de constraints con timestamp anterior a la de índices

**Given** un directorio generado con timestamp incorrecto
**When** Prisma ordena las migrations
**Then** el orden cronológico baseline → índices → constraints se rompería.

#### Handling

* Generar con `--create-only` después de mergear US-101; smoke CI desde DB vacía captura errores de orden.

---

## 🚫 Validation Rules

| ID    | Rule                                                                                   | Message / Behavior                                  |
| ----- | --------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| VR-01 | Todo bloque raw SQL lleva comentario `-- Raw SQL: <motivo>` (Doc 18 §28.3)             | Revisión PR falla si falta                           |
| VR-02 | Naming conforme a Doc 18 §7/§13.3 (`chk_*`, `uq_*`)                                     | Revisión PR / test estructural falla                 |
| VR-03 | La migration NO contiene triggers, `REVOKE`, índices de US-101, GIN ni `CREATE EXTENSION` | Test estructural (regex) falla → bloquea merge       |
| VR-04 | Matriz C-001..C-062 sin filas sin clasificar                                            | Test/revisión de matriz falla → bloquea merge        |
| VR-05 | Cada constraint DB-enforced nuevo tiene test de violación                               | Revisión QA falla                                    |
| VR-06 | `migrate deploy` idempotente con la nueva migration                                     | Smoke CI falla → bloquea merge                       |
| VR-07 | Migration mergeada inmutable; correcciones forward-only                                 | Job `prisma-migrate-diff` detecta y bloquea          |
| VR-08 | La migration NO contiene secretos ni `DATABASE_URL`                                     | Secret scanner CI falla → bloquea merge              |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                                  |
| ------ | ---------------------------------------------------------------------------------------------------------------------- |
| SEC-01 | El archivo `migration.sql` NO debe contener `DATABASE_URL`, contraseñas ni cadenas de conexión reales.                  |
| SEC-02 | `DATABASE_URL` vive en env vars / Secrets Manager; nunca en repo (alineado con US-099/US-100/US-138).                    |
| SEC-03 | Logs CI NO deben imprimir `DATABASE_URL` ni datos sensibles.                                                             |
| SEC-04 | Ejecución de `migrate deploy` en QA/Demo limitada al pipeline (política US-100 SEC-04).                                  |
| SEC-05 | El carácter append-only de `admin_actions` (C-050) se preserva por convención + service layer; el endurecimiento por roles DB queda diferido y documentado. |

### Negative Authorization Scenarios

No aplica directamente — esta historia no introduce endpoints ni runtime authorization. Los tests de violación usan datos sintéticos (`@eventflow.demo`).

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

No aplica — esta historia no invoca IA. Los constraints sobre `ai_recommendations`/`ai_prompt_versions` (checks de timeout/retry, versión activa única) son soporte estructural del diseño PromptOps (Doc 18 §21), no comportamiento IA.

---

## 🎨 UX / UI Notes

No aplica — capacidad técnica sin UI.

| UX Area        | Applicability |
| -------------- | ------------- |
| Screens        | No aplica     |
| Forms          | No aplica     |
| Loading states | No aplica     |
| Error states   | No aplica (el mapeo de errores de constraint a UX pertenece a US-093 y historias de producto) |
| Empty states   | No aplica     |
| Success states | No aplica     |
| Accessibility  | No aplica     |
| i18n UI Copy   | No aplica     |

---

## 🛠 Technical Notes

### Frontend

No aplica.

---

### Backend

| Topic                | Guidance                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| Use Case / Service   | No aplica — capa física; el service layer sigue siendo la primera línea de validación (Zod + reglas), el motor es la última |
| Controller / Route   | No aplica                                                                                                     |
| Authorization Policy | No aplica runtime                                                                                             |
| Validation           | Tests de violación + test estructural + verificación de matriz + jobs CI                                       |
| Transaction Required | Prisma aplica la migration en su transacción estándar                                                          |
| Scripts              | Reutiliza `db:migrate:*` (US-100); sin scripts nuevos                                                          |
| Runbook              | README backend § Database Migrations: agregar nota de constraints + procedimiento ante datos violatorios (EC-01) |

---

### Database

#### Migration de constraints

* **Path**: `prisma/migrations/<YYYYMMDDHHMMSS>_db_constraints/migration.sql` (timestamp posterior a `<ts>_critical_indexes`).
* **Generación**: `npx prisma migrate dev --create-only --name db_constraints` + edición manual.
* **Contenido**: los 16 `ALTER TABLE ... ADD CONSTRAINT chk_... CHECK (...)` de AC-02 + los 4 `CREATE UNIQUE INDEX ... WHERE ...` de AC-03, cada bloque con `-- Raw SQL: <motivo>` citando el C-ID o sección Doc 18.
* **Contenido NO permitido**: triggers, `REVOKE`, índices de US-101, `DEFAULT` para `valid_until`, GIN/extensiones, seed, secretos.

#### Matriz de validación C-001..C-062

* **Ubicación sugerida**: `management/technical-specs/P0/PB-P0-001/constraints-validation-matrix.md` (o equivalente versionado; decidir en el PR).
* **Columnas**: C-ID, tabla, regla, mecanismo físico (Doc 18 §24), historia owner, evidencia (constraint/índice/test o referencia a historia futura).
* **Cobertura**: todas las filas del catálogo Doc 6 §17, incluyendo sub-IDs.

#### Verificación estructural

* Checks: `SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE contype='c' AND connamespace='public'::regnamespace;`
* Unique parciales: `pg_indexes.indexdef` (mismo patrón que US-101).

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
| AdminAction                       | No aplica runtime (C-050 clasificado en matriz)                     |
| AIRecommendation runtime creation | No aplica                                                          |
| CI logs                           | Sí: `migrate deploy` (smoke), tests de violación, drift job         |

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                                                      | Type        |
| ----- | --------------------------------------------------------------------------------------------------------------- | ----------- |
| TS-01 | Migration `<ts>_db_constraints` se aplica sin errores sobre DB con baseline + índices                           | Integration |
| TS-02 | Los 16 checks existen con definición exacta (`pg_constraint` / `pg_get_constraintdef`)                          | Integration |
| TS-03 | Los 4 unique parciales existen con predicados exactos (`pg_indexes.indexdef`)                                   | Integration |
| TS-04 | Inserciones válidas (rating 1..5, guests >= 1, montos >= 0, una activa por predicado) son aceptadas             | Integration |
| TS-05 | Coexistencia histórica permitida: nueva fila activa tras expirar/cancelar/deprecar la anterior (AC-05)          | Integration |
| TS-06 | Matriz C-001..C-062 completa: cero filas sin mecanismo/owner                                                    | Docs review / estructural |
| TS-07 | `migrate deploy` idempotente; jobs CI verdes                                                                    | CI          |
| TS-08 | `migration.sql` cumple VR-01..VR-03 (comentarios, naming, sin artefactos prohibidos) — regex check              | Unit        |

---

### Negative Tests

| ID    | Scenario                                                                  | Expected Result                                  |
| ----- | -------------------------------------------------------------------------- | ------------------------------------------------- |
| NT-01 | `rating = 0` y `rating = 6` en `reviews`                                   | Check violation `chk_reviews_rating_range` (23514) |
| NT-02 | `guests_count = 0` / `estimated_budget < 0` en `events`                    | Check violation (23514)                           |
| NT-03 | Montos negativos en `budget_items`                                         | Check violation (23514)                           |
| NT-04 | `is_simulated = false` en `booking_intents`                                | Check violation `chk_booking_intents_is_simulated` |
| NT-05 | `depth_level = 3` en `service_categories` / `category_change_count = 6`    | Check violation (23514)                           |
| NT-06 | Segunda `quote_request` activa mismo `(event, vendor)`                     | Unique violation `uq_quote_requests_event_vendor_active` (23505) |
| NT-07 | Segunda `quote` vigente misma request / segundo `confirmed_intent` misma `(event, category)` / segunda versión `active` mismo `prompt_id` | Unique violation (23505) |
| NT-08 | `email = ''` o `password_hash = ''` en `users` / `timeout_ms = 0` o `retry_count = 2` en `ai_recommendations` | Check violation (23514) |
| NT-09 | `migration.sql` contiene `TRIGGER`, `REVOKE` o índice de US-101            | Test estructural TS-08 falla                      |
| NT-10 | `migration.sql` contiene secretos                                          | Secret scanner CI falla                           |
| NT-11 | `total_planned < 0` en `budgets` / `base_price < 0` en `vendor_services` / `total_price < 0` en `quotes` / `size_bytes < 0` en `attachments` / `languages_supported = '{}'` en `vendor_profiles` | Check violation (23514) |

---

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
| KPI Affected        | Integridad de datos (NFR-DATA-001..008), confiabilidad de invariantes de negocio, evidencia de cierre de PB-P0-001        |
| Expected Impact     | Defensa en el motor para reglas críticas (unicidad activa, rangos, simulación); cierra la decomposición física de PB-P0-001 |
| Success Criteria    | Migration mergeada + 20 objetos verificados (16 checks + 4 unique parciales) + matriz C-001..C-062 completa + tests de violación verdes en CI |
| Academic Demo Value | Evidencia trazable de los 62 constraints (matriz) y de la política raw SQL controlada (ADR-DB-005)                         |

---

## 🧩 Task Breakdown Readiness

### Potential Database Tasks

* Generar migration `<ts>_db_constraints` con `--create-only` y redactar los 11 checks + 4 unique parciales con comentarios.
* Verificar aplicación local y comportamiento del drift job con los nuevos objetos (manejo US-101).

### Potential Backend Tasks

* Nota README backend (constraints + procedimiento EC-01).

### Potential QA Tasks

* Test estructural regex sobre `migration.sql`.
* Tests de violación por cada check (NT-01..NT-05, NT-08, NT-11) y unique parcial (NT-06, NT-07), incluyendo coexistencia histórica (TS-05).
* Verificación estructural `pg_constraint` / `pg_indexes` (TS-02, TS-03).

### Potential Documentation Tasks

* Construir la matriz de validación C-001..C-062 (todas las filas clasificadas con mecanismo + owner + evidencia).
* Housekeeping post-merge: precisión del wording DR-100 sobre append-only (Documentation Alignment).

### Potential DevOps / Config Tasks

* Confirmar que smoke/diff/secret-scan cubren la nueva migration (reutilización US-100/US-101).

---

## ✅ Definition of Ready

* [x] Rol claro: System.
* [x] Goal técnico claro: checks + unique parciales raw SQL + matriz C-001..C-062 + tests de violación.
* [x] Boundary formalizado con US-099/US-100/US-101 (DR-100 Decisión 1; DR-101 Decisiones 3–4 citadas).
* [x] `uq_users_email_lower` excluido explícitamente (pertenece a US-101).
* [x] Append-only `admin_actions`: convención + service layer; `REVOKE` diferido (Doc 18 §20.1 "opcional MVP").
* [x] Sin triggers (Doc 18 §14.1/§28.3); `DEFAULT valid_until` descartado (Doc 18 §16.2).
* [x] Out of Scope explícito.
* [x] Acceptance Criteria testables (AC-01..AC-08).
* [x] Edge cases documentados (datos violatorios, drift, semántica de errores, ordering).
* [x] Dependencias conocidas (US-099/US-100 mergeadas; US-101 recomendada antes).
* [x] Tests definidos (TS-01..TS-08, NT-01..NT-11).
* [ ] Tech Lead validó.

---

## 🏁 Definition of Done

* [ ] Migration `prisma/migrations/<YYYYMMDDHHMMSS>_db_constraints/migration.sql` versionada y revisada en PR.
* [ ] 16 check constraints operativos con definiciones exactas.
* [ ] 4 unique parciales operativos con predicados exactos.
* [ ] Tests de violación verdes (NT-01..NT-08, NT-11) incluyendo coexistencia histórica (TS-05).
* [ ] Matriz C-001..C-062 versionada, completa y revisada.
* [ ] `migrate deploy` idempotente verificado en smoke CI.
* [ ] Jobs CI `prisma-migrate-diff` y `prisma-migrate-smoke` verdes.
* [ ] README backend actualizado (constraints + EC-01).
* [ ] PR revisado por Tech Lead.

---

## 📝 Notes

* Las decisiones de alcance y boundary de esta historia están formalizadas en `management/user-stories/decision-resolutions/US-102-decision-resolution.md` (10 decisiones consolidadas; ninguna bloqueante; incluye la precisión sobre el wording de DR-100).
* La US-102 **cierra la decomposición física de PB-P0-001** (US-099 schema → US-100 baseline → US-101 índices → US-102 constraints).
* `uq_users_email_lower` **NO se duplica aquí**: fue entregado por US-101 como índice funcional (DR-101 Decisión 4).
* Los constraints service-layer/job/middleware **no se implementan en esta historia**: la matriz los clasifica con su historia owner; su enforcement llega con las historias backend (US-089+, US-092, US-093, US-094..097), jobs (US-015, US-055) y middleware (US-109..111).
* El `REVOKE UPDATE, DELETE` sobre `admin_actions` queda diferido conforme a Doc 18 §20.1 ("opcional MVP"); requiere separación de roles DB (US-137+).
* No se crean triggers: Doc 18 §14.1 descarta el trigger de `currency_code` como overengineering y §28.3 no lista triggers como caso válido de raw SQL.
* El manejo del falso drift de Prisma reutiliza lo validado en US-101 (DR-101 Decisión 8).

### Documentation Alignment Required (no bloqueante)

* **DR-100 (texto Decisión 1)** — Menciona "enforcement append-only (`ai_prompt_versions`)"; Doc 18 define `admin_actions` como la tabla append-only (§20.1) y la inmutabilidad de `ai_prompt_versions` por versionado híbrido (§21.2). Esta historia formaliza la precisión; DR-100 es inmutable, el registro queda aquí y en el DR de US-102 cuando se genere.
* **Doc 18 §35.2** — Ya rastreado desde US-100: baseline descrita con raw SQL agrupado (incluye "unique parciales, check constraints, default `valid_until`"); el split aprobado los reparte en US-101/US-102 y descarta el default. Amendar post-merge.
