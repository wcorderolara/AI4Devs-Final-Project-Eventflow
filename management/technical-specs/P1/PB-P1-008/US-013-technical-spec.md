# Technical Specification — US-013: Listar y filtrar mis eventos

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-013 |
| Source User Story | management/user-stories/US-013-list-filter-own-events.md |
| Decision Resolution Artifact | management/user-stories/decision-resolutions/US-013-decision-resolution.md (no existe — no fue necesario) |
| Priority | P1 |
| Backlog ID | PB-P1-008 |
| Backlog Title | Listar/filtrar eventos y ver dashboard del evento |
| Backlog Execution Order | 26 (de 18 P0 + 8 P1) |
| User Story Position in Backlog Item | 1 de 2 (US-013, US-014) |
| Related User Stories in Backlog Item | US-013, US-014 |
| Epic | EPIC-EVT-001 — Organizer Event Management |
| Backlog Item Dependencies | PB-P1-007, PB-P1-016, PB-P1-019 |
| Feature | Listado y filtrado de eventos propios |
| Module / Domain | Events |
| User Story Status | Approved (with Minor Notes) |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-25 |
| Last Updated | 2026-06-25 |

---

## 2. Backlog Execution Context

### Product Backlog Item

PB-P1-008 agrupa el listado del organizador (US-013) y el dashboard por evento (US-014). Esta especificación cubre exclusivamente US-013: endpoint `GET /api/v1/events`, página `/[locale]/organizer/events`, filtros server-side, paginación page-based y estado vacío. La dependencia funcional con PB-P1-007 está satisfecha (ciclo de vida de evento) y aporta el atributo `deleted_at`. Las dependencias con PB-P1-016 (HITL) y PB-P1-019 (filtros y progreso del checklist) aplican a US-014 (dashboard por evento), no a US-013.

### Execution Order Rationale

La US-013 es la primera US del backlog item y la pieza de navegación principal del rol Organizer. Habilita la entrada a US-009 (crear), US-010 (editar), US-011 (cancelar) y US-012 (soft delete). El soft delete y el ciclo de vida (PB-P1-007) ya están entregados, por lo que el filtro `deleted_at IS NULL` y los `status` reales del evento pueden ejercitarse end-to-end. PB-P1-016 y PB-P1-019 no bloquean US-013 porque el listado no consume HITL ni progreso de checklist.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-013 | Listado y filtrado de eventos propios del organizer | 1 |
| US-014 | Dashboard por evento (progreso, próximas tareas, committed, cotizaciones) | 2 |

---

## 3. Executive Technical Summary

Implementar lectura paginada de la entidad `Event` filtrada por `owner_id = currentUser.id` y `deleted_at IS NULL`, con filtros opcionales `status` y `eventTypeCode`, paginación page-based estándar (`page=1`, `pageSize=20`, máx 100) y orden por `event_date` ascendente. Se reutiliza el índice ya definido `idx_events_owner_status_date (owner_id, status, event_date)` en `docs/18-Database-Physical-Design.md`. El frontend expone `/[locale]/organizer/events` con `EventList`, `EventFilters`, `EventCard`, `Pagination` y `EmptyState`, conectado vía TanStack Query a `eventsApi.list(filters)`. No hay impacto en IA. La autorización se concentra en backend: `organizer` 200, `vendor`/`admin` 403, anónimo 401. La validación de query params es tolerante (parsea, ignora inválidos, loguea descartados, responde 200). No se requiere migración de base de datos ni cambios de seed.

---

## 4. Scope Boundary

### In Scope

* Endpoint `GET /api/v1/events` con filtros `status`, `eventTypeCode`, `page`, `pageSize`, `sort`, `eventDateFrom`, `eventDateTo`.
* Owner-scoping forzado en backend.
* Exclusión de `deleted_at IS NOT NULL`.
* Página `/[locale]/organizer/events` con filtros sincronizados a query params.
* Estado vacío con CTA a wizard de creación (US-009).
* i18n para 4 locales (`es-LATAM`, `es-ES`, `pt`, `en`).
* Accesibilidad: teclado, `aria-current`, foco visible.
* Tests API, E2E, accesibilidad, autorización.
* Observabilidad: correlation id, logging de filtros descartados.

