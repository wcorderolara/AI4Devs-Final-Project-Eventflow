# User Story Refinement Review — US-061

## Source User Story File
management/user-stories/US-061-vendor-confirm-booking-intent.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-061-decision-resolution.md

## Review Date
2026-06-28 (revalidación: 2026-06-28)

## Revalidation Result (2026-06-28)
Q1–Q8 resueltas. La US-061 declara `Backlog Item: PB-P1-036`, `PO/BA Decisions Applied` D1–D8, trazabilidad corregida (`FR-BOOKING-003/006`, `FR-NOTIF-001/004`, `FR-BUDGET-004`, `UC-BOOKING-002`, `BR-BOOKING-002/008`, `BR-BUDGET-005/002/003`, `BR-NOTIF-001/002`). Endpoint `POST /vendor/booking-intents/:id/confirm` con transacción atómica (status + committed + 2 notifs), auto-create BudgetItem, idempotencia, warning committed sin bloquear, AC-01..AC-03, EC-01..EC-04, VR-01..VR-03, SEC-01..SEC-05, TS-01..TS-05, NT-01..NT-06, AUTH-TS-01..AUTH-TS-05. **Estado**: `Ready for Approval`.

## 1. Resultado Ejecutivo

| Campo | Evaluación |
|---|---|
| User Story ID | US-061 |
| Backlog Item | PB-P1-036 — BookingIntent: crear, confirmar, cancelar |
| Epic | EPIC-CMP-001 |
| Estado recomendado | Needs Refinement |
| Requiere decisión PO | Sí |
| Requiere decisión técnica | Sí |
| Refinement review path | management/user-stories/refinement-reviews/US-061-refinement-review.md |

## 2. Diagnóstico

US-061 es 2 de 3 en PB-P1-036 (US-060 crear → US-061 confirmar → US-062 cancelar). La confirmación del vendor dispara dos efectos atómicos: transición `pending → confirmed_intent` + actualización de `BudgetItem.committed` (BR-BOOKING-008 + BR-BUDGET-005). Hallazgos:

1. **Trazabilidad**: cita `BR-BOOKING-003` (no aplica directamente — la regla principal es **`BR-BOOKING-002`** confirmación bilateral). Faltan **`BR-BOOKING-008`** (update committed), **`BR-BUDGET-005`**, **`FR-NOTIF-001`**.
2. **Falta declarar `Backlog Item: PB-P1-036`**.
3. **BudgetItem matching**: ¿cómo se identifica el BudgetItem? Por `(event_id, service_category_id)` del QR de la Quote. Si no existe ⇒ ¿crear automáticamente o falla?
4. **Currency**: Quote.currency siempre = Event.currency (BR-QUOTE-019). Sin conversión.
5. **Atomicidad**: `prisma.$transaction`: UPDATE BookingIntent → `confirmed_intent` + UPDATE/INSERT BudgetItem.committed + 2 notifs organizer.
6. **Idempotencia**: re-confirmar BookingIntent ya `confirmed_intent` ⇒ no-op.
7. **Authorization**: vendor target específico (vendor del `quote.vendor_profile_id`).
8. **Notif organizer**: 2 Notifications (`booking_intent.confirmed`) vía service común extendido.

## 7. Preguntas Pendientes

| # | Tipo | Pregunta | Recomendado |
|---|---|---|---|
| Q1 | PO/Tech | BudgetItem matching | Mapear por `(event_id, service_category_id)` derivado del QR de la Quote. |
| Q2 | PO | BudgetItem ausente | Si no existe BudgetItem para `(event, category)`, **crearlo automáticamente** con `planned=0`, `committed=quote.total_price`. PO informado vía warning BR-BUDGET-004 si committed > total. |
| Q3 | Tech | Atomicidad | `prisma.$transaction`: SELECT FOR UPDATE BookingIntent + Quote + (opcional) BudgetItem → UPDATE BookingIntent → UPDATE/INSERT BudgetItem → 2 notifs organizer. |
| Q4 | Tech | Idempotencia | `confirmed_intent` ya ⇒ `200 OK` no-op (no segunda actualización committed). `cancelled` ⇒ `409`. |
| Q5 | Sec | Authorization | Vendor debe ser el target (`quote.vendor_profile.user_id = currentUser.id`). Otros ⇒ `404 BOOKING_INTENT_NOT_FOUND`. |
| Q6 | PO | Notif organizer | 2 Notifications atómicas (`booking_intent.confirmed`) vía service común extendido a 7 eventos. |
| Q7 | Tech | Currency | Asume Quote.currency = Event.currency (BR-QUOTE-019). Sin conversión. Test smoke. |
| Q8 | PO | Display al vendor | Vista del vendor muestra disclaimer FR-BOOKING-006 al confirmar (paridad con US-060). |

## 9. Recomendación

`Needs Refinement` — 8 decisiones PO/Tech/Sec bloqueantes.

```text
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
```
