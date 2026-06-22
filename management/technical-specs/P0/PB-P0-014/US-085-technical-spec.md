# Technical Specification — US-085: Ejecutar `npm run seed` reproducible e idempotente

## 1. Metadata

| Field                                | Value                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------- |
| User Story ID                        | US-085                                                                                      |
| Source User Story                    | `management/user-stories/US-085-run-seed-script.md`                                         |
| Decision Resolution Artifact         | `management/user-stories/decision-resolutions/US-085-decision-resolution.md` (no existe)    |
| Priority                             | P0                                                                                          |
| Backlog ID                           | PB-P0-014                                                                                   |
| Backlog Title                        | Seed reproducible con organizadores, vendors, eventos, quotes, booking y reseñas            |
| Backlog Execution Order              | 14 (de 18 items P0)                                                                         |
| User Story Position in Backlog Item  | 1 de 4                                                                                      |
| Related User Stories in Backlog Item | US-085 (CLI runner), US-086 (admin reset endpoint), US-087 (seed event mix), US-088 (seed `confirmed_intent`) |
| Epic                                 | EPIC-SEED-001 — Seed Data & Demo Scenarios                                                  |
| Backlog Item Dependencies            | PB-P0-001 (Database Schema, Migrations & Constraints)                                       |
| Feature                              | Seed reproducible (CLI runner)                                                              |
| Module / Domain                      | `seed-demo` (Backend, transversal de escritura controlada — Doc 14 §10.16)                  |
| User Story Status                    | Approved                                                                                    |
| Backlog Alignment Status             | Found                                                                                       |
| Technical Spec Status                | Ready for Task Breakdown                                                                    |
| Created Date                         | 2026-06-22                                                                                  |
| Last Updated                         | 2026-06-22                                                                                  |

---

## 2. Backlog Execution Context

### Product Backlog Item

**PB-P0-014 — Seed Script Idempotente + Datos Demo** es el item P0 que materializa la estrategia seed documentada en Doc 11. Su `Description` (Product Backlog Prioritized §PB-P0-014) define explícitamente:

* Comando único `npm run seed` idempotente.
* Volúmenes mínimos: 5–10 organizadores, 10–20 vendors aprobados, 10–15 eventos (mix `draft/active/completed`), 10–15 `ServiceCategory`, 15–25 `QuoteRequest`, 10–20 `Quote`, ≥1 `BookingIntent.confirmed_intent`, 20–40 reseñas.
* Marca `is_seed=true` en todas las entidades sembradas.
* Coherencia cultural LATAM.
* Acceptance Summary: doble ejecución sin duplicados, cobertura de estados, ≥1 `confirmed_intent`, ≥1 reseña verificada visible.
* Dependencias: PB-P0-001 (schema y migraciones).
* Trazabilidad: Doc 11 · BR-SEED-001..009 · ADR-DEVOPS-*.

### Execution Order Rationale

PB-P0-014 ocupa la posición 14 dentro de los 18 items P0. Su ejecución se programa después de:

* **PB-P0-001** (DB Schema/Migrations) — requisito directo (`is_seed` debe existir en el schema).
* **PB-P0-002 / PB-P0-003** (Backend bootstrap + error envelope/logger) — el script reutiliza el contexto de Prisma, Zod y logger del backend.
* **PB-P0-009 / PB-P0-010 / PB-P0-011** (LLMProvider + Prompt Registry + AIRecommendation) — el seed depende del `MockAIProvider` determinista para sembrar `AIRecommendation` (FR-SEED-006).

Esta US es la **primera** del item PB-P0-014 porque entrega el runner; las US hermanas (US-086/087/088) extienden o complementan datasets específicos sobre la base provista por el runner.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item                                              | Suggested Order |
| ---------- | ----------------------------------------------------------------- | --------------- |
| US-085     | CLI runner `npm run seed` (idempotencia, `SeedReport`, gating env) | 1               |
| US-087     | Cobertura de event mix `draft/active/completed` en el seed         | 2               |
| US-088     | Garantía de `≥1 BookingIntent.confirmed_intent` + reseña verificada | 3               |
| US-086     | Admin reset demo (endpoint HTTP `SeedDemoController`)              | 4               |

---

## 3. Executive Technical Summary

Implementar el runner CLI `npm run seed` del módulo `seed-demo` (Doc 14 §10.16). El runner:

* Inicializa contexto: lee y valida envs con Zod (`DATABASE_URL`, `SEED_DEMO_ENABLED`, `LLM_PROVIDER`, `NODE_ENV`), aborta con `exit code 2` cuando `NODE_ENV=production` o `SEED_DEMO_ENABLED!=true`.
* Verifica que el schema Prisma esté alineado (aborta con `exit code 2` si detecta drift).
* Ejecuta `SeedDemoDataUseCase` que orquesta inserciones por dominio dentro de `prisma.$transaction` por lote.
* Aplica estrategia `upsert` con claves naturales estables (`seedKey` semilla determinista por dominio) para garantizar idempotencia (BR-SEED-001, NFR-DEMO-003).
* Marca todas las entidades con `is_seed=true` (BR-SEED-005).
* Siembra `AIRecommendation` para AI-001..AI-008 con respuestas deterministas del `MockAIProvider` (FR-SEED-006, BR-AI-005/006, NFR-AI-008).
* Genera y emite un `SeedReport` estructurado a stdout con `correlationId`, `durationMs`, conteos por dominio (`created/updated/unchanged/skipped`) (NFR-OBS-006).
* Códigos de salida: `0` éxito, `1` error de ejecución, `2` precondición incumplida.

