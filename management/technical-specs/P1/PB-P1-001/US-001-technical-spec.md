# Technical Specification — US-001: Registrarme como organizador con captcha

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-001 |
| Source User Story | `management/user-stories/US-001-register-organizer-account.md` |
| Decision Resolution Artifact | No aplica (decisiones formalizadas en `PO/BA Decisions Applied` y ADR-SEC-001/003 + PO 8.1 #8) |
| Priority | P1 |
| Backlog ID | PB-P1-001 |
| Backlog Title | Registro Organizador con captcha |
| Backlog Execution Order | Primer ítem de P1 dentro de EPIC-AUTH-001 |
| User Story Position in Backlog Item | 1 de 1 |
| Related User Stories in Backlog Item | US-001 |
| Epic | EPIC-AUTH-001 — Authentication & User Access |
| Backlog Item Dependencies | PB-P0-004 (endpoints REST), PB-P0-006 (cookies firmadas + captcha) |
| Feature | Registro de usuario con rol Organizador |
| Module / Domain | Auth |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-24 |
| Last Updated | 2026-06-24 |

---

## 2. Backlog Execution Context

### Product Backlog Item

PB-P1-001 abre la franja P1 del backlog y habilita el resto del recorrido funcional del MVP: sin organizadores registrados no existen eventos, planes IA, cotizaciones ni reseñas. Depende de PB-P0-004 (endpoints REST AUTH/EVENT/QUOTE/AI) y PB-P0-006 (cookies firmadas HTTP-only + captcha), ambos pertenecientes a la cimentación P0 ya completada.

### Execution Order Rationale

PB-P1-001 ejecuta primero dentro de P1 porque:

- Es el único ítem que materializa el FR-AUTH-001 con rol Organizer, único rol con recorrido completo en MVP.
- Es prerrequisito directo de PB-P1-002 (Vendor) y de toda la rama PB-P1-006..046.
- Sus dependencias P0 (PB-P0-004 endpoints AUTH y PB-P0-006 cookies + captcha) están cerradas.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-001 | Único entregable del backlog item | 1 |

---

## 3. Executive Technical Summary

Implementar el caso de uso `RegisterOrganizerUseCase` y el endpoint REST `POST /api/v1/auth/register` con validación Zod, verificación server-side de captcha (reCAPTCHA v3 / hCaptcha vía `CaptchaService` configurado en PB-P0-006), hash de contraseña con `argon2id`, creación atómica del `User` con `role=organizer`, emisión de cookie de sesión HTTP-only firmada y rate limit por IP (5/IP/10 min). Frontend Next.js (App Router) entrega la página `/[locale]/auth/register` con el form `RegisterOrganizerForm` (RHF + Zod), `CaptchaWidget`, `PasswordStrengthIndicator`, `useRegisterOrganizer` (TanStack Query mutation) y mensajes en `next-intl` para `es-LATAM`, `es-ES`, `pt`, `en`. Persistencia sobre la tabla existente `users` (Doc 18 §13) sin migraciones nuevas. Auditoría con `correlationId`, eventos `auth.register.success` / `auth.register.failure`. No se introducen entidades nuevas, no se invoca IA, no se requiere seed adicional.

---

## 4. Scope Boundary

### In Scope

- Endpoint REST `POST /api/v1/auth/register` para `role=organizer`.
- Validación Zod (frontend y backend) alineada al DTO `RegisterOrganizerDTO`.
- Verificación captcha server-side antes de cualquier persistencia.
- Hash `argon2id` y emisión de cookie de sesión HTTP-only firmada.
- Rate limit por IP en `/auth/register` (5/IP/10 min).
- Página `/[locale]/auth/register` con i18n (`es-LATAM`, `es-ES`, `pt`, `en`).
- Logs estructurados y eventos de auditoría.
- Tests unitarios, integración, API y E2E del flujo.

### Out of Scope

- Registro Vendor (US-002 / PB-P1-002).
- Login y logout (PB-P1-003).
- Reset/recuperación de contraseña.
- Confirmación de email obligatoria como bloqueante (no aplica en MVP).
- OAuth Google (US-008, Could Have / Future).
- MFA, SSO empresarial, KYC.
- Email real de bienvenida (en MVP se simula vía log `event=email_simulated`).
- Cambios de esquema en `users` (ya cubierto por PB-P0-001).

### Explicit Non-Goals

- No expone existencia de cuentas con mensajes diferenciales.
- No persiste secretos de captcha en base de datos.
- No registra contraseña, hash, ni captchaToken en logs.
- No implementa multi-rol simultáneo por usuario.

---

## 5. Architecture Alignment

### Backend Architecture

- Node.js + Express + TypeScript bajo el monolito modular (`modules/auth`) según Doc 14.
- `RegisterOrganizerUseCase` orquesta: Zod → captcha → email-unique → hash → repo create → session cookie.
- Controlador delgado `POST /api/v1/auth/register` con middleware `captchaMiddleware` + `rateLimitMiddleware`.
- Repositorio `UserRepository.createWithRole` sobre Prisma; lookup case-insensitive con `LOWER(email)`.

### Frontend Architecture

- Next.js App Router con segmento `/[locale]/auth/register` como Client Component (form interactivo).
- Composición: `RegisterOrganizerForm`, `CaptchaWidget`, `PasswordStrengthIndicator`.
- Estado vía React Hook Form + Zod schema compartido (DTO source-of-truth).
- Fetching vía TanStack Query mutation `useRegisterOrganizer` con `authApi.registerOrganizer`.
- i18n con next-intl; copy en `messages/<locale>/auth.json`.

### Database Architecture

- Tabla existente `users` (Doc 18 §13). Sin migraciones nuevas.
- Constraint único funcional `uq_users_email_lower ON (LOWER(email))` ya disponible (PB-P0-001).
- `preferred_language` recibe el header `Accept-Language` normalizado a `language_code`.

### API Architecture

- Endpoint público bajo `/api/v1` con error envelope estándar (Doc 16 §11).
- Status `201 Created` en éxito; `400 VALIDATION_ERROR`, `409 EMAIL_TAKEN`, `429 RATE_LIMIT_EXCEEDED`, `422` cuando aplique.
- Header `Set-Cookie` con la sesión firmada; cuerpo de respuesta sin `password_hash` y sin token completo de captcha.

### AI / PromptOps Architecture

No aplica — esta historia no invoca IA directamente.

### Security Architecture

- `argon2id` con `memoryCost=19MiB`, `timeCost=2`, `parallelism=1` (Doc 19 §11.1, ADR-SEC-003).
- Cookie de sesión `HttpOnly`, `Secure`, `SameSite=Lax`, firmada con secret de Secrets Manager.
- Rate limit por IP (5/IP/10 min) en `rateLimitMiddleware`.
- Captcha verificado server-side (`captchaMiddleware`, PB-P0-006).
- Redacción en logs: nunca `password`, `password_hash`, `captchaToken`, `set-cookie`.

### Testing Architecture

- Vitest + Supertest para integration/API.
- Playwright para E2E del flujo de registro.
- MSW para mocks del proveedor de captcha en tests.
- Tests negativos: captcha inválido, password débil, rate limit, intento de `role=admin`.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 (registro exitoso) | Pipeline Zod → captcha → unique-email → argon2id → `User.create({role:'organizer'})` → cookie firmada → `201 Created` | BE, FE, API, DB, SEC |
| AC-02 (idioma preferido) | Inferir `preferred_language` desde `Accept-Language` (fallback `es-LATAM`) y persistir | BE, DB, FE |
| AC-03 (email único) | Lookup `LOWER(email)` con constraint funcional; respuesta `409 EMAIL_TAKEN`; UI muestra mensaje neutro | BE, API, DB, FE |
| EC-01 (captcha inválido) | `captchaMiddleware` retorna `400 VALIDATION_ERROR` con `details[].field='captchaToken'`; widget se reinicia | BE, FE, API |
| EC-02 (password débil) | Validación Zod en FE y BE; `400 VALIDATION_ERROR` con `details[]` por campo | BE, FE |
| EC-03 (email mal formado) | Validación Zod en FE y BE antes de tocar DB | BE, FE |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

- `modules/auth`
  - `application/use-cases/RegisterOrganizerUseCase.ts`
  - `infrastructure/http/auth.controller.ts`
  - `infrastructure/persistence/UserRepository.ts`
  - `infrastructure/security/PasswordHasher.ts` (argon2id wrapper)
  - `infrastructure/security/SessionCookieIssuer.ts` (reutilizado de PB-P0-006)
  - `infrastructure/security/CaptchaService.ts` (reutilizado de PB-P0-006)

### Use Cases / Application Services

- `RegisterOrganizerUseCase.execute(input: RegisterOrganizerDTO, ctx: RequestContext): Promise<RegisterOrganizerResult>`
  - Verifica captcha (idempotente: si captcha middleware ya validó, recibe `captchaVerified=true`).
  - Hash password con `argon2id`.
  - Repositorio `createUser({role:'organizer', preferredLanguage})` en transacción.
  - Emite cookie de sesión.
  - Loguea `auth.register.success` con `correlationId` y `userId` (sin email completo en prod).

### Controllers / Routes

| Método | Ruta | Middleware | Handler |
|---|---|---|---|
| POST | `/api/v1/auth/register` | `rateLimitMiddleware('register')` → `captchaMiddleware('register')` → `validateBody(RegisterOrganizerDTO)` → `noActiveSessionGuard` | `authController.registerOrganizer` |

### DTOs / Schemas

```ts
// RegisterOrganizerDTO (Zod)
{
  name: string (2..120),
  email: string (RFC, lowercased on output),
  password: string (10..256, ≥1 letter, ≥1 number, !== email localpart),
  acceptedTerms: literal(true),
  captchaToken: string (no vacío),
  preferredLanguage?: 'es-LATAM' | 'es-ES' | 'pt' | 'en'
}
```

Response `201`:

```ts
{
  data: {
    id: string (uuid),
    name: string,
    email: string,
    role: 'organizer',
    preferredLanguage: 'es-LATAM' | 'es-ES' | 'pt' | 'en'
  }
}
```

### Repository / Persistence

- `UserRepository.findByEmailLower(email)` para chequeo previo opcional (defensa en profundidad; constraint sigue siendo source of truth).
- `UserRepository.create({ ...payload, role:'organizer', passwordHash })` envuelto en `prisma.$transaction` cuando se generen registros derivados (welcome simulated log queda fuera de la transacción).

### Validation Rules

- VR-01..VR-06 traducidos al Zod schema y a checks server-side defensivos.
- Backend siempre fuerza `role='organizer'` (ignora cualquier valor entrante).

### Error Handling

| Caso | HTTP | Code | Mensaje (UI) |
|---|---|---|---|
| Zod inválido | 400 | `VALIDATION_ERROR` | "Revisa los datos del formulario" + `details[]` |
| Captcha inválido | 400 | `VALIDATION_ERROR` (`field='captchaToken'`) | "Verificación de seguridad fallida" |
| Email duplicado | 409 | `EMAIL_TAKEN` | "No fue posible completar el registro" |
| Rate limit | 429 | `RATE_LIMIT_EXCEEDED` (+ `Retry-After`) | "Demasiados intentos. Vuelve a intentarlo más tarde" |
| Sesión activa | 409 / 302 | — | Redirección al dashboard |
| Error infra (hash/db) | 500 | `INTERNAL_ERROR` | Mensaje genérico + log con `correlationId` |

### Transactions

- `prisma.$transaction` envuelve la creación del `User`. La emisión de cookie ocurre fuera de la transacción y antes de responder. Si la cookie no puede emitirse, se propaga `500` y se revierte (cuenta creada → ver mitigación en sección 17).

### Observability

- Eventos: `auth.register.success`, `auth.register.failure` (razón: `validation`, `captcha`, `email_taken`, `rate_limit`).
- `email_simulated` para welcome con `template='welcome.organizer'` (campos `to`, `template`, sin token).
- Métricas: contador por `outcome`, latencia p50/p95.

---

## 8. Frontend Technical Design

### Routes / Pages

- `/[locale]/auth/register` (Client Component).
- Layout `/[locale]/auth/layout.tsx` reutilizado.

### Components

- `RegisterOrganizerForm` (server-safe wrapper + client form).
- `CaptchaWidget` (configura `siteKey` por ambiente; expone callback `onToken`).
- `PasswordStrengthIndicator` (visual; no es la validación canónica).
- `FormField`, `Button`, `Alert` (design system existente).

### Forms

- React Hook Form + `zodResolver(RegisterOrganizerSchema)`.
- Schema compartido con backend (paquete `shared/auth-schemas` o duplicado disciplinado bajo lint).
- Botón deshabilitado mientras `mutation.isPending` o captcha no resuelto.

### State Management

- TanStack Query mutation `useRegisterOrganizer`.
- `onError` mapea `code` → mensaje i18n; `onSuccess` redirige a `/[locale]/dashboard`.

### Data Fetching

- `authApi.registerOrganizer(payload)` sobre `apiClient` base.
- No requiere prefetch; flujo es escritura.

### Loading / Empty / Error / Success States

| Estado | Comportamiento |
|---|---|
| Loading | Spinner en botón; inputs bloqueados |
| Error de campo | Mensaje a nivel de campo con `aria-describedby` |
| Error global | Banner superior con `role="alert"` |
| Éxito | Toast "Cuenta creada con éxito" + redirección al dashboard |

### Accessibility

- Labels asociados a inputs (`htmlFor`).
- Focus inicial en input `name`.
- Mensajes de error `aria-live="polite"`.
- Contraste mínimo AA en errores.

### i18n

- Claves bajo `messages/<locale>/auth.json`.
- Locales obligatorios: `es-LATAM`, `es-ES`, `pt`, `en`.

---

## 9. API Contract Design

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| POST | `/api/v1/auth/register` | Crear cuenta organizador con captcha | No (anonymous, bloquear sesiones activas) | `RegisterOrganizerDTO` (JSON) | `201` con `{ data: User }` + `Set-Cookie` sesión | `400 VALIDATION_ERROR` (incluye captcha), `409 EMAIL_TAKEN`, `429 RATE_LIMIT_EXCEEDED`, `500 INTERNAL_ERROR` |

Headers requeridos:

- Request: `Content-Type: application/json`, `Accept-Language` (para inferir `preferred_language`).
- Response: `Set-Cookie: sid=...; HttpOnly; Secure; SameSite=Lax`, `X-Correlation-Id`.

---

## 10. Database / Prisma Design

### Models Impacted

- `User` (tabla `users`). Sin cambios estructurales; usa columnas y constraints existentes.

### Fields / Columns

Usados por esta historia: `id`, `email`, `password_hash`, `name`, `role`, `preferred_language`, `status`, `is_seed=false`, `created_at`, `updated_at`.

### Relations

No introduce nuevas FKs.

### Indexes

Reutiliza `uq_users_email_lower` y `idx_users_role_status`.

### Constraints

Reutiliza `chk_users_email_not_empty`, `chk_users_password_hash_not_empty`, enum `user_role`.

### Migrations Impact

Ninguna. La spec depende de migraciones ya entregadas en PB-P0-001.

### Seed Impact

No requiere cambios de seed. Los datos demo del organizador se introducen en PB-P0-003 / EPIC-DEMO-001 y no son alcance de esta historia.

---

## 11. AI / PromptOps Design

No aplica — esta historia no invoca IA directamente.

---

## 12. Security & Authorization Design

### Authentication

- Endpoint público; el flujo emite la primera sesión.
- `noActiveSessionGuard` redirige (`409` o `302`) si ya existe sesión válida (SEC-01).

### Authorization

- Backend fuerza `role='organizer'`. Cualquier intento de elevar a `admin` se descarta (SEC-02).
- ADR-SEC-003 — backend como source of truth.

### Ownership Rules

No aplica (sin recursos pre-existentes que asignar).

### Role Rules

- `admin` jamás se crea por registro (BR-AUTH-002).
- `vendor` se atiende en US-002 (endpoint compartido sólo estructuralmente, mismo controller con `role` derivado).

### Negative Authorization Scenarios

| Escenario | Esperado |
|---|---|
| Usuario ya autenticado | 409 / redirección al dashboard |
| Payload con `role='admin'` | Backend ignora; persiste `organizer` |
| Captcha ausente o inválido | `400 VALIDATION_ERROR` |
| Brute force IP | `429 RATE_LIMIT_EXCEEDED` |

### Audit Requirements

- `auth.register.success` con `userId`, `correlationId`, `ip`, `userAgent`.
- `auth.register.failure` con `reason`, `correlationId` (sin email completo en prod).

### Sensitive Data Handling

- Nunca loguear `password`, `password_hash`, `captchaToken`, `set-cookie`.
- Email redactado en logs prod (hash o local-part truncado).
- Cookies con flags `HttpOnly`, `Secure`, `SameSite=Lax`.

---

## 13. Testing Strategy

### Unit Tests

- `RegisterOrganizerUseCase` (mocks de `UserRepository`, `PasswordHasher`, `CaptchaService`, `SessionCookieIssuer`).
- Zod schema (positivos y negativos por VR-01..VR-06).
- `PasswordHasher` (verifica algoritmo y parámetros).

### Integration Tests

- Use case + repositorio real contra Postgres de test (constraint funcional `LOWER(email)`).
- Caso `email_taken` reproduce el `409 EMAIL_TAKEN`.

### API Tests

- Supertest sobre `POST /api/v1/auth/register` cubriendo:
  - 201 happy path con cookie HttpOnly/Secure/SameSite.
  - 400 captcha inválido.
  - 400 password débil.
  - 409 email duplicado.
  - 429 rate limit (clock injectable / `vi.useFakeTimers`).
  - Intento `role='admin'` → persiste `organizer`.

### E2E Tests

- Playwright: registro completo con captcha mockeado (MSW + fake captcha provider) y aterrizaje en dashboard `/[locale]/dashboard`.

### Security Tests

- `password_hash` no presente en response (TS-03 extendido).
- Logs no contienen `password` ni `captchaToken`.
- Rate limit alcanzable; respuestas `429` con `Retry-After`.

### Accessibility Tests

- axe-core en la página `/auth/register` (sin violaciones críticas).
- Navegación por teclado Tab/Shift+Tab/Enter; focus visible.

### AI Tests

No aplica.

### Seed / Demo Tests

No aplica.

### CI Checks

- Unit + integration + API verdes.
- E2E del flujo de registro como suite mínima.
- Lint Zod schema compartido.

---

## 14. Observability & Audit

### Logs

- `auth.register.success` (info): `userId`, `role`, `preferredLanguage`, `correlationId`.
- `auth.register.failure` (warn): `reason`, `correlationId`.
- `email_simulated` (info): `template='welcome.organizer'`, `to` redactado.

### Correlation ID

- Provisto por middleware global; obligatorio en logs y `X-Correlation-Id` en response.

### AdminAction

No aplica.

### Error Tracking

- Sentry (o equivalente) captura `500 INTERNAL_ERROR` con `correlationId` y stack limpio (sin payload sensible).

### Metrics

- `auth_register_outcome_total{outcome}` (counter).
- `auth_register_latency_ms` (histogram).

---

## 15. Seed / Demo Data Impact

No aplica — la historia no requiere cambios de seed/demo.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| Doc 16 §Error Catalog | La US previa referenciaba `CAPTCHA_INVALID` y `RATE_LIMITED` no estándar | `VALIDATION_ERROR` (field `captchaToken`) + `RATE_LIMIT_EXCEEDED` | Si se desea un código dedicado captcha, formalizarlo en una iteración futura del catálogo | No |
| Doc 19 §11.2 | Versión Draft de la US exigía mayúscula/símbolo | Política MVP (mín. 10, una letra y un número, distinta del localpart) | Mantener política MVP; cualquier endurecimiento requiere PO + ADR | No |
| PB-P1-001 Acceptance Summary | "password fuerte (Argon2/bcrypt)" | `argon2id` como default; `bcrypt(12)` como fallback (Doc 19 §11.1) | Actualizar la summary del backlog en próxima revisión | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Cookie de sesión falla tras crear `User` | Cuenta huérfana sin sesión | Crear `User` y emitir cookie en handler único; si la cookie falla, responder `500` y permitir reintento de login (sin rollback duro: el usuario podrá loguearse después). |
| Selección formal de proveedor captcha aún pendiente | Bloqueo de tests reales | Usar fake provider en test/dev (PB-P0-006); la elección concreta entre reCAPTCHA v3 y hCaptcha es configuración por ambiente sin impacto en contrato. |
| Diferencia de timing en `email_taken` enumera cuentas | Riesgo de privacy/enumeración | Forzar tiempo constante en path positivo y negativo cuando sea factible; mensaje UI neutro independiente del caso. |
| Rate limit por email candidato no formalizado en Doc 19 | Posible gap operativo | Implementar solamente el límite por IP documentado (5/IP/10 min). Cualquier extensión por email queda fuera de scope hasta decisión PO. |
| `Set-Cookie` con `Secure` en local dev (HTTP) | Cookie no se establece | Configurar `Secure` por ambiente (off en local, on en preview/demo/prod). |

---

## 18. Implementation Guidance for Coding Agents

Archivos / carpetas probablemente impactados:

- `apps/api/src/modules/auth/application/use-cases/RegisterOrganizerUseCase.ts` (nuevo)
- `apps/api/src/modules/auth/infrastructure/http/auth.controller.ts` (extender)
- `apps/api/src/modules/auth/infrastructure/http/auth.routes.ts` (extender)
- `apps/api/src/modules/auth/infrastructure/persistence/UserRepository.ts` (extender)
- `apps/api/src/modules/auth/infrastructure/security/PasswordHasher.ts` (nuevo si no existe)
- `apps/api/src/shared/middleware/rateLimit.ts` (configurar bucket `register`)
- `apps/api/src/shared/middleware/captcha.ts` (reutilizar PB-P0-006)
- `apps/web/app/[locale]/auth/register/page.tsx` (nuevo)
- `apps/web/components/auth/RegisterOrganizerForm.tsx` (nuevo)
- `apps/web/components/auth/CaptchaWidget.tsx` (reutilizar PB-P0-006)
- `apps/web/lib/api/authApi.ts` (extender)
- `apps/web/messages/{es-LATAM,es-ES,pt,en}/auth.json` (extender)
- `tests/api/auth.register.spec.ts` (nuevo)
- `tests/e2e/auth-register.spec.ts` (nuevo)

Orden recomendado:

1. Backend: `RegisterOrganizerDTO`, `RegisterOrganizerUseCase`, controller + ruta, middlewares.
2. Tests unit + integration + API en paralelo.
3. Frontend: schema compartido, form, mutation, página.
4. E2E + accesibilidad + i18n.
5. Logs/observabilidad y verificación de redacción.

Decisiones que no deben reabrirse:

- `argon2id` como default (Doc 19, ADR-SEC-003).
- Política de contraseñas MVP (Doc 19 §11.2).
- Captcha obligatorio (PO 8.1 #8 / BR-AUTH-011).
- `409 EMAIL_TAKEN` para email duplicado (Doc 16).
- Sin doble opt-in obligatorio (MVP).

No implementar:

- Confirmación de email obligatoria como bloqueante de login.
- OAuth / MFA / SSO.
- Endpoint Vendor (US-002).
- Cambios de esquema en `users`.

Asunciones a preservar:

- `CaptchaService` ya inyectable y configurable por ambiente (PB-P0-006).
- `SessionCookieIssuer` ya disponible y configurado por ambiente.
- `LOWER(email)` constraint vigente.

---

## 19. Task Generation Notes

Grupos sugeridos de tareas:

- **BE** (use case, controller, repositorio, middleware register-bucket, errores).
- **FE** (página, form, widget captcha, mutation, i18n, estados de UX).
- **SEC** (verificar redacción de logs, flags de cookie por ambiente, hashing parámetros, rate limit).
- **QA** (unit, integration, API, E2E, accesibilidad).
- **OPS / Config** (configuración Secrets Manager para session secret y captcha keys; bucket de rate limit).
- **DOC** (actualizar PB-P1-001 acceptance summary para reflejar `argon2id` como default; nota de catálogo de errores).

Dependencias entre tareas:

- FE depende del schema definido por BE (idealmente compartido).
- QA-E2E depende de BE y FE entregados con MSW/fake captcha.
- SEC-redacción depende de logs implementados.

Consolidación: la spec del backlog item PB-P1-001 produce un único `tasks.md` consolidado para US-001.

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass |
| Product Backlog mapping found | Pass |
| Decision Resolution reviewed if present | N/A |
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

`Ready for Task Breakdown` — la especificación está completa, alineada con PB-P1-001 y sus dependencias P0 (PB-P0-004 / PB-P0-006), preserva las decisiones formalizadas (PO 8.1 #8, BR-AUTH-001/002/011, ADR-SEC-001/003, Doc 19 §11.1-11.2, Doc 16 catálogo de errores), y cubre AC-01..03 + EC-01..03 sin scope creep ni decisiones nuevas que el PO deba reabrir. Las notas no bloqueantes del Approval Gate quedan resueltas en las secciones 4 (out of scope), 12 (security) y 17 (risks).
