# User Story: US-122 - Persistir AIRecommendation con metadata completa

## Metadata

| Field              | Value                                |
| ------------------ | ------------------------------------ |
| ID                 | US-122                               |
| Epic               | EPIC-AI-001                          |
| Feature            | AIRecommendation persistence         |
| Module / Domain    | AI Assistance / Persistence          |
| User Role          | System                               |
| Priority           | Must Have (P0)                       |
| Status             | Approved with Minor Notes            |
| Owner              | Product Owner / Business Analyst     |
| Approved By        | Product Owner / Business Analyst Review |
| Approval Date      | 2026-06-17                           |
| Ready for Development Tasks | Yes                         |
| Sprint / Milestone | MVP Foundation                       |
| Created Date       | 2026-06-09                           |
| Last Updated       | 2026-06-17                           |

---

## User Story

**As the** EventFlow AI platform  
**I want** every AI generation attempt with a valid controlled result to be persisted as an `AIRecommendation` with prompt, provider, language, latency, fallback, status, and sanitized payload metadata  
**So that** EventFlow can guarantee human-in-the-loop traceability, auditability, QA evidence, and reproducible academic demo records.

---

## Business Context

### Context Summary

EventFlow's AI capabilities must be auditable and cannot mutate official domain data without human validation. Every structured AI suggestion must first be stored as an `AIRecommendation` with status `pending`, linked to the requesting user and the relevant domain context, and enriched with prompt/provider metadata.

US-122 provides the persistence foundation consumed by downstream AI feature use cases. US-121 owns prompt registry/version metadata. US-122 owns writing `AIRecommendation` records from generated/validated AI results and controlled failure/fallback metadata where applicable. User-facing accept/edit/discard workflows are delivered by later product stories and endpoints.

### Related Domain Concepts

- `AIRecommendation`.
- `AIPromptVersion`.
- `AIRecommendationType`.
- `AIRecommendationStatus`.
- `LLMProvider`.
- `AIResult<TOutput>`.
- `PromptRegistry`.
- `LanguageCode`.
- `CorrelationId`.
- Human-in-the-loop lifecycle.

### PO/BA Decisions Applied

| Decision | Applied Resolution |
| --- | --- |
| Persistence requirement | Every AI call that returns a valid controlled result must create an `AIRecommendation` record before the suggestion is exposed as actionable product output. |
| Initial HITL state | New recommendations are created with `status = pending` and `accepted = false` or equivalent status semantics. |
| Required metadata | Persist prompt version, provider, language, fallback flag, timeout, latency, correlation id, sanitized input payload, validated output payload, requesting user, and domain context when applicable. |
| Prompt version linkage | Use `AIPromptVersion`/registry metadata from US-121; do not create prompt registry behavior in US-122. |
| Output validation boundary | Persist successful AI outputs only after strict schema validation. Invalid outputs may be recorded as controlled failed/error records only if the schema supports safe failure metadata without storing unsafe raw output. |
| Payload minimization | Persist only the minimum input context required for audit/replay; do not store secrets, tokens, raw credentials, unnecessary PII, or full unrelated domain payloads. |
| Status lifecycle boundary | US-122 defines/persists initial status and metadata fields. Product actions that accept, edit, discard, reject, or materialize recommendations belong to downstream HITL stories. |
| Fallback attribution | If a prior fallback layer returns a Mock result, US-122 records `fallback_used = true` and provider metadata. It does not implement fallback orchestration. |
| No new API/UI | This story does not create REST endpoints or frontend UI. It creates backend persistence capability for AI use cases. |

### Assumptions

- US-099 declares the `AIRecommendation` and `AIPromptVersion` data models.
- US-100/US-102 provide migrations and constraints for AI persistence fields before runtime use.
- US-117 defines shared AI provider result/context types.
- US-121 provides prompt version metadata that can be referenced when persisting recommendations.
- Feature-specific output schemas exist or will exist before each feature use case writes recommendations.
- Downstream feature stories pass domain context such as `eventId`, `vendorProfileId`, `quoteRequestId`, or `quoteId` only when applicable.

### Dependencies

