# User Story: US-124 - Aplicar validación JSON estricta con un reintento controlado

## Metadata

| Field              | Value                                |
| ------------------ | ------------------------------------ |
| ID                 | US-124                               |
| Epic               | EPIC-AI-001                          |
| Feature            | AI JSON validation + controlled retry |
| Module / Domain    | AI Assistance / Output Validation    |
| User Role          | System                               |
| Priority           | Must Have (P0)                       |
| Status             | Approved with Minor Notes            |
| Owner              | Product Owner / Business Analyst     |
| Approved By        | Product Owner / Business Analyst Review |
| Approval Date      | 2026-06-18                           |
| Ready for Development Tasks | Yes                         |
| Sprint / Milestone | MVP Foundation                       |
| Created Date       | 2026-06-09                           |
| Last Updated       | 2026-06-18                           |

---

## User Story

**As the** EventFlow AI platform  
**I want** every AI provider output to be parsed and validated with strict Zod schemas, with at most one controlled retry when validation fails  
**So that** EventFlow only persists and exposes structured, safe, schema-compliant AI recommendations while avoiding infinite retries or unsafe malformed output.

---

## Business Context

### Context Summary

EventFlow AI outputs are suggestions that can later become product data through human-in-the-loop workflows. Invalid JSON, extra fields, missing required fields, wrong enum values, wrong currency/language, or prompt-injection-shaped responses must not be persisted as successful `AIRecommendation` records.

ADR-AI-007 requires strict Zod validation for every AI output before persistence or use. Docs/17 defines a single retry only for `AIInvalidOutputError`; timeouts and provider failures are handled by US-123. US-124 implements the validation and retry foundation used by all downstream MVP AI features.

### Related Domain Concepts

- `LLMProvider`.
- `AIResult<TOutput>`.
- `AIInvalidOutputError`.
- `AIRecommendation`.
- `AIRecommendation.status`.
- `AIRecommendation.retry_count`.
- `AIRecommendation.schema_valid`.
- `PromptRegistry`.
- `AIPromptVersion`.
- Zod output schemas.
- `MockAIProvider`.
- `CorrelationId`.

### PO/BA Decisions Applied

| Decision | Applied Resolution |
| --- | --- |
| Strict output validation | Every AI output must pass strict Zod validation before being persisted as a successful recommendation or exposed to users, per ADR-AI-007. |
| Retry limit | Retry maximum is exactly one, and only for invalid/malformed output (`AIInvalidOutputError`). |
| No retry for timeout/provider failures | Timeouts, provider unavailable errors, and provider 5xx failures are handled by US-123 and must not trigger this retry path. |
| Same prompt/context on retry | The retry uses the same feature, language, prompt version, sanitized input and provider execution context unless upstream orchestration explicitly changes provider through US-123 fallback. |
| Failed validation persistence | If the second attempt fails, the system returns controlled `422 AI_INVALID_OUTPUT` and may persist a safe failed `AIRecommendation` if supported by US-122 schema/behavior. |
| Demo fallback boundary | If demo/test fallback is enabled and retry still fails, fallback to `MockAIProvider` may be delegated to the US-123 fallback service. |
| Security posture | Invalid raw output, full prompts, secrets, tokens, cookies, and unnecessary PII must not be logged or persisted. |

### Assumptions

- PB-P0-009 provides `LLMProvider`, `OpenAIProvider`, `MockAIProvider`, and shared AI error types.
- PB-P0-010 provides prompt version metadata and `AIRecommendation` persistence contracts.
- US-123 provides timeout/fallback behavior and metadata.
- Feature-specific output schemas are defined or introduced by the feature stories that consume this validation foundation.
- `MockAIProvider` fixtures are contract-tested against the same schemas used for real provider outputs.
- Strict schemas use `.strict()` or equivalent behavior to reject unexpected fields.

### Dependencies

