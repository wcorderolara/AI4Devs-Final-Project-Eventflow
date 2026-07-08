# Execution Record — PB-P0-001 / US-101: Implementar índices críticos vía raw SQL y verificar el catálogo físico

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-101 |
| User Story Title | Implementar índices críticos vía raw SQL (parciales, funcionales) y verificar el catálogo físico de índices |
| Phase | P0 |
| Backlog Position | PB-P0-001 |
| User Story Path | management/user-stories/US-101-critical-indexes.md |
| Tech Spec Path | management/technical-specs/P0/PB-P0-001/US-101-technical-spec.md |
| Tasks Path | management/development-tasks/P0/PB-P0-001/US-101-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | last-modified 2026-07-08 |
| Execution Record Status | Validation |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES (tras resolución autorizada de BLK-001) |
| Branch | foundation/PB-P0-001 |
| Initial Commit Hash | e91cb5cac2395cb869ed61ddb1bca5b4c5483a9f |
| Started At | 2026-07-08T19:50:13Z |
| Last Updated At | 2026-07-08T20:20:00Z |
| Completed At | null (pendiente review humano Tech Lead — BE-001) |
| Claude Session ID | f9deafc5-e1c7-4c76-9074-1634f83ca12a |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (3 argumentos, existen, dentro del repo)
- [x] User Story ID coincide en las 3 rutas (nombre + contenido): US-101
- [x] Phase coincide entre Tech Spec y Tasks: P0
- [x] Backlog Position coincide entre Tech Spec y Tasks: PB-P0-001
- [x] Documentos legibles
- [x] IDs de tarea extraídos (rango: TASK-PB-P0-001-US-101-DB-001 … TASK-PB-P0-001-US-101-DOC-002; 16 tareas base)

## 3. Readiness Gate

- Resultado: **READY_WITH_WARNINGS**
- Checks: User Story `Approved with Minor Notes` (2026-06-10, `Ready for Development Tasks: Yes`); 8 AC; Tech Spec `Ready for Task Breakdown`; 16 tareas identificables; `DEVELOPMENT_CONVENTIONS.md` legible; historia en backlog priorizado (PB-P0-001, posición 3 de 4); precondiciones US-099 y US-100 `Done` (schema + baseline migration `20260708192543_init` + scripts `db:migrate:*` + jobs CI presentes).
- Warnings:
  - **W-01 (ruta `backend/` vs `apps/backend/`):** Tech Spec/Tasks referencian `apps/backend/`; el repo real usa `backend/` (heredado de US-099/US-100). Se seguiría `backend/`.
  - **W-02 (gestor `npm` vs `pnpm`):** canónico npm (heredado de US-099/US-100).
  - **W-03 (divergencia schema US-099 vs catálogo Doc 18 §25 — deriva a bloqueo de Alignment):** al derivar las listas de índices (DB-001) se detectó que 3 de los 12 índices parciales del AC-03 referencian columnas **inexistentes** en el schema que US-099 entregó. Ver §4 y §8.
- Blockers: se materializan en el Alignment Gate (§4/§8). No hay blocker de readiness puro.
- Decision files relacionados: `management/user-stories/decision-resolutions/US-101-decision-resolution.md` (DR-101, 9 decisiones; existe).
- Refinement files relacionados: no se inspeccionó archivo dedicado; decisiones consolidadas en DR-101 y User Story.

## 4. Alignment Gate

- Resultado: **REQUIRES_TECH_SPEC_UPDATE** (bloqueante)
- Tasks vs Tech Spec: las tareas derivan del spec; sin embargo el spec/AC contienen DDL no aplicable (ver conflicto).
- Tech Spec vs Conventions: stack alineado (PostgreSQL 14 + Prisma 5.22 + npm + `backend/`). Sin objeción de convenciones.
- Tasks vs Acceptance Criteria: mapeo completo (matriz §5 de Tasks). El conflicto no es de cobertura sino de **factibilidad física** de 3 índices.
- Tech Spec vs arquitectura aceptada: **conflicto material detectado** (detalle abajo).

### Conflicto material (bloqueante)

