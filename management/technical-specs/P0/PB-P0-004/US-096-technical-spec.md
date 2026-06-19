# Technical Specification — US-096: Implementar endpoints Quote / Booking del contrato REST

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-096 |
| Source User Story | `management/user-stories/US-096-quote-endpoints-implementation.md` |
| Decision Resolution Artifact | No aplica |
| Priority | P0 |
| Backlog ID | PB-P0-004 |
| Backlog Title | REST API Endpoints Foundation (Doc 16) |
| Backlog Execution Order | 4 |
| User Story Position in Backlog Item | 3 of 4 |
| Related User Stories in Backlog Item | US-094, US-095, US-096, US-097 |
| Epic | EPIC-API-001 |
| Backlog Item Dependencies | PB-P0-002, PB-P0-003 |
| Feature | REST API Endpoints Foundation |
| Module / Domain | API / Quote Flow / Booking Intent |
| User Story Status | Approved |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-15 |
| Last Updated | 2026-06-15 |

---

## 2. Backlog Execution Context

### Product Backlog Item

US-096 belongs to PB-P0-004, which implements the REST API foundation aligned with Doc 16. This story covers the QuoteRequest, Quote and BookingIntent API surface required for bilateral organizer/vendor workflows and simulated booking.

### Execution Order Rationale

US-096 must execute after US-094 and US-095 because quote and booking endpoints require authentication, role context, event ownership and active event validation. It should execute before US-097 because AI quote comparison and quote brief endpoints depend on stable QuoteRequest and Quote contracts.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-094 | Auth/session/profile foundation | 1 |
| US-095 | Event API and ownership foundation | 2 |
| US-096 | Quote/Booking API foundation | 3 |
| US-097 | AI API foundation using event/quote contexts | 4 |

---

## 3. Executive Technical Summary

Implement QuoteRequest, Quote and BookingIntent endpoints under `/api/v1` using Express, TypeScript, Zod, Prisma and PostgreSQL inside the modular monolith. The implementation must preserve Doc 16 as canonical API contract, including singular `/quote-requests/:quoteRequestId/quote` for the current quote route.

The implementation must enforce organizer event ownership, vendor assignment authorization, active QuoteRequest limits, one current Quote per QuoteRequest, draft-only Quote editing, default Quote validity of 15 calendar days, accepted non-expired Quote requirement for BookingIntent creation, and simulated booking semantics with no payment or contract side effects.

---

## 4. Scope Boundary

### In Scope

- Organizer QuoteRequest create/list/detail/cancel.
- Vendor assigned QuoteRequest list and mark viewed.
- Vendor Quote create/retrieve/edit/send.
- Organizer Quote accept/reject/prefer.
- Organizer BookingIntent create from accepted non-expired Quote.
- Vendor BookingIntent confirm.
- Organizer/vendor BookingIntent retrieve/cancel.
- DTO validation, role checks, ownership checks and assignment checks.
- Domain error mapping for quote limits, duplicate active requests, expired quotes and invalid state transitions.
- Supertest/API/authorization tests.

### Out of Scope

- Quote management UI.
- AI quote brief generation endpoint execution.
- AI quote comparison summary endpoint execution.
- Notifications delivery.
- Quote expiration scheduled job.
- Budget committed synchronization internals.
- Review enablement after booking confirmation.
- Admin dashboards or admin quote/booking reads.
- Payments, contracts, escrow, invoices, e-signature or billing.
- Chat, negotiation threads or file attachments.

### Explicit Non-Goals

- Do not implement real payment or contract behavior.
- Do not implement admin quote/booking access.
- Do not implement expiration jobs in this story.
- Do not implement AI provider calls.
- Do not add plural `/quote-requests/:quoteRequestId/quotes` unless a later route-alias decision explicitly approves it.

---

## 5. Architecture Alignment

### Backend Architecture

Use `quote-flow` and `booking-intent` modules. Controllers must remain thin and delegate to application use cases. Domain policies should enforce quote limits, quote validity and booking state transitions.

