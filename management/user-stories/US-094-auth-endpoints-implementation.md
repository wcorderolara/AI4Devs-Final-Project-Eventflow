# 🧾 User Story: Implementar endpoints AUTH del contrato REST

## 🆔 Metadata

| Field              | Value                                           |
| ------------------ | ----------------------------------------------- |
| ID                 | US-094                                         |
| Backlog Item       | PB-P0-004 — REST API Endpoints Foundation (Doc 16) |
| Epic               | EPIC-API-001 — REST API Contract               |
| Feature            | Endpoints Auth                                 |
| Module / Domain    | API / Identity Access                          |
| User Role          | System                                         |
| Priority           | Must Have (P0)                                 |
| Status             | Approved                                       |
| Owner              | Product Owner / Business Analyst               |
| Approved By        | PO/BA Review                                   |
| Approval Date      | 2026-06-12                                     |
| Ready for Development Tasks | Yes                                  |
| Sprint / Milestone | MVP                                            |
| Created Date       | 2026-06-09                                     |
| Last Updated       | 2026-06-12                                     |

---

## 🎯 User Story

**As a** sistema backend de EventFlow  
**I want** exponer los endpoints AUTH y perfil propio bajo `/api/v1` conforme al contrato REST de Doc 16  
**So that** el frontend, MSW y las pruebas de contrato puedan registrar usuarios, iniciar/cerrar sesión, recuperar contraseña y resolver el usuario autenticado con reglas de seguridad consistentes

---

## 🧠 Business Context

### Context Summary

US-094 implementa la base contractual de autenticación para el MVP. Sin estos endpoints, los flujos de registro, login, sesión persistente, logout, recuperación de contraseña y carga de perfil no pueden ser consumidos por el frontend ni por los tests de contrato.

La historia pertenece a PB-P0-004 y se limita a materializar el contrato REST AUTH de Doc 16 usando la fundación ya definida en PB-P0-002 y PB-P0-003: router `/api/v1`, validación Zod, error envelope, correlation ID, middlewares de seguridad y logs estructurados.

### Related Domain Concepts

* `User`
* `Role`
* `Session`
* `PasswordResetToken`
* `AuthUserResponseDto`
* Captcha / anti-bot
* Rate limiting
* Cookie HTTP-only firmada

### Assumptions

* PB-P0-002 provee el backend Express/TypeScript modular y el módulo `identity-access`.
* PB-P0-003 provee validación Zod, error envelope estándar y correlation ID.
* La sesión se transporta mediante cookie HTTP-only firmada, no mediante tokens accesibles a JavaScript.
* Captcha usa proveedor real en entornos productivos y stub determinista en CI/QA.
* El envío de email para recuperación de contraseña puede ser simulado por log estructurado en MVP.

### Dependencies

* PB-P0-002 — Backend Modular Monolith Bootstrap.
* PB-P0-003 — Backend Validation, Error Envelope & Logger.
* ADR-API-001, ADR-API-002, ADR-API-003, ADR-API-004.
* ADR-SEC-001, ADR-SEC-002, ADR-SEC-003, ADR-SEC-004, ADR-SEC-005, ADR-SEC-006.

### PO/BA Decisions Applied

| Decision | Resolution |
| -------- | ---------- |
| Auth endpoint scope | US-094 cubre únicamente el contrato AUTH/profile propio requerido por PB-P0-004: register, login, logout, password reset request, password reset y perfil autenticado. |
| Public registration roles | Registro público sólo acepta `organizer` y `vendor`; `admin` se crea por seed/configuración interna. |
| Session transport | Login emite cookie HTTP-only firmada con atributos seguros; no se exponen tokens a `localStorage` ni `sessionStorage`. |
| Anti-bot controls | Captcha y rate limiting son obligatorios en `register`, `login` y `password/reset-request` según ADR-SEC-004. |
| Profile endpoint path | Esta historia conserva `/api/v1/users/me` por alineación con Epic Map y el draft original. Doc 16 usa `/api/v1/me`; se registra como Documentation Alignment Required, no como blocker. |
| Password reset request status | `POST /api/v1/auth/password/reset-request` responde `202 Accepted` con mensaje genérico para preservar anti-enumeración y alineación con Doc 16. La referencia genérica `200` en Doc 19 requiere alineación documental, no bloquea la historia. |

