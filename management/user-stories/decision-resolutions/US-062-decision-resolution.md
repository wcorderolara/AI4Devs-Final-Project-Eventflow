# PO/BA Decision Resolution — US-062

## Source User Story File
management/user-stories/US-062-cancel-booking-intent.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-062-refinement-review.md

## Decision Date
2026-06-28

## 1. Resumen Ejecutivo

| Campo | Valor |
|---|---|
| User Story ID | US-062 |
| Backlog Item | PB-P1-036 |
| Decisiones tomadas | 8 |
| ¿Desbloquea aprobación? | Sí |
| User Story file updated | Yes |

## 2. Decisiones

### D1 — Revert committed condicional
```
Solo si el BookingIntent estaba `confirmed_intent` al momento de la cancelación:
- UPDATE budget_items SET committed = MAX(0, committed - quote.total_price)
  WHERE budget_id = ? AND service_category_id = ?

Si estaba `pending` ⇒ no hay revert (el committed nunca fue actualizado por este intent).
```

### D2 — Estados origen permitidos
```
`status IN ('pending', 'confirmed_intent')` ⇒ permitido cancelar.
`cancelled` ⇒ `409 BOOKING_INTENT_NOT_CANCELLABLE` con `details.current_status='cancelled'`.
```

### D3 — Cancellation reason opcional
```
Body opcional `{ reason?: string [0..500] }`. Persiste en `booking_intents.cancellation_reason`.
```

### D4 — Audit fields
```
Persiste en booking_intents:
- `cancelled_at timestamptz NOT NULL` (en la transición)
- `cancelled_by uuid NOT NULL` (= currentUser.id)
- `cancellation_reason text NULL`

Si schema base no tiene estas columnas, abrir migración menor en DB-001.
```

### D5 — Notif contraparte
```
Determinar contraparte según quien cancela:
- Organizer cancela ⇒ recipientUserId = vendor (quote.vendor_profile.user_id).
- Vendor cancela ⇒ recipientUserId = organizer (event.organizer_user_id).

2 Notifications atómicas (`in_app` + `email_simulated`) con event='booking_intent.cancelled' payload:
{ booking_intent_id, quote_id, quote_request_id, event_id, cancelled_by_role: 'organizer'|'vendor', cancellation_reason, committed_reverted: boolean }

Reusa `QuoteEventNotificationService` extendido a 8 eventos.
```

### D6 — Atomicidad transaccional
```
prisma.$transaction:
1. SELECT FOR UPDATE BookingIntent + Quote + QR + BudgetItem.
2. Validar status (D2) + idempotencia.
3. Determinar rol cancelador y validar auth bilateral (D7).
4. UPDATE BookingIntent → cancelled + cancelled_at + cancelled_by + cancellation_reason?.
5. Si previo estado era confirmed_intent: UPDATE BudgetItem committed (D1 + D8).
6. Invocar service común (D5).
7. Log 'booking_intent.cancelled' con `wasConfirmed`, `cancelledByRole`, `committedReverted`.

Rollback en cualquier error.
```

### D7 — Authorization bilateral
```
Permitido si currentUser es:
- Organizer dueño del evento que contiene la QR (events.organizer_user_id = currentUser.id), O
- Vendor target del Quote (vendor_profiles WHERE user_id = currentUser.id matches quote.vendor_profile_id).

Otros (incluyendo admin, organizer/vendor ajeno, sin sesión) ⇒ `404 BOOKING_INTENT_NOT_FOUND` uniforme.
Sin sesión ⇒ `401`. Admin ⇒ `403`.

Determina `cancelled_by_role` para payload de notif.
```

### D8 — Underflow del committed
```
Aplicar `committed = MAX(0, committed - quote.total_price)` (NO permite negativos).

Si `committed - quote.total_price < 0` (inconsistencia improbable), emitir log warn:
`budget.committed_underflow_corrected` con { budgetItemId, previousCommitted, attemptedSubtraction }.

Esto protege la integridad presupuestaria contra escenarios de datos inconsistentes.
```

## 3. Consolidated Table

| # | Tema | Decisión |
|---|---|---|
| 1 | Revert condicional | Solo si era confirmed_intent |
| 2 | Estados origen | pending + confirmed_intent |
| 3 | Reason | Opcional [0..500] |
| 4 | Audit | cancelled_at + cancelled_by + cancellation_reason |
| 5 | Notif contraparte | 2 Notifs determinadas por rol cancelador |
| 6 | Atomicidad | prisma.$transaction completa |
| 7 | Auth bilateral | Organizer dueño OR vendor target; 404 uniforme |
| 8 | Underflow | MAX(0, ...) + log warn |

## 6. File Update Result

| Campo | Valor |
|---|---|
| User Story file updated | Yes |
| Path | `management/user-stories/US-062-cancel-booking-intent.md` |
| Status | Ready for Approval |
| Remaining blockers | No |

## 8. Próximo paso

Run `eventflow-user-story-refinement` revalidación → `eventflow-user-story-approval`.
