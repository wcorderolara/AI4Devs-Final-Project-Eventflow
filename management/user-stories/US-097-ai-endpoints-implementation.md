# User Story: Implementar endpoints AI del contrato REST

## Metadata

| Field              | Value                                      |
| ------------------ | ------------------------------------------ |
| ID                 | US-097                                     |
| Epic               | EPIC-API-001                               |
| Feature            | REST API Endpoints Foundation              |
| Backlog Item       | PB-P0-004                                  |
| Module / Domain    | API / AI Assistance                        |
| User Role          | System                                     |
| Priority           | Must Have (P0)                             |
| Status             | Ready for Approval                         |
| Owner              | Product Owner / Business Analyst           |
| Sprint / Milestone | MVP                                        |
| Created Date       | 2026-06-09                                 |
| Last Updated       | 2026-06-12                                 |

---

## User Story

**As the** EventFlow backend system  
**I want** to expose versioned REST endpoints for AI Assistance and AIRecommendation under `/api/v1`  
**So that** frontend clients, MSW contracts, QA automation, and AI product features can consume backend-only LLM capabilities through a stable, secure, human-in-the-loop API contract.

---

## Business Context

### Context Summary

This story implements the P0 REST API surface for AI Assistance endpoints defined in Doc 16. It establishes the HTTP contract, request/response envelope, authorization checks, `aiMeta` response expectations, and AIRecommendation action endpoints needed by downstream AI product stories.

It is not a full delivery story for every AI product feature. Prompt registry, provider adapters, AIRecommendation persistence internals, timeout/fallback mechanics, and feature-specific product behavior are covered by PB-P0-010, PB-P0-011, and P1 AI product backlog items. US-097 must expose the API contract in a way that integrates with those capabilities and preserves EventFlow's non-negotiable AI guardrails: backend-only LLM access, strict human-in-the-loop, no autonomous decisions, validated structured output, and traceable `AIRecommendation` records.

### Related Domain Concepts

- AIRecommendation
- AIPromptVersion or static prompt registry reference
- LLMProvider
- OpenAIProvider
- MockAIProvider
- AnthropicProvider stub
- Event
- QuoteRequest
- VendorProfile
- Human-in-the-loop status transitions
- `aiMeta` response metadata

### Assumptions

- Authentication and role context are available from US-094.
- Event ownership and event lookup behavior are available from US-095.
- QuoteRequest and Quote access behavior are available from US-096 for quote comparison AI.
- `LLMProvider`, prompt registry, provider selection, persistence internals, timeout, fallback, and JSON schema validation are delivered by AI foundation stories such as PB-P0-010 and PB-P0-011, or are implemented as dependencies before these endpoints are marked complete.
- Doc 16 is the canonical API contract for paths and response shape in this P0 endpoint foundation.

### Dependencies

- PB-P0-001: Backend baseline and modular architecture
- PB-P0-002: Authentication and authorization foundation
- PB-P0-003: Event domain foundation
- PB-P0-004: REST API Endpoints Foundation
- PB-P0-010: Prompt Registry & AIRecommendation Persistence
- PB-P0-011: AI Timeout, Fallback & JSON Validation
- US-094: Auth endpoints implementation
- US-095: Event endpoints implementation
- US-096: Quote endpoints implementation, for quote comparison AI access

---

## PO/BA Decisions Applied

| Decision Area | Applied Decision |
| --- | --- |
| Contract source | Use Doc 16 §35 as canonical for AI endpoint paths and base DTOs. |
| Backend-only AI | Frontend calls EventFlow backend only; LLM provider keys never leave backend. |
| Human-in-the-loop | Every generated output is returned as an `AIRecommendation` with status `pending` until `apply` or `discard`. |
| No generic chat | Only feature-specific AI endpoints are allowed; no `/ai/chat`, free-form assistant, or generic prompt endpoint. |
| P0 scope | This story delivers endpoint contract behavior, routing, guards, DTO validation, and integration points. Full product UX and feature materialization remain in AI product stories. |
| Testing mode | Automated tests must use `MockAIProvider` or deterministic provider doubles; no CI dependency on OpenAI. |

---

## Traceability

