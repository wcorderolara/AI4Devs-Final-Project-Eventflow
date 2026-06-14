# User Story: Implementar endpoints Quote / Booking del contrato REST

## Metadata

| Field              | Value                                      |
| ------------------ | ------------------------------------------ |
| ID                 | US-096                                     |
| Epic               | EPIC-API-001                               |
| Feature            | REST API Endpoints Foundation              |
| Backlog Item       | PB-P0-004                                  |
| Module / Domain    | API / Quote Flow / Booking Intent          |
| User Role          | System                                     |
| Priority           | Must Have (P0)                             |
| Status             | Approved                                   |
| Owner              | Product Owner / Business Analyst           |
| Approved By        | PO/BA Review                               |
| Approval Date      | 2026-06-12                                 |
| Ready for Development Tasks | Yes                              |
| Sprint / Milestone | MVP                                        |
| Created Date       | 2026-06-09                                 |
| Last Updated       | 2026-06-12                                 |

---

## User Story

**As the** EventFlow backend system  
**I want** to expose versioned REST endpoints for QuoteRequest, Quote, and BookingIntent under `/api/v1`  
**So that** the frontend, MSW contracts, QA automation, and future AI/vendor workflows can consume the bilateral quote and simulated booking flow through a stable backend API contract.

---

## Business Context

### Context Summary

This story implements the P0 API foundation for the Quote and BookingIntent flow defined in Doc 16. It does not deliver the full P1 product experience for quote comparison, notifications, expiration jobs, payment-like flows, reviews, or UI surfaces. It establishes the backend HTTP contract, DTO validation, authorization policies, state transitions, and Supertest-ready behavior required by PB-P0-004.

The API must support organizer-owned events, vendor-assigned quote requests, quote submission/decision actions, and simulated BookingIntent confirmation/cancellation without introducing real payments, contracts, or negotiation/chat behavior.

### Related Domain Concepts

- Event
- ServiceCategory
- VendorProfile
- QuoteRequest
- Quote
- BookingIntent
- AIRecommendation, only as an optional upstream reference on QuoteRequest
- Organizer-owned event authorization
- Vendor assignment authorization
- Quote validity and expiration state

### Assumptions

- Authentication, JWT/session context, role guards, and `/api/v1/auth/*` foundation are delivered by US-094.
- Event ownership, active event validation, and base event endpoints are delivered by US-095.
- Persistence schemas or migrations for QuoteRequest, Quote, and BookingIntent are available or will be implemented as part of the endpoint work.
- The canonical API contract for this story is Doc 16, with documentation alignment notes captured below where Doc 14 or Doc 19 use alternate route shapes.
- Admin quote/booking read access is not part of this P0 endpoint foundation unless explicitly approved later; PB-P0-004 notes admin endpoints as P1.

### Dependencies

- PB-P0-001: Backend baseline and modular architecture
- PB-P0-002: Authentication and authorization foundation
- PB-P0-003: Event domain foundation
- PB-P0-004: REST API Endpoints Foundation
- US-094: Auth endpoints implementation
- US-095: Event endpoints implementation

---

## Traceability

| Source                 | Reference                                                                                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FRD Requirement(s)     | FR-QUOTE-001..020, FR-BOOKING-001..010, FR-AUTH-010, FR-EVENT-006, FR-BUDGET-006                                                                          |
| Use Case(s)            | UC-QUOTE-001..010, UC-BOOKING-001..003                                                                                                                    |
| Business Rule(s)       | BR-QUOTE-001..025, BR-BOOKING-001..010, BR-AUTH-009, BR-EVENT-006, BR-BUDGET-005                                                                          |
| Permission Rule(s)     | SEC-POL-QUOTE-001..005, SEC-POL-BOOKING-001..002; organizer must own the event; vendor must be assigned to the QuoteRequest or BookingIntent              |
| Data Entity / Entities | Event, ServiceCategory, VendorProfile, QuoteRequest, Quote, BookingIntent                                                                                  |
| API Endpoint(s)        | `/api/v1/events/:eventId/quote-requests`, `/api/v1/quote-requests/*`, `/api/v1/vendors/me/quote-requests`, `/api/v1/quotes/*`, `/api/v1/booking-intents/*` |
| NFR Reference(s)       | NFR-SEC-001, NFR-SEC-002, NFR-SEC-003, NFR-SEC-007, NFR-DATA-003, NFR-DATA-004, NFR-DATA-010, NFR-REL-006, NFR-TEST-001, NFR-TEST-002, NFR-TEST-004, NFR-TEST-005, NFR-OBS-005, NFR-OBS-006 |
| Related ADR(s)         | ADR-ARCH-001, ADR-BE-001, ADR-API-001, ADR-API-002, ADR-API-003, ADR-API-004, ADR-SEC-001, ADR-SEC-003, ADR-SEC-006, ADR-TEST-001, ADR-TEST-004            |
| Related Document(s)    | `/docs/4-Business-Rules.md`, `/docs/9-Non-Functional-Requirements.md`, `/docs/14-Backend-Architecture.md`, `/docs/16-API-Design-Specification.md`, `/docs/19-Security-Architecture-and-Compliance.md`, `/management/artifacts/4-Product-Backlog-Prioritized.md` |