Esta US **no** entrega el endpoint HTTP de reset (US-086), ni los datasets específicos de event mix (US-087) o `confirmed_intent` (US-088); estos se inyectan mediante providers de dominio reutilizables por las US hermanas.

---

## 4. Scope Boundary

### In Scope

* Entry point CLI `apps/api/src/scripts/seed.ts`.
* Script `package.json`: `"seed": "tsx src/scripts/seed.ts"` (o equivalente runtime TS, alineado con el stack del backend).
* Use case `SeedDemoDataUseCase` (Doc 14 §10.16 / §11 #45).
* Orquestación por dominios con `prisma.$transaction` por lote (atomicidad por dominio).
* Estrategia `upsert` con `seedKey` (clave natural estable por dominio).
* Validación de envs con Zod.
* Detección de drift de migraciones Prisma.
* Generación de `SeedReport` y logging estructurado con `correlationId`.
* Gating por `SEED_DEMO_ENABLED=true` y `NODE_ENV !== production`.
* Sembrado de catálogos cerrados: `EventType` (6 fijos), `ServiceCategory` (10–15 con jerarquía ≤ 2 niveles), `Language` (`es-LATAM`, `es-ES`, `pt`, `en`), `Currency` (`GTQ`, `USD`, `EUR`, `MXN`, `COP`).
* Sembrado de `AIRecommendation` deterministas (AI-001..AI-008) vía `MockAIProvider` con `accepted=true` e `is_seed=true`.
* Volúmenes base BR-SEED-002 cubiertos.

### Out of Scope

* Endpoint HTTP de reset demo (`POST /api/v1/admin/seed/run|reset`) — US-086 / `SeedDemoController`.
* Dataset específico del event mix `draft/active/completed` con distribución 3/5/3 — US-087.
* Dataset específico de `BookingIntent.confirmed_intent` + cancelado desde `confirmed_intent` + reviews vinculadas — US-088.
* Aplicación de migraciones Prisma — US-100.
* `SeedResetJob` (job de fondo) — Doc 14 §10.16, posterior P3.
* Demo Script narrativo (PB-P3-002).
* Conversión de moneda (BR-OOS-015).
* Toda funcionalidad P4/Future (BR-OOS-001..017).

### Explicit Non-Goals

* No expone interfaz HTTP.
* No aplica `prisma migrate deploy` por sí mismo; falla con mensaje accionable.
* No sembra PII real bajo ninguna circunstancia (BR-PRIVACY-010, NFR-PRIV-004).
* No reemplaza ni complementa la lógica de negocio runtime de los módulos `event-planning`, `vendor-management`, `quote-management`, etc.; sólo escribe en sus repositorios.
* No introduce nueva entidad ni columna en el Data Model.

---

## 5. Architecture Alignment

### Backend Architecture

* Stack: Node.js + TypeScript + Express + Prisma (Doc 14 §3, §8).
* Modular Monolith con Clean/Hexagonal Architecture (Doc 14 §6).
* El runner reside en `apps/api/src/scripts/seed.ts` y es un **adapter de entrada CLI** que ejecuta el use case `SeedDemoDataUseCase` del bounded context `seed-demo` (Doc 14 §10.16).
* Reutiliza el contenedor de dependencias del backend (Prisma client, logger, config Zod) o instancia un contexto mínimo dedicado al script si la inyección de dependencias del runtime no aplica fuera del proceso HTTP.
* Logger estructurado (NFR-OBS-006) compartido con el bootstrap del backend (US-089).
* Sin Express ni middleware HTTP en el path del CLI; el script ejecuta una pipeline pura: `loadConfig → assertEnvSafety → assertSchemaUpToDate → runSeed → emitReport → process.exit`.

### Frontend Architecture

No aplica.

### Database Architecture

* PostgreSQL gestionado vía Prisma (ADR-DEVOPS-004).
* Modelos impactados como destino de escritura: todos los modelos del Data Model con campo `is_seed` (Doc 6 / Doc 18).
* No introduce nuevas tablas ni columnas.
* Estrategia de escritura: `prisma.$transaction` por dominio (atómica), `upsert` por `seedKey` (clave natural estable).
* Índices requeridos: `is_seed` y `seedKey` por modelo deben existir o estar contemplados en US-101 (PB-P0-001 ya cubre constraints; los índices `is_seed` ya forman parte del schema base; el `seedKey` se modela como columna existente o, si no existe, queda como dependencia hacia US-099/100/101).

### API Architecture

No aplica — esta US no introduce endpoints HTTP. El `SeedDemoController` (`POST /api/v1/admin/seed/*`) pertenece a US-086.

### AI / PromptOps Architecture

* `MockAIProvider` (Doc 17, BR-AI-005/006) como única fuente de respuestas IA durante el seed.
* `LLM_PROVIDER=mock` requerido en env durante la ejecución del seed.
* Las respuestas seed se materializan en `AIRecommendation` con `prompt_version` documentado, `accepted=true`, `is_seed=true`, asociadas a las entidades del seed (Event, EventTask, Budget, Vendor, etc. según AI-001..AI-008).
* No se invoca `OpenAIProvider` ni `AnthropicProvider` (stub).
* No hay decisiones autónomas (NFR-AI-008).

### Security Architecture

* Sin autenticación HTTP (no hay endpoint).
* Autorización a nivel de sistema operativo del operador que ejecuta el CLI.
* Gating por env: `SEED_DEMO_ENABLED=true` y `NODE_ENV !== production` (Doc 14 §10.16; NFR-SEC-008).
* `DATABASE_URL` y credenciales exclusivamente de variables de entorno; nunca en repo (NFR-SEC-008).
* Datos sembrados sin PII real (BR-PRIVACY-010, NFR-PRIV-004; Doc 11 §6).

### Testing Architecture

* Vitest + Supertest no aplica directamente (no hay HTTP); Vitest + integración con base de pruebas (testcontainers o Postgres dedicado de CI).
* MockAIProvider determinista (Doc 17).
* Tests de seed/demo verifican volúmenes, idempotencia, `is_seed=true`, catálogos cerrados, `SeedReport`.
* CI corre `npm run seed` sobre base efímera y valida invariantes (Doc 20 §Seed/Demo Testing).

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation                                                                                                                                                  | Impacted Layer(s)                                |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| AC-01                | Pipeline CLI ejecuta `SeedDemoDataUseCase` end-to-end y retorna `exit code 0`; el use case orquesta dominios y respeta volúmenes BR-SEED-002.                              | Backend (CLI + Use Case + Repositories), DB      |
| AC-02                | Estrategia `upsert` por `seedKey` con conteos `created=0` y `updated/unchanged > 0` en re-ejecución; `prisma.$transaction` por dominio asegura consistencia.               | Backend (Use Case + Repositories), DB            |
| AC-03                | Cada repositorio del seed fija `is_seed=true` explícitamente en el `upsert`; validación post-seed cuenta `WHERE is_seed=true`.                                              | Backend (Repositories), DB, Testing              |
| AC-04                | Use case carga catálogos cerrados desde providers internos (`EventTypeSeedProvider`, `ServiceCategorySeedProvider`, `LanguageSeedProvider`, `CurrencySeedProvider`) con datos LATAM. | Backend (Use Case + Domain Constants), DB         |
| AC-05                | `AIRecommendationSeedProvider` invoca `MockAIProvider` para AI-001..AI-008 con prompts deterministas; persiste `AIRecommendation` con `accepted=true`, `is_seed=true`, `prompt_version`. | Backend (Use Case + AI Module), DB                |
| AC-06                | `SeedReportEmitter` recolecta métricas por dominio, genera UUID `correlationId`, marca `startedAt/finishedAt/durationMs`, imprime a stdout (texto plano legible).           | Backend (CLI + Observability)                     |
| EC-01                | `DatabaseConnectionError` capturado → log estructurado con `error.code` y `correlationId`; `process.exit(1)` sin escribir.                                                  | Backend (CLI + Observability)                     |
| EC-02                | `prisma migrate status --json` (o `prisma migrate diff`) ejecutado al inicio; si reporta drift, `exit code 2` con mensaje accionable.                                       | Backend (CLI + Prisma)                            |
| EC-03                | `EnvironmentGuard` valida `NODE_ENV` y `SEED_DEMO_ENABLED` antes de inicializar Prisma; `exit code 2` con mensaje.                                                          | Backend (CLI + Config)                            |
| EC-04                | Cada lote dominio se envuelve en `prisma.$transaction`; excepción no controlada → rollback del lote → `SeedReport` reporta dominio fallido → `exit code 1`.                  | Backend (Use Case + Repositories + Observability) |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

* **Bounded context primario**: `seed-demo` (Doc 14 §10.16).
* **Bounded contexts de destino** (escritura controlada): `identity`, `vendor-management`, `event-planning`, `task-management`, `budget`, `quote-management`, `booking`, `reviews-moderation`, `notifications`, `ai-recommendations`, `admin-governance`, `localization`.
* **Shared kernel**: utilidades de seed determinista (`seedKey`, `seedClock`, `seedFaker LATAM`).

### Use Cases / Application Services

| Use Case                           | Responsabilidad                                                                                       | Trazabilidad           |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------- |
| `SeedDemoDataUseCase`              | Orquesta dominios; ejecuta `prisma.$transaction` por dominio; agrega métricas al `SeedReport`.        | Doc 14 §11 #45, BR-SEED-001/002 |
| `SeedCatalogsUseCase` (interno)    | `EventType`, `ServiceCategory`, `Language`, `Currency`.                                              | FR-SEED-003, NFR-DEMO-005 |
| `SeedIdentitiesUseCase` (interno)  | Admin, organizadores, proveedores y perfiles.                                                        | FR-SEED-002, BR-SEED-002 |
| `SeedVendorAssetsUseCase` (interno)| `VendorService`, `Portfolio`, `Attachment` con soft delete.                                          | FR-SEED-002, BR-SEED-002 |
| `SeedEventsUseCase` (interno)      | `Event` base (no decide mix de estados; US-087 puede extender vía hook documentado).                  | FR-SEED-002             |
| `SeedQuotesUseCase` (interno)      | `QuoteRequest`, `Quote`.                                                                              | FR-SEED-004             |
| `SeedBookingsAndReviewsUseCase`    | `BookingIntent`, `Review` (≥1 `confirmed_intent` queda asegurado por US-088).                          | FR-SEED-005             |
| `SeedAIRecommendationsUseCase`     | `AIRecommendation` deterministas vía `MockAIProvider`.                                                | FR-SEED-006             |
| `SeedNotificationsUseCase`         | `Notification` in-app representativas.                                                                | NFR-DEMO-002            |
| `SeedAdminActionsUseCase`          | `AdminAction` de auditoría (aprobaciones, moderación demo).                                           | BR-ADMIN-004/011        |

### Controllers / Routes

No aplica. El adapter de entrada es el script CLI `apps/api/src/scripts/seed.ts`.

### DTOs / Schemas

* `SeedConfigSchema` (Zod): `{ DATABASE_URL: string.url(), SEED_DEMO_ENABLED: literal('true'), LLM_PROVIDER: enum(['mock','openai','anthropic']).default('mock'), NODE_ENV: enum(['development','test','demo','staging','production']) }`.
* `SeedReport` (interface): `{ correlationId: string, startedAt: ISO8601, finishedAt: ISO8601, durationMs: number, scriptVersion: string, domains: Record<DomainName, { created: number, updated: number, unchanged: number, skipped: number }>, exitCode: 0|1|2 }`.
* `SeedKey` (value object): `${domain}:${stableId}` por dominio (`category:wedding`, `vendor:acme-marimba`, etc.).

### Repository / Persistence

* Reutiliza repositorios Prisma existentes por dominio.
* Estrategia `upsert` por `seedKey` mapeado a la clave natural única del modelo (`email`, `slug`, `code`, etc.).
* Asignación explícita de `is_seed=true` en `create` y `update`.
* Datos LATAM provistos por un módulo `SeedDataProvider` interno (no usa Faker random; semilla fija para determinismo, derivada del `seedKey`).

### Validation Rules

* Zod en envs antes de cualquier escritura (VR-01 del US).
* Validación de constraints Data Model delegada a Prisma; ante `PrismaClientKnownRequestError` con código de constraint (`P2002`, `P2003`, `P2025`), rollback del lote y reporte del dominio afectado.

### Error Handling

* `EnvironmentGuardError` → `exit code 2` antes de Prisma.
* `MigrationDriftError` → `exit code 2` antes de `SeedDemoDataUseCase`.
* `DatabaseConnectionError` → `exit code 1`.
* `BatchExecutionError` por dominio → rollback del lote, registro en `SeedReport.domains[d]`, `exit code 1`.
* `UnexpectedError` → log estructurado + `exit code 1`.

### Transactions

* `prisma.$transaction(async (tx) => {...})` por dominio.
* Cada use case interno recibe el `tx` y opera sobre repositorios scoped al `tx`.
* No transacción global cruzando dominios: aceptamos que un dominio dado se complete antes del siguiente para limitar locks y permitir reportes parciales.

### Observability

* Logger estructurado (Pino o equivalente del backend; reutiliza el setup de US-089/PB-P0-003).
* `correlationId` (UUIDv4) generado al inicio; propagado a todos los logs y al `SeedReport`.
* Log por dominio sembrado con `{ domain, created, updated, unchanged, skipped, durationMs }`.
* `SeedReport` final emitido a stdout en formato legible para humanos (markdown table) + JSON línea (NDJSON) para parseo automático en CI.

---

## 8. Frontend Technical Design

No aplica.

---

## 9. API Contract Design

No aplica.

---

## 10. Database / Prisma Design

### Models Impacted

Todos los modelos del Data Model con campo `is_seed` (Doc 6, Doc 18): `User`, `OrganizerProfile`, `VendorProfile`, `VendorService`, `Portfolio`, `Attachment`, `EventType`, `ServiceCategory`, `Event`, `EventTask`, `Budget`, `BudgetItem`, `QuoteRequest`, `Quote`, `BookingIntent`, `Review`, `AIRecommendation`, `Notification`, `Language`, `Currency`, `AdminAction`.

### Fields / Columns

* No introduce campos nuevos.
* Confirma uso de:
  * `is_seed: Boolean` en todas las entidades sembrables.
  * Clave natural única utilizada como `seedKey` (`email` para usuarios, `slug` para categorías y vendors, `code` para `EventType`/`Language`/`Currency`, etc.).

### Relations

Las relaciones se respetan en orden topológico (catálogos primero, luego identidades, luego eventos, luego quotes/bookings, luego reviews y `AIRecommendation`).

### Indexes

* Confirmar índice por `is_seed` en modelos críticos (PB-P0-001 / US-101).
* Confirmar índices `UNIQUE` sobre claves naturales utilizadas como `seedKey`.
* Si algún modelo no tiene índice sobre la clave natural usada, se documenta como dependencia hacia US-101.

### Constraints

* Respeta C-008, C-022, C-026b, C-027b, C-031, C-041, C-043, C-056, C-057, C-058, C-060 (Doc 6/18).
* Currency inmutable post-creación (BR-EVENT-007) — respetar al upsert de `Event`: no actualizar moneda si el registro ya existe.

### Migrations Impact

* Esta US **no** aplica migraciones (US-100 cubre `prisma migrate deploy`).
* Detección de drift inicial mediante `prisma migrate status --json` o equivalente; si reporta `Database schema is not up to date`, abortar con `exit code 2`.

### Seed Impact

* Esta US es exactamente el implementador de seed. La población mínima y la idempotencia están descritas en §3, §7 y §10.

---

## 11. AI / PromptOps Design

### AI Feature

AI-001..AI-008 — todas vía `MockAIProvider` durante el seed.

### Provider

`MockAIProvider` (Doc 17, BR-AI-005/006). `OpenAIProvider` y `AnthropicProvider` (stub) **no** se invocan en el seed.

### Prompt Version

Cada `AIRecommendation` seed persiste `prompt_version` correspondiente al registro vigente en `PromptRegistry` (PB-P0-010). El seed usa la versión activa en el momento de la ejecución.

### Input Schema

Definido por cada feature AI-001..AI-008 (Doc 7). El seed reutiliza el contrato existente; no introduce inputs nuevos.

### Output Schema

Definido por cada feature AI-001..AI-008. Las respuestas del `MockAIProvider` cumplen el JSON schema validado por PB-P0-011.

### Human-in-the-loop

Las recomendaciones sembradas representan estados **post-validación humana**: `accepted=true`, asociadas a la entidad correspondiente. No se sembran recomendaciones rechazadas en esta versión.

### Fallback

No aplica — el seed es offline (FR-DEMO-003) y usa `MockAIProvider` que no falla.

### Persistence

Tabla `AIRecommendation` (Data Model), todas con `is_seed=true` y `prompt_version` declarado.

### Safety Rules

* No decisiones autónomas (NFR-AI-008).
* No moderación IA de reseñas (BR-OOS-007/008).
* Sin RAG (BR-OOS).
* Sin invocaciones a `OpenAIProvider` desde el script.

---

## 12. Security & Authorization Design

### Authentication

No aplica — CLI sin contexto HTTP.

### Authorization

* Gating por env: `SEED_DEMO_ENABLED=true` AND `NODE_ENV !== production`.
* `EnvironmentGuard` aborta antes de inicializar el `PrismaClient` si el gating falla.

### Ownership Rules

No aplica.

### Role Rules

No aplica (sin roles de aplicación). El operador del SO ejecuta el script con las credenciales DB del entorno.

### Negative Authorization Scenarios

* `NODE_ENV=production` → `exit code 2` con mensaje `"Seed disabled for current environment"`.
* `SEED_DEMO_ENABLED` ausente o `false` → `exit code 2` con mensaje `"Seed disabled (SEED_DEMO_ENABLED!=true)"`.
* No aplican respuestas HTTP 401/403.

### Audit Requirements

* `AdminAction` se siembra con `is_seed=true` para acciones simuladas (aprobaciones, moderación de reseñas demo).
* No se registra `AdminAction` por la ejecución del CLI en sí (no es una acción de usuario aplicación).

### Sensitive Data Handling

* Sin PII real (BR-PRIVACY-010, NFR-PRIV-004; Doc 11 §6).
* `DATABASE_URL` proviene exclusivamente del entorno; nunca se imprime en logs (mascarado por logger).
* Sin secretos en repositorio (NFR-SEC-008).

---

## 13. Testing Strategy

### Unit Tests

* `SeedConfigSchema` (Zod): casos válidos e inválidos por variable.
* `EnvironmentGuard`: matriz `NODE_ENV × SEED_DEMO_ENABLED`.
* `SeedKey` builder: determinismo por dominio.
* `SeedReportEmitter`: agregación de conteos y duraciones.

### Integration Tests

* TS-01: Ejecución desde DB limpia → volúmenes BR-SEED-002 alcanzados; `exit code 0`.
* TS-02: Re-ejecución → `created=0`, `updated/unchanged > 0`, conteos invariantes (BR-SEED-001, NFR-DEMO-003).
* TS-03: 100% de filas sembradas con `is_seed=true`.
* TS-04: Catálogos cerrados: 6 `EventType`, 10–15 `ServiceCategory` con jerarquía ≤ 2 niveles, `Language`/`Currency` activos.
* TS-05: `SeedReport` con `correlationId` (UUID), conteos por dominio, `durationMs`.
* TS-06: `AIRecommendation` deterministas para AI-001..AI-008 con `accepted=true`, `is_seed=true`, `prompt_version` declarado.

### API Tests

No aplica.

### E2E Tests

* Habilitador de PB-P2-016: la suite E2E Playwright debe correr sobre el seed sin intervención manual; verificación de habilitación queda como Smoke en CI.

### Security Tests

* NT-01: `SEED_DEMO_ENABLED` ausente/false → no escribe; `exit code 2`.
* NT-02: `NODE_ENV=production` → no escribe; `exit code 2`.
* NT-04: `DATABASE_URL` mascarada en logs (no aparece en stdout/stderr).

### Accessibility Tests

No aplica.

### AI Tests

* AI-T-01: Determinismo byte-a-byte de `AIRecommendation` entre dos ejecuciones consecutivas (hash sobre `output_json`).

### Seed / Demo Tests

* SD-T-01: Tras `npm run seed`, UC-DEMO-001 ejecutable end-to-end (smoke).
* SD-T-02: Verificación cruzada de invariantes demo (≥1 `confirmed_intent`, ≥1 reseña verificada) — delegada a US-088 y validada por contrato compartido.

### CI Checks

* Job `seed-idempotency` en GitHub Actions (ADR-DEVOPS-006):
  * Levantar Postgres efímero (service container o testcontainers).
  * `prisma migrate deploy`.
  * `SEED_DEMO_ENABLED=true LLM_PROVIDER=mock NODE_ENV=test npm run seed` (1ª vez).
  * Aserciones de volúmenes y `is_seed=true`.
  * `npm run seed` (2ª vez) → assert `created=0` en el `SeedReport`.

---

## 14. Observability & Audit

### Logs

* Logger estructurado (Pino) reutilizado del backend.
* Cada log incluye `correlationId`, `domain`, `phase` (`config|migration-check|seed|report`).
* Niveles: `info` (transición de fase), `debug` (por entidad), `error` (falla).

### Correlation ID

* UUIDv4 generado al inicio del script.
* Inyectado a todos los logs y al `SeedReport`.

### AdminAction

* No se registra `AdminAction` por la ejecución del CLI.
* Sí se sembran `AdminAction` históricas con `is_seed=true` para representar acciones admin pasadas (aprobaciones, moderación) — vía `SeedAdminActionsUseCase`.

### Error Tracking

* Salidas con `exit code 1|2` y mensaje accionable en stderr.
* Stack traces sólo en `debug`; en `info` se imprime el mensaje resumido.

### Metrics

* `durationMs` por dominio y total.
* Conteos por dominio: `created`, `updated`, `unchanged`, `skipped`.
* Si el backend tiene métricas Prometheus expuestas, el script NO las publica (no hay long-running process).

---

## 15. Seed / Demo Data Impact

### Seed Data Required

* Catálogos cerrados: `EventType` (6), `ServiceCategory` (10–15), `Language` (4), `Currency` (5).
* Identidades: 1 admin (Product Owner), 5–10 organizadores, 10–20 vendors aprobados (estados `active`, `suspended` según FR-SEED-002/BR-VENDOR-003).
* Eventos: 10–15 (mix de estados queda delegado al setup específico de US-087).
* Quotes: 15–25 `QuoteRequest`, 10–20 `Quote`.
* Bookings/Reviews: ≥1 `BookingIntent.confirmed_intent` (asegurado en US-088), 20–40 `Review`.
* `AIRecommendation` deterministas para AI-001..AI-008.
* `Notification` in-app representativas (15–30, Doc 11 §6).
* `AdminAction` representativos.

### Demo Scenario Supported

* UC-DEMO-001 (demo guiada de 10–15 min): el seed entrega la base de datos para los 5 flujos (organizador, proveedor, admin, IA, cotización).
* Determinismo y reproducibilidad para evaluación académica (Doc 3 §14.4).

### Reset / Isolation Notes

* El reset destructivo no se ejecuta desde este CLI.
* US-086 expone `POST /api/v1/admin/seed/reset` gated por rol admin + flag.
* En ambientes locales/CI, el reset se logra recreando la base + `prisma migrate deploy` + `npm run seed`.
* El flag `is_seed=true` permite consultar/separar lógicamente los datos seed de los datos operativos creados durante la demo.

---

## 16. Documentation Alignment Required

| Document / Source                                                       | Conflict                                                                                                                          | Current Decision                                                              | Recommended Action                                                                              | Blocks Implementation? |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------- |
| `management/artifacts/4-Product-Backlog-Prioritized.md` (PB-P0-014 Traceability) | Lista `BR-SEED-001..010`; sin embargo Doc 4 sólo define `BR-SEED-001..009`.                                                       | Trazabilidad vigente usa BR-SEED-001..009 (verificado en Doc 4).               | Actualizar `Traceability` de PB-P0-014 a `BR-SEED-001..009`.                                     | No                     |
| `docs/14-Backend-Technical-Design.md` §10.16                            | Menciona `SeedDemoController` y `ResetDemoUseCase` como parte del bounded context `seed-demo`.                                     | US-085 cubre sólo el CLI; el controller pertenece a US-086.                   | Mantener la división; documentar el split en el README de operación.                              | No                     |

---

## 17. Technical Risks & Mitigations

| Risk                                                                                                                | Impact | Mitigation                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Idempotencia inestable por claves no únicas (`seedKey` ambiguo).                                                     | Alto   | Definir `seedKey` por dominio sobre constraints `UNIQUE` reales; cubrir con TS-02 en CI.                                                                |
| `MockAIProvider` no determinista (drift de versión).                                                                | Alto   | Versionar `prompt_version` en `AIRecommendation`; AI-T-01 valida hash sobre `output_json`.                                                              |
| Drift de migraciones entre dev/CI/demo.                                                                              | Medio  | `prisma migrate status` al inicio del script; abortar con `exit code 2`.                                                                                |
| Ejecución accidental en producción.                                                                                  | Alto   | `EnvironmentGuard` aborta si `NODE_ENV=production` o `SEED_DEMO_ENABLED!=true`.                                                                          |
| Locks de larga duración por una transacción global.                                                                  | Medio  | Transacciones por dominio (`prisma.$transaction`), no transacción única.                                                                                |
| Inserción parcial deja la base en estado inconsistente.                                                              | Medio  | Rollback automático del dominio fallido; resto de dominios mantienen consistencia; `SeedReport` documenta el fallo.                                      |
| Tiempo de seed excede el límite aceptable para CI.                                                                   | Bajo   | Tamaños mínimos BR-SEED-002 (no maximizar); paralelización dentro de un dominio cuando no hay dependencias.                                              |
| Acoplamiento entre US-085 y US-087/US-088 si los datasets se inyectan sin contrato.                                  | Medio  | Definir hooks/providers públicos en `SeedDemoDataUseCase` para que US-087/088 extiendan datasets sin reescribir el use case.                            |
| Conflicto con `BR-SEED-010` referenciado en backlog inexistente.                                                     | Bajo   | Documentation Alignment (§16); no bloquea.                                                                                                              |

---

## 18. Implementation Guidance for Coding Agents

* **Archivos/carpetas impactados (tentativo, según Doc 14 §10.16 y estructura del módulo `seed-demo`)**:
  * `apps/api/src/scripts/seed.ts` (entry point CLI).
  * `apps/api/src/modules/seed-demo/application/SeedDemoDataUseCase.ts`.
  * `apps/api/src/modules/seed-demo/application/use-cases/Seed*.ts` (uno por dominio listado en §7).
  * `apps/api/src/modules/seed-demo/domain/SeedKey.ts`.
  * `apps/api/src/modules/seed-demo/domain/SeedReport.ts`.
  * `apps/api/src/modules/seed-demo/infrastructure/SeedConfigSchema.ts` (Zod).
  * `apps/api/src/modules/seed-demo/infrastructure/EnvironmentGuard.ts`.
  * `apps/api/src/modules/seed-demo/infrastructure/MigrationStatusChecker.ts`.
  * `apps/api/src/modules/seed-demo/infrastructure/data/*.ts` (datasets LATAM por dominio).
  * `apps/api/src/modules/seed-demo/infrastructure/SeedReportEmitter.ts`.
  * `apps/api/package.json` (script `"seed"`).
  * `apps/api/tests/integration/seed/*.test.ts`.
  * `.github/workflows/seed-idempotency.yml` (CI job; o bien integrado al pipeline existente de PB-P0-017).

* **Orden recomendado de implementación**:
  1. `SeedConfigSchema` + `EnvironmentGuard` + entry point CLI mínimo.
  2. `MigrationStatusChecker` + manejo de `exit code 2`.
  3. `SeedKey` + `SeedReport` + `SeedReportEmitter` (stdout legible + NDJSON).
  4. `SeedCatalogsUseCase` (`EventType`, `ServiceCategory`, `Language`, `Currency`).
  5. `SeedIdentitiesUseCase`.
  6. `SeedVendorAssetsUseCase`.
  7. `SeedEventsUseCase` (base, sin mix específico — hook documentado para US-087).
  8. `SeedQuotesUseCase`.
  9. `SeedBookingsAndReviewsUseCase` (base — hook documentado para US-088).
  10. `SeedAIRecommendationsUseCase` (con `MockAIProvider` y `prompt_version`).
  11. `SeedNotificationsUseCase`, `SeedAdminActionsUseCase`.
  12. Integration tests TS-01..TS-06 + negativos NT-01..NT-05.
  13. Job CI `seed-idempotency`.
  14. README de operación.

* **Decisiones que NO deben reabrirse**:
  * El runner es CLI puro (no HTTP).
  * Gating por `SEED_DEMO_ENABLED=true` y `NODE_ENV !== production`.
  * `MockAIProvider` como única fuente de IA durante el seed.
  * `is_seed=true` en todas las entidades sembradas.
  * Volúmenes BR-SEED-002 como mínimos (no máximos rígidos; respetar rangos).
  * Idempotencia vía `upsert` por `seedKey` con clave natural única.

* **Lo que NO debe implementarse en esta US**:
  * `SeedDemoController` HTTP — pertenece a US-086.
  * `ResetDemoUseCase` destructivo — pertenece a US-086.
  * Distribución específica de event mix (3/5/3) — pertenece a US-087.
  * Garantía dura de `≥1 confirmed_intent` + reseña vinculada — pertenece a US-088 (esta US sí provee los datasets base mínimos para que US-088 los extienda).
  * `prisma migrate deploy` — pertenece a US-100.

* **Supuestos a preservar**:
  * El backend (`apps/api`) ya tiene PrismaClient configurado y migraciones aplicadas externamente (US-100).
  * El logger estructurado del backend está disponible vía import (US-089 / PB-P0-003).
  * El `MockAIProvider` y el `PromptRegistry` están operativos (PB-P0-009/010/011).

---

## 19. Task Generation Notes

* **Suggested task groups**:
  * **Config & Bootstrap**: `SeedConfigSchema`, `EnvironmentGuard`, entry point CLI, script `package.json`.
  * **Drift & Safety**: `MigrationStatusChecker`, manejo de exit codes.
  * **Observability**: `SeedReport`, `SeedReportEmitter`, logging con `correlationId`.
  * **Domain Seed Providers**: catalogos, identidades, vendors, eventos, quotes, bookings, reviews, AI recommendations, notifications, admin actions.
  * **Persistence Strategy**: `SeedKey`, `upsert` providers reutilizables por dominio.
  * **Hooks for sibling US**: contratos públicos para US-087 y US-088.
  * **QA**: tests unitarios, integración, AI determinismo, smoke seed/demo.
  * **CI**: job `seed-idempotency`.
  * **Docs**: README de operación + actualización de `Traceability` PB-P0-014 (Documentation Alignment).

* **Required QA tasks**:
  * Integration suite TS-01..TS-06.
  * Negative suite NT-01..NT-05.
  * AI determinism AI-T-01.
  * Seed/demo smoke SD-T-01/SD-T-02 (este último coordinado con US-088).

* **Required security tasks**:
  * `EnvironmentGuard` con tests de matriz `NODE_ENV × SEED_DEMO_ENABLED`.
  * Verificación de mascarado de `DATABASE_URL` en logs.

* **Required seed/demo tasks**:
  * Verificación automatizada de invariantes BR-SEED-001..009 sobre la BD post-seed.

* **Required documentation tasks**:
  * README `docs/operations/seed.md` (o equivalente) con comando, variables y prerequisitos.
  * Nota en `Traceability` de PB-P0-014 actualizando `BR-SEED-001..010` → `BR-SEED-001..009`.

* **Dependencies between tasks**:
  * `EnvironmentGuard` antes que cualquier inicialización Prisma.
  * `MigrationStatusChecker` antes que ejecución de use cases.
  * `SeedKey` antes que los `Seed*UseCase`.
  * `SeedAIRecommendationsUseCase` después que `SeedEventsUseCase`/`SeedVendorAssetsUseCase` (foreign keys).
  * Job CI después que las tareas de implementación y los integration tests.

* **Consolidated `tasks.md`**: PB-P0-014 agrupa US-085/086/087/088. Cuando US-086/087/088 estén listas para task generation, se recomienda mantener un `tasks.md` consolidado por backlog item bajo `management/development-tasks/P0/PB-P0-014/`.

---

## 20. Technical Spec Readiness

| Check                                                | Status |
| ---------------------------------------------------- | ------ |
| User Story approved or explicitly allowed for draft spec | Pass   |
| Product Backlog mapping found                        | Pass   |
| Decision Resolution reviewed if present              | N/A    |
| Scope clear                                          | Pass   |
| Architecture alignment clear                         | Pass   |
| API impact clear                                     | N/A    |
| DB impact clear                                      | Pass   |
| AI impact clear                                      | Pass   |
| Security impact clear                                | Pass   |
| Testing strategy clear                               | Pass   |
| Ready for Development Task Breakdown                 | Yes    |

---

## 21. Final Recommendation

**Ready for Task Breakdown.**

La Technical Specification cubre la totalidad del User Story aprobado, está alineada con la arquitectura del backend (Doc 14), la estrategia seed (Doc 11), las invariantes BR-SEED-001..009, los NFR-DEMO-001..006 y el orden de ejecución del backlog (PB-P0-014). Los riesgos están mitigados con tests y guardrails operativos; las dependencias hacia US-099/100, PB-P0-009/010/011 y la separación de responsabilidades respecto a US-086/087/088 están explícitamente documentadas. El siguiente paso es ejecutar `eventflow-user-story-to-development-tasks` con esta Technical Specification como insumo.
