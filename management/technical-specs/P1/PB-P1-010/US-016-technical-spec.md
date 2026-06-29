# Technical Specification — US-016: Admin ve evento del organizador en solo lectura (auditado)

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-016 |
| Source User Story | `management/user-stories/US-016-admin-view-event-readonly.md` |
| Decision Resolution Artifact | No aplica (no se generó; decisiones ya formalizadas) |
| Priority | P1 |
| Backlog ID | PB-P1-010 |
| Backlog Title | Lectura admin de eventos (auditada) |
| Backlog Execution Order | 28 (P0: 18 + posición 10 en P1) |
| User Story Position in Backlog Item | 1 de 1 |
| Related User Stories in Backlog Item | US-016 |
| Epic | EPIC-EVT-001 — Organizer Event Management |
| Backlog Item Dependencies | PB-P1-007, PB-P0-001 |
| Feature | Vista admin solo lectura del evento |
| Module / Domain | Events / Admin |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-25 |
| Last Updated | 2026-06-25 |

---

## 2. Backlog Execution Context

### Product Backlog Item

PB-P1-010 — Lectura admin de eventos (auditada). Habilita al rol `Admin` a consultar eventos del organizador en modo solo lectura, dejando una pista de auditoría obligatoria en `AdminAction(view_event)`. Depende de PB-P1-007 (autenticación admin / ciclo de vida del evento) y PB-P0-001 (esquema base, incluyendo `admin_actions`). La superficie UI completa del listado/dashboard se entrega en PB-P1-044; esta US cubre la vista de detalle.

### Execution Order Rationale

Se ejecuta después de PB-P1-007 (capa admin operativa) y de PB-P0-001 (que provee `admin_actions` y el enum `admin_action_type`). No bloquea ninguna otra US y prepara el terreno para PB-P1-044 (UI admin completa) y US-078 (listado admin). Es una US pequeña, sin escritura y sin IA, ideal para entrar a la cola P1 una vez consolidado el admin auth.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-016 | Vista de detalle de un evento en read-only con auditoría | 1 |

---

## 3. Executive Technical Summary

Implementar `GET /api/v1/admin/events/:id` que devuelve la vista de detalle de un `Event` en formato read-only y registra de forma transaccional un `AdminAction { action='view_event', target_event_id, actor_user_id, correlation_id, timestamp }`. El backend aplica RBAC `Admin` y bloquea explícitamente cualquier verbo de escritura admin sobre el evento (`PATCH/DELETE/cancel`) con `403 FORBIDDEN`. Soft-deleted events se retornan con bandera `deleted` para que la UI muestre el banner "Eliminado"; la apertura del detalle continúa auditándose. El frontend implementa la página `/[locale]/admin/events/:id` como vista de solo lectura con badge "Modo lectura", banner condicional para soft delete, manejo de 401/403/404, accesibilidad (`aria-readonly`, `role="status"`) e i18n en 4 locales. No se introducen nuevas entidades, migraciones ni IA.

---

## 4. Scope Boundary

### In Scope

* `GET /api/v1/admin/events/:id` con autorización RBAC `Admin`.
* `AdminViewEventUseCase` con transacción (lectura `Event` + insert `AdminAction`).
* Validación Zod del path param (`eventId: uuid`).
* DTO de salida `AdminEventReadDTO` con representación read-only.
* Manejo de evento `soft-deleted` (`deleted_at IS NOT NULL`) preservando la auditoría.
* Bloqueo explícito de verbos de escritura admin sobre `/admin/events/:id` (403).
* Página `/[locale]/admin/events/:id` con `AdminEventViewer`, `ReadOnlyBadge`, `DeletedEventBanner`.
* Hook TanStack `useAdminEvent(eventId)` y cliente `adminApi.getEvent(id)`.
* Logging estructurado `admin.event.view` con `correlation_id`.
* Tests positivos, negativos (401/403), edge (soft delete, 404, UUID inválido), autorización, accesibilidad y E2E con seed.

### Out of Scope

