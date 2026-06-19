# Technical Specification — US-094: Implementar endpoints AUTH del contrato REST

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-094 |
| Source User Story | `management/user-stories/US-094-auth-endpoints-implementation.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-094-decision-resolution.md` |
| Priority | P0 |
| Backlog ID | PB-P0-004 |
| Backlog Title | REST API Endpoints Foundation (Doc 16) |
| Backlog Execution Order | 4 |
| User Story Position in Backlog Item | 1 of 4 |
| Related User Stories in Backlog Item | US-094, US-095, US-096, US-097 |
| Epic | EPIC-API-001 |
| Backlog Item Dependencies | PB-P0-002, PB-P0-003 |
| Feature | Endpoints Auth |
| Module / Domain | API / Identity Access |
| User Story Status | Approved |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-14 |
| Last Updated | 2026-06-14 |

---

## 2. Backlog Execution Context

### Product Backlog Item

US-094 pertenece a PB-P0-004, cuyo objetivo es implementar los endpoints REST foundation alineados a Doc 16 bajo `/api/v1`. Dentro de este backlog item, US-094 cubre el segmento AUTH/profile propio que habilita registro, login, logout, reset de password y resolución del usuario autenticado.

### Execution Order Rationale

PB-P0-004 es el cuarto item P0 del Product Backlog. US-094 debe ejecutarse primero dentro del item porque los endpoints de EVENT, QUOTE y AI dependen de sesión autenticada, role context y resolución de usuario actual.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-094 | Auth/session/profile contract foundation | 1 |
| US-095 | Event endpoints foundation; depende de auth | 2 |
| US-096 | Quote/Booking endpoints foundation; depende de auth/event | 3 |
| US-097 | AI endpoints foundation; depende de auth/event/quote | 4 |

---

## 3. Executive Technical Summary

Implementar los endpoints AUTH y perfil propio usando Node.js, Express, TypeScript, Zod, Prisma y PostgreSQL dentro del modular monolith. La implementación debe respetar Clean/Hexagonal Architecture: controllers delgados, use cases de aplicación, puertos para hashing/captcha/session/reset-token/email simulado cuando aplique y repositorios Prisma en infraestructura.

La sesión se transporta en cookie HTTP-only firmada. No se exponen tokens de sesión al JSON ni a `localStorage`/`sessionStorage`. Los endpoints públicos sensibles requieren captcha y rate limit. Los errores de login y reset-request deben ser anti-enumeración. La ruta canónica de perfil propio para esta historia es `/api/v1/users/me`, según decisión formal US-094.

---

## 4. Scope Boundary

