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
