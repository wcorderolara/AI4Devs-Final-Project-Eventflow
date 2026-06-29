# 🧾 User Story: Cancelar QuoteRequest activa (con restricción `confirmed_intent`)

## 🆔 Metadata

| Field              | Value                                                                       |
| ------------------ | --------------------------------------------------------------------------- |
| ID                 | US-056                                                                      |
| Backlog Item       | PB-P1-034 — Cancelar QuoteRequest activa (con restricción)                  |
| Epic               | EPIC-QR-001                                                                 |
| Feature            | Endpoint `POST /organizer/quote-requests/:id/cancel` + refactor a `QuoteEventNotificationService` genérico |
| Module / Domain    | Quotes / Notifications                                                       |
| User Role          | Organizer                                                                   |
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

**As an** organizador autenticado
**I want** un endpoint `POST /api/v1/organizer/quote-requests/:id/cancel` que transicione QRs activas a `cancelled` con notificación atómica al vendor y restricción si existe `BookingIntent.confirmed_intent` asociado
**So that** retire solicitudes que ya no necesito sin afectar bookings confirmados (Decisión PO US-056 + BR-QUOTE-010)

---

## 🧠 Business Context

### Context Summary

US-056 entrega el endpoint del organizer para cancelar `QuoteRequest` activas. La transición ocurre en `prisma.$transaction`:

1. Verificación de ownership + status válido (`sent`/`viewed`/`responded`/`preferred`).
2. Check de restricción `EXISTS BookingIntent.confirmed_intent` asociado vía la Quote (FR-QUOTE-015 + Decisión PO US-056). Si existe ⇒ `409 QR_HAS_CONFIRMED_BOOKING`.
3. UPDATE QR con `status='cancelled' + cancelled_at + cancelled_by + cancellation_reason?`.
4. Emisión de 2 Notifications atómicas (`in_app` + `email_simulated`) al vendor vía `QuoteEventNotificationService` (refactor de US-054).
5. Log estructurado.

La Quote asociada (si existe) NO se modifica.

### PO/BA Decisions Applied

| #  | Decisión                                                                                                                                                                                                                                       |
| -- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1 | Estados origen permitidos: `sent`, `viewed`, `responded`, `preferred`. Otros (`cancelled`, `expired`) ⇒ `409 QR_NOT_CANCELLABLE` con `details.current_status`.                                                                                |
| D2 | Restricción `confirmed_intent`: `EXISTS (SELECT 1 FROM booking_intents bi JOIN quotes q ON bi.quote_id=q.id WHERE q.quote_request_id=:qrId AND bi.status='confirmed_intent')` ⇒ `409 QR_HAS_CONFIRMED_BOOKING` con `details.booking_intent_id`. |
| D3 | Quote asociada NO se toca al cancelar la QR.                                                                                                                                                                                                  |
| D4 | Body opcional `{ reason?: string [0..500] }`. Persistir `cancellation_reason`, `cancelled_at`, `cancelled_by`. Migración menor si faltan.                                                                                                    |
| D5 | 2 Notifications atómicas (`in_app` `delivered` + `email_simulated` `simulated`) al vendor vía service común.                                                                                                                                  |
| D6 | Refactor `QuoteNotificationService` (US-054) → `QuoteEventNotificationService` con método genérico `emit({ recipientUserId, eventName, payload, tx })`. Soporta `quote.rejected`, `quote.expired`, `quote_request.cancelled`.                |
| D7 | Authorization: organizer dueño del evento (`events.organizer_user_id = currentUser.id`). Otros ⇒ `404 QR_NOT_FOUND` uniforme.                                                                                                                |
| D8 | `prisma.$transaction` con `SELECT FOR UPDATE` + rollback completo en error.                                                                                                                                                                  |

### Related Domain Concepts

* `quote_requests.status='cancelled'`, `cancelled_at`, `cancelled_by`, `cancellation_reason`.
* `booking_intents.status='confirmed_intent'` (restricción).
* `QuoteEventNotificationService` (refactor de US-054).
* Sin penalty (BR-BOOKING-009 + scope MVP).

### Assumptions

* `BookingIntent` schema entregado por PB-P0-001 (verificar en DB-001).
* `notifications` schema reusable.

