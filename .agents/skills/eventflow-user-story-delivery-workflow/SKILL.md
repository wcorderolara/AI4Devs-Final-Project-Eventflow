---

name: eventflow-user-story-delivery-workflow
description: Orchestrates the complete EventFlow User Story delivery workflow from refinement through approval, Technical Specification, and Development Tasks, including conditional resolution of blocking PO/BA decisions and persistent workflow-state tracking.
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# EventFlow User Story Delivery Workflow

## Purpose

Orchestrate the complete preparation workflow for a single EventFlow User Story.

The workflow must coordinate the existing specialized skills in the correct order:

1. `eventflow-user-story-refinement`
2. `eventflow-po-ba-decision-resolver`, only when blocking refinement decisions exist
3. `eventflow-user-story-approval`
4. `eventflow-user-story-technical-spec`
5. `eventflow-user-story-to-development-tasks`

This skill does not replace, duplicate, reinterpret, or weaken the rules of those specialized skills.

Its responsibility is to:

* Determine the current workflow state.
* Select the next valid stage.
* Invoke the appropriate specialized skill.
* Capture the real output artifact paths.
* Stop at human decision gates.
* Prevent duplicate artifact generation.
* Persist workflow progress.
* Resume a previously interrupted workflow safely.

The skill receives exactly one primary input:

```text
<user-story-path>
```

The output must be written in neutral Spanish LATAM.

---

# 1. Core principles

## 1.1 Specialized skills remain authoritative

Each specialized skill is the source of truth for its own stage.

This orchestrator must not:

* Reimplement refinement rules.
* Answer PO/BA blockers by itself.
* Approve a User Story by itself.
* Generate a Technical Specification by itself.
* Generate Development Tasks by itself.
* Override the output status of another skill.
* Modify an artifact when the responsible skill prohibits modification.

The orchestrator decides **which skill must execute next**, but each specialized skill decides **how its stage is performed**.

## 1.2 The User Story is the workflow root

The provided User Story path is the root identifier for the entire workflow.

All generated or discovered artifacts must be traceable to exactly one User Story.

The orchestrator must extract and preserve:

* User Story ID.
* User Story path.
* User Story title, when available.
* Epic or feature references.
* Product Backlog position, when available.

## 1.3 No unsupported assumptions

Do not invent:

* Artifact paths.
* Filenames.
* Approval results.
* Refinement status.
* Blocking questions.
* Product Owner decisions.
* Technical Specification status.
* Development Task IDs.
* Product Backlog ordering.
* Missing metadata.

Use only:

* Explicit outputs from specialized skills.
* Existing artifact metadata.
* Verified files in the repository.
* Deterministic conventions explicitly defined in this skill or another authoritative EventFlow skill.

## 1.4 Human decision gates must stop the workflow

The workflow must stop whenever:

* A refinement produces questions requiring explicit Product Owner input.
* The decision resolver cannot resolve all decisions from approved documentation.
* Approval returns `Needs Changes`.
* Approval returns `Blocked`.
* Approval returns `Split Required`.
* A contradiction prevents generation of the Technical Specification.
* A Technical Specification contains unresolved blockers.
* A required artifact cannot be verified.
* Repository state conflicts with the workflow state.

The workflow must never fabricate an answer merely to continue.

---

# 2. Inputs

## 2.1 Required input

The skill accepts one argument:

```text
<user-story-path>
```

The path may be:

* Relative to the repository root.
* Absolute.

Repository-relative paths are preferred.

## 2.2 Input validation

Before executing any stage:

1. Confirm that the path is not empty.
2. Resolve the repository root.
3. Resolve the User Story path from the repository root when relative.
4. Confirm that the file exists.
5. Confirm that it is a Markdown file.
6. Confirm that it represents an EventFlow User Story.
7. Extract a valid User Story ID using the project convention, such as:

```text
US-106
```

8. Confirm that the file does not ambiguously represent multiple User Stories.
9. Confirm that the User Story belongs to the EventFlow project.

If validation fails:

* Stop.
* Do not create or modify workflow artifacts.
* Report the validation error.
* Show the expected usage.

---

# 3. Workflow state artifact

