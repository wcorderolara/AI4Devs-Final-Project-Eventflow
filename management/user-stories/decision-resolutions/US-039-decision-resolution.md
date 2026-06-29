# PO/BA Decision Resolution — US-039

## Source User Story File
management/user-stories/US-039-committed-updated-on-booking-confirm.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-039-refinement-review.md

## Decision Date
2026-06-27

## 1. Resumen Ejecutivo

| Campo                                        | Valor                                                                                                          |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| User Story ID                                | US-039                                                                                                         |
| Estado antes de decisiones                   | Needs Refinement                                                                                               |
| Cantidad de preguntas revisadas              | 4 (Q1–Q4)                                                                                                      |
| Decisiones PO/BA tomadas                     | 4                                                                                                              |
| ¿Desbloquea aprobación?                      | Sí                                                                                                             |
| User Story file updated                      | Yes                                                                                                            |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-039-decision-resolution.md`                                   |
| Próximo paso recomendado                     | Run `eventflow-user-story-approval`                                                                            |

---

## 2. Decisiones Respondidas

## Decisión 1 — Idempotencia: persistir `committed_synced_at` + `committed_synced_amount` en `BookingIntent`

### Decisión formal

```text
Se añaden dos campos a la entidad BookingIntent:
- committed_synced_at: datetime nullable (NULL si nunca se aplicó la sincronización; set en apply, RESET a NULL en revert exitoso).
- committed_synced_amount: decimal nullable (monto aplicado al committed; usado para reversa exacta).

Al entrar `applyOnConfirm({ bookingIntentId })`:
  - Si bookingIntent.committed_synced_at IS NOT NULL ⇒ skip + log info (idempotente).
  - Si NULL ⇒ ejecutar increment + set committed_synced_at = NOW(), committed_synced_amount = bookingIntent.total.

Al entrar `revertOnCancel({ bookingIntentId, cancellation })`:
  - Si committed_synced_at IS NULL ⇒ skip + log info (nada que revertir; idempotente).
  - Si NOT NULL ⇒ ejecutar decrement por committed_synced_amount + set committed_synced_at = NULL, committed_synced_amount = NULL.
  - Persiste cancellation: cancelled_at = NOW(), cancelled_by = currentUser.id, cancellation_reason (heredado del invocador).

Migración menor en US-039:
- Añadir columnas a tabla booking_intents (nullable, sin default no-NULL).
- Sin backfill: bookings históricos en seed se generan con valores coherentes.
```

### Rationale

1. **Simplicidad y MVP-first**: dos columnas en una tabla existente vs tabla nueva de idempotency keys.
2. **Retry seguro**: el invocador puede reintentar la confirm/cancel sin riesgo de double-counting.
3. **Reversa exacta**: `committed_synced_amount` registra el monto exacto aplicado; protege contra cambios del `bookingIntent.total` post-confirm (no debería ocurrir, pero defensa profunda).
4. **Auditoría**: el timestamp permite reconstruir cuándo se aplicó la sincronización.

### Impacto en la US

| Sección                 | Cambio                                                                                                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Agregar D1.                                                                                                                                                     |
| Acceptance Criteria     | AC-01 reescrito con check + set de `committed_synced_at/amount`. AC-03 nuevo de idempotencia.                                                                   |
| Edge Cases              | EC-06, EC-07 (doble apply / doble revert).                                                                                                                       |
| Technical Notes         | Migración menor; SELECT FOR UPDATE de `BookingIntent` + `BudgetItem` dentro de la $transaction del invocador.                                                     |
| Documentation Alignment | `docs/6 §BookingIntent` debe documentar los dos campos; PB-P0-001 debe incluir las columnas (o se añaden por migración en US-039).                                |

### ¿Bloqueaba aprobación?

Sí.

---

## Decisión 2 — Auto-create `BudgetItem` cuando no existe para la categoría: opción (a)

### Decisión formal

```text
Si NO existe BudgetItem activo (deleted_at IS NULL) para (budget.id, service_category_id) en el momento de applyOnConfirm:

  Crear nuevo BudgetItem con:
    - budget_id = event.budget.id
    - service_category_id = bookingIntent.service_category_id
    - planned = 0
    - committed = 0 (se incrementa en la misma transacción)
    - paid = 0
    - ai_generated = false
    - ai_recommendation_id = NULL
    - deleted_at = NULL
    - label = "Auto-creado por reserva confirmada" (localizable; opcional)

  Emitir log warning structured event `budget.item.auto_created_by_booking` con bookingIntentId, budgetItemId, event_id, service_category_id, correlationId.

  NO reusar items soft-deleted (no des-soft-delete).
  NO marcar el item con un flag adicional `created_by_booking` (la auditoría vive en el log + ai_generated=false).

