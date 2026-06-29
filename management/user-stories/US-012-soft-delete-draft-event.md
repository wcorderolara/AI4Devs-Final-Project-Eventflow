# 🧾 User Story: Eliminar mi evento en estado draft (soft delete)

## 🆔 Metadata

| Field              | Value                                |
| ------------------ | ------------------------------------ |
| ID                 | US-012                               |
| Epic               | EPIC-EVT-001 — Organizer Event Management |
| Backlog Item       | PB-P1-007 — Ciclo de vida del evento (edit / cancel / soft delete) |
| Feature            | Soft delete de evento `draft`         |
| Module / Domain    | Events                               |
| User Role          | Organizer                            |
| Priority           | Should Have                          |
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

**As an** organizador autenticado, dueño de un evento en estado `draft`
**I want** eliminar (soft delete) ese evento que aún no activé
**So that** no aparezca en mi listado ni interfiera con las métricas, manteniendo el dato preservado para trazabilidad administrativa

---

## 🧠 Business Context

### Context Summary

El soft delete de eventos en `draft` permite al organizador limpiar borradores que no llegaron a activarse. Es **soft delete** (marca `Event.deleted_at`) y no físico, para preservar trazabilidad y métricas administrativas. Para eventos `active` o `completed` se utiliza cancel (US-011); el hard delete está prohibido por BR-EVENT-010 / BR-ADMIN-011.

### Related Domain Concepts

* `Event.deleted_at` (soft delete; ver `docs/6` C-060).
* Lifecycle del evento (`draft → active → completed | cancelled`; BR-EVENT-005).
* Listado del organizador filtra `deleted_at IS NULL` (FR-EVENT-007).
* Vista admin solo lectura (FR-EVENT-010; BR-EVENT-014).

### Assumptions

* La eliminación es **irreversible self-service**; la restauración por admin no se entrega en MVP.
* No hay purga automática de soft-deleted en MVP; el comportamiento futuro queda como Future.
* No requiere confirmación adicional más allá del modal estándar (no se exige texto repetido como en cancel, porque el impacto es menor).

### Dependencies

* US-009 (creación del evento).
* US-013 / PB-P1-008 (listado y dashboard del organizador) — quien consume el filtro `deleted_at IS NULL`.
* PB-P0-001 — schema base con `Event.deleted_at`.

---

## 🧷 PO/BA Decisions Applied

| Decisión | Fuente | Aplicación en esta US |
| --- | --- | --- |
| Soft delete sólo en `draft`; `active`/`completed` se cancelan | FR-EVENT-012; BR-EVENT-010 | AC-01, EC-01, VR-01. |
| Admin no elimina ni edita eventos del organizador | Decisión PO 8.1 #16; BR-EVENT-014 | SEC-02, NT-03 (`403`). |
| Hard delete prohibido | BR-EVENT-010; BR-PRIVACY-011 | Out of Scope explícito; SEC-04. |
| Ownership opaque (404) para evento ajeno | Patrón aplicado en US-010/US-011 | NT-02. |
| Listado excluye `deleted_at != null` | FR-EVENT-007 | AC-02. |

---

## 🔗 Traceability

| Source                 | Reference                                |
| ---------------------- | ---------------------------------------- |
| Backlog Item           | PB-P1-007 — Ciclo de vida del evento (edit / cancel / soft delete) |
| Epic                   | EPIC-EVT-001 — Organizer Event Management |
| FRD Requirement(s)     | FR-EVENT-012, FR-EVENT-007, FR-EVENT-010 |
| Use Case(s)            | UC-EVENT-006                              |
| Business Rule(s)       | BR-EVENT-005, BR-EVENT-010, BR-EVENT-014 |
| Permission Rule(s)     | Ownership (BR-EVENT-002); admin read-only (BR-EVENT-014) |
| Data Entity / Entities | `Event`                                   |
| API Endpoint(s)        | `DELETE /api/v1/events/:id`               |
| NFR Reference(s)       | NFR-PERF-001                              |
| Related ADR(s)         | ADR-BE-003 (reglas en Application/Domain) |
| Related Document(s)    | `/docs/6` C-060; `/docs/8` UC-EVENT-006; `/docs/8.1` #16 |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Should Have

### Explicitly Out of Scope

* Hard delete físico (BR-EVENT-010, BR-PRIVACY-011).
* Eliminación (soft o hard) de eventos en `active`, `completed` o `cancelled`.
* Papelera de reciclaje o vista del organizador para restaurar.
* Restauración self-service por el organizador.
* Restauración por admin (queda como Future si se necesita).
* Purga automática de soft-deleted tras N días (Future).
* Cascada sobre `EventTask`/`QuoteRequest`/`BookingIntent` (no aplican porque `draft` no tiene esas entidades activas; ver Notes).

### Scope Notes

* No introduce IA.
* No introduce notificaciones.
* No genera `AdminAction`.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Soft delete exitoso desde `draft`

