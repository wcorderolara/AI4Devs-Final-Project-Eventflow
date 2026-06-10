# Technical Specification — US-101: Implementar índices críticos vía raw SQL (parciales, funcionales) y verificar el catálogo físico de índices

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-101 |
| Source User Story | `management/user-stories/US-101-critical-indexes.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-101-decision-resolution.md` (9 decisiones consolidadas) |
| Priority | P0 |
| Backlog ID | PB-P0-001 |
| Backlog Title | Database Schema, Migrations & Constraints |
| Backlog Execution Order | 1 (primer ítem P0 del backlog) — US-101 es la posición 3 dentro del ítem |
| User Story Position in Backlog Item | 3 of 4 |
| Related User Stories in Backlog Item | US-099 (Approved), US-100 (Approved), US-101 (esta), US-102 (Draft) |
| Epic | EPIC-DB-001 — Database & Prisma Physical Model |
| Backlog Item Dependencies | — (foundation) |
| Feature | Critical Indexes — raw SQL migration + catalog verification |
| Module / Domain | Platform / DB |
| User Story Status | Approved (with Minor Notes, 2026-06-10) |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-10 |
| Last Updated | 2026-06-10 |

---

## 2. Backlog Execution Context

### Product Backlog Item

PB-P0-001 exige: schema Prisma completo (entregado por US-099), migraciones reproducibles (entregadas por US-100), **índices en columnas críticas (FK, status, fechas)** — esta historia — y constraints C-001..C-062 enforced (US-102). Sin este ítem no hay persistencia performante para ningún flujo de producto, IA, admin ni seed.

### Execution Order Rationale

PB-P0-001 es el primer ítem del backlog P0 ("DB → Backend → API → ..."). Dentro del ítem, la decomposición aprobada (DR-099/DR-100/DR-101) impone el orden: US-099 (schema declarativo) → US-100 (baseline migration + flujo migrate + CI) → **US-101 (índices raw SQL)** → US-102 (constraints raw SQL). US-101 puede ejecutarse ahora porque sus dos precondiciones fuertes (US-099 y US-100) están Approved; US-102 es independiente de US-101 a nivel de archivos migration (cronológicamente posteriores ambas a la baseline), pero la coordinación de boundary ya está formalizada (DR-101 Decisiones 3–4).

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-099 | `prisma/schema.prisma` declarativo (19 modelos + 14 enums + `@@index`/`@@unique` simples) | 1 (Approved) |
| US-100 | Baseline init migration + scripts `db:migrate:*` + jobs CI drift/smoke | 2 (Approved) |
| US-101 | Migration raw SQL de índices funcionales/parciales + verificación inventario §25 | 3 (esta spec) |
| US-102 | Migration raw SQL de check constraints, unique parciales, enforcement append-only | 4 |

---

## 3. Executive Technical Summary

Implementar una migration raw SQL separada `prisma/migrations/<YYYYMMDDHHMMSS>_critical_indexes/migration.sql` que materialice los índices del catálogo Doc 18 §25 **no representables en Prisma Schema Language**:

1. **1 índice funcional único**: `uq_users_email_lower ON users (LOWER(email))` — login y unicidad case-insensitive.
2. **12 índices parciales no-únicos**: filtros por status activo, jobs de expiración/cierre, directorio público, badge unread, límite de imágenes (lista completa en §10).
3. **Índices parciales `is_seed`**: `idx_<tabla>_is_seed (is_seed) WHERE is_seed = true` en toda tabla operativa que declara `is_seed` (Doc 18 §27.5) — habilitan el reset quirúrgico demo.

Además, entregar un **test de inventario** que compara `pg_indexes` contra el catálogo obligatorio Doc 18 §25 tras `migrate deploy` (incluye los `@@index` btree simples de US-099; excluye los 4 unique parciales de US-102 y el índice GIN/trigram diferido), con gap-fill vía `@@index` si un btree simple obligatorio faltara.

La migration se aplica con el flujo `db:migrate:*` existente (US-100) y se valida con los jobs CI ya operativos (`prisma-migrate-diff`, `prisma-migrate-smoke`), extendiendo el smoke con la verificación de inventario. Criterio de aceptación **estructural** (existencia/definición de índices), no de latencia (DR-101 Decisión 7).

---

## 4. Scope Boundary

### In Scope