- PB-P0-009: `LLMProvider` port and adapters.
- PB-P0-010: Prompt registry and `AIRecommendation` persistence.
- PB-P0-011: parent backlog item for timeout, fallback and JSON validation.
- US-117: shared AI contract and error types.
- US-119: deterministic `MockAIProvider`.
- US-121: prompt registry and output schema references.
- US-122: `AIRecommendation` persistence, including safe failed records if schema supports them.
- US-123: timeout/fallback infrastructure.
- ADR-AI-007: strict JSON schema validation for AI outputs.

---

## Traceability

| Source                 | Reference                                                            |
| ---------------------- | -------------------------------------------------------------------- |
| Product Backlog Item   | PB-P0-011 - AI Timeout, Fallback & JSON Validation                   |
| Epic                   | EPIC-AI-001 - LLMProvider & PromptOps                                |
| FRD Requirement(s)     | FR-AI-009, FR-AI-010, FR-AI-014, FR-AI-018                           |
| Use Case(s)            | Transversal - no implementa directamente un UC; habilita UC-AI-001..009 |
| Business Rule(s)       | BR-AI-005, BR-AI-007, BR-AI-009, BR-AI-010, BR-AI-011                |
| Permission Rule(s)     | Backend-only AI validation infrastructure; authorization is enforced by upstream AI use cases |
| Data Entity / Entities | `AIRecommendation`, `AIPromptVersion`; downstream fields `schema_valid`, `retry_count`, `status`, `error_code` if supported |
| API Endpoint(s)        | None in this story                                                   |
| NFR Reference(s)       | NFR-AI-004, NFR-AI-005, NFR-AI-007, NFR-AI-008, NFR-AI-010, NFR-OBS-002, NFR-TEST-003 |
| Related ADR(s)         | ADR-AI-001, ADR-AI-003, ADR-AI-005, ADR-AI-006, ADR-AI-007, ADR-DB-003, ADR-TEST-003 |
| Related Document(s)    | `management/artifacts/4-Product-Backlog-Prioritized.md`; `management/artifacts/1-EventFlow-Epic-Map.md`; `docs/7-AI-Features-Specification.md`; `docs/9-Functional-Requirements-Document.md`; `docs/10-Non-Functional-Requirements.md`; `docs/17-AI-Architecture-and-PromptOps-Design.md`; `docs/20-Testing-Strategy.md`; `docs/22-Architecture-Decision-Records.md` |

---

## Scope Guardrails

### MVP Scope

- Scope Classification: In Scope.
- MVP Relevance: Must Have (P0).
- Delivery Value: prevents malformed AI outputs from entering HITL workflows, improves demo reliability and creates testable contracts for AI features.

### In Scope

- Create or wire strict Zod output validators for AI provider outputs.
- Parse provider output safely before validation.
- Validate output against the feature-specific schema before successful persistence or exposure.
- Reject extra fields, missing required fields, wrong types, invalid enum values and feature-specific invariant violations expressed by schemas.
- Retry exactly once when the provider output fails parsing or Zod validation.
- Track `retryCount` / `retry_count` metadata.
- Return controlled `AI_INVALID_OUTPUT` / `AI_INVALID_OUTPUT_SCHEMA` errors when validation fails after retry and fallback is not applicable.
- Pass safe validation metadata to US-122 persistence.
- Support safe failed record metadata if US-122/schema supports it.
- Add unit, integration, contract, security and CI tests.

### Explicitly Out of Scope

- Implementing provider timeout/fallback orchestration; covered by US-123.
- Implementing `LLMProvider`, provider adapters or provider selection; covered by PB-P0-009.
- Implementing prompt registry; covered by US-121.
- Implementing `AIRecommendation` persistence from scratch; covered by US-122.
- Implementing feature-specific AI endpoints or UI.
- Implementing accept/edit/discard/reject workflows.
- Creating all feature output schemas if they belong to downstream feature stories; US-124 defines shared validation mechanics and reusable patterns.
- Persisting invalid raw provider output as successful `pending`.
- Retrying more than once.
- Retrying on timeouts, provider 5xx, provider not configured, auth errors or rate-limit errors.
- RAG, agents, chatbot, tool calling, autonomous decisions or AI moderation.

