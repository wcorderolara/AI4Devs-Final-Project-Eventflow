# Technical Specification — US-102: Implementar constraints físicos vía raw SQL (checks, unique parciales) y validar el catálogo C-001..C-062

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-102 |
| Source User Story | `management/user-stories/US-102-db-constraints.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-102-decision-resolution.md` (10 decisiones consolidadas) |
| Priority | P0 |
| Backlog ID | PB-P0-001 |
| Backlog Title | Database Schema, Migrations & Constraints |
| Backlog Execution Order | 1 (primer ítem P0 del backlog) — US-102 es la posición 4 dentro del ítem |
| User Story Position in Backlog Item | 4 of 4 |
| Related User Stories in Backlog Item | US-099 (Approved), US-100 (Approved), US-101 (Approved), US-102 (esta) |
| Epic | EPIC-DB-001 — Database & Prisma Physical Model |
| Backlog Item Dependencies | — (foundation) |
| Feature | DB Constraints — raw SQL migration + C-catalog validation matrix |
| Module / Domain | Platform / DB |
| User Story Status | Approved (with Minor Notes, 2026-06-10) |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-10 |
| Last Updated | 2026-06-10 |

---

## 2. Backlog Execution Context

### Product Backlog Item

PB-P0-001 exige: schema Prisma completo (US-099 ✔), migraciones reproducibles (US-100 ✔), índices críticos (US-101 ✔) y **constraints C-001..C-062 enforced con tests en CI** — esta historia, la última del ítem.

### Execution Order Rationale

PB-P0-001 es el primer ítem del backlog P0. Dentro del ítem, la decomposición aprobada (DR-099/DR-100/DR-101/DR-102) impone US-099 → US-100 → US-101 → **US-102**. Las tres precondiciones están Approved. Al cerrar US-102, PB-P0-001 completa su decomposición física: corresponde consolidar el `tasks.md` del backlog item y ejecutar el housekeeping documental agrupado (recomendado en US-101 spec §19 y DR-102 §8).

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-099 | Schema declarativo (FKs, NOT NULL, enums, uniques simples, defaults) | 1 (Approved) |
| US-100 | Baseline migration + scripts `db:migrate:*` + jobs CI drift/smoke | 2 (Approved) |
| US-101 | Migration raw SQL de índices + inventario §25 | 3 (Approved) |
| US-102 | Migration raw SQL de constraints + matriz C-001..C-062 | 4 (esta spec — cierra el ítem) |

---

## 3. Executive Technical Summary

Implementar la migration raw SQL `prisma/migrations/<YYYYMMDDHHMMSS>_db_constraints/migration.sql` (timestamp posterior a `<ts>_critical_indexes`) con los objetos físicos **no representables en Prisma Schema Language**:

1. **16 check constraints** (`ALTER TABLE ... ADD CONSTRAINT chk_... CHECK (...)`) con las definiciones literales de Doc 18 — no-vacíos, rangos, montos no negativos, límites e invariante `is_simulated = true` (catálogo completo en §10).
2. **4 unique parciales** (`CREATE UNIQUE INDEX ... WHERE ...`) que materializan reglas de negocio dependientes de estado: C-027, C-030, C-037 y `uq_prompt_versions_active`.

Además, dos entregables de validación:

3. **Matriz de validación C-001..C-062**: documento versionado que clasifica cada constraint del catálogo (Doc 6 §17 / Doc 18 §24, incluyendo sub-IDs C-022b/C-026b/C-027b) por mecanismo físico + historia owner + evidencia — el mecanismo formal con el que PB-P0-001 cumple "validar los 62 constraints" sin scope creep (DR-102 Decisión 8).
4. **Tests de violación**: por cada objeto nuevo, tests que intentan violarlo y assertan el rechazo del motor por SQLSTATE (23514 para checks, 23505 para uniques), incluyendo la **coexistencia histórica** de los unique parciales (nueva fila activa permitida tras expirar/cancelar/deprecar la anterior).

Exclusiones formales (DR-102): `uq_users_email_lower` (US-101), triggers, `REVOKE` sobre `admin_actions` (diferido a separación de roles DB), `DEFAULT valid_until` (descartado — semántica `sent`), enforcement service-layer/jobs/middleware (clasificados en matriz con owners).

---

## 4. Scope Boundary

### In Scope

