# 🧾 User Story: Ver el dashboard de progreso de mi evento

## 🆔 Metadata

| Field              | Value                                |
| ------------------ | ------------------------------------ |
| ID                 | US-014                               |
| Epic               | EPIC-EVT-001 — Organizer Event Management |
| Backlog Item       | PB-P1-008 — Listado, filtros y dashboard del evento |
| Feature            | Dashboard del evento                 |
| Module / Domain    | Events                               |
| User Role          | Organizer                            |
| Priority           | Must Have                            |
| Status             | Approved                             |
| Owner              | Product Owner / Business Analyst     |
| Approved By        | PO/BA Review                         |
| Approval Date      | 2026-06-25                           |
| Ready for Development Tasks | Yes                         |
| Sprint / Milestone | MVP                                  |
| Created Date       | 2026-06-09                           |
| Last Updated       | 2026-06-25                           |

---

## 🎯 User Story

**As an** organizador autenticado y dueño del evento
**I want** ver un dashboard de mi evento con progreso de tareas, próximas tareas, presupuesto (planeado vs comprometido) y cotizaciones activas
**So that** pueda monitorear el avance y decidir qué acción tomar a continuación

---

## 🧠 Business Context

### Context Summary

El dashboard es el "cockpit" del organizador para un evento. Agrega:

* Resumen del evento.
* Progreso de tareas (% de tareas en estado `done`, excluyendo `skipped`, según BR-TASK-009 y PB-P1-019).
* Próximas tareas en ventana de 7 días.
* Presupuesto: `total_planned` y `total_committed` con warning si `committed > total` (BR-BUDGET-004).
* Cotizaciones activas (`QuoteRequest` y `Quote` no expiradas, no rechazadas).
* Estado de `BookingIntent` confirmados.

Es la pantalla más usada durante la planificación y la vista de demo principal del rol Organizer junto con el listado (US-013).

### Related Domain Concepts

* Event aggregator.
* Progreso de checklist (% done sobre tareas no `skipped`).
* Presupuesto comprometido vs planeado.
* Quotes activas y BookingIntents confirmados.

### Assumptions

* La estrategia de composición de datos (endpoint agregado nuevo vs composición en frontend con sub-endpoints existentes) queda como **decisión técnica abierta**, a resolverse en la Technical Specification. Ambas opciones cumplen con NFR-PERF-001 y NFR-PERF-003.
* Sub-endpoints existentes utilizables por el frontend si se opta por composición:
  * `GET /api/v1/events/:eventId` (detalle del evento).
  * `GET /api/v1/events/:eventId/tasks` (tareas; filtros para próximas 7 días).
  * `GET /api/v1/events/:eventId/budget` y `GET /api/v1/events/:eventId/budget/items`.
  * `GET /api/v1/events/:eventId/quote-requests`.
* TTI del dashboard < 3 s (NFR-PERF-003); cada sección renderiza de forma independiente con skeleton si una respuesta tarda.

### Dependencies

* US-009 (creación del evento).
* PB-P1-016 (HITL): habilita el flujo de aceptación que mueve tareas IA a `confirmed`, base del cálculo de progreso.
* PB-P1-018 / PB-P1-019: gestión manual de tareas y filtros/progreso del checklist (proveen el cálculo de `% done`).
* PB-P1-020 / PB-P1-023: presupuesto y sync atómico de `committed` por BookingIntent.
* EPIC-TASK-001, EPIC-BUD-001, EPIC-QR-001 como contextos relacionados.

---

## 🔗 Traceability

