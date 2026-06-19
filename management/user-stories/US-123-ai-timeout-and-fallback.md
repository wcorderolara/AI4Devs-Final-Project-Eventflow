# User Story: US-123 - Aplicar timeout 60s y fallback Mock controlado

## Metadata

| Field              | Value                                |
| ------------------ | ------------------------------------ |
| ID                 | US-123                               |
| Epic               | EPIC-AI-001                          |
| Feature            | AI timeout + controlled Mock fallback |
| Module / Domain    | AI Assistance / Platform             |
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
**I want** every `LLMProvider` invocation to enforce a 60,000 ms timeout and use `MockAIProvider` fallback only when demo/test fallback is explicitly enabled  
**So that** EventFlow can keep AI flows reliable, deterministic for demo/CI, observable, and safe from silent production fallback.

---

## Business Context

### Context Summary

EventFlow depends on AI features for MVP demo value, but the application must not hang or fail unpredictably when the external provider is slow, unavailable, or over quota. PO Decision 8.1 #9 and BR-AI-009 define a fixed 60 second timeout. ADR-AI-003 defines `MockAIProvider` as mandatory for tests, demo, and controlled fallback.

US-123 implements the cross-cutting timeout and fallback behavior for the AI execution layer. It does not implement feature-specific AI use cases, JSON validation/retry, prompt registry, provider adapters, endpoints, UI, or `AIRecommendation` persistence from scratch. It orchestrates already available providers and ensures the final AI execution metadata can be persisted by US-122.

### Related Domain Concepts

- `LLMProvider`.
- `OpenAIProvider`.
- `MockAIProvider`.
- `AIContext`.
- `AIResult<TOutput>`.
- `AIRecommendation`.
- `AIRecommendation.fallback_used`.
- `AIRecommendation.timeout_ms`.
- `CorrelationId`.
- `AI_TIMEOUT_MS`.
- `AI_DEMO_MODE`.
- `AI_USE_MOCK_FALLBACK`.
- `LLM_PROVIDER`.

### PO/BA Decisions Applied

| Decision | Applied Resolution |
| --- | --- |
| Timeout policy | AI calls must stop waiting after 60,000 ms (`AI_TIMEOUT_MS=60000`) per PO Decision 8.1 #9. |
| Demo fallback | `MockAIProvider` fallback is allowed when `AI_DEMO_MODE=true` or `AI_USE_MOCK_FALLBACK=true`, aligned with ADR-AI-003. |
| Production behavior | In `production-academic`, fallback must not be silent; `AI_USE_MOCK_FALLBACK=false` and timeout/provider failures return controlled errors. |
| CI behavior | Automated tests use `MockAIProvider` deterministically and must not call OpenAI or require provider secrets. |
| Anthropic boundary | `AnthropicProvider` remains a non-functional stub and is not a fallback target in MVP. |
| Persistence boundary | US-123 must provide timeout/fallback metadata so US-122 and downstream use cases can persist `AIRecommendation` with `fallback_used`, `timeout_ms`, provider and correlation data. |
| JSON validation boundary | JSON schema validation and one retry on invalid output belong to US-124. US-123 handles provider timeout/failure and fallback eligibility only. |

### Assumptions

- PB-P0-009 has defined `LLMProvider`, `OpenAIProvider`, `MockAIProvider`, and the provider selector.
- PB-P0-010 has defined prompt metadata and `AIRecommendation` persistence contracts.
- `AI_TIMEOUT_MS` defaults to `60000` unless explicitly overridden for tests.
- Test code may use a smaller timeout or fake timer/clock injection to avoid 60 second test waits, while preserving production default semantics.
- Upstream AI use cases apply authentication, ownership, rate limiting, prompt resolution, and output validation according to their own stories.

### Dependencies

