# User Story: US-120 - Crear AnthropicProvider stub no funcional

## Metadata

| Field              | Value                                |
| ------------------ | ------------------------------------ |
| ID                 | US-120                               |
| Epic               | EPIC-AI-001                          |
| Feature            | AnthropicProvider stub               |
| Module / Domain    | AI Assistance / Platform             |
| User Role          | System                               |
| Priority           | Must Have (P0)                       |
| Status             | Approved                             |
| Owner              | Product Owner / Business Analyst     |
| Approved By        | Product Owner / Business Analyst Review |
| Approval Date      | 2026-06-16                           |
| Ready for Development Tasks | Yes                         |
| Sprint / Milestone | MVP Foundation                       |
| Created Date       | 2026-06-09                           |
| Last Updated       | 2026-06-16                           |

---

## User Story

**As the** EventFlow backend platform  
**I want** to provide a non-functional `AnthropicProvider` stub that satisfies the `LLMProvider` contract and fails explicitly when invoked  
**So that** the MVP demonstrates provider substitutability without implementing Anthropic as a functional provider or adding failover complexity.

---

## Business Context

### Context Summary

EventFlow uses `LLMProvider` to keep AI use cases decoupled from concrete LLM vendors. OpenAI is the functional MVP provider, `MockAIProvider` is mandatory for CI/demo/testing, and `AnthropicProvider` remains a non-functional stub for future extensibility.

ADR-AI-004 explicitly accepts keeping `AnthropicProvider` as a stub in MVP. The stub must compile against the same contract as other providers, but it must not call Anthropic, require Anthropic credentials, provide production AI output, or participate in automatic failover.

### Related Domain Concepts

- `LLMProvider` port.
- `AnthropicProvider` stub.
- Provider substitutability.
- Typed provider errors.
- Backend-only AI provider architecture.
- Future provider extensibility.

### PO/BA Decisions Applied

| Decision | Applied Resolution |
| --- | --- |
| MVP Anthropic scope | `AnthropicProvider` is a non-functional stub only. Functional Anthropic integration is Future. |
| Contract compliance | The stub must implement `LLMProvider` so substitutability can be verified at compile/test time. |
| Invocation behavior | Any runtime invocation must fail explicitly with a typed `AIProviderNotConfiguredError` or `AINotImplementedError` as defined by US-117. |
| No SDK dependency | The stub must not install, import, or initialize the Anthropic SDK in MVP. |
| No secrets | No Anthropic API key is required or read for MVP behavior. |
| No failover | The stub must not be used as fallback from OpenAI. Controlled fallback belongs to `MockAIProvider` and PB-P0-011. |
| Selector semantics | If `LLM_PROVIDER=anthropic` is allowed for validation/testing, it must resolve only to the explicit failing stub, not to a functional provider. |
| No product surface | No UI selector, provider comparison, A/B testing, or user-facing Anthropic option is introduced. |

### Assumptions

- US-117 defines the `LLMProvider` contract and typed AI errors before this story is implemented.
- US-118 implements `OpenAIProvider` separately.
- US-119 implements `MockAIProvider` separately.
- Any future functional Anthropic provider requires a new backlog item and, if it changes MVP decisions, PO/ADR review.

### Dependencies

- PB-P0-002: backend foundation and configuration baseline.
- PB-P0-009: `LLMProvider` port and provider adapter package.
- US-117: `LLMProvider` contract.
- ADR-AI-001: use `LLMProvider` abstraction.
- ADR-AI-004: keep `AnthropicProvider` as stub for MVP.

---

## Traceability

| Source                 | Reference                                                            |
| ---------------------- | -------------------------------------------------------------------- |
| Product Backlog Item   | PB-P0-009 - LLMProvider Port + Adapters (OpenAI + Mock + Anthropic Stub) |
| Epic                   | EPIC-AI-001 - LLMProvider & PromptOps                                |
| FRD Requirement(s)     | FR-AI-014, FR-AI-015, FR-AI-016                                      |
| Use Case(s)            | UC-AI-001..009 as future consumers through `LLMProvider`; this story implements provider infrastructure only |
| Business Rule(s)       | BR-AI-005, BR-AI-006, BR-AI-009, BR-AI-015                           |
| Permission Rule(s)     | Backend-only provider execution; no frontend direct provider calls    |
| Data Entity / Entities | None; `AIRecommendation` persistence belongs to PB-P0-010             |
| API Endpoint(s)        | None                                                                 |
| NFR Reference(s)       | NFR-AI, NFR-SEC, NFR-OBS, NFR-TEST                                   |
| Related ADR(s)         | ADR-AI-001, ADR-AI-002, ADR-AI-003, ADR-AI-004, ADR-TEST-003         |
| Related Document(s)    | `management/artifacts/4-Product-Backlog-Prioritized.md`; `management/artifacts/1-EventFlow-Epic-Map.md`; `docs/7-AI-Features-Specification.md`; `docs/8.1-Product-Owner-Decisions-Use-Cases-Addendum.md`; `docs/9-Functional-Requirements-Document.md`; `docs/17-AI-Architecture-and-PromptOps-Design.md`; `docs/22-Architecture-Decision-Records.md` |

