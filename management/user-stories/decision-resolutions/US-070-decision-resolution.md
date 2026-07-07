# PO/BA Decision Resolution — US-070

## Source User Story File
management/user-stories/US-070-inapp-notification-booking-confirmed.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-070-refinement-review.md

## Decision Date
2026-07-06

## 1. Resumen Ejecutivo

| Campo                                        | Valor                                                                                                            |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| User Story ID                                | US-070                                                                                                            |
| User Story file path                         | `management/user-stories/US-070-inapp-notification-booking-confirmed.md`                                          |
| Refinement review artifact path              | `management/user-stories/refinement-reviews/US-070-refinement-review.md`                                          |
| Existing decision resolution found           | No                                                                                                                |
| Backlog Item                                 | PB-P2-007 — Notificación de BookingIntent confirmado (P2, Should Have, posición 1 de 1)                          |
| Epic                                         | EPIC-NOT-001                                                                                                      |
| Estado antes de decisiones                   | Needs Refinement                                                                                                  |
| Cantidad de preguntas revisadas              | 7 (Q1–Q6 bloqueantes + Q7 parcial)                                                                                |
| Decisiones PO/BA tomadas                     | 7 (D1 in-tx; D2 idempotencia; D3 payload+link con dispatch por rol; D4 surface Out of Scope; D5 idioma per recipient; D6 recipients=both por FRD; D7 defensa + dedup self-notification) |
| Decisiones técnicas recomendadas             | 3 (D1, D2, D3 — requieren validación Tech Lead en Technical Spec)                                                 |
| ¿Desbloquea aprobación?                      | Sí                                                                                                                |
| User Story file updated                      | Yes                                                                                                               |
| Decision Resolution artifact created/updated | Yes                                                                                                               |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-070-decision-resolution.md`                                      |
| Próximo paso recomendado                     | Run `eventflow-user-story-refinement` (revalidación) y luego `eventflow-user-story-approval`.                     |

---

## 2. Decisiones Respondidas

## Decisión 1 — Transaction scope (Q1)

### Respuesta PO/BA

Paralelo D1 US-068/US-069 aprobadas. `docs/14 §23.1` (MVP single-process). Emisión in-tx dentro del `ConfirmBookingIntentUseCase` garantiza atomicidad: si el INSERT falla, el `BookingIntent` no queda `confirmed_intent` inconsistente.

### Decisión formal

```text
`OnBookingConfirmedHandler` se invoca sincrónicamente dentro del `ConfirmBookingIntentUseCase` (US-061), como parte de la misma transacción Prisma que persiste la transición a `confirmed_intent` (y la actualización de `BudgetItem.committed` — BR-BOOKING-008, alcance de US-061). Ante fallo del INSERT de cualquiera de los 4 registros `Notification` (2 organizer + 2 vendor), la transacción rollea completa y el caller HTTP recibe 500 con `correlationId`. Sin event bus/outbox en MVP.
```

### Rationale

* MVP-first (`docs/14 §23.1`).
* Consistencia con actualización de `BudgetItem.committed`: todo en la misma tx.
* Reversibilidad: Future ADR para outbox si aparece necesidad multi-proceso.

### Impacto en la User Story

| Sección              | Cambio                                                                             |
| -------------------- | ---------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D1.                                                                         |
| Acceptance Criteria  | AC-01 declara emisión in-tx; AC-06 declara rollback.                                |
| Technical Notes      | Backend declara handler in-tx dentro de US-061.                                    |
| Test Scenarios       | TS-06 verifica rollback.                                                            |

### ¿Bloqueaba aprobación? Sí. **Requires Tech Lead Validation** en Technical Spec.

---

## Decisión 2 — Idempotencia (Q2)

### Respuesta PO/BA

Paralelo D2 US-068/US-069. La clave debe incluir `user_id` para permitir crear ambos pares (organizer + vendor) sin que un recipient bloquee al otro.

### Decisión formal

```text
Idempotencia garantizada por chequeo defensivo `SELECT 1 FROM notifications WHERE user_id=$1 AND type='booking_confirmed' AND payload->>'booking_intent_id'=$2 LIMIT 1` antes de cada INSERT, dentro de la misma tx del `ConfirmBookingIntentUseCase`. Skip silencioso si el registro existe para el `(user_id, booking_intent_id)` específico. Sin unique constraint. Sin `notification_delivery_log`.
```

### Rationale

* Patrón validado en US-034/US-068/US-069.
* Respeta `docs/18 §18.1`.
* Con 2 recipients, el chequeo por `user_id` permite dedup independiente por lado.

### Impacto

| Sección              | Cambio                                                                     |
| -------------------- | -------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D2.                                                                 |
| Acceptance Criteria  | AC-02 sin duplicados por recipient.                                          |
| Technical Notes      | Backend declara SELECT antes de INSERT (aplicado 2× por emisión).           |
| Test Scenarios       | TS-02.                                                                      |

### ¿Bloqueaba aprobación? Sí. **Requires Tech Lead Validation**.

---

## Decisión 3 — Payload + `link` server-side con dispatch por rol (Q3)

### Respuesta PO/BA

Extiende la tabla `LINK_STRATEGY_BY_TYPE` del `NotificationLinkResolver` (US-071 D3) con la fila `booking_confirmed`, cuya lógica depende del rol del destinatario. Payload común entre recipients (permite renderizar contexto en la UI); link diferente por rol.

### Decisión formal

```text
`Notification.payload` para `type='booking_confirmed'` es JSON con:
{
  "bookingIntentId": "<uuid>",
  "quoteId": "<uuid>",
  "quoteRequestId": "<uuid>",
  "eventId": "<uuid>",
  "vendorProfileId": "<uuid>"
}
(sin totales monetarios; sin PII)