---

## Scope Guardrails

### MVP Scope

- Scope Classification: In Scope
- MVP Relevance: Must Have (P0)
- Delivery intent: backend API contract foundation for QuoteRequest, Quote, and BookingIntent.

### Explicitly Out of Scope

- Organizer/vendor UI screens for quote management.
- AI-generated quote brief endpoint execution, AI quote comparison summary, or AI vendor recommendation logic.
- Notification delivery surfaces, email, SMS, push, or vendor inbox beyond API status fields.
- Daily expiration jobs for QuoteRequest or Quote lifecycle automation.
- Real payments, payment gateways, contract generation, e-signature, deposits, escrow, invoices, or billing.
- Chat, negotiation threads, file attachments, and vendor messaging.
- Review enablement after confirmed BookingIntent.
- Budget committed synchronization internals, except preserving contract compatibility for future BookingIntent confirmation behavior.
- Admin dashboards or admin quote/booking moderation endpoints.

### Scope Notes

- BookingIntent remains a simulated commitment flow. It must never initiate real payment or legal contract behavior.
- Quote expiration automation is a follow-up product/job capability; this story must still validate expired Quote behavior when state already indicates expiration.
- The endpoint implementation must use Doc 16 as the canonical route contract for P0.

---

## Acceptance Criteria

### AC-01: Organizer creates a QuoteRequest for an owned active event

**Given** an authenticated organizer owns an `active` event  
**And** the target vendor profile and service category are valid  
**And** active QuoteRequest limits are not exceeded  
**When** the organizer sends `POST /api/v1/events/:eventId/quote-requests` with a valid `CreateQuoteRequestRequestDto`  
**Then** the API creates a QuoteRequest with status `sent`  
**And** returns `201` with `QuoteRequestResponseDto`  
**And** rejects a sixth active QuoteRequest for the same event/category with `409 MAX_QUOTE_REQUESTS_EXCEEDED`  
**And** rejects a duplicate active QuoteRequest for the same event/vendor with `409 DUPLICATE_QUOTE_REQUEST_ACTIVE`.

### AC-02: Organizer lists QuoteRequests for an owned event

**Given** an authenticated organizer owns an event  
**When** the organizer sends `GET /api/v1/events/:eventId/quote-requests`  
**Then** the API returns only QuoteRequests for that event  
**And** supports the repository pagination/filter conventions used by the API foundation  
**And** returns `403` or `404` when the event is not visible to the organizer.

### AC-03: Vendor lists assigned QuoteRequests

**Given** an authenticated vendor has assigned QuoteRequests  
**When** the vendor sends `GET /api/v1/vendors/me/quote-requests`  
**Then** the API returns only QuoteRequests assigned to that vendor profile  
**And** does not expose QuoteRequests assigned to other vendors.

### AC-04: Authorized parties retrieve QuoteRequest detail

**Given** a QuoteRequest exists  
**When** the owning organizer or assigned vendor sends `GET /api/v1/quote-requests/:quoteRequestId`  
**Then** the API returns `200` with QuoteRequest detail  
**And** unauthorized users receive `403` or `404` according to the project security convention.

### AC-05: Organizer cancels a QuoteRequest

**Given** an authenticated organizer owns the event linked to a QuoteRequest  
**When** the organizer sends `PATCH /api/v1/quote-requests/:quoteRequestId/cancel`  
**Then** the API sets status `cancelled`, records `cancelledAt`, and returns `200`  
**And** rejects cancellation when domain state rules disallow it with `422`.

