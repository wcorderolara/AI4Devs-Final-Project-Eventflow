# User Story: US-121 - Implementar prompt registry versionado

## Metadata

| Field              | Value                                |
| ------------------ | ------------------------------------ |
| ID                 | US-121                               |
| Epic               | EPIC-AI-001                          |
| Feature            | Prompt registry + AIPromptVersion    |
| Module / Domain    | AI Assistance / PromptOps            |
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
**I want** a static, versioned `PromptRegistry` synchronized with `AIPromptVersion` metadata  
**So that** every MVP AI generation can resolve a reviewed prompt version and later persist traceable `AIRecommendation` records with reproducible prompt metadata.

---

## Business Context

### Context Summary

EventFlow must keep AI outputs auditable, reproducible, safe, and aligned with human-in-the-loop behavior. ADR-AI-006 defines the approved strategy: prompts live as static versioned code artifacts in `PromptRegistry`, while `AIPromptVersion` provides persistent metadata so generated `AIRecommendation` records can reference the exact prompt version used.

US-121 delivers the PromptOps foundation for resolving prompt templates by feature, language, and version policy. It does not call the LLM, does not create endpoints, and does not persist each generation; runtime persistence of `AIRecommendation` belongs to US-122.

### Related Domain Concepts

- `PromptRegistry`.
- `PromptTemplate`.
- `AIPromptVersion`.
- `AIRecommendationType`.
- `LanguageCode`.
- `AIContext`.
- Prompt lifecycle: `draft`, `reviewed`, `approved`, `active`, `deprecated`, `archived`.
- Prompt hash / checksum.
- Input and output schema references.
- Human-in-the-loop traceability.

### PO/BA Decisions Applied

| Decision | Applied Resolution |
| --- | --- |
| PromptOps strategy | Use ADR-AI-006: static versioned prompts in code + `AIPromptVersion` table/metadata for traceability. |
| Runtime mutability | Prompts are not edited dynamically from DB or admin UI in MVP. Changes require code change and new version when behavior changes. |
| Prompt identity | Each prompt version has a stable ID, feature, version, language support, status, schema references, hash, changelog metadata, and reviewer metadata. |
| Active prompt uniqueness | Runtime must fail fast if more than one active prompt exists for the same `(featureType, languageCode)`. |
| AIRecommendation boundary | US-121 prepares prompt version metadata. US-122 persists each AI call as `AIRecommendation`. |
| AIPromptVersion boundary | US-099 declares the Prisma model/table. US-121 may seed/synchronize approved prompt version metadata but must not redesign the schema. |
| Future AI features | Future/P4 prompts, such as vendor bio/package generation, must not be active or served in MVP unless formally promoted. |
| Security posture | Prompt templates and logs must not contain secrets, tokens, raw personal data samples, or hidden instructions that bypass HITL. |
| Human-in-the-loop | Prompts must include constraints that outputs are suggestions and require user validation before materialization. |

### Assumptions

- PB-P0-001 / US-099 declares `AIPromptVersion` and related schema needed for traceability.
- PB-P0-009 / US-117 defines AI shared types such as `LanguageCode`, `AIContext`, provider metadata, and typed AI errors.
- Feature-specific use cases will consume `PromptRegistry` through application services in later stories.
- Initial MVP prompt content can be minimal but must be versioned, safe, language-aware, and schema-linked.
- If the project has not yet implemented all output schemas, prompt entries must reference stable schema identifiers and fail validation when required schemas are missing.

### Dependencies

- PB-P0-001: database schema foundation.
- PB-P0-009: `LLMProvider` port and adapters.
- US-099: Prisma model declaration for `AIPromptVersion`.
- US-117: shared AI contract and types.
- US-122: `AIRecommendation` persistence, downstream consumer of prompt version metadata.
- ADR-AI-006: version prompts through `PromptRegistry` and `AIPromptVersion`.

---

## Traceability