---

## 🔗 Traceability

| Source                 | Reference |
| ---------------------- | --------- |
| FRD Requirement(s)     | FR-AUTH-001, FR-AUTH-002, FR-AUTH-003, FR-AUTH-004, FR-AUTH-005, FR-AUTH-006, FR-AUTH-007, FR-AUTH-012, FR-USER-001, FR-USER-002, FR-USER-003, FR-USER-005, FR-USER-006 |
| Use Case(s)            | UC-AUTH-001, UC-AUTH-002, UC-AUTH-003, UC-AUTH-004, UC-AUTH-005, UC-AUTH-006 |
| Business Rule(s)       | BR-AUTH-001, BR-AUTH-002, BR-AUTH-003, BR-AUTH-004, BR-AUTH-005, BR-AUTH-011, BR-USER-001, BR-USER-002, BR-USER-005, BR-USER-006, BR-PRIVACY-008, BR-PRIVACY-009 |
| Permission Rule(s)     | SEC-POL-AUTH-001..010; anonymous for public auth endpoints; authenticated `organizer`, `vendor`, `admin` for logout and profile |
| Data Entity / Entities | User, Role, Session, PasswordResetToken |
| API Endpoint(s)        | POST `/api/v1/auth/register`; POST `/api/v1/auth/login`; POST `/api/v1/auth/logout`; POST `/api/v1/auth/password/reset-request`; POST `/api/v1/auth/password/reset`; GET `/api/v1/users/me`; PATCH `/api/v1/users/me`; PATCH `/api/v1/users/me/preferred-language`; POST `/api/v1/users/me/change-password` |
| NFR Reference(s)       | NFR-SEC-001, NFR-SEC-002, NFR-SEC-004, NFR-SEC-005, NFR-SEC-006, NFR-SEC-007, NFR-TEST-001, NFR-TEST-006, NFR-OBS-003, NFR-OBS-006 |
| Related ADR(s)         | ADR-ARCH-001, ADR-BE-001, ADR-API-001, ADR-API-002, ADR-API-003, ADR-API-004, ADR-SEC-001, ADR-SEC-002, ADR-SEC-003, ADR-SEC-004, ADR-SEC-005, ADR-SEC-006, ADR-TEST-001, ADR-TEST-004 |
| Related Document(s)    | /docs/4, /docs/8, /docs/8.1, /docs/9, /docs/10, /docs/14, /docs/16, /docs/18, /docs/19, /docs/20, /docs/22, /management/artifacts/4-Product-Backlog-Prioritized.md |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope.
* MVP Relevance: Must Have (P0).
* Parent Backlog Item: PB-P0-004.

### Explicitly Out of Scope

* Google OAuth / SSO.
* MFA / 2FA / OTP por SMS.
* Multi-rol simultáneo por usuario.
* Creación pública de usuarios `admin`.
* Gestión administrativa de usuarios.
* UI de formularios auth.
* Envío real de email si la infraestructura MVP usa simulación por log.
* Microservicios, Kubernetes, brokers o sesión distribuida enterprise.

### Scope Notes

* Esta historia implementa contrato backend; las pantallas de frontend se cubren en historias de auth/frontend.
* No debe introducir tokens accesibles desde JavaScript.
* No debe debilitar captcha, rate limiting, hashing de contraseña ni mensajes anti-enumeración.
* No debe agregar pagos, chat, WhatsApp, RAG ni decisiones autónomas de IA.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Registro público crea usuario permitido

**Given** un visitante anónimo con `email`, `password`, `name`, `role` igual a `organizer` o `vendor`, `preferredLanguage` válido y `captchaToken` válido  
**When** envía `POST /api/v1/auth/register`  
**Then** el backend valida el DTO con Zod, verifica captcha, guarda `password_hash`, crea el `User` activo y responde `201` con envelope estándar y `AuthUserResponseDto` sin exponer hash ni secretos.

### AC-02: Login emite cookie de sesión HTTP-only

**Given** un usuario activo con contraseña válida y captcha válido  
**When** envía `POST /api/v1/auth/login`  
**Then** el backend verifica el hash, emite cookie de sesión HTTP-only firmada con `Secure`, `SameSite=Lax` y `Path=/`, retorna `200` con datos públicos del usuario y no incluye token en el JSON.