### AC-06: Vendor marks an assigned QuoteRequest as viewed

**Given** an authenticated assigned vendor can access a QuoteRequest in status `sent`  
**When** the vendor sends `PATCH /api/v1/quote-requests/:quoteRequestId/viewed`  
**Then** the API records `viewedAt`, updates status to `viewed` when applicable, and returns `204`.

### AC-07: Vendor creates or retrieves the Quote for an assigned QuoteRequest

**Given** an authenticated assigned vendor has a valid QuoteRequest  
**When** the vendor sends `POST /api/v1/quote-requests/:quoteRequestId/quote` with valid price, breakdown, conditions, and currency fields  
**Then** the API creates a draft Quote and returns `201` with `QuoteResponseDto`  
**And** enforces one active/current Quote per QuoteRequest  
**And** the owning organizer or assigned vendor can retrieve it through `GET /api/v1/quote-requests/:quoteRequestId/quote`.

### AC-08: Vendor edits and sends a draft Quote

**Given** a draft Quote belongs to the authenticated vendor  
**When** the vendor sends `PATCH /api/v1/quotes/:quoteId`  
**Then** the API updates only editable draft fields and returns `200`  
**And** rejects edits to non-draft Quotes with `422`.

**Given** a draft Quote has valid required data  
**When** the vendor sends `POST /api/v1/quotes/:quoteId/send`  
**Then** the API sets status `sent`, records `sentAt`, applies default `validUntil = createdAt + 15 calendar days` when missing, and returns `200`.

### AC-09: Organizer accepts, rejects, or prefers a Quote

**Given** an authenticated organizer owns the event linked to a sent Quote  
**When** the organizer sends `POST /api/v1/quotes/:quoteId/accept`  
**Then** the API sets status `accepted`, records `acceptedAt`, and returns `200`.

**When** the organizer sends `POST /api/v1/quotes/:quoteId/reject`  
**Then** the API sets status `rejected`, records `rejectedAt`, and returns `200`.

**When** the organizer sends `POST /api/v1/quotes/:quoteId/prefer`  
**Then** the API marks the Quote as preferred through `isPreferred` and returns `200`.

**And** accepting an expired Quote returns `410 QUOTE_EXPIRED`.

### AC-10: Organizer creates a BookingIntent from an accepted non-expired Quote

**Given** an authenticated organizer owns the event linked to an accepted, non-expired Quote  
**When** the organizer sends `POST /api/v1/booking-intents` with `quoteId`  
**Then** the API creates a BookingIntent with status `pending`  
**And** returns `201` with `BookingIntentResponseDto`  
**And** rejects non-accepted or expired Quotes with the documented business error.

### AC-11: Vendor confirms a BookingIntent

**Given** an authenticated vendor is assigned to a pending BookingIntent  
**When** the vendor sends `POST /api/v1/booking-intents/:bookingIntentId/confirm`  
**Then** the API sets status `confirmed_intent`, records `confirmedAt`, and returns `200`  
**And** no real payment, contract, invoice, or external booking side effect is triggered.

### AC-12: Authorized parties retrieve or cancel a BookingIntent

**Given** a BookingIntent exists  
**When** the owning organizer or assigned vendor sends `GET /api/v1/booking-intents/:bookingIntentId`  
**Then** the API returns `200` with BookingIntent detail.

**When** the owning organizer or assigned vendor sends `POST /api/v1/booking-intents/:bookingIntentId/cancel` with `cancellationReason`  
**Then** the API sets status `cancelled`, records `cancelledAt`, `cancelledBy`, and `cancellationReason`, and returns `200`  
**And** cancellation remains allowed for `confirmed_intent` without platform penalty.

### AC-13: API foundation behavior is consistent

**Given** any endpoint in this story  
**When** a response or error is returned  
**Then** it follows the project API envelope, error format, correlation ID, DTO validation, authentication, and `/api/v1` versioning conventions  
**And** Supertest integration coverage validates the successful, authorization-negative, and domain-negative paths.

---

## Edge Cases

### EC-01: Unauthenticated request

**Given** no valid authentication context  
**When** any protected QuoteRequest, Quote, or BookingIntent endpoint is called  
**Then** the API returns `401`.

