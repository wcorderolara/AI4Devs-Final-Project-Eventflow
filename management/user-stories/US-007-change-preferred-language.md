# 🧾 User Story: Cambiar mi idioma preferido entre los 4 soportados

## 🆔 Metadata

| Field              | Value                                |
| ------------------ | ------------------------------------ |
| ID                 | US-007                               |
| Epic               | EPIC-I18N-001 — Internationalization & Currency (cross-cuts EPIC-AUTH-001) |
| Backlog Item       | PB-P1-005 — Perfil propio (incluye US-006 y US-007) |
| Feature            | Selección de idioma preferido        |
| Module / Domain    | Auth / I18N                          |
| User Role          | Authenticated (Organizer / Vendor / Admin) |
| Priority           | Must Have                            |
| Status             | Approved                             |
| Owner              | Product Owner / Business Analyst     |
| Approved By        | PO/BA Review                         |
| Approval Date      | 2026-06-25                           |
| Ready for Development Tasks | Yes                         |
| Sprint / Milestone | MVP                                  |
| Created Date       | 2026-06-09                           |
| Last Updated       | 2026-06-25                           |

---

## 🎯 User Story

**As a** usuario autenticado de EventFlow
**I want** seleccionar mi idioma preferido entre `es-LATAM`, `es-ES`, `pt` y `en`
**So that** la interfaz, los emails simulados y los outputs IA aplicables se muestren en mi idioma

---

## 🧠 Business Context

### Context Summary

El idioma preferido se persiste en `User.preferred_language` y es usado por: la UI vía `next-intl`, los emails simulados, y los prompts IA del usuario (cuando aplica al ámbito del User, no del Event). El idioma del evento es independiente y configurado en US-082.

### Related Domain Concepts

* User.preferred_language.
* next-intl como motor i18n.

### Assumptions

* La UI tiene diccionarios completos en los 4 locales para rutas principales.
* Backend valida `language_code` por enum.

### Dependencies

* EPIC-FE-001 (i18n).
* EPIC-AUTH-001 (perfil propio).

---

## 🔗 Traceability

| Source                 | Reference                              |
| ---------------------- | -------------------------------------- |
| FRD Requirement(s)     | FR-USER-003, FR-I18N-001, FR-I18N-002, FR-I18N-004, FR-I18N-006 |
| Use Case(s)            | UC-AUTH-006, UC-I18N-001               |
| Business Rule(s)       | BR-USER-006, BR-I18N-001, BR-I18N-003  |
| Permission Rule(s)     | Ownership `/users/me`                  |
| Data Entity / Entities | User (`preferred_language`)            |
| API Endpoint(s)        | PATCH `/api/v1/users/me` (perfil); PATCH `/api/v1/users/me/preferred-language` (selector global) |
| NFR Reference(s)       | NFR-I18N-001, NFR-I18N-002             |
| Related ADR(s)         | ADR-FE-001                             |
| Related Document(s)    | /docs/3 §7.15, /docs/9 §FR-I18N, /docs/15, /docs/16 §Users |
| Backlog Item           | PB-P1-005                              |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* Traducción dinámica con IA.
* Soporte RTL.
* Locales adicionales (FR, IT, etc.).

### Scope Notes

* No introduce variantes regionales adicionales.
* No introduce detección automática agresiva (sólo sugerencia inicial).

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Cambio de idioma desde perfil

**Given** un usuario autenticado en `/profile`
**When** selecciona `pt` y guarda
**Then** `User.preferred_language = "pt"` y la UI se renderiza en portugués.

### AC-02: Cambio de idioma desde selector global

**Given** un usuario autenticado en cualquier página
**When** usa el selector de idioma en el header
**Then** la UI cambia inmediatamente y el preferred_language se actualiza en backend.

### AC-03: Persistencia entre sesiones

**Given** el usuario cierra sesión y vuelve a entrar
**When** la sesión se restaura
**Then** la UI se carga en el último idioma guardado.

---

## ⚠️ Edge Cases

### EC-01: Locale no soportado

**Given** un manipulador envía `fr-FR`
**When** intenta guardar
**Then** 400 `VALIDATION_ERROR` con mensaje "Idioma no soportado".

