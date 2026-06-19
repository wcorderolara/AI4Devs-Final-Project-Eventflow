# Technical Specification — US-095: Implementar endpoints EVENT del contrato REST

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-095 |
| Source User Story | `management/user-stories/US-095-event-endpoints-implementation.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-095-decision-resolution.md` |
| Priority | P0 |
| Backlog ID | PB-P0-004 |
| Backlog Title | REST API Endpoints Foundation (Doc 16) |
| Backlog Execution Order | 4 |
| User Story Position in Backlog Item | 2 of 4 |
| Related User Stories in Backlog Item | US-094, US-095, US-096, US-097 |
| Epic | EPIC-API-001 |
| Backlog Item Dependencies | PB-P0-002, PB-P0-003 |
| Feature | Endpoints Event |
| Module / Domain | API / Event Planning |
| User Story Status | Approved |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-15 |
| Last Updated | 2026-06-15 |

---

## 2. Backlog Execution Context

### Product Backlog Item

US-095 belongs to PB-P0-004, which implements the REST API foundation aligned with Doc 16. This story covers the Event API contract required for organizers to create, list, read, update, activate and cancel their own events.

### Execution Order Rationale

Within PB-P0-004, US-095 follows US-094 because Event endpoints require authenticated session context and current-user resolution. US-095 must precede US-096 and US-097 because quote and AI endpoint contracts depend on event ownership and event identifiers.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-094 | Auth/session/profile foundation required by all protected endpoints | 1 |
| US-095 | Event API foundation and ownership boundary | 2 |
| US-096 | Quote/Booking API foundation depending on event ownership | 3 |
| US-097 | AI API foundation depending on event and quote contexts | 4 |

---

## 3. Executive Technical Summary

Implement Event endpoints under `/api/v1/events` using Express, TypeScript, Zod, Prisma and PostgreSQL inside the modular monolith. The implementation must use Clean/Hexagonal Architecture: thin controllers, application use cases, repository ports and Prisma adapters.

The API is organizer-owned only for this P0 story. Admin read-only event access, event tasks, budget endpoints, quote endpoints, AI endpoints and auto-completion jobs are explicitly out of scope. The implementation must enforce backend ownership, role checks, currency immutability, valid lifecycle transitions and standard response/error envelopes.

---

## 4. Scope Boundary

### In Scope

- `POST /api/v1/events`
- `GET /api/v1/events`
- `GET /api/v1/events/:eventId`
- `PATCH /api/v1/events/:eventId`
- `POST /api/v1/events/:eventId/activate`
- `POST /api/v1/events/:eventId/cancel`
- Organizer-only event ownership.
- DTO validation for body, route params and query params.
- Event lifecycle policy for `draft`, `active`, `completed`, `cancelled`.
- Currency immutability after creation.
- Pagination/filter/sort support for `GET /events`.
- Standard API envelope, error mapping and correlation ID.
- Supertest integration and security negative tests.

### Out of Scope

- Frontend event wizard or dashboard UI.
- EventTask endpoints.
- Budget endpoints and BudgetItem CRUD.
- QuoteRequest, Quote and BookingIntent endpoints.
- AI endpoints under `/events/:eventId/ai/*`.
- `GET /api/v1/admin/events` and admin event detail audit behavior.
- Auto-completion job T+2 implementation.
- Hard delete of events or EventTypes.
- Multi-collaborator event access.
- Payments, contracts, chat, WhatsApp, RAG or autonomous AI decisions.

### Explicit Non-Goals

- Do not implement aliases `POST /events/:id/status` or `DELETE /events/:id`.
- Do not implement admin event list/detail in US-095.
- Do not implement scheduled jobs in this story.
- Do not allow `currencyCode` to change after creation.
- Do not expose events across organizers.

---

## 5. Architecture Alignment

### Backend Architecture

Use the `event-planning` module. Controllers must call use cases and must not embed domain policies. Event lifecycle and currency immutability should be enforced in application/domain services, not only in controller schemas.

### Frontend Architecture

No UI implementation. The contract should be stable for future Next.js App Router routes, TanStack Query clients and MSW handlers.

### Database Architecture

Use Prisma over PostgreSQL. Primary model is `Event`, with relations to `User`, `EventType` and `Location`. `Budget` may be created with the event only if PB-P0-001/PB-P1 budget decisions already require that invariant; otherwise keep this story focused on the Event API contract.

### API Architecture

REST JSON under `/api/v1`, with standard response envelope, error envelope, Zod validation, pagination metadata for list endpoints and `X-Correlation-Id`.

