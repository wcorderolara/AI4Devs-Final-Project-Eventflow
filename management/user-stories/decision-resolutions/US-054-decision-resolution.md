# PO/BA Decision Resolution — US-054

## Source User Story File
management/user-stories/US-054-notify-vendor-quote-rejected-expired.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-054-refinement-review.md

## Decision Date
2026-06-28

## 1. Resumen Ejecutivo

| Campo                                        | Valor                                                                            |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| User Story ID                                | US-054                                                                           |
| User Story file path                         | management/user-stories/US-054-notify-vendor-quote-rejected-expired.md           |
| Refinement review artifact path              | management/user-stories/refinement-reviews/US-054-refinement-review.md           |
| Existing decision resolution found           | No                                                                               |
| Backlog Item                                 | PB-P1-032 — Notificación a vendor por Quote rechazada/expirada                  |
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

## Decisión 1 — Endpoint de rechazo in scope

```text
US-054 incluye el endpoint `POST /api/v1/organizer/quotes/:id/reject` que ejecuta la transición `sent → rejected` y dispara la notificación al vendor. Sin este endpoint, FR-QUOTE-010 queda huérfano.
```

### Rationale
Sin endpoint no hay forma de disparar el caso `rejected`. PB-P1-032 lo requiere.

---

## Decisión 2 — Servicio común reutilizable

```text
Se introduce `QuoteNotificationService` con método `emitQuoteStateChange({ quote, event, tx })`. Maneja la inserción de las 2 Notifications (`in_app` + `email_simulated`) al vendor por cada cambio relevante de estado (`rejected` o `expired`). US-053 refactoriza su use case para invocar este servicio en lugar de duplicar la lógica. US-054 lo introduce y lo invoca desde el endpoint reject.

Payload uniforme: `{ quote_id, quote_request_id, status, valid_until, rejection_reason? }`.
```

### Rationale
DRY + consistencia. Reduce divergencia entre rejected y expired.

---

## Decisión 3 — Estados origen para reject

```text
El endpoint permite transición SÓLO cuando `quotes.status='sent'`. Otros estados (`draft`, `accepted`, `rejected`, `expired`) ⇒ `409 QUOTE_NOT_REJECTABLE` con `details: { current_status }`. Consistente con BR-QUOTE-014 (lifecycle).
```

### Rationale
Idempotente + previene transiciones inválidas.

---

## Decisión 4 — `reason` opcional

```text
Body: `{ reason?: string [0..500] }`. Si presente, se persiste en `quotes.rejection_reason` (verificar columna en DB-001; si falta, migración menor). `rejected_at=NOW()` siempre.
```

### Rationale
Permite al organizer dar contexto sin imponerlo.

---

## Decisión 5 — EC-01 eliminado

```text
La Notification se persiste siempre cuando la transición es válida. La visibilidad por el vendor está gobernada por FR-NOTIF-005 (sólo dueño). El concepto "vendor inactivo" no es parte del modelo MVP. EC-01 original se elimina y se reemplaza por verificación de aislamiento (vendor sólo ve sus propias notifs — heredado del módulo de notifications).
```

### Rationale
El modelo no tiene flag `vendor.is_inactive`. Aislamiento ya está en FR-NOTIF-005.

---

## Decisión 6 — Inbox fuera de scope

```text
El surface de notificaciones (FR-NOTIF-002 — consultar y marcar leídas) vive en US futura (PB-P2-010). US-054 sólo entrega la emisión: 2 Notifications atómicas por cada transición. UX Notes del Vendor inbox se retira de US-054.
```

### Rationale
Mantiene scope ajustado a PB-P1-032. PB-P2-010 cubre el inbox.

---

## Decisión 7 — Atomicidad transaccional

```text
La emisión de las 2 Notifications vive dentro de la misma `prisma.$transaction` que ejecuta el UPDATE de `status`. Si cualquier paso falla, rollback completo. Paridad con US-049 D6 / US-052 D5 / US-053 D3.
```

### Rationale
Garantiza consistencia: o ambos (status + notifs) o ninguno.

---

## Decisión 8 — Authorization endpoint reject

```text
El endpoint requiere sesión `organizer`. El organizer debe ser dueño del evento (`events.organizer_user_id = currentUser.id`) que contiene la `QuoteRequest` a la que pertenece la Quote. Cualquier otro caso (Quote inexistente, evento ajeno, organizer no autorizado) ⇒ `404 QUOTE_NOT_FOUND` uniforme (no revela existencia ni ownership).
```

### Rationale
Consistente con patrón `404` uniforme de US-046/048/051/052.

---

## 3. Consolidated Decision Table

|  # | Tema                              | Decisión                                                                                                                                                          | Tipo    | ¿Bloqueaba aprobación? | Validación adicional |
| -: | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------------- | -------------------- |
|  1 | Endpoint reject                     | `POST /api/v1/organizer/quotes/:id/reject` in scope.                                                                                                              | PO      | Sí                     | No                   |
|  2 | Servicio común                      | `QuoteNotificationService.emitQuoteStateChange`. US-053 refactoriza para reuso.                                                                                  | Tech    | Sí                     | No                   |
|  3 | Estados origen                      | Sólo `status='sent'` ⇒ permite. Otros ⇒ `409 QUOTE_NOT_REJECTABLE`.                                                                                              | PO      | Sí                     | No                   |
|  4 | `reason` opcional                    | Body `{ reason?: string [0..500] }`; persiste en `quotes.rejection_reason` + `rejected_at`.                                                                       | PO      | Sí                     | No                   |
|  5 | EC-01                               | Eliminado; aislamiento por FR-NOTIF-005.                                                                                                                          | PO      | Sí                     | No                   |
|  6 | Inbox                                | Fuera de scope (US futura PB-P2-010).                                                                                                                              | PO      | Sí                     | No                   |
|  7 | Atomicidad                          | `prisma.$transaction` con UPDATE + 2 Notifications.                                                                                                              | Tech    | Sí                     | No                   |
|  8 | Authorization                        | Organizer dueño del evento; `404 QUOTE_NOT_FOUND` uniforme.                                                                                                       | PO/Sec  | Sí                     | No                   |

---

## 6. File Update Result

| Campo                                        | Valor                                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------------------- |
| User Story file updated                      | Yes                                                                                |
| User Story file path                         | `management/user-stories/US-054-notify-vendor-quote-rejected-expired.md`           |
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