| Source                 | Reference                                                                                                                                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FRD Requirement(s)     | FR-AI-001..020, FR-AUTH-010, FR-EVENT-006, FR-QUOTE-023, FR-QUOTE-024                                                                                                                                     |
| Use Case(s)            | UC-AI-001..009, UC-QUOTE-005                                                                                                                                                                              |
| Business Rule(s)       | BR-AI-001..015, BR-AUTH-009, BR-EVENT-002, BR-QUOTE-023, BR-QUOTE-024, BR-PRIVACY-002                                                                                                                     |
| Permission Rule(s)     | SEC-POL-AI-001..008; organizer must own the event or quote context; vendor must own the vendor bio context; recommendation actions require owner access                                                     |
| Data Entity / Entities | AIRecommendation, AIPromptVersion, Event, QuoteRequest, Quote, VendorProfile                                                                                                                              |
| API Endpoint(s)        | `/api/v1/events/:eventId/ai/*`, `/api/v1/quote-requests/:quoteRequestId/ai/comparison-summary`, `/api/v1/vendors/me/ai/bio`, `/api/v1/ai-recommendations/:aiRecommendationId/*`                          |
| NFR Reference(s)       | NFR-SEC-001, NFR-SEC-002, NFR-SEC-003, NFR-SEC-008, NFR-PRIV-003, NFR-REL-001, NFR-REL-002, NFR-REL-003, NFR-AI-001..010, NFR-TEST-001, NFR-TEST-003, NFR-TEST-005, NFR-OBS-002, NFR-DATA-009             |
| Related ADR(s)         | ADR-ARCH-001, ADR-BE-001, ADR-API-001, ADR-API-002, ADR-API-003, ADR-API-004, ADR-SEC-001, ADR-SEC-006, ADR-AI-001, ADR-AI-002, ADR-AI-003, ADR-AI-004, ADR-AI-005, ADR-TEST-003                         |
| Related Document(s)    | `/docs/7-AI-Features-Specification.md`, `/docs/10-Non-Functional-Requirements.md`, `/docs/14-Backend-Technical-Design.md`, `/docs/16-API-Design-Specification.md`, `/docs/17-AI-Architecture-and-PromptOps-Design.md`, `/docs/19-Security-and-Authorization-Design.md`, `/docs/20-Testing-Strategy.md`, `/docs/22-Architecture-Decision-Records.md`, `/management/artifacts/4-Product-Backlog-Prioritized.md` |

---

## Scope Guardrails

### MVP Scope

- Scope Classification: In Scope
- MVP Relevance: Must Have (P0)
- Delivery intent: backend REST API endpoint foundation for AI Assistance and AIRecommendation actions.

### Explicitly Out of Scope

- Generic `/ai/chat`, free-form prompt execution, conversational assistants, or user-defined prompt endpoints.
- Autonomous vendor approval, booking, payment, moderation, review sentiment analysis, or contract generation.
- Direct frontend calls to OpenAI, Anthropic, or any external LLM provider.
- Full UI for AI suggestions, badges, edit flows, or product-specific confirmation screens.
- Prompt authoring content, long prompt text, prompt evaluation datasets, or PromptOps evidence catalogs.
- RAG, vector databases, semantic search, or external knowledge retrieval.
- Image, audio, voice, WhatsApp, push notification, or native mobile AI flows.
- Real payment, contract, e-signature, escrow, commission, or booking automation.

### Scope Notes

- This story may invoke the AI application service through `LLMProvider` when dependencies are present, but it must not bypass the provider port or hard-code vendor SDK behavior.
- Apply/discard endpoints must enforce ownership and status transitions. They must not silently auto-apply generated output.
- Product-specific materialization after `apply` is allowed only where the linked use case already defines the target behavior; otherwise the endpoint should return a controlled domain error until that feature story is implemented.

---

## Acceptance Criteria

### AC-01: Organizer generates an event plan recommendation

**Given** an authenticated organizer owns an event  
**When** the organizer sends `POST /api/v1/events/:eventId/ai/event-plan` with a valid `AIBaseRequestDto`  
**Then** the API returns `200` with `AIRecommendationResponseDto<EventPlanOutputDto>`  
**And** the response includes `recommendationId`, `type = event_plan`, `status = pending`, structured `output`, and `aiMeta`  
**And** no event tasks, budget items, or official event data are created without a later human action.

