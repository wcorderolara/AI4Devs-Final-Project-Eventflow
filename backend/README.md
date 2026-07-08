# EventFlow Backend

Andamiaje mínimo para hospedar el **schema Prisma declarativo** (US-099 / PB-P0-001).
Esta entrega cubre **solo** la declaración estática del schema y la generación del Prisma Client.
No incluye migraciones (US-100), índices avanzados (US-101), constraints físicos (US-102),
repositorios, use cases, controllers ni lógica de aplicación.

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
| `typecheck` | `tsc --noEmit` | Verifica el import surface del Prisma Client (BE-001). |
| `test` | `vitest run` | Tests estructurales del schema (QA-001..QA-008, SEC-001). |

## Estructura

```
backend/
├── prisma/
│   └── schema.prisma          # 19 modelos MVP + 4 enums base + enums de status por entidad
├── src/
│   └── infrastructure/prisma/
│       └── client.ts          # Smoke type-level del Prisma Client (no conecta a BD)
└── tests/
    └── schema/                # Tests estructurales (Vitest)
```