| Source                 | Reference                                                            |
| ---------------------- | -------------------------------------------------------------------- |
| Product Backlog Item   | PB-P0-010 - Prompt Registry & AIRecommendation Persistence           |
| Epic                   | EPIC-AI-001 - LLMProvider & PromptOps                                |
| FRD Requirement(s)     | FR-AI-016, FR-AI-018                                                 |
| Use Case(s)            | Transversal - no implementa directamente un UC; habilita UC-AI-001..009 |
| Business Rule(s)       | BR-AI-001, BR-AI-007, BR-AI-008, BR-AI-010, BR-AI-011, BR-AI-015     |
| Permission Rule(s)     | Backend-only AI infrastructure; no direct frontend access            |
| Data Entity / Entities | `AIPromptVersion`; downstream `AIRecommendation` in US-122           |
| API Endpoint(s)        | None                                                                 |
| NFR Reference(s)       | NFR-AI, NFR-OBS, NFR-SEC, NFR-REL, NFR-TEST                          |
| Related ADR(s)         | ADR-AI-001, ADR-AI-006, ADR-AI-007, ADR-TEST-003                     |
| Related Document(s)    | `management/artifacts/4-Product-Backlog-Prioritized.md`; `management/artifacts/1-EventFlow-Epic-Map.md`; `docs/4-Business-Rules-Document.md`; `docs/6-Domain-Data-Model.md`; `docs/7-AI-Features-Specification.md`; `docs/9-Functional-Requirements-Document.md`; `docs/14-Backend-Technical-Design.md`; `docs/17-AI-Architecture-and-PromptOps-Design.md`; `docs/18-Database-Physical-Design.md`; `docs/19-Security-and-Authorization-Design.md`; `docs/20-Testing-Strategy.md`; `docs/22-Architecture-Decision-Records.md` |

---

## Scope Guardrails

### MVP Scope

- Scope Classification: In Scope.
- MVP Relevance: Must Have (P0).
- Delivery Value: enables traceable, reproducible, language-aware AI generation and academic evidence without dynamic prompt management.

### In Scope

- Implement a static `PromptRegistry` in code.
- Define a `PromptTemplate` shape with stable prompt ID, feature, version, status, language support, schema references, safe instructions, hash/checksum, and changelog metadata.
- Resolve prompts by `featureType`, `languageCode`, and version policy (`active` or `specific`).
- Enforce one active prompt per `(featureType, languageCode)`.
- Fail fast on missing prompt, duplicated active prompt, unsupported language, missing schema reference, or invalid status transition.
- Provide `AIPromptVersion` metadata required for US-122 to persist `AIRecommendation.prompt_version_id`.
- Seed or synchronize `AIPromptVersion` rows for active MVP prompts if the table exists in the current implementation.
- Include safe PromptOps constraints: JSON-only output instruction, user content boundary, minimization, HITL reminder, and MVP exclusions.
- Add unit/contract tests for prompt resolution, versioning, language support, hash drift, active uniqueness, and safety metadata.

### Explicitly Out of Scope

- Persisting each AI generation as `AIRecommendation`; covered by US-122.
- Calling `LLMProvider`, OpenAI, Mock, Anthropic, or any AI model.
- Implementing timeout, retry, fallback, or output validation runtime; covered by PB-P0-011 and related AI stories.
- Creating REST endpoints or frontend UI.
- Dynamic prompt editing from admin UI or DB.
- A/B testing or multi-armed prompt experiments.
- RAG, vector database, autonomous agents, tool calling, or autonomous decisions.
- Activating P4/Future prompt features such as vendor bio/package generation.
- Storing secrets, tokens, API keys, or real PII inside prompt templates, fixtures, logs, or metadata.

### Scope Notes

This story is PromptOps infrastructure. It must make prompt versions discoverable and reproducible, but it must not execute AI requests or materialize AI outputs into product data.

---

## Acceptance Criteria

### AC-01: Static PromptRegistry resolves active prompts

**Given** approved prompt templates exist in code  
**When** a caller requests a prompt by `featureType`, `languageCode`, and `versionPolicy = "active"`  
**Then** `PromptRegistry` returns exactly one active `PromptTemplate`.

**And** the returned template includes stable ID, version, feature type, status, language support, schema references, hash/checksum, and changelog metadata.

### AC-02: Specific prompt versions are reproducible

**Given** a historical prompt version exists with status `active`, `deprecated`, or `archived`  
**When** a caller requests it by stable prompt ID or specific version  
**Then** `PromptRegistry` can resolve that exact version for audit/replay purposes.

**And** deprecated or archived versions must not be selected by active resolution.

### AC-03: Active uniqueness is enforced

**Given** the registry is initialized at bootstrap or test setup  
**When** two prompt templates are marked `active` for the same `(featureType, languageCode)`  
**Then** initialization must fail fast with a clear configuration error.

### AC-04: Unsupported feature/language/version fails safely

**Given** a caller requests a missing feature, unsupported `languageCode`, or unknown version  
**When** `PromptRegistry` resolves the prompt  
**Then** it must return or throw an approved typed error without falling back silently to another prompt or language.

### AC-05: Prompt templates include required PromptOps metadata