### Out of Scope

* Dashboard del evento (US-014, parte del mismo backlog item).
* Búsqueda full-text avanzada.
* Filtros por rango de presupuesto.
* Vista calendario.
* Export CSV/PDF.
* Endpoint admin `/admin/events` (otra US).
* Filtros guardados / vistas personalizadas.

### Explicit Non-Goals

* No introducir nuevos campos en `Event`.
* No introducir nueva migración.
* No tocar el modelo de `EventType`.
* No introducir caching de respuesta a nivel HTTP en MVP.
* No introducir paginación cursor-based.
* No exponer endpoints públicos sin sesión.

---

## 5. Architecture Alignment

### Backend Architecture

* Stack: Node.js + Express + TypeScript + Prisma + PostgreSQL (`docs/14`).
* Modular Monolith, Clean Architecture: `controllers → use cases → repositories → Prisma`.
* Módulo: `modules/events`.
* `ListMyEventsUseCase` en capa de aplicación.
* Repositorio: `EventRepository.findByOwner(filters)`.
* Validación: Zod schema tolerante para query params.

### Frontend Architecture

* Stack: Next.js (App Router) + TypeScript + TanStack Query + next-intl + Tailwind (`docs/15`).
* Ruta autenticada bajo `organizer` layout: `app/[locale]/organizer/events/page.tsx`.
* Client component para la lista (depende de query state).
* MSW para mocks de desarrollo y para tests del componente.

### Database Architecture

* `events` table, sin cambios de esquema.
* Reutilizar índice `idx_events_owner_status_date (owner_id, status, event_date)` btree (`docs/18`).
* Filtro `deleted_at IS NULL` aplicado en consultas Prisma.

### API Architecture

* REST JSON bajo `/api/v1`.
* Endpoint: `GET /api/v1/events` definido en `docs/16-API-Design-Specification.md`.
* Envelope estándar de paginación: `{ items, pagination: { page, pageSize, totalItems, totalPages } }`.
* `camelCase` en query params.
* `Accept-Language` propaga locale a errores y a etiquetas localizables.

### AI / PromptOps Architecture

No aplica — esta historia no invoca IA.

### Security Architecture

* Autenticación: cookie HTTP-only de sesión validada por middleware existente.
* Autorización: RBAC + ownership; filtro `owner_id = currentUser.id` aplicado en backend, no en frontend.
* Roles: `organizer` (200), `vendor` (403), `admin` (403, debe usar `/admin/events`), anónimo (401).
* Aislamiento por owner (BR-AUTH-009).

### Testing Architecture

* Vitest (unit), Supertest (API/integration), Playwright (E2E), MSW (mocks), axe (accesibilidad).
* No requiere MockAIProvider.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 Listado por defecto | `GET /api/v1/events` sin filtros → query Prisma `where owner_id=currentUser.id AND deleted_at IS NULL` orderBy `event_date asc` limit 20 offset 0; envelope `pagination`. | API, Backend, DB, Frontend |
| AC-02 Filtro combinado | Zod parsea `status`, `eventTypeCode`; si pertenecen al enum/lookup, se agregan al `where`; si no, se descartan y loguean. | API, Backend, Observability |
| AC-03 Paginación explícita | `page`, `pageSize` validados (1..100, default 20); Prisma `skip`, `take`; `totalItems = count(...)`. | API, Backend |
| AC-04 Estado vacío | Frontend detecta `items.length === 0 && filters vacíos` y renderiza `EmptyState` con CTA a `/[locale]/organizer/events/new` (US-009). | Frontend |
| AC-05 Idioma de la respuesta | Middleware existente lee `Accept-Language`; locale propagado a i18n de mensajes y nombres de `EventType`. | API, Backend, Frontend |
| EC-01 Filtros inválidos | Parser tolerante; respuesta 200; `logger.info({ filtersDropped })` con correlation id. | Backend, Observability |
| EC-02 `pageSize` fuera de rango | Defaults/clamp en parser. | Backend |
| EC-03 `page` posterior a `totalPages` | Repositorio devuelve `[]`; envelope con `page` solicitado y metadatos correctos. | Backend |
| SEC-01..SEC-05 | Guard de rol en middleware + filtro forzado en repository. | Security, Backend |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