- PB-P0-001: database schema, migrations, and constraints.
- PB-P0-009: `LLMProvider` port and adapters.
- PB-P0-010: parent backlog item for Prompt Registry and `AIRecommendation` persistence.
- US-099: Prisma model declarations.
- US-117: AI provider contract and metadata types.
- US-121: `PromptRegistry` and `AIPromptVersion` metadata.
- ADR-AI-006: prompt versioning through registry and `AIPromptVersion`.
- ADR-AI-007: strict JSON schema validation before use/persistence.

---

## Traceability

| Source                 | Reference                                                            |
| ---------------------- | -------------------------------------------------------------------- |
| Product Backlog Item   | PB-P0-010 - Prompt Registry & AIRecommendation Persistence           |
| Epic                   | EPIC-AI-001 - LLMProvider & PromptOps                                |
| FRD Requirement(s)     | FR-AI-009, FR-AI-016, FR-AI-017, FR-AI-018                           |
| Use Case(s)            | Transversal - no implementa directamente un UC; habilita UC-AI-001..009 and HITL action use cases |
| Business Rule(s)       | BR-AI-001, BR-AI-002, BR-AI-003, BR-AI-004, BR-AI-007, BR-AI-008, BR-AI-009, BR-AI-010, BR-AI-011 |
| Permission Rule(s)     | Backend-only AI persistence; ownership enforced by upstream/downstream use cases |
| Data Entity / Entities | `AIRecommendation`, `AIPromptVersion`, optional references to `Event`, `VendorProfile`, `QuoteRequest`, `Quote` depending on feature |
| API Endpoint(s)        | None in this story                                                   |
| NFR Reference(s)       | NFR-AI, NFR-OBS, NFR-SEC, NFR-REL, NFR-TEST                          |
| Related ADR(s)         | ADR-AI-001, ADR-AI-006, ADR-AI-007, ADR-TEST-003                     |
| Related Document(s)    | `management/artifacts/4-Product-Backlog-Prioritized.md`; `management/artifacts/1-EventFlow-Epic-Map.md`; `docs/4-Business-Rules-Document.md`; `docs/6-Domain-Data-Model.md`; `docs/7-AI-Features-Specification.md`; `docs/8-Use-Cases-Specification.md`; `docs/9-Functional-Requirements-Document.md`; `docs/13-System-Architecture-Document.md`; `docs/17-AI-Architecture-and-PromptOps-Design.md`; `docs/18-Database-Physical-Design.md`; `docs/19-Security-and-Authorization-Design.md`; `docs/20-Testing-Strategy.md`; `docs/22-Architecture-Decision-Records.md` |

---

## Scope Guardrails

### MVP Scope

- Scope Classification: In Scope.
- MVP Relevance: Must Have (P0).
- Delivery Value: enables all MVP AI features to produce auditable, human-reviewable, reproducible records.

### In Scope

- Implement backend persistence capability for `AIRecommendation`.
- Create or implement `AIRecommendationRepository` / persistence service according to existing architecture.
- Persist records with required traceability metadata:
  - `requestedByUserId`.
  - `type`.
  - applicable context IDs such as `eventId`, `vendorProfileId`, `quoteRequestId`, `quoteId`.
  - `promptVersionId`.
  - `provider`.
  - `languageCode`.
  - `fallbackUsed`.
  - `timeoutMs`.
  - `latencyMs`.
  - `correlationId`.
  - sanitized `inputPayload`.
  - validated `outputPayload`.
  - initial `status = pending`.
- Support controlled failed/error persistence only when the schema/design can store safe failure metadata without unsafe raw output.
- Validate required fields before insert.
- Ensure payload minimization and sensitive-data redaction.
- Ensure persistence participates in transactions where a future use case needs atomic creation with related domain state.
- Add integration/unit/security tests for persistence and metadata.

### Explicitly Out of Scope

- Implementing `PromptRegistry`; covered by US-121.
- Implementing `LLMProvider` or providers; covered by PB-P0-009.
- Implementing timeout, retry, fallback orchestration, or schema validation runtime; covered by PB-P0-011 and feature-specific stories.
- Implementing product-specific AI generation flows such as event plan, checklist, budget, quote brief, or quote comparison.
- Creating API endpoints or frontend UI for AI recommendations.
- Implementing accept/edit/discard/reject endpoints or materialization into domain entities.
- Admin analytics dashboards or AI evidence catalog.
- Persisting raw secrets, API keys, tokens, full prompts, full unrelated domain objects, or unnecessary PII.
- RAG, vector database, chatbot, autonomous agents, tool calling, or autonomous decisions.