## 3.1 Purpose

The workflow state artifact is persistent execution metadata for one User Story.

It records:

* Which stages have already executed.
* The outcome of each stage.
* The real paths of generated artifacts.
* Whether blocking decisions remain.
* Why the workflow stopped.
* Which stage may execute next.
* Whether the complete workflow is finished.

It is not the source of workflow rules.

The workflow rules live in this skill.

## 3.2 Location

Store workflow state files under:

```text
management/workflows/
```

Use one state file per User Story:

```text
management/workflows/<USER-STORY-ID>-workflow-state.md
```

Example:

```text
management/workflows/US-106-workflow-state.md
```

Do not include the complete User Story slug in the state filename unless the repository already defines another canonical convention.

## 3.3 Ownership

This state file must be:

* Created automatically by the orchestrator.
* Updated automatically after each workflow transition.
* Never required to be manually edited by the user.
* Validated against the real repository before being trusted.
* Treated as execution metadata, not as an authoritative product artifact.

## 3.4 Required state structure

Use the following structure:

```markdown
# Workflow State — <USER-STORY-ID>

## Metadata

- Workflow Version: 1.0
- User Story ID: <USER-STORY-ID>
- User Story Path: <verified-path>
- Created At: <ISO-8601 timestamp>
- Updated At: <ISO-8601 timestamp>

## Refinement

- Status: Not Started | In Progress | Completed | Blocked | Failed
- Last Execution At: <timestamp | null>
- Refinement Review Path: <verified-path | null>
- Blocking Decisions: None | Open | Resolved | Unknown
- Notes: <brief factual note | null>

## Decision Resolution

- Status: Not Required | Not Started | In Progress | Resolved | Waiting for PO | Failed
- Last Execution At: <timestamp | null>
- Source Review Path: <verified-path | null>
- Remaining Decisions: <integer | Unknown>
- Notes: <brief factual note | null>

## Approval

- Status: Not Started | Approved | Approved with Minor Notes | Needs Changes | Blocked | Split Required | Failed
- Last Execution At: <timestamp | null>
- Approval Artifact Path: <verified-path | null>
- Notes: <brief factual note | null>

## Technical Specification

- Status: Not Started | In Progress | Generated | Blocked | Failed
- Last Execution At: <timestamp | null>
- Path: <verified-path | null>
- Notes: <brief factual note | null>

## Development Tasks

- Status: Not Started | In Progress | Generated | Blocked | Failed
- Last Execution At: <timestamp | null>
- Path: <verified-path | null>
- Task Count: <integer | Unknown>
- Task ID Range: <value | null>
- Notes: <brief factual note | null>

## Workflow

- Current Stage: validation | refinement | decision-resolution | refinement-revalidation | approval | technical-specification | development-tasks | completed | stopped
- Overall Status: Not Started | In Progress | Waiting for PO | Blocked | Completed | Failed
- Stop Reason: <factual reason | null>
- Next Eligible Stage: <stage-name | none>
```

## 3.5 State validation

Before using an existing state file:

1. Confirm that its User Story ID matches the provided User Story.
2. Confirm that its User Story path resolves to the same file.
3. Confirm that every non-null artifact path exists.
4. Confirm that each referenced artifact belongs to the same User Story.
5. Confirm that recorded statuses are consistent with the referenced files.
6. Confirm that no two paths claim to represent conflicting artifacts for the same stage.

If the state file is stale but recoverable:

* Reconcile it with verified repository evidence.
* Record the reconciliation in `Notes`.
* Update `Updated At`.

If the state file conflicts with repository evidence and the correct state cannot be determined safely:

* Stop.
* Set `Overall Status: Blocked`.
* Record the inconsistency in `Stop Reason`.
* Do not continue to another stage.

---

# 4. Artifact discovery rules

## 4.1 General rule

Prefer artifact paths obtained directly from the output of the specialized skill that created them.

When a specialized skill returns a created or updated path:

1. Capture that exact path.
2. Verify that the file exists.
3. Verify that it belongs to the current User Story.
4. Store it in the workflow state.

## 4.2 Existing artifact discovery

When resuming a workflow, artifact discovery may use:

1. The verified workflow state.
2. Explicit metadata or links in the User Story.
3. Explicit metadata or links in another associated artifact.
4. Exact User Story ID references in candidate files.
5. Repository conventions defined by the responsible specialized skill.

Do not choose a file based only on:

* A partial slug match.
* Similar titles.
* Directory position.
* Most recent modification time.
* An inferred filename not defined by an authoritative convention.

## 4.3 Multiple matching artifacts

If multiple candidate artifacts exist for the same stage:

* Inspect their metadata and User Story references.
* Select one only when a single canonical artifact can be verified.
* Otherwise stop and report the ambiguity.

Do not overwrite or merge multiple artifacts automatically.

---

# 5. Workflow stages

## Stage 0 — Initialize or resume

1. Validate the User Story input.
2. Extract the User Story ID.
3. Load the workflow state file if it exists.
4. Otherwise create a new workflow state.
5. Reconcile the workflow state with existing repository artifacts.
6. Determine the earliest incomplete valid stage.
7. Never rerun a completed stage unless:

   * Its artifact no longer exists.
   * Its result has been invalidated by a later approved change.
   * The responsible specialized skill explicitly requires revalidation.
   * The user explicitly requests regeneration.

---

## Stage 1 — User Story refinement

Use:

```text
eventflow-user-story-refinement
```

Input:

```text
<user-story-path>
```

### Before execution

Set:

```text
Refinement.Status = In Progress
Workflow.Current Stage = refinement
Workflow.Overall Status = In Progress
```

### Possible outcomes

#### Outcome A — Refinement completed without blockers

Record:

```text
Refinement.Status = Completed
Refinement.Blocking Decisions = None
```

Then proceed to Stage 3 — Approval.

#### Outcome B — Refinement produces blocking questions or decisions

Capture the exact refinement review path returned by the refinement skill.

Verify the file.

Record:

```text
Refinement.Status = Blocked
Refinement.Refinement Review Path = <verified-path>
Refinement.Blocking Decisions = Open
Decision Resolution.Status = Not Started
Workflow.Current Stage = decision-resolution
Workflow.Next Eligible Stage = decision-resolution
```

Then proceed to Stage 2.

#### Outcome C — Refinement requires direct human answers and the responsible skill indicates that automated resolution is not allowed

Record:

```text
Refinement.Status = Blocked
Workflow.Overall Status = Waiting for PO
Workflow.Current Stage = stopped
Workflow.Stop Reason = <reason>
Workflow.Next Eligible Stage = decision-resolution | none
```

Stop.

---

## Stage 2 — Resolve PO/BA decisions

Execute this stage only when:

```text
Refinement.Blocking Decisions = Open
```

Use:

```text
eventflow-po-ba-decision-resolver
```

Inputs:

```text
<user-story-path>
<refinement-review-path>
```

The refinement review path must come from a verified source.

### Before execution

Set:

```text
Decision Resolution.Status = In Progress
Decision Resolution.Source Review Path = <verified-refinement-review-path>
Workflow.Current Stage = decision-resolution
```

### Possible outcomes

#### Outcome A — All decisions resolved

Record:

```text
Decision Resolution.Status = Resolved
Decision Resolution.Remaining Decisions = 0
Refinement.Blocking Decisions = Resolved
Workflow.Current Stage = refinement-revalidation
Workflow.Next Eligible Stage = refinement-revalidation
```

Proceed to Stage 2.5.

#### Outcome B — Decisions still require Product Owner input

Record:

```text
Decision Resolution.Status = Waiting for PO
Decision Resolution.Remaining Decisions = <count-or-Unknown>
Workflow.Overall Status = Waiting for PO
Workflow.Current Stage = stopped
Workflow.Stop Reason = Pending explicit Product Owner decisions
Workflow.Next Eligible Stage = decision-resolution
```

Stop.

#### Outcome C — Resolver failed or found inconsistent inputs

Record:

```text
Decision Resolution.Status = Failed
Workflow.Overall Status = Failed | Blocked
Workflow.Current Stage = stopped
Workflow.Stop Reason = <factual reason>
```

Stop.

---

## Stage 2.5 — Refinement revalidation