* `modules/events`.
* Reutiliza `modules/auth` para extracción de `currentUser`.

### Use Cases / Application Services

* `ListMyEventsUseCase.execute(currentUser, filters)`:
  * Valida y normaliza filtros (delegando en Zod schema).
  * Invoca `EventRepository.findByOwnerPaginated({ ownerId, status, eventTypeCode, eventDateFrom, eventDateTo, page, pageSize, sort })`.
  * Mapea la entidad a DTO de salida.
  * Retorna `{ items, pagination }`.

### Controllers / Routes

* `EventsController.list(req, res)` registrado en `router.get('/api/v1/events', requireAuth, requireRole('organizer'), eventsController.list)`.
* Controlador thin: parsea query, llama al use case, responde 200.

### DTOs / Schemas

* `ListMyEventsQuerySchema` (Zod):
  * `status?: z.enum(EVENT_STATUSES).optional()` (tolerante via `safeParse`; valores inválidos se descartan).
  * `eventTypeCode?: z.string().optional()` (validado contra lista activa de `EventType`; inválidos se descartan).
  * `eventDateFrom?: z.coerce.date().optional()`.
  * `eventDateTo?: z.coerce.date().optional()`.
  * `page?: z.coerce.number().int().min(1).default(1)` (clamp en parser).
  * `pageSize?: z.coerce.number().int().min(1).max(100).default(20)`.
  * `sort?: z.enum(['event_date']).default('event_date')`.
* `EventListItemDto`: `{ id, name, eventDate, status, eventTypeCode, currency, totalBudget?, location? }` — solo campos necesarios para la card.
* `PaginationDto`: `{ page, pageSize, totalItems, totalPages }`.

### Repository / Persistence

* `EventRepository.findByOwnerPaginated(params)`:
  * Aplica `where: { ownerId: params.ownerId, deletedAt: null, ...condicionales }`.
  * `orderBy: { eventDate: 'asc' }` con tiebreaker `createdAt: 'desc'`.
  * `skip: (page - 1) * pageSize`, `take: pageSize`.
  * Ejecuta `count` en paralelo (`prisma.$transaction([findMany, count])`) para obtener `totalItems`.

### Validation Rules

* Parser tolerante: nunca devuelve 400 por filtros desconocidos o valores fuera de rango — siempre 200, registrando descartes.
* Únicas situaciones que sí devuelven error: ausencia de sesión (401) o rol no autorizado (403).

### Error Handling

* Manejador global existente envuelve errores en formato estándar EventFlow.
* No se introducen códigos de error nuevos.

### Transactions

* No requiere transacción de escritura. Lectura combinada `findMany + count` envuelta en `$transaction` por consistencia de paginación.

### Observability

* `logger.info({ event: 'events.list', correlationId, ownerId, filtersApplied, filtersDropped, page, pageSize, totalItems })`.
* En errores, `logger.error` con stack y correlation id.

---

## 8. Frontend Technical Design

### Routes / Pages

* `app/[locale]/organizer/events/page.tsx` — protegida por layout `organizer`.

### Components

* `EventList` (client) — orquesta query y render de la lista.
* `EventFilters` — controles `status`, `eventTypeCode`, sincronizados con `useSearchParams`.
* `EventCard` — render por evento.
* `Pagination` — controles con `aria-current` y `aria-label`.
* `EmptyState` — bloque vacío con CTA "Crear mi primer evento".

### Forms

* Filtros como query params del router; no se usa React Hook Form (no es formulario de mutación).

### State Management

