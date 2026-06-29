# Technical Specification — US-003: Iniciar sesión con email y contraseña

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-003 |
| Source User Story | `management/user-stories/US-003-login-email-password.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-003-decision-resolution.md` |
| Priority | P1 |
| Backlog ID | PB-P1-003 |
| Backlog Title | Login con email/password + logout |
| Backlog Execution Order | Tercer ítem de P1 dentro de EPIC-AUTH-001 (después de PB-P1-001 y PB-P1-002) |
| User Story Position in Backlog Item | 1 de 2 (login). US-005 cubre logout. |
| Related User Stories in Backlog Item | US-003 (login), US-005 (logout) |
| Epic | EPIC-AUTH-001 — Authentication & User Access |
| Backlog Item Dependencies | PB-P0-001 (schema `users`), PB-P0-004 (REST API foundation), PB-P0-006 (cookies firmadas + captcha), PB-P0-007 (rate limiting + middleware chain) |
| Feature | Login con credenciales |
| Module / Domain | Auth |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-25 |
| Last Updated | 2026-06-25 |

---

## 2. Backlog Execution Context

### Product Backlog Item

PB-P1-003 implementa el acceso recurrente al producto. Sin login operativo, ningún rol del MVP puede consumir los flujos comerciales (eventos, cotizaciones, reseñas) ni la demo académica. Depende de PB-P0-001 (esquema `users`), PB-P0-004 (REST foundation + error envelope), PB-P0-006 (`SessionCookieIssuer` + `CaptchaService`) y PB-P0-007 (rate limiting + cadena de middlewares), todos cerrados en P0.

### Execution Order Rationale

PB-P1-003 se ejecuta tras PB-P1-001 (US-001) y PB-P1-002 (US-002) porque:

- PB-P1-001 y PB-P1-002 producen cuentas registradas que son insumo necesario para el login.
- US-003 (login) habilita PB-P1-004 (recuperación) y todo el recorrido funcional autenticado.
- La US-005 (logout) del mismo backlog item depende de la cookie de sesión que esta US emite, por lo que US-003 se entrega antes que US-005.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-003 | Login con email/password + cookie firmada + captcha condicional | 1 |
| US-005 | Logout explícito (invalida cookie) | 2 |

---

## 3. Executive Technical Summary