* Edición, cancelación, eliminación o restauración admin del evento.
* Suplantación de identidad (sign-in as).
* Exportación/descarga del detalle.
* Notificación al organizador al ser consultado por admin.
* Listado admin de eventos (US-078 / PB-P1-010 surface UI completa en PB-P1-044).
* Dashboard de métricas admin (US-079).
* Visor de `AdminAction` (US-080).
* Cualquier IA.

### Explicit Non-Goals

* No introducir mutaciones admin sobre `events` por este endpoint.
* No introducir nuevos enums, índices ni migraciones.
* No introducir colas, jobs ni notificaciones.
* No introducir capacidades de paginación o filtrado (corresponden al listado).

---

## 5. Architecture Alignment

### Backend Architecture

* Capa Interface: `AdminEventsController.show`.
* Capa Application: `AdminViewEventUseCase` y `AdminEventReadAssembler`.
* Capa Domain: `Event` (sin cambios) y `AdminAction` (entidad existente con enum `view_event`).
* Capa Infrastructure: `EventPrismaRepository.findByIdIncludingDeleted` y `AdminActionPrismaRepository.create`.
* Transacción: `prisma.$transaction` envolviendo `findById` + `AdminAction.create`.
* Middleware: `requireAuth` + `requireRole('admin')` + `validateParams(zodSchema)` + `withCorrelationId`.

### Frontend Architecture

* Next.js App Router; ruta `/[locale]/admin/events/:id` con client component para `AdminEventViewer`.
* Server-side `prefetch` opcional vía route handler protegido o `headers()` solo si el cookie auth lo permite; en MVP usar client fetch con TanStack Query.
* `next-intl` para todos los textos (4 locales).
* Tailwind / design tokens; sin componentes nuevos de design system fuera de los listados.

### Database Architecture

* Tablas afectadas:
  * `events` (solo lectura).
  * `admin_actions` (insert append-only).
* Sin cambios estructurales, sin nuevas columnas, sin nuevos índices.
* Reutiliza enum `admin_action_type` (incluye `view_event`, declarado en `/docs/6` y `/docs/18`).
* Reutiliza índices existentes en `admin_actions(actor_user_id)` y `admin_actions(target_event_id)` provistos por PB-P0-001.

### API Architecture

* REST JSON bajo `/api/v1` (`ADR-API-001`).
* Verbo `GET`; respuesta `200`, errores `400`, `401`, `403`, `404` con envelope unificado (`{ error: { code, message, details? }, correlationId }`).
* Negativos:
  * `PATCH /api/v1/admin/events/:id` → `403 FORBIDDEN`.
  * `DELETE /api/v1/admin/events/:id` → `403 FORBIDDEN`.
  * Cualquier acción de cancelación admin sobre el evento → `403 FORBIDDEN`.

### AI / PromptOps Architecture

No aplica.

### Security Architecture

* Backend como source of truth de autorización.
* RBAC `Admin` validado en middleware antes del use case.
* Cookies HTTP-Only signed (sesión existente, `ADR-SEC-002`).
* No exponer campos sensibles internos en `AdminEventReadDTO`.
* `AdminAction` append-only (sin UPDATE/DELETE).

### Testing Architecture

* Unit (Vitest) en use case y assembler.
* Integration (Vitest + Supertest + Prisma test DB) para el endpoint y la transacción.
* API tests con `MSW` para el cliente frontend.
* E2E (Playwright) sobre seed con admin demo.
* Tests de autorización negativos (401/403).
* Tests de accesibilidad mínimos (axe en página detalle).

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01: Lectura admin con auditoría | `AdminViewEventUseCase` ejecuta `findByIdIncludingDeleted` + `AdminAction.create` dentro de una transacción; respuesta `200` con `AdminEventReadDTO`. `correlation_id` se toma del request. | Backend, DB, Observability |
| AC-02: Escrituras admin bloqueadas | Definir middleware/handlers que respondan `405 Method Not Allowed` o `403 FORBIDDEN` para `PATCH/DELETE/cancel` sobre `/admin/events/:id`. Política explícita: `403 FORBIDDEN` con envelope unificado (alineado con US-016). | Backend, API, Security |
| AC-03: Badge "Modo lectura" en UI | `AdminEventViewer` renderiza `ReadOnlyBadge`, deshabilita controles primarios y marca inputs como `aria-readonly`. | Frontend, A11y |
| EC-01: Evento soft-deleted | Backend devuelve `200` con `deleted=true`; UI muestra `DeletedEventBanner`. `AdminAction` se registra igual. | Backend, Frontend |
| EC-02: Evento inexistente | Repository retorna `null`; controlador responde `404 NOT_FOUND` y no inserta `AdminAction`. | Backend |
| EC-03: UUID inválido | Zod rechaza el path param antes del use case; responde `400 BAD_REQUEST` sin auditoría. | Backend |
| SEC-04: correlation_id | Middleware `withCorrelationId` setea el id si no llega del cliente; se propaga al log estructurado y a `AdminAction.correlation_id`. | Backend, Observability |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

