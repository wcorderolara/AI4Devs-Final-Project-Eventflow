Use the `$eventflow-user-story-approval` skill.

Perform the formal Product Owner / Business Analyst approval gate for the refined EventFlow User Story located at:

```text
$ARGUMENTS
```

## Objectives

1. Validate whether the User Story satisfies the Definition of Ready.
2. Confirm that the User Story is aligned with:

   * Product Backlog Prioritized
   * Epic Map
   * MVP Scope
   * Functional Requirements Document
   * Use Cases
   * Business Rules
   * Non-Functional Requirements
   * Security and Authorization Design
   * Testing Strategy
   * Architecture Decision Records
3. Confirm that the Acceptance Criteria are clear, testable, unambiguous, and complete enough to generate Development Tasks.
4. Confirm that the following elements are explicitly documented and sufficiently clear:

   * Dependencies
   * Assumptions
   * Out-of-scope items
   * Security expectations
   * AI expectations
   * QA and testing expectations
5. Select exactly one final approval status:

   * Approved
   * Approved with Minor Notes
   * Needs Changes
   * Blocked
   * Split Required
6. Do not generate Development Tasks.
7. Do not generate a Technical Specification.
8. Do not rewrite the complete User Story.
9. Only update the User Story file when the approval skill requires updating approval-related metadata or status.
10. Do not invent missing decisions, requirements, dependencies, acceptance criteria, or technical details.

## Input validation

Before performing the approval:

* Confirm that `$ARGUMENTS` is not empty.
* Confirm that it resolves to an existing Markdown file.
* Confirm that the file represents a refined EventFlow User Story.
* Resolve relative paths from the repository root.
* If the path is invalid or the file does not exist, stop and report the error without performing the approval.

## Output

Return the result in neutral Spanish LATAM using the exact output format defined by the `eventflow-user-story-approval` skill.
