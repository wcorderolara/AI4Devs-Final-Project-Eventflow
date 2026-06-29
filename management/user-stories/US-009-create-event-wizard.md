# 🧾 User Story: Crear un evento mediante wizard

## 🆔 Metadata

| Field              | Value                                |
| ------------------ | ------------------------------------ |
| ID                 | US-009                               |
| Epic               | EPIC-EVT-001 — Organizer Event Management |
| Backlog Item       | PB-P1-006 — Wizard de creación de evento |
| Feature            | Wizard de creación de eventos        |
| Module / Domain    | Events                               |
| User Role          | Organizer                            |
| Priority           | Must Have                            |
| Status             | Approved                             |
| Owner              | Product Owner / Business Analyst     |
| Approved By        | PO/BA Review                          |
| Approval Date      | 2026-06-25                            |
| Ready for Development Tasks | Yes                          |
| Sprint / Milestone | MVP                                  |
| Created Date       | 2026-06-09                           |
| Last Updated       | 2026-06-25                           |

---

## 🎯 User Story

**As an** organizador autenticado en EventFlow
**I want** crear un nuevo evento mediante un wizard guiado (tipo, fecha, número de invitados, ciudad/país, presupuesto estimado, moneda e idioma)
**So that** pueda empezar a planificar mi celebración y desbloquear las features IA, checklist, presupuesto y cotizaciones del MVP

---

## 🧠 Business Context

### Context Summary

El wizard de creación es el punto de entrada al workspace de planificación del organizador. Soporta los 6 tipos canónicos del catálogo MVP (`wedding`, `xv`, `baptism`, `baby_shower`, `birthday`, `corporate`) y establece dos atributos inmutables del evento: la moneda y el idioma. Sin un evento creado en `draft`, el organizador no puede solicitar plan IA, generación de checklist, presupuesto inicial ni cotizaciones a vendors.

### Related Domain Concepts