* `modules/admin/events/` con feature-first layout (capa interface, application, infrastructure).
* Reutiliza el módulo `modules/events/domain/Event` y `modules/admin/domain/AdminAction`.

### Use Cases / Application Services

* `AdminViewEventUseCase`
  * Input: `{ eventId: string, actor: AuthenticatedAdmin, correlationId: string }`.
  * Steps:
    1. `EventRepository.findByIdIncludingDeleted(eventId)` → `Event | null`.
    2. Si `null` → lanza `NotFoundError`.
    3. `AdminActionRepository.create({ actor_user_id, target_event_id, action: 'view_event', correlation_id, created_at })` en la misma transacción.
    4. Retorna `AdminEventReadDTO` ensamblado por `AdminEventReadAssembler`.

### Controllers / Routes

* `AdminEventsController.show(req, res)`
  * Aplica middlewares: `requireAuth`, `requireRole('admin')`, `validateParams(adminEventIdParamsSchema)`, `withCorrelationId`.
  * Llama al use case y mapea el resultado a HTTP `200`.
* `AdminEventsController.rejectWrites(req, res)` (o catch-all route)
  * Responde `403 FORBIDDEN` con `code='FORBIDDEN_WRITE'` para `PATCH/DELETE/POST` sobre `/admin/events/:id`.

### DTOs / Schemas

* `adminEventIdParamsSchema` (Zod):
  ```ts
  z.object({ id: z.string().uuid() })
  ```
* `AdminEventReadDTO`:
  * `id`, `title`, `status`, `event_type`, `event_date`, `guests_estimated`, `country_code`, `city`, `currency_code`, `budget_total`, `language_code`, `notes`, `created_at`, `updated_at`, `deleted_at`, `owner: { id, display_name }`, `deleted: boolean`.
* `AdminActionInsertSchema` (interno): coincide con la columna `admin_actions`.

### Repository / Persistence

* `EventPrismaRepository.findByIdIncludingDeleted(id: string): Promise<Event | null>` — selecciona ignorando filtro `deleted_at` y trae datos básicos del owner mediante relación.
* `AdminActionPrismaRepository.create(input)` — inserta en `admin_actions` con `action='view_event'`.

### Validation Rules

* `eventId` debe ser UUID v4 (`VR-01`).
* Payload de respuesta sigue `AdminEventReadDTO`; campos editables internos no se exponen (`VR-02`).

### Error Handling

* Mapper global de errores produce el envelope unificado.
* `NotFoundError` → `404 NOT_FOUND` (`code='EVENT_NOT_FOUND'`).
* `ZodError` → `400 BAD_REQUEST` (`code='VALIDATION'`).
* `UnauthorizedError` → `401 UNAUTHORIZED` (`code='UNAUTHENTICATED'`).
* `ForbiddenError` → `403 FORBIDDEN` (`code='FORBIDDEN'` o `FORBIDDEN_WRITE`).

### Transactions

* `prisma.$transaction([ findEvent, createAdminAction ])`. Si la inserción de `AdminAction` falla, la transacción se revierte y se devuelve `500 INTERNAL` (excepción manejada por el handler global).

### Observability

