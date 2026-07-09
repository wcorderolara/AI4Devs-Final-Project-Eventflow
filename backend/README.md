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

---

## Contrato AUTH y perfil propio (US-094 / PB-P0-004)

Endpoints REST bajo `/api/v1` (ADR-API-001), envelope estándar (ADR-API-002), validación Zod
estricta y `X-Correlation-Id`. La sesión se transporta en **cookie HTTP-only firmada**
(ADR-SEC-002); **nunca** se retorna token en el JSON ni se usa `localStorage`/`sessionStorage`.

| Método | Ruta | Auth | Éxito |
| ------ | ---- | ---- | ----- |
| POST | `/api/v1/auth/register` | anónimo + captcha + rate limit | `201` + `AuthUserResponseDto` |
| POST | `/api/v1/auth/login` | anónimo + captcha + rate limit | `200` + `Set-Cookie` (sin token en JSON) |
| POST | `/api/v1/auth/logout` | sesión | `204` |
| POST | `/api/v1/auth/password/reset-request` | anónimo + captcha + rate limit | `202` genérico |
| POST | `/api/v1/auth/password/reset` | token | `204` |
| GET | `/api/v1/users/me` | sesión | `200` + `AuthUserResponseDto` |
| PATCH | `/api/v1/users/me` | sesión | `200` |
| PATCH | `/api/v1/users/me/preferred-language` | sesión | `200` |
| POST | `/api/v1/users/me/change-password` | sesión | `204` |

### Decisiones formalizadas (decision resolution US-094)

- **Ruta canónica de perfil propio: `/api/v1/users/me`** (no `/api/v1/me`). Doc 16 §10/§23 y
  Doc 19 §9.2 usan `/me`; se conserva `/users/me` por alineación con Epic Map y la historia.
  Alineación documental pendiente (no bloqueante) antes del snapshot OpenAPI (PB-P0-005).
- **`POST /api/v1/auth/password/reset-request` responde `202 Accepted`** genérico
  (anti-enumeración). Doc 19 §9.5 menciona `200`; alineación documental pendiente (no bloqueante).

### Sesión y seguridad

- Sesión **server-side** (`sessions`) con `sid` opaco firmado en la cookie
  (`cookie-parser` + `SESSION_SECRET`); `logout` revoca la sesión → llamadas protegidas
  posteriores responden `401` (AC-05). La auth por cookie vive en
  `src/shared/interface/http/session-auth.ts` (el `authMiddleware` Bearer del bootstrap US-091
  se conserva pero queda superseded por la cookie, ADR-SEC-002).
- Password hasheado con **bcrypt** (`bcryptjs`, `BCRYPT_SALT_ROUNDS`); SEC-05.
- Token de reset de un solo uso: se persiste **solo el hash SHA-256** (`password_reset_tokens`),
  TTL `RESET_TOKEN_TTL_MINUTES` (15 min); consumo + cambio de hash en una transacción (AC-07).
- Captcha (mock acepta `__test__` en test/CI) y rate limits por endpoint
  (login 10/IP/10min · register 5/IP/10min · reset-request 3/email/h) — ADR-SEC-004.
- Reset token inválido/expirado/consumido → `401` genérico (el mapping compartido no soporta
  `410`; ver execution record §9 D5).

Trazabilidad completa: `management/workflows/development-execution/P0/PB-P0-004/US-094-execution.md`.

---

## Contrato Event API (US-095 / PB-P0-004)

Endpoints REST bajo `/api/v1/events` (Doc 16). Todos requieren **sesión válida** (cookie US-094)
y rol **organizer**; cada operación actúa solo sobre eventos propios (owner-scoped). Envelope
estándar (ADR-API-002), validación Zod estricta, `X-Correlation-Id`.

| Método | Ruta | Auth | Éxito |
| ------ | ---- | ---- | ----- |
| POST | `/api/v1/events` | organizer | `201` + `EventResponseDto` (status `draft`) |
| GET | `/api/v1/events` | organizer | `200` + lista paginada (filtros status/tipo/fecha, sort) |
| GET | `/api/v1/events/:eventId` | organizer owner | `200` + `EventResponseDto` |
| PATCH | `/api/v1/events/:eventId` | organizer owner | `200` (currency inmutable) |
| POST | `/api/v1/events/:eventId/activate` | organizer owner | `200` (draft → active) |
| POST | `/api/v1/events/:eventId/cancel` | organizer owner | `200` (→ cancelled) |

