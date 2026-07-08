# Mega Prompt AAA — Create the Claude Code Skill eventflow-execute-development-tasks

## ACT

Act as a **Claude Code Skill Designer, Staff Software Engineer, Workflow Architect, Technical Project Manager, QA Lead, and Configuration Reviewer**.

You are working inside the EventFlow repository.

Your assignment is to create a project-level Claude Code skill that executes the Development Tasks associated with one EventFlow User Story while preserving:

* architectural alignment;
* task-by-task traceability;
* resumability;
* real-time execution records;
* validation evidence;
* safe repository modifications;
* consistency with the prioritized backlog;
* consistency with `DEVELOPMENT_CONVENTIONS.md`.

This skill performs real implementation work. It must not behave as a documentation-only generator.

It must be deterministic in its workflow, conservative with repository changes, honest about validation results, and safe to resume across sessions.

---

## ACTION

Create the project-level Claude Code skill:

`.claude/skills/eventflow-execute-development-tasks/SKILL.md`

Skill invocation name:

`/eventflow-execute-development-tasks`

The skill must receive exactly three required positional arguments:

1. User Story path.
2. Technical Specification path.
3. Development Tasks path.

Example invocation:

`/eventflow-execute-development-tasks management/user-stories/US-099-prisma-schema.md management/technical-specs/P0/PB-P0-001/US-099-technical-spec.md management/development-tasks/P0/PB-P0-001/US-099-development-tasks.md`

The skill must process the supplied files using the complete execution workflow defined below.

---

## AUDIENCE

The skill will be used by:

* the Product Owner;
* the Tech Lead;
* developers;
* Claude Code;
* other coding agents;
* QA reviewers;
* academic evaluators.

The skill instructions and generated workflow records must use **neutral Latin American Spanish**.

Technical names, file paths, task IDs, code identifiers, commands, package names, status literals, and configuration keys must remain verbatim.

---

# 1. Inspect the repository before creating the skill

Do not assume the current skill structure.

Inspect:

* `.claude/skills/`;
* `.claude/commands/`;
* existing EventFlow skills;
* existing `SKILL.md` frontmatter patterns;
* any shared skill templates;
* `CLAUDE.md`;
* `.claude/rules/`;
* repository permissions or settings;
* `management/workflows/`;
* `management/user-stories/`;
* `management/user-stories/decision-resolutions/`;
* `management/user-stories/refinement-reviews/`;
* `management/technical-specs/`;
* `management/development-tasks/`;
* prioritized backlog location;
* existing workflow state files;
* actual task ID format;
* actual Tech Spec metadata;
* actual User Story metadata;
* actual package manager and project scripts;
* `DEVELOPMENT_CONVENTIONS.md`.

Reuse established conventions when they exist.

Do not rename or reorganize existing management folders.

Do not invent child paths without inspecting the repository first.

---

# 2. Required skill frontmatter

Use valid Claude Code skill frontmatter.

The skill should be manually triggered because it has repository side effects.

Use named positional arguments if supported by the installed Claude Code conventions.

The intended frontmatter should conceptually contain:

```
---
name: eventflow-execute-development-tasks
description: Ejecuta de forma controlada, trazable y reanudable las Development Tasks de una User Story de EventFlow a partir de sus rutas de User Story, Tech Spec y Tasks File.
argument-hint: "[user-story-path] [tech-spec-path] [tasks-path]"
arguments:
  - user_story_path
  - tech_spec_path
  - tasks_path
disable-model-invocation: true
user-invocable: true
---
```

Verify the currently supported frontmatter syntax from the local or official Claude Code documentation available to the environment.

Do not add broad `allowed-tools` permissions automatically.

In particular:

* do not pre-authorize unrestricted Bash;
* do not pre-authorize `git push`;
* do not pre-authorize destructive commands;
* do not pre-authorize package publication;
* do not pre-authorize deployment;
* do not pre-authorize database reset outside an isolated test environment.