El AC-03 (y la tabla de diseño Tech Spec §10) exigen 12 índices parciales "con predicados WHERE exactos". **Tres** de ellos referencian columnas que **no existen** en el schema físico entregado y mergeado por US-099 (`backend/prisma/schema.prisma`) y materializado por la baseline US-100:

| # | Índice (AC-03 / Tech Spec §10) | Columna/predicado exigido | Realidad en schema US-099 | Efecto |
| - | ------------------------------- | -------------------------- | ------------------------- | ------ |
| 1 | `idx_vendor_services_active` | `(vendor_profile_id) WHERE is_active = true` | `vendor_services` **no** tiene `is_active`; modela el estado con `status VendorServiceStatus` (`active`/`inactive`) | `CREATE INDEX` fallaría: `column "is_active" does not exist` |
| 2 | `idx_attachments_vendor_work_active` | `(owner_id, work_label) WHERE owner_type = 'vendor_work' AND status = 'active'` | `attachments` **no** tiene columna `work_label` (columnas: `owner_type`, `owner_id`, `status`, `url`, `file_name`, `mime_type`) | `CREATE INDEX` fallaría: `column "work_label" does not exist` |
| 3 | `idx_ai_rec_pending_expires` | `(expires_at) WHERE status = 'pending'` | `ai_recommendations` **no** tiene columna `expires_at` | `CREATE INDEX` fallaría: `column "expires_at" does not exist` |

**Contradicción interna adicional:** la propia Tech Spec §10 declara en "Fields / Columns: **Sin columnas nuevas**", mientras que el AC-03 exige índices sobre 3 columnas que habría que **crear**. Ambos enunciados no pueden ser verdaderos simultáneamente.

**Por qué no se resuelve en silencio (SKILL §4, §7, §14):**
- Agregar las 3 columnas (`is_active` boolean vs `status` enum en `vendor_services`; semántica/tipo/default de `work_label`; semántica/default/nullabilidad de `expires_at`) es una **decisión de modelado de dominio** fuera del alcance de US-101 (índices only; el gap-fill autorizado se limita a `@@index` btree representables, **no** a columnas nuevas) y contradice Tech Spec §10.
- Reinterpretar los predicados a las columnas existentes (p. ej. `vendor_services WHERE status = 'active'`, eliminar `work_label`, eliminar el índice de `expires_at`) violaría el requisito AC-03 de "predicados WHERE **exactos**" y sería una resolución silenciosa de un conflicto material.
- Es responsabilidad de PO/BA + Tech Lead / posible ADR o rework de US-099, no del ejecutor.

Los otros 9 índices parciales, el índice funcional `uq_users_email_lower` y los 18 índices `is_seed` **sí** son físicamente aplicables, pero al no poder completarse la migración conforme al AC-03/AC-05 sin una decisión, y siendo el Alignment Gate un gate **pre-implementación**, **no se modifica código de aplicación** hasta resolver el conflicto.

## 5. Task Inventory

