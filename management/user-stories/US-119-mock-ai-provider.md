# User Story: US-119 - Implementar MockAIProvider determinista

## Metadata

| Field              | Value                                |
| ------------------ | ------------------------------------ |
| ID                 | US-119                               |
| Epic               | EPIC-AI-001                          |
| Feature            | MockAIProvider determinista          |
| Module / Domain    | AI Assistance / Platform / QA        |
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
**I want** to implement `MockAIProvider` as a deterministic adapter that satisfies the `LLMProvider` contract  
**So that** CI, local development, demo mode, and controlled fallback scenarios can generate stable AI outputs without depending on external LLM services or secrets.

---

## Business Context

### Context Summary

EventFlow requires a deterministic AI provider for MVP-quality delivery gates, academic demo repeatability, and CI execution without OpenAI credentials. `MockAIProvider` is the mandatory non-network provider in PB-P0-009 and supports the adapter architecture defined by `LLMProvider`.

The provider must return schema-compatible AI outputs using stable fixture selection based on feature, language, prompt version, and deterministic scenario seed. It must not make external network calls, use real provider secrets, persist AI recommendations, or own fallback orchestration.

### Related Domain Concepts

* AI assistance provider abstraction.
* Deterministic seed and demo data.
* CI-safe AI testing.
* PromptOps fixture governance.
* Backend-only AI execution.

### PO/BA Decisions Applied

* `MockAIProvider` is required for CI, local development, and demo mode.
* `MockAIProvider` must implement the same `LLMProvider` contract used by real provider adapters.
* Fixture lookup must be deterministic by `feature`, `language_code`, `prompt_version_id`, and `scenario_seed`; when relevant, it may also consider `event_type_code` or `vendor_profile_id`.
* `MockAIProvider` must not require OpenAI, Anthropic, or any other real provider credential.
* Direct `MockAIProvider` calls return `provider = "mock"` and must not imply that fallback orchestration occurred. Fallback ownership belongs to PB-P0-011.
* Persistence of `AIRecommendation` records belongs to PB-P0-010 and is out of scope for this story.
* Real provider selector behavior outside `LLM_PROVIDER=mock` compatibility remains limited to PB-P0-009 adapter composition and must not introduce advanced retry or fallback logic.

### Assumptions

* US-117 defines the `LLMProvider` contract before this story is implemented.
* US-118 and US-120 deliver the real/stub adapters separately.
* Test and CI environments can configure `LLM_PROVIDER=mock`.
* Fixture content uses fictitious seed/demo data only and does not include real personal data.

### Dependencies

* PB-P0-002: backend foundation and configuration baseline.
* US-117: `LLMProvider` port and shared AI result contract.
* PB-P0-009: provider adapter package context.
* ADR-AI-003: mock provider and controlled fallback policy.

---

## Traceability

| Source                 | Reference                                                                 |
| ---------------------- | ------------------------------------------------------------------------- |
| Product Backlog        | PB-P0-009 - LLMProvider Port + Adapters (OpenAI + Mock + Anthropic Stub) |
| Epic                   | EPIC-AI-001 - AI Assistance Foundation                                    |
| FRD Requirement(s)     | FR-AI-014, FR-AI-017                                                       |
| Use Case(s)            | UC-AI-001 through UC-AI-009 as future consumers of the provider layer      |
| Business Rule(s)       | BR-AI-005, BR-AI-006, BR-AI-009, BR-AI-015                                |
| Permission Rule(s)     | Backend-only provider execution; no frontend direct provider calls         |
| Data Entity / Entities | None for this story; `AIRecommendation` belongs to PB-P0-010              |
| API Endpoint(s)        | None                                                                      |
| NFR Reference(s)       | NFR-AI, NFR-TEST, NFR-DEMO, NFR-OBS, NFR-SEC                              |
| Related ADR(s)         | ADR-AI-001, ADR-AI-003, ADR-TEST-003                                      |
| Related Document(s)    | /docs/7, /docs/11, /docs/17, /docs/20, /docs/22                           |

---

## Scope Guardrails

### MVP Scope

* Scope Classification: In Scope.
* MVP Relevance: Must Have (P0).
* The story provides deterministic AI provider infrastructure required for CI, demos, and downstream AI use cases.

### In Scope