### Autorización y errores

- Anónimo → `401`; rol no-organizer (vendor/admin) → `403`; evento inexistente o de otro
  organizer → **`404` enmascarado** (`RESOURCE_NOT_FOUND`, anti-enumeración — convención US-091).
- `currencyCode` en PATCH → **`409 CURRENCY_IMMUTABLE`** (AC-05). Campos no editables
  (`status`, `ownerId`, `autoCompleted`, `completedAt`, timestamps) → `400 VALIDATION_ERROR`
  (schema estricto). Transición de estado inválida (activar no-draft, cancelar terminal) →
  `422 BUSINESS_RULE_VIOLATION`. `eventTypeCode`/`locationId` inexistentes → `404`.

### Decisiones formalizadas (decision resolution US-095) y alineaciones

- Rutas canónicas de ciclo de vida: **`POST /:eventId/activate`** y **`POST /:eventId/cancel`**
  (Doc 16). **NO** se implementan los alias de Doc 14 `POST /:id/status` ni `DELETE /:id`
  (alineación documental pendiente, no bloqueante).
- **`GET /api/v1/admin/events`** queda **fuera de US-095** (admin read-only es P1 — PB-P1-010/US-016).
- El **auto-completion job T+2** pertenece a **PB-P1-009**; US-095 solo preserva compatibilidad de
  schema/DTO (`autoCompleted`, `completedAt`) sin implementar el job.

### Mapeo schema ↔ contrato

El modelo Prisma `Event` (US-099) usa `userId`/`eventTypeId`(FK)/`title`/`currency`/`language`; el
contrato API usa `ownerId`/`eventTypeCode`/`name`/`currencyCode`/`languageCode`. La traducción
ocurre en el repositorio (`eventTypeCode` ↔ `EventType.code`; idioma con guion ↔ enum Prisma).
US-095 agregó las columnas `notes`, `auto_completed`, `completed_at` (migración aditiva forward-only).

Trazabilidad completa: `management/workflows/development-execution/P0/PB-P0-004/US-095-execution.md`.

---

## Contrato Quote / Booking API (US-096 / PB-P0-004)

Endpoints REST del flujo bilateral organizer↔vendor bajo `/api/v1` (Doc 16). Todos requieren
sesión válida (cookie US-094). El rol se valida **por ruta**; ownership (organizer=owner del
evento) y assignment (vendor=asignado) se aplican en los use cases (recurso inaccesible → **404
enmascarado**). `BookingIntent` es un flujo **simulado** (`isSimulated=true`): sin pagos ni contratos.

| Método | Ruta | Rol |
| ------ | ---- | --- |
| GET/POST | `/api/v1/events/:eventId/quote-requests` | organizer owner |
| GET | `/api/v1/quote-requests/:quoteRequestId` | organizer owner o vendor asignado |
| PATCH | `/api/v1/quote-requests/:quoteRequestId/cancel` | organizer owner |
| GET | `/api/v1/vendors/me/quote-requests` | vendor |
| PATCH | `/api/v1/quote-requests/:quoteRequestId/viewed` | vendor asignado |
| GET/POST | `/api/v1/quote-requests/:quoteRequestId/quote` | GET org/vendor · POST vendor asignado |
| PATCH | `/api/v1/quotes/:quoteId` · POST `/send` | vendor dueño del quote |
| POST | `/api/v1/quotes/:quoteId/accept` `/reject` `/prefer` | organizer owner |
| POST | `/api/v1/booking-intents` | organizer owner |
| GET | `/api/v1/booking-intents/:bookingIntentId` | organizer owner o vendor asignado |
| POST | `/api/v1/booking-intents/:bookingIntentId/confirm` | vendor asignado |
| POST | `/api/v1/booking-intents/:bookingIntentId/cancel` | organizer owner o vendor asignado |

### Reglas de dominio y errores

- Máximo **5** QuoteRequests activas por event/category → `409 MAX_QUOTE_REQUESTS_EXCEEDED`
  (chequeo transaccional). Duplicada activa por event/vendor → `409 DUPLICATE_QUOTE_REQUEST_ACTIVE`
  (respaldado por `uq_quote_requests_event_vendor_active`, US-102 — P2002 mapeado).
- Un Quote actual por QuoteRequest (`uq_quotes_request_active`, US-102 → conflicto mapeado).
  Quote editable solo en `draft`; `send` aplica `validUntil = createdAt + 15 días` si falta.