After the decision resolver reports all decisions resolved, invoke:

```text
eventflow-user-story-refinement
```

again using:

```text
<user-story-path>
```

This execution validates that:

* Resolved decisions were incorporated correctly.
* No new blockers were introduced.
* The User Story is now ready for approval.

### Possible outcomes

#### Outcome A — Revalidation completed without blockers

Record:

```text
Refinement.Status = Completed
Refinement.Blocking Decisions = Resolved
Workflow.Current Stage = approval
Workflow.Next Eligible Stage = approval
```

Proceed to Stage 3.

#### Outcome B — New or remaining blockers exist

Capture the new or updated refinement review path.

Record:

```text
Refinement.Status = Blocked
Refinement.Blocking Decisions = Open
Decision Resolution.Status = Not Started
Workflow.Current Stage = decision-resolution
Workflow.Next Eligible Stage = decision-resolution
```

The workflow may return to Stage 2.

To avoid infinite loops:

* Do not repeat the resolver/refinement cycle more than three times in one workflow invocation.
* If blockers persist after three cycles, stop with:

  * `Overall Status: Waiting for PO` when explicit decisions remain.
  * `Overall Status: Blocked` when documents are inconsistent.

---

## Stage 3 — Formal approval gate

Use:

```text
eventflow-user-story-approval
```

Input:

```text
<user-story-path>
```

### Preconditions

Approval may run only when:

* Refinement is complete.
* Blocking decisions are `None` or `Resolved`.
* No unresolved Product Owner questions remain.
* The User Story file exists and reflects the latest refinement.

### Before execution

Set:

```text
Approval.Status = Not Started
Workflow.Current Stage = approval
Workflow.Overall Status = In Progress
```

### Accepted continuation statuses

#### Approved

Record:

```text
Approval.Status = Approved
Workflow.Next Eligible Stage = technical-specification
```

Proceed to Stage 4.

#### Approved with Minor Notes

Record:

```text
Approval.Status = Approved with Minor Notes
```

Continue only when the approval skill explicitly classifies the notes as non-blocking for Technical Specification generation.

Then:

```text
Workflow.Next Eligible Stage = technical-specification
```

Proceed to Stage 4.

### Stop statuses

#### Needs Changes

Record:

```text
Approval.Status = Needs Changes
Workflow.Overall Status = Blocked
Workflow.Current Stage = stopped
Workflow.Stop Reason = Approval requires changes
Workflow.Next Eligible Stage = refinement
```

Stop.

#### Blocked

Record:

```text
Approval.Status = Blocked
Workflow.Overall Status = Blocked
Workflow.Current Stage = stopped
Workflow.Stop Reason = Approval gate blocked
Workflow.Next Eligible Stage = none | refinement | decision-resolution
```

Stop.

#### Split Required

Record:

```text
Approval.Status = Split Required
Workflow.Overall Status = Blocked
Workflow.Current Stage = stopped
Workflow.Stop Reason = User Story must be split before continuing
Workflow.Next Eligible Stage = none
```

Stop.

The orchestrator must not split the story automatically unless a separate explicit skill exists for that purpose.

---

## Stage 4 — Generate Technical Specification

Use:

```text
eventflow-user-story-technical-spec
```

Input:

```text
<user-story-path>
```

### Preconditions

Technical Specification generation may execute only when:

* Approval is `Approved`, or
* Approval is `Approved with Minor Notes` and those notes are explicitly non-blocking.
* No unresolved decisions remain.
* No valid Technical Specification is already registered.

### Existing Technical Specification

When a valid Technical Specification already exists:

1. Verify it belongs to the current User Story.
2. Verify that it contains no unresolved blockers.
3. Verify that it is not older than a material approved change to the User Story.
4. Reuse it instead of regenerating it.

Record:

```text
Technical Specification.Status = Generated
Technical Specification.Path = <verified-existing-path>
```

Proceed to Stage 5.

### New Technical Specification

Before execution:

```text
Technical Specification.Status = In Progress
Workflow.Current Stage = technical-specification
```

After successful generation:

1. Capture the exact path returned by the skill.
2. Verify the file exists.
3. Verify the User Story ID.
4. Store the exact path.