- PB-P0-009: `LLMProvider` port and adapters.
- PB-P0-010: Prompt registry and `AIRecommendation` persistence.
- US-117: shared `LLMProvider` contract and AI types.
- US-118: `OpenAIProvider` functional adapter.
- US-119: deterministic `MockAIProvider`.
- US-120: `AnthropicProvider` stub boundary.
- US-121: prompt registry metadata.
- US-122: `AIRecommendation` persistence metadata.
- US-124: JSON validation and one controlled retry.

---

## Traceability

| Source                 | Reference                                                            |
| ---------------------- | -------------------------------------------------------------------- |
| Product Backlog Item   | PB-P0-011 - AI Timeout, Fallback & JSON Validation                   |
| Epic                   | EPIC-AI-001 - LLMProvider & PromptOps                                |
| FRD Requirement(s)     | FR-AI-009, FR-AI-014, FR-AI-016                                      |
| Use Case(s)            | Transversal - no implementa directamente un UC; habilita UC-AI-001..009 |
| Business Rule(s)       | BR-AI-005, BR-AI-006, BR-AI-007, BR-AI-009, BR-AI-010                |
| Permission Rule(s)     | Backend-only AI execution infrastructure; authorization is enforced by upstream AI use cases |
| Data Entity / Entities | `AIRecommendation` metadata downstream (`fallback_used`, `timeout_ms`, `provider`, `correlation_id`) |
| API Endpoint(s)        | None in this story                                                   |
| NFR Reference(s)       | NFR-REL-001, NFR-REL-003, NFR-AI-003, NFR-AI-004, NFR-AI-007, NFR-AI-008, NFR-OBS-002, NFR-TEST-003, NFR-DEMO-004, NFR-DEPLOY-002, NFR-DEPLOY-003 |
| Related ADR(s)         | ADR-AI-001, ADR-AI-003, ADR-AI-004, ADR-AI-005, ADR-TEST-003         |
| Related Document(s)    | `management/artifacts/4-Product-Backlog-Prioritized.md`; `management/artifacts/1-EventFlow-Epic-Map.md`; `docs/4-Business-Rules-Document.md`; `docs/8.1-Product-Owner-Decisions-Use-Cases-Addendum.md`; `docs/9-Functional-Requirements-Document.md`; `docs/10-Non-Functional-Requirements.md`; `docs/17-AI-Architecture-and-PromptOps-Design.md`; `docs/20-Testing-Strategy.md`; `docs/21-Deployment-and-DevOps-Design.md`; `docs/22-Architecture-Decision-Records.md` |

---

## Scope Guardrails

### MVP Scope

- Scope Classification: In Scope.
- MVP Relevance: Must Have (P0).
- Delivery Value: improves AI reliability, demo resilience, CI determinism, and auditability of timeout/fallback behavior.

### In Scope

- Enforce a 60,000 ms timeout for AI provider invocations.
- Read timeout/fallback behavior from approved configuration.
- Implement or wire an AI execution/fallback service around `LLMProvider`.
- Fall back to `MockAIProvider` only when demo/test fallback is enabled.
- Return controlled timeout/provider errors when fallback is disabled.
- Preserve provider, fallback, timeout, latency, original error code, and correlation metadata.
- Ensure fallback result is marked with `fallbackUsed=true` and `provider='mock'`.
- Ensure bootstrap/config validation rejects unsafe or inconsistent AI fallback configuration.
- Emit safe logs for timeout and fallback events.
- Add tests with fake timers or injectable clock to avoid slow test execution.

### Explicitly Out of Scope

- Implementing `LLMProvider`, `OpenAIProvider`, `MockAIProvider`, or `AnthropicProvider`; covered by PB-P0-009.
- Implementing prompt registry or prompt metadata; covered by US-121.
- Persisting `AIRecommendation`; covered by US-122.
- Implementing JSON schema validation or one retry on invalid JSON; covered by US-124.
- Implementing feature-specific AI use cases or endpoints.
- Creating frontend UI, badges, loading states, or timeout copy.
- Creating accept/edit/discard/reject workflows.
- Falling back to `AnthropicProvider`.
- Silent fallback in production.
- RAG, agents, chatbot, tool calling, autonomous decisions, or AI moderation.

