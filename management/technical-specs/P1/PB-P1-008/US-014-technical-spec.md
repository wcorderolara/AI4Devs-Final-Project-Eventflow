# Technical Specification — US-014: Ver el dashboard de progreso de mi evento

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-014 |
| Source User Story | management/user-stories/US-014-view-event-dashboard.md |
| Decision Resolution Artifact | management/user-stories/decision-resolutions/US-014-decision-resolution.md (no existe — no fue necesario) |
| Priority | P1 |
| Backlog ID | PB-P1-008 |
| Backlog Title | Listar/filtrar eventos y ver dashboard del evento |
| Backlog Execution Order | 26 (de 18 P0 + 8 P1) |
| User Story Position in Backlog Item | 2 de 2 (US-013, US-014) |
| Related User Stories in Backlog Item | US-013, US-014 |
| Epic | EPIC-EVT-001 — Organizer Event Management |
| Backlog Item Dependencies | PB-P1-007, PB-P1-016, PB-P1-019 |
| Feature | Dashboard del evento |
| Module / Domain | Events |
| User Story Status | Approved (with Minor Notes) |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-25 |
| Last Updated | 2026-06-25 |

---

## 2. Backlog Execution Context

### Product Backlog Item

PB-P1-008 agrupa listado (US-013, ya entregada en tasks) y dashboard del evento (US-014). Esta spec aborda US-014. Las dependencias del backlog item:

* PB-P1-007 (ciclo de vida): provee `status` `active|draft|cancelled|completed` y `deleted_at`.
* PB-P1-016 (HITL): provee la base para tareas confirmadas (insumo del % progreso).
* PB-P1-019 (filtros y progreso del checklist): provee el cálculo de `% done` y filtros temporales sobre tareas.

Dependencias funcionales adicionales relevantes para el dashboard:

* PB-P1-018: CRUD manual de tareas.
* PB-P1-020 (presupuesto + BudgetItems) y PB-P1-023 (sync atómico de `committed`): proveen los montos planeado y comprometido.
* PB-P1-030..PB-P1-032 (QuoteRequest y Quote): proveen cotizaciones activas.

### Execution Order Rationale

US-014 se ejecuta inmediatamente después de US-013, dentro del mismo backlog item. No requiere migraciones nuevas ni nuevos endpoints de mutación: agrega una vista de solo lectura compuesta de datos ya disponibles vía sub-endpoints existentes en `docs/16-API-Design-Specification.md`.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-013 | Listado y filtrado de eventos propios | 1 |
| US-014 | Dashboard del evento | 2 |

---

## 3. Executive Technical Summary

Implementar la página `/[locale]/organizer/events/:id` como Client Component con composición de cards usando TanStack Query (ADR-FE-002), una query por sección. Resolver la decisión técnica abierta a favor de **composición frontend** sobre los sub-endpoints existentes en lugar de introducir un endpoint agregado nuevo, dado que la composición frontend:

1. Es la única opción que cumple naturalmente AC-04 (estado vacío parcial por sección) y EC-03 (sección caída no bloquea las demás).
2. Está alineada con ADR-FE-002 (TanStack Query) y con el patrón establecido en EventFlow.
3. No introduce un nuevo endpoint que solape con los sub-endpoints existentes.
4. Permite cache granular y reuso entre páginas (tareas, presupuesto, quotes).
5. Mantiene `docs/16` consistente sin requerir ADR adicional.

Se requieren dos ajustes menores y compatibles a sub-endpoints existentes:

* `GET /api/v1/events/:eventId/tasks` debe aceptar `?upcomingDays=<int>` (filtro por ventana de fechas desde "hoy" del servidor).
* `GET /api/v1/events/:eventId/quote-requests` debe aceptar `?status=active` (filtro por estados activos).

Adicionalmente:

* `GET /api/v1/events/:eventId` debe poder devolver el `BookingIntent.confirmed` si existe (proyección dentro del DTO existente). Si no existe ese campo en el detalle actual, se añade como campo opcional `confirmedBookingIntent` proyectado por el use case existente; sin migración.