* TanStack Query: `useEvents({ status, eventTypeCode, page, pageSize })`.
* `queryKey: ['events', 'mine', filters]`.
* `staleTime` corto (p.ej. 30 s) — no caching agresivo.
* Invalidación tras mutaciones de US-009/010/011/012 mediante `queryClient.invalidateQueries({ queryKey: ['events', 'mine'] })` (implementadas en sus respectivas tasks; aquí se documenta el contrato).

### Data Fetching

* `eventsApi.list(filters)` invoca `GET /api/v1/events` con `fetch` server-side enriquecido por `Accept-Language` del request o por `next-intl` en cliente.

### Loading / Empty / Error / Success States

* Loading: skeleton de cards.
* Empty: `EmptyState` con CTA si `filters` está vacío; si hay filtros aplicados, mensaje "Sin resultados para los filtros aplicados" + reset.
* Error: banner con retry.
* Success: lista de `EventCard` + `Pagination`.

### Accessibility

* Filtros operables con teclado, etiquetas asociadas, contraste suficiente.
* `Pagination` con `aria-current="page"` y `aria-label` por control.
* Foco visible en todos los interactivos.

### i18n

* Todos los textos visibles vía `next-intl` con namespaces `organizer.events`.
* `Accept-Language` propagado al backend para nombres de `EventType` y mensajes localizables.

---

## 9. API Contract Design

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| GET | `/api/v1/events` | Listar eventos propios del organizer | Sí (cookie HTTP-only) + rol `organizer` | Query: `status?`, `eventTypeCode?`, `eventDateFrom?`, `eventDateTo?`, `page?`, `pageSize?`, `sort?`. Header: `Accept-Language?`. | `200 { items: EventListItemDto[], pagination: { page, pageSize, totalItems, totalPages } }` | `401 Unauthorized` (sin sesión); `403 Forbidden` (rol no `organizer`). |

Notas:

* Filtros inválidos no provocan `400`; se descartan silenciosamente con log.
* `pageSize` se clampa a `[1, 100]`.

---

## 10. Database / Prisma Design

### Models Impacted

* `Event` (lectura).
* `EventType` (lectura, para validar `eventTypeCode`).

### Fields / Columns

* `Event.owner_id` (FK a `User`).
* `Event.status`.
* `Event.event_type_code`.
* `Event.event_date`.
* `Event.deleted_at`.
* `Event.currency`, `Event.name`, `Event.total_budget`, `Event.location_id` (proyección al DTO).

### Relations

* `Event.owner` (User).
* `Event.eventType` (EventType, opcional para etiqueta localizada).
* `Event.location` (opcional para card).

### Indexes

* Reutilizar `idx_events_owner_status_date (owner_id, status, event_date)` definido en `docs/18`. No se requiere nuevo índice.

### Constraints

* `Event.owner_id NOT NULL` (C-004).
* `Event.deleted_at` nullable (formalizado por US-012 / PB-P1-007).

### Migrations Impact

* Ninguna.

### Seed Impact

* No requiere cambios de seed. Reutiliza datos sembrados por PB-P0-014 y por las US del ciclo de vida (US-009..US-012).

---

## 11. AI / PromptOps Design

No aplica — esta historia no invoca IA.

---

## 12. Security & Authorization Design

### Authentication

* Middleware existente valida cookie HTTP-only de sesión; sin sesión devuelve 401.

### Authorization

* Guard `requireRole('organizer')`; cualquier otro rol recibe 403.
* `admin` recibe 403 explícito; no se hace fallback al endpoint admin.

### Ownership Rules

* Filtro forzado `owner_id = currentUser.id` en repository.
* No se acepta parámetro `ownerId` en query — ignorado si llega.

### Role Rules

* `organizer` 200, `vendor` 403, `admin` 403, anónimo 401.

### Negative Authorization Scenarios

* Cubiertos por NT-01, NT-02, NT-03 y AUTH-TS-01..AUTH-TS-04.

### Audit Requirements

* No requiere `AdminAction`. Logging operacional con correlation id es suficiente.

### Sensitive Data Handling

* No se devuelven campos sensibles (passwords, tokens, datos financieros restringidos). DTO proyectado.

