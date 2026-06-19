# Technical Specification — US-097: Implementar endpoints AI del contrato REST

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-097 |
| Source User Story | `management/user-stories/US-097-ai-endpoints-implementation.md` |
| Decision Resolution Artifact | No aplica |
| Priority | P0 |
| Backlog ID | PB-P0-004 |
| Backlog Title | REST API Endpoints Foundation (Doc 16) |
| Backlog Execution Order | 4 |
| User Story Position in Backlog Item | 4 of 4 |
| Related User Stories in Backlog Item | US-094, US-095, US-096, US-097 |
| Epic | EPIC-API-001 |
| Backlog Item Dependencies | PB-P0-002, PB-P0-003 |
| Feature | REST API Endpoints Foundation |
| Module / Domain | API / AI Assistance |
| User Story Status | Approved |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-15 |
| Last Updated | 2026-06-15 |

---

## 2. Backlog Execution Context

### Product Backlog Item

US-097 belongs to PB-P0-004, which implements the REST API foundation aligned with Doc 16. This story covers the AI Assistance and AIRecommendation endpoint surface required by frontend clients, MSW contracts, QA automation and downstream AI product stories.

### Execution Order Rationale

US-097 is the fourth story in PB-P0-004 because it depends on the prior API foundation:

- US-094 provides authentication, session context and current user resolution.
- US-095 provides event ownership and event route foundations.
- US-096 provides QuoteRequest and Quote context required by quote comparison AI.

US-097 should execute after those stories so every AI endpoint can enforce authorization before invoking `LLMProvider`.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-094 | Auth/session/profile foundation | 1 |
| US-095 | Event API and ownership foundation | 2 |
| US-096 | Quote/Booking API foundation | 3 |
| US-097 | AI API and AIRecommendation action foundation | 4 |

---

## 3. Executive Technical Summary

Implement the Doc 16 AI Assistance REST API under `/api/v1` using Express, TypeScript, Zod, Prisma/PostgreSQL and the existing modular monolith architecture. The implementation must expose feature-specific AI generation endpoints for AI-001 through AI-008 and AIRecommendation retrieval/apply/discard endpoints.

All provider calls must go through the `LLMProvider` port. The API must never expose provider credentials, must never accept generic prompt/chat behavior, and must preserve strict human-in-the-loop semantics: successful generation returns an `AIRecommendation` in `pending` state, and no official domain data is created or mutated without an explicit authorized `apply` request.

This story is an API foundation story. Prompt registry internals, provider adapters, timeout/fallback implementation and AIRecommendation persistence internals are dependencies from PB-P0-010 and PB-P0-011. US-097 must integrate with those capabilities and define the route/controller/DTO/security/testing contract without duplicating their ownership.

---

## 4. Scope Boundary

### In Scope

- AI Assistance route registration under `/api/v1`.
- Feature-specific generation endpoints:
  - AI-001 event plan.
  - AI-002 checklist.
  - AI-003 budget suggestion.
  - AI-004 vendor categories.
  - AI-005 quote brief.
  - AI-006 quote comparison summary.
  - AI-007 vendor bio/package recommendation.
  - AI-008 task prioritization.
- AIRecommendation retrieval by owner.
- AIRecommendation apply/discard actions by owner.
- Request DTO validation with Zod.
- Feature-specific input/output schema integration.
- `aiMeta` response fields.
- Authentication, role checks, ownership checks, rate-limit checks and provider-call ordering.
- Controlled AI error mapping.
- Supertest/API/security/AI deterministic tests using `MockAIProvider`.

### Out of Scope

- Generic `/ai/chat`, free-form prompt execution or arbitrary assistant endpoints.
- Direct frontend calls to OpenAI, Anthropic or any other LLM provider.
- Prompt authoring UX, prompt evaluation datasets or PromptOps evidence catalogs.
- Full provider adapter implementation if owned by PB-P0-010/PB-P0-011.
- Full AI product UX or confirmation screens.
- RAG, vector search, semantic retrieval or external knowledge stores.
- Image, audio, voice, WhatsApp, push notification or native mobile AI flows.
- Autonomous vendor approval, booking, payment, contract generation, moderation or review sentiment analysis.
- Real payments, e-signature, escrow, commissions or billing.

### Explicit Non-Goals