La ownership se valida en cada sub-endpoint con `SEC-POL-EVENT-001` (middleware existente). Evento ajeno o inexistente devuelve `404` por política IDOR (`docs/19`). Admin recibe `403` (debe usar US-016).

No hay impacto en IA, base de datos (modelo/migración), seed ni infraestructura.

---

## 4. Scope Boundary

### In Scope

* Página `/[locale]/organizer/events/:id` con cards: Resumen, Progreso, Próximas tareas (7 días), Presupuesto, Quotes activas, Booking confirmado.
* Manejo independiente por card (skeleton/empty/error/success).
* Ajustes menores a `GET /events/:id/tasks` (`upcomingDays`) y `GET /events/:id/quote-requests` (`status=active`).
* Proyección de `confirmedBookingIntent` en el detalle del evento (sin cambio de esquema).
* i18n para 4 locales con formato monetario por evento.
* Accesibilidad: estructura semántica, navegación por teclado, axe.
* Tests integration + E2E + accesibilidad + autorización + medición TTI.
* Observabilidad por error y por acceso denegado (404 IDOR).

### Out of Scope

* Endpoint agregado `GET /events/:id/dashboard` (no se introduce en MVP; queda como mejora futura si la composición frontend no logra TTI objetivo).
* Vista admin del dashboard (US-016 / PB-P1-010 con audit log propio).
* Mutaciones desde el dashboard (las cards enlazan a las pantallas dedicadas).
* Widgets configurables, export PDF, charting avanzado.
* Migraciones o nuevos índices.

### Explicit Non-Goals

* No introducir conversión automática de moneda.
* No reabrir el modelo de `Event` o `BookingIntent`.
* No añadir AdminAction desde este endpoint (vive en US-016).
* No introducir un nuevo ADR (la decisión técnica se documenta aquí, no eleva la arquitectura).

---

## 5. Architecture Alignment

### Backend Architecture

* Modular Monolith, Clean Architecture (`docs/14`).
* Reuso de:
  * `EventsController.detail` y `GetEventUseCase` (extender proyección con `confirmedBookingIntent`).
  * `EventTasksController.list` (extender query schema con `upcomingDays`).
  * `QuoteRequestsController.list` (extender query schema con `status`).
  * `BudgetController.detail`.
* Sin nuevos use cases agregadores.

### Frontend Architecture

* Next.js App Router (ADR-FE-001), Client Component.
* TanStack Query (ADR-FE-002): una query por card, claves estables por sección.
* next-intl para 4 locales; `Intl.NumberFormat` para formato monetario.
* Sin Server Component para el dashboard (necesita estado cliente y reactividad por card).

### Database Architecture

* Sin cambios de esquema ni migración.
* Reuso de índices existentes por `event_id` (`docs/18`).
* `events.deleted_at IS NULL` aplicado por las consultas existentes.

### API Architecture

* REST JSON `/api/v1`.
* Profundidad máxima de 2 niveles preservada (`docs/16`).
* Sin nuevos endpoints; sólo extensiones backward-compatible a query params.

### AI / PromptOps Architecture

No aplica.

### Security Architecture

* Cookie HTTP-only de sesión (middleware existente).
* `SEC-POL-EVENT-001` aplica en cada sub-endpoint.
* IDOR: 404 ante evento ajeno o inexistente.
* `admin` 403 desde este endpoint; debe usar US-016.

### Testing Architecture

