# PO/BA Decision Resolution — US-056

## Source User Story File
management/user-stories/US-056-cancel-active-quote-request.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-056-refinement-review.md

## Decision Date
2026-06-28

## 1. Resumen Ejecutivo

| Campo                                        | Valor                                                                            |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| User Story ID                                | US-056                                                                           |
| User Story file path                         | management/user-stories/US-056-cancel-active-quote-request.md                    |
| Refinement review artifact path              | management/user-stories/refinement-reviews/US-056-refinement-review.md           |
| Existing decision resolution found           | No                                                                               |
| Backlog Item                                 | PB-P1-034 — Cancelar QuoteRequest activa (con restricción)                      |
| Epic                                         | EPIC-QR-001                                                                      |
| Estado antes de decisiones                   | Needs Refinement                                                                 |
| Cantidad de preguntas revisadas              | 8                                                                                |
| Decisiones PO/BA tomadas                     | 8                                                                                |
| ¿Desbloquea aprobación?                      | Sí                                                                               |
| User Story file updated                      | Yes                                                                              |
| Decision Resolution artifact created/updated | Yes                                                                              |
| Próximo paso recomendado                     | Run `eventflow-user-story-refinement` revalidación → `eventflow-user-story-approval` |

---

## 2. Decisiones Respondidas

## Decisión 1 — Estados origen permitidos

```text
Una QR puede cancelarse desde `status IN ('sent', 'viewed', 'responded', 'preferred')`. Estos representan "activas" (BR-QUOTE-009 + lifecycle BR-QUOTE-005). Estados `cancelled` y `expired` ⇒ `409 QR_NOT_CANCELLABLE` con `details.current_status`.
```

### Rationale
PB-P1-034 admite cancelación incluso con Quote respondida mientras no haya `confirmed_intent`. Cubrir todos los estados "activos" simplifica la UX.

---

## Decisión 2 — Restricción `confirmed_intent`

```text
Antes de transicionar, el use case ejecuta:
`EXISTS (SELECT 1 FROM booking_intents bi JOIN quotes q ON bi.quote_id = q.id WHERE q.quote_request_id = :qrId AND bi.status = 'confirmed_intent')`

Si existe ⇒ `409 QR_HAS_CONFIRMED_BOOKING` con `details: { booking_intent_id }`. El organizer debe cancelar primero el BookingIntent (US futura PB-P1-036/US-061 si aplica).
```

### Rationale
PB-P1-034 + Decisión PO US-056 explícitas. Protege la integridad del flujo confirmado.

---

## Decisión 3 — Quote asociada no se toca

```text
La Quote asociada (si existe) NO se modifica al cancelar la QR. Permanece en su estado actual (`sent`, `responded`, etc.). El job de US-053 la marcará `expired` cuando llegue su `valid_until` si aplica.

El cliente ve la QR `cancelled` con la Quote vinculada en su estado original; los listados filtran por estado de la QR para no mostrar Quotes "huérfanas activas".
```

### Rationale
Mantiene historial trazable. Evita borrar accidentalmente trabajo del vendor.

---

## Decisión 4 — `cancellation_reason` opcional + audit fields

```text
Body opcional `{ reason?: string [0..500] }`. Persiste:
- `quote_requests.cancellation_reason` (`text NULL`).
- `quote_requests.cancelled_at` (`timestamptz NOT NULL` en la transición).
- `quote_requests.cancelled_by` (`uuid NOT NULL` = `currentUser.id`).

Si las columnas faltan en schema, abrir migración menor en DB-001.
```

### Rationale
Paridad con `rejection_reason` de US-054. Audit completo.

---

## Decisión 5 — Notif al vendor: 2 Notifications atómicas

```text
Al transicionar la QR a `cancelled`, dentro de `prisma.$transaction`:
1. INSERT `notifications(channel='in_app', recipient_user_id=vendor.user_id, event='quote_request.cancelled', delivery_status='delivered', payload={ quote_request_id, event_id, cancellation_reason })`.
2. INSERT `notifications(channel='email_simulated', delivery_status='simulated', payload=...)`.

Reusa el `QuoteEventNotificationService` refactorizado (D6).
```

### Rationale
Paridad con US-049/052/053/054.

---

## Decisión 6 — Refactor del service común

