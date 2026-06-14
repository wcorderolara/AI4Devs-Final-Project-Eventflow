# EventFlow Agent Instructions

## Context

EventFlow is an AI-assisted event planning workspace with a simplified vendor quote flow. This repository is documentation and delivery-planning heavy: product docs, architecture docs, prompts, management artifacts, user stories, technical specs, and development-task workflows.

## Important Folders

- `docs/`: product, functional, architecture, backend, frontend, database, security, testing, DevOps, AI, and ADR source documents.
- `management/`: backlog, epic map, user stories, refinement reviews, decision resolutions, technical specs, development tasks, and templates.
- `prompts/`: prompt sources used to create or maintain project documentation.
- `.skills/`: original project skill definitions. Keep this folder unless explicitly asked to remove it.
- `.agents/skills/`: Codex-compatible project skills. Prefer this path for skill discovery and execution.

## Skill Routing

Use `.agents/skills/<skill>/SKILL.md` when the task matches:

- `eventflow-domain-discovery`: domain discovery, MVP scope, product strategy, business rules, AI opportunities, and discovery reports.
- `eventflow-user-story-refinement`: PO/BA review and refinement of existing user stories before approval.
- `eventflow-po-ba-decision-resolver`: formal resolution of pending questions from refinement reviews.
- `eventflow-user-story-approval`: final PO/BA approval gate and Definition of Ready validation.
- `eventflow-user-story-technical-spec`: technical specification for an approved user story.
- `eventflow-user-story-to-development-tasks`: development-task breakdown from an approved story or technical spec.

## Rules

- Inspect actual repository paths before reading or writing; do not assume child paths, filenames, or numbering.
- Use existing docs, artifacts, templates, decision resolutions, and accepted ADRs as source of truth.
- Keep outputs in Spanish LATAM unless the user explicitly asks otherwise; keep technical identifiers in English.
- Do not create scope outside the MVP, especially payments, real contracts, WhatsApp integration, native mobile apps, real-time chat, marketplace transaction logic, RAG, or autonomous AI decisions.
- Preserve backend-as-source-of-truth for authorization and human-in-the-loop behavior for AI.
- Do not modify generated documentation or management artifacts unless the active workflow requires it.
- Do not create undocumented outputs. If a skill requires a file, write it to the path pattern defined by that skill and report the path.
