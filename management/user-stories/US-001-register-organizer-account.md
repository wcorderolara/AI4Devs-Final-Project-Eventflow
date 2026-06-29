# 🧾 User Story: Registrarme como organizador con captcha

## 🆔 Metadata

| Field              | Value                                |
| ------------------ | ------------------------------------ |
| ID                 | US-001                               |
| Epic               | EPIC-AUTH-001 — Authentication & User Access |
| Feature            | Registro de usuario con rol Organizador |
| Module / Domain    | Auth                                 |
| User Role          | Anonymous → Organizer                |
| Priority           | Must Have                            |
| Status             | Approved                             |
| Owner              | Product Owner / Business Analyst     |
| Approved By        | PO/BA Review                         |
| Approval Date      | 2026-06-24                           |
| Ready for Development Tasks | Yes                          |
| Sprint / Milestone | MVP                                  |
| Backlog Item       | PB-P1-001                            |
| Created Date       | 2026-06-09                           |
| Last Updated       | 2026-06-24                           |

---

## 🎯 User Story

**As a** persona que necesita organizar un evento (boda, XV años, baby shower, cumpleaños, bautizo o corporativo)
**I want** crear una cuenta en EventFlow con mi correo, contraseña y rol de Organizador, validando captcha
**So that** pueda acceder al workspace de planificación asistido por IA y comenzar a gestionar mi evento

---

## 🧠 Business Context

### Context Summary

El registro como organizador es la puerta de entrada principal al MVP de EventFlow. Sin este flujo no existen organizadores que puedan crear eventos, generar planes IA, solicitar cotizaciones ni dejar reseñas. Debe ser un registro simple (email + password + rol único) protegido por captcha para evitar bots y respetar la decisión del PO 8.1 #8 que exige anti-bot obligatorio. El rol asignado es inmutable porque MVP es single-role por usuario.

### Related Domain Concepts

* User (rol = organizer).
* Captcha / anti-bot.
* RBAC y aislamiento por rol.
* Cookie HTTP-only firmada para sesión persistente.

### Assumptions

* El captcha (reCAPTCHA v3 o hCaptcha) está disponible en backend y frontend mediante el módulo SEC.
* El proveedor de email (real o simulado) está configurado para futuras notificaciones.
* El idioma preferido por defecto del usuario se infiere del navegador y se almacena en `User.preferred_language`.

### Dependencies

* EPIC-BE-001 (backend foundation con middlewares).
* EPIC-DB-001 (tabla `User` con constraints únicos de email).
* EPIC-SEC-001 (captcha, cookies HTTP-only, rate limiting).
* EPIC-API-001 (endpoint REST con error envelope estándar).

---

## 🔗 Traceability