| Source                 | Reference                                                                  |
| ---------------------- | -------------------------------------------------------------------------- |
| FRD Requirement(s)     | FR-EVENT-008, FR-BUDGET-004                                                |
| Use Case(s)            | UC-EVENT-004 — Ver dashboard del evento                                    |
| Business Rule(s)       | BR-EVENT-009, BR-TASK-009, BR-BUDGET-004, BR-AUTH-009, BR-EVENT-002        |
| Permission Rule(s)     | Ownership: `Event.owner_id = currentUser.id` (SEC-POL-EVENT-001)           |
| Data Entity / Entities | Event, EventTask, Budget, BudgetItem, QuoteRequest, Quote, BookingIntent   |
| API Endpoint(s)        | Decisión técnica abierta (ver Assumptions): endpoint agregado nuevo o composición con sub-endpoints existentes |
| NFR Reference(s)       | NFR-PERF-001 (P95 API < 1.5 s), NFR-PERF-003 (TTI página < 3 s)            |
| Related ADR(s)         | ADR-FE-001 (Next.js + App Router), ADR-FE-002 (TanStack Query), ADR-API-001 (versionado), ADR-API-004 (correlation id) |
| Related Document(s)    | `docs/8-Use-Cases-Specification.md`, `docs/15-Frontend-Architecture-Design.md`, `docs/16-API-Design-Specification.md`, `docs/19-Security-and-Authorization-Design.md` |
| Backlog Item           | PB-P1-008                                                                  |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* Widgets configurables por el usuario.
* Exportación a PDF.
* Gráficos interactivos avanzados (charting libraries pesadas).
* Vista admin del dashboard (cubierta por US-016 / PB-P1-010, endpoint admin auditado).
* Mutaciones desde el dashboard (las cards enlazan a las pantallas dedicadas para tareas, presupuesto, quotes).
* Personalización por evento del orden o visibilidad de cards.

### Scope Notes

* Vista compuesta de cards con métricas esenciales.
* No introduce migraciones de base de datos ni cambios al modelo de dominio.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Carga del dashboard de evento `active`

**Given** un organizador autenticado dueño de un evento `active` con tareas, presupuesto y quotes
**When** entra a `/[locale]/organizer/events/:id`
**Then** ve, en la misma vista:

* Resumen del evento (nombre, `event_type`, `event_date`, `currency`, `location`).
* `% progreso` de tareas calculado como `done / (total - skipped)` (BR-TASK-009).
* Próximas tareas en ventana de 7 días (orden por fecha asc).
* Presupuesto: `total_planned` y `total_committed`.
* Lista de `QuoteRequest`/`Quote` activas.
* Indicador del `BookingIntent` confirmado, si existe.

### AC-02: Evento `draft` sin plan IA generado

**Given** un organizador dueño de un evento `draft` sin tareas ni plan IA
**When** carga el dashboard
**Then** ve CTAs específicos: "Generar plan IA" (enlaza a UC-AI-001) y "Crear primera tarea" (enlaza al CRUD manual de PB-P1-018).

### AC-03: Warning de overcommit del presupuesto

**Given** un evento donde `total_committed > total_planned`
**When** carga el dashboard
**Then** ve un warning visible en la card de presupuesto (BR-BUDGET-004).

### AC-04: Estado vacío parcial por sección

**Given** un evento con tareas y sin presupuesto cargado
**When** carga el dashboard
**Then** la card de tareas se renderiza con datos y la card de presupuesto muestra su estado vacío con CTA "Configurar presupuesto" (sin bloquear las demás cards).

### AC-05: Idioma y moneda

**Given** un organizador autenticado
**When** envía `Accept-Language: es-LATAM` (default), `es-ES`, `pt` o `en`
**Then** todas las etiquetas localizables se devuelven en el idioma soportado o fallback `es-LATAM`, y los montos se formatean con el `currency` del evento sin conversión automática.

---

## ⚠️ Edge Cases

### EC-01: Evento `cancelled`

**Given** un evento `cancelled`
**When** el dueño abre el dashboard
**Then** ve un banner informativo y todas las acciones de mutación quedan deshabilitadas (modo read-only); la información agregada se sigue mostrando para auditoría del propio organizador.

#### Handling

* Disable de CTAs de creación/edición; las cards se siguen renderizando.

### EC-02: Evento `completed` (cierre automático T+2)