- Migration raw SQL `<ts>_critical_indexes` (funcional + parciales + `is_seed`), comentada conforme a Doc 18 §28.3.
- Test de inventario de índices contra `pg_indexes` (catálogo §25 con exclusiones explícitas).
- Gap-fill vía `@@index` + migration de cualquier btree simple obligatorio del §25 ausente en US-099 (documentado en PR).
- Extensión del job CI `prisma-migrate-smoke` con la verificación de inventario.
- Test de unicidad case-insensitive de email.
- Nota en README backend (sección `Database Migrations`): migration de índices + manejo de drift (EC-01).

### Out of Scope

- Unique parciales (`uq_quote_requests_event_vendor_active`, `uq_quotes_request_active`, `uq_booking_intents_event_category_confirmed`, `uq_prompt_versions_active`), check constraints, triggers, enforcement append-only → **US-102** (DR-101 Decisión 3).
- `idx_vendor_profiles_business_name_trgm`, `CREATE EXTENSION pg_trgm`, índices GIN → **diferido** (DR-101 Decisión 5; Doc 18 §25.1).
- Medición P95 / EXPLAIN con carga → estrategia QA Doc 20 post-seed (DR-101 Decisión 7).
- Seed data → EPIC-SEED-001; CD → US-139; RDS → US-137.

### Explicit Non-Goals

- No se modifica el flujo de migraciones ni los scripts npm de US-100.
- No se crean endpoints, use cases ni código runtime de aplicación.
- No se usa `CREATE INDEX CONCURRENTLY` (DR-101 Decisión 9).
- No se "optimiza" más allá del catálogo §25: ningún índice especulativo fuera del catálogo query-driven.

---

## 5. Architecture Alignment

### Backend Architecture

Sin código runtime. La historia vive en la capa de persistencia física del modular monolith (ADR-ARCH-001): archivos bajo `apps/backend/prisma/migrations/` y tests estructurales/integración en la suite backend (Vitest). Reutiliza scripts `db:migrate:*` y wrapper guards de US-100.

### Frontend Architecture

No aplica.

### Database Architecture

Núcleo de la historia. PostgreSQL 14+ (ADR-DB-001), Prisma como mecanismo único de gestión de esquema con raw SQL solo para objetos no representables (ADR-DB-005, Doc 18 §10/§28.3). Naming Doc 18 §7. Migraciones forward-only e inmutables post-merge (política US-100).

### API Architecture

No aplica — los índices son derivados (query-driven) de los endpoints de Doc 16, pero no se toca ningún contrato.

### AI / PromptOps Architecture

No aplica — `idx_ai_rec_pending_expires` solo soporta el job de expiración definido en otras historias; no se invoca IA.

### Security Architecture

Sin runtime authorization. Aplican las reglas de pipeline heredadas de US-100: sin secretos en `migration.sql` (secret scan CI), `DATABASE_URL` solo vía env/Secrets Manager, `migrate deploy` en QA/Demo limitado al pipeline.

### Testing Architecture

Vitest para tests estructurales (regex sobre `migration.sql`) e integración contra PostgreSQL (local Docker / CI service container) consultando `pg_indexes`. CI: jobs existentes `prisma-migrate-diff` + `prisma-migrate-smoke` (extendido). Alineado con Doc 20.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 — Migration aplicable | Crear `prisma/migrations/<ts>_critical_indexes/migration.sql` vía `prisma migrate dev --create-only --name critical_indexes` + edición manual con raw SQL comentado (`-- Raw SQL: <motivo>`); timestamp posterior a `<ts>_init`. | DB (migration file) |
| AC-02 — Índice funcional email | `CREATE UNIQUE INDEX uq_users_email_lower ON users (LOWER(email));` verificado vía `pg_indexes` + test de inserción duplicada case-insensitive (espera unique violation). | DB + Integration test |
| AC-03 — 12 índices parciales | Un `CREATE INDEX ... WHERE <predicado>` por cada fila de la tabla del AC-03, con predicados literales de Doc 18 §25; verificación de `indexdef` exacto. | DB + Integration test |
| AC-04 — Índices `is_seed` | Loop sobre tablas con columna `is_seed` (derivadas del schema US-099): `CREATE INDEX idx_<tabla>_is_seed ON <tabla> (is_seed) WHERE is_seed = true;`. | DB + Integration test |
| AC-05 — Inventario §25 | Test que compara `SELECT indexname, indexdef FROM pg_indexes WHERE schemaname='public'` contra lista esperada (catálogo §25 menos exclusiones US-102/GIN); falla ante faltantes o duplicados; gap-fill vía `@@index` si aplica. | Integration / CI |
| AC-06 — Idempotencia | Segunda ejecución de `prisma migrate deploy` → exit code 0 sin cambios (mecánica Prisma `_prisma_migrations`). | CI (smoke) |
| AC-07 — Jobs CI verdes | `prisma-migrate-diff` y `prisma-migrate-smoke` pasan; smoke extendido con inventario; ajuste documentado del diff job si reporta falso drift (EC-01). | CI / DevOps |
| AC-08 — Sin artefactos ajenos | Test estructural regex sobre `migration.sql`: prohibidos `CREATE UNIQUE INDEX ... WHERE`, `CHECK`, `TRIGGER`, `CREATE EXTENSION`, `USING gin`, patrones de secretos. | QA (unit) |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