Record:

```text
Technical Specification.Status = Generated
Technical Specification.Path = <verified-path>
Workflow.Next Eligible Stage = development-tasks
```

Proceed to Stage 5.

### Blocking outcome

If the Technical Specification skill reports a blocking contradiction or missing decision:

```text
Technical Specification.Status = Blocked
Workflow.Overall Status = Blocked
Workflow.Current Stage = stopped
Workflow.Stop Reason = <reason>
Workflow.Next Eligible Stage = refinement | decision-resolution | approval | none
```

Stop.

---

## Stage 5 — Generate Development Tasks

Use:

```text
eventflow-user-story-to-development-tasks
```

Input:

```text
<technical-spec-path>
```

Do not pass the User Story path when the task-generation skill expects the Technical Specification path.

### Preconditions

Development Tasks generation may run only when:

* A verified Technical Specification exists.
* The Technical Specification belongs to the current User Story.
* The Technical Specification contains no unresolved blockers.
* The User Story has a valid approval state.
* No valid Development Tasks artifact is already registered.

### Existing tasks

When a valid Development Tasks artifact already exists:

1. Verify its associated User Story.
2. Verify its source Technical Specification.
3. Verify that it follows the current task numbering and Product Backlog ordering rules.
4. Reuse it instead of creating duplicates.

Record:

```text
Development Tasks.Status = Generated
Development Tasks.Path = <verified-existing-path>
```

Proceed to workflow completion.

### New tasks

Before execution:

```text
Development Tasks.Status = In Progress
Workflow.Current Stage = development-tasks
```

After successful generation:

1. Capture the exact output path.
2. Verify the file exists.
3. Verify the associated User Story.
4. Verify the source Technical Specification.
5. Capture task count and task ID range when returned by the skill.

Record:

```text
Development Tasks.Status = Generated
Development Tasks.Path = <verified-path>
Development Tasks.Task Count = <count-or-Unknown>
Development Tasks.Task ID Range = <range-or-null>
```

Then complete the workflow.

### Blocking outcome

If task generation reports unresolved Technical Specification issues:

```text
Development Tasks.Status = Blocked
Workflow.Overall Status = Blocked
Workflow.Current Stage = stopped
Workflow.Stop Reason = <reason>
Workflow.Next Eligible Stage = technical-specification | none
```

Stop.

---

# 6. Workflow completion

The workflow is complete only when:

* Refinement is complete.
* All blocking decisions are resolved or no blockers existed.
* Approval is valid for continuation.
* A verified Technical Specification exists.
* A verified Development Tasks artifact exists.

Record:

```text
Workflow.Current Stage = completed
Workflow.Overall Status = Completed
Workflow.Stop Reason = null
Workflow.Next Eligible Stage = none
```

Update the state file one final time.

---

# 7. Resume behavior

When invoked again for the same User Story:

1. Validate the User Story.
2. Load and validate the workflow state.
3. Verify referenced artifacts.
4. Skip completed valid stages.
5. Resume at `Next Eligible Stage`.
6. Do not regenerate valid artifacts.
7. Do not rerun approval if nothing material has changed after approval.
8. Re-run an earlier stage only when repository evidence invalidates the recorded result.

Examples:

```text
Refinement blocked + open decisions
→ resume decision resolution
```

```text
Technical Specification generated + tasks not started
→ resume Development Tasks generation
```

```text
Workflow completed
→ report that the workflow is already complete
```

```text
Approval completed, but User Story was materially modified afterward
→ invalidate approval and downstream artifacts
→ resume at refinement or approval according to the nature of the change
```

---

# 8. Invalidation rules

A downstream artifact must be considered potentially stale when an upstream artifact changes materially.

Dependency chain:

```text
User Story
→ Refinement
→ Decision Resolution
→ Approval
→ Technical Specification
→ Development Tasks
```

## 8.1 User Story materially changed after approval

Invalidate:

* Approval.
* Technical Specification.
* Development Tasks.

Resume from refinement unless the change is strictly metadata-only.

## 8.2 User Story materially changed after Technical Specification

Invalidate:

* Technical Specification.
* Development Tasks.

Approval may also need revalidation.

