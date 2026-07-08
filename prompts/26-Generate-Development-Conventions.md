# Mega Prompt AAA — Generate EventFlow DEVELOPMENT_CONVENTIONS.md

## ACT

Act as a **Staff Software Architect, Technical Standards Owner, Senior Full-Stack Engineer, Database Architect, DevOps Architect, Security Reviewer, and QA Architect** responsible for consolidating EventFlow's approved technical decisions into a single, implementation-oriented development conventions document.

You are working inside the EventFlow repository. EventFlow is an academic MVP for AI-assisted event planning and simplified vendor quote management.

Your responsibility is not to redesign the system. Your responsibility is to:

1. Read the existing repository and approved documentation.
2. Extract the conventions that have already been decided.
3. Reconcile duplicate or dispersed conventions.
4. Complement them with applicable industry best practices.
5. Produce a concise but sufficiently prescriptive root-level development contract.
6. Avoid inventing technologies, paths, dependencies, versions, commands, structures, or policies that are not supported by the repository or approved documentation.

The final document will be used by human developers, Claude Code, Codex, coding agents, reviewers, QA, and future skills that execute development tasks.

---

## ACTION

Create the following file at the repository root:

`DEVELOPMENT_CONVENTIONS.md`

The file must become the canonical operational guide for writing, organizing, validating, testing, reviewing, and delivering EventFlow code.

Do not create a generic style guide.

Do not merely summarize the architecture documents.

Translate approved architecture and design decisions into concrete development rules that an implementation agent can follow without rereading every technical document for routine work.

---

## AUDIENCE

Write for:

* Backend developers.
* Frontend developers.
* Database developers.
* AI integration developers.
* QA engineers.
* DevOps engineers.
* Tech Leads.
* Code reviewers.
* AI coding agents.
* Claude Code skills.
* Academic evaluators reviewing implementation consistency.

Write the deliverable in **neutral Latin American Spanish**.

Keep all technical identifiers verbatim in English:

* paths;
* package names;
* commands;
* environment variables;
* TypeScript identifiers;
* API resources;
* DTO names;
* database objects;
* status values;
* code literals.

---

# 1. Mandatory source inspection

Before writing anything, inspect the repository instead of assuming its structure.

At minimum, locate and read the actual versions of the following documents wherever they exist in the repository:

* `12-Architecture-Vision-and-Principles.md`
* `13-System-Architecture-Document.md`
* `14-Backend-Technical-Design.md`
* `15-Frontend-Architecture-Design.md`
* `16-API-Design-Specification.md`
* `17-AI-Architecture-and-PromptOps-Design.md`
* `18-Database-Physical-Design.md`
* `19-Security-and-Authorization-Design.md`
* `20-Testing-Strategy.md`
* `21-Deployment-and-DevOps-Design.md`
* `22-Architecture-Decision-Records.md`
* `10-Non-Functional-Requirements.md`
* `11-Data-Seed-Strategy.md`

Also inspect, when present:

* root `README.md`;
* root `package.json`;
* workspace or monorepo configuration;
* package-level `package.json` files;
* `tsconfig*.json`;
* ESLint configuration;
* Prettier configuration;
* `.editorconfig`;
* `.gitignore`;
* `.nvmrc`, `.node-version`, or equivalent;
* Dockerfiles;
* Docker Compose files;
* Prisma schema and migration folders;
* GitHub Actions workflows;
* frontend and backend folder structures;
* existing test folders and naming patterns;
* existing environment example files;
* existing `CLAUDE.md`;
* existing `.claude/rules/`;
* existing coding standards or convention files.

Do not presume that a documented target structure has already been implemented.

Clearly distinguish between:

* architecture approved for implementation;
* conventions already enforced in repository configuration;
* conventions documented but not yet automated;
* recommended practices that still require adoption.

---

# 2. Research requirement

Research current best practices only from authoritative or primary sources relevant to the approved EventFlow stack.

Prioritize official documentation for:

* TypeScript.
* Node.js.
* Express.
* Next.js App Router.
* React.
* TanStack Query.
* React Hook Form.
* Zod.
* Prisma.
* PostgreSQL.
* Vitest.
* Testing Library.
* MSW.
* Playwright.
* Docker.
* GitHub Actions.
* AWS services selected by EventFlow.
* OWASP where security guidance is applicable.