### Dependencies

* US-049 (creación QR).
* US-054 (service común a refactorizar).
* `NotificationSenderPort` (US-049).
* PB-P0-001 (schema BookingIntent + columnas cancel).
* PB-P1-036 (BookingIntent — necesario para el check).

---

## 🔗 Traceability

| Source                 | Reference                                                                |
| ---------------------- | ------------------------------------------------------------------------ |
| FRD Requirement(s)     | FR-QUOTE-015, FR-NOTIF-001, FR-NOTIF-004                                |
| Use Case(s)            | UC-QUOTE-002                                                              |
| Business Rule(s)       | BR-QUOTE-005, BR-QUOTE-010, BR-NOTIF-001, BR-NOTIF-002, BR-BOOKING-009 (ref) |
| Permission Rule(s)     | Organizer dueño del evento                                                |
| Data Entity / Entities | QuoteRequest, Quote, BookingIntent, Notification, Event                  |
| API Endpoint(s)        | POST /api/v1/organizer/quote-requests/:id/cancel                          |
| NFR Reference(s)       | NFR-OBS-005, NFR-PERF-001                                                |
| Related ADR(s)         | —                                                                         |
| Related Document(s)    | /docs/4 §BR-QUOTE-010/BR-BOOKING-009, /docs/8 §UC-QUOTE-002, /docs/9 §FR-QUOTE-015 |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* Penalizaciones financieras (BR-BOOKING-009 — sin penalty MVP).
* Cancelación masiva.
* Reactivación de QR cancelled.
* Cambios sobre Quote asociada.
* Cancelación de BookingIntent (US futura).

### Scope Notes

* Sin penalty.
* Quote asociada permanece intacta.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Cancelación exitosa con `reason`

**Given** organizer dueño del evento, QR `status IN ('sent','viewed','responded','preferred')`, sin BookingIntent confirmado asociado, body `{ reason: "Cambio de planes" }`
**When** envía `POST /api/v1/organizer/quote-requests/:id/cancel`
**Then** el backend, en `prisma.$transaction`:
- verifica que no existe `BookingIntent.confirmed_intent` asociado,
- UPDATE `quote_requests` con `status='cancelled', cancelled_at=NOW(), cancelled_by=currentUser.id, cancellation_reason='Cambio de planes'` (guard `WHERE status IN (...)`),
- invoca `QuoteEventNotificationService.emit({ eventName: 'quote_request.cancelled', recipientUserId=vendor.user_id, payload={ quote_request_id, event_id, cancellation_reason }, tx })`,
- emite log `quote_request.cancelled`,
- responde `200 OK` con la QR actualizada.

### AC-02: Cancelación sin `reason`

**Given** body sin `reason`
**When** se cancela
**Then** `cancellation_reason=null`; resto idéntico.

### AC-03: Quote asociada intacta

**Given** QR con Quote `sent`
**When** se cancela la QR
**Then** la Quote no se modifica (permanece `sent`; se vencerá por job de US-053 si aplica).

---

## ⚠️ Edge Cases

### EC-01: BookingIntent confirmado asociado

**Given** Quote con `BookingIntent.status='confirmed_intent'`
**When** se intenta cancelar la QR
**Then** `409 QR_HAS_CONFIRMED_BOOKING` con `details: { booking_intent_id }`. Sin cambios en la DB.

### EC-02: Estado origen no permitido

**Given** QR `status ∈ {cancelled, expired}`
**When** se intenta cancelar
**Then** `409 QR_NOT_CANCELLABLE` con `details.current_status`.

### EC-03: QR ajena o inexistente

**Given** QR de evento no propio o UUID inexistente
**When** se intenta cancelar
**Then** `404 QR_NOT_FOUND` (uniforme).

### EC-04: `reason` excede 500 chars

**Given** body con `reason.length > 500`
**When** se valida
**Then** `400 INVALID_CANCELLATION_REASON`.

### EC-05: UUID malformado

**Given** `:id` no UUID
**When** se valida
**Then** `400 INVALID_UUID`.

### EC-06: Idempotencia (re-cancelar)

