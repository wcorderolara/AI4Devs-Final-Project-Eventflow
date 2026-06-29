# PO/BA Decision Resolution — US-060

## Source User Story File
management/user-stories/US-060-create-booking-intent.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-060-refinement-review.md

## Decision Date
2026-06-28

## 1. Resumen Ejecutivo

| Campo | Valor |
|---|---|
| User Story ID | US-060 |
| Backlog Item | PB-P1-036 |
| Decisiones tomadas | 8 |
| ¿Desbloquea aprobación? | Sí |
| User Story file updated | Yes |

## 2. Decisiones

### D1 — Aceptación atómica de Quote + creación de BookingIntent
```
US-060 entrega un único endpoint POST /api/v1/organizer/booking-intents que, en una transacción atómica:
1) marca Quote.status='accepted' (transición desde sent/responded/preferred);
2) crea BookingIntent con status='pending';
3) opcionalmente actualiza QR.status='responded' si seguía en sent/viewed (no requerido por BR pero coherente);
4) emite 2 Notifications al vendor (in_app + email_simulated) con event='booking_intent.created'.

No existe endpoint separado de "accept Quote" en MVP. La aceptación es siempre + creación.
```

### D2 — Disclaimer enforcement
```
Body requiere `disclaimer_accepted: true` (boolean). Ausente o false ⇒ `400 DISCLAIMER_REQUIRED` con `details.field='disclaimer_accepted'`.

Frontend bloquea CTA "Crear intención" hasta que el organizer marque el checkbox del disclaimer (FR-BOOKING-006: "Acuerdo final fuera de la plataforma. Sin penalización financiera en plataforma.").

Disclaimer copy en 4 locales i18n: `organizer.booking.create.disclaimer.*`.
```

### D3 — Atomicidad transaccional
```
prisma.$transaction:
1. SELECT FOR UPDATE de Quote + Event + verificación ownership.
2. Validar Quote.status IN ('sent','responded','preferred') Y no vencida.
3. Validar EXISTS NOT (otro BookingIntent activo para esta Quote) — el UNIQUE parcial es backstop.
4. UPDATE Quote SET status='accepted', accepted_at=NOW().
5. INSERT BookingIntent (id, quote_id, status='pending', created_at, created_by).
6. Invocar QuoteEventNotificationService.emit({eventName:'booking_intent.created', recipientUserId: vendor.user_id, payload, tx}).
7. Log 'booking_intent.created' con correlation_id.

Rollback completo en cualquier error.
```

### D4 — UNIQUE constraint
```
Crear UNIQUE parcial: `uq_booking_intents_active_per_quote (quote_id) WHERE status IN ('pending','confirmed_intent')`.

Esto enforcea "1 BookingIntent activo por Quote". Violación ⇒ `409 BOOKING_INTENT_ALREADY_EXISTS` con `details.booking_intent_id`.

Si schema base ya tiene constraint compatible, DB-001 verifica; sino, migración menor.
```

### D5 — Notif vendor: 2 Notifications atómicas
```
2 Notifications atómicas dentro de la transacción:
- `in_app` delivered con payload `{ booking_intent_id, quote_id, quote_request_id, event_id }`.
- `email_simulated` simulated mismo payload.

Reusa `QuoteEventNotificationService` (US-054/056/058). Extender type con `'booking_intent.created'`.
```

### D6 — Estados Quote origen permitidos
```
Permitidos: `Quote.status IN ('sent','responded','preferred')` Y `(valid_until IS NULL OR valid_until >= today)`.

`accepted/rejected/expired/draft` ⇒ `409 QUOTE_NOT_ACCEPTABLE` con `details.current_status`.

Vencida (valid_until pasado) ⇒ `409 QUOTE_EXPIRED`.
```

### D7 — Authorization + 404 uniforme
```
Sesión `organizer`. Organizer debe ser dueño del evento que contiene la QR de la Quote (events.organizer_user_id = currentUser.id). Otros casos (Quote ajena, inexistente, evento ajeno) ⇒ `404 QUOTE_NOT_FOUND` uniforme.

vendor/admin ⇒ `403`. Sin sesión ⇒ `401`.
```

### D8 — No-pagos enforcement (FR-BOOKING-007)
```
DTO Zod `.strict()` rechaza cualquier campo extra. Body permitido SÓLO:
{
  quote_id: uuid,
  disclaimer_accepted: literal(true)
}

Cualquier intento de enviar `payment_method`, `card_token`, `card_number`, `amount_paid`, `payment_intent_id`, etc. ⇒ `400 INVALID_BODY`.

Test explícito de seguridad (QA): enviar cuerpo con campos de pago verifica `400`.

El BookingIntent NO almacena montos de pago — sólo referencia la Quote.
```

## 3. Consolidated Table

| # | Tema | Decisión |
|---|---|---|
| 1 | Aceptación + creación | Atómico (un solo endpoint) |
| 2 | Disclaimer | `disclaimer_accepted: true` requerido, server-side enforcement |
| 3 | Atomicidad | `prisma.$transaction` SELECT FOR UPDATE |
| 4 | UNIQUE constraint | parcial `(quote_id) WHERE status IN ('pending','confirmed_intent')` |
| 5 | Notif vendor | 2 Notifications atómicas vía service común extendido |
| 6 | Estados Quote origen | `sent`/`responded`/`preferred` no vencidas |
| 7 | Auth | Organizer dueño; `404 QUOTE_NOT_FOUND` uniforme |
| 8 | No pagos | DTO `.strict()` + test seguridad |

## 6. File Update Result

| Campo | Valor |
|---|---|
| User Story file updated | Yes |
| Path | `management/user-stories/US-060-create-booking-intent.md` |
| Status | Ready for Approval |
| Remaining blockers | No |

## 8. Próximo paso

Run `eventflow-user-story-refinement` revalidación → `eventflow-user-story-approval`.