**Given** un evento `completed` por el job AutoComplete (PB-P1-009)
**When** el dueño abre el dashboard
**Then** ve un banner "Evento completado" y modo read-only análogo a EC-01.

### EC-03: Sección lenta o caída

**Given** una sección del dashboard tarda > 800 ms o falla
**When** carga la página
**Then** se muestra skeleton mientras carga y, ante error de una sola sección, se muestra un mensaje localizado con `Retry` en esa card sin bloquear el resto.

### EC-04: Evento ajeno o inexistente

**Given** un organizador autenticado que solicita un `eventId` de otro organizador o inexistente
**When** llega al endpoint o entra a la URL
**Then** el backend responde `404 Not Found` por política IDOR (`docs/19` §política dominante; SEC-POL-EVENT-001).

---

## 🚫 Validation Rules

| ID    | Rule                            | Message / Behavior                     |
| ----- | ------------------------------- | -------------------------------------- |
| VR-01 | `eventId` es UUID válido        | `400` si no es UUID                    |
| VR-02 | `eventId` pertenece al usuario  | `404` si no es propio (política IDOR)  |
| VR-03 | Ventana de "próximas tareas"    | Default 7 días desde "hoy" del servidor |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                  |
| ------ | ------------------------------------------------------------------------------------- |
| SEC-01 | Sólo el `owner` (`Event.owner_id = currentUser.id`) accede al dashboard (BR-EVENT-002, SEC-POL-EVENT-001). |
| SEC-02 | Vendor → `403 Forbidden`.                                                             |
| SEC-03 | Anónimo → `401 Unauthorized`.                                                         |
| SEC-04 | Admin no usa este flujo; vista admin auditada vive en US-016 / PB-P1-010 (`/admin/events/:id`). En MVP el admin recibe `403` desde este endpoint para evitar evasión del audit log. |
| SEC-05 | Evento ajeno o inexistente → `404` (política IDOR, no `403`).                         |

### Negative Authorization Scenarios

* Otro organizador → `404` (no `403`).
* Vendor → `403`.
* Admin → `403` (debe usar el endpoint admin auditado de US-016).
* Anónimo → `401`.

---

## 🤖 AI Behavior

This story does not invoke AI directly.

### AI Involvement

* AI Feature: None
* Provider Layer: Not applicable
* Human Validation Required: Not applicable
* Persist AIRecommendation: No
* Fallback Required: Not applicable

### AI Input

* Not applicable for this story.

### AI Output

* Not applicable for this story.

### Human-in-the-loop Rules

* Not applicable for this story. (El dashboard surface tareas confirmadas que dependen de HITL implementado en PB-P1-016, pero esta US no introduce HITL nuevo).

### AI Error / Fallback Behavior

* Not applicable for this story.

---

## 🎨 UX / UI Notes

| Area                | Notes                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------- |
| Screen / Route      | `/[locale]/organizer/events/:id`                                                       |
| Main UI Pattern     | Dashboard de cards: Resumen, Progreso de tareas, Próximas tareas, Presupuesto, Quotes activas, Booking confirmado |
| Primary Action      | "Generar plan IA" (cuando aplica)                                                      |
| Secondary Actions   | "Ver tareas", "Ver presupuesto", "Solicitar cotización", "Editar evento"               |
| Empty State         | CTAs específicos por card (sin plan IA, sin tareas, sin presupuesto, sin quotes)        |
| Loading State       | Skeletons por sección, no bloqueantes entre sí                                          |
| Error State         | Banner por card con `Retry` localizado                                                 |
| Success State       | Dashboard completo                                                                     |
| Accessibility Notes | Estructura semántica con `<main>` y `<section aria-labelledby>`; foco visible; cards navegables por teclado; relaciones encabezado-contenido `aria-describedby` cuando aplique |
| Responsive Notes    | Mobile-first; stack vertical en mobile; grid de 2-3 columnas en desktop                 |
| i18n Notes          | 4 locales: `es-LATAM` (default), `es-ES`, `pt`, `en`. Formato de números/montos por locale |
| Currency Notes      | Mostrar montos en la moneda del evento; sin conversión automática (guardrail MVP)       |