**Given** un evento en estado `draft` cuyo `owner_user_id` coincide con el organizador autenticado
**When** el organizador confirma la eliminación
**Then** el backend persiste `Event.deleted_at = now()` y `Event.deleted_by = session.userId`, retorna `204 No Content`, y el evento deja de aparecer en `GET /api/v1/events`.

### AC-02: Listado del organizador excluye eliminados

**Given** un organizador con eventos, algunos con `deleted_at != null`
**When** consulta `GET /api/v1/events`
**Then** la respuesta omite los eventos con `deleted_at != null` (FR-EVENT-007).

### AC-03: GET por ID también excluye eliminados para el organizador

**Given** un evento eliminado del organizador
**When** consulta `GET /api/v1/events/:id`
**Then** retorna `404 NOT_FOUND` (consistencia con ownership opaque).

---

## ⚠️ Edge Cases

### EC-01: Evento no en `draft`

**Given** un evento en estado `active`, `completed` o `cancelled`
**When** se intenta `DELETE`
**Then** retorna `409 INVALID_STATE` con mensaje "Solo se pueden eliminar eventos en estado borrador". La sugerencia para `active` es usar cancel (US-011).

#### Handling

* La verificación se hace en el use case antes de cualquier mutación.

---

### EC-02: Doble click sobre el mismo evento

**Given** dos requests simultáneos de eliminación
**When** se procesan
**Then** sólo el primero ejecuta el soft delete; el segundo retorna `404 NOT_FOUND` (porque el evento ya no es visible para el organizador).

#### Handling

* El use case usa lectura del estado actual del evento dentro de la transacción.

---

### EC-03: Admin lista eventos incluyendo soft-deleted

**Given** un admin consulta el listado administrativo (read-only)
**When** se aplica FR-EVENT-010 / BR-EVENT-014
**Then** el listado del admin **sí** incluye eventos `deleted_at != null` marcados claramente como tales para fines de gobernanza.

#### Handling

* El endpoint admin (definido en US separadas) lee con un filtro distinto; documentado para evitar confusiones con AC-02.

---

## 🚫 Validation Rules

| ID    | Rule                                          | Message / Behavior            |
| ----- | --------------------------------------------- | ----------------------------- |
| VR-01 | `Event.status == 'draft'` y `deleted_at IS NULL` | `409 INVALID_STATE` si no |
| VR-02 | Confirmación obligatoria en el frontend (modal) | Bloqueo UX |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                |
| ------ | ------------------------------------------------------------------- |
| SEC-01 | Ownership opaque enforced: `event.owner_user_id == session.userId`, sino `404 NOT_FOUND`. |
| SEC-02 | Admin no puede eliminar (BR-EVENT-014); `403 FORBIDDEN`. |
| SEC-03 | Vendor y anónimo rechazados (`403`/`401`). |
| SEC-04 | Soft delete obligatorio; el endpoint nunca ejecuta hard delete. |
| SEC-05 | Log estructurado `event.deleted` con `correlation_id`, `event_id`, `owner_user_id`. |

### Negative Authorization Scenarios

* Otro organizador → `404 NOT_FOUND`.
* Admin → `403 FORBIDDEN`.
* Vendor → `403 FORBIDDEN`.
* Anónimo → `401 UNAUTHENTICATED`.

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

| Area                | Notes                                              |
| ------------------- | -------------------------------------------------- |
| Screen / Route      | `/[locale]/organizer/events`                       |
| Main UI Pattern     | Acción "Eliminar borrador" en el listado + modal de confirmación |
| Primary Action      | "Eliminar borrador"                                |
| Secondary Actions   | "Cancelar"                                         |
| Empty State         | No aplica                                          |
| Loading State       | Spinner en el botón destructivo                     |
| Error State         | Toast con código mapeado                            |
| Success State       | Toast + actualización del listado sin el evento     |
| Accessibility Notes | Modal con trampa de foco y retorno al disparador    |
| Responsive Notes    | Mobile-first                                       |
| i18n Notes          | 4 locales soportados                                |
| Currency Notes      | No aplica                                          |

---

## 🛠 Technical Notes

### Frontend

* Route / Page:

  * `/[locale]/organizer/events`
* Components:

  * `DeleteDraftDialog`
* State Management:

  * TanStack mutation `useDeleteEvent`; invalidación del listado.
* Forms:

  * Confirmación simple (no doble paso).
* API Client:

  * `eventsApi.remove(id)`

### Backend

* Use Case / Service:

  * `SoftDeleteEventUseCase`
* Controller / Route:

  * `DELETE /api/v1/events/:id`
* Authorization Policy:

  * Role guard `Organizer` + ownership opaque + `status == 'draft'`.
* Validation:

  * Estado y `deleted_at IS NULL`.
* Transaction Required:

  * No (única tabla `events`).

### Database

* Main Tables:

  * `events`
* Constraints:

  * `Event.deleted_at` nullable; `Event.deleted_by` opcional (FK opcional a `users.id`).
