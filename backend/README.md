# EventFlow Backend

Andamiaje mínimo para hospedar el **schema Prisma declarativo** (US-099) y sus
**migraciones baseline** (US-100), ambos bajo PB-P0-001.
Cubre la declaración estática del schema, la generación del Prisma Client y la
**baseline init migration** schema-only con el flujo `migrate dev` / `migrate deploy`.
No incluye índices avanzados (US-101), constraints físicos (US-102), pipeline CD (US-139),
provisioning RDS (US-137), seed real (EPIC-SEED-001), repositorios, use cases ni controllers.

## Requisitos

- Node.js >= 22
- npm (gestor canónico, `docs/21`)

## Setup

```bash
cp .env.example .env   # DATABASE_URL dummy; no requiere BD real para validate/generate
npm ci
npm run db:generate
```

## Scripts

| Script | Comando | Propósito |
| ------ | ------- | --------- |
| `db:validate` | `prisma validate` | Valida `prisma/schema.prisma` (VR-01). |
| `db:generate` | `prisma generate` | Genera el Prisma Client tipado (VR-02). |
| `db:format` | `prisma format` | Normaliza el formato del schema. |
| `db:check` | `db:validate && db:generate` | Gate combinado local. |
| `db:migrate:dev` | `prisma migrate dev` | Aplica/crea migraciones en **local** (desarrollo). |
| `db:migrate:deploy` | `prisma migrate deploy` | Aplica migraciones pendientes (CI/QA/Demo), idempotente. |
| `db:migrate:status` | `prisma migrate status` | Estado de migraciones vs BD. |
| `db:migrate:diff` | `prisma migrate diff --from-migrations … --shadow-database-url … --exit-code` | Drift detection (exit 2 = drift). Requiere `SHADOW_DATABASE_URL`. |
| `db:migrate:reset` | `bash scripts/db-migrate-reset.sh` | Wrapper env-aware: **bloqueado** en CI/QA/Demo, permitido solo en local. |
| `typecheck` | `tsc --noEmit` | Verifica el import surface del Prisma Client (BE-001). |
| `test` | `vitest run` | Tests estructurales de schema y migraciones (Vitest). |

## Estructura

```
backend/
├── prisma/
│   ├── schema.prisma          # 19 modelos MVP + enums base + enums de status por entidad
│   └── migrations/
│       ├── migration_lock.toml       # provider = "postgresql"
│       └── <YYYYMMDDHHMMSS>_init/     # baseline init migration (schema-only)
│           └── migration.sql
├── scripts/
│   └── db-migrate-reset.sh    # Wrapper env-aware para `prisma migrate reset`
├── src/
│   └── infrastructure/prisma/
│       └── client.ts          # Smoke type-level del Prisma Client (no conecta a BD)
└── tests/
    ├── schema/                # Tests estructurales del schema (US-099)
    └── migrations/            # Tests estructurales de la baseline migration (US-100)
```

## Database Migrations

La gestión del esquema físico se hace **exclusivamente** con Prisma Migrate
(ADR-DB-005). La **source of truth operativa** es **Doc 21 §10**
(`docs/21-Deployment-and-DevOps-Design.md`); esta sección resume el uso cotidiano.

### Baseline

La baseline init migration `prisma/migrations/<YYYYMMDDHHMMSS>_init/migration.sql`
se deriva del schema declarado en US-099 y es **schema-only**: contiene los
`CREATE TYPE ... AS ENUM`, los `CREATE TABLE` de las 19 entidades y las foreign keys
(`ON DELETE RESTRICT` por defecto; `ON DELETE CASCADE` solo en `budget_items.budget_id`).
**No** contiene raw SQL para índices funcionales/GIN/parciales (US-101) ni check
constraints / unique parciales / enforcement append-only (US-102), ni seed data
(EPIC-SEED-001), ni secretos.

Regenerar la baseline (solo si el schema cambia y aún no hay migraciones mergeadas):

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/eventflow \
  npm run db:migrate:dev -- --create-only --name <nombre>
