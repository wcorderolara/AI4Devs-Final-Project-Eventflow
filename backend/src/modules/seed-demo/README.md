# Módulo `seed-demo`

Datos demo LATAM reproducibles e idempotentes para la demo académica y la suite QA E2E del MVP.
Todas las entidades sembradas quedan marcadas con `is_seed=true`.

## Capacidades

| Capacidad | Entrega | Historia |
| --------- | ------- | -------- |
| Runner CLI `npm run seed` (`SeedDemoDataUseCase`) | `src/scripts/seed.ts` + `application/seed-demo-data.use-case.ts` | US-085 |
| Reset surgical HTTP (`ResetDemoUseCase`) | `POST /api/v1/admin/seed/reset` | **US-086** |
| Mix de estados de evento `draft/active/completed` | hook `eventStatusPlan` | US-087 |
| `confirmed_intent` + reseña verificada + cancelación | hook `extendBookingsAndReviews` | US-088 |

## Endpoints (US-086)

| Método | Ruta | Propósito | Auth | Éxito |
| ------ | ---- | --------- | ---- | ----- |
| POST | `/api/v1/admin/seed/reset` | Limpia `is_seed=true` y repuebla (idempotente) | admin + flag | `202` `ResetReportDto` |
| GET | `/api/v1/admin/seed/status` | Estado del seed (`lastRunAt`, `recordCount`) | admin + flag | `200` `SeedStatusResponseDto` |

Las rutas **solo se registran** cuando `SEED_DEMO_ENABLED=true`; con el flag apagado no existen (`404`).

### Contrato `ResetReportDto` (respuesta `202`)

```ts
interface ResetReportDto {
  entitiesDeleted: Record<string, number>;   // conteo por entidad eliminada (surgical)
  entitiesReseeded: Record<string, number>;  // conteo por dominio repoblado
  seedVersion: string;                        // versión del runner de siembra
  correlationId: string;                      // propagado a logs y AdminAction
  durationMs: number;
}
```

Envuelto en el envelope estándar: `{ data: ResetReportDto, meta: { correlationId, timestamp } }`.

### `SeedStatusResponseDto` (respuesta `200`)

```ts
interface SeedStatusResponseDto {
  lastRunAt: string | null;                   // del último AdminAction SEED_RESET
  preset: 'minimal' | 'full' | null;          // MVP: null
  recordCount: Record<string, number>;        // filas is_seed=true por entidad
}
```

### Códigos de error

`400` (Zod strict) · `401` (sin sesión) · `403` (rol ≠ admin) · `404` (flag off) ·
`409` `SEED_RESET_IN_PROGRESS` (lock) · `500` `SEED_RESET_FAILED` (rollback + auditoría).

## Arquitectura

- **Controller thin** (`interface/seed-demo.controller.ts`) → **use cases** (`application/`) → Prisma.
- **Lock in-memory** por proceso (`application/seed-reset.lock.ts`) para exclusión mutua (EC-03).
- **Limpieza surgical** en orden FK descendente, `WHERE is_seed = true`, dentro de una transacción
  (rollback atómico, EC-02). Nunca toca filas `is_seed=false` (SEC-04).
- **Repoblado** delegado en `SeedDemoDataUseCase` (US-085) con `upsert` por clave natural (idempotente).
- **Boundary ADR-ARCH-001**: el módulo NO importa `MockAIProvider` de `ai-assistance`; usa un proveedor
  AI determinista local (`infrastructure/deterministic-seed-ai.provider.ts`) para el repoblado del reset
  HTTP. El CLI (script, exento) inyecta `MockAIProvider`.
- **Auditoría**: cada invocación persiste `AdminAction` (`action='SEED_RESET'`/`'SEED_RESET_FAILED'`,
  `target_entity='seed-demo'`, `is_seed=false`, `correlationId`/`reason` en `metadata`).

## Boundaries

- **US-085** — runner CLI y `SeedDemoDataUseCase`.
- **US-086** (este) — endpoint HTTP `POST /admin/seed/reset` y `ResetDemoUseCase`.
- **US-087 / US-088** — contenido específico del seed vía hooks públicos.
- **PB-P3-001 / US-140** — UI admin para disparar el reset (fuera de alcance; reusará `ResetReportDto`).

Operación y setup de BD local: [`docs/operations/seed.md`](../../../docs/operations/seed.md).