| Task ID | Título original | Orden | Depends On | Status | Started | Completed | AC cubiertos | Evidencia (resumen) |
| ------- | --------------- | ----: | ---------- | ------ | ------- | --------- | ------------ | ------------------- |
| TASK-PB-P0-001-US-101-DB-001 | Derivar listas de índices desde el schema US-099 y contrastar contra el catálogo Doc 18 §25 | 1 | — | Done | 2026-07-08T19:50Z | 2026-07-08T20:00Z | AC-04, AC-05 | 18 tablas `is_seed`; mapa índice→fuente; sin gap btree; 3 columnas agregadas por resolución BLK-001 |
| TASK-PB-P0-001-US-101-DB-002 | Crear la migration `<ts>_critical_indexes` con el raw SQL completo | 2 | DB-001 | Done | 2026-07-08T20:00Z | 2026-07-08T20:05Z | AC-01,02,03,04 | `20260708201148_critical_indexes/migration.sql`: 3 ALTER TABLE + 1 funcional + 12 parciales + 18 is_seed; comentarios `-- Raw SQL:` |
| TASK-PB-P0-001-US-101-DB-003 | Gap-fill condicional de índices btree simples vía `@@index` | 3 | DB-001 | Done | 2026-07-08T20:00Z | 2026-07-08T20:00Z | AC-05 | **No requerido**: DB-001 no detectó gap btree simple del §25 (todos los `@@index` de US-099 presentes; drift 0). |
| TASK-PB-P0-001-US-101-DB-004 | Aplicar la migration en local y validar el drift job (R-1) | 4 | DB-002 | Done | 2026-07-08T20:05Z | 2026-07-08T20:13Z | AC-01, AC-07 | deploy OK; 31 índices creados; `migrate diff --exit-code` = **0** (sin falso drift, R-1 no se materializa) |
| TASK-PB-P0-001-US-101-QA-001 | Test estructural regex sobre `migration.sql` | 5 | DB-002 | Done | 2026-07-08T20:13Z | 2026-07-08T20:16Z | AC-01, AC-08 | `critical-indexes-structure.spec.ts` (23 tests Passed) |
| TASK-PB-P0-001-US-101-QA-002 | Test de integración: unicidad case-insensitive de email | 6 | DB-004 | Done | 2026-07-08T20:14Z | 2026-07-08T20:18Z | AC-02 | integración: `uq_users_email_lower` + unique violation case-insensitive |
| TASK-PB-P0-001-US-101-QA-003 | Test de integración: definición exacta de los 12 índices parciales | 7 | DB-004 | Done | 2026-07-08T20:14Z | 2026-07-08T20:18Z | AC-03 | 12 parciales verificados (tabla+columnas+literales, tolerante a normalización PG) |
| TASK-PB-P0-001-US-101-QA-004 | Test de integración: cobertura completa de índices `is_seed` | 8 | DB-004 | Done | 2026-07-08T20:14Z | 2026-07-08T20:18Z | AC-04 | 18 tablas `is_seed` derivadas de `information_schema.columns`, todas con índice |
| TASK-PB-P0-001-US-101-QA-005 | Test de inventario: catálogo Doc 18 §25 completo | 9 | DB-004 | Done | 2026-07-08T20:14Z | 2026-07-08T20:18Z | AC-05 | 31 índices US-101 presentes; exclusiones (4 unique parciales + trgm) ausentes; sin duplicados |
| TASK-PB-P0-001-US-101-QA-006 | Verificación CI: idempotencia + inmutabilidad | 10 | OPS-001 | Done | 2026-07-08T20:16Z | 2026-07-08T20:18Z | AC-06 | 2º deploy "No pending migrations"; inmutabilidad cubierta por `prisma-migrate-diff` (US-100) |
| TASK-PB-P0-001-US-101-OPS-001 | Extender el job CI `prisma-migrate-smoke` con inventario | 11 | DB-004, QA-005 | Done | 2026-07-08T20:16Z | 2026-07-08T20:17Z | AC-05,06,07 | paso "Inventario de índices críticos" (`vitest run tests/integration`) añadido al smoke |
| TASK-PB-P0-001-US-101-OPS-002 | Ajuste documentado del job `prisma-migrate-diff` ante falso drift (condicional) | 12 | DB-004 | Done | 2026-07-08T20:13Z | 2026-07-08T20:13Z | AC-07 | **No requerido**: DB-004 confirmó `DIFF_EXIT=0` (sin falso drift). Documentado en README; drift global intacto. |
| TASK-PB-P0-001-US-101-SEC-001 | Confirmar cobertura del secret scan sobre la nueva migration | 13 | DB-002 | Done | 2026-07-08T20:15Z | 2026-07-08T20:16Z | AC-01 (VR-07) | `migration-secret-scan.spec.ts` (allMigrationSql) ahora cubre `<ts>_critical_indexes` (13 tests); gitleaks repo-wide + job OPS-004 |
| TASK-PB-P0-001-US-101-BE-001 | Review Tech Lead del PR: validación de DR-101 Decisiones 8 y 9 | 14 | varias | Not Started (gate humano) | | | AC-07 | Evidencia técnica lista (drift 0 → Decisión 8; `CREATE INDEX` sin CONCURRENTLY → Decisión 9, en README/record). **Requiere revisión humana**; el ejecutor no se auto-aprueba. |
| TASK-PB-P0-001-US-101-DOC-001 | README backend: sección de índices críticos y manejo de drift | 15 | DB-004 | Done | 2026-07-08T20:17Z | 2026-07-08T20:18Z | AC-07 | README §Database Migrations: subsección "Migración de índices críticos (US-101)" (drift, CONCURRENTLY) |
| TASK-PB-P0-001-US-101-DOC-002 | Housekeeping post-merge: Documentation Alignment | 16 | BE-001 | Done | 2026-07-08T20:18Z | 2026-07-08T20:19Z | — | Doc 18 §25 trgm marcado DIFERIDO; §35.2 y wording backlog ya amendados en US-100 |