* Log estructurado `event='admin.event.view'` con campos: `actor_user_id`, `target_event_id`, `correlation_id`, `latency_ms`, `result='ok'|'not_found'|'forbidden'|'bad_request'`.
* Métrica de contador `admin_event_view_total{result}` (si la infraestructura ya lo soporta vía NFR-OBS-001 / PB-P0-014).
* `correlation_id` se obtiene de header `x-correlation-id` o se genera (alineado con PB-P0-013 / US-114).

---

## 8. Frontend Technical Design

### Routes / Pages

* `/[locale]/admin/events/[id]/page.tsx` (client component).
* Grupo de rutas: `app/[locale]/admin/` ya provisto por PB-P1-014 / US-105.

### Components

* `AdminEventViewer`: layout principal del detalle.
* `EventReadOnlySummary`: render de los campos.
* `ReadOnlyBadge`: badge con texto "Modo lectura" (i18n).
* `DeletedEventBanner`: banner condicional con `role="status"`.

### Forms

No aplica.

### State Management

* `useAdminEvent(eventId)` (TanStack Query):
  * `queryKey: ['admin', 'event', eventId]`.
  * `queryFn: adminApi.getEvent(eventId)`.
  * `staleTime`: 30s (defecto del proyecto).

### Data Fetching

* Cliente `adminApi.getEvent(id)` consume `GET /api/v1/admin/events/:id` con credenciales (cookie).
* Maneja respuestas `401`/`403`/`404`/`400` y las traduce a estados de error i18n.

### Loading / Empty / Error / Success States

* Loading: skeleton de detalle.
* Empty: no aplica (entidad única).
* Error 404: pantalla "Evento no encontrado" + botón "Volver al listado".
* Error 403/401: redirección al login o pantalla de "Sin permisos".
* Success: render con badge "Modo lectura"; si `deleted=true`, banner "Eliminado".

### Accessibility

* Inputs renderizados como `<input readOnly aria-readonly="true">` o `<dl>` con `role="group"`.
* Banner soft-delete con `role="status"` y `aria-live="polite"`.
* Navegación por teclado funcional al botón "Volver al listado".
* Contraste WCAG AA en badges/banners.

### i18n

* Claves nuevas bajo `admin.events.detail.*` en los 4 locales (es, en, pt, fr).
* Mensajes de error mapeados desde el envelope unificado.

---

## 9. API Contract Design

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| GET | `/api/v1/admin/events/:id` | Ver detalle de evento (read-only) | Yes — Admin | Path: `id: uuid`. Headers: cookie de sesión + opcional `x-correlation-id`. Body: vacío. | `200 OK` con `AdminEventReadDTO`. Header `x-correlation-id`. | `400 VALIDATION` (UUID inválido), `401 UNAUTHENTICATED`, `403 FORBIDDEN` (no admin), `404 EVENT_NOT_FOUND`. |
| PATCH | `/api/v1/admin/events/:id` | (Bloqueado) | Yes — Admin | — | `403 FORBIDDEN` con `code='FORBIDDEN_WRITE'`. | — |
| DELETE | `/api/v1/admin/events/:id` | (Bloqueado) | Yes — Admin | — | `403 FORBIDDEN` con `code='FORBIDDEN_WRITE'`. | — |

Documentation Alignment Required: agregar el endpoint `GET /api/v1/admin/events/:id` al snapshot OpenAPI gestionado por US-098.

---

## 10. Database / Prisma Design

### Models Impacted

* `Event` (read-only).
* `AdminAction` (insert).

### Fields / Columns

* `admin_actions.action` con valor `'view_event'`.
* `admin_actions.target_event_id` referencia `events.id`.
* `admin_actions.actor_user_id` referencia `users.id`.
* `admin_actions.correlation_id` (TEXT) se completa si la columna existe; si no, registrar en log estructurado y crear nota técnica para PB-P0-001 / US-099 (verificar en `/docs/18`).

### Relations

* `AdminAction.target_event_id → Event.id` (opcional para otros tipos de acción, requerido para `view_event`).
* `AdminAction.actor_user_id → User.id`.

### Indexes

* Reutilizar índices existentes provistos por PB-P0-001:
  * `admin_actions(actor_user_id)`.
  * `admin_actions(target_event_id)`.