### Scope Notes

US-123 is AI platform infrastructure. It must produce reliable execution metadata for downstream persistence and UI, but it must not materialize domain entities or bypass human-in-the-loop.

---

## Acceptance Criteria

### AC-01: AI calls enforce a 60,000 ms timeout

**Given** an AI use case invokes the configured `LLMProvider` through the AI execution layer  
**When** the provider does not return before the configured timeout  
**Then** the execution must stop waiting at `AI_TIMEOUT_MS`, defaulting to `60000` ms.

**And** the result must be either a controlled timeout error or a controlled fallback result according to configuration.

### AC-02: Fallback to MockAIProvider is allowed only in demo/test fallback modes

**Given** the primary provider fails or times out  
**When** `AI_DEMO_MODE=true` or `AI_USE_MOCK_FALLBACK=true` is enabled  
**Then** the execution layer may call `MockAIProvider` as fallback.

**And** the final result must include `fallbackUsed=true`, `provider='mock'`, the original provider/error reason, timeout metadata, latency metadata, and `correlationId` when available.

### AC-03: Fallback is not silent in production-academic

**Given** the primary provider fails or times out  
**When** fallback is disabled, especially in `production-academic` with `AI_USE_MOCK_FALLBACK=false`  
**Then** the execution layer must return a controlled AI timeout/provider error.

**And** it must not call `MockAIProvider` silently.

### AC-04: LLM_PROVIDER=mock remains deterministic primary mode

**Given** `LLM_PROVIDER=mock` is configured  
**When** an AI use case invokes the AI execution layer  
**Then** `MockAIProvider` is used as the primary provider, not as fallback.

**And** `fallbackUsed` must remain `false` unless a separate fallback path is actually used.

### AC-05: AnthropicProvider is never used as fallback in MVP

**Given** the primary provider fails or times out  
**When** fallback logic evaluates available providers  
**Then** `AnthropicProvider` must not be selected as fallback.

**And** any `anthropic` provider selection must follow the approved stub behavior from US-120.

### AC-06: Timeout/fallback metadata is available for AIRecommendation persistence

**Given** an AI execution completes through primary provider, fallback provider, or controlled timeout failure  
**When** the execution layer returns its result or error metadata  
**Then** downstream persistence can access provider, fallback flag, timeout value, latency, original error code, correlation ID, and final status.

**And** no full prompt, raw unsafe output, secrets, tokens, cookies, or unnecessary PII may be included in this metadata.

### AC-07: Bootstrap/config validation prevents unsafe fallback settings

**Given** the backend starts with AI-related environment variables  
**When** config validation runs  
**Then** invalid `AI_TIMEOUT_MS`, invalid `LLM_PROVIDER`, unsafe fallback flags, or forbidden payload logging in demo/production must fail fast with a clear configuration error.

**And** valid environments must support the documented matrix for `local-dev`, `test`, `demo-academic`, and `production-academic`.

### AC-08: Timeout and fallback events are observable without sensitive payloads

**Given** timeout or fallback occurs  
**When** the system logs the event  
**Then** it must log safe metadata such as `correlationId`, `featureType`, `provider`, `fallbackUsed`, `timeoutMs`, `latencyMs`, and `errorCode`.

**And** logs must not include full prompts, input payloads, raw provider outputs, secrets, tokens, cookies, or unnecessary PII.

### AC-09: Tests verify timeout and fallback behavior deterministically

**Given** automated tests run in CI  
**When** timeout and fallback scenarios are tested  
**Then** they must use `MockAIProvider`, fake timers, injectable clock, or delayed fake provider behavior without real network calls.

**And** tests must cover timeout, fallback enabled, fallback disabled, `LLM_PROVIDER=mock`, invalid config, safe logs, and no Anthropic fallback.

---

## Edge Cases

### EC-01: Provider exceeds timeout and fallback disabled