- Do not implement a generic conversational assistant.
- Do not auto-apply any AI output.
- Do not let controllers call OpenAI SDKs or provider SDKs directly.
- Do not include provider secrets in responses, logs or committed files.
- Do not add AI endpoints outside Doc 16 without a new PO/ADR decision.
- Do not treat read-only AI features as official domain state.

---

## 5. Architecture Alignment

### Backend Architecture

Use the `ai-assistance` module with thin Express controllers and application use cases. Controllers validate request DTOs, resolve auth context and call use cases. Use cases orchestrate context loading, ownership checks, prompt resolution, `LLMProvider` invocation, output validation and `AIRecommendation` persistence.

Dependencies:

- `identity-access` for authenticated user context.
- `event-planning` for organizer event ownership.
- `quote-flow` for QuoteRequest/Quote context.
- `vendor-management` for vendor profile context.
- `task-management` and `budget-management` only through apply/materialization use cases where already defined.
- `shared-kernel` for value objects, error codes, correlation ID and response envelope.

### Frontend Architecture

No UI is implemented by this story. The API contract must support future Next.js/TanStack Query clients and MSW handlers. Frontend clients consume only EventFlow backend endpoints and never call LLM providers directly.

### Database Architecture

Use `ai_recommendations` and `ai_prompt_versions` as defined in Doc 18. Generation persists sanitized input, validated output, prompt version, provider, latency, fallback flag, language code and correlation ID. Apply/discard transitions must be atomic and preserve historical traceability.

### API Architecture

REST JSON under `/api/v1`, Doc 16 paths are canonical. Use standard response and error envelopes, stable error codes, Zod DTO validation and correlation ID propagation.

### AI / PromptOps Architecture

All AI calls go through `LLMProvider`. `OpenAIProvider` is the primary MVP provider, `MockAIProvider` is mandatory for test/demo/fallback, and `AnthropicProvider` remains a non-functional stub. Prompt resolution must use the static `PromptRegistry` and `AIPromptVersion` reference model. Output must be JSON-only and validated before persistence or response.

### Security Architecture

Backend is the authorization source of truth. Authentication, role checks, ownership checks, rate limits and payload validation must happen before invoking `LLMProvider`. API keys remain in backend configuration/secrets only. Logs must omit full sensitive prompts and PII-heavy payloads.

### Testing Architecture

Use Vitest, Supertest, Prisma test database and `MockAIProvider`. Automated tests must not require OpenAI or Anthropic network calls. Tests must cover happy paths, negative authorization, validation, rate limiting, timeout/fallback, invalid output, HITL non-materialization and `aiMeta`.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 Event plan | Organizer-owned event context generates `event_plan` recommendation in `pending` state; no event tasks/budget data created. | API, Application, AI, DB, Security |
| AC-02 Checklist | Organizer-owned event context generates `checklist`; EventTask materialization waits for apply flow. | API, Application, AI, DB, Security |
| AC-03 Budget suggestion | Organizer-owned event context generates `budget_suggestion` using event currency and decimal strings. | API, Application, AI, DB, Security |
| AC-04 Vendor categories | Organizer-owned event context generates `vendor_categories`; categories must map to active ServiceCategory records or fail validation. | API, Application, AI, DB |
| AC-05 Quote brief | Organizer-owned event context generates `quote_brief`; no QuoteRequest is created or sent automatically. | API, Application, AI, Security |
| AC-06 Quote comparison | Organizer-owned QuoteRequest context generates `quote_comparison`; output is advisory and never accepts/rejects/prefers/books a quote. | API, Application, AI, Quote, Security |
| AC-07 Vendor bio | Vendor-owned profile context generates `vendor_bio`; no VendorProfile or VendorService update without apply. | API, Application, AI, Vendor, Security |
| AC-08 Task prioritization | Organizer-owned event/task context generates `task_prioritization`; output remains read-only guidance unless later apply flow is defined. | API, Application, AI, Security |
| AC-09 Retrieve recommendation | Owner retrieves sanitized AIRecommendation detail and metadata. | API, Application, DB, Security |
| AC-10 Apply recommendation | Owner transitions pending recommendation to accepted/applied and delegates materialization only to authorized feature use cases. | API, Application, Domain, DB, Security |
| AC-11 Discard recommendation | Owner transitions pending recommendation to discarded with no domain side effects. | API, Application, DB, Security |
| AC-12 AI metadata | All successful generation responses include `aiMeta` plus standard envelope/correlation conventions. | API, Application, AI, Observability |
| AC-13 Provider errors | Timeout, unavailable provider and invalid output produce controlled errors or configured fallback; invalid data is not materialized. | API, Application, AI, Observability |
| AC-14 Deterministic tests | Automated tests use `MockAIProvider` or provider doubles and do not depend on real LLM network calls. | QA, CI, AI |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

