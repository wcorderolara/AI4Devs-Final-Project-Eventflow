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

## Cookies de sesión HTTP-only firmadas (US-108 / PB-P0-006)

US-108 endurece la política de cookie de sesión sobre la base de US-094: `SameSite` por entorno,
lifetime de 30 días, validación fail-fast de configuración insegura y redacción de secretos en logs.
La emisión/limpieza vive en `src/infrastructure/security/session-cookie.ts`; la verificación en
`src/shared/interface/http/session-auth.ts`; la validación de config en `src/config/env.ts`.

### Variables de entorno (DOC-001)

| Variable | Default | Propósito |
|---|---|---|
| `SESSION_SECRET` | — (requerido) | Firma la cookie (`cookie-parser`). Mínimo **32 bytes** (VR-01). |
| `SESSION_COOKIE_NAME` | `eventflow_session` | Nombre de la cookie. Configurable. |
| `SESSION_COOKIE_MAX_AGE_DAYS` | `30` | Vigencia de cookie y sesión server-side en días (VR-05). |
| `SESSION_COOKIE_SECURE` | derivado de `NODE_ENV` | `Secure`. Obligatorio `true` en no-locales (VR-02). |
| `SESSION_COOKIE_SAMESITE` | `lax` | `lax` \| `none` \| `strict` (VR-03). |
| `CORS_ORIGINS` | — | Allowlist explícita separada por comas (nunca `*` con credentials). |
| `CORS_CREDENTIALS` | `true` | Envío de cookies cross-origin. Requerido `true` si `SameSite=None` (VR-04). |

### Comportamiento por entorno (DOC-001, N4)

- **Local / CI** (`NODE_ENV=development` \| `test`): se permite `SESSION_COOKIE_SECURE=false`
  (HTTP local controlado) y `SameSite=Lax`.
- **QA / Demo / Producción** (`NODE_ENV=production`): `Secure=true` es **obligatorio**; el boot
  falla (exit code ≠ 0) si `SESSION_COOKIE_SECURE=false`. No existe `APP_ENV`: el disparador de
  "no-local" es `NODE_ENV=production`.
- **Cross-site** (Amplify ↔ App Runner): `SameSite=None` exige `Secure=true`, `CORS_CREDENTIALS=true`
  y allowlist explícita (sin wildcard). Mitigación CSRF compatible con ADR-SEC-006.

Configuraciones inseguras que **fallan al boot** (`config.superRefine`, AC-06): secret < 32 bytes;
`Secure=false` en producción; `SameSite=None` sin `Secure`; `SameSite=None` sin CORS credentials
o con wildcard; `CORS_ORIGINS=*` con `CORS_CREDENTIALS=true`.

### Redacción de logs (AC-07)

El logger central (`src/shared/infrastructure/logger/`) aplica `redact()` a todo lo que emite:
`cookie`, `set-cookie`, `authorization`, `sid`, `jti`, cualquier `*secret` / `*token` / `*password`
se reemplazan por `[REDACTED]`. Eventos de sesión (`session.cookie.issued|cleared|invalid`) solo
llevan metadatos seguros (`correlationId`, `userId`, `reason`).

### Alineación documental no bloqueante (DOC-002)

- **Lifetime 30 días** — PB-P0-006 fija 30 días configurables (`SESSION_COOKIE_MAX_AGE_DAYS`);
  Doc 19 §10 menciona 24 horas. Se aplica la decisión más específica del backlog. Reemplaza el
  `SESSION_TTL_HOURS=168` (7 días) previo de US-094.
- **SameSite por entorno** — Default `SameSite=Lax` (Doc 16/19); `SameSite=None; Secure` solo para
  hosting cross-site (Doc 21) con mitigación CSRF. Resuelto por ADR-SEC-002 / ADR-SEC-006.
- **Nombre de cookie** — La spec nomina `eventflow.sid`; el proyecto conserva `eventflow_session`
  (ya en uso en US-094 y en el snapshot OpenAPI de US-098) como el **override técnico documentado**
  que la propia User Story permite. Sigue siendo configurable vía `SESSION_COOKIE_NAME`.
- **Naming de env vars** — La spec §7 usa `COOKIE_SECURE`/`COOKIE_SAMESITE`/`CORS_ALLOWED_ORIGINS`;
  el código conserva el prefijo `SESSION_COOKIE_*` y `CORS_ORIGINS` ya establecidos por US-089/094.