### AI / PromptOps Architecture

No aplica. This story does not invoke AI and must not create `AIRecommendation`.

### Security Architecture

Backend applies auth, role and ownership. Frontend guards are UX only. Admin read access is deferred to P1. Error handling should avoid leaking another organizer's event existence.

### Testing Architecture

Use Vitest and Supertest. Include positive and negative authorization coverage per ADR-TEST-004. No Playwright or UI accessibility tests are required for this backend API story.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 Create event | Validate DTO and catalogs, enforce organizer role, persist `draft` event with immutable currency and `autoCompleted=false`. | API, Application, Domain, DB, Security |
| AC-02 List own events | Validate filters/pagination/sort, query by `ownerId`, return only current organizer events with metadata. | API, Application, DB, Security |
| AC-03 Get own event detail | Validate `eventId`, enforce ownership, return `EventResponseDto`. | API, Application, DB, Security |
| AC-04 Update allowed fields | Reject non-editable fields, enforce non-terminal state if required, update only allowed properties. | API, Application, Domain, DB |
| AC-05 Currency immutable | Reject `currencyCode` in PATCH with `409 CURRENCY_IMMUTABLE` or equivalent mapped business error. | API, Domain, Testing |
| AC-06 Activate event | Enforce owner and valid `draft -> active` transition. | API, Application, Domain, DB |
| AC-07 Cancel event | Enforce owner and valid transition to `cancelled` for eligible states. | API, Application, Domain, DB |
| AC-08 Shared REST contract | Apply `/api/v1`, validation, envelopes, correlation ID and safe errors/logs. | API, Middleware, Observability |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

- `event-planning`
- `shared-kernel`
- `shared/interface/http`
- `infrastructure/prisma`
- `identity-access` as dependency for authenticated session context

### Use Cases / Application Services

- `CreateEventUseCase`
- `ListMyEventsUseCase`
- `GetEventByIdUseCase`
- `UpdateEventUseCase`
- `ActivateEventUseCase`
- `CancelEventUseCase`

Supporting policy/service:

- `EventLifecycleService`
- `EventOwnershipPolicy` or shared `AuthorizationPolicyService`
- `EventCatalogResolver` or direct read access to event type/location repositories

### Controllers / Routes

`EventsController` mounted under `/api/v1/events`.

Route mapping:

- `POST /events` -> `CreateEventUseCase`
- `GET /events` -> `ListMyEventsUseCase`
- `GET /events/:eventId` -> `GetEventByIdUseCase`
- `PATCH /events/:eventId` -> `UpdateEventUseCase`
- `POST /events/:eventId/activate` -> `ActivateEventUseCase`
- `POST /events/:eventId/cancel` -> `CancelEventUseCase`

### DTOs / Schemas

Use strict Zod schemas:

- `CreateEventRequestDto`
  - `eventTypeCode`
  - `eventDate`
  - `guestsCount`
  - `locationId`
  - `estimatedBudget`
  - `currencyCode`
  - `languageCode`
  - optional `name`
  - optional `notes`
- `UpdateEventRequestDto`
  - allowed: `eventTypeCode`, `eventDate`, `guestsCount`, `locationId`, `estimatedBudget`, `languageCode`, `name`, `notes`
  - forbidden: `currencyCode`, `ownerId`, `status`, `completedAt`, `autoCompleted`, `isSeed`, timestamps
- `ListEventsQueryDto`
  - `status`
  - `eventTypeCode`
  - `eventDateFrom`
  - `eventDateTo`
  - `page`
  - `pageSize`
  - `sort`
- `EventIdParamDto`
- `EventResponseDto`

### Repository / Persistence

Required repository capabilities:

- `EventRepository.create(...)`
- `EventRepository.findById(...)`
- `EventRepository.findByIdForOwner(eventId, ownerId)`
- `EventRepository.listByOwner(ownerId, filters, pagination, sort)`
- `EventRepository.update(eventId, patch)`
- `EventRepository.transitionStatus(eventId, nextStatus, metadata)`
- `EventTypeRepository.existsActive(code)` or equivalent catalog validation
- `LocationRepository.existsActive(id)` or equivalent catalog validation

### Validation Rules

- `eventTypeCode` must be one of the supported event type codes.
- `eventDate` must be valid `YYYY-MM-DD`.
- `guestsCount >= 1`.
- `locationId` must reference an existing active location.
- `estimatedBudget` must be decimal-string and non-negative.
- `currencyCode` required on create and immutable afterwards.
- `languageCode` must be one of `es-LATAM`, `es-ES`, `pt`, `en`.
- Pagination must be bounded.
- Unknown fields should be rejected by strict schemas.

