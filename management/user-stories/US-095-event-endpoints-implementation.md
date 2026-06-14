# 🧾 User Story: Implementar endpoints EVENT del contrato REST

## 🆔 Metadata

| Field              | Value                                           |
| ------------------ | ----------------------------------------------- |
| ID                 | US-095                                         |
| Backlog Item       | PB-P0-004 — REST API Endpoints Foundation (Doc 16) |
| Epic               | EPIC-API-001 — REST API Contract               |
| Feature            | Endpoints Event                                |
| Module / Domain    | API / Event Planning                           |
| User Role          | System                                         |
| Priority           | Must Have (P0)                                 |
| Status             | Approved                                       |
| Owner              | Product Owner / Business Analyst               |
| Approved By        | PO/BA Review                                   |
| Approval Date      | 2026-06-12                                     |
| Ready for Development Tasks | Yes                                  |
| Sprint / Milestone | MVP                                            |
| Created Date       | 2026-06-09                                     |
| Last Updated       | 2026-06-12                                     |

---

## 🎯 User Story

**As a** sistema backend de EventFlow  
**I want** exponer los endpoints EVENT bajo `/api/v1` conforme al contrato REST de Doc 16  
**So that** el frontend, MSW y las pruebas de contrato puedan crear, listar, consultar, actualizar y cambiar el ciclo de vida de eventos propios con validación, ownership y reglas de negocio consistentes

---

## 🧠 Business Context

### Context Summary

US-095 implementa la base contractual de eventos dentro de PB-P0-004. Estos endpoints permiten que el frontend y los tests consuman un contrato estable para el workspace de planificación: crear eventos, listarlos con filtros, consultar detalle, actualizar datos permitidos y activar/cancelar eventos.

La historia no implementa la UI del wizard ni los flujos completos P1 de dashboard, tareas, presupuesto, admin o auto-completion job. Su valor es habilitar el contrato backend `/api/v1/events/*` alineado a Doc 16, usando la fundación de router, validación Zod, error envelope, correlation ID y middlewares de seguridad definidos en PB-P0-002/PB-P0-003.

### Related Domain Concepts

* `Event`
* `EventType`
* `Location`
* `User` / owner organizer
* `event_status`
* `currency_code`
* `language_code`
* Ownership / RBAC
* Pagination and filters

### Assumptions

* PB-P0-002 provee el backend Express/TypeScript modular.
* PB-P0-003 provee Zod validation, error envelope y correlation ID.
* El módulo `event-planning` existe o se crea como parte de la implementación técnica.
* El catálogo de `EventType`, `Location`, `CurrencyCode` y `LanguageCode` existe desde el esquema/seed base.
* Los endpoints de tareas, presupuesto, quotes, AI y admin se implementan en historias separadas.

### Dependencies

* PB-P0-002 — Backend Modular Monolith Bootstrap.
* PB-P0-003 — Backend Validation, Error Envelope & Logger.
* US-094 — Auth endpoints para sesión y `/users/me`.
* PB-P0-001 — Database Schema, Migrations & Constraints.
* ADR-API-001, ADR-API-002, ADR-API-003, ADR-API-004.
* ADR-SEC-001, ADR-SEC-003, ADR-SEC-006.
* ADR-TEST-001, ADR-TEST-004.

### PO/BA Decisions Applied

| Decision | Resolution |
| -------- | ---------- |
| P0 event endpoint scope | US-095 cubre endpoints `/api/v1/events/*` necesarios para el contrato REST foundation: create, list own, get detail, patch, activate and cancel. |
| Admin event read-only | `GET /api/v1/admin/events` y lectura admin auditada se reconocen en Doc 16/Doc 19, pero se mantienen como P1 por PB-P1-010 y no bloquean esta historia P0. |
| Auto-completion job | El cierre automatico T+2 es una regla de dominio vigente, pero el job programado pertenece a PB-P1-009; US-095 sólo debe no impedir esa regla futura. |
| Event lifecycle route contract | US-095 usa las rutas canónicas de Doc 16: `POST /api/v1/events/:eventId/activate` y `POST /api/v1/events/:eventId/cancel`. Las referencias de Doc 14 a `POST /:id/status` y `DELETE /:id` requieren alineación documental y no se implementan como parte de esta historia. |
| Currency immutability | `currencyCode` se acepta sólo en create y queda prohibido en PATCH; cualquier intento de update debe responder `409 CURRENCY_IMMUTABLE` o validación equivalente. |
| Ownership source of truth | Sólo `organizer` owner puede mutar eventos; backend aplica AuthN + RBAC + ownership antes de ejecutar use cases. |