Fuente formal de decisiones: User Story §PO/BA Decisions y Technical Spec §16 (el artefacto
`US-108-decision-resolution.md` referenciado no existe en el repo; las decisiones están capturadas
en la US y la Tech Spec).

Trazabilidad completa: `management/workflows/development-execution/P0/PB-P0-006/US-108-execution.md`.

---

## Captcha anti-bot en auth (US-109 / PB-P0-006)

US-109 verifica captcha **server-side** en los tres endpoints públicos sensibles de auth, con
proveedor real configurable y mock determinista para Local/CI. Puerto `CaptchaVerifier`
(`src/shared/security/captcha/`), adapters en `src/infrastructure/captcha/` (mock, reCAPTCHA,
hCaptcha) seleccionados por `CAPTCHA_PROVIDER`; middleware `captchaVerificationMiddleware`.

### Endpoints protegidos (decision resolution US-109)

Captcha aplica **sólo** a: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`,
`POST /api/v1/auth/password/reset-request`. **No** aplica a `password/reset` (confirm), `logout`,
`/users/me` ni endpoints no-auth. El middleware corre **antes** de la validación de payload para
que un token ausente devuelva `CAPTCHA_REQUIRED` (no `VALIDATION_ERROR`), y antes de credenciales,
creación de usuario, reset token o emisión de cookie (SEC-05).

### Variables de entorno (DOC-001)

| Variable | Default | Propósito |
|---|---|---|
| `CAPTCHA_PROVIDER` | — (requerido) | `mock` \| `recaptcha` \| `hcaptcha`. `mock` **sólo** Local/CI. |
| `CAPTCHA_SECRET` | — | Legacy genérico (US-091); los providers reales usan las vars de abajo. |
| `RECAPTCHA_SECRET_KEY` | — | Secret backend reCAPTCHA (requerido si `CAPTCHA_PROVIDER=recaptcha`). |
| `HCAPTCHA_SECRET_KEY` | — | Secret backend hCaptcha (requerido si `CAPTCHA_PROVIDER=hcaptcha`). |
| `CAPTCHA_SCORE_THRESHOLD` | `0.5` | Umbral score reCAPTCHA v3 (0..1). |
| `CAPTCHA_VERIFY_TIMEOUT_MS` | `3000` | Timeout de verificación con el proveedor real. |

Site keys frontend son **públicas** (`NEXT_PUBLIC_RECAPTCHA_SITE_KEY` / `NEXT_PUBLIC_HCAPTCHA_SITE_KEY`);
los secret keys **nunca** salen del backend/Secrets Manager (SEC-02, ADR-SEC-005).

### Comportamiento por entorno + fail-fast (AC-04, EC-06)

- **Local / CI**: `CAPTCHA_PROVIDER=mock`; único token válido `'__test__'`. Sin red externa.
- **QA / Demo / Producción**: proveedor real con secret backend. El boot **falla** si:
  `CAPTCHA_PROVIDER` inválido; `mock` con `NODE_ENV=production`; proveedor real sin su secret key.
- No hay fallback automático de proveedor real a `mock` (SEC-06); el token `'__test__'` se rechaza
  con cualquier proveedor no-mock.

### Errores, observabilidad y no-persistencia

- Códigos estables: `400 CAPTCHA_REQUIRED` (token ausente), `400 CAPTCHA_INVALID`
  (inválido/expirado/action mismatch/score bajo/provider error/timeout). Mensajes genéricos:
  no revelan credenciales, email, score ni detalles del proveedor (SEC-07).
- Eventos: `captcha.verify.succeeded|failed`, `captcha.provider.timeout`, `captcha.config.invalid`
  con `correlationId`, `endpoint`, `provider`, `outcome`, `expectedAction`, `env` — sin token/secret.
- El logger central redacta `captchaToken`, `*SECRET*`, `*token`, etc. **No** se persiste ningún
  token, score, secret ni respuesta cruda del proveedor (VR-09; sin modelo/tabla captcha).

### Alineación documental no bloqueante (DOC-002)

- **Alcance** — Algunos documentos base mencionan captcha sólo en `register`/`login`; ADR-SEC-004
  y US-091 incluyen también `password reset request`. US-109 aplica los **tres** endpoints.
- **Provider naming** — Contrato MVP `mock|recaptcha|hcaptcha`. Turnstile u otros equivalentes sólo
  con decisión técnica documentada (Tech Lead), sin cambiar ACs ni alcance.

Fuente formal: `management/user-stories/decision-resolutions/US-109-decision-resolution.md`.
Trazabilidad completa: `management/workflows/development-execution/P0/PB-P0-006/US-109-execution.md`.

---

## Rate limiting en auth e IA (US-110 / PB-P0-007)

US-110 aplica rate limiting **estricto** por endpoint sensible encima del rate limit global laxo de
US-091, con `express-rate-limit` (store in-memory por proceso, MVP). Los limiters viven en
`src/shared/interface/http/{auth-rate-limits,ai-rate-limit,rate-limit-response}.ts`. El rechazo
`429` ocurre **antes** de credenciales / creación de usuario / reset token / email / `LLMProvider` /
`AIRecommendation` (VR-05). US-111 gobierna el orden del pipeline, Helmet y CORS (fuera de US-110).

### Políticas y variables de entorno (DOC-001)

| Endpoint(s) | Key | Default | Variables |
|---|---|---|---|
| `POST /auth/login` | IP | 10 / 10 min | `AUTH_LOGIN_RATE_LIMIT_MAX`, `AUTH_LOGIN_RATE_LIMIT_WINDOW_MS` |
| `POST /auth/register` | IP | 5 / 10 min | `AUTH_REGISTER_RATE_LIMIT_MAX`, `AUTH_REGISTER_RATE_LIMIT_WINDOW_MS` |
| `POST /auth/password/reset-request` | email normalizado | 3 / 1 h | `AUTH_PASSWORD_RESET_RATE_LIMIT_MAX`, `AUTH_PASSWORD_RESET_RATE_LIMIT_WINDOW_MS` |
| `POST /…/ai/*` (generación) | `ai:user:{userId}` (agregado) | 10 / 1 h | `AI_RATE_LIMIT_MAX`, `AI_RATE_LIMIT_WINDOW_MS` |

Todas las variables son **enteros positivos** con fail-fast en boot (AC-05, VR-01). `RATE_LIMIT_ENABLED`
(default `true`) es un interruptor de enforcement: **no** debe desactivarse en QA/Demo/producción; el
setup de tests lo pone en `false` y los tests de US-110 lo activan por caso. La cuota IA se agrega por
usuario a través de todos los endpoints POST de generación IA implementados (mismo limiter, misma key).

### Contrato 429 y headers (AC-06)

`429` usa el error envelope estándar `{ error: { code: "RATE_LIMIT_EXCEEDED", message, correlationId } }`
y emite `X-RateLimit-Limit`, `X-RateLimit-Remaining` y `Retry-After`. Documentado en OpenAPI (`RateLimited`)
para los 11 endpoints cubiertos.

### Observabilidad y seguridad (AC-07)

Evento `security.rate_limit.exceeded` (warning, no excepción) con campos seguros: `correlationId`,
`route`, `policy`, `keyType`, **`keyId` hasheado (sha256 truncado — nunca IP/email crudo)**, `limit`,
`remaining`, `retryAfterSeconds`, `status`. El logger central además redacta password/cookie/token/secret.
No se persiste ningún counter (sin migración ni seed).

### IP confiable / proxy (SEC-001, EC-01)

La key por IP usa `req.ip`. El backend **no** habilita `trust proxy`, por lo que `X-Forwarded-For`
arbitrario **no** se confía (default seguro contra spoofing). Si un despliegue detrás de proxy confiable
requiere resolver la IP real, la configuración de `trust proxy` pertenece a la cadena de middlewares de
US-111 y debe hacerse de forma explícita y validada por entorno.

### Demo (SEED-001)

Sin cambios de seed/migración. El guion demo normal se mantiene por debajo de los límites (10 IA/user/h).
Para demos repetidas, reiniciar el proceso o esperar la ventana; **no** desactivar el rate limiting.

### Alineación documental no bloqueante (DOC-002)

- **Password reset request** entra en el alcance de rate limit (ADR-SEC-004 / Doc 16), aunque algunos
  BR/NFR sólo mencionan register/login.
- **QuoteRequest** rate limit (Doc 14) queda **fuera** de US-110 (historia futura si se prioriza).
- **Vendor AI bio** está implementado (US-097) y comparte la cuota IA agregada; US-110 no crea endpoints IA nuevos.
- El default IA pasó de 30/min (interino US-097) a **10/user/1h** (US-110 autoritativa).

Fuente formal: `management/user-stories/decision-resolutions/US-110-decision-resolution.md`.
Trazabilidad completa: `management/workflows/development-execution/P0/PB-P0-007/US-110-execution.md`.

---

## Orden seguro de la cadena de middlewares (US-111 / PB-P0-007)

US-111 endurece y **bloquea con tests de regresión** el orden del pipeline Express para que
autenticación, autorización, ownership, validación, anti-abuse, headers de seguridad y manejo de
errores no puedan omitirse por una composición incorrecta. No cambia contratos funcionales, límites
de rate limit (US-110), captcha (US-109) ni cookies (US-108).

### Cadena global (`src/app.ts`)

```
correlationId → requestLogger → jsonBodyParser → cookieParser → CORS → helmet →
rate limit global laxo → /api/v1 (rutas) → notFoundMiddleware → errorHandlerMiddleware
```

- `correlationIdMiddleware` es **el primero** (base de observabilidad; genera/echoa `x-correlation-id`).
- `notFoundMiddleware` (404 estructurado) va **después** de las rutas y **antes** del error handler.
- `errorHandlerMiddleware` es **el último** (envelope seguro, sin stack/secretos, con `correlationId`).
- Nota (Doc 14 §8.2): body parser + cookie-parser preceden a CORS/Helmet; los tests confirman que
  CORS y Helmet siguen aplicando globalmente.

### Orden por ruta protegida (helper `composeProtectedRoute`)

`src/shared/interface/http/compose-route.ts` provee el patrón canónico, que **fuerza el orden por
construcción** (el orden de las claves del spec es irrelevante):

```
auth → role → ownership → policy → rateLimit → validation → handler
```

`composePublicSensitiveRoute` cubre rutas públicas sensibles (sin `auth`):

```
rateLimit → captcha → validation → handler
```

**Rutas nuevas deben usar estos helpers.** Adoptado en `ai-assistance` como referencia; las demás
rutas ya cumplen el orden canónico (establecido por US-091/094/097/108/110) y quedan cubiertas por
los tests de regresión de comportamiento.

### Invariantes verificados (AC-02/AC-07)

- `validateRequestMiddleware` **no** precede a `auth` en rutas protegidas → un anónimo con payload
  inválido recibe `401`, **no** `400` (no filtra el schema). Cubierto por test.
- `roleMiddleware` corta con `403` antes del handler; `authMiddleware` con `401` antes de role.
- Handler **no** se ejecuta si cualquier gate previo (auth/role/ownership/policy/rate limit/captcha/
  validation) rechaza.

### Seguridad y observabilidad (AC-04/AC-05/AC-08)

- Helmet aplica security headers globales (`X-Content-Type-Options: nosniff`, oculta `X-Powered-By`,
  etc.); CORS usa allowlist por entorno (un Origin fuera de la lista → `403`).
- `errorHandlerMiddleware` devuelve `{ error: { code, message, correlationId } }` sin stack/SQL/
  secretos; el stack va sólo a los logs. `correlationId` se preserva en éxito, rechazo, 404 y error.

Fuente formal: `management/user-stories/decision-resolutions/US-111-decision-resolution.md`.
Trazabilidad completa: `management/workflows/development-execution/P0/PB-P0-007/US-111-execution.md`.

---

## Suite negativa RBAC + ownership (US-112 / PB-P0-008)

US-112 es un **quality gate P0** que demuestra en CI que el backend es la única fuente de verdad de
autorización: anónimos, roles incorrectos, dueños distintos y vendors no asignados **no** pueden
acceder ni mutar recursos protegidos. No cambia endpoints, permisos, schema ni seed.

### Registry de endpoints protegidos (`tests/helpers/protected-endpoints.ts`)

Lista **explícita y revisable** de las rutas foundation bajo `/api/v1/*` que exigen sesión
(`PROTECTED_ENDPOINTS`) y de las rutas públicas excluidas (`PUBLIC_ENDPOINTS`, VR-06). Cada entry
declara el tipo de control (`auth`/`role`/`ownership`/`assignment`). Agregar una ruta protegida
nueva sin añadirla al registry deja un hueco visible en PR.

### Cobertura

- **`tests/api/us112-negative-rbac-ownership.spec.ts`** (nueva suite consolidada):
  - **DB-free (gate real en CI):** sweep dirigido por registry — cada endpoint protegido con un
    anónimo → `401 AUTHENTICATION_REQUIRED`; endpoints públicos NO marcados; `validation-before-authz`
    (anónimo + body inválido → `401`, no `400/422`); envelope seguro con `correlationId` (echo) y
    sin leaks (stack/SQL/secretos/tokens/cookies); `/api/v1/admin/*` → `404` (sin admin foundation aún).
  - **DB-gated (`describe.skipIf(!dbUp)`):** wrong-role → `403` antes de validation (sin crear recursos).
- **Complementaria (por módulo, DB-gated ya existente):** `us094/095/096/097-security.spec.ts` y
  `error-envelope-security.spec.ts` cubren cross-owner/cross-assignment/masked-404 por recurso.
- **Helpers:** `tests/helpers/negative-auth.ts` (`expectAuthError`, `expectNoLeak`, `agentFor`).

### Ejecución y CI gate (AC-08)

```bash
npm test                       # toda la suite (incluye US-112) — gate del job CI schema-structural-tests
npx vitest run tests/api/us112-negative-rbac-ownership.spec.ts   # sólo la suite negativa
```

Los casos DB-free corren en CI (sin Postgres) como gate bloqueante; los DB-gated corren con Postgres
(local o CI con servicio). El envelope validado es el contrato vigente `{ error: { code, message,
correlationId } }` (US-093), no `meta.correlationId`.

### Alcance P0 vs PB-P2-018 (DOC-002)

US-112 cubre la **suite negativa foundation P0** (endpoints de PB-P0-004 + controles de
PB-P0-006/007). La cobertura exhaustiva por todos los dominios MVP posteriores corresponde a
**PB-P2-018 / US-130** y queda como extensión futura sin bajar este gate.

Trazabilidad completa: `management/workflows/development-execution/P0/PB-P0-008/US-112-execution.md`.

### Alineación documental no bloqueante (DOC-002)

- **PB-P0-007** agrupa rate limiting + middleware order + Helmet; US-110 gobierna los *valores* de
  política y US-111 el *orden* de la cadena.
- **Doc 14** define el orden global completo; el resumen del backlog lista el orden protegido —
  US-111 los consolida (orden global y orden protegido por separado).
- La **elegibilidad de CAPTCHA** pertenece a US-109; US-111 sólo asegura que el control aplicable
  corra antes del handler.

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

---

## Snapshot OpenAPI (US-098 / PB-P0-005)

`backend/openapi.json` es el **snapshot canónico versionado** del contrato REST `/api/v1`,
generado de forma **determinista** desde los schemas Zod de los DTOs (US-092..097) con
`@asteasolutions/zod-to-openapi`. No define endpoints nuevos: congela el contrato ya implementado
para consumo de frontend, MSW, tests de contrato y documentación.

### Comandos

| Script | Qué hace |
| ------ | -------- |
| `npm run openapi:generate` | Regenera `backend/openapi.json` desde el código (claves ordenadas, sin timestamps). |
| `npm run openapi:lint` | Valida que el snapshot sea OpenAPI 3.x correcto (`@apidevtools/swagger-parser`, equivalente a redocly lint, offline). |
| `npm run openapi:check` | Regenera en memoria y **falla si difiere** del `backend/openapi.json` versionado (drift gate). |
| `npm run openapi:docs` | Genera `backend/openapi-docs.html` (Redoc, dev-only, gitignored) que consume `./openapi.json`. |

### Flujo ante un cambio de contrato

Si modificas un DTO, ruta, response o security metadata del API:

1. `npm run openapi:generate`
2. `git add backend/openapi.json`
3. Commitea el cambio contractual junto al código.

El job de CI **`openapi-check`** (y los tests en `tests/openapi/`) ejecutan `openapi:lint` +
`openapi:check` y **bloquean el merge** si el snapshot está desactualizado o es inválido (AC-03).

### Contenido y garantías

- `components`: `ErrorEnvelope`, `ResponseMeta`, `Pagination`, `AiMeta` y `responses` comunes
  (401/403/404/409/410/422/429/503/500) sobre el envelope estándar (US-093).
- `securitySchemes.cookieAuth` (cookie de sesión HTTP-only, ADR-SEC-002). Endpoints públicos
  (register/login/reset) sin `security`; protegidos con `cookieAuth` + 401/403.
- Todos los paths usan el prefijo `/api/v1`. Sin secretos, tokens, PII ni datos seed reales.

### Alineación documental (DOC-002)

Decisión formal US-098 / PB-P0-005: el artefacto **canónico** es `backend/openapi.json`. Doc 16 §43
menciona `/api/openapi.yaml`; cualquier `openapi.yaml`, Swagger UI o Redoc es **derivado local/demo**,
no una segunda fuente de verdad. Acción recomendada (no bloqueante): actualizar Doc 16 §43 para
indicar `backend/openapi.json` como snapshot canónico y YAML como derivado opcional.

Trazabilidad: `management/workflows/development-execution/P0/PB-P0-005/US-098-execution.md`.