### EC-02: Organizer does not own event

**Given** an authenticated organizer tries to access another organizer's event quote data  
**When** the organizer calls event-scoped QuoteRequest, Quote, or BookingIntent endpoints  
**Then** the API returns `403` or `404` according to the project security convention.

### EC-03: Vendor is not assigned

**Given** an authenticated vendor is not assigned to the QuoteRequest or BookingIntent  
**When** the vendor calls vendor-scoped quote or booking endpoints  
**Then** the API returns `403` or `404` and does not disclose private event/vendor data.

### EC-04: QuoteRequest active limit exceeded

**Given** an event/category already has five active QuoteRequests  
**When** the organizer creates another active QuoteRequest for that category  
**Then** the API returns `409 MAX_QUOTE_REQUESTS_EXCEEDED`.

### EC-05: Duplicate active QuoteRequest for vendor

**Given** an event already has an active QuoteRequest for the same vendor  
**When** the organizer creates another active QuoteRequest for that vendor  
**Then** the API returns `409 DUPLICATE_QUOTE_REQUEST_ACTIVE`.

### EC-06: Quote is no longer draft

**Given** a Quote is `sent`, `accepted`, `rejected`, or `expired`  
**When** the vendor attempts to edit it  
**Then** the API returns `422`.

### EC-07: Quote expired

**Given** a Quote is expired or its validity window has elapsed  
**When** the organizer attempts to accept it or create a BookingIntent from it  
**Then** the API returns the documented expired quote error, including `410 QUOTE_EXPIRED` for accept.

### EC-08: Booking cancellation reason missing

**Given** an organizer or vendor cancels a BookingIntent  
**When** `cancellationReason` is missing or blank  
**Then** the API returns `422`.

---

## Validation Rules

| ID    | Rule                                                                                                                                         | Message / Behavior                                  |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| VR-01 | `eventId`, `quoteRequestId`, `quoteId`, `bookingIntentId`, `vendorProfileId`, and `serviceCategoryId` must be valid identifiers.              | Return `422` for malformed IDs; `404` when absent.  |
| VR-02 | QuoteRequest brief requires non-empty `summary`, `requirements`, and `questions`; `constraints` is optional.                                  | Return `422`.                                       |
| VR-03 | QuoteRequest can be created only for an organizer-owned `active` event.                                                                       | Return `403`, `404`, or domain `422`.               |
| VR-04 | No more than five active QuoteRequests are allowed per event/category.                                                                        | Return `409 MAX_QUOTE_REQUESTS_EXCEEDED`.           |
| VR-05 | No duplicate active QuoteRequest is allowed for the same event/vendor pair.                                                                   | Return `409 DUPLICATE_QUOTE_REQUEST_ACTIVE`.        |
| VR-06 | Quote requires decimal-string `totalPrice`, non-empty `breakdown`, `conditions`, and valid `currencyCode`.                                    | Return `422`.                                       |
| VR-07 | Quote `validUntil` defaults to `createdAt + 15 calendar days` when omitted on send.                                                           | Persist default and return in response DTO.         |
| VR-08 | Quote can be edited only while `draft`.                                                                                                      | Return `422` for non-draft states.                  |
| VR-09 | BookingIntent can be created only from an accepted, non-expired Quote visible to the organizer.                                                | Return documented business error.                   |
| VR-10 | BookingIntent cancellation requires `cancellationReason`.                                                                                    | Return `422`.                                       |
| VR-11 | Pagination and filters must use the project API convention for list endpoints.                                                                | Return normalized paginated response.               |

---

## Authorization & Security Rules

| ID     | Rule                                                                                                   |
| ------ | ------------------------------------------------------------------------------------------------------ |
| SEC-01 | All QuoteRequest, Quote, and BookingIntent mutation/read endpoints require authentication.              |
| SEC-02 | Organizer actions require ownership of the linked event.                                                |
| SEC-03 | Vendor actions require assignment to the linked QuoteRequest, Quote, or BookingIntent.                  |
| SEC-04 | Vendor responses must not expose QuoteRequests or BookingIntents assigned to other vendors.             |
| SEC-05 | Organizer responses must not expose quote or booking data for events owned by another organizer.        |
| SEC-06 | Quote edit/send actions are limited to the owning assigned vendor.                                      |
| SEC-07 | Quote accept/reject/prefer and BookingIntent create actions are limited to the owning organizer.        |
| SEC-08 | BookingIntent confirm is limited to the assigned vendor; cancel is limited to the organizer or vendor.  |
| SEC-09 | Logs must include correlation and domain transition context without PII, secrets, or full brief payloads. |