#### Handling

* Backend valida con enum `LanguageCode` ∈ {es-LATAM, es-ES, pt, en}.

---

### EC-02: Falta de diccionarios

**Given** un locale soportado pero con strings faltantes
**When** la UI renderiza
**Then** usa fallback en `en` y loguea key faltante.

#### Handling

* next-intl con fallback configurado a `en`.
* QA cubre cobertura por locale en rutas demo principales.

---

### EC-03: Usuario anónimo cambia idioma desde el selector global

**Given** un usuario no autenticado
**When** usa el selector global
**Then** la UI cambia el `locale` solo en la URL (`/[locale]/...`) y se persiste en cookie/almacenamiento del navegador, sin invocar la API.

#### Handling

* No se invoca `PATCH /users/me` para sesiones anónimas.
* La preferencia anónima se descarta al iniciar sesión y se reemplaza por `User.preferred_language`.

---

## 🚫 Validation Rules

| ID    | Rule                                              | Message / Behavior            |
| ----- | ------------------------------------------------- | ----------------------------- |
| VR-01 | Locale ∈ {es-LATAM, es-ES, pt, en}                | "Idioma no soportado"         |
| VR-02 | Campo obligatorio                                 | "Idioma obligatorio"          |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                |
| ------ | ------------------------------------------------------------------- |
| SEC-01 | Sesión activa requerida.                                            |
| SEC-02 | Ownership policy: sólo /users/me.                                   |
| SEC-03 | Selector global usa el mismo endpoint.                              |

### Negative Authorization Scenarios

* Anónimo: solo cambio en URL (locale prefix) sin persistir.

---

## 🤖 AI Behavior

This story does not invoke AI directly.

### AI Involvement

* AI Feature: None (afecta entradas a prompts IA del usuario, pero no invoca IA aquí)
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

| Area                | Notes                                                       |
| ------------------- | ----------------------------------------------------------- |
| Screen / Route      | `/[locale]/profile` y header global                          |
| Main UI Pattern     | Dropdown con banderas/labels                                |
| Primary Action      | "Aplicar idioma"                                            |
| Secondary Actions   | Cancelar                                                    |
| Empty State         | No aplica                                                   |
| Loading State       | Spinner breve                                               |
| Error State         | Toast de error                                              |
| Success State       | Toast + UI re-renderiza                                     |
| Accessibility Notes | `aria-label`, etiqueta del idioma en su propio idioma        |
| Responsive Notes    | Mobile-first                                                |
| i18n Notes          | Self-referenciado: cada idioma se muestra en su nombre nativo |
| Currency Notes      | No aplica                                                   |

---

## 🛠 Technical Notes

### Frontend

* Route / Page:

  * Header global + perfil
* Components:

  * `LocaleSwitcher`
* State Management:

  * `useUpdateProfile` (TanStack Query) + next-intl router
* Forms:

  * Select simple
* API Client:

  * `usersApi.update({ preferred_language })`

### Backend

* Use Case / Service:

  * `UpdateOwnProfileUseCase`
* Controller / Route:

  * `PATCH /api/v1/users/me`
* Authorization Policy:

  * Ownership
* Validation:

  * Enum locale
* Transaction Required:

  * No

### Database

* Main Tables:

  * `users`
* Constraints:

  * `preferred_language` CHECK enum
* Index Considerations:

  * No aplica

### API

| Method | Endpoint                                      | Purpose                                                                 |
| ------ | --------------------------------------------- | ----------------------------------------------------------------------- |
| PATCH  | `/api/v1/users/me`                            | Actualizar perfil (incluye `preferred_language`); usado desde `/profile` |
| PATCH  | `/api/v1/users/me/preferred-language`         | Endpoint dedicado para selector global con payload mínimo               |

### Observability / Audit

* Correlation ID Required: Yes
* Log Event Required: Yes (`user.locale.changed`)
* AdminAction Required: No
* AIRecommendation Required: No

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                          | Type        |
| ----- | ----------------------------------------------------------------- | ----------- |
| TS-01 | Cambio en perfil persiste `preferred_language` en BD              | Integration |
| TS-02 | Selector global cambia UI inmediatamente y persiste vía API       | E2E         |
| TS-03 | Locale persiste tras logout/login del usuario autenticado         | E2E         |
| TS-04 | Fallback a `en` cuando un dictionary entry falta en el locale activo | Integration |
| TS-05 | Selector anónimo cambia solo URL/cookie y no llama API            | E2E         |

