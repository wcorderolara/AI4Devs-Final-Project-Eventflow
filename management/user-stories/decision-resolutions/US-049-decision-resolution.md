# PO/BA Decision Resolution — US-049

## Source User Story File
management/user-stories/US-049-send-quote-request.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-049-refinement-review.md

## Decision Date
2026-06-27

## 1. Resumen Ejecutivo

| Campo                                        | Valor                                                                            |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| User Story ID                                | US-049                                                                           |
| User Story file path                         | management/user-stories/US-049-send-quote-request.md                             |
| Refinement review artifact path              | management/user-stories/refinement-reviews/US-049-refinement-review.md           |
| Existing decision resolution found           | No                                                                               |
| Backlog Item                                 | PB-P1-030 — Crear QuoteRequest con brief estructurado (+ límite 5)              |
| Epic                                         | EPIC-QR-001                                                                      |
| Estado antes de decisiones                   | Needs Refinement                                                                 |
| Cantidad de preguntas revisadas              | 9 (Q1–Q9)                                                                        |
| Decisiones PO/BA tomadas                     | 9                                                                                |
| Decisiones técnicas recomendadas             | 0                                                                                |
| ¿Desbloquea aprobación?                      | Sí                                                                               |
| User Story file updated                      | Yes                                                                              |
| Decision Resolution artifact created/updated | Yes                                                                              |
| Decision Resolution path                     | management/user-stories/decision-resolutions/US-049-decision-resolution.md       |
| Próximo paso recomendado                     | Run `eventflow-user-story-refinement` revalidación → `eventflow-user-story-approval` |

---

## 2. Decisiones Respondidas

## Decisión 1 — Brief estructurado

```text
Brief estructurado. Campos del body POST:
- `event_id` (UUID, required)
- `vendor_profile_id` (UUID, required)
- `service_category_id` (UUID, required)
- `brief.budget` (numeric(14,2), `>= 0`, required)
- `brief.message` (string `[0..5000]`, required)
- `source` (`'manual'` | `'ai_generated'`, default `'manual'`, optional)

Campos snapshot del evento (no editables, inferidos al persistir): `event_type`, `event_date`, `city_code`, `guests_count`, `currency_code` (heredado de `events.currency_code`, inmutable per BR-EVENT-007).
```

### Rationale
Estructurado permite UX consistente y queries futuras (búsqueda de QRs por categoría/budget). Snapshot evita inconsistencias si el evento se edita después.

---

## Decisión 2 — Estados que cuentan como activas

```text
Estados que cuentan como "activa" para BR-QUOTE-004 (única por par event-vendor) y BR-QUOTE-009 (5 por categoría): `sent`, `viewed`, `responded`, `preferred`.
Estados que NO cuentan: `cancelled`, `expired`, `rejected`.
```

### Rationale
Consistente con `docs/4 §BR-QUOTE-009` literal.

---

## Decisión 3 — Estado del evento

```text
Sólo `event.status='active'` permite crear QuoteRequest. Otros estados (`draft`, `completed`, `cancelled`) ⇒ `409 EVENT_NOT_ACTIVE`. Consistente con FR-EVENT-006.
```

### Rationale
Previene QR sobre eventos cerrados o no listos.

---

## Decisión 4 — Política del vendor target

```text
Vendor target debe tener `vendor_profiles.status='approved'` AND `vendor_profiles.deleted_at IS NULL`. Cualquier otro estado (`pending`, `rejected`, `hidden`, soft-deleted) o slug/UUID inexistente ⇒ `400 VENDOR_NOT_AVAILABLE` (uniforme, no revela existencia ni ownership).
```

### Rationale
Consistente con BR-VENDOR-001 y patrón de visibilidad en US-045/US-046.

---

## Decisión 5 — Reactivación post-cancel

```text
Si existe una QR previa al mismo par (event, vendor) en estado `cancelled`/`expired`/`rejected`, se permite crear una nueva (FR-QUOTE-003). El conteo de "una activa por par" sólo considera estados activos (D2). La nueva QR es independiente; la previa no se modifica.
```

### Rationale
Permite a organizadores re-solicitar tras un rechazo o cancelación.

---

## Decisión 6 — Notificación (in-app + email simulado)

```text
Al crear la QR, el backend persiste DOS rows en `notifications` dentro de la misma transacción:
1. `channel='in_app'`, `recipient_user_id=vendor.user_id`, `event='quote_request.created'`, `delivery_status='delivered'` (in-app es inmediato).
2. `channel='email_simulated'`, `recipient_user_id=vendor.user_id`, `event='quote_request.created'`, `delivery_status='simulated'` (sin envío real, sólo metadata para audit/demo).

Reuso del `NotificationSenderPort` (docs/14 §4.2). El email real es Future.
```