---

## Scope Guardrails

### MVP Scope

- Scope Classification: In Scope.
- MVP Relevance: Must Have (P0).
- Delivery Value: demonstrates provider abstraction and future extensibility while avoiding functional Anthropic scope creep.

### In Scope

- Implement `AnthropicProvider` as an Infrastructure adapter class/module that satisfies `LLMProvider`.
- Return or throw the approved typed "not configured / not implemented" provider error for every AI generation method.
- Include safe provider metadata such as `provider = "anthropic"` when error metadata is required by the contract.
- Ensure the stub has no Anthropic SDK import, external HTTP call, or credential dependency.
- Add tests proving contract compliance and explicit failure behavior.
- Add configuration/selector guard behavior only as needed to prove that accidental `LLM_PROVIDER=anthropic` fails clearly.
- Add safe logs for attempted invocation without leaking prompts, payloads, credentials, or personal data.

### Explicitly Out of Scope

- Functional Anthropic API integration.
- Anthropic SDK dependency.
- Anthropic API key configuration or secret management.
- Automatic failover from OpenAI to Anthropic.
- Provider comparison, A/B testing, or multi-provider routing.
- UI selector for AI provider choice.
- Prompt changes specifically for Anthropic.
- Persistence of `AIRecommendation` records.
- New AI endpoints or user-facing AI workflows.
- RAG, vector databases, autonomous agents, or autonomous AI decisions.

### Scope Notes

This story intentionally delivers a non-functional stub. Any implementation that generates real Anthropic output, requires Anthropic credentials, or routes production traffic to Anthropic violates MVP scope and ADR-AI-004.

---

## Acceptance Criteria

### AC-01: Stub implements `LLMProvider`

**Given** the approved `LLMProvider` contract exists  
**When** `AnthropicProvider` is implemented  
**Then** it must compile against the same contract used by `OpenAIProvider` and `MockAIProvider`.

### AC-02: Stub fails explicitly on invocation

**Given** any AI generation method is invoked on `AnthropicProvider`  
**When** the provider handles the call  
**Then** it must fail with the approved typed not-configured or not-implemented AI provider error.

**And** the error must make clear that functional Anthropic is not available in the MVP.

### AC-03: No external Anthropic dependency

**Given** the MVP backend is installed and tested  
**When** the `AnthropicProvider` stub is present  
**Then** it must not require the Anthropic SDK, Anthropic API key, outbound network access, or Anthropic-specific runtime initialization.

### AC-04: Selector/config guard is explicit

**Given** `LLM_PROVIDER=anthropic` is configured in a non-production validation context  
**When** provider resolution or invocation occurs  
**Then** the system must resolve only to the failing stub or fail fast with a clear typed configuration/provider error.

**And** it must not silently fall back to OpenAI, Mock, or a functional Anthropic implementation.

### AC-05: No fallback ownership

**Given** OpenAI fails, times out, or returns invalid output  
**When** fallback behavior is evaluated  
**Then** `AnthropicProvider` must not be used as fallback.

**And** fallback orchestration remains assigned to `MockAIProvider` and PB-P0-011.

### AC-06: Safe observability

**Given** `AnthropicProvider` is resolved or invoked accidentally  
**When** the system logs the event  
**Then** logs must include safe structured metadata such as provider id, error code, and correlation id when available.

**And** logs must exclude secrets, raw prompts, full payloads, tokens, stack traces exposed to clients, and personal data.

### AC-07: Contract tests cover the stub

**Given** automated tests run for provider adapters  
**When** the Anthropic stub tests execute  
**Then** they must verify contract compliance, explicit typed failure, no SDK dependency, and no network call behavior.

### AC-08: Functional Anthropic remains Future