- Aceptar/crear BookingIntent desde un Quote expirado → `410 QUOTE_EXPIRED`. BookingIntent solo
  desde un Quote `accepted` no expirado. Cancelación de BookingIntent exige `cancellationReason`.
- La moneda del Quote debe coincidir con la del evento.

### Alineaciones (Doc 16 canónico)

- Ruta de quote **singular** `/quote-requests/:quoteRequestId/quote` (Doc 14/19 mencionan plural
  `/quotes` → no implementada). Acceso admin a quote/booking queda **fuera de US-096** (P1).
  `preferred` se modela como `Quote.isPreferred`. Jobs de expiración/notificaciones/budget sync
  quedan fuera (historias específicas).

### Mapeo schema ↔ contrato

`totalPrice`↔`amount`, `currencyCode`↔`currency`; `brief`/`breakdown` como JSONB. US-096 agregó
columnas a `quote_requests` (brief/viewed_at/cancelled_at/ai_recommendation_id), `quotes`
(breakdown/conditions/is_preferred/sent_at/accepted_at/rejected_at/expired_at) y `booking_intents`
(vendor_profile_id/cancelled_at/cancelled_by/cancellation_reason) — migración aditiva forward-only.

Trazabilidad: `management/workflows/development-execution/P0/PB-P0-004/US-096-execution.md`.

---

## Contrato AI API (US-097 / PB-P0-004)

Endpoints REST de asistencia AI bajo `/api/v1` (Doc 16), **backend-only** (las API keys del LLM
nunca salen del backend) con **human-in-the-loop** estricto: toda generación crea una
`AIRecommendation` en estado `pending` hasta `apply`/`discard`. En US-097 el provider real es
`MockAIProvider` determinista (los adapters OpenAI/Anthropic reales son PB-P0-010/011).

| Método | Ruta | Rol |
| ------ | ---- | --- |
| POST | `/api/v1/events/:eventId/ai/{event-plan,checklist,budget-suggestion,vendor-categories,quote-brief,task-prioritization}` | organizer owner |
| POST | `/api/v1/quote-requests/:quoteRequestId/ai/comparison-summary` | organizer owner |
| POST | `/api/v1/vendors/me/ai/bio` | vendor |
| GET | `/api/v1/ai-recommendations/:aiRecommendationId` | owner |
| POST | `/api/v1/ai-recommendations/:aiRecommendationId/apply` | owner |
| POST | `/api/v1/ai-recommendations/:aiRecommendationId/discard` | owner |

- Respuesta de generación (`200`): `{ recommendationId, type, status:'pending', output, aiMeta, createdAt }`
  con `aiMeta = { provider, promptVersion, latencyMs, fallbackUsed, languageCode }` (AC-12).
- `apply` → `accepted` **sin materializar** dominio (los use cases de materialización por feature
  son P1); `discard` → `discarded` (`204`), sin efectos de dominio (HITL).
- Autorización/rate-limit **antes** de invocar el provider (SEC-06). Sin sesión → `401`; rol
  incorrecto → `403`; recurso ajeno → `404` masked.
- Errores controlados: `400 MISSING_INPUT`, `422 UNSUPPORTED_LANGUAGE`, `422 AI_INVALID_OUTPUT`,
  `422 INVALID_STATE_TRANSITION`, `503 AI_PROVIDER_TIMEOUT`, `503 AI_PROVIDER_UNAVAILABLE`,
  `429 RATE_LIMIT_EXCEEDED`. Sin endpoint de chat/prompt genérico (VR-09).
- Guardrails: input minimizado/sanitizado antes del provider (sin PII); output validado contra
  su schema Zod antes de responder/persistir; ninguna decisión autónoma. Tests con `MockAIProvider`
  (CI sin red — AC-14); `input.__simulate ∈ {timeout,unavailable,invalid}` fuerza los errores.

### Schema

US-097 agregó a `ai_recommendations`: `requested_by_user_id`(FK), `vendor_profile_id`/
`quote_request_id`(nullable FK), `ai_meta`(JSONB); `event_id` pasó a nullable (vendor_bio).
`ai_prompt_version_id` permanece requerido (invariante US-099) con un `AIPromptVersion` placeholder
hasta PB-P0-010. Config: `AI_TIMEOUT_MS`, `AI_DEMO_MODE`, `AI_RATE_LIMIT_MAX` (ver `.env.example`).

Trazabilidad: `management/workflows/development-execution/P0/PB-P0-004/US-097-execution.md`.
