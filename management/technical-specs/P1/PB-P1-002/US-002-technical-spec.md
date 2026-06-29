# Technical Specification — US-002: Registrarme como proveedor con captcha

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-002 |
| Source User Story | `management/user-stories/US-002-register-vendor-account.md` |
| Decision Resolution Artifact | No aplica (decisiones formalizadas en `PO/BA Decisions Applied` y ADR-SEC-001/003 + PO 8.1 #8) |
| Priority | P1 |
| Backlog ID | PB-P1-002 |
| Backlog Title | Registro Vendor con captcha |
| Backlog Execution Order | Segundo ítem de P1 dentro de EPIC-AUTH-001 (sigue a PB-P1-001) |
| User Story Position in Backlog Item | 1 de 1 |
| Related User Stories in Backlog Item | US-002 |
| Epic | EPIC-AUTH-001 — Authentication & User Access |
| Backlog Item Dependencies | PB-P0-004 (endpoints REST), PB-P0-006 (cookies firmadas + captcha), PB-P1-001 (controller `/auth/register` ya operando) |
| Feature | Registro de usuario con rol Proveedor |
| Module / Domain | Auth |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-24 |
| Last Updated | 2026-06-24 |

---

## 2. Backlog Execution Context

### Product Backlog Item

PB-P1-002 sigue a PB-P1-001 en la franja P1 y materializa el lado de la oferta del marketplace. Sin proveedores registrados (y posteriormente aprobados en US-074) no existe directorio público ni flujo de cotización. Depende de PB-P0-004, PB-P0-006 y, operativamente, de PB-P1-001 que ya entregó el endpoint `POST /api/v1/auth/register` y los componentes compartidos.

### Execution Order Rationale

Esta US ejecuta después de PB-P1-001 porque:

- Comparte controller, repositorio, hasher y middlewares (captcha, rate limit) ya implementados en US-001.
- Maximiza reuso: el endpoint discrimina por `role` y reutiliza casi toda la infraestructura.
- Habilita PB-P1-024..029 (vendor directory, profile, services) que dependen de tener usuarios con `role=vendor`.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-002 | Único entregable del backlog item | 1 |

---

## 3. Executive Technical Summary

Extender el módulo `auth` para soportar el registro de proveedores reutilizando la mayor parte de la infraestructura entregada por PB-P1-001. Introducir el caso de uso `RegisterVendorUseCase` (espejo de `RegisterOrganizerUseCase` con `role=vendor` y CTA hacia onboarding US-040). El endpoint REST `POST /api/v1/auth/register` se mantiene único: el controller deriva el rol del parámetro `role` (`organizer` | `vendor`) validado contra una whitelist; el backend nunca permite `admin`. Frontend introduce la página `/[locale]/auth/register` (mismo segmento) parametrizada por `role=vendor`, renderizando `RegisterVendorForm` (etiquetas comerciales) y reutilizando `CaptchaWidget`, `PasswordStrengthIndicator`, mutation, schema, i18n. Persistencia exclusiva sobre `users`; sin tocar `vendor_profiles`. Post-registro, el frontend redirige al CTA de onboarding (`/[locale]/vendor/onboarding`) que abrirá US-040.

---

## 4. Scope Boundary

### In Scope

- Soporte de `role=vendor` en `POST /api/v1/auth/register`.
- `RegisterVendorUseCase` (o branching dentro del use case con discriminator `role`).
- `RegisterVendorDTO` (Zod) con `business_name` (2..150).
- Página `/[locale]/auth/register` parametrizada por `role=vendor` con `RegisterVendorForm` y copy específica.
- Redirección a `/[locale]/vendor/onboarding` (placeholder de US-040; ruta segura cubierta por `requireRole('vendor')`).
- Tests unitarios, integración, API, E2E del flujo vendor.
- Reuso de captcha, rate limit, cookie issuer y hasher.

### Out of Scope

- Creación del `VendorProfile` (US-040 / PB-P1-024).
- Aprobación admin del proveedor (US-074 / PB-P1-041).
- Multi-rol (KO explícito).
- KYC, validación documental, subscription, payouts.
- OAuth Google, MFA, SSO.
- Migraciones de schema sobre `users` o `vendor_profiles`.
- Email real de bienvenida (sigue simulado en MVP).

### Explicit Non-Goals

- No agrega un endpoint separado `/auth/register-vendor`; se mantiene único `/auth/register` con discriminator `role`.
- No diferencia mensajes de error entre `organizer` y `vendor` para `EMAIL_TAKEN` (single-role MVP).
- No persiste secretos de captcha en BD.
- No registra password, hash, cookie ni token de captcha en logs.

---

## 5. Architecture Alignment

### Backend Architecture

- Node.js + Express + TypeScript en `modules/auth`.
- `RegisterVendorUseCase` reutiliza `UserRepository`, `PasswordHasher`, `SessionCookieIssuer`, `CaptchaService` (todos heredados de PB-P0-006 y PB-P1-001).
- Controller `auth.controller.registerHandler` extendido para enrutar internamente al use case correspondiente según `role`.

### Frontend Architecture

- Next.js App Router; segmento `/[locale]/auth/register` reutilizado (Client Component).
- Renderizado condicional por query `role=vendor` o variantes de página dedicadas si conviene (decidido en implementación: misma ruta, render por `role`).
- Componentes nuevos: `RegisterVendorForm`.
- Reutiliza `CaptchaWidget`, `PasswordStrengthIndicator`, `useRegisterVendor` mutation, i18n keys (`auth.register.vendor.*`).

### Database Architecture

- Tabla existente `users` (Doc 18 §13). Sin migraciones nuevas.
- Constraint funcional `uq_users_email_lower` cubre el caso `EMAIL_TAKEN` entre roles (single-role MVP).
- `users.role` se persiste como `vendor` (enum `user_role`).
- `vendor_profiles` NO se toca en esta historia.

### API Architecture

- Endpoint público `POST /api/v1/auth/register` con error envelope estándar (Doc 16 §11) — mismo del que entregó US-001.
- Discriminator `role: 'organizer' | 'vendor'` validado vía Zod whitelist.
- Status `201 Created` en éxito; `400 VALIDATION_ERROR`, `409 EMAIL_TAKEN`, `429 RATE_LIMIT_EXCEEDED`, `422` cuando aplique.

### AI / PromptOps Architecture

No aplica — esta historia no invoca IA directamente.

### Security Architecture

- `argon2id` con `memoryCost=19MiB`, `timeCost=2`, `parallelism=1` (Doc 19 §11.1, ADR-SEC-003).
- Cookie de sesión `HttpOnly`, `Secure`, `SameSite=Lax`, firmada con secret de Secrets Manager.
- Rate limit del bucket `register` (compartido con US-001): 5/IP/10 min.
- Captcha verificado server-side (`captchaMiddleware`, PB-P0-006).
- Backend fuerza `role=vendor`; cualquier intento `admin`/`organizer` se descarta.
- Logs sin `password`, `password_hash`, `captchaToken`, `set-cookie`.

### Testing Architecture

- Vitest + Supertest para integration/API; reuso de fixtures de US-001.
- Playwright para E2E del flujo vendor.
- MSW para mocks del proveedor de captcha.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 (registro vendor exitoso) | Pipeline Zod → captcha → unique-email → argon2id → `User.create({role:'vendor'})` → cookie firmada → `201 Created` | BE, FE, API, DB, SEC |
| AC-02 (onboarding CTA) | Frontend redirige a `/[locale]/vendor/onboarding`; ruta protegida por `requireRole('vendor')` (cuando el guard de rol esté disponible) | FE, SEC |
| AC-03 (idioma) | Inferir `preferred_language` desde `Accept-Language`; UI se carga en `pt`/`es-LATAM`/`es-ES`/`en` | BE, DB, FE |
| EC-01 (email duplicado entre roles) | Lookup `LOWER(email)` con constraint funcional; respuesta `409 EMAIL_TAKEN`; UI muestra mensaje neutro independiente del rol existente | BE, API, DB, FE |
| EC-02 (captcha inválido) | `captchaMiddleware` retorna `400 VALIDATION_ERROR` con `details[].field='captchaToken'` | BE, FE, API |
| EC-03 (password débil) | Validación Zod en FE y BE; `400 VALIDATION_ERROR` con `details[]` por campo | BE, FE |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

- `modules/auth`
  - `application/use-cases/RegisterVendorUseCase.ts` (nuevo, espejo del organizer)
  - `infrastructure/http/auth.controller.ts` (extender `registerHandler` para discriminar por `role`)
  - `infrastructure/http/auth.routes.ts` (sin cambios si la ruta ya está registrada por US-001)
  - `infrastructure/persistence/UserRepository.ts` (sin cambios)
  - `infrastructure/security/PasswordHasher.ts` (sin cambios)
  - `infrastructure/security/SessionCookieIssuer.ts` (sin cambios)
  - `infrastructure/security/CaptchaService.ts` (sin cambios)

Alternativa preferida (DRY): un único `RegisterUserUseCase` con `role` discriminator. Esta spec lo modela como `RegisterVendorUseCase` separado para mantener simetría con la nomenclatura del User Story y permitir extensiones específicas por rol; la implementación puede unificarlos si el equipo lo prefiere, siempre que cubra todos los AC y EC.

### Use Cases / Application Services

- `RegisterVendorUseCase.execute(input: RegisterVendorDTO, ctx: RequestContext): Promise<RegisterVendorResult>`
  - Verifica captcha (idempotente con middleware).
  - Hash password con `argon2id`.
  - Repositorio `createUser({role:'vendor', preferredLanguage, name: input.business_name})` en transacción.
  - Emite cookie de sesión.
  - Loguea `auth.register.success` (con `role='vendor'`) y `email_simulated` template `welcome.vendor`.

### Controllers / Routes

| Método | Ruta | Middleware | Handler |
|---|---|---|---|
| POST | `/api/v1/auth/register` | `rateLimitMiddleware('register')` → `captchaMiddleware('register')` → `validateBody(RegisterUserDTO)` → `noActiveSessionGuard` | `authController.registerHandler` (discrimina por `role`) |

### DTOs / Schemas

```ts
// RegisterUserDTO (Zod, discriminator)
discriminatedUnion('role', [
  RegisterOrganizerDTO,    // existente (US-001)
  RegisterVendorDTO        // nuevo (US-002)
])

// RegisterVendorDTO
{
  role: literal('vendor'),
  business_name: string (2..150),
  email: string (RFC),
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
    name: string,            // espeja business_name hasta US-040
    email: string,
    role: 'vendor',
    preferredLanguage: 'es-LATAM' | 'es-ES' | 'pt' | 'en'
  }
}
```

### Repository / Persistence

- Reutiliza `UserRepository.findByEmailLower(email)` y `UserRepository.create(payload)` introducidos por US-001.
- No requiere métodos nuevos.

### Validation Rules

- VR-01..VR-06 traducidos al schema discriminado y a checks defensivos server-side.
- Backend siempre fuerza `role='vendor'` (ignora cualquier valor entrante distinto).

### Error Handling

| Caso | HTTP | Code | Mensaje (UI) |
|---|---|---|---|
| Zod inválido | 400 | `VALIDATION_ERROR` | "Revisa los datos del formulario" + `details[]` |
| Captcha inválido | 400 | `VALIDATION_ERROR` (`field='captchaToken'`) | "Verificación de seguridad fallida" |
| Email duplicado (cualquier rol) | 409 | `EMAIL_TAKEN` | "No fue posible completar el registro" (mensaje idéntico al de US-001) |
| Rate limit | 429 | `RATE_LIMIT_EXCEEDED` (+ `Retry-After`) | "Demasiados intentos. Vuelve a intentarlo más tarde" |
| Sesión activa | 409 / 302 | — | Redirección al dashboard correspondiente al rol activo |
| Error infra (hash/db) | 500 | `INTERNAL_ERROR` | Mensaje genérico + log con `correlationId` |

### Transactions

- `prisma.$transaction` envuelve la creación del `User`. La emisión de cookie ocurre fuera de la transacción y antes de responder.

### Observability

- Eventos: `auth.register.success` (con `role='vendor'`), `auth.register.failure` (razones: `validation`, `captcha`, `email_taken`, `rate_limit`).
- `email_simulated` para welcome con `template='welcome.vendor'`.
- Métricas: contador `auth_register_outcome_total{role,outcome}` reutilizado.

---

## 8. Frontend Technical Design

### Routes / Pages

- `/[locale]/auth/register` (Client Component) renderiza `RegisterVendorForm` cuando `role=vendor` (query).
- `/[locale]/vendor/onboarding` (placeholder; ruta concreta de US-040; aquí se asume el path final).

### Components

- `RegisterVendorForm` (nuevo): inputs `business_name`, `email`, `password`, `acceptedTerms` + captcha.
- Reutiliza `CaptchaWidget`, `PasswordStrengthIndicator`, `Button`, `Alert`.

### Forms

- React Hook Form + `zodResolver(RegisterVendorSchema)`.
- Schema compartido con backend.
- Botón deshabilitado mientras `mutation.isPending` o captcha no resuelto.

### State Management

- TanStack Query mutation `useRegisterVendor`.
- `onError` mapea `code` → i18n key específica del flujo vendor.
- `onSuccess` redirige a `/[locale]/vendor/onboarding`.

### Data Fetching

- `authApi.registerVendor(payload)` sobre `apiClient` base (espejo del organizer).

### Loading / Empty / Error / Success States

| Estado | Comportamiento |
|---|---|
| Loading | Spinner en botón "Crear mi cuenta de proveedor"; inputs bloqueados |
| Error de campo | Mensaje a nivel de campo con `aria-describedby` |
| Error global | Banner superior con `role="alert"` |
| Éxito | Toast "Cuenta creada con éxito" + redirección a onboarding vendor |

### Accessibility

- Labels asociados a inputs.
- Focus inicial en input `business_name`.
- Mensajes de error `aria-live="polite"`.
- Contraste AA en errores y CTAs.

### i18n

- Claves bajo `messages/<locale>/auth.json` con namespace `register.vendor.*`.
- Locales obligatorios: `es-LATAM`, `es-ES`, `pt`, `en`.

---

## 9. API Contract Design

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| POST | `/api/v1/auth/register` | Crear cuenta proveedor con captcha (variant `role=vendor`) | No (anonymous; bloquear sesiones activas) | `RegisterUserDTO` con `role='vendor'` (JSON) | `201` con `{ data: User }` + `Set-Cookie` sesión | `400 VALIDATION_ERROR` (incluye captcha), `409 EMAIL_TAKEN`, `429 RATE_LIMIT_EXCEEDED`, `500 INTERNAL_ERROR` |

Headers requeridos:

- Request: `Content-Type: application/json`, `Accept-Language`.
- Response: `Set-Cookie: sid=...; HttpOnly; Secure; SameSite=Lax`, `X-Correlation-Id`.

---

## 10. Database / Prisma Design

### Models Impacted

- `User` (tabla `users`). Sin cambios estructurales; usa columnas y constraints existentes.
- `VendorProfile` (tabla `vendor_profiles`): NO impactada por esta historia.

### Fields / Columns

Usados: `id`, `email`, `password_hash`, `name` (= `business_name` en registro), `role='vendor'`, `preferred_language`, `status='active'`, `is_seed=false`, `created_at`, `updated_at`.

### Relations

No introduce nuevas FKs.

### Indexes

Reutiliza `uq_users_email_lower` y `idx_users_role_status`.

### Constraints

Reutiliza `chk_users_email_not_empty`, `chk_users_password_hash_not_empty`, enum `user_role`.

### Migrations Impact

Ninguna.

### Seed Impact

No requiere cambios de seed.

---

## 11. AI / PromptOps Design

No aplica — esta historia no invoca IA directamente.

---

## 12. Security & Authorization Design

### Authentication

- Endpoint público; el flujo emite la primera sesión.
- `noActiveSessionGuard` redirige si ya existe sesión válida.

### Authorization

- Backend fuerza `role='vendor'`. Cualquier intento de elevar a `admin` o cambiar a `organizer` se descarta.
- La ruta `/[locale]/vendor/onboarding` debe quedar protegida por un guard de rol vendor (heredado de la infraestructura de auth; si todavía no existe, la Tech Spec lo deja delegado a US-040/US-007 según el módulo de rutas protegidas).

### Ownership Rules

No aplica.

### Role Rules

- Backend fuerza `role=vendor`.
- Cuando se cree el `VendorProfile` en US-040, `status` inicial será `pending`. No es responsabilidad de esta historia.

### Negative Authorization Scenarios

| Escenario | Esperado |
|---|---|
| Usuario ya autenticado | 409 / redirección |
| Payload con `role='admin'` o `role='organizer'` | Backend fuerza `vendor` |
| Captcha ausente o inválido | `400 VALIDATION_ERROR` |
| Email duplicado (cualquier rol) | `409 EMAIL_TAKEN` con mensaje neutro |
| Brute force IP | `429 RATE_LIMIT_EXCEEDED` |

### Audit Requirements

- `auth.register.success` con `userId`, `role='vendor'`, `correlationId`.
- `auth.register.failure` con `reason`, `correlationId`.

### Sensitive Data Handling

- Nunca loguear `password`, `password_hash`, `captchaToken`, `set-cookie`.
- Email redactado en logs prod.

---

## 13. Testing Strategy

### Unit Tests

- `RegisterVendorUseCase` (mocks de `UserRepository`, `PasswordHasher`, `CaptchaService`, `SessionCookieIssuer`).
- Schema `RegisterVendorDTO` (positivos y negativos por VR-01..VR-06).

### Integration Tests

- Use case + repo real contra Postgres de test.
- Caso `email_taken` entre roles (organizer existente → registro vendor con mismo email → `409 EMAIL_TAKEN`).
- `preferred_language` inferido del header.

### API Tests

- Supertest sobre `POST /api/v1/auth/register` con `role='vendor'`:
  - 201 happy path con cookie HttpOnly/Secure/SameSite y `role='vendor'` en respuesta.
  - 400 captcha inválido.
  - 400 password débil.
  - 409 email duplicado entre roles (cross-role).
  - 429 rate limit.
  - Intento `role='admin'` y `role='organizer'` en payload → persiste `vendor`.

### E2E Tests

- Playwright: registro completo con captcha mockeado y aterrizaje en `/[locale]/vendor/onboarding`.

### Security Tests

- `password_hash` no presente en response.
- Logs no contienen `password` ni `captchaToken`.
- Mensaje neutro de `EMAIL_TAKEN` no expone rol existente.

### Accessibility Tests

- axe-core sobre `/auth/register?role=vendor` (sin violaciones críticas).
- Tab/Shift+Tab/Enter operativos.

### AI Tests

No aplica.

### Seed / Demo Tests

No aplica.

### CI Checks

- Unit + integration + API verdes.
- E2E del flujo vendor como suite mínima.

---

## 14. Observability & Audit

### Logs

- `auth.register.success` (info): `userId`, `role='vendor'`, `preferredLanguage`, `correlationId`.
- `auth.register.failure` (warn): `reason`, `correlationId`.
- `email_simulated` (info): `template='welcome.vendor'`, `to` redactado.

### Correlation ID

- Provisto por middleware global.

### AdminAction

No aplica.

### Error Tracking

- Sentry (o equivalente) captura `500 INTERNAL_ERROR` con `correlationId`.

### Metrics

- `auth_register_outcome_total{role,outcome}` (counter) — etiquetar por `role='vendor'`.
- `auth_register_latency_ms` (histogram).

---

## 15. Seed / Demo Data Impact

No aplica — la historia no requiere cambios de seed/demo. La carga de proveedores demo se realiza en seed dedicado (`is_seed=true`) fuera del scope de US-002.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| Doc 16 §Error Catalog | La US previa referenciaba `CAPTCHA_INVALID` no estándar | `VALIDATION_ERROR` (field `captchaToken`) | Mantener; si se requiere código dedicado captcha, formalizarlo a futuro | No |
| Doc 19 §11.2 | Versión Draft mencionaba "complejidad" amplia | Política MVP (mín. 10, una letra y un número) | Mantener política MVP | No |
| PB-P1-002 Acceptance Summary | No menciona explícitamente `EMAIL_TAKEN` cross-role | `409 EMAIL_TAKEN` para cualquier email duplicado independiente del rol | Actualizar la summary en próxima revisión del backlog | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Acoplamiento al endpoint de US-001 | Cambios en `auth.controller` pueden romper organizer | Tests cross-role (organizer + vendor) en la misma suite; controller con discriminator probado por ambos paths. |
| Cookie de sesión falla tras crear el `User` vendor | Cuenta huérfana sin sesión | Comportamiento idéntico a US-001: responder `500` y permitir login posterior. |
| Mensaje `EMAIL_TAKEN` neutro pero divergente entre flujos | Posible enumeración | Forzar mensaje idéntico en ambos flujos; tests verifican equivalencia. |
| Onboarding route aún no existe formalmente | Click del CTA cae en 404 | Esta spec asume `/[locale]/vendor/onboarding`; si US-040 elige otro path, sincronizar en task de DOC. |
| Convención `User.name` = nombre comercial | Posible confusión cuando US-040 introduzca contacto/operativo | Documentar en la Tech Spec; la diferenciación se entrega en US-040. |

---

## 18. Implementation Guidance for Coding Agents

Archivos / carpetas probablemente impactados:

- `apps/api/src/modules/auth/application/use-cases/RegisterVendorUseCase.ts` (nuevo)
- `apps/api/src/modules/auth/infrastructure/http/auth.controller.ts` (extender `registerHandler` con discriminator)
- `apps/api/src/modules/auth/infrastructure/http/dto/RegisterUserDTO.ts` (refactor a `discriminatedUnion`)
- `apps/web/app/[locale]/auth/register/page.tsx` (renderizado condicional `role=vendor`)
- `apps/web/components/auth/RegisterVendorForm.tsx` (nuevo)
- `apps/web/lib/api/authApi.ts` (agregar `registerVendor`)
- `apps/web/messages/{es-LATAM,es-ES,pt,en}/auth.json` (extender con keys `register.vendor.*`)
- `tests/api/auth.register.vendor.spec.ts` (nuevo)
- `tests/e2e/auth-register-vendor.spec.ts` (nuevo)

Orden recomendado:

1. Backend: schema discriminado, use case, controller extension.
2. Tests unit + integration + API en paralelo.
3. Frontend: schema, form, mutation, página.
4. E2E + accesibilidad + i18n.
5. Verificación de redacción y métricas etiquetadas por `role`.

Decisiones que no deben reabrirse:

- `argon2id` default (Doc 19, ADR-SEC-003).
- Política de contraseñas MVP.
- Captcha obligatorio (PO 8.1 #8 / BR-AUTH-011).
- `409 EMAIL_TAKEN` cross-role con mensaje neutro.
- Single-role MVP.

No implementar:

- Creación de `vendor_profiles` (US-040).
- Aprobación admin (US-074).
- KYC, subscription, payouts.

Asunciones a preservar:

- `CaptchaService`, `SessionCookieIssuer`, `PasswordHasher`, `UserRepository` ya disponibles (PB-P0-006 + PB-P1-001).
- Bucket de rate limit `register` ya configurado.

---

## 19. Task Generation Notes

Grupos sugeridos:

- **BE** (refactor schema a discriminated union, use case vendor, controller branching, errores).
- **FE** (form vendor, mutation, render condicional en la página, i18n).
- **SEC** (verificar redacción y consistencia de mensajes neutros entre flujos).
- **QA** (unit, integration, API, E2E vendor, a11y).
- **OBS** (métricas etiquetadas por `role`).
- **DOC** (actualizar PB-P1-002 Acceptance Summary; alinear ruta `/vendor/onboarding` con US-040).

Dependencias entre tareas:

- FE depende del schema discriminado.
- QA-E2E depende de la página vendor entregada y del endpoint en preview.

Consolidación: PB-P1-002 produce un único `US-002-development-tasks.md`.

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

`Ready for Task Breakdown` — la especificación está completa, alineada con PB-P1-002 y sus dependencias (PB-P0-004, PB-P0-006, PB-P1-001), preserva las decisiones formalizadas (PO 8.1 #8, BR-AUTH-001/002/011, BR-VENDOR-001, ADR-SEC-001/003, Doc 19 §11.1-11.2, Doc 16 catálogo de errores), maximiza reuso del flujo de US-001 y cubre AC-01..03 + EC-01..03 sin scope creep. Las notas no bloqueantes del Approval Gate quedan resueltas en las secciones 4, 7, 12 y 17.