### Scope Notes

US-124 is validation infrastructure. It must be reusable by all MVP AI feature use cases and must preserve human-in-the-loop behavior by ensuring only schema-valid suggestions can become successful `AIRecommendation` records.

---

## Acceptance Criteria

### AC-01: Provider output is parsed and validated with strict Zod schema

**Given** an AI provider returns output for a feature  
**When** the AI execution layer receives the output  
**Then** it must parse the output and validate it against the feature-specific strict Zod output schema.

**And** successful validation must return typed/canonical output for downstream persistence and response mapping.

### AC-02: Invalid output is not persisted or exposed as successful recommendation

**Given** provider output is malformed JSON or fails strict schema validation  
**When** validation fails  
**Then** the output must not be persisted as a successful `pending` `AIRecommendation`.

**And** it must not be exposed to the user as an actionable AI suggestion.

### AC-03: Exactly one retry is allowed for invalid output

**Given** the first provider response fails parsing or Zod validation  
**When** the failure is classified as `AIInvalidOutputError` or equivalent  
**Then** the system may retry the same AI generation once.

**And** `retryCount` / `retry_count` must be recorded as `1` when the second attempt is made.

### AC-04: Retry is not used for timeout or provider availability failures

**Given** the AI execution fails due to timeout, provider unavailable, provider not configured, provider 5xx, auth error or rate-limit error  
**When** the system handles the failure  
**Then** US-124 retry logic must not perform a JSON validation retry.

**And** those failures must remain delegated to US-123 timeout/fallback/error handling.

### AC-05: Retry success produces valid output and metadata

**Given** the first output is invalid and the retry output is valid  
**When** validation succeeds on the second attempt  
**Then** the system returns the validated typed output with `schemaValid=true` and `retryCount=1`.

**And** downstream persistence can create a successful `AIRecommendation` with retry metadata.

### AC-06: Retry failure returns controlled invalid-output behavior

**Given** both the original output and the single retry output are invalid  
**When** fallback is not applicable  
**Then** the system returns controlled `422 AI_INVALID_OUTPUT` or equivalent application error.

**And** only safe failure metadata may be persisted or logged.

### AC-07: Demo/test fallback after retry failure is delegated safely

**Given** both validation attempts fail  
**When** demo/test fallback is enabled by US-123 configuration  
**Then** the system may delegate to the fallback path that uses `MockAIProvider`.

**And** the fallback result must still pass the same strict output schema before being returned as successful.

### AC-08: Schema validation rejects unsafe or out-of-contract outputs

**Given** provider output contains extra fields, instructions outside JSON, prompt-injection-like content, wrong currency/language, wrong enum values, missing required fields or invalid arrays  
**When** strict validation runs  
**Then** validation must fail with a controlled validation error.

**And** details must be safe, bounded and suitable for logs/QA without storing raw unsafe output.

### AC-09: Validation logs and metrics are safe and observable

**Given** output validation fails or retry occurs  
**When** the system logs the event  
**Then** it must include safe metadata such as `featureType`, `provider`, `schemaName`, `retryCount`, `errorCode`, truncated schema error summary and `correlationId`.

**And** logs must not include full prompts, raw provider output, secrets, tokens, cookies or unnecessary PII.

### AC-10: Tests cover validation, retry and no unsafe persistence

**Given** automated tests run in CI  
**When** AI output validation tests execute  
**Then** they must verify valid output, malformed JSON, schema mismatch, extra fields, one retry success, one retry failure, no retry for timeout/provider errors, fallback delegation, safe logs and contract alignment for `MockAIProvider`.

---

## Edge Cases

### EC-01: Provider returns prose plus JSON

**Given** provider output includes text before or after a JSON object  
**When** strict parse/validation runs  
**Then** validation must fail unless the approved parser explicitly extracts a valid JSON object without ambiguity.

#### Handling

- Prefer JSON-only parser behavior.
- Retry once with same prompt/version.
- Do not persist raw output as success.

