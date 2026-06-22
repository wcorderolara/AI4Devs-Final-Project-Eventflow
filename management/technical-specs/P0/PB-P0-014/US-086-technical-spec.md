# Technical Specification — US-086: Admin reset surgical del entorno Demo vía endpoint HTTP

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-086 |
| Source User Story | `management/user-stories/US-086-admin-reset-demo.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-086-decision-resolution.md` (no existe; no requerido) |
| Priority | P0 |
| Backlog ID | PB-P0-014 |
| Backlog Title | Seed Script Idempotente + Datos Demo |
| Backlog Execution Order | P0 #14 (foundation MVP) |
| User Story Position in Backlog Item | 2 de 4 (US-085 → **US-086** → US-087 → US-088) |
| Related User Stories in Backlog Item | US-085, US-086, US-087, US-088 |
| Epic | EPIC-SEED-001 — Seed Data & Demo Scenarios |
| Backlog Item Dependencies | PB-P0-001 (schema + migraciones), PB-P0-002 (backend bootstrap) |
| Feature | Reset surgical Demo (endpoint admin) |
| Module / Domain | `seed-demo` (Backend, transversal de escritura controlada) |
| User Story Status | Approved (2026-06-22) |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-22 |
| Last Updated | 2026-06-22 |

---

## 2. Backlog Execution Context

### Product Backlog Item

PB-P0-014 (Seed Script Idempotente + Datos Demo) entrega la base operativa de la demo académica y de la suite QA E2E del MVP de EventFlow. Está compuesto por cuatro User Stories que colaboran para producir un entorno demo reproducible:

| User Story | Rol | Entregable |
|---|---|---|
| US-085 | CLI runner | `npm run seed` ejecutando `SeedDemoDataUseCase` |
| **US-086** | HTTP runner | `POST /api/v1/admin/seed/reset` ejecutando `ResetDemoUseCase` |
| US-087 | Contenido | Mix de eventos en `draft`/`active`/`completed` |
| US-088 | Contenido | Al menos un `BookingIntent.confirmed_intent` + reseña verificada |

Dependencias del backlog item: PB-P0-001 (schema Prisma + `is_seed`), PB-P0-002 (backend modular monolith bootstrap con middlewares de auth y rol admin).

### Execution Order Rationale

US-086 se ejecuta inmediatamente después de US-085 dentro de PB-P0-014. US-085 entrega `SeedDemoDataUseCase` y la capacidad de siembra reusada por US-086 para el repoblado tras la limpieza surgical. US-087 y US-088 dependen del seed ya operativo (CLI + endpoint) para garantizar el contenido específico exigido por la demo (mix de eventos y `confirmed_intent`).

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-085 | CLI runner `npm run seed` (`SeedDemoDataUseCase`) | 1 |
| **US-086** | HTTP endpoint admin reset (`ResetDemoUseCase`) | 2 |
| US-087 | Event mix `draft/active/completed` | 3 |
| US-088 | `BookingIntent.confirmed_intent` + reseña verificada | 4 |

---

## 3. Executive Technical Summary

Implementar el endpoint `POST /api/v1/admin/seed/reset` que materializa el reset surgical del entorno Demo descrito en Doc 11 §29 y Doc 14 §10.16 / §11 #46. El endpoint vive en `SeedDemoController` (Doc 16 §39.2) y delega en un nuevo `ResetDemoUseCase` del módulo `seed-demo` (modular monolith).

El use case ejecuta una secuencia transaccional por lotes que: (1) verifica el gating operativo (`SEED_DEMO_ENABLED=true` + rol `admin`), (2) adquiere un lock optimista a nivel de aplicación, (3) elimina exclusivamente filas con `is_seed=true` mediante `prisma.$transaction` chunked respetando el orden de dependencias FK, (4) invoca `SeedDemoDataUseCase` (provisto por US-085) para repoblar de forma idempotente, (5) persiste el evento en `AdminAction` (BR-ADMIN-004/011, NFR-OBS-001) y (6) libera el lock. El controlador registra dinámicamente la ruta solo cuando `SEED_DEMO_ENABLED=true`; ante flag apagado el servidor responde `404 Not Found` para evitar fingerprinting (Doc 19 §THR-012).

La respuesta `202 Accepted` retorna un `ResetReport` con `entitiesDeleted`, `entitiesReseeded`, `seedVersion`, `correlationId` y `durationMs`. El endpoint propaga `X-Correlation-Id` en logs estructurados y en `AdminAction`. La idempotencia se garantiza por el flujo limpieza-surgical + repoblado vía upserts con claves naturales del runner US-085.