`Notification.link` generado server-side por `NotificationLinkResolver.resolve(notification, { recipientRole })`:
- Si `type='booking_confirmed'` y `recipientRole='organizer'` → `/organizer/events/{payload.eventId}/bookings/{payload.bookingIntentId}`.
- Si `type='booking_confirmed'` y `recipientRole='vendor'` → `/vendor/bookings/{payload.bookingIntentId}`.
- Fallback `link=null` si el recurso apuntado no existe.

La firma del `NotificationLinkResolver` se extiende con parámetro opcional `{ recipientRole }`. Para tipos sin dispatch por rol (task_due_soon, quote_request_received, quote_received), el parámetro se ignora. Se ratifica la fila `booking_confirmed` en la tabla `link generation by type` de `docs/16 §34.3` (Documentation Alignment Required).
```

### Rationale

* Extiende D3 US-071 con caso multi-rol.
* Payload común permite un solo shape server-side; link diferenciado permite navegación correcta por rol.
* Sin PII financiera (`Quote.total` excluido del payload).

### Impacto

| Sección              | Cambio                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D3.                                                                                        |
| Acceptance Criteria  | AC-01 explicita payload + link por rol.                                                            |
| Technical Notes      | Backend declara resolver + shape + parámetro `recipientRole`.                                      |
| Documentation Alignment | Fila `booking_confirmed` con dispatch por rol.                                                     |
| Test Scenarios       | TS verifica ambos links + payload.                                                                  |

### ¿Bloqueaba aprobación? Sí. **Requires Tech Lead Validation** para la extensión de firma del resolver.

---

## Decisión 4 — Surface UI (Q4)

### Respuesta PO/BA

US-071 (aprobada) entrega bandeja unificada organizer. Bandeja vendor = Future US no listada (gap identificado en US-068). Mark-as-read = US-072.

### Decisión formal

```text
US-070 recorta su alcance a: handler + persistencia (4 registros `Notification` cuando ambos recipients son distintos) + 2 logs `[EMAIL]`. La bandeja organizer es alcance de US-071; la bandeja vendor genérica queda Out of Scope de US-070 (Future US). Mark-as-read = US-072.
```

### Rationale

* Preserva boundaries.
* Alineado con D4 US-068/US-069.

### Impacto

| Sección              | Cambio                                                                                             |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D4.                                                                                         |
| Scope Guardrails     | `Explicitly Out of Scope`: surface organizer (→ US-071), surface vendor (Future), mark-as-read (→ US-072). |
| Scope Notes          | "Sólo emisor + persistencia".                                                                       |
| Technical Notes      | Frontend: "No aplica".                                                                               |
| UX / UI Notes        | Reemplazar por "No aplica".                                                                          |
| Test Scenarios       | Eliminar tests de surface.                                                                          |

### ¿Bloqueaba aprobación? Sí. Sin validación adicional.

---

## Decisión 5 — Idioma per recipient (Q5)

### Respuesta PO/BA

Cada recipient (organizer, vendor) tiene su propio `User.language_preference`. El fallback ladder se aplica independientemente por lado, paralelo a D5 US-068/US-069.

### Decisión formal

```text
Para cada uno de los 2 recipients, `Notification.language_code` se resuelve independientemente como:
1) `User.language_preference` del recipient.
2) Si vacío: `event.language_code`.
3) Si aún vacío: `en`.

