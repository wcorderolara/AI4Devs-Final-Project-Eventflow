# 🧾 User Story: Ver y editar mi perfil propio

## 🆔 Metadata

| Field                       | Value                                                  |
| --------------------------- | ------------------------------------------------------ |
| ID                          | US-006                                                 |
| Epic                        | EPIC-AUTH-001 — Authentication & User Access           |
| Backlog Item                | PB-P1-005                                              |
| Feature                     | Gestión de perfil propio + cambio de idioma            |
| Module / Domain             | Auth / Users                                           |
| User Role                   | Authenticated (Organizer / Vendor / Admin)             |
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

**As a** usuario autenticado de EventFlow (Organizer / Vendor / Admin)
**I want** consultar y editar los datos de mi propio perfil (nombre, teléfono opcional, idioma preferido, contraseña)
**So that** mi información esté actualizada, mi experiencia esté localizada en mi idioma preferido y pueda mantener mi cuenta segura

---

## 🧠 Business Context

### Context Summary

Los perfiles de usuario se mantienen mínimos en el MVP de EventFlow (Doc 4 BR-USER-001/005, Doc 19 §11). El usuario autenticado puede ver y actualizar sus datos básicos (nombre, teléfono opcional, idioma preferido) y cambiar su contraseña desde la pantalla `/[locale]/profile`. El email **no** es editable en MVP por la complejidad de re-verificación (Decisión PO US-006 #1, derivada de PB-P1-005). El rol nunca es editable por el propio usuario (BR-USER-001, Doc 5 §9.1). El cambio de contraseña invalida las otras sesiones activas pero mantiene la sesión actual del usuario que ejecuta el cambio (Decisión PO US-006 #2, derivada de PB-P1-005 línea 120). El selector de idioma se presenta con nombres nativos (`Español LATAM`, `Español`, `Português`, `English`) mapeados a `es-LATAM`, `es-ES`, `pt`, `en` (Decisión PO US-006 #3, derivada de PB-P1-005 acceptance summary). El cambio de idioma se aplica inmediatamente en la UI (FR-I18N-002, BR-I18N-003).

### Related Domain Concepts

* `User` propio (ownership policy — Doc 5 §9.1, NFR-SEC-003).
* `preferred_language` (impacta UI; en MVP esta US no propaga el cambio a llamadas IA, que ya leen el idioma del evento — BR-I18N-007).
* Política de contraseñas MVP (Doc 19 §11.2): mínimo 10 caracteres, al menos una letra y un número, no puede igualar el localpart del email.
* Invalidación de otras sesiones via estrategia consistente con Doc 19 §9.6 (rotación de cookie / lista de revocados in-memory).

### Assumptions

* El usuario sólo puede modificar su propio recurso a través de los endpoints `/api/v1/users/me*`. No existen rutas equivalentes que reciban un `userId` en MVP.
* El cambio de contraseña requiere la contraseña actual válida (Doc 19 §11.2).
* El frontend ya cuenta con la sesión HTTP-only emitida por US-003 y la utiliza para llamar los endpoints autenticados.
* La sesión actual del que ejecuta el cambio de password se mantiene; sólo se invalidan las "otras sesiones" (PB-P1-005).

### Dependencies

* US-003 — Login con email/contraseña (sesión activa requerida).
* US-094 — Implementación de los endpoints `/api/v1/users/me*` (PB-P0-007 / capa API auth).
* PB-P0-006 — `SessionCookieIssuer` y estrategia de invalidación de cookie.
* PB-P0-004 — REST API foundation y error envelope.
* EPIC-API-001 — DTOs y contratos de API.

---

## 🧾 PO/BA Decisions Applied

| Decision                                                                          | Source                                                                                          | Resolución aplicada en esta historia                                                                                                                                                                                          |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Email no editable por el usuario en MVP                                           | PB-P1-005 acceptance summary; Doc 8 UC-AUTH-005                                                 | El campo `email` es de sólo lectura. Cualquier intento de enviarlo en el PATCH es ignorado por whitelist (no genera error). No se introduce flujo de re-verificación en MVP.                                                  |
| Comportamiento de cambio de contraseña frente a sesiones                          | PB-P1-005 línea 120 (decisión PO US-006); Doc 19 §9.6                                            | El cambio de password **invalida las otras sesiones activas** del usuario y mantiene la sesión actual del navegador que ejecutó el cambio (sin re-login forzado). La estrategia técnica reutiliza Doc 19 §9.6 (rotación / revocación). |
| Selector de idioma con nombres nativos                                            | PB-P1-005 acceptance summary; PO decision US-007                                                 | El selector muestra `Español LATAM`, `Español`, `Português`, `English` mapeados a `es-LATAM`, `es-ES`, `pt`, `en`. El cambio se aplica inmediatamente en la UI (FR-I18N-002).                                                  |
| Endpoint canónico de cambio de password                                           | Doc 16 §23.2; Doc 19 §11.2/§12; US-094 §API contracts                                            | `POST /api/v1/users/me/change-password`, retorna `204 No Content` en éxito.                                                                                                                                                  |
| Endpoint dedicado para idioma                                                     | Doc 16 §23.2; US-094 §API contracts                                                              | `PATCH /api/v1/users/me/preferred-language` retorna `200` con el usuario actualizado, además del PATCH genérico `/api/v1/users/me` que también acepta `preferredLanguage`.                                                    |
| Política de contraseñas para `newPassword`                                        | Doc 19 §11.2                                                                                     | Mínimo 10 caracteres, al menos una letra y un número, no puede igualar el `localpart` del email. Sin historial ni expiración periódica en MVP.                                                                                |
| Rol nunca editable por el propio usuario                                          | BR-USER-001; Doc 5 §9.1                                                                          | `role` excluido de la whitelist. Intentos de modificarlo se ignoran (sin error).                                                                                                                                              |
| Datos derivados visibles                                                          | FR-USER-004                                                                                     | La pantalla muestra `createdAt` y `updatedAt` como información de auditoría mínima. No se exponen `password_hash`, `session_secret`, ni tokens.                                                                              |

---

## 🔗 Traceability

| Source                 | Reference                                                                                                       |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| FRD Requirement(s)     | FR-USER-001, FR-USER-002, FR-USER-003, FR-USER-004, FR-I18N-002                                                 |
| Use Case(s)            | UC-AUTH-005 (Ver y editar perfil propio), UC-AUTH-006 (Cambiar idioma preferido), UC-I18N-001                  |
| Business Rule(s)       | BR-USER-001, BR-USER-005, BR-USER-006, BR-I18N-001, BR-I18N-003, BR-PRIVACY-002, BR-PRIVACY-008                |
| Permission Rule(s)     | Ownership Policy: sólo el dueño edita su propio recurso (Doc 5 §9.1, §10 entries 4 y 5); BR-PRIVACY-003         |
| Data Entity / Entities | `User` (campos `name`, `phone`, `preferred_language`, `password_hash`, `updated_at`)                            |
| API Endpoint(s)        | `GET /api/v1/users/me`; `PATCH /api/v1/users/me`; `PATCH /api/v1/users/me/preferred-language`; `POST /api/v1/users/me/change-password` |
| NFR Reference(s)       | NFR-SEC-003 (ownership), NFR-SEC (hashing), NFR-Observabilidad                                                  |
| Related ADR(s)         | ADR-SEC-001 (Token/Injection), ADR-SEC-003 (argon2id)                                                           |
| Related Document(s)    | Doc 5 §9.1, §10; Doc 8 UC-AUTH-005/006, UC-I18N-001; Doc 9 FR-USER-001..004, FR-I18N-002; Doc 16 §23; Doc 19 §9.5, §9.6, §11.2 |

> **Documentation Alignment (no bloqueante):** Doc 16 §23 declara los paths como `/me`, `/me/preferred-language`, `/me/change-password`. El proyecto adopta `/api/v1/users/me*` siguiendo Epic Map, Doc 5 §10 y US-094. La US conserva `/api/v1/users/me*`; queda recomendado unificar Doc 16 o emitir ADR de endpoint canónico antes de generar el snapshot OpenAPI.

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* Cambio de email (Future con re-verificación obligatoria).
* Cambio de rol por el propio usuario (siempre out-of-scope para usuarios; gestionado por seed/admin).
* Eliminación de cuenta auto-servicio (Future).
* Avatar / foto del `User` (el avatar del `VendorProfile` se cubre en otras historias).
* Listado de sesiones activas y logout selectivo por dispositivo (Future).
* MFA / 2FA (Future).
* Re-login forzado tras cambio de password (descartado por PB-P1-005: la sesión actual se mantiene).
* Cambio de moneda preferida del usuario (BR-I18N-008: idioma y moneda son independientes y la moneda vive en el `Event`).

### Scope Notes

* No introduce multi-rol ni colaboradores (BR-USER-004 es Future).
* No introduce verificación legal ni captura de documentos (BR-USER-005, BR-PRIVACY-005..009).
* El cambio de idioma sólo afecta la UI; la propagación al motor IA usa el idioma del `Event`, no el del usuario (BR-I18N-004/007).

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Ver mi perfil

**Given** un usuario autenticado en `/[locale]/profile`
**When** la pantalla llama `GET /api/v1/users/me`
**Then** el backend responde `200 OK` con `{ id, email, name, phone, preferredLanguage, role, createdAt, updatedAt }` y la UI muestra todos los campos. `email` y `role` se renderizan como sólo lectura.

### AC-02: Editar mis datos básicos

**Given** un usuario autenticado en `/[locale]/profile`
**When** edita `name`, `phone` y/o `preferredLanguage` válidos y envía `PATCH /api/v1/users/me`
**Then** el backend valida los campos (whitelist + reglas de validación), actualiza el `User` propio, responde `200 OK` con el perfil actualizado, registra el evento `user.profile.updated` con `correlationId` y la UI refleja los cambios sin recargar la página.

### AC-03: Cambiar mi idioma preferido y aplicarlo inmediatamente

**Given** un usuario autenticado en `/[locale]/profile`
**When** selecciona un idioma del selector (`Español LATAM` / `Español` / `Português` / `English`) y confirma
**Then** el frontend invoca `PATCH /api/v1/users/me/preferred-language` con el código (`es-LATAM` | `es-ES` | `pt` | `en`), el backend responde `200 OK` con el perfil actualizado, la UI re-renderiza inmediatamente en el nuevo idioma (FR-I18N-002) y la siguiente navegación usa el nuevo locale.

### AC-04: Cambiar contraseña

**Given** un usuario autenticado en la sección Seguridad de `/[locale]/profile`
**When** ingresa su `currentPassword` correcta y una `newPassword` que cumple la política (Doc 19 §11.2)
**Then** el backend verifica la contraseña actual con `argon2.verify` en tiempo constante (ADR-SEC-003), actualiza `password_hash`, invalida las otras sesiones activas manteniendo la sesión actual, responde `204 No Content`, registra el evento `user.password.changed` con `correlationId` (sin exponer hashes ni passwords) y la UI muestra un toast "Contraseña actualizada".

---

## ⚠️ Edge Cases

### EC-01: Intento de cambiar email

**Given** el usuario manipula el DTO incluyendo `email`
**When** envía `PATCH /api/v1/users/me`
**Then** el backend ignora el campo (whitelist) y responde `200 OK` sin cambios al `email`. No se devuelve `INVALID_FIELD`.

#### Handling

* Whitelist estricta en `UpdateProfileRequestDto`: sólo `name`, `phone`, `preferredLanguage`.
* No se registra evento de error; el log de `user.profile.updated` omite el intento ignorado.

---

### EC-02: Contraseña actual incorrecta

**Given** un usuario autenticado intenta cambio de password
**When** envía `POST /api/v1/users/me/change-password` con `currentPassword` errónea
**Then** el backend responde `401 INVALID_CURRENT_PASSWORD` (alineado con Doc 16 §23.2 y Doc 19 §9.5), aplica rate limiting (Doc 19 §12: 5/usuario/h) y registra `user.password.change.failed` sin exponer la contraseña.

#### Handling

* Mensaje genérico en UI; sin distinguir si el usuario existe (no aplica aquí, ya que requiere sesión).
* Rate limit por usuario para mitigar brute force.
* Tras N intentos fallidos consecutivos, el rate limiter responde `429 TOO_MANY_REQUESTS` (Doc 16 §22.6, Doc 19 §12).

---

### EC-03: Intento de editar perfil ajeno

**Given** el usuario A autenticado
**When** intenta llamar `PATCH /api/v1/users/{idDeOtroUsuario}` (ruta inexistente en MVP) o manipula el cookie session para suplantar a otro usuario
**Then** la ruta no existe (404) y, si se llega a backend, el middleware de ownership devuelve `403 FORBIDDEN`. Se registra evento `auth.ownership.violation` con `correlationId` (NFR-SEC-003).

#### Handling

* En MVP no se exponen rutas con `userId` en path para edición de perfil; sólo `/users/me*`.
* Cualquier ruta especulativa se rechaza por router antes de llegar al controller.
* Política de logging: no revelar si el `userId` existe.

---

### EC-04: Nueva contraseña no cumple la política

**Given** un usuario autenticado intenta cambio de password
**When** envía `POST /api/v1/users/me/change-password` con `newPassword` que falla la política (menos de 10 caracteres, sin letra y número, o igual al localpart del email)
**Then** el backend responde `422 PASSWORD_POLICY_VIOLATION` con detalle del fallo, sin aplicar cambios y sin invalidar sesiones.

#### Handling

* Validación Zod en el DTO + verificación adicional contra el email del usuario autenticado.
* Mensajes localizados según el idioma preferido del usuario.

---

### EC-05: Idioma no soportado

**Given** un usuario autenticado
**When** envía `PATCH /api/v1/users/me/preferred-language` con un valor fuera del set `{ es-LATAM, es-ES, pt, en }`
**Then** el backend responde `422 UNSUPPORTED_LANGUAGE` sin aplicar cambios. La UI no permite seleccionar valores fuera del set (selector cerrado).

#### Handling

* Validación Zod con `enum`.
* Mensaje localizado.

---

## 🚫 Validation Rules

| ID    | Rule                                                                                                | Message / Behavior                                                                  |
| ----- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| VR-01 | `name` requerido, 2–120 caracteres tras `trim`                                                      | "El nombre es obligatorio (2–120 caracteres)"                                       |
| VR-02 | `phone` opcional; si se provee, formato E.164 (Doc 16 / VR alineada con `+CCNNNNNN…`)               | "Teléfono inválido (formato E.164)"                                                 |
| VR-03 | `preferredLanguage` ∈ `{ es-LATAM, es-ES, pt, en }`                                                   | "Idioma no soportado"                                                               |
| VR-04 | `newPassword` cumple política Doc 19 §11.2 (≥10 chars, al menos una letra y un número, no igual al localpart del email) | "La contraseña no cumple los requisitos (mínimo 10 caracteres, letras y números, no puede igualar tu correo)" |
| VR-05 | `currentPassword` requerida y debe coincidir con `password_hash` actual                              | Falta → `422 CURRENT_PASSWORD_REQUIRED`; incorrecta → `401 INVALID_CURRENT_PASSWORD` |
| VR-06 | `email` y `role` se ignoran si vienen en el PATCH (no devuelven error)                              | (silent ignore)                                                                     |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                                                                |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-01 | Todos los endpoints requieren sesión activa (cookie HTTP-only firmada).                                                                              |
| SEC-02 | Ownership policy: sólo `/users/me*` (Doc 5 §9.1, §10). No existen rutas con `userId` para edición de perfil en MVP.                                  |
| SEC-03 | Cambio de password verifica `currentPassword` con `argon2.verify` en tiempo constante (ADR-SEC-003) antes de aplicar el cambio.                       |
| SEC-04 | Logs nunca exponen `password`, `newPassword`, `password_hash`, tokens ni cookies (ADR-SEC-001, Doc 19 §11.3).                                         |
| SEC-05 | Whitelist estricta de campos editables en `UpdateProfileRequestDto` (`name`, `phone`, `preferredLanguage`). Cualquier otro campo se ignora.          |
| SEC-06 | Cambio de password invalida otras sesiones activas y mantiene la sesión actual (PB-P1-005). Estrategia técnica consistente con Doc 19 §9.6.          |
| SEC-07 | Rate limit en `POST /api/v1/users/me/change-password`: 5/usuario/h (Doc 19 §12). Excedido → `429 TOO_MANY_REQUESTS`.                                  |
| SEC-08 | Endpoint `GET /api/v1/users/me` nunca devuelve `password_hash` ni campos sensibles.                                                                  |

### Negative Authorization Scenarios

* Usuario anónimo → `401 AUTHENTICATION_REQUIRED`.
* Sesión expirada → `401 AUTHENTICATION_REQUIRED`; el frontend redirige al login.
* Intento de editar perfil ajeno por ruta especulativa → `404` (ruta no existe) o `403 FORBIDDEN` si llega a backend.
* Intento de cambiar `role` o `email` vía PATCH → ignorado por whitelist (sin error).
* Intento de leer el perfil de otro usuario por path inexistente → `404 NOT_FOUND`.

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

> Nota: el cambio de `preferred_language` del usuario **no** modifica el idioma usado por el `LLMProvider`, que toma el idioma del `Event` (BR-I18N-004/007).

---

## 🎨 UX / UI Notes

| Area                | Notes                                                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Screen / Route      | `/[locale]/profile`                                                                                                                                    |
| Main UI Pattern     | Dos secciones (tabs o acordeón): **Datos básicos** y **Seguridad** (cambio de contraseña).                                                              |
| Primary Action      | "Guardar cambios" en cada sección.                                                                                                                     |
| Secondary Actions   | "Cancelar", "Cambiar contraseña".                                                                                                                      |
| Selector de idioma  | Lista con nombres nativos: `Español LATAM`, `Español`, `Português`, `English`. Aplica inmediatamente al guardar (FR-I18N-002).                          |
| Empty State         | No aplica (siempre existen datos mínimos).                                                                                                              |
| Loading State       | Skeleton al cargar `GET /users/me`; spinner inline en cada `Guardar`.                                                                                  |
| Error State         | Mensajes inline por campo + banner para errores globales (`401`, `403`, `429`, `5xx`). Mensajes localizados según `preferredLanguage` actual.            |
| Success State       | Toast: "Perfil actualizado" para AC-02/AC-03; "Contraseña actualizada" para AC-04.                                                                      |
| Accessibility Notes | Labels asociados a inputs, `aria-invalid` en errores, focus management tras submit, anuncios accesibles (`role="status"`) para success/error.            |
| Responsive Notes    | Mobile-first; secciones colapsables en breakpoints pequeños.                                                                                            |
| i18n Notes          | 4 locales; copy completo en cada idioma; mensajes de error de password y validaciones traducidos.                                                       |
| Currency Notes      | No aplica.                                                                                                                                              |

---

## 🛠 Technical Notes

### Frontend

* Route / Page:

  * `/[locale]/profile` (Next.js App Router, locale dinámico).
* Components:

  * `ProfileForm` (datos básicos), `ChangePasswordForm`, `LanguageSelector`.
* State Management:

  * TanStack Query hooks: `useMe`, `useUpdateProfile`, `useUpdatePreferredLanguage`, `useChangePassword`.
* Forms:

  * React Hook Form + Zod.
* API Client:

  * `usersApi.me`, `usersApi.update`, `usersApi.updatePreferredLanguage`, `usersApi.changePassword`.
* Locale propagation:

  * Al cambiar idioma, navegar al mismo path con el nuevo segmento `[locale]` o invalidar el provider de i18n para aplicar inmediatamente.

### Backend

* Use Case / Service:

  * `GetMyProfileUseCase`, `UpdateOwnProfileUseCase`, `UpdatePreferredLanguageUseCase`, `ChangePasswordUseCase`.
* Controller / Route:

  * `GET/PATCH /api/v1/users/me`
  * `PATCH /api/v1/users/me/preferred-language`
  * `POST /api/v1/users/me/change-password`
* Authorization Policy:

  * `authMiddleware` (PB-P0-007) + Ownership Policy implícita (sólo `me`).
* Validation:

  * `UpdateProfileRequestDto`, `UpdatePreferredLanguageRequestDto`, `ChangePasswordRequestDto` (Zod).
* Transaction Required:

  * Sí para `ChangePasswordUseCase` (actualizar hash + invalidar otras sesiones de forma atómica).
* Reutilización:

  * `SessionCookieIssuer.invalidate*` de PB-P0-006 para la invalidación de otras sesiones.
  * `argon2` wrapper de PB-P0-007 para `hash`/`verify`.

### Database

* Main Tables:

  * `users` (campos: `id`, `email`, `name`, `phone`, `preferred_language`, `role`, `password_hash`, `created_at`, `updated_at`).
* Constraints:

  * `email` único e inmutable post-creación (BR-USER-002).
  * `preferred_language` con check constraint sobre el set MVP.
* Index Considerations:

  * PK por `id` (existente). Sin índices adicionales requeridos por esta historia.

### API

| Method | Endpoint                                       | Purpose                                            | Success | Errores principales       |
| ------ | ---------------------------------------------- | -------------------------------------------------- | ------- | ------------------------- |
| GET    | `/api/v1/users/me`                             | Obtener perfil propio                              | `200`   | `401`                     |
| PATCH  | `/api/v1/users/me`                             | Actualizar `name`, `phone`, `preferredLanguage`    | `200`   | `401`, `422`              |
| PATCH  | `/api/v1/users/me/preferred-language`          | Actualizar idioma preferido (atajo dedicado)       | `200`   | `401`, `422`              |
| POST   | `/api/v1/users/me/change-password`             | Cambiar contraseña (invalida otras sesiones)       | `204`   | `401`, `422`, `429`       |

### Observability / Audit

* Correlation ID Required: Yes (todas las llamadas).
* Log Event Required: Yes
  * `user.profile.viewed` (info / debug).
  * `user.profile.updated` (campos modificados, sin valores sensibles).
  * `user.preferred-language.updated` (idioma anterior/nuevo).
  * `user.password.changed` (sin hash ni password).
  * `user.password.change.failed` (motivo: `INVALID_CURRENT_PASSWORD` | `PASSWORD_POLICY_VIOLATION` | `RATE_LIMITED`).
  * `auth.ownership.violation` (si aplica EC-03).
* AdminAction Required: No.
* AIRecommendation Required: No.

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                       | Type        |
| ----- | -------------------------------------------------------------- | ----------- |
| TS-01 | Lectura de perfil propio retorna campos correctos              | API         |
| TS-02 | Actualización parcial de `name`                                | Integration |
| TS-03 | Actualización parcial de `phone` con E.164 válido              | Integration |
| TS-04 | Actualización de `preferredLanguage` vía PATCH genérico        | Integration |
| TS-05 | Actualización de `preferredLanguage` vía endpoint dedicado      | Integration |
| TS-06 | Cambio de contraseña exitoso (mantiene sesión actual)          | Integration |
| TS-07 | Cambio de contraseña invalida las otras sesiones activas        | Integration |
| TS-08 | E2E pantalla perfil (ver, editar, cambiar idioma, cambiar pwd)  | E2E         |

### Negative Tests

| ID    | Scenario                                                  | Expected Result                       |
| ----- | --------------------------------------------------------- | ------------------------------------- |
| NT-01 | Editar perfil ajeno por ruta especulativa                 | `404` o `403 FORBIDDEN`               |
| NT-02 | Intento de cambiar `email` o `role` vía PATCH             | Ignorado (200 sin cambios)            |
| NT-03 | `currentPassword` incorrecta                              | `401 INVALID_CURRENT_PASSWORD`        |
| NT-04 | `currentPassword` faltante                                | `422 CURRENT_PASSWORD_REQUIRED`       |
| NT-05 | Idioma fuera de set                                       | `422 UNSUPPORTED_LANGUAGE`            |
| NT-06 | `newPassword` < 10 chars                                  | `422 PASSWORD_POLICY_VIOLATION`       |
| NT-07 | `newPassword` igual al localpart del email                | `422 PASSWORD_POLICY_VIOLATION`       |
| NT-08 | `phone` con formato inválido                              | `422` con detalle de campo            |
| NT-09 | Exceder 5 intentos/h de cambio de password                | `429 TOO_MANY_REQUESTS`               |
| NT-10 | Llamada sin sesión                                        | `401 AUTHENTICATION_REQUIRED`         |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario                                                  | Expected Result                     |
| ---------- | --------------------------------------------------------- | ----------------------------------- |
| AUTH-TS-01 | Sesión activa edita su perfil                             | `200`                               |
| AUTH-TS-02 | Sin sesión                                                | `401 AUTHENTICATION_REQUIRED`       |
| AUTH-TS-03 | Acceso a recurso de otro usuario (ruta especulativa)      | `404` / `403 FORBIDDEN`             |
| AUTH-TS-04 | Sesión expirada                                           | `401 AUTHENTICATION_REQUIRED`       |
| AUTH-TS-05 | Después de cambio de password: otras sesiones quedan `401` | `401` en otra cookie de la misma cuenta |

### Accessibility Tests

* Etiquetas claras asociadas a cada input (`for`/`id`).
* `aria-invalid` y descripciones de error vinculadas (`aria-describedby`).
* Anuncios accesibles para éxito/error (`role="status"`, `aria-live="polite"`).
* Foco visible y navegación por teclado completa.

---

## 📊 Business Impact

| Field               | Value                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------- |
| KPI Affected        | Retención, calidad de datos del usuario, satisfacción i18n, seguridad de cuenta        |
| Expected Impact     | Datos actualizados habilitan mejor experiencia; cambio de idioma mejora i18n efectiva  |
| Success Criteria    | Tasa de errores `5xx` en `users/me*` < 0.5%; tasa de éxito de cambio de password > 95% |
| Academic Demo Value | Muestra control del usuario sobre sus datos, ownership policy y política de password  |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Pantalla `/[locale]/profile` con tabs Datos básicos / Seguridad.
* `ProfileForm` con RHF + Zod.
* `ChangePasswordForm` con validaciones de política.
* `LanguageSelector` con nombres nativos.
* TanStack Query hooks: `useMe`, `useUpdateProfile`, `useUpdatePreferredLanguage`, `useChangePassword`.
* Locale switcher que aplica inmediatamente sin recarga.

### Potential Backend Tasks

* `GetMyProfileUseCase`, `UpdateOwnProfileUseCase`, `UpdatePreferredLanguageUseCase`, `ChangePasswordUseCase`.
* Controladores y rutas bajo `/api/v1/users/me*`.
* Whitelist Zod en `UpdateProfileRequestDto`.
* Verificación de `currentPassword` con `argon2.verify`.
* Invalidación de otras sesiones reutilizando PB-P0-006.
* Rate limit por usuario en `change-password`.

### Potential Database Tasks

* No requiere migraciones nuevas (campos ya existen en `users`).
* Verificar check constraint o validación de `preferred_language` en MVP.

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* Tests positivos y negativos por endpoint.
* Test de invalidación de otras sesiones (TS-07).
* Test E2E completo de la pantalla.
* Tests de autorización (AUTH-TS-*).
* Tests de accesibilidad básica.

### Potential DevOps / Config Tasks

* Configurar rate limit policy en gateway/middleware (5/usuario/h en `change-password`).
* Configurar logger redacting para asegurar que `password`, `newPassword` y `currentPassword` nunca lleguen al log.

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
* [ ] PO/BA validó (pendiente Approval Gate).

---

## 🏁 Definition of Done

* [ ] Endpoints `GET/PATCH /api/v1/users/me`, `PATCH /api/v1/users/me/preferred-language` y `POST /api/v1/users/me/change-password` implementados conforme a contratos.
* [ ] Frontend `/[locale]/profile` integrado y consumiendo TanStack Query hooks.
* [ ] Cambio de idioma aplica inmediatamente sin recarga completa.
* [ ] Cambio de password invalida otras sesiones y mantiene la sesión actual.
* [ ] Validación de política de contraseña (Doc 19 §11.2) operativa.
* [ ] Rate limit `change-password` operativo y devuelve `429` cuando aplica.
* [ ] Tests `TS-01..08`, `NT-01..10`, `AUTH-TS-01..05` verdes.
* [ ] Logs estructurados con redacción de secretos verificada.
* [ ] PO valida en la pantalla con demo cubriendo AC-01..AC-04.

---

## 📝 Notes

* Decisión técnica abierta (no bloqueante PO): elegir entre `libphonenumber-js` o validación E.164 con expresión regular en VR-02. Resolución a tomar por Tech Lead en la generación del Technical Spec; en MVP basta con validación E.164 funcional.
* La estrategia concreta de invalidación de "otras sesiones" depende del mecanismo final adoptado por el `authMiddleware` (Doc 19 §9.6 deja la decisión final al backend en sprint de auth). Esta US asume reutilización de PB-P0-006 / patrón de US-005.
* `Documentation Alignment Required`: Doc 16 §23 usa `/me`; esta US y Epic Map usan `/api/v1/users/me*`. No bloquea; pendiente unificar Doc 16 o emitir ADR antes del snapshot OpenAPI.
