# 🧾 User Story: Editar mi evento (excepto moneda)

## 🆔 Metadata

| Field              | Value                                |
| ------------------ | ------------------------------------ |
| ID                 | US-010                               |
| Epic               | EPIC-EVT-001 — Organizer Event Management |
| Backlog Item       | PB-P1-007 — Ciclo de vida del evento (edit / cancel / soft delete) |
| Feature            | Edición de evento propio             |
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

**As an** organizador autenticado, dueño del evento
**I want** editar los datos de mi evento (fecha, número de invitados, ciudad/país, presupuesto estimado, idioma y notas) excepto la moneda, mientras el evento esté en estado `draft` o `active`
**So that** mantenga la información alineada con los cambios de la planificación sin romper la integridad histórica del evento

---

## 🧠 Business Context

### Context Summary

La edición permite ajustar campos del evento que cambian durante la planificación: fecha, invitados, ubicación, presupuesto estimado, idioma del evento y notas. La moneda es **inmutable post-creación** (Decisión PO 8.1 #7; BR-EVENT-007). El admin nunca edita eventos del organizador (Decisión PO 8.1 #16; BR-EVENT-014). Los estados `completed` y `cancelled` son terminales y bloquean ediciones (BR-EVENT-005).

Cuando cambia `event_date`, las tareas IA con fechas relativas (T-180, T-90, T-30, T-7, T-1) deben recalcularse (BR-TASK-006), **preservando los overrides manuales del usuario** sobre tareas que ya fueron modificadas (Decisión PO documentada en PB-P1-007 notes para US-010).

### Related Domain Concepts

* `Event` lifecycle (`draft`, `active`, `completed`, `cancelled`).
* Inmutabilidad de `currency_code` (BR-EVENT-007).
* Ownership absoluta (BR-EVENT-002).
* `EventTask.due_date` derivada de `event_date` cuando es IA (BR-TASK-006).

### Assumptions

* Los campos `status`, `owner_user_id`, `currency_code`, `id`, `created_at` son derivados o inmutables y nunca aceptados en el payload.
* La edición de `event_date` dispara el recálculo asíncrono o síncrono de fechas absolutas de tareas IA respetando overrides manuales.
* El idioma puede cambiar; futuros prompts IA usarán el nuevo idioma (BR-EVENT-008, BR-AI-011).

### Dependencies

* US-009 (creación del evento) — debe estar entregada.
* PB-P0-001 — schema base de `events` y `event_tasks`.
* PB-P1-011..PB-P1-014 — generación de tareas IA con fechas relativas (la lógica de recálculo se ejerce sólo si ya existen tareas IA).

---

## 🧷 PO/BA Decisions Applied

| Decisión | Fuente | Aplicación en esta US |
| --- | --- | --- |
| Moneda inmutable post-creación | Decisión PO 8.1 #7; BR-EVENT-007 | VR-04, EC-01, SEC-04. El DTO `.strict()` rechaza `currency_code`. |
| Admin no edita eventos del organizador | Decisión PO 8.1 #16; BR-EVENT-014 | SEC-02, NT-04, AUTH-TS-03. |
| Sólo el owner edita | BR-EVENT-002; FR-EVENT-004 | SEC-01, NT-02. |
| Estados terminales bloquean edición | BR-EVENT-005; FR-EVENT-005 | AC-03, NT-03 (`409 EVENT_LOCKED`). |
| Recálculo de tareas IA al cambiar `event_date` preservando overrides manuales | Decisión PO US-010 (PB-P1-007 notes); BR-TASK-006 | AC-02, EC-02. |

---

## 🔗 Traceability

| Source                 | Reference                                |
| ---------------------- | ---------------------------------------- |
| Backlog Item           | PB-P1-007 — Ciclo de vida del evento (edit / cancel / soft delete) |
| Epic                   | EPIC-EVT-001 — Organizer Event Management |
| FRD Requirement(s)     | FR-EVENT-004, FR-EVENT-005, FR-EVENT-010, FR-EVENT-014 |
| Use Case(s)            | UC-EVENT-002                              |
| Business Rule(s)       | BR-EVENT-002, BR-EVENT-005, BR-EVENT-007, BR-EVENT-008, BR-EVENT-014, BR-TASK-006 |
| Permission Rule(s)     | Ownership: sólo el `owner_user_id` edita; admin read-only |
| Data Entity / Entities | `Event`, `EventTask` (recálculo de `due_date`) |
| API Endpoint(s)        | `PATCH /api/v1/events/:id`                |
| NFR Reference(s)       | NFR-PERF-001                              |
| Related ADR(s)         | ADR-BE-003 (reglas en Application/Domain — inmutabilidad de moneda) |
| Related Document(s)    | `/docs/8.1` #7 #16; `/docs/8` UC-EVENT-002; `/docs/6` C-006 |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* Cambio de `currency_code` (BR-EVENT-007).
* Cambio de `owner_user_id` y reasignación de propiedad.
* Edición por admin (admin tiene solo lectura — BR-EVENT-014).
* Historial completo de cambios / audit trail extendido (audit log básico `event.updated` es suficiente).
* Re-aprobación o flujo de revisión por cambios.
* Cambio masivo de `event_type_code` (queda como Future si se solicitara).
* Cancelación y soft delete (US-011 y US-012 dentro de PB-P1-007).
* Edición optimista con resolución de conflictos avanzada (sólo guard básico de versión recomendado).

### Scope Notes

* No introduce notificaciones a otros stakeholders por la edición.
* No introduce pagos ni contratos.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Edición exitosa de campos permitidos

**Given** un evento `draft` o `active` cuyo `owner_user_id` coincide con el organizador autenticado
**When** envía `PATCH /api/v1/events/:id` con cualquier subconjunto de `{event_date, estimated_guests, city, country_code, estimated_budget, language_code, notes}`
**Then** el backend actualiza sólo los campos enviados, conserva `currency_code`, retorna `200 OK` con el `EventResponseDTO` actualizado.

### AC-02: Recálculo de tareas IA al cambiar `event_date` preservando overrides manuales

**Given** un evento con tareas IA con fechas relativas (T-180, T-90, T-30, T-7, T-1)
**When** el organizador cambia `event_date` y guarda
**Then** el sistema recalcula `EventTask.due_date` para tareas IA cuyo `due_date` no fue modificado manualmente; las tareas con `manual_override=true` conservan su `due_date` actual.

### AC-03: Edición bloqueada en estados terminales

**Given** un evento en `completed` o `cancelled`
**When** intenta editar
**Then** retorna `409 EVENT_LOCKED`.

### AC-04: Cambio de idioma propaga a futuras llamadas IA

**Given** un evento con `language_code = es-LATAM`
**When** el organizador cambia `language_code = pt`
**Then** se persiste el nuevo idioma y futuras invocaciones IA usan `pt` (BR-AI-011); las tareas previas conservan su contenido.

---

## ⚠️ Edge Cases

### EC-01: Intento de cambiar `currency_code`

**Given** el payload incluye `currency_code`
**When** se procesa
**Then** el backend responde `400 IMMUTABLE_FIELD` (consistente con la política `.strict()` del DTO).

#### Handling

* DTO Zod `.strict()` rechaza explícitamente; no se aplica whitelist silenciosa para evitar cambios fantasma.

---

### EC-02: Cambio de fecha con tareas con override manual

**Given** el evento tiene tareas IA con `due_date` ajustadas manualmente por el organizador
**When** se cambia `event_date`
**Then** el recálculo respeta `manual_override=true` y sólo actualiza las tareas IA sin override.

#### Handling

* Bandera `manual_override` se setea cuando el usuario edita explícitamente el `due_date` de una tarea (US-018 / PB-P1-018).
* Si la bandera no existe aún (US-018 no entregada), todas las tareas IA se recalculan; documentar el comportamiento esperado.

---

### EC-03: Edición concurrente del mismo evento

**Given** dos pestañas del mismo organizador cargan el evento, modifican y guardan
**When** la segunda guarda
**Then** comportamiento MVP: "last writer wins" (no se implementa control optimista de versión); documentar y mostrar el dato actualizado al recargar.

#### Handling

* Sin lock optimista en MVP; documentado en Notes para evolución futura.

---

## 🚫 Validation Rules

| ID    | Rule                                          | Message / Behavior                |
| ----- | --------------------------------------------- | --------------------------------- |
| VR-01 | `event_date` futura en formato ISO 8601 (si se envía) | "Fecha inválida o pasada"   |
| VR-02 | `estimated_guests` entero en rango [1, 10000] (si se envía) | "Número de invitados inválido" |
| VR-03 | `estimated_budget` numérico ≥ 0 (si se envía) | "Presupuesto inválido"            |
| VR-04 | `currency_code` no editable; `.strict()` rechaza el campo | `400 IMMUTABLE_FIELD`     |
| VR-05 | `language_code` ∈ {es-LATAM, es-ES, pt, en} (si se envía) | "Idioma no soportado"        |
| VR-06 | `city` no vacío y ≤ 120 caracteres (si se envía) | "Ubicación inválida"          |
| VR-07 | `country_code` ISO 3166-1 alpha-2 (si se envía) | "País inválido"                |
| VR-08 | `notes` ≤ 500 caracteres (si se envía)        | "Notas demasiado largas"          |
| VR-09 | Payload no acepta `status`, `owner_user_id`, `id`, `event_type_code` | `400 IMMUTABLE_FIELD` |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                |
| ------ | ------------------------------------------------------------------- |
| SEC-01 | Ownership policy enforced en backend: sólo `owner_user_id == session.userId` (BR-EVENT-002). |
| SEC-02 | Admin no puede editar (Decisión PO 8.1 #16); retorna `403 FORBIDDEN`. |
| SEC-03 | DTO `.strict()` con whitelist explícita de campos editables.        |
| SEC-04 | `currency_code` declarado inmutable y rechazado en el DTO.          |
| SEC-05 | Log estructurado `event.updated` con `correlation_id`, `owner_user_id`, `event_id`, campos modificados (sin valores PII). |

### Negative Authorization Scenarios

* Otro organizador autenticado intenta editar un evento ajeno → `404 NOT_FOUND` (para no filtrar existencia) o `403 FORBIDDEN` según convención del proyecto; aplicar `404` por consistencia con ownership opaco.
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

| Area                | Notes                                                       |
| ------------------- | ----------------------------------------------------------- |
| Screen / Route      | `/[locale]/organizer/events/:id/edit`                       |
| Main UI Pattern     | Formulario con campos editables y `currency_code` mostrado como readonly con tooltip explicativo |
| Primary Action      | "Guardar cambios"                                           |
| Secondary Actions   | "Cancelar" (descarta y vuelve al dashboard)                 |
| Empty State         | No aplica                                                   |
| Loading State       | Spinner en submit; skeleton al cargar el evento             |
| Error State         | Mensaje inline por campo + banner de error de API           |
| Success State       | Toast + retorno al dashboard del evento                     |
| Accessibility Notes | Labels claros, `aria-describedby` en errores, foco al primer error |
| Responsive Notes    | Mobile-first                                                |
| i18n Notes          | 4 locales soportados                                        |
| Currency Notes      | Mostrar moneda como readonly con tooltip "La moneda se fija al crear el evento y no se puede cambiar" |
| Confirmación de fecha | Si el cambio de fecha afecta tareas IA, mostrar modal informativo "Las fechas relativas de tus tareas IA se recalcularán; las tareas que editaste manualmente se conservarán" |

---

## 🛠 Technical Notes

### Frontend

* Route / Page:

  * `/[locale]/organizer/events/:id/edit`
* Components:

  * `EventEditForm`, `CurrencyReadonlyField`, `RecalcConfirmationDialog`
* State Management:

  * React Hook Form + Zod, TanStack mutation `useUpdateEvent`
* Forms:

  * `currency_code` readonly; submit envía sólo campos modificados (`dirtyFields`).
* API Client:

  * `eventsApi.update(id, payload)`

### Backend

* Use Case / Service:

  * `UpdateEventUseCase` con whitelist explícita y orquestación de recálculo.
  * `RecalculateEventTaskDueDatesService` para tareas IA sin override manual.
* Controller / Route:

  * `PATCH /api/v1/events/:id`
* Authorization Policy:

  * Ownership + status `draft|active`; admin rechazado por role guard.
* Validation:

  * `UpdateEventDTO` Zod `.strict()` con campos opcionales y enums consistentes con `CreateEventDTO`.
* Transaction Required:

  * Sí: actualización de `Event` + recálculo de `EventTask.due_date` en la misma transacción (`prisma.$transaction`).

### Database

* Main Tables:

  * `events`, `event_tasks`
* Constraints:

  * `currency_code` inmutable enforced en Application/Domain (ADR-BE-003); opcional check de actualización a nivel DB.
* Index Considerations:

  * Reusar `idx_events_owner_user_id` y, si existe, `(event_id, due_date)` para `event_tasks` (definido en PB-P1-018 o seed base).

### API

| Method | Endpoint                          | Purpose          |
| ------ | --------------------------------- | ---------------- |
| PATCH  | `/api/v1/events/:id`              | Actualizar campos permitidos del evento |

### Observability / Audit

* Correlation ID Required: Yes
* Log Event Required: Yes — `event.updated` con `correlation_id`, `owner_user_id`, `event_id`, lista de claves modificadas (`changed_fields`), número de tareas recalculadas (`recalculated_tasks_count`).
* AdminAction Required: No
* AIRecommendation Required: No

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                              | Type        |
| ----- | ----------------------------------------------------- | ----------- |
| TS-01 | Update válido en `draft` (todos los campos permitidos) | Integration |
| TS-02 | Update válido en `active`                              | Integration |
| TS-03 | Cambio de `event_date` recalcula tareas IA preservando overrides manuales | Integration |
| TS-04 | E2E desde el dashboard del evento                      | E2E         |
| TS-05 | `currency_code` mostrado como readonly en UI           | E2E         |
| TS-06 | Cambio de `language_code` se persiste y queda disponible para futuras llamadas IA | Integration |

### Negative Tests

| ID    | Scenario                              | Expected Result          |
| ----- | ------------------------------------- | ------------------------ |
| NT-01 | Payload con `currency_code`           | `400 IMMUTABLE_FIELD`    |
| NT-02 | Otro organizador edita evento ajeno   | `404 NOT_FOUND`          |
| NT-03 | Edición en estado `completed` o `cancelled` | `409 EVENT_LOCKED`  |
| NT-04 | Admin intenta editar                  | `403 FORBIDDEN`          |
| NT-05 | Vendor intenta editar                 | `403 FORBIDDEN`          |
| NT-06 | Anónimo                               | `401 UNAUTHENTICATED`    |
| NT-07 | Payload con `status`, `owner_user_id`, `id` | `400 IMMUTABLE_FIELD` |
| NT-08 | `event_date` en el pasado             | `400 VALIDATION_ERROR`   |
| NT-09 | `language_code` fuera del catálogo    | `400 UNSUPPORTED_LANGUAGE` |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario                          | Expected Result |
| ---------- | --------------------------------- | --------------- |
| AUTH-TS-01 | Dueño edita evento propio         | 200 OK          |
| AUTH-TS-02 | Otro organizador                  | 404 NOT_FOUND   |
| AUTH-TS-03 | Admin                             | 403 FORBIDDEN   |
| AUTH-TS-04 | Vendor                            | 403 FORBIDDEN   |
| AUTH-TS-05 | Anónimo                           | 401 UNAUTHENTICATED |

### Accessibility Tests

* Form completamente navegable por teclado.
* Errores asociados a su input mediante `aria-describedby`.
* Tooltip de moneda accesible por teclado.

### Seed / Demo

* Reutiliza el seed de US-009 (6 `EventType` activos) y, opcionalmente, un evento `active` con tareas IA para validar el recálculo en demo.

---

## 📊 Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | Calidad de datos del evento                          |
| Expected Impact     | Permite mantener el evento actualizado sin recrearlo |
| Success Criteria    | Tasa de update exitosa > 99% en demo                 |
| Academic Demo Value | Demuestra ownership, inmutabilidad y recálculo de tareas IA |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* `EventEditForm` con campos editables y `currency_code` readonly.
* Mutation `useUpdateEvent` y manejo de errores `IMMUTABLE_FIELD`, `EVENT_LOCKED`.
* Diálogo informativo de recálculo al cambiar fecha.

### Potential Backend Tasks

* `UpdateEventUseCase` con whitelist y enforcement de status.
* `RecalculateEventTaskDueDatesService` que respeta `manual_override`.
* Ownership policy reutilizable.
* DTO `UpdateEventDTO` Zod `.strict()`.

### Potential Database Tasks

* Verificar columna `EventTask.manual_override` (definida o pendiente de otra US — registrar dependencia con US-018).

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* Tests positivos (TS-01..TS-06) y negativos (NT-01..NT-09).
* E2E del formulario.
* Tests de autorización.

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
* [x] Decisiones PO 8.1 #7 y #16 aplicadas; Decisión PO US-010 (override manual) aplicada.
* [ ] PO/BA valida (pendiente del Approval Gate).

---

## 🏁 Definition of Done

* [ ] Endpoint `PATCH /api/v1/events/:id` y formulario operativos.
* [ ] `currency_code` rechazado por el DTO con `400 IMMUTABLE_FIELD`.
* [ ] Recálculo de tareas IA preserva `manual_override`.
* [ ] Tests TS-01..TS-06 y NT-01..NT-09 verdes en CI.
* [ ] E2E del formulario verde en CI.
* [ ] PO valida la demo.

---

## 📝 Notes

* Si `EventTask.manual_override` aún no existe (depende de la entrega de US-018 / PB-P1-018), el recálculo se aplica a todas las tareas IA y se documenta como comportamiento provisional.
* Edición concurrente sin control optimista de versión en MVP; considerar `If-Match` con `updated_at` como evolución futura.
* Audit trail extendido (timeline de cambios) queda fuera de alcance del MVP; el log `event.updated` con `changed_fields` cubre la necesidad de auditoría básica.