### EC-02: Provider returns JSON with extra fields

**Given** provider output is syntactically valid JSON but includes fields not allowed by the Zod schema  
**When** `.strict()` validation runs  
**Then** validation fails.

#### Handling

- Retry once.
- Log safe schema error summary.
- Do not silently strip fields unless schema explicitly transforms them.

### EC-03: Provider returns valid shape with invalid business invariant

**Given** the output has valid JSON shape but violates schema-level invariants, such as currency mismatch or invalid enum  
**When** Zod refinement validation runs  
**Then** validation fails as `AI_INVALID_OUTPUT_SCHEMA`.

#### Handling

- Retry once if the failure is classified as invalid output.
- Preserve safe validation details.

### EC-04: Retry output is valid

**Given** first attempt fails validation and second attempt passes  
**When** the retry succeeds  
**Then** return validated output with `retryCount=1`.

#### Handling

- Downstream persistence can store successful recommendation.
- Logs include retry metadata without raw invalid output.

### EC-05: Retry output also fails

**Given** both attempts fail validation  
**When** fallback is disabled  
**Then** return controlled invalid-output error and optionally persist safe failed metadata only if supported.

#### Handling

- No second retry.
- No infinite loops.
- No successful `pending` recommendation from invalid output.

---

## Validation Rules

| ID    | Rule                                                             | Message / Behavior                                                   |
| ----- | ---------------------------------------------------------------- | -------------------------------------------------------------------- |
| VR-01 | Every AI output must be parsed before use                         | Parse failure becomes `AIInvalidOutputError`                         |
| VR-02 | Every AI output must pass strict feature-specific Zod validation   | Schema failure becomes `AI_INVALID_OUTPUT_SCHEMA`                    |
| VR-03 | Extra fields are rejected unless schema explicitly allows/transforms them | Validation fails                                                  |
| VR-04 | Retry count must never exceed 1                                   | Additional retry attempt fails tests/review                          |
| VR-05 | Retry only applies to invalid output errors                       | Timeout/provider failures are delegated to US-123                    |
| VR-06 | Successful output must expose `schemaValid=true`                   | Missing marker fails tests                                           |
| VR-07 | Failed output must not be persisted as successful pending recommendation | Persistence/security test fails                                  |
| VR-08 | Logs and errors must not include raw output or sensitive data      | Security test/review fails                                           |

---

## Authorization & Security Rules

| ID     | Rule                                                                 |
| ------ | -------------------------------------------------------------------- |
| SEC-01 | US-124 introduces no public endpoint and no direct frontend access. |
| SEC-02 | Upstream AI use cases remain responsible for authentication, RBAC, ownership and rate limiting. |
| SEC-03 | Invalid raw provider output must not be persisted as successful recommendation. |
| SEC-04 | Validation errors/logs must not include full prompt, raw output, secrets, tokens, cookies or unnecessary PII. |
| SEC-05 | Schema validation must reduce prompt-injection risk by rejecting out-of-contract outputs and unexpected fields. |
| SEC-06 | Outputs remain HITL suggestions and must not materialize domain entities without downstream human action. |

### Negative Authorization Scenarios

- Frontend attempts to bypass validation by submitting AI output directly -> no endpoint is introduced by this story.
- Unauthorized user triggers AI feature -> upstream use case rejects before validation applies.
- Provider output contains instruction to create data directly -> strict schema rejects or downstream HITL prevents materialization.
- Invalid output is logged verbatim -> security test fails.

---

## AI Behavior

### AI Involvement

| Field | Value |
| --- | --- |
| AI Feature | Strict output validation and controlled retry |
| Provider Layer | Consumes `LLMProvider` results; does not implement providers |
| Human Validation Required | Yes, downstream; valid output remains a suggestion |
| Persist AIRecommendation | No direct persistence in this story; passes `schemaValid`, `retryCount` and safe failure metadata to US-122/downstream persistence |
| Fallback Required | Only delegated to US-123 after retry failure when demo/test fallback is enabled |

### AI Input

