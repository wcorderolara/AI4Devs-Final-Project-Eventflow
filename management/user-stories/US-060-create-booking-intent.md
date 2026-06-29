# 🧾 User Story: Crear BookingIntent desde Quote vigente (aceptación + creación atómica)

## 🆔 Metadata

| Field | Value |
|---|---|
| ID | US-060 |
| Backlog Item | PB-P1-036 — BookingIntent: crear, confirmar, cancelar |
| Epic | EPIC-CMP-001 |
| Feature | Endpoint atómico: `Quote.status='accepted'` + INSERT `BookingIntent.status='pending'` + notif vendor |
| Module / Domain | Booking |
| User Role | Organizer |
| Priority | Must Have |
| Status | Approved |
| Owner | Product Owner / Business Analyst |
| Sprint / Milestone | MVP |
| Created Date | 2026-06-09 |
| Last Updated | 2026-06-28 |
| Approved By | PO/BA Review |
| Approval Date | 2026-06-28 |
| Ready for Development Tasks | Yes |

---

## 🎯 User Story

**As an** organizador autenticado dueño del evento
**I want** un endpoint `POST /api/v1/organizer/booking-intents` que, aceptando una Quote vigente, cree atómicamente un `BookingIntent` con `pending` y notifique al vendor, requiriendo confirmación explícita del disclaimer
**So that** envíe la señal formal de intención sin involucrar pagos ni contratos en la plataforma (Decisión PO 8.1 #5)

---

## 🧠 Business Context

### Context Summary

US-060 es la 1ª de 3 en PB-P1-036 (US-060 crear, US-061 confirmar vendor, US-062 cancelar). El endpoint es atómico: marca `Quote.status='accepted'`, crea `BookingIntent.status='pending'`, emite 2 Notifications al vendor (`booking_intent.created`) y registra log. No existe endpoint separado de "accept Quote" en MVP — la aceptación es siempre la creación del intent. Disclaimer server-side enforcement (FR-BOOKING-006/007). Sin pagos reales.

### PO/BA Decisions Applied

| # | Decisión |
|---|---|
| D1 | Endpoint atómico: aceptación de Quote + creación de BookingIntent en una sola transacción. |
| D2 | Body requiere `disclaimer_accepted: true`. Ausente/false ⇒ `400 DISCLAIMER_REQUIRED`. |
| D3 | `prisma.$transaction` con SELECT FOR UPDATE: UPDATE Quote → `accepted` + INSERT BookingIntent → `pending` + 2 notifs. |
| D4 | UNIQUE parcial `booking_intents (quote_id) WHERE status IN ('pending','confirmed_intent')`. Violación ⇒ `409 BOOKING_INTENT_ALREADY_EXISTS`. |
| D5 | 2 Notifications atómicas (`in_app` + `email_simulated`) con `event='booking_intent.created'` vía `QuoteEventNotificationService` extendido. |
| D6 | Quote origen permitida: `status IN ('sent','responded','preferred')` Y no vencida. Otros ⇒ `409 QUOTE_NOT_ACCEPTABLE` / `409 QUOTE_EXPIRED`. |
| D7 | Authorization: organizer dueño del evento. Otros ⇒ `404 QUOTE_NOT_FOUND` uniforme. |
| D8 | DTO `.strict()`: rechaza cualquier campo de pago (FR-BOOKING-007). Test de seguridad explícito. |

### Related Domain Concepts

* `booking_intents.status='pending'`, transición posterior a `confirmed_intent` (US-061) o `cancelled` (US-062).
* `quotes.status='accepted'`, `accepted_at`.
* `QuoteEventNotificationService` extendido a 6 eventos.
* Disclaimer obligatorio (FR-BOOKING-006).

### Assumptions

* Schema `booking_intents` entregado por PB-P0-001.
* `QuoteEventNotificationService` activo (US-054/056/058).

### Dependencies

* US-052 (Quote creation), US-058 (preferred toggle previo opcional), US-054/056/058 (service común a extender).
* PB-P0-001 (schema BookingIntent).

---

## 🔗 Traceability

| Source | Reference |
|---|---|
| FRD Requirement(s) | FR-BOOKING-001, FR-BOOKING-002, FR-BOOKING-006, FR-BOOKING-007, FR-NOTIF-001, FR-NOTIF-004 |
| Use Case(s) | UC-BOOKING-001 |
| Business Rule(s) | BR-BOOKING-001, BR-BOOKING-004, BR-BOOKING-006, BR-BOOKING-007, BR-NOTIF-001, BR-NOTIF-002 |
| Permission Rule(s) | Organizer dueño del evento |
| Data Entity / Entities | BookingIntent, Quote, QuoteRequest, Notification, Event, VendorProfile |
| API Endpoint(s) | POST /api/v1/organizer/booking-intents |
| NFR Reference(s) | NFR-OBS-005, NFR-PERF-001 |
| Related ADR(s) | — |
| Related Document(s) | /docs/4 §BR-BOOKING-001..007, /docs/8 §UC-BOOKING-001, /docs/9 §FR-BOOKING-001..007, /docs/8.1 #5 |

---

## 🧭 Scope Guardrails

### MVP Scope
* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope
* Pagos reales (FR-BOOKING-007).
* Captura de medios de pago, tokenización, cobros, transferencias, depósitos.
* Contratos firmados digitalmente.
* Penalizaciones financieras.
* Confirmación del vendor (US-061).
* Cancelación (US-062).

### Scope Notes
* Disclaimer obligatorio server + client.

---

## ✅ Acceptance Criteria

### AC-01: Creación atómica con Quote `sent/responded/preferred` vigente

**Given** organizer dueño, Quote `status='sent'`/`responded`/`preferred` no vencida, sin otro BookingIntent activo, body `{ quote_id, disclaimer_accepted: true }`
**When** `POST /api/v1/organizer/booking-intents`
**Then** en `prisma.$transaction`:
- UPDATE `quotes` `status='accepted', accepted_at=NOW()`,
- INSERT `booking_intents (id, quote_id, status='pending', created_at, created_by)`,
- INSERT 2 Notifications al vendor (`booking_intent.created`) vía service común,
- emite log `booking_intent.created` con `correlation_id`,
- responde `201 Created` con `{ booking_intent_id, quote_id, status: "pending" }`.

### AC-02: Disclaimer obligatorio
**Given** body sin `disclaimer_accepted` o con `false`
**When** se valida
**Then** `400 DISCLAIMER_REQUIRED` con `details.field='disclaimer_accepted'`. No-op DB.

### AC-03: Sin pagos (FR-BOOKING-007)
**Given** body con cualquier campo de pago (`payment_method`, `card_token`, etc.)
**When** se valida
**Then** `400 INVALID_BODY` por DTO `.strict()`. No-op DB.

---

## ⚠️ Edge Cases

### EC-01: Quote vencida
**Given** Quote `valid_until < today`
**When** se intenta
**Then** `409 QUOTE_EXPIRED` con `details.valid_until`.

### EC-02: Estado Quote no permitido
**Given** Quote ya `accepted`/`rejected`/`expired`/`draft`
**When** se intenta
**Then** `409 QUOTE_NOT_ACCEPTABLE` con `details.current_status`.

### EC-03: BookingIntent activo ya existe
**Given** existe BookingIntent `pending`/`confirmed_intent` para la Quote
**When** se intenta
**Then** `409 BOOKING_INTENT_ALREADY_EXISTS` con `details.booking_intent_id`. UNIQUE parcial enforced.

### EC-04: Quote ajena o inexistente
**Given** Quote de otro evento o UUID inexistente
**When** se valida
**Then** `404 QUOTE_NOT_FOUND` uniforme.

### EC-05: UUID malformado
**Given** `quote_id` no UUID
**When** se valida
**Then** `400 INVALID_UUID`.

---

## 🚫 Validation Rules

| ID | Rule | Behavior |
|---|---|---|
| VR-01 | `quote_id` UUID válido | `400 INVALID_UUID` |
| VR-02 | `disclaimer_accepted === true` | `400 DISCLAIMER_REQUIRED` |
| VR-03 | DTO `.strict()` sin campos extra | `400 INVALID_BODY` |
| VR-04 | Organizer dueño del evento | `404 QUOTE_NOT_FOUND` |
| VR-05 | Quote `status IN ('sent','responded','preferred')` | `409 QUOTE_NOT_ACCEPTABLE` |
| VR-06 | Quote no vencida | `409 QUOTE_EXPIRED` |
| VR-07 | Sin BookingIntent activo previo | `409 BOOKING_INTENT_ALREADY_EXISTS` |

---

## 🔐 Authorization & Security Rules

| ID | Rule |
|---|---|
| SEC-01 | Sesión `organizer` |
| SEC-02 | Ownership del evento |
| SEC-03 | `404 QUOTE_NOT_FOUND` uniforme |
| SEC-04 | DTO `.strict()` impide campos de pago (FR-BOOKING-007) |
| SEC-05 | Sin tokenización, captura ni almacenamiento de medios de pago |
| SEC-06 | Disclaimer enforcement server-side (no confiar en frontend) |

### Negative Authorization Scenarios
* Sin sesión → 401; vendor/admin → 403; ajeno → 404.

---

## 🤖 AI Behavior

This story does not invoke AI directly.

* AI Feature: None
* Provider Layer: Not applicable
* AI Input/Output/HITL/Fallback: Not applicable

---

## 🎨 UX / UI Notes

| Area | Notes |
|---|---|
| Screen / Route | Detalle de Quote del organizer / vista del comparador |
| Main UI Pattern | `CreateBookingDialog` (modal accesible con checkbox disclaimer) |
| Primary Action | "Crear intención de booking" (deshabilitado hasta disclaimer marcado) |
| Secondary Actions | "Cancelar" |
| Empty State | No aplica |
| Loading State | Spinner CTA |
| Error State | Banner i18n por código (`QUOTE_EXPIRED`, `QUOTE_NOT_ACCEPTABLE`, `BOOKING_INTENT_ALREADY_EXISTS`, `DISCLAIMER_REQUIRED`) |
| Success State | Toast + redirect a vista de booking |
| Accessibility | Modal `role="dialog"`, focus trap, ESC; disclaimer con `aria-describedby`; checkbox con label asociado |
| Responsive | Mobile-first |
| i18n | 4 locales (`organizer.booking.create.*`, incluyendo `disclaimer.*`) |
| Currency | Heredada del evento (visualización del monto de Quote) |

---

## 🛠 Technical Notes

### Frontend
* Components: `CreateBookingDialog` con checkbox disclaimer + texto legal i18n.
* State: TanStack mutation + invalidación de queries de Quote/event.
* Forms: RHF + Zod (espejo del backend).
* API: `organizerApi.bookings.create({ quoteId, disclaimerAccepted })`.

### Backend
* Use Case: `CreateBookingIntentUseCase` con `prisma.$transaction`.
* Controller / Route: `POST /api/v1/organizer/booking-intents`.
* Authorization: Organizer + ownership.
* Validation: Zod `.strict()`.
* Transaction: Sí.
* Service: extender `QuoteEventNotificationService` con `booking_intent.created`.

### Database
* Tablas: `booking_intents` (insert), `quotes` (update), `quote_requests` (read), `events` (read), `vendor_profiles` (read), `notifications` (write).
* Migración menor: UNIQUE parcial `uq_booking_intents_active_per_quote (quote_id) WHERE status IN ('pending','confirmed_intent')`.
* Verificar columnas: `quotes.accepted_at timestamptz NULL`, `booking_intents.created_by uuid NOT NULL`.

### API

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/organizer/booking-intents` | Crear BookingIntent atómicamente con aceptación de Quote |

#### Request body
```json
{ "quote_id": "<uuid>", "disclaimer_accepted": true }
```

#### Response 201
```json
{
  "booking_intent_id": "<uuid>",
  "quote_id": "<uuid>",
  "status": "pending",
  "created_at": "2026-..."
}
```

### Observability
* Correlation ID: Yes
* Log: `booking_intent.created` con `quoteId`, `bookingIntentId`, `organizerUserId`.

---

## 🧪 Test Scenarios

### Functional
| ID | Scenario | Type |
|---|---|---|
| TS-01 | Crear desde Quote `sent` vigente: Quote → `accepted`, BookingIntent `pending`, 2 notifs vendor | Integration |
| TS-02 | Disclaimer enforcement: ausente ⇒ `400` | Integration |
| TS-03 | Atomicidad: si falla notif, rollback completo | Integration |
| TS-04 | UNIQUE parcial: 2 POST simultáneos ⇒ uno gana, otro `409 BOOKING_INTENT_ALREADY_EXISTS` | Integration |
| TS-05 | Regresión service común: `quote.rejected/expired/marked_preferred/quote_request.cancelled` siguen funcionando | Integration |

### Negative
| ID | Scenario | Expected |
|---|---|---|
| NT-01 | Quote `expired` (valid_until) | `409 QUOTE_EXPIRED` |
| NT-02 | Quote `accepted`/`rejected`/`expired`/`draft` | `409 QUOTE_NOT_ACCEPTABLE` |
| NT-03 | BookingIntent activo ya existe | `409 BOOKING_INTENT_ALREADY_EXISTS` |
| NT-04 | Sin disclaimer | `400 DISCLAIMER_REQUIRED` |
| NT-05 | Body con campos de pago (`payment_method`, `card_token`, etc.) | `400 INVALID_BODY` |
| NT-06 | Quote ajena | `404 QUOTE_NOT_FOUND` |
| NT-07 | UUID malformado | `400 INVALID_UUID` |
| NT-08 | Sin sesión | `401` |
| NT-09 | Vendor/Admin | `403` |

### AI Tests
Not applicable for this story.

### Authorization
| ID | Scenario | Expected |
|---|---|---|
| AUTH-TS-01 | Organizer dueño | 201 |
| AUTH-TS-02 | Organizer ajeno | 404 |
| AUTH-TS-03 | Vendor | 403 |
| AUTH-TS-04 | Admin | 403 |
| AUTH-TS-05 | Sin sesión | 401 |

### Accessibility
* Modal accesible + checkbox disclaimer con label + axe + RTL.

### Performance
* `< 500ms` por creación (incluyendo notifs).

---

## 📊 Business Impact

| Field | Value |
|---|---|
| KPI Affected | Conversión final del flujo de booking |
| Expected Impact | Señal formal bilateral sin fricción de pagos |
| Success Criteria | Atomicidad + UNIQUE enforced + sin pagos reales |
| Academic Demo Value | Núcleo del flujo simulado (Decisión PO 8.1 #5) |

---

## 🧩 Task Breakdown Readiness

### Frontend
* `CreateBookingDialog` con disclaimer accesible.
* `organizerApi.bookings.create` + MSW.
* i18n `organizer.booking.create.*` (4 locales).

### Backend
* DTO Zod `.strict()`.
* Extender `QuoteEventNotificationService` con `booking_intent.created`.
* `CreateBookingIntentUseCase` con transacción.
* Controller + ruta.
* Logger.

### Database
* DB-001 verify + migración UNIQUE parcial + columnas (si faltan).

### QA
* UT + IT (con regresión service común) + AUTH + A11Y + Security (no pagos) + Concurrencia (UNIQUE).

---

## ✅ Definition of Ready
* [x] Rol, goal, FRD/UC/BR, permisos, entidades, AC GWT, edge cases, validación, out of scope, deps, UX, API, tests.
* [x] PO/BA validó.

---

## 🏁 Definition of Done
* [ ] Endpoint funcional con transacción atómica.
* [ ] UNIQUE parcial enforced.
* [ ] Disclaimer enforcement server-side.
* [ ] DTO `.strict()` rechaza campos de pago.
* [ ] 2 Notifications atómicas vía service común extendido.
* [ ] Tests verdes + regresión US-053/054/056/058.
* [ ] i18n 4 locales con disclaimer.
* [ ] PO valida demo.

---

## 📝 Notes

* Sin pagos reales (FR-BOOKING-007 + Decisión PO 8.1 #5).
* Copy del disclaimer revisado por legal antes de producción real.
* Documentation Alignment Required (no bloqueantes) en `management/user-stories/decision-resolutions/US-060-decision-resolution.md`.