No introduce UI; el panel admin pertenece a PB-P3-001 / US-140. No introduce snapshots, backups, ni resets parciales por entidad. No modifica filas con `is_seed=false`.

---

## 4. Scope Boundary

### In Scope

* `ResetDemoUseCase` (nuevo) en el módulo `seed-demo` (Doc 14 §11 #46).
* Endpoint `POST /api/v1/admin/seed/reset` en `SeedDemoController` (Doc 16 §39.2).
* Middleware `requireFlag('SEED_DEMO_ENABLED')` y registro condicional de la ruta.
* Lock optimista a nivel de aplicación (semáforo in-memory por proceso o lock en DB) para concurrencia.
* Eliminación por lotes filtrada por `is_seed=true` respetando dependencias FK.
* Repoblado idempotente delegando en `SeedDemoDataUseCase` (US-085).
* DTO `ResetReport` con conteos por entidad, `seedVersion`, `correlationId`, `durationMs`.
* Persistencia obligatoria en `AdminAction` con `action='SEED_RESET'` o `action='SEED_RESET_FAILED'`.
* Logs estructurados `seed.reset.{started,completed,failed}`.
* Respuesta `404` cuando `SEED_DEMO_ENABLED=false` (Doc 19 §THR-012, PB-P3-001).
* Tests de integración y autorización cubriendo todos los AC y EC.

### Out of Scope

* UI admin (botón panel) → PB-P3-001 / US-140.
* Limpieza o modificación de filas con `is_seed=false`.
* Resets parciales por entidad o por dominio.
* Snapshots / backups previos al reset.
* Ejecución en `prod` (deshabilitado por defecto).
* Aplicación o reversión de migraciones Prisma (US-100 las gestiona).
* Catálogo OpenAPI generado automáticamente (tarea separada del backlog).

### Explicit Non-Goals

* No reemplaza el runner CLI `npm run seed` (US-085); ambos coexisten.
* No introduce job de fondo asíncrono ni cola; el reset es síncrono dentro del timeout estándar de la API.
* No invoca IA directamente. Las `AIRecommendation` se siembran de nuevo por `SeedDemoDataUseCase` durante el repoblado, no por este endpoint.
* No expone progreso parcial; basta con la respuesta sincrónica `202` o el log estructurado.

---

## 5. Architecture Alignment

### Backend Architecture

* Stack: Node.js, Express.js, TypeScript, Prisma, PostgreSQL.
* Modular Monolith con Clean/Hexagonal Architecture (Doc 14 §3).
* Módulo `seed-demo` (Doc 14 §10.16) hosting `ResetDemoUseCase`, `SeedDemoController` y `SeedResetJob`.
* Layering estándar: Controller (thin) → Application Use Case → Repositorios Prisma (varios).
* Validación Zod `strict()` sobre request body opcional.
* Errores tipados (`UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `InternalError`) con mapper a códigos HTTP.

### Frontend Architecture

No aplica — esta historia no entrega UI. La integración con la futura UI admin se documentará en US-140 (PB-P3-001) reusando el contrato definido aquí.

### Database Architecture

* PostgreSQL via Prisma.
* Reuso del campo `is_seed: boolean` en todas las entidades sembradas (US-099 / US-100).
* Recomendado: índice parcial `WHERE is_seed = true` por entidad de mayor cardinalidad (US-101) para acelerar deletes; documentation alignment opcional con Doc 18.
* `AdminAction` existente (Doc 14 §13) con índices `(admin_id, created_at)` y `(target_type, target_id)`.

### API Architecture

* REST JSON API bajo `/api/v1` (Doc 16 §3.1).
* Path: `/api/v1/admin/seed/reset` (Doc 16 §39.2 documenta `/admin/seed/reset` por concisión; el prefijo efectivo es `/api/v1`).
* Auth: JWT vía HTTP-only cookie + claim `role` (Doc 19 §6, Doc 16 §3.4).
* Versionado: v1.
* Response: `application/json`.
* Códigos: `202 / 400 / 401 / 403 / 404 / 409 / 422 / 500`.

### AI / PromptOps Architecture

No aplica — el endpoint no invoca IA. Las `AIRecommendation` sembradas durante el repoblado son responsabilidad de `SeedDemoDataUseCase` (US-085), que usa `MockAIProvider` determinista (BR-AI-005/006, NFR-AI-008).

### Security Architecture

* Backend como única source of truth para autorización (Doc 19 §3 #5).
* Doble gate: `requireAuth()` + `requireRole('admin')` + `requireFlag('SEED_DEMO_ENABLED')`.
* Registro condicional de la ruta: si el flag está apagado, el route handler NO se monta en el router; Express devuelve `404` naturalmente.
* No hay tokens en repositorio ni en logs (NFR-SEC-008).
* `AdminAction` obligatorio por invocación (BR-ADMIN-004/011, NFR-OBS-001) — mitigación de THR-012 (Doc 19).

### Testing Architecture

* Vitest para unit (use case en aislamiento con repos mock).
* Supertest para integration sobre Express + Prisma (DB de test efímera).
* Playwright opcional para humo E2E desde el harness QA (PB-P2-016).
* MSW no aplica (sin frontend en esta historia).
* Cobertura mínima de los AC, EC, NT, SEC y AUTH-TS definidos en US-086.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 — Reset surgical exitoso retorna `202` + `ResetReport` | `ResetDemoUseCase` ejecuta deletes filtrados por `is_seed=true`, llama `SeedDemoDataUseCase` para repoblar y produce un `ResetReport` agregado. Controller mapea a `202 Accepted`. | Controller, Application, Repository, Audit |
| AC-02 — Idempotencia ante ejecuciones consecutivas | El flujo limpieza+repoblado siempre converge al mismo estado. Verificado en integration por doble invocación + comparación de conteos por entidad. | Application, Repository, QA |
| AC-03 — `AdminAction` registrado con `action='SEED_RESET'` y mismo `correlationId` | El use case inserta una fila en `AdminAction` dentro de la misma operación; el `correlationId` se inyecta desde el request o se genera vía middleware. | Application, Repository, Observability |
| AC-04 — `GET /api/v1/admin/seed/status` refleja `lastRunAt` y `recordCount` | Tras el reset, `SeedStatusResponseDto` se computa con `prisma.{entity}.count({ where: { is_seed: true }})` y `lastRunAt` se persiste o se deriva del último `AdminAction` con `action='SEED_RESET'`. | Application, Repository |
| EC-01 — Flag apagado → `404` | Si `SEED_DEMO_ENABLED !== 'true'` al boot, el router no monta la ruta. `404` natural. | Bootstrap, Router |
| EC-02 — Falla parcial → `500` con rollback de lote y `AdminAction` `SEED_RESET_FAILED` | `prisma.$transaction` chunked aborta el lote en error; el use case captura, registra `AdminAction` con `action='SEED_RESET_FAILED'` y propaga `InternalError`. | Application, Repository, Audit |
| EC-03 — Concurrencia → `409 seed_reset_in_progress` | Semáforo (`Map`/`Mutex`) global por proceso o lock en tabla `seed_demo_lock`; primer caller lo adquiere, segundo recibe `409`. | Application |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

* Módulo principal: `seed-demo` (Doc 14 §10.16).
  * Use cases: `SeedDemoDataUseCase` (existente — US-085), **`ResetDemoUseCase`** (nuevo — esta historia).
  * Controller: `SeedDemoController` (extender con `POST /reset`).
  * Job interno reusable: `SeedResetJob` (Doc 14 §10.16) opcional para invocación interna desde scripts.
* Módulo dependiente: `admin-governance` (para `AdminActionRepository`).

### Use Cases / Application Services

`ResetDemoUseCase` (nuevo)

* Input: `ResetDemoCommand { actorAdminId: string, correlationId: string, reason?: string }`.
* Output: `ResetReport`.
* Pre-validación: `SEED_DEMO_ENABLED=true` (assert; si llega request al handler, el flag ya está validado por middleware).
* Pasos:
  1. Adquirir lock `seed-reset` (semáforo in-memory por proceso o lock optimista en DB).
  2. Construir mapa de entidades a limpiar respetando orden FK descendente.
  3. Por cada entidad ejecutar `prisma.$transaction` con `deleteMany({ where: { is_seed: true } })` por lote configurable (`SEED_BATCH_SIZE`, default p.ej. `1000`).
  4. Invocar `SeedDemoDataUseCase.execute({ correlationId, reason: 'reset' })` para repoblar.
  5. Construir `ResetReport` con conteos `Record<string, number>` y `durationMs`.
  6. Insertar `AdminAction { admin_id, action: 'SEED_RESET', target_type: 'seed-demo', target_id: null, reason, correlationId, created_at }`.
  7. Liberar lock.
* En error:
  1. Insertar `AdminAction` con `action: 'SEED_RESET_FAILED'`, `reason` derivado del error.
  2. Liberar lock.
  3. Propagar `InternalError` envolviendo el error original sin filtrar stack a la respuesta.

### Controllers / Routes

`SeedDemoController` (extender)

* Bootstrap del módulo (`SeedDemoModule.register(router)`):
  * Si `process.env.SEED_DEMO_ENABLED !== 'true'`: NO registrar ninguna ruta de `/admin/seed/*` (Express devolverá `404` naturalmente).
  * Si activo:
    * `POST /admin/seed/run` (existente — US-085 vía controller HTTP equivalente).
    * **`POST /admin/seed/reset`** (nueva en esta historia).
    * `GET /admin/seed/status` (puede ya existir; actualizar para reflejar `lastRunAt` post-reset).
* Middlewares por ruta `POST /admin/seed/reset`:
  1. `correlationIdMiddleware` (genera o propaga `X-Correlation-Id`).
  2. `requireAuth()` (JWT).
  3. `requireRole('admin')`.
  4. `validateBody(ResetRequestSchema)` (Zod opcional + strict).
  5. Handler que invoca `ResetDemoUseCase`.

### DTOs / Schemas

```ts
// Request — body opcional
const ResetRequestSchema = z
  .object({
    reason: z.string().min(1).max(500).optional(),
  })
  .strict();

// Response — 202 Accepted
type ResetReportDto = {
  entitiesDeleted: Record<string, number>;
  entitiesReseeded: Record<string, number>;
  seedVersion: string;
  correlationId: string;
  durationMs: number;
};

// Status — 200 OK (alineado con Doc 16 §39.3)
type SeedStatusResponseDto = {
  lastRunAt: string | null;
  preset: 'minimal' | 'full' | null;
  recordCount: Record<string, number>;
};
```

### Repository / Persistence

* `AdminActionRepository.save(adminAction)` (existente, Doc 14 §13).
* Acceso directo a `prisma.{entity}.deleteMany({ where: { is_seed: true }})` por entidad ordenada por dependencia FK.
* Reuso de los repositorios de siembra invocados por `SeedDemoDataUseCase` (US-085).

### Validation Rules

| Validación | Trigger | Resultado |
|---|---|---|
| Flag `SEED_DEMO_ENABLED=true` al boot | Inicialización del módulo | Sin flag → ruta no registrada → `404` runtime |
| JWT válido | Middleware `requireAuth` | Sin token / inválido → `401` |
| Rol `admin` | Middleware `requireRole('admin')` | Otro rol → `403` |
| Body Zod `strict()` | `validateBody(ResetRequestSchema)` | Campo desconocido / tipo erróneo → `400` |
| `seed-reset` lock libre | Inicio del use case | Lock ocupado → `409 seed_reset_in_progress` |

### Error Handling

| Error | HTTP | Mensaje |
|---|---|---|
| `UnauthorizedError` | 401 | `{ code: 'unauthorized' }` |
| `ForbiddenError` | 403 | `{ code: 'forbidden' }` |
| Ruta no registrada (flag off) | 404 | Estándar Express |
| `BadRequestError` (Zod) | 400 | `{ code: 'bad_request', details: [...] }` |
| `ConflictError('seed_reset_in_progress')` | 409 | `{ code: 'seed_reset_in_progress', correlationId }` |
| Falla en `$transaction` | 500 | `{ code: 'seed_reset_failed', correlationId }` + log estructurado completo |

### Transactions

* `prisma.$transaction([...])` chunked por lote (`SEED_BATCH_SIZE`, default `1000`).
* Orden de deletes alineado con el grafo FK del Data Model: descendientes primero (`Notification`, `AIRecommendation`, `Review`, `BookingIntent`, `Quote`, `QuoteRequest`, `EventTask`, `BudgetItem`, `Budget`, `Event`, `VendorService`, `VendorProfile`, `OrganizerProfile`, `User`, `EventType`, `ServiceCategory`, `Language`, `Currency`).
* Idempotencia del repoblado garantizada por `SeedDemoDataUseCase` (US-085) con upserts por clave natural.

### Observability

* Log `seed.reset.started` con `correlationId`, `actorAdminId`.
* Log `seed.reset.completed` con `correlationId`, `entitiesDeleted`, `entitiesReseeded`, `durationMs`.
* Log `seed.reset.failed` con `correlationId`, `error.code`, `error.message`, stack en `level=error`.
* Métricas opcionales: `seed_reset_total`, `seed_reset_duration_ms` (no aplicar APM enterprise — NFR-OBS-006).

---

## 8. Frontend Technical Design

No aplica — esta historia entrega únicamente el endpoint HTTP. La UI admin para disparar el reset pertenece a PB-P3-001 / US-140 y reusará el contrato `ResetReportDto` definido aquí.

---

## 9. API Contract Design

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| POST | `/api/v1/admin/seed/reset` | Reset surgical + repoblado idempotente | Sí (admin) | `ResetRequestSchema` (body opcional con `reason`) | `202 Accepted` con `ResetReportDto` | `400` (Zod), `401` (sin token), `403` (rol no admin), `404` (flag off), `409` (`seed_reset_in_progress`), `500` (falla parcial) |
| GET | `/api/v1/admin/seed/status` | Estado del seed tras el reset | Sí (admin) | — | `200 OK` con `SeedStatusResponseDto` | `401`, `403`, `404` (flag off) |

Headers comunes:
* Request: `Authorization: Bearer <token>` (o cookie HTTP-only), `X-Correlation-Id` opcional.
* Response: `Content-Type: application/json`, `X-Correlation-Id` siempre presente.

---

## 10. Database / Prisma Design

### Models Impacted

* Reads/Deletes filtrados por `is_seed=true`: `User`, `OrganizerProfile`, `VendorProfile`, `VendorService`, `EventType`, `ServiceCategory`, `Event`, `EventTask`, `Budget`, `BudgetItem`, `QuoteRequest`, `Quote`, `BookingIntent`, `Review`, `AIRecommendation`, `Notification`, `Language`, `Currency`.
* Writes: `AdminAction` (siempre), más todas las entidades anteriores durante el repoblado.

### Fields / Columns

* `is_seed: boolean` debe existir y estar indexable en todas las entidades sembrables (US-099 / US-100).
* `AdminAction.action` debe aceptar los valores `'SEED_RESET'` y `'SEED_RESET_FAILED'`. Si la columna es enum, US-100 debe garantizar la inclusión.

### Relations

Sin cambios. El reset respeta FKs eliminando primero los descendientes y luego los ancestros.

### Indexes

* Recomendado: índice parcial por `is_seed = true` sobre entidades de alta cardinalidad (`Event`, `Quote`, `Review`, `BookingIntent`, `AIRecommendation`, `Notification`) — coordinar con US-101.
* `AdminAction`: índices existentes `(admin_id, created_at)` y `(target_type, target_id)` cubren las consultas de auditoría.

### Constraints

* `WHERE is_seed = true` obligatorio en todos los `deleteMany` del use case.
* `AdminAction.action` debe ser válido para `'SEED_RESET'` / `'SEED_RESET_FAILED'`.

### Migrations Impact

* Si `AdminAction.action` es un enum tipado en Prisma, requiere migración para incluir los nuevos valores. Coordinar con US-100 (PB-P0-001) — si el enum ya acepta string libre, no requiere migración.
* Si los índices parciales sobre `is_seed` no existen aún, levantar tarea de optimización (no bloqueante para US-086) y coordinar con US-101.

### Seed Impact

US-086 no modifica el seed; lo invoca. Cualquier cambio de invariante en BR-SEED-002 (volúmenes) debe reflejarse simultáneamente en US-085 (runner) para mantener idempotencia.

---

## 11. AI / PromptOps Design

No aplica — el endpoint no invoca IA. Las `AIRecommendation` sembradas durante el repoblado son producidas por `SeedDemoDataUseCase` (US-085) usando `MockAIProvider` determinista (BR-AI-005/006, NFR-AI-008). El reset no genera nuevas recomendaciones.

---

## 12. Security & Authorization Design

### Authentication

* JWT vía HTTP-only cookie o header `Authorization: Bearer <token>` (Doc 19 §6, Doc 16 §3.4).
* Middleware `requireAuth()` valida firma, expiración y claims.

### Authorization

* Doble gate: `requireRole('admin')` + flag operativo `SEED_DEMO_ENABLED=true`.
* El flag se evalúa al boot del módulo y al registrar el route handler. Si está apagado, la ruta NO existe (Express devuelve `404` automáticamente).
* En runtime el handler asume que ambos gates pasaron; si por alguna razón el flag cambió en runtime (no soportado en MVP), el use case verifica nuevamente y devuelve `503` (defensa en profundidad opcional, no obligatoria).

### Ownership Rules

No aplica — la acción es global (no por entidad).

### Role Rules

| Rol | Acceso |
|---|---|
| `anonymous` | `401` |
| `organizer` | `403` |
| `vendor` | `403` |
| `admin` | Permitido si `SEED_DEMO_ENABLED=true` |

### Negative Authorization Scenarios

* Cliente anónimo → `401 unauthorized`.
* Organizer/vendor autenticado → `403 forbidden`.
* Admin autenticado con `SEED_DEMO_ENABLED=false` → `404 not found` (ruta no registrada).
* Token expirado → `401 unauthorized`.
* Replay de request mientras hay un reset en curso → `409 seed_reset_in_progress`.

### Audit Requirements

* Obligatorio: fila en `AdminAction` por cada invocación (éxito → `SEED_RESET`; fallo → `SEED_RESET_FAILED`).
* Campos: `admin_id`, `action`, `target_type='seed-demo'`, `target_id=null`, `reason` (opcional), `correlation_id`, `created_at`.
* Logs estructurados con `correlationId` propagado al cliente vía header `X-Correlation-Id`.

### Sensitive Data Handling

* `ResetReport`, `AdminAction` y logs solo contienen metadatos agregados (conteos, IDs estables, timestamps). Sin PII de los datos seed.
* No exponer trazas internas, queries SQL ni stack traces en la respuesta HTTP.
* Sin secretos ni tokens en logs (NFR-SEC-008).

---

## 13. Testing Strategy

### Unit Tests (Vitest)

* `ResetDemoUseCase`:
  * Deletes invocados en orden FK descendente.
  * Filtro `WHERE is_seed = true` siempre presente en todas las llamadas a repos.
  * Lock se adquiere y libera correctamente en happy y error paths.
  * `AdminAction` insertado con `action` correcto según resultado.
  * `correlationId` se propaga al `AdminAction` y al `ResetReport`.

### Integration Tests (Vitest + Supertest)

* TS-01 — Happy path: admin autenticado, flag activo, datos mixtos (`is_seed=true` + `is_seed=false`) → `202`, `ResetReport` consistente, filas `is_seed=false` intactas.
* TS-02 — Idempotencia: doble invocación → conteos iguales por entidad.
* TS-03 — `AdminAction` registrado con `action='SEED_RESET'`, mismo `correlationId`.
* TS-04 — `GET /admin/seed/status` post-reset refleja `lastRunAt` y `recordCount`.
* TS-05 — Filas `is_seed=false` preservadas (SEC-04).

### API Tests (Supertest)

* NT-01 — Sin token → `401`.
* NT-02 — Token con rol `organizer`/`vendor` → `403`.
* NT-03 — `SEED_DEMO_ENABLED=false` → `404` (validar en spec de arranque del módulo).
* NT-04 — Body con campo desconocido → `400`.
* NT-05 — Falla parcial inyectada (mock repo lanza en lote intermedio) → `500`, `AdminAction` `SEED_RESET_FAILED`, conteo parcial logueado.
* NT-06 — Segunda invocación concurrente → `409 seed_reset_in_progress`.

### E2E Tests (Playwright)

Opcional para esta historia; el harness QA E2E (PB-P2-016) reusará el endpoint para reinicializar el estado entre escenarios. Verificación humo: invocar el endpoint y comprobar `202`.

### Security Tests

* AUTH-TS-01..04 según US-086.
* Verificar que el `404` ante flag apagado no incluye encabezados que revelen la existencia del endpoint.

### Accessibility Tests

No aplica — sin UI.

### AI Tests

No aplica directamente.

### Seed / Demo Tests

* SD-T-01 — Conteos finales por entidad cumplen BR-SEED-002 / NFR-DEMO-001.
* SD-T-02 — Filas `is_seed=false` simuladas durante la demo permanecen tras el reset.

### CI Checks

* `npm test` (Vitest unit + integration).
* `npm run test:api` (Supertest) en el job de PR (PB-P0-015).
* Linter + type-check obligatorios.
* Sin cambios de migración Prisma a menos que se confirme el cambio de enum en US-100.

---

## 14. Observability & Audit

### Logs

* Nivel `info`: `seed.reset.started`, `seed.reset.completed`.
* Nivel `warn`: `seed.reset.conflict` (intento concurrente rechazado).
* Nivel `error`: `seed.reset.failed` con stack y código de error.

### Correlation ID

* Middleware genera `X-Correlation-Id` si el cliente no lo envía.
* Se propaga a `AdminAction.correlation_id`, a todos los logs y al `ResetReportDto.correlationId`.
* Header de respuesta `X-Correlation-Id` siempre presente.

### AdminAction

| Campo | Valor |
|---|---|
| `admin_id` | `actor.userId` |
| `action` | `'SEED_RESET'` (éxito) o `'SEED_RESET_FAILED'` (error) |
| `target_type` | `'seed-demo'` |
| `target_id` | `null` |
| `reason` | Body opcional |
| `correlation_id` | Propagado del request |
| `created_at` | `now()` |

### Error Tracking

* MVP usa logs estructurados a stdout (NFR-OBS-006); no se introduce APM/Sentry.

### Metrics

Opcional, alineado con NFR-OBS-006:
* Contador `seed_reset_total{result="success|failed|conflict"}`.
* Histograma `seed_reset_duration_ms`.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

Ninguna creación de seed adicional. El endpoint reusa la siembra de US-085 + US-087 + US-088.

### Demo Scenario Supported

* Demo guiada 10–15 min (FR-DEMO-001 / UC-DEMO-001): permite reiniciar el entorno entre sesiones sin redeploy.
* Suite QA E2E (PB-P2-016): reset entre escenarios para garantizar estado conocido.
* Onboarding de devs: reinicio rápido del entorno local.

### Reset / Isolation Notes

* El reset es surgical: solo `is_seed=true`.
* No requiere flush de cachés en MVP (el módulo seed-demo no usa cache).
* Si en el futuro se introduce cache distribuida (no MVP), agregar invalidación post-reset.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| Doc 16 §39.2 | Doc lista `/admin/seed/reset` sin prefijo `/api/v1`; el resto del documento confirma `/api/v1` como prefijo efectivo. | Implementar como `/api/v1/admin/seed/reset` (alineado con Doc 16 §3.1). | Aclarar en una próxima revisión de Doc 16 que el prefijo `/api/v1` aplica a las tablas de §39. | No |
| Doc 11 §29 | Doc usa el alias `seed:reset` para el comando CLI; este alias no se introduce en US-086 (la historia CLI es US-085). | Mantener el endpoint HTTP como reset surgical y no introducir comando CLI alternativo. | Documentar en runbook que el reset surgical operativo es el endpoint HTTP. | No |
| Doc 4 BR-SEED-009 | La US-086 original referenciaba BR-SEED-009 (multi-idioma) incorrectamente; ya corregida en refinamiento. | Trazabilidad usa los BRs correctos del reset. | Sin acción adicional. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Borrado accidental de datos `is_seed=false` por bug en el filtro | Pérdida de datos operativos en demo/staging compartido | Tests TS-05 / SD-T-02 verifican preservación; revisión de código obligatoria para cualquier `deleteMany` sin `WHERE is_seed = true`. |
| Endpoint expuesto en `prod` por configuración errónea | Pérdida de datos en `prod` | `SEED_DEMO_ENABLED=false` por defecto (Doc 14 §15.2 SEED); ruta no se registra si el flag está apagado; auditoría obligatoria. |
| Concurrencia (dos resets simultáneos) | Inconsistencia parcial | Lock optimista + `409 seed_reset_in_progress`. |
| Falla parcial deja BD en estado inconsistente | Demo rota tras error transitorio | `$transaction` por lote + rollback automático + `AdminAction` `SEED_RESET_FAILED` + log estructurado para diagnóstico. |
| Cambio futuro en enum `AdminAction.action` sin migración | Insert falla en runtime | Coordinar con US-100 (PB-P0-001) para validar valores `'SEED_RESET'` y `'SEED_RESET_FAILED'`. |
| Timeout HTTP en datasets grandes | `502/504` antes de completar reset | Tamaño de seed es controlado (BR-SEED-002, volúmenes pequeños); ejecución síncrona aceptable para MVP. Si crece, promover a job asíncrono en historia posterior. |
| Tests dependientes de orden de deletes FK | Falsos negativos en CI | Orden de deletes documentado en el use case y verificado en unit test. |

---

## 18. Implementation Guidance for Coding Agents

### Files / folders likely impacted

* `apps/api/src/modules/seed-demo/` (módulo Doc 14 §10.16):
  * `application/use-cases/reset-demo.use-case.ts` (nuevo).
  * `application/dtos/reset-report.dto.ts` (nuevo).
  * `application/dtos/reset-request.schema.ts` (nuevo).
  * `infrastructure/http/seed-demo.controller.ts` (extender con `POST /reset`).
  * `infrastructure/http/seed-demo.module.ts` (registrar ruta condicional al flag).
  * `application/services/seed-reset.lock.ts` (nuevo — semáforo).
* `apps/api/src/modules/admin-governance/infrastructure/persistence/admin-action.repository.ts` (reutilizar).
* `apps/api/src/shared/middlewares/correlation-id.middleware.ts` (reutilizar).
* `apps/api/src/shared/middlewares/require-auth.middleware.ts`, `require-role.middleware.ts` (reutilizar).
* Tests: `apps/api/src/modules/seed-demo/__tests__/reset-demo.use-case.test.ts`, `reset.controller.integration.test.ts`.

### Recommended order of implementation

1. Implementar `seed-reset.lock.ts` (semáforo en memoria por proceso).
2. Implementar `ResetDemoUseCase` con tests unitarios primero (TDD).
3. Crear DTOs y Zod schema.
4. Registrar `POST /admin/seed/reset` en `SeedDemoController` con middlewares.
5. Asegurar que el módulo NO registre rutas si `SEED_DEMO_ENABLED !== 'true'` (tests de bootstrap).
6. Tests de integración con DB de test (Vitest + Supertest + DB efímera).
7. Documentar el endpoint en el README del módulo y en el runbook de demo.

### Decisions that must not be reopened

* El reset es surgical (solo `is_seed=true`) — Doc 11 §29.
* `404` ante flag apagado (no `403` ni `503`) — Doc 19 §THR-012 + PB-P3-001.
* `AdminAction` obligatorio — BR-ADMIN-004/011, NFR-OBS-001.
* Sin UI en esta historia — la UI pertenece a PB-P3-001 / US-140.
* Repoblado idempotente delegado en `SeedDemoDataUseCase` (US-085) — no reimplementar siembra.

### What must not be implemented

* UI admin.
* Resets parciales por entidad.
* Snapshots/backups previos.
* Endpoint cron/scheduler para reset automático.
* Modificación de filas con `is_seed=false`.
* Aplicación de migraciones Prisma desde el endpoint.

### Assumptions to preserve

* `SeedDemoDataUseCase` está disponible y operativo (US-085).
* `AdminActionRepository` existe (Doc 14 §13).
* Middlewares `requireAuth` y `requireRole` ya están implementados (PB-P0-002).
* `is_seed` está poblado en todas las entidades sembrables (US-099 / US-100).

---

## 19. Task Generation Notes

### Suggested task groups

* **OPS**: configuración del flag `SEED_DEMO_ENABLED` por entorno; documentación operativa.
* **BE**: `ResetDemoUseCase`, controller, DTOs, lock, registro condicional de ruta, error handling.
* **SEC**: middlewares de autenticación/rol, registro condicional, validación negativa.
* **DB**: validar índices parciales sobre `is_seed` (coordinar con US-101).
* **OBS**: logs estructurados, correlation ID, métricas opcionales, `AdminAction`.
* **QA**: tests unit (use case), integration (controller + DB), API (autorización), seed/demo (preservación de `is_seed=false`).
* **DOC**: runbook de demo, README del módulo, contrato OpenAPI/markdown del endpoint.

### Required QA tasks

* Tests de happy path, idempotencia, surgical, auditoría, concurrencia, falla parcial.
* Verificación específica de preservación de `is_seed=false`.
* Test de bootstrap del módulo sin flag (la ruta no debe existir).

### Required security tasks

* Verificar que `404` ante flag apagado no expone información del endpoint.
* Verificar que `AdminAction` se persiste incluso en falla.
* Code review específico de cualquier `deleteMany` sin `WHERE is_seed = true`.

### Required seed/demo tasks

* Documentar en el runbook de demo cómo invocar el endpoint (curl/Postman).
* Integrar el endpoint en el harness QA E2E (PB-P2-016 — historia posterior, no tarea de US-086).

### Required documentation tasks

* Actualizar README del módulo `seed-demo` con el contrato del endpoint.
* Documentar `SEED_DEMO_ENABLED` y comportamiento `404` en la guía de API.
* Notar el contrato `ResetReportDto` para consumo futuro por PB-P3-001 / US-140.

### Dependencies between tasks

* BE-01 (lock) → BE-02 (use case) → BE-03 (controller) → BE-04 (bootstrap condicional).
* QA-01 (unit) puede correr en paralelo a BE-02.
* QA-02 (integration) bloquea a BE-04 (necesita la ruta registrada).
* OPS-01 (flag config) precede a cualquier deploy de QA.

### Consolidated `tasks.md` for PB-P0-014

Recomendado: PB-P0-014 puede consolidar las tareas de US-085, US-086, US-087, US-088 en un `tasks.md` por backlog item al cierre, para facilitar el seguimiento de readiness de la demo.

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass |
| Product Backlog mapping found | Pass |
| Decision Resolution reviewed if present | N/A (no existe) |
| Scope clear | Pass |
| Architecture alignment clear | Pass |
| API impact clear | Pass |
| DB impact clear | Pass |
| AI impact clear | N/A |
| Security impact clear | Pass |
| Testing strategy clear | Pass |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

**Ready for Task Breakdown.**

US-086 cuenta con una especificación técnica completa y trazable contra documentación aprobada (Doc 11 §29, Doc 14 §10.16 / §11 #46, Doc 16 §39, Doc 19 §THR-012, PB-P0-014). El alcance es acotado: un endpoint HTTP en un módulo ya existente (`seed-demo`), reusando capacidades de US-085 (`SeedDemoDataUseCase`) y de `admin-governance` (`AdminActionRepository`). No hay decisiones técnicas pendientes ni contradicciones bloqueantes. Las alineaciones documentales identificadas son no bloqueantes. Siguiente paso: ejecutar `eventflow-user-story-to-development-tasks` sobre esta Technical Specification.
