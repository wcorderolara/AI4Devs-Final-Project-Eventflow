# 🧾 User Story: Notificar al vendor cuando su Quote es rechazada o expira

## 🆔 Metadata

| Field              | Value                                                                       |
| ------------------ | --------------------------------------------------------------------------- |
| ID                 | US-054                                                                      |
| Backlog Item       | PB-P1-032 — Notificación a vendor por Quote rechazada/expirada              |
| Epic               | EPIC-QR-001                                                                 |
| Feature            | Endpoint del organizer para rechazar Quote + `QuoteNotificationService` reusable + 2 Notifications atómicas al vendor |
| Module / Domain    | Quotes / Notifications                                                       |
| User Role          | Organizer (rechazo) / Sistema (emisión + expiración)                        |
| Priority           | Must Have                                                                   |
| Status             | Approved                                                                    |
| Owner              | Product Owner / Business Analyst                                            |
| Sprint / Milestone | MVP                                                                         |
| Created Date       | 2026-06-09                                                                  |
| Last Updated       | 2026-06-28                                                                  |
| Approved By        | PO/BA Review                                                                |
| Approval Date      | 2026-06-28                                                                  |
| Ready for Development Tasks | Yes                                                                 |

---

## 🎯 User Story

**As an** organizador (rechazo) y sistema (expiración + emisión)
**I want** un endpoint `POST /organizer/quotes/:id/reject` que transicione `sent → rejected` y un servicio común `QuoteNotificationService` que emita atómicamente 2 Notifications al vendor por cada transición relevante (`rejected` o `expired`)
**So that** el loop de comunicación bilateral se cierre cuando la Quote es rechazada o expira (Decisión PO 8.1 #13)

---

## 🧠 Business Context

### Context Summary

US-054 cierra el loop de comunicación cubriendo dos transiciones de `Quote.status` que requieren notificar al vendor (FR-QUOTE-009/010 + BR-NOTIF-002):

1. **Rechazo (organizer-driven)**: nuevo endpoint `POST /api/v1/organizer/quotes/:id/reject` con `prisma.$transaction` que ejecuta UPDATE `status='rejected'` + `rejected_at=NOW()` + `rejection_reason?` + emisión de 2 Notifications.
2. **Expiración (system-driven, US-053)**: refactor del `ExpireQuotesUseCase` (US-053) para invocar el nuevo `QuoteNotificationService.emitQuoteStateChange({ quote, event, tx })` en lugar de duplicar la lógica de inserción.

La emisión persiste 2 rows en `notifications`:
- `channel='in_app'`, `delivery_status='delivered'`, `event='quote.rejected'` o `'quote.expired'`.
- `channel='email_simulated'`, `delivery_status='simulated'` (BR-NOTIF-003).

El surface (FR-NOTIF-002 — inbox del vendor) vive en US futura (PB-P2-010).

### PO/BA Decisions Applied

| #  | Decisión                                                                                                                                                                                                                                       |
| -- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1 | Endpoint del organizer `POST /api/v1/organizer/quotes/:id/reject` in scope US-054. Cumple FR-QUOTE-010.                                                                                                                                       |
| D2 | Nuevo `QuoteNotificationService.emitQuoteStateChange({ quote, event, tx })` reutilizable. US-053 refactoriza para invocarlo.                                                                                                                  |
| D3 | Transición `rejected` permitida SÓLO desde `status='sent'`. Otros estados ⇒ `409 QUOTE_NOT_REJECTABLE` con `details.current_status`.                                                                                                          |
| D4 | Body opcional `{ reason?: string [0..500] }`. Persiste en `quotes.rejection_reason` + `rejected_at=NOW()`. Sin reason ⇒ persiste `null`.                                                                                                       |
| D5 | EC-01 "vendor inactivo" eliminado. La Notification se persiste siempre; aislamiento por FR-NOTIF-005 (vendor sólo ve sus notifs).                                                                                                              |
| D6 | Inbox del vendor (FR-NOTIF-002) fuera de scope. US-054 sólo entrega la emisión.                                                                                                                                                                |
| D7 | Atomicidad: emisión dentro de `prisma.$transaction` con UPDATE de `status`. Rollback completo en error.                                                                                                                                       |
| D8 | Authorization: organizer dueño del evento (`events.organizer_user_id = currentUser.id`). Otros ⇒ `404 QUOTE_NOT_FOUND` uniforme.                                                                                                              |

### Related Domain Concepts

* `quotes.status` (`draft → sent → accepted | rejected | expired`).
* `quotes.rejection_reason`, `quotes.rejected_at`.
* `notifications` (`event`, `channel`, `delivery_status`).
* Patrón `QuoteNotificationService` reusable.

### Assumptions

* US-053 ya entrega el job de expiración con notif duplicada (que se refactorizará).
* `notifications` schema entregado por PB-P0-001.

### Dependencies

* US-052 (Quote `sent`).
* US-053 (job + notif por expiración a refactorizar).
* `NotificationSenderPort` (US-049).
* PB-P0-001 (schema).

---

## 🔗 Traceability

| Source                 | Reference                                                                |
| ---------------------- | ------------------------------------------------------------------------ |
| FRD Requirement(s)     | FR-QUOTE-009, FR-QUOTE-010, FR-NOTIF-001, FR-NOTIF-004, FR-NOTIF-005    |
| Use Case(s)            | UC-QUOTE-009, UC-QUOTE-010, UC-NOTIF-001                                  |
| Business Rule(s)       | BR-NOTIF-001, BR-NOTIF-002, BR-NOTIF-003, BR-NOTIF-005, BR-QUOTE-014, BR-QUOTE-016 |
| Permission Rule(s)     | Organizer dueño del evento (rechazo); Sistema (expiración + emisión)    |
| Data Entity / Entities | Quote, Notification, Event, VendorProfile                                |
| API Endpoint(s)        | POST /api/v1/organizer/quotes/:id/reject                                  |
| NFR Reference(s)       | NFR-OBS-005                                                                |
| Related ADR(s)         | —                                                                         |
| Related Document(s)    | /docs/4 §BR-NOTIF-001..005, /docs/8 §UC-QUOTE-009/010, /docs/9 §FR-QUOTE-009/010/FR-NOTIF-001..005 |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* Inbox del vendor (FR-NOTIF-002 → PB-P2-010).
* SMS / WhatsApp / Push (FR-NOTIF-006).
* Email real con SMTP.
* Mensajes UX i18n del inbox (vive en US futura).
* Notif al organizer cuando él mismo rechaza (innecesario).
* Vista comparativa del organizer (PB-P1-033).

### Scope Notes

* Idempotencia por transición: una transición válida ⇒ una pareja de Notifications.
* Servicio común usado por rejected y expired.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Rechazo exitoso

**Given** un organizador autenticado dueño del evento, Quote con `status='sent'`, body opcional `{ reason: "Precio fuera de presupuesto" }`
**When** envía `POST /api/v1/organizer/quotes/:id/reject`
**Then** el backend, en `prisma.$transaction`:
- UPDATE `quotes(status='rejected', rejected_at=NOW(), rejection_reason='Precio fuera de presupuesto')` con guard `WHERE status='sent'`,
- invoca `QuoteNotificationService.emitQuoteStateChange({ quote, event: 'quote.rejected', tx })` que inserta:
  - `notifications(channel='in_app', recipient_user_id=vendor.user_id, event='quote.rejected', delivery_status='delivered', payload={ quote_id, quote_request_id, rejection_reason })`,
  - `notifications(channel='email_simulated', delivery_status='simulated', payload=...)`,
- emite log `quote.rejected`,
- responde `200 OK` con la Quote actualizada.

### AC-02: Expiración (reuso del servicio)

**Given** el `ExpireQuotesJob` de US-053 procesa una Quote vencida
**When** marca `status='expired'`
**Then** invoca el mismo `QuoteNotificationService.emitQuoteStateChange({ quote, event: 'quote.expired', tx })` que inserta 2 Notifications idénticas al patrón (con `event='quote.expired'` y payload `{ quote_id, quote_request_id, valid_until }`).

### AC-03: Sin reason

**Given** body sin `reason`
**When** se rechaza
**Then** `quotes.rejection_reason=NULL`; Notifications sin `rejection_reason` en payload; resto idéntico.

---

## ⚠️ Edge Cases

### EC-01: Estado origen inválido

**Given** Quote `status ∈ {draft, accepted, rejected, expired}`
**When** se intenta rechazar
**Then** `409 QUOTE_NOT_REJECTABLE` con `details: { current_status }`.

### EC-02: Quote ajena o inexistente

**Given** Quote inexistente o de evento no propio del organizer
**When** se intenta rechazar
**Then** `404 QUOTE_NOT_FOUND` (uniforme).

### EC-03: `reason` excede 500 chars

**Given** body con `reason.length > 500`
**When** se valida
**Then** `400 INVALID_REJECTION_REASON`.

### EC-04: UUID malformado

**Given** `:id` no UUID
**When** se valida
**Then** `400 INVALID_UUID`.

### EC-05: Idempotencia (re-rechazo)

**Given** Quote ya `rejected`
**When** se vuelve a llamar al endpoint
**Then** `409 QUOTE_NOT_REJECTABLE`. NO se crea Notification adicional.

---

## 🚫 Validation Rules

| ID    | Rule                                                                                  | Message / Behavior                              |
| ----- | ------------------------------------------------------------------------------------- | ----------------------------------------------- |
| VR-01 | `:id` UUID válido                                                                      | `400 INVALID_UUID`                              |
| VR-02 | `body.reason` si presente, `[0..500]`                                                   | `400 INVALID_REJECTION_REASON`                  |
| VR-03 | Organizer dueño del evento que contiene la Quote                                        | `404 QUOTE_NOT_FOUND` (uniforme)                |
| VR-04 | Quote `status='sent'`                                                                    | `409 QUOTE_NOT_REJECTABLE`                      |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                          |
| ------ | --------------------------------------------------------------------------------------------- |
| SEC-01 | Sesión `organizer`.                                                                           |
| SEC-02 | Organizer debe ser dueño del evento (`events.organizer_user_id = currentUser.id`).            |
| SEC-03 | `404 QUOTE_NOT_FOUND` uniforme para no revelar existencia ni ownership.                       |
| SEC-04 | Aislamiento de notificaciones por FR-NOTIF-005: el vendor sólo ve sus propias notifs.        |
| SEC-05 | `QuoteNotificationService` invocado sólo desde service layer (sin endpoint público).         |

### Negative Authorization Scenarios

* Sin sesión → `401`.
* `vendor`/`admin` → `403`.
* Organizer ajeno → `404 QUOTE_NOT_FOUND`.

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

| Area                | Notes                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| Screen / Route      | Vista comparativa o detalle de Quote del organizer (US futura). US-054 sólo aporta CTA "Rechazar". |
| Main UI Pattern     | Modal de confirmación con textarea opcional para `reason`.                                      |
| Primary Action      | "Rechazar Quote".                                                                              |
| Secondary Actions   | "Cancelar".                                                                                    |
| Empty State         | No aplica.                                                                                     |
| Loading State       | Spinner en CTA.                                                                                |
| Error State         | Banner accesible con código i18n (`QUOTE_NOT_REJECTABLE`, `INVALID_REJECTION_REASON`).        |
| Success State       | Toast + actualización de la vista del organizer.                                               |
| Accessibility Notes | Modal con `role="dialog"`, focus trap, ESC.                                                    |
| Responsive Notes    | Mobile-first.                                                                                  |
| i18n Notes          | 4 locales (`organizer.quote.reject.*`).                                                        |
| Currency Notes      | No aplica.                                                                                     |

---

## 🛠 Technical Notes

### Frontend

* Route / Page: vive en US futura del módulo organizer; US-054 aporta el modal de confirmación + API call.
* Components: `RejectQuoteDialog` (modal accesible).
* State Management: TanStack mutation + invalidación de queries de Quote.
* Forms: RHF + Zod.
* API Client: `organizerApi.quotes.reject(id, { reason? })`.

### Backend

* Use Case / Service:
  * `RejectQuoteUseCase` (organizer-driven).
  * `QuoteNotificationService.emitQuoteStateChange({ quote, event, tx })` (reusable).
* Controller / Route:
  * `POST /api/v1/organizer/quotes/:id/reject` en `OrganizerQuoteController`.
* Authorization Policy: Organizer + ownership del evento.
* Validation: Zod del path param + body opcional.
* Transaction Required: Sí.

### Database

* Main Tables: `quotes` (update), `notifications` (write), `events` (read), `vendor_profiles` (read).
* Columns: `quotes.rejection_reason text NULL`, `quotes.rejected_at timestamptz NULL` (confirmar en DB-001; si faltan, migración menor).
* Index Considerations: reuso de PK por `quote.id`.

### API

| Method | Endpoint                                              | Purpose                              |
| ------ | ----------------------------------------------------- | ------------------------------------ |
| POST   | `/api/v1/organizer/quotes/:id/reject`                | Rechazar Quote + emitir Notifications. |

#### Request Body (opcional)

```json
{ "reason": "Precio fuera de presupuesto" }
```

#### Response 200

```json
{
  "id": "<uuid>",
  "status": "rejected",
  "rejected_at": "2026-...",
  "rejection_reason": "Precio fuera de presupuesto"
}
```

### Observability / Audit

* Correlation ID Required: Yes
* Log Event Required: Yes (`quote.rejected`, `quote.notification.emitted`).
* AdminAction Required: No
* AIRecommendation Required: No

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                          | Type        |
| ----- | --------------------------------------------------------------------------------- | ----------- |
| TS-01 | Rechazo válido con `reason` crea 2 Notifications y actualiza Quote.               | Integration |
| TS-02 | Rechazo sin body (sin `reason`) ⇒ `reason=null` en payload.                       | Integration |
| TS-03 | Expiración (US-053) invoca el mismo servicio común y crea 2 Notifications.       | Integration |
| TS-04 | Idempotencia: re-rechazo retorna `409` sin crear Notifications adicionales.       | Integration |
| TS-05 | Transacción atómica: simular fallo de Notification rollback completo.             | Integration |
| TS-06 | Aislamiento: vendor sólo ve sus propias Notifications (FR-NOTIF-005).            | Integration |

### Negative Tests

| ID    | Scenario                                              | Expected Result                  |
| ----- | ----------------------------------------------------- | -------------------------------- |
| NT-01 | Quote `accepted`/`expired`/`rejected`/`draft`         | `409 QUOTE_NOT_REJECTABLE`       |
| NT-02 | Quote inexistente                                      | `404 QUOTE_NOT_FOUND`             |
| NT-03 | Organizer ajeno                                        | `404 QUOTE_NOT_FOUND`             |
| NT-04 | `reason` > 500 chars                                   | `400 INVALID_REJECTION_REASON`    |
| NT-05 | UUID malformado                                        | `400 INVALID_UUID`                |
| NT-06 | Sin sesión                                             | `401`                             |
| NT-07 | Vendor / Admin                                         | `403`                             |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario                            | Expected Result          |
| ---------- | ----------------------------------- | ------------------------ |
| AUTH-TS-01 | Organizer dueño                     | `200`                    |
| AUTH-TS-02 | Organizer ajeno                     | `404 QUOTE_NOT_FOUND`    |
| AUTH-TS-03 | Vendor                              | `403`                    |
| AUTH-TS-04 | Admin                                | `403`                    |
| AUTH-TS-05 | Sin sesión                          | `401`                    |

### Accessibility Tests

* `RejectQuoteDialog` accesible (`role="dialog"`, focus trap, ESC).
* Textarea con label.

---

## 📊 Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | Engagement vendor + cierre del loop bilateral.       |
| Expected Impact     | El vendor sabe el resultado de cada Quote.            |
| Success Criteria    | 100% emisión por transición válida + idempotencia.   |
| Academic Demo Value | Decisión PO 8.1 #13 visible + servicio común reutilizable. |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* `RejectQuoteDialog` accesible.
* `organizerApi.quotes.reject` + MSW.
* i18n `organizer.quote.reject.*`.

### Potential Backend Tasks

* DTO Zod.
* `QuoteNotificationService` (nuevo).
* `RejectQuoteUseCase` con transacción.
* Controller + ruta.
* Refactor de US-053 para invocar el servicio común.
* Logger extension.

### Potential Database Tasks

* Verificación / migración menor `rejection_reason` + `rejected_at`.

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* TS reject + expired reuso + idempotencia + aislamiento.

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
* [x] PO/BA validó.

---

## 🏁 Definition of Done

* [ ] Endpoint funcional con todas las validaciones.
* [ ] `QuoteNotificationService` reusable operativo.
* [ ] US-053 refactorizada para invocar el servicio común.
* [ ] Idempotencia + atomicidad verificadas.
* [ ] Log `quote.rejected` registrado con `correlation_id`.
* [ ] Tests verdes (functional, negative, auth, accessibility).
* [ ] i18n 4 locales para `RejectQuoteDialog`.
* [ ] PO valida demo (rechazo + expiración disparan notif al vendor).

---

## 📝 Notes

* El inbox del vendor (PB-P2-010) consumirá las Notifications emitidas aquí.
* Documentation Alignment Required (no bloqueantes) en `management/user-stories/decision-resolutions/US-054-decision-resolution.md`.