---

## 🔗 Traceability

| Source                 | Reference |
| ---------------------- | --------- |
| FRD Requirement(s)     | FR-EVENT-001, FR-EVENT-002, FR-EVENT-003, FR-EVENT-004, FR-EVENT-005, FR-EVENT-006, FR-EVENT-007, FR-EVENT-011, FR-EVENT-013, FR-EVENT-014, FR-AUTH-010 |
| Use Case(s)            | UC-EVENT-001, UC-EVENT-002, UC-EVENT-003, UC-EVENT-005, UC-EVENT-006, UC-BUDGET-004, UC-I18N-002 |
| Business Rule(s)       | BR-EVENT-001, BR-EVENT-002, BR-EVENT-003, BR-EVENT-004, BR-EVENT-005, BR-EVENT-006, BR-EVENT-007, BR-EVENT-008, BR-EVENT-010, BR-EVENT-011, BR-EVENTTYPE-001, BR-AUTH-009 |
| Permission Rule(s)     | SEC-POL-EVENT-001, SEC-POL-EVENT-003; organizer owner only for mutation |
| Data Entity / Entities | Event, EventType, Location, User |
| API Endpoint(s)        | POST `/api/v1/events`; GET `/api/v1/events`; GET `/api/v1/events/:eventId`; PATCH `/api/v1/events/:eventId`; POST `/api/v1/events/:eventId/activate`; POST `/api/v1/events/:eventId/cancel` |
| NFR Reference(s)       | NFR-SEC-001, NFR-SEC-002, NFR-SEC-003, NFR-SEC-007, NFR-TEST-001, NFR-TEST-004, NFR-TEST-005, NFR-OBS-003, NFR-OBS-005, NFR-OBS-006, NFR-DATA-001 |
| Related ADR(s)         | ADR-ARCH-001, ADR-BE-001, ADR-API-001, ADR-API-002, ADR-API-003, ADR-API-004, ADR-SEC-001, ADR-SEC-003, ADR-SEC-006, ADR-TEST-001, ADR-TEST-004 |
| Related Document(s)    | /docs/4, /docs/8, /docs/8.1, /docs/9, /docs/10, /docs/14, /docs/16, /docs/18, /docs/19, /docs/20, /docs/22, /management/artifacts/4-Product-Backlog-Prioritized.md |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope.
* MVP Relevance: Must Have (P0).
* Parent Backlog Item: PB-P0-004.

### Explicitly Out of Scope

* Frontend event wizard/dashboard UI.
* Event tasks endpoints.
* Budget endpoints and budget item CRUD.
* QuoteRequest / Quote / BookingIntent endpoints.
* AI endpoints under `/events/:eventId/ai/*`.
* Admin event list/detail endpoints and `AdminAction` audit for admin reads.
* Auto-completion job T+2.
* Hard delete behavior beyond documenting that it is not part of this contract story.
* Multi-collaborator event access.
* Payments, contracts, chat, WhatsApp, RAG or autonomous AI decisions.

### Scope Notes

* This story implements API foundation, not the full product workflows in P1 stories.
* It must enforce ownership and event business rules server-side even if frontend guards exist.
* It must not expose event data across organizers.
* It must not allow currency updates after creation.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Organizer creates event