**Given** the MVP scope is evaluated  
**When** this story is reviewed or implemented  
**Then** any real Anthropic API call, provider comparison, failover to Anthropic, or user-facing provider selector must remain out of scope and require a future backlog item.

---

## Edge Cases

### EC-01: `LLM_PROVIDER=anthropic` is configured accidentally

**Given** the backend is configured with `LLM_PROVIDER=anthropic`  
**When** provider resolution or invocation occurs  
**Then** the system must fail clearly with the approved typed provider/configuration error.

#### Handling

- Do not route to OpenAI silently.
- Do not route to Mock silently.
- Do not attempt an Anthropic network call.

### EC-02: Caller catches the typed stub error

**Given** a consuming service invokes the stub and catches the typed error  
**When** error handling runs  
**Then** it must treat the error as provider unavailable/not implemented according to the `LLMProvider` contract.

#### Handling

- Do not expose internal stack traces to API clients.
- Preserve safe error metadata for logs and tests.

### EC-03: Anthropic SDK is introduced accidentally

**Given** a dependency or import for Anthropic SDK is added during implementation  
**When** dependency or lint checks run  
**Then** the check must fail or the change must be rejected during review.

#### Handling

- Keep the stub dependency-free.
- Document that functional SDK integration belongs to a future story.

### EC-04: Product asks for Anthropic failover

**Given** a request attempts to use Anthropic as fallback in MVP  
**When** scope is reviewed  
**Then** it must be rejected as out of scope unless a future PO decision and ADR/backlog update promote it.

#### Handling

- Keep controlled fallback on `MockAIProvider`.
- Reference ADR-AI-004 and FR-AI-015.

---

## Validation Rules

| ID    | Rule                                                             | Message / Behavior                                                   |
| ----- | ---------------------------------------------------------------- | -------------------------------------------------------------------- |
| VR-01 | `AnthropicProvider` must implement `LLMProvider`                  | Build/type checks fail if contract is not satisfied                   |
| VR-02 | Every generation method must fail explicitly                      | Return/throw approved typed not-configured or not-implemented error   |
| VR-03 | No Anthropic SDK dependency is allowed in MVP                     | Dependency/import check or code review rejects it                     |
| VR-04 | No Anthropic credential is required                               | Tests pass without Anthropic API key                                  |
| VR-05 | No outbound network call is allowed                               | Tests fail if stub attempts external communication                    |
| VR-06 | `LLM_PROVIDER=anthropic` must not create functional Anthropic use  | Provider resolution/invocation fails clearly                          |
| VR-07 | Logs must be safe                                                 | No raw prompts, secrets, tokens, payloads, or real PII in logs        |
| VR-08 | No fallback to Anthropic is allowed                               | Fallback tests confirm Anthropic is never selected as fallback target |

---

## Authorization & Security Rules

| ID     | Rule                                                                 |
| ------ | -------------------------------------------------------------------- |
| SEC-01 | `AnthropicProvider` remains backend-only and is never callable directly from frontend. |
| SEC-02 | No Anthropic API key, token, or secret is required for this story.    |
| SEC-03 | Stub logs must exclude raw prompts, payloads, secrets, and personal data. |
| SEC-04 | The stub must not bypass authorization, ownership, rate limit, or AI safety checks owned by upstream use cases. |
| SEC-05 | The stub must not perform external network calls.                    |

### Negative Authorization Scenarios

- Frontend attempts to select or call Anthropic directly -> not supported.
- Backend configured with `LLM_PROVIDER=anthropic` in MVP -> explicit typed failure or fail-fast behavior.
- Anthropic secret missing -> no failure during normal install/test because the stub must not require it.

---

## AI Behavior

### AI Involvement

| Field | Value |
| --- | --- |
| AI Feature | Provider infrastructure only |
| Provider Layer | `AnthropicProvider` stub implementing `LLMProvider` |
| Human Validation Required | Not applicable in this story; downstream AI use cases preserve HITL |
| Persist AIRecommendation | No |
| Fallback Required | No; Anthropic must not be used for MVP fallback |

### AI Input

The stub may receive the same input DTO and `AIContext` shape required by `LLMProvider`, but it must not send that data to any external service.

### AI Output

No real AI output is produced. Invocation returns or throws the approved typed error indicating Anthropic is not implemented/configured for MVP.

### Human-in-the-loop Rules

This story does not create user-facing AI suggestions. HITL remains enforced by downstream use cases and is not altered by the stub.

### AI Error / Fallback Behavior