| Source                 | Reference                                           |
| ---------------------- | --------------------------------------------------- |
| FRD Requirement(s)     | FR-AUTH-001, FR-AUTH-002, FR-AUTH-003, FR-USER-001  |
| Use Case(s)            | UC-AUTH-001                                         |
| Business Rule(s)       | BR-AUTH-001, BR-AUTH-002, BR-AUTH-003, BR-USER-001  |
| Permission Rule(s)     | Anonymous: puede registrarse; tras registro se asigna rol Organizer |
| Data Entity / Entities | User, Role                                          |
| API Endpoint(s)        | POST /api/v1/auth/register                          |
| NFR Reference(s)       | NFR-SEC-001, NFR-SEC-002, NFR-PERF-API-001          |
| Related ADR(s)         | ADR-SEC-001, ADR-ARCH-001                           |
| Related Document(s)    | /docs/5-User-Roles-Permissions-Matrix.md, /docs/16-API-Design-Specification.md (§/auth/register), /docs/19-Security-and-Authorization-Design.md (§11), /docs/8.1-Product-Owner-Decisions-Use-Cases-Addendum.md (#8), /management/artifacts/4-Product-Backlog-Prioritized.md (PB-P1-001) |

---

## 🧾 PO/BA Decisions Applied

| Decision                                             | Source                                                                          | Resolución aplicada en esta historia                                                                                   |
| ---------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Captcha / anti-bot obligatorio en registro y login   | PO 8.1 #8; BR-AUTH-011; FR-AUTH-002                                             | Captcha verificado server-side antes de cualquier persistencia; bloqueo del registro si la verificación falla.         |
| Sólo `organizer` y `vendor` se crean por registro    | BR-AUTH-002; Doc 19 §10                                                          | Backend fuerza `role=organizer` en este endpoint; el rol `admin` se aprovisiona por seed o por admin existente.        |
| Hashing argon2id como predeterminado MVP             | Doc 19 §11.1; SEC-POL-AUTH-007; ADR-SEC-003                                      | Hash con `argon2id` (params mínimos: memoryCost=19MiB, timeCost=2, parallelism=1). `bcrypt(12)` queda como fallback.   |
| Política de contraseñas MVP                          | Doc 19 §11.2                                                                     | Mínimo 10 caracteres, al menos una letra y un número, distinta del localpart del email. Validada en frontend y backend. |
| Cookie de sesión HTTP-only firmada                   | Doc 19 §10; ADR-SEC-001                                                          | Cookie `HttpOnly`, `Secure`, `SameSite=Lax`, firmada con secreto provisto por Secrets Manager.                          |
| Rate limiting `/auth/register`                       | Doc 19 §10; Doc 16 §Rate Limits                                                  | Máx. 5 registros / IP / 10 minutos. Excedente responde `429 RATE_LIMIT_EXCEEDED`.                                       |
| Email único y conflicto en registro                  | BR-USER-002; Doc 16 §endpoints (`/auth/register`)                                 | Respuesta `409 EMAIL_TAKEN`. Mensaje al usuario neutro y consistente para evitar feedback explotable de enumeración.    |
| Sin doble opt-in obligatorio en MVP                  | Doc 3 §MVP Scope; Notes de esta historia                                         | No se exige confirmación de email como bloqueante de login en MVP; podrá aplicarse soft warning en historia separada.   |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* OAuth con múltiples proveedores obligatorio (US-008 cubre Google como Could Have).
* MFA / SSO empresarial.
* KYC o verificación documental.
* Multi-rol simultáneo por usuario.

### Scope Notes

* Esta historia no introduce verificación de identidad legal.
* No introduce confirmación de email obligatoria como bloqueante de login en MVP (puede aplicarse soft warning).
* No introduce captura de datos sensibles ni pasarela de pago.
* No expone existencia de cuentas a través de mensajes diferenciales.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Registro exitoso como organizador con captcha válido

**Given** un usuario anónimo accede a `/auth/register?role=organizer`
**When** ingresa nombre completo, email único, contraseña conforme a la política MVP (mínimo 10 caracteres, al menos una letra y un número, distinta del localpart del email), acepta términos y resuelve el captcha
**Then** el sistema crea un `User` con `role=organizer`, hashea la contraseña con `argon2id` (parámetros mínimos: memoryCost=19MiB, timeCost=2, parallelism=1), inicia sesión vía cookie HTTP-only firmada y redirige al dashboard del organizador con respuesta `201 Created`.

### AC-02: Persistencia del idioma preferido

**Given** el usuario completa el registro con el navegador en `es-LATAM`
**When** el registro es exitoso
**Then** el `User.preferred_language` se persiste como `es-LATAM` y la UI continúa en español neutro.

### AC-03: Email único garantizado

**Given** ya existe un `User` con un email (comparación case-insensitive según BR-USER-002)
**When** otra persona intenta registrarse con el mismo email
**Then** el backend responde `409 EMAIL_TAKEN` siguiendo el envelope de error estándar (Doc 16) y el frontend muestra un mensaje neutro ("No fue posible completar el registro") sin exponer datos diferenciales del usuario existente.

---

## ⚠️ Edge Cases

### EC-01: Captcha inválido o expirado

**Given** el usuario completa el formulario
**When** el captcha falla la verificación en backend (token ausente, inválido o expirado)
**Then** el sistema rechaza el registro con `400 VALIDATION_ERROR` y `details[].field = "captchaToken"`, indicando "Verificación de seguridad fallida", y solicita reintentar.

#### Handling

* No se crea el `User`.
* El frontend reinicia el widget de captcha.
* Se registra evento de auditoría `auth.register.failure` con `correlationId` y razón (`captcha_failed`), sin loguear el token.

---

### EC-02: Contraseña débil

**Given** el usuario ingresa una contraseña que no cumple la política MVP (mínimo 10 caracteres, al menos una letra y un número, distinta del localpart del email)
**When** envía el formulario
**Then** el sistema responde con `400 VALIDATION_ERROR` detallando el o los requisitos no cumplidos en `details[]`.

#### Handling

* Mensaje claro en frontend.
* Backend valida nuevamente (no confiar solo en frontend).

---

### EC-03: Email mal formado

**Given** el usuario ingresa un email inválido
**When** envía el formulario
**Then** la validación Zod responde con error de formato sin tocar la base de datos.

#### Handling

* Mensaje específico a nivel de campo.

---

## 🚫 Validation Rules

| ID    | Rule                                              | Message / Behavior                                   |
| ----- | ------------------------------------------------- | ---------------------------------------------------- |
| VR-01 | Email obligatorio, formato RFC válido, único      | "Correo inválido" / "No fue posible completar el registro" |
| VR-02 | Contraseña: mínimo 10 caracteres, al menos una letra y un número, distinta del localpart del email (Doc 19 §11.2) | "La contraseña no cumple con los requisitos" |
| VR-03 | Nombre completo obligatorio, 2-120 caracteres     | "El nombre es obligatorio"                           |
| VR-04 | Aceptación obligatoria de términos y privacidad   | "Debes aceptar los términos y la política de privacidad" |
| VR-05 | Captcha obligatorio (token válido)                | "Verificación de seguridad fallida"                  |
| VR-06 | Rol asignado debe ser `organizer` en este endpoint | Backend ignora cualquier intento de elevar a `admin` |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                            |
| ------ | ----------------------------------------------------------------------------------------------- |
| SEC-01 | Endpoint accesible solo a usuarios anónimos (no autenticados); usuarios autenticados son redirigidos. |
| SEC-02 | El rol `admin` jamás puede crearse vía registro público; se aprovisiona por seed o por admin existente. |
| SEC-03 | Captcha verificado server-side antes de cualquier persistencia (Decisión PO 8.1 #8).            |
| SEC-04 | Rate limiting `/auth/register`: máx 5 registros / IP / 10 min (Doc 19 §10); excedente responde `429 RATE_LIMIT_EXCEEDED`. |
| SEC-05 | Contraseña hasheada con argon2id (parámetros conformes a OWASP); nunca se loguea ni se devuelve. |
| SEC-06 | Cookie de sesión `HttpOnly`, `Secure`, `SameSite=Lax`, firmada.                                 |
| SEC-07 | Logs redactan email y nunca incluyen contraseña ni token de captcha.                            |

### Negative Authorization Scenarios

* Usuario ya autenticado que invoca el endpoint → 409 / redirección.
* Intento de registrar `role=admin` → backend fuerza `organizer`.
* Bot sin captcha → 400 `VALIDATION_ERROR` con `details[].field = "captchaToken"`.
* Exceso de intentos desde misma IP → 429 `RATE_LIMIT_EXCEEDED` (5 registros / IP / 10 min según Doc 19 §10).

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

| Area                | Notes                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Screen / Route      | `/[locale]/auth/register?role=organizer`                                   |
| Main UI Pattern     | Form con secciones (datos personales / credenciales / términos / captcha)  |
| Primary Action      | Botón "Crear mi cuenta"                                                    |
| Secondary Actions   | "Ya tengo cuenta → Iniciar sesión", "Registrarme como proveedor"           |
| Empty State         | No aplica (formulario)                                                     |
| Loading State       | Botón spinner + bloqueo de inputs durante request                          |
| Error State         | Banner superior + mensajes a nivel de campo                                |
| Success State       | Redirección al dashboard + toast "Cuenta creada con éxito"                 |
| Accessibility Notes | Labels asociados, aria-describedby para errores, focus inicial en nombre   |
| Responsive Notes    | Mobile-first, formulario 1 columna; desktop 2 columnas para nombre/email   |
| i18n Notes          | Soporte es-LATAM, es-ES, pt, en vía next-intl                              |
| Currency Notes      | No aplica                                                                  |

---

## 🛠 Technical Notes

### Frontend

* Route / Page:

  * `/[locale]/auth/register`
* Components:

  * `RegisterOrganizerForm`
  * `CaptchaWidget`
  * `PasswordStrengthIndicator`
* State Management:

  * React Hook Form + Zod schema
  * TanStack Query mutation `useRegisterOrganizer`
* Forms:

  * Validación con Zod alineada al DTO del backend
* API Client:

  * `authApi.registerOrganizer(payload)`

### Backend

* Use Case / Service:

  * `RegisterOrganizerUseCase`
* Controller / Route:

  * `POST /api/v1/auth/register` (auth controller)
* Authorization Policy:

  * Sin auth previa; bloqueo de sesión activa
* Validation:

  * DTO Zod `RegisterOrganizerDTO`
* Transaction Required:

  * Sí (crear `User` + asignar `Role`); rollback si captcha falla post-validación

### Database

* Main Tables:

  * `users`
  * `roles` (lookup)
* Constraints:

  * `users.email` UNIQUE
  * `users.role` CHECK in (`organizer`,`vendor`,`admin`)
* Index Considerations:

  * Índice único sobre `email`

### API

| Method | Endpoint                          | Purpose                                  |
| ------ | --------------------------------- | ---------------------------------------- |
| POST   | `/api/v1/auth/register`           | Crear cuenta organizador con captcha     |

### Observability / Audit

* Correlation ID Required: Yes
* Log Event Required: Yes (`auth.register.success` / `auth.register.failure`)
* AdminAction Required: No
* AIRecommendation Required: No

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                          | Type        |
| ----- | ----------------------------------------------------------------- | ----------- |
| TS-01 | Registro exitoso con captcha y datos válidos                      | Integration |
| TS-02 | Idioma preferido inferido del header `Accept-Language`            | Integration |
| TS-03 | Cookie de sesión emitida con flags HttpOnly/Secure/SameSite       | API         |
| TS-04 | Flujo end-to-end de registro y aterrizaje en dashboard            | E2E         |

### Negative Tests

| ID    | Scenario                              | Expected Result                            |
| ----- | ------------------------------------- | ------------------------------------------ |
| NT-01 | Email duplicado                       | 409 `EMAIL_TAKEN`; UI muestra mensaje neutro |
| NT-02 | Captcha inválido / expirado           | 400 `VALIDATION_ERROR` (field `captchaToken`) |
| NT-03 | Contraseña débil                      | 400 `VALIDATION_ERROR`                     |
| NT-04 | Intento de registrar `role=admin`     | Backend fuerza `organizer`; nunca admin    |
| NT-05 | Rate limit excedido                   | 429 `RATE_LIMIT_EXCEEDED`                  |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario                                              | Expected Result          |
| ---------- | ----------------------------------------------------- | ------------------------ |
| AUTH-TS-01 | Usuario anónimo invoca el endpoint                    | 201 Created              |
| AUTH-TS-02 | Usuario autenticado invoca el endpoint                | 409 / redirección        |

### Accessibility Tests

* Navegación completa por teclado (Tab/Shift+Tab/Enter).
* Focus visible en cada campo.
* Errores anunciados por screen reader (aria-live).
* Contraste mínimo AA en mensajes de error.

---

## 📊 Business Impact

| Field               | Value                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| KPI Affected        | Activation Rate, Conversión Anonymous → Organizer                     |
| Expected Impact     | Permite captar organizadores y desbloquear todo el flujo MVP          |
| Success Criteria    | ≥ 95% de registros válidos completan sin fricción demostrable          |
| Academic Demo Value | Punto de entrada del demo guiado del rol Organizador                  |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Crear página `register/organizer` con formulario y captcha.
* Implementar Zod schema y `useRegisterOrganizer` con TanStack Query.
* Conectar manejo de errores y estados de loading.
* Integrar i18n y feedback de éxito.

### Potential Backend Tasks

* Implementar `RegisterOrganizerUseCase` y endpoint REST.
* Integrar `CaptchaService` (reCAPTCHA v3 / hCaptcha).
* Configurar argon2id y rate limiting.
* Emitir cookie de sesión HTTP-only firmada.

### Potential Database Tasks

* Migración con tabla `users` y constraint único de email.
* Índice por email.

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* Suite de tests positivos/negativos del endpoint.
* Tests E2E del flujo de registro.
* Tests de rate limiting con clock injectable.

### Potential DevOps / Config Tasks

* Configurar variables de entorno para captcha y session secret.
* Logging estructurado para eventos de auth.

---

## ✅ Definition of Ready

* [x] Rol claramente identificado (Anonymous → Organizer).
* [x] Goal y valor de negocio claros.
* [x] FRD/UC/BR enlazados.
* [x] Permisos y ownership identificados.
* [x] Entidades listadas (User, Role).
* [x] AC en formato Given/When/Then.
* [x] Edge cases documentados.
* [x] Reglas de validación claras.
* [x] Out of Scope explícito.
* [x] Dependencias conocidas.
* [x] Estados UX identificados.
* [x] Expectativas de API definidas.
* [x] Escenarios de test definidos.
* [x] Decisiones PO/BA aplicadas y trazadas (ver sección PO/BA Decisions Applied).
* [ ] PO/BA aprobó la story (pendiente del Approval Gate).

---

## 🏁 Definition of Done

* [ ] Endpoint `POST /api/v1/auth/register` implementado y desplegado.
* [ ] Captcha verificado server-side.
* [ ] Hashing argon2id aplicado y secret en Secrets Manager.
* [ ] Cookies HTTP-only firmadas configuradas.
* [ ] Frontend integrado con next-intl en 4 locales.
* [ ] Validaciones Zod consistentes frontend/backend.
* [ ] Tests unitarios, integración y E2E verdes en CI.
* [ ] Logs estructurados con `correlationId`.
* [ ] Rate limiting configurado.
* [ ] PO valida el flujo end-to-end.

---

## 📝 Notes

* Verificar que el captcha de prueba/clave de test esté disponible en entornos CI y Demo (decisión documentada en EPIC-DEMO-001).
* MVP no exige doble opt-in vía email; eventual soft warning se cubrirá en historia separada (no bloquea login).
* El endpoint debe ser idéntico estructuralmente al de US-002 (vendor) salvo por el `role`.
* Documentation alignment menor (no bloqueante): la versión previa de la US referenciaba `CAPTCHA_INVALID` y `RATE_LIMITED`; se realineó al catálogo estándar de Doc 16 (`VALIDATION_ERROR`, `RATE_LIMIT_EXCEEDED`). Si en el futuro se desea un código dedicado para captcha, deberá agregarse formalmente al catálogo de errores.
