# Technical Specification — US-004: Recuperar mi contraseña vía email

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-004 |
| Source User Story | `management/user-stories/US-004-recover-password.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-004-decision-resolution.md` |
| Priority | P1 |
| Backlog ID | PB-P1-004 |
| Backlog Title | Recuperación de contraseña |
| Backlog Execution Order | Cuarto ítem de P1 dentro de EPIC-AUTH-001 (después de PB-P1-001, PB-P1-002, PB-P1-003) |
| User Story Position in Backlog Item | 1 de 1 |
| Related User Stories in Backlog Item | US-004 |
| Epic | EPIC-AUTH-001 — Authentication & User Access |
| Backlog Item Dependencies | PB-P0-001 (schema), PB-P0-006 (cookies + captcha), PB-P0-007 (rate limit), PB-P1-003 (login) |
| Feature | Recuperación de contraseña |
| Module / Domain | Auth |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-25 |
| Last Updated | 2026-06-25 |

---

## 2. Backlog Execution Context

### Product Backlog Item

PB-P1-004 cubre la recuperación autoservida vía email simulado. Depende de PB-P1-003 (login) y de la infraestructura P0 (`UserRepository`, captcha, rate limit). Entrega resiliencia de acceso para el MVP académico.

### Execution Order Rationale

US-004 ejecuta después de US-003 / US-005 porque consume `UserRepository`, `CaptchaService`, `rateLimitMiddleware` y el error envelope ya entregados, y porque el usuario que recupera contraseña debe luego iniciar sesión (US-003).

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-004 | Recuperación de contraseña vía email simulado | 1 |

---

## 3. Executive Technical Summary

Implementar `RequestPasswordResetUseCase` y `ResetPasswordUseCase` con sus endpoints `POST /api/v1/auth/password/reset-request` y `POST /api/v1/auth/password/reset`. La solicitud genera un token random `≥32` bytes, persiste su hash en una nueva tabla `password_reset_tokens` con `expires_at = now() + 30 min` y `consumed_at = NULL`, y envía un email vía puerto `EmailSender` con adapter `MockEmailSender` (log estructurado). Captcha verificado en `/reset-request` y rate limits canónicos (`3/email/h` y `5/IP/10min`). El reset valida la política de contraseñas Doc 19 §11.2, hashea la nueva contraseña con `argon2id`, marca el token `consumed_at` y responde `204 No Content` dentro de una transacción atómica. La respuesta de `/reset-request` es siempre `202 Accepted` con mensaje neutro (anti-enumeración). Frontend Next.js entrega páginas `/[locale]/auth/forgot-password` y `/[locale]/auth/reset-password` con i18n. Sin invalidación global de sesiones.

---

## 4. Scope Boundary

### In Scope

- Endpoints `POST /api/v1/auth/password/reset-request` y `POST /api/v1/auth/password/reset`.
- Nueva tabla `password_reset_tokens` con migración reversible e índices.
- Generación segura de token (`randomBytes(32)`), hash `sha256`, persistencia y TTL 30 min.
- Adapter `MockEmailSender` en `modules/notifications` con puerto `EmailSender`.
- Verificación server-side de captcha (PB-P0-006).
- Rate limit `3/email/h` (`reset-request`) y `5/IP/10min` (`reset`) (PB-P0-007).
- Política de contraseña Doc 19 §11.2 en `/reset`.
- Hashing `argon2id` para la nueva contraseña.
- Páginas `/[locale]/auth/forgot-password` y `/[locale]/auth/reset-password`.
- Manejo del error envelope completo: `400 CAPTCHA_REQUIRED`, `400 CAPTCHA_INVALID`, `400 TOKEN_USED`, `400 TOKEN_INVALID`, `410 GONE_TOKEN_EXPIRED`, `422 VALIDATION_ERROR`, `429 RATE_LIMIT_EXCEEDED`.
- Tests unit/integration/API/E2E y de redacción de logs.

### Out of Scope