```

### Migración de índices críticos (US-101)

La migración `prisma/migrations/<ts>_critical_indexes/` agrega, vía **raw SQL** (Doc 18 §28.3),
los índices no representables en Prisma Schema Language:

- 1 índice funcional único: `uq_users_email_lower ON users (LOWER(email))` (login case-insensitive).
- 12 índices parciales del catálogo Doc 18 §25 (listados activos, jobs de expiración/cierre,
  directorio público, badge unread, límite de imágenes por trabajo).
- 18 índices parciales `idx_<tabla>_is_seed ... WHERE is_seed = true` (reset quirúrgico de demo, §27.5).

Incluye también 3 columnas de soporte (`vendor_services.is_active`, `attachments.work_label`,
`ai_recommendations.expires_at`) requeridas por los predicados del catálogo §25. La verificación
de inventario corre en el job CI `prisma-migrate-smoke` (tests de integración `tests/integration/`).

**Comportamiento del drift job (EC-01 / R-1):** se validó empíricamente con Prisma 5.22 que
`prisma migrate diff --from-migrations --to-schema-datamodel --exit-code` **no** reporta los
índices raw SQL (parciales/funcionales) como falso drift (`exit 0`, "No difference detected").
Por lo tanto **no** se requirió ajustar ni debilitar el job `prisma-migrate-diff`; la detección
de drift global permanece intacta.

**Deuda consciente (`CONCURRENTLY`, R-2):** los `CREATE INDEX` se ejecutan dentro de la
transacción de Prisma migrate (no `CONCURRENTLY`). Para el volumen MVP (seed 10–20 vendors) el
lock de build es despreciable; si el volumen crece post-MVP, evaluar índices concurrentes fuera
de la transacción de migración.

### Migración de constraints físicos (US-102)

La migración `prisma/migrations/<ts>_db_constraints/` cierra la capa física de PB-P0-001
agregando, vía **raw SQL** (Doc 18 §28.3), los objetos no representables en Prisma:

- **16 check constraints** (`chk_*`): no-vacíos, rangos (rating 1..5, depth 1..2, retry 0..1),
  montos no negativos e invariante `is_simulated = true`.
- **4 unique parciales** (`uq_*`): una solicitud/cotización/booking activo por clave de negocio
  (C-027, C-030, C-037) y una versión de prompt activa por `prompt_id`.

Incluye columnas y relaciones de soporte agregadas al schema (rework autorizado del modelo,
ver execution record US-102): `guests_count`, `estimated_budget`, `category_change_count`,
`languages_supported`, `depth_level`, `is_simulated` + FKs `event`/`service_category` en
`booking_intents`, `size_bytes`, `timeout_ms`, `retry_count`, `vendor_profile_id` en
`quote_requests`, y `status`/`prompt_id` (+ enum) en `ai_prompt_versions`.

La clasificación completa de los 62 constraints del catálogo (Doc 6 §17) está en
`management/technical-specs/P0/PB-P0-001/constraints-validation-matrix.md`.

**Drift (EC-02):** validado empíricamente que `prisma migrate diff` con CHECK constraints y
unique parciales **no** reporta falso drift (`exit 0`), igual que en US-101; sin ajuste al job.

**Procedimiento ante datos violatorios en re-deploy (EC-01 / R-2):** si `migrate deploy` aplica un
`ALTER TABLE ... ADD CONSTRAINT` sobre un entorno con datos que violan la regla, la migración
queda `failed` en `_prisma_migrations`. Recuperación forward-only: (1) generar una migración
correctiva que **sanee** los datos (UPDATE/DELETE de filas inválidas), (2) reintentar el deploy.
Nunca editar una migración mergeada. En MVP los entornos son reproducibles (seed reset) y el
smoke CI aplica desde DB vacía, capturando incompatibilidades temprano.

### Matriz de entornos (Doc 21 §10)

| Entorno | Comando | Owner / Trigger |
| ------- | ------- | --------------- |
| Local | `npm run db:migrate:dev` | Desarrollador manualmente |
| CI | `npm run db:migrate:diff` (drift) + `npm run db:migrate:deploy` smoke (DB ephemeral) | GitHub Actions en cada PR |
| QA | `npm run db:migrate:deploy` | Pipeline `staging.yml` (US-139) |
| Demo | `npm run db:migrate:deploy` | Pipeline `main.yml` (US-139) |

> El gestor canónico es **npm** (`docs/21`). Donde Doc 21 §10 ilustra `pnpm`, el
> equivalente en este repo es `npm run` (ver execution record US-100, nota N-02).

### Política forward-only (ADR-DB-005)

- Las migraciones son **forward-only**: Prisma **no** genera down migrations.
- Las correcciones se aplican mediante **migraciones correctivas adicionales**, nunca
  editando una migración ya mergeada (los archivos migration mergeados son **inmutables**, VR-05).
- Cada PR que modifica `prisma/schema.prisma` **debe** incluir el archivo migration
  correspondiente; el job CI `prisma-migrate-diff` bloquea el merge ante drift (VR-01, VR-07).

### `prisma migrate reset`

- **Permitido solo en local.** Está **bloqueado en CI/QA/Demo** porque destruye datos
  (seed/demo) — SEC-05.
- El bloqueo lo aplica el wrapper env-aware `scripts/db-migrate-reset.sh`
  (`npm run db:migrate:reset`): falla con exit code ≠ 0 si detecta `CI=true` o
  `NODE_ENV` distinto de `local`. **No** ejecutes `prisma migrate reset` directamente
  en pipelines. Enforcement adicional (IAM) se delega a US-139.

### Snapshots / rollback de datos

Snapshot RDS previo a `migrate deploy` y rollback de datos en QA/Demo se delegan a
US-137 (provisioning) y US-139 (orquestación CD). US-100 no los cubre.