### AC-02: Organizer generates a checklist recommendation

**Given** an authenticated organizer owns an event  
**When** the organizer sends `POST /api/v1/events/:eventId/ai/checklist`  
**Then** the API returns `200` with `type = checklist`, `status = pending`, checklist output, and `aiMeta`  
**And** generated tasks are not materialized as official `EventTask` records until an authorized human apply flow allows it.

### AC-03: Organizer generates a budget suggestion

**Given** an authenticated organizer owns an event  
**When** the organizer sends `POST /api/v1/events/:eventId/ai/budget-suggestion`  
**Then** the API returns `200` with `type = budget_suggestion`, structured budget output, and `aiMeta`  
**And** monetary values use decimal-string conventions and the event currency context.

### AC-04: Organizer generates vendor category recommendations

**Given** an authenticated organizer owns an event  
**When** the organizer sends `POST /api/v1/events/:eventId/ai/vendor-categories`  
**Then** the API returns `200` with `type = vendor_categories`, category recommendations, and `aiMeta`  
**And** output references must be compatible with active `ServiceCategory` records or return a controlled validation error.

### AC-05: Organizer generates a quote brief recommendation

**Given** an authenticated organizer owns an event  
**When** the organizer sends `POST /api/v1/events/:eventId/ai/quote-brief` with valid category/vendor context in the input  
**Then** the API returns `200` with `type = quote_brief`, `brief`, `requirements`, `questions`, `constraints`, and `aiMeta`  
**And** the response does not create or send a QuoteRequest automatically.

### AC-06: Organizer generates a quote comparison summary

**Given** an authenticated organizer owns the event linked to a QuoteRequest  
**And** the QuoteRequest has enough comparable Quote data for AI-006  
**When** the organizer sends `POST /api/v1/quote-requests/:quoteRequestId/ai/comparison-summary`  
**Then** the API returns `200` with `type = quote_comparison`, summary, per-quote strengths/risks/missing information, non-binding recommendation, and `aiMeta`  
**And** the output remains advisory and does not accept, reject, prefer, or book a Quote.

### AC-07: Vendor generates a bio/package recommendation

**Given** an authenticated vendor has an approved or editable vendor profile context  
**When** the vendor sends `POST /api/v1/vendors/me/ai/bio`  
**Then** the API returns `200` with `type = vendor_bio`, structured output, and `aiMeta`  
**And** the response does not update `VendorProfile` or `VendorService` records without an explicit human apply flow.

### AC-08: Organizer generates task prioritization

**Given** an authenticated organizer owns an event with task/checklist context  
**When** the organizer sends `POST /api/v1/events/:eventId/ai/task-prioritization`  
**Then** the API returns `200` with `type = task_prioritization`, prioritized action output, and `aiMeta`  
**And** the output remains read-only guidance unless a later product flow explicitly materializes changes.

### AC-09: Authorized user retrieves an AIRecommendation

**Given** an AIRecommendation exists  
**When** its owner sends `GET /api/v1/ai-recommendations/:aiRecommendationId`  
**Then** the API returns `200` with the recommendation detail, sanitized input/output payloads, status, type, created timestamp, and `aiMeta`-equivalent metadata  
**And** other users receive `403` or `404` according to the project security convention.

### AC-10: Authorized owner applies an AIRecommendation

**Given** an AIRecommendation exists in status `pending`  
**And** the authenticated user owns the recommendation context  
**When** the user sends `POST /api/v1/ai-recommendations/:aiRecommendationId/apply` with a valid feature-specific apply payload when required  
**Then** the API transitions the recommendation to the accepted/applied status defined by the domain model  
**And** returns `200`  
**And** materializes domain data only through the authorized feature use case, never directly from the provider output.

### AC-11: Authorized owner discards an AIRecommendation

**Given** an AIRecommendation exists in status `pending`  
**And** the authenticated user owns the recommendation context  
**When** the user sends `POST /api/v1/ai-recommendations/:aiRecommendationId/discard`  
**Then** the API marks the recommendation as discarded and returns `204`  
**And** no domain entity is created, updated, accepted, booked, paid, or moderated.