**Given** an authenticated `organizer` with valid session  
**When** they call `POST /api/v1/events` with valid `eventTypeCode`, `eventDate`, `guestsCount`, `locationId`, `estimatedBudget`, `currencyCode`, `languageCode` and optional `name`/`notes`  
**Then** the backend validates the DTO with Zod, creates an `Event` owned by the organizer with `status='draft'`, `autoCompleted=false`, immutable `currencyCode`, and responds `201` with the standard envelope and `EventResponseDto`.

### AC-02: Organizer lists own events with filters

**Given** an authenticated `organizer` with multiple events  
**When** they call `GET /api/v1/events` with optional `status`, `eventTypeCode`, `eventDateFrom`, `eventDateTo`, `page`, `pageSize` and `sort`  
**Then** the backend returns only that organizer's events, applies validated filters, defaults to `eventDate:asc`, and returns pagination metadata in the standard envelope.

### AC-03: Organizer gets own event detail

**Given** an authenticated `organizer` owns an event  
**When** they call `GET /api/v1/events/:eventId`  
**Then** the backend verifies ownership and returns `200` with `EventResponseDto` without exposing events from other organizers.

### AC-04: Organizer updates allowed event fields

**Given** an authenticated organizer owns an event that is not terminal  
**When** they call `PATCH /api/v1/events/:eventId` with valid editable fields excluding `currencyCode`  
**Then** the backend updates only allowed fields and returns `200` with the updated `EventResponseDto`.

### AC-05: Currency cannot be changed after creation

**Given** an existing event with `currencyCode` set at creation  
**When** the owner calls `PATCH /api/v1/events/:eventId` including `currencyCode`  
**Then** the backend rejects the request with `409 CURRENCY_IMMUTABLE` or equivalent business-rule error and persists no currency change.

### AC-06: Organizer activates a draft event

**Given** an authenticated organizer owns an event in `draft`  
**When** they call `POST /api/v1/events/:eventId/activate`  
**Then** the backend validates the state transition, updates status to `active`, and returns `200` with the updated event.

### AC-07: Organizer cancels an eligible event

**Given** an authenticated organizer owns an event that is not `completed` or `cancelled`  
**When** they call `POST /api/v1/events/:eventId/cancel`  
**Then** the backend validates the transition, updates status to `cancelled`, and returns `200` with the updated event.

### AC-08: Event API uses shared REST contract

**Given** any endpoint in this story  
**When** it returns success or error  
**Then** it uses `/api/v1`, standard response/error envelope, Zod validation, `X-Correlation-Id`, secure error handling, and logs without secrets or private cross-user data.

---

## ⚠️ Edge Cases

### EC-01: Anonymous request to events

**Given** no valid session cookie  
**When** the caller accesses any `/api/v1/events/*` endpoint  
**Then** the backend responds `401` before domain logic executes.

#### Handling

* Apply auth middleware before controller use case execution.

### EC-02: Wrong role attempts event mutation

**Given** an authenticated `vendor` or unsupported role  
**When** they call `POST`, `PATCH`, `activate` or `cancel` for events  
**Then** the backend responds `403` and does not create or mutate an event.

#### Handling

* Require `organizer` for event mutation endpoints.

### EC-03: Organizer accesses another organizer's event

**Given** organizer A is authenticated and event belongs to organizer B  
**When** organizer A calls `GET`, `PATCH`, `activate` or `cancel` for that event  
**Then** the backend denies access with `403` or masked `404` according to the error policy.

#### Handling

* Ownership check in repository/use case boundary.
* Do not leak whether the event exists.

### EC-04: Invalid event type, currency, language or location

**Given** request payload references unsupported enum values or unknown `locationId`  
**When** the endpoint validates the request  
**Then** the backend returns validation or not-found error and does not persist changes.

#### Handling

* Validate enum values in Zod.
* Validate referenced catalog/location existence in use case.

### EC-05: Invalid event state transition

**Given** an event is already `completed` or `cancelled`  
**When** the owner attempts `activate`, `cancel` or update not allowed for terminal states  
**Then** the backend returns `422 BUSINESS_RULE_VIOLATION` or equivalent and leaves state unchanged.

#### Handling

* Use `EventLifecycleService` or equivalent domain policy.

### EC-06: Pagination or filter query invalid