**Given** OpenAI or a fake provider takes longer than `AI_TIMEOUT_MS`  
**When** fallback is disabled  
**Then** the execution returns a controlled `AI_PROVIDER_TIMEOUT` or equivalent error.

#### Handling

- Cancel or ignore the delayed provider result.
- Log safe timeout metadata.
- Do not call `MockAIProvider`.

### EC-02: Provider exceeds timeout and fallback enabled

**Given** primary provider times out  
**When** demo/test fallback is enabled  
**Then** the execution calls `MockAIProvider` and returns deterministic fallback output.

#### Handling

- Mark `fallbackUsed=true`.
- Preserve original provider/error metadata.
- Expose metadata for `AIRecommendation` persistence.

### EC-03: Primary provider fails immediately

**Given** primary provider throws a controlled provider error before timeout  
**When** fallback is enabled  
**Then** fallback may be attempted according to the same rules.

#### Handling

- Preserve original error code.
- Do not leak provider stack trace or payload.

### EC-04: Invalid AI configuration at boot

**Given** `AI_TIMEOUT_MS` is missing/invalid, `LLM_PROVIDER` has an unsupported value, or fallback flags are unsafe for the environment  
**When** backend config validation runs  
**Then** startup must fail fast with a clear error.

#### Handling

- Report variable name and allowed values.
- Do not log secret values.

### EC-05: Mock provider fails during fallback

**Given** fallback is enabled and `MockAIProvider` also fails  
**When** the fallback attempt errors  
**Then** the execution returns a controlled fallback failure error.

#### Handling

- Log safe metadata.
- Do not attempt infinite fallback loops.
- Do not call Anthropic.

---

## Validation Rules

| ID    | Rule                                                             | Message / Behavior                                                   |
| ----- | ---------------------------------------------------------------- | -------------------------------------------------------------------- |
| VR-01 | `AI_TIMEOUT_MS` must default to `60000` and must be positive      | Invalid config fails fast                                            |
| VR-02 | `LLM_PROVIDER` must resolve to an approved provider               | Invalid provider fails fast                                          |
| VR-03 | `AI_USE_MOCK_FALLBACK=true` enables fallback only to `MockAIProvider` | Anthropic or other fallback targets are rejected                  |
| VR-04 | Production fallback must not be silent                            | Fallback disabled returns controlled error                           |
| VR-05 | `LLM_PROVIDER=mock` means mock is primary provider                 | Result has `provider='mock'` and `fallbackUsed=false`                |
| VR-06 | Timeout/fallback metadata must include provider, fallback flag, timeout, latency and correlation when available | Missing metadata fails tests |
| VR-07 | Logs must contain safe metadata only                              | Security test/review fails if payloads or secrets are logged         |

---

## Authorization & Security Rules

| ID     | Rule                                                                 |
| ------ | -------------------------------------------------------------------- |
| SEC-01 | US-123 introduces no public endpoint and no direct frontend access. |
| SEC-02 | Upstream AI use cases remain responsible for authentication, RBAC, ownership and rate limiting before invoking AI execution. |
| SEC-03 | Timeout/fallback logs must not include full prompts, raw input payloads, raw provider outputs, secrets, tokens, cookies or unnecessary PII. |
| SEC-04 | `AI_LOG_PAYLOADS=true` is forbidden in demo-academic and production-academic. |
| SEC-05 | Fallback must not bypass human-in-the-loop; outputs remain suggestions and must be persisted/accepted through downstream flows. |

### Negative Authorization Scenarios

- Frontend attempts to trigger fallback directly -> no public API is introduced by this story.
- A user tries to generate IA for an unauthorized resource -> upstream use case rejects before US-123 behavior applies.
- Production provider times out -> system returns controlled error, not silent mock output.
- Logs attempt to include prompt/input/output payload -> security test fails.

---

## AI Behavior

### AI Involvement