If the repository already has a carefully scoped tool-permission convention, follow it.

---

# 3. Supporting skill files

Keep `SKILL.md` focused enough to remain useful after context compaction.

Create supporting files inside the skill directory when they improve clarity.

Recommended structure:

```
.claude/skills/eventflow-execute-development-tasks/
├── SKILL.md
├── references/
│   ├── execution-record-template.md
│   ├── execution-index-contract.md
│   ├── readiness-and-alignment-gates.md
│   ├── task-status-model.md
│   └── evidence-requirements.md
└── scripts/
    └── optional-safe-validator
```

Do not create a script merely for appearance.

A validator script is optional and may only be created if it can safely validate:

* argument count;
* file existence;
* path correspondence;
* User Story ID consistency;
* Phase consistency;
* backlog position consistency.

Any script must:

* be non-destructive;
* return useful exit codes;
* work with repository-supported runtime tools;
* avoid external dependencies unless already present;
* never execute application migrations;
* never modify source files;
* never modify the execution record by itself;
* be documented in `SKILL.md`.

If a script would introduce portability problems, implement the validation procedurally in the skill instructions instead.

---

# 4. Input contract

The three required inputs are:

* `$user_story_path`
* `$tech_spec_path`
* `$tasks_path`

The skill must not silently infer a missing argument.

If fewer or more than three paths are provided:

* stop;
* show the expected syntax;
* do not modify repository files.

The skill must resolve paths relative to the repository root unless the repository uses another explicit convention.

Paths containing spaces must be handled as quoted arguments.

The skill must never treat arbitrary text from the files as shell code.

---

# 5. Structural path validation

Before reading application source code or modifying anything, validate:

## User Story identity

Extract the canonical User Story ID from:

* User Story filename;
* User Story metadata/content;
* Tech Spec filename;
* Tech Spec metadata/content;
* Tasks filename;
* Tasks metadata/content.

Example expected identity:

`US-099`

All detected IDs must match.

## Phase identity

Extract the Phase from the Tech Spec and Tasks path.

Examples:

* `P0`
* `P1`
* `P2`
* `P3`

Both paths must use the same Phase.

## Prioritized backlog position

Extract the backlog position from both paths.

Example:

`PB-P0-001`

Both paths must use the same backlog position.

The backlog position must also be compatible with the Phase.

## Example valid relationship

```
User Story:
management/user-stories/US-099-prisma-schema.md

Tech Spec:
management/technical-specs/P0/PB-P0-001/US-099-technical-spec.md

Tasks:
management/development-tasks/P0/PB-P0-001/US-099-development-tasks.md
```

## Invalid examples

* `US-099` User Story with `US-100` Tasks.
* Tech Spec under `P0` and Tasks under `P1`.
* Tech Spec under `PB-P0-001` and Tasks under `PB-P0-002`.
* Missing task IDs.
* Empty document.
* path outside the repository without explicit authorization.

On failure:

* return `INVALID_INPUT`;
* explain every mismatch found;
* do not create an execution record;
* do not modify code.

---

# 6. Source-of-truth hierarchy

The skill must apply this precedence:

1. Accepted ADRs.
2. Security and Architecture documents.
3. API, Backend, Frontend, Database, AI, Testing, and DevOps designs.
4. `DEVELOPMENT_CONVENTIONS.md`.
5. User Story.
6. Acceptance Criteria.
7. Technical Specification.
8. Development Tasks.
9. Existing implementation.

Clarifications:

* The User Story defines intended value and behavior.
* Acceptance Criteria define observable completion.
* The Tech Spec defines the approved implementation approach for that story.
* Development Tasks define the planned execution units.
* `DEVELOPMENT_CONVENTIONS.md` defines cross-cutting implementation rules.
* Existing implementation provides context but does not override accepted decisions merely because it already exists.

When lower-level artifacts contradict higher-level sources:

* do not silently choose one;
* classify the conflict;
* update the execution record;
* stop before implementing the conflicting work when the conflict is material.

---

# 7. Readiness Gate

The skill must verify readiness before code changes.

Review:

* User Story exists and is readable.
* User Story status allows implementation.
* Acceptance Criteria exist and are sufficiently testable.
* Tech Spec exists and is readable.
* Tasks file exists and contains identifiable tasks.
* `DEVELOPMENT_CONVENTIONS.md` exists and is readable.
* declared dependencies are understood;
* blocking predecessors are complete when evidence exists;
* refinement review has no unresolved blocking findings;
* Product Owner decision resolutions have been incorporated;
* no open technical decision blocks implementation;
* no existing execution record reports a blocking state;
* the story belongs to the prioritized backlog;
* executing it now does not violate a hard dependency.

Inspect only decision and refinement files associated with the supplied User Story.

Do not load every decision-resolution file in the project without need.

Allowed readiness results:

* `READY`
* `READY_WITH_WARNINGS`
* `BLOCKED_BY_REFINEMENT`
* `BLOCKED_BY_DECISION`
* `BLOCKED_BY_DEPENDENCY`
* `BLOCKED_BY_ALIGNMENT`
* `INVALID_INPUT`

Behavior:

### READY

Proceed.

### READY_WITH_WARNINGS

Proceed only when warnings do not alter architecture, acceptance behavior, security, authorization, persistence integrity, or scope.

Record every warning.

### Blocking result

* do not modify application code;
* create or update the execution record only when inputs are structurally valid;
* record the blocker;
* update the global index;
* return a precise report;
* do not mark any task `In Progress`.

---

# 8. Required reading order

Once structural validation succeeds, read:

1. Development Tasks file.
2. `DEVELOPMENT_CONVENTIONS.md`.
3. Technical Specification.
4. User Story.
5. Acceptance Criteria.
6. Related refinement review.
7. Related decision resolutions.
8. Relevant accepted ADRs.
9. Relevant technical source documents.
10. Existing implementation affected by the tasks.

Do not indiscriminately load all project documentation.

Read detailed technical documents based on the affected area:

* backend;
* frontend;
* API;
* database;
* AI;
* security;
* testing;
* DevOps.

---

# 9. Alignment Gate

Before implementation, compare the artifacts.

## Tasks versus Tech Spec

Verify:

* each task derives from the Tech Spec;
* task order respects dependencies;
* all necessary implementation areas are covered;
* tests are included where required;
* migrations are included where required;
* documentation/configuration tasks are included where required;
* no task introduces unapproved scope;
* no task contradicts the designed approach.

## Tech Spec versus Development Conventions

Verify:

* approved stack;
* folder organization;
* naming;
* layer boundaries;
* API rules;
* database rules;
* security rules;
* testing expectations;
* DevOps rules;
* Definition of Done.

## Tasks versus User Story and Acceptance Criteria

Verify:

* every Acceptance Criterion maps to one or more tasks;
* no Acceptance Criterion is orphaned;
* no task lacks functional or technical justification;
* negative and authorization scenarios are covered where relevant;
* out-of-scope behavior is not introduced.

## Tech Spec versus accepted architecture

Verify:

* no ADR contradiction;
* no unauthorized technology substitution;
* no hidden microservice or queue introduction;
* no bypass of backend authorization;
* no persistence shortcut that leaks Prisma into Domain;
* no frontend BFF or Server Action substitution;
* no autonomous AI behavior.

Allowed alignment results:

* `ALIGNED`
* `ALIGNED_WITH_NOTES`
* `REQUIRES_TASK_ADJUSTMENT`
* `REQUIRES_TECH_SPEC_UPDATE`
* `ARCHITECTURE_DECISION_REQUIRED`
* `BLOCKED`

Rules:

* Minor implementation notes may be recorded and execution may proceed.
* Missing technical substeps may become explicitly labeled emergent tasks.
* Material design conflicts must block execution.
* Do not rewrite the baseline Tasks file silently.
* Do not rewrite the Tech Spec silently.
* Do not create or supersede an ADR without explicit authorization.

---

# 10. Execution record location

Inspect the existing structure under:

`management/workflows/`

Follow established naming and hierarchy if one exists.

The execution record must be separate from the original Development Tasks file.

The Development Tasks file is the planning baseline and must not be used as the mutable implementation log.

If no established execution-record convention exists, use this fallback:

```
management/workflows/development-execution/<PHASE>/<BACKLOG-ID>/<US-ID>-execution.md
```

Example:

`management/workflows/development-execution/P0/PB-P0-001/US-099-execution.md`

Use this global index fallback only when no equivalent index already exists:

`management/workflows/Development-Execution-Index.md`

Do not create multiple competing indexes.

If the repository already has a per-story workflow log that clearly serves this purpose, extend it rather than duplicating it, provided this does not destroy existing workflow history.

---

# 11. Execution record contract

The execution record must contain at minimum:

## Metadata

* User Story ID.
* User Story title.
* Phase.
* prioritized backlog position.
* User Story path.
* Tech Spec path.
* Tasks path.
* conventions path.
* conventions version or last-modified reference when available.
* execution record status.
* readiness status.
* alignment status.
* branch name, when a Git repository is available.
* initial commit hash, when available.
* started date/time.
* last updated date/time.
* completed date/time.
* Claude session ID when available.
* executor type, such as `Claude Code`.
* no invented human name.

## Source validation

A checklist recording:

* paths validated;
* IDs matched;
* Phase matched;
* backlog position matched;
* documents readable;
* task IDs extracted.

## Readiness Gate

* result;
* checks;
* warnings;
* blockers;
* related decision files;
* related refinement files.

## Alignment Gate

* result;
* Tasks vs Tech Spec findings;
* Tech Spec vs Conventions findings;
* Tasks vs Acceptance Criteria mapping;
* architecture findings;
* required adjustments.

## Task inventory

For every original task:

* exact Task ID;
* exact original title;
* source order;
* dependencies;
* status;
* started time;
* completed time;
* Acceptance Criteria covered;
* evidence summary.

Original task IDs must never be renumbered.

## Emergent tasks

Keep emergent work separate from baseline tasks.

Suggested IDs:

`EMERGENT-001`, `EMERGENT-002`, etc.

Each emergent task must include:

* reason discovered;
* parent task;
* necessity;
* scope impact;
* Tech Spec impact;
* status;
* evidence.

Do not use emergent tasks to hide scope expansion.

## Evidence by task

Capture:

* files created;
* files modified;
* files deleted;
* migrations created;
* tests created or modified;
* commands executed;
* exact command results;
* lint result;
* typecheck result;
* test result;
* build result;
* database validation result;
* security checks;
* Acceptance Criteria covered;
* conventions checked;
* deviations;
* technical debt;
* commit or PR reference only when one actually exists.

## Blockers

For every blocker:

* blocker ID;
* affected task;
* type;
* description;
* detected time;
* required decision;
* owner role;
* resolution status.

## Deviations

Record:

* planned behavior;
* implemented or proposed behavior;
* reason;
* impact;
* affected convention;
* affected Tech Spec section;
* whether an ADR is required;
* resolution.

## Final validation

Record:

* task completion;
* Acceptance Criteria coverage;
* lint;
* typecheck;
* tests;
* build;
* migrations;
* seed;
* authorization;
* security;
* accessibility;
* i18n;
* documentation;
* unresolved debt;
* final status.

## Change history

Append a compact chronological history of meaningful status transitions.

Do not create a verbose log entry for every file read.

---

# 12. Task status model

Use these task states:

* `Not Started`
* `In Progress`
* `Blocked`
* `Implemented`
* `Rework Required`
* `Done`
* `Skipped`

Allowed transitions:

* `Not Started → In Progress`
* `Not Started → Skipped`
* `In Progress → Implemented`
* `In Progress → Blocked`
* `Implemented → Done`
* `Implemented → Rework Required`
* `Rework Required → In Progress`
* `Blocked → In Progress`

Disallowed without explicit recovery documentation:

* `Not Started → Done`
* `Blocked → Done`
* `Skipped → Done`
* `In Progress → Done`

Meanings:

### Not Started

No implementation has begun.

### In Progress

The record has been updated and implementation is active.

### Implemented

The intended code/configuration/documentation change exists, but complete validation has not yet passed.

### Done

Implementation, required validation, evidence, and Acceptance Criteria checks have passed.

### Blocked

Execution cannot continue safely.

### Rework Required

Validation found an implementation problem.

### Skipped

The task will not be executed and has a formal justification.

A skipped required task normally prevents User Story completion.

---

# 13. Story execution status model

Use:

* `Initialized`
* `Ready`
* `In Progress`
* `Blocked`
* `Validation`
* `Done`
* `Partially Completed`
* `Cancelled`

A User Story cannot become `Done` while:

* required tasks are unfinished;
* required tasks are blocked;
* required tasks are skipped without accepted justification;
* Acceptance Criteria remain uncovered;
* required validation fails;
* material deviations remain unresolved.

---

# 14. Resume behavior

The skill must be idempotent and resumable.

When the execution record already exists:

1. Read it completely.
2. Do not recreate it.
3. Do not reset statuses.
4. Verify that listed source paths still match the supplied arguments.
5. Compare current task inventory with the baseline Tasks file.
6. Detect newly added, removed, or renamed baseline tasks.
7. Verify evidence for tasks marked `Done`.
8. Detect abandoned `In Progress` tasks.
9. Inspect the working tree.
10. Resume from the first executable unfinished task.

If a task is marked `Done` but its evidence no longer exists:

* do not silently keep it `Done`;
* mark it `Rework Required` or record an evidence discrepancy;
* explain the finding.

If the previous session ended with a task `In Progress`:

* inspect the actual repository state;
* determine whether work is incomplete, implemented, or reverted;
* update status honestly;
* do not repeat destructive work.

---

# 15. Git safety

Before modifications:

* confirm repository root;
* inspect `git status`;
* identify pre-existing changes;
* identify current branch;
* record initial commit hash when possible.

Rules:

* never discard pre-existing user changes;
* never use `git reset --hard`;
* never use `git clean -fd`;
* never force checkout;
* never rewrite history;
* never amend commits unless explicitly requested;
* never commit automatically unless explicitly requested;
* never push automatically;
* never create a pull request automatically unless explicitly requested;
* do not mix unrelated changes;
* do not treat a dirty working tree as permission to overwrite files.

If the task overlaps with pre-existing uncommitted changes:

* inspect carefully;
* preserve them;
* record the risk;
* block only when safe merging is not possible.

---

# 16. Per-task execution loop

For each task, perform this exact lifecycle.

## Step A — Select next task

Select the first task whose:

* status is executable;
* dependencies are complete;
* blocker status is clear;
* source order permits execution.

Do not skip ahead merely because another task appears easier.

Parallel execution is only allowed when tasks are explicitly independent and evidence can remain unambiguous.

## Step B — Pre-task analysis

Before edits:

* reread the task;
* reread the relevant Tech Spec section;
* identify Acceptance Criteria;
* identify applicable conventions;
* inspect affected implementation;
* identify expected files;
* identify expected tests;
* identify commands required for validation;
* identify security and data implications.

## Step C — Mark `In Progress`

Update the execution record before changing application code.

Record:

* start time;
* dependencies;
* intended files;
* applicable conventions;
* validation plan.

Save the record.

## Step D — Implement

Implement the smallest coherent change.

Rules:

