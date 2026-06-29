# 🧾 User Story: Listar y filtrar mis eventos

## 🆔 Metadata

| Field              | Value                                |
| ------------------ | ------------------------------------ |
| ID                 | US-013                               |
| Epic               | EPIC-EVT-001 — Organizer Event Management |
| Backlog Item       | PB-P1-008 — Listado, filtros y dashboard del evento |
| Feature            | Listado y filtrado de eventos propios |
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

**As an** organizador autenticado
**I want** listar y filtrar mis eventos por estado y tipo
**So that** ubicar rápidamente el evento sobre el que necesito trabajar

---

## 🧠 Business Context

### Context Summary

El listado es la página de entrada del rol Organizer. Debe mostrar los eventos propios no eliminados, paginados, con filtros server-side por `status` y `eventTypeCode`, y ordenamiento por fecha del evento con los próximos primero. Es la base para acciones posteriores (editar US-010, cambiar estado, soft delete US-012, crear US-009).

### Related Domain Concepts

* Event listing y paginación page-based.
* Filtros server-side con validación tolerante.
* Aislamiento por owner.

### Assumptions

* Se ocultan eventos con `deleted_at IS NOT NULL`.
* Paginación page-based (ver `docs/16-API-Design-Specification.md`): `page` default 1, `pageSize` default 20, máximo 100.
* Orden por defecto: `event_date` ascendente (próximos primero) — interpretación de "fecha próxima"; en caso de empate, desempate por `created_at` descendente.

### Dependencies

* US-009 (creación de eventos).
* US-010 (edición de eventos).
* US-011 (cancelación de eventos).
* US-012 (soft delete de drafts; provee `deleted_at`).
* PB-P1-007 (foundation Organizer Event Management).

---

## 🔗 Traceability

| Source                 | Reference                                                  |
| ---------------------- | ---------------------------------------------------------- |
| FRD Requirement(s)     | FR-EVENT-007                                               |
| Use Case(s)            | UC-EVENT-003 — Listar eventos propios                      |
| Business Rule(s)       | BR-EVENT-002, BR-EVENT-011, BR-AUTH-009                    |
| Permission Rule(s)     | Ownership: `Event.owner_id = currentUser.id`               |
| Data Entity / Entities | Event, EventType                                           |
| API Endpoint(s)        | GET /api/v1/events                                         |
| NFR Reference(s)       | NFR-PERF-001 (P95 < 1.5 s), NFR-PERF-005 (paginación)      |
| Related ADR(s)         | ADR-API-001 (versionado /api/v1), ADR-API-004 (correlation id) |
| Related Document(s)    | `docs/16-API-Design-Specification.md`, `docs/18-Database-Physical-Design.md` |
| Backlog Item           | PB-P1-008                                                   |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* Búsqueda full-text avanzada.
* Filtros por rango de presupuesto.
* Vista calendario.
* Export CSV/PDF.
* Listado admin global (cubierto por endpoint `/admin/events`, otra US).
* Compartir filtros guardados o vistas personalizadas.

### Scope Notes

* No introduce ningún endpoint nuevo además de `GET /api/v1/events`.
* No modifica el modelo de datos; reutiliza el índice ya definido en `docs/18`: `idx_events_owner_status_date (owner_id, status, event_date)`.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Listado por defecto

**Given** un organizador autenticado con varios eventos no eliminados
**When** hace `GET /api/v1/events` sin filtros
**Then** recibe `200 OK` con la primera página (`page=1`, `pageSize=20`), sólo sus eventos (`owner_id = currentUser.id`), excluyendo `deleted_at IS NOT NULL`, ordenados por `event_date` ascendente (próximos primero) y envelope `pagination { page, pageSize, totalItems, totalPages }`.

### AC-02: Filtro combinado por estado y tipo

**Given** un organizador con eventos de distintos `status` y `eventTypeCode`
**When** invoca `GET /api/v1/events?status=active&eventTypeCode=wedding`
**Then** la respuesta sólo incluye eventos con `status=active` y `eventTypeCode=wedding`, manteniendo el orden y la paginación de AC-01.

### AC-03: Paginación explícita

**Given** un organizador con más de 20 eventos
**When** invoca `GET /api/v1/events?page=2&pageSize=20`
**Then** recibe la segunda página y los metadatos `pagination` reflejan correctamente `page=2`, `totalItems` y `totalPages`.

### AC-04: Estado vacío

**Given** un organizador autenticado sin eventos no eliminados
**When** abre `/[locale]/organizer/events`
**Then** la UI muestra el estado vacío con el CTA "Crear mi primer evento" que enlaza al wizard de US-009.

### AC-05: Idioma de la respuesta

**Given** un organizador autenticado
**When** envía `Accept-Language: es-LATAM` (default), `es-ES`, `pt` o `en`
**Then** las etiquetas localizables de la respuesta (mensajes de error, nombres de tipo de evento) se devuelven en el idioma soportado o en el fallback `es-LATAM` si no está disponible.