**Given** invalid `page`, `pageSize`, date range or sort parameter  
**When** `GET /api/v1/events` receives the query  
**Then** the backend returns `422 VALIDATION_ERROR` with field-level details.

#### Handling

* Zod schema for query params.
* Enforce maximum `pageSize`.

---

## 🚫 Validation Rules

| ID    | Rule | Message / Behavior |
| ----- | ---- | ------------------ |
| VR-01 | `eventTypeCode` required and one of `wedding`, `xv`, `baptism`, `baby_shower`, `birthday`, `corporate` | `422 VALIDATION_ERROR` |
| VR-02 | `eventDate` required in `YYYY-MM-DD` format | `422 VALIDATION_ERROR` |
| VR-03 | `guestsCount` required and `>= 1` | `422 VALIDATION_ERROR` |
| VR-04 | `locationId` required and must reference an existing location | `404` or validation error |
| VR-05 | `estimatedBudget` required and `>= 0` decimal string | `422 VALIDATION_ERROR` |
| VR-06 | `currencyCode` required on create and supported by enum | `422 VALIDATION_ERROR` |
| VR-07 | `currencyCode` forbidden on PATCH | `409 CURRENCY_IMMUTABLE` or equivalent |
| VR-08 | `languageCode` required and one of `es-LATAM`, `es-ES`, `pt`, `en` | `422 VALIDATION_ERROR` |
| VR-09 | `status`, `ownerId`, `completedAt`, `autoCompleted`, `isSeed`, `createdAt`, `updatedAt` are not client-editable | Reject via strict schema |
| VR-10 | List filters and pagination query params must be valid and bounded | `422 VALIDATION_ERROR` |

---

## 🔐 Authorization & Security Rules

| ID     | Rule |
| ------ | ---- |
| SEC-01 | All `/api/v1/events/*` endpoints require a valid authenticated session. |
| SEC-02 | Only `organizer` can create, list own, update, activate or cancel events in this P0 story. |
| SEC-03 | Organizer can only access events where `event.ownerId == session.userId`. |
| SEC-04 | Vendor cannot access private event detail through event endpoints. Vendor event brief access belongs to QuoteRequest flows, not this story. |
| SEC-05 | Admin read-only event access is out of scope for US-095 and belongs to PB-P1-010/US-016. |
| SEC-06 | Backend is the authorization source of truth; frontend route guards are not sufficient. |
| SEC-07 | Error handling must not leak another organizer's event existence. |
| SEC-08 | Logs must include correlation ID and redact private payloads where required. |

### Negative Authorization Scenarios

* Anonymous calls `GET /api/v1/events` -> `401`.
* Vendor calls `POST /api/v1/events` -> `403`.
* Organizer A calls `GET /api/v1/events/:eventId` for organizer B -> `403` or masked `404`.
* Organizer A calls `PATCH /api/v1/events/:eventId` for organizer B -> denied and unchanged.
* Organizer attempts to update `ownerId` or `status` directly via PATCH -> rejected by strict schema.
* Admin attempts event mutation through organizer endpoint -> `403`.

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

| Area                | Notes |
| ------------------- | ----- |
| Screen / Route      | No introduce UI; soporta futuras rutas `/[locale]/events`, `/[locale]/events/new`, `/[locale]/events/:eventId`. |
| Main UI Pattern     | Backend API contract only. |
| Primary Action      | N/A. |
| Secondary Actions   | N/A. |
| Empty State         | `GET /events` puede retornar lista vacía en envelope válido. |
| Loading State       | N/A. |
| Error State         | Frontend debe mapear `VALIDATION_ERROR`, `CURRENCY_IMMUTABLE`, `BUSINESS_RULE_VIOLATION`, `UNAUTHORIZED/FORBIDDEN`. |
| Success State       | Crear evento permite navegar al dashboard o detalle cuando la UI exista. |
| Accessibility Notes | No aplica directamente; no implementa UI. |
| Responsive Notes    | No aplica. |
| i18n Notes          | `languageCode` soporta `es-LATAM`, `es-ES`, `pt`, `en`. |
| Currency Notes      | `currencyCode` se fija al crear y no cambia; sin conversión automática. |