US-124 does not expand AI input. Retry uses the same sanitized/minimized input, same prompt version, same language and same feature context unless US-123 fallback changes the provider according to config.

### AI Output

US-124 parses and validates AI output. Only validated typed output can continue to successful persistence/response mapping.

### Human-in-the-loop Rules

Validated output is still a suggestion. It must be persisted as `AIRecommendation` and remain pending until downstream human acceptance/editing workflows run.

### AI Error / Fallback Behavior

- Retry exactly once for invalid JSON/schema failure.
- No retry for timeout/provider failures.
- After retry failure, return `422 AI_INVALID_OUTPUT` unless US-123 fallback is enabled and succeeds.
- Fallback output must also pass strict validation.
- No Anthropic fallback.

---

## UX / UI Notes

| Area                | Notes                                  |
| ------------------- | -------------------------------------- |
| Screen / Route      | N/A                                    |
| Main UI Pattern     | N/A                                    |
| Primary Action      | N/A                                    |
| Secondary Actions   | N/A                                    |
| Empty State         | N/A                                    |
| Loading State       | No UI introduced; feature endpoints may map retry latency to existing loading states. |
| Error State         | Backend returns controlled `AI_INVALID_OUTPUT` for upstream endpoints to map. |
| Success State       | N/A                                    |
| Accessibility Notes | N/A                                    |
| Responsive Notes    | N/A                                    |
| i18n Notes          | No UI copy introduced; output content language is validated by feature schemas where applicable. |
| Currency Notes      | Currency invariants must be enforced by feature output schemas when relevant. |

---

## Technical Notes

### Frontend

- Route / Page: N/A.
- Components: N/A.
- State Management: N/A.
- Forms: N/A.
- API Client: N/A.

### Backend

- Suggested module: `src/modules/ai-assistance/infrastructure/output-validators/` or equivalent.
- Suggested service: `AIOutputValidationService`, `ValidatedAIExecutionService`, or equivalent according to existing architecture.
- Validators should use strict Zod schemas and infer TypeScript DTOs from schemas.
- Validation must occur after provider response and before successful `AIRecommendation` persistence.
- Retry orchestration must cap at one retry and classify retryable vs non-retryable AI errors.
- Must pass safe metadata to US-122 persistence and observability.

### Database

- Main Tables: none directly changed by US-124.
- Downstream persistence: `AIRecommendation.schema_valid`, `retry_count`, `status`, `error_code` if schema supports these fields.
- Migrations: none expected. If fields are missing, document mapping/gap for US-122 or schema ownership stories.

### API

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| N/A    | N/A      | No API endpoint is introduced by this story. |

### Observability / Audit

- Correlation ID Required: Yes when available from upstream request/execution context.
- Log Event Required: Yes, safe logs for validation failure and retry.
- Suggested log events:
  - `ai.output_validation_failed`.
  - `ai.output_retry_attempted`.
  - `ai.output_validation_success`.
- Suggested metrics:
  - `ai_schema_validation_failed_total`.
  - `ai_output_retry_total`.
- AdminAction Required: No.
- AIRecommendation Required: Not directly; safe success/failure metadata must be available for downstream persistence.

---

## Test Scenarios

### Functional Tests

| ID    | Scenario                          | Type        |
| ----- | --------------------------------- | ----------- |
| TS-01 | Valid provider output passes strict schema and returns typed output | Unit |
| TS-02 | Malformed JSON fails validation and triggers one retry | Unit |
| TS-03 | Extra fields fail strict schema validation | Unit |
| TS-04 | Retry succeeds and returns `schemaValid=true`, `retryCount=1` | Unit/Integration |
| TS-05 | Retry fails and returns controlled `AI_INVALID_OUTPUT` | Unit/Integration |

### Negative Tests

| ID    | Scenario                              | Expected Result          |
| ----- | ------------------------------------- | ------------------------ |
| NT-01 | Timeout error reaches validation layer | No validation retry; delegated to US-123 behavior |
| NT-02 | Provider unavailable / 5xx failure    | No validation retry; controlled provider error/fallback path |
| NT-03 | Attempt to retry more than once       | Test fails / guard blocks |
| NT-04 | Invalid raw output persisted as success | Test fails |
| NT-05 | Validation logs include raw output    | Security test fails |