> IDs y títulos copiados **verbatim** del Tasks File; sin renumeración.
> DB-003 y OPS-002 eran **condicionales**; ambos resolvieron a "no requerido" con evidencia (registrado como Done = evaluado y cerrado). BE-001 es un **gate humano** (review Tech Lead) fuera del alcance del ejecutor.

## 6. Emergent Tasks

| ID | Título | Tarea padre | Razón de descubrimiento | Necesidad | Impacto de scope | Impacto Tech Spec | Status | Evidencia |
| -- | ------ | ----------- | ----------------------- | --------- | ---------------- | ----------------- | ------ | --------- |
| EMERGENT-001 | Acotar el test `migration-no-raw-sql.spec.ts` (US-100) a la baseline `<ts>_init` | QA-001 | El test de US-100 escaneaba **todas** las migraciones con `allMigrationSql()`; la nueva migración raw SQL de US-101 lo rompía. La intención de AC-09 (US-100) es que la **baseline** sea schema-only, no prohibir raw SQL en migraciones futuras. | Necesaria para coexistencia US-100/US-101 | Ninguno (corrige el alcance del test a su intención original) | Ninguno | Done | test acotado a `initMigrationSql()`; 6 tests Passed; suite total 117/117 |

> El conflicto de columnas (BLK-001) **no** fue una tarea emergente sino un **Cambio de Tech Spec** (SKILL §14) resuelto por decisión de autoridad (§4/§8).

## 7. Evidence by Task

> Entorno de validación: `postgres:14` efímero vía Docker (`ef-us101-pg`, puerto 55432), shadow DB `eventflow_shadow`, destruido al finalizar. Gestor `npm`.

### DB-001 — Derivación de listas + diff catálogo §25
- Inspección de `backend/prisma/schema.prisma` (US-099) + verificación de columnas.
- Tablas con `is_seed` (18): `users, locations, service_categories, event_types, vendor_profiles, vendor_services, attachments, events, event_tasks, budgets, budget_items, quote_requests, quotes, booking_intents, reviews, notifications, admin_actions, ai_recommendations` (excluye `ai_prompt_versions`).
- Mapa índice→fuente: 12 parciales de negocio (US-101 raw SQL) + `uq_users_email_lower` (funcional) + 18 `is_seed`; btree simples del §25 ya presentes en US-099 (sin gap → DB-003 no requerida).
- BLK-001 detectado y **resuelto** (§8): se agregan 3 columnas (`vendor_services.is_active`, `attachments.work_label`, `ai_recommendations.expires_at`).

### DB-002 — Migration raw SQL
- Files created: `backend/prisma/migrations/20260708201148_critical_indexes/migration.sql`.
- Files modified: `backend/prisma/schema.prisma` (+3 columnas de soporte).
- Comando: `npx prisma migrate dev --create-only --name critical_indexes` (genera 3 ALTER TABLE) + edición manual (raw SQL de 31 índices con `-- Raw SQL:`).
- `prisma validate` → Passed. Timestamp `20260708201148` posterior a la baseline `20260708192543`.

### DB-004 — Aplicación local + drift (R-1)
- `npx prisma migrate deploy` → aplica `critical_indexes` OK.
- Índices creados: 12 parciales de negocio + 18 `is_seed` + 1 funcional = **31** (verificado vía `pg_indexes`).
- `uq_users_email_lower` → `CREATE UNIQUE INDEX ... USING btree (lower(email))`; insert case-insensitive duplicado → `duplicate key value violates unique constraint "uq_users_email_lower"` (AC-02/NT-01).
- Idempotencia: 2º `migrate deploy` → "No pending migrations to apply".
- **Drift (R-1/EC-01):** `npm run db:migrate:diff` (con shadow) → **exit 0**, "No difference detected". Prisma 5.22 no reporta falso drift por índices raw SQL → **OPS-002 no requerido**; drift global intacto.

