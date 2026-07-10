# Operación — Seed de datos demo (`npm run seed`)

Runner CLI reproducible e idempotente que carga datos LATAM coherentes para la demo académica y la
suite QA (US-085, PB-P0-014). Todas las entidades sembradas quedan marcadas con `is_seed=true`.

## Comando

```bash
SEED_DEMO_ENABLED=true LLM_PROVIDER=mock NODE_ENV=development npm run seed
```

Emite un `SeedReport` a stdout (tabla legible + una línea NDJSON para CI) con `correlationId`,
`durationMs` y conteos por dominio (`created/updated/unchanged/skipped`).

### Variables de entorno

| Variable            | Requerida | Descripción |
| ------------------- | --------- | ----------- |
| `DATABASE_URL`      | sí        | Conexión Postgres. **Solo del entorno; nunca en el repo.** |
| `SEED_DEMO_ENABLED` | sí        | Debe ser `true`; en cualquier otro caso el seed aborta (exit 2). |
| `LLM_PROVIDER`      | no        | `mock` por defecto. El seed usa **solo** `MockAIProvider` (determinista). |
| `NODE_ENV`          | no        | Debe ser `!= production`; en `production` el seed aborta (exit 2). |

### Códigos de salida

| Exit | Significado |
| ---- | ----------- |
| `0`  | Éxito. |
| `1`  | Error de ejecución (BD inaccesible, falla de lote — rollback del dominio). |
| `2`  | Precondición incumplida (env/gate de seguridad o drift de migraciones). |

### Idempotencia

Ejecutar `npm run seed` N veces sobre la misma base **no** duplica registros: usa `upsert` por clave
natural estable (`email`, `code`, `(promptKey, version)`, deterministas por dominio). En la 2ª
ejecución el `SeedReport` reporta `created: 0` y `unchanged > 0` para todos los dominios.

> El **reset destructivo** NO se ejecuta desde este CLI. Se delega a US-086
> (`POST /api/v1/admin/seed/reset`) o se logra recreando la base + `prisma migrate deploy`.

## Base de datos local para pruebas (setup)

El seed y los tests de integración requieren un **Postgres local**. Levántalo con Docker (elige tu
propia contraseña — **nunca** commitees credenciales reales):

```bash
# 1) Levantar un Postgres local aislado para EventFlow (DB `eventflow`, usuario `AdminEF`).
#    Reemplaza <TU_PASSWORD_SEGURA> por una contraseña propia; usa el puerto 5433 si el 5432 está ocupado.
docker run -d --name ef-eventflow \
  -e POSTGRES_USER=AdminEF \
  -e POSTGRES_PASSWORD=<TU_PASSWORD_SEGURA> \
  -e POSTGRES_DB=eventflow \
  -p 5433:5432 postgres:16

# 2) Exportar la conexión (solo en tu shell local; no la guardes en el repo).
export DATABASE_URL="postgresql://AdminEF:<TU_PASSWORD_SEGURA>@localhost:5433/eventflow?schema=public"

# 3) Aplicar las migraciones (US-100). El seed NO aplica migraciones; falla con exit 2 si hay drift.
npm run db:migrate:deploy

# 4) Sembrar.
SEED_DEMO_ENABLED=true LLM_PROVIDER=mock NODE_ENV=development npm run seed

# 5) (Opcional) Correr los tests de integración del seed contra esa BD.
npx vitest run tests/integration/us085-
```

> Los tests de integración se **auto-omiten** (`describe.skipIf(!dbUp)`) si no hay BD alcanzable, así
> que la suite unitaria corre sin Postgres. En CI, el job `seed-idempotency` levanta un Postgres
> efímero, aplica migraciones y ejecuta el seed dos veces verificando `created=0`.

Para detener/limpiar el contenedor local:

```bash
docker rm -f ef-eventflow
```

## Volúmenes sembrados (BR-SEED-002)

6 organizadores, 12 proveedores aprobados, 12 eventos, 6 `EventType` + 12 `ServiceCategory`,
20 `QuoteRequest`, 20 `Quote`, 20 `BookingIntent` (`confirmed_intent`), 20 `Review`,
8 `AIRecommendation` deterministas (una por feature AI, `accepted=true`), 18 `Notification`,
6 `AdminAction`.

> `Language` y `Currency` son **enums** del schema (no tablas), por lo que su "catálogo" es implícito
> (siempre activo). El mix de estados de evento (`draft/active/completed`) lo afina US-087 y la
> variedad de bookings cancelados + reseña verificada la introduce US-088, ambos vía hooks públicos
> del `SeedDemoDataUseCase`.

### Cobertura de eventos (US-087)

Los 12 eventos seed garantizan la matriz para la demo guiada y QA:

| Dimensión | Cobertura |
| --------- | --------- |
| Estado | `completed`×3, `active`×5, `draft`×2, `cancelled`×2 (draft≥2, active≥4, completed≥2, cancelled≥1) |
| `auto_completed` | ≥1 evento `completed` con `auto_completed=true` y `completed_at` no nulo |
| Cercano a auto-completar | ≥1 evento `active` con `event_date = hoy − 2 días` (dinámico, para QA de `AutoCompleteEventsJob`) |
| Currency | `GTQ` y `USD` |
| Locale | `es-LATAM` y `en` |
| Tipos de evento | ≥4 distintos |
| Organizador ancla | `organizers[0]` tiene un evento en cada estado (draft/active/completed/cancelled) |

> El schema MVP no tiene columna `cancelled_reason`; la traza de cancelación se registra en `notes`
> (US-087 desviación D1). Migraciones nuevas son responsabilidad de US-100.

### Cobertura de BookingIntent y reseñas (US-088)

| Dimensión | Cobertura |
| --------- | --------- |
| BookingIntent | 8 total: `confirmed_intent`×5, `pending`×1, cancelado-desde-`pending`×1, cancelado-desde-`confirmed_intent`×1 |
| Invariantes | `is_simulated=true` + `is_seed=true`; quote `accepted`; confirmados con `(event, category)` distinto |
| Cancelación desde confirmado | `confirmed_at` no nulo, `cancelled_at > confirmed_at`, `cancellation_reason` no nulo (BR-BOOKING-009) |
| Reseñas | 24 total (20–40): `published`×17, `hidden`×5, `removed`×2; solo ligadas a `confirmed_intent` |
| Rating / locale | `rating ∈ 1..5`; textos en es-LATAM y en |
| Moderación | `AdminAction` `HIDE_REVIEW`/`REMOVE_REVIEW` (`target_entity='review'`) por cada reseña `hidden`/`removed` |
| Presupuesto | `BudgetItem.amount_committed` = monto del quote por cada `confirmed_intent` (AC-05) |

**Casos de uso para la demo/evaluación**: cierre de flujo (confirmación), cancelación con traza,
moderación de reseñas auditada y coherencia presupuestal.

> El schema MVP de `Review` no tiene columnas `moderated_by/at/reason`; la trazabilidad de moderación
> se registra íntegramente en `AdminAction` (US-088 desviación D2).

## Reset surgical Demo — endpoint admin (US-086 / PB-P0-014)

`POST /api/v1/admin/seed/reset` limpia **solo** las filas `is_seed=true` (surgical) y repuebla el seed
de forma idempotente. Es la operación de reset **operativa** de la demo (el CLI `npm run seed` NO borra).
Detalle de contrato en [`src/modules/seed-demo/README.md`](../../src/modules/seed-demo/README.md).

### Precondiciones

- `SEED_DEMO_ENABLED=true` — **con el flag apagado la ruta NO existe y responde `404`** (indistinguible
  de cualquier ruta inexistente; mitigación de fingerprinting THR-012). Nunca `403` ni `503`.
- Sesión válida con rol `admin` (cookie de sesión HTTP-only). Sin sesión → `401`; otro rol → `403`.

### Invocación (curl)

```bash
# Requiere una cookie de sesión admin válida (login previo). `reason` es opcional.
curl -i -X POST http://localhost:3000/api/v1/admin/seed/reset \
  -H 'Content-Type: application/json' \
  -b "eventflow_session=<cookie-firmada>" \
  -d '{"reason":"reinicio entre sesiones de demo"}'
```

Respuesta `202 Accepted` → `{ data: ResetReportDto, meta }` con `entitiesDeleted`, `entitiesReseeded`,
`seedVersion`, `correlationId`, `durationMs`. Cada invocación se audita en `AdminAction`
(`action='SEED_RESET'`, `is_seed=false` para sobrevivir al propio reset). `GET /api/v1/admin/seed/status`
devuelve `lastRunAt` y `recordCount` por entidad.

### Códigos de respuesta

| Código | Caso |
| ------ | ---- |
| `202`  | Reset surgical + repoblado OK. |
| `400`  | Body con campo desconocido (Zod `strict`). |
| `401`  | Sin sesión. |
| `403`  | Rol distinto de `admin`. |
| `404`  | `SEED_DEMO_ENABLED=false` (ruta no registrada). |
| `409`  | `SEED_RESET_IN_PROGRESS` — ya hay un reset en curso (lock). |
| `500`  | `SEED_RESET_FAILED` — falla en limpieza/repoblado (rollback + auditoría `SEED_RESET_FAILED`). |

> **404 intencional**: si un cliente reporta "el endpoint no existe" en un entorno sin
> `SEED_DEMO_ENABLED=true`, es el comportamiento esperado, no un bug.

## Alineación documental pendiente (no bloqueante)

- La `Traceability` de PB-P0-014 lista `BR-SEED-001..010`, pero Doc 4 solo define `BR-SEED-001..009`.
  Actualizar a `BR-SEED-001..009` (housekeeping).