---

## ⚠️ Edge Cases

### EC-01: Filtros inválidos en query string

**Given** el organizador envía `status=foo` o `eventTypeCode=desconocido`
**When** se procesa el request
**Then** el backend ignora los filtros inválidos, responde `200 OK` y registra los filtros descartados en el log con `correlationId`.

#### Handling

* No se devuelve `400`.
* Se loguea: `filters.dropped = [{ key, value, reason }]`.

### EC-02: `pageSize` fuera de rango

**Given** el organizador envía `pageSize=0`, `pageSize=500` o `pageSize=abc`
**When** se procesa el request
**Then** el backend aplica el default `pageSize=20` cuando es inválido y aplica el máximo `pageSize=100` cuando excede ese valor, respondiendo `200 OK`.

### EC-03: `page` fuera de rango

**Given** el organizador solicita una página posterior a `totalPages`
**When** se procesa el request
**Then** el backend responde `200 OK` con `items=[]`, `page` igual al valor solicitado y los metadatos correctos.

---

## 🚫 Validation Rules

| ID    | Rule                                       | Message / Behavior                          |
| ----- | ------------------------------------------ | ------------------------------------------- |
| VR-01 | `status` ∈ enum válido del dominio Event   | Ignorar silenciosamente si inválido; log    |
| VR-02 | `eventTypeCode` ∈ EventTypes activos       | Ignorar silenciosamente si inválido; log    |
| VR-03 | `page` numérico ≥ 1                        | Default 1 si inválido                       |
| VR-04 | `pageSize` numérico, 1 ≤ value ≤ 100       | Default 20 si inválido; clamp a 100 si > 100 |
| VR-05 | `sort` ∈ campos permitidos (`event_date`)  | Default `event_date asc` si inválido o ausente |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                |
| ------ | ------------------------------------------------------------------- |
| SEC-01 | Sólo eventos donde `Event.owner_id = currentUser.id` (BR-EVENT-002, BR-AUTH-009). |
| SEC-02 | Filtra `deleted_at IS NULL` en todos los casos.                     |
| SEC-03 | El endpoint exige autenticación válida; sin sesión devuelve `401`.  |
| SEC-04 | Sólo el rol `organizer` puede invocar `/api/v1/events`; `vendor` recibe `403`. |
| SEC-05 | El rol `admin` no usa este endpoint; debe usar `/admin/events` (fuera de scope). |

### Negative Authorization Scenarios

* Vendor autenticado → `403 Forbidden`.
* Usuario anónimo → `401 Unauthorized`.
* Admin que intenta usar este endpoint → `403 Forbidden` (debe usar `/admin/events`).

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

* Not applicable for this story.

### AI Error / Fallback Behavior

* Not applicable for this story.

---

## 🎨 UX / UI Notes

| Area                | Notes                                                  |
| ------------------- | ------------------------------------------------------ |
| Screen / Route      | `/[locale]/organizer/events`                           |
| Main UI Pattern     | Lista de cards con barra de filtros (top en mobile, lateral en desktop) |
| Primary Action      | "Crear nuevo evento" (link a wizard US-009)            |
| Secondary Actions   | Filtros `status`, `eventTypeCode`; paginación          |
| Empty State         | "Aún no tienes eventos. Crea el primero." + CTA crear  |
| Loading State       | Skeleton de cards                                      |
| Error State         | Banner con retry                                       |
| Success State       | Listado de cards con paginación visible                |
| Accessibility Notes | Filtros operables con teclado; paginación con `aria-current` y `aria-label`; foco visible |
| Responsive Notes    | Cards verticales en mobile; grid en desktop            |
| i18n Notes          | 4 locales: `es-LATAM` (default), `es-ES`, `pt`, `en`   |
| Currency Notes      | Mostrar moneda por evento según campo del propio Event |

---

## 🛠 Technical Notes

### Frontend

* Route / Page:

  * `/[locale]/organizer/events`
* Components:

  * `EventList`, `EventFilters`, `EventCard`, `Pagination`, `EmptyState`
* State Management:

  * TanStack Query `useEvents({ status, eventTypeCode, page, pageSize })`
* Forms:

  * Filtros sincronizados con query params del router
* API Client:

  * `eventsApi.list(filters)` mapea a `GET /api/v1/events`

### Backend

* Use Case / Service:

  * `ListMyEventsUseCase`
* Controller / Route:

  * `GET /api/v1/events`
* Authorization Policy:

  * Owner-scoped: filtro forzado `where owner_id = currentUser.id`
* Validation:

  * Query params con Zod, tolerante: parsea, ignora inválidos, no devuelve `400`
* Transaction Required:

  * No (solo lectura)

### Database

* Main Tables:

  * `events`, `event_types`
* Constraints:

  * `deleted_at IS NULL`
* Index Considerations:

  * Reutilizar índice existente `idx_events_owner_status_date (owner_id, status, event_date)` definido en `docs/18-Database-Physical-Design.md`.

### API