### QA-001..QA-005 + SEC-001 — Tests
- Files created: `backend/tests/migrations/critical-indexes-structure.spec.ts`, `backend/tests/integration/critical-indexes.integration.spec.ts`; `backend/tests/migrations/helpers.ts` (+helpers `criticalIndexes*`).
- Files modified: `backend/tests/migrations/migration-no-raw-sql.spec.ts` (EMERGENT-001, acotado a baseline).
- Comandos: `npx tsc --noEmit` → exit 0; `npx vitest run` → **117/117 Passed** (con BD, integración corre); sin BD (puerto muerto) → integración **skip limpio** (7 skipped).
- Cobertura: QA-001 estructural (23); QA-002 unicidad email; QA-003 12 parciales (tolerante a normalización PG); QA-004 18 `is_seed` dinámicos; QA-005 inventario §25 + exclusiones + sin duplicados; SEC-001 secret scan cubre la nueva migración (13 tests).

### OPS-001 / OPS-002 — CI
- Files modified: `.github/workflows/ci.yml` (job `prisma-migrate-smoke` extendido con paso "Inventario de índices críticos" → `vitest run tests/integration`).
- OPS-002: **no requerido** (evidencia DB-004: sin falso drift). Documentado en README.
- CI (GitHub Actions runner): **Not Run** (sin runner local; YAML validado; comandos equivalentes verdes localmente; se ejecutan en el PR).

### DOC-001 / DOC-002 — Documentación
- Files modified: `backend/README.md` (subsección "Migración de índices críticos (US-101)": drift, CONCURRENTLY); `docs/18-Database-Physical-Design.md` §25 (`idx_vendor_profiles_business_name_trgm` marcado DIFERIDO post-MVP, DR-101 Decisión 5).
- §35.2 (split raw SQL) y wording backlog "up/down"→forward-only: ya amendados en US-100 (no duplicados).

## 8. Blockers

| Blocker ID | Tarea afectada | Tipo | Descripción | Detectado | Decisión requerida | Rol responsable | Estado |
| ---------- | -------------- | ---- | ----------- | --------- | ------------------ | --------------- | ------ |
| BLK-001 | DB-001, DB-002, DB-003, QA-003, QA-005 | Tech Spec / Architecture | AC-03/Tech Spec §10 exigen 3 índices parciales (`idx_vendor_services_active` sobre `is_active`; `idx_attachments_vendor_work_active` sobre `work_label`; `idx_ai_rec_pending_expires` sobre `expires_at`) cuyas columnas **no existen** en el schema mergeado por US-099. Además Tech Spec §10 declara "Sin columnas nuevas", contradiciendo el AC-03. | 2026-07-08T19:50Z | Elegir entre adaptar predicados / agregar columnas / diferir. | PO/BA + Tech Lead | **Resolved** 2026-07-08T19:52Z |

**Resolución BLK-001 (decisión de autoridad, usuario/PO en la ejecución):** opción **"Agregar columnas (rework schema)"**. Se agregan 3 columnas a `backend/prisma/schema.prisma` para satisfacer los predicados exactos del AC-03:
- `VendorService.isActive Boolean @default(true) @map("is_active")`
- `Attachment.workLabel String? @map("work_label")`
- `AIRecommendation.expiresAt DateTime? @db.Timestamptz(6) @map("expires_at")`

La decisión **override explícito** de la nota Tech Spec §10 "Sin columnas nuevas" (registrado como desviación D-01). Con las columnas presentes, los 12 índices parciales del AC-03 son físicamente aplicables. Alignment Gate re-evaluado → `ALIGNED_WITH_NOTES`; tareas desbloqueadas.

## 9. Deviations

