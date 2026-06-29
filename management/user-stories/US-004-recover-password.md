# 🧾 User Story: Recuperar mi contraseña vía email

## 🆔 Metadata

| Field                       | Value                                                  |
| --------------------------- | ------------------------------------------------------ |
| ID                          | US-004                                                 |
| Epic                        | EPIC-AUTH-001 — Authentication & User Access           |
| Backlog Item                | PB-P1-004                                              |
| Feature                     | Recuperación de contraseña                              |
| Module / Domain             | Auth                                                   |
| User Role                   | Anonymous (usuario registrado que olvidó su contraseña) |
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

**As a** usuario registrado en EventFlow que olvidó su contraseña
**I want** solicitar un email con un enlace seguro de recuperación y establecer una nueva contraseña
**So that** pueda volver a acceder a mi cuenta sin perder mis datos

---

## 🧠 Business Context

### Context Summary

La recuperación de contraseña es un flujo crítico de continuidad. El usuario solicita el reset en `/auth/forgot-password`, el backend persiste un token de un solo uso de ≥32 bytes hasheado con TTL 30 min (Decisión PO US-004 #4, PB-P1-004) y envía un email vía `MockEmailSender` (puerto `EmailSender`, adapter por entorno). La respuesta de `/auth/password/reset-request` es siempre `202 Accepted` con mensaje genérico para evitar enumeración (Decisión PO US-004 #1 + SEC-POL-AUTH-005). El usuario abre el enlace, fija una nueva contraseña que cumple la política Doc 19 §11.2 y `/auth/password/reset` aplica el cambio respondiendo `204 No Content`. Captcha + rate limit canónicos protegen el flujo (Doc 19 §6).

### Related Domain Concepts

* Token de recuperación (uso único, hash en DB, TTL 30 min).
* Puerto `EmailSender` + `MockEmailSender` (log estructurado) para MVP.
* Captcha y rate limiting canónicos.
* Política de contraseñas Doc 19 §11.2.

### Assumptions

* El email real puede no estar habilitado en MVP; el adapter `MockEmailSender` produce un log estructurado como evidencia.
* El usuario puede completar el reseteo en el mismo navegador o en otro dispositivo.
* En MVP no existe tabla `sessions`; la estrategia de invalidación es rotación de cookie (consistente con US-005).

### Dependencies

* PB-P0-001 (schema `users` y nueva tabla `password_reset_tokens` aplicada en esta US).
* PB-P0-006 (cookies firmadas + captcha).
* PB-P0-007 (rate limit + middleware chain).
* PB-P1-003 (login predecesor para emitir cookie tras nuevo password si aplica al UX).

---

## 🧾 PO/BA Decisions Applied

| Decision                                                                          | Source                                                              | Resolución aplicada en esta historia                                                                                                                                                  |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status code de `/auth/password/reset-request`                                     | Doc 16 §22.3; conflicto con Doc 19 SEC-POL-AUTH-005                  | `202 Accepted` con mensaje genérico siempre (independiente de la existencia del email). Override formal sobre Doc 19 SEC-POL-AUTH-005 → Documentation Alignment Required (no ADR).     |
| VR-05 "nueva contraseña ≠ anterior"                                                | Doc 19 §11.2 (política MVP)                                          | Se elimina VR-05. La política de contraseña en `/auth/password/reset` es la política MVP de Doc 19 §11.2 (≥10 caracteres, letra+número, distinta del localpart del email).             |
| Invalidación de sesiones tras reset exitoso                                       | Decisión PO US-004; modelo MVP sin tabla `sessions` (Doc 19 §9.6 alternativa) | No se invalidan otras sesiones activas en MVP. La estrategia de rotación de cookie (US-005) no permite revocación global sin tabla `sessions`. Si en el futuro se requiere, ADR. |
| TTL del token de reset                                                            | PB-P1-004 (Decisión PO US-004 documentada en backlog)                | `TTL = 30 minutos`. Override formal sobre Doc 19 §11 (15 min) → Documentation Alignment Required (no ADR).                                                                              |
| Paths canónicos                                                                   | Doc 16 §22.3                                                         | `POST /api/v1/auth/password/reset-request` y `POST /api/v1/auth/password/reset`.                                                                                                       |
| Catálogo de errores alineado al error envelope                                    | Doc 16 §22.3, §22.6                                                  | `202 Accepted` (reset-request), `204 No Content` (reset), `400 TOKEN_USED`, `400 TOKEN_INVALID`, `410 GONE_TOKEN_EXPIRED`, `422 VALIDATION_ERROR`, `429 RATE_LIMIT_EXCEEDED`.          |
| Hashing y verificación                                                            | Doc 19 §11.2; ADR-SEC-003                                            | Nueva contraseña hasheada con `argon2id` (`memoryCost=19MiB, timeCost=2, parallelism=1`); `bcrypt(12)` fallback.                                                                       |
| Token criptográficamente seguro                                                   | Doc 19 §11.6                                                         | ≥32 bytes random, persistido como `token_hash`. No se almacena el token plano.                                                                                                        |
| Puerto `EmailSender` + adapter `MockEmailSender`                                   | PB-P1-004 ("Email simulado vía MockEmailService")                   | Puerto `EmailSender` en `modules/notifications`; adapter `MockEmailSender` por defecto en MVP (log estructurado); selección por entorno.                                              |
| Captcha y rate limits                                                              | Doc 19 §6; BR-AUTH-011; Doc 16 §22.6                                | Captcha obligatorio en `/reset-request`. Rate limits: `3/email/h` en `/reset-request`; `5/IP/10min` en `/reset`.                                                                       |

---

## 🔗 Traceability

| Source                 | Reference                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| FRD Requirement(s)     | FR-AUTH-006, FR-AUTH-012                                                                                            |
| Use Case(s)            | UC-AUTH-004                                                                                                        |
| Business Rule(s)       | BR-AUTH-004, BR-AUTH-011, BR-PRIVACY-008, BR-PRIVACY-009                                                            |
| Permission Rule(s)     | Anónimo puede solicitar; solo el dueño del token puede resetear                                                    |
| Data Entity / Entities | `User`, `PasswordResetToken`                                                                                        |
| API Endpoint(s)        | `POST /api/v1/auth/password/reset-request`, `POST /api/v1/auth/password/reset`                                      |
| NFR Reference(s)       | NFR-SEC-003, NFR-SEC-005                                                                                            |
| Related ADR(s)         | ADR-SEC-001, ADR-SEC-003                                                                                            |
| Related Document(s)    | `/docs/8 UC-AUTH-004`, `/docs/16 §22.3, §22.6`, `/docs/19 §6, §11, §SEC-POL-AUTH-005/006`                          |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* Recuperación vía SMS / WhatsApp.
* Reset por preguntas de seguridad.
* Reset con biometría / 2FA.
* SMTP real obligatorio (MVP usa `MockEmailSender`).
* Invalidación global de sesiones tras reset (no factible sin tabla `sessions`; futuro ADR si se promueve).
* Regla "nueva contraseña ≠ anterior" (Decisión PO US-004 #2).

### Scope Notes

* Mensajes neutros siempre: nunca revelar existencia del email.
* Token único de un solo uso con expiración `30 min`.
* Política de contraseña heredada de Doc 19 §11.2.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Solicitud de recuperación

**Given** un usuario anónimo en `/[locale]/auth/forgot-password`
**When** envía `POST /api/v1/auth/password/reset-request` con `ForgotPasswordRequestDto { email, captchaToken }`, captcha verificado server-side
**Then** el backend genera un token random `≥32` bytes, lo hashea con SHA-256 (o equivalente seguro) y lo persiste en `password_reset_tokens` con `expires_at = now() + 30 min` y `consumed_at = NULL`. Envía el email vía `EmailSender` (en MVP: `MockEmailSender` con log estructurado). La respuesta es siempre `202 Accepted` con mensaje genérico ("Si el email existe, recibirás un enlace").

### AC-02: Establecer nueva contraseña

**Given** el usuario abre el enlace con token vigente
**When** envía `POST /api/v1/auth/password/reset` con `ResetPasswordRequestDto { token, newPassword }`
**Then** el backend valida la política Doc 19 §11.2, recupera el token por hash, verifica `expires_at > now()` y `consumed_at IS NULL`, actualiza `User.password_hash` con `argon2id`, marca `consumed_at = now()` y responde `204 No Content`. Frontend redirige a `/[locale]/auth/login` con mensaje de éxito i18n.

### AC-03: Email inexistente devuelve respuesta neutra

**Given** un email que no está registrado
**When** se solicita recuperación
**Then** el sistema responde `202 Accepted` con el mismo mensaje neutro, sin enviar email y sin filtrar la inexistencia (SEC-POL-AUTH-005). Se emite log `auth.reset.requested.no_email`.

### AC-04: Rate limit excedido

**Given** una IP o email que excedió la cuota
**When** envía un nuevo intento
**Then**:
- `/reset-request`: si supera `3/email/h` → `429 RATE_LIMIT_EXCEEDED`.
- `/reset`: si supera `5/IP/10min` → `429 RATE_LIMIT_EXCEEDED`.

### AC-05: Política de contraseña no cumple

**Given** el usuario envía una nueva contraseña inválida
**When** invoca `/auth/password/reset`
**Then** `422 VALIDATION_ERROR` con `details[].field=newPassword` y los códigos de la política Doc 19 §11.2.

---

## ⚠️ Edge Cases

### EC-01: Token expirado

**Given** el token superó `30 min`
**When** el usuario intenta resetear
**Then** `410 GONE_TOKEN_EXPIRED`. Frontend muestra CTA "Solicitar nuevo enlace".

#### Handling

* Mensaje claro.
* Botón "Solicitar nuevo enlace".

---

### EC-02: Token ya utilizado

**Given** el token fue consumido (`consumed_at` no nulo)
**When** el usuario lo reusa
**Then** `400 TOKEN_USED`.

#### Handling

* Logear `auth.reset.failure { reason: token_used }` con `correlationId`.

---

### EC-03: Token alterado o inexistente

**Given** un token inválido (hash no encontrado en la tabla)
**When** el usuario intenta resetear
**Then** `400 TOKEN_INVALID`.

#### Handling

* Logear `auth.reset.failure { reason: token_invalid }`.
* Rate limit canónico `5/IP/10min` cubre el caso bruto.

---

## 🚫 Validation Rules

| ID    | Rule                                                          | Message / Behavior                                  |
| ----- | ------------------------------------------------------------- | --------------------------------------------------- |
| VR-01 | Email obligatorio y bien formado en `/reset-request`          | `422 VALIDATION_ERROR` o respuesta neutra `202` según corresponda |
| VR-02 | `captchaToken` obligatorio en `/reset-request`                | `400 CAPTCHA_REQUIRED` / `400 CAPTCHA_INVALID`     |
| VR-03 | Token obligatorio y dentro de la ventana                      | `410 GONE_TOKEN_EXPIRED` si expira; `400` si inválido |
| VR-04 | Nueva contraseña cumple política Doc 19 §11.2                 | `422 VALIDATION_ERROR` con `details[].field=newPassword` |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                                                       |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| SEC-01 | Endpoints públicos (`anonymous`). Captcha obligatorio en `/reset-request` (Doc 19 §6).                                                       |
| SEC-02 | Token random `≥32` bytes; hash persistido (`token_hash`); el token plano no se almacena ni se loguea (SEC-POL-AUTH-006, Doc 19 §11.6).      |
| SEC-03 | Expiración `30 min` (Decisión PO US-004 #4); un solo uso (`consumed_at`).                                                                   |
| SEC-04 | Respuesta uniforme `202` en `/reset-request` aun cuando el email no exista (SEC-POL-AUTH-005).                                              |
| SEC-05 | Rate limit canónico: `3/email/h` en `/reset-request`, `5/IP/10min` en `/reset` (Doc 19 §6).                                                  |
| SEC-06 | Logs no incluyen el token plano, ni la nueva contraseña, ni el hash.                                                                       |
| SEC-07 | Nuevo `password_hash` con `argon2id` (Doc 19 §11.2; ADR-SEC-003).                                                                          |
| SEC-08 | No se invalidan otras sesiones tras reset en MVP (Decisión PO US-004 #3).                                                                  |

### Negative Authorization Scenarios

* Usuario autenticado invoca `/reset-request` → permitido pero con log `auth.reset.requested.authenticated`.
* Intentos masivos desde misma IP / mismo email → `429 RATE_LIMIT_EXCEEDED`.
* Reuso de token consumido → `400 TOKEN_USED` con alerta.

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

| Area                | Notes                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| Screen / Route      | `/[locale]/auth/forgot-password`, `/[locale]/auth/reset-password`                              |
| Main UI Pattern     | Form simple en cada paso                                                                       |
| Primary Action      | "Enviar enlace de recuperación" / "Guardar nueva contraseña"                                    |
| Secondary Actions   | "Volver a login" / "Solicitar nuevo enlace" (en `410`)                                          |
| Empty State         | No aplica                                                                                      |
| Loading State       | Spinner en botón                                                                               |
| Error State         | Banner con mensaje neutro o específico (token), `aria-live polite`                              |
| Success State       | Confirmación + redirect a login                                                                |
| Accessibility Notes | Labels, focus inicial en email/password, errores con `aria-live`                                |
| Responsive Notes    | Mobile-first                                                                                   |
| i18n Notes          | 4 locales (`es-LATAM`, `es-ES`, `pt`, `en`)                                                    |
| Currency Notes      | No aplica                                                                                      |

---

## 🛠 Technical Notes

### Frontend

* Route / Page:
  * `/[locale]/auth/forgot-password`
  * `/[locale]/auth/reset-password` (lee `token` de query string)
* Components:
  * `ForgotPasswordForm`, `ResetPasswordForm`, `CaptchaWidget`, `TokenExpiredBanner`
* State Management:
  * React Hook Form + Zod; TanStack Query mutations `useForgotPassword`, `useResetPassword`
* Forms:
  * Zod schemas locales + reglas Doc 19 §11.2 para nueva contraseña.
* API Client:
  * `authApi.requestPasswordReset(payload)`, `authApi.resetPassword(payload)`

### Backend

* Use Case / Service:
  * `RequestPasswordResetUseCase`, `ResetPasswordUseCase`
* Controller / Route:
  * `POST /api/v1/auth/password/reset-request`
  * `POST /api/v1/auth/password/reset`
* Authorization Policy:
  * `anonymous`
* Validation:
  * `ForgotPasswordRequestDto { email, captchaToken }`, `ResetPasswordRequestDto { token, newPassword }`
* Token:
  * `randomBytes(32)`; `token_hash = sha256(token)`; persistir hash + `expires_at + 30min` + `consumed_at NULL`.
* Hashing nueva contraseña:
  * `argon2id` con parámetros mínimos Doc 19 §11.2.
* Email:
  * Puerto `EmailSender`; adapter `MockEmailSender` por defecto (log estructurado con destinatario y link).
* Transaction Required:
  * Sí en `/reset` (actualizar `password_hash` + marcar `consumed_at` en una sola transacción).

### Database

* Main Tables:
  * `users` (lectura + update `password_hash`).
  * Nueva tabla `password_reset_tokens`.
* Constraints:
  * `password_reset_tokens.token_hash` UNIQUE.
  * `expires_at NOT NULL`.
* Index Considerations:
  * `@@index([user_id])`, `@@index([expires_at])` para limpieza.

### API

| Method | Endpoint                                       | Purpose                          |
| ------ | ---------------------------------------------- | -------------------------------- |
| POST   | `/api/v1/auth/password/reset-request`          | Solicitar enlace de recuperación |
| POST   | `/api/v1/auth/password/reset`                  | Establecer nueva contraseña      |

### Observability / Audit

* Correlation ID Required: Yes
* Log Event Required: Yes (`auth.reset.requested`, `auth.reset.requested.no_email`, `auth.reset.requested.authenticated`, `auth.reset.completed`, `auth.reset.failure { reason }`).
* AdminAction Required: No.
* AIRecommendation Required: No.

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                            | Type        |
| ----- | ------------------------------------------------------------------- | ----------- |
| TS-01 | Solicitud con email existente: token persistido y email simulado loggeado | Integration |
| TS-02 | Solicitud con email inexistente: `202` neutro sin email              | Integration |
| TS-03 | Reset con token válido cambia password y marca `consumed_at`         | Integration |
| TS-04 | Flujo E2E completo: forgot → email log → reset → login               | E2E         |
| TS-05 | Respuesta idempotente `202` (SEC-POL-AUTH-005)                       | API         |

### Negative Tests

| ID    | Scenario                              | Expected Result                                |
| ----- | ------------------------------------- | ---------------------------------------------- |
| NT-01 | Token expirado                        | `410 GONE_TOKEN_EXPIRED`                       |
| NT-02 | Token ya usado                        | `400 TOKEN_USED`                               |
| NT-03 | Token inexistente / alterado          | `400 TOKEN_INVALID`                            |
| NT-04 | Nueva contraseña débil                | `422 VALIDATION_ERROR` `field=newPassword`     |
| NT-05 | Rate limit `/reset-request`           | `429 RATE_LIMIT_EXCEEDED` (`3/email/h`)        |
| NT-06 | Rate limit `/reset`                   | `429 RATE_LIMIT_EXCEEDED` (`5/IP/10min`)       |
| NT-07 | Captcha faltante en `/reset-request`  | `400 CAPTCHA_REQUIRED`                         |
| NT-08 | Captcha inválido                      | `400 CAPTCHA_INVALID`                          |
| NT-09 | Log no expone token plano             | Test sobre logger                              |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario                              | Expected Result |
| ---------- | ------------------------------------- | --------------- |
| AUTH-TS-01 | Anónimo solicita `/reset-request`     | `202`           |
| AUTH-TS-02 | Anónimo resetea con token válido      | `204`           |
| AUTH-TS-03 | Token de otro usuario / forjado       | `400`           |

### Accessibility Tests

* Navegación por teclado.
* Anuncios accesibles de éxito/error en `aria-live`.

---

## 📊 Business Impact

| Field               | Value                                                       |
| ------------------- | ----------------------------------------------------------- |
| KPI Affected        | Retención, reducción de fricción de acceso                  |
| Expected Impact     | Reduce abandono por contraseña olvidada                      |
| Success Criteria    | ≥ 80% de solicitudes válidas completan reset; tests verdes  |
| Academic Demo Value | Demuestra resiliencia de autenticación                       |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Páginas `forgot-password` / `reset-password` con forms.
* `useForgotPassword` y `useResetPassword` (TanStack Query).
* Captcha condicional (heredado de PB-P0-006).
* `TokenExpiredBanner` con CTA "Solicitar nuevo enlace".
* i18n en los 4 locales.

### Potential Backend Tasks

* `RequestPasswordResetUseCase` + `ResetPasswordUseCase`.
* Generación de token (32 bytes) + hash + persistencia + TTL 30 min.
* Puerto `EmailSender` + `MockEmailSender` (log estructurado).
* Transacción atómica en `/reset`.
* Rate limit `3/email/h` y `5/IP/10min`.

### Potential Database Tasks

* Migración `password_reset_tokens` con índices.

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* Tests positivos/negativos, idempotencia, política de contraseñas, redacción de logs, E2E.

### Potential DevOps / Config Tasks

* Variables: `PASSWORD_RESET_TOKEN_TTL_MIN=30`, `EMAIL_SENDER_PROVIDER=mock`, `CAPTCHA_SECRET`, rate limits.

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
* [x] PO/BA validó (decisiones formalizadas en `PO/BA Decisions Applied`).

---

## 🏁 Definition of Done

* [ ] Endpoints `POST /api/v1/auth/password/reset-request` y `POST /api/v1/auth/password/reset` operativos.
* [ ] Token random ≥32 bytes, hash en DB, TTL 30 min, uso único.
* [ ] Email simulado vía `MockEmailSender` con log estructurado.
* [ ] Captcha verificado en `/reset-request`.
* [ ] Rate limits canónicos `3/email/h` y `5/IP/10min`.
* [ ] Política de contraseñas Doc 19 §11.2 aplicada en `/reset`.
* [ ] Catálogo de errores alineado al error envelope (`202`, `204`, `400`, `410`, `422`, `429`).
* [ ] Tests positivos, negativos, idempotencia y E2E verdes.
* [ ] PO valida.

---

## 📝 Notes

* Decisiones PO formalizadas en sección `PO/BA Decisions Applied`. Quedan resueltos TTL, status code, VR-05 e invalidación de sesiones.
* Si en el futuro se requiere invalidación global de sesiones tras reset, se promueve por ADR a la alternativa con tabla `sessions` (Doc 19 §9.6).