### Frontend Architecture

No UI implementation. The API contract should support future frontend clients and MSW fixtures for organizer quote workflows and vendor quote responses.

### Database Architecture

Use Prisma/PostgreSQL tables `quote_requests`, `quotes` and `booking_intents`, with partial unique indexes and transaction-backed cross-row validations where required.

### API Architecture

REST JSON under `/api/v1`, with standard response/error envelopes, Zod validation, stable error codes and correlation metadata.

### AI / PromptOps Architecture

No AI provider invocation. `aiRecommendationId` may be accepted as an optional reference only when an upstream AI quote brief exists.

### Security Architecture

Backend enforces role plus ownership/assignment:

- Organizer owns the event.
- Vendor is assigned to QuoteRequest/Quote/BookingIntent.
- No data leakage across organizers or vendors.

### Testing Architecture

Use Vitest and Supertest. Include happy path, domain-negative, validation-negative and authorization-negative tests as mandatory quality gates.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 Create QuoteRequest | Validate organizer ownership, event active, vendor/category validity, max 5 active per category/event and no duplicate active vendor request. | API, Application, Domain, DB, Security |
| AC-02 List event QuoteRequests | Owner-scoped list query with pagination/filter conventions. | API, Application, DB, Security |
| AC-03 Vendor assigned list | Vendor-scoped query by vendor profile and assignment. | API, Application, DB, Security |
| AC-04 QuoteRequest detail | Organizer owner or assigned vendor can retrieve detail. | API, Application, Security |
| AC-05 Cancel QuoteRequest | Organizer owner transitions eligible QuoteRequest to `cancelled`. | API, Application, Domain, DB |
| AC-06 Mark viewed | Assigned vendor marks `sent` QuoteRequest as `viewed` and records timestamp. | API, Application, Domain, DB |
| AC-07 Create/retrieve Quote | Assigned vendor creates one draft/current Quote for a QuoteRequest; owner/vendor can retrieve. | API, Application, Domain, DB, Security |
| AC-08 Edit/send draft Quote | Vendor can edit only `draft`; send applies status and default `validUntil`. | API, Application, Domain, DB |
| AC-09 Accept/reject/prefer | Organizer owner changes Quote decision state; expired accept returns `410 QUOTE_EXPIRED`. | API, Application, Domain, DB |
| AC-10 Create BookingIntent | Organizer owner creates simulated booking from accepted non-expired Quote. | API, Application, Domain, DB |
| AC-11 Confirm BookingIntent | Assigned vendor confirms pending booking intent without payment/contract side effects. | API, Application, Domain, DB |
| AC-12 Retrieve/cancel BookingIntent | Organizer/vendor parties retrieve/cancel with reason and cancellation metadata. | API, Application, Domain, DB, Security |
| AC-13 API foundation behavior | Standard envelope, errors, correlation ID, auth and Supertest coverage. | API, Middleware, Observability, QA |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

- `quote-flow`
- `booking-intent`
- `event-planning` as dependency for ownership/event status
- `vendor-management` as dependency for vendor profile/assignment
- `service-catalog` as dependency for service category validation
- `shared-kernel`
- `infrastructure/prisma`

### Use Cases / Application Services

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

Domain services/policies:

- `QuoteRequestLimitService`
- `QuoteRequestAssignmentPolicy`
- `QuoteValidityService`
- `QuoteStatePolicy`
- `BookingIntentPolicyService`

### Controllers / Routes

- `QuoteRequestsController`
- `QuotesController`
- `BookingIntentsController`

Route registration should follow Doc 16 paths exactly.

### DTOs / Schemas

Zod schemas:

- `CreateQuoteRequestRequestDto`
  - `vendorProfileId`
  - `serviceCategoryId`
  - `brief.summary`
  - `brief.requirements[]`
  - `brief.questions[]`
  - optional `brief.constraints[]`
  - optional `aiRecommendationId`
- `CreateQuoteRequestDto`
  - `totalPrice`
  - `breakdown[]`
  - `conditions`
  - optional `validUntil`
  - `currencyCode`