### AC-12: AI metadata is returned consistently

**Given** any successful AI generation endpoint  
**When** the API responds  
**Then** the response includes `aiMeta.provider`, `aiMeta.promptVersion`, `aiMeta.latencyMs`, `aiMeta.fallbackUsed`, `aiMeta.languageCode`, and a recommendation identifier  
**And** the API response follows the standard `/api/v1` envelope, error, and correlation ID conventions.

### AC-13: Provider errors are controlled and observable

**Given** the LLM provider times out, is unavailable, or returns invalid JSON  
**When** an AI generation endpoint is called  
**Then** the API returns the documented controlled error or fallback response according to environment configuration  
**And** errors use documented codes such as `AI_PROVIDER_UNAVAILABLE`, `AI_PROVIDER_TIMEOUT`, `AI_INVALID_OUTPUT`, `MISSING_INPUT`, or `UNSUPPORTED_LANGUAGE`  
**And** no invalid output is persisted as official domain data.

### AC-14: CI and automated tests do not depend on real LLM calls

**Given** automated tests run locally or in CI  
**When** AI endpoint tests execute  
**Then** they use `MockAIProvider` or deterministic provider doubles  
**And** no OpenAI or Anthropic network call is required for the test suite to pass.

---

## Edge Cases

### EC-01: Unauthenticated request

**Given** no valid authentication context  
**When** any AI or AIRecommendation endpoint is called  
**Then** the API returns `401`.

### EC-02: Organizer does not own event

**Given** an organizer attempts to call event-scoped AI endpoints for another organizer's event  
**When** the request is processed  
**Then** the API returns `403` or `404` before invoking `LLMProvider`.

### EC-03: QuoteRequest is not visible to organizer

**Given** an organizer does not own the event linked to a QuoteRequest  
**When** the organizer calls quote comparison AI  
**Then** the API returns `403` or `404` before invoking `LLMProvider`.

### EC-04: Vendor profile context is missing

**Given** an authenticated vendor has no editable vendor profile context  
**When** the vendor calls `/api/v1/vendors/me/ai/bio`  
**Then** the API returns a controlled domain error and does not call the provider.

### EC-05: Missing or invalid input

**Given** a request body omits required feature input  
**When** an AI endpoint is called  
**Then** the API returns `400 MISSING_INPUT` or `422` validation error.

### EC-06: Unsupported language

**Given** `languageCode` is outside the supported set  
**When** an AI endpoint is called  
**Then** the API returns `422 UNSUPPORTED_LANGUAGE` or applies the documented fallback language behavior if implemented by the AI foundation.

### EC-07: Provider timeout

**Given** the provider exceeds `AI_TIMEOUT_MS`  
**When** the endpoint waits for a response  
**Then** the API stops waiting at the configured timeout and returns `503 AI_PROVIDER_TIMEOUT` or uses `MockAIProvider` only when demo/testing fallback is enabled.

### EC-08: Invalid provider output

**Given** the provider returns invalid JSON or output that fails schema validation  
**When** the use case validates the output  
**Then** the API returns `422 AI_INVALID_OUTPUT` or the documented retry/fallback result  
**And** invalid output is not persisted as official domain data.

### EC-09: Recommendation already applied or discarded

**Given** an AIRecommendation is no longer `pending`  
**When** the owner calls `apply` or `discard` again  
**Then** the API returns an idempotent success only if defined by the use case, or a controlled `422` invalid transition error.

### EC-10: Rate limit exceeded

**Given** a user exceeds the configured AI request rate limit  
**When** the user calls any generation endpoint  
**Then** the API returns `429` and does not invoke the provider.

---

## Validation Rules

