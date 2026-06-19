# Technical Specification: US-111 - Middleware Chain Order

## 1. Metadata

| Field | Value |
| --- | --- |
| Technical Spec ID | US-111-technical-spec |
| User Story | US-111 - Middleware chain order |
| User Story Path | `management/user-stories/US-111-middleware-chain-order.md` |
| User Story Status | Approved |
| Approval Date | 2026-06-16 |
| Approved By | Product Owner / Business Analyst Review |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-111-decision-resolution.md` |
| Product Backlog ID | PB-P0-007 |
| Product Backlog Title | Rate Limiting & Middleware Chain |
| Priority | P0 - Must Have |
| Execution Order | 7 |
| User Story Position in Backlog Item | 2 of 2 |
| Epic | EPIC-SEC-001 |
| Module / Domain | Security / Backend Platform |
| Feature | Middleware chain order |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-16 |

## 2. Backlog Execution Context

US-111 belongs to PB-P0-007, which covers rate limiting, middleware chain safety, and security headers for the EventFlow backend.

PB-P0-007 execution context:

| Attribute | Value |
| --- | --- |
| Priority | P0 |
| Execution Order | 7 |
| Parent Epic | EPIC-SEC-001 |
| Related User Stories | US-110, US-111 |
| This Story Position | 2 of 2 |
| Dependency | PB-P0-006 |

Execution relationship:

- US-110 defines rate limiting policies for sensitive auth and AI endpoints.
- US-111 defines and verifies the deterministic middleware chain order where those policies are applied.
- US-111 must not redefine rate limit thresholds, rate limit keying, CAPTCHA provider behavior, auth cookie behavior, or endpoint business logic.

Backlog mapping was found and is aligned with the approved user story. The decision resolution artifact confirms no blockers remain.

## 3. Executive Technical Summary

US-111 requires the backend Express application to enforce a deterministic middleware chain so security, authorization, validation, observability, and error handling cannot be bypassed by unsafe route composition.

The implementation should harden:

- Global middleware order for correlation, logging, CORS, Helmet, body parsing, rate limiting, routes, `notFoundMiddleware`, and `errorHandlerMiddleware`.
- Protected route middleware order: `authMiddleware -> roleMiddleware -> ownershipMiddleware/assignmentMiddleware -> policyMiddleware -> validateRequestMiddleware -> handler`.
- Public sensitive route composition so anti-abuse controls and validation execute before auth handlers where applicable.
- Secure error handling so all middleware and route failures flow through the final error handler with a consistent envelope and `correlationId`.
- Regression tests that fail when middleware order is changed in an unsafe way.

No new business endpoint, database table, AI capability, marketplace flow, payment flow, or frontend authorization model is introduced.

## 4. Scope Boundary

### In Scope

- Express global middleware composition and deterministic ordering.
- Route-level middleware composition for protected and public sensitive routes.
- Global `helmet` and CORS activation according to security design.
- Positioning of `notFoundMiddleware` after routes and before `errorHandlerMiddleware`.
- Positioning of `errorHandlerMiddleware` as the final middleware.
- Regression tests proving order and short-circuit behavior.
- Correlation ID propagation through success, rejection, not found, and error paths.
- Secure error response envelope without stack traces, secrets, tokens, cookies, prompts, or PII.

### Out of Scope

- Rate limiting thresholds, windows, keying, storage backend, or per-endpoint policy values. Covered by US-110.
- CAPTCHA provider selection, token lifecycle, score policy, or endpoint eligibility. Covered by US-109.
- HttpOnly cookie configuration and auth cookie migration. Covered by US-108.
- New API endpoints or domain business behavior.
- Database schema changes.
- AI recommendation behavior, prompt engineering, RAG, autonomous AI decisions, or AI persistence changes.
- WAF, API gateway, enterprise Redis architecture, OAuth, MFA, SSO, native mobile apps, payments, contracts, marketplace transaction logic, WhatsApp integration, or real-time chat.

## 5. Architecture Alignment

### Backend Architecture

US-111 aligns with the backend interface layer. The change belongs in Express app composition, route composition helpers, and middleware tests.

Relevant architecture principles:

- Backend remains the source of truth for authentication, authorization, ownership, assignment, and policy enforcement.
- Controllers and handlers must not execute when auth, role, ownership, policy, anti-abuse, or validation middleware rejects the request.
- Middleware order must be centralized or declarative enough to be tested and reviewed.

Expected backend touchpoints:

- Express application setup.
- Shared middleware modules.
- Route modules under `/api/v1/*`.
- Protected route composition helpers or route registration utilities.
- Integration and middleware regression tests.

### Frontend Architecture

No frontend behavior is required. The frontend continues consuming existing API response envelopes and status codes.

Frontend must not become the source of truth for authorization or ownership. Any client-side route guards remain user experience helpers only.

### Database Architecture

No database schema, Prisma model, migration, seed data, or repository contract change is required.

### API Architecture

No API contract expansion is required. Existing `/api/v1/*` endpoints are affected only by safer middleware execution order and consistent error envelopes.

### Security Architecture

US-111 aligns with:

- ADR-SEC-001 for security baseline.
- ADR-SEC-003 for backend authorization boundaries.
- ADR-SEC-004 for secure auth behavior.
- ADR-SEC-006 for CORS, Helmet, and secure error envelopes.
- NFR-SEC-001, NFR-SEC-002, NFR-SEC-003, NFR-SEC-004, and NFR-SEC-007.

### Testing Architecture

US-111 requires dedicated regression tests because order regressions are easy to introduce during route additions. Tests should be part of the normal backend test suite and CI gate.

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation |
| --- | --- |
| AC-01 Global middleware order is deterministic | Express app setup must register global middleware in a stable order that can be verified by tests. |
| AC-02 Protected route order prevents bypass | Protected routes must compose auth before role, role before ownership or assignment, ownership or assignment before policy, policy before validation, and validation before handler. |
| AC-03 Public sensitive routes apply anti-abuse controls | Auth-sensitive public routes must execute applicable rate limiting, CAPTCHA, and validation before handler execution. |
| AC-04 Helmet and CORS are global | Helmet and CORS must be mounted globally with environment-aware configuration. |
| AC-05 Error handler is always last | Any thrown or forwarded error must reach the final error handler and return a safe envelope with `correlationId`. |
| AC-06 Not found middleware position is correct | `notFoundMiddleware` must execute after all routes and before `errorHandlerMiddleware`. |
| AC-07 Regression tests fail unsafe reorder | Test coverage must detect unsafe order changes, omitted auth, validation-before-auth, ownership-before-auth, and handler execution after rejection. |
| AC-08 Observability preserves correlation and redaction | Request and error logs must preserve correlation IDs and avoid sensitive data. |

## 7. Backend Technical Design

### 7.1 Application Composition

The Express application should expose a single canonical app composition path. The expected global order is:

1. `correlationIdMiddleware`
2. `requestLoggerMiddleware`
3. JSON/body parser with configured size limits
4. `corsMiddleware`
5. `helmet`
6. Global or route-aware `rateLimitMiddleware`, as applicable from US-110
7. `/api/v1` routes
8. `notFoundMiddleware`
9. `errorHandlerMiddleware`

If the current implementation registers body parser before CORS/Helmet following existing Doc 14 guidance, that is acceptable only if tests confirm CORS/Helmet still apply globally and the final chain remains deterministic. The implementation must not silently drift from the approved order without an explicit documented reason.

### 7.2 Protected Route Composition

Protected routes must use this route-level order:

1. `authMiddleware`
2. `roleMiddleware`
3. `ownershipMiddleware` or `assignmentMiddleware`, where applicable
4. `policyMiddleware`, where applicable
5. `validateRequestMiddleware`
6. Controller handler

Implementation should prefer a centralized route composition helper or declarative route registration pattern over repeated ad hoc arrays. The goal is to make incorrect order difficult to introduce and easy to test.

Examples of acceptable implementation directions:

- `composeProtectedRoute({ roles, ownership, policy, validation, handler })`
- Route metadata registry with generated middleware arrays.
- Explicit route arrays plus invariant tests that inspect registered order.

The technical tasks should choose the option that best matches the existing backend codebase.

### 7.3 Public Sensitive Route Composition

Public sensitive routes, especially authentication-related endpoints, must not use `authMiddleware` unless they are protected by design. They must compose applicable anti-abuse controls before handler execution.

Canonical pattern:

1. Applicable `rateLimitMiddleware`
2. Applicable `captchaVerificationMiddleware`
3. `validateRequestMiddleware`
4. Controller handler

US-111 verifies composition order only. Endpoint eligibility, threshold values, keying, and CAPTCHA provider behavior remain owned by US-109 and US-110.

### 7.4 Error Handling

All synchronous and asynchronous middleware or handler failures must be forwarded to `errorHandlerMiddleware`.

Error responses must use the established safe envelope:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Safe user-facing message",
    "details": {},
    "correlationId": "request-correlation-id"
  }
}
```

Implementation constraints:

- `errorHandlerMiddleware` must be registered after `notFoundMiddleware`.
- Stack traces must not be returned in production.
- Secrets, tokens, cookies, prompts, provider payloads, and PII must not be included in error responses.
- The handler must preserve `correlationId` even for validation, auth, authorization, not found, and unexpected errors.

### 7.5 Short-Circuit Behavior

Tests must prove handlers are not executed when a prior middleware rejects the request.

Required short-circuit scenarios:

- Missing authentication returns 401 before role, ownership, validation, or handler.
- Insufficient role returns 403 before ownership, validation, or handler.
- Failed ownership or assignment returns the configured safe 403 or masked 404 before validation or handler.
- Invalid protected request body from anonymous user returns 401, not 400.
- Invalid protected request body from unauthorized user returns auth or authorization failure before validation failure.
- Unknown routes reach `notFoundMiddleware`, then `errorHandlerMiddleware`.

### 7.6 Suggested Backend Files

Exact paths must be confirmed during task execution. Likely areas:

- `src/app.ts` or equivalent Express app factory.
- `src/server.ts` or equivalent server bootstrap.
- `src/shared/middleware/*` or `src/shared/interface/middlewares/*`.
- `src/routes/*` or `src/api/v1/*`.
- `src/shared/http/errors/*`.
- Backend test folders for middleware, app integration, and API security regression tests.

## 8. Frontend Technical Design

No frontend implementation is expected.

Frontend considerations:

- Existing API clients should continue handling the current error envelope.
- UI behavior may observe more correct 401, 403, 404, or 429 responses due to safer backend ordering.
- Frontend route guards must remain non-authoritative.
- No new UI, page, component, form, store, route, or design system update is required.

## 9. API Contract Design

US-111 does not introduce new endpoints or payload fields. It hardens execution order across existing endpoints.

| API Surface | Method | Contract Change | Expected Middleware Behavior |
| --- | --- | --- | --- |
| `/api/v1/*` | All | No endpoint schema change | Global correlation, logging, CORS, Helmet, routes, not found, and error handling apply consistently. |
| Protected routes | Existing methods | No endpoint schema change | `auth -> role -> ownership/assignment -> policy -> validation -> handler`. |
| Public sensitive auth routes | Existing methods | No endpoint schema change | Applicable anti-abuse and validation execute before handler. |
| Unknown routes | All | No endpoint schema change | `notFoundMiddleware` returns safe 404 envelope with `correlationId`. |
| Error paths | All | No endpoint schema change | `errorHandlerMiddleware` returns safe error envelope without internals. |

Expected status code behavior:

- `401 Unauthorized` for unauthenticated protected access.
- `403 Forbidden` for authenticated users without required role or permission.
- `404 Not Found` for unknown routes and for masked ownership failures where required by existing security policy.
- `400 Bad Request` for validation failures only after authentication and authorization checks pass on protected routes.
- `429 Too Many Requests` where US-110 rate limiting applies.
- `500 Internal Server Error` for unexpected failures, using a safe envelope.

## 10. Database / Prisma Design

No database or Prisma changes are required.

| Area | Impact |
| --- | --- |
| Prisma schema | No change |
| Migrations | No change |
| Seed data | No change |
| Repositories | No change |
| Transactions | No change |
| Audit tables | No new table required |

If existing audit or log persistence exists, US-111 may rely on it indirectly through current middleware. It must not introduce new persistence requirements.

## 11. AI / PromptOps Design

US-111 has no AI generation, prompt, provider, model, RAG, vector database, or autonomous decision behavior.

AI-related constraints:

- No `LLMProvider` integration change.
- No `AIRecommendation` schema change.
- No prompt template change.
- No AI audit event change.
- No autonomous AI decision path.

The middleware chain must still protect any existing AI endpoints according to their existing auth, authorization, validation, and rate limiting requirements.

## 12. Security & Authorization Design

### 12.1 Backend Source of Truth

The backend must remain the only authoritative enforcement point for:

- Authentication.
- Role authorization.
- Ownership checks.
- Assignment checks.
- Policy checks.
- Protected-route validation ordering.

### 12.2 Required Protected Order

Protected endpoints must follow:

```text
authMiddleware
-> roleMiddleware
-> ownershipMiddleware / assignmentMiddleware
-> policyMiddleware
-> validateRequestMiddleware
-> handler
```

Security rationale:

- Role checks require a trusted authenticated identity.
- Ownership and assignment checks require a trusted authenticated identity and role context.
- Policy checks require identity, role, and domain access context.
- Validation must not leak endpoint existence or schema rules to anonymous or unauthorized users.
- Handlers must never execute before security gates pass.

### 12.3 Global Security Middleware

Global chain must include:

- CORS allowlist behavior according to ADR-SEC-006.
- Helmet or equivalent security headers according to ADR-SEC-006.
- Body size limits before route handlers process payloads.
- Rate limiting where applicable, with policy details from US-110.

### 12.4 Secure Errors

The error handler must:

- Return safe messages.
- Include `correlationId`.
- Avoid stack traces in production responses.
- Avoid secrets, tokens, cookies, prompts, third-party payloads, and PII.
- Preserve existing 401, 403, 404, 400, 429, and 500 semantics.

### 12.5 Negative Security Scenarios

Development tasks must include tests for:

- Route configured with `roleMiddleware` but without prior `authMiddleware`.
- Route configured with ownership or assignment before `authMiddleware`.
- Validation executed before auth on protected routes.
- Handler execution after auth rejection.
- Handler execution after role rejection.
- Handler execution after ownership or policy rejection.
- Error response exposing stack or sensitive fields.

## 13. Testing Strategy

### 13.1 Unit Tests

Add or update unit tests for:

- Route composition helper or route metadata builder.
- Middleware order invariants.
- Error handler envelope formatting.
- Correlation ID propagation helper behavior.

### 13.2 Integration Tests

Add or update Express integration tests using the actual app composition.

Required coverage:

- Global order includes correlation before logging and routes.
- Helmet headers are present on representative API responses.
- CORS behavior follows configured allowlist.
- `notFoundMiddleware` executes after routes.
- `errorHandlerMiddleware` executes last.
- Protected route handler does not execute when auth fails.
- Protected route validation does not execute before auth.
- Ownership or assignment does not execute before auth and role.

### 13.3 API Regression Tests

Required API-level scenarios:

| Scenario | Expected Result |
| --- | --- |
| Anonymous request with invalid body to protected route | 401 before validation failure |
| Authenticated user without role and invalid body | 403 before validation failure |
| Authenticated user with wrong ownership and invalid body | Existing safe 403 or masked 404 before validation failure |
| Unknown route | 404 safe envelope with `correlationId` |
| Middleware throws unexpected error | Safe 500 envelope with `correlationId` |
| Public sensitive route invalid payload | Validation or anti-abuse rejection before handler |

### 13.4 Security Tests

Security-focused tests must verify:

- No stack traces in production-like error responses.
- No tokens, cookies, prompts, or secrets in error envelopes.
- Helmet headers are applied globally.
- CORS does not allow wildcard production origins.
- Protected handlers cannot be reached by bypassing middleware order.

### 13.5 AI Tests

No AI-specific test is required for this story.

If existing AI endpoints are part of `/api/v1/*`, they may be included in route-order regression coverage to confirm they remain protected by their existing middleware requirements.

### 13.6 Seed / Demo Tests

No new seed data is required.

Demo or smoke checks may use existing seeded users or fixtures to verify:

- Authenticated protected request succeeds when all gates pass.
- Anonymous protected request fails before handler.
- Unknown route returns safe 404 envelope.

## 14. Observability & Audit

US-111 strengthens request observability but does not introduce new business audit events.

Required observability behavior:

- Every request receives or preserves a `correlationId`.
- Request logs include `correlationId`.
- Error logs include `correlationId`.
- Error logs use redaction for sensitive values.
- Rejected middleware paths remain traceable without exposing secrets.

Audit impact:

- No new `AdminAction` event is required.
- No new `AIRecommendation` audit entry is required.
- Existing auth/security logs may continue being used where already present.

## 15. Seed / Demo Data Impact

No seed data change is required.

No demo data change is required.

Existing fixtures may be reused for tests that require:

- Anonymous request.
- Authenticated user with allowed role.
- Authenticated user with disallowed role.
- Authenticated user without ownership or assignment.

## 16. Documentation Alignment Required

The following documentation alignment notes are not blockers:

- PB-P0-007 groups rate limiting, middleware order, and Helmet. US-110 and US-111 intentionally split policy values from chain-order enforcement.
- Doc 14 includes a full middleware order, while the backlog item summary lists a simplified route-level order. US-111 consolidates both by defining global order and protected route order separately.
- Doc 14 references CAPTCHA on selected auth routes, while US-109 and related security decisions own exact CAPTCHA eligibility. US-111 must only ensure applicable public sensitive middleware executes before handlers.

Recommended documentation updates after implementation:

- Backend middleware documentation should show the final global chain.
- Route development guidance should document the protected route composition helper or pattern.
- Testing documentation should mention middleware-order regression tests.

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Middleware arrays remain ad hoc across routes | New routes can bypass auth or validation order | Introduce a route composition helper or invariant tests over route registration. |
| Order tests rely on brittle Express internals | Tests may break during framework or refactor changes | Prefer testing observable behavior and helper output; inspect internals only where necessary. |
| Validation runs before auth on protected routes | Anonymous users may infer schema or endpoint behavior | Add negative tests expecting 401 or 403 before 400. |
| Error handler is not last | Errors may leak internals or bypass envelope | Add app composition tests for `notFound` and error handling position. |
| Helmet or CORS disabled in an environment | Security headers or origin restrictions may be missing | Add config and integration tests using production-like settings. |
| US-111 reopens US-110 policy details | Scope creep and inconsistent limits | Keep rate limit values and keying in US-110; verify order only. |

## 18. Implementation Guidance for Coding Agents

Coding agents should:

- Inspect the existing backend app factory and route registration style before editing.
- Reuse existing middleware names and folder conventions.
- Prefer centralizing route composition if the current codebase already has helper patterns.
- Keep all authorization and ownership enforcement in the backend.
- Preserve existing API response contracts unless the current implementation violates the approved secure envelope.
- Add tests before or alongside order changes so unsafe ordering is observable.
- Avoid changing rate limit thresholds, CAPTCHA behavior, cookie options, database schema, AI prompts, or frontend flows.
- Avoid adding new endpoints for this story.

Suggested implementation sequence:

1. Confirm current Express global middleware order.
2. Identify protected and public sensitive route registration patterns.
3. Add or adjust a composition helper or route-order convention.
4. Enforce global `helmet`, CORS, `notFoundMiddleware`, and `errorHandlerMiddleware` positions.
5. Add regression tests for global order, protected route order, public sensitive route order, and secure errors.
6. Run backend unit, integration, and security-relevant test suites.

## 19. Task Generation Notes

Development task generation should create ordered tasks for:

- Backend app middleware chain audit and adjustment.
- Protected route composition pattern or helper.
- Public sensitive route composition verification.
- Helmet and CORS global application verification.
- `notFoundMiddleware` and `errorHandlerMiddleware` position verification.
- Secure error envelope and correlation ID tests.
- Middleware-order regression tests.
- Documentation updates for backend route composition guidance.

Do not generate tasks for:

- Rate limit threshold/keying implementation.
- CAPTCHA provider integration.
- HttpOnly cookie configuration.
- Database migrations.
- AI provider or prompt changes.
- New frontend screens.
- New business endpoints.

## 20. Technical Spec Readiness

| Readiness Check | Status | Notes |
| --- | --- | --- |
| User story approved | Pass | US-111 is approved for development tasks. |
| Backlog mapping found | Pass | PB-P0-007, P0, execution order 7. |
| Decision resolution reviewed | Pass | No blockers remain. |
| Scope boundary clear | Pass | US-111 owns order, not policy values. |
| API impact clear | Pass | No new API contract; existing routes hardened. |
| Database impact clear | Pass | No database changes. |
| AI impact clear | Pass | No AI changes. |
| Security expectations clear | Pass | Backend source of truth and secure chain order defined. |
| QA expectations clear | Pass | Regression, integration, and security tests identified. |
| Ready for task breakdown | Pass | Development tasks can be generated. |

## 21. Final Recommendation

Status: Ready for Task Breakdown.

US-111 is technically ready to be decomposed into development tasks under PB-P0-007. The story has an approved status, a resolved PO/BA decision artifact, clear scope boundaries, explicit security expectations, no database or AI implementation dependency, and testable acceptance criteria focused on deterministic middleware chain order.