- `UpdateQuoteDto`
  - same editable fields as create, allowed only in draft
- `CreateBookingIntentRequestDto`
  - `quoteId`
- `CancelBookingIntentRequestDto`
  - `cancellationReason`
- Param schemas for `eventId`, `quoteRequestId`, `quoteId`, `bookingIntentId`.

### Repository / Persistence

Required repository capabilities:

- `QuoteRequestRepository.create(...)`
- `QuoteRequestRepository.countActiveByEventCategory(...)`
- `QuoteRequestRepository.findActiveByEventVendor(...)`
- `QuoteRequestRepository.listByEventOwner(...)`
- `QuoteRequestRepository.listByVendor(...)`
- `QuoteRequestRepository.findAccessibleByOrganizerOrVendor(...)`
- `QuoteRequestRepository.markViewed(...)`
- `QuoteRequestRepository.cancel(...)`
- `QuoteRepository.createDraft(...)`
- `QuoteRepository.findCurrentByQuoteRequest(...)`
- `QuoteRepository.updateDraft(...)`
- `QuoteRepository.send(...)`
- `QuoteRepository.accept(...)`
- `QuoteRepository.reject(...)`
- `QuoteRepository.prefer(...)`
- `BookingIntentRepository.create(...)`
- `BookingIntentRepository.findAccessibleByParty(...)`
- `BookingIntentRepository.confirm(...)`
- `BookingIntentRepository.cancel(...)`

### Validation Rules

- QuoteRequest creation requires owned active event.
- Max five active QuoteRequests per event/category.
- No duplicate active QuoteRequest for same event/vendor.
- Vendor must be approved/eligible according to existing vendor domain.
- Vendor must be assigned to create or send Quote.
- Quote can be edited only while draft.
- Quote send applies default `validUntil = createdAt + 15 days` if omitted.
- Accepting expired Quote returns `410 QUOTE_EXPIRED`.
- BookingIntent requires accepted, non-expired Quote.
- BookingIntent cancellation requires reason.

### Error Handling

Use standard error envelope:

- `401 AUTHENTICATION_REQUIRED`
- `403 FORBIDDEN`
- `404 NOT_FOUND` for masked inaccessible resources
- `409 MAX_QUOTE_REQUESTS_EXCEEDED`
- `409 DUPLICATE_QUOTE_REQUEST_ACTIVE`
- `410 QUOTE_EXPIRED`
- `422 VALIDATION_ERROR`
- `422 BUSINESS_RULE_VIOLATION`

### Transactions

Use transactions for:

- QuoteRequest creation limit check + duplicate check + insert.
- Quote creation where uniqueness/current quote must be enforced.
- Quote send/accept/reject/prefer state transitions.
- BookingIntent create from accepted Quote.
- BookingIntent confirm/cancel transitions.

Concurrency note: QuoteRequest active limit and duplicate active vendor request are cross-row constraints; use transaction plus partial unique index and map DB conflicts to stable domain errors.

### Observability

Emit structured logs/events for:

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
- authorization failures and business-rule violations

---

## 8. Frontend Technical Design

### Routes / Pages

No aplica. No UI in this story.

### Components

No aplica.

### Forms

No aplica. Future organizer/vendor forms must follow DTOs in this spec.

### State Management

No aplica. Future frontend should use TanStack Query with keys by event, vendor inbox, quote request, quote and booking intent.

### Data Fetching

No aplica. Future clients must use `credentials: 'include'` and handle standard envelopes.

### Loading / Empty / Error / Success States

No aplica. The API should support empty lists through valid paginated envelopes.

### Accessibility

No aplica.

### i18n

No aplica for UI. Error codes remain stable for future localized messages.

---