**Given** QR ya `cancelled`
**When** se intenta de nuevo
**Then** `409 QR_NOT_CANCELLABLE`. No se crean Notifications adicionales.

---

## 🚫 Validation Rules

| ID    | Rule                                                                          | Message / Behavior                              |
| ----- | ----------------------------------------------------------------------------- | ----------------------------------------------- |
| VR-01 | `:id` UUID válido                                                              | `400 INVALID_UUID`                              |
| VR-02 | `body.reason` si presente, `[0..500]`                                           | `400 INVALID_CANCELLATION_REASON`               |
| VR-03 | Organizer dueño del evento                                                      | `404 QR_NOT_FOUND` (uniforme)                   |
| VR-04 | QR `status IN ('sent','viewed','responded','preferred')`                         | `409 QR_NOT_CANCELLABLE`                        |
| VR-05 | No existe `BookingIntent` asociado vía Quote con `status='confirmed_intent'`     | `409 QR_HAS_CONFIRMED_BOOKING`                  |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                          |
| ------ | --------------------------------------------------------------------------------------------- |
| SEC-01 | Sesión `organizer`.                                                                           |
| SEC-02 | Ownership del evento.                                                                          |
| SEC-03 | `404 QR_NOT_FOUND` uniforme.                                                                   |
| SEC-04 | Restricción `confirmed_intent` server-side (no se puede bypassar desde cliente).               |

### Negative Authorization Scenarios

* Sin sesión → `401`.
* `vendor`/`admin` → `403`.
* Organizer ajeno → `404 QR_NOT_FOUND`.

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
| Screen / Route      | Detalle/listado de QR del organizer (US futura).                                                |
| Main UI Pattern     | Botón "Cancelar solicitud" + `CancelQRDialog` (modal accesible con textarea opcional).         |
| Primary Action      | "Confirmar cancelación".                                                                       |
| Secondary Actions   | "Volver".                                                                                      |
| Empty State         | No aplica.                                                                                     |
| Loading State       | Spinner CTA.                                                                                   |
| Error State         | Banner accesible con código i18n (`QR_NOT_CANCELLABLE`, `QR_HAS_CONFIRMED_BOOKING`, `INVALID_CANCELLATION_REASON`). |
| Success State       | Toast + invalidación de queries.                                                                |
| Accessibility Notes | Modal `role="dialog"`, focus trap, ESC.                                                        |
| Responsive Notes    | Mobile-first.                                                                                  |
| i18n Notes          | 4 locales (`organizer.qr.cancel.*`).                                                            |
| Currency Notes      | No aplica.                                                                                     |

---

## 🛠 Technical Notes

### Frontend

* Components: `CancelQRDialog` (modal accesible).
* State Management: TanStack mutation + invalidación.
* Forms: RHF + Zod (espejo del backend).
* API Client: `organizerApi.qr.cancel(id, { reason? })`.

### Backend

* Use Case / Service:
  * `CancelQuoteRequestUseCase`.
  * `QuoteEventNotificationService` (refactor de US-054).
* Controller / Route:
  * `POST /api/v1/organizer/quote-requests/:id/cancel`.
* Authorization Policy: Organizer + ownership.
* Validation: Zod del path param + body opcional + service layer (status + confirmed_intent).
* Transaction Required: Sí.

### Database

* Main Tables: `quote_requests` (update), `quotes` (read), `booking_intents` (read), `notifications` (write), `events` (read), `vendor_profiles` (read).
* Columns: confirmar `quote_requests.cancellation_reason text NULL`, `cancelled_at timestamptz NULL`, `cancelled_by uuid NULL`. Si faltan, migración menor.
* Index Considerations: índice por `(quote_request_id, status)` en `booking_intents` para EXISTS eficiente.

### API

| Method | Endpoint                                                  | Purpose                              |
| ------ | --------------------------------------------------------- | ------------------------------------ |
| POST   | `/api/v1/organizer/quote-requests/:id/cancel`            | Cancelar QR con restricción + notif. |

#### Request Body (opcional)

```json
{ "reason": "Cambio de planes" }
```

#### Response 200

```json
{
  "id": "<uuid>",
  "status": "cancelled",
  "cancelled_at": "2026-...",
  "cancelled_by": "<uuid>",
  "cancellation_reason": "Cambio de planes"
}
```