### Scope Notes

US-122 is the persistence foundation. It must be generic enough for all MVP AI features but must not implement those feature workflows.

---

## Acceptance Criteria

### AC-01: AIRecommendation repository persists required metadata

**Given** a validated AI result and AI execution context  
**When** the persistence service creates an `AIRecommendation`  
**Then** it must store `requestedByUserId`, `type`, applicable context IDs, `promptVersionId`, `provider`, `languageCode`, `fallbackUsed`, `timeoutMs`, `latencyMs`, `correlationId`, sanitized `inputPayload`, validated `outputPayload`, and timestamps.

### AC-02: New recommendations start as pending HITL records

**Given** an AI suggestion is persisted  
**When** the record is created  
**Then** it must be initialized as `status = pending` and `accepted = false` or equivalent schema semantics.

**And** no official domain entity is created or modified by this persistence operation alone.

### AC-03: Prompt version linkage is required

**Given** the AI result references a prompt version from US-121  
**When** `AIRecommendation` is persisted  
**Then** the record must include a valid `promptVersionId` / `AIPromptVersion` reference.

**And** persistence must fail with a controlled error if prompt version metadata is missing or invalid.

### AC-04: Provider and fallback metadata are preserved

**Given** an AI result is produced by `OpenAIProvider` or `MockAIProvider`  
**When** it is persisted  
**Then** `provider`, `fallbackUsed`, `timeoutMs`, and `latencyMs` must match the execution metadata.

**And** if fallback was used by an upstream fallback layer, `fallbackUsed` must be stored as `true`.

### AC-05: Language and correlation metadata are stored

**Given** a generation request includes `languageCode` and `correlationId`  
**When** the recommendation is persisted  
**Then** the record must preserve those values for audit, debugging, and i18n traceability.

### AC-06: Input payload is minimized and sanitized

**Given** source domain data contains fields not required by the prompt  
**When** the persistence service stores `inputPayload`  
**Then** it must store only minimized, sanitized input context.

**And** it must exclude secrets, tokens, cookies, API keys, raw credentials, unnecessary contact data, and unrelated full domain objects.

### AC-07: Output payload is validated before successful persistence

**Given** an AI provider returns output for a feature  
**When** the system attempts successful recommendation persistence  
**Then** the `outputPayload` must be the schema-validated structured output for that feature.

**And** invalid output must not be persisted as a successful `pending` recommendation.

### AC-08: Controlled failure records are safe if supported

**Given** an AI generation fails due to validation/provider/timeout and the implementation records failure metadata  
**When** a failed `AIRecommendation` or equivalent error record is created  
**Then** it must store only safe error metadata such as error code, provider, prompt version, correlation id, and timing.

**And** it must not store unsafe raw provider output or sensitive input.

### AC-09: Ownership context is available for downstream authorization

**Given** an AI recommendation is associated with an event, vendor profile, quote request, or quote  
**When** the record is persisted  
**Then** it must include enough context to let downstream read/apply/discard use cases enforce ownership and role rules.

### AC-10: Tests verify persistence and no unsafe side effects

**Given** automated tests run in CI  
**When** the `AIRecommendation` persistence tests execute  
**Then** they must verify required metadata, pending status, prompt version linkage, provider/fallback metadata, language/correlation metadata, payload minimization, invalid-output rejection, and no domain materialization side effects.

---

## Edge Cases

### EC-01: Missing prompt version metadata

**Given** a caller attempts to persist a recommendation without `promptVersionId`  
**When** validation runs  
**Then** persistence must fail with a controlled validation error.

#### Handling

- Do not create an `AIRecommendation`.
- Log safe metadata only: feature/type, provider, correlation id.

### EC-02: Invalid output payload

**Given** provider output fails strict schema validation  
**When** persistence is requested as a successful recommendation  
**Then** the repository/service must reject it.

#### Handling

- Do not create a `pending` recommendation with invalid output.
- If failure recording is supported, persist only safe failure metadata.

### EC-03: Sensitive input data is present upstream

**Given** domain context contains contact data, private notes, tokens, cookies, or secrets  
**When** `inputPayload` is built for persistence  
**Then** sensitive and unnecessary fields must be removed.