### Rationale
FR-QUOTE-016 exige in-app. Email simulado mantiene paridad con la promesa de "email simulado" del MVP sin integración SMTP real.

---

## Decisión 7 — Flag `ai_generated_brief`

```text
El body acepta opcional `source: 'manual' | 'ai_generated'` (default `'manual'`). Si `source='ai_generated'`, el backend persiste `quote_requests.ai_generated_brief=true`; de lo contrario `false`. El flag no impide edición posterior del brief; permite trazabilidad académica.
```

### Rationale
Trazabilidad IA + consistencia con UC-AI-005 + US-021.

---

## Decisión 8 — Rate limit por organizer

```text
Endpoint `POST /api/v1/quote-requests` aplica rate limit `10 req/min` por `currentUser.id` (clave `org:quote_request`). Excedido ⇒ `429 TOO_MANY_REQUESTS` con `Retry-After`. Reuso del middleware de PB-P0-007.
```

### Rationale
Previene spam de QRs sin afectar uso legítimo.

---

## Decisión 9 — Transacción atómica QR + Notification

```text
`CreateQuoteRequestUseCase` ejecuta `prisma.$transaction`:
1. SELECT FOR UPDATE de evento (verificación de status y ownership) + vendor (verificación status + deleted_at).
2. Validar BR-QUOTE-004 (no existe QR activa par event-vendor) + BR-QUOTE-009 (count < 5 por (event, category)).
3. INSERT `quote_requests(status='sent', sent_at=NOW(), ai_generated_brief=?, ...snapshot del evento)`.
4. INSERT 2 rows en `notifications` (D6).
5. Emite log `quote_request.created` con `correlation_id`, `quote_request_id`, `event_id`, `vendor_profile_id`, `service_category_id`, `ai_generated_brief`.

Si cualquier paso falla, rollback completo. Sin side-effects externos.
```

### Rationale
Atomicidad garantiza que no haya QR sin notificación ni duplicados por race condition.

---

## 3. Consolidated Decision Table

|  # | Tema                              | Decisión                                                                                                                                                          | Tipo    | ¿Bloqueaba aprobación? | Validación adicional |
| -: | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------------- | -------------------- |
|  1 | Brief estructurado                  | `event_id`, `vendor_profile_id`, `service_category_id`, `brief.budget`, `brief.message`, `source?`. Snapshot del evento.                                          | PO/BA   | Sí                     | No                   |
|  2 | Estados activas                    | `sent/viewed/responded/preferred` cuentan; resto no.                                                                                                              | PO      | Sí                     | No                   |
|  3 | Estado evento                       | Sólo `active` ⇒ permitido; otros ⇒ `409 EVENT_NOT_ACTIVE`.                                                                                                       | PO      | Sí                     | No                   |
|  4 | Vendor target                       | `approved` + `deleted_at IS NULL`; otros ⇒ `400 VENDOR_NOT_AVAILABLE`.                                                                                            | PO      | Sí                     | No                   |
|  5 | Reactivación                        | Permitida cuando previa está `cancelled`/`expired`/`rejected`.                                                                                                    | PO      | Sí                     | No                   |
|  6 | Notificación                        | 2 rows en `notifications` (`in_app` + `email_simulated`) dentro de la misma transacción.                                                                          | PO      | Sí                     | No                   |
|  7 | `ai_generated_brief`                | `source` en body; default `'manual'`.                                                                                                                              | PO      | Sí                     | No                   |
|  8 | Rate limit                          | `10 req/min` por organizer.                                                                                                                                       | PO/Sec  | Sí                     | No                   |
|  9 | Transacción atómica                 | `prisma.$transaction` envuelve validaciones + INSERT QR + INSERT 2 Notifications.                                                                                 | Tech    | Sí                     | No                   |

---

## 6. File Update Result

| Campo                                        | Valor                                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------------------- |
| User Story file updated                      | Yes                                                                                |
| User Story file path                         | `management/user-stories/US-049-send-quote-request.md`                             |
| Decision Resolution artifact created/updated | Yes                                                                                |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-049-decision-resolution.md`       |
| New User Story status                        | Ready for Approval                                                                 |
| Remaining blockers                           | No                                                                                 |
| Reason                                       | 9/9 decisiones PO/Tech formalizadas.                                               |

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
