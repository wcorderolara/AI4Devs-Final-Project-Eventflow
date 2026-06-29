# 🧾 User Story: Vendor confirma BookingIntent (con update atómico de committed)

## 🆔 Metadata

| Field | Value |
|---|---|
| ID | US-061 |
| Backlog Item | PB-P1-036 — BookingIntent: crear, confirmar, cancelar |
| Epic | EPIC-CMP-001 |
| Feature | Endpoint `POST /vendor/booking-intents/:id/confirm` con UPDATE BudgetItem.committed atómico |
| Module / Domain | Booking / Budget |
| User Role | Vendor |
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

**As a** proveedor target del BookingIntent
**I want** confirmar el BookingIntent recibido del organizer
**So that** el estado pase a `confirmed_intent`, el `BudgetItem.committed` del organizer se actualice automáticamente y se cierre el flujo bilateral

---

## 🧠 Business Context

### Context Summary

US-061 es 2 de 3 en PB-P1-036. La confirmación del vendor dispara dos efectos atómicos: transición `pending → confirmed_intent` + actualización de `BudgetItem.committed` por la categoría de servicio de la Quote (BR-BOOKING-002 + BR-BOOKING-008 + BR-BUDGET-005). Si no existe BudgetItem para esa categoría, se crea automáticamente con `planned=0`. 2 Notifications al organizer (`booking_intent.confirmed`). Idempotente: re-confirmar ya `confirmed_intent` es no-op. Disclaimer informativo client-side (FR-BOOKING-006) sin enforcement server (diferencia con US-060).

### PO/BA Decisions Applied

| # | Decisión |
|---|---|
| D1 | BudgetItem matching por `(event_id, service_category_id)` derivado del QR de la Quote. |
| D2 | BudgetItem ausente: auto-crear con `planned=0`, `committed=quote.total_price`. Warning BR-BUDGET-004 lo maneja el dashboard. |
| D3 | `prisma.$transaction`: SELECT FOR UPDATE BookingIntent + Quote + BudgetItem; UPDATE intent → `confirmed_intent`; UPDATE/INSERT BudgetItem.committed; 2 notifs organizer. |
| D4 | Idempotencia: `confirmed_intent` ⇒ no-op `200 OK` sin tocar BudgetItem ni emitir notifs. `cancelled` ⇒ `409 BOOKING_INTENT_NOT_CONFIRMABLE`. |
| D5 | Authorization: vendor target específico (`quote.vendor_profile.user_id = currentUser.id`). Otros ⇒ `404 BOOKING_INTENT_NOT_FOUND` uniforme. |
| D6 | 2 Notifications atómicas (`booking_intent.confirmed`) vía service común extendido a 7 eventos. |
| D7 | Currency: asume `quote.currency_code = event.currency_code` (enforced por BR-QUOTE-019). Sin conversión. |
| D8 | Disclaimer client-side (FR-BOOKING-006) sin enforcement server. UI muestra texto antes de confirmar. |

### Related Domain Concepts

* `booking_intents.status='confirmed_intent'`, `confirmed_at`.
* `budget_items.committed += quote.total_price`.
* Auto-creación de BudgetItem cuando falta.
* `QuoteEventNotificationService` extendido a 7 eventos.

### Assumptions

* Quote.currency = Event.currency (BR-QUOTE-019).
* `vendor_profiles.user_id` ya enlaza al vendor.
* BookingIntent existe creado en US-060.

### Dependencies

* US-060 (creación), US-054/056/058/060 (service común), US-035..038 (Budget/BudgetItem), PB-P0-001.

---

## 🔗 Traceability

| Source | Reference |
|---|---|
| FRD Requirement(s) | FR-BOOKING-003, FR-BOOKING-006, FR-NOTIF-001, FR-NOTIF-004, FR-BUDGET-004 |
| Use Case(s) | UC-BOOKING-002 |
| Business Rule(s) | BR-BOOKING-002, BR-BOOKING-008, BR-BUDGET-005, BR-BUDGET-002/003, BR-NOTIF-001, BR-NOTIF-002 |
| Permission Rule(s) | Vendor target (assignment) |
| Data Entity / Entities | BookingIntent, Quote, QuoteRequest, BudgetItem, Budget, Event, Notification |
| API Endpoint(s) | POST /api/v1/vendor/booking-intents/:id/confirm |
| NFR Reference(s) | NFR-OBS-005, NFR-PERF-001 |
| Related Document(s) | /docs/4 §BR-BOOKING-002/008, /docs/8 §UC-BOOKING-002, /docs/9 §FR-BOOKING-003 |

---

