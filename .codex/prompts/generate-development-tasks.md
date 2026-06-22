Use the `$eventflow-user-story-to-development-tasks` skill.

Generate the Development Tasks from the EventFlow Technical Specification located at:

```text
$ARGUMENTS
```

## Input

`$ARGUMENTS` must contain the path to exactly one EventFlow Technical Specification Markdown file.

The path may be:

* Relative to the repository root.
* Absolute.

Prefer repository-relative paths for portability.

## Objectives

1. Read the complete Technical Specification provided in `$ARGUMENTS`.
2. Identify the associated EventFlow User Story and validate its traceability.
3. Confirm that the Technical Specification is complete enough to derive implementation tasks.
4. Generate the Development Tasks by following the exact workflow, sequencing rules, naming conventions, output format, and file-writing behavior defined by the `eventflow-user-story-to-development-tasks` skill.
5. Preserve the scope, intent, identifiers, dependencies, constraints, Acceptance Criteria, and approved technical decisions from the User Story and Technical Specification.
6. Align task generation with the authoritative execution order defined in the Product Backlog Prioritized.
7. Generate actionable, atomic, testable, and implementation-ready tasks.
8. Include only work required by the Technical Specification and its associated User Story.
9. Do not invent product requirements, architectural decisions, entities, endpoints, UI flows, dependencies, or infrastructure.
10. Do not modify the original User Story or Technical Specification unless the skill explicitly requires a traceability or metadata update.
11. Do not regenerate or rewrite the Technical Specification.
12. Do not perform refinement or approval.
13. Return the result in neutral Spanish LATAM using the exact output format defined by the skill.

## Required alignment sources

Use only the EventFlow sources relevant to the Technical Specification, including:

* Associated User Story
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

The Technical Specification remains the primary technical source for task generation.

## Input validation

Before generating tasks:

1. Confirm that `$ARGUMENTS` is not empty.
2. Resolve relative paths from the repository root.
3. Confirm that the resolved path exists.
4. Confirm that it is a Markdown file.
5. Confirm that it represents an EventFlow Technical Specification.
6. Confirm that it references exactly one valid EventFlow User Story.
7. Confirm that the associated User Story exists.
8. Confirm that the Technical Specification contains no unresolved blockers or pending technical decisions.
9. Confirm that the associated User Story has reached the status required by the skill.
10. Confirm that the User Story exists in the Product Backlog Prioritized and determine its execution position.

If any validation fails:

* Stop immediately.
* Do not create or modify any file.
* Report the validation problem clearly.
* Identify the workflow step that must be completed first.
* Show the expected command usage.

## Task generation rules

* Use the Technical Specification as the main implementation contract.
* Use the associated User Story and Acceptance Criteria as the scope boundary.
* Preserve the execution order defined by the Product Backlog Prioritized.
* Follow the task numbering strategy defined by the skill.
* Do not derive task order from the numeric User Story ID alone.
* Create tasks in dependency-aware implementation order.
* Each task must have one clear technical outcome.
* Each task must be independently understandable and verifiable.
* Avoid tasks that are too broad, such as:

  * “Implement frontend”
  * “Create backend”
  * “Add tests”
* Split work by meaningful technical responsibility when required:

  * Configuration and dependencies
  * Shared foundations
  * Database or Prisma
  * Backend domain and application
  * API and validation
  * Frontend integration and UI
  * AI or PromptOps
  * Security and authorization
  * Observability
  * Automated testing
  * Seed, migration, or deployment configuration
  * Documentation updates required by the implementation
* Include testing work alongside the component or behavior it validates when the skill requires it.
* Include explicit negative, boundary, authorization, accessibility, i18n, failure, and regression coverage when applicable.
* Do not create tasks for areas explicitly marked as having no impact in the Technical Specification.
* Do not transform optional recommendations into mandatory tasks.
* Do not introduce generic cleanup or refactoring unless required by the Technical Specification.
* Do not generate subtasks outside the format supported by the skill.
* Generate and save the task file in the location and filename determined by the skill.

## Output expectations

The result must clearly report:

* Associated User Story.
* Source Technical Specification.
* Product Backlog execution position.
* Number of tasks generated.
* Task ID range assigned.
* Output file created or updated.
* Any warnings or non-blocking notes.