**Given** a prompt template is registered  
**When** registry validation runs  
**Then** it must validate required metadata: stable ID, version, `featureType`, `status`, supported languages, input schema reference, output schema reference, safety constraints, HITL reminder, change reason, reviewer/approval metadata, and template hash.

### AC-06: Prompt safety constraints are explicit

**Given** a prompt template is used for an MVP AI feature  
**When** its static instructions are reviewed  
**Then** it must include JSON-only output guidance, user content boundary, no autonomous decision language, no binding legal/contract/payment claims, no fabricated vendor availability, no unsupported currency conversion, and human validation reminder.

### AC-07: AIPromptVersion metadata is synchronized or exported

**Given** active prompt templates exist in code  
**When** the backend initializes, migration/seed runs, or a sync script/check executes  
**Then** each active MVP prompt version must have matching `AIPromptVersion` metadata or an exported metadata set that US-122 can use to persist `prompt_version_id`.

**And** mismatched IDs, hash drift, missing rows, or duplicate active metadata must fail CI or fail fast according to the selected implementation pattern.

### AC-08: Prompt changes require version discipline

**Given** an existing prompt template changes in behavior, output schema, safety constraints, supported language, or business rules  
**When** tests or registry validation compare the template hash/version metadata  
**Then** the change must require a new prompt version rather than silent mutation of the existing active version.

### AC-09: Future/P4 prompts are not active

**Given** a prompt belongs to a feature outside MVP scope  
**When** registry validation runs  
**Then** that prompt must not be served as `active` for MVP runtime unless a formal PO decision and ADR/backlog update promote the feature.

### AC-10: Tests cover registry behavior and safety

**Given** automated tests run in CI  
**When** the PromptRegistry test suite executes  
**Then** it must verify active resolution, specific version resolution, duplicate active rejection, unsupported language/feature errors, metadata completeness, hash/version drift, AIPromptVersion sync/export, and safety constraints.

---

## Edge Cases

### EC-01: Duplicate active prompt exists

**Given** two prompt templates share the same `(featureType, languageCode)` and status `active`  
**When** registry validation runs  
**Then** the backend must fail fast and prevent ambiguous prompt selection.

#### Handling

- Throw a typed configuration error.
- Log only safe metadata: feature, language, prompt IDs.

### EC-02: Prompt version exists in code but not in AIPromptVersion metadata

**Given** a prompt template exists in code  
**When** sync/export validation runs  
**Then** missing `AIPromptVersion` metadata must fail the check.

#### Handling

- Report the missing prompt ID/version.
- Do not create runtime fallback metadata silently.

### EC-03: AIPromptVersion metadata exists without matching code prompt

**Given** metadata references a prompt version that is not present in the code registry  
**When** validation runs  
**Then** the check must fail or mark the metadata as invalid for runtime use.

#### Handling

- Preserve historical DB rows if they are already referenced by old `AIRecommendation` records.
- Do not serve orphan metadata as an active runtime prompt.

### EC-04: Unsupported language is requested

**Given** a caller requests a supported feature with unsupported `languageCode`  
**When** prompt resolution runs  
**Then** the registry must fail safely instead of silently switching to another locale.

#### Handling

- Return or throw a typed unsupported-language/prompt-not-found error.
- Downstream use cases decide whether to map the error to API response.

### EC-05: Prompt content contains secret-like or PII sample data

**Given** a prompt template includes hardcoded sensitive examples  
**When** safety validation or review runs  
**Then** the prompt must be rejected before activation.

#### Handling

- Remove secrets, tokens, real emails, phone numbers, addresses, or real personal data.
- Use synthetic examples only if examples are required.

---

## Validation Rules

| ID    | Rule                                                             | Message / Behavior                                                   |
| ----- | ---------------------------------------------------------------- | -------------------------------------------------------------------- |
| VR-01 | Prompt ID + version must be stable and unique                    | Registry validation fails                                             |
| VR-02 | Only one active prompt per `(featureType, languageCode)`         | Bootstrap/test fails with configuration error                         |
| VR-03 | Prompt template must include required metadata                   | Registry validation fails                                             |
| VR-04 | Prompt must reference input and output schemas                   | Registry validation fails if schema reference is missing              |
| VR-05 | Unsupported feature/language/version must not fallback silently  | Typed prompt resolution error                                         |
| VR-06 | Behavioral prompt changes require a new version                  | Hash/version drift check fails                                        |
| VR-07 | Active prompt metadata must match `AIPromptVersion` sync/export  | CI or bootstrap validation fails                                      |
| VR-08 | Future/P4 prompts must not be active                             | Registry validation fails                                             |
| VR-09 | Prompt content must not include secrets or real PII              | Security review/test fails                                            |
| VR-10 | Prompts must preserve HITL and JSON-only constraints             | Prompt safety validation fails                                        |