### Error Handling

Use standard error envelope:

- Missing/invalid session -> `401`.
- Wrong role -> `403`.
- Cross-owner access -> `403` or masked `404` according to shared security convention.
- Invalid DTO/query -> `422 VALIDATION_ERROR`.
- Unknown catalog/location -> `404` or validation error as defined by shared error policy.
- Currency change attempt -> `409 CURRENCY_IMMUTABLE`.
- Invalid state transition -> `422 BUSINESS_RULE_VIOLATION`.

### Transactions

- Create event: transaction recommended, especially if implementation creates a linked `Budget` record as part of existing domain invariant.
- List/detail: no transaction required.
- Update: transaction optional unless updating related invariants.
- Activate/cancel: transaction recommended for status transition consistency and future event emissions.

### Observability

Log structured events:

- `event.created`
- `event.updated`
- `event.activated`
- `event.cancelled`
- `event.access_denied`
- `event.validation_failed`
- `event.currency_immutable_violation`
- `event.lifecycle_transition_rejected`

Logs must include `correlationId`, actor ID and event ID when available, without leaking private payloads.

---

## 8. Frontend Technical Design

### Routes / Pages

No aplica. Future routes may include `/[locale]/events`, `/[locale]/events/new`, `/[locale]/events/:eventId`.

### Components

No aplica.

### Forms

No aplica. Future event wizard forms must align to `CreateEventRequestDto` and `UpdateEventRequestDto`.

### State Management

No aplica for implementation. Future clients should use TanStack Query keyed by event filters and event ID.

### Data Fetching

No aplica. Future API clients must send cookies using `credentials: 'include'`.

### Loading / Empty / Error / Success States

No aplica. The API must support an empty event list through a valid paginated envelope.

### Accessibility

No aplica.

### i18n

No aplica for UI. The API validates `languageCode`.

---

## 9. API Contract Design

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| POST | `/api/v1/events` | Create event in `draft` | organizer | `CreateEventRequestDto` | `201` + `EventResponseDto` | `401`, `403`, `404`, `422` |
| GET | `/api/v1/events` | List current organizer events | organizer | `ListEventsQueryDto` | `200` + paginated event list | `401`, `403`, `422` |
| GET | `/api/v1/events/:eventId` | Get current organizer event detail | organizer owner | `EventIdParamDto` | `200` + `EventResponseDto` | `401`, `403`/`404`, `422` |
| PATCH | `/api/v1/events/:eventId` | Update allowed event fields | organizer owner | `UpdateEventRequestDto` | `200` + `EventResponseDto` | `401`, `403`/`404`, `409 CURRENCY_IMMUTABLE`, `422` |
| POST | `/api/v1/events/:eventId/activate` | Transition draft event to active | organizer owner | `EventIdParamDto` | `200` + `EventResponseDto` | `401`, `403`/`404`, `422 BUSINESS_RULE_VIOLATION` |
| POST | `/api/v1/events/:eventId/cancel` | Cancel eligible event | organizer owner | `EventIdParamDto` | `200` + `EventResponseDto` | `401`, `403`/`404`, `422 BUSINESS_RULE_VIOLATION` |

All responses must include the shared envelope and correlation metadata.

---

## 10. Database / Prisma Design

### Models Impacted

- `Event`
- `EventType`
- `Location`
- `User`
- `Budget` only if event creation invariant already exists in the schema/use case foundation.

### Fields / Columns

`events` expected fields:

- `id`
- `owner_id`
- `event_type_code`
- `name`
- `event_date`
- `guests_count`
- `location_id`
- `estimated_budget`
- `currency_code`
- `language_code`
- `status`
- `completed_at`
- `auto_completed`
- `notes`
- `is_seed`
- `created_at`
- `updated_at`

### Relations

- `events.owner_id -> users.id`
- `events.event_type_code -> event_types.code`
- `events.location_id -> locations.id`

### Indexes

- `idx_events_owner_id`
- `idx_events_owner_status_date`
- `idx_events_status_event_date_active`
- `idx_events_auto_complete_candidates` may already exist for future job compatibility
- `idx_events_is_seed` for seed reset, if in schema

### Constraints

- Owner must be an `organizer` enforced in service/application layer.
- `guests_count >= 1`.
- `estimated_budget >= 0`.
- `currency_code` immutable post-creation in service layer.
- `event_status` enum: `draft`, `active`, `completed`, `cancelled`.
- `auto_completed` default `false`.

### Migrations Impact