Research only practices related to patterns already approved for EventFlow.

Examples:

* Modular Monolith.
* Clean Architecture.
* Hexagonal Architecture.
* Feature-first frontend structure.
* Server and Client Component boundaries.
* REST API conventions.
* Prisma migration discipline.
* Transaction boundaries.
* Structured logging.
* Correlation IDs.
* CI quality gates.
* Secrets management.
* Deterministic testing.
* Human-in-the-loop AI workflows.

Do not introduce a new framework, architectural style, deployment platform, ORM, testing framework, state library, queue, broker, authentication model, API paradigm, or cloud provider solely because it appears in external guidance.

Apply this precedence rule:

1. Accepted EventFlow ADRs.
2. EventFlow Security, API, Backend, Frontend, Database, AI, Testing, and DevOps designs.
3. EventFlow Architecture Vision and System Architecture.
4. Existing repository implementation and configuration.
5. Official technology documentation.
6. General industry recommendations.

If an official recommendation conflicts with an accepted EventFlow decision:

* preserve the EventFlow decision;
* document the trade-off if operationally relevant;
* do not silently change the architecture.

Do not place raw research URLs throughout the conventions file. Include a compact “External references consulted” section only when useful.

---

# 3. Non-negotiable project guardrails

The document must preserve the following approved EventFlow constraints unless a newer accepted ADR explicitly supersedes one:

## Architecture

* Modular Monolith.
* Clean / Hexagonal internal architecture.
* Domain-oriented modules.
* REST JSON API.
* Backend as the authority for business rules and authorization.
* No microservices for the MVP.
* No Kafka, RabbitMQ, Redis queues, BullMQ, WebSockets, or distributed workflow engine unless explicitly introduced by a newer accepted ADR.
* Avoid overengineering.

## Backend

* Node.js LTS.
* TypeScript.
* Express.js.
* Prisma ORM.
* PostgreSQL.
* Zod at input boundaries when approved by the repository or technical documents.
* Explicit application use cases.
* Thin controllers.
* Prisma isolated in Infrastructure.
* Domain and Application layers must not depend directly on Express, Prisma, AWS SDKs, OpenAI SDKs, filesystem APIs, or transport-specific concerns.
* Ports and adapters should be created where external substitution, infrastructure isolation, or testability justify them.
* Do not create repository interfaces, domain services, factories, or abstractions mechanically for every table.

## Frontend

* Next.js with App Router.
* TypeScript.
* Feature-first organization.
* Server Components by default where compatible with the approved architecture.
* Client Components only where interactivity, browser APIs, client-side state, forms, or client hooks require them.
* REST consumption; no Server Actions as the primary application API.
* No Next.js Route Handlers acting as an unapproved BFF.
* TanStack Query for remote server state in authenticated interactive areas.
* React Hook Form + Zod for forms where approved.
* `next-intl` for localization.
* Tailwind CSS + design tokens.
* MSW for frontend API mocking.
* Accessibility and responsive behavior are implementation requirements, not optional polishing.

## API

* `/api/v1` base path.
* REST resources.
* JSON except approved `multipart/form-data` upload endpoints.
* DTOs instead of exposing persistence models.
* Request validation at the controller/API boundary.
* Standard success and error envelopes.
* Semantic HTTP status codes.
* Correlation ID propagation.
* Authentication with backend-issued HTTP-only cookies.
* RBAC + ownership + assignment-based authorization in backend.
* Frontend guards are UX only.
* No tokens in `localStorage` or `sessionStorage`.

## Database

* PostgreSQL 15+ unless the repository pins another compatible approved version.
* Prisma migrations.
* UUID identifiers for operational entities according to the database design.
* PostgreSQL tables and columns in `snake_case`.
* Prisma models in `PascalCase`.
* Prisma fields in `camelCase`, mapped when needed.
* `timestamptz` for timestamps.
* `numeric` / Prisma `Decimal` for monetary values.
* Restricted and justified use of JSONB.
* Query-driven indexes.
* Referential integrity with foreign keys.
* Database constraints for invariants that the database can safely enforce.
* Application services for contextual or authorization-dependent rules.
* Soft delete only for entities explicitly requiring it.
* Forward migration discipline.
* No unsafe raw SQL.
* No schema structures for out-of-scope features.

## AI