Cada `[EMAIL]` se localiza con su respectivo locale. El log warn por skip mantiene formato uniforme independiente del locale.
```

### Rationale

* Alineado con BR-NOTIF-007.
* Cada usuario ve la notif en su idioma preferido.

### Impacto

| Sección              | Cambio                                                                            |
| -------------------- | --------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D5.                                                                        |
| Acceptance Criteria  | AC-04 idioma resuelto por recipient.                                                |
| Technical Notes      | Backend invoca `resolveLanguageCode` 2×.                                            |
| Test Scenarios       | TS-04 verifica que ambos recipients pueden recibir en distintos locales.            |

### ¿Bloqueaba aprobación? Sí. Sin validación adicional.

---

## Decisión 6 — Recipients (Q6)

### Respuesta PO/BA

Contradicción documental: `FR-BOOKING-010` (`docs/9 §495`) exige "notificar al organizador y al proveedor"; PB-P2-007 `Description` menciona sólo "Organizer recibe notificación". Aplicando decisión precedence: FRD/BRD son fuentes normativas (fuente única de FR/BR); el `Description` del PB es un resumen. `BR-NOTIF-002` (`docs/4 §389`) enumera "confirmación y cancelación de `BookingIntent`" sin restringir recipient. FRD prevalece.

### Decisión formal

```text
US-070 emite notif a AMBOS recipients:
1) `event.owner_id` (organizer)
2) `vendor_profile.user_id` (vendor)

Por cada recipient se crean 2 registros `Notification` (canales `in_app` + `email_simulated`) + 1 entrada `[EMAIL]`.

Total (recipients distintos): 4 registros `Notification` + 2 entradas `[EMAIL]` por confirmación.
Total (self-notification, ver D7): 2 registros `Notification` + 1 entrada `[EMAIL]`.

