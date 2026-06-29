# 🧾 User Story: Cancelar mi evento

## 🆔 Metadata

| Field              | Value                                |
| ------------------ | ------------------------------------ |
| ID                 | US-011                               |
| Epic               | EPIC-EVT-001 — Organizer Event Management |
| Backlog Item       | PB-P1-007 — Ciclo de vida del evento (edit / cancel / soft delete) |
| Feature            | Cancelación de evento propio         |
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

**As an** organizador autenticado, dueño de un evento en estado `draft` o `active`
**I want** cancelar mi evento de forma explícita y con confirmación
**So that** detenga el flujo de planificación y notifique a los proveedores con cotizaciones/booking activos asociados, sin penalización en plataforma

---

## 🧠 Business Context

### Context Summary

La cancelación permite cerrar un evento que ya no se realizará. Transiciona el `Event.status` a `cancelled` (BR-EVENT-005, BR-EVENT-010) y dispara una cascada controlada sobre las entidades activas asociadas:

* `QuoteRequest` en estados `sent`, `viewed`, `responded` → `cancelled` (BR-QUOTE-005, FR-QUOTE-006).
* `Quote` activas → marcadas como `cancelled` (alineadas con la `QuoteRequest`).
* `BookingIntent` en `pending` o `confirmed_intent` → `cancelled` con `cancelled_by='system_event_cancel'`, `cancellation_reason='event_cancelled'`; se revierte `BudgetItem.committed` (FR-BOOKING-004/005/008; BR-BOOKING-009).
* Notificaciones in-app + email simulado a cada vendor afectado (FR-NOTIF-001; BR-NOTIF-001/002).