* follow the Tech Spec;
* follow `DEVELOPMENT_CONVENTIONS.md`;
* preserve architectural boundaries;
* avoid unrelated refactors;
* do not add dependencies without explicit justification;
* do not modify baseline tasks;
* do not weaken tests;
* do not disable lint or type checks to make code pass;
* do not bypass security or authorization;
* do not introduce out-of-scope features;
* do not silently change API contracts;
* do not silently change database semantics.

## Step E — Mark `Implemented`

When code exists but validation is not complete:

* update status to `Implemented`;
* record created and modified files;
* save the record.

## Step F — Validate

Determine commands from the actual repository.

Never invent commands.

Run the narrowest relevant validations first, then broader gates when required.

Possible validations include:

* formatting;
* lint;
* TypeScript typecheck;
* unit tests;
* integration tests;
* API tests;
* component tests;
* contract tests;
* E2E tests;
* build;
* Prisma format;
* Prisma validate;
* migration verification;
* seed verification;
* security tests;
* accessibility tests;
* i18n tests.

Do not run destructive database commands against an unknown or shared database.

Use only clearly isolated test databases for reset or destructive migration validation.

## Step G — Record evidence

Record exact:

* commands;
* exit status;
* relevant output summary;
* files;
* tests;
* Acceptance Criteria;
* validation results;
* deviations;
* debt.

Never claim a command ran when it did not.

Never write `passed` when a command failed or was not executed.

Use:

* `Passed`
* `Failed`
* `Not Run`
* `Not Applicable`

For `Not Run` or `Not Applicable`, include a reason.

## Step H — Final task state

Set:

* `Done` when all required validations pass;
* `Rework Required` when implementation exists but validation fails;
* `Blocked` when external resolution is required.

Save the execution record immediately.

Update the global index after meaningful transitions.

---

# 17. Validation scope

The skill must apply risk-based validation.

## Documentation-only task

At minimum:

* path verification;
* content review;
* Markdown/link checks when tooling exists;
* conventions check.

## TypeScript task

At minimum:

* relevant tests;
* typecheck;
* lint.

## Backend task

Consider:

* unit tests;
* use-case tests;
* API tests;
* authorization negative tests;
* error envelope;
* correlation behavior;
* typecheck;
* lint.

## Frontend task

Consider:

* component/integration tests;
* MSW handlers;
* loading/empty/error states;
* accessibility;
* i18n;
* typecheck;
* lint;
* build where relevant.

## Database task

Consider:

* Prisma format;
* Prisma validate;
* migration inspection;
* constraint tests;
* index intent;
* migration safety;
* seed impact;
* isolated integration tests.

## AI task

Consider:

* deterministic `MockAIProvider`;
* input/output schema validation;
* timeout;
* fallback;
* human-in-the-loop;
* prompt version;
* redaction;
* injection-oriented negative tests.

## DevOps task

Consider:

* workflow syntax;
* Docker build;
* non-secret configuration;
* environment contract;
* health check;
* deployment artifact build;
* migration order;
* rollback documentation.

---

# 18. Global execution index

The global index must summarize, not duplicate, the execution record.

Each row should include:

* Phase.
* backlog ID.
* User Story ID.
* User Story title.
* execution record link.
* total baseline tasks.
* Done.
* In Progress.
* Blocked.
* Rework Required.
* Skipped.
* overall status.
* last updated.

Requirements:

* preserve existing rows;
* update the matching row atomically;
* do not create duplicate rows;
* use relative links;
* maintain consistent ordering based on prioritized backlog;
* do not mark future stories complete;
* do not infer progress without reading their execution records.

---

# 19. Handling discovered work

Classify new work as:

## Local implementation detail

Example:

* private helper;
* mapper adjustment;
* test fixture update.

Record under the parent task and continue.

## Emergent task

Example:

* missing integration test;
* missing migration verification;
* required MSW handler;
* required documentation update.

Create `EMERGENT-XXX`.

Link to its parent task.

## Tech Spec change