| Field | Value |
| --- | --- |
| AI Feature | Timeout and controlled fallback infrastructure |
| Provider Layer | Uses `LLMProvider`; primary provider from config; fallback only to `MockAIProvider` when enabled |
| Human Validation Required | Yes, downstream; US-123 does not materialize outputs |
| Persist AIRecommendation | No direct persistence in this story; metadata must be available for US-122/downstream persistence |
| Fallback Required | Yes, controlled by demo/test flags |

### AI Input

US-123 receives the same sanitized/minimized input already prepared by upstream AI use cases. It must not expand payload scope or log full prompts/input.

### AI Output

US-123 returns the primary or fallback provider output plus execution metadata. It does not validate JSON schemas or retry invalid JSON; that belongs to US-124.

### Human-in-the-loop Rules

Fallback output remains an AI suggestion. It must not create or modify official EventFlow entities until downstream HITL acceptance/editing workflows run.

### AI Error / Fallback Behavior

- Timeout is controlled by `AI_TIMEOUT_MS`, default `60000`.
- Fallback is allowed only when `AI_DEMO_MODE=true` or `AI_USE_MOCK_FALLBACK=true`.
- `LLM_PROVIDER=mock` uses mock as the primary provider.
- `AnthropicProvider` is never a fallback target in MVP.
- No infinite retry/fallback loops are allowed.

---

## UX / UI Notes

| Area                | Notes                                  |
| ------------------- | -------------------------------------- |
| Screen / Route      | N/A                                    |
| Main UI Pattern     | N/A                                    |
| Primary Action      | N/A                                    |
| Secondary Actions   | N/A                                    |
| Empty State         | N/A                                    |
| Loading State       | No UI introduced; frontend timeout/loading copy belongs to feature stories. |
| Error State         | Backend returns controlled errors for upstream endpoints to map. |
| Success State       | N/A                                    |
| Accessibility Notes | N/A                                    |
| Responsive Notes    | N/A                                    |
| i18n Notes          | No UI copy introduced; preserve `languageCode` in downstream metadata. |
| Currency Notes      | N/A                                    |

---

## Technical Notes

### Frontend

- Route / Page: N/A.
- Components: N/A.
- State Management: N/A.
- Forms: N/A.
- API Client: N/A.

### Backend

- Suggested module: `src/modules/ai-assistance/application/services/`.
- Suggested service: `AIExecutionService`, `FallbackService`, `AITimeoutService`, or equivalent according to existing patterns.
- Must wrap `LLMProvider` invocation with timeout handling.
- Must use provider selector/config from PB-P0-009.
- Must not import concrete SDKs into Application layer.
- Must expose metadata needed by US-122 persistence.
- Must support fake timers/injectable clock for tests.

### Database

- Main Tables: none directly changed by US-123.
- Downstream persistence: `AIRecommendation.fallback_used`, `timeout_ms`, `provider`, `latency_ms`, `correlation_id`.
- Migrations: none expected.

### API

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| N/A    | N/A      | No API endpoint is introduced by this story. |

### Observability / Audit

- Correlation ID Required: Yes when available from upstream request/execution context.
- Log Event Required: Yes, safe logs for timeout/fallback/failure.
- Suggested log events:
  - `ai.provider.timeout`.
  - `ai.fallback_used`.
  - `ai.provider.failure`.
  - `ai.config.invalid`.
- AdminAction Required: No.
- AIRecommendation Required: Not directly; metadata must be passed to US-122/downstream persistence.

---

## Test Scenarios

### Functional Tests

| ID    | Scenario                          | Type        |
| ----- | --------------------------------- | ----------- |
| TS-01 | Provider returns before timeout and no fallback is used | Unit |
| TS-02 | Provider exceeds timeout and fallback disabled returns controlled timeout error | Unit/Integration |
| TS-03 | Provider exceeds timeout and fallback enabled returns `MockAIProvider` result with `fallbackUsed=true` | Unit/Integration |
| TS-04 | `LLM_PROVIDER=mock` uses mock as primary with `fallbackUsed=false` | Unit |
| TS-05 | Provider failure before timeout follows same fallback eligibility rules | Unit |

