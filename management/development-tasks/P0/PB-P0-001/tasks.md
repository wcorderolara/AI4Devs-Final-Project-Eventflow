# Consolidated Tasks — PB-P0-001: Database Schema, Migrations & Constraints

> Consolidación de cierre del **backlog item PB-P0-001** (EPIC-DB-001). Agrupa las 4 User Stories
> que materializan la fundación de persistencia EventFlow. Generado al cerrar US-102 (última del
> ítem), conforme a US-101 spec §19, US-102 spec §19 y DR-102 §8.
>
> No re-genera las tareas individuales: cada historia mantiene su propio
> `US-0XX-development-tasks.md` y su execution record en
> `management/workflows/development-execution/P0/PB-P0-001/`.

## 1. Decomposición del ítem

| Orden | User Story | Rol en el ítem | Tareas | Estado ejecución |
|---|---|---|---|---|
| 1 | [US-099](US-099-development-tasks.md) | Schema Prisma declarativo (19 modelos + enums + `@@index`/`@@unique` simples) | 27 | `Done` |
| 2 | [US-100](US-100-development-tasks.md) | Baseline init migration + scripts `db:migrate:*` + jobs CI (drift/smoke/secret-scan/reset-block) | 18 | `Done` |
| 3 | [US-101](US-101-development-tasks.md) | Migration raw SQL de índices (funcional + 12 parciales + 18 `is_seed`) + inventario §25 | 16 | `Validation` (pendiente review Tech Lead) |
| 4 | [US-102](US-102-development-tasks.md) | Migration raw SQL de constraints (16 checks + 4 unique parciales) + matriz C-001..C-062 | 13 | `Validation` (pendiente review Tech Lead) |

## 2. Artefactos físicos entregados

```
backend/prisma/
├── schema.prisma                         # 19 modelos + 17 enums (US-099 + AIPromptVersionStatus US-102)
└── migrations/
    ├── migration_lock.toml               # provider = postgresql
    ├── 20260708192543_init/              # US-100 — baseline schema-only (19 tablas + 16 enums + FKs)
    ├── 20260708201148_critical_indexes/  # US-101 — 1 funcional + 12 parciales + 18 is_seed
    └── 20260708211309_db_constraints/    # US-102 — 16 checks + 4 unique parciales (+ columnas/FKs de soporte)
```

- Scripts: `db:migrate:dev/deploy/status/diff/reset` (US-100).
- Wrapper env-aware `scripts/db-migrate-reset.sh` (US-100).
- Jobs CI (`.github/workflows/ci.yml`): `prisma-validate`, `prisma-generate`, `schema-structural-tests`,
  `secret-scan-schema` (US-099); `prisma-migrate-diff`, `prisma-migrate-smoke` (extendido con inventario
  e integración), `migration-structural-tests`, `migration-secret-scan`, `migrate-reset-block-test` (US-100/101/102).
- Matriz de validación: `management/technical-specs/P0/PB-P0-001/constraints-validation-matrix.md` (US-102).

## 3. Cobertura del Acceptance Summary de PB-P0-001

| Criterio del ítem | Cubierto por | Evidencia |
|---|---|---|
| Schema Prisma cubre entidades MVP de Doc 6/18 | US-099 | `schema.prisma` (19 modelos), tests estructurales |
| Migraciones reproducibles forward-only, `migrate deploy` idempotente | US-100 | baseline + smoke CI + idempotencia |
| Índices en columnas críticas (FK, status, fechas) | US-101 | migration `critical_indexes` + inventario §25 |
| Constraints C-001..C-062 enforced | US-102 | 20 objetos DB + matriz C-001..C-062 (67 filas clasificadas) |
| Tests de constraints pasan en CI | US-100/101/102 | Vitest 178/178 (estructural + integración); smoke CI |

## 4. Suite de tests (backend)

- **178 tests** Vitest: schema (25), migraciones estructurales (US-100/101/102), integración `pg_indexes`/`pg_constraint` (US-101/102), secret scan, wrapper env-aware.
- Integración: requiere PostgreSQL; **skip limpio** sin BD; corre en el job `prisma-migrate-smoke`.

## 5. Deuda / seguimiento post-cierre

- Review humano Tech Lead pendiente para US-101 y US-102 (gate `BE-001` de cada historia).
- **ADR/rework recomendado**: consolidar formalmente las columnas/relaciones que US-101 y US-102
  agregaron para reconciliar el schema US-099 con el Domain Data Model (Doc 6/Doc 18). Ver
  execution records US-101 §D-01 y US-102 §D-01 + gaps en la matriz §3.
- Housekeeping documental (post-merge): Doc 18 §24 celda C-031 (DEFAULT descartado), §35.2
  (split + default), §25 (trgm diferido — hecho), §26 (soft delete — hecho US-099), wording
  PB-P0-001 (hecho US-100).
- Enforcement por roles DB (`REVOKE` sobre `admin_actions`, C-050) diferido a US-137+.
