# Execution Record — PB-P0-001 / US-102: Implementar constraints físicos vía raw SQL y validar el catálogo C-001..C-062

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-102 |
| User Story Title | Implementar constraints físicos vía raw SQL (checks, unique parciales) y validar el catálogo C-001..C-062 |
| Phase | P0 |
| Backlog Position | PB-P0-001 |
| User Story Path | management/user-stories/US-102-db-constraints.md |
| Tech Spec Path | management/technical-specs/P0/PB-P0-001/US-102-technical-spec.md |
| Tasks Path | management/development-tasks/P0/PB-P0-001/US-102-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | last-modified 2026-07-08 |
| Execution Record Status | Validation |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES (tras resolución autorizada de BLK-001: rework de modelo) |
| Branch | foundation/PB-P0-001 |
| Initial Commit Hash | 5fb12d5d10a454888f74cb3288f6e9e7d8a4d6e9 |
| Started At | 2026-07-08T20:26:35Z |
| Last Updated At | 2026-07-08T20:52:00Z |
| Completed At | null (pendiente review humano Tech Lead — BE-001) |
| Claude Session ID | f9deafc5-e1c7-4c76-9074-1634f83ca12a |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (3 argumentos, existen, dentro del repo)
- [x] User Story ID coincide en las 3 rutas: US-102
- [x] Phase coincide entre Tech Spec y Tasks: P0
- [x] Backlog Position coincide entre Tech Spec y Tasks: PB-P0-001
- [x] Documentos legibles
- [x] IDs de tarea extraídos (rango: TASK-PB-P0-001-US-102-DOC-001 … TASK-PB-P0-001-US-102-DOC-004; 13 tareas base)

## 3. Readiness Gate

- Resultado: **READY_WITH_WARNINGS**
- Checks: User Story `Approved with Minor Notes` (2026-06-10, `Ready for Development Tasks: Yes`); 8 AC; Tech Spec `Ready for Task Breakdown`; 13 tareas; `DEVELOPMENT_CONVENTIONS.md` legible; backlog PB-P0-001 posición 4 de 4; precondiciones US-099/US-100/US-101 presentes (schema + 2 migraciones aplicadas).
- Warnings:
  - **W-01 (ruta `backend/` vs `apps/backend/`)** y **W-02 (`npm` vs `pnpm`)**: heredados de US-099/US-100/US-101.
  - **W-03 (divergencia estructural schema US-099 vs catálogo Doc 6/Doc 18 — deriva a bloqueo de Alignment):** al construir la matriz e inventariar los objetos DB-enforceable (DOC-001/DB-001) se detectó que **15 de 20** objetos (12 checks + 3 unique parciales) referencian columnas/relaciones **inexistentes** en el schema que US-099 entregó. Ver §4 y §8.
- Blockers: se materializan en el Alignment Gate (§4/§8).
- Decision files relacionados: `management/user-stories/decision-resolutions/US-102-decision-resolution.md` (DR-102, 10 decisiones; existe).

## 4. Alignment Gate

- Resultado: **ARCHITECTURE_DECISION_REQUIRED** (bloqueante; también REQUIRES_TECH_SPEC_UPDATE)
- Tasks vs Tech Spec: las tareas derivan del spec, pero el DDL de AC-02/AC-03 (Tech Spec §10) no es aplicable sobre el schema real.
- Tech Spec vs Conventions: stack alineado; el conflicto es de **modelo de datos**, no de convenciones.
- Tech Spec vs arquitectura aceptada: **conflicto material y sistémico** (detalle abajo).

### Conflicto material (bloqueante)

El catálogo físico de constraints (Doc 6 §17 / Doc 18 §24) fue diseñado contra un **modelo de dominio más rico** que el schema **simplificado** que US-099 (Approved/Done) materializó. Resultado: **15 de 20** objetos de AC-02/AC-03 no son aplicables.

**Check constraints (16):**