* No crear índices nuevos.

### Constraints

* `admin_actions` append-only: no se exponen UPDATE/DELETE en el repositorio.
* CHECK del enum `admin_action_type` ya incluye `view_event`.

### Migrations Impact

* Sin migraciones nuevas requeridas si `admin_actions.correlation_id` ya existe. Si no existe, escalar a US-099/PB-P0-001 (no introducir migraciones ad-hoc desde esta US).

### Seed Impact

* No requiere cambios de seed. Reutiliza usuario admin y eventos seeded por US-085..088.

---

## 11. AI / PromptOps Design

No aplica.

---

## 12. Security & Authorization Design

### Authentication

* Cookie HTTP-Only signed (`ADR-SEC-002`).
* Falta de sesión válida → `401`.

### Authorization

* Middleware `requireRole('admin')` antes del use case.
* Cualquier rol distinto de `admin` → `403`.

### Ownership Rules

* No aplica: el admin no es dueño del evento; el acceso es por rol.

### Role Rules

* Solo `admin` puede consultar `/admin/events/:id`.
* `organizer` y `vendor` autenticados → `403`.

### Negative Authorization Scenarios

* Organizer / Vendor → `403`.
* Anónimo → `401`.
* Admin intentando `PATCH/DELETE` → `403`.

### Audit Requirements

* `AdminAction(action='view_event')` insertado en la misma transacción que la lectura del evento.
* `correlation_id` propagado.
* Append-only; no se permite modificar entradas existentes.

### Sensitive Data Handling

* `AdminEventReadDTO` excluye campos internos no requeridos por la vista.
* No se exponen tokens, secretos ni datos PII innecesarios fuera de los ya visibles en el dominio del evento.

---

## 13. Testing Strategy

### Unit Tests

* `AdminViewEventUseCase` con `EventRepository` y `AdminActionRepository` mockeados:
  * Happy path inserta `AdminAction` y retorna DTO.
  * Falla del repositorio de auditoría revierte la transacción.
  * Evento no encontrado lanza `NotFoundError`.

### Integration Tests

* `GET /api/v1/admin/events/:id` con Prisma test DB:
  * TS-01: Admin lee evento existente; verifica `AdminAction` persistido con `correlation_id`.
  * TS-03: Admin lee evento `soft-deleted` (`deleted=true` + banner; auditoría registrada).
  * TS-04: Evento inexistente → `404`, sin auditoría.
  * TS-05: UUID inválido → `400`, sin auditoría.

### API Tests

* TS-02: Mutaciones admin sobre `/admin/events/:id` retornan `403`.
* AUTH-TS-01..03: matriz de autorización (admin, organizer, anónimo).
* NT-01..05: matriz negativa adicional.

### E2E Tests

* TS-06 (Playwright sobre seed): admin abre el detalle desde el listado, verifica badge "Modo lectura" y campos read-only.

### Security Tests

* Verificación de RBAC en suite negativa (PB-P1-021 / US-130).
* Verificación de envelope unificado y códigos de error.

### Accessibility Tests

* axe en `/admin/events/:id`:
  * Badges/banners con roles correctos.
  * Inputs read-only accesibles.
  * Foco en botón "Volver al listado".

### AI Tests

No aplica.

### Seed / Demo Tests

* Verificar que el seed actual (PB-P1-035..036) incluye al menos un evento `active` y uno `soft-deleted` para validar EC-01.
* Verificar usuario admin en seed.

### CI Checks

* Suites existentes (vitest, supertest, playwright) deben incluir los nuevos casos.
* Quality gates de PB-P1-024 / US-132 aplican sin cambios.

---

## 14. Observability & Audit

### Logs

* Evento `admin.event.view` con `actor_user_id`, `target_event_id`, `correlation_id`, `result`, `latency_ms`.

### Correlation ID

* Lectura de header `x-correlation-id`; si no existe, se genera con UUID v4.
* Se propaga al log estructurado y al campo `admin_actions.correlation_id`.

### AdminAction