### Negative Authorization Scenarios

- Vendor calls `GET /api/v1/events/:eventId/quote-requests` for an organizer event.
- Vendor calls `POST /api/v1/quote-requests/:quoteRequestId/quote` for an unassigned QuoteRequest.
- Organizer calls quote endpoints for another organizer's event.
- Organizer attempts to edit a vendor-owned draft Quote.
- Vendor attempts to accept or reject a Quote.
- Unrelated user attempts to retrieve or cancel a BookingIntent.

---

## AI Behavior

This story does not invoke AI directly.

### AI Involvement

- AI Feature: None in this story.
- Provider Layer: Not applicable.
- Human Validation Required: Not applicable.
- Persist AIRecommendation: No new AIRecommendation is created by this story.
- Fallback Required: Not applicable.

### AI Input

- `aiRecommendationId` may be accepted as an optional reference on QuoteRequest creation only when an upstream AI recommendation or brief already exists.
- The endpoint must not call an LLM provider.

### AI Output

- Not applicable.

### Human-in-the-loop Rules

- Not applicable for this story.

### AI Error / Fallback Behavior

- Not applicable for this story.

---

## UX / UI Notes

| Area                | Notes                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Screen / Route      | No UI is implemented by this story.                                   |
| Main UI Pattern     | API foundation only.                                                  |
| Primary Action      | Supports future organizer quote request, quote decision, and booking flows. |
| Secondary Actions   | Supports future vendor incoming requests and quote response flows.     |
| Empty State         | Not applicable.                                                       |
| Loading State       | Not applicable.                                                       |
| Error State         | API errors must be consumable by future frontend and MSW tests.        |
| Accessibility Notes | Not applicable.                                                       |
| Responsive Notes    | Not applicable.                                                       |
| i18n Notes          | Error codes remain stable; future UI handles localized messages.       |
| Currency Notes      | Quote currency must follow the project currency/domain rules and response DTO contract. |

---

## Technical Notes

### Frontend

- Route / Page: Not applicable.
- Components: Not applicable.
- State Management: Not applicable.
- API Client: Endpoints must be stable for future generated or hand-written frontend clients and MSW handlers.

### Backend

- Module(s): `quote-flow`, `booking-intent`, API boundary.
- Use Cases:
  - `CreateQuoteRequestUseCase`
  - `ListEventQuoteRequestsUseCase`
  - `ListVendorQuoteRequestsUseCase`
  - `GetQuoteRequestUseCase`
  - `CancelQuoteRequestUseCase`
  - `MarkQuoteRequestViewedUseCase`
  - `CreateQuoteUseCase`
  - `GetQuoteForQuoteRequestUseCase`
  - `UpdateQuoteUseCase`
  - `SendQuoteUseCase`
  - `AcceptQuoteUseCase`
  - `RejectQuoteUseCase`
  - `PreferQuoteUseCase`
  - `CreateBookingIntentUseCase`
  - `GetBookingIntentUseCase`
  - `ConfirmBookingIntentUseCase`
  - `CancelBookingIntentUseCase`
- Controller / Route:
  - `QuoteRequestsController`
  - `QuotesController`
  - `BookingIntentsController`
- Authorization Policy: role plus event ownership or vendor assignment checks at the application boundary.
- Validation: DTO validation at the HTTP boundary using the project validation approach.
- Transaction Required:
  - QuoteRequest creation must atomically enforce active limit and duplicate active vendor request checks.
  - Quote creation/send/accept and BookingIntent create/confirm/cancel should persist state transitions consistently.

### Database

- Main Tables: `quote_requests`, `quotes`, `booking_intents`.
- Constraints:
  - Active QuoteRequest uniqueness per event/vendor where applicable.
  - Active QuoteRequest count per event/category enforced transactionally.
  - One current active Quote per QuoteRequest.
  - BookingIntent references an accepted Quote.
- Index Considerations:
  - `quote_requests(event_id, service_category_id, status)`
  - `quote_requests(vendor_profile_id, status)`
  - `quotes(quote_request_id, status)`
  - `booking_intents(quote_id)`
  - `booking_intents(event_id, vendor_profile_id, status)`