- `ai-assistance`
- `identity-access`
- `event-planning`
- `quote-flow`
- `vendor-management`
- `task-management`
- `budget-management`
- `shared-kernel`
- `infrastructure/llm`
- `infrastructure/prisma`

### Use Cases / Application Services

Generation use cases:

- `GenerateEventPlanUseCase`
- `GenerateChecklistUseCase`
- `GenerateBudgetSuggestionUseCase`
- `RecommendServiceCategoriesUseCase`
- `GenerateQuoteBriefUseCase`
- `CompareQuotesUseCase`
- `GenerateVendorBioUseCase`
- `PrioritizeTasksUseCase`

Recommendation action use cases:

- `GetAIRecommendationUseCase`
- `ApplyAIRecommendationUseCase`
- `DiscardAIRecommendationUseCase`

Supporting services/ports:

- `LLMProvider`
- `PromptRegistry`
- `PromptBuilder`
- `OutputValidator`
- `FallbackService`
- `AIRecommendationRepository`
- `AIPromptVersionRepository` or registry lookup adapter, depending on final AI foundation implementation.
- `AIRecommendationPolicyService`
- `AIRateLimitPolicy`
- `AIAuditLogger`

### Controllers / Routes

- `AIAssistanceController`
- `AIRecommendationsController`

Route registration must use Doc 16 paths with `/api/v1` prefix:

- Event-scoped AI routes under `/api/v1/events/:eventId/ai/*`.
- Quote comparison route under `/api/v1/quote-requests/:quoteRequestId/ai/comparison-summary`.
- Vendor bio route under `/api/v1/vendors/me/ai/bio`.
- Recommendation action routes under `/api/v1/ai-recommendations/:aiRecommendationId`.

### DTOs / Schemas

Base request schema:

- `AIBaseRequestDto<TInput>`
  - `input`: required feature-specific object.
  - `languageCode`: optional enum `es-LATAM | es-ES | pt | en`.
  - `preferMock`: optional boolean, honored only in demo/testing contexts where policy allows it.

Base response schema:

- `AIRecommendationResponseDto<TOutput>`
  - `recommendationId`
  - `type`
  - `output`
  - `aiMeta.provider`
  - `aiMeta.promptVersion`
  - `aiMeta.latencyMs`
  - `aiMeta.fallbackUsed`
  - `aiMeta.languageCode`
  - `status = pending`
  - `createdAt`

Feature output schemas:

- `EventPlanOutputDto`
- `ChecklistOutputDto`
- `BudgetSuggestionOutputDto`
- `VendorCategoriesOutputDto`
- `QuoteBriefOutputDto`
- `QuoteComparisonOutputDto`
- `VendorBioOutputDto`
- `TaskPrioritizationOutputDto`

Action DTOs:

- `ApplyAIRecommendationRequestDto`
  - Optional feature-specific edited payload only where apply flow supports edits.
- `DiscardAIRecommendationRequestDto`
  - Optional reason if domain supports it; otherwise empty body.

### Repository / Persistence

Use `AIRecommendationRepository` for:

- `createPending`
- `createFailed`
- `findById`
- `findByOwnerContext`
- `markAccepted`
- `markDiscarded`
- `markFailed`

Use repository methods or specifications that support ownership checks without leaking cross-user existence. Where security convention prefers hiding resource existence, return `404`; otherwise return `403`.

### Validation Rules

- Route params must be valid identifiers.
- `AIBaseRequestDto.input` is required.
- Feature input must match its Zod schema.
- `languageCode` must be supported or default deterministically from user/event preference.
- `preferMock` is rejected or ignored outside demo/testing policy.
- Output must pass feature-specific Zod schema before `pending` recommendation is returned.
- `apply` and `discard` require owner access and valid status transition.
- Prompt content must be built from allowlisted, sanitized context fields.
- Arbitrary prompt/system/developer text from clients is not allowed.

### Error Handling

Use Doc 16 error semantics:

- `400 MISSING_INPUT`
- `401 UNAUTHORIZED`
- `403 FORBIDDEN`
- `404 RESOURCE_NOT_FOUND`
- `422 VALIDATION_ERROR`
- `422 UNSUPPORTED_LANGUAGE`
- `422 AI_INVALID_OUTPUT`
- `422 INVALID_STATE_TRANSITION`
- `429 RATE_LIMIT_EXCEEDED`
- `503 AI_PROVIDER_UNAVAILABLE`
- `503 AI_PROVIDER_TIMEOUT`

If older backend docs use legacy names such as `AI_TIMEOUT`, map final public API codes to Doc 16 where US-097 is concerned and document any internal alias separately.

### Transactions

- Generation persistence should store `AIRecommendation` and provider metadata consistently after validated output.
- Failed provider attempts may persist `status='failed'` for observability when the AI foundation supports it.
- `apply` must wrap status transition and any target-domain materialization in one transaction.
- `discard` must atomically set status/timestamp without domain side effects.

### Observability

Emit structured logs and metrics for:

- `ai.generation.started`
- `ai.generation.completed`
- `ai.generation.failed`
- `ai.provider.timeout`
- `ai.provider.fallback_used`
- `ai.output.invalid`
- `ai.recommendation.retrieved`
- `ai.recommendation.applied`
- `ai.recommendation.discarded`
- authorization and rate-limit denials before provider invocation.

Logs must include correlation ID, feature type, provider, prompt version, latency, fallback flag and status, without full sensitive prompt content.

---

## 8. Frontend Technical Design

### Routes / Pages

No aplica. This story does not implement UI routes or pages.

### Components

No aplica. Future UI may use `AIRecommendationCard`, apply/discard controls and feature-specific editors, but those are outside this API foundation story.

### Forms

No aplica. Request payloads must be stable enough for future React Hook Form/Zod integrations.

### State Management

No aplica. Future TanStack Query keys should be able to target:

- `["ai-recommendations", recommendationId]`
- event-scoped AI generation mutations.
- quote comparison mutation.
- vendor bio mutation.

### Data Fetching

No aplica for implementation. API clients and MSW handlers can be generated after the endpoint contract is implemented.

### Loading / Empty / Error / Success States

No aplica for UI. API responses must make loading/error/success states deterministic for future frontend clients.

### Accessibility

No aplica.

### i18n

No UI translation work. API supports `languageCode` values `es-LATAM`, `es-ES`, `pt` and `en`; generated readable content must respect the selected/default language.

---

## 9. API Contract Design

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| POST | `/api/v1/events/:eventId/ai/event-plan` | Generate AI-001 event plan recommendation. | Yes, organizer owner | `AIBaseRequestDto<EventPlanInputDto>` | `200` + `AIRecommendationResponseDto<EventPlanOutputDto>` | `401`, `403`, `404`, `400 MISSING_INPUT`, `422`, `429`, `503` |
| POST | `/api/v1/events/:eventId/ai/checklist` | Generate AI-002 checklist recommendation. | Yes, organizer owner | `AIBaseRequestDto<ChecklistInputDto>` | `200` + `AIRecommendationResponseDto<ChecklistOutputDto>` | `401`, `403`, `404`, `400`, `422`, `429`, `503` |
| POST | `/api/v1/events/:eventId/ai/budget-suggestion` | Generate AI-003 budget suggestion. | Yes, organizer owner | `AIBaseRequestDto<BudgetSuggestionInputDto>` | `200` + `AIRecommendationResponseDto<BudgetSuggestionOutputDto>` | `401`, `403`, `404`, `400`, `422`, `429`, `503` |
| POST | `/api/v1/events/:eventId/ai/vendor-categories` | Generate AI-004 vendor category recommendations. | Yes, organizer owner | `AIBaseRequestDto<VendorCategoriesInputDto>` | `200` + `AIRecommendationResponseDto<VendorCategoriesOutputDto>` | `401`, `403`, `404`, `400`, `422`, `429`, `503` |
| POST | `/api/v1/events/:eventId/ai/quote-brief` | Generate AI-005 quote brief. | Yes, organizer owner | `AIBaseRequestDto<QuoteBriefInputDto>` | `200` + `AIRecommendationResponseDto<QuoteBriefOutputDto>` | `401`, `403`, `404`, `400`, `422`, `429`, `503` |
| POST | `/api/v1/quote-requests/:quoteRequestId/ai/comparison-summary` | Generate AI-006 quote comparison summary. | Yes, organizer owner of quote request event | `AIBaseRequestDto<QuoteComparisonInputDto>` | `200` + `AIRecommendationResponseDto<QuoteComparisonOutputDto>` | `401`, `403`, `404`, `400`, `422`, `429`, `503` |
| POST | `/api/v1/vendors/me/ai/bio` | Generate AI-007 vendor bio/package recommendation. | Yes, vendor owner | `AIBaseRequestDto<VendorBioInputDto>` | `200` + `AIRecommendationResponseDto<VendorBioOutputDto>` | `401`, `403`, `400`, `422`, `429`, `503` |
| POST | `/api/v1/events/:eventId/ai/task-prioritization` | Generate AI-008 task prioritization. | Yes, organizer owner | `AIBaseRequestDto<TaskPrioritizationInputDto>` | `200` + `AIRecommendationResponseDto<TaskPrioritizationOutputDto>` | `401`, `403`, `404`, `400`, `422`, `429`, `503` |
| GET | `/api/v1/ai-recommendations/:aiRecommendationId` | Retrieve recommendation detail. | Yes, owner | None | `200` + sanitized recommendation detail | `401`, `403`, `404` |
| POST | `/api/v1/ai-recommendations/:aiRecommendationId/apply` | Apply/accept pending recommendation. | Yes, owner | Optional feature-specific apply payload | `200` + applied recommendation or target summary | `401`, `403`, `404`, `422` |
| POST | `/api/v1/ai-recommendations/:aiRecommendationId/discard` | Discard pending recommendation. | Yes, owner | Optional discard reason | `204` | `401`, `403`, `404`, `422` |