En revertOnCancel:
  No se elimina el BudgetItem auto-creado (preserva auditoría y el usuario puede editarlo via US-036).
```

### Rationale

1. **Consistencia con US-036 D5**: múltiples items por categoría permitidos; auto-create es seguro.
2. **No resucitar soft-deleted**: alinea con la política de US-036 D2 (los soft-deleted son auditoría histórica).
3. **MVP-first**: sin flags adicionales; el log warning + `ai_generated=false` cubren la auditoría.
4. **Sin fricción al usuario**: la vista de US-035 reflejará el nuevo item automáticamente vía invalidación.

### Impacto en la US

| Sección                 | Cambio                                                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Agregar D2.                                                                                                             |
| Acceptance Criteria     | AC-04 reescrito (auto-create).                                                                                          |
| Edge Cases              | EC-01 reescrito.                                                                                                        |
| Technical Notes         | Backend: lookup + create-if-missing dentro de la transacción.                                                            |
| Observability           | Log warning `budget.item.auto_created_by_booking`.                                                                       |

### ¿Bloqueaba aprobación?

Sí.

---

## Decisión 3 — `BookingIntent.total = 0`: skip silencioso + log info en US-039 (defensa profunda)

### Decisión formal

```text
En US-039:
  Si bookingIntent.total = 0 ⇒ skip silencioso (no increment, no decrement) + log info `budget.committed.skipped_zero_amount` con bookingIntentId, correlationId.
  No fallar; permite que la transacción del invocador continúe.

Política upstream (responsabilidad del módulo Booking en US futura):
  ConfirmBookingIntentUseCase debería validar que bookingIntent.total > 0 antes de invocar el handler de US-039.
  Si se introduce esta validación, US-039 nunca verá total = 0 en producción; la lógica de US-039 queda como defensa profunda.
```

### Rationale

1. **MVP-first**: no fallar es más resiliente; el caso es defensivo.
2. **Defensa profunda**: documenta la expectativa upstream sin acoplar US-039 a la implementación del módulo Booking.
3. **Observabilidad**: el log info permite detectar el caso si ocurre.

### Impacto en la US

| Sección                 | Cambio                                                                  |
| ----------------------- | ----------------------------------------------------------------------- |
| PO/BA Decisions Applied | Agregar D3.                                                             |
| Validation Rules        | VR-01 reescrita: skip silencioso + log info.                            |
| Edge Cases              | EC-05 nuevo: total=0.                                                    |
| Observability           | Log `budget.committed.skipped_zero_amount`.                              |

### ¿Bloqueaba aprobación?

Sí.

---

## Decisión 4 — `event.status` NO verificado en US-039 (precondición upstream)

### Decisión formal

```text
El handler de US-039 NO verifica event.status.
Es responsabilidad del invocador (ConfirmBookingIntentUseCase / CancelBookingIntentUseCase) bloquear las operaciones cuando el evento no es editable.

US-039 documenta como precondición:
  "Precondición: el invocador upstream debe haber verificado que event.status ∈ {'draft','active'} para applyOnConfirm; para revertOnCancel, la cancelación es permitida en cualquier estado del evento (alineado con BR-BOOKING-009 que permite cancelar incluso confirmed_intent sin penalización)."