#### Handling

- Use allowlisted payload fields per feature where possible.
- Tests must cover redaction/minimization.

### EC-04: Fallback metadata is missing after fallback

**Given** upstream fallback produced a Mock result  
**When** persistence receives inconsistent metadata  
**Then** persistence must fail or log a controlled validation error rather than silently storing incorrect `fallbackUsed=false`.

#### Handling

- Require explicit provider/fallback metadata from the AI execution layer.
- Do not infer fallback from output content.

### EC-05: Domain context does not match recommendation type

**Given** a recommendation type requires an event context but no `eventId` is provided  
**When** persistence validation runs  
**Then** persistence must fail with a controlled validation error.

#### Handling

- Validate required context by `AIRecommendationType`.
- Keep rules generic enough for future feature use cases.

---

## Validation Rules

| ID    | Rule                                                             | Message / Behavior                                                   |
| ----- | ---------------------------------------------------------------- | -------------------------------------------------------------------- |
| VR-01 | `promptVersionId` is required                                    | Persistence validation fails                                          |
| VR-02 | `requestedByUserId` is required                                  | Persistence validation fails                                          |
| VR-03 | `type` must be a supported `AIRecommendationType`                | Persistence validation fails                                          |
| VR-04 | `provider` must be an approved provider id                       | Persistence validation fails                                          |
| VR-05 | `languageCode` must be a supported language                      | Persistence validation fails                                          |
| VR-06 | Successful records require validated `outputPayload`             | Persistence validation fails                                          |
| VR-07 | `inputPayload` must be sanitized/minimized                       | Security test/review fails                                            |
| VR-08 | New records must start as `pending` HITL state                   | Test fails                                                            |
| VR-09 | `fallbackUsed`, `latencyMs`, `timeoutMs`, and `correlationId` must be preserved when available | Test fails                                            |
| VR-10 | Persistence must not materialize domain entities                 | Test/review fails                                                     |

---

## Authorization & Security Rules

| ID     | Rule                                                                 |
| ------ | -------------------------------------------------------------------- |
| SEC-01 | Persistence is backend-only and not directly callable from frontend. |
| SEC-02 | Upstream use cases must enforce authentication, ownership, role, and rate-limit rules before invoking AI persistence. |
| SEC-03 | Persisted `inputPayload` must be minimized and sanitized.             |
| SEC-04 | Persisted `outputPayload` must be schema-validated.                   |
| SEC-05 | Logs must not include full prompts, secrets, raw provider output, tokens, cookies, or unnecessary PII. |
| SEC-06 | New recommendations remain pending until explicit human action in downstream use cases. |
| SEC-07 | Downstream use cases must use persisted context IDs for ownership checks before read/apply/discard actions. |

### Negative Authorization Scenarios

- Frontend attempts to directly create arbitrary `AIRecommendation` records -> no direct endpoint in this story.
- User tries to persist recommendation for an event they do not own -> upstream use case must reject before persistence.
- Persistence receives unsafe payload -> validation/review must reject or sanitize before storing.
- AI output attempts to mutate official domain state -> rejected; US-122 only stores pending recommendation.

---

## AI Behavior

### AI Involvement

| Field | Value |
| --- | --- |
| AI Feature | AI persistence foundation |
| Provider Layer | Consumes metadata from `LLMProvider`/AI execution result; does not call providers directly |
| Human Validation Required | Yes; records start pending and require downstream human action |
| Persist AIRecommendation | Yes |
| Fallback Required | No; records fallback metadata if upstream fallback occurred |

### AI Input

US-122 persists sanitized/minimized input payloads supplied by AI use cases. It must not construct full prompts or include unnecessary source domain objects.

### AI Output

US-122 persists schema-validated structured output payloads. It must not accept invalid output as a successful pending recommendation.

### Human-in-the-loop Rules

Persisted recommendations remain suggestions. They do not create tasks, budget items, quote briefs, vendor profile content, or other official domain data until downstream human acceptance/editing stories execute.

### AI Error / Fallback Behavior

- Timeout/retry/fallback orchestration is out of scope.
- If fallback happened upstream, the resulting recommendation stores `provider='mock'` and `fallbackUsed=true`.
- Invalid output is not stored as successful `pending`.
- Optional failed/error records must be safe and must not contain raw unsafe provider output.