Se levanta Documentation Alignment Required para corregir el `Description` de PB-P2-007 a "Organizer y vendor reciben notificación in-app + email simulado al confirmarse BookingIntent".
```

### Rationale

* FRD/BRD son fuentes normativas.
* Cierra el loop bilateral (organizer y vendor tienen registro simétrico).
* Consistente con BR-NOTIF-002 y con la política de notif bilateral del EPIC-NOT-001 (ver también PB-P2-009 para el otro lado del flujo QR).

### Impacto

| Sección              | Cambio                                                                                                            |
| -------------------- | ----------------------------------------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D6.                                                                                                        |
| Acceptance Criteria  | AC-01 declara 4 registros + 2 logs (recipients distintos) o 2 registros + 1 log (self-notification).               |
| Technical Notes      | Backend emite en loop por recipient.                                                                                |
| Test Scenarios       | TS-01 cubre ambos recipients; TS de dedup self-notification (TS-08).                                                |
| Documentation Alignment | Corregir PB-P2-007 `Description`.                                                                                  |

### ¿Bloqueaba aprobación? Sí. Sin validación adicional.

---

## Decisión 7 — Defensa `booking_intent.status` / event eliminado / self-notification (Q7, parcial)

### Respuesta PO/BA

UC-BOOKING-002 exige `booking_intent.status='pending' → 'confirmed_intent'`. Si por bug upstream el handler recibe un BookingIntent en otro estado, un event eliminado, o si `event.owner_id == vendor_profile.user_id` (self-notification), el handler debe manejar defensivamente sin abortar la Quote/Booking ya persistido.

### Decisión formal

```text
El handler ejecuta guards defensivos:
- Si `booking_intent.status != 'confirmed_intent'` → skip + log warn.
- Si `event` no resuelve a evento existente → skip + log warn.
- Si `event.owner_id == vendor_profile.user_id` (self-notification improbable pero posible en escenarios de testing/seed corrupto) → dedup: emitir 1 par de `Notification` sólo (con `link` de organizer, tomando la elección de rol prioritario `organizer > vendor`) + 1 entrada `[EMAIL]`.
- Si `User(recipient).status = 'deactivated'` → skip ese recipient específico (el otro puede seguir emitiéndose independientemente).

