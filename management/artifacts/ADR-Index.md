<!-- GENERADO por scripts/generate-adr-index.mjs — NO editar a mano. -->
<!-- Fuente de verdad: docs/22-Architecture-Decision-Records.md (## 6. Inventario de ADRs). -->
<!-- Regenerar: `node scripts/generate-adr-index.mjs`; validar: `node scripts/generate-adr-index.mjs --check`. -->

# 📇 Índice maestro de ADRs — EventFlow

> Índice **navegable** de los Architecture Decision Records (ADRs) de EventFlow, derivado
> automáticamente del ADR Log canónico
> [`docs/22-Architecture-Decision-Records.md`](../../docs/22-Architecture-Decision-Records.md). Este índice **no reemplaza** el
> Doc 22 (fuente de verdad); lo resume y enlaza para la evaluación académica (EPIC-ACAD-001,
> US-147 / PB-P2-025).

## Resumen

| Métrica | Valor |
| --- | ---: |
| ADRs totales en el inventario | 47 |
| `Accepted` | 46 |
| `Superseded` | 1 |
| Categorías | 9 |

> Umbral de la historia: ≥5 ADRs aceptados (VR-01). Estado actual: **46 `Accepted`**.

## Categorías

- [Architecture](#architecture) — 4 ADR(s)
- [Backend](#backend) — 4 ADR(s)
- [Frontend](#frontend) — 4 ADR(s)
- [Database](#database) — 5 ADR(s)
- [AI](#ai) — 8 ADR(s)
- [Security](#security) — 6 ADR(s)
- [API](#api) — 4 ADR(s)
- [Testing](#testing) — 4 ADR(s)
- [DevOps](#devops) — 8 ADR(s)

## Architecture

| ADR | Título | Estado |
| --- | --- | --- |
| [ADR-ARCH-001](../../docs/22-Architecture-Decision-Records.md#adr-arch-001--use-modular-monolith-for-mvp) | Use Modular Monolith for MVP | Accepted |
| [ADR-ARCH-002](../../docs/22-Architecture-Decision-Records.md#adr-arch-002--apply-clean--hexagonal-architecture-inside-backend-modules) | Apply Clean / Hexagonal Architecture Inside Backend Modules | Accepted |
| [ADR-ARCH-003](../../docs/22-Architecture-Decision-Records.md#adr-arch-003--use-rest-json-api-instead-of-graphql-trpc-grpc-or-websockets) | Use REST JSON API Instead of GraphQL, tRPC, gRPC, or WebSockets | Accepted |
| [ADR-ARCH-004](../../docs/22-Architecture-Decision-Records.md#adr-arch-004--keep-mvp-free-of-marketplace-transactional-capabilities) | Keep MVP Free of Marketplace Transactional Capabilities | Accepted |

## Backend

| ADR | Título | Estado |
| --- | --- | --- |
| [ADR-BE-001](../../docs/22-Architecture-Decision-Records.md#adr-be-001--use-nodejs--express--typescript-for-backend) | Use Node.js + Express + TypeScript for Backend | Accepted |
| [ADR-BE-002](../../docs/22-Architecture-Decision-Records.md#adr-be-002--use-prisma-as-orm-and-keep-prisma-in-infrastructure-layer) | Use Prisma as ORM and Keep Prisma in Infrastructure Layer | Accepted |
| [ADR-BE-003](../../docs/22-Architecture-Decision-Records.md#adr-be-003--enforce-business-rules-in-applicationdomain-layers-not-controllers) | Enforce Business Rules in Application/Domain Layers, Not Controllers | Accepted |
| [ADR-BE-004](../../docs/22-Architecture-Decision-Records.md#adr-be-004--use-simple-scheduled-jobs-instead-of-queues-for-mvp) | Use Simple Scheduled Jobs Instead of Queues for MVP | Accepted |

## Frontend

| ADR | Título | Estado |
| --- | --- | --- |
| [ADR-FE-001](../../docs/22-Architecture-Decision-Records.md#adr-fe-001--use-nextjs--typescript--app-router) | Use Next.js + TypeScript + App Router | Accepted |
| [ADR-FE-002](../../docs/22-Architecture-Decision-Records.md#adr-fe-002--use-rest-consumption-with-tanstack-query) | Use REST Consumption with TanStack Query | Accepted |
| [ADR-FE-003](../../docs/22-Architecture-Decision-Records.md#adr-fe-003--treat-frontend-authorization-as-ux-only-not-source-of-truth) | Treat Frontend Authorization as UX Only, Not Source of Truth | Accepted |
| [ADR-FE-004](../../docs/22-Architecture-Decision-Records.md#adr-fe-004--prepare-public-vendor-profile-architecture-for-future-seo) | Prepare Public Vendor Profile Architecture for Future SEO | Accepted |

## Database

| ADR | Título | Estado |
| --- | --- | --- |
| [ADR-DB-001](../../docs/22-Architecture-Decision-Records.md#adr-db-001--use-postgresql-as-primary-database) | Use PostgreSQL as Primary Database | Accepted |
| [ADR-DB-002](../../docs/22-Architecture-Decision-Records.md#adr-db-002--use-uuid-v4-as-primary-identifier-strategy) | Use UUID v4 as Primary Identifier Strategy | Accepted |
| [ADR-DB-003](../../docs/22-Architecture-Decision-Records.md#adr-db-003--use-relational-modeling-with-jsonb-only-for-bounded-payloads) | Use Relational Modeling with JSONB Only for Bounded Payloads | Accepted |
| [ADR-DB-004](../../docs/22-Architecture-Decision-Records.md#adr-db-004--use-soft-delete-for-historical-or-moderated-entities) | Use Soft Delete for Historical or Moderated Entities | Accepted |
| [ADR-DB-005](../../docs/22-Architecture-Decision-Records.md#adr-db-005--use-prisma-migrations-with-raw-sql-only-for-unsupported-constraints) | Use Prisma Migrations with Raw SQL Only for Unsupported Constraints | Accepted |

## AI

| ADR | Título | Estado |
| --- | --- | --- |
| [ADR-AI-001](../../docs/22-Architecture-Decision-Records.md#adr-ai-001--use-llmprovider-abstraction) | Use LLMProvider Abstraction | Accepted |
| [ADR-AI-002](../../docs/22-Architecture-Decision-Records.md#adr-ai-002--use-openaiprovider-as-primary-mvp-provider) | Use OpenAIProvider as Primary MVP Provider | Accepted |
| [ADR-AI-003](../../docs/22-Architecture-Decision-Records.md#adr-ai-003--use-mockaiprovider-for-demo-testing-and-controlled-fallback) | Use MockAIProvider for Demo, Testing, and Controlled Fallback | Accepted |
| [ADR-AI-004](../../docs/22-Architecture-Decision-Records.md#adr-ai-004--keep-anthropicprovider-as-stub-for-mvp) | Keep AnthropicProvider as Stub for MVP | Accepted |
| [ADR-AI-005](../../docs/22-Architecture-Decision-Records.md#adr-ai-005--enforce-human-in-the-loop-for-all-ai-outputs) | Enforce Human-in-the-Loop for All AI Outputs | Accepted |
| [ADR-AI-006](../../docs/22-Architecture-Decision-Records.md#adr-ai-006--version-prompts-through-prompt-registry-and-aipromptversion) | Version Prompts Through Prompt Registry and AIPromptVersion | Accepted |
| [ADR-AI-007](../../docs/22-Architecture-Decision-Records.md#adr-ai-007--enforce-strict-json-schema-validation-for-ai-outputs) | Enforce Strict JSON Schema Validation for AI Outputs | Accepted |
| [ADR-AI-008](../../docs/22-Architecture-Decision-Records.md#adr-ai-008--do-not-implement-free-form-conversational-chatbot-in-mvp) | Do Not Implement Free-Form Conversational Chatbot in MVP | Accepted |

## Security

| ADR | Título | Estado |
| --- | --- | --- |
| [ADR-SEC-001](../../docs/22-Architecture-Decision-Records.md#adr-sec-001--prevent-injection-and-token-exposure-across-api-database-session-and-ai-boundaries) | Prevent Injection and Token Exposure Across API, Database, Session, and AI Boundaries | Accepted |
| [ADR-SEC-002](../../docs/22-Architecture-Decision-Records.md#adr-sec-002--use-http-only-signed-session-cookies) | Use HTTP-Only Signed Session Cookies | Accepted |
| [ADR-SEC-003](../../docs/22-Architecture-Decision-Records.md#adr-sec-003--enforce-rbac--ownership--assignment-based-authorization-in-backend) | Enforce RBAC + Ownership + Assignment-Based Authorization in Backend | Accepted |
| [ADR-SEC-004](../../docs/22-Architecture-Decision-Records.md#adr-sec-004--use-captcha-and-rate-limiting-for-sensitive-flows) | Use Captcha and Rate Limiting for Sensitive Flows | Accepted |
| [ADR-SEC-005](../../docs/22-Architecture-Decision-Records.md#adr-sec-005--keep-secrets-only-in-backend-environment--secret-manager) | Keep Secrets Only in Backend Environment / Secret Manager | Accepted |
| [ADR-SEC-006](../../docs/22-Architecture-Decision-Records.md#adr-sec-006--apply-csrf-cors-security-headers-and-safe-error-handling) | Apply CSRF, CORS, Security Headers, and Safe Error Handling | Accepted |

## API

| ADR | Título | Estado |
| --- | --- | --- |
| [ADR-API-001](../../docs/22-Architecture-Decision-Records.md#adr-api-001--use-apiv1-url-versioning) | Use /api/v1 URL Versioning | Accepted |
| [ADR-API-002](../../docs/22-Architecture-Decision-Records.md#adr-api-002--use-standard-response-and-error-envelopes) | Use Standard Response and Error Envelopes | Accepted |
| [ADR-API-003](../../docs/22-Architecture-Decision-Records.md#adr-api-003--use-zod-for-request-dto-validation) | Use Zod for Request DTO Validation | Accepted |
| [ADR-API-004](../../docs/22-Architecture-Decision-Records.md#adr-api-004--use-correlation-id-across-requests-logs-and-errors) | Use Correlation ID Across Requests, Logs, and Errors | Accepted |

## Testing

| ADR | Título | Estado |
| --- | --- | --- |
| [ADR-TEST-001](../../docs/22-Architecture-Decision-Records.md#adr-test-001--use-vitest--supertest-for-backend-testing) | Use Vitest + Supertest for Backend Testing | Accepted |
| [ADR-TEST-002](../../docs/22-Architecture-Decision-Records.md#adr-test-002--use-msw--playwright-for-frontend-and-e2e-testing) | Use MSW + Playwright for Frontend and E2E Testing | Accepted |
| [ADR-TEST-003](../../docs/22-Architecture-Decision-Records.md#adr-test-003--use-mockaiprovider-for-deterministic-ai-tests) | Use MockAIProvider for Deterministic AI Tests | Accepted |
| [ADR-TEST-004](../../docs/22-Architecture-Decision-Records.md#adr-test-004--include-negative-authorization-and-security-tests-as-quality-gate) | Include Negative Authorization and Security Tests as Quality Gate | Accepted |

## DevOps

| ADR | Título | Estado |
| --- | --- | --- |
| [ADR-DEVOPS-001](../../docs/22-Architecture-Decision-Records.md#adr-devops-001--use-aws-for-mvp-deployment) | Use AWS for MVP Deployment | Accepted |
| [ADR-DEVOPS-002](../../docs/22-Architecture-Decision-Records.md#adr-devops-002--deploy-frontend-on-aws-amplify-hosting) | Deploy Frontend on AWS Amplify Hosting | Accepted |
| [ADR-DEVOPS-003](../../docs/22-Architecture-Decision-Records.md#adr-devops-003--deploy-backend-docker-container-on-aws-app-runner) | Deploy Backend Docker Container on AWS App Runner | Superseded (por [ADR-DEVOPS-008](../../docs/22-Architecture-Decision-Records.md#adr-devops-008--deploy-backend-on-ec2-docker--caddy-tls-for-free-tier-mvp)) |
| [ADR-DEVOPS-004](../../docs/22-Architecture-Decision-Records.md#adr-devops-004--use-amazon-rds-postgresql-for-managed-database) | Use Amazon RDS PostgreSQL for Managed Database | Accepted |
| [ADR-DEVOPS-005](../../docs/22-Architecture-Decision-Records.md#adr-devops-005--use-s3-for-file-storage) | Use S3 for File Storage | Accepted |
| [ADR-DEVOPS-006](../../docs/22-Architecture-Decision-Records.md#adr-devops-006--use-github-actions-for-cicd) | Use GitHub Actions for CI/CD | Accepted |
| [ADR-DEVOPS-007](../../docs/22-Architecture-Decision-Records.md#adr-devops-007--use-cloudwatch-for-mvp-logging-and-operational-visibility) | Use CloudWatch for MVP Logging and Operational Visibility | Accepted |
| [ADR-DEVOPS-008](../../docs/22-Architecture-Decision-Records.md#adr-devops-008--deploy-backend-on-ec2-docker--caddy-tls-for-free-tier-mvp) | Deploy Backend on EC2 (Docker + Caddy TLS) for Free-Tier MVP | Accepted |

## Mantenimiento y sincronización (índice vivo)

Este índice se mantiene **sincronizado** con el Doc 22 mediante un generador determinista:

1. **Fuente de verdad:** la tabla `## 6. Inventario de ADRs` del
   [`Doc 22`](../../docs/22-Architecture-Decision-Records.md). Cualquier alta, cambio de estado o `Superseded` se hace **allí**.
2. **Regenerar el índice** tras editar el Doc 22:
   ```bash
   node scripts/generate-adr-index.mjs
   ```
3. **Validar cobertura** (no destructivo; útil en revisión o CI opcional, AC-05):
   ```bash
   node scripts/generate-adr-index.mjs --check
   ```
   Falla (exit 1) si el índice quedó desactualizado (EC-01) o si algún ADR del inventario
   no tiene su sección detallada. La validación es **no bloqueante** por diseño (se sugiere
   `continue-on-error: true` si se cablea en un workflow).
4. **`Superseded` (EC-02):** el estado se copia verbatim del Doc 22 y el ADR que lo reemplaza
   (p. ej. `ADR-DEVOPS-008`) queda **enlazado** automáticamente a su ancla.

> Los anclas se derivan con el mismo algoritmo de slug de GitHub aplicado al encabezado
> `## <id> — <título>` del Doc 22, por lo que la navegación permanece estable mientras el
> título no cambie. Si un título cambia en el Doc 22, regenerar este índice actualiza el ancla.