- Stub invocation produces the approved typed provider error.
- The error is safe for logs and mapped consistently by consuming layers.
- No fallback to Anthropic is allowed.
- No automatic fallback from Anthropic to another provider is introduced in this story.

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
| i18n Notes          | No user-facing provider selector is introduced. |
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

- Use Case / Service: `AnthropicProvider` stub under AI assistance infrastructure.
- Suggested Module: `src/modules/ai-assistance/infrastructure/providers/anthropic/`.
- Contract: Implements `LLMProvider` from US-117.
- Error: Use approved typed provider error such as `AIProviderNotConfiguredError` or `AINotImplementedError`.
- Configuration: May recognize `LLM_PROVIDER=anthropic` only to fail explicitly in MVP.
- Transaction Required: No.

### Database

- Main Tables: None.
- Constraints: None.
- Index Considerations: None.
- Persistence: None.

### API

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| N/A    | N/A      | No API endpoint is introduced by this story. |

### Observability / Audit

- Correlation ID Required: Use existing request context when available.
- Log Event Required: Yes, for accidental provider resolution/invocation.
- AdminAction Required: No.
- AIRecommendation Required: No.
- Logs must be structured and safe.

---

## Test Scenarios

### Functional Tests

| ID    | Scenario                                                        | Type        |
| ----- | --------------------------------------------------------------- | ----------- |
| TS-01 | `AnthropicProvider` satisfies the `LLMProvider` contract         | Unit/Type   |
| TS-02 | Each generation method returns or throws the approved typed error | Unit        |
| TS-03 | `LLM_PROVIDER=anthropic` produces explicit stub/fail-fast behavior | Unit/Config |
| TS-04 | Provider metadata identifies `anthropic` where contract requires metadata | Unit        |

### Negative Tests

| ID    | Scenario                                      | Expected Result                                      |
| ----- | --------------------------------------------- | ---------------------------------------------------- |
| NT-01 | Invocation attempts real Anthropic network use | Test fails                                           |
| NT-02 | Anthropic SDK import/dependency is introduced | Check or review blocks it                            |
| NT-03 | Anthropic API key is absent                    | Stub tests still pass without secret requirement     |
| NT-04 | OpenAI fallback tries to select Anthropic      | Test fails; Anthropic is not a fallback target       |

### AI Tests

| ID       | Scenario                                      | Expected Result                                      |
| -------- | --------------------------------------------- | ---------------------------------------------------- |
| AI-TS-01 | Stub invoked with valid AI input DTO          | Typed not-configured/not-implemented provider error  |
| AI-TS-02 | Stub receives prompt/context payload          | No external call and no prompt/payload leakage       |

### Authorization / Security Tests

| ID         | Scenario                                      | Expected Result                                      |
| ---------- | --------------------------------------------- | ---------------------------------------------------- |
| SEC-TS-01  | Frontend has no Anthropic selector or direct call path | No UI/API surface added                         |
| SEC-TS-02  | Stub invocation is logged                     | Logs contain safe metadata only                      |
| SEC-TS-03  | Anthropic secret is not configured            | Normal stub tests pass without requiring secret      |

### Accessibility Tests

- N/A. This story has no UI surface.

---

## Business Impact

| Field               | Value                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| KPI Affected        | Architecture extensibility, provider substitutability, scope control   |
| Expected Impact     | Demonstrates future provider readiness without increasing MVP risk     |
| Success Criteria    | Stub compiles against `LLMProvider` and fails explicitly in tests      |
| Academic Demo Value | Shows clean architecture and vendor substitution readiness             |

---

## Task Breakdown Readiness

### Potential Frontend Tasks

- None.

### Potential Backend Tasks

- Implement `AnthropicProvider` stub.
- Add typed error behavior for every `LLMProvider` method.
- Add selector/config guard behavior for `LLM_PROVIDER=anthropic` if supported by composition root.
- Add tests for contract compliance, explicit failure, and no external dependency.

### Potential Database Tasks

- None.

### Potential AI / PromptOps Tasks

- None. No Anthropic-specific prompts are introduced.

### Potential QA Tasks

- Validate explicit failure behavior.
- Validate no SDK, no secrets, no network calls.
- Validate Anthropic is not selected for fallback.

### Potential DevOps / Config Tasks

- Document that `LLM_PROVIDER=anthropic` is not a functional MVP mode.
- Ensure CI does not require Anthropic secrets.

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
| Out-of-scope items are explicit                             | Yes    |
| Ready for formal PO/BA approval gate                        | Yes    |