### Observability / Audit

* Correlation ID Required: Yes
* Log Event Required: Yes (`quote_request.cancelled`, `quote_request.notification.emitted`).
* AdminAction Required: No
* AIRecommendation Required: No

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                          | Type        |
| ----- | --------------------------------------------------------------------------------- | ----------- |
| TS-01 | Cancelación válida con `reason` crea 2 Notifications.                            | Integration |
| TS-02 | Cancelación sin body persiste `reason=null`.                                      | Integration |
| TS-03 | QR `responded` con Quote `sent` (sin BookingIntent) ⇒ cancelable.                | Integration |
| TS-04 | Quote asociada NO se toca.                                                         | Integration |
| TS-05 | Refactor: service común sigue emitiendo notif para `rejected` y `expired`.       | Integration |
| TS-06 | Idempotencia: re-cancelar ⇒ `409 QR_NOT_CANCELLABLE`.                            | Integration |

### Negative Tests

| ID    | Scenario                                              | Expected Result                  |
| ----- | ----------------------------------------------------- | -------------------------------- |
| NT-01 | BookingIntent `confirmed_intent` asociado              | `409 QR_HAS_CONFIRMED_BOOKING`   |
| NT-02 | QR `cancelled`/`expired`                                | `409 QR_NOT_CANCELLABLE`         |
| NT-03 | QR ajena                                                | `404 QR_NOT_FOUND`                |
| NT-04 | QR inexistente                                          | `404 QR_NOT_FOUND`                |
| NT-05 | `reason` > 500 chars                                    | `400 INVALID_CANCELLATION_REASON` |
| NT-06 | UUID malformado                                         | `400 INVALID_UUID`                |
| NT-07 | Sin sesión                                              | `401`                             |
| NT-08 | Vendor / Admin                                          | `403`                             |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario                            | Expected Result          |
| ---------- | ----------------------------------- | ------------------------ |
| AUTH-TS-01 | Organizer dueño                     | `200`                    |
| AUTH-TS-02 | Organizer ajeno                     | `404 QR_NOT_FOUND`       |
| AUTH-TS-03 | Vendor                              | `403`                    |
| AUTH-TS-04 | Admin                                | `403`                    |
| AUTH-TS-05 | Sin sesión                          | `401`                    |

### Accessibility Tests

* `CancelQRDialog` accesible.

---

## 📊 Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | Control del organizador + integridad del flujo.      |
| Expected Impact     | Flexibilidad sin afectar bookings confirmados.       |
| Success Criteria    | Restricción + idempotencia + notif al vendor.        |
| Academic Demo Value | Demuestra cancelación bilateral + restricción de integridad. |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* `CancelQRDialog` accesible.
* `organizerApi.qr.cancel` + MSW.
* i18n `organizer.qr.cancel.*`.

### Potential Backend Tasks

* DTO Zod.
* Refactor `QuoteNotificationService` → `QuoteEventNotificationService`.
* `CancelQuoteRequestUseCase` con transacción y check `confirmed_intent`.
* Controller + ruta.
* Logger extension.

### Potential Database Tasks

* Verificar/migrar columnas cancel + índice booking_intents.

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* TS cancelación + restricción + idempotencia + aislamiento + regresión US-053/054.

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

* [ ] Endpoint funcional con todas las validaciones (incluyendo `confirmed_intent` check).
* [ ] Refactor a `QuoteEventNotificationService` operativo sin regresión.
* [ ] Transacción atómica (UPDATE + 2 Notifications).
* [ ] Log `quote_request.cancelled` con `correlation_id`.
* [ ] Tests verdes (functional, negative, auth, accessibility, regresión).
* [ ] i18n 4 locales para `CancelQRDialog`.
* [ ] PO valida demo (cancelación bloqueada por confirmed_intent + cancelación válida con notif).

---

## 📝 Notes

* Sin penalty (BR-BOOKING-009).
* La Quote asociada se mantiene; el job de US-053 la marcará `expired` cuando aplique.
* Documentation Alignment Required (no bloqueantes) en `management/user-stories/decision-resolutions/US-056-decision-resolution.md`.
