# 🧾 User Story: Admin ve evento del organizador en solo lectura (auditado)

## 🆔 Metadata

| Field              | Value                                          |
| ------------------ | ---------------------------------------------- |
| ID                 | US-016                                         |
| Epic               | EPIC-EVT-001 — Organizer Event Management      |
| Backlog Item       | PB-P1-010 — Admin event visibility (read-only) |
| UI Surface         | PB-P1-044                                      |
| Feature            | Vista admin solo lectura del evento            |
| Module / Domain    | Events / Admin                                 |
| User Role          | Admin                                          |
| Priority           | Must Have                                      |
| Status             | Approved                                       |
| Owner              | Product Owner / Business Analyst               |
| Approved By        | PO/BA Review                                   |
| Approval Date      | 2026-06-25                                     |
| Ready for Development Tasks | Yes                                   |
| Sprint / Milestone | MVP                                            |
| Created Date       | 2026-06-09                                     |
| Last Updated       | 2026-06-25                                     |

---

## 🎯 User Story

**As an** administrador autenticado
**I want** consultar un evento de un organizador en modo solo lectura, dejando rastro auditable
**So that** pueda apoyar moderación y soporte sin alterar los datos

---

## 🧠 Business Context

### Context Summary

El admin tiene acceso de solo lectura al detalle de eventos para soporte, moderación y gobernanza. Cada apertura del detalle registra una entrada en `AdminAction` con `action='view_event'` (Decisión PO 8.1 #16; BR-EVENT-014). El admin no puede editar, cancelar ni eliminar eventos por cuenta propia; las operaciones de escritura están explícitamente bloqueadas por el backend (source of truth de autorización).

### Related Domain Concepts

* `AdminAction` (acción `view_event`, append-only).
* Read-only access para el rol Admin sobre `Event`.
* Visibilidad transversal admin sobre eventos de organizadores.

### Assumptions

* El listado admin de eventos se cubre en US-078 (PB-P1-010 también).
* Esta historia cubre exclusivamente la vista de detalle de UN evento por admin.
* El rol Admin ya está provisto por EPIC-AUTH-001 / PB-P1-007.
* La pista de auditoría `AdminAction` es la fuente canónica de evidencia de acceso admin (no se envían notificaciones al organizador en MVP).

### Dependencies

* EPIC-AUTH-001 — rol Admin y sesión autenticada (PB-P1-007).
* EPIC-ADM-001 — entidad `AdminAction` (PB-P0-001 / PB-P1-007).
* US-078 — Admin list events (read-only), proporciona la navegación al detalle.

---

## 🔗 Traceability

| Source                 | Reference                                                  |
| ---------------------- | ---------------------------------------------------------- |
| Backlog Item           | PB-P1-010                                                  |
| FRD Requirement(s)     | FR-EVENT-013                                               |
| Use Case(s)            | UC-ADMIN-002                                               |
| Business Rule(s)       | BR-EVENT-014                                               |
| Permission Rule(s)     | Admin only; read-only; writes 403                          |
| Data Entity / Entities | `Event`, `AdminAction`                                     |
| API Endpoint(s)        | `GET /api/v1/admin/events/:id`                             |
| NFR Reference(s)       | NFR-OBS-001                                                |
| Related ADR(s)         | ADR-API-001 (REST conventions), ADR-SEC-002 (sesión segura — transversal) |
| PO Decision(s)         | Decisión PO 8.1 #16                                        |
| Related Document(s)    | `/docs/8.1` (#16), `/docs/4` (BR-EVENT-014), `/docs/19` (admin read-only), `/docs/6` (`AdminActionType.view_event`), `/docs/18` (`admin_actions`, enum), `/docs/10` (NFR-OBS-001) |

---

## 🧩 PO/BA Decisions Applied

1. **Decisión PO 8.1 #16** — El admin tiene acceso de solo lectura a eventos para demo, soporte y gobernanza. No puede editar. Cada acceso al detalle se registra como `AdminAction(action='view_event')`. Estado: Resuelta.
2. **BR-EVENT-014** — Visibilidad admin sobre eventos sin permisos de modificación; registro en `AdminAction` al ingresar al detalle.
3. **No notificación al organizador en MVP** — La lectura admin no dispara aviso al organizador (queda como nota futura).
4. **Eventos eliminados (soft delete)** — El admin puede ver el detalle con banner "Eliminado"; no se ofrece restauración en MVP.
5. **Endpoint dedicado** — Se utiliza `GET /api/v1/admin/events/:id` para el detalle, complementando el listado `GET /api/v1/admin/events` (US-078).

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* Edición, cancelación o borrado admin sobre eventos.
* Suplantación de identidad (sign-in as).
* Restauración de eventos `soft-deleted`.
* Notificación al organizador cuando el admin consulta su evento.
* Exportación/descarga del detalle.

### Scope Notes

* No introduce capacidades de escritura admin.
* No introduce nuevas entidades de dominio; reutiliza `Event` y `AdminAction`.
* La frecuencia de registro `view_event` es por apertura del detalle (no por re-render del cliente).

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Lectura admin con auditoría

**Given** un admin autenticado con sesión válida
**When** abre el detalle de un evento por `eventId` válido
**Then** el backend devuelve `200` con la representación read-only del evento
**And** inserta `AdminAction { action='view_event', target_event_id=<eventId>, actor_user_id=<admin.id>, correlation_id=<request.correlationId>, timestamp=<server-now> }`
**And** el registro de auditoría persiste aunque ocurra un error de render en el cliente.

### AC-02: Acciones de escritura bloqueadas

**Given** un admin viendo el evento
**When** intenta `PATCH /api/v1/admin/events/:id`, `DELETE /api/v1/admin/events/:id` o cualquier acción de cancelación admin
**Then** el backend responde `403 FORBIDDEN` con envelope de error unificado
**And** no se modifica el `Event`
**And** no se registra una mutación.

### AC-03: UI marca el modo lectura

**Given** un admin viendo el detalle
**When** la página se renderiza
**Then** se muestra un badge "Modo lectura"
**And** los campos del evento se renderizan como `readonly`
**And** no se muestran controles primarios de edición ni de cancelación.

---

## ⚠️ Edge Cases

### EC-01: Evento eliminado (soft delete)

**Given** un evento con `deleted_at IS NOT NULL`
**When** el admin abre `/admin/events/:id`
**Then** el backend devuelve `200` con los datos básicos y la marca `deleted=true`
**And** la UI muestra un banner "Eliminado"
**And** no se ofrece acción de restauración (fuera de alcance MVP)
**And** se registra `AdminAction(action='view_event')` igualmente.

#### Handling

* UI bloquea cualquier acción y muestra solo navegación de retorno.

### EC-02: Evento inexistente

**Given** un `eventId` con formato válido que no existe
**When** el admin abre el detalle
**Then** el backend devuelve `404 NOT_FOUND` con envelope unificado
**And** no se registra `AdminAction`.

### EC-03: `eventId` con formato inválido

**Given** un parámetro `eventId` que no es UUID v4 válido
**When** el admin intenta abrir el detalle
**Then** el backend devuelve `400 BAD_REQUEST` con envelope unificado
**And** no se registra `AdminAction`.

---

## 🚫 Validation Rules

| ID    | Rule                                          | Message / Behavior                |
| ----- | --------------------------------------------- | --------------------------------- |
| VR-01 | `eventId` debe ser UUID v4                    | `400 BAD_REQUEST` (`VALIDATION`)  |
| VR-02 | La respuesta no incluye campos editables internos sensibles fuera del contrato | Serializador dedicado read-only   |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                |
| ------ | ------------------------------------------------------------------- |
| SEC-01 | Solo el rol `Admin` puede invocar `GET /api/v1/admin/events/:id`.   |
| SEC-02 | Todas las operaciones de escritura admin sobre el evento responden `403`. |
| SEC-03 | Registrar `AdminAction(action='view_event')` por cada lectura del detalle. |
| SEC-04 | El `correlation_id` debe propagarse al log estructurado y al registro `AdminAction`. |

### Negative Authorization Scenarios

* Organizer / Vendor autenticado → `403 FORBIDDEN`.
* Usuario anónimo / sesión inválida → `401 UNAUTHORIZED`.
* Admin autenticado realizando `PATCH` / `DELETE` admin → `403 FORBIDDEN`.

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

| Area                | Notes                                                              |
| ------------------- | ------------------------------------------------------------------ |
| Screen / Route      | `/[locale]/admin/events/:id`                                       |
| Main UI Pattern     | Vista de detalle read-only con badge "Modo lectura"                 |
| Primary Action      | No aplica                                                          |
| Secondary Actions   | "Volver al listado" (vínculo a US-078)                              |
| Empty State         | No aplica (entidad única)                                          |
| Loading State       | Skeleton de detalle                                                |
| Error State         | Banner para `404` / `403` con envelope unificado                    |
| Success State       | Vista cargada con badge "Modo lectura"                              |
| Accessibility Notes | Inputs marcados `aria-readonly="true"`, `aria-live` para banner    |
| Responsive Notes    | Mobile-first                                                       |
| i18n Notes          | 4 locales (es, en, pt, fr); textos en archivo i18n                  |
| Currency Notes      | Mostrar moneda del evento (read-only); no conversión automática     |

---

## 🛠 Technical Notes

### Frontend

* Route / Page:

  * `/[locale]/admin/events/:id`
* Components:

  * `AdminEventViewer` (composición con `EventReadOnlySummary`)
  * Badge `ReadOnlyBadge`
  * Banner `DeletedEventBanner`
* State Management:

  * TanStack Query `useAdminEvent(eventId)`
* Forms:

  * No aplica
* API Client:

  * `adminApi.getEvent(id)`

### Backend

* Use Case / Service:

  * `AdminViewEventUseCase` — orquesta lectura + persistencia `AdminAction` en la misma transacción.
* Controller / Route:

  * `GET /api/v1/admin/events/:id`
* Authorization Policy:

  * Middleware RBAC: solo `Admin`
* Validation:

  * Zod schema con `eventId: uuid`
* Transaction Required:

  * Sí (read `Event` + insert `AdminAction`).

### Database

* Main Tables:

  * `events`, `admin_actions`
* Constraints:

  * `admin_actions` append-only (sin UPDATE/DELETE)
* Index Considerations:

  * Reutilizar índices existentes en `admin_actions(actor_user_id)` y `admin_actions(target_event_id)` definidos por PB-P0-001.

### API

| Method | Endpoint                              | Purpose                       |
| ------ | ------------------------------------- | ----------------------------- |
| GET    | `/api/v1/admin/events/:id`            | Ver evento en read-only       |

### Observability / Audit

* Correlation ID Required: Yes (propagado al log y a `AdminAction`)
* Log Event Required: Yes (`admin.event.view`)
* AdminAction Required: Yes (`view_event`)
* AIRecommendation Required: No

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                  | Type        |
| ----- | --------------------------------------------------------- | ----------- |
| TS-01 | Admin lee evento existente y se registra `view_event`     | Integration |
| TS-02 | Intentos de escritura admin son rechazados con `403`       | API         |
| TS-03 | Admin lee evento `soft-deleted` con banner y auditoría     | Integration |
| TS-04 | Lectura admin sobre evento inexistente → `404` sin auditoría | API         |
| TS-05 | Lectura admin con `eventId` inválido → `400`               | API         |
| TS-06 | E2E con seed (admin abre detalle y lo ve en read-only)    | E2E         |

### Negative Tests

| ID    | Scenario                                              | Expected Result          |
| ----- | ----------------------------------------------------- | ------------------------ |
| NT-01 | Organizer abre `/api/v1/admin/events/:id`             | `403 FORBIDDEN`          |
| NT-02 | Vendor abre `/api/v1/admin/events/:id`                | `403 FORBIDDEN`          |
| NT-03 | Admin intenta `PATCH /api/v1/admin/events/:id`        | `403 FORBIDDEN`          |
| NT-04 | Admin intenta `DELETE /api/v1/admin/events/:id`       | `403 FORBIDDEN`          |
| NT-05 | Petición sin sesión válida                            | `401 UNAUTHORIZED`       |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario           | Expected Result        |
| ---------- | ------------------ | ---------------------- |
| AUTH-TS-01 | Admin autenticado  | `200` + `AdminAction`   |
| AUTH-TS-02 | Organizer          | `403 FORBIDDEN`         |
| AUTH-TS-03 | Anónimo            | `401 UNAUTHORIZED`      |

### Accessibility Tests

* Etiquetas `aria-readonly` accesibles.
* Banner "Eliminado" con `role="status"`.
* Navegación por teclado al botón "Volver al listado".

---

## 📊 Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | Auditabilidad, trazabilidad de soporte               |
| Expected Impact     | Permite soporte sin compromiso de privacidad         |
| Success Criteria    | 100% de lecturas admin del detalle registradas en `AdminAction` |
| Academic Demo Value | Demuestra gobierno y trazabilidad RBAC               |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Página `/[locale]/admin/events/:id` con `AdminEventViewer`.
* Componentes `ReadOnlyBadge` y `DeletedEventBanner`.
* Hook `useAdminEvent` con TanStack Query.
* Mensajería i18n (4 locales).

### Potential Backend Tasks

* Endpoint `GET /api/v1/admin/events/:id`.
* `AdminViewEventUseCase` con transacción (read + insert `AdminAction`).
* Middleware RBAC `Admin`.
* Validación Zod del path param.
* Manejo de `Event` con `deleted_at`.

### Potential Database Tasks

* Verificar índices existentes en `admin_actions` (no se crean nuevos).

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* Tests de integración (TS-01..TS-05).
* Tests E2E (TS-06).
* Tests de autorización negativos (NT-01..NT-05).
* Tests de accesibilidad mínimos.

### Potential DevOps / Config Tasks

* Not applicable for this story.

---

## ✅ Definition of Ready

* [x] Rol claro (Admin).
* [x] Goal/valor claros.
* [x] FRD/UC/BR enlazados (FR-EVENT-013, UC-ADMIN-002, BR-EVENT-014).
* [x] Permisos identificados (Admin read-only + writes 403).
* [x] Entidades listadas (`Event`, `AdminAction`).
* [x] AC en GWT.
* [x] Edge cases documentados (soft delete, not found, UUID inválido).
* [x] Validación clara.
* [x] Out of Scope explícito.
* [x] Dependencias conocidas (PB-P1-007, PB-P0-001, US-078).
* [x] UX states identificados.
* [x] API definida (`GET /api/v1/admin/events/:id`).
* [x] Tests definidos.
* [ ] PO/BA validó.

---

## 🏁 Definition of Done

* [ ] Endpoint `GET /api/v1/admin/events/:id` operativo.
* [ ] `AdminAction(view_event)` persistido por cada lectura del detalle.
* [ ] Vista read-only enforced en backend y frontend.
* [ ] Tests positivos y negativos verdes.
* [ ] Accesibilidad mínima cumplida.
* [ ] PO valida en revisión de demo.

---

## 📝 Notes

* Documentation Alignment Required: el endpoint `GET /api/v1/admin/events/:id` debe agregarse al snapshot de `/docs/16-API-Design-Specification.md`. La decisión funcional ya está formalizada por BR-EVENT-014 y Decisión PO 8.1 #16, por lo que esto se trata como alineación documental y no bloquea la aprobación.
* Documentation Alignment Required: `/docs/9-Functional-Requirements-Document.md` debe reflejar `FR-EVENT-013` como el requisito canónico para la visibilidad admin de eventos (las versiones previas de la US referenciaban IDs incorrectos `FR-ADMIN-005` y `FR-EVENT-014`).
* Documentation Alignment Required: `/docs/4-Business-Rules-Document.md` ya contiene `BR-EVENT-014` correctamente; las versiones previas de la US referenciaban `BR-ADMIN-005` (que aplica a métricas), debe quedar sin esa referencia.
* La lectura del detalle no genera notificación al organizador en MVP (confirmar si se quisiera evaluar a futuro como mejora).