* `view_event` insertado en cada apertura del detalle (incluye soft-deleted).
* No se inserta cuando la respuesta es `400`/`401`/`403`/`404`.

### Error Tracking

* Errores no controlados se reportan al pipeline de error tracking estándar (si está habilitado por PB-P0-014).

### Metrics

* Contador `admin_event_view_total{result}` cuando el stack de métricas esté disponible (NFR-OBS-001).

---

## 15. Seed / Demo Data Impact

### Seed Data Required

* Reutiliza usuario admin (PB-P1-035) y eventos demo (US-085..088). Verificar que al menos un evento esté `soft-deleted` para cubrir EC-01.

### Demo Scenario Supported

* Demo "Gobernanza admin": el admin abre el detalle de un evento del organizador, ve la vista read-only y queda el rastro en `AdminAction`.

### Reset / Isolation Notes

* `AdminAction` se truncate en el reset demo (PB-P1-036).

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| `/docs/16-API-Design-Specification.md` | Falta documentar `GET /api/v1/admin/events/:id` (solo está `GET /admin/events`). | Endpoint definido por BR-EVENT-014 + Decisión PO 8.1 #16. | Agregar al snapshot OpenAPI vía US-098. | No |
| `/docs/9-Functional-Requirements-Document.md` | Versiones previas de la US referían IDs incorrectos (FR-ADMIN-005, FR-EVENT-014). | Canon: `FR-EVENT-013`. | Mantener `FR-EVENT-013` y eliminar referencias cruzadas erróneas en `/docs/9` si aún existen. | No |
| `/docs/4-Business-Rules-Document.md` | Versiones previas referían `BR-ADMIN-005` (que aplica a métricas). | Canon: `BR-EVENT-014`. | Mantener mapeo a `BR-EVENT-014`. | No |
| `/docs/18-Database-Physical-Design.md` | Confirmar existencia de `admin_actions.correlation_id`. | Si la columna no existe, se delega a PB-P0-001 / US-099. | Verificar al inicio del breakdown. Si falta, se rechaza la implementación de la auditoría con `correlation_id` y se programa fix vía US-099. | No (solo si la columna existe) |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| `admin_actions.correlation_id` no existe en el esquema actual | No se puede persistir el id de correlación en la auditoría. | Verificar `/docs/18` antes de implementar; si falta, escalar a US-099 y registrar `correlation_id` solo en log mientras tanto. |
| Mutaciones admin no bloqueadas explícitamente | Posible bypass de la regla de solo lectura. | Definir handler catch-all `405/403` o middleware de método permitido. Cubrir con tests negativos NT-03/NT-04. |
| Performance del insert transaccional bajo carga | Latencia adicional por escritura síncrona. | Reutilizar índices existentes; medir latencia con NFR-OBS-001; no introducir colas en MVP. |
| UI muestra controles editables por error | Riesgo percibido de mutación admin. | Componente `AdminEventViewer` sin acciones primarias y test E2E que verifica ausencia de controles de edición. |

---

## 18. Implementation Guidance for Coding Agents

### Files or folders likely impacted

* Backend:
  * `apps/api/src/modules/admin/events/interface/AdminEventsController.ts` (nuevo).
  * `apps/api/src/modules/admin/events/application/AdminViewEventUseCase.ts` (nuevo).
  * `apps/api/src/modules/admin/events/application/AdminEventReadAssembler.ts` (nuevo).
  * `apps/api/src/modules/admin/events/interface/adminEventIdParamsSchema.ts` (nuevo).
  * `apps/api/src/modules/admin/events/infrastructure/EventPrismaRepository.findByIdIncludingDeleted` (extensión).
  * `apps/api/src/modules/admin/admin-actions/infrastructure/AdminActionPrismaRepository.create` (existente).
  * `apps/api/src/routes/admin/events.routes.ts` (registro de rutas + bloqueo de escritura).
