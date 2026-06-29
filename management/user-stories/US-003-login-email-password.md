# 🧾 User Story: Iniciar sesión con email y contraseña

## 🆔 Metadata

| Field              | Value                                                  |
| ------------------ | ------------------------------------------------------ |
| ID                          | US-003                                                 |
| Epic                        | EPIC-AUTH-001 — Authentication & User Access           |
| Backlog Item                | PB-P1-003                                              |
| Feature                     | Login con credenciales                                 |
| Module / Domain             | Auth                                                   |
| User Role                   | Anonymous → Authenticated (Organizer / Vendor / Admin) |
| Priority                    | Must Have                                              |
| Status                      | Approved with Minor Notes                              |
| Owner                       | Product Owner / Business Analyst                       |
| Approved By                 | PO/BA Review                                           |
| Approval Date               | 2026-06-25                                             |
| Ready for Development Tasks | Yes                                                    |
| Sprint / Milestone          | MVP                                                    |
| Created Date                | 2026-06-09                                             |
| Last Updated                | 2026-06-25                                             |

---

## 🎯 User Story

**As a** usuario registrado en EventFlow (organizador, proveedor o administrador)
**I want** iniciar sesión con mi email y contraseña, validado por captcha cuando aplique
**So that** pueda acceder a mi workspace y operar según mi rol

---

## 🧠 Business Context

### Context Summary