* Vitest (unit), Supertest (integration + API), Playwright (E2E), MSW (mocks), axe (accesibilidad).
* Mediciones de TTI con Playwright/Lighthouse simplificado.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 Carga del dashboard | 4–5 queries TanStack paralelas: `event` detail, `tasks` (todas para % progreso + `upcomingDays=7`), `budget`, `quote-requests?status=active`. Render por card. | Frontend, API |
| AC-02 Evento `draft` sin plan IA | Card de tareas detecta `total=0` y muestra CTAs "Generar plan IA" (UC-AI-001) y "Crear primera tarea" (PB-P1-018). | Frontend |
| AC-03 Warning de overcommit | Card de presupuesto evalúa `total_committed > total_planned` y muestra `WarningBadge` (BR-BUDGET-004). | Frontend |
| AC-04 Estado vacío parcial | Cada card maneja su propio estado vacío sin bloquear las demás. | Frontend |
| AC-05 Idioma y moneda | `Accept-Language` propagado en cada llamada; `Intl.NumberFormat` con `currency` del evento. | Frontend, API |
| EC-01/EC-02 Read-only `cancelled`/`completed` | El frontend deshabilita CTAs de mutación en función del `status` del evento. | Frontend |
| EC-03 Sección caída | TanStack Query maneja `isError` por query; `CardErrorBanner` con `Retry` reintenta sólo esa query. | Frontend |
| EC-04 Evento ajeno o inexistente | Backend devuelve `404` por IDOR; frontend muestra página 404 estándar. | Backend, Frontend |
| SEC-01..SEC-05 | Validación en cada sub-endpoint con `SEC-POL-EVENT-001`; admin 403; anónimo 401. | Backend, Security |
| TS-06 NFR-PERF-003 (TTI < 3 s) | TanStack Query con `keepPreviousData`, suspense desactivado, render progresivo, prefetch del detalle del evento desde `getServerSideProps` opcional. | Frontend |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

* `modules/events` (extender proyección del detalle).
* `modules/event-tasks` (extender query schema).
* `modules/quote-requests` (extender query schema).
* `modules/budget` (reuso sin cambios).

### Use Cases / Application Services

* `GetEventUseCase`: proyectar `confirmedBookingIntent` si existe `BookingIntent.confirmed_intent = true` para el evento.
* `ListEventTasksUseCase`: aceptar `upcomingDays` para filtrar `due_date BETWEEN today AND today + upcomingDays`.
* `ListQuoteRequestsUseCase`: aceptar `status` y validar contra el enum del dominio; tolerante (descartar si inválido).

### Controllers / Routes

* `EventsController.detail` — sin cambio de ruta, sólo proyección.
* `EventTasksController.list` — sin cambio de ruta, nuevo query param.
* `QuoteRequestsController.list` — sin cambio de ruta, nuevo query param.

### DTOs / Schemas

* `EventDetailDto` extendido con `confirmedBookingIntent?: { id, vendorId, totalAmount, currency, confirmedAt }`.
* `ListTasksQuerySchema` añade `upcomingDays?: z.coerce.number().int().min(1).max(60)`.
* `ListQuoteRequestsQuerySchema` añade `status?: z.enum(QR_STATUSES).optional()`.

### Repository / Persistence

* Reuso de repositorios existentes; no se introducen métodos nuevos salvo:
  * `EventTaskRepository.findUpcoming(eventId, daysWindow)` opcional, o filtro inline en `findByEvent`.
  * `EventRepository.findDetailById(eventId, ownerId)` proyecta `BookingIntent` confirmado con `include` Prisma.

### Validation Rules

* `eventId` debe ser UUID; `400` si no.
* Ownership en cada sub-endpoint; `404` si no es propio (IDOR).
* `upcomingDays` clamp `[1, 60]`; defaults no aplican (el frontend siempre lo envía).
* `status` en quote-requests: tolerante; valores fuera del enum se descartan silenciosamente (no `400`).

### Error Handling

* Reuso del manejador global; sin códigos nuevos.

### Transactions

* No requeridas; sólo lectura.

### Observability

* Por sub-endpoint se mantiene el logging existente.
* Añadir `logger.warn({ event: 'event.detail.idor_attempt', correlationId, attemptedEventId, currentUserId })` cuando ownership falla.

---

## 8. Frontend Technical Design

### Routes / Pages

* `app/[locale]/organizer/events/[eventId]/page.tsx` (Client Component dentro del layout `organizer`).

### Components