* Frontend:
  * `apps/web/src/app/[locale]/admin/events/[id]/page.tsx` (nuevo).
  * `apps/web/src/features/admin/events/components/AdminEventViewer.tsx` (nuevo).
  * `apps/web/src/features/admin/events/components/ReadOnlyBadge.tsx` (nuevo).
  * `apps/web/src/features/admin/events/components/DeletedEventBanner.tsx` (nuevo).
  * `apps/web/src/features/admin/events/hooks/useAdminEvent.ts` (nuevo).
  * `apps/web/src/features/admin/events/api/adminApi.getEvent.ts` (nuevo).
  * `apps/web/src/i18n/messages/{es,en,pt,fr}/admin.events.detail.json` (nuevo).

(Las rutas exactas pueden variar según la convención feature-first ya consolidada del proyecto; respetar la existente.)

### Recommended order of implementation

1. Confirmar existencia de `admin_actions.correlation_id` y enum `view_event` (DB).
2. Implementar repositorios (`findByIdIncludingDeleted`, `AdminAction.create`).
3. Implementar `AdminViewEventUseCase` + assembler + DTO.
4. Implementar controlador + middlewares + bloqueo de escritura.
5. Implementar tests unitarios e integración.
6. Implementar cliente API + hook TanStack.
7. Implementar página y componentes UI.
8. Agregar i18n y tests de accesibilidad.
9. Implementar E2E con seed.

### Decisions that must not be reopened

* `AdminAction(action='view_event')` por cada apertura del detalle.
* Sin notificación al organizador.
* Sin restauración admin de eventos soft-deleted en MVP.
* Sin endpoints de mutación admin sobre el evento.

### What must not be implemented

* Endpoints de listado/paginación/filtros (corresponden a US-078 / PB-P1-044).
* Métricas o dashboards admin (US-079).
* Visor de `AdminAction` (US-080).
* IA en cualquier forma.

### Assumptions to preserve

* `Event.owner_user_id` y `Event.currency_code` son inmutables.
* `admin_actions` es append-only.
* La sesión del admin se valida vía cookie HTTP-Only signed.
* El seed contiene al menos un admin y eventos en distintos estados.

---

## 19. Task Generation Notes

### Suggested task groups

* DB: verificación de columna `correlation_id` y enum `view_event` (no migración nueva esperada).
* BE: repositorios, use case, controller, middleware, bloqueo de escritura, error mapping.
* SEC: tests RBAC negativos específicos del endpoint.
* FE: página, componentes, hook, cliente API, i18n, accesibilidad.
* OBS: logging estructurado + correlation_id (reutiliza infraestructura existente).
* QA: unit, integration, API, E2E, a11y, autorización.
* SEED: verificación (no creación) de datos demo.
* DOC: alineación OpenAPI vía US-098.

### Required QA tasks

* Unit del use case.
* Integration del endpoint (happy + soft-delete + 404 + 400).
* API tests para bloqueo de mutaciones admin.
* E2E con seed.
* Accessibility con axe.

### Required security tasks

* Tests negativos RBAC para roles no admin y anónimos.
* Verificación de bloqueo `PATCH/DELETE` en CI.

### Required seed/demo tasks

* Verificar presencia de evento `soft-deleted` y usuario admin en el seed (no crear si ya están).

### Required documentation tasks

* Coordinar con US-098 para incluir `GET /api/v1/admin/events/:id` en el snapshot OpenAPI.

### Dependencies between tasks

* FE depende de BE/API en CI (mocks con MSW desbloquean FE en local).
* QA E2E depende de FE + seed.

### Whether the parent backlog item should later generate a consolidated `tasks.md`

* PB-P1-010 tiene una sola US (US-016); no se requiere `tasks.md` consolidado.

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass |
| Product Backlog mapping found | Pass |
| Decision Resolution reviewed if present | N/A |
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

**Ready for Task Breakdown.** La US está aprobada (Approved with Minor Notes, no bloqueantes), las decisiones están formalizadas (PO 8.1 #16, BR-EVENT-014, NFR-OBS-001), el mapeo a PB-P1-010 existe y la arquitectura está cubierta sin nuevas migraciones ni componentes fuera del stack consolidado. Las alineaciones documentales pendientes (`/docs/16`, `/docs/9`, `/docs/4`) se atienden como tareas ligeras posteriores y no bloquean el breakdown.