| # | Constraint | Columna requerida | Estado en schema US-099 |
| - | ---------- | ----------------- | ----------------------- |
| 1 | chk_users_email_not_empty | `users.email` | ✅ existe |
| 2 | chk_users_password_hash_not_empty | `users.password_hash` | ✅ existe |
| 3 | chk_events_guests_count_positive | `events.guests_count` | ❌ inexistente |
| 4 | chk_events_estimated_budget_nonneg | `events.estimated_budget` | ❌ inexistente |
| 5 | chk_budgets_totals_nonneg | `budgets.total_planned/total_committed` | ✅ existen |
| 6 | chk_budget_items_amounts_nonneg | `budget_items.planned/committed/paid` | ⚠️ nombres reales `amount_planned/amount_committed`; **`paid` inexistente** |
| 7 | chk_vendor_profiles_category_change_max | `vendor_profiles.category_change_count` | ❌ inexistente |
| 8 | chk_vendor_profiles_languages_not_empty | `vendor_profiles.languages_supported` (array) | ❌ inexistente |
| 9 | chk_vendor_services_base_price_nonneg | `vendor_services.base_price` | ⚠️ real `price_min/price_max` |
| 10 | chk_service_categories_depth_level | `service_categories.depth_level` | ❌ inexistente |
| 11 | chk_quotes_total_price_nonneg | `quotes.total_price` | ⚠️ real `amount` |
| 12 | chk_booking_intents_is_simulated | `booking_intents.is_simulated` | ❌ inexistente |
| 13 | chk_reviews_rating_range | `reviews.rating` | ✅ existe |
| 14 | chk_attachments_size_bytes_nonneg | `attachments.size_bytes` | ❌ inexistente |
| 15 | chk_ai_recommendations_timeout_positive | `ai_recommendations.timeout_ms` | ❌ inexistente |
| 16 | chk_ai_recommendations_retry_max | `ai_recommendations.retry_count` | ❌ inexistente |

**Unique parciales (4):**

| Índice | Requiere | Estado |
| ------ | -------- | ------ |
| uq_quote_requests_event_vendor_active | `quote_requests.vendor_profile_id` | ❌ inexistente (QuoteRequest liga a `service_category`, no a vendor) |
| uq_quotes_request_active | `quotes.quote_request_id` + `status` | ✅ existen |
| uq_booking_intents_event_category_confirmed | `booking_intents.event_id` + `service_category_id` | ❌ inexistentes (solo tiene `quote_id`) |
| uq_prompt_versions_active | `ai_prompt_versions.prompt_id` + `status` | ❌ inexistentes (tiene `prompt_key/version`, sin `status` ni enum de estado) |