* `LLMProvider` port.
* `OpenAIProvider` as primary MVP adapter.
* Deterministic `MockAIProvider` for tests and demo.
* `AnthropicProvider` as a non-functional or future stub unless superseded.
* Human confirmation before AI output becomes official data.
* Strict input and output schemas.
* Prompt versioning.
* Timeout and controlled fallback.
* Prompt data minimization.
* No secrets in prompts or client code.
* Treat model output as untrusted input.
* No autonomous approval, booking, payment, moderation, or high-impact action.

## Testing

* Vitest for approved unit and component testing.
* Supertest for backend API testing.
* Testing Library for frontend components.
* MSW for frontend integration and contract-aligned mocks.
* Playwright for critical E2E flows.
* Deterministic `MockAIProvider` in CI.
* Positive and negative authorization coverage.
* Tests for business rules, validation, ownership, assignments, database constraints, migrations, seed idempotency, i18n, accessibility, and critical demo flows where applicable.
* Coverage is a signal, not a replacement for meaningful assertions.

## DevOps

* AWS deployment model approved in the DevOps design.
* AWS Amplify for frontend if still current in accepted documents.
* AWS App Runner for backend if still current in accepted documents.
* Amazon RDS PostgreSQL.
* Amazon S3 for approved object storage.
* AWS Secrets Manager and/or SSM for secrets.
* CloudWatch for operational logs.
* GitHub Actions for CI/CD.
* Docker for backend packaging.
* Local, CI, QA/Staging, and Demo environment separation.
* Prisma migration discipline during deployment.
* Reproducible seed/reset process.
* No Kubernetes, EKS, service mesh, multi-region, or enterprise deployment complexity for the MVP.

---

# 4. Required document characteristics

The generated `DEVELOPMENT_CONVENTIONS.md` must be:

* implementation-oriented;
* prescriptive where a decision is accepted;
* concise enough to be used frequently;
* detailed enough to prevent inconsistent implementation;
* readable by humans and coding agents;
* free of unresolved placeholder text;
* free of invented paths and commands;
* traceable to the approved architecture;
* explicit about MUST, SHOULD, MAY, and MUST NOT rules;
* explicit about which rules are automated and which require review.

Use RFC-style normative keywords:

* **MUST / DEBE**
* **MUST NOT / NO DEBE**
* **SHOULD / DEBERÍA**
* **SHOULD NOT / NO DEBERÍA**
* **MAY / PUEDE**

At the beginning of the document, explain how these terms are interpreted.

---

# 5. Required document structure

Use the following structure unless repository evidence requires a small adjustment.

## 1. Document metadata

Include:

* title;
* status;
* version;
* project;
* intended audience;
* scope;
* owner;
* review policy;
* last updated date;
* relation to ADRs and technical designs.

Do not invent a named individual as owner. Use a role such as `Tech Lead / Architecture Owner`.

## 2. Purpose

Explain:

* why the file exists;
* what it controls;
* what it does not replace;
* how coding agents must use it;
* that it applies to every Tech Spec and Development Task.

## 3. Source-of-truth hierarchy

Define conflict resolution explicitly.

At minimum:

1. Accepted ADRs.
2. Security and architecture documents.
3. API, Backend, Frontend, AI, Database, Testing, and DevOps designs.
4. `DEVELOPMENT_CONVENTIONS.md`.
5. User Story Tech Spec.
6. Development Tasks.
7. Implementation.

Clarify that lower levels may specialize but not silently contradict higher levels.

## 4. Scope and applicability

Cover:

* backend;
* frontend;
* database;
* API;
* AI integration;
* testing;
* security;
* DevOps;
* documentation;
* Git and review workflow.

## 5. General engineering principles

Include conventions for:

* clarity over cleverness;
* smallest coherent change;
* no unrelated refactors;
* explicit dependencies;
* avoiding premature abstractions;
* domain vocabulary;
* deterministic behavior;
* idempotency where applicable;
* separation of concerns;
* fail-safe behavior;
* observability;
* accessibility;
* internationalization;
* security by default;
* no silent scope expansion.

## 6. Repository organization

Document the actual structure found in the repository.

If parts have not been implemented:

* label the approved target structure;
* do not represent it as already existing;
* distinguish `Current` from `Target`.

Include rules for:

* root-level files;
* frontend location;
* backend location;
* Prisma location;
* shared packages, if they actually exist;
* tests;
* scripts;
* documentation;
* generated files;
* environment files.

## 7. General TypeScript conventions

Define at minimum:

* strict mode;
* `any`;
* `unknown`;
* type assertions;
* nullability;
* explicit public boundary types;
* interfaces versus type aliases, without dogmatic rules;
* enums versus literal unions according to repository decisions;
* naming;
* imports;
* exports;
* barrel files;
* path aliases;
* error typing;
* async functions;
* Promise handling;
* date handling;
* monetary values;
* generated types;
* comments and JSDoc;
* suppression directives such as `@ts-ignore`;
* dead code;
* lint disable comments.

Any exception must require a local explanation.

## 8. Backend conventions

Cover:

### Module organization

* domain-oriented modules;
* allowed layer dependencies;
* Interface;
* Application;
* Domain;
* Ports;
* Infrastructure;
* Shared Kernel.

### Domain layer

* domain purity;
* entities and value objects only when behavior justifies them;
* business invariants;
* no framework imports;
* domain errors;
* no leaking Prisma-generated types.

### Application layer

* one use case per user/system intent;
* input and output DTOs;
* orchestration;
* transaction boundaries;
* authorization policies;
* ports;
* idempotency;
* error translation boundaries.

### Interface / HTTP layer

* thin controllers;
* route definitions;
* validation;
* middleware order;
* error handler;
* no business rules in controllers;
* no Prisma calls in controllers.

### Infrastructure

* Prisma adapters;
* external providers;
* file storage adapters;
* logging;
* configuration;
* jobs;
* SDK isolation.

### Naming

Define patterns for:

* use cases;
* controllers;
* routes;
* repositories and ports;
* adapters;
* policies;
* schemas;
* mappers;
* jobs;
* errors;
* test files.

Do not prescribe a suffix if existing approved documentation uses a different consistent pattern.

### Dependency direction

Include an allowed dependency matrix or concise list.

### Transactions

Define:

* transaction ownership;
* avoiding transactions around external network calls;
* concurrency-sensitive operations;
* retry considerations;
* atomic persistence;
* Prisma transaction use.

## 9. API conventions

Summarize operational rules and point to the API Design Specification for full contracts.

Cover:

* URL naming;
* plural resources;
* path parameters;
* query parameters;
* pagination;
* filtering;
* sorting;
* dates;
* money;
* status codes;
* idempotency when applicable;
* success envelope;
* error envelope;
* error codes;
* correlation IDs;
* authentication;
* authorization;
* rate limits;
* upload endpoints;
* DTO versioning;
* backward-compatible changes;
* no persistence-model exposure.

Do not duplicate the entire API specification.

## 10. Frontend conventions

Cover:

### App Router organization

* route groups;
* layouts;
* pages;
* loading states;
* error boundaries;
* not-found states;
* private folders where useful;
* feature-first organization;
* colocated components only when ownership is clear.

### Server versus Client Components

* Server Components as default;
* minimum `"use client"` boundary;
* no unnecessary propagation of client boundaries;
* serializable props across the boundary;
* browser-only APIs confined to client code;
* no secrets in client bundles.

### Data access

* REST client location;
* DTOs;
* mappers;
* frontend models;
* TanStack Query for remote state;
* query key factories;
* invalidation;
* mutations;
* optimistic updates only when rollback behavior is clear;
* no direct ad hoc fetch logic duplicated across components;
* no business authorization decisions in UI.

### Forms

* React Hook Form;
* Zod;
* server error mapping;
* field-level errors;
* accessible labels;
* submit state;
* duplicate submission prevention;
* unsaved-change behavior where relevant.

### State classification

Clearly distinguish:

* server state;
* form state;
* URL state;
* local UI state;
* session state.

Do not introduce global state by default.

### Components

Define conventions for:

* component responsibility;
* naming;
* props;
* composition;
* hooks;
* presentation versus feature components;
* design tokens;
* Tailwind usage;
* avoiding arbitrary values when tokens exist;
* responsive behavior;
* loading, empty, error, and success states.

### Accessibility

Include:

* semantic HTML;
* keyboard behavior;
* visible focus;
* labels;
* accessible names;
* modal/dialog focus management;
* live regions where appropriate;
* contrast;
* reduced motion;
* automated and manual checks.