### AC-03: Usuario autenticado obtiene perfil propio

**Given** un usuario `organizer`, `vendor` o `admin` con cookie de sesión válida  
**When** llama `GET /api/v1/users/me`  
**Then** el backend resuelve la sesión, retorna `200` con `id`, `email`, `name`, `role`, `preferredLanguage`, `status`, `phone`, `createdAt` y `updatedAt`, sin datos sensibles.

### AC-04: Usuario autenticado actualiza perfil permitido

**Given** un usuario autenticado  
**When** llama `PATCH /api/v1/users/me` con `name`, `phone` y/o `preferredLanguage` válidos  
**Then** el backend actualiza únicamente campos permitidos y retorna `200` con el perfil actualizado; el email y el rol no son editables en MVP.

### AC-05: Logout invalida la sesión actual

**Given** un usuario autenticado con sesión vigente  
**When** llama `POST /api/v1/auth/logout`  
**Then** el backend invalida la sesión actual, limpia o revoca la cookie y responde `204 No Content`; llamadas protegidas posteriores con esa sesión responden `401`.

### AC-06: Recuperación de contraseña evita enumeración

**Given** un visitante anónimo con email y captcha válido  
**When** llama `POST /api/v1/auth/password/reset-request`  
**Then** el backend responde `202` con respuesta genérica tanto si el email existe como si no existe, y si existe genera un token de reset de uso único con expiración.

### AC-07: Reset de contraseña actualiza hash con token válido

**Given** un token de reset vigente, no consumido y asociado a un usuario  
**When** el usuario llama `POST /api/v1/auth/password/reset` con `newPassword` válida  
**Then** el backend valida el token, actualiza `password_hash`, marca el token como consumido y responde `204 No Content`.

### AC-08: Contrato API mantiene envelopes, correlation ID y `/api/v1`

**Given** cualquier endpoint de esta historia  
**When** responde éxito o error  
**Then** usa el prefijo `/api/v1`, el envelope estándar de ADR-API-002, valida entrada con Zod, propaga `X-Correlation-Id` y no expone stack traces, hashes, cookies, tokens ni captcha secrets en payloads o logs.

---

## ⚠️ Edge Cases

### EC-01: Registro intenta crear admin

**Given** un visitante anónimo  
**When** llama `POST /api/v1/auth/register` con `role='admin'`  
**Then** el backend rechaza la operación con error de validación o `403` según el mapeo de error vigente y no crea el usuario.

#### Handling

* Validar `role` contra enum permitido `organizer | vendor`.
* Registrar evento de seguridad sin guardar password ni captcha token.

### EC-02: Email duplicado

**Given** existe un usuario activo con el mismo email normalizado  
**When** se intenta registrar otro usuario con ese email  
**Then** el backend responde `409 EMAIL_TAKEN` y no crea duplicado.

#### Handling

* Normalizar email a lowercase para comparación.
* Apoyarse en constraint único de base de datos.

### EC-03: Login con credenciales inválidas

**Given** email inexistente o password incorrecta  
**When** llama `POST /api/v1/auth/login`  
**Then** el backend responde `401` con mensaje genérico sin distinguir si el email existe.

#### Handling

* Evitar user enumeration.
* Loguear intento fallido a nivel `warn` sin password.

### EC-04: Captcha faltante o inválido

**Given** un endpoint con captcha obligatorio  
**When** el request no incluye `captchaToken` válido  
**Then** el backend rechaza la solicitud antes de procesar credenciales o datos de registro.

#### Handling

* Usar stub determinista en CI/QA.
* Mensaje claro y genérico de verificación de seguridad fallida.

### EC-05: Rate limit excedido

**Given** se supera el límite definido para login, registro o reset-request  
**When** llega una nueva solicitud dentro de la ventana  
**Then** el backend responde `429 Too Many Requests` e incluye headers de rate limit cuando aplique.

#### Handling

* Login: 10/IP/10 min.
* Register: 5/IP/10 min.
* Password reset request: 3/email/h.

### EC-06: Reset token expirado, inválido o reutilizado

**Given** un token de reset inválido, expirado o ya consumido  
**When** se llama `POST /api/v1/auth/password/reset`  
**Then** el backend rechaza la operación y no cambia la contraseña.