## 8.3 Technical Specification materially changed after tasks

Invalidate:

* Development Tasks.

Do not delete artifacts automatically.

Instead:

* Mark them stale or invalidated in workflow state.
* Stop before overwriting unless the responsible skill explicitly supports safe regeneration.

## 8.4 Metadata-only changes

Changes such as:

* Formatting.
* Fixed broken links.
* Non-semantic spelling corrections.
* Workflow metadata.

must not invalidate downstream artifacts unless they affect interpretation.

---

# 9. Idempotency and duplicate prevention

The orchestrator must be idempotent.

Running the same command repeatedly must not create:

* Duplicate refinement reviews.
* Duplicate approval artifacts.
* Duplicate Technical Specifications.
* Duplicate Development Tasks files.
* Duplicate task ID ranges.
* Multiple workflow state files for the same User Story.

Before creating an artifact:

1. Check workflow state.
2. Check explicit artifact links.
3. Verify canonical existing artifacts.
4. Invoke generation only when no valid artifact exists.

---

# 10. Failure handling

After every specialized skill invocation:

1. Inspect the returned status.
2. Capture returned artifact paths.
3. Verify filesystem effects.
4. Update workflow state.
5. Decide whether to continue or stop.

If a skill reports success but its expected artifact does not exist:

* Treat the stage as failed.
* Record the mismatch.
* Stop.

If a skill modifies a file despite reporting a blocking outcome:

* Record the inconsistency.
* Stop.
* Do not attempt to repair automatically.

If the workflow state cannot be written:

* Do not continue to another stage.
* Report the failure because resumability and traceability cannot be guaranteed.

---

# 11. Workflow summary output

After the workflow finishes or stops, return a concise summary in Spanish LATAM.

Use this format:

```markdown
# Resultado del workflow — <USER-STORY-ID>

## Estado general

- Estado: <Completed | Waiting for PO | Blocked | Failed | In Progress>
- Etapa alcanzada: <stage>
- Próxima etapa elegible: <stage | none>

## Artefactos

- User Story: `<path>`
- Workflow State: `<path>`
- Refinement Review: `<path | No generado | No requerido>`
- Technical Specification: `<path | No generado>`
- Development Tasks: `<path | No generado>`

## Resultados por etapa

| Etapa | Estado | Resultado |
|---|---|---|
| Refinement | <status> | <brief result> |
| Decision Resolution | <status> | <brief result> |
| Approval | <status> | <brief result> |
| Technical Specification | <status> | <brief result> |
| Development Tasks | <status> | <brief result> |

## Detención

- Motivo: <reason | No aplica>
- Acción humana requerida: <action | Ninguna>
```

Do not print internal chain-of-thought.

Report only:

* Verified statuses.
* Verified paths.
* Explicit blockers.
* Required next action.

---

# 12. Prohibited behavior

The orchestrator must never:

* Generate Development Tasks before a valid Technical Specification exists.
* Generate a Technical Specification before a valid approval.
* Approve a User Story with unresolved blockers.
* Skip refinement for a new or unverified User Story.
* Invoke the decision resolver without both verified input paths.
* Guess the refinement review path.
* Guess the Technical Specification path.
* Guess the Development Tasks path.
* Continue after `Needs Changes`, `Blocked`, or `Split Required`.
* Treat `Approved with Minor Notes` as automatically non-blocking without checking the approval result.
* Modify Product Backlog ordering.
* Renumber tasks outside the task-generation skill.
* Delete stale artifacts automatically.
* Hide workflow inconsistencies.
* Mark the workflow complete when an artifact cannot be verified.
* Use the workflow state file as the sole proof that an artifact exists.
* Introduce requirements not present in approved EventFlow documentation.

---

# 13. Expected usage

```text
Use the `eventflow-user-story-delivery-workflow` skill.

Process:

management/user-stories/US-106-tanstack-query-and-msw.md
```

The orchestrator must then:

```text
Validate User Story
→ Initialize or resume workflow state
→ Refine
→ Resolve decisions when required
→ Revalidate refinement
→ Approve
→ Generate Technical Specification
→ Generate Development Tasks
→ Mark workflow completed
```