| ID    | Rule                                                                                                                                          | Message / Behavior                                  |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| VR-01 | `eventId`, `quoteRequestId`, and `aiRecommendationId` must be valid identifiers.                                                              | Return `422` for malformed IDs; `404` when absent.  |
| VR-02 | `AIBaseRequestDto.input` is required and must match the feature-specific input schema.                                                        | Return `400 MISSING_INPUT` or `422`.                |
| VR-03 | `languageCode` must be one of `es-LATAM`, `es-ES`, `pt`, or `en`; default comes from user/event preference when omitted.                     | Return `422 UNSUPPORTED_LANGUAGE` or default safely. |
| VR-04 | `preferMock` is accepted only for demo/testing contexts where policy allows it.                                                               | Ignore or reject in production configuration.       |
| VR-05 | AI output must pass the feature-specific JSON/Zod schema before response persistence.                                                         | Return `422 AI_INVALID_OUTPUT` or fallback.         |
| VR-06 | Every successful generation must create or reference an `AIRecommendation` with status `pending`.                                             | Return `200` with recommendation identifier.        |
| VR-07 | `apply` and `discard` require recommendation ownership and a valid status transition.                                                         | Return `403`, `404`, or `422`.                      |
| VR-08 | Inputs sent to LLMProvider must be minimized and sanitized; emails, phone numbers, fiscal data, secrets, and unnecessary PII are excluded.     | Redact before provider call; reject unsafe payloads when needed. |
| VR-09 | No endpoint may accept arbitrary prompt text for direct LLM execution.                                                                        | Return `404` for nonexistent route or `422` for invalid field. |

---

## Authorization & Security Rules

| ID     | Rule                                                                                                      |
| ------ | --------------------------------------------------------------------------------------------------------- |
| SEC-01 | All AI and AIRecommendation endpoints require authentication.                                              |
| SEC-02 | Event-scoped AI endpoints require organizer ownership of the event.                                        |
| SEC-03 | Quote comparison AI requires organizer ownership of the QuoteRequest's event context.                      |
| SEC-04 | Vendor bio AI requires the authenticated vendor's own vendor profile context.                              |
| SEC-05 | `GET`, `apply`, and `discard` on AIRecommendation require owner access to the recommendation context.       |
| SEC-06 | Ownership and rate-limit checks must run before invoking `LLMProvider`.                                    |
| SEC-07 | LLM provider API keys must exist only in backend secrets/configuration and must never be returned to clients. |
| SEC-08 | Logs must include correlation ID, feature type, provider, latency, and fallback flag without full sensitive prompt or payload content. |
| SEC-09 | AI endpoints must not auto-approve vendors, moderate reviews, create bookings, pay, contract, or make autonomous decisions. |

### Negative Authorization Scenarios

- Organizer calls event-scoped AI endpoint for another organizer's event.
- Organizer calls quote comparison AI for a QuoteRequest outside their event.
- Vendor calls organizer-only event AI endpoint.
- Organizer calls vendor bio endpoint for a vendor profile.
- User retrieves or applies another user's AIRecommendation.
- Rate-limited user attempts another AI generation call.
- Request attempts to pass provider secrets or free-form system prompt content.

---

## AI Behavior

This story exposes AI behavior through backend-only endpoints and must preserve strict human-in-the-loop semantics.

### AI Involvement

- AI Feature: AI-001 through AI-008, exposed through feature-specific endpoints.
- Provider Layer: `LLMProvider` port only.
- Human Validation Required: Yes.
- Persist AIRecommendation: Yes, for every successful generation.
- Fallback Required: Yes, through the configured AI foundation behavior.

### AI Input

- Inputs must be feature-specific and schema validated.
- Inputs must be minimized before provider invocation.
- Sensitive fields such as email, phone, fiscal data, personal guest notes, credentials, secrets, and unnecessary PII must not be sent to the provider.
- `languageCode` must be propagated or defaulted deterministically.

### AI Output

- Outputs must be structured JSON matching the feature-specific schema.
- Outputs must be returned as suggestions, not official domain state.
- Responses must include `recommendationId`, `type`, `status = pending`, `output`, and `aiMeta`.
- `aiMeta` must include provider, prompt version, latency, fallback usage, and language code.

### Human-in-the-loop Rules

- No generated output becomes official domain data until an authorized human applies it.
- Apply/discard transitions must be explicit API calls by the recommendation owner.
- Editing behavior belongs to product-specific AI stories unless the corresponding apply endpoint payload supports edits.
- Discarding a recommendation must preserve traceability while avoiding domain side effects.

### AI Error / Fallback Behavior