| Method | Endpoint                          | Purpose                          |
| ------ | --------------------------------- | -------------------------------- |
| GET    | `/api/v1/events`                  | Listar eventos propios del organizer |

Query params soportados (ver `docs/16-API-Design-Specification.md`):

* `status`
* `eventTypeCode`
* `eventDateFrom`
* `eventDateTo`
* `page` (default 1)
* `pageSize` (default 20, max 100)
* `sort` (default `event_date` asc)

Respuesta: lista de eventos + envelope `pagination { page, pageSize, totalItems, totalPages }`.

### Observability / Audit

* Correlation ID Required: Yes (ADR-API-004).
* Log Event Required: No para acceso normal; sí para errores y para filtros descartados.
* AdminAction Required: No.
* AIRecommendation Required: No.

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                  | Type        |
| ----- | ----------------------------------------- | ----------- |
| TS-01 | Listado paginado por defecto              | API         |
| TS-02 | Filtros combinados `status` + `eventTypeCode` | API     |
| TS-03 | Paginación explícita (`page=2`)           | API         |
| TS-04 | Estado vacío con CTA                      | E2E         |
| TS-05 | `Accept-Language` propaga locale          | API         |

### Negative Tests

| ID    | Scenario                                | Expected Result          |
| ----- | --------------------------------------- | ------------------------ |
| NT-01 | Vendor llama al endpoint                | `403 Forbidden`          |
| NT-02 | Anónimo llama al endpoint               | `401 Unauthorized`       |
| NT-03 | Admin llama a `/api/v1/events`          | `403 Forbidden`          |
| NT-04 | Filtros inválidos                       | `200` con filtros ignorados y log |
| NT-05 | `pageSize` fuera de rango               | `200` aplicando default/clamp |
| NT-06 | `page` mayor a `totalPages`             | `200` con `items=[]`     |
| NT-07 | Eventos con `deleted_at` no presentes   | `200` excluidos del resultado |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario                          | Expected Result |
| ---------- | --------------------------------- | --------------- |
| AUTH-TS-01 | Organizer (sólo ve propios)       | `200`           |
| AUTH-TS-02 | Vendor                            | `403`           |
| AUTH-TS-03 | Anónimo                           | `401`           |
| AUTH-TS-04 | Aislamiento: organizer A no ve eventos de organizer B | `200` sin items de B |

### Accessibility Tests

* Filtros accesibles con teclado y `aria-label`.
* Paginación con `aria-current="page"` en la página activa.
* Foco visible en todos los controles interactivos.

---

## 📊 Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | Time-to-Find Event                                   |
| Expected Impact     | Mejora navegación principal del rol Organizer        |
| Success Criteria    | P95 < 1.5 s (NFR-PERF-001) bajo condiciones de demo  |
| Academic Demo Value | Vista principal del rol Organizer; pieza demo crítica |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Página `/[locale]/organizer/events` con `EventList` + `EventFilters` + `EventCard`.
* Paginación y sincronización con query params.
* Estado vacío con CTA crear evento.
* i18n para 4 locales.

### Potential Backend Tasks

* `ListMyEventsUseCase` con parseo tolerante de filtros.
* Controller `GET /api/v1/events` con guard de rol.
* Esquema Zod para query params.

### Potential Database Tasks

* Verificar uso del índice `idx_events_owner_status_date`; no requiere migración nueva.

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* Tests API + E2E + accesibilidad + autorización.

### Potential DevOps / Config Tasks

* Not applicable for this story.

---

## ✅ Definition of Ready

* [x] Rol claro.
* [x] Goal/valor claros.
* [x] FRD/UC/BR enlazados (corregidos).
* [x] Permisos identificados.
* [x] Entidades listadas.
* [x] AC en GWT.
* [x] Edge cases documentados.
* [x] Validación clara.
* [x] Out of Scope explícito.
* [x] Dependencias conocidas.
* [x] UX states identificados.
* [x] API definida con referencia a `docs/16`.
* [x] Tests definidos.
* [ ] PO/BA validó.

---

## 🏁 Definition of Done

* [ ] Listado y filtros funcionales en `/[locale]/organizer/events`.
* [ ] Paginación operativa con envelope `pagination`.
* [ ] Aislamiento por owner validado por tests.
* [ ] NFR-PERF-001 verificado en demo (P95 < 1.5 s).
* [ ] Tests API, E2E, accesibilidad y autorización verdes.
* [ ] i18n cubierto para los 4 locales soportados.
* [ ] PO valida.

---

## 📝 Notes

* Paginación page-based con `pageSize=20` por defecto y máximo 100 (no es decisión abierta; ver `docs/16-API-Design-Specification.md`).
* Documentation Alignment Required (no bloqueante): la traceability declarada en PB-P1-008 (`FR-EVENT-009..011 · UC-EVENT-005..006`) no coincide con los IDs reales de listado/filtrado (`FR-EVENT-007`, `UC-EVENT-003`); se recomienda corregir el backlog en una tarea separada de housekeeping.