---

## Authorization & Security Rules

| ID     | Rule                                                                 |
| ------ | -------------------------------------------------------------------- |
| SEC-01 | `PromptRegistry` is backend-only infrastructure and has no direct frontend access. |
| SEC-02 | Prompt templates must not contain API keys, tokens, cookies, credentials, or real PII. |
| SEC-03 | Prompt builder/user content boundary must treat user payload as data, not instructions. |
| SEC-04 | Registry logs must never include full prompt content or full user payloads. |
| SEC-05 | Prompt metadata must support audit without exposing sensitive payload data. |
| SEC-06 | Dynamic prompt editing is not allowed in MVP.                         |

### Negative Authorization Scenarios

- Frontend attempts to fetch or mutate prompt templates -> no endpoint exists.
- Admin or user attempts to edit prompts at runtime -> not supported in MVP.
- Registry validation logs prompt content -> rejected; logs must include only safe IDs and metadata.

---

## AI Behavior

### AI Involvement

| Field | Value |
| --- | --- |
| AI Feature | PromptOps infrastructure |
| Provider Layer | No direct provider invocation |
| Human Validation Required | Prompt outputs downstream remain HITL; prompts must remind the model of HITL |
| Persist AIRecommendation | No; covered by US-122 |
| Fallback Required | No; timeout/fallback belongs to PB-P0-011 |

### AI Input

This story does not send AI input to a provider. It defines prompt templates and prompt-building boundaries that downstream use cases will use with minimized user payloads.

### AI Output

No AI output is produced by this story. Prompt templates must reference output schemas so downstream generation can validate JSON output.

### Human-in-the-loop Rules

Prompt templates must explicitly frame AI output as a suggestion requiring human review before any product data is materialized or accepted.

### AI Error / Fallback Behavior

- Missing prompt, unsupported language, duplicate active prompt, schema reference mismatch, or hash drift must fail with controlled errors.
- No fallback prompt selection is allowed inside `PromptRegistry`.
- LLM timeout/fallback to `MockAIProvider` is out of scope for this story.

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
| i18n Notes          | Registry must support approved `LanguageCode` values for prompt resolution. |
| Currency Notes      | Prompt safety constraints must prevent unsupported currency conversion. |

---

## Technical Notes

### Frontend

- Route / Page: N/A.
- Components: N/A.
- State Management: N/A.
- Forms: N/A.
- API Client: N/A.

### Backend

- Suggested Module: `src/modules/ai-assistance/infrastructure/prompt-registry/`.
- Core components: `PromptRegistry`, `PromptTemplate`, `prompt-version-loader`, optional `prompt-builder`, and validation helpers.
- Resolution API should support active and specific version policies.
- Registry validation should run in tests and/or bootstrap.
- Use shared AI types from US-117 where available.
- Do not call `LLMProvider` from this story.

### Database

- Main Tables: `AIPromptVersion` / `ai_prompt_versions`.
- Schema ownership: model/table declaration belongs to US-099.
- US-121 may add seed/sync metadata for prompt versions if the table exists.
- `AIRecommendation` persistence and FK write behavior belongs to US-122.
- Constraints: preserve append-only/versioned intent; do not mutate historical prompt versions silently.

### API

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| N/A    | N/A      | No API endpoint is introduced by this story. |

### Observability / Audit

- Correlation ID Required: Not for registry definition; use when called inside request context.
- Log Event Required: Yes for registry validation failures using safe metadata only.
- AdminAction Required: No.
- AIRecommendation Required: No for this story.
- Audit metadata must support later reconstruction of prompt version used by `AIRecommendation`.

---

## Test Scenarios

### Functional Tests

| ID    | Scenario                                                        | Type        |
| ----- | --------------------------------------------------------------- | ----------- |
| TS-01 | Resolve active prompt by feature and language                   | Unit        |
| TS-02 | Resolve specific historical prompt version                      | Unit        |
| TS-03 | Validate required prompt metadata                               | Unit        |
| TS-04 | Validate one active prompt per `(featureType, languageCode)`    | Unit        |
| TS-05 | Export or sync `AIPromptVersion` metadata for active prompts    | Unit/Integration |
| TS-06 | Validate schema references exist for registered prompts         | Unit        |

### Negative Tests