## 9. API Contract Design

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| GET | `/api/v1/events/:eventId/quote-requests` | Organizer lists event QuoteRequests | organizer owner | params/query | `200` paginated list | `401`, `403`/`404`, `422` |
| POST | `/api/v1/events/:eventId/quote-requests` | Organizer creates QuoteRequest | organizer owner | `CreateQuoteRequestRequestDto` | `201 QuoteRequestResponseDto` | `401`, `403`/`404`, `409`, `422` |
| GET | `/api/v1/quote-requests/:quoteRequestId` | Retrieve QuoteRequest detail | organizer owner or assigned vendor | params | `200 QuoteRequestResponseDto` | `401`, `403`/`404` |
| PATCH | `/api/v1/quote-requests/:quoteRequestId/cancel` | Organizer cancels QuoteRequest | organizer owner | params | `200 QuoteRequestResponseDto` | `401`, `403`/`404`, `422` |
| GET | `/api/v1/vendors/me/quote-requests` | Vendor lists assigned QuoteRequests | vendor | query | `200` paginated list | `401`, `403`, `422` |
| PATCH | `/api/v1/quote-requests/:quoteRequestId/viewed` | Vendor marks assigned request viewed | assigned vendor | params | `204` | `401`, `403`/`404`, `422` |
| GET | `/api/v1/quote-requests/:quoteRequestId/quote` | Retrieve current Quote for request | organizer owner or assigned vendor | params | `200 QuoteResponseDto` | `401`, `403`/`404` |
| POST | `/api/v1/quote-requests/:quoteRequestId/quote` | Vendor creates draft Quote | assigned vendor | `CreateQuoteRequestDto` | `201 QuoteResponseDto` | `401`, `403`/`404`, `422` |
| PATCH | `/api/v1/quotes/:quoteId` | Vendor edits draft Quote | quote owner vendor | `UpdateQuoteDto` | `200 QuoteResponseDto` | `401`, `403`/`404`, `422` |
| POST | `/api/v1/quotes/:quoteId/send` | Vendor sends Quote | quote owner vendor | params | `200 QuoteResponseDto` | `401`, `403`/`404`, `422` |
| POST | `/api/v1/quotes/:quoteId/accept` | Organizer accepts Quote | organizer owner | params | `200 QuoteResponseDto` | `401`, `403`/`404`, `410`, `422` |
| POST | `/api/v1/quotes/:quoteId/reject` | Organizer rejects Quote | organizer owner | params | `200 QuoteResponseDto` | `401`, `403`/`404`, `422` |
| POST | `/api/v1/quotes/:quoteId/prefer` | Organizer marks Quote preferred | organizer owner | params | `200 QuoteResponseDto` | `401`, `403`/`404`, `422` |
| POST | `/api/v1/booking-intents` | Organizer creates BookingIntent | organizer owner | `CreateBookingIntentRequestDto` | `201 BookingIntentResponseDto` | `401`, `403`/`404`, `422` |
| GET | `/api/v1/booking-intents/:bookingIntentId` | Retrieve BookingIntent | organizer owner or assigned vendor | params | `200 BookingIntentResponseDto` | `401`, `403`/`404` |
| POST | `/api/v1/booking-intents/:bookingIntentId/confirm` | Vendor confirms BookingIntent | assigned vendor | params | `200 BookingIntentResponseDto` | `401`, `403`/`404`, `422` |
| POST | `/api/v1/booking-intents/:bookingIntentId/cancel` | Organizer/vendor cancels BookingIntent | organizer owner or assigned vendor | `CancelBookingIntentRequestDto` | `200 BookingIntentResponseDto` | `401`, `403`/`404`, `422` |

---

## 10. Database / Prisma Design

### Models Impacted

- `QuoteRequest`
- `Quote`
- `BookingIntent`
- dependencies: `Event`, `VendorProfile`, `ServiceCategory`, optional `AIRecommendation`

### Fields / Columns

`quote_requests`:

- `id`
- `event_id`
- `vendor_profile_id`
- `service_category_id`
- `brief`
- `language_code`
- `status`
- `viewed_at`
- `ai_generated_brief`
- `ai_recommendation_id`
- `cancelled_at` if present in schema, or supported by timestamps/status metadata
- `cancelled_reason`
- `is_seed`
- `created_at`
- `updated_at`