Platform/DB (shared persistence). Sin módulos de dominio afectados.

### Use Cases / Application Services

No aplica — sin código runtime.

### Controllers / Routes

No aplica.

### DTOs / Schemas

No aplica — el único "schema" tocado es `prisma/schema.prisma` y solo en el caso gap-fill (AC-05).

### Repository / Persistence

No aplica runtime. Persistencia = archivos migration versionados.

### Validation Rules

- VR-01..VR-07 de la User Story, implementadas como: revisión PR (VR-01/VR-02), test estructural regex (VR-03), test de inventario (VR-04), smoke CI (VR-05), drift job (VR-06), secret scan (VR-07).

### Error Handling

- Fallo de `CREATE INDEX` en `migrate deploy` → Prisma marca la migration `failed` en `_prisma_migrations`; recuperación documentada en README (procedimiento heredado de US-100 EC-02: corregir + migration correctiva).

### Transactions

Prisma aplica la migration dentro de su transacción estándar; por eso `CONCURRENTLY` está descartado (DR-101 Decisión 9).

### Observability

Logs CI de `migrate deploy`, inventario y drift. Sin logging runtime.

---

## 8. Frontend Technical Design

No aplica.

---

## 9. API Contract Design

No aplica.

---

## 10. Database / Prisma Design

### Models Impacted

Ninguún modelo cambia su forma. Se agregan índices físicos sobre: `users`, `events`, `event_tasks`, `vendor_profiles`, `vendor_services`, `service_categories`, `quote_requests`, `quotes`, `reviews`, `notifications`, `attachments`, `ai_recommendations` + índices `is_seed` en todas las tablas operativas.

### Fields / Columns

Sin columnas nuevas.

### Relations

Sin cambios.

### Indexes

**Migration `<ts>_critical_indexes` — contenido de diseño (DDL de referencia):**

Índice funcional (1):

```sql
-- Raw SQL: índice funcional único para login y unicidad case-insensitive (Doc 18 §13.3/§28.3)
CREATE UNIQUE INDEX uq_users_email_lower ON users (LOWER(email));
```

Índices parciales no-únicos (12) — predicados literales de Doc 18 §25:

| # | Índice | Tabla | Definición | Motivo (comentario raw SQL) |
|---|---|---|---|---|
| 1 | `idx_events_status_event_date_active` | `events` | `(status, event_date) WHERE status IN ('active','draft')` | Listados activos |
| 2 | `idx_events_auto_complete_candidates` | `events` | `(event_date) WHERE status = 'active'` | Job cierre automático (BR-EVENT-013) |
| 3 | `idx_event_tasks_due_date_pending` | `event_tasks` | `(due_date) WHERE status = 'pending'` | Reminders |
| 4 | `idx_vendor_profiles_status_location` | `vendor_profiles` | `(status, location_id) WHERE status = 'approved'` | Directorio público |
| 5 | `idx_vendor_services_active` | `vendor_services` | `(vendor_profile_id) WHERE is_active = true` | Servicios activos |
| 6 | `idx_service_categories_active` | `service_categories` | `(is_active) WHERE is_active = true` | Selector de categoría |
| 7 | `idx_quote_requests_event_category_active` | `quote_requests` | `(event_id, service_category_id) WHERE status IN ('sent','viewed','responded')` | Conteo C-027b |
| 8 | `idx_quotes_valid_until_active` | `quotes` | `(valid_until) WHERE status = 'sent'` | Job expiración 15 días |
| 9 | `idx_reviews_vendor_status_published` | `reviews` | `(vendor_profile_id) WHERE status = 'published'` | Directorio |
| 10 | `idx_notifications_user_unread` | `notifications` | `(user_id) WHERE status = 'unread'` | Badge UI |
| 11 | `idx_attachments_vendor_work_active` | `attachments` | `(owner_id, work_label) WHERE owner_type = 'vendor_work' AND status = 'active'` | Límite 10 imágenes (C-022) |
| 12 | `idx_ai_rec_pending_expires` | `ai_recommendations` | `(expires_at) WHERE status = 'pending'` | Job expiración AIRecommendation |