---

## UX / UI Notes

| Area                | Notes                                  |
| ------------------- | -------------------------------------- |
| Screen / Route      | N/A                                    |
| Main UI Pattern     | N/A                                    |
| Primary Action      | N/A                                    |
| Secondary Actions   | N/A                                    |
| Empty State         | N/A                                    |
| Loading State       | N/A                                    |
| Error State         | N/A                                    |
| Success State       | N/A                                    |
| Accessibility Notes | N/A                                    |
| Responsive Notes    | N/A                                    |
| i18n Notes          | Persist `languageCode`; no UI copy introduced. |
| Currency Notes      | Persist currency-related input only when required by feature and already sanitized. |

---

## Technical Notes

### Frontend

- Route / Page: N/A.
- Components: N/A.
- State Management: N/A.
- Forms: N/A.
- API Client: N/A.

### Backend

- Suggested module: `src/modules/ai-assistance/infrastructure/persistence/`.
- Suggested port: `AIRecommendationRepository`.
- Suggested service/use case helper: `PersistAIRecommendationService` or equivalent.
- Inputs should include validated AI result, prompt version metadata, provider metadata, requester, correlation id, and domain context.
- Persistence must use Prisma/repository layer according to backend architecture.
- If called within a feature use case transaction, it must participate in that transaction rather than creating inconsistent side effects.
- Do not call `LLMProvider` from this story.

### Database

- Main Tables: `AIRecommendation`, `AIPromptVersion`.
- Schema ownership: model and constraints are covered by PB-P0-001 stories.
- Required relationships: user/requester, prompt version, and applicable domain context.
- Index considerations: status/type/user/context/correlation fields as already defined by schema/index stories.
- Migrations: no new schema redesign in this story unless existing schema lacks a field formally required by PB-P0-010 and ADRs.

### API

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| N/A    | N/A      | No API endpoint is introduced by this story. |

### Observability / Audit

- Correlation ID Required: Yes when available from request/execution context.
- Log Event Required: Yes for persistence success/failure using safe metadata only.
- AdminAction Required: No.
- AIRecommendation Required: Yes.
- Logs should include recommendation id, type, provider, fallback flag, latency bucket/value, status, and correlation id.
- Logs must exclude full prompts, raw secrets, full unsafe payloads, and unnecessary PII.

---

## Test Scenarios

### Functional Tests

| ID    | Scenario                                                        | Type        |
| ----- | --------------------------------------------------------------- | ----------- |
| TS-01 | Persist successful `AIRecommendation` with all required metadata | Integration |
| TS-02 | New record starts as `pending` / not accepted                    | Integration |
| TS-03 | Persist OpenAI result metadata                                   | Unit/Integration |
| TS-04 | Persist Mock fallback result with `fallbackUsed=true`            | Unit/Integration |
| TS-05 | Persist language and correlation id                              | Unit/Integration |
| TS-06 | Store valid context IDs for event/vendor/quote scenarios         | Unit/Integration |

### Negative Tests

| ID    | Scenario                                      | Expected Result                                      |
| ----- | --------------------------------------------- | ---------------------------------------------------- |
| NT-01 | Missing prompt version                         | Controlled validation error; no record created       |
| NT-02 | Missing requesting user                         | Controlled validation error; no record created       |
| NT-03 | Unsupported provider id                         | Controlled validation error                          |
| NT-04 | Invalid output payload persisted as success     | Rejected                                             |
| NT-05 | Context required by recommendation type missing | Controlled validation error                          |
| NT-06 | Fallback metadata inconsistent                  | Controlled validation error or safe failure path     |

### AI Tests

| ID       | Scenario                                      | Expected Result                                      |
| -------- | --------------------------------------------- | ---------------------------------------------------- |
| AI-TS-01 | Validated AI output is persisted              | `outputPayload` stored as structured JSON            |
| AI-TS-02 | Invalid AI output attempts successful persist | Rejected                                             |
| AI-TS-03 | HITL state is enforced on creation            | Recommendation remains pending, no domain mutation   |

### Authorization / Security Tests