```text
Renombrar `QuoteNotificationService` (US-054) a `QuoteEventNotificationService` con método genérico:
`emit({ recipientUserId, eventName, payload, tx })`.

Soporta `eventName` ∈ `{ 'quote.rejected', 'quote.expired', 'quote_request.cancelled' }`. Los call-sites de US-053/054 se actualizan (rename + parámetro `eventName` explícito). Sin breaking semántico.
```

### Rationale
DRY + extensibilidad futura. Mantiene la atomicidad de 2 Notifications por evento.

---

## Decisión 7 — Authorization

```text
Sesión `organizer`. Organizer debe ser dueño del evento (`events.organizer_user_id = currentUser.id`) que contiene la QR. Cualquier otro caso (QR ajena, inexistente) ⇒ `404 QR_NOT_FOUND` uniforme. `vendor`/`admin` ⇒ `403`.
```

### Rationale
Patrón unificado con US-049..054.

---

## Decisión 8 — Atomicidad transaccional

```text
`CancelQuoteRequestUseCase` ejecuta `prisma.$transaction`:
1. `SELECT ... FOR UPDATE` sobre la QR (con verificación ownership + status válido).
2. Verifica `confirmed_intent` (D2) — si existe ⇒ rollback + `409 QR_HAS_CONFIRMED_BOOKING`.
3. UPDATE `status='cancelled' + cancelled_at + cancelled_by + cancellation_reason?` con guard `WHERE status IN ('sent','viewed','responded','preferred')`.
4. Invoca `QuoteEventNotificationService.emit({ eventName: 'quote_request.cancelled', ... })`.
5. Emite log `quote_request.cancelled`.

Rollback completo en error.
```

### Rationale
Garantiza consistencia: o todo (status + notifs) o nada.

---

## 3. Consolidated Decision Table

|  # | Tema                              | Decisión                                                                                                                                                          | Tipo    | ¿Bloqueaba aprobación? | Validación adicional |
| -: | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------------- | -------------------- |
|  1 | Estados origen                       | `sent`, `viewed`, `responded`, `preferred`. Otros ⇒ `409 QR_NOT_CANCELLABLE`.                                                                                    | PO      | Sí                     | No                   |
|  2 | Restricción confirmed_intent         | EXISTS check; si presente ⇒ `409 QR_HAS_CONFIRMED_BOOKING`.                                                                                                       | PO/Tech | Sí                     | No                   |
|  3 | Quote asociada                       | No se toca.                                                                                                                                                       | PO      | Sí                     | No                   |
|  4 | `cancellation_reason` + audit        | `reason?` `[0..500]`; `cancelled_at` + `cancelled_by` + `cancellation_reason`.                                                                                    | PO      | Sí                     | No                   |
|  5 | Notif vendor                          | 2 Notifications atómicas (`in_app` + `email_simulated`).                                                                                                          | PO      | Sí                     | No                   |
|  6 | Refactor service                      | `QuoteEventNotificationService` genérico.                                                                                                                          | Tech    | Sí                     | No                   |
|  7 | Authorization                         | Organizer dueño; otros ⇒ `404 QR_NOT_FOUND` uniforme.                                                                                                            | PO/Sec  | Sí                     | No                   |
|  8 | Atomicidad                            | `prisma.$transaction` con SELECT FOR UPDATE.                                                                                                                      | Tech    | Sí                     | No                   |

---

## 6. File Update Result

| Campo                                        | Valor                                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------------------- |
| User Story file updated                      | Yes                                                                                |
| User Story file path                         | `management/user-stories/US-056-cancel-active-quote-request.md`                    |
| Decision Resolution artifact created/updated | Yes                                                                                |
| New User Story status                        | Ready for Approval                                                                 |
| Remaining blockers                           | No                                                                                 |
| Reason                                       | 8/8 decisiones PO/Tech/Sec formalizadas.                                          |

---

## 7. Estado recomendado después de aplicar decisiones

`Ready for Approval`.

---

## 8. Próximo Paso Recomendado

```text
1. Revisar el archivo de User Story actualizado.
2. Ejecutar `eventflow-user-story-refinement` para revalidación.
3. Si no quedan blockers, ejecutar `eventflow-user-story-approval`.
```