Implementar el caso de uso `LoginUseCase` y el endpoint REST `POST /api/v1/auth/login` con validación Zod, verificación de contraseña en tiempo constante con `argon2id` (Doc 19 §11.2), captcha condicional server-side a partir de `N=3` fallos consecutivos por combinación IP+email candidato en ventana deslizante de 10 min (Decisión PO US-003 #1/#2), emisión de cookie de sesión HTTP-only firmada (`HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, `Max-Age=30d`) reutilizando `SessionCookieIssuer` de PB-P0-006, y rate limit canónico `10/IP/10 min` reutilizando el middleware de PB-P0-007. El frontend entrega `/[locale]/auth/login` con `LoginForm` (RHF + Zod), `CaptchaWidget` condicional, mutation `useLogin` (TanStack Query) y redirección por rol consumiendo `GET /api/v1/users/me` con `AuthUserResponseDto`. Se introduce la tabla opcional `auth_attempts` para mantener el contador IP+email con índice compuesto. Sin invocación de IA. Sin migraciones nuevas sobre `users` (esquema cubierto por PB-P0-001). Sin seed adicional.

---

## 4. Scope Boundary

### In Scope

- Endpoint REST `POST /api/v1/auth/login` con `LoginRequestDto { email, password, captchaToken? }` y respuesta `AuthUserResponseDto` (Doc 16 §22.4).
- Verificación `argon2id` con parámetros mínimos `memoryCost=19MiB, timeCost=2, parallelism=1` (Doc 19 §11.2).
- Ejecución incondicional del hash aun si el email no existe (mitigación timing).
- Captcha condicional `N=3` con verificación server-side y reset al login exitoso o expiración de ventana.
- Emisión de cookie de sesión firmada reutilizando `SessionCookieIssuer` (PB-P0-006).
- Rate limit canónico `10/IP/10 min` reutilizando middleware de PB-P0-007 → `429 RATE_LIMIT_EXCEEDED` con `Retry-After`.
- Manejo de sesión existente: `409 ALREADY_AUTHENTICATED` o redirección al layout del rol.
- Página `/[locale]/auth/login` con formulario, captcha condicional, manejo de error envelope, redirección por rol.
- Tabla `auth_attempts` (opcional según diseño elegido) con índice compuesto para el contador IP+email.
- Logs estructurados `auth.login.success` / `auth.login.failure` con `correlationId` y razón (`bad_credentials`, `captcha_required`, `captcha_invalid`, `rate_limited`, `already_authenticated`).
- Tests unitarios, integración, API, E2E para 3 roles y de regresión de timing.

### Out of Scope

- Logout (US-005 / PB-P1-003 #2).
- Recuperación de contraseña (US-004 / PB-P1-004).
- OAuth Google (US-008, P4 / Future).
- MFA / SSO / magic link / biometría.
- Manejo diferenciado de cuentas `suspended` (Decisión PO US-003 #4 — fuera de MVP; se responde `401` genérico).
- Cambios en el esquema `users` (provistos por PB-P0-001).
- Selección formal de proveedor captcha (heredado de PB-P0-006).
- Tests de carga sostenida o pen-testing (no exigidos por NFRs MVP).

### Explicit Non-Goals

- No exponer existencia de cuentas con mensajes diferenciales.
- No persistir tokens en `localStorage`/`sessionStorage`.
- No registrar contraseña, hash ni `captchaToken` en logs.
- No introducir cooldown propietario adicional (delegado al rate limit canónico).
- No implementar multi-rol simultáneo por usuario.

---

## 5. Architecture Alignment

### Backend Architecture

- Node.js + Express + TypeScript dentro del monolito modular `modules/auth` (Doc 14).
- `LoginUseCase` orquesta: validación Zod → revisión de sesión activa → recuperación de contador IP+email → activación captcha si aplica → verificación captcha → lookup case-insensitive de email → `argon2id.verify` (siempre, aun sin usuario) → resultado → emisión de cookie / actualización de contador.
- Controlador delgado `POST /api/v1/auth/login` encadena: `correlationMiddleware → loggingMiddleware → rateLimitMiddleware (10/IP/10min) → captchaConditionalMiddleware → validationMiddleware (Zod) → controller`.
- Repositorio `UserRepository.findByEmailCI(email)`; servicio `AuthAttemptService` encapsula el contador IP+email (en memoria/Redis-like para MVP, abstraído por puerto).

### Frontend Architecture

- Next.js App Router con `app/[locale]/auth/login/page.tsx` como Client Component (form interactivo).
- `LoginForm` controlado por React Hook Form + Zod; `CaptchaWidget` renderizado cuando el backend devolvió `400 CAPTCHA_REQUIRED` previamente o cuando el contador local (heurístico) sugiere captcha.
- Estado de sesión consumido por `useUserMe` (TanStack Query, `GET /api/v1/users/me`) tras login exitoso.
- Mensajes con `next-intl` en `es-LATAM`, `es-ES`, `pt`, `en`.

### Database Architecture

- Reutiliza tabla `users` (Doc 18 §13). Sin cambios estructurales.
- Nueva tabla opcional `auth_attempts` (Doc 18 estilo) con `id`, `ip`, `email_candidate`, `attempted_at`, índice compuesto `(ip, email_candidate, attempted_at DESC)`. Si por simplicidad MVP se opta por contador en memoria o store volátil, se documenta como `Decision: In-memory counter for MVP` y se omite migración.
- Migraciones: ninguna obligatoria si se elige in-memory; una migración corta y reversible si se persiste `auth_attempts`.

### API Architecture

- REST `/api/v1/auth/login` siguiendo Doc 16 §22; respuestas con error envelope (Doc 16 §29) y `correlationId` propagado.
- Reutiliza `AuthUserResponseDto` (Doc 16 §22.4) ya consumido por US-001/US-002.
- Reutiliza `GET /api/v1/users/me` (Doc 16 §23). Nota de alignment: Doc 16 documenta path `/me`; las US/Front lo exponen como `/api/v1/users/me`. Resolución técnica: el backend monta el router bajo `/api/v1/users/me` y mantiene `/me` como alias deprecable, manteniendo consistencia con la US-001 aprobada.

### AI / PromptOps Architecture

No aplica.

### Security Architecture

- Cookie HTTP-only firmada con `SESSION_SECRET` (Doc 19 §10) emitida por `SessionCookieIssuer` (PB-P0-006). Atributos canónicos: `HttpOnly`, `Secure` (en entornos no-locales), `SameSite=Lax`, `Path=/`, `Max-Age=30d` (override formal sobre 24h de Doc 19 §10, Decisión PO US-003 #5).
- Verificación de contraseña `argon2id` con parámetros mínimos; `bcrypt(12)` aceptado como fallback documentado (alineado a US-001).
- Defensa en capas: captcha condicional `N=3` + rate limit canónico `10/IP/10 min` (Doc 19 §6, Doc 16 §22.6).
- Mensajes genéricos en todas las ramas negativas para evitar enumeración (`401 AUTHENTICATION_REQUIRED`).
- Ejecución del hash aun cuando el email no existe (mitigación timing).
- Backend como única fuente de verdad para autorización post-login (Doc 19 §SEC-PRIN).

### Testing Architecture

- Vitest para unit/integration (`LoginUseCase`, `AuthAttemptService`, validación Zod).
- Supertest para API (`POST /auth/login`, `GET /users/me`).
- Playwright para E2E con seed de 3 roles (organizer, vendor, admin).
- MSW en frontend para mocks del endpoint y captcha.
- Tests de regresión de timing: comparar p95 entre "email inexistente" y "email existente" sin regresión > umbral configurado.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 — Login exitoso | `LoginUseCase` valida Zod, recupera usuario por email CI, ejecuta `argon2id.verify` y emite cookie de sesión vía `SessionCookieIssuer`; responde `200` con `AuthUserResponseDto`. | Backend, API, Security |
| AC-02 — Redirección por rol | Frontend consume `GET /api/v1/users/me` y enruta a `/[locale]/organizer|vendor|admin` según `AuthUserResponseDto.role`. | Frontend, API |
| AC-03 — Sesión persistente 30 días | `SessionCookieIssuer` emite cookie con `Max-Age=30d`; navegación posterior consume `/users/me` sin re-login. | Backend (cookie), Frontend (consumo) |
| AC-04 — Usuario ya autenticado | `LoginUseCase` detecta cookie válida y responde `409 ALREADY_AUTHENTICATED`; el front redirige al layout del rol cuando aplique. | Backend, Frontend |
| AC-05 — Rate limit | `rateLimitMiddleware` (10/IP/10min) responde `429 RATE_LIMIT_EXCEEDED` con `Retry-After` antes de invocar el use case. | Backend, API |
| EC-01 — Credenciales inválidas | El use case ejecuta `argon2id.verify` aun sin usuario; responde `401 AUTHENTICATION_REQUIRED` genérico. Logea `auth.login.failure` con razón `bad_credentials`. | Backend, Observability |
| EC-02 — Captcha condicional | `AuthAttemptService` mantiene contador IP+email en ventana de 10 min; tras `N=3` exige `captchaToken` en el `LoginRequestDto`. Respuestas `400 CAPTCHA_REQUIRED` / `400 CAPTCHA_INVALID`. | Backend, Frontend, Security |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

- `modules/auth` (controllers, use cases, ports, adapters).
- Reutiliza `SessionCookieIssuer` y `CaptchaService` de `modules/security` (PB-P0-006).
- Reutiliza `rateLimitMiddleware` y `correlationMiddleware` de `modules/platform` (PB-P0-007).

### Use Cases / Application Services

- `LoginUseCase.execute(input: LoginInput, ctx: RequestContext) → LoginOutput`.
- `AuthAttemptService.recordFailure(ip, email)` / `AuthAttemptService.isCaptchaRequired(ip, email)` / `AuthAttemptService.resetOnSuccess(ip, email)`.
- Helper `ConstantTimePasswordVerifier` que envuelve `argon2id.verify`.

### Controllers / Routes

- `POST /api/v1/auth/login` (`AuthController.login`).
- Cadena de middlewares: `correlationMiddleware → loggingMiddleware → rateLimitMiddleware('auth.login') → sessionGuardForLogin → validationMiddleware(LoginRequestSchema) → captchaConditionalMiddleware → controller`.
- `sessionGuardForLogin` traduce sesión activa a `409 ALREADY_AUTHENTICATED` antes de validar credenciales.

### DTOs / Schemas

- `LoginRequestDto`:

```ts
type LoginRequestDto = {
  email: string;
  password: string;
  captchaToken?: string;
};
```

- `AuthUserResponseDto` reutilizado de Doc 16 §22.4.
- Zod schema: `email` (string trim + `email`), `password` (string min 1), `captchaToken` (string opcional). Resolución del requerimiento de `captchaToken` se delega al middleware condicional.

### Repository / Persistence

- `UserRepository.findByEmailCI(email): User | null`.
- `AuthAttemptRepository` (port) con dos implementaciones posibles:
  - `InMemoryAuthAttemptRepository` (MVP por defecto, suficiente para entornos académicos y demo).
  - `PostgresAuthAttemptRepository` sobre tabla `auth_attempts` (alternativa para entornos multi-instancia).

### Validation Rules

- VR-01 `email` requerido y bien formado → `400 VALIDATION_ERROR`.
- VR-02 `password` requerido (longitud > 0) → `400 VALIDATION_ERROR`.
- VR-03 `captchaToken` obligatorio si `AuthAttemptService.isCaptchaRequired === true` → `400 CAPTCHA_REQUIRED` cuando falta y `400 CAPTCHA_INVALID` cuando es inválido.
- VR-04 Mensaje genérico ante credenciales no operativas → `401 AUTHENTICATION_REQUIRED`.

### Error Handling

Mapeo unificado al error envelope (Doc 16 §22.6):

| Caso | HTTP | `errorCode` |
|---|---|---|
| Zod fail | 400 | `VALIDATION_ERROR` |
| Captcha requerido faltante | 400 | `CAPTCHA_REQUIRED` |
| Captcha inválido | 400 | `CAPTCHA_INVALID` |
| Credenciales no operativas | 401 | `AUTHENTICATION_REQUIRED` |
| Sesión existente | 409 | `ALREADY_AUTHENTICATED` |
| Rate limit excedido | 429 | `RATE_LIMIT_EXCEEDED` (con `Retry-After`) |

### Transactions

No requiere transacción: el login es lectura del `User` y emisión de cookie. La actualización del contador IP+email opera sobre el repositorio dedicado fuera de la transacción de dominio.

### Observability

- Eventos: `auth.login.success`, `auth.login.failure` (razón en cada caso).
- Métricas: `auth_login_total{result}`, `auth_login_latency_seconds{result}`, `auth_login_captcha_required_total`, `auth_login_rate_limited_total`.
- Logs incluyen `correlationId`, `ip`, `user_role` (cuando éxito); nunca el password ni el hash ni el `captchaToken`.

---

## 8. Frontend Technical Design

### Routes / Pages

- `app/[locale]/auth/login/page.tsx` (Client Component).
- Redirecciones post-login: `/[locale]/organizer`, `/[locale]/vendor`, `/[locale]/admin` según `AuthUserResponseDto.role`.

### Components

- `LoginForm` (con React Hook Form + Zod).
- `CaptchaWidget` condicional (renderizado tras `400 CAPTCHA_REQUIRED` o por flag local heurístico).
- `LoginErrorBanner` con mensaje genérico para `401`.
- Reutiliza `AuthFormShell`, `PasswordInput`, `EmailInput` de US-001/US-002 si están disponibles; en caso contrario, los introduce.

### Forms

- Zod schema: `email` (`z.string().trim().email()`), `password` (`z.string().min(1)`), `captchaToken` (`z.string().optional()`). Validación final del `captchaToken` la indica el backend con el código de error.

### State Management

- TanStack Query mutation `useLogin` envuelve `authApi.login(payload)`.
- Tras éxito, invalida `useUserMe` y consume `GET /api/v1/users/me` para decidir la ruta.

### Data Fetching

- `userApi.me()` con `credentials: 'include'`.
- `authApi.login()` con `credentials: 'include'` para que la cookie se persista.

### Loading / Empty / Error / Success States

- Loading: spinner en el botón principal, inputs deshabilitados.
- Error 401 / 400: banner genérico con `aria-live polite`.
- Error 429: banner con texto `Demasiados intentos, intentá nuevamente en unos minutos.` y deshabilitado del botón por `Retry-After` segundos.
- Error 400 `CAPTCHA_REQUIRED`/`CAPTCHA_INVALID`: renderiza/refresca `CaptchaWidget`.
- Éxito: navegación al layout del rol con `router.replace`.

### Accessibility

- Labels asociados.
- Focus inicial en email.
- Mensajes en `aria-live polite`.
- Captcha widget accesible (con alternativa de audio si el proveedor lo provee).

### i18n

- Mensajes en `es-LATAM`, `es-ES`, `pt`, `en` vía `next-intl`.
- Catálogo: `login.title`, `login.email`, `login.password`, `login.submit`, `login.errors.generic`, `login.errors.rateLimited`, `login.errors.captchaRequired`, `login.errors.captchaInvalid`.

---

## 9. API Contract Design

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| POST | `/api/v1/auth/login` | Iniciar sesión | No (anónimo) | `LoginRequestDto` | `200` + `Set-Cookie` + `AuthUserResponseDto` | `400 VALIDATION_ERROR`, `400 CAPTCHA_REQUIRED`, `400 CAPTCHA_INVALID`, `401 AUTHENTICATION_REQUIRED`, `409 ALREADY_AUTHENTICATED`, `429 RATE_LIMIT_EXCEEDED` |
| GET | `/api/v1/users/me` | Obtener usuario actual | Sí (cookie) | — | `200` + `AuthUserResponseDto` | `401 AUTHENTICATION_REQUIRED` |

Cabeceras emitidas en `200`:

- `Set-Cookie: session=<jwt|opaque>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`.
- `Content-Type: application/json`.

---

## 10. Database / Prisma Design

### Models Impacted

- `User` (lectura).
- `AuthAttempt` (nuevo modelo opcional, solo si se persiste el contador IP+email).

### Fields / Columns

- `User`: sin cambios.
- `AuthAttempt`:
  - `id: String @id @default(cuid())`.
  - `ip: String`.
  - `emailCandidate: String`.
  - `attemptedAt: DateTime @default(now())`.
  - `result: String` (`success` | `bad_credentials` | `captcha_required` | `captcha_invalid` | `rate_limited`).

### Relations

- Ninguna relación obligatoria con `User` (el contador opera sobre `emailCandidate` aun cuando el usuario no existe).

### Indexes

- Compuesto `@@index([ip, emailCandidate, attemptedAt(sort: Desc)])` para evaluar la ventana de 10 min.
- Índice por `attemptedAt` para limpieza programada.

### Constraints

- `emailCandidate` se almacena en minúsculas para coincidir con el lookup CI.

### Migrations Impact

- Si se elige In-Memory: ninguna migración.
- Si se elige PostgreSQL: una migración reversible que crea `auth_attempts` con índices descritos. La elección queda documentada como decisión técnica delegada en la sección 17 — el spec recomienda In-Memory para MVP por simplicidad y por el tamaño del demo académico.

### Seed Impact

- No requiere seeds adicionales: reutiliza usuarios seed organizer/vendor/admin existentes (Doc 11).

---

## 11. AI / PromptOps Design

No aplica.

---

## 12. Security & Authorization Design

### Authentication

- Verificación con `argon2id` (`memoryCost=19MiB, timeCost=2, parallelism=1`); `bcrypt(12)` como fallback documentado.
- Hash ejecutado siempre (`ConstantTimePasswordVerifier`) aun si no se encuentra el `User`.

### Authorization

- Endpoint público (`anonymous`). Sesión activa → `409 ALREADY_AUTHENTICATED`.
- Post-login el resto de la aplicación lee la cookie firmada como única fuente de verdad de rol (Doc 19).

### Ownership Rules

No aplica directamente.

### Role Rules

- El rol se obtiene de `User.role` y se expone en `AuthUserResponseDto.role`.
- El frontend usa el rol solo para enrutar; nunca como autorización.

### Negative Authorization Scenarios

- `401 AUTHENTICATION_REQUIRED` ante cualquier credencial no operativa, sin filtrar existencia ni `status`.
- `409 ALREADY_AUTHENTICATED` ante intento de re-login.
- `429 RATE_LIMIT_EXCEEDED` ante exceso de intentos por IP.
- `400 CAPTCHA_REQUIRED` / `400 CAPTCHA_INVALID` cuando aplica.

### Audit Requirements

- `correlationId` propagado.
- Eventos `auth.login.success` y `auth.login.failure` con razón.
- `AdminAction`: no requerido; opcional si la cuenta involucrada es `admin`.

### Sensitive Data Handling

- No registrar password, hash ni `captchaToken`.
- Email puede registrarse redactado (Doc 19 §observabilidad) cuando aplique a alertas.
- `SESSION_SECRET` y captcha secret fuera del repositorio.

---

## 13. Testing Strategy

### Unit Tests

- `LoginUseCase` (rutas: éxito sin captcha, éxito con captcha válido, captcha requerido faltante, captcha inválido, credenciales inválidas, hash incondicional, sesión existente).
- `AuthAttemptService` (incremento, ventana deslizante, reset por éxito y por expiración, frontera `N=3`).
- Zod schema `LoginRequestSchema`.

### Integration Tests

- Cadena de middlewares (`correlation → logging → rateLimit → sessionGuard → validation → captchaConditional → controller`).
- Reset del contador en login exitoso.
- Combinación rate limit (10/IP/10min) + captcha (N=3).

### API Tests (Supertest)

- `200` con cookie firmada y atributos correctos (`HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, `Max-Age=2592000`).
- `400 VALIDATION_ERROR` con `details[].field`.
- `400 CAPTCHA_REQUIRED` cuando el contador alcanza `N=3` y el cliente no envía `captchaToken`.
- `400 CAPTCHA_INVALID` ante token alterado.
- `401 AUTHENTICATION_REQUIRED` ante email inexistente y password incorrecto, con mensaje idéntico.
- `409 ALREADY_AUTHENTICATED` cuando hay sesión activa.
- `429 RATE_LIMIT_EXCEEDED` con `Retry-After`.
- `GET /api/v1/users/me` retorna `AuthUserResponseDto` válido tras login.

### E2E Tests (Playwright)

- Flujo completo para los 3 roles del seed (organizer, vendor, admin) con redirección al layout correcto.
- Aparición del captcha tras `3` fallos consecutivos y éxito al cuarto intento con captcha válido.
- Manejo de `Retry-After` en UI.
- Recarga al día siguiente preservando sesión (simulada con jump de reloj o cookie largada).

### Security Tests

- Regresión de timing: p95 de respuesta entre "email inexistente" y "email existente" se mantiene dentro del umbral configurado (`±10%`).
- No filtrado de existencia ni `status`.
- Cookie no se emite en errores ni vía JS (`HttpOnly` verificado en respuesta).
- No se registra password, hash ni `captchaToken` en logs (test sobre logger).

### Accessibility Tests

- `axe` sobre la página `/[locale]/auth/login`.
- Navegación por teclado, focus visible, `aria-live`.

### AI Tests

No aplica.

### Seed / Demo Tests

- Validar credenciales seed conocidas para los 3 roles (`seed/credentials.json` referenciado en Doc 11).
- Comprobar que el contador IP+email funciona en entorno demo (fake captcha aceptando token `__test__`).

### CI Checks

- Cobertura mínima en módulos `auth` y `security` ≥ 85% (alineado a US-001).
- Quality gate de tests E2E sobre los 3 roles antes de mergear.

---

## 14. Observability & Audit

### Logs

- `auth.login.success` (level `info`, payload: `correlationId`, `userId`, `role`).
- `auth.login.failure` (level `warn`, payload: `correlationId`, `reason`, `ip`, `emailHashed` opcional).
- `auth.login.captcha_required` (level `info`, payload: `correlationId`, `ip`, `emailHashed`).
- `auth.login.rate_limited` (level `warn`, payload: `correlationId`, `ip`).

### Correlation ID

- Generado por `correlationMiddleware`; propagado en headers, logs, métricas.

### AdminAction

- No requerido. Opcional cuando el usuario autenticado tiene `role='admin'` (decisión heredada de US-001).

### Error Tracking

- Reportar a la salida estándar; el agregador (Doc 21) ingiere por nivel.

### Metrics

- `auth_login_total{result}`, `auth_login_latency_seconds{result}`, `auth_login_captcha_required_total`, `auth_login_rate_limited_total`.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

- Reutiliza seeds existentes de organizer, vendor y admin (Doc 11).
- Confirmar que el seed incluye `password_hash` generado con la misma política `argon2id`.

### Demo Scenario Supported

- Login con cualquier rol seed → redirección al layout correspondiente → recorrido posterior MVP.
- Disparo de captcha condicional con 3 intentos fallidos del mismo email.

### Reset / Isolation Notes

- Limpieza de `auth_attempts` (cuando aplica) al ejecutar reset del entorno demo.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| Doc 19 §10 — Session and cookie strategy | `Max-Age` recomendado 24h. | `Max-Age = 30d` (Decisión PO US-003 #5 y PB-P1-003). | Anotar override formal en Doc 19 §10 o emitir ADR breve. | No |
| Doc 8 — UC-AUTH-002 paso 1 | Captcha aparece en todos los intentos. | Captcha condicional `N=3` por IP+email (Decisión PO US-003 #1/#2). | Anotar override en Doc 8 referenciando PB-P1-003 y Decisión PO US-003. | No |
| Doc 16 §23 — User / Profile API | Doc 16 documenta `GET /me`. | Las US y este spec exponen `GET /api/v1/users/me`. | Alinear el path canónico en Doc 16 §23 o documentar el alias en API Design. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Contador IP+email solo en memoria → inconsistente en multi-instancia | Captcha condicional no se dispara correctamente al escalar | Adapter `PostgresAuthAttemptRepository` listo para reemplazar In-Memory sin cambiar el use case. |
| Override de Doc 19 §10 (24h → 30d) no formalizado en docs | Confusión a futuro o reapertura del debate | Documentation Alignment Required (sección 16); recomendar actualizar Doc 19 §10 en siguiente ciclo. |
| Path `/me` vs `/api/v1/users/me` | Inconsistencia entre Doc 16 §23 y consumo del front | Resolver alias `/me` en `apiRouter` para mantener compatibilidad y exponer canónicamente `/api/v1/users/me`. |
| Timing attack si el hash no se ejecuta en email inexistente | Posible enumeración | `ConstantTimePasswordVerifier` ejecuta siempre el hash con `User` simulado o hash dummy precalculado. |
| Captcha mockeable en CI | Falsos positivos en tests | Aceptar token fijo `__test__` solo en entornos no productivos (Doc 19 §9). |
| Reset del contador en login exitoso podría enmascarar abuso lento | Detección retardada | Métricas y alertas sobre `auth_login_captcha_required_total` y `auth_login_rate_limited_total`. |

---

## 18. Implementation Guidance for Coding Agents

- Archivos/carpetas probablemente impactados:
  - Backend: `apps/api/src/modules/auth/{controllers,use-cases,ports,adapters,schemas}`; `apps/api/src/modules/security/auth-attempts/*`; `apps/api/src/shared/middlewares/{correlation,logging,rateLimit,validation,captchaConditional,sessionGuard}.ts`; `prisma/schema.prisma` (si se opta por persistir `auth_attempts`).
  - Frontend: `apps/web/app/[locale]/auth/login/{page.tsx,LoginForm.tsx,CaptchaWidget.tsx}`; `apps/web/lib/api/{authApi.ts,userApi.ts}`; `apps/web/lib/hooks/{useLogin.ts,useUserMe.ts}`; `apps/web/messages/{es-LATAM,es-ES,pt,en}/login.json`.
  - Tests: `apps/api/test/modules/auth/login.*.test.ts`; `apps/web/test/login.spec.tsx`; `e2e/login-3-roles.spec.ts`.
- Orden recomendado de implementación:
  1. Backend: Zod schema → `ConstantTimePasswordVerifier` → `AuthAttemptService` (InMemory) → `LoginUseCase` → controller con cadena de middlewares.
  2. Tests unit/integration backend antes de continuar.
  3. Frontend: `authApi.login` + `userApi.me` → `useLogin` → `LoginForm` → integración con `CaptchaWidget` → redirección por rol.
  4. Tests E2E para los 3 roles.
  5. Documentation Alignment: anotar Doc 19 §10 / Doc 8 / Doc 16 §23 (no bloqueante).
- Decisiones que no deben reabrirse:
  - Captcha condicional `N=3` por IP+email; ventana 10 min (Decisión PO US-003 #1/#2).
  - Sin cooldown propietario adicional; rate limit canónico (Decisión PO US-003 #3).
  - EC-03 fuera de MVP (Decisión PO US-003 #4).
  - `Max-Age=30d` para cookie de sesión (Decisión PO US-003 #5).
  - `argon2id` con parámetros mínimos.
- Lo que no debe implementarse:
  - Cooldown propietario.
  - Manejo diferenciado de `suspended`.
  - OAuth Google.
  - Cambios en `users`.
- Supuestos a preservar:
  - El backend es la única fuente de verdad de autorización.
  - Las cookies son `HttpOnly`, nunca tocadas desde JS.
  - Mensajes de error son genéricos.

---

## 19. Task Generation Notes

- Grupos de tareas sugeridos:
  - `auth-be-login`: schema, use case, controller, middleware chain.
  - `auth-be-attempts`: `AuthAttemptService` (InMemory) + adapter Postgres opcional.
  - `auth-fe-login`: página, form, captcha, mutation, redirección.
  - `auth-qa`: unit, integration, API, E2E, security (timing), accessibility.
  - `auth-ops`: alias `/me` y `Retry-After`, configuración rate limit `auth.login` y captcha por entorno.
- Tareas QA obligatorias:
  - Regresión de timing.
  - Verificación de flags de cookie en respuesta.
  - E2E para los 3 roles.
- Tareas de seguridad obligatorias:
  - `ConstantTimePasswordVerifier`.
  - Verificación captcha server-side.
  - Logs sin password/hash/captchaToken.
- Tareas seed/demo:
  - Validar credenciales seed para 3 roles.
  - Soporte de captcha fake `__test__` en CI/Demo.
- Tareas de documentación:
  - Anotar overrides en Doc 19 §10, Doc 8, Doc 16 §23.
- Dependencias entre tareas:
  - `auth-fe-login` depende de `auth-be-login` para contratos.
  - `auth-qa` depende de ambos.
- `tasks.md` consolidado del backlog item:
  - Recomendado consolidar al cerrar US-005 (logout) para tener el flujo completo PB-P1-003 documentado en un único `tasks.md` del backlog.

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

La US-003 cuenta con aprobación PO/BA, decisiones formalizadas (`PO/BA Decisions Applied` + Decision Resolution US-003), trazabilidad correcta y dependencias P0 cerradas. Los conflictos con Doc 8 / Doc 16 §23 / Doc 19 §10 quedan en Documentation Alignment Required (no bloquean implementación). Próxima skill: `eventflow-user-story-to-development-tasks`.