## 🧭 Scope Guardrails

### MVP Scope
* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope
* Pagos reales (FR-BOOKING-007 — heredado de US-060).
* Cancelación del BookingIntent (US-062).
* Edición del committed por el vendor (sigue siendo del organizer).
* Confirmación parcial.
* Penalizaciones.

### Scope Notes
* Sin penalty; sin pagos.

---

## ✅ Acceptance Criteria

### AC-01: Confirmación con BudgetItem existente

**Given** vendor target, BookingIntent `pending`, BudgetItem ya existe para `(event, category)`
**When** `POST /api/v1/vendor/booking-intents/:id/confirm`
**Then** en `prisma.$transaction`:
- UPDATE `booking_intents` `status='confirmed_intent', confirmed_at=NOW()`,
- UPDATE `budget_items` `committed = committed + quote.total_price`,
- INSERT 2 Notifications al organizer (`booking_intent.confirmed`),
- log `booking_intent.confirmed`,
- responde `200 OK` con `{ booking_intent_id, status, confirmed_at }`.

### AC-02: Confirmación con BudgetItem auto-creado

**Given** vendor target, BookingIntent `pending`, sin BudgetItem para esa categoría
**When** confirma
**Then** INSERT `budget_items (budget_id, service_category_id, planned=0, committed=quote.total_price)` + resto idéntico a AC-01 + log `budget_item.auto_created_on_booking_confirm`.

### AC-03: Idempotencia

**Given** BookingIntent ya `confirmed_intent`
**When** vendor confirma de nuevo
**Then** `200 OK` retorna estado actual; no actualiza BudgetItem; no emite notifs nuevas.

---

## ⚠️ Edge Cases

### EC-01: BookingIntent cancelled
**Given** `status='cancelled'`
**When** intenta confirmar
**Then** `409 BOOKING_INTENT_NOT_CONFIRMABLE` con `details.current_status='cancelled'`. No-op DB.

### EC-02: Vendor ajeno
**Given** vendor distinto al target
**When** intenta confirmar
**Then** `404 BOOKING_INTENT_NOT_FOUND` uniforme.

### EC-03: BookingIntent inexistente o UUID malformado
* Inexistente ⇒ `404 BOOKING_INTENT_NOT_FOUND`.
* UUID malformado ⇒ `400 INVALID_UUID`.

### EC-04: Warning committed > total
**Given** suma de committed excede `Budget.total_planned`
**When** se confirma
**Then** UPDATE se aplica sin bloquear (BR-BUDGET-004). El dashboard del organizer muestra warning (US existente). Log `budget.committed_exceeds_planned` warn.

---

## 🚫 Validation Rules

| ID | Rule | Behavior |
|---|---|---|
| VR-01 | `:id` UUID válido | `400 INVALID_UUID` |
| VR-02 | Vendor target = `currentUser` | `404 BOOKING_INTENT_NOT_FOUND` |
| VR-03 | `BookingIntent.status = 'pending'` (o `confirmed_intent` para idempotencia) | `409 BOOKING_INTENT_NOT_CONFIRMABLE` |

---

## 🔐 Authorization & Security Rules

| ID | Rule |
|---|---|
| SEC-01 | Sesión `vendor` |
| SEC-02 | Vendor target específico (assignment del QR) |
| SEC-03 | `404 BOOKING_INTENT_NOT_FOUND` uniforme |
| SEC-04 | Sin captura de pagos (heredado FR-BOOKING-007) |
| SEC-05 | Sin alterar Quote ni QR fuera del scope transaccional |

### Negative Authorization Scenarios
* Sin sesión → 401; organizer/admin → 403; vendor ajeno → 404.

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
| Screen / Route | Detalle del BookingIntent (vendor) `/vendor/booking-intents/:id` |
| Main UI Pattern | `ConfirmBookingDialog` (modal con disclaimer informativo FR-BOOKING-006) |
| Primary Action | "Confirmar BookingIntent" |
| Secondary Actions | "Cancelar" (deep-link a US-062 si vendor también puede cancelar) |
| Empty State | No aplica |
| Loading State | Spinner |
| Error State | Banner i18n |
| Success State | Toast + badge `Confirmado` |
| Accessibility | Modal `role="dialog"` + disclaimer con `aria-describedby` |
| Responsive | Mobile-first |
| i18n | 4 locales (`vendor.booking.confirm.*` con disclaimer) |
| Currency | Display del `total_price` con `currency_code` del evento |

---

## 🛠 Technical Notes

### Frontend
* Components: `ConfirmBookingDialog`.
* State: TanStack mutation + invalidación.
* API: `vendorApi.bookings.confirm(id)`.