---

## 🛠 Technical Notes

### Frontend

* Route / Page:

  * `/[locale]/organizer/events/:id` (Client Component dentro del layout `organizer`).
* Components:

  * `EventDashboard` (orquesta queries y layout).
  * `EventSummaryCard`, `ProgressCard`, `UpcomingTasksCard`, `BudgetCard`, `ActiveQuotesCard`, `BookingIntentCard`.
  * `CardSkeleton`, `CardErrorBanner`, `EmptyCard`.
* State Management:

  * TanStack Query (ADR-FE-002), una query por card si se opta por composición; una sola query si se opta por endpoint agregado.
  * `queryKey: ['event', eventId, '<section>']`.
* Forms: No aplica.
* API Client:

  * Dependiente de la decisión técnica abierta (ver Assumptions y Traceability).

### Backend

* Use Case / Service:

  * `GetEventDashboardUseCase` (sólo si se opta por endpoint agregado); de lo contrario, los use cases por sub-endpoint ya existen.
* Controller / Route:

  * Decisión técnica abierta.
* Authorization Policy:

  * Ownership middleware `SEC-POL-EVENT-001` aplica tanto al endpoint agregado como a cada sub-endpoint.
* Validation:

  * `eventId` como UUID; `404` si no pertenece al usuario.
* Transaction Required:

  * No (solo lectura).

### Database

* Main Tables:

  * `events`, `event_tasks`, `budgets`, `budget_items`, `quote_requests`, `quotes`, `booking_intents`.
* Constraints:

  * Ownership por `Event.owner_id`.
* Index Considerations:

  * Reutilizar índices existentes por `event_id` en cada tabla (`docs/18`). No se requiere migración.

### API

| Method | Endpoint                                                    | Purpose                                            |
| ------ | ----------------------------------------------------------- | -------------------------------------------------- |
| (TBD)  | Decisión técnica abierta — agregado vs composición          | Datos del dashboard del evento                     |

Opciones explícitas a evaluar en la Technical Specification:

* (a) Nuevo endpoint agregado `GET /api/v1/events/:eventId/dashboard` (un solo round-trip).
* (b) Composición frontend usando los sub-endpoints existentes: `/events/:eventId`, `/events/:eventId/tasks?upcomingDays=7`, `/events/:eventId/budget`, `/events/:eventId/quote-requests?status=active`.

### Observability / Audit

* Correlation ID Required: Yes (ADR-API-004).
* Log Event Required: No para acceso normal; sí para errores y para acceso denegado por ownership.
* AdminAction Required: No (admin usa US-016 con su propio audit log).
* AIRecommendation Required: No.

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                              | Type        |
| ----- | ----------------------------------------------------- | ----------- |
| TS-01 | Dashboard carga datos agregados del evento `active`   | Integration |
| TS-02 | Estado por sección: vacíos y CTAs                     | E2E         |
| TS-03 | Skeletons individuales mientras cargan secciones      | E2E         |
| TS-04 | Warning de overcommit visible cuando aplica           | Integration |
| TS-05 | `Accept-Language` propaga locale en etiquetas y formato monetario | API |
| TS-06 | TTI del dashboard < 3 s en condiciones de demo (NFR-PERF-003) | E2E (medición) |

### Negative Tests