`quotes`:

- `id`
- `quote_request_id`
- `vendor_profile_id`
- `total_price`
- `currency_code`
- `breakdown`
- `conditions`
- `valid_until`
- `status`
- `is_preferred`
- `sent_at`
- `accepted_at`
- `rejected_at`
- `expired_at`
- `is_seed`
- `created_at`
- `updated_at`

`booking_intents`:

- `id`
- `quote_id`
- `event_id`
- `vendor_profile_id`
- `service_category_id`
- `status`
- `confirmed_at`
- `cancelled_at`
- `cancelled_by`
- `cancellation_reason`
- `is_simulated`
- `is_seed`
- `created_at`
- `updated_at`

### Relations

- `quote_requests.event_id -> events.id`
- `quote_requests.vendor_profile_id -> vendor_profiles.id`
- `quote_requests.service_category_id -> service_categories.id`
- `quote_requests.ai_recommendation_id -> ai_recommendations.id` optional
- `quotes.quote_request_id -> quote_requests.id`
- `quotes.vendor_profile_id -> vendor_profiles.id`
- `booking_intents.quote_id -> quotes.id`
- `booking_intents.event_id -> events.id`
- `booking_intents.vendor_profile_id -> vendor_profiles.id`
- `booking_intents.service_category_id -> service_categories.id`

### Indexes

- `uq_quote_requests_event_vendor_active`
- `idx_quote_requests_vendor_status`
- `idx_quote_requests_event_status`
- `idx_quote_requests_event_category_active`
- `uq_quotes_request_active`
- `idx_quotes_quote_request_id`
- `idx_quotes_status`
- `idx_quotes_valid_until_active`
- `uq_booking_intents_event_category_confirmed`
- `idx_booking_intents_event_id`
- `idx_booking_intents_vendor_profile_id`

### Constraints

- Active QuoteRequest uniqueness per event/vendor.
- Max five active QuoteRequests per event/category enforced transactionally.
- One current active/non-rejected Quote per QuoteRequest.
- Quote price non-negative.
- Quote currency matches event currency.
- BookingIntent is simulated: `is_simulated=true`.
- Only one confirmed BookingIntent per event/category.

### Migrations Impact

If PB-P0-001 already created these models, this story should verify constraints and indexes rather than duplicate schema work. Add only missing partial indexes or fields required by Doc 16 contract.

### Seed Impact

Tests require fixtures for:

- active organizer event,
- approved/eligible vendor profile,
- service category,
- quote requests in multiple statuses,
- quotes in draft/sent/accepted/expired,
- booking intents in pending/confirmed/cancelled.

---

## 11. AI / PromptOps Design

### AI Feature

No aplica. This story does not execute AI.

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

`aiRecommendationId` may be linked to QuoteRequest when supplied and accessible, but this story must not create a new `AIRecommendation`.

### Safety Rules

Do not call `LLMProvider`. Treat AI brief data as already human-provided/accepted upstream.

---

## 12. Security & Authorization Design

### Authentication

All endpoints require authenticated session from US-094.

### Authorization

- Organizer actions require ownership of the linked event.
- Vendor actions require assignment to the QuoteRequest, Quote or BookingIntent.
- Admin access is out of scope.

### Ownership Rules

- Organizer owns event and can manage QuoteRequests, Quote decisions and BookingIntent creation/cancellation for that event.
- Vendor owns/receives assigned QuoteRequest and can view, mark viewed, create/edit/send Quote and confirm/cancel BookingIntent.

### Role Rules

- `organizer`: create/list/cancel QuoteRequest, accept/reject/prefer Quote, create BookingIntent, retrieve/cancel own BookingIntent.
- `vendor`: list assigned QuoteRequests, mark viewed, create/edit/send Quote, retrieve/confirm/cancel assigned BookingIntent.
- `admin`: no access implemented in US-096.
- `anonymous`: denied.

### Negative Authorization Scenarios

