# Prompt — Create the Claude Code Command /execute-development-tasks

Act as a Claude Code configuration specialist.

Create a project-level compatibility command named:

`/execute-development-tasks`

The command must be stored at:

`.claude/commands/execute-development-tasks.md`

Its only responsibility is to provide a shorter user-facing entry point for the existing project skill:

`.claude/skills/eventflow-execute-development-tasks/SKILL.md`

Do not duplicate the complete execution workflow inside the command.

Do not create a second independent implementation.

The skill remains the single source of truth for:

* readiness validation;
* path validation;
* alignment gate;
* task execution;
* execution-record creation and resumption;
* status transitions;
* evidence capture;
* global index updates;
* final User Story validation.

---

## Required command arguments

The command must require exactly three positional arguments in this order:

1. User Story path.
2. Technical Specification path.
3. Development Tasks path.

Use Claude Code-compatible positional substitutions:

* `$0` for the User Story path.
* `$1` for the Tech Spec path.
* `$2` for the Tasks path.

Provide an autocomplete hint equivalent to:

`[user-story-path] [tech-spec-path] [tasks-path]`

---

## Expected usage

The command must support an invocation such as:

`/execute-development-tasks management/user-stories/US-099-prisma-schema.md management/technical-specs/P0/PB-P0-001/US-099-technical-spec.md management/development-tasks/P0/PB-P0-001/US-099-development-tasks.md`

Paths containing spaces must be passed quoted.

---

## Command behavior

When invoked, the command must instruct Claude to:

1. Verify that exactly three arguments were supplied.
2. Resolve the paths relative to the repository root.
3. Read `.claude/skills/eventflow-execute-development-tasks/SKILL.md`.
4. Apply that skill as the authoritative workflow.
5. Bind:

   * `user_story_path = $0`
   * `tech_spec_path = $1`
   * `tasks_path = $2`
6. Execute the workflow completely unless it reaches a defined blocking condition.
7. Preserve all safety, readiness, alignment, evidence, status, and resumability rules from the skill.
8. Never replace the skill logic with an abbreviated interpretation.
9. Never infer missing arguments.
10. Never execute a different User Story from the one explicitly supplied.

Because the main skill is intentionally configured for manual invocation, the command should read and apply the `SKILL.md` instructions directly rather than depending on automatic model invocation of the skill.

---

## Suggested command frontmatter

Use valid frontmatter supported by the repository’s Claude Code version.

The intended metadata is:

```
---
description: Ejecuta las Development Tasks de una User Story de EventFlow usando su User Story, Tech Spec y Tasks File.
argument-hint: "[user-story-path] [tech-spec-path] [tasks-path]"
---
```

Do not add unrestricted tool permissions.

Do not authorize:

* `git push`;
* destructive Git commands;
* deployment;
* package publishing;
* production database commands;
* broad unrestricted Bash execution.

Follow existing `.claude/commands/` conventions if the repository already uses them.

---

## Required command body semantics

The body should be concise and equivalent to the following behavior:

```
Validate that all three arguments are present.

Read and follow:
.claude/skills/eventflow-execute-development-tasks/SKILL.md

Execute that workflow using:
- User Story path: $0
- Tech Spec path: $1
- Tasks path: $2

The skill file is the authoritative workflow. Do not abbreviate it, bypass its gates, or create an alternative execution process.
```

Do not literally reference an unavailable tool or unsupported syntax.

Use normal Claude Code instructions that cause the agent to read the skill file and follow it.

---

## Invalid invocation behavior

When the user supplies fewer or more than three arguments:

* do not inspect or modify application code;
* do not create execution records;
* do not update the global index;
* display the expected syntax;
* display one valid example;
* stop.

Expected syntax:

`/execute-development-tasks <user-story-path> <tech-spec-path> <tasks-path>`

---

## Validation after creation

Verify:

* `.claude/commands/execute-development-tasks.md` exists;
* frontmatter is valid;
* `$0`, `$1`, and `$2` are used in the correct order;
* no `$3` or legacy one-based argument assumption appears;
* the command references the correct skill path;
* it does not duplicate the workflow;
* it does not grant broad permissions;
* it handles invalid argument counts;
* the example paths match one User Story, one Phase, and one backlog position;
* no application or management file was changed.

---

## Scope restrictions

For this task, modify only:

`.claude/commands/execute-development-tasks.md`

Do not:

* modify the main skill;
* execute the skill;
* execute any Development Task;
* create an execution record;
* create or update the global execution index;
* install packages;
* modify application code;
* modify management artifacts;
* commit or push.

---

## Final response

Return:

* command path;
* expected syntax;
* example invocation;
* referenced skill path;
* validation performed;
* confirmation that the command contains no duplicated execution workflow;
* confirmation that no unrelated file was modified.