### i18n and currency

Include:

* no hardcoded user-facing strings;
* locale-aware formatting;
* supported locales;
* translation key conventions;
* no automatic currency conversion;
* event currency immutability reflected in UI.

### SEO and public pages

Include:

* metadata;
* canonical behavior where approved;
* Server Components;
* public vendor pages;
* image optimization;
* semantic headings.

## 11. Database and Prisma conventions

Cover:

* naming mappings;
* UUIDs;
* timestamps;
* monetary values;
* enums;
* nullability;
* foreign keys;
* delete behavior;
* indexes;
* unique constraints;
* check constraints;
* JSONB;
* soft delete;
* audit fields;
* `is_seed`;
* ownership fields;
* migration naming;
* migration review;
* forward migrations;
* data backfills;
* destructive changes;
* rollback strategy;
* generated Prisma client;
* transaction boundaries;
* raw SQL safety;
* query selection;
* avoiding N+1 queries;
* pagination;
* deterministic seeds.

Clearly distinguish invariants enforced by:

* PostgreSQL;
* Prisma schema;
* Application layer;
* authorization policies.

## 12. AI integration conventions

Cover:

* `LLMProvider`;
* adapter boundaries;
* prompt registry;
* prompt versioning;
* typed input/output schemas;
* output validation;
* timeout;
* fallback;
* deterministic mocks;
* human-in-the-loop status;
* accepted/edited/rejected/discarded handling;
* prompt injection mitigation;
* minimization and redaction;
* correlation IDs;
* logging without sensitive payload leakage;
* no autonomous high-impact actions.

## 13. Security conventions

Cover:

* HTTP-only cookies;
* no browser token storage;
* RBAC;
* ownership;
* assignment-based access;
* admin audit;
* Zod boundary validation;
* CORS;
* CSRF according to the approved session strategy;
* rate limiting;
* captcha;
* password hashing;
* password reset tokens;
* secrets;
* logs;
* file upload allowlists;
* payload limits;
* safe errors;
* safe Prisma access;
* dependency review;
* prompt security.

Clarify that frontend authorization is never sufficient.

## 14. Testing conventions

Define:

* test pyramid for EventFlow;
* what belongs in unit, integration, API, component, contract, and E2E tests;
* file naming;
* test structure;
* Arrange / Act / Assert where useful;
* deterministic test data;
* no reliance on execution order;
* cleanup;
* database test isolation;
* `MockAIProvider`;
* MSW alignment with real DTOs;
* authorization matrix testing;
* negative tests;
* migration tests;
* seed tests;
* accessibility tests;
* i18n tests;
* smoke and demo readiness tests;
* meaningful coverage;
* flaky test handling;
* prohibited test patterns.

## 15. Observability conventions

Cover:

* structured logs;
* log levels;
* correlation IDs;
* request context;
* redaction;
* no secrets or passwords;
* admin audit events;
* AI trace fields;
* operational errors versus expected domain errors;
* metrics where already approved;
* frontend error reporting boundaries.

## 16. DevOps and environment conventions

Cover:

* environment classification;
* environment variable naming;
* `.env.example`;
* secrets;
* local development;
* Docker image rules;
* non-root execution where applicable;
* small and reproducible images;
* dependency locking;
* health checks;
* build and start commands;
* migration execution;
* seed execution;
* GitHub Actions gates;
* frontend deployment;
* backend deployment;
* database deployment;
* S3;
* CloudWatch;
* rollback;
* deployment verification;
* demo mode;
* no secrets in repository or build logs.

Use actual repository commands. If commands do not exist, identify them as required conventions without inventing completed scripts.

## 17. Git and change-management conventions

Define:

* branch naming;
* association with `US-XXX`, `PB-PX-XXX`, and task IDs where applicable;
* commit message strategy based on existing repository practice;
* Conventional Commits only if consistent with repository decisions or explicitly marked as recommended;
* focused commits;
* no generated noise;
* no unrelated refactors;
* pull request expectations;
* code review checklist;
* migration review;
* security review;
* documentation updates;
* no automatic commit or push by coding agents unless explicitly requested.

## 18. Definition of Ready for implementation

Include requirements such as:

* User Story exists.
* Acceptance Criteria are testable.
* Tech Spec exists.
* Development Tasks exist.
* Dependencies are known.
* Blocking decisions are resolved.
* Alignment with conventions is verified.