- Anonymous -> 401.
- Vendor accesses unassigned QuoteRequest -> 403/404.
- Organizer accesses another organizer event QuoteRequest -> 403/404.
- Vendor accepts/rejects/prefers Quote -> denied.
- Organizer edits vendor draft Quote -> denied.
- Unrelated user retrieves/cancels BookingIntent -> denied.

### Audit Requirements

No `AdminAction` in US-096. Use structured domain logs for transitions.

### Sensitive Data Handling

Do not log full `brief`, `conditions`, cancellation reason or private event details. Logs should include IDs, actor role, action, result and correlation ID.

---

## 13. Testing Strategy

### Unit Tests

- QuoteRequest active limit policy.
- Duplicate active QuoteRequest policy.
- Quote draft-only edit policy.
- Quote validity/default `validUntil` policy.
- BookingIntent state transition policy.
- BookingIntent cancellation reason validator.

### Integration Tests

- Organizer creates QuoteRequest for active owned event.
- Organizer lists own event QuoteRequests.
- Vendor lists assigned QuoteRequests.
- Vendor marks QuoteRequest viewed.
- Vendor creates/edits/sends Quote.
- Organizer accepts/rejects/prefers Quote.
- Organizer creates BookingIntent from accepted non-expired Quote.
- Vendor confirms BookingIntent.
- Organizer/vendor cancels BookingIntent.

### API Tests

Use Supertest for all endpoints. Assert status codes, envelopes, correlation ID, error codes and DB state transitions.

### E2E Tests

No required E2E in this technical spec. Full demo flow may be covered later by Playwright after frontend exists.

### Security Tests

- Cross-organizer access denied.
- Unassigned vendor access denied.
- Wrong role action denied.
- Admin access remains absent/out of scope.
- Masked 404/403 behavior consistent with security convention.

### Accessibility Tests

No aplica. No UI.

### AI Tests

No aplica. Verify no provider call is made when `aiRecommendationId` is supplied.

### Seed / Demo Tests

- Fixtures support organizer/vendor bilateral flow.
- BookingIntent remains simulated.
- No payment/contract side effects are created.

### CI Checks

- Vitest unit tests.
- Supertest integration/API tests.
- Prisma test DB with quote/booking fixtures.
- Authorization negative tests as quality gate.

---

## 14. Observability & Audit

### Logs

Log state transitions, business-rule violations and authorization failures with correlation ID.

### Correlation ID

All responses and logs must propagate correlation metadata.

### AdminAction

No aplica.

### Error Tracking

Unexpected exceptions should be captured with redacted context. Expected domain errors should not include stack traces in responses.

### Metrics

Recommended metrics:

- QuoteRequests created/viewed/cancelled.
- Quotes created/sent/accepted/rejected/preferred.
- BookingIntents created/confirmed/cancelled.
- Limit violations.
- Authorization denials.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

No new seed data is required by this story, but tests/demo need organizer, active event, service category and vendor profile fixtures.

### Demo Scenario Supported

Supports organizer-to-vendor quote request, vendor quote response, organizer quote decision and simulated booking intent confirmation.

### Reset / Isolation Notes

