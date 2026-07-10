# Contributing — EventFlow

## CI / Branch Protection (US-134 / PB-P0-017)

Cada Pull Request a `main` o `qa` dispara el workflow **`.github/workflows/pr.yml`** ("PR Quality
Gates"), que ejecuta los gates de calidad. Un fallo de cualquier job bloquea el merge.

### Jobs del workflow `pr.yml`

| Job | Qué corre | Cubre |
| --- | --------- | ----- |
| `lint` (matriz backend/web) | `npm ci` + `npm run lint` | AC-02 |
| `typecheck` (matriz backend/web) | `npm ci` + `npm run typecheck` | AC-03 |
| `test-backend` | `npm ci` + `npm run db:generate` + `npm test` (Vitest + Supertest) | AC-04 |
| `test-frontend` | `npm ci` + `npm test` (Vitest + Testing Library + MSW) | AC-04 |
| `build-backend` | `docker build` del `Dockerfile` (US-133), **sin push** | AC-05 |
| `build-frontend` | `npm ci` + `npm run build` (`next build`) | AC-06 |

- **Node**: `22` en backend y frontend (`web/.nvmrc` = 22, alineado con `engines.node>=22`). Cache de
  npm por `cache-dependency-path`.
- **Concurrency**: `cancel-in-progress: true` — un nuevo push al PR cancela el run anterior.
- **Permisos**: `permissions: contents: read` (privilegio mínimo). Sin `pull_request_target`, sin
  `id-token`, sin secretos de cloud. Acciones `actions/*` pinneadas por major (`@v4`).
- La suite de integración del backend se **auto-omite** sin `DATABASE_URL` alcanzable (no rompe el job).

### Workflows especializados (coexisten con `pr.yml`)

- `ci.yml` — gates de schema Prisma, migraciones, OpenAPI y seed idempotente (backend).
- `web-ci.yml` — pipeline frontend con E2E Playwright.

### Branch protection recomendado (configurar por un admin del repo)

En `Settings → Branches → Branch protection rules` para `main`:

- **Require status checks to pass before merging** → marcar los jobs de `pr.yml`:
  `lint`, `typecheck`, `test-backend`, `test-frontend`, `build-backend`, `build-frontend`
  (más los checks de `ci.yml`/`web-ci.yml` que apliquen).
- **Require branches to be up to date before merging**.
- **Require a pull request before merging**.

> La activación de branch protection es una acción operativa del owner del repositorio; no se
> automatiza desde este workflow.

### Gates locales equivalentes (antes de abrir PR)

```bash
# Backend
cd backend && npm run lint && npm run typecheck && npm test

# Frontend
cd web && npm run lint && npm run typecheck && npm test && npm run build

# Imagen backend (opcional)
cd backend && npm run docker:build
```

### Secretos y despliegue

Este workflow **no** usa secretos ni credenciales de cloud. El despliegue (OIDC GitHub ↔ AWS, push a
ECR, App Runner, Amplify) se incorpora en PB-P2-023..026, y la validación de migraciones Prisma en CI
en PB-P0-018 (US-139).

### Troubleshooting

- **`npm ci` falla por lockfile**: el lockfile debe estar en sync con `package.json` (`npm install` y
  commitear `package-lock.json`). Los peers deben resolver sin `--legacy-peer-deps`.
- **Cache frío**: el primer run instala desde cero; los siguientes reutilizan el cache de npm.
- **Docker build lento**: se usa `DOCKER_BUILDKIT=1`; el `.dockerignore` reduce el contexto.

## Migraciones Prisma / Rollback (US-139 / PB-P0-018)

El job **`migrations-validate`** de `pr.yml` levanta una Postgres efímera (`postgres:16-alpine`),
detecta **drift**, aplica `migrate deploy` (vía la composite action `.github/actions/prisma-migrate`)
y corre un **smoke** post-migración (`npm run test:integration:smoke`). Un fallo bloquea el merge.

### Política forward-only (ADR-DB-001, Doc 18 §28)

- **Prohibido `prisma migrate reset`** en CI/QA/Demo/producción (destruye datos). El wrapper
  `db:migrate:reset` está bloqueado fuera de local.
- Las migraciones son **forward-only**: para deshacer un cambio se crea una **migración correctiva**
  nueva (no se edita ni borra una migración ya aplicada).

### Crear una migración

```bash
cd backend
# 1) Edita prisma/schema.prisma
# 2) Genera la migración (local, contra tu Postgres):
npx prisma migrate dev --name <descripcion_corta>
# 3) Commitea prisma/migrations/<timestamp>_<descripcion>/ junto al cambio de schema.
```

Si el CI reporta **drift** ("el schema no coincide con prisma/migrations"), es que cambiaste el
schema sin generar la migración: corre `npx prisma migrate dev` y commitea la carpeta resultante.

### Cambios que requieren multi-step (Doc 18 §28.2)

Sobre tablas con datos, aplica en pasos separados (varias migraciones/PRs):

- **NOT NULL**: agregar columna nullable → backfill → `SET NOT NULL`.
- **UNIQUE / CHECK**: agregar constraint solo tras garantizar que los datos existentes cumplen.
- **Índices grandes**: crear con `CREATE INDEX CONCURRENTLY` para no bloquear escrituras.

### Rollback operativo

No hay rollback automático del deploy. Ante una migración problemática ya aplicada:

1. Crea una **migración correctiva** que revierta el efecto (nueva migración forward).
2. Si el deploy falló a mitad, revisa `prisma migrate status` y aplica la correctiva.
3. Snapshots/restore de RDS previos al deploy se incorporan en PB-P2-023..026 (fuera de P0).

Ver la **checklist Doc 18 §28.5** en la plantilla de PR (`.github/pull_request_template.md`) para
todo PR que toque `prisma/`.