- Provider timeout after `AI_TIMEOUT_MS` returns `503 AI_PROVIDER_TIMEOUT` unless demo/testing fallback is enabled.
- Provider unavailable returns `503 AI_PROVIDER_UNAVAILABLE` unless fallback is enabled.
- Invalid output returns `422 AI_INVALID_OUTPUT` or follows the documented retry/fallback rule.
- Unsupported language returns `422 UNSUPPORTED_LANGUAGE` or uses a documented default.
- Mock/fallback usage must be visible through `aiMeta.fallbackUsed` and persisted metadata.

---

## UX / UI Notes

| Area                | Notes                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Screen / Route      | No UI is implemented by this story.                                   |
| Main UI Pattern     | API foundation only.                                                  |
| Primary Action      | Supports future AI suggestion generation and human apply/discard flows. |
| Secondary Actions   | Supports future display of `aiMeta`, pending status, and recommendation detail. |
| Empty State         | Not applicable.                                                       |
| Loading State       | Not applicable.                                                       |
| Error State         | API errors must be consumable by future frontend and MSW tests.        |
| Success State       | Successful generation returns pending recommendation data.             |
| Accessibility Notes | Not applicable.                                                       |
| Responsive Notes    | Not applicable.                                                       |
| i18n Notes          | `languageCode` supports `es-LATAM`, `es-ES`, `pt`, and `en`.           |
| Currency Notes      | Budget suggestion output must use event currency context where applicable. |

---

## Technical Notes

### Frontend

- Route / Page: Not applicable.
- Components: Not applicable.
- State Management: Not applicable.
- API Client: Endpoints must be stable for future frontend clients and MSW handlers.
- Frontend must never call LLM providers directly.

### Backend

- Module(s): `ai-assistance`, API boundary, event-planning, quote-flow, vendor-management integration.
- Use Cases:
  - `GenerateEventPlanUseCase`
  - `GenerateChecklistUseCase`
  - `GenerateBudgetSuggestionUseCase`
  - `RecommendServiceCategoriesUseCase`
  - `GenerateQuoteBriefUseCase`
  - `CompareQuotesUseCase`
  - `GenerateVendorBioUseCase`
  - `PrioritizeTasksUseCase`
  - `GetAIRecommendationUseCase`
  - `ApplyAIRecommendationUseCase`
  - `DiscardAIRecommendationUseCase`
- Controller / Route:
  - `AIAssistanceController`
  - `AIRecommendationsController`
- Authorization Policy: role plus ownership checks before provider invocation.
- Validation: request DTO validation at HTTP boundary; output schema validation before persistence/response.
- Transaction Required:
  - Generation should persist `AIRecommendation` consistently with provider metadata.
  - Apply/discard status transitions should be atomic with any feature-specific materialization.

### Database

- Main Tables: `ai_recommendations`; prompt registry via `AIPromptVersion` table or static versioned prompt registry as defined by AI foundation decisions.
- Constraints:
  - AIRecommendation owner/context reference must be present.
  - `type` enum must match allowed AI feature types.
  - `status` transitions must be controlled.
  - `prompt_version_id` or prompt version reference must be present.
- Index Considerations:
  - `ai_recommendations(requested_by_user_id, created_at)`
  - `ai_recommendations(event_id, type, created_at)`
  - `ai_recommendations(vendor_profile_id, type, created_at)`
  - `ai_recommendations(status, created_at)`

### API

| Method | Endpoint                                                              | Purpose                                      |
| ------ | --------------------------------------------------------------------- | -------------------------------------------- |
| POST   | `/api/v1/events/:eventId/ai/event-plan`                              | Generate AI-001 event plan recommendation.   |
| POST   | `/api/v1/events/:eventId/ai/checklist`                               | Generate AI-002 checklist recommendation.    |
| POST   | `/api/v1/events/:eventId/ai/budget-suggestion`                       | Generate AI-003 budget suggestion.           |
| POST   | `/api/v1/events/:eventId/ai/vendor-categories`                       | Generate AI-004 vendor category recommendation. |
| POST   | `/api/v1/events/:eventId/ai/quote-brief`                             | Generate AI-005 quote brief.                 |
| POST   | `/api/v1/quote-requests/:quoteRequestId/ai/comparison-summary`       | Generate AI-006 quote comparison summary.    |
| POST   | `/api/v1/vendors/me/ai/bio`                                          | Generate AI-007 vendor bio/package text.     |
| POST   | `/api/v1/events/:eventId/ai/task-prioritization`                     | Generate AI-008 task prioritization.         |
| GET    | `/api/v1/ai-recommendations/:aiRecommendationId`                     | Retrieve recommendation detail.              |
| POST   | `/api/v1/ai-recommendations/:aiRecommendationId/apply`               | Apply/accept recommendation through domain use case. |
| POST   | `/api/v1/ai-recommendations/:aiRecommendationId/discard`             | Discard recommendation.                      |