Ejemplo de forma:

```sql
-- Raw SQL: índice parcial para job de expiración de cotizaciones (Doc 18 §16.2)
CREATE INDEX idx_quotes_valid_until_active ON quotes (valid_until) WHERE status = 'sent';
```

Índices parciales `is_seed` (Doc 18 §27.5) — uno por cada tabla del schema US-099 que declara `is_seed`:

```sql
-- Raw SQL: índice parcial para reset quirúrgico de seed (Doc 18 §27.5)
CREATE INDEX idx_users_is_seed ON users (is_seed) WHERE is_seed = true;
-- ... repetir para events, event_types, event_tasks, budgets, budget_items,
--     vendor_profiles, vendor_services, service_categories, locations,
--     quote_requests, quotes, booking_intents, reviews, notifications,
--     attachments, admin_actions, ai_recommendations, ai_prompt_versions
--     (lista final derivada del schema US-099; AC-04)
```

**NO incluidos** (exclusiones formales): los 4 unique parciales (US-102), `idx_vendor_profiles_business_name_trgm` + `pg_trgm` (diferido), btree simples ya declarados vía `@@index` en US-099 (verificados, no recreados).

### Constraints

Sin constraints nuevos (US-102). El único efecto de unicidad nuevo proviene de `uq_users_email_lower`, clasificado como índice funcional (DR-101 Decisión 4).

### Migrations Impact

- Nuevo directorio `apps/backend/prisma/migrations/<ts>_critical_indexes/`.
- Cronológicamente: `<ts>_init` (US-100) → `<ts>_critical_indexes` (US-101) → migration(s) de US-102.
- Forward-only; correcciones vía migration correctiva.
- Caso gap-fill (AC-05): si falta un btree simple obligatorio, se agrega `@@index` en `schema.prisma` + su migration correspondiente dentro del mismo PR, documentado.

### Seed Impact

Sin datos seed. Los índices `is_seed` son prerequisito estructural del reset demo (US-086, NFR-DEMO-003).

---

## 11. AI / PromptOps Design

No aplica.

---

## 12. Security & Authorization Design

### Authentication / Authorization / Ownership / Role Rules

No aplica runtime.

### Negative Authorization Scenarios

No aplica — sin endpoints.

### Audit Requirements

No aplica `AdminAction`. Evidencia en CI logs y PR review.

### Sensitive Data Handling

- `migration.sql` sin secretos (secret scan CI de US-100 cubre `prisma/migrations/`).
- `uq_users_email_lower` opera sobre `email` (dato personal) pero no expone ni loguea valores; los tests usan emails sintéticos `@eventflow.demo`.

---

## 13. Testing Strategy

### Unit Tests

- Test estructural regex sobre `migration.sql` (Vitest): presencia de comentarios `-- Raw SQL:`, naming `idx_*`/`uq_*`, ausencia de `CREATE UNIQUE INDEX ... WHERE`, `CHECK (`, `TRIGGER`, `CREATE EXTENSION`, `USING gin`, patrones de secretos (TS-08, NT-02, NT-03, NT-06).

### Integration Tests

- Contra PostgreSQL real (Docker local / CI service container), tras `migrate deploy`:
  - `uq_users_email_lower`: inserción `'Ana@eventflow.demo'` + `'ana@eventflow.demo'` → segunda falla (TS-02, NT-01).
  - `indexdef` exacto de los 12 parciales (TS-03).
  - Cobertura `is_seed` completa: comparar tablas con columna `is_seed` (vía `information_schema.columns`) vs índices `idx_*_is_seed` existentes (TS-04).
  - Inventario §25 completo, sin faltantes ni duplicados, con exclusiones explícitas (TS-05, NT-04).

### API Tests

No aplica.

### E2E Tests

No aplica.

### Security Tests

- Secret scan CI sobre la nueva migration (NT-06). Sin tests 401/403 (no hay endpoints).