### Negative Tests

| ID    | Scenario                                              | Expected Result      |
| ----- | ----------------------------------------------------- | -------------------- |
| NT-01 | Locale no soportado (`fr-FR`)                         | 400 VALIDATION_ERROR |
| NT-02 | Anónimo intenta PATCH                                 | 401 UNAUTHENTICATED  |
| NT-03 | Body sin `preferred_language` (campo requerido)       | 422                  |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario                            | Expected Result |
| ---------- | ----------------------------------- | --------------- |
| AUTH-TS-01 | Sesión activa cambia su idioma      | 200             |
| AUTH-TS-02 | Anónimo                             | 401             |

### Accessibility Tests

* Dropdown navegable por teclado.
* Etiquetas y anuncios accesibles.

---

## 📊 Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | Adopción multi-idioma                                |
| Expected Impact     | Mejora UX para usuarios LATAM/ES/PT/EN               |
| Success Criteria    | 100% rutas principales tienen 4 locales              |
| Academic Demo Value | Demuestra i18n end-to-end                            |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Componente `LocaleSwitcher`.
* Integración con next-intl router.
* Persistencia vía API.

### Potential Backend Tasks

* Validación enum en DTO.

### Potential Database Tasks

* Constraint check enum.

### Potential AI / PromptOps Tasks

* Not applicable for this story (sin invocar IA).

### Potential QA Tasks

* Smoke por locale.

### Potential DevOps / Config Tasks

* Not applicable for this story.

---

## ✅ Definition of Ready

* [x] Rol claro.
* [x] Goal/valor claros.
* [x] FRD/UC/BR enlazados.
* [x] Permisos identificados.
* [x] Entidades listadas.
* [x] AC en GWT.
* [x] Edge cases documentados (incluye EC-03 sesión anónima).
* [x] Validación clara.
* [x] Out of Scope explícito.
* [x] Dependencias conocidas.
* [x] UX states identificados.
* [x] API definida (ambos endpoints).
* [x] Tests definidos.
* [x] PO/BA validó.

---

## 🏁 Definition of Done

* [ ] Selector funcional.
* [ ] Persistencia operativa.
* [ ] Tests verdes.
* [ ] PO valida.

---

## 📝 Notes

* Verificar cobertura de diccionarios al 100% en rutas principales.
* Confirmar nombres nativos en el selector (Español LATAM, Español, Português, English).

---

## 🧾 PO/BA Decisions Applied

* PB-P1-005 agrupa US-006 y US-007 bajo el mismo backlog item; el alcance de US-007 se limita a `preferred_language`.
* El idioma del evento (`Event.language`) es independiente y queda fuera del alcance (US-082 / PB-P1-047).
* El selector global puede usar `PATCH /api/v1/users/me/preferred-language` (endpoint dedicado en /docs/16) para reducir payload; la pantalla `/profile` puede usar `PATCH /api/v1/users/me` con el resto del perfil. Ambos endpoints aplican la misma policy de ownership y validación enum.
* Para usuarios anónimos, el cambio de idioma queda solo en URL (`/[locale]/...`) + cookie/almacenamiento del navegador; no se invoca la API.
* `es-LATAM` es el idioma por defecto al registrar nuevos usuarios (FR-I18N-006).

---

## 🧭 Documentation Alignment Notes

* `UC-AUTH-007` referenciado originalmente no existe en /docs/8; se reemplaza por `UC-AUTH-006` (Cambiar idioma preferido del usuario) y `UC-I18N-001` (Cambiar idioma de la UI).
* Backlog item correcto: `PB-P1-005` (agrupa US-006 y US-007). `PB-P1-047` corresponde a US-081/US-082 (idioma del evento) y queda fuera de alcance.
* NFR-I18N-002 (persistencia por usuario) se añade a la trazabilidad por consistencia con /docs/10.