### Observability / Audit

- Correlation ID Required: Yes.
- Log Event Required: Yes, for generation, provider errors, fallback, apply, discard, and authorization failures.
- AdminAction Required: No for user-owned AI endpoints.
- AIRecommendation Required: Yes, for successful AI generation.
- Suggested events:
  - `ai.generation.started`
  - `ai.generation.completed`
  - `ai.generation.failed`
  - `ai.provider.timeout`
  - `ai.provider.fallback_used`
  - `ai.recommendation.retrieved`
  - `ai.recommendation.applied`
  - `ai.recommendation.discarded`

### Documentation Alignment Required

- PB-P0-004 highlights `/api/v1/events/:id/ai/*`, while Doc 16 also includes `/quote-requests/:quoteRequestId/ai/comparison-summary`, `/vendors/me/ai/bio`, and `/ai-recommendations/:id/*`. This story follows Doc 16 for full endpoint coverage while preserving P0 endpoint-foundation scope.
- Some AI product features are P1 or lower in the backlog, but Doc 16 defines their API paths in the foundation contract. This story exposes the contract and integration points; product-level behavior remains in the related AI product stories.
- PB-P0-010 and PB-P0-011 own AIRecommendation persistence internals, prompt registry, provider behavior, timeout, and fallback. US-097 depends on those capabilities and should not duplicate their implementation scope beyond endpoint integration.

---

## Test Scenarios

### Functional Tests

| ID    | Scenario                                                                 | Type                    |
| ----- | ------------------------------------------------------------------------ | ----------------------- |
| TS-01 | Organizer generates event plan for owned event.                          | Integration / Supertest |
| TS-02 | Organizer generates checklist for owned event.                           | Integration / Supertest |
| TS-03 | Organizer generates budget suggestion for owned event.                   | Integration / Supertest |
| TS-04 | Organizer generates vendor categories for owned event.                   | Integration / Supertest |
| TS-05 | Organizer generates quote brief for owned event.                         | Integration / Supertest |
| TS-06 | Organizer generates quote comparison for owned QuoteRequest.             | Integration / Supertest |
| TS-07 | Vendor generates bio recommendation for own profile.                     | Integration / Supertest |
| TS-08 | Organizer generates task prioritization for owned event.                 | Integration / Supertest |
| TS-09 | Owner retrieves AIRecommendation detail.                                 | Integration / Supertest |
| TS-10 | Owner applies pending AIRecommendation through the correct use case.      | Integration / Supertest |
| TS-11 | Owner discards pending AIRecommendation.                                 | Integration / Supertest |
| TS-12 | Successful generation includes `aiMeta` and correlation ID.              | Contract / Integration  |

### Negative Tests

| ID    | Scenario                                                           | Expected Result                                 |
| ----- | ------------------------------------------------------------------ | ----------------------------------------------- |
| NT-01 | Unauthenticated request to protected AI endpoint.                  | `401`.                                          |
| NT-02 | Organizer calls event AI for another organizer's event.            | `403` or `404`; provider not invoked.           |
| NT-03 | Organizer calls quote comparison for inaccessible QuoteRequest.     | `403` or `404`; provider not invoked.           |
| NT-04 | Vendor calls organizer-only event AI endpoint.                     | `403`.                                          |
| NT-05 | User retrieves another user's AIRecommendation.                    | `403` or `404`.                                 |
| NT-06 | Request has missing feature input.                                 | `400 MISSING_INPUT` or `422`.                   |
| NT-07 | Request has unsupported language.                                  | `422 UNSUPPORTED_LANGUAGE` or documented default. |
| NT-08 | Provider timeout is simulated.                                     | `503 AI_PROVIDER_TIMEOUT` or configured fallback. |
| NT-09 | Provider returns invalid JSON.                                     | `422 AI_INVALID_OUTPUT` or configured fallback. |
| NT-10 | User applies already discarded recommendation.                     | Controlled invalid transition response.         |
| NT-11 | User exceeds AI rate limit.                                        | `429`; provider not invoked.                    |
| NT-12 | Request attempts generic prompt/chat behavior.                     | Route absent or validation rejects request.     |