No hay pagos reales, por lo tanto **no se aplica penalización en plataforma** (Decisión PO 8.1 #5; BR-BOOKING-009 extendida al contexto de cancelación de evento — Decisión PO US-011).

### Related Domain Concepts

* `Event.status` lifecycle (`draft`, `active`, `completed`, `cancelled`).
* `QuoteRequest`, `Quote`, `BookingIntent` lifecycle.
* `BudgetItem.committed` (reverso al cancelar bookings).
* `Notification` (in-app + email simulado).
* Tareas en eventos cancelados no se pueden mutar (BR-TASK-010).

### Assumptions

* La cancelación es definitiva en MVP; la reactivación queda fuera de alcance.
* No hay pagos reales: no se procesan reembolsos ni multas.
* La cancelación de un evento `draft` está permitida (FR-EVENT-011) y se documenta como ruta alternativa a `delete` (US-012 — soft delete).

### Dependencies

* US-009 (creación del evento).
* US-010 (validación de inmutabilidad del estado terminal).
* PB-P1-016 (HITL Accept/Edit/Discard) y PB-P1-019 (presupuesto) para el commit/reverse del `BudgetItem.committed`.
* PB-P1-024+ (`Notification` infrastructure) — si el módulo aún no está entregado, la US debe acoplarse a una abstracción mínima de notificación con fallback log estructurado (BR-NOTIF-003).

---

## 🧷 PO/BA Decisions Applied

| Decisión | Fuente | Aplicación en esta US |
| --- | --- | --- |
| Cancelar evento con cascada a `QuoteRequest` / `Quote` / `BookingIntent` activos + notificación al vendor | Decisión PO US-011 (PB-P1-007 notes); BR-NOTIF-002; BR-BOOKING-009 | AC-01, AC-03, AC-04, AC-05; SEC-04. |
| `BookingIntent` se cancela sin penalización en plataforma | Decisión PO 8.1 #5; BR-BOOKING-009; FR-BOOKING-004 | EC-02; out-of-scope explícito. |
| Cancel permitido también en `draft`; soft delete (US-012) es ruta alternativa | FR-EVENT-011; BR-EVENT-010 | EC-01 documenta ambas rutas. |
| Estados terminales bloquean nuevas mutaciones | BR-EVENT-005; BR-TASK-010 | AC-02 (`409 EVENT_LOCKED`). |
| Admin no edita ni cancela eventos del organizador | Decisión PO 8.1 #16; BR-EVENT-014 | SEC-02, NT-03 (`403 FORBIDDEN`). |

---

## 🔗 Traceability

| Source                 | Reference                                |
| ---------------------- | ---------------------------------------- |
| Backlog Item           | PB-P1-007 — Ciclo de vida del evento (edit / cancel / soft delete) |
| Epic                   | EPIC-EVT-001 — Organizer Event Management |
| FRD Requirement(s)     | FR-EVENT-005, FR-EVENT-011, FR-EVENT-006, FR-QUOTE-006, FR-QUOTE-015, FR-BOOKING-002, FR-BOOKING-004, FR-BOOKING-005, FR-BOOKING-008, FR-BOOKING-010, FR-NOTIF-001 |
| Use Case(s)            | UC-EVENT-006                              |
| Business Rule(s)       | BR-EVENT-005, BR-EVENT-010, BR-EVENT-014, BR-QUOTE-005, BR-QUOTE-010, BR-BOOKING-003, BR-BOOKING-008, BR-BOOKING-009, BR-TASK-010, BR-NOTIF-001, BR-NOTIF-002 |
| Permission Rule(s)     | Ownership (BR-EVENT-002); admin read-only (BR-EVENT-014) |
| Data Entity / Entities | `Event`, `QuoteRequest`, `Quote`, `BookingIntent`, `BudgetItem`, `Notification` |
| API Endpoint(s)        | `POST /api/v1/events/:id/cancel`          |
| NFR Reference(s)       | NFR-PERF-001                              |
| Related ADR(s)         | ADR-BE-003 (reglas de negocio en Application/Domain); ADR-BE-004 (jobs simples; aplica si se decide cola para notificaciones simuladas) |
| Related Document(s)    | `/docs/6` C-005/C-020/C-022; `/docs/8` UC-EVENT-006; `/docs/8.1` #5 #16 |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* Reembolsos automáticos o cobro de penalizaciones (sin pagos reales en MVP).
* Reactivación de eventos cancelados (Future).
* Soft delete físico del evento (US-012 cubre delete sólo en `draft`).
* Mensajería bidireccional con vendors sobre la cancelación; la notificación es informativa.
* Edición o creación de tareas tras la cancelación (BR-TASK-010 bloquea).
* Captura libre del motivo de cancelación en MVP (puede agregarse como Future).

### Scope Notes

* No introduce flujo de soporte ni reaperturas.
* No introduce contratos.
* No introduce IA.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Cancelación exitosa desde `active`

**Given** un evento en estado `active` cuyo `owner_user_id` coincide con el organizador autenticado
**When** el organizador confirma la cancelación
**Then** el backend responde `200 OK`, persiste `Event.status='cancelled'`, `Event.cancelled_at` y `Event.cancelled_by=session.userId`.

### AC-02: Bloqueo de mutaciones tras cancelar

**Given** un evento ya en `cancelled`
**When** se intenta editar, crear `QuoteRequest`, mutar tareas o cancelar nuevamente
**Then** retorna `409 EVENT_LOCKED` (BR-EVENT-005, BR-EVENT-006, BR-TASK-010).

### AC-03: Cascada a `QuoteRequest` y `Quote` activas

**Given** existen `QuoteRequest` en `sent`, `viewed` o `responded` asociadas al evento
**When** se cancela el evento
**Then** cada `QuoteRequest` pasa a `cancelled`; las `Quote` activas asociadas a esas solicitudes se marcan `cancelled` con `cancelled_at` y `cancelled_by='system_event_cancel'`.

### AC-04: Cascada a `BookingIntent` con reverso de `BudgetItem.committed`

**Given** existen `BookingIntent` en `pending` o `confirmed_intent` asociados al evento
**When** se cancela el evento
**Then** cada `BookingIntent` pasa a `cancelled` con `cancelled_at`, `cancelled_by='system_event_cancel'`, `cancellation_reason='event_cancelled'`; y se revierte `BudgetItem.committed` de la categoría afectada (FR-BOOKING-008).

### AC-05: Notificación a vendors afectados

**Given** una o más entidades en cascada vinculan vendors (vía `QuoteRequest`/`Quote`/`BookingIntent`)
**When** la cancelación termina
**Then** se genera una `Notification` in-app por vendor afectado y se emite un evento `email.simulated.sent` por log estructurado (BR-NOTIF-003).

---

## ⚠️ Edge Cases

### EC-01: Cancelación desde `draft`

**Given** un evento en estado `draft` sin entidades hijas activas
**When** el organizador confirma la cancelación
**Then** el backend la acepta (`200 OK`), transiciona a `cancelled` y no dispara cascada ni notificaciones.

#### Handling

* Documentar que `delete` (US-012) es la ruta alternativa para descartar borradores; la elección es del organizador.

---

### EC-02: `BookingIntent` en `confirmed_intent`

**Given** existe un `BookingIntent.confirmed_intent` para el evento
**When** se cancela el evento
**Then** el `BookingIntent` se cancela igualmente con `cancelled_by='system_event_cancel'`, se notifica al vendor y se revierte el `committed` de la categoría afectada. Sin penalización en plataforma (BR-BOOKING-009).

#### Handling

* Recálculo del committed delegado al servicio compartido `BudgetCommitService` (US-039 / PB-P1-020).

---

### EC-03: Idempotencia / doble click

**Given** dos requests simultáneos de cancelación
**When** se procesan
**Then** sólo el primero ejecuta la cascada y devuelve `200 OK`; el segundo retorna `409 EVENT_LOCKED` por estado terminal.

#### Handling

* El use case usa lock optimista sobre `Event.status` dentro de la transacción.

---

### EC-04: Falla parcial en notificaciones

**Given** la transacción de actualización completó pero falla la creación de una `Notification`
**When** se observa el error
**Then** la cancelación del evento queda persistida; la notificación se reintenta o se registra como warning (no se revierte el cambio de estado del evento).

#### Handling

* La transacción cubre los cambios de estado de las entidades del dominio; la entrega de notificaciones es un side-effect best-effort (BR-NOTIF-003 — email simulado vía log).

---

## 🚫 Validation Rules

| ID    | Rule                                          | Message / Behavior        |
| ----- | --------------------------------------------- | ------------------------- |
| VR-01 | `Event.status` actual ∈ {`draft`, `active`}   | "Estado inválido para cancelar" |
| VR-02 | Confirmación obligatoria en el frontend (modal con doble confirmación) | Bloqueo UX |
| VR-03 | Endpoint idempotente respecto al estado terminal | `409 EVENT_LOCKED` si ya `cancelled` |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                |
| ------ | ------------------------------------------------------------------- |
| SEC-01 | Ownership opaque enforced en backend: `event.owner_user_id == session.userId`, sino `404 NOT_FOUND`. |
| SEC-02 | Admin no puede cancelar (BR-EVENT-014); `403 FORBIDDEN`. |
| SEC-03 | Operación transaccional con efectos cascada sobre `QuoteRequest`, `Quote`, `BookingIntent`, `BudgetItem`. |
| SEC-04 | Log estructurado `event.cancelled` con `correlation_id`, `event_id`, `owner_user_id`, conteos por entidad afectada (quotes, bookings, notifications). |
| SEC-05 | DTO `.strict()` (puede aceptar `reason` opcional ≤ 280 caracteres como Future; no requerido en MVP). |

### Negative Authorization Scenarios

* Otro organizador → `404 NOT_FOUND` (ownership opaco).
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
| Screen / Route      | `/[locale]/organizer/events/:id` (dashboard del evento)     |
| Main UI Pattern     | Botón "Cancelar evento" + modal de doble confirmación con detalle del impacto (vendors a notificar, bookings a cancelar) |
| Primary Action      | "Confirmar cancelación"                                     |
| Secondary Actions   | "Volver"                                                    |
| Empty State         | No aplica                                                   |
| Loading State       | Spinner; bloquea acciones del dashboard durante el submit   |
| Error State         | Banner con código mapeado (`EVENT_LOCKED`, `NOT_FOUND`)      |
| Success State       | Toast + redirect al listado de eventos con el evento marcado como `cancelled` |
| Accessibility Notes | Modal accesible, foco atrapado, `aria-describedby` para impacto, retorno de foco al cerrar |
| Responsive Notes    | Mobile-first                                                |
| i18n Notes          | 4 locales soportados                                        |
| Currency Notes      | No aplica                                                   |

---

## 🛠 Technical Notes

### Frontend

* Route / Page:

  * `/[locale]/organizer/events/:id`
* Components:

  * `CancelEventDialog`, `CancelImpactSummary`
* State Management:

  * TanStack mutation `useCancelEvent`; invalidación del cache del evento y del listado del organizador.
* Forms:

  * Confirmación con doble paso (botón secundario "Sí, cancelar el evento").
* API Client:

  * `eventsApi.cancel(id)`

### Backend

* Use Case / Service:

  * `CancelEventUseCase` que orquesta la cascada y emite notificaciones.
  * Servicios colaboradores: `QuoteCascadeCancelService`, `BookingCascadeCancelService`, `BudgetCommitReverseService`, `NotificationDispatchService`.
* Controller / Route:

  * `POST /api/v1/events/:id/cancel`
* Authorization Policy:

  * Ownership + estado válido.
* Validation:

  * Estado actual; idempotencia.
* Transaction Required:

  * Sí: actualización de `Event`, `QuoteRequest`, `Quote`, `BookingIntent`, `BudgetItem` en una sola transacción. La emisión de notificaciones se hace tras commit, best-effort.

### Database

* Main Tables:

  * `events`, `quote_requests`, `quotes`, `booking_intents`, `budget_items`, `notifications`
* Constraints:

  * Transiciones de estado válidas (definidas en PB-P0 y PB-P1-016/019/021).
* Index Considerations:

  * Reusar índices por `event_id` ya definidos en las tablas hijas.

### API

| Method | Endpoint                          | Purpose          |
| ------ | --------------------------------- | ---------------- |
| POST   | `/api/v1/events/:id/cancel`       | Cancelar evento en `draft` o `active` con cascada controlada |

### Observability / Audit

* Correlation ID Required: Yes
* Log Event Required: Yes (`event.cancelled` con `correlation_id`, `event_id`, `owner_user_id`, `from_status`, `affected_quote_requests`, `affected_quotes`, `affected_booking_intents`, `notifications_emitted`).
* AdminAction Required: No
* AIRecommendation Required: No

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                              | Type        |
| ----- | ----------------------------------------------------- | ----------- |
| TS-01 | Cancel desde `active` con cascada (`QuoteRequest`/`Quote`/`BookingIntent`) | Integration |
| TS-02 | Cancel desde `draft` sin cascada                       | Integration |
| TS-03 | E2E con doble confirmación modal                       | E2E         |
| TS-04 | Reverso de `BudgetItem.committed` al cancelar `BookingIntent.confirmed_intent` | Integration |
| TS-05 | Notificaciones in-app creadas por vendor afectado      | Integration |

### Negative Tests

| ID    | Scenario                              | Expected Result          |
| ----- | ------------------------------------- | ------------------------ |
| NT-01 | Otro organizador                      | `404 NOT_FOUND`          |
| NT-02 | Cancel en estado `completed`          | `409 EVENT_LOCKED`       |
| NT-03 | Admin                                 | `403 FORBIDDEN`          |
| NT-04 | Vendor                                | `403 FORBIDDEN`          |
| NT-05 | Anónimo                               | `401 UNAUTHENTICATED`    |
| NT-06 | Doble click (cancel sobre `cancelled`) | `409 EVENT_LOCKED`      |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario                          | Expected Result |
| ---------- | --------------------------------- | --------------- |
| AUTH-TS-01 | Dueño cancela `active`            | 200 OK          |
| AUTH-TS-02 | Dueño cancela `draft`             | 200 OK          |
| AUTH-TS-03 | Otro organizador                  | 404 NOT_FOUND   |
| AUTH-TS-04 | Admin                             | 403 FORBIDDEN   |
| AUTH-TS-05 | Vendor                            | 403 FORBIDDEN   |
| AUTH-TS-06 | Anónimo                           | 401 UNAUTHENTICATED |

### Accessibility Tests

* Modal con trampa de foco y retorno al disparador.
* Anuncio del impacto vía `aria-live="polite"`.
* Botones primario y secundario diferenciados.

### Seed / Demo

* Para el demo, el seed de PB-P1-006 (US-009) y la semilla de `QuoteRequest`/`BookingIntent` definida en PB-P1 deben incluir al menos un evento `active` con quotes y un `BookingIntent.confirmed_intent` para mostrar la cascada.

---

## 📊 Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | Tasa de cancelación; satisfacción del proveedor      |
| Expected Impact     | Comunicación oportuna y consistente a vendors        |
| Success Criteria    | 100% de `QuoteRequest`/`Quote`/`BookingIntent` activos asociados pasan a `cancelled` con notificación |
| Academic Demo Value | Demuestra reglas de lifecycle, transacciones y cascada controlada |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Botón "Cancelar evento" + `CancelEventDialog` con resumen de impacto.
* Mutation `useCancelEvent` con manejo de errores `EVENT_LOCKED`/`NOT_FOUND`.

### Potential Backend Tasks

* `CancelEventUseCase` con orquestación transaccional.
* Servicios `QuoteCascadeCancelService`, `BookingCascadeCancelService`, `BudgetCommitReverseService`, `NotificationDispatchService`.
* Ownership opaque guard.

### Potential Database Tasks

* Verificar índices por `event_id` en `quote_requests`, `quotes`, `booking_intents`.
* Confirmar enums de estado y constraints (no requiere migración nueva si PB-P1 anterior los entregó).

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* Tests positivos (TS-01..TS-05), negativos (NT-01..NT-06), autorización (AUTH-TS-01..06) y accesibilidad.

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
* [x] Decisión PO US-011 (cascada) y PO 8.1 #5 (sin penalización) aplicadas.
* [ ] PO/BA valida (pendiente del Approval Gate).

---

## 🏁 Definition of Done

* [ ] Endpoint `POST /api/v1/events/:id/cancel` operativo con cascada controlada.
* [ ] Reverso de `BudgetItem.committed` verificado para `BookingIntent.confirmed_intent`.
* [ ] Notificaciones in-app y email simulado emitidas por vendor afectado.
* [ ] Tests TS-01..TS-05 y NT-01..NT-06 verdes en CI.
* [ ] E2E del modal de doble confirmación verde en CI.
* [ ] PO valida la demo del flujo.

---

## 📝 Notes

* Si el módulo `Notification` aún no está entregado al sprint de implementación, el `NotificationDispatchService` debe usar un fallback log estructurado (BR-NOTIF-003) y persistir los `Notification` cuando la tabla esté disponible.
* La inclusión de `cancellation_reason` libre (texto opcional ≤ 280 caracteres) se considera como Future; no agrega valor a la demo MVP.
* La cascada sobre `EventTask` no requiere update de estado individual (BR-TASK-010 bloquea futuras mutaciones); las tareas permanecen visibles como histórico inmutable.