El login es la entrada operativa diaria al producto. Debe responder con mensajes genéricos para no revelar existencia de cuentas (Doc 19 §6, Doc 16 §22.6), aplicar captcha condicional tras N intentos fallidos consecutivos (PB-P1-003 + Decisión PO US-003 #1/#2), y emitir una cookie de sesión persistente HTTP-only firmada con vigencia formalizada en 30 días (Decisión PO US-003 #5 derivada de PB-P1-003). La sesión activa determina el layout por rol (organizer/vendor/admin) que el frontend renderiza tras consumir `/api/v1/users/me`.

### Related Domain Concepts

* Autenticación basada en sesión con cookie HTTP-only firmada.
* RBAC y aislamiento por rol (BR-AUTH-009).
* Rate limiting canónico + captcha condicional para defensa en capas.
* Verificación de contraseña en tiempo constante (`argon2id`).

### Assumptions

* Existe el usuario registrado y `status='active'` en la base de datos.
* El frontend determina layout por rol leyendo `/api/v1/users/me` post-login.
* La cookie de sesión vive 30 días (Decisión PO US-003 #5).
* El captcha widget se renderiza dinámicamente según señal del backend (`captchaRequired` en el error de rate-limit suave o estado de sesión por IP+email).

### Dependencies

* PB-P0-001 — Database Schema, Migrations & Constraints (entidad `User`).
* PB-P0-004 — REST API Endpoints Foundation (error envelope, DTOs).
* PB-P0-006 — Security Cookies HTTP-Only + Captcha (cookie signer, captcha verifier).
* PB-P0-007 — Rate Limiting & Middleware Chain (`10/IP/10min` en `/auth/login`).
* US-001 / US-002 (registro previo que provee usuarios autenticables).

---

## 🧾 PO/BA Decisions Applied

| Decision                                                                              | Source                                                                                                                                       | Resolución aplicada en esta historia                                                                                                                                                       |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Política de captcha en login: condicional tras N intentos fallidos                    | PB-P1-003 (backlog notes); PO 8.1 #8; BR-AUTH-011; Doc 19 §6                                                                                  | Captcha **no** se exige en el primer intento. Se exige a partir del intento `N` consecutivo fallido por combinación IP+email candidato. Antes de `N`, el endpoint ignora `captchaToken`.   |
| Umbral N para activar captcha                                                         | Decisión PO US-003 (formalizada por el PO/BA Decision Resolver, consistente con la sección Notes original y EC-02 del borrador)              | `N = 3` intentos fallidos consecutivos por IP+email candidato dentro de la ventana de 10 minutos. Reset del contador en login exitoso o al expirar la ventana.                              |
| Cooldown temporal y rate limit                                                        | Doc 19 §6; Doc 16 §22.6; Doc 19 §10                                                                                                          | No se introduce cooldown adicional. Se delega al rate limit canónico `/auth/login`: `10 intentos / IP / 10 min` → `429 RATE_LIMIT_EXCEEDED`. Captcha condicional opera como capa previa.    |
| EC-03 "Cuenta suspendida"                                                             | BR-AUTH-008; Doc 16 §22.4 (`AuthUserResponseDto.status`); ausencia de US administrativa para suspender usuarios en MVP                       | Se mueve a **Explicitly Out of Scope** para MVP. El backend mantiene la respuesta neutra `401 AUTHENTICATION_REQUIRED` ante cualquier credencial no operativa, sin diferenciar suspensión. |
| Lifetime de la cookie de sesión: 30 días                                              | PB-P1-003 (Decisión PO US-003 documentada en backlog); Doc 19 §10                                                                            | `Max-Age = 30 días` desde la emisión. Override formal sobre Doc 19 §10 (24 h) → Documentation Alignment Required, sin ADR adicional por ser decisión PO ya formalizada en el backlog.       |
| Hashing `argon2id` como predeterminado                                                | Doc 19 §11.2; ADR-SEC-003                                                                                                                    | Verificación con `argon2id` (`memoryCost=19MiB`, `timeCost=2`, `parallelism=1`). `bcrypt(12)` como fallback documentado.                                                                    |
| Atributos canónicos de la cookie de sesión                                            | Doc 19 §10; ADR-SEC-001                                                                                                                      | `HttpOnly`, `Secure` (en entornos no-locales), `SameSite=Lax`, `Path=/`, `Max-Age=30d`, firmada con `SESSION_SECRET`.                                                                       |
| Catálogo de errores alineado al error envelope                                        | Doc 16 §22.6                                                                                                                                 | `400 VALIDATION_ERROR` / `400 CAPTCHA_REQUIRED` / `400 CAPTCHA_INVALID` / `401 AUTHENTICATION_REQUIRED` / `409 ALREADY_AUTHENTICATED` / `429 RATE_LIMIT_EXCEEDED`.                          |

---

## 🔗 Traceability

| Source                 | Reference                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| FRD Requirement(s)     | FR-AUTH-002, FR-AUTH-003, FR-AUTH-004, FR-AUTH-012                                                                  |
| Use Case(s)            | UC-AUTH-002                                                                                                        |
| Business Rule(s)       | BR-AUTH-001, BR-AUTH-003, BR-AUTH-009, BR-AUTH-011                                                                  |
| Permission Rule(s)     | Anonymous → cualquier rol según `User.role`; usuario ya autenticado recibe `409 ALREADY_AUTHENTICATED` o redirección |
| Data Entity / Entities | `User`                                                                                                             |
| API Endpoint(s)        | `POST /api/v1/auth/login`, `GET /api/v1/users/me`                                                                  |
| NFR Reference(s)       | NFR-SEC-003, NFR-PERF-API-001                                                                                      |
| Related ADR(s)         | ADR-SEC-001, ADR-SEC-003                                                                                            |
| Related Document(s)    | `/docs/8 UC-AUTH-002`, `/docs/8.1 #8`, `/docs/16 §22, §23`, `/docs/19 §6, §10, §11.2`                              |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* MFA / 2FA / OTP por SMS.
* SSO empresarial.
* Magic link sin contraseña.
* Biometría.
* OAuth con Google (cubierto en US-008, Could Have / Future).
* Logout (US-005).
* Recuperación de contraseña (US-004).
* Manejo diferenciado de cuentas `suspended` (EC-03 movido fuera de MVP por ausencia de US administrativa de suspensión; el backend responde `401` genérico en cualquier credencial no operativa).

### Scope Notes

* No revelar si el email existe.
* Captcha es condicional: se exige a partir del intento `N=3` consecutivo fallido por IP+email candidato.
* No bloquear cuentas permanentemente; rate limit canónico (`10/IP/10min`) controla el abuso bruto.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Login exitoso

**Given** un usuario con `status='active'` y credenciales válidas, sin captcha requerido (contador de fallos consecutivos por IP+email < `3`)
**When** envía `POST /api/v1/auth/login` con `LoginRequestDto { email, password }`
**Then** el sistema verifica la contraseña con `argon2id` en tiempo constante (Doc 19 §11.2), emite la cookie de sesión firmada (`HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, `Max-Age=30d`) y devuelve `200 OK` con `AuthUserResponseDto` (Doc 16 §22.4).

### AC-02: Redirección por rol post-login

**Given** login exitoso
**When** el frontend obtiene `GET /api/v1/users/me` (Doc 16 §23)
**Then** redirige a `/[locale]/organizer`, `/[locale]/vendor` o `/[locale]/admin` según `role` del `AuthUserResponseDto`.

### AC-03: Sesión persistente de 30 días

**Given** login exitoso con cookie emitida
**When** el usuario regresa antes de que expire `Max-Age=30d`
**Then** la sesión continúa activa sin requerir re-login mientras la cookie no caduque ni sea invalidada por logout (US-005).

### AC-04: Usuario ya autenticado intenta login

**Given** un usuario con sesión activa válida
**When** invoca `POST /api/v1/auth/login`
**Then** el sistema responde `409 ALREADY_AUTHENTICATED` o redirige al layout del rol. No vuelve a procesar credenciales ni emite nueva cookie.

### AC-05: Exceso de intentos por IP

**Given** una IP con más de `10` intentos a `/auth/login` en `10` minutos
**When** envía un nuevo intento
**Then** el sistema responde `429 RATE_LIMIT_EXCEEDED` con `Retry-After` (Doc 16 §22.6, Doc 19 §6), sin procesar credenciales ni captcha.

---

## ⚠️ Edge Cases

### EC-01: Credenciales inválidas

**Given** email correcto pero password incorrecto, email inexistente, o cualquier combinación no operativa (incluye `status` no activo)
**When** intenta iniciar sesión
**Then** el sistema responde `401 AUTHENTICATION_REQUIRED` con mensaje genérico ("credenciales inválidas") y `correlationId`. No distingue cuál campo es erróneo ni si la cuenta existe.

#### Handling

* Contador de fallos consecutivos por IP+email candidato dentro de ventana de 10 min.
* El hash siempre se ejecuta aun si el email no existe, para mitigar timing attacks.
* Logear `auth.login.failure` con `correlationId`, sin password ni hash.

---

### EC-02: Captcha requerido por umbral (N=3)

**Given** la combinación IP+email candidato registró `3` fallos consecutivos dentro de la ventana de 10 min
**When** ocurre un nuevo intento
**Then** el backend exige `captchaToken` válido en el `LoginRequestDto`. Si falta, responde `400 CAPTCHA_REQUIRED`. Si es inválido, responde `400 CAPTCHA_INVALID`. Si es válido y las credenciales son correctas, login exitoso (AC-01) y se resetea el contador.

#### Handling

* Frontend renderiza el widget de captcha cuando el backend devuelve `400 CAPTCHA_REQUIRED` en el intento previo.
* El captcha se verifica server-side con el secret (modo fake en CI / real en preview/Demo, Doc 19 §11).
* Reset del contador en login exitoso o al expirar la ventana.

---

## 🚫 Validation Rules

| ID    | Rule                                                                                                  | Message / Behavior                                  |
| ----- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| VR-01 | Email obligatorio y bien formado                                                                      | `400 VALIDATION_ERROR` con `details[].field=email`  |
| VR-02 | Contraseña obligatoria, longitud > 0                                                                  | `400 VALIDATION_ERROR` con `details[].field=password` |
| VR-03 | `captchaToken` obligatorio cuando el umbral `N=3` se cumple                                           | `400 CAPTCHA_REQUIRED` si falta; `400 CAPTCHA_INVALID` si es inválido |
| VR-04 | Mensaje de error genérico ante credenciales no operativas                                             | `401 AUTHENTICATION_REQUIRED` sin filtrar existencia |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                                                          |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-01 | Endpoint público (`anonymous`); usuario autenticado recibe `409 ALREADY_AUTHENTICATED` o redirección al layout del rol.                       |
| SEC-02 | Verificación de contraseña con `argon2id` (`memoryCost=19MiB`, `timeCost=2`, `parallelism=1`) en tiempo constante (Doc 19 §11.2).             |
| SEC-03 | Rate limiting canónico `/auth/login`: `10 intentos / IP / 10 min` → `429 RATE_LIMIT_EXCEEDED` (Doc 19 §6, Doc 16 §22.6).                       |
| SEC-04 | Captcha condicional tras `N=3` fallos consecutivos por IP+email candidato (Decisión PO US-003 #1/#2).                                          |
| SEC-05 | Cookie de sesión `HttpOnly`, `Secure` (no-local), `SameSite=Lax`, `Path=/`, `Max-Age=30d`, firmada con `SESSION_SECRET` (Doc 19 §10).         |
| SEC-06 | Logs y telemetría no exponen contraseña, hash ni `captchaToken`.                                                                              |
| SEC-07 | Mensajes de error genéricos para evitar enumeración de usuarios.                                                                              |
| SEC-08 | Ejecutar `argon2id.verify` aun si el email no existe, para mitigar timing attacks.                                                            |

### Negative Authorization Scenarios

* Usuario ya autenticado intenta login → `409 ALREADY_AUTHENTICATED` o redirección.
* IP con exceso de intentos → `429 RATE_LIMIT_EXCEEDED`.
* Captcha requerido y omitido → `400 CAPTCHA_REQUIRED`.
* Captcha inválido → `400 CAPTCHA_INVALID`.

---

## 🤖 AI Behavior

This story does not invoke AI directly.

### AI Involvement

* AI Feature: None
* Provider Layer: Not applicable
* Human Validation Required: Not applicable
* Persist AIRecommendation: No
* Fallback Required: Not applicable

### AI Input

* Not applicable for this story.

### AI Output

* Not applicable for this story.

### Human-in-the-loop Rules

* Not applicable for this story.

### AI Error / Fallback Behavior

* Not applicable for this story.

---

## 🎨 UX / UI Notes

| Area                | Notes                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| Screen / Route      | `/[locale]/auth/login`                                                                           |
| Main UI Pattern     | Formulario con email + password; captcha widget se renderiza cuando el backend lo solicita.      |
| Primary Action      | "Iniciar sesión"                                                                                 |
| Secondary Actions   | "Olvidé mi contraseña" (link a US-004), "Crear cuenta" (link a US-001/US-002)                    |
| Empty State         | No aplica                                                                                        |
| Loading State       | Spinner en botón, inputs deshabilitados durante el submit                                        |
| Error State         | Mensaje genérico bajo el formulario; widget de captcha aparece cuando el backend lo indica       |
| Success State       | Redirección al layout del rol según `/users/me`                                                  |
| Accessibility Notes | Labels, focus inicial en email, mensajes en `aria-live polite`                                   |
| Responsive Notes    | Mobile-first                                                                                     |
| i18n Notes          | 4 locales (`es-LATAM`, `es-ES`, `pt`, `en`)                                                      |
| Currency Notes      | No aplica                                                                                        |

---

## 🛠 Technical Notes

### Frontend

* Route / Page:
  * `/[locale]/auth/login`
* Components:
  * `LoginForm`, `CaptchaWidget` (condicional)
* State Management:
  * React Hook Form + Zod, TanStack Query mutation `useLogin`
* Forms:
  * Zod schema para email/password; `captchaToken` opcional, exigido por el backend cuando aplica
* API Client:
  * `authApi.login(payload)` y `userApi.me()` (Doc 16 §22, §23)

### Backend

* Use Case / Service:
  * `LoginUseCase`
* Controller / Route:
  * `POST /api/v1/auth/login`
* Authorization Policy:
  * `anonymous`; usuarios autenticados reciben `409 ALREADY_AUTHENTICATED`.
* Validation:
  * `LoginRequestDto { email, password, captchaToken? }` (Doc 16 §22.4)
* Hashing:
  * `argon2id` con parámetros mínimos `memoryCost=19MiB, timeCost=2, parallelism=1` (Doc 19 §11.2); `bcrypt(12)` como fallback.
* Cookies:
  * `HttpOnly`, `Secure` (no-local), `SameSite=Lax`, `Path=/`, `Max-Age=30d`, firmadas con `SESSION_SECRET`.
* Rate Limiting:
  * Middleware canónico `10/IP/10min` (Doc 19 §6).
* Captcha:
  * Activación condicional tras `N=3` fallos consecutivos por IP+email; verificación server-side con secret.
* Transaction Required:
  * No (sólo lectura + emisión de cookie).

### Database

* Main Tables:
  * `users` (Doc 18); `auth_attempts` opcional para tracking de contador IP+email.
* Constraints:
  * `User.email` UNIQUE (case-insensitive).
* Index Considerations:
  * Índice por `email` en `users`; índice compuesto `(ip, email_candidate)` en `auth_attempts` si se persiste.

### API

| Method | Endpoint                       | Purpose                            |
| ------ | ------------------------------ | ---------------------------------- |
| POST   | `/api/v1/auth/login`           | Iniciar sesión                     |
| GET    | `/api/v1/users/me`             | Obtener datos de la sesión actual  |

### Observability / Audit

* Correlation ID Required: Yes
* Log Event Required: Yes (`auth.login.success`, `auth.login.failure` con razón: `bad_credentials`, `captcha_required`, `captcha_invalid`, `rate_limited`, `already_authenticated`).
* AdminAction Required: No (opcional si el usuario tiene rol `admin`).
* AIRecommendation Required: No

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                            | Type        |
| ----- | ------------------------------------------------------------------- | ----------- |
| TS-01 | Login exitoso con credenciales correctas y sin captcha (intento ≤ 2) | Integration |
| TS-02 | Cookie emitida con flags `HttpOnly`, `Secure`, `SameSite=Lax`, `Max-Age=30d` | API         |
| TS-03 | `users/me` devuelve `AuthUserResponseDto` con rol correcto          | API         |
| TS-04 | Redirección por rol (organizer/vendor/admin) post-login             | E2E         |
| TS-05 | Tras 3 fallos, el 4º intento requiere captcha y el flujo se completa con captcha válido | Integration |
| TS-06 | Login resetea el contador de fallos consecutivos                    | Integration |

### Negative Tests

| ID    | Scenario                                  | Expected Result                              |
| ----- | ----------------------------------------- | -------------------------------------------- |
| NT-01 | Email inexistente                         | `401 AUTHENTICATION_REQUIRED` genérico       |
| NT-02 | Password incorrecto                       | `401 AUTHENTICATION_REQUIRED` genérico       |
| NT-03 | Captcha requerido faltante                | `400 CAPTCHA_REQUIRED`                       |
| NT-04 | Captcha inválido                          | `400 CAPTCHA_INVALID`                        |
| NT-05 | Rate limit excedido                       | `429 RATE_LIMIT_EXCEEDED` con `Retry-After`  |
| NT-06 | Sesión existente intenta login            | `409 ALREADY_AUTHENTICATED` o redirección    |
| NT-07 | Hash ejecutado aun si email no existe     | Tiempo de respuesta comparable a credenciales válidas (mitigación timing) |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario                                | Expected Result               |
| ---------- | --------------------------------------- | ----------------------------- |
| AUTH-TS-01 | Anónimo con credenciales válidas        | `200 OK` + cookie de sesión   |
| AUTH-TS-02 | Autenticado intenta login               | `409` o redirección           |
| AUTH-TS-03 | Captcha requerido omitido               | `400 CAPTCHA_REQUIRED`        |

### Accessibility Tests

* Navegación por teclado.
* Focus visible.
* Mensajes con `aria-live polite`.
* Captcha widget accesible (alternativa de audio si lo provee el proveedor).

---

## 📊 Business Impact

| Field               | Value                                                            |
| ------------------- | ---------------------------------------------------------------- |
| KPI Affected        | Daily Active Users, Retención, Conversion-to-action              |
| Expected Impact     | Acceso confiable; reducción de fricción al entrar                |
| Success Criteria    | < 5% de logins fallan por error de UX; tiempo medio < 2s         |
| Academic Demo Value | Permite iniciar la demo con cualquier rol del seed               |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Pantalla `/auth/login` con `LoginForm` y validación Zod.
* `CaptchaWidget` condicional disparado por respuesta `400 CAPTCHA_REQUIRED`.
* Mutation `useLogin` con TanStack Query y manejo de error envelope.
* Redirección por rol consumiendo `/users/me`.

### Potential Backend Tasks

* `LoginUseCase` + endpoint `POST /auth/login` con `LoginRequestDto`.
* Verificación `argon2id` y rama "ejecutar siempre" para mitigar timing.
* Contador de fallos consecutivos por IP+email y activación condicional del captcha.
* Emisión de cookie firmada con atributos canónicos.

### Potential Database Tasks

* Tabla opcional `auth_attempts` (ventana de 10 min) con índice compuesto.
* Asegurar índice por `User.email`.

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* Tests positivos/negativos por endpoint y por rol.
* E2E con seeds para los 3 roles.
* Test de regresión de timing (hash siempre ejecutado).
* Test de flags de cookie en respuesta.

### Potential DevOps / Config Tasks

* `SESSION_SECRET` y `Max-Age=30d` configurables por entorno.
* Configuración captcha test/prod (fake/real).
* Rate limit `/auth/login` `10/IP/10min`.

---

## ✅ Definition of Ready

* [x] Rol claro.
* [x] Goal/valor claros.
* [x] FRD/UC/BR enlazados.
* [x] Permisos identificados.
* [x] Entidades listadas.
* [x] AC en GWT.
* [x] Edge cases documentados.
* [x] Validación clara.
* [x] Out of Scope explícito.
* [x] Dependencias conocidas.
* [x] UX states identificados.
* [x] API definida.
* [x] Tests definidos.
* [x] PO/BA validó (decisiones formalizadas en sección `PO/BA Decisions Applied`).

---

## 🏁 Definition of Done

* [ ] Endpoint `POST /api/v1/auth/login` operativo con `LoginRequestDto`/`AuthUserResponseDto`.
* [ ] Cookie de sesión emitida con `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, `Max-Age=30d`.
* [ ] Captcha condicional integrado tras `N=3` fallos consecutivos por IP+email.
* [ ] Rate limit `/auth/login` `10/IP/10min` verificable.
* [ ] Frontend con redirección por rol post-login.
* [ ] Error envelope alineado (`400`, `401`, `409`, `429`).
* [ ] Tests positivos, negativos, E2E para 3 roles y de regresión de timing verdes.
* [ ] PO valida.

---

## 📝 Notes

* Decisiones PO formalizadas en sección `PO/BA Decisions Applied`. Las dudas previas sobre N, cooldown y lifetime quedan resueltas.
* Tracking opcional de IP/User-Agent en `auth_attempts` para auditoría; no obligatorio en MVP.
