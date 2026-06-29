# 🧾 User Story: Registrarme como proveedor con captcha

## 🆔 Metadata

| Field              | Value                                |
| ------------------ | ------------------------------------ |
| ID                 | US-002                               |
| Epic               | EPIC-AUTH-001 — Authentication & User Access |
| Feature            | Registro de usuario con rol Proveedor |
| Module / Domain    | Auth                                 |
| User Role          | Anonymous → Vendor                   |
| Priority           | Must Have                            |
| Status             | Approved                             |
| Owner              | Product Owner / Business Analyst     |
| Approved By        | PO/BA Review                         |
| Approval Date      | 2026-06-24                           |
| Ready for Development Tasks | Yes                          |
| Sprint / Milestone | MVP                                  |
| Backlog Item       | PB-P1-002                            |
| Created Date       | 2026-06-09                           |
| Last Updated       | 2026-06-24                           |

---

## 🎯 User Story

**As a** profesional de servicios para eventos (catering, fotografía, decoración, música, mobiliario, etc.)
**I want** crear una cuenta en EventFlow con mi correo, contraseña y rol de Proveedor, validando captcha
**So that** pueda configurar mi perfil, ser aprobado por el admin y comenzar a recibir solicitudes de cotización

---

## 🧠 Business Context

### Context Summary