---

## 13. Testing Strategy

### Unit Tests

* `ListMyEventsUseCase`: aplica filtros, descarta inválidos, mapea DTO, calcula paginación.
* `ListMyEventsQuerySchema`: defaults, clamps, tolerancia a inválidos.

### Integration Tests

* `EventRepository.findByOwnerPaginated`: query Prisma contra DB de test; valida orden, exclusión `deleted_at`, owner-scoping, índice utilizado (EXPLAIN opcional).

### API Tests

* TS-01..TS-05 con Supertest.
* NT-01..NT-07 con Supertest.

### E2E Tests

* TS-04 (estado vacío) y un happy path con filtros en Playwright contra entorno seed.

### Security Tests

* AUTH-TS-01..AUTH-TS-04, incluida la validación de aislamiento entre dos organizers seedados.

### Accessibility Tests

* axe sobre la página renderizada con lista y con estado vacío.
* Navegación con teclado para filtros y paginación.

### AI Tests

No aplica.

### Seed / Demo Tests

* Verificar que el seed cuenta con al menos un organizer con > 20 eventos para validar paginación en demo y con un organizer sin eventos para validar el estado vacío.

### CI Checks

* Pipeline existente: lint, typecheck, unit, integration, API, E2E (suite reducida en CI), accesibilidad.

---

## 14. Observability & Audit

### Logs

* `logger.info({ event: 'events.list', correlationId, ownerId, filtersApplied, filtersDropped, page, pageSize, totalItems, durationMs })`.

### Correlation ID

* Requerido (ADR-API-004). Middleware existente lo propaga.

### AdminAction

* No aplica.

### Error Tracking

* Errores no esperados al sink estándar.

### Metrics

* Reusar métrica genérica de latencia por endpoint para verificar NFR-PERF-001 (P95 < 1.5 s).

---

## 15. Seed / Demo Data Impact

### Seed Data Required

* Sin cambios. Verificar que el seed cubre los escenarios de demo (paginación, estado vacío, varios `status` y `eventTypeCode`).

### Demo Scenario Supported

* Organizer entra a `/organizer/events`, ve sus eventos próximos, aplica filtros y navega entre páginas.

### Reset / Isolation Notes

* Sin notas adicionales. Reusa el reset de seed existente.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| `management/artifacts/4-Product-Backlog-Prioritized.md` (PB-P1-008) | Traceability declarada `FR-EVENT-009..011 · UC-EVENT-005..006` no coincide con `FR-EVENT-007 · UC-EVENT-003`. | US-013 usa `FR-EVENT-007`, `UC-EVENT-003`, `BR-EVENT-002/011`, `BR-AUTH-009`. | Crear tarea de housekeeping para corregir el backlog. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Plan de consulta no utiliza `idx_events_owner_status_date` para filtros combinados. | Performance < NFR-PERF-001. | Validar `EXPLAIN` en test de integración; ajustar orden de columnas del `where` si fuese necesario. |
| `count` en paralelo bajo carga puede penalizar latencia. | P95 sube. | Mantener `$transaction` con `findMany + count`; medir en CI con dataset seed; considerar `keyset` solo si emerge problema (fuera de scope MVP). |
| Filtros inválidos silenciosos confunden al desarrollador frontend. | Bugs de integración. | Frontend siempre envía sólo enums conocidos; backend documenta los descartes en log; tests API explícitos. |
| Cambio de `event_type_code` por parte de admin invalida filtros activos en sesiones abiertas. | Filtros aplicados muestran vacío. | Frontend muestra mensaje "sin resultados" y reset; comportamiento aceptable en MVP. |

---

## 18. Implementation Guidance for Coding Agents

### Files or folders likely impacted