---

## 10. Database / Prisma Design

### Models Impacted

- `AIRecommendation`
- `AIPromptVersion`
- `Event`
- `QuoteRequest`
- `Quote`
- `VendorProfile`
- `VendorService`
- `EventTask`
- `BudgetItem`

### Fields / Columns

`AIRecommendation` must support:

- `id`
- `type`
- `status`
- `requestedByUserId`
- optional context references: `eventId`, `vendorProfileId`, `quoteRequestId`, `quoteId`
- `llmProvider`
- `model`
- `promptVersionId`
- `languageCode`
- `inputPayload`
- `outputPayload`
- optional `validatedOutputPayload`
- `accepted`
- `edited`
- `fallbackUsed`
- `fallbackReason`
- `timeoutMs`
- `latencyMs`
- `tokenCount`
- `schemaValid`
- `retryCount`
- `errorCode`
- `errorMessage`
- `correlationId`
- lifecycle timestamps
- `isSeed`
- `createdAt`
- `updatedAt`

### Relations

- `AIRecommendation.requestedByUserId` -> `User.id`.
- `AIRecommendation.eventId` -> `Event.id` when event-scoped.
- `AIRecommendation.vendorProfileId` -> `VendorProfile.id` for vendor bio.
- `AIRecommendation.quoteRequestId` -> `QuoteRequest.id` for quote brief/comparison.
- `AIRecommendation.quoteId` -> `Quote.id` only where a quote-specific action needs it.
- `AIRecommendation.promptVersionId` -> `AIPromptVersion.id`.
- Materialized target rows reference `aiRecommendationId` where supported.

### Indexes

Use Doc 18 indexes:

- `idx_ai_rec_user_created` on `(requested_by_user_id, created_at DESC)`.
- `idx_ai_rec_event_type_created` on `(event_id, type, created_at DESC)`.
- `idx_ai_rec_status_created` on `(status, created_at DESC)`.
- `idx_ai_rec_provider_created` on `(llm_provider, created_at DESC)`.
- `idx_ai_rec_correlation_id` on `(correlation_id)`.
- `idx_ai_rec_prompt_version` on `(prompt_version_id)`.
- `idx_ai_rec_pending_expires` on `(expires_at) WHERE status = 'pending'`.

### Constraints

- `prompt_version_id` is required for traceability.
- `timeout_ms > 0`.
- `retry_count BETWEEN 0 AND 1`.
- Service-level invariant: `status='accepted'` requires `accepted_at`.
- Status transitions must be controlled by use cases.
- Context reference must match feature type.

### Migrations Impact

US-097 should not redefine DB ownership already delivered by PB-P0-001/PB-P0-010/PB-P0-011. If the schema is missing fields or indexes required by this API, generate tasks to add migrations in the appropriate backlog sequence before endpoint completion.

### Seed Impact

No new seed generation is required by this story. Existing or future seed data may include deterministic `AIRecommendation` rows for demo and MSW parity.

---

## 11. AI / PromptOps Design