**Aplicables directamente:** 5 de 20 (checks #1, #2, #5, #13; unique `uq_quotes_request_active`).

**Por qué es una decisión de arquitectura (SKILL §4, §7, §14), no un simple "agregar columnas":**
1. **Magnitud:** 15 objetos dependen de estructura ausente.
2. **Relaciones nuevas:** `booking_intents → events/service_categories` y `quote_requests → vendor_profiles` implican nuevas FKs y cambian el modelo relacional que US-099 fijó.
3. **Enum + máquina de estado nuevos:** `ai_prompt_versions.status` (active/deprecated) + identidad `prompt_id` (¿tabla `AIPrompt` separada?) es diseño PromptOps, no un escalar.
4. **Tipos/semántica no triviales:** `languages_supported` (array `text[]`), `is_simulated` (default/semántica), `size_bytes`/`timeout_ms`/`retry_count`/`depth_level`/`guests_count`/`estimated_budget` (nullabilidad, defaults, unidades).
5. **Contradicción con la propia Tech Spec:** §10 declara "Fields / Columns: **Sin columnas nuevas**", incompatible con AC-02/AC-03.
6. **Foundational:** revela que el entregable Approved de US-099 es un **subconjunto** del Domain Data Model (Doc 6/Doc 18). Reconciliarlo es una decisión deliberada de PO/BA + Tech Lead, potencialmente con ADR y/o rework de US-099 — no debe resolverse silenciosamente dentro de una historia de "constraints".

Conforme a SKILL §14 ("Decisión de arquitectura → bloquea y requiere ADR") y §4 ("no elijas en silencio: clasifica, registra y detente antes de implementar el trabajo en conflicto"), **no se modifica código de aplicación**. La parte aplicable (5 objetos + matriz + tests) podría entregarse, pero completar AC-02/AC-03/AC-06 conforme a lo especificado exige la decisión de arquitectura previa.

## 5. Task Inventory

| Task ID | Título original | Orden | Depends On | Status | AC | Evidencia |
| ------- | --------------- | ----: | ---------- | ------ | -- | --------- |
| TASK-PB-P0-001-US-102-DOC-001 | Construir la matriz de validación C-001..C-062 | 1 | — | Done | AC-06 | `constraints-validation-matrix.md` (67 filas clasificadas; 20 DB-US-102 con evidencia) |
| TASK-PB-P0-001-US-102-DB-001 | Crear la migration `<ts>_db_constraints` (16 checks + 4 uniques) | 2 | DOC-001 | Done | AC-01,02,03 | `20260708211309_db_constraints/migration.sql` + 13 columnas/FKs/enum de soporte |
| TASK-PB-P0-001-US-102-DB-002 | Aplicar en local + validar drift con CHECKs | 3 | DB-001 | Done | AC-01,07 | deploy OK; 16 checks + 4 uniques; idempotente; `migrate diff` exit 0 (sin falso drift) |
| TASK-PB-P0-001-US-102-QA-001 | Test estructural regex sobre `migration.sql` | 4 | DB-001 | Done | AC-01,08 | `db-constraints-structure.spec.ts` (31 tests) |
| TASK-PB-P0-001-US-102-QA-002 | Tests de violación de los 16 checks (23514) | 5 | DB-002 | Done | AC-02,04 | `db-constraints.integration.spec.ts` QA-002 (16 checks + fronteras + NULL) |
| TASK-PB-P0-001-US-102-QA-003 | Tests de unique parciales + coexistencia (23505) | 6 | DB-002 | Done | AC-03,05 | QA-003 (4 uniques: duplicado activo 23505 + coexistencia histórica) |
| TASK-PB-P0-001-US-102-QA-004 | Verificación estructural `pg_constraint`/`pg_indexes` | 7 | DB-002 | Done | AC-02,03 | QA-004 (16 checks contype=c + 4 uniques con WHERE) |
| TASK-PB-P0-001-US-102-OPS-001 | Verificar jobs CI (smoke/drift/idempotencia) | 8 | DB-002, QA-004 | Done | AC-07 | smoke ya corre `vitest run tests/integration` (US-101); cubre db-constraints; idempotencia + drift 0 verificados |
| TASK-PB-P0-001-US-102-SEC-001 | Confirmar cobertura secret scan | 9 | DB-001 | Done | AC-08 | `migration-secret-scan.spec.ts` (allMigrationSql) cubre `<ts>_db_constraints` (19 tests) |
| TASK-PB-P0-001-US-102-DOC-002 | README backend: constraints + procedimiento datos violatorios | 10 | DB-002 | Done | AC-07 | README §"Migración de constraints físicos (US-102)" (drift + procedimiento EC-01) |
| TASK-PB-P0-001-US-102-BE-001 | Review Tech Lead del PR | 11 | varias | Not Started (gate humano) | AC-07 | Evidencia técnica lista (drift 0 → D9); requiere revisión humana; el ejecutor no se auto-aprueba |
| TASK-PB-P0-001-US-102-DOC-003 | Evidencia matriz + housekeeping agrupado (post-merge) | 12 | BE-001 | Done | AC-06 | Matriz con evidencia + Doc 18 §24 C-031 amendado; §35.2/§25/§26/backlog ya hechos en US-100/US-101/US-099 |
| TASK-PB-P0-001-US-102-DOC-004 | Consolidar `tasks.md` del backlog item PB-P0-001 | 13 | BE-001 | Done | — | `management/development-tasks/P0/PB-P0-001/tasks.md` (cierre del ítem) |

> IDs y títulos copiados **verbatim** del Tasks File; sin renumeración.
> DOC-003/DOC-004 dependían de BE-001 (merge) pero se adelantaron como entregables versionados (matriz, tasks.md, amendas). BE-001 es gate humano fuera del alcance del ejecutor.

## 6. Emergent Tasks

| ID | Título | Tarea padre | Razón | Necesidad | Status | Evidencia |
| -- | ------ | ----------- | ----- | --------- | ------ | --------- |
| EMERGENT-001 | Ajustar test de inventario QA-005 de US-101 | QA-004 | US-101 QA-005 asertaba que los 4 unique parciales de US-102 estaban **ausentes**; tras crearlos US-102 el assert quedó obsoleto (anticipado por US-102 spec §10). | Coexistencia US-101/US-102 | Done | `critical-indexes.integration.spec.ts`: assert acotado a que solo el índice trigram sigue ausente |
| EMERGENT-002 | `fileParallelism: false` en vitest.config | QA-002/003 | Los 2 specs de integración comparten la misma BD; el paralelismo de archivos causaba carreras. | Determinismo de tests DB | Done | `vitest.config.ts`; suite 178/178 estable |

## 7. Evidence by Task

> Entorno de validación: `postgres:14` efímero (`ef-us102-pg`, puerto 55432) + shadow DB, destruido al finalizar. Gestor `npm`.

### DOC-001 — Matriz C-001..C-062
- File created: `management/technical-specs/P0/PB-P0-001/constraints-validation-matrix.md`.
- 67 filas del catálogo (Doc 6 §17) clasificadas por mecanismo + owner + evidencia; 0 sin clasificar. Gaps anotados (C-040, C-045, C-057, `paid`) para ADR/rework.

### DB-001 / DB-002 — Migration + aplicación
- Files: `backend/prisma/schema.prisma` (+13 columnas/FKs/enum de soporte), `backend/prisma/migrations/20260708211309_db_constraints/migration.sql`.
- Comando: `prisma migrate dev --create-only --name db_constraints` (columnas/enum/FKs) + edición manual (16 checks + 4 uniques con `-- Raw SQL:`).
- deploy OK; verificación: `pg_constraint` contype=c → **16 checks**; `pg_indexes` uq_ con WHERE → **4 uniques**; 2º deploy "No pending migrations"; `migrate diff` exit **0** (sin falso drift con CHECKs → EC-02 no requiere ajuste).

### QA-001..QA-004 / SEC-001 — Tests
- Files: `backend/tests/migrations/db-constraints-structure.spec.ts`, `backend/tests/integration/db-constraints.integration.spec.ts`; `backend/tests/migrations/helpers.ts` (+helpers).
- `npx tsc --noEmit` exit 0; `npx vitest run` → **178/178 Passed** (con BD); skip limpio sin BD (31 skipped).
- QA-002: 16 checks rechazan con SQLSTATE 23514 + nombre del constraint; fronteras (rating 1/5) y NULL (size_bytes) válidos. QA-003: 4 uniques rechazan duplicado activo (23505) y permiten coexistencia histórica. QA-004: definiciones estructurales.

### OPS-001 / DOC-002 / DOC-003 / DOC-004
- CI: job `prisma-migrate-smoke` (extendido en US-101) ejecuta `vitest run tests/integration` → cubre db-constraints. CI (runner) **Not Run** local; comandos equivalentes verdes.
- README §"Migración de constraints físicos (US-102)"; Doc 18 §24 celda C-031 amendada (DEFAULT descartado); `tasks.md` consolidado del backlog item.

## 8. Blockers

| Blocker ID | Tarea afectada | Tipo | Descripción | Detectado | Decisión requerida | Rol responsable | Estado |
| ---------- | -------------- | ---- | ----------- | --------- | ------------------ | --------------- | ------ |
| BLK-001 | DOC-001, DB-001, DB-002, QA-001..004, OPS-001, SEC-001, DOC-002 | Architecture / Tech Spec | El catálogo C-001..C-062 (Doc 6/Doc 18) asume un modelo de dominio más rico que el schema simplificado de US-099. 15 de 20 objetos DB-enforceable referencian columnas/relaciones inexistentes. | 2026-07-08T20:26Z | Elegir entre subconjunto / rework completo / adaptar / escalar. | PO/BA + Tech Lead (ADR) | **Resolved** 2026-07-08T20:30Z |

**Resolución BLK-001 (decisión de autoridad, usuario/PO en la ejecución):** opción **"Rework completo del modelo aquí"**. Se expande `backend/prisma/schema.prisma` para satisfacer el catálogo completo (registrado como desviación D-01, override explícito de Tech Spec §10 "Sin columnas nuevas"; recomendado ADR/rework formal de US-099 post-hoc):

- `events`: `guestsCount Int?`, `estimatedBudget Decimal(14,2)?`
- `vendor_profiles`: `categoryChangeCount Int @default(0)`, `languagesSupported String[]`
- `service_categories`: `depthLevel Int @default(1)`
- `booking_intents`: `isSimulated Boolean @default(true)`, `eventId` (FK→events), `serviceCategoryId` (FK→service_categories)
- `attachments`: `sizeBytes Int?`
- `ai_recommendations`: `timeoutMs Int @default(60000)`, `retryCount Int @default(0)`
- `quote_requests`: `vendorProfileId String?` (FK→vendor_profiles)
- `ai_prompt_versions`: enum `AIPromptVersionStatus {active, deprecated}` + `status @default(active)` + `promptId`
- `quotes.total_price` → se usa la columna existente `amount` (constraint conserva el nombre canónico `chk_quotes_total_price_nonneg`).
- `budget_items`: se usan `amount_planned`/`amount_committed` existentes; **`paid` no se agrega** (fuera de la lista autorizada) → el check omite `paid`.

Alignment Gate re-evaluado → `ALIGNED_WITH_NOTES`; tareas desbloqueadas.

## 9. Deviations

| # | Comportamiento planeado | Implementado | Razón | Impacto | ADR requerido | Resolución |
| - | ----------------------- | ------------ | ----- | ------- | ------------- | ---------- |
| D-01 | Tech Spec §10 "Sin columnas nuevas" | +11 columnas + 1 array + 1 enum + 2 FKs en el schema | Decisión de autoridad (usuario/PO) para materializar el catálogo completo (resolución BLK-001) | Amplía el modelo de dominio (rework de US-099) | **Recomendado** (consolidar el modelo formalmente) | Aceptada (decisión explícita) |
| D-02 | Rutas `apps/backend/*` y `pnpm` | `backend/*` y `npm` | Implementación existente | Ninguno material | No | Aceptada (W-01/W-02) |
| D-03 | `budget_items` check con `paid`; `vendor_services.base_price`; `quotes.total_price` | `amount_planned/amount_committed` (sin `paid`); `price_min/price_max`; `amount` | Columnas reales de US-099; `paid`/`base_price`/`total_price` no existen y no estaban en el alcance autorizado | Constraints conservan nombre canónico | No | Aceptada (matriz §3) |
| D-04 | AC verifica nombre de constraint en violación | Checks: nombre + 23514; Uniques: columnas + 23505 (Postgres no expone el nombre del índice en la violación) | Comportamiento de PostgreSQL | Ninguno (se asertan columnas + SQLSTATE) | No | Aceptada |

## 10. Final Validation

- Task completion: 12/13 Done (0 In Progress, 0 Blocked, 0 Rework, 0 Skipped; 1 gate humano: BE-001).
- Acceptance Criteria coverage: 8/8 (AC-01..AC-08) por implementación + tests; review humano PR pendiente (BE-001).
- Lint: Not Run (ESLint Target; fuera de scope). Typecheck: **Passed** (exit 0). Tests: **Passed** (178/178; skip limpio sin BD).
- Build: Not Applicable.
- Migrations: **Passed** (`20260708211309_db_constraints` aplicada; 16 checks + 4 uniques; idempotente; drift exit 0).
- Seed: Not Applicable (restricción hacia EPIC-SEED-001 documentada en la matriz).
- Security: **Passed** (secret scan cubre la nueva migración; sin secretos).
- Accessibility / i18n: Not Applicable. Documentation: **Passed** (matriz C-001..C-062, README, Doc 18 §24, `tasks.md` consolidado).
- CI (GitHub Actions runner): **Not Run** (sin runner local; smoke cubre integración; comandos equivalentes verdes).
- Unresolved debt: (1) BE-001 review humano; (2) **D-01 recomienda ADR/rework de US-099** que consolide el modelo ampliado; (3) gaps de matriz (C-040, C-045, C-057, `paid`); (4) `REVOKE` append-only (C-050) diferido a US-137+.
- Final status: **Validation** (implementación + validación técnica completas; pendiente review humano BE-001). **Cierra la decomposición física de PB-P0-001** (US-099→US-100→US-101→US-102).

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-08T20:26:35Z | Initialized | Execution record creado; git limpio en foundation/PB-P0-001 @ 5fb12d5 |
| 2026-07-08T20:26:35Z | Source Validation | US-102 / P0 / PB-P0-001 coherentes; 13 tareas base |
| 2026-07-08T20:26:35Z | Readiness | READY_WITH_WARNINGS (W-01 backend/, W-02 npm, W-03 divergencia estructural) |
| 2026-07-08T20:26:35Z | Alignment | ARCHITECTURE_DECISION_REQUIRED — BLK-001 (15/20 objetos sobre columnas/relaciones inexistentes) |
| 2026-07-08T20:26:35Z | Blocked | Blocker reportado; índice global actualizado; sin modificación de código |
| 2026-07-08T20:30:00Z | Unblocked | Resolución de autoridad (usuario/PO): "Rework completo del modelo". BLK-001 Resolved; Alignment → ALIGNED_WITH_NOTES |
| 2026-07-08T20:45:00Z | DB-001/DB-002 | schema +13 cambios; migration `db_constraints` (16 checks + 4 uniques); deploy OK; idempotente; drift 0 |
| 2026-07-08T20:50:00Z | QA/SEC/EMERGENT | Vitest 178/178 (31 estructural + 24 integración); EMERGENT-001 (ajuste QA-005 US-101) + EMERGENT-002 (fileParallelism) |
| 2026-07-08T20:52:00Z | DOC/OPS | matriz C-001..C-062; README; Doc 18 §24 C-031; `tasks.md` consolidado; smoke CI cubre integración |
| 2026-07-08T20:52:00Z | Validation | Implementación completa y validada; pendiente review humano Tech Lead (BE-001); PB-P0-001 cerrado a nivel físico |