| ID    | Scenario                                      | Expected Result                                      |
| ----- | --------------------------------------------- | ---------------------------------------------------- |
| NT-01 | Duplicate active prompts                       | Registry validation fails                            |
| NT-02 | Missing prompt for feature/language            | Typed prompt resolution error                        |
| NT-03 | Unsupported language                           | Typed unsupported-language or prompt-not-found error |
| NT-04 | Prompt content changes without new version     | Hash/version drift check fails                       |
| NT-05 | Prompt metadata missing schema reference       | Registry validation fails                            |
| NT-06 | Future/P4 prompt marked active                 | Registry validation fails                            |

### AI Tests

| ID       | Scenario                                      | Expected Result                                      |
| -------- | --------------------------------------------- | ---------------------------------------------------- |
| AI-TS-01 | Prompt contains HITL and JSON-only constraints | Safety validation passes                             |
| AI-TS-02 | Prompt includes user content boundary          | Prompt template passes safety review                 |
| AI-TS-03 | Prompt includes forbidden autonomous language  | Safety validation or review fails                    |

### Authorization / Security Tests

| ID         | Scenario                                      | Expected Result                                      |
| ---------- | --------------------------------------------- | ---------------------------------------------------- |
| SEC-TS-01  | Prompt contains secret-like value             | Test/review fails                                    |
| SEC-TS-02  | Registry logs validation error                | Logs include safe metadata only                      |
| SEC-TS-03  | Runtime prompt mutation is attempted          | Not supported; no mutation API exists                |

### Accessibility Tests

- N/A. This story has no UI surface.

### Seed / Demo Tests

| ID       | Scenario                                      | Expected Result                                      |
| -------- | --------------------------------------------- | ---------------------------------------------------- |
| SEED-TS-01 | Active MVP prompt metadata can be seeded/synced | `AIPromptVersion` metadata matches registry IDs/hashes |
| SEED-TS-02 | Demo prompt versions are reproducible        | Registry resolves deterministic prompt version IDs   |

---

## Business Impact

| Field               | Value                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| KPI Affected        | AI traceability, reproducibility, QA reliability, academic evidence    |
| Expected Impact     | Enables every AI feature to reference an exact reviewed prompt version |
| Success Criteria    | Registry resolves prompts deterministically and prompt metadata is syncable with `AIPromptVersion` |
| Academic Demo Value | Demonstrates disciplined PromptOps and reproducible AI evidence        |

---

## Task Breakdown Readiness

### Potential Frontend Tasks

- None.

### Potential Backend Tasks

- Implement `PromptTemplate` type and static prompt files.
- Implement `PromptRegistry` active/specific version resolution.
- Implement registry validation for metadata, active uniqueness, language support, and schema references.
- Implement prompt hash/checksum generation or verification.
- Implement `AIPromptVersion` metadata export/sync if the table is available.
- Add safe registry validation logging.

### Potential Database Tasks

- Seed/sync `AIPromptVersion` rows for active MVP prompt versions if not already covered by seed workflow.
- Do not redesign the Prisma schema in this story.

### Potential AI / PromptOps Tasks

- Define initial MVP prompt templates with safe instructions, HITL reminder, JSON-only output rule, schema references, language support, and changelog metadata.
- Ensure Future/P4 prompt templates are not active.

### Potential QA Tasks

- Unit tests for resolution, validation, duplicate active detection, unsupported language, hash drift, and metadata sync/export.
- Security tests/reviews for secrets, PII, prompt leakage, and safe logs.

### Potential DevOps / Config Tasks

- Add CI check for registry validation and prompt hash/version drift.
- Ensure registry validation does not require provider secrets or network access.

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

- [ ] `PromptRegistry` resolves active and specific prompt versions deterministically.
- [ ] Prompt templates include required PromptOps metadata and safety constraints.
- [ ] Registry validation rejects duplicate active prompts and invalid metadata.
- [ ] Active prompt metadata is exportable/syncable with `AIPromptVersion`.
- [ ] Tests cover resolution, versioning, language support, hash drift, metadata sync/export, and safe logging.
- [ ] No LLM provider call, API endpoint, frontend UI, or `AIRecommendation` persistence is implemented in this story.
- [ ] Future/P4 prompt features are not active in MVP runtime.

---

## Refinement Notes

- Refinement completed on 2026-06-17 using `eventflow-user-story-refinement`.
- No blocking PO/BA decisions remain.
- Documentation Alignment Required: older docs describe `AIPromptVersion` as optional/recommended in places, while ADR-AI-006 and prior PO/BA decisions formalize the MVP hybrid strategy. This does not block the story because the decision is accepted and does not create scope creep.
- Recommended next skill: `eventflow-user-story-approval`.