El log warn incluye `correlationId, bookingIntentId, eventId?, recipientRole?, reason`. El handler no aborta la tx del use case por skip defensivo.
```

### Rationale

* Defensa en profundidad; UC-BOOKING-002 upstream lo garantiza en flujo normal.
* Dedup por `user_id` evita duplicados si mismo usuario tiene ambos roles.
* Skip parcial permite emisión aún si un recipient está deactivated.

### Impacto

| Sección              | Cambio                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------ |
| PO/BA Decisions      | Agregar D7.                                                                                 |
| Acceptance Criteria  | AC-07 declara guards; AC-08 declara dedup self-notification.                                 |
| Edge Cases           | EC-01 (self-notification), EC-03 (event eliminado), EC-04 (recipient deactivated).           |
| Test Scenarios       | TS-07 (defensa) + TS-08 (dedup self-notification).                                            |

### ¿Bloqueaba aprobación? Parcial. Sin validación adicional.

---

## 3. Consolidated Decision Table

|  # | Tema                                    | Decisión                                                                                                            | Tipo                | ¿Bloqueaba aprobación? | Validación adicional                            |
| -: | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------- | ---------------------- | ----------------------------------------------- |
|  1 | Transaction scope                       | In-tx dentro de `ConfirmBookingIntentUseCase`.                                                                       | Tech Recommendation | Sí                     | Requires Tech Lead Validation en Technical Spec |
|  2 | Idempotencia                            | SELECT antes de INSERT por `(user_id, type='booking_confirmed', payload->>'booking_intent_id')`.                    | Tech Recommendation | Sí                     | Requires Tech Lead Validation en Technical Spec |
|  3 | Payload + link con dispatch por rol      | Payload común; link organizer `/organizer/events/{eventId}/bookings/{bookingIntentId}` vs vendor `/vendor/bookings/{bookingIntentId}`. Resolver extendido. | Tech Recommendation | Sí                     | Requires Tech Lead Validation en Technical Spec |
|  4 | Surface UI                              | Out of Scope. Organizer = US-071 aprobada; vendor = Future US.                                                     | PO                  | Sí                     | No requiere                                     |
|  5 | Idioma per recipient                    | Fallback ladder independiente por recipient.                                                                        | PO                  | Sí                     | No requiere                                     |
|  6 | Recipients                              | Both: organizer + vendor (FRD FR-BOOKING-010 prevalece sobre PB `Description`). Documentation Alignment con PB-P2-007. | PO                  | Sí                     | No requiere                                     |
|  7 | Defensa + self-notification dedup       | Guards + dedup por `user_id`; skip parcial ante `deactivated`.                                                       | PO                  | Parcial                | No requiere                                     |

---

## 4. Cambios Aplicados a la User Story

Aplicados durante la reescritura del archivo. Ver `management/user-stories/US-070-inapp-notification-booking-confirmed.md`.

Resumen: Metadata (Backlog Item, Feature, Status → Ready for Approval), Business Context (Dependencies + PO/BA Decisions Applied), Traceability con IDs canónicos (`FR-BOOKING-010`, `UC-BOOKING-002`, `BR-BOOKING-002/003`, `BR-NOTIF-*`, `NFR-OBS-004/005`), Scope Guardrails ampliado, AC-01..AC-08, EC-01..EC-05, VR-01..VR-04, SEC-01..SEC-03, Technical Notes con handler in-tx, Test Scenarios TS-01..TS-08 + NT-01..NT-04, DoR/DoD.

---

## 5. Documentation Alignment Required

| Documento / Fuente                                | Conflicto                                                                                                   | Decisión vigente                                                       | Acción recomendada                                                                                                                                             | ¿Bloquea aprobación? |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| PB-P2-007 `Description`                           | Dice "Organizer recibe notificación"; FRD FR-BOOKING-010 exige ambos.                                        | Both (D6).                                                              | Corregir `Description`: "Organizer y vendor reciben notificación in-app + email simulado al confirmarse BookingIntent".                                       | No                   |
| `docs/16 §34.3` (tabla `link generation by type`) | Falta fila `booking_confirmed` con dispatch por rol.                                                          | D3 extiende la tabla.                                                   | Agregar fila con lógica por rol y ejemplo de firma extendida del resolver.                                                                                     | No                   |
| PB-P2-007 Traceability                            | Verificar completitud.                                                                                       | US-070 refinada declara IDs canónicos.                                  | Ampliar Traceability del backlog item.                                                                                                                          | No                   |
| `docs/14 §Notifications`                          | Sin `OnBookingConfirmedHandler` documentado.                                                                 | Handler in-tx (D1).                                                     | Documentar el handler.                                                                                                                                          | No                   |

---

## 6. File Update Result

| Campo                                        | Valor                                                                                                                                                    |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User Story file updated                      | Yes                                                                                                                                                      |
| User Story file path                         | `management/user-stories/US-070-inapp-notification-booking-confirmed.md`                                                                                  |
| Decision Resolution artifact created/updated | Yes                                                                                                                                                      |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-070-decision-resolution.md`                                                                              |
| New User Story status                        | Ready for Approval                                                                                                                                       |
| Remaining blockers                           | No                                                                                                                                                       |
| Reason                                       | 7 decisiones D1–D7 formalizadas con respaldo documental (FR-BOOKING-010, UC-BOOKING-002, BR-BOOKING-002/003, BR-NOTIF-002/005/007, docs/14 §23.1, docs/18 §18.1, US-034 D5, US-068 D1–D6, US-071 D3). D1/D2/D3 marcadas como Tech Recommendation. |

---

## 7. Estado recomendado

`Ready for Approval`

---

## 8. Próximo Paso Recomendado

```text
1. (Opcional) Run `eventflow-user-story-refinement` para revalidación.
2. Run `eventflow-user-story-approval`.
3. Run `eventflow-user-story-technical-spec`.
4. Run `eventflow-user-story-to-development-tasks`.
```

User Story file updated: Yes
Path: management/user-stories/US-070-inapp-notification-booking-confirmed.md
Status: Ready for Approval
Decision Resolution artifact: management/user-stories/decision-resolutions/US-070-decision-resolution.md
Next step: Run `eventflow-user-story-refinement` (revalidación) o `eventflow-user-story-approval`.