### Backend
* Use Case: `ConfirmBookingIntentUseCase` con `prisma.$transaction`.
* Controller / Route: `POST /api/v1/vendor/booking-intents/:id/confirm`.
* Authorization: vendor target.
* Validation: Zod path param.
* Transaction: Sí (confirm + committed + notif).
* Service: extender `QuoteEventNotificationService` con `booking_intent.confirmed`.

### Database
* Tablas: `booking_intents` (update), `budget_items` (update/insert), `budgets` (read), `quotes` (read), `quote_requests` (read), `notifications` (write).
* Constraints: ya en US-060 (UNIQUE parcial).
* Index considerations: `budget_items (budget_id, service_category_id)` debería existir.

### API

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/vendor/booking-intents/:id/confirm` | Confirmar BookingIntent + update committed |

#### Response 200
```json
{
  "booking_intent_id": "<uuid>",
  "status": "confirmed_intent",
  "confirmed_at": "2026-..."
}
```

### Observability
* Correlation ID: Yes
* Log: `booking_intent.confirmed`, `budget_item.auto_created_on_booking_confirm` (cuando aplica), `budget.committed_exceeds_planned` (warn).

---

## 🧪 Test Scenarios

### Functional
| ID | Scenario | Type |
|---|---|---|
| TS-01 | Confirm `pending` con BudgetItem existente: status + committed updated + 2 notifs | Integration |
| TS-02 | Confirm `pending` sin BudgetItem: auto-crea + resto idéntico | Integration |
| TS-03 | Idempotencia: re-confirm ⇒ no-op, sin segunda actualización committed | Integration |
| TS-04 | Committed > planned: actualiza + log warn, sin bloquear | Integration |
| TS-05 | Regresión service común: 6 eventos previos siguen funcionando | Integration |

### Negative
| ID | Scenario | Expected |
|---|---|---|
| NT-01 | BookingIntent `cancelled` | `409 BOOKING_INTENT_NOT_CONFIRMABLE` |
| NT-02 | Vendor ajeno | `404 BOOKING_INTENT_NOT_FOUND` |
| NT-03 | BookingIntent inexistente | `404 BOOKING_INTENT_NOT_FOUND` |
| NT-04 | UUID malformado | `400 INVALID_UUID` |
| NT-05 | Sin sesión | `401` |
| NT-06 | Organizer/Admin | `403` |

### AI Tests
Not applicable for this story.

### Authorization
| ID | Scenario | Expected |
|---|---|---|
| AUTH-TS-01 | Vendor target | 200 |
| AUTH-TS-02 | Vendor ajeno | 404 |
| AUTH-TS-03 | Organizer | 403 |
| AUTH-TS-04 | Admin | 403 |
| AUTH-TS-05 | Sin sesión | 401 |

### Accessibility
* Modal + disclaimer accesible (axe + RTL).

### Performance
* `< 500ms` por confirm.

---

## 📊 Business Impact

| Field | Value |
|---|---|
| KPI Affected | Conversión final del flujo + integridad presupuestaria |
| Expected Impact | Compromiso bilateral con dashboard actualizado |
| Success Criteria | Atomicidad + idempotencia + auto-create BudgetItem |
| Academic Demo Value | Cierre del flujo simulado con efecto cross-domain (BookingIntent → Budget) |

---

## 🧩 Task Breakdown Readiness

* FE: ConfirmBookingDialog + disclaimer + i18n.
* BE: UseCase atómico (3-step) + extender service común + controller + logger.
* DB: Verificar índice budget_items.
* QA: UT + IT (incluye auto-create BudgetItem + idempotencia + warning committed + regresión) + AUTH + A11Y.

---

## ✅ Definition of Ready
* [x] Rol, goal, FRD/UC/BR, permisos, entidades, AC GWT, edge cases, validación, out of scope, deps, UX, API, tests.
* [x] PO/BA validó.

---

## 🏁 Definition of Done
* [ ] Endpoint funcional atómico (confirm + committed + notif).
* [ ] Auto-create BudgetItem cuando falta.
* [ ] Idempotencia verificada.
* [ ] Warning committed > planned no bloquea.
* [ ] 2 Notifications atómicas vía service común extendido a 7 eventos.
* [ ] Tests verdes + regresión.
* [ ] i18n 4 locales.

---

## 📝 Notes

* Disclaimer informativo client-side (FR-BOOKING-006) sin enforcement server (diferencia con US-060).
* Documentation Alignment Required (no bloqueantes) en `management/user-stories/decision-resolutions/US-061-decision-resolution.md`.