Example:

* proposed data model no longer satisfies an accepted ADR;
* API contract is inconsistent;
* approved architecture cannot support the behavior.

Block and report.

## Architecture decision

Example:

* new queue;
* new service boundary;
* new persistence technology;
* replacement of REST;
* replacement of authentication model.

Block and require ADR handling.

Never hide architecture changes inside emergent tasks.

---

# 20. Baseline artifact immutability

By default, do not modify:

* User Story;
* Acceptance Criteria;
* Tech Spec;
* Development Tasks file;
* accepted ADRs.

These are baseline inputs.

If a task explicitly requires documentation synchronization:

* modify only the document explicitly included in the task;
* record the modification;
* never rewrite historical decisions;
* preserve traceability.

---

# 21. Final User Story validation

After all executable tasks finish:

1. Re-read the User Story.
2. Re-read every Acceptance Criterion.
3. Map each criterion to evidence.
4. Run the required aggregate quality gates.
5. Review architectural boundaries.
6. Review authorization.
7. Review security.
8. Review database migration state.
9. Review seed impact.
10. Review frontend accessibility and i18n where applicable.
11. Review API/mock alignment.
12. Review unresolved deviations.
13. Review technical debt.
14. Review the working tree for unrelated changes.
15. Update the execution record.
16. Update the global index.

Only set the story to `Done` if all required conditions pass.

Otherwise use:

* `Blocked`;
* `Partially Completed`;
* `Validation`;
* or another valid non-final status.

---

# 22. Final response contract

At the end, return a concise but complete execution summary:

## Execution identity

* User Story.
* Phase.
* backlog position.

## Readiness

* result;
* warnings;
* blockers.

## Alignment

* result;
* findings.

## Task progress

* total;
* Done;
* Implemented;
* In Progress;
* Blocked;
* Rework Required;
* Skipped.

## Changes

* files created;
* files modified;
* migrations;
* tests.

## Validation

* commands run;
* Passed;
* Failed;
* Not Run;
* Not Applicable.

## Records

* execution record path;
* global index path.

## Deviations and debt

* unresolved deviations;
* technical debt;
* ADR or Tech Spec updates required.

## Overall result

One of:

* `DONE`
* `PARTIALLY_COMPLETED`
* `BLOCKED`
* `VALIDATION_FAILED`
* `INVALID_INPUT`

Do not overstate completion.

---

# 23. Skill quality validation

Before finishing skill creation, validate that the skill:

* has valid frontmatter;
* receives exactly three arguments;
* uses the argument variables correctly;
* cannot silently infer missing paths;
* validates US ID, Phase, and backlog position;
* performs readiness and alignment gates;
* creates or resumes an execution record;
* preserves baseline task files;
* updates task states before and after implementation;
* records real evidence;
* updates one global index;
* is resumable;
* protects pre-existing Git changes;
* never auto-commits or pushes;
* does not run destructive database operations by default;
* respects `DEVELOPMENT_CONVENTIONS.md`;
* blocks material architecture conflicts;
* does not mark tasks `Done` without validation;
* uses supporting references without duplicating excessive content;
* remains understandable after Claude Code context compaction.

---

# 24. Files allowed for this skill-creation task

You may create or update only:

* `.claude/skills/eventflow-execute-development-tasks/SKILL.md`
* supporting files inside `.claude/skills/eventflow-execute-development-tasks/`

Do not execute a User Story.

Do not modify application code.

Do not create an execution record yet.

Do not update the global execution index yet.

Do not install dependencies.

Do not modify existing management artifacts.

Do not commit or push.

---

# 25. Final response after creating the skill

Return:

* skill path;
* supporting files created;
* arguments defined;
* invocation example;
* execution-record fallback convention;
* index fallback convention;
* safety controls included;
* resumability behavior;
* validations performed on the skill files;
* any conflict with existing skills or commands;
* confirmation that no application or management artifact was modified.