El registro como proveedor inicia el ciclo de vida del lado de la oferta del MVP. Tras el registro, el proveedor debe completar su `VendorProfile` (US-040) para que el administrador lo apruebe (US-074). Sin proveedores registrados y aprobados, el organizador no podrá enviar cotizaciones y el camino crítico del demo se rompe. El registro está protegido por captcha (Decisión PO 8.1 #8) y el rol es inmutable porque el MVP es single-role.

### Related Domain Concepts

* User (rol = vendor).
* VendorProfile en estado `pending` post-registro.
* Captcha / anti-bot.

### Assumptions

* El proveedor completará su perfil en una historia separada (US-040). Esta historia NO crea una fila en `vendor_profiles`; sólo crea el `User` con `role=vendor`.
* Cuando el `VendorProfile` se cree en US-040, su `status` inicial será `pending` hasta aprobación admin (US-074).
* No requiere documentación legal en MVP (no KYC).

### Dependencies

* EPIC-BE-001, EPIC-DB-001, EPIC-SEC-001, EPIC-API-001.
* EPIC-VND-001 para la creación posterior del perfil.

---

## 🔗 Traceability

| Source                 | Reference                                           |
| ---------------------- | --------------------------------------------------- |
| FRD Requirement(s)     | FR-AUTH-001, FR-AUTH-002, FR-USER-001               |
| Use Case(s)            | UC-AUTH-002                                         |
| Business Rule(s)       | BR-AUTH-001..003, BR-USER-001, BR-VENDOR-001         |
| Permission Rule(s)     | Anonymous puede registrarse; rol Vendor tras registro |
| Data Entity / Entities | User, Role, VendorProfile (pending)                 |
| API Endpoint(s)        | POST /api/v1/auth/register                          |
| NFR Reference(s)       | NFR-SEC-001, NFR-SEC-002                            |
| Related ADR(s)         | ADR-SEC-001, ADR-ARCH-001                           |
| Related Document(s)    | /docs/5-User-Roles-Permissions-Matrix.md, /docs/16-API-Design-Specification.md (§/auth/register), /docs/19-Security-and-Authorization-Design.md (§11), /docs/8.1-Product-Owner-Decisions-Use-Cases-Addendum.md (#8), /docs/6-Domain-Data-Model.md, /management/artifacts/4-Product-Backlog-Prioritized.md (PB-P1-002) |

---

## 🧾 PO/BA Decisions Applied

| Decision                                             | Source                                                                          | Resolución aplicada en esta historia                                                                                   |
| ---------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Captcha / anti-bot obligatorio en registro y login   | PO 8.1 #8; BR-AUTH-011; FR-AUTH-002                                             | Captcha verificado server-side antes de cualquier persistencia; bloqueo del registro si la verificación falla.         |
| Sólo `organizer` y `vendor` se crean por registro    | BR-AUTH-002; Doc 19 §10                                                          | Backend fuerza `role=vendor` en este endpoint; el rol `admin` se aprovisiona por seed o por admin existente.           |
| Hashing argon2id como predeterminado MVP             | Doc 19 §11.1; SEC-POL-AUTH-007; ADR-SEC-003                                      | Hash con `argon2id` (params mínimos: memoryCost=19MiB, timeCost=2, parallelism=1). `bcrypt(12)` queda como fallback.   |
| Política de contraseñas MVP                          | Doc 19 §11.2                                                                     | Mínimo 10 caracteres, al menos una letra y un número, distinta del localpart del email. Validada en frontend y backend. |
| Cookie de sesión HTTP-only firmada                   | Doc 19 §10; ADR-SEC-001                                                          | Cookie `HttpOnly`, `Secure`, `SameSite=Lax`, firmada con secreto provisto por Secrets Manager.                          |
| Rate limiting `/auth/register`                       | Doc 19 §10; Doc 16 §Rate Limits                                                  | Máx. 5 registros / IP / 10 minutos (compartido con US-001). Excedente responde `429 RATE_LIMIT_EXCEEDED`.               |
| Email único y conflicto en registro                  | BR-USER-002; Doc 16 §endpoints (`/auth/register`)                                 | Respuesta `409 EMAIL_TAKEN`. Mensaje al usuario neutro: no revela si el email existe como `organizer` o `vendor`.       |
| Sin doble opt-in obligatorio en MVP                  | Doc 3 §MVP Scope                                                                 | No se exige confirmación de email como bloqueante de login en MVP.                                                       |
| VendorProfile no se crea en este endpoint            | Doc 18 §15.1; US-040; US-074                                                     | El endpoint crea sólo el `User`; el `VendorProfile` se construye en US-040 con `status=pending` y se aprueba en US-074. |
| Single-role MVP                                      | Doc 3 §MVP Scope; BR-AUTH-002                                                    | Un email no puede pertenecer simultáneamente a un `organizer` y a un `vendor`; conflicto resuelto con `409 EMAIL_TAKEN`. |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* KYC, verificación documental o validación legal.
* Verificación de identidad por video.
* Suscripción comercial o cobro al proveedor.
* Multi-rol simultáneo por usuario.

### Scope Notes

* No introduce captura de documentos legales.
* No introduce verificación bancaria.
* No introduce cobros ni boost premium.
* El proveedor no puede operar (recibir QuoteRequests) hasta tener `VendorProfile.approved`.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Registro exitoso como proveedor

**Given** un usuario anónimo accede a `/auth/register?role=vendor`
**When** ingresa nombre comercial, email único, contraseña conforme a la política MVP (mínimo 10 caracteres, al menos una letra y un número, distinta del localpart del email), acepta términos y resuelve captcha
**Then** el sistema crea un `User` con `role=vendor`, hashea la contraseña con `argon2id` (parámetros mínimos: memoryCost=19MiB, timeCost=2, parallelism=1), inicia sesión vía cookie HTTP-only firmada y responde `201 Created` redirigiendo al onboarding del proveedor.

### AC-02: Onboarding hacia creación de perfil

**Given** registro exitoso (sin `VendorProfile` aún creado en BD)
**When** el proveedor aterriza en el dashboard vendor
**Then** ve un CTA "Completar mi perfil" que abre el formulario de US-040; tras crearlo, el `VendorProfile` quedará `status=pending` esperando aprobación admin (US-074).

### AC-03: Idioma e identidad coherentes

**Given** el navegador en `pt`
**When** el registro es exitoso
**Then** `User.preferred_language=pt` y la UI se carga en portugués; el `VendorProfile` heredará `languages_supported` por defecto cuando se cree en US-040.

---

## ⚠️ Edge Cases

### EC-01: Email duplicado entre roles

**Given** existe un `User` con ese email (independiente del rol: organizer o vendor)
**When** intenta registrarse como proveedor con el mismo email
**Then** el backend responde `409 EMAIL_TAKEN` siguiendo el envelope de error estándar (Doc 16) y el frontend muestra un mensaje neutro ("No fue posible completar el registro") sin revelar el rol del usuario existente.

#### Handling

* No se permite multi-rol con mismo email (single-role MVP).
* Mensaje neutro idéntico en UI para evitar enumeración de cuentas o roles.
* Se registra evento de auditoría `auth.register.failure` con `reason=email_taken` y `correlationId`, sin loguear el email completo en prod.

---

### EC-02: Captcha fallido

**Given** el captcha falla la verificación en backend (token ausente, inválido o expirado)
**When** envía el formulario
**Then** el sistema rechaza el registro con `400 VALIDATION_ERROR` y `details[].field = "captchaToken"`, indicando "Verificación de seguridad fallida".

#### Handling

* Reinicio del widget captcha en frontend.
* Sin persistencia de datos.
* Se registra evento de auditoría `auth.register.failure` con `reason=captcha_failed` y `correlationId`, sin loguear el token.

---

### EC-03: Contraseña débil

**Given** el usuario ingresa una contraseña que no cumple la política MVP (mínimo 10 caracteres, al menos una letra y un número, distinta del localpart del email)
**When** envía el formulario
**Then** el sistema responde con `400 VALIDATION_ERROR` detallando el o los requisitos no cumplidos en `details[]`.

#### Handling

* Validación Zod en frontend y backend (defensa en profundidad).
* Mensaje a nivel de campo y banner global.

---

## 🚫 Validation Rules

| ID    | Rule                                            | Message / Behavior                                |
| ----- | ----------------------------------------------- | ------------------------------------------------- |
| VR-01 | Email obligatorio, formato RFC válido, único case-insensitive (BR-USER-002) | "No fue posible completar el registro" |
| VR-02 | Contraseña: mínimo 10 caracteres, al menos una letra y un número, distinta del localpart del email (Doc 19 §11.2) | "La contraseña no cumple con los requisitos" |
| VR-03 | Nombre comercial obligatorio (2-150 caracteres) | "El nombre comercial es obligatorio" |
| VR-04 | Aceptación obligatoria de términos y privacidad | "Debes aceptar los términos y la política de privacidad" |
| VR-05 | Captcha obligatorio (token válido) | "Verificación de seguridad fallida" |
| VR-06 | Rol asignado debe ser `vendor` en este endpoint | Backend ignora cualquier intento de elevar a `admin` o cambiar a `organizer` |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                |
| ------ | ----------------------------------------------------------------------------------- |
| SEC-01 | Endpoint accesible solo a usuarios anónimos; usuarios autenticados son redirigidos. |
| SEC-02 | Captcha verificado server-side antes de cualquier persistencia (Decisión PO 8.1 #8). |
| SEC-03 | Rate limiting `/auth/register`: máx 5 registros / IP / 10 min (Doc 19 §10); excedente responde `429 RATE_LIMIT_EXCEEDED`. |
| SEC-04 | Contraseña hasheada con `argon2id` (parámetros conformes a OWASP); nunca se loguea ni se devuelve. |
| SEC-05 | Cookie de sesión `HttpOnly`, `Secure`, `SameSite=Lax`, firmada. |
| SEC-06 | El rol `admin` jamás puede crearse vía registro público; backend fuerza `role=vendor` en este endpoint. |
| SEC-07 | Logs redactan email y nunca incluyen contraseña ni token de captcha. |

### Negative Authorization Scenarios

* Usuario ya autenticado que invoca el endpoint → 409 / redirección.
* Intento de registrar `role=admin` o `role=organizer` → backend fuerza `vendor`.
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

| Area                | Notes                                                                |
| ------------------- | -------------------------------------------------------------------- |
| Screen / Route      | `/[locale]/auth/register?role=vendor`                                |
| Main UI Pattern     | Form con datos comerciales + credenciales + captcha + términos        |
| Primary Action      | "Crear mi cuenta de proveedor"                                       |
| Secondary Actions   | "Soy organizador →", "Ya tengo cuenta"                               |
| Empty State         | No aplica                                                            |
| Loading State       | Spinner en botón                                                     |
| Error State         | Banner + mensajes inline                                             |
| Success State       | Redirección a onboarding vendor                                      |
| Accessibility Notes | Labels, aria-describedby, focus inicial en nombre comercial           |
| Responsive Notes    | Mobile-first                                                         |
| i18n Notes          | es-LATAM, es-ES, pt, en                                              |
| Currency Notes      | No aplica                                                            |

---

## 🛠 Technical Notes

### Frontend

* Route / Page:

  * `/[locale]/auth/register`
* Components:

  * `RegisterVendorForm`, `CaptchaWidget`
* State Management:

  * React Hook Form + Zod, TanStack Query mutation `useRegisterVendor`
* Forms:

  * Zod alineado al backend
* API Client:

  * `authApi.registerVendor(payload)`

### Backend

* Use Case / Service:

  * `RegisterVendorUseCase`
* Controller / Route:

  * `POST /api/v1/auth/register`
* Authorization Policy:

  * Anonymous only
* Validation:

  * `RegisterVendorDTO`
* Transaction Required:

  * Sí (crear User + cookie)

### Database

* Main Tables:

  * `users`
* Constraints:

  * `email` UNIQUE
* Index Considerations:

  * Índice por email

### API

| Method | Endpoint                          | Purpose                              |
| ------ | --------------------------------- | ------------------------------------ |
| POST   | `/api/v1/auth/register`           | Crear cuenta proveedor con captcha   |

### Observability / Audit

* Correlation ID Required: Yes
* Log Event Required: Yes
* AdminAction Required: No
* AIRecommendation Required: No

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                              | Type        |
| ----- | ----------------------------------------------------- | ----------- |
| TS-01 | Registro exitoso vendor con captcha                   | Integration |
| TS-02 | Redirección post-registro al onboarding vendor        | E2E         |
| TS-03 | Cookies con flags correctos                           | API         |

### Negative Tests

| ID    | Scenario                  | Expected Result        |
| ----- | ------------------------- | ---------------------- |
| NT-01 | Email duplicado           | 409 `EMAIL_TAKEN`; UI muestra mensaje neutro |
| NT-02 | Captcha inválido / expirado | 400 `VALIDATION_ERROR` (field `captchaToken`) |
| NT-03 | Contraseña débil          | 400 `VALIDATION_ERROR` |
| NT-04 | Intento de `role=admin` o `role=organizer` | Backend fuerza `vendor`; nunca admin/organizer |
| NT-05 | Rate limit excedido       | 429 `RATE_LIMIT_EXCEEDED` |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario                            | Expected Result |
| ---------- | ----------------------------------- | --------------- |
| AUTH-TS-01 | Anónimo invoca endpoint             | 201             |
| AUTH-TS-02 | Autenticado invoca endpoint         | 409 / redirect  |

### Accessibility Tests

* Navegación por teclado.
* Focus visible.
* Anuncios de error con aria-live.

---

## 📊 Business Impact

| Field               | Value                                                              |
| ------------------- | ------------------------------------------------------------------ |
| KPI Affected        | Vendor signup rate, Marketplace supply readiness                   |
| Expected Impact     | Habilita la oferta del marketplace, base del flujo de cotización    |
| Success Criteria    | ≥ 95% de registros válidos completan; tasa de aprobación admin > 50% |
| Academic Demo Value | Demuestra el flujo de onboarding de proveedor y curaduría admin    |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Crear página `register/vendor`.
* Implementar mutation y validaciones.
* Integrar captcha y next-intl.

### Potential Backend Tasks

* Implementar `RegisterVendorUseCase`.
* Validar captcha y rate limiting.
* Emitir cookie de sesión.

### Potential Database Tasks

* Usar tabla `users` existente; sin migración adicional.

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* Tests positivos/negativos.
* E2E del flujo vendor signup.

### Potential DevOps / Config Tasks

* Variables de entorno compartidas con US-001.

---

## ✅ Definition of Ready

* [x] Rol claro (Anonymous → Vendor).
* [x] Valor de negocio claro.
* [x] FRD/UC/BR enlazados.
* [x] Permisos y ownership identificados.
* [x] Entidades listadas.
* [x] AC en GWT.
* [x] Edge cases documentados.
* [x] Validación clara.
* [x] Out of Scope explícito.
* [x] Dependencias conocidas.
* [x] UX states identificados.
* [x] API definida.
* [x] Test scenarios definidos.
* [x] Decisiones PO/BA aplicadas y trazadas (ver sección PO/BA Decisions Applied).
* [ ] PO/BA validó la story (pendiente del Approval Gate).

---

## 🏁 Definition of Done

* [ ] Endpoint funcional.
* [ ] Captcha y argon2id integrados.
* [ ] Cookies HTTP-only configuradas.
* [ ] Frontend en 4 locales.
* [ ] Tests verdes.
* [ ] Logs con correlationId.
* [ ] Rate limiting activo.
* [ ] PO valida.

---

## 📝 Notes

* Tras esta historia, el proveedor debe ir a US-040 (crear VendorProfile) y luego ser aprobado en US-074.
* Decisión aplicada: el registro captura nombre comercial (`business_name` futuro del `VendorProfile`); el `User.name` persistido espeja el nombre comercial hasta que el proveedor diferencie nombre de contacto en US-040.
* Endpoint estructuralmente idéntico al de US-001 (organizador), salvo por el `role=vendor` derivado del parámetro `role` en query/payload (siempre forzado en backend).
* Documentation alignment menor (no bloqueante): la versión previa de la US referenciaba `CAPTCHA_INVALID`; se realineó al catálogo estándar de Doc 16 (`VALIDATION_ERROR` + `field='captchaToken'`).