Esto preserva el principio de responsabilidad única (single responsibility) y evita duplicar la lógica de bloqueo que US-036 D3 ya formalizó para mutaciones de Budget user-driven.
```

### Rationale

1. **Single responsibility**: el handler de US-039 sincroniza; no autoriza.
2. **Consistencia con US-036 D3**: la regla `event.status ∈ {'draft','active'}` vive en el upstream.
3. **`BR-BOOKING-009`**: explicita que cancelar es siempre permitido (incluso `confirmed_intent` y eventos no editables); por tanto `revertOnCancel` NO debe bloquearse por `event.status`.
4. **MVP-first**: minimiza acoplamiento entre módulos.

### Impacto en la US

| Sección                 | Cambio                                                                                                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Agregar D4.                                                                                                                                                       |
| Assumptions             | Precondición documentada: upstream verifica event.status para confirm; cancel está permitida en cualquier estado por BR-BOOKING-009.                              |
| Security & Authorization | SEC-04 nuevo: ownership y event.status son responsabilidad del invocador upstream.                                                                                |

### ¿Bloqueaba aprobación?

Sí.

---

## 3. Consolidated Decision Table

|  # | Tema                                    | Decisión                                                                                                                          | Tipo    | ¿Bloqueaba aprobación? |
| -: | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------------- |
|  1 | Idempotencia                             | Persistir `committed_synced_at` + `committed_synced_amount` en `booking_intents` (migración menor en US-039).                       | PO+Tech | Sí                     |
|  2 | Auto-create BudgetItem                   | Crear nuevo (sin reusar soft-deleted); `ai_generated=false`; log warning `budget.item.auto_created_by_booking`.                    | PO      | Sí                     |
|  3 | Monto 0                                  | Skip silencioso + log info en US-039; validación upstream recomendada.                                                            | PO      | Sí                     |
|  4 | event.status verification                | NO verificar en US-039 (responsabilidad upstream); `revertOnCancel` permitido siempre (`BR-BOOKING-009`).                            | PO      | Sí                     |

---

## 4. Documentation Alignment Required

| Documento                                | Conflicto                                                                                                          | Acción                                                                                                                                              | Bloquea |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `docs/6 §BookingIntent` / PB-P0-001       | `committed_synced_at` y `committed_synced_amount` deben documentarse y añadirse al schema.                          | Tras D1, actualizar `docs/6` y crear migración en US-039 si los campos no existen ya en PB-P0-001.                                                  | No      |
| `docs/16 §M07 Booking` / `§error format` | Documentar nuevos códigos de log y errores del handler.                                                              | Actualizar `docs/16`.                                                                                                                              | No      |
| `docs/4 §BR-BOOKING-008`                  | No detalla idempotencia ni auto-create.                                                                            | Nota interpretativa.                                                                                                                              | No      |
| `docs/10`                                | `NFR-PERF-API-001` no existe.                                                                                       | Housekeeping NFR-PERF-001.                                                                                                                         | No      |

---

## 5. Estado recomendado

`Ready for Approval`

Las 4 decisiones formalizan idempotencia, auto-create, monto 0 y separación de responsabilidad. Consistente con `BR-BOOKING-007/008/009`, `FR-BUDGET-006`, `FR-BOOKING-005/008/009`, US-036 D2/D3/D5, y `docs/16 §error format`.

---

## 6. Próximo paso

```text
1. Revisar US-039 actualizada.
2. Ejecutar `eventflow-user-story-refinement` para revalidación.
3. Ejecutar `eventflow-user-story-approval`.
4. Tech Spec + Development Tasks.
```

---

User Story file updated: Yes
Path: management/user-stories/US-039-committed-updated-on-booking-confirm.md
Status: Ready for Approval
Decision Resolution artifact: management/user-stories/decision-resolutions/US-039-decision-resolution.md
Next step: Run `eventflow-user-story-approval` or run `eventflow-user-story-refinement` again if a second validation pass is desired.