* Implement `MockAIProvider` as an adapter that satisfies `LLMProvider`.
* Provide fixture lookup for approved MVP AI features using deterministic keys.
* Support deterministic fixture selection by `feature`, `language_code`, `prompt_version_id`, and `scenario_seed`.
* Include optional match dimensions such as `event_type_code` or `vendor_profile_id` where the AI feature requires them.
* Return schema-compatible `AIResult` payloads with `provider = "mock"`.
* Provide generic stable output when no exact fixture exists, while logging a safe warning.
* Ensure tests and CI can run without external LLM credentials or network calls.
* Add unit tests proving deterministic behavior and schema compatibility.

### Explicitly Out of Scope

* `OpenAIProvider` implementation from US-118.
* `AnthropicProvider` stub implementation from US-120.
* Prompt registry, prompt version lifecycle, and persisted `AIRecommendation` records from PB-P0-010.
* Advanced timeout, retry, and fallback orchestration from PB-P0-011.
* RAG, vector databases, autonomous AI decisions, or AI actions without human review.
* New API endpoints, frontend screens, or user-facing AI workflows.
* Real provider credentials, network integrations, or production defaulting to mock outside approved test/demo/fallback configuration.

### Scope Notes

`MockAIProvider` is a deterministic provider adapter, not a full AI workflow. It enables downstream use cases to test and demo AI behavior safely, but it does not decide when AI is invoked, persist outputs, or replace human review requirements.

---

## Acceptance Criteria

### AC-01: `MockAIProvider` implements `LLMProvider`

**Given** the `LLMProvider` contract exists  
**When** `MockAIProvider` is implemented  
**Then** it must satisfy the same method signatures, input DTO expectations, and `AIResult` output shape used by the provider layer.

### AC-02: Deterministic fixture selection

**Given** the same feature, language, prompt version, scenario seed, and applicable domain matcher values  
**When** `MockAIProvider` is invoked multiple times  
**Then** it must return the same schema-compatible output without random, time-based, or network-dependent variation.

### AC-03: Fixture key dimensions are explicit

**Given** fixture data exists for an MVP AI feature  
**When** the provider resolves a fixture  
**Then** lookup must consider `feature`, `language_code`, `prompt_version_id`, and `scenario_seed`; it may also consider `event_type_code` or `vendor_profile_id` when the feature requires those dimensions.

### AC-04: Supported language behavior is stable

**Given** an approved EventFlow language code is provided  
**When** a matching fixture exists  
**Then** the provider must return the fixture for that language.

**And given** no exact language-specific fixture exists  
**When** the provider resolves a generic response  
**Then** it must return a stable schema-compatible output in a safe fallback language strategy defined by the implementation.

### AC-05: Missing fixture does not break demo or CI

**Given** no exact fixture exists for a valid provider request  
**When** `MockAIProvider` is invoked  
**Then** it must return a generic deterministic output that satisfies the expected schema.

**And** it must log a safe warning that excludes secrets, raw prompts, and personal data.

### AC-06: No external provider dependency

**Given** CI or local development runs without OpenAI or Anthropic credentials  
**When** tests or smoke checks use `LLM_PROVIDER=mock`  
**Then** the provider must complete without external network calls or real provider secrets.

### AC-07: Schema compatibility is verified

**Given** fixtures and generic outputs are maintained for `MockAIProvider`  
**When** automated tests validate provider responses  
**Then** every returned output must pass the same schema or DTO validation expected from real provider responses.

### AC-08: Fallback ownership remains separate

**Given** `MockAIProvider` is called directly through mock configuration  
**When** it returns an `AIResult`  
**Then** it must identify `provider = "mock"` and must not claim advanced fallback orchestration behavior owned by PB-P0-011.

---

## Edge Cases

### EC-01: Fixture key is valid but no exact fixture exists

**Given** a valid feature request has no exact fixture match  
**When** the provider performs lookup  
**Then** it returns a generic deterministic output and logs a safe warning.

#### Handling

* Do not throw only because an exact fixture is missing.
* Preserve schema compatibility.
* Include enough structured metadata in logs for debugging without exposing prompts, secrets, or personal data.

### EC-02: Fixture exists but violates expected schema

**Given** a fixture payload is invalid  
**When** automated tests validate fixtures  
**Then** the test suite must fail before the fixture can be treated as delivery-ready.

#### Handling

* Validate fixtures through the same schema or DTO validation used for provider outputs.
* Report the fixture identifier and feature, not sensitive prompt content.