| ID         | Scenario                                      | Expected Result                                      |
| ---------- | --------------------------------------------- | ---------------------------------------------------- |
| SEC-TS-01  | Input payload contains secret-like fields     | Sanitized fields are not stored                      |
| SEC-TS-02  | Logs generated for persistence failure        | Logs contain safe metadata only                      |
| SEC-TS-03  | User/context mismatch reaches persistence layer | Rejected or guarded by upstream test                |
| SEC-TS-04  | Direct frontend creation attempt              | No direct endpoint exists in this story              |

### Accessibility Tests

- N/A. This story has no UI surface.

### Seed / Demo Tests

| ID       | Scenario                                      | Expected Result                                      |
| -------- | --------------------------------------------- | ---------------------------------------------------- |
| SEED-TS-01 | Demo AI flow persists traceable recommendation | Seed/demo scenario can show `AIRecommendation` metadata |
| SEED-TS-02 | Mock provider demo output persists fallback metadata when applicable | `provider='mock'` and `fallbackUsed` reflect execution metadata |

---

## Business Impact

| Field               | Value                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| KPI Affected        | AI traceability, HITL compliance, QA evidence, auditability            |
| Expected Impact     | Enables all AI features to produce reviewable, reproducible records    |
| Success Criteria    | 100% of MVP AI generation paths can persist `AIRecommendation` metadata |
| Academic Demo Value | Provides concrete evidence for prompt/provider/output traceability     |

---

## Task Breakdown Readiness

### Potential Frontend Tasks

- None.

### Potential Backend Tasks

- Implement `AIRecommendationRepository` port and Prisma implementation.
- Implement persistence service/helper for AI use cases.
- Validate required metadata and context by recommendation type.
- Persist sanitized input and validated output payloads.
- Preserve provider, fallback, timeout, latency, language, and correlation metadata.
- Add safe structured logs for persistence success/failure.

### Potential Database Tasks

- Verify existing `AIRecommendation` and `AIPromptVersion` schema fields support required metadata.
- Do not redesign schema unless a formal gap is found against PB-P0-010/ADR requirements.

### Potential AI / PromptOps Tasks

- Integrate with prompt version metadata from US-121.
- Ensure downstream AI use cases pass validated output and execution metadata.

### Potential QA Tasks

- Integration tests against Prisma/database.
- Unit tests for validation and sanitization.
- Security tests for payload minimization and safe logs.
- Contract tests for repository/service input shape.

### Potential DevOps / Config Tasks

- Ensure CI database tests cover `AIRecommendation` persistence.
- Ensure no provider secrets or network access are required for persistence tests.

---

## Definition of Ready Checklist

| Item                                                        | Status |
| ----------------------------------------------------------- | ------ |
| Business value is clear                                     | Yes    |
| MVP scope is explicit                                       | Yes    |
| Dependencies are identified                                 | Yes    |
| Acceptance criteria are testable                            | Yes    |
| Security expectations are defined                           | Yes    |
| AI behavior and limitations are defined                     | Yes    |
| QA expectations are defined                                 | Yes    |
| Seed/demo expectations are defined                          | Yes    |
| Out-of-scope items are explicit                             | Yes    |
| Ready for formal PO/BA approval gate                        | Yes    |

---

## Definition of Done

- [ ] `AIRecommendation` persistence service/repository stores all required metadata.
- [ ] New recommendations start in pending HITL state and do not mutate official domain entities.
- [ ] Prompt version linkage is required and validated.
- [ ] Provider, fallback, timeout, latency, language, and correlation metadata are preserved.
- [ ] Input payloads are minimized/sanitized and output payloads are schema-validated before successful persistence.
- [ ] Tests cover success, validation failures, security redaction, safe logs, and no domain materialization side effects.
- [ ] No API endpoint, UI, provider call, prompt registry implementation, fallback orchestration, or accept/edit/discard workflow is implemented in this story.

---

## Refinement Notes

- Refinement completed on 2026-06-17 using `eventflow-user-story-refinement`.
- No blocking PO/BA decisions remain.
- Documentation Alignment Required: older docs sometimes describe `accepted` boolean while newer backlog/security language uses `status = pending/accepted/edited/rejected/discarded`. This story supports the status-based lifecycle and allows equivalent schema semantics if both fields exist, without blocking approval.
- Recommended next skill: `eventflow-user-story-approval`.