* `EventDashboard` (orquestador de queries y layout).
* `EventSummaryCard`, `ProgressCard`, `UpcomingTasksCard`, `BudgetCard`, `ActiveQuotesCard`, `BookingIntentCard`.
* `CardSkeleton`, `CardErrorBanner`, `EmptyCard`, `WarningBadge`.
* `ReadOnlyBanner` (para `cancelled` / `completed`).

### Forms

No aplica.

### State Management

* TanStack Query con queries paralelas:
  * `['event', eventId]` → `eventsApi.detail(eventId)`
  * `['event', eventId, 'tasks', { upcomingDays: 7 }]` → `tasksApi.listByEvent(eventId, { upcomingDays: 7 })`
  * `['event', eventId, 'tasks', 'all']` → `tasksApi.listByEvent(eventId)` (para % progreso; si TaskApi devuelve agregados, esta query puede omitirse y consumir el agregado expuesto por PB-P1-019)
  * `['event', eventId, 'budget']` → `budgetApi.detail(eventId)`
  * `['event', eventId, 'quote-requests', { status: 'active' }]` → `quoteRequestsApi.listByEvent(eventId, { status: 'active' })`
* `staleTime` por query corto (~30 s); `refetchOnWindowFocus` activo.
* Cancelaciones automáticas al navegar fuera de la página.

### Data Fetching

* Cada hook (`useEventDetail`, `useEventTasks`, `useEventBudget`, `useEventActiveQuotes`) envuelve un `useQuery`.
* `Accept-Language` se propaga desde `next-intl` en el cliente o desde el server al inicializar el QueryClient.

### Loading / Empty / Error / Success States

* Loading: `CardSkeleton` por card.
* Empty: `EmptyCard` con CTA específico por sección.
* Error: `CardErrorBanner` por card con `Retry`.
* Success: contenido de la card.

### Accessibility

* `<main>` y `<section aria-labelledby="..."` por card.
* Foco visible y orden de tabulación lógico.
* `WarningBadge` con `role="status"` + `aria-live="polite"`.
* axe-core sin violaciones críticas.

### i18n

* Namespace `organizer.events.dashboard`.
* `Intl.NumberFormat(locale, { style: 'currency', currency: event.currency })`.
* Sin conversión de moneda (guardrail MVP).

---

## 9. API Contract Design

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| GET | `/api/v1/events/:eventId` | Detalle del evento + `confirmedBookingIntent?` proyectado | Sí + ownership | `eventId` path UUID | `200 EventDetailDto` | `400`, `401`, `403` (admin), `404` (IDOR) |
| GET | `/api/v1/events/:eventId/tasks` | Listado de tareas del evento | Sí + ownership | Query: `?upcomingDays?`, `?status?`, `?page?`, `?pageSize?` (existentes) | `200 { items, pagination }` | `400`, `401`, `403` (admin), `404` (IDOR) |
| GET | `/api/v1/events/:eventId/budget` | Detalle de presupuesto agregado | Sí + ownership | — | `200 BudgetSummaryDto` | `400`, `401`, `403` (admin), `404` (IDOR) |
| GET | `/api/v1/events/:eventId/quote-requests` | Cotizaciones del evento | Sí + ownership | Query: `?status?` (nuevo, tolerante) | `200 { items, pagination }` | `400`, `401`, `403` (admin), `404` (IDOR) |

Notas:

* Ningún endpoint nuevo; cambios son backward-compatible.
* `confirmedBookingIntent` es opcional en el DTO.
* Política IDOR: ownership viola → `404` (no `403`).

---

## 10. Database / Prisma Design

### Models Impacted

* `Event`, `EventTask`, `Budget`, `BudgetItem`, `QuoteRequest`, `Quote`, `BookingIntent` (todos en lectura).

### Fields / Columns

* `BookingIntent.confirmed_intent` (existente) consumido por la proyección del detalle.
* `EventTask.due_date` y `EventTask.status` consumidos para el filtro `upcomingDays` y para el cálculo de `% done`.

### Relations