---

## 🛠 Technical Notes

### Frontend

* Route / Page: No aplica en esta historia.
* Components: No aplica.
* State Management: El frontend consumirá estos endpoints con cookie HTTP-only y TanStack Query en historias frontend.
* Forms: El wizard de creación se cubre en US-009/PB-P1-006.
* API Client: Debe usar `credentials: 'include'`, manejar pagination metadata y error envelope.

### Backend

* Module: `event-planning`.
* Controller / Route: `EventsController` under `/api/v1/events`.
* Use Cases: `CreateEventUseCase`, `ListMyEventsUseCase`, `GetEventByIdUseCase`, `UpdateEventUseCase`, `ActivateEventUseCase`, `CancelEventUseCase`.
* Authorization Policy: authenticated organizer + ownership for private resources.
* Validation: Zod strict schemas for body, params and query.
* Transaction Required: Yes for create; no for simple list/detail; yes for state transitions if cascading side effects are added later.
* Error Handling: standard error envelope; no stack traces in client response.

### Database

* Main Tables: `events`, `event_types`, `locations`, `users`.
* Constraints: owner FK, location FK, `guests_count >= 1`, `estimated_budget >= 0`, event type enum, status enum, currency immutability in service layer.
* Index Considerations: `idx_events_owner_id`, `idx_events_owner_status_date`, `idx_events_status_event_date_active`.
* Seed Impact: Should work with seed organizer/events but does not create seed data.

### API

| Method | Endpoint | Purpose | Auth | Expected Success |
| ------ | -------- | ------- | ---- | ---------------- |
| POST | `/api/v1/events` | Create event in `draft` | organizer | `201` |
| GET | `/api/v1/events` | List own events with filters/pagination | organizer | `200` |
| GET | `/api/v1/events/:eventId` | Get own event detail | organizer owner | `200` |
| PATCH | `/api/v1/events/:eventId` | Update allowed fields | organizer owner | `200` |
| POST | `/api/v1/events/:eventId/activate` | Transition `draft -> active` | organizer owner | `200` |
| POST | `/api/v1/events/:eventId/cancel` | Transition eligible event to `cancelled` | organizer owner | `200` |

### Observability / Audit

* Correlation ID Required: Yes.
* Log Event Required: Yes for create, update, activation, cancellation, authorization failures and business-rule violations.
* AdminAction Required: No for this P0 story; admin event read audit belongs to PB-P1-010.
* AIRecommendation Required: No.

### Documentation Alignment Required

| Documento / Fuente | Conflicto detectado | Decisión vigente | Acción recomendada | ¿Bloquea aprobación? |
| ------------------ | ------------------- | ---------------- | ------------------ | -------------------- |
| Doc 16 §24 vs PB-P0-004/PB-P1-010 | Doc 16 incluye `GET /admin/events` en Events API; PB-P0-004 dice admin endpoints se incorporan en P1. | US-095 excluye `/admin/events` y mantiene admin read-only para PB-P1-010/US-016. | Aclarar en Doc 16 o OpenAPI snapshot que `/admin/events` no pertenece al P0 API foundation si se respeta backlog. | No |
| Doc 14 §19 controller table vs Doc 16 §24 | Doc 14 menciona `POST /:id/status` y `DELETE /:id`; Doc 16 define `POST /:eventId/activate` y `POST /:eventId/cancel`. | US-095 sigue Doc 16 por ser contrato API de PB-P0-004. | Alinear Doc 14 controller table o registrar route alias si el equipo decide conservar ambos. | No |
| FRD/Use cases incluyen auto-completion T+2 | Auto-completion es regla Must Have, pero PB-P1-009 la planifica como job separado. | US-095 no implementa el job, pero no debe impedir `autoCompleted`/`completedAt` en DTO y schema. | Mantener job en PB-P1-009 y asegurar compatibilidad de schema/API. | No |

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario | Type |
| ----- | -------- | ---- |
| TS-01 | Organizer creates event with valid DTO and receives `201` + `EventResponseDto` | Integration / Supertest |
| TS-02 | Created event defaults to `status='draft'` and `autoCompleted=false` | Integration / Unit |
| TS-03 | Organizer lists only own events with `status` and `eventTypeCode` filters | Integration / Supertest |
| TS-04 | Organizer gets own event detail | Integration / Supertest |
| TS-05 | Organizer updates editable fields without changing currency | Integration / Supertest |
| TS-06 | Organizer activates draft event | Integration / Supertest |
| TS-07 | Organizer cancels eligible event | Integration / Supertest |
| TS-08 | Response envelope includes `meta.correlationId` and pagination for list | Contract / Integration |