* Index Considerations:

  * Índice parcial `idx_events_active_owner ON events (owner_user_id) WHERE deleted_at IS NULL` para acelerar el listado del organizador (referenciado por US-013).

### API

| Method | Endpoint                          | Purpose                |
| ------ | --------------------------------- | ---------------------- |
| DELETE | `/api/v1/events/:id`              | Soft delete del evento `draft` |

### Observability / Audit

* Correlation ID Required: Yes
* Log Event Required: Yes (`event.deleted` con `correlation_id`, `event_id`, `owner_user_id`).
* AdminAction Required: No
* AIRecommendation Required: No

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                  | Type        |
| ----- | ----------------------------------------- | ----------- |
| TS-01 | Soft delete en `draft` retorna 204         | Integration |
| TS-02 | `GET /api/v1/events` excluye soft-deleted  | API         |
| TS-03 | `GET /api/v1/events/:id` retorna 404 tras delete | API |
| TS-04 | E2E con modal de confirmación              | E2E         |

### Negative Tests

| ID    | Scenario                              | Expected Result          |
| ----- | ------------------------------------- | ------------------------ |
| NT-01 | Evento en `active`                    | `409 INVALID_STATE`      |
| NT-02 | Otro organizador                      | `404 NOT_FOUND`          |
| NT-03 | Admin                                 | `403 FORBIDDEN`          |
| NT-04 | Vendor                                | `403 FORBIDDEN`          |
| NT-05 | Anónimo                               | `401 UNAUTHENTICATED`    |
| NT-06 | Doble click / DELETE sobre `deleted_at != null` | `404 NOT_FOUND` |
| NT-07 | Cuerpo del request no vacío           | Aceptado (DELETE ignora body) o `400 VALIDATION_ERROR` según convención de la plataforma |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario                          | Expected Result |
| ---------- | --------------------------------- | --------------- |
| AUTH-TS-01 | Dueño elimina `draft`             | 204 No Content  |
| AUTH-TS-02 | Otro organizador                  | 404 NOT_FOUND   |
| AUTH-TS-03 | Admin                             | 403 FORBIDDEN   |
| AUTH-TS-04 | Vendor                            | 403 FORBIDDEN   |
| AUTH-TS-05 | Anónimo                           | 401 UNAUTHENTICATED |

### Accessibility Tests

* Modal con trampa de foco y retorno al disparador.
* Botón destructivo claramente diferenciado.
* `aria-describedby` para el texto del modal.

### Seed / Demo

* Reusa el seed de PB-P1-006 (US-009) y, opcionalmente, asegurar al menos un evento `draft` para mostrar el flujo de eliminación en el demo.

---

## 📊 Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | Calidad de datos del workspace del organizador        |
| Expected Impact     | UX más limpia, listado focalizado en eventos activos  |
| Success Criteria    | Listado del organizador omite el 100% de los soft-deleted |
| Academic Demo Value | Demuestra reglas de estado y soft delete reversible (a nivel datos) |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Acción "Eliminar borrador" en `EventCard` o fila del listado.
* `DeleteDraftDialog` accesible.
* Mutation `useDeleteEvent` con invalidación del listado.

### Potential Backend Tasks

* `SoftDeleteEventUseCase`.
* `EventPrismaRepository.softDelete(eventId, deletedBy)`.
* Filtro `deleted_at IS NULL` en `ListMyEventsUseCase` (si no estaba, queda para PB-P1-008).
* Endpoint `DELETE /api/v1/events/:id`.

### Potential Database Tasks

* Verificar columnas `deleted_at` y opcionalmente `deleted_by` en `events`.
* Índice parcial `idx_events_active_owner`.

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* Tests positivos (TS-01..TS-04), negativos (NT-01..NT-07) y autorización (AUTH-TS-01..05).

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
* [x] Decisiones PO 8.1 #16 y FR-EVENT-012 aplicadas.
* [ ] PO/BA valida (pendiente del Approval Gate).

---

## 🏁 Definition of Done

* [ ] Endpoint `DELETE /api/v1/events/:id` operativo con soft delete.
* [ ] `GET /api/v1/events` excluye `deleted_at != null`.
* [ ] `GET /api/v1/events/:id` retorna 404 para soft-deleted.
* [ ] Tests TS-01..TS-04 y NT-01..NT-07 verdes en CI.
* [ ] PO valida la demo.

---

## 📝 Notes

* La política de purga automática (hard delete diferido tras N días) queda como Future; documentar la decisión si se incorpora.
* Para `active`/`completed`/`cancelled`, US-011 (cancel) y los jobs T+2 (US-014) cubren las rutas correctas; el modal del listado puede orientar al organizador hacia esas acciones.
* La cascada sobre tareas/quotes/bookings no aplica en `draft` porque esas entidades no se generan hasta el paso a `active`; si en una iteración futura `draft` admite generación parcial, replantear esta US.