#### Handling

* Token de un solo uso.
* TTL recomendado 15 min.
* Log estructurado sin exponer el token.

---

## 🚫 Validation Rules

| ID    | Rule | Message / Behavior |
| ----- | ---- | ------------------ |
| VR-01 | `email` requerido, normalizado y con formato válido | `422 VALIDATION_ERROR` |
| VR-02 | `password` / `newPassword` requerida y conforme a política mínima | `422 VALIDATION_ERROR` |
| VR-03 | `name` requerido en registro y no vacío | `422 VALIDATION_ERROR` |
| VR-04 | `role` de registro sólo permite `organizer` o `vendor` | Rechazo; no crear `admin` |
| VR-05 | `preferredLanguage` sólo permite `es-LATAM`, `es-ES`, `pt`, `en` | `422 VALIDATION_ERROR` |
| VR-06 | `captchaToken` requerido en register, login y reset-request | Rechazo de seguridad antes de procesar |
| VR-07 | `token` de reset requerido, vigente y no consumido | `401` o `410` según mapeo vigente |
| VR-08 | Campos no permitidos (`role`, `email`, `password_hash`, `status`) no se aceptan en PATCH perfil | Ignorar o rechazar con `422` según schema estricto |

---

## 🔐 Authorization & Security Rules

| ID     | Rule |
| ------ | ---- |
| SEC-01 | `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/password/reset-request` y `POST /api/v1/auth/password/reset` son endpoints públicos para `anonymous`, con controles de validación/rate limit/captcha según aplique. |
| SEC-02 | `POST /api/v1/auth/logout`, `GET /api/v1/users/me`, `PATCH /api/v1/users/me`, `PATCH /api/v1/users/me/preferred-language` y `POST /api/v1/users/me/change-password` requieren sesión válida. |
| SEC-03 | Login emite sesión en cookie HTTP-only firmada; no se retornan tokens de auth en JSON ni se usan `localStorage`/`sessionStorage`. |
| SEC-04 | Captcha obligatorio en register, login y reset-request; rate limit obligatorio según ADR-SEC-004. |
| SEC-05 | Passwords se almacenan sólo como hash `argon2id` recomendado o `bcrypt` con parámetros aceptados; nunca en texto plano ni en logs. |
| SEC-06 | Errores de login y reset-request son anti-enumeración: no revelan si el email existe. |
| SEC-07 | Logs deben redactar password, `password_hash`, reset token, session cookie, captcha token y secretos. |
| SEC-08 | Registro público no puede crear `admin`; admin queda fuera de este endpoint público. |

### Negative Authorization Scenarios

* Usuario anónimo llama `GET /api/v1/users/me` → `401`.
* Usuario anónimo llama `POST /api/v1/auth/logout` → `401`.
* Registro con `role='admin'` → rechazo y usuario no creado.
* Login sin captcha válido → rechazo antes de verificar credenciales.
* Login con credenciales inválidas → `401` con mensaje genérico.
* Reset-request para email inexistente → `202` genérico.
* Reuso de reset token consumido → rechazo y password sin cambios.
* Sesión revocada intenta acceder a perfil → `401`.

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

| Area                | Notes |
| ------------------- | ----- |
| Screen / Route      | No introduce UI; soporta `/[locale]/auth/register`, `/[locale]/auth/login`, `/[locale]/auth/forgot-password`, `/[locale]/settings/profile`. |
| Main UI Pattern     | Backend API contract only. |
| Primary Action      | N/A. |
| Secondary Actions   | N/A. |
| Empty State         | N/A. |
| Loading State       | N/A. |
| Error State         | Frontend debe mostrar mensajes genéricos para login/reset según `error.code`. |
| Success State       | Login permite hidratar `/users/me` y redirigir según rol. |
| Accessibility Notes | Las pantallas consumidoras deben mantener labels y errores accesibles; no se implementa UI aquí. |
| Responsive Notes    | No aplica. |
| i18n Notes          | `preferredLanguage` soporta `es-LATAM`, `es-ES`, `pt`, `en`. |
| Currency Notes      | No aplica. |

---

## 🛠 Technical Notes

### Frontend