### Negative Tests

| ID    | Scenario                              | Expected Result          |
| ----- | ------------------------------------- | ------------------------ |
| NT-01 | Invalid `AI_TIMEOUT_MS`               | Fail-fast config error   |
| NT-02 | Invalid `LLM_PROVIDER`                | Fail-fast config error   |
| NT-03 | Fallback disabled in production-academic | Controlled provider/timeout error; no mock call |
| NT-04 | `AnthropicProvider` considered as fallback | Rejected/not selected |
| NT-05 | Mock fallback also fails              | Controlled fallback failure; no loop |

### AI Tests

| ID       | Scenario                                | Expected Result          |
| -------- | --------------------------------------- | ------------------------ |
| AI-TS-01 | Fake delayed provider exceeds timeout using fake timers | Timeout behavior verified without waiting 60s |
| AI-TS-02 | Demo fallback produces deterministic mock output | Output and metadata are stable |
| AI-TS-03 | Fallback metadata is preserved for persistence | provider, fallback flag, timeout, latency, error code and correlation are available |

### Security Tests

| ID        | Scenario                                | Expected Result          |
| --------- | --------------------------------------- | ------------------------ |
| SEC-TS-01 | Timeout/fallback logs include payload   | Test fails               |
| SEC-TS-02 | `AI_LOG_PAYLOADS=true` in demo/production | Fail-fast config error |
| SEC-TS-03 | Error logs include secret-like value    | Test fails               |

### Authorization Tests

| ID         | Scenario           | Expected Result |
| ---------- | ------------------ | --------------- |
| AUTH-TS-01 | No endpoint or direct frontend invocation added | Review/test passes |
| AUTH-TS-02 | Upstream unauthorized AI use case is outside US-123 and remains unchanged | No bypass introduced |

### Accessibility Tests

N/A - no UI introduced.

### Seed / Demo Tests

| ID         | Scenario                                | Expected Result          |
| ---------- | --------------------------------------- | ------------------------ |
| DEMO-TS-01 | `demo-academic` config uses OpenAI primary with mock fallback enabled | Config validation passes |
| DEMO-TS-02 | `test` config uses mock primary without external network | Tests pass without OpenAI secrets |
| DEMO-TS-03 | Fallback path uses deterministic mock fixture aligned with demo seed | Demo remains reproducible |

---

## Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | AI reliability, demo readiness, CI determinism, observability |
| Expected Impact     | Prevents hanging AI flows and keeps demo/test reliable without silent production fallback |
| Success Criteria    | Timeout/fallback tests pass; safe logs emitted; production fallback disabled; demo fallback works |
| Academic Demo Value | High - protects demo from provider outage, network instability and quota issues |

---

## Task Breakdown Readiness

### Potential Frontend Tasks

N/A.

### Potential Backend Tasks

- Implement timeout wrapper around `LLMProvider` invocation.
- Implement fallback eligibility service/config.
- Normalize AI execution metadata.
- Implement controlled timeout/provider/fallback errors.
- Validate AI environment configuration at boot.

### Potential Database Tasks

No direct database changes expected.

### Potential AI / PromptOps Tasks

- Verify fallback uses `MockAIProvider` deterministic outputs.
- Ensure Anthropic is not selected as fallback.
- Preserve metadata for US-122 persistence.

### Potential QA Tasks

- Unit tests with fake timers/injectable clock.
- Integration tests for fallback enabled/disabled.
- CI tests with `MockAIProvider` and no real network.
- Security tests for safe logs.

### Potential DevOps / Config Tasks

- Ensure `.env.example` and config schema include `AI_TIMEOUT_MS`, `AI_DEMO_MODE`, `AI_USE_MOCK_FALLBACK`, `AI_LOG_PAYLOADS`, and `LLM_PROVIDER`.
- Validate documented environment matrix for local-dev, test, demo-academic, and production-academic.

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