If PB-P0-001 already created required schema, this story should not create broad migrations. It should only add missing indexes/constraints required for Event API behavior if absent.

### Seed Impact

No new seed data required, but tests require at least:

- one organizer user,
- one non-organizer user for negative tests,
- active `EventType` values,
- active `Location` records,
- supported currencies and languages.

---

## 11. AI / PromptOps Design

### AI Feature

No aplica.

### Provider

No aplica.

### Prompt Version

No aplica.

### Input Schema

No aplica.

### Output Schema

No aplica.

### Human-in-the-loop

No aplica.

### Fallback

No aplica.

### Persistence

No aplica.

### Safety Rules

This story must not call `LLMProvider` or persist `AIRecommendation`.

---

## 12. Security & Authorization Design

### Authentication

All endpoints require a valid authenticated session, expected from US-094.

### Authorization

Only `organizer` can use this P0 Event API. Vendors and anonymous users are denied. Admin event read is out of scope and must not be implemented through these routes.

### Ownership Rules

Every event read/mutation must verify `event.ownerId == session.userId`. List endpoint must filter by current organizer ID in the repository query, not in frontend or post-processing.

### Role Rules

- `organizer`: create/list/read/update/activate/cancel own events.
- `vendor`: denied for all US-095 endpoints.
- `admin`: denied for mutation through organizer endpoint; read-only admin routes are P1.
- `anonymous`: denied.

### Negative Authorization Scenarios

- Anonymous request to `/api/v1/events` -> 401.
- Vendor creates event -> 403.
- Organizer A reads Organizer B event -> 403 or masked 404.
- Organizer A patches Organizer B event -> denied and unchanged.
- Admin mutates event through organizer route -> 403.
- PATCH attempts to update `ownerId` or `status` directly -> validation rejection.

### Audit Requirements

No `AdminAction` in US-095. Admin event reads and related audit belong to PB-P1-010/US-016.

### Sensitive Data Handling

Event payloads are not highly sensitive, but logs should avoid full free-text `notes` and should include only IDs, actor, action, result and correlation ID.

---

## 13. Testing Strategy

### Unit Tests

- `EventLifecycleService` valid transitions.
- Currency immutability policy.
- Create/update DTO validation.
- List query validation and pagination bounds.
- Event owner policy.

### Integration Tests

- Organizer creates event with valid DTO and receives `201`.
- Created event defaults to `draft` and `autoCompleted=false`.
- Organizer lists only own events with filters.
- Organizer gets own event detail.
- Organizer updates editable fields.
- Organizer activates draft event.
- Organizer cancels eligible event.

### API Tests

Use Supertest to assert endpoints, status codes, envelopes, error codes, pagination metadata and `meta.correlationId`.

### E2E Tests

No required E2E in this technical spec. Frontend event wizard/dashboard stories may add Playwright coverage later.

### Security Tests

- Anonymous -> 401.
- Vendor -> 403.
- Cross-organizer -> 403 or masked 404.
- Admin mutation through organizer endpoint -> 403.
- Direct update of `ownerId`, `status`, `autoCompleted`, `completedAt` -> strict schema rejection.
- `currencyCode` PATCH -> `409 CURRENCY_IMMUTABLE`.

### Accessibility Tests

No aplica. No UI.

### AI Tests

No aplica.

### Seed / Demo Tests

- Verify seed contains active EventTypes and Locations needed for create/list tests.
- Verify test isolation for events created by different organizers.

### CI Checks

- Vitest unit tests.
- Supertest integration tests.
- Prisma test database setup with event catalogs.
- Authorization negative tests required as quality gate.

---

## 14. Observability & Audit

### Logs

Log event create/update/activate/cancel, denied access and invalid transition. Include `correlationId`, actor ID and event ID when available.

### Correlation ID

Every response and log must include or propagate correlation ID.

### AdminAction

No aplica for US-095.

### Error Tracking

Unexpected exceptions should be captured with redacted context. Expected validation/auth/domain errors should not include stack traces in client responses.

### Metrics

Recommended metrics:

- events created count.
- events listed count.
- event lifecycle transition success/failure.
- currency immutable violations.
- authorization denied count.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

No new seed is created by this story. Tests require seeded or factory-created:

- organizer users,
- vendor user for negative path,
- EventTypes,
- Locations,
- supported currencies/languages.

### Demo Scenario Supported

Supports the demo flow after login: create event, list events, view event detail, activate/cancel lifecycle state.

### Reset / Isolation Notes