* `Event.bookingIntents` (1..N).
* `Event.tasks` (1..N).
* `Event.budget` (1..1).
* `Event.quoteRequests` (1..N).

### Indexes

* Reusar índices existentes por `event_id` en cada tabla.
* No se requiere índice nuevo.

### Constraints

* Ownership por `Event.owner_id` (sin cambios).

### Migrations Impact

* Ninguna.

### Seed Impact

* No requiere cambios. Reusa seed existente; se valida cobertura en SEED task.

---

## 11. AI / PromptOps Design

No aplica.

---

## 12. Security & Authorization Design

### Authentication

* Middleware existente con cookie HTTP-only.

### Authorization

* `SEC-POL-EVENT-001` (ownership) en cada sub-endpoint.
* `admin` recibe `403` desde estos endpoints; debe usar el endpoint admin auditado de US-016.

### Ownership Rules

* Filtro `Event.owner_id = currentUser.id`; si no se cumple, devolver `404` (IDOR).
* No aceptar `ownerId` como query (ignorar si llega).

### Role Rules

* `organizer` (dueño) `200`, `vendor` `403`, `admin` `403`, anónimo `401`.

### Negative Authorization Scenarios

* Cubiertos por NT-01..NT-04 y AUTH-TS-01..AUTH-TS-05.

### Audit Requirements

* `logger.warn` para intentos IDOR (no `AdminAction`).

### Sensitive Data Handling

* `confirmedBookingIntent` proyecta sólo campos necesarios (`id`, `vendorId`, `totalAmount`, `currency`, `confirmedAt`); no se exponen datos sensibles del vendor.

---

## 13. Testing Strategy

### Unit Tests

* `GetEventUseCase`: proyección de `confirmedBookingIntent` (presente/ausente).
* `ListEventTasksUseCase`: filtro `upcomingDays` correcto.
* `ListQuoteRequestsUseCase`: parseo tolerante de `status`.
* Hooks FE (`useEventDetail`, etc.) con MSW.

### Integration Tests

* `EventRepository.findDetailById`: proyección con join a BookingIntent.
* `EventTaskRepository.findUpcoming` o filtro inline: ventana de fechas correcta.

### API Tests

* Cada sub-endpoint con casos representativos y autorización.
* Verificación específica de IDOR (404 vs 403).

### E2E Tests

* TS-02 (estado vacío con CTAs), TS-03 (skeletons), EC-01 (cancelled read-only), EC-02 (completed read-only), AC-03 (overcommit), AC-04 (vacío parcial), AC-05 (locale).

### Security Tests

* AUTH-TS-01..AUTH-TS-05.
* IDOR explícito: otro organizer recibe 404.

### Accessibility Tests

* axe en página renderizada con datos y sin datos.
* Navegación por teclado entre cards.

### AI Tests

No aplica.

### Seed / Demo Tests

* Verificar seed: al menos un evento `active` con tareas, presupuesto, quotes y booking confirmado; un evento `draft` sin tareas; un evento `cancelled` y otro `completed` (o forzar el estado vía fixture específico).

### CI Checks

* Pipeline existente + medición de TTI dirigida con Playwright para el dashboard de demo.

---

## 14. Observability & Audit

### Logs

* Reuso de logging por sub-endpoint.
* `logger.warn({ event: 'event.detail.idor_attempt', correlationId, attemptedEventId, currentUserId })` ante ownership fallido.

### Correlation ID

* Requerido (ADR-API-004). Frontend propaga el mismo correlation id en todas las queries paralelas vía interceptor del cliente HTTP, para correlacionarlas con un solo identificador de página.

### AdminAction

* No aplica (vive en US-016).

### Error Tracking

* Sin sinks nuevos.

### Metrics

* Reusar latencia por endpoint para verificar NFR-PERF-001 en cada sub-endpoint.
* TTI dirigida con E2E para verificar NFR-PERF-003.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

* Sin nuevos datos. Verificación de cobertura.

### Demo Scenario Supported