### EC-03: Unsupported feature identifier is provided

**Given** an unsupported feature identifier reaches the mock provider  
**When** the provider validates input  
**Then** it must return or throw a typed provider error according to the `LLMProvider` contract.

#### Handling

* Avoid silent success for unsupported feature identifiers.
* Do not make network calls as a fallback.

### EC-04: Unsupported language code is provided

**Given** an unsupported language code bypasses upstream validation  
**When** the provider validates input  
**Then** it must reject the request with a typed validation/provider error.

#### Handling

* Keep approved language handling explicit.
* Do not infer unsupported locales implicitly.

---

## Validation Rules

| ID    | Rule                                                                 | Message / Behavior                                                       |
| ----- | -------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| VR-01 | Provider must satisfy `LLMProvider` contract                          | Build or type checks fail when contract is not satisfied                  |
| VR-02 | Fixture lookup keys must be deterministic                             | Same valid input must produce deep-equal output across runs               |
| VR-03 | Output must validate against expected provider response schema         | Invalid fixture or generated generic output fails tests                   |
| VR-04 | Mock execution must not require provider secrets                       | CI and local mock tests run without OpenAI or Anthropic credentials       |
| VR-05 | Mock execution must not perform external network calls                 | Tests fail if mock provider attempts outbound provider communication      |
| VR-06 | Logs must not include raw prompts, secrets, tokens, or real PII        | Log only safe structured metadata                                         |
| VR-07 | Direct mock execution must not own advanced fallback orchestration      | Fallback behavior remains assigned to PB-P0-011                           |

---

## Authorization & Security Rules

| ID     | Rule                                                                 |
| ------ | -------------------------------------------------------------------- |
| SEC-01 | `MockAIProvider` is backend-only and must not be callable directly from the frontend. |
| SEC-02 | Mock fixtures must use fictitious seed/demo data only.               |
| SEC-03 | No OpenAI, Anthropic, or other LLM provider secret is required.       |
| SEC-04 | Logs must exclude secrets, raw prompts, provider keys, and real personal data. |
| SEC-05 | Mock behavior must not bypass authorization checks owned by upstream use cases. |

### Negative Authorization Scenarios

* Frontend attempts to call an AI provider directly -> not supported by architecture.
* Mock fixture contains real personal data -> fixture must be rejected during review/testing.
* Missing real provider secret in CI -> must not fail when `LLM_PROVIDER=mock`.

---

## AI Behavior

### AI Involvement

* AI Feature: Yes, deterministic AI provider adapter.
* Provider Layer: `MockAIProvider` implementing `LLMProvider`.
* Human Validation Required: Not enforced by this adapter; downstream AI use cases keep human-in-the-loop rules.
* Persist AIRecommendation: No, out of scope for this story.
* Fallback Required: No advanced fallback orchestration in this story.

### AI Input

* Feature identifier.
* Approved language code.
* Prompt version identifier.
* Deterministic scenario seed.
* Feature-specific context required by the `LLMProvider` contract.

### AI Output

* Deterministic schema-compatible `AIResult`.
* `provider = "mock"`.
* Stable fixture or generic deterministic response.
* Safe metadata suitable for observability and testing.

### Human-in-the-loop Rules

* `MockAIProvider` does not make autonomous business decisions.
* Any downstream AI recommendation remains advisory and subject to the human review rules of the consuming use case.

### AI Error / Fallback Behavior

* Invalid inputs or unsupported feature identifiers must follow the typed error behavior defined by `LLMProvider`.
* Missing exact fixtures must return generic deterministic output rather than breaking demo or CI.
* Production fallback orchestration and fallback attribution belong to PB-P0-011.

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
| i18n Notes          | Provider must support approved language codes in deterministic outputs. |
| Currency Notes      | N/A                                    |

---

## Technical Notes

### Frontend

* Route / Page: N/A.
* Components: N/A.
* State Management: N/A.
* Forms: N/A.
* API Client: N/A.

### Backend

* Use Case / Service: `MockAIProvider` adapter under AI assistance infrastructure.
* Suggested Module: `src/modules/ai-assistance/infrastructure/providers/mock/`.
* Contract: Implements `LLMProvider` from US-117.
* Configuration: Compatible with `LLM_PROVIDER=mock` in local/test/CI/demo contexts.
* Validation: Use the same response schemas or DTO validation expected by provider consumers.
* Transaction Required: No.

