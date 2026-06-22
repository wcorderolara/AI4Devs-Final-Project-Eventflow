Use the `eventflow-user-story-refinement` skill.

Review and refine the EventFlow User Story located at:

```text
$ARGUMENTS
```

## Objectives

1. Read the complete User Story.
2. Validate it as Product Owner and Business Analyst.
3. Verify its alignment with the relevant EventFlow documentation, including:

   * Product Backlog Prioritized
   * Epic Map
   * MVP Scope Definition
   * Functional Requirements Document
   * Use Cases Specification
   * Business Rules Document
   * User Roles and Permissions Matrix
   * Domain Data Model
   * Non-Functional Requirements
   * Security and Authorization Design
   * Testing Strategy
   * Architecture Decision Records
   * Relevant technical design documents
4. Detect:

   * Missing or ambiguous requirements
   * Contradictions
   * Scope creep
   * Unclear dependencies
   * Untestable Acceptance Criteria
   * Missing security, authorization, AI, data, accessibility, i18n, observability, or QA expectations
   * Technical assumptions presented as approved decisions
5. Improve the User Story without inventing requirements or Product Owner decisions.
6. Preserve the original intent, scope, identifiers, and traceability.
7. Do not generate Development Tasks.
8. Do not generate a Technical Specification.
9. Do not approve the User Story.
10. Follow the exact workflow, decision rules, file update behavior, and output format defined by the `eventflow-user-story-refinement` skill.

## Input validation

Before starting:

* Confirm that `$ARGUMENTS` is not empty.
* Resolve relative paths from the repository root.
* Confirm that the resolved path exists.
* Confirm that it is a Markdown file.
* Confirm that the file represents an EventFlow User Story.
* If the input is invalid, stop and return a clear error without modifying any file.

## Refinement behavior

* If no blocking questions remain, update the User Story file in place according to the skill instructions.
* If blocking questions or unresolved Product Owner decisions remain:

  * Do not update the User Story file.
  * Return the blocking questions using the exact skill output format.
* Do not silently infer or fabricate missing decisions.
* Make targeted changes only; do not rewrite unrelated sections.
* Return the result in neutral Spanish LATAM.