### AI Feature

This story exposes AI-001 through AI-008:

| Feature | Type | Endpoint |
|---|---|---|
| AI-001 | `event_plan` | `/events/:eventId/ai/event-plan` |
| AI-002 | `checklist` | `/events/:eventId/ai/checklist` |
| AI-003 | `budget_suggestion` | `/events/:eventId/ai/budget-suggestion` |
| AI-004 | `vendor_categories` | `/events/:eventId/ai/vendor-categories` |
| AI-005 | `quote_brief` | `/events/:eventId/ai/quote-brief` |
| AI-006 | `quote_comparison` | `/quote-requests/:quoteRequestId/ai/comparison-summary` |
| AI-007 | `vendor_bio` | `/vendors/me/ai/bio` |
| AI-008 | `task_prioritization` | `/events/:eventId/ai/task-prioritization` |

### Provider

- Use `LLMProvider` only.
- `OpenAIProvider` is primary for MVP environments where real AI is enabled.
- `MockAIProvider` is mandatory for tests, demo and controlled fallback.
- `AnthropicProvider` is a non-functional stub and must not be used as automatic fallback.

### Prompt Version

- Resolve prompt via `PromptRegistry` using feature type and language.
- Persist `promptVersionId` or equivalent `AIPromptVersion` FK/reference in every `AIRecommendation`.
- Prompt changes require a new version, not silent edits.

### Input Schema

- Input schemas are feature-specific and based on allowlisted fields from Event, QuoteRequest, Quote, VendorProfile, VendorService, ServiceCategory, EventTask and Budget context.
- Do not include emails, phone numbers, fiscal data, secrets, credentials, unnecessary personal notes or raw internal payloads.
- `languageCode` defaults deterministically if omitted.

### Output Schema

- Provider output must be JSON-only.
- Output must pass feature-specific Zod schema validation.
- Invalid output permits one controlled retry only where AI foundation defines it.
- Invalid output after retry returns controlled error or configured fallback and must not become official domain data.

### Human-in-the-loop

- Every successful generation creates or returns `AIRecommendation.status='pending'`.
- `apply` is the only path that can accept a recommendation.
- `discard` marks a recommendation discarded with no domain side effects.
- Read-only features may mark recommendation accepted without creating target entities if the feature does not materialize data.

### Fallback

- `AI_TIMEOUT_MS` default is `60000`.
- `MockAIProvider` fallback is allowed only under `AI_DEMO_MODE=true` or `AI_USE_MOCK_FALLBACK=true`.
- Production-academic behavior without fallback returns `503 AI_PROVIDER_TIMEOUT` or `503 AI_PROVIDER_UNAVAILABLE`.
- Fallback usage must appear in `aiMeta.fallbackUsed` and persisted metadata.

### Persistence

- Successful outputs persist as `pending`.
- Fallback outputs persist as `pending` with provider `mock` and `fallbackUsed=true`.
- Failed outputs may persist as `failed` for observability when supported by AI foundation.
- `inputPayload` must be sanitized before persistence.

### Safety Rules

- No autonomous decisions.
- No provider SDK usage outside infrastructure adapters.
- No prompt injection instructions from user content may override system/developer prompt boundaries.
- No external tool execution from model output.
- No official data mutation without owner-authorized apply.
- No public endpoint returns unsanitized prompt text or provider credentials.

---

## 12. Security & Authorization Design

### Authentication

All AI and AIRecommendation endpoints require valid authentication from US-094.

### Authorization

- Event-scoped AI endpoints require organizer role and event ownership.
- Quote comparison requires organizer ownership of the event linked to the QuoteRequest.
- Vendor bio requires vendor role and own editable vendor profile context.
- Recommendation retrieval/apply/discard requires ownership of the recommendation context.

### Ownership Rules

- Organizer owns the event for event-plan, checklist, budget, vendor categories, quote brief and task prioritization.
- Organizer owns the quote request's event for quote comparison.
- Vendor owns `VendorProfile` for vendor bio.
- AIRecommendation owner is determined by `requestedByUserId` plus context match.

### Role Rules

- `organizer`: event-scoped AI and quote comparison.
- `vendor`: vendor bio and own recommendation actions.
- `admin`: not in scope for this P0 endpoint story, except future audit reads outside US-097.

### Negative Authorization Scenarios