- SMS / WhatsApp / 2FA / preguntas de seguridad.
- SMTP real obligatorio (adapter real puede agregarse por ADR futuro).
- Invalidación global de sesiones tras reset (Decisión PO US-004 #3).
- Regla "nueva contraseña ≠ anterior" (Decisión PO US-004 #2).
- Cambios al login (US-003) o al logout (US-005).

### Explicit Non-Goals

- No persistir el token plano.
- No registrar contraseñas, hashes ni captchaToken.
- No exponer si el email existe.
- No correr migraciones destructivas.

---

## 5. Architecture Alignment

### Backend Architecture

- Node.js + Express + TypeScript en monolito modular.
- `modules/auth` aloja `RequestPasswordResetUseCase` y `ResetPasswordUseCase`.
- `modules/notifications` aloja el puerto `EmailSender` y el adapter `MockEmailSender`.
- Repositorio `PasswordResetTokenRepository` sobre Prisma.
- Cadena de middlewares: `correlation → logging → rateLimit('auth.reset.request'|'auth.reset') → captchaConditionalMiddleware (sólo /reset-request) → validation(Zod) → controller`.

### Frontend Architecture

- Next.js App Router (Client Components).
- Mutations `useForgotPassword` y `useResetPassword` con TanStack Query.
- Componente `CaptchaWidget` reutilizado (PB-P0-006).
- i18n `next-intl`.

### Database Architecture

- Reutiliza tabla `users` (sólo update `password_hash`).
- Nueva tabla `password_reset_tokens` con campos `id`, `user_id`, `token_hash`, `expires_at`, `consumed_at`, `created_at`. Índices por `token_hash` (UNIQUE), `(user_id)`, `(expires_at)`.

### API Architecture

- REST `/api/v1/auth/password/{reset-request,reset}` según Doc 16 §22.3.

### AI / PromptOps Architecture

No aplica.

### Security Architecture

- SEC-POL-AUTH-005 (respuesta uniforme `202` en `/reset-request`).
- SEC-POL-AUTH-006 (token uso único, TTL 30 min, hash, ≥32 bytes).
- Captcha + rate limit en `/reset-request`; rate limit en `/reset`.
- Hashing `argon2id` para la nueva contraseña.
- Logger redacta token, password y captchaToken.

### Testing Architecture

- Vitest + Supertest para unit/integration/API.
- Playwright para E2E (forgot → log de email → reset → login).
- Test de redacción de logs.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 | `RequestPasswordResetUseCase` orquesta captcha → generación → persistencia → envío email; responde `202` siempre. | Backend, API, Security, Notifications |
| AC-02 | `ResetPasswordUseCase` valida política, recupera token por hash, actualiza `users.password_hash` con `argon2id` y marca `consumed_at` dentro de una transacción. Responde `204`. | Backend, API, Security, DB |
| AC-03 | Email inexistente → use case retorna sin persistir token; controller emite `202` neutro. | Backend, Observability |
| AC-04 | `rateLimitMiddleware` configurado con buckets `auth.reset.request` y `auth.reset`. | Backend, API |
| AC-05 | Validación Zod + reglas Doc 19 §11.2 ejecutan antes del cambio. | Backend, Frontend |
| EC-01 | Token recuperado pero `expires_at <= now()` → `410`. | Backend |
| EC-02 | `consumed_at` no nulo → `400 TOKEN_USED`. | Backend |
| EC-03 | Token no encontrado → `400 TOKEN_INVALID`. | Backend |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

- `modules/auth` (use cases, controllers).
- `modules/notifications` (`EmailSender`, `MockEmailSender`).
- Reutiliza `CaptchaService`, `SessionCookieIssuer` (no necesario aquí), `rateLimitMiddleware`, `correlationMiddleware`, `loggingMiddleware`.

### Use Cases / Application Services

- `RequestPasswordResetUseCase.execute({ email, captchaToken, ctx })`.
- `ResetPasswordUseCase.execute({ token, newPassword, ctx })`.

### Controllers / Routes

- `AuthController.requestPasswordReset` → `POST /api/v1/auth/password/reset-request`.
- `AuthController.resetPassword` → `POST /api/v1/auth/password/reset`.
- Cadena de middlewares descrita en §5.

### DTOs / Schemas

```ts
type ForgotPasswordRequestDto = {
  email: string;
  captchaToken: string;
};

type ResetPasswordRequestDto = {
  token: string;
  newPassword: string;
};
```

Zod:

- `ForgotPasswordRequestSchema`: `email.trim().email()`, `captchaToken.min(1)`.
- `ResetPasswordRequestSchema`: `token.min(1)`, `newPassword.min(10).regex(letterDigit).refine(notEqualToLocalPart)`.

### Repository / Persistence

- `PasswordResetTokenRepository`:
  - `create({ userId, tokenHash, expiresAt })`.
  - `findByHash(tokenHash): Token | null`.
  - `markConsumed(id, consumedAt)` dentro de transacción.
  - `deleteExpired()` (job opcional fuera de alcance).

### Validation Rules

- VR-01..VR-04 (descritas en la US).
- En `/reset-request`: errores de email validados y respondidos como `202` neutro (SEC-POL-AUTH-005) salvo en formato Zod estrictamente inválido (`422`).
- En `/reset`: `422 VALIDATION_ERROR` si Zod o política Doc 19 §11.2 fallan.

### Error Handling

| Caso | HTTP | `errorCode` |
|---|---|---|
| Zod email mal formado | 422 | `VALIDATION_ERROR` |
| Captcha requerido | 400 | `CAPTCHA_REQUIRED` |
| Captcha inválido | 400 | `CAPTCHA_INVALID` |
| Token no encontrado | 400 | `TOKEN_INVALID` |
| Token consumido | 400 | `TOKEN_USED` |
| Token expirado | 410 | `GONE_TOKEN_EXPIRED` |
| Política contraseña | 422 | `VALIDATION_ERROR` |
| Rate limit `/reset-request` | 429 | `RATE_LIMIT_EXCEEDED` |
| Rate limit `/reset` | 429 | `RATE_LIMIT_EXCEEDED` |

### Transactions

- En `/reset`: `tx.users.update(password_hash) + tx.password_reset_tokens.update(consumed_at)` en una sola transacción Prisma.

### Observability

- Eventos: `auth.reset.requested`, `auth.reset.requested.no_email`, `auth.reset.requested.authenticated`, `auth.reset.completed`, `auth.reset.failure { reason }`.
- Métricas: `auth_reset_request_total{result}`, `auth_reset_total{result}`, `auth_reset_token_ttl_seconds=1800`.

---

## 8. Frontend Technical Design

### Routes / Pages

- `app/[locale]/auth/forgot-password/page.tsx`.
- `app/[locale]/auth/reset-password/page.tsx` (lee `token` de query string con `useSearchParams`).

### Components

- `ForgotPasswordForm`, `ResetPasswordForm`, `CaptchaWidget`, `TokenExpiredBanner`.

### Forms

- React Hook Form + Zod (locales) reflejando la política Doc 19 §11.2.

### State Management

- TanStack Query mutations `useForgotPassword`, `useResetPassword`.
- Tras éxito de `useResetPassword`, redirección a `/auth/login` con toast.

### Data Fetching

- `authApi.requestPasswordReset(payload)`, `authApi.resetPassword(payload)` con `credentials: 'include'` (anónimo no requiere cookie, pero por consistencia).

### Loading / Empty / Error / Success States

- Loading: spinner en botón.
- Error `410`: render `TokenExpiredBanner` con CTA "Solicitar nuevo enlace".
- Error `400 TOKEN_INVALID/USED`: banner genérico + redirección suave a forgot.
- Error `422`: mostrar errores por campo.
- Error `429`: banner con espera por `Retry-After`.
- Éxito en `/reset-request`: mensaje neutro siempre.
- Éxito en `/reset`: redirección a login con toast.

### Accessibility

- `aria-live polite` para errores.
- Focus inicial en el primer input.

### i18n

- `forgotPassword.*` y `resetPassword.*` en `es-LATAM`, `es-ES`, `pt`, `en`.

---

## 9. API Contract Design

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| POST | `/api/v1/auth/password/reset-request` | Solicitar reset | No | `ForgotPasswordRequestDto` | `202 Accepted` (sin body) | `400 CAPTCHA_REQUIRED/INVALID`, `422 VALIDATION_ERROR`, `429 RATE_LIMIT_EXCEEDED` |
| POST | `/api/v1/auth/password/reset` | Establecer nueva contraseña | No | `ResetPasswordRequestDto` | `204 No Content` | `400 TOKEN_USED/INVALID`, `410 GONE_TOKEN_EXPIRED`, `422 VALIDATION_ERROR`, `429 RATE_LIMIT_EXCEEDED` |

---

## 10. Database / Prisma Design

### Models Impacted

- `User` (update `password_hash`).
- `PasswordResetToken` (nuevo).

### Fields / Columns

`PasswordResetToken`:

- `id: String @id @default(cuid())`.
- `userId: String` (FK).
- `tokenHash: String @unique`.
- `expiresAt: DateTime`.
- `consumedAt: DateTime?`.
- `createdAt: DateTime @default(now())`.

### Relations

- `PasswordResetToken.user → User` (`onDelete: Cascade`).

### Indexes

- `@@unique([tokenHash])`.
- `@@index([userId])`.
- `@@index([expiresAt])` para limpieza eventual.

### Constraints

- `expiresAt` NOT NULL.
- `tokenHash` UNIQUE.

### Migrations Impact

- Una migración reversible que crea la tabla con sus índices.

### Seed Impact

- No requiere seed adicional. Reutiliza usuarios seed para flujo demo.

---

## 11. AI / PromptOps Design

No aplica.

---

## 12. Security & Authorization Design

### Authentication

- Endpoints públicos (`anonymous`).

### Authorization

- Solo el portador del token puede ejecutar `/reset`.

### Ownership Rules

- `PasswordResetToken.userId` se resuelve por el lookup del hash; la operación afecta exclusivamente a ese `User`.

### Role Rules

- No diferenciación por rol.

### Negative Authorization Scenarios

- Token expirado → `410`.
- Token consumido → `400`.
- Token inexistente o alterado → `400`.
- Rate limit excedido → `429`.

### Audit Requirements

- Eventos descritos en §7 con `correlationId`.
- `AdminAction`: no requerido.

### Sensitive Data Handling

- No persistir el token plano.
- No registrar `newPassword`, `password_hash`, `captchaToken`, ni `token`.
- `tokenHash` opcionalmente redactado en logs (mostrar solo prefix).

---

## 13. Testing Strategy

### Unit Tests

- `RequestPasswordResetUseCase` (éxito, email inexistente, captcha inválido, rate limit).
- `ResetPasswordUseCase` (éxito, token consumido, expirado, inexistente, política débil).
- `PasswordResetTokenRepository` (mock Prisma).
- `MockEmailSender` (log emitido con destinatario y link).

### Integration Tests

- Cadena de middlewares para ambos endpoints.
- Transacción atómica de `/reset` (rollback si falla cualquier paso).

### API Tests (Supertest)

- `202` neutro en `/reset-request` para email existente e inexistente.
- `204` en `/reset` exitoso.
- `400/410/422/429` en cada caso negativo.
- Verificar que el `Set-Cookie` no se emite en este flujo.

### E2E Tests (Playwright)

- Flujo completo: `forgot-password` → captura del link desde el log de `MockEmailSender` → `reset-password` → `login` con nueva contraseña.
- Caso `410` con CTA "Solicitar nuevo enlace".

### Security Tests

- Token plano nunca aparece en logs.
- Idempotencia de `202`.
- Rate limit verificable.

### Accessibility Tests

- `axe` en ambas páginas.

### AI Tests

No aplica.

### Seed / Demo Tests

- Validar que las credenciales seed permiten ejecutar el flujo completo en CI.

### CI Checks

- Cobertura `modules/auth` y `modules/notifications` ≥ 85%.

---

## 14. Observability & Audit

### Logs

- `auth.reset.requested` / `.no_email` / `.authenticated`.
- `auth.reset.completed`.
- `auth.reset.failure { reason }`.

### Correlation ID

- Provisto por `correlationMiddleware`.

### AdminAction

- No requerido.

### Error Tracking

- Reportar por nivel.

### Metrics

- `auth_reset_request_total{result}`, `auth_reset_total{result}`, `auth_reset_email_sent_total`.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

- Reutiliza usuarios seed (Doc 11) para el flujo demo.

### Demo Scenario Supported

- Forgot/reset/login E2E para los 3 roles.

### Reset / Isolation Notes

- `password_reset_tokens` queda vacío al resetear el entorno demo (truncate explícito en la rutina de reset).

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| Doc 19 §11 + SEC-POL-AUTH-006 | TTL 15 min | TTL 30 min (Decisión PO US-004 #4) | Anotar override formal en Doc 19 §11. Sin ADR. | No |
| Doc 19 SEC-POL-AUTH-005 | `200 OK` | `202 Accepted` (Decisión PO US-004 #1, Doc 16 §22.3) | Anotar override en Doc 19 SEC-POL-AUTH-005. Sin ADR. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Token plano accidentalmente en logs | Toma de cuenta | Redacción en logger; test que falla si aparece |
| Race entre captcha y rate limit | UX confusa | Documentar orden middleware y testear combinaciones |
| `MockEmailSender` confunde con email real en prod | Falsa señal | Configurar `EMAIL_SENDER_PROVIDER` por entorno; warning startup en prod si Mock activo |
| TTL 30 min vs Doc 19 15 min | Confusión documental | Documentation Alignment Required + anotación en §10 |
| Multiples tokens simultáneos por usuario | Tokens activos paralelos | Permitir múltiples mientras sigan el rate limit; cada token se invalida al usarse o al expirar |

---

## 18. Implementation Guidance for Coding Agents

- Archivos/carpetas probablemente impactados:
  - Backend: `apps/api/src/modules/auth/application/use-cases/{RequestPasswordResetUseCase,ResetPasswordUseCase}.ts`; `apps/api/src/modules/auth/interfaces/http/AuthController.{requestPasswordReset,resetPassword}.ts`; `apps/api/src/modules/auth/application/schemas/{ForgotPasswordRequestSchema,ResetPasswordRequestSchema}.ts`; `apps/api/src/modules/notifications/{EmailSender.ts,MockEmailSender.ts}`; `apps/api/src/modules/auth/infrastructure/PasswordResetTokenRepository.ts`; `prisma/schema.prisma`; nueva migración.
  - Frontend: `apps/web/app/[locale]/auth/{forgot-password,reset-password}/page.tsx`; `apps/web/components/auth/{ForgotPasswordForm,ResetPasswordForm,TokenExpiredBanner}.tsx`; `apps/web/lib/api/authApi.ts`; `apps/web/lib/hooks/{useForgotPassword,useResetPassword}.ts`; `apps/web/messages/{es-LATAM,es-ES,pt,en}/{forgotPassword,resetPassword}.json`.
  - Tests: `apps/api/test/modules/auth/{request-reset,reset}.api.test.ts`; `apps/api/test/modules/notifications/MockEmailSender.test.ts`; `e2e/forgot-reset-login.spec.ts`.
- Orden recomendado:
  1. DB: schema Prisma + migración `password_reset_tokens`.
  2. Backend: schemas Zod → `PasswordResetTokenRepository` → `MockEmailSender` → use cases → controllers + middleware chain.
  3. Tests unit/integration/API.
  4. Frontend: páginas + forms + mutations + i18n.
  5. E2E (capturando link desde log).
  6. Documentation Alignment.
- Decisiones que no deben reabrirse:
  - `202 Accepted` en `/reset-request` siempre.
  - TTL 30 min.
  - Sin VR "≠ anterior".
  - Sin invalidación global de sesiones.
- Lo que no debe implementarse:
  - SMTP real obligatorio en MVP.
  - SMS / WhatsApp / 2FA.
  - Comparación contra hash anterior.
- Supuestos a preservar:
  - El backend es la única fuente de verdad.
  - Logs no exponen secretos.

---

## 19. Task Generation Notes

- Grupos sugeridos:
  - `auth-be-recover`: schemas, repos, use cases, controllers, middleware chain.
  - `auth-notif-recover`: `EmailSender` + `MockEmailSender`.
  - `auth-fe-recover`: pages, forms, mutations, captcha, i18n.
  - `auth-db-recover`: migración + Prisma model.
  - `auth-qa-recover`: unit/integration/API/E2E/security.
  - `auth-ops-recover`: variables, secrets, configuración de adapter por entorno.
  - `auth-obs-recover`: eventos y métricas.
  - `auth-doc-recover`: alineación Doc 19 §11 y SEC-POL-AUTH-005.
- Tareas QA obligatorias:
  - Idempotencia de `202`.
  - Política de contraseña.
  - Redacción de logs.
- Tareas de seguridad:
  - Token no plano en BD ni logs.
  - Captcha server-side.
- Tareas seed/demo:
  - E2E con seed.
- Documentación:
  - Notas de alignment en Doc 19.
- Dependencias:
  - `auth-fe-recover` depende de `auth-be-recover`.
  - `auth-qa-recover` depende de todas.

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

`Ready for Task Breakdown`.

US-004 está aprobada con decisiones formalizadas y dependencias resueltas. Documentation Alignment con Doc 19 §11 / SEC-POL-AUTH-005 no bloqueante. Próxima skill: `eventflow-user-story-to-development-tasks`.