| ID    | Scenario                                  | Expected Result          |
| ----- | ----------------------------------------- | ------------------------ |
| NT-01 | Evento ajeno o inexistente                | `404`                    |
| NT-02 | Vendor                                    | `403`                    |
| NT-03 | Admin                                     | `403` (usar `/admin/events/:id`) |
| NT-04 | Anónimo                                   | `401`                    |
| NT-05 | `eventId` no es UUID                      | `400`                    |
| NT-06 | Evento `cancelled` o `completed`          | `200` con modo read-only |
| NT-07 | Sección caída no bloquea las demás        | Card con error + `Retry`, resto operativo |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario                          | Expected Result |
| ---------- | --------------------------------- | --------------- |
| AUTH-TS-01 | Dueño del evento                  | `200`           |
| AUTH-TS-02 | Otro organizador                  | `404`           |
| AUTH-TS-03 | Vendor                            | `403`           |
| AUTH-TS-04 | Admin                             | `403`           |
| AUTH-TS-05 | Anónimo                           | `401`           |

### Accessibility Tests

* Estructura semántica con `<main>` y `<section aria-labelledby>`.
* Navegación por teclado entre cards y CTAs.
* axe-core sin violaciones críticas.

---

## 📊 Business Impact

| Field               | Value                                                                          |
| ------------------- | ------------------------------------------------------------------------------ |
| KPI Affected        | Engagement, tiempo en producto, conversiones internas                          |
| Expected Impact     | Cockpit central del organizador                                                 |
| Success Criteria    | TTI < 3 s (NFR-PERF-003) en demo; P95 < 1.5 s en cada llamada (NFR-PERF-001)   |
| Academic Demo Value | Vista principal usada durante la demo                                          |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Página `/[locale]/organizer/events/:id` con layout de cards.
* TanStack Query por card (o una sola query, según decisión técnica).
* Skeleton, empty y error por card.
* i18n para 4 locales y formato monetario.

### Potential Backend Tasks

* (a) `GetEventDashboardUseCase` + endpoint agregado, o (b) consumir sub-endpoints existentes.
* Validación de `eventId` UUID + ownership 404 (IDOR).

### Potential Database Tasks

* Verificar uso de índices `event_id` en `event_tasks`, `budgets`, `budget_items`, `quote_requests`, `quotes`, `booking_intents`. Sin migración.

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* Integration + E2E + accesibilidad + autorización + medición TTI.

### Potential DevOps / Config Tasks

* Not applicable for this story.

---

## ✅ Definition of Ready

* [x] Rol claro.
* [x] Goal/valor claros.
* [x] FRD/UC/BR enlazados (corregidos).
* [x] Permisos identificados (404 IDOR, admin 403, anónimo 401).
* [x] Entidades listadas.
* [x] AC en GWT.
* [x] Edge cases documentados (incluye `completed`).
* [x] Validación clara.
* [x] Out of Scope explícito.
* [x] Dependencias conocidas.
* [x] UX states identificados.
* [x] API documentada como decisión técnica abierta a resolver en la Technical Specification.
* [x] Tests definidos.
* [ ] PO/BA validó.

---

## 🏁 Definition of Done

* [ ] Dashboard operativo en `/[locale]/organizer/events/:id`.
* [ ] Datos agregados correctos (progreso, próximas tareas, presupuesto, quotes, booking).
* [ ] Warning de overcommit funciona (BR-BUDGET-004).
* [ ] Modo read-only para `cancelled` y `completed`.
* [ ] Tests integration, E2E, accesibilidad y autorización verdes.
* [ ] TTI < 3 s en demo (NFR-PERF-003) y P95 < 1.5 s en cada llamada (NFR-PERF-001).
* [ ] i18n para 4 locales con formato monetario por evento.
* [ ] PO valida.

---

## 📝 Notes

* Decisión técnica abierta a resolverse en la Technical Specification: endpoint agregado nuevo vs composición frontend con sub-endpoints existentes. Ambas opciones son consistentes con ADR-FE-002 y los NFRs aplicables.
* Documentation Alignment Required (no bloqueante): la traceability declarada en PB-P1-008 (`FR-EVENT-009..011 · UC-EVENT-005..006`) no coincide con los IDs reales de listado (`FR-EVENT-007 · UC-EVENT-003`) ni de dashboard (`FR-EVENT-008 · UC-EVENT-004`); se recomienda corregir el backlog en una tarea separada de housekeeping (ya planificada por US-013).