### Negative Tests

| ID    | Scenario | Expected Result |
| ----- | -------- | --------------- |
| NT-01 | Anonymous calls events endpoint | `401` |
| NT-02 | Vendor tries to create event | `403` |
| NT-03 | Organizer A reads organizer B event | `403` or masked `404` |
| NT-04 | Organizer A patches organizer B event | Denied; event unchanged |
| NT-05 | Create with invalid `eventTypeCode` | `422 VALIDATION_ERROR` |
| NT-06 | Create with `guestsCount=0` | `422 VALIDATION_ERROR` |
| NT-07 | Create with negative `estimatedBudget` | `422 VALIDATION_ERROR` |
| NT-08 | PATCH includes `currencyCode` | `409 CURRENCY_IMMUTABLE` or equivalent |
| NT-09 | Activate event from invalid status | `422 BUSINESS_RULE_VIOLATION` |
| NT-10 | Cancel already completed/cancelled event | `422 BUSINESS_RULE_VIOLATION` |
| NT-11 | Query list with invalid date/page/sort | `422 VALIDATION_ERROR` |
| NT-12 | Payload attempts to set `ownerId`, `status`, `autoCompleted` | Rejected by strict schema |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario | Expected Result |
| ---------- | -------- | --------------- |
| AUTH-TS-01 | Organizer performs allowed action on own event | Success |
| AUTH-TS-02 | Anonymous accesses protected events route | `401` |
| AUTH-TS-03 | Vendor accesses private event route | `403` |
| AUTH-TS-04 | Organizer accesses another organizer's event | `403` or masked `404` |
| AUTH-TS-05 | Admin attempts mutation through organizer event endpoint | `403` |

### Accessibility Tests

* No aplica directamente; no introduce UI.

### Contract Tests

* MSW/OpenAPI snapshot must reflect event endpoints, request DTOs, response DTOs, status codes, pagination and error envelopes in PB-P0-005.

---

## 📊 Business Impact

| Field               | Value |
| ------------------- | ----- |
| KPI Affected        | Event creation, API contract stability, authorization quality, demo readiness |
| Expected Impact     | Enables frontend event flows and downstream AI/tasks/budget/quote work to consume a stable event API |
| Success Criteria    | Supertest suite green for `/api/v1/events/*`, ownership tests pass, currency immutability enforced, OpenAPI/MSW follow-up can snapshot the contract |
| Academic Demo Value | Provides the backend foundation for event creation/list/detail lifecycle used by the demo narrative |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* No UI implementation in this story.
* Later frontend tasks can wire event wizard/list/detail to this API.

### Potential Backend Tasks

* Implement `EventsController` routes under `/api/v1/events`.
* Implement Zod schemas for create/update/list params.
* Implement event use cases and repository methods.
* Apply auth, role and ownership middleware.
* Enforce currency immutability and valid status transitions.
* Return standard envelopes with correlation ID.

### Potential Database Tasks

* Verify `events` schema, constraints and indexes exist from PB-P0-001.
* Ensure seed locations/event types support valid create tests.

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* Supertest integration suite for happy paths and negative authorization.
* Unit tests for lifecycle transition policy and currency immutability.
* Contract tests for DTOs/envelopes/pagination.

### Potential DevOps / Config Tasks

* No new secrets expected.
* Ensure CI runs backend integration and authorization negative tests.