### AI Tests

| ID       | Scenario                                | Expected Result          |
| -------- | --------------------------------------- | ------------------------ |
| AI-TS-01 | `MockAIProvider` valid fixture passes same schema as real output | OK |
| AI-TS-02 | `MockAIProvider` forced invalid JSON triggers retry path | Controlled retry behavior |
| AI-TS-03 | Demo fallback after retry failure validates mock fallback output | Validated fallback output or controlled error |
| AI-TS-04 | Feature invariant violation, such as wrong currency/language, fails schema | `AI_INVALID_OUTPUT_SCHEMA` |

### Security Tests

| ID        | Scenario                                | Expected Result          |
| --------- | --------------------------------------- | ------------------------ |
| SEC-TS-01 | Prompt-injection-like content appears outside schema | Rejected |
| SEC-TS-02 | Unexpected fields appear in output      | Rejected by strict schema |
| SEC-TS-03 | Logs include prompt/raw output/secrets  | Test fails |

### Authorization Tests

| ID         | Scenario           | Expected Result |
| ---------- | ------------------ | --------------- |
| AUTH-TS-01 | No endpoint or direct frontend invocation added | Review/test passes |
| AUTH-TS-02 | Validation does not bypass upstream ownership checks | No bypass introduced |

### Accessibility Tests

N/A - no UI introduced.

### Seed / Demo Tests

| ID         | Scenario                                | Expected Result          |
| ---------- | --------------------------------------- | ------------------------ |
| DEMO-TS-01 | Demo mock fixtures conform to feature schemas | Contract tests pass |
| DEMO-TS-02 | Forced invalid JSON fixture produces deterministic retry/error behavior | CI deterministic |
| DEMO-TS-03 | Fallback result after retry failure is schema-valid before success | No unsafe demo output |

---

## Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | AI reliability, output quality, QA determinism, auditability |
| Expected Impact     | Blocks malformed AI outputs and makes retry/failure behavior predictable |
| Success Criteria    | Strict validation tests pass; one retry enforced; invalid outputs are not successful recommendations |
| Academic Demo Value | High - demonstrates robust AI safety and reproducible schema-governed outputs |

---

## Task Breakdown Readiness

### Potential Frontend Tasks

N/A.

### Potential Backend Tasks

- Implement shared output validator service.
- Add strict Zod schemas or schema registry hooks for AI outputs.
- Implement `AIInvalidOutputError` mapping.
- Implement retry guard with maximum one retry.
- Expose validation metadata for persistence/observability.

### Potential Database Tasks

No direct database changes expected. Validate mapping to `AIRecommendation.schema_valid`, `retry_count`, `status` and `error_code` if schema supports them.

### Potential AI / PromptOps Tasks

- Ensure prompt templates contain JSON-only instructions.
- Ensure `PromptRegistry` metadata references output schemas.
- Ensure `MockAIProvider` fixtures pass the same validators.

### Potential QA Tasks

- Unit tests for validators.
- Integration tests for retry success/failure.
- Contract tests for mock fixtures.
- Security tests for raw output leakage and prompt-injection-like outputs.
- CI tests with no OpenAI network calls.

### Potential DevOps / Config Tasks

- Ensure CI can run validation/retry tests with `MockAIProvider`.
- No provider secrets required for this story.

---

## Definition of Ready Checklist

| Check | Status |
| --- | --- |
| Story has clear business value | Yes |
| Scope is MVP-aligned | Yes |
| Dependencies are identified | Yes |
| Acceptance Criteria are testable | Yes |
| Security expectations are explicit | Yes |
| AI expectations are explicit | Yes |
| QA expectations are explicit | Yes |
| Seed/demo impact is clear | Yes |
| Out-of-scope items are explicit | Yes |
| Ready for Approval Gate | Yes |