- Migration raw SQL `<ts>_db_constraints` (16 checks + 4 unique parciales), comentada conforme a Doc 18 §28.3.
- Matriz de validación C-001..C-062 versionada (ubicación sugerida: `management/technical-specs/P0/PB-P0-001/constraints-validation-matrix.md`; confirmar en el PR).
- Tests de violación (SQLSTATE) + verificación estructural (`pg_constraint`, `pg_indexes`) + test estructural regex sobre `migration.sql`.
- Validación empírica del drift job con CHECK constraints (tipo de objeto nuevo respecto a US-101).
- Nota en README backend: constraints + procedimiento ante datos violatorios en re-deploy.

### Out of Scope

- `uq_users_email_lower` → **US-101** (entregado; DR-101 Decisión 4 / DR-102 Decisión 2).
- Enforcement service-layer (C-003, C-006, C-007, C-008, C-016, C-020, C-022, C-027b, C-029, C-034, C-039, C-048, C-049, C-052, C-061…), jobs (C-032, C-056) y middleware (C-059) → historias backend/API/jobs owner (clasificados en matriz).
- `REVOKE UPDATE, DELETE` sobre `admin_actions` → **diferido** (Doc 18 §20.1 "opcional MVP"; requiere separación de roles DB, US-137+; DR-102 Decisión 4).
- Triggers de cualquier tipo (DR-102 Decisión 6; Doc 18 §14.1 descarta el de `currency_code`).
- `DEFAULT (CURRENT_DATE + INTERVAL '15 days')` para `quotes.valid_until` → **descartado** (DR-102 Decisión 7; service layer en US-052/US-053).
- Seed data (EPIC-SEED-001), RDS (US-137), CD (US-139), medición de performance (Doc 20 post-seed).

### Explicit Non-Goals

- No modificar schema declarativo, baseline, scripts `db:migrate:*` ni política forward-only.
- No mapear errores de constraint a error envelope (pertenece a US-093; aquí solo se garantiza el rechazo del motor).
- No implementar constraints fuera del catálogo documentado (ningún check especulativo).

---

## 5. Architecture Alignment

### Backend Architecture

Sin código runtime. Archivos bajo `apps/backend/prisma/migrations/` y tests en la suite backend (Vitest). El service layer sigue siendo la primera línea de validación (Zod + reglas); el motor es la última (defensa en profundidad).

### Frontend Architecture

No aplica.

### Database Architecture

