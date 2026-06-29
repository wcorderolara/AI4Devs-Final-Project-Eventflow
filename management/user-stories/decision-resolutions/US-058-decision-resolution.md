# PO/BA Decision Resolution — US-058

## Source User Story File
management/user-stories/US-058-mark-quote-preferred.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-058-refinement-review.md

## Decision Date
2026-06-28

## 1. Resumen Ejecutivo

| Campo | Valor |
|---|---|
| User Story ID | US-058 |
| Backlog Item | PB-P1-035 |
| Decisiones tomadas | 7 |
| ¿Desbloquea aprobación? | Sí |
| User Story file updated | Yes |

## 2. Decisiones

### D1 — Toggle semantics
```
PATCH /api/v1/quotes/:id/preferred body `{ "is_preferred": boolean }`. Idempotente: PATCH con valor actual = no-op.
```

### D2 — Atomicidad transaccional
```
prisma.$transaction: SELECT FOR UPDATE de Quote target + Event; si se marca `true`, primero UPDATE `is_preferred=false` para cualquier otra Quote del mismo (event_id, service_category_id) que esté como preferred; luego UPDATE target a `true`. Emite notificaciones (D4) dentro de la misma transacción.
```

### D3 — Estados origen
```
Permitido sólo cuando Quote `status IN ('sent', 'responded')` Y `(valid_until IS NULL OR valid_until >= today)`. Quotes `expired/rejected/accepted/draft` ⇒ `409 QUOTE_NOT_PREFERABLE` con `details.current_status`.

Nota: cuando una Quote se marca preferred, su QR asociada puede pasar a status `preferred` lógicamente, pero no requiere cambio porque BR-QUOTE-009 reconoce `preferred` como activo. (Sin cambio en QR; sólo Quote.is_preferred).
```

### D4 — Notificaciones al vendor
```
Vendor de la Quote target: 2 Notifications (`in_app` + `email_simulated`) con `event='quote.marked_preferred'` payload `{ quote_id, quote_request_id, event_id }`.

Vendor de la Quote previa (si existía otra preferred): 2 Notifications con `event='quote.unmarked_preferred'` mismo payload pattern.

Reusa `QuoteEventNotificationService` (US-054/056). Agregar los 2 nuevos eventos al type.
```

### D5 — Constraint DB
```
UNIQUE parcial `uq_quotes_preferred_per_event_category (event_id_via_qr, service_category_id_via_qr) WHERE is_preferred=true`.

Como `event_id` y `service_category_id` viven en `quote_requests` (no en `quotes`), considerar denormalizar `event_id` + `service_category_id` en `quotes` (migración menor) o usar trigger. DB-001 decide; recomendado denormalizar para soportar UNIQUE parcial nativo.
```

### D6 — Unmark
```
PATCH con `{ is_preferred: false }` permitido (toggle off). Emite Notification `quote.unmarked_preferred` al vendor. La QR no cambia.
```

### D7 — 404 uniforme
```
Quote ajena, inexistente o de evento no propio ⇒ `404 QUOTE_NOT_FOUND` uniforme.
```

## 3. Consolidated Table

| # | Tema | Decisión |
|---|---|---|
| 1 | Toggle | PATCH body `is_preferred: boolean` |
| 2 | Atomicidad | `prisma.$transaction` con SELECT FOR UPDATE + clear previa + set nueva |
| 3 | Estados | Sólo `sent`/`responded` no vencidas |
| 4 | Notif | 2+2 Notifications (target + previa) vía service común |
| 5 | Constraint | UNIQUE parcial; denormalizar event_id + category_id en quotes |
| 6 | Unmark | Permitido con notif al vendor |
| 7 | 404 | Uniforme |

## 6. File Update Result

| Campo | Valor |
|---|---|
| User Story file updated | Yes |
| Path | `management/user-stories/US-058-mark-quote-preferred.md` |
| Status | Ready for Approval |

## 8. Próximo paso

Run `eventflow-user-story-refinement` revalidación → `eventflow-user-story-approval`.