### Database

* Main Tables: None.
* Constraints: None.
* Index Considerations: None.
* Persistence: None for this story.

### API

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| N/A    | N/A      | No API endpoint is introduced by this story. |

### Fixtures / PromptOps

* Fixture data must be deterministic and reviewable.
* Fixture selection must be stable for the same input context.
* Generic fallback outputs must be schema-compatible and safe for demo/CI.
* Fixture content must avoid real personal data and real vendor/customer identifiers.

### Observability / Audit

* Correlation ID Required: Use existing request context when available.
* Log Event Required: Yes, for missing fixture warning and provider execution summary.
* AdminAction Required: No.
* AIRecommendation Required: No.
* Logs must be structured and safe.

---

## Test Scenarios

### Functional Tests

| ID    | Scenario                                                           | Type        |
| ----- | ------------------------------------------------------------------ | ----------- |
| TS-01 | `MockAIProvider` satisfies the `LLMProvider` contract               | Unit        |
| TS-02 | Same valid input returns deep-equal output across repeated calls    | Unit        |
| TS-03 | Exact fixture match returns expected fixture output                 | Unit        |
| TS-04 | Missing exact fixture returns generic deterministic output          | Unit        |
| TS-05 | Approved language-specific fixture is selected when available       | Unit        |
| TS-06 | Returned payload validates against expected provider response schema | Unit        |

### Negative Tests

| ID    | Scenario                                      | Expected Result                                      |
| ----- | --------------------------------------------- | ---------------------------------------------------- |
| NT-01 | Unsupported feature identifier is provided    | Typed provider or validation error                   |
| NT-02 | Unsupported language code is provided         | Typed provider or validation error                   |
| NT-03 | Fixture payload violates expected schema      | Test failure with fixture identifier                 |
| NT-04 | CI runs without real provider credentials     | Mock provider tests pass without secret requirement  |

### AI Tests

| ID       | Scenario                                               | Expected Result                                      |
| -------- | ------------------------------------------------------ | ---------------------------------------------------- |
| AI-TS-01 | Deterministic fixture output across multiple runs      | Deep-equal `AIResult` output                         |
| AI-TS-02 | Generic deterministic output for valid missing fixture | Stable schema-compatible `AIResult` output           |
| AI-TS-03 | Direct mock execution reports provider identity        | `provider = "mock"` and no advanced fallback claim   |

### Authorization / Security Tests

| ID         | Scenario                                            | Expected Result                                      |
| ---------- | --------------------------------------------------- | ---------------------------------------------------- |
| SEC-TS-01  | Mock provider runs without OpenAI/Anthropic secrets | Success                                              |
| SEC-TS-02  | Missing fixture warning is logged                   | No raw prompt, secret, token, or real PII in logs    |
| SEC-TS-03  | Mock provider execution attempts outbound call      | Test fails or call is blocked by test guard          |

### Accessibility Tests

* N/A. This story has no UI surface.

---

## Business Impact

| Field               | Value                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| KPI Affected        | CI reliability, demo repeatability, AI delivery readiness              |
| Expected Impact     | Enables deterministic AI tests and demo execution without LLM secrets  |
| Success Criteria    | Mock provider tests pass consistently in local and CI environments     |
| Academic Demo Value | Supports repeatable, auditable AI behavior during MVP evaluation       |

---

## Task Breakdown Readiness

### Potential Frontend Tasks

* None.

### Potential Backend Tasks

* Implement `MockAIProvider` adapter.
* Add deterministic fixture registry and lookup logic.
* Add generic schema-compatible deterministic output behavior.
* Wire mock provider compatibility with `LLM_PROVIDER=mock`.

### Potential Database Tasks

* None.

### Potential AI / PromptOps Tasks

* Create deterministic fixture files for baseline MVP AI feature scenarios.
* Validate fixture payloads against provider response schemas.
* Document fixture key dimensions and safe fixture data rules.

### Potential QA Tasks

* Add unit tests for determinism, schema compatibility, missing fixture behavior, and no-secret CI execution.
* Add security/logging tests for safe warnings and no outbound provider calls.

### Potential DevOps / Config Tasks

* Ensure local/test/CI environments can set `LLM_PROVIDER=mock`.
* Ensure CI does not require real LLM provider credentials for mock provider tests.

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