Integration tests should create isolated users/events or clean event rows between tests. Seed records should remain stable and should not be mutated by endpoint tests except through isolated fixtures.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| Doc 16 §24 vs PB-P0-004/PB-P1-010 | Doc 16 includes `GET /admin/events`; PB-P0-004 notes admin endpoints are P1. | US-095 excludes `/admin/events`; it belongs to PB-P1-010/US-016. | Clarify P0/P1 boundary before OpenAPI snapshot. | No |
| Doc 14 EventsController vs Doc 16 §24 | Doc 14 mentions `POST /:id/status` and `DELETE /:id`; Doc 16 defines `activate` and `cancel`. | US-095 uses `POST /events/:eventId/activate` and `POST /events/:eventId/cancel`. | Align Doc 14 or add aliases only after explicit PO/Tech decision. | No |
| FRD/use cases auto-completion | Auto-completion T+2 is Must Have but planned as PB-P1-009 job. | US-095 excludes the job and preserves schema/DTO compatibility. | Validate auto-completion in PB-P1-009. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Cross-organizer data leakage | High security risk | Filter by `ownerId` in repository and add Supertest cross-user cases. |
| Route drift with Doc 14 status/delete endpoints | Contract mismatch | Implement only Doc 16 routes and document alignment warning. |
| Currency update sneaks through generic PATCH | Violates BR-EVENT-007/NFR-DATA-001 | Strict Zod schema plus domain policy and explicit test. |
| Admin endpoints accidentally included | Scope creep | Keep admin routes out of controller registration for US-095. |
| Auto-completion accidentally implemented in API story | Scope creep and scheduling complexity | Preserve fields only; defer job to PB-P1-009. |
| Catalog references absent in test DB | Flaky create tests | Seed or factory active EventTypes/Locations before integration tests. |

---

## 18. Implementation Guidance for Coding Agents

- Likely impacted folders:
  - `src/modules/event-planning/`
  - `src/shared/interface/http/`
  - `src/shared/interface/middlewares/`
  - `src/infrastructure/prisma/`
  - `tests/integration/events/`
- Recommended implementation order:
  1. Confirm Event/EventType/Location Prisma models and indexes from PB-P0-001.
  2. Implement strict DTO schemas.
  3. Implement lifecycle and currency immutability policies.
  4. Implement repository methods with owner-scoped queries.
  5. Implement use cases.
  6. Implement `EventsController` and route registration under `/api/v1/events`.
  7. Attach auth, role, validation and error middlewares.
  8. Add Supertest and policy tests.
- Decisions that must not be reopened:
  - Use Doc 16 `activate`/`cancel` routes.
  - Exclude `/admin/events` from US-095.
  - Exclude auto-completion job from US-095.
  - Reject `currencyCode` updates.
- What must not be implemented:
  - Event wizard UI.
  - Tasks, budget, quotes or AI routes.
  - Admin event read/audit.
  - Hard delete.
  - Multi-collaborator access.
- Assumptions to preserve:
  - US-094 provides authenticated session context.
  - Event catalogs exist from schema/seed.
  - Backend remains source of truth for authorization.

---

## 19. Task Generation Notes

- Suggested task groups:
  - DTO/Zod schemas.
  - Event lifecycle/domain policies.
  - Prisma repository methods.
  - Use cases.
  - Controller/routes.
  - Authorization/security tests.
  - Contract/Supertest tests.
- Required QA tasks:
  - Happy path for all endpoints.
  - Cross-owner and wrong-role negatives.
  - Currency immutability.
  - Invalid lifecycle transitions.
  - Pagination/filter validation.
- Required security tasks:
  - Auth middleware coverage.
  - Organizer role guard.
  - Owner-scoped repository queries.
  - Masked 404/403 convention test.
- Required seed/demo tasks:
  - Ensure test fixtures include active EventTypes and Locations.
  - Ensure at least two organizers for ownership tests.
- Required documentation tasks:
  - Track Doc 14 route alignment.
  - Track `/admin/events` P0/P1 boundary.
- Dependencies between tasks:
  - DTO schemas and policies before use cases.
  - Repository owner-scoped methods before controller tests.
  - Auth from US-094 before protected endpoint integration tests.
- Parent backlog item should later generate a consolidated `tasks.md` after US-094..US-097 specs are complete.

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass |
| Product Backlog mapping found | Pass |
| Decision Resolution reviewed if present | Pass |
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

`Ready for Task Breakdown`

US-095 has an approved story, formal decision resolution, Product Backlog mapping to PB-P0-004, clear Event API contract, explicit security/ownership requirements, concrete database impact and sufficient QA strategy. It is ready for `eventflow-user-story-to-development-tasks`.