## 19. Definition of Done

A task is not `Done` merely because code exists.

Define completion requirements for:

* implementation;
* tests;
* lint;
* typecheck;
* build where applicable;
* security;
* authorization;
* accessibility;
* i18n;
* migrations;
* seed;
* documentation;
* execution evidence;
* acceptance criteria;
* no unresolved critical deviations.

## 20. Exceptions and deviations

Define the required process:

1. Identify the convention.
2. Explain why it cannot be followed.
3. Document alternatives.
4. Assess impact.
5. Determine whether Tech Spec update is sufficient.
6. Determine whether an ADR is required.
7. Do not continue silently when the deviation changes architecture.

## 21. Enforcement matrix

Create a table with columns similar to:

* Convention area.
* Rule.
* Enforcement mechanism.
* Tool/configuration.
* CI gate.
* Manual review required.
* Source document.

Examples of enforcement:

* TypeScript compiler.
* ESLint.
* Prettier.
* Prisma validation.
* database migration test.
* Vitest.
* Supertest.
* Playwright.
* GitHub Actions.
* code review.
* security review.
* execution skill.

## 22. Traceability

Provide a compact mapping from convention sections to the technical source documents.

Do not duplicate entire requirement catalogs.

## 23. Implementation checklist

Provide a final checklist that coding agents and reviewers can apply per task or PR.

---

# 6. Mandatory quality rules

The generated document MUST NOT:

* invent repository paths;
* invent package manager commands;
* invent package versions;
* invent AWS resources not approved by the DevOps design;
* introduce new libraries without evidence;
* convert recommended technology into approved technology without labeling it;
* contradict accepted ADRs;
* copy hundreds of lines from source documents;
* include business requirements unrelated to development conventions;
* contain unresolved placeholders;
* contain vague instructions such as “follow best practices” without defining the expected behavior;
* claim automation exists when it does not;
* modify application code;
* modify architecture documents;
* modify Tech Specs;
* modify Development Tasks.

The generated document SHOULD:

* link to repository documents using relative paths;
* be understandable without external context;
* distinguish mandatory rules from recommendations;
* distinguish current enforcement from desired enforcement;
* remain practical for daily use;
* use examples sparingly and only when they clarify a convention.

---

# 7. Repository-change policy

For this execution:

* Create or update only `DEVELOPMENT_CONVENTIONS.md`.
* Do not install packages.
* Do not run destructive commands.
* Do not modify application source code.
* Do not modify CI configuration.
* Do not create hooks.
* Do not modify existing technical documents.
* Do not commit or push changes.

You may run safe read-only inspection commands.

If `DEVELOPMENT_CONVENTIONS.md` already exists:

1. Read it completely.
2. Preserve valid project-specific content.
3. Reconcile it with approved documents.
4. Improve it in place.
5. Do not replace it with a generic rewrite.

---

# 8. Validation before completion

Before finishing, perform a self-review against the following questions:

* Does every mandatory technology decision match EventFlow documentation?
* Did you distinguish current repository reality from target architecture?
* Did you avoid introducing unapproved frameworks?
* Are frontend conventions compatible with Next.js App Router?
* Are backend dependencies compatible with Clean/Hexagonal Architecture?
* Is Prisma isolated from Domain and Application contracts?
* Are database conventions compatible with PostgreSQL?
* Are security controls aligned with the Security Design?
* Are testing conventions aligned with the Testing Strategy?
* Are DevOps conventions aligned with the AWS design?
* Are AI rules human-in-the-loop?
* Does the document define Definition of Ready and Definition of Done?
* Does it define deviations and ADR escalation?
* Can an AI coding agent use it without guessing?
* Are all links relative and valid?
* Is the document internally consistent?
* Does it avoid claiming that absent automation already exists?

Fix all detected issues before finalizing the file.

---

# 9. Final response

After creating the file, return a concise implementation report containing:

* created or updated path;
* documents inspected;
* repository configuration inspected;
* major convention areas consolidated;
* external official sources consulted;
* conflicts discovered;
* how each conflict was resolved;
* recommendations that were labeled rather than imposed;
* any missing enforcement configuration detected;
* confirmation that no application code or unrelated file was changed.

Do not paste the entire generated file in the response unless explicitly requested.