### AI Tests

| ID      | Scenario                                                       | Expected Result |
| ------- | -------------------------------------------------------------- | --------------- |
| AI-TS-01 | `MockAIProvider` returns deterministic output for same input.   | Stable output and valid schema. |
| AI-TS-02 | Each feature output passes its JSON/Zod schema.                 | Success. |
| AI-TS-03 | Invalid output is rejected and not materialized.                | Controlled error/fallback. |
| AI-TS-04 | Timeout uses `AI_TIMEOUT_MS` behavior.                          | Controlled error/fallback. |
| AI-TS-05 | Successful generation persists or references `AIRecommendation`. | Recommendation ID returned. |
| AI-TS-06 | Pending recommendation does not mutate official domain data.    | No unintended side effects. |

### Authorization Tests

| ID         | Scenario                                                        | Expected Result |
| ---------- | --------------------------------------------------------------- | --------------- |
| AUTH-TS-01 | Organizer owns event and calls event-scoped AI.                 | Success         |
| AUTH-TS-02 | Organizer does not own event.                                   | Denied          |
| AUTH-TS-03 | Organizer owns QuoteRequest context and calls comparison AI.     | Success         |
| AUTH-TS-04 | Vendor owns vendor profile and calls bio AI.                    | Success         |
| AUTH-TS-05 | Vendor calls event-scoped organizer AI.                         | Denied          |
| AUTH-TS-06 | Recommendation owner retrieves/applies/discards recommendation. | Success         |
| AUTH-TS-07 | Non-owner retrieves/applies/discards recommendation.            | Denied          |

### Accessibility Tests

Not applicable. No UI is delivered by this story.

---

## Business Impact

| Field               | Value                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| KPI Affected        | AI API readiness, frontend integration readiness, deterministic QA coverage, traceability of AI outputs |
| Expected Impact     | Enables AI product stories to integrate through stable, secure backend endpoints without exposing LLM providers to frontend |
| Success Criteria    | Doc 16 AI endpoints implemented/tested with Supertest, `aiMeta` returned, provider access backend-only, HITL enforced |
| Academic Demo Value | Demonstrates safe, traceable, backend-controlled AI assistance with deterministic demo/test behavior |

---

## Task Breakdown Readiness

### Potential Frontend Tasks

- Generate or update API client calls after backend contract approval.
- Add MSW handlers and fixtures for AIRecommendation responses and error states.

### Potential Backend Tasks

- Implement controllers, DTOs, guards, use case bindings, and Supertest suites for all listed endpoints.
- Integrate with `LLMProvider`, `AIRecommendationRepository`, prompt registry, and feature-specific schemas.
- Ensure provider invocation occurs only after authentication, ownership, validation, and rate-limit checks pass.

### Potential Database Tasks

- Verify `ai_recommendations` schema, indexes, prompt version reference, status enum, and context ownership fields.

### Potential AI / PromptOps Tasks

- Ensure static prompt registry entries exist for AI-001 through AI-008.
- Ensure `MockAIProvider` fixtures match feature output schemas.
- Ensure provider timeout/fallback metadata is persisted and surfaced through `aiMeta`.

### Potential QA Tasks

- Add Supertest coverage for all endpoints, authorization failures, validation failures, provider timeout, invalid output, fallback, and HITL non-materialization.
- Confirm CI uses `MockAIProvider` and does not require external LLM network access.

### Potential DevOps / Config Tasks

- Verify `.env.example` or config documentation includes `LLM_PROVIDER`, `AI_TIMEOUT_MS`, `AI_DEMO_MODE`, and fallback-related flags without real secrets.
- Ensure provider logs redact sensitive payloads and include correlation IDs.
