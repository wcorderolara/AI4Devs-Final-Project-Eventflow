# 🧾 User Story: Cancelar BookingIntent sin penalización (bilateral, revert committed)

## 🆔 Metadata

| Field | Value |
|---|---|
| ID | US-062 |
| Backlog Item | PB-P1-036 — BookingIntent: crear, confirmar, cancelar |
| Epic | EPIC-CMP-001 |
| Feature | Endpoint bilateral `POST /booking-intents/:id/cancel` + revert atómico de committed (si era `confirmed_intent`) |
| Module / Domain | Booking / Budget |
| User Role | Organizer / Vendor |
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

**As an** organizador o proveedor target
**I want** cancelar un BookingIntent (incluso `confirmed_intent`) sin penalización, revirtiendo automáticamente el `committed` del BudgetItem si aplica y notificando a la contraparte
**So that** mantenga flexibilidad operativa (Decisión PO 8.1 #5 + BR-BOOKING-009) sin afectar la integridad presupuestaria

---

## 🧠 Business Context

### Context Summary

US-062 cierra PB-P1-036 + EPIC-CMP-001. Cancelación bilateral del `BookingIntent` desde cualquier estado activo (`pending`, `confirmed_intent`). Sin penalty (decisión PO 8.1 #5). Si estaba `confirmed_intent`, revierte el `BudgetItem.committed` en `MAX(0, ...)`. Audit completo (`cancelled_at`, `cancelled_by`, `cancellation_reason?`). 2 Notifications a la contraparte (`booking_intent.cancelled`) vía service común extendido a 8 eventos.

### PO/BA Decisions Applied

| # | Decisión |
|---|---|
| D1 | Revert committed condicional: SOLO si BookingIntent estaba `confirmed_intent`. `pending` ⇒ no hay revert. |
| D2 | Estados origen permitidos: `pending`, `confirmed_intent`. `cancelled` ⇒ `409 BOOKING_INTENT_NOT_CANCELLABLE`. |
| D3 | Body opcional `{ reason?: string [0..500] }`. Persiste en `cancellation_reason`. |
| D4 | Audit obligatorio: `cancelled_at`, `cancelled_by`, `cancellation_reason`. Migración menor si schema no los tiene. |
| D5 | Notif contraparte: organizer cancela ⇒ notif vendor; vendor cancela ⇒ notif organizer. 2 Notifications atómicas vía service común. |
| D6 | `prisma.$transaction`: SELECT FOR UPDATE + UPDATE intent + UPDATE BudgetItem (si aplica) + 2 notifs + log. |
| D7 | Authorization bilateral: organizer dueño OR vendor target. Otros ⇒ `404 BOOKING_INTENT_NOT_FOUND` uniforme. |
| D8 | Underflow del committed: `MAX(0, committed - total_price)` + log warn `budget.committed_underflow_corrected` si aplica. |

### Related Domain Concepts

* `booking_intents.status='cancelled'`, `cancelled_at`, `cancelled_by`, `cancellation_reason`.
* Revert atómico del `BudgetItem.committed` (BR-BOOKING-008 + BR-BUDGET-005).
* Sin penalty (BR-BOOKING-009).
* `QuoteEventNotificationService` extendido a 8 eventos.

### Assumptions

* `booking_intents` schema tiene/tendrá las columnas audit.
* BR-QUOTE-019 garantiza coincidencia de currency.

### Dependencies

* US-060 (creación), US-061 (confirm + committed update), US-054/056/058/060/061 (service común), PB-P0-001.

---

## 🔗 Traceability

| Source | Reference |
|---|---|
| FRD Requirement(s) | FR-BOOKING-002, FR-NOTIF-001, FR-NOTIF-004, FR-BUDGET-004 |
| Use Case(s) | UC-BOOKING-003 |
| Business Rule(s) | BR-BOOKING-008, BR-BOOKING-009, BR-BUDGET-005, BR-NOTIF-001, BR-NOTIF-002 |
| Permission Rule(s) | Organizer dueño OR Vendor target |
| Data Entity / Entities | BookingIntent, Quote, QuoteRequest, BudgetItem, Budget, Event, VendorProfile, Notification |
| API Endpoint(s) | POST /api/v1/booking-intents/:id/cancel |
| NFR Reference(s) | NFR-OBS-005, NFR-PERF-001 |
| Related Document(s) | /docs/4 §BR-BOOKING-008/009, /docs/8 §UC-BOOKING-003, /docs/8.1 #5 |

---

## 🧭 Scope Guardrails

### MVP Scope
* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope
* Penalty automático (BR-BOOKING-009).
* Reactivación de BookingIntent cancelled.
* Cancelación masiva.
* Pagos / refunds reales.

### Scope Notes
* Soft cancel (status='cancelled', no DELETE).

---

## ✅ Acceptance Criteria

### AC-01: Cancelación de BookingIntent `confirmed_intent` con revert

**Given** organizer dueño o vendor target, BookingIntent `confirmed_intent`, body `{ reason: "Cambio de fechas" }`
**When** `POST /api/v1/booking-intents/:id/cancel`
**Then** en `prisma.$transaction`:
- UPDATE `booking_intents` `status='cancelled', cancelled_at=NOW(), cancelled_by=currentUser.id, cancellation_reason='...'`,
- UPDATE `budget_items.committed = MAX(0, committed - quote.total_price)`,
- INSERT 2 Notifications a la contraparte (`booking_intent.cancelled`) con `cancelled_by_role` y `committed_reverted=true`,
- log `booking_intent.cancelled`,
- responde `200 OK`.

### AC-02: Cancelación de BookingIntent `pending` sin revert

**Given** BookingIntent `pending`
**When** se cancela
**Then** UPDATE intent (sin tocar BudgetItem) + 2 notifs con `committed_reverted=false`.

### AC-03: Sin `reason`

**Given** body sin `reason`
**When** se cancela
**Then** `cancellation_reason=null`; resto idéntico.

---

## ⚠️ Edge Cases

### EC-01: Ya cancelado
**Given** `status='cancelled'`
**When** se intenta de nuevo
**Then** `409 BOOKING_INTENT_NOT_CANCELLABLE` con `details.current_status='cancelled'`. No-op DB ni notifs.

### EC-02: Tercero (ni organizer dueño ni vendor target)
**Given** otro user
**When** intenta cancelar
**Then** `404 BOOKING_INTENT_NOT_FOUND` uniforme.

### EC-03: BookingIntent inexistente
`404 BOOKING_INTENT_NOT_FOUND`.

### EC-04: UUID malformado
`400 INVALID_UUID`.

### EC-05: `reason` excede 500 chars
`400 INVALID_CANCELLATION_REASON`.

### EC-06: Underflow committed
**Given** BookingIntent `confirmed_intent` y `committed < quote.total_price`
**When** se cancela
**Then** `committed=0` (no negativo) + log warn `budget.committed_underflow_corrected`.

---

## 🚫 Validation Rules

| ID | Rule | Behavior |
|---|---|---|
| VR-01 | `:id` UUID válido | `400 INVALID_UUID` |
| VR-02 | `reason` si presente `[0..500]` | `400 INVALID_CANCELLATION_REASON` |
| VR-03 | Organizer dueño OR vendor target | `404 BOOKING_INTENT_NOT_FOUND` |
| VR-04 | `status IN ('pending','confirmed_intent')` | `409 BOOKING_INTENT_NOT_CANCELLABLE` |

---

## 🔐 Authorization & Security Rules

| ID | Rule |
|---|---|
| SEC-01 | Sesión `organizer` o `vendor` |
| SEC-02 | Organizer dueño del evento OR vendor target del QR |
| SEC-03 | `404 BOOKING_INTENT_NOT_FOUND` uniforme |
| SEC-04 | Sin pagos / refunds reales |
| SEC-05 | Sin penalty (BR-BOOKING-009 + Decisión PO 8.1 #5) |

### Negative Authorization Scenarios
* Sin sesión → 401; admin → 403; tercero → 404.

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
| Screen / Route | Detalle BookingIntent (organizer y vendor) |
| Main UI Pattern | `CancelBookingDialog` (modal accesible con textarea opcional reason) |
| Primary Action | "Cancelar BookingIntent" |
| Secondary Actions | "Volver" |
| Empty State | No aplica |
| Loading State | Spinner |
| Error State | Banner i18n por código |
| Success State | Toast + redirect a vista de evento |
| Accessibility | Modal `role="dialog"`, focus trap, ESC, textarea con label |
| Responsive | Mobile-first |
| i18n | 4 locales (`booking.cancel.*` shared organizer/vendor) |
| Currency | No aplica directamente; vista del committed actualizado |

---

## 🛠 Technical Notes

### Frontend
* Components: `CancelBookingDialog` (compartido organizer/vendor).
* State: TanStack mutation + invalidación de queries de booking + budget.
* API: `bookingsApi.cancel(id, { reason? })` (común a ambos roles).

### Backend
* Use Case: `CancelBookingIntentUseCase` con `prisma.$transaction`.
* Controller / Route: `POST /api/v1/booking-intents/:id/cancel` (compartido).
* Authorization: bilateral (organizer dueño OR vendor target).
* Validation: Zod path + body opcional.
* Transaction: Sí.
* Service: extender `QuoteEventNotificationService` con `booking_intent.cancelled`.

### Database
* Tablas: `booking_intents` (update), `budget_items` (update si revert), `quotes` (read), `quote_requests` (read), `events` (read), `vendor_profiles` (read), `notifications` (write).
* Migración menor: verificar `cancelled_at`, `cancelled_by`, `cancellation_reason` en `booking_intents`. Si faltan, añadir.

### API

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/booking-intents/:id/cancel` | Cancelar BookingIntent bilateral con revert condicional |

#### Request body (opcional)
```json
{ "reason": "Cambio de fechas" }
```

#### Response 200
```json
{
  "booking_intent_id": "<uuid>",
  "status": "cancelled",
  "cancelled_at": "2026-...",
  "cancelled_by": "<uuid>",
  "cancelled_by_role": "organizer",
  "cancellation_reason": "Cambio de fechas",
  "committed_reverted": true
}
```

### Observability
* Correlation ID: Yes
* Log: `booking_intent.cancelled` con `wasConfirmed`, `cancelledByRole`, `committedReverted`. Adicional: `budget.committed_underflow_corrected` warn cuando aplique.

---

## 🧪 Test Scenarios

### Functional
| ID | Scenario | Type |
|---|---|---|
| TS-01 | Organizer cancela `confirmed_intent`: revert committed + notif vendor | Integration |
| TS-02 | Vendor cancela `confirmed_intent`: revert committed + notif organizer | Integration |
| TS-03 | Cancel `pending` sin revert: notif contraparte con `committed_reverted=false` | Integration |
| TS-04 | Cancel sin `reason`: persiste null | Integration |
| TS-05 | Regresión service común: 7 eventos previos siguen funcionando | Integration |

### Negative
| ID | Scenario | Expected |
|---|---|---|
| NT-01 | Ya `cancelled` | `409 BOOKING_INTENT_NOT_CANCELLABLE` |
| NT-02 | Tercero | `404 BOOKING_INTENT_NOT_FOUND` |
| NT-03 | Inexistente | `404 BOOKING_INTENT_NOT_FOUND` |
| NT-04 | UUID malformado | `400 INVALID_UUID` |
| NT-05 | `reason > 500` chars | `400 INVALID_CANCELLATION_REASON` |
| NT-06 | Sin sesión | `401` |
| NT-07 | Admin | `403` |

### AI Tests
Not applicable for this story.

### Authorization
| ID | Scenario | Expected |
|---|---|---|
| AUTH-TS-01 | Organizer dueño | 200 |
| AUTH-TS-02 | Vendor target | 200 |
| AUTH-TS-03 | Organizer ajeno | 404 |
| AUTH-TS-04 | Vendor ajeno | 404 |
| AUTH-TS-05 | Admin | 403 |
| AUTH-TS-06 | Sin sesión | 401 |

### Accessibility
* Dialog + textarea accesible.

### Edge Case
* Underflow committed: log warn + committed=0.

### Performance
* `< 500ms` por cancel.

---

## 📊 Business Impact

| Field | Value |
|---|---|
| KPI Affected | Confianza y flexibilidad bilateral |
| Expected Impact | Cierre del ciclo con integridad presupuestaria |
| Success Criteria | Bilateral + revert condicional + idempotencia |
| Academic Demo Value | Cierre del flujo simulado (Decisión PO 8.1 #5) |

---

## 🧩 Task Breakdown Readiness

* FE: `CancelBookingDialog` compartido + i18n.
* BE: UseCase + extender service común a 8 eventos + controller + logger.
* DB: Verificar/migrar columnas audit en `booking_intents`.
* QA: UT + IT (incluye revert condicional + underflow + bilateral + regresión) + AUTH + A11Y.

---

## ✅ Definition of Ready
* [x] Rol, goal, FRD/UC/BR, permisos, entidades, AC GWT, edge cases, validación, out of scope, deps, UX, API, tests.
* [x] PO/BA validó.

---

## 🏁 Definition of Done
* [ ] Endpoint funcional bilateral.
* [ ] Revert committed condicional + MAX(0, ...).
* [ ] Audit fields persistidos.
* [ ] 2 Notifications atómicas a contraparte vía service común extendido a 8 eventos.
* [ ] Idempotencia + tests bilaterales + regresión.
* [ ] i18n 4 locales.
* [ ] PO valida demo de cierre del flujo.

---

## 📝 Notes

* Sin penalty (BR-BOOKING-009).
* Penalizaciones fuera de la plataforma (acuerdo externo entre partes).
* Documentation Alignment Required (no bloqueantes) en `management/user-stories/decision-resolutions/US-062-decision-resolution.md`.