* Organizador navega de listado (US-013) al dashboard del evento `active` y muestra progreso, próximas tareas, presupuesto con warning de overcommit, quotes activas y booking confirmado.

### Reset / Isolation Notes

* Sin cambios.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| `management/artifacts/4-Product-Backlog-Prioritized.md` (PB-P1-008) | Traceability declarada `FR-EVENT-009..011 · UC-EVENT-005..006` no incluye `FR-EVENT-008` ni `UC-EVENT-004` (dashboard). | US-014 usa `FR-EVENT-008`, `FR-BUDGET-004`, `UC-EVENT-004`. | Extender el housekeeping ya planificado por `TASK-PB-P1-008-US-013-DOC-001`. | No |
| `docs/5-User-Roles-Permissions-Matrix.md` (admin = R sobre `GET /events/:id`) vs `docs/19` (audit log obligatorio para acciones admin sobre eventos). | Si admin pudiese leer este endpoint, evadiría el audit log de US-016. | Tech Spec define admin `403` en este endpoint; admin lee dashboard vía `/admin/events/:id` (US-016). | Aclarar `docs/5` para reflejar que el admin lee vía endpoint admin auditado. | No |
| `docs/16-API-Design-Specification.md` (`GET /events/:id/tasks` y `GET /events/:id/quote-requests`). | No documentan `upcomingDays` ni `status=active` como filtros. | Tech Spec añade los query params como extensión backward-compatible. | Actualizar `docs/16` cuando se mergee la implementación (tarea DOC en US-014). | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| TTI > 3 s con 4 queries paralelas en redes lentas. | NFR-PERF-003 no cumplido. | Render progresivo por card; prefetch del detalle del evento desde el listado (US-013); revisar bundle size del dashboard; opcional: introducir endpoint agregado en iteración posterior si emerge problema. |
| Manejo inconsistente de error por card. | UX confuso. | Patrón estricto `Card → CardErrorBanner` con `Retry` por query. |
| Cálculo de % progreso depende del comportamiento de PB-P1-019. | Riesgo de duplicar lógica. | Consumir el agregado del módulo de tareas si PB-P1-019 ya expone `progress`; en caso contrario, calcular en frontend con la lista cruda y migrar al agregado cuando esté. |
| `confirmedBookingIntent` ausente en el modelo. | Card vacía. | Si no existe `BookingIntent.confirmed_intent`, derivar del primer `BookingIntent` en estado `confirmed`; ajustar proyección en consecuencia. |
| Ownership inconsistente entre sub-endpoints. | IDOR. | Validar con tests dedicados de IDOR en cada endpoint consumido. |
| Composición frontend complica las correlaciones de log. | Debug más difícil. | Mismo `correlation-id` por carga de página propagado a cada query. |

---

## 18. Implementation Guidance for Coding Agents

### Files or folders likely impacted

* Backend:
  * `apps/api/src/modules/events/use-cases/get-event.use-case.ts` (proyección extendida).
  * `apps/api/src/modules/events/repositories/event.repository.ts` (`findDetailById` con `include` BookingIntent).
  * `apps/api/src/modules/events/dtos/event-detail.dto.ts` (campo opcional `confirmedBookingIntent`).
  * `apps/api/src/modules/event-tasks/validators/list-event-tasks.schema.ts` (añadir `upcomingDays`).
  * `apps/api/src/modules/event-tasks/use-cases/list-event-tasks.use-case.ts` (filtro de fechas).
  * `apps/api/src/modules/quote-requests/validators/list-quote-requests.schema.ts` (añadir `status`).
  * Middleware de ownership existente (reusar; ajustar respuesta 404 si actualmente devuelve 403).
* Frontend:
  * `apps/web/app/[locale]/organizer/events/[eventId]/page.tsx`.
  * `apps/web/components/events/dashboard/` (cards listadas en §8).
  * `apps/web/lib/hooks/{useEventDetail,useEventTasks,useEventBudget,useEventActiveQuotes}.ts`.
  * `apps/web/lib/api/{events,tasks,budget,quoteRequests}.ts` (ajustar firmas con nuevos params).
  * `apps/web/messages/{es-LATAM,es-ES,pt,en}/organizer.json` (namespace `events.dashboard`).
  * Wrapper de `Intl.NumberFormat` en `apps/web/lib/format/currency.ts` si no existe.