### Accessibility Tests

No aplica.

### AI Tests

No aplica.

### Seed / Demo Tests

- Indirecto: TS-04 garantiza la estructura que EPIC-SEED-001 consumirá. No se testea seed real aquí.

### CI Checks

- `prisma-migrate-diff` (drift; ver Riesgo R-1).
- `prisma-migrate-smoke` extendido: `migrate deploy` en DB ephemeral + inventario de índices (TS-05..TS-07).
- Idempotencia: segunda corrida `migrate deploy` exit 0 (TS-06).

---

## 14. Observability & Audit

### Logs

CI logs de `migrate deploy`, drift job e inventario. Sin logs runtime.

### Correlation ID

No aplica.

### AdminAction

No aplica.

### Error Tracking

No aplica runtime; fallas de migration visibles en `_prisma_migrations` + CI.

### Metrics

No aplica en esta historia (la medición P95 es post-seed, Doc 20).

---

## 15. Seed / Demo Data Impact

### Seed Data Required

Ninguno.

### Demo Scenario Supported

Reset quirúrgico demo (US-086): los índices `is_seed` evitan sequential scans al borrar filas seed.

### Reset / Isolation Notes

La estructura se crea aquí; el mecanismo de reset pertenece a EPIC-SEED-001.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| Doc 18 §35.2 | Describe la baseline `20260601000000_init` incluyendo raw SQL de índices. | Split US-100/US-101/US-102 aprobado (DR-100/DR-101). | Amendar post-merge (tracked desde US-100). | No |
| Doc 18 §25 | Lista `idx_vendor_profiles_business_name_trgm` como "opcional" sin marcar diferimiento. | DR-101 Decisión 5: diferido post-MVP, sin `pg_trgm`. | Amendar §25 citando US-101 DR Decisión 5. | No |
| PB-P0-001 Acceptance Summary | Wording "Migraciones reproducibles up/down". | Forward-only canónico (DR-100 Q2). | Amendar wording (tracked desde US-100). | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| R-1: `prisma migrate diff --from-migrations --to-schema-datamodel` reporta los índices raw SQL (no representables en PSL) como drift → job CI rojo permanente. | Bloqueo de PRs posteriores. | Validar comportamiento real de la versión Prisma del stack en el PR (DR-101 Decisión 8). Ante falso positivo: ajuste documentado del job (allowlist / diff dirigido) **sin desactivar** drift detection global. Documentar en README. |
| R-2: Locks de `CREATE INDEX` en re-deploy sobre entornos con datos. | Pausa breve de escrituras en QA/Demo. | Aceptado para MVP (volumen seed despreciable); `CONCURRENTLY` descartado por transacción Prisma (DR-101 Decisión 9). Deuda consciente documentada. |
| R-3: Timestamp de la migration anterior a la baseline → referencias a tablas inexistentes. | Deploy roto desde cero. | Generar con `--create-only` post-baseline; smoke CI (deploy desde DB vacía) lo captura (EC-04). |
| R-4: Duplicación de índices entre `@@index` (US-099) y raw SQL (US-101), o con unique parciales (US-102). | Bloat de escritura, confusión. | Raw SQL limitado a no-representables; test de inventario detecta duplicados por nombre; DR-101 Decisiones 3–4 fijan el boundary con US-102. |
| R-5: Omisión de alguna tabla `is_seed`. | Reset demo lento; checklist §35.4 incumplido. | TS-04 deriva la lista desde `information_schema.columns` en lugar de hardcodearla. |

---

## 18. Implementation Guidance for Coding Agents

**Archivos/carpetas probablemente impactados:**

- `apps/backend/prisma/migrations/<ts>_critical_indexes/migration.sql` (nuevo — contenido principal).
- `apps/backend/prisma/schema.prisma` (solo si hay gap-fill AC-05; documentar en PR).
- `apps/backend/tests/db/critical-indexes.structural.test.ts` (nuevo — regex sobre migration; nombre orientativo).
- `apps/backend/tests/db/critical-indexes.inventory.test.ts` (nuevo — `pg_indexes` vs catálogo).
- `.github/workflows/<ci>.yml` (extender job `prisma-migrate-smoke` con inventario).
- `apps/backend/README.md` (sección `Database Migrations`: nota de índices + manejo drift).

**Orden recomendado de implementación:**