### API

| Method | Endpoint                                                     | Purpose                                      |
| ------ | ------------------------------------------------------------ | -------------------------------------------- |
| GET    | `/api/v1/events/:eventId/quote-requests`                    | Organizer lists QuoteRequests for own event. |
| POST   | `/api/v1/events/:eventId/quote-requests`                    | Organizer creates QuoteRequest.              |
| GET    | `/api/v1/quote-requests/:quoteRequestId`                    | Organizer/vendor retrieves detail.           |
| PATCH  | `/api/v1/quote-requests/:quoteRequestId/cancel`             | Organizer cancels QuoteRequest.              |
| GET    | `/api/v1/vendors/me/quote-requests`                         | Vendor lists assigned QuoteRequests.         |
| PATCH  | `/api/v1/quote-requests/:quoteRequestId/viewed`             | Vendor marks QuoteRequest as viewed.         |
| GET    | `/api/v1/quote-requests/:quoteRequestId/quote`              | Organizer/vendor retrieves Quote for request. |
| POST   | `/api/v1/quote-requests/:quoteRequestId/quote`              | Vendor creates draft Quote.                  |
| PATCH  | `/api/v1/quotes/:quoteId`                                   | Vendor edits draft Quote.                    |
| POST   | `/api/v1/quotes/:quoteId/send`                              | Vendor sends Quote.                          |
| POST   | `/api/v1/quotes/:quoteId/accept`                            | Organizer accepts Quote.                     |
| POST   | `/api/v1/quotes/:quoteId/reject`                            | Organizer rejects Quote.                     |
| POST   | `/api/v1/quotes/:quoteId/prefer`                            | Organizer marks Quote as preferred.          |
| POST   | `/api/v1/booking-intents`                                   | Organizer creates BookingIntent.             |
| GET    | `/api/v1/booking-intents/:bookingIntentId`                  | Organizer/vendor retrieves BookingIntent.    |
| POST   | `/api/v1/booking-intents/:bookingIntentId/confirm`          | Vendor confirms BookingIntent.               |
| POST   | `/api/v1/booking-intents/:bookingIntentId/cancel`           | Organizer/vendor cancels BookingIntent.      |

### Observability / Audit

- Correlation ID Required: Yes.
- Log Event Required: Yes, for critical state transitions and authorization failures.
- AdminAction Required: No.
- AIRecommendation Required: No new record; optional ID may be linked if provided.
- Suggested events:
  - `quote_request.created`
  - `quote_request.viewed`
  - `quote_request.cancelled`
  - `quote.created`
  - `quote.sent`
  - `quote.accepted`
  - `quote.rejected`
  - `quote.preferred`
  - `booking_intent.created`
  - `booking_intent.confirmed`
  - `booking_intent.cancelled`

### Documentation Alignment Required

- Doc 16 defines the canonical Quote route for this story as singular `/quote-requests/:quoteRequestId/quote`; Doc 14 and Doc 19 mention plural `/quote-requests/:quoteRequestId/quotes` in places. This story uses Doc 16 for PB-P0-004.
- Doc 16 includes some admin visibility in endpoint roles, while PB-P0-004 notes admin endpoints as P1. This story excludes admin-specific quote/booking access unless a later decision explicitly brings it into P0.
- Business rules reference `preferred` in quote flow language, while Doc 16 models preference as `Quote.isPreferred` instead of a QuoteRequest status. This story follows the Doc 16 DTO model.
- Expiration jobs, notifications, budget committed synchronization, and review enablement are documented product capabilities but remain outside this P0 endpoint foundation.

---

## Test Scenarios

### Functional Tests

| ID    | Scenario                                                            | Type                    |
| ----- | ------------------------------------------------------------------- | ----------------------- |
| TS-01 | Organizer creates QuoteRequest for own active event.                | Integration / Supertest |
| TS-02 | Organizer lists QuoteRequests for own event.                        | Integration / Supertest |
| TS-03 | Vendor lists only assigned QuoteRequests.                           | Integration / Supertest |
| TS-04 | Vendor marks assigned QuoteRequest as viewed.                       | Integration / Supertest |
| TS-05 | Vendor creates, edits, and sends a Quote.                           | Integration / Supertest |
| TS-06 | Organizer accepts, rejects, and prefers Quote through action routes. | Integration / Supertest |
| TS-07 | Organizer creates BookingIntent from accepted non-expired Quote.     | Integration / Supertest |
| TS-08 | Vendor confirms BookingIntent.                                      | Integration / Supertest |
| TS-09 | Organizer or assigned vendor cancels BookingIntent with reason.      | Integration / Supertest |
| TS-10 | API responses follow envelope, correlation, and error conventions.   | Integration / Contract  |