### In Scope

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/password/reset-request`
- `POST /api/v1/auth/password/reset`
- `GET /api/v1/users/me`
- `PATCH /api/v1/users/me`
- `PATCH /api/v1/users/me/preferred-language`
- `POST /api/v1/users/me/change-password`
- DTO validation with Zod.
- Cookie-based session handling.
- Captcha verification for register/login/reset-request.
- Auth-specific rate limiting.
- Password hashing.
- Password reset token generation/consumption.
- Standard API envelope, errors and correlation ID.
- Supertest coverage for success and negative security cases.

### Out of Scope

- OAuth / SSO.
- MFA / OTP / SMS.
- Public admin creation.
- Admin user management.
- Frontend forms or pages.
- Real email delivery if MVP uses simulated structured log.
- Enterprise distributed session architecture.
- Event, quote, AI, vendor or admin endpoints beyond current-user profile routes.

### Explicit Non-Goals

- Do not expose auth tokens in response JSON.
- Do not store auth tokens in frontend storage.
- Do not add Google OAuth or MFA.
- Do not relax captcha/rate limit on sensitive public endpoints.
- Do not implement production email infrastructure unless already available as platform capability.

---

## 5. Architecture Alignment

### Backend Architecture

Use the existing modular monolith style. Suggested bounded contexts:

- `identity-access`: register, login, logout, password reset, session issuance.
- `user-profile`: current user profile read/update, preferred language, change password.
- `shared-kernel` or `shared/interface`: middleware, error envelope, correlation ID, validation, rate limit.

Controllers must delegate to use cases and avoid business logic. Use cases depend on ports such as `UserRepository`, `PasswordHasher`, `SessionIssuer`, `SessionRepository`, `CaptchaVerifier`, `PasswordResetTokenRepository` and optional `NotificationSenderPort`.

### Frontend Architecture

No UI implementation. The contract must support future Next.js clients using `credentials: 'include'`, TanStack Query for `/users/me`, React Hook Form/Zod forms, and next-intl locale handling.

### Database Architecture

Use Prisma/PostgreSQL. Main persisted data: `users`, session records if server-side sessions are used, and password reset token records. Captcha secrets are not persisted.

### API Architecture

REST JSON under `/api/v1`. Use standard success/error envelopes, Zod validation, stable error codes, and `X-Correlation-Id`.

### AI / PromptOps Architecture

No aplica. This story does not invoke AI and must not create `AIRecommendation`.

### Security Architecture

Align with ADR-SEC-001 through ADR-SEC-006:

- HTTP-only signed session cookies.
- Captcha + rate limiting on sensitive public endpoints.
- Backend as authorization source of truth.
- No token exposure.
- Redacted logs.
- Password hashes only.

### Testing Architecture

Use Vitest and Supertest for integration/API tests. Include security negative paths as quality gate per ADR-TEST-004. Playwright/UI tests are not required for this backend story.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 Register | Validate DTO, captcha, role allowlist, unique normalized email, password hash, create active user, return public DTO. | API, Application, Domain, DB, Security |
| AC-02 Login | Validate DTO/captcha, verify password hash, issue signed HTTP-only cookie, return public user. | API, Application, Security |
| AC-03 Get current user | Resolve session cookie, load user by session identity, return safe profile DTO. | API, Middleware, Application, DB |
| AC-04 Update profile | Auth required; update only name/phone/preferredLanguage; reject role/email/hash/status. | API, Application, DB, Security |
| AC-05 Logout | Auth required; revoke current session or clear signed cookie; protected endpoints return 401 afterwards. | API, Session, Security |
| AC-06 Reset request | Validate email/captcha/rate limit; always return 202; create one-use token only if user exists; simulate/log delivery if needed. | API, Application, DB, Security, Observability |
| AC-07 Reset password | Validate token, expiry, consumed state and new password; update hash; consume token atomically. | API, Application, DB, Security |
| AC-08 Shared API contract | All endpoints use `/api/v1`, envelope, Zod, correlation ID and redacted errors/logs. | API, Middleware, Observability |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

- `identity-access`
- `user-profile`
- `shared-kernel`
- `shared/interface/http`
- `infrastructure/prisma`
- `infrastructure/security`
- `infrastructure/captcha`

### Use Cases / Application Services

- `RegisterUserUseCase`
- `LoginUserUseCase`
- `LogoutUserUseCase`
- `RequestPasswordResetUseCase`
- `ResetPasswordUseCase`
- `GetCurrentUserUseCase`
- `UpdateCurrentUserProfileUseCase`
- `ChangePreferredLanguageUseCase`
- `ChangePasswordUseCase`

### Controllers / Routes

- `AuthController` mounted under `/api/v1/auth`.
- `UsersMeController` or `CurrentUserController` mounted under `/api/v1/users/me`.

Route mapping:

- `POST /auth/register` -> `RegisterUserUseCase`
- `POST /auth/login` -> `LoginUserUseCase`
- `POST /auth/logout` -> `LogoutUserUseCase`
- `POST /auth/password/reset-request` -> `RequestPasswordResetUseCase`
- `POST /auth/password/reset` -> `ResetPasswordUseCase`
- `GET /users/me` -> `GetCurrentUserUseCase`
- `PATCH /users/me` -> `UpdateCurrentUserProfileUseCase`
- `PATCH /users/me/preferred-language` -> `ChangePreferredLanguageUseCase`
- `POST /users/me/change-password` -> `ChangePasswordUseCase`

### DTOs / Schemas

Zod schemas should be strict and reject unknown sensitive fields.

- `RegisterRequestDto`: `email`, `password`, `name`, `role`, `preferredLanguage`, `captchaToken`, optional `phone`.
- `LoginRequestDto`: `email`, `password`, `captchaToken`.
- `PasswordResetRequestDto`: `email`, `captchaToken`.
- `PasswordResetDto`: `token`, `newPassword`.
- `UpdateCurrentUserProfileDto`: allowed `name`, `phone`, `preferredLanguage`.
- `ChangePreferredLanguageDto`: `preferredLanguage`.
- `ChangePasswordDto`: `currentPassword`, `newPassword`.
- `AuthUserResponseDto`: `id`, `email`, `name`, `role`, `preferredLanguage`, `status`, `phone`, `createdAt`, `updatedAt`.

### Repository / Persistence

Required repository capabilities:

- `UserRepository.findByEmailNormalized(email)`
- `UserRepository.findById(id)`
- `UserRepository.create(user)`
- `UserRepository.updateProfile(userId, fields)`
- `UserRepository.updatePasswordHash(userId, hash)`
- `SessionRepository.create(...)`, `findValid(...)`, `revoke(...)` if server-side sessions are used.
- `PasswordResetTokenRepository.create(...)`, `findValidByTokenHash(...)`, `consume(...)`.

### Validation Rules

- Normalize email to lowercase before uniqueness checks.
- Public register permits only `organizer` and `vendor`.
- `admin` registration is forbidden.
- Validate `preferredLanguage` against `es-LATAM`, `es-ES`, `pt`, `en`.
- Require captcha token for register/login/reset-request.
- Password policy must be centralized and reused for register/reset/change-password.
- PATCH profile must not allow `email`, `role`, `status`, `password_hash`, `createdAt`, `updatedAt`.

### Error Handling

Use standard error envelope and stable error codes:

- `VALIDATION_ERROR` -> 422 or project-standard validation status.
- `EMAIL_TAKEN` -> 409.
- `AUTHENTICATION_REQUIRED` -> 401.
- `FORBIDDEN` -> 403.
- `RATE_LIMIT_EXCEEDED` -> 429.
- Expired reset token -> `410` if supported by the shared error mapping.

Login failures and reset-request must be anti-enumeration.

### Transactions

- Register: transactional user creation; create associated vendor/organizer base profile only if already part of existing domain behavior.
- Reset password: transaction over token validation/consume and password hash update.
- Logout: transaction only if server-side session revocation is persisted.
- Profile update: simple update transaction optional; strict schema protects immutable fields.

### Observability

Log structured security events:

- `auth.register.succeeded`
- `auth.register.rejected`
- `auth.login.succeeded`
- `auth.login.failed`
- `auth.logout.succeeded`
- `auth.password_reset.requested`
- `auth.password_reset.completed`
- `auth.captcha.failed`
- `auth.rate_limited`

Never log password, reset token, session cookie, captcha token or password hash.

---

## 8. Frontend Technical Design

### Routes / Pages

No aplica. No UI is implemented by this story.

### Components

No aplica.

### Forms

No aplica. Future auth forms must use this API contract.

### State Management

No aplica for implementation. Future clients hydrate session state via `GET /api/v1/users/me` with `credentials: 'include'`.

### Data Fetching

No aplica. Future frontend API clients must include cookies and handle standard envelopes.

### Loading / Empty / Error / Success States

No aplica. Error codes must be stable for future UI mapping.

### Accessibility

No aplica.

### i18n

No aplica for UI. API validates `preferredLanguage`.

---

## 9. API Contract Design

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| POST | `/api/v1/auth/register` | Register `organizer` or `vendor` | No; captcha required | `RegisterRequestDto` | `201` + `AuthUserResponseDto` | `409 EMAIL_TAKEN`, `422 VALIDATION_ERROR`, `429 RATE_LIMIT_EXCEEDED`, captcha failure |
| POST | `/api/v1/auth/login` | Authenticate and issue session cookie | No; captcha required | `LoginRequestDto` | `200` + `Set-Cookie` + public user DTO | `401 AUTHENTICATION_REQUIRED`, `422`, `429`, captcha failure |
| POST | `/api/v1/auth/logout` | Revoke current session | Yes | Cookie session | `204 No Content` | `401` |
| POST | `/api/v1/auth/password/reset-request` | Request password reset | No; captcha required | `PasswordResetRequestDto` | `202 Accepted` generic response | `422`, `429`, captcha failure |
| POST | `/api/v1/auth/password/reset` | Reset password with token | No; token required | `PasswordResetDto` | `204 No Content` | `401`, `410`, `422` |
| GET | `/api/v1/users/me` | Return current user profile | Yes | Cookie session | `200` + `AuthUserResponseDto` | `401` |
| PATCH | `/api/v1/users/me` | Update own profile fields | Yes | `UpdateCurrentUserProfileDto` | `200` + updated profile | `401`, `422` |
| PATCH | `/api/v1/users/me/preferred-language` | Update preferred language | Yes | `ChangePreferredLanguageDto` | `200` + updated profile or ack | `401`, `422` |
| POST | `/api/v1/users/me/change-password` | Change password while authenticated | Yes | `ChangePasswordDto` | `204 No Content` | `401`, `422` |

Cookie requirements:

- HTTP-only.
- Signed.
- `Secure` outside local development.
- `SameSite=Lax`.
- `Path=/`.

---

## 10. Database / Prisma Design

### Models Impacted

- `User`
- `Session` if server-side session persistence is used.
- `PasswordResetToken` or equivalent.

### Fields / Columns

`users` expected fields:

- `id`
- `email`
- `password_hash`
- `name`
- `role`
- `preferred_language`
- `phone`
- `status`
- `created_at`
- `updated_at`

Password reset token expected fields:

- `id`
- `user_id`
- `token_hash`
- `expires_at`
- `consumed_at`
- `created_at`

Session expected fields if persisted:

- `id` or `sid`
- `user_id`
- `expires_at`
- `revoked_at`
- `created_at`

### Relations

- `PasswordResetToken.user_id -> users.id`.
- `Session.user_id -> users.id` if persisted.

### Indexes

- Unique normalized email on `users.email`.
- Index or unique active token hash on password reset token.
- Index active session lookup if server-side sessions are used.

### Constraints

- Role enum must include only supported roles; public registration restricts to `organizer | vendor`.
- `password_hash` required.
- `preferred_language` enum.
- Reset token is one-use and time-bound.
- Captcha secrets are not stored in DB.

### Migrations Impact

If PB-P0-001 already created these tables, this story should not duplicate schema work; it should verify constraints and add only missing reset/session persistence required for the approved contract.

### Seed Impact

Admin user remains seed/configuration-only. No public endpoint creates admin. Existing demo users can be used for login/session tests.

---

## 11. AI / PromptOps Design

### AI Feature

No aplica.

### Provider

No aplica.

### Prompt Version

No aplica.

### Input Schema

No aplica.

### Output Schema

No aplica.

### Human-in-the-loop

No aplica.

### Fallback

No aplica.

### Persistence

No aplica.

### Safety Rules

This story must not invoke AI or persist `AIRecommendation`.

---

## 12. Security & Authorization Design

### Authentication

- Public endpoints: register, login, password reset request, password reset.
- Authenticated endpoints: logout and all `/api/v1/users/me*` endpoints.
- Authenticated endpoints resolve session from signed HTTP-only cookie.

### Authorization

- Public register only creates `organizer` or `vendor`.
- Authenticated current-user endpoints operate only on `req.user.id`.
- No cross-user profile access.
- No public admin creation.

### Ownership Rules

Ownership is current-user self access. The actor can read/update only their own profile derived from session identity.

### Role Rules

- `organizer`, `vendor`, `admin` can call authenticated profile/logout endpoints.
- Only `organizer` and `vendor` can be created through public register.
- `admin` is seed/configuration-only.

### Negative Authorization Scenarios

- Anonymous `GET /api/v1/users/me` -> 401.
- Anonymous logout -> 401.
- Register with `role=admin` -> reject; no user created.
- Login without captcha -> reject before password verification.
- Invalid credentials -> generic 401.
- Reset request for missing email -> 202 generic.
- Reused/expired reset token -> reject; no password change.
- Revoked session accesses profile -> 401.

### Audit Requirements

No `AdminAction` required. Use security logs for failed login, captcha failure, rate limit, reset request and reset completion.

### Sensitive Data Handling

Redact:

- `password`
- `newPassword`
- `currentPassword`
- `password_hash`
- reset token and token hash
- session cookie
- captcha token
- captcha secret

---

## 13. Testing Strategy

### Unit Tests

- Password policy validator.
- Email normalization.
- Role allowlist for public registration.
- Password reset token expiry/consumption policy.
- Profile update field allowlist.

### Integration Tests

- Register creates `organizer` and `vendor`.
- Register rejects duplicate email.
- Login verifies password and sets cookie.
- Logout revokes session/clears cookie.
- Reset request returns 202 for existing and missing email.
- Reset password consumes valid token and changes hash.
- `/users/me` returns public user with valid session.
- PATCH profile updates allowed fields only.

### API Tests

Use Supertest for all endpoints. Assert status codes, envelopes, cookies, headers, `meta.correlationId`, error codes and absence of sensitive fields.

### E2E Tests

No required E2E in this technical spec. Frontend auth UI stories may add Playwright coverage later.

### Security Tests

- Captcha missing/invalid on register/login/reset-request.
- Rate limit 429 on login/register/reset-request.
- No `Set-Cookie` on failed login.
- Cookie has HTTP-only/SameSite/Secure attributes as environment allows.
- No auth token in JSON body.
- No sensitive fields in logs or responses.
- Public admin registration rejected.

### Accessibility Tests

No aplica. No UI.

### AI Tests

No aplica.

### Seed / Demo Tests

- Seed admin can log in only if seeded and not through public registration.
- Demo organizer/vendor accounts, if present, can authenticate.

### CI Checks

- Vitest unit tests.
- Supertest integration tests.
- Prisma test DB setup.
- Captcha stub accepts deterministic test token.
- No real captcha/network dependency in CI.

---

## 14. Observability & Audit

### Logs

Use structured logs with event name, status, user ID when known, IP/rate-limit context where allowed, and `correlationId`. Do not log credentials or tokens.

### Correlation ID

All responses and logs must propagate `X-Correlation-Id` / `meta.correlationId`.

### AdminAction

No aplica.

### Error Tracking

Capture unexpected internal errors with redacted context. Expected auth failures should be logged at appropriate `warn` or `info` levels without stack traces in responses.

### Metrics

Recommended metrics:

- register success/failure count.
- login success/failure count.
- captcha failure count.
- rate limit hit count.
- reset request count.
- password reset success/failure count.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

No new seed data required. Existing seeded admin/organizer/vendor users may be used for login and profile tests.

### Demo Scenario Supported

Supports demo login and current-user hydration before event creation, quote flow and AI flow.

### Reset / Isolation Notes

Integration tests should isolate users, reset tokens and sessions between test cases. Use deterministic captcha stub token in test environment.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| Doc 16 §10/§23 and Doc 19 §9.2 | They reference `/api/v1/me`, while US-094 uses `/api/v1/users/me`. | Keep `/api/v1/users/me` for US-094. | Align Doc 16/Doc 19 or document canonical route before OpenAPI snapshot. | No |
| Doc 16 §22 vs Doc 19 §9.5 | Doc 16 uses `202` for reset-request; Doc 19 mentions generic `200`. | Use `202 Accepted` for `POST /api/v1/auth/password/reset-request`. | Align Doc 19 with Doc 16 while preserving anti-enumeration. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Route drift between `/me` and `/users/me` | Frontend/MSW/OpenAPI mismatch | Use `/users/me` consistently in implementation and contract tests; track documentation alignment. |
| Tokens exposed in response or logs | Account takeover risk | Redaction tests and response assertions; never include session token in JSON. |
| Captcha makes CI flaky | Unstable tests | Use deterministic captcha stub in non-production environments. |
| Password reset token stored raw | Account takeover risk | Store only token hash; return/send raw token only through simulated delivery path. |
| Rate limit too broad or too narrow | User lockout or weak anti-abuse | Implement endpoint-specific limiters from Doc 16/Doc 19 and make config explicit. |
| Session invalidation unclear | Logout may not actually revoke access | Decide server-side session persistence or signed cookie invalidation strategy during implementation; test post-logout 401. |

---

## 18. Implementation Guidance for Coding Agents

- Likely impacted folders:
  - `src/modules/identity-access/`
  - `src/modules/user-profile/`
  - `src/shared/interface/http/`
  - `src/shared/interface/middlewares/`
  - `src/infrastructure/prisma/`
  - `src/infrastructure/security/`
  - `src/infrastructure/captcha/`
  - `tests/integration/auth/`
- Recommended implementation order:
  1. Confirm existing auth/session/schema foundation from PB-P0-001/PB-P0-002/PB-P0-003.
  2. Implement Zod DTO schemas.
  3. Implement repository methods and security ports.
  4. Implement use cases.
  5. Implement controllers/routes.
  6. Attach middleware: correlation, rate limit, captcha, auth, validation, error handler.
  7. Add Supertest and security negative tests.
  8. Validate logs/redaction and cookie flags.
- Decisions that must not be reopened:
  - Use `/api/v1/users/me`, not `/api/v1/me`, for this story.
  - Use `202 Accepted` for reset request.
  - Public register creates only `organizer` or `vendor`.
  - Login uses HTTP-only signed cookie, not JSON token storage.
- Must not implement:
  - OAuth.
  - MFA.
  - Public admin creation.
  - Auth UI.
  - Real email provider unless already available as platform dependency.
  - Any AI behavior.
- Assumptions to preserve:
  - Captcha can be mocked deterministically in CI/QA.
  - Email reset delivery can be simulated through structured logs in MVP.
  - Backend is source of truth for authentication and authorization.

---

## 19. Task Generation Notes

- Suggested task groups:
  - API routing/controllers.
  - DTO/Zod schemas.
  - Auth use cases.
  - Current-user profile use cases.
  - Prisma repositories/session/reset-token persistence.
  - Security middleware integration.
  - Test suite.
  - Contract/MSW readiness.
- Required QA tasks:
  - Supertest happy path and negative paths for every endpoint.
  - Cookie flag assertions.
  - Anti-enumeration assertions.
  - Redaction assertions.
- Required security tasks:
  - Captcha middleware.
  - Endpoint-specific rate limits.
  - Password hashing.
  - Reset token hashing/TTL/one-use.
  - No token in JSON or frontend storage.
- Required seed/demo tasks:
  - Verify seeded admin/organizer/vendor users can support demo login.
  - Verify public register cannot create admin.
- Required documentation tasks:
  - Note `/users/me` vs `/me` alignment.
  - Note reset-request `202` alignment.
- Dependencies between tasks:
  - DTO schemas before controllers.
  - Repositories/security ports before use cases.
  - Auth middleware/session before profile endpoints.
  - Captcha/rate limit before final auth endpoint tests.
- Parent backlog item should later generate a consolidated `tasks.md` for PB-P0-004 after US-094..US-097 specs exist.

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass |
| Product Backlog mapping found | Pass |
| Decision Resolution reviewed if present | Pass |
| Scope clear | Pass |
| Architecture alignment clear | Pass |
| API impact clear | Pass |
| DB impact clear | Pass |
| AI impact clear | N/A |
| Security impact clear | Pass |
| Testing strategy clear | Pass |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`

US-094 has an approved story, formal decision resolution, backlog mapping to PB-P0-004, clear API contract, security requirements, database impact and QA strategy. It is ready for `eventflow-user-story-to-development-tasks`.