1. Derivar del `schema.prisma` mergeado (US-099) la lista de tablas con `is_seed` y los `@@index` ya declarados.
2. Contrastar contra el catálogo Doc 18 §25 → confirmar (o no) necesidad de gap-fill.
3. Generar la migration con `npx prisma migrate dev --create-only --name critical_indexes` y redactar el raw SQL (1 funcional + 12 parciales + `is_seed`), cada bloque con `-- Raw SQL: <motivo>`.
4. Aplicar en local (`db:migrate:dev`) y validar el comportamiento de `db:migrate:diff` (R-1) **antes** de escribir los tests de CI.
5. Implementar tests estructurales + inventario.
6. Extender smoke CI; correr pipeline completo.
7. Actualizar README.

**Decisiones que NO deben reabrirse (DR-101):**

- Alcance: solo funcionales + parciales no-únicos + `is_seed` + inventario (Decisión 1).
- `uq_users_email_lower` se crea aquí, no en US-102 (Decisión 4).
- GIN/trigram y `pg_trgm` diferidos (Decisión 5).
- Unique parciales y checks → US-102 (Decisión 3).
- Aceptación estructural, no de latencia (Decisión 7).
- `CREATE INDEX` estándar, sin `CONCURRENTLY` (Decisión 9).

**Qué NO implementar:** nada de US-102, ninguna extensión de motor, ningún índice fuera del catálogo §25, ningún cambio a scripts `db:migrate:*` ni a la política forward-only.

**Supuestos a preservar:** `DATABASE_URL` solo por env; migrations inmutables post-merge; PostgreSQL 14+; tablas vacías o volumen MVP al aplicar.

---

## 19. Task Generation Notes

**Grupos de tareas sugeridos:**

1. **DB-Migration**: derivación de listas (is_seed / @@index existentes), generación y redacción de la migration, verificación local, gap-fill condicional.
2. **QA-Structural**: test regex de `migration.sql` (VR-01..VR-03, VR-07).
3. **QA-Integration**: tests `pg_indexes` (funcional, 12 parciales, `is_seed`, inventario completo).
4. **DevOps-CI**: extensión del smoke job con inventario; validación/ajuste documentado del drift job (R-1).
5. **Docs**: README backend (índices + drift); registro de gap-fill si ocurrió.

**Tareas QA requeridas:** TS-01..TS-08, NT-01..NT-06 mapeadas 1:1 a los grupos 2–4.

**Tareas seguridad requeridas:** verificación de cobertura del secret scan sobre la nueva migration (reutiliza job US-100; solo confirmar alcance).

**Tareas seed/demo requeridas:** ninguna (estructura solamente; TS-04 es la evidencia).

**Tareas documentación requeridas:** README + housekeeping post-merge de los 3 ítems de §16 (no bloqueantes, pueden agruparse con los de US-100).

**Dependencias entre tareas:** Grupo 1 precede a todo; Grupo 4 (drift) depende del resultado empírico del paso 4 de la guía de implementación; Grupos 2–3 pueden paralelizarse tras el Grupo 1.

**Consolidated `tasks.md`:** Sí — al completar US-102, el ítem PB-P0-001 debería consolidar un `tasks.md` del backlog item (US-099+US-100+US-101+US-102) para evidencia académica.

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass (Approved with Minor Notes, 2026-06-10) |
| Product Backlog mapping found | Pass (PB-P0-001, posición 3 of 4) |
| Decision Resolution reviewed if present | Pass (DR-101, 9 decisiones) |
| Scope clear | Pass |
| Architecture alignment clear | Pass (ADR-DB-001, ADR-DB-005, Doc 18 §7/§25/§27.5/§28.3) |
| API impact clear | N/A |
| DB impact clear | Pass |
| AI impact clear | N/A |
| Security impact clear | Pass (pipeline-level únicamente) |
| Testing strategy clear | Pass |
| Ready for Development Task Breakdown | **Yes** |

---

## 21. Final Recommendation

**`Ready for Task Breakdown`**

La historia está aprobada, el boundary está formalizado en DR-101 (sin decisiones reabiertas), el inventario de índices es exacto y verificable contra Doc 18 §25, los riesgos técnicos tienen mitigación definida (el único riesgo material — falso drift de Prisma, R-1 — tiene validación empírica acotada al paso 4 de la guía de implementación, conforme a la nota menor del Approval Gate), y la estrategia de testing es estructural, determinística y ejecutable en CI sin dependencias de seed.