Núcleo de la historia. PostgreSQL 14+ (ADR-DB-001), raw SQL solo para objetos no representables (ADR-DB-005; Doc 18 §28.3 casos válidos #1 unique parciales y #2 check constraints). Naming `chk_<tabla>_<descripcion>` / `uq_<tabla>_<columnas>` (Doc 18 §7). Forward-only e inmutable post-merge.

### API Architecture

No aplica.

### AI / PromptOps Architecture

No aplica — los constraints sobre `ai_recommendations` (timeout/retry) y `ai_prompt_versions` (versión activa única) son soporte estructural del diseño PromptOps (Doc 18 §21), sin invocación IA.

### Security Architecture

Sin runtime authorization. Reglas de pipeline heredadas (sin secretos, secret scan CI, `migrate deploy` solo vía pipeline). El append-only de `admin_actions` queda por convención + service layer (SEC-05 de la historia; DR-102 Decisión 4).

### Testing Architecture

Vitest: estructural regex sobre `migration.sql` + integración contra PostgreSQL real (local Docker / CI service container) con aserciones por SQLSTATE. CI: jobs `prisma-migrate-diff` + `prisma-migrate-smoke` heredados (US-100, extendidos en US-101). Alineado con Doc 20.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 — Migration aplicable | `prisma migrate dev --create-only --name db_constraints` + edición manual; timestamp posterior a `<ts>_critical_indexes`; bloques comentados `-- Raw SQL: <C-ID / sección Doc 18>`. | DB (migration file) |
| AC-02 — 16 checks exactos | 16 `ALTER TABLE ... ADD CONSTRAINT ... CHECK (...)`; verificación vía `pg_constraint` (contype='c') + `pg_get_constraintdef(oid)`. | DB + Integration test |
| AC-03 — 4 unique parciales | 4 `CREATE UNIQUE INDEX ... WHERE ...` con predicados literales; verificación vía `pg_indexes.indexdef`. | DB + Integration test |
| AC-04 — Rechazo de violaciones (checks) | Por cada check: INSERT/UPDATE violatorio → error SQLSTATE `23514` con el nombre del constraint esperado. | Integration test |
| AC-05 — Unique parciales: duplicado activo rechazado, histórico permitido | Pares de escenarios por índice: (1) segunda fila dentro del predicado → `23505`; (2) segunda fila con la preexistente fuera del predicado (cancelled/expired/rejected/deprecated) → INSERT exitoso. | Integration test |
| AC-06 — Matriz C-001..C-062 completa | Documento versionado: cada fila del catálogo con mecanismo + owner + evidencia; cero filas sin clasificar; revisión como gate de PR. | Documentation + estructural |
| AC-07 — Idempotencia + jobs CI verdes | Segunda corrida `migrate deploy` exit 0; drift/smoke verdes aplicando el manejo validado en US-101 (verificar con CHECKs). | CI / DevOps |
| AC-08 — Sin artefactos excluidos | Regex sobre `migration.sql`: prohibidos `TRIGGER`, `REVOKE`, `uq_users_email_lower`, `DEFAULT` para `valid_until`, `USING gin`, `CREATE EXTENSION`, secretos. | QA (unit) |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

Platform/DB (shared persistence). Sin módulos de dominio afectados.

### Use Cases / Application Services

No aplica — sin código runtime.

### Controllers / Routes

No aplica.

### DTOs / Schemas

No aplica.

### Repository / Persistence

No aplica runtime. Persistencia = migration versionada + matriz versionada.

### Validation Rules

VR-01..VR-08 de la historia: comentarios raw SQL y naming (revisión PR + regex), prohibiciones (regex), matriz completa (revisión/test), tests de violación obligatorios por objeto, idempotencia (smoke), inmutabilidad (drift job), sin secretos (secret scan).

### Error Handling

- Fallo de `ALTER TABLE ADD CONSTRAINT` por datos preexistentes violatorios → migration `failed` en `_prisma_migrations`; recuperación: migración correctiva forward-only que sanea datos (README, heredado de US-100 EC-02).
- El mapeo de SQLSTATE 23514/23505 a error envelope de API pertenece a US-093 (documentado en la matriz como relación).

### Transactions

Prisma aplica la migration en su transacción estándar. `ALTER TABLE ADD CONSTRAINT` valida los datos existentes dentro de esa transacción (aceptable a volumen MVP).

### Observability

Logs CI de `migrate deploy`, tests de violación y drift job. Sin logging runtime.

---

## 8. Frontend Technical Design

No aplica.

---

## 9. API Contract Design

No aplica.

---

## 10. Database / Prisma Design

### Models Impacted

Ningún modelo cambia su forma. Constraints nuevos sobre 12 tablas: `users`, `events`, `budgets`, `budget_items`, `vendor_profiles`, `vendor_services`, `service_categories`, `quote_requests`, `quotes`, `booking_intents`, `reviews`, `attachments`, `ai_recommendations`, `ai_prompt_versions`.

### Fields / Columns

Sin columnas nuevas.

### Relations

Sin cambios.

### Constraints

**Check constraints (16) — DDL de referencia con definiciones literales de Doc 18:**

| # | Constraint | Tabla | Regla | Fuente |
|---|---|---|---|---|
| 1 | `chk_users_email_not_empty` | `users` | `email <> ''` | Doc 18 §13.3 |
| 2 | `chk_users_password_hash_not_empty` | `users` | `password_hash <> ''` | Doc 18 §13.3 |
| 3 | `chk_events_guests_count_positive` | `events` | `guests_count >= 1` | C-009 |
| 4 | `chk_events_estimated_budget_nonneg` | `events` | `estimated_budget >= 0` | C-010 |
| 5 | `chk_budgets_totals_nonneg` | `budgets` | `total_planned >= 0 AND total_committed >= 0` | Doc 18 §14.4 |
| 6 | `chk_budget_items_amounts_nonneg` | `budget_items` | `planned >= 0 AND committed >= 0 AND paid >= 0` | C-017 |
| 7 | `chk_vendor_profiles_category_change_max` | `vendor_profiles` | `category_change_count <= 5` | C-022b / Doc 18 §15.1 |
| 8 | `chk_vendor_profiles_languages_not_empty` | `vendor_profiles` | `cardinality(languages_supported) > 0` | Doc 18 §15.1 |
| 9 | `chk_vendor_services_base_price_nonneg` | `vendor_services` | `base_price >= 0` | Doc 18 §15.2 |
| 10 | `chk_service_categories_depth_level` | `service_categories` | `depth_level BETWEEN 1 AND 2` | C-026b |
| 11 | `chk_quotes_total_price_nonneg` | `quotes` | `total_price >= 0` | Doc 18 §16.2 |
| 12 | `chk_booking_intents_is_simulated` | `booking_intents` | `is_simulated = true` | C-038 |
| 13 | `chk_reviews_rating_range` | `reviews` | `rating BETWEEN 1 AND 5` | C-041 |
| 14 | `chk_attachments_size_bytes_nonneg` | `attachments` | `size_bytes >= 0` | Doc 18 §19.1 |
| 15 | `chk_ai_recommendations_timeout_positive` | `ai_recommendations` | `timeout_ms > 0` | Doc 18 §21.1 |
| 16 | `chk_ai_recommendations_retry_max` | `ai_recommendations` | `retry_count BETWEEN 0 AND 1` | Doc 18 §21.1 |

Ejemplo de forma:

```sql
-- Raw SQL: check constraint C-041 — rating entero 1..5 (BR-REVIEW-003)
ALTER TABLE reviews ADD CONSTRAINT chk_reviews_rating_range CHECK (rating BETWEEN 1 AND 5);
```

Notas semánticas:
- Columnas nullable (`paid`, `size_bytes`): `NULL` pasa el CHECK (semántica SQL estándar) — comportamiento correcto y esperado; los tests deben cubrir el caso NULL como válido.
- Los 4 checks de columna sin nombre explícito en Doc 18 (#8, #9, #11, #14) usan la convención `chk_<tabla>_<descripcion>` de §7 (nota de naming en AC-02 de la historia).

**Unique parciales (4) — DDL de referencia:**

```sql
-- Raw SQL: unique parcial C-027 — una solicitud activa por (event, vendor) (BR-QUOTE-004)
CREATE UNIQUE INDEX uq_quote_requests_event_vendor_active
  ON quote_requests (event_id, vendor_profile_id)
  WHERE status IN ('sent','viewed','responded');

-- Raw SQL: unique parcial C-030 — una quote vigente por request (BR-QUOTE-013)
CREATE UNIQUE INDEX uq_quotes_request_active
  ON quotes (quote_request_id)
  WHERE status NOT IN ('expired','rejected');

-- Raw SQL: unique parcial C-037 — un confirmed_intent por (event, category) (BR-BOOKING-007)
CREATE UNIQUE INDEX uq_booking_intents_event_category_confirmed
  ON booking_intents (event_id, service_category_id)
  WHERE status = 'confirmed_intent';

-- Raw SQL: unique parcial — una versión activa por prompt (Doc 18 §21.2)
CREATE UNIQUE INDEX uq_prompt_versions_active
  ON ai_prompt_versions (prompt_id)
  WHERE status = 'active';
```

**NO incluidos** (exclusiones formales DR-102): `uq_users_email_lower` (US-101), triggers, `REVOKE`, `DEFAULT valid_until`, GIN/extensiones.

### Indexes

Solo los 4 unique parciales anteriores (que además sirven como índices de consulta — coordinado con el inventario de US-101, que los excluye explícitamente de su verificación).

### Migrations Impact

- Nuevo directorio `apps/backend/prisma/migrations/<ts>_db_constraints/` — cuarta y última migration de la decomposición PB-P0-001: `<ts>_init` (US-100) → `<ts>_critical_indexes` (US-101) → `<ts>_db_constraints` (US-102).
- Forward-only; correcciones vía migration correctiva.
- Tras el merge, el test de inventario de US-101 (QA-005) NO debe modificarse: sus exclusiones ya contemplan estos 4 uniques; opcionalmente puede actualizarse para incluirlos como esperados (decisión del PR, documentada).

### Matriz de validación C-001..C-062

- **Ubicación sugerida**: `management/technical-specs/P0/PB-P0-001/constraints-validation-matrix.md` (confirmar en PR — nota menor del Approval Gate).
- **Columnas**: C-ID · Tabla · Regla · Mecanismo físico (Doc 18 §24) · Clasificación (`DB — US-099 baseline` / `DB — US-101 índice funcional` / `DB — US-102 check` / `DB — US-102 unique parcial` / `Service layer (owner)` / `Job (owner)` / `Middleware (owner)` / `Ausencia de tabla — out of scope estructural`) · Evidencia (constraint/test/historia futura).
- **Cobertura**: todas las filas de Doc 6 §17 incluyendo sub-IDs; cero filas sin clasificar (AC-06).

### Seed Impact

Sin datos seed. **Restricción hacia EPIC-SEED-001**: todo el seed futuro debe ser válido contra estos constraints (filas seed con ratings 1..5, montos no negativos, una activa por predicado, `is_simulated = true`).

---

## 11. AI / PromptOps Design

No aplica.

---

## 12. Security & Authorization Design

### Authentication / Authorization / Ownership / Role Rules

No aplica runtime.

### Negative Authorization Scenarios

No aplica — sin endpoints. Tests con datos sintéticos `@eventflow.demo`.

### Audit Requirements

No aplica `AdminAction` runtime. El append-only de `admin_actions` (C-050): convención + service layer; `REVOKE` diferido (DR-102 Decisión 4) y documentado en SEC-05 y en la matriz.

### Sensitive Data Handling

- `migration.sql` sin secretos (secret scan CI heredado cubre `prisma/migrations/`).
- Sin PII en tests ni en la matriz.

---

## 13. Testing Strategy

### Unit Tests

- Test estructural regex sobre `migration.sql` (Vitest): comentarios `-- Raw SQL:`, naming `chk_*`/`uq_*`, prohibiciones (`TRIGGER`, `REVOKE`, `uq_users_email_lower`, `DEFAULT` para `valid_until`, `USING gin`, `CREATE EXTENSION`, secretos) — TS-08, NT-09, NT-10.

### Integration Tests

Contra PostgreSQL real, tras `migrate deploy`:
- **Estructural**: 16 checks vía `pg_constraint`/`pg_get_constraintdef` (TS-02; comparar tolerante a la normalización de PostgreSQL — paréntesis, casts `::text`); 4 uniques vía `pg_indexes.indexdef` (TS-03).
- **Violación de checks** (TS-04 negado): rating 0/6, guests_count 0, montos negativos en events/budgets/budget_items/vendor_services/quotes/attachments, `is_simulated=false`, depth_level 3, category_change_count 6, email/password_hash vacíos, timeout_ms 0, retry_count 2, `languages_supported='{}'` → SQLSTATE `23514` con nombre de constraint asertado (NT-01..NT-05, NT-08, NT-11).
- **Violación de uniques + coexistencia** (AC-05/TS-05): por cada unique parcial, par de escenarios (duplicado activo → `23505`; histórico fuera del predicado → INSERT OK) (NT-06, NT-07).
- **NULL semántica**: `paid = NULL` y `size_bytes = NULL` aceptados (checks no aplican a NULL).

### API Tests / E2E Tests / Accessibility / AI Tests

No aplica.

### Security Tests

- Secret scan CI sobre la nueva migration (NT-10). Sin 401/403 (no hay endpoints).

### Seed / Demo Tests

No aplica directamente; la matriz y los constraints son la garantía estructural que EPIC-SEED-001 debe respetar.

### CI Checks

- `prisma-migrate-diff` (drift; verificar comportamiento con CHECK constraints — Riesgo R-1).
- `prisma-migrate-smoke`: `migrate deploy` en DB ephemeral + verificación estructural + idempotencia (segunda corrida exit 0) (TS-07).
- Revisión de matriz como gate de PR (AC-06; VR-04).

---

## 14. Observability & Audit

### Logs

CI logs de `migrate deploy`, tests de violación y drift job. Sin logs runtime.

### Correlation ID / AdminAction / Error Tracking / Metrics

No aplica.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

Ninguno.

### Demo Scenario Supported

Indirecto: los unique parciales garantizan los invariantes que la demo exhibe (una quote vigente, un booking confirmado por categoría); el seed de EPIC-SEED-001 debe construirse válido contra los 20 objetos.

### Reset / Isolation Notes

Sin cambios al mecanismo de reset (US-086); los constraints no interfieren con el borrado por `is_seed`.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| DR-100 (texto Decisión 1) | Asigna "enforcement append-only" a `ai_prompt_versions`; Doc 18 §20.1 define `admin_actions` como tabla append-only. | DR-102 Decisiones 4–5: convención + service layer para `admin_actions`; versionado híbrido + unique parcial para prompt versions. | Ninguna edición a DR-100 (inmutable); precisión registrada en DR-102. | No |
| Doc 18 §35.2 | Baseline antigua agrupa checks, unique parciales y default `valid_until`. | Split US-100/101/102 aprobado; default descartado. | Amendar post-merge (tracked desde US-100/US-101; agregar nota del default). | No |
| Doc 18 §24 (celda C-031) | Dice "Service layer + opcional `DEFAULT` en motor". | DR-102 Decisión 7: DEFAULT descartado definitivamente para MVP. | Amendar la celda en el housekeeping agrupado. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| R-1: `prisma migrate diff` reporta los CHECK constraints (no representables en PSL) como drift — tipo de objeto distinto al validado en US-101. | Job CI rojo permanente. | Validar empíricamente en el PR (DR-102 Decisión 9) reutilizando el mecanismo de US-101 (DR-101 Decisión 8): ajuste documentado sin desactivar drift global. |
| R-2: Datos preexistentes violatorios en re-deploy sobre QA/Demo con datos. | `ALTER TABLE ADD CONSTRAINT` falla; migration `failed`. | Entornos reproducibles (seed reset); smoke CI desde DB vacía; procedimiento de migración correctiva + saneo documentado en README (EC-01). |
| R-3: Normalización de `pg_get_constraintdef` rompe aserciones literales ingenuas. | Tests estructurales frágiles. | Comparación tolerante a normalización (parsing o regex flexible), igual que QA-003 de US-101. |
| R-4: Doble enforcement check/unique vs Zod/service genera mensajes crudos al usuario si el service layer falla primero en el motor. | UX degradada ante bugs. | Documentado como diseño (defensa en profundidad); mapeo SQLSTATE → error envelope es responsabilidad de US-093 (EC-03; trazado en matriz). |
| R-5: Matriz incompleta o desactualizada (filas sin clasificar o owners obsoletos). | PB-P0-001 cierra sin evidencia real. | AC-06/VR-04 como gate de PR; verificación de conteo total contra Doc 6 §17; revisión QA transversal (DR-102 Decisión 8). |
| R-6: Timestamp de migration anterior a `<ts>_critical_indexes`. | Orden cronológico roto. | Generar con `--create-only` después de mergear US-101; smoke CI desde DB vacía. |

---

## 18. Implementation Guidance for Coding Agents

**Archivos/carpetas probablemente impactados:**

- `apps/backend/prisma/migrations/<ts>_db_constraints/migration.sql` (nuevo — contenido principal).
- `management/technical-specs/P0/PB-P0-001/constraints-validation-matrix.md` (nuevo — matriz; confirmar ubicación en PR).
- `apps/backend/tests/db/db-constraints.structural.test.ts` (nuevo — regex; nombre orientativo).
- `apps/backend/tests/db/db-constraints.violations.test.ts` (nuevo — violaciones SQLSTATE + coexistencia histórica).
- `apps/backend/README.md` (sección `Database Migrations`: constraints + procedimiento R-2).
- `.github/workflows/<ci>.yml` (solo si R-1 exige ajuste adicional del drift job).

**Orden recomendado de implementación:**

1. Construir la **matriz C-001..C-062** primero (clasificación completa contra Doc 6 §17 + Doc 18 §24): es el mapa que confirma el inventario DB-enforceable y detecta cualquier residuo.
2. Generar la migration con `npx prisma migrate dev --create-only --name db_constraints` y redactar los 16 checks + 4 uniques con comentarios `-- Raw SQL:` citando C-ID/sección.
3. Aplicar en local (`db:migrate:dev`) y validar `db:migrate:diff` con los CHECKs (R-1) **antes** de escribir los tests de CI.
4. Implementar tests estructurales + de violación (incluyendo pares de coexistencia histórica y casos NULL).
5. Correr pipeline completo; actualizar README.
6. Completar la columna "Evidencia" de la matriz con los tests reales.

**Decisiones que NO deben reabrirse (DR-102):**

- Alcance: 16 checks + 4 uniques + matriz + tests; "validar los 62" se cumple vía matriz (Decisión 1).
- `uq_users_email_lower` NO se duplica (Decisión 2).
- Constraints Prisma-representables → matriz con owner US-099, no recrear (Decisión 3).
- `REVOKE` diferido; append-only por convención (Decisión 4).
- Sin triggers (Decisión 6); `DEFAULT valid_until` descartado (Decisión 7).
- Validación estructural + violación + coexistencia; sin performance (Decisión 10).

**Qué NO implementar:** enforcement service-layer/jobs/middleware, triggers, REVOKE, defaults de motor, índices de US-101, nada fuera del catálogo documentado.

**Supuestos a preservar:** `DATABASE_URL` solo por env; migrations inmutables post-merge; PostgreSQL 14+; NULL pasa los CHECKs sobre columnas nullable (comportamiento correcto).

---

## 19. Task Generation Notes

**Grupos de tareas sugeridos:**

1. **DOC-Matrix**: construcción de la matriz C-001..C-062 (primera tarea — es el mapa de todo lo demás) + completado de evidencia al final.
2. **DB-Migration**: generación y redacción de la migration (16 checks + 4 uniques), aplicación local, validación empírica del drift con CHECKs (R-1).
3. **QA-Structural**: regex sobre `migration.sql` (VR-01..VR-03, VR-08).
4. **QA-Violations**: tests de violación por SQLSTATE (16 checks) + pares de coexistencia histórica (4 uniques) + casos NULL.
5. **DevOps-CI**: verificación smoke/diff con la nueva migration; ajuste condicional del drift job si R-1 se confirma.
6. **Docs**: README backend; housekeeping post-merge agrupado (Doc 18 §35.2 + §24 C-031 + §25 trigram + PB-P0-001 wording — consolidable con los pendientes de US-100/US-101).

**Tareas QA requeridas:** TS-01..TS-08, NT-01..NT-11 mapeadas a los grupos 3–5.

**Tareas seguridad requeridas:** confirmación de cobertura del secret scan (reutiliza el patrón SEC-001 de US-101).

**Tareas seed/demo requeridas:** ninguna (restricción hacia EPIC-SEED-001 documentada en la matriz).

**Tareas documentación requeridas:** matriz (grupo 1), README, housekeeping agrupado.

**Dependencias entre tareas:** Grupo 1 (matriz) primero; Grupo 2 depende de 1; la validación drift (en 2) condiciona el grupo 5; Grupos 3–4 dependen de 2; review Tech Lead final cierra la nota menor del Approval Gate.

**Consolidated `tasks.md`:** **Sí — obligatorio al cerrar esta historia**: US-102 es la última de PB-P0-001; generar `management/development-tasks/P0/PB-P0-001/tasks.md` consolidando las 4 historias (recomendado en US-101 spec §19 y DR-102 §8) como evidencia académica del backlog item completo.

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass (Approved with Minor Notes, 2026-06-10) |
| Product Backlog mapping found | Pass (PB-P0-001, posición 4 of 4) |
| Decision Resolution reviewed if present | Pass (DR-102, 10 decisiones) |
| Scope clear | Pass |
| Architecture alignment clear | Pass (ADR-DB-001, ADR-DB-005, Doc 18 §7/§24/§28.3/§35.3) |
| API impact clear | N/A |
| DB impact clear | Pass |
| AI impact clear | N/A |
| Security impact clear | Pass (pipeline-level; append-only documentado) |
| Testing strategy clear | Pass |
| Ready for Development Task Breakdown | **Yes** |

---

## 21. Final Recommendation

**`Ready for Task Breakdown`**

La historia está aprobada con boundary cerrado por DR-102 (10 decisiones, ninguna reabierta), el inventario DB-enforceable es exhaustivo y literal contra Doc 18 (verificado en la segunda pasada de refinamiento, que corrigió el conteo a 16 checks), los unique parciales incluyen los pares de prueba de coexistencia histórica que validan la semántica de negocio, la matriz C-001..C-062 resuelve la obligación de PB-P0-001 sin scope creep, y los riesgos tienen mitigación definida (el único material — drift con CHECKs, R-1 — reutiliza el mecanismo ya validado en US-101 con verificación empírica acotada al paso 3 de la guía). Al cerrar US-102, consolidar el `tasks.md` del backlog item y ejecutar el housekeeping documental agrupado.