* Backend:
  * `apps/api/src/modules/events/use-cases/list-my-events.use-case.ts` (nuevo).
  * `apps/api/src/modules/events/repositories/event.repository.ts` (extender con `findByOwnerPaginated`).
  * `apps/api/src/modules/events/controllers/events.controller.ts` (añadir `list`).
  * `apps/api/src/modules/events/dtos/list-my-events.dto.ts` (nuevo).
  * `apps/api/src/modules/events/validators/list-my-events.schema.ts` (nuevo).
  * `apps/api/src/modules/events/routes.ts` (registrar `GET /api/v1/events`).
* Frontend:
  * `apps/web/app/[locale]/organizer/events/page.tsx` (nuevo).
  * `apps/web/components/events/EventList.tsx`, `EventFilters.tsx`, `EventCard.tsx`, `Pagination.tsx`, `EmptyState.tsx` (nuevos o reusar si existen).
  * `apps/web/lib/api/events.ts` (`eventsApi.list`).
  * `apps/web/lib/hooks/useEvents.ts` (TanStack Query).
  * `apps/web/messages/{es-LATAM,es-ES,pt,en}/organizer.json`.
* Tests:
  * `apps/api/tests/events/list-my-events.spec.ts`, `list-my-events.api.spec.ts`.
  * `apps/web/tests/e2e/organizer-events-list.spec.ts`.
  * `apps/web/tests/a11y/organizer-events-list.a11y.spec.ts`.

> Las rutas anteriores reflejan la convención EventFlow declarada en `docs/14` y `docs/15`. Si la estructura concreta del repo difiere, mantener los mismos roles y nombres semánticos.

### Recommended order of implementation

1. Backend: Zod schema → use case → repository method → controller → route.
2. Backend: tests unit + integration + API.
3. Frontend: api client → hook → componentes → página → estado vacío.
4. Frontend: i18n + accesibilidad.
5. E2E + accesibilidad + seguridad.

### Decisions that must not be reopened

* Paginación page-based (no cursor) según `docs/16`.
* `pageSize` default 20, máx 100.
* Owner-scoping en backend, no en frontend.
* Filtros inválidos no devuelven 400.
* No introducir endpoint admin desde esta US.

### What must not be implemented

* Búsqueda full-text, calendario, export, dashboard del evento (US-014).
* Nuevas migraciones o índices.
* IA o recomendaciones.

### Assumptions to preserve

* Orden por `event_date` ascendente con tiebreaker `created_at` descendente.
* `Accept-Language` con fallback `es-LATAM`.

---

## 19. Task Generation Notes

### Suggested task groups

* DB: validación de uso del índice existente (sin migración).
* BE: schema, use case, repository, controller, route, observability.
* API: contract test del envelope y de los códigos 200/401/403.
* FE: api client, hook, componentes, página, estado vacío, i18n.
* SEC: tests negativos 401/403 y aislamiento por owner.
* QA: API, integration, E2E, accesibilidad.
* SEED: verificación de cobertura del seed para los escenarios de demo (sin nuevos datos).
* DOC: housekeeping de traceability en PB-P1-008 (no bloqueante; se puede ejecutar después).

### Required QA tasks

* TS-01..TS-05, NT-01..NT-07, AUTH-TS-01..AUTH-TS-04, accesibilidad axe + teclado.

### Required security tasks

* Tests negativos y de aislamiento por owner (BR-AUTH-009).

### Required seed/demo tasks

* Verificación; no creación.

### Required documentation tasks

* Actualizar `docs/16` no requerido (endpoint ya documentado).
* Housekeeping de backlog (no bloqueante).

### Dependencies between tasks

* BE → API tests → FE.
* FE → E2E → accesibilidad.
* SEC paralelizable con QA API.

### Consolidated `tasks.md` for the parent backlog item

Recomendado generar `tasks.md` consolidado a nivel PB-P1-008 sólo cuando US-014 también tenga su technical spec.

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

La especificación cubre todas las áreas aplicables (backend, frontend, API, DB, seguridad, observabilidad, testing, accesibilidad, i18n, seed/demo) sin introducir scope creep ni reabrir decisiones. La única observación de alineación documental (traceability declarada en PB-P1-008) es housekeeping no bloqueante. El equipo de implementación tiene insumos suficientes para descomponer en tareas de desarrollo.