* Route / Page: No aplica en esta historia.
* Components: No aplica.
* State Management: El frontend consumirá cookie HTTP-only y `GET /api/v1/users/me` para hidratar usuario.
* Forms: Contrato soporta register/login/reset/profile, pero formularios se cubren en historias frontend/auth.
* API Client: Debe usar `credentials: 'include'` y manejar error envelope estándar.

### Backend

* Module: `identity-access` y perfil propio de `user-profile`.
* Controller / Route: `AuthController` bajo `/api/v1/auth`; profile routes bajo `/api/v1/users/me`.
* Use Cases: `RegisterUserUseCase`, `LoginUserUseCase`, `LogoutUserUseCase`, `RequestPasswordResetUseCase`, `ResetPasswordUseCase`, `GetCurrentUserUseCase`, `UpdateCurrentUserProfileUseCase`, `ChangePreferredLanguageUseCase`, `ChangePasswordUseCase`.
* DTO Validation: Zod strict schemas en boundary HTTP.
* Authorization Policy: anonymous para register/login/reset; authenticated para logout/profile.
* Middleware: correlation ID, security headers, rate limit, captcha where required, auth middleware, validation, error handler.
* Transaction Required: Sí para register, reset password y logout si persiste revocación de sesión.

### Database

* Main Tables: `users`, sesión persistida si aplica, password reset token table si aplica.
* Constraints: email único case-insensitive; role enum; preferred language enum; password hash obligatorio.
* Index Considerations: `users.email`, reset token hash, session `sid`/`jti`.
* Seed Impact: Admin seed sigue fuera del registro público.

### API

| Method | Endpoint | Purpose | Auth | Expected Success |
| ------ | -------- | ------- | ---- | ---------------- |
| POST | `/api/v1/auth/register` | Registrar `organizer` o `vendor` | anonymous + captcha | `201` |
| POST | `/api/v1/auth/login` | Iniciar sesión y emitir cookie | anonymous + captcha | `200 + Set-Cookie` |
| POST | `/api/v1/auth/logout` | Cerrar sesión | authenticated | `204` |
| POST | `/api/v1/auth/password/reset-request` | Solicitar reset password | anonymous + captcha | `202` |
| POST | `/api/v1/auth/password/reset` | Aplicar reset password con token | anonymous + token | `204` |
| GET | `/api/v1/users/me` | Obtener usuario autenticado | authenticated | `200` |
| PATCH | `/api/v1/users/me` | Actualizar perfil propio permitido | authenticated | `200` |
| PATCH | `/api/v1/users/me/preferred-language` | Actualizar idioma preferido | authenticated | `200` |
| POST | `/api/v1/users/me/change-password` | Cambiar contraseña autenticada | authenticated | `204` |

### Observability / Audit

* Correlation ID Required: Yes.
* Log Event Required: Yes for failed login, captcha failure, rate limit hit, reset request generated, reset failure, logout.
* AdminAction Required: No.
* AIRecommendation Required: No.
* Sensitive Fields Redacted: password, password_hash, reset token, captchaToken, cookie/session secret.

### Documentation Alignment Required

| Documento / Fuente | Conflicto detectado | Decisión vigente | Acción recomendada | ¿Bloquea aprobación? |
| ------------------ | ------------------- | ---------------- | ------------------ | -------------------- |
| Doc 16 §10/§23 y Doc 19 §9.2 | Usan `/api/v1/me` para perfil; Epic Map y US-094 usan `/api/v1/users/me`. | US-094 conserva `/api/v1/users/me` por alineación con la historia y Epic Map. | Unificar Doc 16/Doc 19 o registrar ADR/decisión de endpoint canónico antes de OpenAPI snapshot si el equipo prefiere `/me`. | No |
| Doc 16 §22 vs Doc 19 §9.5 | Doc 16 indica `202` para reset-request; Doc 19 describe `200` genérico. | US-094 usa `202` por ser contrato API de Doc 16 y PB-P0-004. | Alinear Doc 19 para que el código HTTP coincida con Doc 16, manteniendo respuesta anti-enumeración. | No |

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario | Type |
| ----- | -------- | ---- |
| TS-01 | Register crea `organizer` con captcha válido y retorna `201` sin hash | Integration / Supertest |
| TS-02 | Register crea `vendor` con captcha válido y retorna envelope estándar | Integration / Supertest |
| TS-03 | Login válido emite `Set-Cookie` HTTP-only y retorna usuario público | Integration / Supertest |
| TS-04 | Logout invalida sesión y siguiente `/users/me` retorna `401` | Integration / Supertest |
| TS-05 | Reset-request para email existente retorna `202` y genera token de reset | Integration / Unit |
| TS-06 | Reset password con token válido actualiza hash y consume token | Integration / Unit |
| TS-07 | `GET /users/me` retorna perfil público con sesión válida | Integration / Supertest |
| TS-08 | `PATCH /users/me` actualiza campos permitidos y no cambia email/role | Integration / Supertest |

