# 🧾 User Story: Cerrar sesión

## 🆔 Metadata

| Field                       | Value                                                  |
| --------------------------- | ------------------------------------------------------ |
| ID                          | US-005                                                 |
| Epic                        | EPIC-AUTH-001 — Authentication & User Access           |
| Backlog Item                | PB-P1-003                                              |
| Feature                     | Logout explícito                                       |
| Module / Domain             | Auth                                                   |
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

**As a** usuario autenticado de EventFlow
**I want** cerrar sesión de manera explícita desde cualquier pantalla autenticada
**So that** pueda finalizar mi acceso de forma segura, especialmente en dispositivos compartidos

---

## 🧠 Business Context

### Context Summary

El logout invalida la cookie de sesión emitida por US-003. La estrategia MVP es rotación de cookie con `Max-Age=0` (Decisión PO US-005 #3, derivada de Doc 19 §9.6). El endpoint responde `204 No Content` cuando hay sesión activa y `401 AUTHENTICATION_REQUIRED` cuando no la hay (Decisión PO US-005 #1/#2, alineadas con Doc 16 §22.3 y SEC-POL-AUTH-009). El frontend trata ambas respuestas como "ir al login" y limpia el cliente de cache.

### Related Domain Concepts

* Sesión / cookie HTTP-only firmada.
* Rotación de cookie como invalidación canónica MVP (Doc 19 §9.6).
* TanStack Query invalidation post-logout.

### Assumptions

* La cookie es la única fuente de sesión en MVP (sin tabla `sessions` persistente).
* El frontend conserva referencias a queries autenticadas hasta el logout.

### Dependencies

* US-003 (login para que exista sesión).
* PB-P0-004 (REST API foundation, error envelope).
* PB-P0-006 (`SessionCookieIssuer`, cookies firmadas).

---

## 🧾 PO/BA Decisions Applied

| Decision                                                                          | Source                                                              | Resolución aplicada en esta historia                                                                                                                                                  |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Comportamiento del endpoint `/auth/logout` ante sesión ausente                    | Doc 16 §22.3; SEC-POL-AUTH-009 (Doc 19 §matrix de políticas)        | Endpoint **estricto**: requiere sesión activa. Sin sesión → `401 AUTHENTICATION_REQUIRED`. El frontend trata `401` y `204` igual y redirige al login.                                  |
| Código de éxito en logout                                                          | Doc 16 §22.3                                                        | `204 No Content` (sin body).                                                                                                                                                          |
| Estrategia de invalidación de sesión                                              | Doc 19 §9.6 (alternativa MVP)                                       | Rotación de cookie con `Set-Cookie: session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`. No se introduce tabla `sessions`.                                                    |
| Modal de confirmación                                                             | Decisión PO US-005 (UX MVP)                                          | Sin modal de confirmación. El clic en "Cerrar sesión" ejecuta logout inmediato. Aplica a los tres roles (organizer / vendor / admin).                                                  |
| Catálogo de errores alineado al error envelope                                    | Doc 16 §22.6                                                        | `401 AUTHENTICATION_REQUIRED` cuando no hay sesión válida. `405 METHOD_NOT_ALLOWED` ante métodos distintos a `POST` (manejado por router PB-P0-004).                                  |
| Atributos canónicos de la cookie de invalidación                                  | Doc 19 §10; ADR-SEC-001                                              | `HttpOnly`, `Secure` (no-local), `SameSite=Lax`, `Path=/`, `Max-Age=0` (override que vence `Max-Age=30d` de US-003 al cierre).                                                          |

---

## 🔗 Traceability

| Source                 | Reference                                                                      |
| ---------------------- | ------------------------------------------------------------------------------ |
| FRD Requirement(s)     | FR-AUTH-004, FR-AUTH-005                                                       |
| Use Case(s)            | UC-AUTH-003                                                                    |
| Business Rule(s)       | BR-AUTH-003, BR-PRIVACY-009                                                    |
| Permission Rule(s)     | Cualquier rol autenticado; sin sesión → `401`                                  |
| Data Entity / Entities | `User` (lectura de sesión)                                                     |
| API Endpoint(s)        | `POST /api/v1/auth/logout`                                                     |
| NFR Reference(s)       | NFR-SEC-003                                                                    |
| Related ADR(s)         | ADR-SEC-001                                                                    |
| Related Document(s)    | `/docs/8 UC-AUTH-003`, `/docs/16 §22.3`, `/docs/19 §9.6, §10`                  |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* Logout selectivo por dispositivo (Future).
* Listado de sesiones activas (Future).
* Logout SSO/federated.
* Tabla `sessions` con `sid` revocado (Doc 19 §9.6 alternativa); reservada para post-MVP.
* Logout silencioso por inactividad (Future).
* Modal de confirmación previo (descartado por Decisión PO US-005 #4).

### Scope Notes

* Esta historia no introduce gestión avanzada de sesiones.
* La rotación de cookie es la única estrategia de invalidación del MVP.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Logout exitoso

**Given** un usuario con sesión activa
**When** invoca `POST /api/v1/auth/logout`
**Then** el backend emite `Set-Cookie: session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`, responde `204 No Content` y emite el evento `auth.logout.success` con `correlationId`.

### AC-02: Estado del cliente limpio

**Given** logout exitoso
**When** el frontend procesa la respuesta
**Then** `useLogout` ejecuta `queryClient.removeQueries({ predicate: q => q.queryKey[0]?.toString().startsWith('auth') })`, limpia cualquier dato sensible del store local y redirige a `/[locale]/auth/login`.

### AC-03: Reuso de cookie post-logout

**Given** un cliente que conserva la cookie original (snapshot manual)
**When** invoca un endpoint protegido tras el logout
**Then** la cookie no permite acceder: `Set-Cookie: Max-Age=0` rotó el valor canónico y la cookie obsoleta no abre sesión (verificación dentro de la ventana de validez restante de la firma; tras el cierre de pestañas, la cookie se descarta por el navegador).

---

## ⚠️ Edge Cases

### EC-01: Llamada sin sesión

**Given** la cookie venció o no existe
**When** el usuario invoca `POST /api/v1/auth/logout`
**Then** el backend responde `401 AUTHENTICATION_REQUIRED`. El frontend trata `401` igual que `204` y redirige a `/[locale]/auth/login`. Se emite el evento `auth.logout.no_session` con `correlationId`.

### EC-02: Múltiples pestañas

**Given** el usuario tiene varias pestañas abiertas
**When** hace logout en una pestaña
**Then** la cookie queda rotada; las demás pestañas detectan la pérdida de sesión al próximo request protegido (`401`) y redirigen a `/[locale]/auth/login` mediante el handler global de `useUserMe`.

### EC-03: Método no permitido

**Given** un cliente intenta `GET /api/v1/auth/logout`
**When** llega al router
**Then** el `methodNotAllowedHandler` (PB-P0-004) responde `405 METHOD_NOT_ALLOWED` sin tocar el use case.

---

## 🚫 Validation Rules

| ID    | Rule                                  | Message / Behavior                                                              |
| ----- | ------------------------------------- | ------------------------------------------------------------------------------- |
| VR-01 | No requiere payload                   | `POST /auth/logout` ignora cualquier body recibido                              |
| VR-02 | Cookie de logout sobreescribe la actual | `Set-Cookie: session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`     |
| VR-03 | Respuesta sin body                    | `204 No Content` en éxito; sin `Content-Type` ni body                            |
| VR-04 | Auth requerido                        | `401 AUTHENTICATION_REQUIRED` sin sesión válida                                  |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                                                       |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| SEC-01 | Endpoint requiere sesión activa (`authMiddleware`). Sin cookie válida → `401 AUTHENTICATION_REQUIRED`.                                       |
| SEC-02 | Invalidar cookie con `Set-Cookie: session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`.                                              |
| SEC-03 | Estrategia MVP: rotación de cookie. No se persisten `sessions` revocadas en MVP (Doc 19 §9.6 alternativa).                                   |
| SEC-04 | CSRF: el endpoint requiere `POST`; cookie con `SameSite=Lax` mitiga ataques cross-site (Doc 19 §10, THR-004).                                |
| SEC-05 | Logs no exponen `session` token, cookie firmada, ni `Authorization`.                                                                       |
| SEC-06 | Eventos `auth.logout.success` y `auth.logout.no_session` con `correlationId`, `userId` (cuando aplique), nunca con el token de la cookie.    |

### Negative Authorization Scenarios

* Endpoint llamado sin cookie → `401 AUTHENTICATION_REQUIRED`.
* `GET /auth/logout` → `405 METHOD_NOT_ALLOWED`.
* Cookie inválida o expirada → `401 AUTHENTICATION_REQUIRED`.

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
| Screen / Route      | Header / menú en todos los layouts autenticados                     |
| Main UI Pattern     | Botón / item de menú "Cerrar sesión"                                  |
| Primary Action      | "Cerrar sesión" — sin confirmación (Decisión PO US-005 #4)            |
| Secondary Actions   | Ninguna                                                              |
| Empty State         | No aplica                                                            |
| Loading State       | Spinner breve en botón mientras el mutation está pendiente            |
| Error State         | Toast genérico si falla la red; si responde `401`, redirige a login   |
| Success State       | Redirección a `/[locale]/auth/login`                                  |
| Accessibility Notes | Focus visible; `aria-label` si es ícono; tabbable                     |
| Responsive Notes    | Mobile-first; el botón vive en `UserMenu`                             |
| i18n Notes          | 4 locales (`es-LATAM`, `es-ES`, `pt`, `en`)                          |
| Currency Notes      | No aplica                                                            |

---

## 🛠 Technical Notes

### Frontend

* Route / Page:
  * Header en todos los layouts autenticados (organizer / vendor / admin)
* Components:
  * `LogoutButton`, `UserMenu`
* State Management:
  * TanStack Query mutation `useLogout`; al finalizar invalida queries del namespace `auth.*` y `me.*` y redirige.
* Forms:
  * No aplica
* API Client:
  * `authApi.logout()` con `credentials: 'include'`.

### Backend

* Use Case / Service:
  * `LogoutUseCase`
* Controller / Route:
  * `POST /api/v1/auth/logout`
* Authorization Policy:
  * Requiere sesión activa (`authMiddleware`). Sin sesión → `401 AUTHENTICATION_REQUIRED`.
* Validation:
  * No payload; cualquier body se ignora.
* Cookies:
  * `Set-Cookie: session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax` (rotación).
* Transaction Required:
  * No.

### Database

* Main Tables:
  * No aplica (sin tabla `sessions` en MVP).
* Constraints:
  * No aplica.
* Index Considerations:
  * No aplica.

### API

| Method | Endpoint                       | Purpose          |
| ------ | ------------------------------ | ---------------- |
| POST   | `/api/v1/auth/logout`          | Cerrar sesión    |

### Observability / Audit

* Correlation ID Required: Yes
* Log Event Required: Yes (`auth.logout.success`, `auth.logout.no_session`).
* AdminAction Required: No.
* AIRecommendation Required: No.

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                | Type        |
| ----- | ------------------------------------------------------- | ----------- |
| TS-01 | Logout con sesión activa emite `Set-Cookie Max-Age=0` y `204` | API         |
| TS-02 | Frontend limpia cache `auth.*`/`me.*` y redirige         | E2E         |
| TS-03 | Cookie post-logout no permite acceder a endpoint protegido | API         |
| TS-04 | Logout consistente para 3 roles                          | E2E         |

### Negative Tests

| ID    | Scenario                              | Expected Result                       |
| ----- | ------------------------------------- | ------------------------------------- |
| NT-01 | `GET /auth/logout`                    | `405 METHOD_NOT_ALLOWED`              |
| NT-02 | `POST /auth/logout` sin cookie        | `401 AUTHENTICATION_REQUIRED`         |
| NT-03 | Multi-pestaña: logout en pestaña A, request protegido en B | `401` global → redirección frontend |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario                          | Expected Result          |
| ---------- | --------------------------------- | ------------------------ |
| AUTH-TS-01 | Logout autenticado                | `204 No Content`         |
| AUTH-TS-02 | Logout sin cookie                 | `401 AUTHENTICATION_REQUIRED` |

### Accessibility Tests

* Botón accesible por teclado y screen reader.
* `aria-label` y `focus visible`.

---

## 📊 Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | Seguridad de cuenta, satisfacción de usuario         |
| Expected Impact     | Mitigación de uso compartido no intencional          |
| Success Criteria    | 100% de logouts rotan la cookie; tests verdes        |
| Academic Demo Value | Cierre limpio de sesión durante la demo              |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Botón logout en header/menú (cliente, sin confirmación).
* `useLogout` con invalidación de cache y redirección.
* Manejo global de `401` post-logout multi-pestaña.

### Potential Backend Tasks

* `LogoutUseCase` y endpoint `POST /auth/logout` con `authMiddleware`.
* Rotación de cookie con flags canónicos.

### Potential Database Tasks

* No aplica.

### Potential AI / PromptOps Tasks

* No aplica.

### Potential QA Tasks

* Tests API, E2E para 3 roles, multi-pestaña y reuso de cookie.

### Potential DevOps / Config Tasks

* No aplica (variables de cookie ya cubiertas por US-003 / PB-P0-006).

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
* [x] PO/BA validó (decisiones formalizadas).

---

## 🏁 Definition of Done

* [ ] Endpoint `POST /api/v1/auth/logout` operativo.
* [ ] `Set-Cookie` con `Max-Age=0`, `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`.
* [ ] Frontend limpia cache `auth.*`/`me.*` y redirige a login.
* [ ] Eventos `auth.logout.success` y `auth.logout.no_session` con `correlationId`.
* [ ] Tests API, E2E (3 roles) y multi-pestaña verdes.
* [ ] PO valida.

---

## 📝 Notes

* Decisiones PO formalizadas en sección `PO/BA Decisions Applied`.
* Si en el futuro se introduce tabla `sessions` con `sid` revocado (Doc 19 §9.6 alternativa robusta), se promoverá por ADR sin modificar este alcance.