- Unauthenticated user calls any endpoint -> `401`.
- Organizer calls event-scoped AI for another organizer's event -> `403` or `404`.
- Organizer calls quote comparison for inaccessible QuoteRequest -> `403` or `404`.
- Vendor calls organizer-only event AI endpoint -> `403`.
- Organizer calls vendor bio endpoint -> `403`.
- User retrieves/applies/discards another user's recommendation -> `403` or `404`.
- Rate-limited user calls generation endpoint -> `429`, provider not invoked.

### Audit Requirements

`AIRecommendation` is the primary audit trail for AI calls. `AdminAction` is not required for user-owned endpoints in this story. Future admin audit reads may require `AdminAction`.

### Sensitive Data Handling

- Provider keys must only live in backend config/secrets.
- Logs must redact payloads and avoid full prompt text by default.
- `inputPayload` must be minimized and sanitized.
- Public detail responses must not expose unsafe internal prompt, provider secrets or unrelated context data.

---

## 13. Testing Strategy

### Unit Tests

- DTO and schema validation for all request/response shapes.
- `AIRecommendationPolicyService` status transitions.
- `PromptRegistry` lookup by feature/language.
- `OutputValidator` accepts valid fixtures and rejects invalid fixtures.
- `FallbackService` mode decisions.
- `AIRateLimitPolicy` denial before provider invocation.

### Integration Tests

- Each generation use case persists or references `AIRecommendation` with status `pending`.
- Context loading and ownership enforcement occurs before provider invocation.
- `apply` transitions status and materializes only through target use cases where defined.
- `discard` transitions status without domain side effects.
- Timeout/fallback metadata persists correctly.

### API Tests

Use Supertest for:

- All eleven Doc 16 endpoints.
- Standard envelope and correlation ID.
- `aiMeta` fields on successful generation.
- Controlled error codes for missing input, unsupported language, provider timeout, invalid output and rate limit.

### E2E Tests

No browser E2E required by this API story. Future end-to-end AI product flows can consume these endpoints with `MockAIProvider`.

### Security Tests

- `401` for unauthenticated requests.
- `403`/`404` for cross-owner event/quote/vendor/recommendation access.
- Provider spy verifies no `LLMProvider` call after failed auth, ownership, validation or rate-limit checks.
- Request attempting generic prompt/chat is rejected or route is absent.
- Logs do not include provider secrets or raw sensitive input.

### Accessibility Tests

No aplica. No UI is delivered.

### AI Tests

- `MockAIProvider` deterministic output for identical feature/input/language.
- Shared schema contract tests between mock and real-provider output schemas.
- Invalid JSON retry/fallback behavior.
- Timeout behavior using `AI_TIMEOUT_MS`.
- `fallbackUsed` surfaced in response and DB.
- No real OpenAI/Anthropic call in CI.

### Seed / Demo Tests

- Demo/test environment can run with `LLM_PROVIDER=mock`.
- Seeded AIRecommendation rows, if present, remain distinguishable via `isSeed`.
- Demo fallback path can be simulated without network dependency.

### CI Checks

- Vitest unit/integration suites.
- Supertest API contract suites.
- Prisma migration/schema validation when DB fields are touched.
- Static check or test ensuring no provider SDK import leaks into domain/application layers.
- CI environment uses `MockAIProvider` only.

---

## 14. Observability & Audit

### Logs

Structured logs are required for generation lifecycle, provider failures, fallback, invalid output, recommendation retrieval, apply and discard.

### Correlation ID

`X-Correlation-Id` must propagate from HTTP middleware into `AIContext`, provider logs and `AIRecommendation.correlationId`.

### AdminAction

No aplica for user-owned endpoints. Admin audit reads are outside US-097 P0 scope.

### Error Tracking

Track provider timeout, provider unavailable, invalid output, unsupported language, rate limit and invalid state transition. Errors should include feature type and correlation ID but omit sensitive payloads.

### Metrics

Recommended metrics:

- `ai_generation_total{feature,type,status}`
- `ai_provider_latency_ms{provider,feature}`
- `ai_provider_timeout_total{provider,feature}`
- `ai_fallback_used_total{feature}`
- `ai_invalid_output_total{feature}`
- `ai_recommendation_apply_total{type}`
- `ai_recommendation_discard_total{type}`

---

## 15. Configuration & Environment

Required configuration names:

- `LLM_PROVIDER`
- `OPENAI_API_KEY`
- `AI_TIMEOUT_MS`
- `AI_DEMO_MODE`
- `AI_USE_MOCK_FALLBACK`
- `AI_PROMPT_VERSION` or equivalent prompt registry selector