Quote/Booking integration tests should isolate event/vendor/category combinations to avoid partial unique index conflicts.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| Doc 16 vs Doc 14/Doc 19 | Doc 16 uses singular `/quote-requests/:quoteRequestId/quote`; other docs mention plural route variants. | Use Doc 16 singular route for US-096. | Align Doc 14/Doc 19 or add aliases only after formal decision. | No |
| Doc 16 admin visibility vs PB-P0-004 | Doc 16 mentions admin visibility in some quote/booking roles; PB-P0-004 notes admin endpoints as P1. | Exclude admin quote/booking access from US-096. | Clarify P0/P1 boundary before OpenAPI snapshot. | No |
| Business rule wording for preferred | Some docs mention `preferred` in quote flow language; Doc 16 models preference as `Quote.isPreferred`. | Use `Quote.isPreferred`. | Align business wording to DTO model. | No |
| Product capabilities vs P0 foundation | Jobs, notifications, budget committed sync and review enablement are documented but outside US-096. | Keep them out of US-096; preserve compatibility only. | Validate in their specific backlog stories. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Race condition on max five active QuoteRequests | Limit can be exceeded | Use transaction and partial indexes; test concurrent attempts if feasible. |
| Duplicate active QuoteRequest not mapped cleanly | Poor UX / contract mismatch | Map DB unique violation to `DUPLICATE_QUOTE_REQUEST_ACTIVE`. |
| Vendor assignment checks inconsistent | Data leakage | Centralize assignment policy and add unassigned vendor tests. |
| Quote route plural/singular drift | Frontend/MSW mismatch | Implement Doc 16 singular route and document alignment. |
| Expired Quote handling without job | Accepting stale quotes | Validate current status/date on accept/create BookingIntent even though job is out of scope. |
| Payment/contract side effects creep in | Violates MVP guardrails | Keep BookingIntent simulated and assert no payment artifacts in tests. |

---

## 18. Implementation Guidance for Coding Agents

- Likely impacted folders:
  - `src/modules/quote-flow/`
  - `src/modules/booking-intent/`
  - `src/modules/event-planning/` read-only dependency
  - `src/modules/vendor-management/` read-only dependency
  - `src/modules/service-catalog/` read-only dependency
  - `src/infrastructure/prisma/`
  - `tests/integration/quotes/`
  - `tests/integration/booking-intents/`
- Recommended implementation order:
  1. Verify Prisma models/indexes from PB-P0-001.
  2. Implement DTO schemas and route params.
  3. Implement domain policies.
  4. Implement repository methods.
  5. Implement QuoteRequest use cases/controllers.
  6. Implement Quote use cases/controllers.
  7. Implement BookingIntent use cases/controllers.
  8. Add Supertest happy/negative/security tests.
- Decisions that must not be reopened:
  - Use Doc 16 route contract.
  - Keep BookingIntent simulated.
  - Exclude admin access.
  - Exclude jobs/notifications/budget sync/reviews.
- What must not be implemented:
  - Real payment.
  - Contract/e-signature.
  - Chat/negotiation.
  - AI provider calls.
  - Admin dashboards.
- Assumptions to preserve:
  - US-094 and US-095 are available.
  - Event must be active for QuoteRequest creation.
  - Vendor must be assigned for vendor actions.

---

## 19. Task Generation Notes

- Suggested task groups:
  - QuoteRequest DTO/routes/use cases/repository.
  - Quote DTO/routes/use cases/repository.
  - BookingIntent DTO/routes/use cases/repository.
  - Domain policies.
  - Authorization/assignment guards.
  - Supertest/API/security coverage.
- Required QA tasks:
  - Happy path for all endpoints.
  - Authorization negatives.
  - Domain negatives: limits, duplicate active, draft-only, expired quote, cancellation reason.
  - Contract envelope/correlation tests.
- Required security tasks:
  - Organizer ownership checks.
  - Vendor assignment checks.
  - Admin exclusion tests if route registration could expose admin behavior.
- Required seed/demo tasks:
  - Fixtures for active events, vendor profiles and service categories.
  - Confirm BookingIntent simulated flag.
- Required documentation tasks:
  - Track route singular/plural alignment.
  - Track admin/P0 boundary alignment.
- Dependencies between tasks:
  - Auth/event fixtures before quote tests.
  - QuoteRequest implementation before Quote implementation.
  - Quote accept flow before BookingIntent create.
- Parent backlog item should later generate a consolidated `tasks.md` after US-094..US-097 specs exist.

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
| AI impact clear | Pass |
| Security impact clear | Pass |
| Testing strategy clear | Pass |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`

US-096 has an approved story, Product Backlog mapping to PB-P0-004, clear Doc 16 API contract, explicit security and assignment requirements, concrete database constraints, and sufficient QA strategy. It is ready for `eventflow-user-story-to-development-tasks`.