### Negative Tests

| ID    | Scenario | Expected Result |
| ----- | -------- | --------------- |
| NT-01 | Register con `role='admin'` | Rechazo; usuario no creado |
| NT-02 | Register con email duplicado | `409 EMAIL_TAKEN` |
| NT-03 | Register/login/reset-request sin captcha válido | Rechazo de seguridad |
| NT-04 | Login con email inexistente | `401` genérico |
| NT-05 | Login con password incorrecta | `401` con el mismo mensaje genérico |
| NT-06 | Login excede rate limit | `429` |
| NT-07 | Reset-request para email inexistente | `202` genérico |
| NT-08 | Reset con token expirado | Rechazo; password sin cambios |
| NT-09 | Reset con token ya consumido | Rechazo; password sin cambios |
| NT-10 | `GET /users/me` sin sesión | `401` |
| NT-11 | `PATCH /users/me` intenta cambiar email o role | Rechazo/ignorado según schema; no se actualiza |
| NT-12 | Logs de fallo auth contienen password/token/cookie | Falla test de redacción si aparece secreto |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario | Expected Result |
| ---------- | -------- | --------------- |
| AUTH-TS-01 | Anonymous accede a register/login/reset-request | Allowed with validation, captcha and rate limit |
| AUTH-TS-02 | Anonymous accede a logout/profile | `401` |
| AUTH-TS-03 | Authenticated `organizer`, `vendor`, `admin` accede a `/users/me` | `200` own profile |
| AUTH-TS-04 | Sesión revocada intenta acceder a `/users/me` | `401` |
| AUTH-TS-05 | Public register intenta crear admin | Rejected |

### Accessibility Tests

* No aplica directamente; no introduce UI.

### Contract Tests

* MSW/OpenAPI snapshot debe reflejar estos endpoints, status codes, DTOs y error envelopes en PB-P0-005.

---

## 📊 Business Impact

| Field               | Value |
| ------------------- | ----- |
| KPI Affected        | Activación de usuarios, éxito de login, estabilidad del contrato API, calidad de seguridad |
| Expected Impact     | Habilita flujos auth P1 y consumo frontend/MSW sobre contrato estable |
| Success Criteria    | Supertest verde para endpoints AUTH/profile; error envelope consistente; captcha/rate-limit testeables; cookie HTTP-only emitida |
| Academic Demo Value | Permite demo E2E con registro/login/logout y evidencia de seguridad básica |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* No crear UI en esta historia.
* Actualizar cliente API/MSW sólo si el backlog PB-P0-005/PB-P0-013 lo requiere.

### Potential Backend Tasks

* Implementar rutas `/api/v1/auth/*`.
* Implementar rutas `/api/v1/users/me`.
* Crear schemas Zod y DTOs.
* Implementar use cases auth/profile.
* Integrar captcha verifier y rate limit middleware.
* Emitir/revocar cookie de sesión HTTP-only.
* Aplicar error envelope y correlation ID.

### Potential Database Tasks

* Verificar constraints de `users`.
* Agregar/persistir sesión o revocación si la estrategia elegida lo requiere.
* Agregar password reset token table si no existe en US-099/US-100.

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* Supertest integration suite para happy paths y negativos.
* Tests de captcha stub en CI.
* Tests de rate limit.
* Tests de redacción de logs.
* Contract snapshot follow-up en PB-P0-005.

### Potential DevOps / Config Tasks

* Variables de entorno para `SESSION_SECRET`, captcha secret/site key y modo captcha test.
* Asegurar secretos vía env vars / Secrets Manager, nunca en repo.