Rules:

- `.env.example` may list variable names and safe placeholders only.
- CI/test must use `LLM_PROVIDER=mock`.
- `preferMock` in request is honored only when environment policy permits it.
- `LLM_PROVIDER=anthropic` should fail explicitly unless the stub is intentionally tested.

---

## 16. Documentation Alignment Required

| Source / Area | Observation | Technical Decision for US-097 | Follow-up Needed | Blocker |
|---|---|---|---|---|
| PB-P0-004 description | Mentions `/api/v1/events/:id/ai/*`, while Doc 16 includes quote, vendor and AIRecommendation routes. | Follow Doc 16 and approved US-097 for full AI endpoint foundation. | Backlog description may be clarified later. | No |
| AI product backlog vs API foundation | Some product behavior belongs to PB-P0-010, PB-P0-011 or P1 AI stories. | US-097 implements endpoint integration contract, not full product UX or independent AI platform internals. | Ensure tasks reference dependencies. | No |
| Doc 14 route examples | Some older Doc 14 examples use `/api/v1/ai/events/:id/...` style. | Use Doc 16 canonical paths under `/api/v1/events/:eventId/ai/*` and `/api/v1/ai-recommendations/*`. | Update docs/OpenAPI snapshot if needed. | No |
| Error code naming | Older backend docs mention `AI_TIMEOUT` while Doc 16 uses `AI_PROVIDER_TIMEOUT`. | Public API uses Doc 16 codes for this story. Internal aliases may map to public codes. | Consolidate error catalog later if needed. | No |
| AIPromptVersion implementation | Doc 14 discusses static registry; Doc 18/ADR-AI-006 require table-backed traceability or equivalent reference. | Persist a prompt version reference required by `AIRecommendation`; use accepted ADR/Doc 18 as higher source for traceability. | Align implementation tasks with PB-P0-010. | No |

---

## 17. Dependency Readiness

| Dependency | Required Capability | Impact if Missing | Spec Status |
|---|---|---|---|
| US-094 / PB-P0-002 | Auth/session/current user context. | Cannot secure endpoints. | Required before implementation |
| US-095 / PB-P0-003 | Event lookup and organizer ownership. | Event-scoped AI cannot authorize. | Required before implementation |
| US-096 | QuoteRequest and Quote access behavior. | Quote comparison cannot authorize/read quote context. | Required before AI-006 completion |
| PB-P0-010 | Prompt registry and AIRecommendation persistence. | Generation endpoints cannot persist/audit correctly. | Must be available or included as prerequisite tasks |
| PB-P0-011 | Timeout, fallback and JSON validation. | Error/fallback behavior incomplete. | Must be available or included as prerequisite tasks |

---

## 18. Task Breakdown Guidance

Do not create development tasks in this document. When `eventflow-user-story-to-development-tasks` runs, preserve this ordering:

1. Confirm dependency readiness for auth, event, quote and AI foundation.
2. Add/verify DTOs and schemas.
3. Add controllers/routes.
4. Bind use cases and provider abstractions.
5. Add ownership/rate-limit middleware ordering.
6. Add persistence integration.
7. Add Supertest/API/security/AI deterministic tests.
8. Add documentation/OpenAPI/MSW follow-up tasks if the project workflow requires them.

---

## 19. Quality Gates

| Gate | Expected Result |
|---|---|
| User Story approved | Pass |
| Product Backlog mapping found | Pass |
| Decision resolution consumed | N/A |
| Doc 16 API contract preserved | Pass |
| Accepted ADRs respected | Pass |
| Human-in-the-loop enforced | Pass |
| Backend-only LLM access | Pass |
| Provider abstraction respected | Pass |
| AI output validation defined | Pass |
| `MockAIProvider` testing defined | Pass |
| Security negative paths defined | Pass |
| No production code generated | Pass |
| Ready for task breakdown | Pass |

---

## 20. Final Recommendation

`Ready for Task Breakdown`

US-097 has an approved story, Product Backlog mapping to PB-P0-004, clear Doc 16 AI endpoint contract, accepted ADR alignment for provider abstraction/HITL/prompt versioning/mock tests, explicit security constraints, concrete database touchpoints and sufficient QA strategy. It is ready for `eventflow-user-story-to-development-tasks`, with dependency tasks required for PB-P0-010 and PB-P0-011 if those capabilities are not already complete.