### Negative Tests

| ID    | Scenario                                                       | Expected Result                                      |
| ----- | -------------------------------------------------------------- | ---------------------------------------------------- |
| NT-01 | Unauthenticated request to protected endpoint.                 | `401`.                                               |
| NT-02 | Organizer accesses quote data for another organizer's event.   | `403` or `404`.                                      |
| NT-03 | Vendor accesses unassigned QuoteRequest or BookingIntent.      | `403` or `404`.                                      |
| NT-04 | Sixth active QuoteRequest for same event/category.             | `409 MAX_QUOTE_REQUESTS_EXCEEDED`.                   |
| NT-05 | Duplicate active QuoteRequest for same event/vendor.           | `409 DUPLICATE_QUOTE_REQUEST_ACTIVE`.                |
| NT-06 | Vendor edits non-draft Quote.                                  | `422`.                                               |
| NT-07 | Organizer accepts expired Quote.                               | `410 QUOTE_EXPIRED`.                                 |
| NT-08 | Organizer creates BookingIntent from non-accepted Quote.        | Documented business error.                           |
| NT-09 | BookingIntent cancel request has blank cancellation reason.     | `422`.                                               |
| NT-10 | Request body has invalid decimal, date, enum, or ID value.      | `422` with standard validation error format.         |

### AI Tests

Not applicable. This story must not call an AI provider.

### Authorization Tests

| ID         | Scenario                                                       | Expected Result |
| ---------- | -------------------------------------------------------------- | --------------- |
| AUTH-TS-01 | Organizer owns event and creates/list QuoteRequests.           | Success         |
| AUTH-TS-02 | Organizer does not own event.                                  | Denied          |
| AUTH-TS-03 | Vendor is assigned to QuoteRequest and creates/sends Quote.    | Success         |
| AUTH-TS-04 | Vendor is not assigned to QuoteRequest.                        | Denied          |
| AUTH-TS-05 | Organizer accepts/rejects/prefers Quote for owned event.       | Success         |
| AUTH-TS-06 | Vendor tries to accept/reject/prefer Quote.                    | Denied          |
| AUTH-TS-07 | Assigned vendor confirms BookingIntent.                       | Success         |
| AUTH-TS-08 | Unrelated user retrieves or cancels BookingIntent.             | Denied          |

### Accessibility Tests

Not applicable. No UI is delivered by this story.

---

## Business Impact

| Field               | Value                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| KPI Affected        | API contract completeness, frontend integration readiness, QA automation coverage |
| Expected Impact     | Enables quote and simulated booking workflows to be integrated after P0 backend foundation is available |
| Success Criteria    | Contract endpoints implemented, tested with Supertest, and aligned with `/api/v1` conventions |
| Academic Demo Value | Demonstrates bilateral organizer/vendor workflow readiness without introducing out-of-scope payments or contracts |

---

## Task Breakdown Readiness

### Potential Frontend Tasks

- Generate or update API client calls after backend contract approval.
- Add MSW handlers and fixtures for QuoteRequest, Quote, and BookingIntent flows.

### Potential Backend Tasks

- Implement controllers, DTOs, authorization guards, use cases, repositories, and integration tests for all listed endpoints.
- Add domain transition logging and correlation ID propagation.

### Potential Database Tasks

- Add or verify migrations, indexes, constraints, and transactional checks for QuoteRequest, Quote, and BookingIntent.

### Potential AI / PromptOps Tasks

- Not applicable for this story.

### Potential QA Tasks

- Add Supertest suites for happy path, validation, authorization-negative, and business-negative scenarios.
- Validate Doc 16 route contract against MSW/frontend expectations.

### Potential DevOps / Config Tasks

- Ensure test database setup supports quote and booking fixtures.
- Ensure CI executes endpoint integration tests consistently.
