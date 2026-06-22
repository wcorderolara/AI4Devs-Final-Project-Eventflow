Use the `$eventflow-user-story-technical-spec` skill.

Generate the Technical Specification for the EventFlow User Story located at:

```text
$ARGUMENTS
```

## Input

`$ARGUMENTS` must contain the path to exactly one EventFlow User Story Markdown file.

The path may be:

* Relative to the repository root.
* Absolute.

Prefer repository-relative paths for portability.

## Objectives

1. Read the complete User Story provided in `$ARGUMENTS`.
2. Confirm that the User Story is sufficiently refined and approved for technical specification.
3. Generate an implementation-ready Technical Specification by following the exact workflow, rules, template, output format, and file-writing behavior defined by the `eventflow-user-story-technical-spec` skill.
4. Preserve the User Story scope, intent, identifiers, traceability, dependencies, constraints, and Acceptance Criteria.
5. Translate the functional expectations into an actionable technical design without introducing unsupported product requirements.
6. Align the Technical Specification with the relevant EventFlow documentation, including only the sources applicable to the User Story:

   * Product Backlog Prioritized
   * Epic Map
   * MVP Scope Definition
   * Functional Requirements Document
   * Use Cases Specification
   * Business Rules Document
   * User Roles and Permissions Matrix
   * Domain Data Model
   * Non-Functional Requirements
   * Architecture Vision and Principles
   * System Architecture Document
   * Backend Technical Design
   * Frontend Architecture Design
   * API Design Specification
   * AI Architecture and PromptOps Design
   * Database Physical Design
   * Security and Authorization Design
   * Testing Strategy
   * Deployment and DevOps Design
   * Architecture Decision Records
7. Define technical decisions only when they are supported by the approved documentation or explicitly delegated to implementation by the User Story.
8. Do not invent entities, endpoints, database structures, UI flows, dependencies, infrastructure, security rules, or product decisions.
9. Do not generate Development Tasks.
10. Do not modify the original User Story unless the skill explicitly requires a metadata or traceability update.
11. Do not perform the formal Product Owner / Business Analyst approval gate.
12. Return the result in neutral Spanish LATAM using the exact output format defined by the skill.

## Input validation

Before generating the Technical Specification:

1. Confirm that `$ARGUMENTS` is not empty.
2. Resolve relative paths from the repository root.
3. Confirm that the resolved path exists.
4. Confirm that it is a Markdown file.
5. Confirm that it represents an EventFlow User Story.
6. Confirm that the User Story contains a valid User Story identifier.
7. Confirm that the User Story has reached the status required by the skill to generate a Technical Specification.
8. Confirm that no unresolved blocking decisions remain.

If the input is missing, invalid, inaccessible, inconsistent, not sufficiently refined, not approved when approval is required, or still contains unresolved blockers:

* Stop immediately.
* Do not create or modify any file.
* Clearly report the validation problem.
* Identify the workflow step that must be completed first.
* Show the expected command usage.

## Technical Specification rules

* Use the User Story as the primary scope boundary.
* Use the Acceptance Criteria as the basis for implementation and testing coverage.
* Apply targeted technical analysis; do not redesign unrelated areas of EventFlow.
* Reuse established EventFlow architecture, patterns, naming, modules, contracts, and stack.
* Explicitly identify affected components when supported by the sources:

  * Frontend
  * Backend
  * API
  * Database
  * AI and PromptOps
  * Security and authorization
  * Observability
  * Testing
  * Deployment or configuration
* Clearly distinguish:

  * Existing components to reuse
  * Components to modify
  * New components required by the User Story
  * Areas with no expected impact
* Include relevant positive, negative, boundary, authorization, accessibility, i18n, failure, and regression considerations.
* Do not convert optional recommendations into mandatory requirements.
* Do not silently resolve contradictions between the User Story and authoritative documentation.
* When a contradiction or missing decision blocks the specification, stop and report it according to the skill.
* Generate and save the Technical Specification in the location and filename determined by the skill.