| # | Comportamiento planeado | Implementado/propuesto | Razón | Impacto | Convención afectada | Sección Tech Spec | ADR requerido | Resolución |
| - | ----------------------- | ---------------------- | ----- | ------- | ------------------- | ----------------- | ------------- | ---------- |
| D-01 | Tech Spec §10 "Sin columnas nuevas" | +3 columnas: `vendor_services.is_active`, `attachments.work_label`, `ai_recommendations.expires_at` | Decisión de autoridad (usuario/PO) para satisfacer los predicados exactos del AC-03 (resolución BLK-001) | Amplía el schema; los 12 índices parciales quedan aplicables | Modelo de datos | §10 (contradicción interna resuelta) | Recomendado ADR/rework formal de US-099 post-hoc | Aceptada (decisión explícita) |
| D-02 | Rutas `apps/backend/*` y gestor `pnpm` | `backend/*` y `npm` | Implementación existente (US-099/US-100) | Ninguno material | Estructura / comandos | §5, §18 | No | Aceptada (W-01/W-02) |
| D-03 | AC-03 "predicados WHERE exactos" (comparación literal) | Verificación tolerante a normalización PG (`IN`→`ANY(ARRAY[...])`, casts de enum) | PostgreSQL reescribe el `indexdef`; QA-003 lo advierte | Ninguno (se verifican tabla+columnas+literales) | — | §13 | No | Aceptada |

## 10. Final Validation

- Task completion: 15/16 Done (0 In Progress, 0 Blocked, 0 Rework, 0 Skipped; 1 gate humano pendiente: BE-001). DB-003 y OPS-002 condicionales → "no requerido" con evidencia.
- Acceptance Criteria coverage: 8/8 (AC-01..AC-08) cubiertos por implementación + tests; validación humana de PR pendiente (BE-001).
- Lint: Not Run (ESLint es Target; fuera de scope, consistente con US-099/US-100)
- Typecheck: **Passed** (`tsc --noEmit` exit 0)
- Tests: **Passed** (Vitest 117/117 con BD; integración skip limpio sin BD)
- Build: Not Applicable
- Migrations: **Passed** (`20260708201148_critical_indexes` aplicada; 31 índices; idempotente; drift `migrate diff` exit 0)
- Seed: Not Applicable (estructura `is_seed` habilitada; seed real en EPIC-SEED-001)
- Authorization: Not Applicable (sin runtime)
- Security: **Passed** (secret scan cubre la nueva migración; sin secretos)
- Accessibility / i18n: Not Applicable
- Documentation: **Passed** (README + Doc 18 §25)
- CI (GitHub Actions runner): **Not Run** (sin runner local; smoke extendido; comandos equivalentes verdes)
- Unresolved debt: (1) BE-001 review humano Tech Lead pendiente; (2) D-01 recomienda ADR/rework formal que consolide las 3 columnas nuevas en el modelo de US-099; (3) `CONCURRENTLY` deuda consciente post-MVP (R-2).
- Final status: **Validation** (implementación + validación técnica completas; pendiente review humano BE-001)

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-08T19:50:13Z | Initialized | Execution record creado; git limpio en foundation/PB-P0-001 @ e91cb5c |
| 2026-07-08T19:50:13Z | Source Validation | US-101 / P0 / PB-P0-001 coherentes; 16 tareas base |
| 2026-07-08T19:50:13Z | Readiness | READY_WITH_WARNINGS (W-01 backend/, W-02 npm, W-03 divergencia schema) |
| 2026-07-08T19:50:13Z | Alignment | REQUIRES_TECH_SPEC_UPDATE — BLK-001 (3 índices sobre columnas inexistentes) |
| 2026-07-08T19:50:13Z | Blocked | Blocker reportado; índice global actualizado; sin modificación de código |
| 2026-07-08T19:52:00Z | Unblocked | Resolución de autoridad (usuario/PO): "Agregar columnas". BLK-001 Resolved; Alignment → ALIGNED_WITH_NOTES |
| 2026-07-08T20:05:00Z | DB-001/DB-002 | 3 columnas al schema + migration `20260708201148_critical_indexes` (31 índices raw SQL) |
| 2026-07-08T20:13:00Z | DB-004 | deploy OK; idempotente; drift `migrate diff` exit 0 (sin falso drift → OPS-002 no requerido) |
| 2026-07-08T20:18:00Z | QA/SEC/EMERGENT-001 | Vitest 117/117 (23 estructural + 7 integración); test US-100 acotado a baseline |
| 2026-07-08T20:19:00Z | OPS-001/DOC | smoke CI extendido con inventario; README + Doc 18 §25 |
| 2026-07-08T20:20:00Z | Validation | Implementación completa y validada; pendiente review humano Tech Lead (BE-001) |
