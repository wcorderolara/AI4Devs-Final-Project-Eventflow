# PO/BA Decision Resolution — US-061

## Source User Story File
management/user-stories/US-061-vendor-confirm-booking-intent.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-061-refinement-review.md

## Decision Date
2026-06-28

## 1. Resumen Ejecutivo

| Campo | Valor |
|---|---|
| User Story ID | US-061 |
| Backlog Item | PB-P1-036 |
| Decisiones tomadas | 8 |
| ¿Desbloquea aprobación? | Sí |
| User Story file updated | Yes |

## 2. Decisiones

### D1 — BudgetItem matching
```
El use case identifica el BudgetItem destino mediante:
SELECT bi FROM budget_items bi
JOIN budgets b ON bi.budget_id = b.id
WHERE b.event_id = :eventId AND bi.service_category_id = :categoryId

`eventId` y `categoryId` se derivan del QR de la Quote.
```

### D2 — BudgetItem ausente: crear automáticamente
```
Si NO existe BudgetItem para `(event, category)`:
INSERT budget_items (budget_id, service_category_id, planned=0, committed=quote.total_price, paid=null)

El warning visual BR-BUDGET-004 (committed > total) lo gestiona el dashboard del organizer (US-038/existente). No bloquea la confirmación.

Log adicional: `budget_item.auto_created_on_booking_confirm` con `eventId`, `categoryId`, `bookingIntentId`.
```

### D3 — Atomicidad transaccional
```
prisma.$transaction:
1. SELECT FOR UPDATE BookingIntent + Quote + QR.
2. Validar `status='pending'`. Idempotencia (D4): si `confirmed_intent` ⇒ return as-is sin side-effects.
3. UPDATE BookingIntent → `confirmed_intent` + `confirmed_at=NOW()`.
4. SELECT BudgetItem por `(budget.event_id, qr.service_category_id) FOR UPDATE`.
   - Si existe: UPDATE `committed = committed + quote.total_price`.
   - Si no: INSERT con `planned=0, committed=quote.total_price`.
5. Invocar QuoteEventNotificationService.emit({eventName:'booking_intent.confirmed', recipientUserId: event.organizer_user_id, payload, tx}).
6. Log `booking_intent.confirmed`.

Rollback completo en cualquier error.
```

### D4 — Idempotencia
```
Si BookingIntent ya `confirmed_intent` ⇒ retornar el estado actual sin tocar BudgetItem ni emitir notifs (`200 OK` no-op).

`cancelled` ⇒ `409 BOOKING_INTENT_NOT_CONFIRMABLE` con `details.current_status='cancelled'`.

Otros estados (no debería existir más en MVP) ⇒ `409 BOOKING_INTENT_NOT_CONFIRMABLE`.
```

### D5 — Authorization
```
Sesión `vendor`. Vendor debe ser el target específico:
- Obtener `vp = vendor_profiles WHERE user_id = currentUser.id`.
- Validar `quote.vendor_profile_id = vp.id`.

Otros casos (BookingIntent ajeno, inexistente, organizer, admin) ⇒ `404 BOOKING_INTENT_NOT_FOUND` uniforme. `vendor` ajeno también ⇒ `404`. Sin sesión ⇒ `401`. `organizer`/`admin` ⇒ `403`.
```

### D6 — Notif organizer
```
2 Notifications atómicas (`in_app` + `email_simulated`) con `event='booking_intent.confirmed'` payload:
{ booking_intent_id, quote_id, quote_request_id, event_id, vendor_profile_id, total_price, currency_code }

Reusa `QuoteEventNotificationService` extendido a 7 eventos (añade `booking_intent.confirmed`).
```

### D7 — Currency assumption
```
Asume `quote.currency_code = event.currency_code` (enforced por BR-QUOTE-019 al crear Quote). No hay conversión.

Test smoke: si por inconsistencia de datos no coinciden, log `booking.confirm.currency_mismatch` warn pero NO bloquea (committed se suma asumiendo misma moneda). En producción real este caso debería ser imposible por constraint.
```

### D8 — Disclaimer al vendor
```
Vista del vendor muestra disclaimer (FR-BOOKING-006) en `ConfirmBookingDialog` antes de confirmar:
"Al confirmar, te comprometes con este BookingIntent. El acuerdo final ocurre fuera de la plataforma. Sin penalización financiera en plataforma."

Body NO requiere `disclaimer_accepted` server-side (a diferencia de US-060) porque el vendor sólo confirma una intención ya iniciada. UI sí muestra el disclaimer (FR-BOOKING-006). Decisión PO: confirma textual sólo client-side; el endpoint es directo.

(Si el PO prefiere paridad strict con US-060, abrir nueva US para añadir `disclaimer_accepted` también aquí. Recomendado MVP: sólo client-side.)
```

## 3. Consolidated Table

| # | Tema | Decisión |
|---|---|---|
| 1 | BudgetItem matching | Por `(event_id, service_category_id)` |
| 2 | BudgetItem ausente | Auto-crear con `planned=0` |
| 3 | Atomicidad | `prisma.$transaction` SELECT FOR UPDATE |
| 4 | Idempotencia | `confirmed_intent` no-op; `cancelled` 409 |
| 5 | Auth | Vendor target; `404 BOOKING_INTENT_NOT_FOUND` uniforme |
| 6 | Notif organizer | 2 Notifications vía service común extendido |
| 7 | Currency | Asume coincidencia + log warn si mismatch |
| 8 | Disclaimer vendor | Client-side display, sin enforcement server |

## 6. File Update Result

| Campo | Valor |
|---|---|
| User Story file updated | Yes |
| Path | `management/user-stories/US-061-vendor-confirm-booking-intent.md` |
| Status | Ready for Approval |
| Remaining blockers | No |

## 8. Próximo paso

Run `eventflow-user-story-refinement` revalidación → `eventflow-user-story-approval`.