* Tests:
  * Integration por sub-endpoint extendido.
  * API tests con IDOR.
  * Playwright para AC-01..AC-05, EC-01..EC-04 y TS-06 (TTI).
  * axe en página renderizada con y sin datos.

### Recommended order of implementation

1. Backend: extensiones a `list-event-tasks` y `list-quote-requests`; proyección de `confirmedBookingIntent`.
2. Tests backend (unit + integration + API + IDOR).
3. Frontend: clientes API y hooks; cards atómicas; orquestador `EventDashboard`.
4. i18n y formato monetario.
5. E2E (incluida medición TTI) + accesibilidad.
6. Documentación y housekeeping.

### Decisions that must not be reopened

* Composición frontend con TanStack Query (no introducir endpoint agregado en MVP).
* IDOR 404 (no 403) para evento ajeno o inexistente.
* Admin recibe 403 en estos endpoints; usa US-016.
* Sin conversión automática de moneda.

### What must not be implemented

* Endpoint agregado nuevo `/events/:id/dashboard`.
* Vista admin (vive en US-016).
* Mutaciones desde el dashboard.
* Migraciones nuevas, índices nuevos, AdminAction.

### Assumptions to preserve

* `confirmedBookingIntent` opcional y derivable de `BookingIntent` confirmado existente.
* Ventana de "próximas tareas" parametrizable con default 7 días desde el lado frontend.
* `% progreso` calculado como `done / (total - skipped)` con tareas en alcance del evento.

---

## 19. Task Generation Notes

### Suggested task groups

* BE: extensiones a query schemas y use cases (tasks, quote-requests); proyección de BookingIntent en detail; verificación de respuesta 404 IDOR.
* API: tests de contrato para los nuevos query params y el campo opcional `confirmedBookingIntent`.
* SEC: tests de IDOR y autorización completa.
* FE: clientes API extendidos, hooks por card, página orquestadora, cards atómicas, banner read-only, i18n, formato monetario.
* QA: integration + E2E para AC/EC y TTI; accesibilidad.
* SEED: verificación de cobertura (sin nuevos datos).
* OBS: logging `idor_attempt`; correlation-id por página propagado a queries.
* DOC: actualizar `docs/16` para reflejar los nuevos query params; extender el housekeeping de traceability del backlog (compartido con US-013).

### Required QA tasks

* TS-01..TS-06, NT-01..NT-07, AUTH-TS-01..AUTH-TS-05, accesibilidad, medición de TTI.

### Required security tasks

* IDOR explícito en cada sub-endpoint consumido.

### Required seed/demo tasks

* Verificación.

### Required documentation tasks

* Actualizar `docs/16` con los query params nuevos.
* Extender housekeeping de traceability del backlog (PB-P1-008).

### Dependencies between tasks

* BE extensiones → tests integration/API → FE hooks → cards → página → E2E.
* SEC en paralelo con QA API.

### Consolidated `tasks.md` for the parent backlog item

Recomendado generar `management/development-tasks/P1/PB-P1-008/tasks.md` consolidado ahora que US-013 y US-014 tienen sus archivos individuales.

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

`Ready for Task Breakdown`.

La spec resuelve la única decisión técnica abierta a favor de la composición frontend con TanStack Query (alineada con ADR-FE-002, AC-04 y EC-03) y define extensiones backward-compatible a dos sub-endpoints existentes y una proyección opcional al detalle del evento. No introduce endpoints nuevos, migraciones, AI ni AdminAction. Los riesgos identificados (TTI, dependencia de PB-P1-019, ausencia de `confirmed_intent`) tienen mitigaciones específicas. Las observaciones de alineación documental son no bloqueantes.
