Use the `eventflow-po-ba-decision-resolver` skill.

Resolve the pending Product Owner / Business Analyst decisions for the EventFlow User Story located at:

```text
$1
```

Use the refinement review and blocking-decisions document located at:

```text
$2
```

## Arguments

* `$1`: Path to the EventFlow User Story that could not be completed because blocking decisions remained.
* `$2`: Path to the refinement review document containing the blocking questions, findings, conflicts, or pending decisions.

## Objectives

1. Read the complete User Story provided in `$1`.
2. Read the complete refinement review provided in `$2`.
3. Identify every unresolved question, blocker, ambiguity, conflict, and pending Product Owner or Business Analyst decision.
4. Resolve each pending decision using the authoritative EventFlow documentation and the decision rules defined by the `eventflow-po-ba-decision-resolver` skill.
5. Distinguish clearly between:

   * Decisions supported directly by existing documentation.
   * Decisions that can be safely derived from approved documentation.
   * Recommendations that require explicit Product Owner confirmation.
6. Do not invent unsupported product requirements, business rules, technical constraints, or scope.
7. Preserve EventFlow MVP boundaries and prevent scope creep.
8. Update the User Story only according to the workflow and file-update behavior defined by the skill.
9. Update or close the refinement review only when the skill explicitly requires it.
10. Do not generate Development Tasks.
11. Do not generate a Technical Specification.
12. Do not perform the formal approval gate.
13. Return the result in neutral Spanish LATAM using the exact output format defined by the skill.

## Required alignment sources

Validate the decisions against the relevant EventFlow documentation, including:

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
* Relevant backend, frontend, API, database, AI, deployment, or technical design documents

Only consult documents relevant to the pending decisions. Do not introduce requirements merely because they appear in an unrelated document.

## Input validation

Before resolving any decision:

1. Confirm that `$1` is not empty.
2. Confirm that `$2` is not empty.
3. Resolve relative paths from the repository root.
4. Confirm that `$1` resolves to an existing Markdown file.
5. Confirm that `$1` represents an EventFlow User Story.
6. Confirm that `$2` resolves to an existing Markdown file.
7. Confirm that `$2` represents the refinement review or blocking-decisions document associated with the User Story.
8. Confirm that the User Story identifier referenced in `$2`, when present, matches the User Story in `$1`.

If either argument is missing, invalid, inaccessible, or inconsistent:

* Stop immediately.
* Do not modify any file.
* Report the validation error clearly.
* Show the expected command usage.

## Resolution behavior

* Process every blocker from `$2`; do not silently omit unresolved items.
* Preserve the identifiers, original intent, scope, and traceability of the User Story.
* Apply targeted edits only.
* Do not rewrite unrelated sections.
* Do not silently convert recommendations into approved Product Owner decisions.
* If all blocking decisions can be resolved according to the skill:

  * Apply the corresponding updates defined by the skill.
  * Report which decisions were resolved and which files were modified.
* If one or more decisions still require explicit Product Owner input:

  * Do not fabricate an answer.
  * Follow the unresolved-decision behavior defined by the skill.
  * Clearly list the remaining decisions and why existing documentation is insufficient.