* `Event` (estado inicial `draft`; ver BR-EVENT-005).
* `EventType` (catálogo cerrado MVP; BR-EVENTTYPE-001).
* `currency_code` inmutable post-creación (BR-EVENT-007; Decisión PO 8.1 #7).
* `language_code` configurado por evento (BR-EVENT-008).
* `Location` (ciudad/país).
* `owner_user_id` derivado de la sesión, no del payload.

### Assumptions

* El catálogo de `EventType` está sembrado por el seed y administrado por el admin (sólo se muestran los activos en el wizard).
* El organizador autenticado es siempre el `owner` del evento creado (BR-EVENT-001, BR-EVENT-002).
* La moneda local sugerida se infiere a partir del país capturado en el paso de ubicación, pero la selección final entre **moneda local** y **USD** es explícita (Decisión PO 8.1 #7).
* El idioma por defecto del evento es el `preferred_language` del usuario (US-007) y puede modificarse durante el wizard.

### Dependencies

* US-001 — Registro de cuenta organizador.
* US-003 — Login con email y contraseña (sesión).
* PB-P0-001 — Foundations de autenticación.
* EPIC-DB-001 — Entidades `Event`, `EventType`, `Location` y constraints físicas.

---

## 🧷 PO/BA Decisions Applied

| Decisión | Fuente | Aplicación en esta US |
| --- | --- | --- |
| Moneda inmutable; el wizard ofrece dos opciones explícitas: **moneda local** o **USD** | Decisión PO 8.1 #7; BR-EVENT-007; BR-BUDGET-006 | VR-06, AC-04, EC-02 reflejan dos opciones explícitas. Lista soportada inicial: GTQ, EUR, MXN, COP, USD. |
| Catálogo cerrado de 6 tipos en MVP | BR-EVENTTYPE-001 | VR-01, AC-02 enumeran los 6 tipos. EventType inactivo rechazado en backend (EC-03). |
| Estado inicial `draft` | BR-EVENT-005 | AC-01 fija `status='draft'` al crear. |
| Owner único e inmutable | BR-EVENT-001, BR-EVENT-002; FR-EVENT-002 | SEC-02 fuerza `owner_user_id` desde la sesión; campo no aceptado en payload. |
| Idioma del evento configurable y usado por IA | BR-EVENT-008 | AC-03 hereda el `preferred_language` del usuario por defecto; VR-07 acota a los 4 locales soportados. |
| Sin conversión automática de moneda en MVP | BR-OOS-015; BR-BUDGET-007 | Out of Scope explícito. |

---

## 🔗 Traceability

| Source                 | Reference                                                |
| ---------------------- | -------------------------------------------------------- |
| Backlog Item           | PB-P1-006 — Wizard de creación de evento                 |
| Epic                   | EPIC-EVT-001 — Organizer Event Management                 |
| FRD Requirement(s)     | FR-EVENT-001, FR-EVENT-002, FR-EVENT-003                  |
| Use Case(s)            | UC-EVENT-001                                              |
| Business Rule(s)       | BR-EVENT-001, BR-EVENT-003, BR-EVENT-004, BR-EVENT-005, BR-EVENT-007, BR-EVENT-008, BR-EVENTTYPE-001, BR-EVENTTYPE-005, BR-BUDGET-006 |
| Permission Rule(s)     | Sólo rol `Organizer` puede crear; ownership inmutable derivada de la sesión |
| Data Entity / Entities | `Event`, `EventType`, `Location`, `User`                  |
| API Endpoint(s)        | `POST /api/v1/events`, `GET /api/v1/event-types`          |
| NFR Reference(s)       | NFR-PERF-001                                              |
| Related ADR(s)         | ADR-BE-003 (reglas de negocio en Application/Domain — moneda inmutable enforcement) |
| Related Document(s)    | `/docs/6` (Domain Data Model), `/docs/8` UC-EVENT-001, `/docs/8.1` #7 |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* RSVP, lista de invitados detallada y plano de mesas (Future).
* Multi-colaboradores por evento (Future).
* Cambio de moneda post-creación (BR-EVENT-007; queda bloqueado por backend).
* Integración con calendarios externos (Google/Outlook).
* Conversión automática de moneda (BR-BUDGET-007).
* Persistencia server-side de borrador parcial del wizard (sólo localStorage opcional en cliente).
* Creación de tipos de evento ad hoc por el organizador (BR-EVENTTYPE-006).

### Scope Notes

* No introduce pagos reales.
* No introduce real-time chat ni push notifications.
* No invoca IA directamente; la generación de checklist/plan IA pertenece a otras US.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Wizard completa creación y deja el evento en `draft`

**Given** un organizador autenticado
**When** completa los pasos del wizard con datos válidos (tipo, fecha futura, número de invitados, ciudad/país, presupuesto estimado, moneda, idioma) y confirma
**Then** se crea un `Event` con `status='draft'`, `owner_user_id` derivado de la sesión, `currency_code` y `language_code` fijos, retorna `201 Created` con la ubicación del recurso y redirige al dashboard del evento.

### AC-02: Los 6 tipos canónicos están soportados

**Given** los 6 `EventType` del catálogo MVP activos (`wedding`, `xv`, `baptism`, `baby_shower`, `birthday`, `corporate`)
**When** el organizador selecciona cualquiera de ellos
**Then** el evento se crea con el `event_type_code` correspondiente.

### AC-03: Idioma del evento por defecto desde el perfil

**Given** un organizador con `preferred_language = es-LATAM`
**When** no modifica el idioma en el wizard
**Then** el evento se crea con `language_code = es-LATAM`.

### AC-04: Selección de moneda explícita entre moneda local o USD

**Given** un organizador que captura ciudad/país en el wizard
**When** llega al paso de moneda
**Then** el wizard ofrece dos opciones explícitas — **moneda local** (mapeada al `currency_code` soportado del país; GTQ, EUR, MXN, COP, USD como mínimo) o **USD** — y persiste la elección como `currency_code` inmutable del evento.

### AC-05: Moneda inmutable post-creación

**Given** un evento ya creado
**When** un cliente intenta modificar `currency_code` vía `PATCH /api/v1/events/:id`
**Then** el backend rechaza con `400 IMMUTABLE_FIELD` y registra el intento.

---

## ⚠️ Edge Cases

### EC-01: Fecha del evento en el pasado

**Given** la fecha del evento es anterior a hoy en la zona horaria del organizador
**When** intenta guardar
**Then** el backend responde `400 VALIDATION_ERROR` con detalle del campo `event_date`.

#### Handling

* Validación equivalente en frontend (antes de avanzar de paso) y backend (DTO Zod).

---

### EC-02: Moneda fuera del catálogo soportado

**Given** el payload incluye un `currency_code` fuera de la lista soportada en MVP (GTQ, EUR, MXN, COP, USD; BR-BUDGET-006)
**When** envía
**Then** el backend responde `400 INVALID_CURRENCY`.

#### Handling

* Enum Zod en backend; el wizard nunca expone códigos fuera del catálogo.

---

### EC-03: EventType inactivo

**Given** un `EventType` desactivado por admin (`is_active = false`)
**When** el organizador intenta seleccionarlo o forzarlo en el payload
**Then** el backend responde `400 EVENT_TYPE_INACTIVE`.

#### Handling

* `GET /api/v1/event-types` devuelve sólo activos.
* El backend revalida `is_active` al crear.

---

### EC-04: Idioma fuera de catálogo

**Given** el payload incluye un `language_code` fuera de `{es-LATAM, es-ES, pt, en}`
**When** envía
**Then** el backend responde `400 UNSUPPORTED_LANGUAGE`.

#### Handling

* Enum Zod en backend; el wizard sólo expone los 4 locales soportados.

---

## 🚫 Validation Rules

| ID    | Rule                                                                 | Message / Behavior                |
| ----- | -------------------------------------------------------------------- | --------------------------------- |
| VR-01 | `event_type_code` obligatorio y activo en catálogo MVP               | "Tipo de evento requerido"        |
| VR-02 | `event_date` futura, formato ISO 8601                                | "Fecha inválida o pasada"         |
| VR-03 | `estimated_guests` entero en rango [1, 10000]                        | "Número de invitados inválido"    |
| VR-04 | `city` y `country_code` obligatorios                                 | "Ubicación requerida"             |
| VR-05 | `estimated_budget` numérico ≥ 0                                      | "Presupuesto inválido"            |
| VR-06 | `currency_code` ∈ {GTQ, EUR, MXN, COP, USD} y elegido entre moneda local o USD (BR-BUDGET-006; Decisión PO 8.1 #7) | "Moneda no soportada"             |
| VR-07 | `language_code` ∈ {es-LATAM, es-ES, pt, en} (BR-EVENTTYPE-005)        | "Idioma no soportado"             |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                |
| ------ | ------------------------------------------------------------------- |
| SEC-01 | `POST /api/v1/events` requiere sesión válida y rol `Organizer`.    |
| SEC-02 | `owner_user_id` se setea desde la sesión, nunca del payload (FR-EVENT-002). |
| SEC-03 | Ownership policy se aplica desde la creación; el organizador es el único autorizado para mutar el evento (BR-EVENT-002). |
| SEC-04 | DTO validado con Zod; cualquier intento de enviar `owner_user_id`, `status` distinto a `draft` o `id` es rechazado. |
| SEC-05 | `currency_code` declarado inmutable a nivel de DTO de actualización (BR-EVENT-007). |

### Negative Authorization Scenarios

* `Vendor` autenticado intenta crear → `403 FORBIDDEN`.
* `Admin` intenta crear → `403 FORBIDDEN` (los admin no son owners; ver Roles Matrix).
* Cliente anónimo (sin sesión) → `401 UNAUTHENTICATED`.

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

| Area                | Notes                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Screen / Route      | `/[locale]/organizer/events/new`                                      |
| Main UI Pattern     | Wizard de 4 pasos: (1) Tipo, (2) Fecha y ubicación, (3) Invitados y presupuesto, (4) Moneda, idioma y confirmación |
| Primary Action      | "Crear evento"                                                        |
| Secondary Actions   | "Atrás", "Cancelar" (descarta el progreso del wizard)                 |
| Empty State         | No aplica                                                             |
| Loading State       | Spinner en submit; deshabilita acciones del paso final                |
| Error State         | Mensaje inline por campo + banner de error de API                     |
| Success State       | Redirect al dashboard del evento creado + toast de éxito              |
| Accessibility Notes | Stepper con `aria-current`, foco automático al cambiar de paso, `aria-live` para errores |
| Responsive Notes    | Mobile-first; stepper colapsable en pantallas pequeñas                |
| i18n Notes          | 4 locales soportados; copy del wizard y mensajes de error en todos    |
| Currency Notes      | Selector con dos opciones: moneda local (derivada del país) y USD; moneda inmutable post-creación |
| Draft Persistence   | Persistencia opcional de progreso parcial sólo en `localStorage`; NO se persiste en servidor en MVP |

---

## 🛠 Technical Notes

### Frontend

* Route / Page:

  * `/[locale]/organizer/events/new`
* Components:

  * `EventCreationWizard`, `StepIndicator`, `EventTypeSelector`, `LocationStep`, `BudgetStep`, `CurrencyLanguageStep`, `EventSummary`
* State Management:

  * Form state en React Hook Form; persistencia opcional de borrador parcial en `localStorage` (clave por usuario)
* Forms:

  * Zod schema por paso; validación al avanzar y al submit final
* API Client:

  * `eventsApi.create(payload)`, `eventTypesApi.listActive()`

### Backend

* Use Case / Service:

  * `CreateEventUseCase` en capa Application; reglas de moneda inmutable e ownership en Domain (ADR-BE-003)
* Controller / Route:

  * `POST /api/v1/events`
* Authorization Policy:

  * RBAC: `Organizer`; sesión validada por middleware
* Validation:

  * `CreateEventDTO` con Zod (enums para `event_type_code`, `currency_code`, `language_code`, `country_code`)
* Transaction Required:

  * No estrictamente; se inserta `Event` y se referencia `EventType` por FK. Si hay creación de `Location` derivada, encapsular en una transacción.

### Database

* Main Tables:

  * `events`, `event_types`, `locations`
* Constraints:

  * `events.currency_code` inmutable (enforced en Application/Domain; opcional trigger defensivo)
  * FK `events.event_type_id` → `event_types.id`
  * `events.status` default `'draft'`
* Index Considerations:

  * Índice por `events.owner_user_id`
  * Índice compuesto por `events.owner_user_id, events.status`

### API

| Method | Endpoint                          | Purpose                              |
| ------ | --------------------------------- | ------------------------------------ |
| POST   | `/api/v1/events`                  | Crear evento en `draft`              |
| GET    | `/api/v1/event-types`             | Listar `EventType` activos para el wizard |

### Observability / Audit

* Correlation ID Required: Yes (`X-Correlation-Id` propagado por middleware)
* Log Event Required: Yes — emitir `event.created` con `correlation_id`, `owner_user_id`, `event_type_code`, `currency_code`, `language_code`, `country_code` (sin PII adicional)
* AdminAction Required: No (la creación la realiza el organizador, no el admin)
* AIRecommendation Required: No

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                              | Type        |
| ----- | ----------------------------------------------------- | ----------- |
| TS-01 | Creación válida con cada uno de los 6 `EventType`     | Integration |
| TS-02 | `PATCH /api/v1/events/:id` con `currency_code` distinto es rechazado | API         |
| TS-03 | Wizard E2E del organizador (4 pasos, happy path)      | E2E         |
| TS-04 | `GET /api/v1/event-types` devuelve sólo activos       | API         |
| TS-05 | Idioma por defecto = `preferred_language` del usuario | Integration |

### Negative Tests

| ID    | Scenario                              | Expected Result          |
| ----- | ------------------------------------- | ------------------------ |
| NT-01 | Fecha del evento en el pasado         | 400 VALIDATION_ERROR     |
| NT-02 | `currency_code` fuera del catálogo    | 400 INVALID_CURRENCY     |
| NT-03 | Vendor intenta crear                  | 403 FORBIDDEN            |
| NT-04 | `EventType` inactivo                  | 400 EVENT_TYPE_INACTIVE  |
| NT-05 | `language_code` fuera de catálogo     | 400 UNSUPPORTED_LANGUAGE |
| NT-06 | Cliente anónimo                       | 401 UNAUTHENTICATED      |
| NT-07 | Payload incluye `owner_user_id`       | El campo se ignora; owner se setea desde la sesión |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario                          | Expected Result |
| ---------- | --------------------------------- | --------------- |
| AUTH-TS-01 | Organizer crea con payload válido | 201 Created     |
| AUTH-TS-02 | Vendor                            | 403 FORBIDDEN   |
| AUTH-TS-03 | Anónimo                           | 401 UNAUTHENTICATED |
| AUTH-TS-04 | Admin                             | 403 FORBIDDEN   |

### Accessibility Tests

* Wizard completamente navegable por teclado (tabular y `Enter` para avanzar).
* Stepper con `aria-current` y anuncio de cambios de paso.
* Mensajes de error asociados a su input mediante `aria-describedby`.

### Seed / Demo

* El seed debe incluir los 6 `EventType` activos (BR-EVENTTYPE-001) con sus nombres en los 4 locales (BR-EVENTTYPE-005).

---

## 📊 Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | Activation Rate, Tiempo hasta primer evento creado    |
| Expected Impact     | Punto de inicio del workspace de planificación        |
| Success Criteria    | ≥ 80% de los organizadores que inician el wizard lo completan |
| Academic Demo Value | El demo del flujo organizador arranca con esta US     |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* `EventCreationWizard` con 4 pasos y validación Zod por paso.
* Selector de `EventType` consumiendo `GET /api/v1/event-types`.
* Selector de moneda con dos opciones (local del país capturado / USD).
* Selector de idioma con default desde `preferred_language`.
* Persistencia opcional de borrador en `localStorage`.

### Potential Backend Tasks

* `CreateEventUseCase` y `POST /api/v1/events`.
* `EventTypesQueryService` y `GET /api/v1/event-types` (sólo activos).
* Validación de DTO con Zod (enums para tipo, moneda, idioma y país).
* Enforcement de moneda inmutable en update (`PATCH /api/v1/events/:id`).
* Setear `owner_user_id` desde el contexto de sesión.

### Potential Database Tasks

* Migración para constraints y defaults de `events` (default `status='draft'`).
* Índices por `owner_user_id` y `(owner_user_id, status)`.
* Seed de `EventType` con los 6 tipos en 4 locales.

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* Tests positivos (TS-01..TS-05) y negativos (NT-01..NT-07).
* E2E del wizard.
* Accessibility checks en stepper y formularios.

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
* [x] Edge cases documentados.
* [x] Validación clara.
* [x] Out of Scope explícito.
* [x] Dependencias conocidas.
* [x] UX states identificados.
* [x] API definida.
* [x] Tests definidos.
* [x] Decisión PO 8.1 #7 (moneda local o USD) aplicada.
* [ ] PO/BA valida (pendiente del Approval Gate).

---

## 🏁 Definition of Done

* [ ] Wizard implementado y publicado en `/[locale]/organizer/events/new`.
* [ ] Backend valida y enforcea moneda inmutable.
* [ ] Tests TS-01..TS-05 y NT-01..NT-07 pasan en CI.
* [ ] E2E del wizard pasa en CI.
* [ ] Seed de `EventType` cargado con los 6 tipos activos.
* [ ] PO valida la demo del flujo.

---

## 📝 Notes

* Persistencia parcial del wizard se considera optimización UX y se restringe a `localStorage` (cliente). Cualquier persistencia server-side de borradores intermedios queda fuera de alcance MVP.
* La lista de monedas locales soportadas se acota a {GTQ, EUR, MXN, COP, USD}; ampliar el catálogo requiere actualización de BR-BUDGET-006 y seed correspondiente.
* La moneda local se sugiere desde el `country_code` capturado, pero la elección entre **moneda local** y **USD** es siempre explícita (Decisión PO 8.1 #7).
