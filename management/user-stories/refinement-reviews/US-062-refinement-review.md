# User Story Refinement Review — US-062

## Source User Story File
management/user-stories/US-062-cancel-booking-intent.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-062-decision-resolution.md

## Review Date
2026-06-28 (revalidación: 2026-06-28)

## Revalidation Result (2026-06-28)
Q1–Q8 resueltas. La US-062 declara `Backlog Item: PB-P1-036`, `PO/BA Decisions Applied` D1–D8, trazabilidad corregida (`FR-BOOKING-002`, `FR-NOTIF-001/004`, `FR-BUDGET-004`, `UC-BOOKING-003`, `BR-BOOKING-008/009`, `BR-BUDGET-005`, `BR-NOTIF-001/002`, `NFR-OBS-005/PERF-001`). Endpoint bilateral `POST /booking-intents/:id/cancel` con revert condicional + auth bilateral + audit fields + underflow protection + 2 notifs contraparte. AC-01..AC-03, EC-01..EC-06, VR-01..VR-04, SEC-01..SEC-05, TS-01..TS-05, NT-01..NT-07, AUTH-TS-01..AUTH-TS-06. **Estado**: `Ready for Approval`.

## 1. Resultado Ejecutivo

| Campo | Evaluación |
|---|---|
| User Story ID | US-062 |
| Backlog Item | PB-P1-036 — BookingIntent: crear, confirmar, cancelar |
| Epic | EPIC-CMP-001 |
| Estado recomendado | Needs Refinement |
| Requiere decisión PO | Sí |
| Requiere decisión técnica | Sí |
| Refinement review path | management/user-stories/refinement-reviews/US-062-refinement-review.md |

## 2. Diagnóstico

US-062 cierra PB-P1-036 + EPIC-CMP-001. Cancelación bilateral (organizer o vendor target) sin penalty (Decisión PO 8.1 #5 + BR-BOOKING-009). Revierte committed si BookingIntent estaba `confirmed_intent`.

### Hallazgos

1. **Trazabilidad**: cita `FR-BOOKING-004` y `BR-BOOKING-004`. La principal es **`BR-BOOKING-009`** (cancelación incluso confirmed sin penalización, decisión PO 8.1 #5). FR correcto es **`FR-BOOKING-002`** (lifecycle) — la US asume `FR-BOOKING-004` que NO está documentado como cancelar. Faltan **`UC-BOOKING-003`** ✓ correcto, `FR-NOTIF-001`, `BR-BUDGET-005` (revert), `BR-BOOKING-008` (revert).
2. **Falta declarar `Backlog Item: PB-P1-036`**.
3. **Revert del committed**: solo si BookingIntent estaba `confirmed_intent`. Si estaba `pending`, no hay committed que revertir. La US lo asume implícito pero no lo explicita.
4. **Estados origen**: `pending` y `confirmed_intent` permitidos. `cancelled` ⇒ `409`.
5. **Cancellation reason opcional**: el `Notes` lo plantea.
6. **Audit fields**: BR-BOOKING-009 exige `cancelled_at`, `cancelled_by`, `cancellation_reason`. Verificar schema.
7. **Notif contraparte**: organizer cancela → notif vendor; vendor cancela → notif organizer. Vía service común con evento `booking_intent.cancelled`.
8. **Atomicidad**: `prisma.$transaction`: UPDATE BookingIntent + UPDATE BudgetItem (revert) + 2 notifs.
9. **404 uniforme**: terceros ⇒ `404 BOOKING_INTENT_NOT_FOUND` (uniforme con US-061).
10. **¿Underflow committed?** Si `committed - total_price < 0` por inconsistencias, ¿bloquear o forzar a 0?

## 7. Preguntas Pendientes

| # | Tipo | Pregunta | Recomendado |
|---|---|---|---|
| Q1 | PO/Tech | Revert committed solo si confirmed_intent | Solo si BookingIntent estaba `confirmed_intent` al momento de cancelar. Si `pending` ⇒ no hay revert. |
| Q2 | PO | Estados origen | `pending` y `confirmed_intent` permitidos. Otros ⇒ `409 BOOKING_INTENT_NOT_CANCELLABLE`. |
| Q3 | PO | Cancellation reason | Body opcional `{ reason?: string [0..500] }`. Persiste en `cancellation_reason`. |
| Q4 | PO | Audit fields | `cancelled_at=NOW()`, `cancelled_by=currentUser.id`, `cancellation_reason`. Verificar schema (DB-001). |
| Q5 | PO | Notif contraparte | Organizer cancela → notif vendor; vendor cancela → notif organizer. 2 Notifs (`booking_intent.cancelled`) vía service común extendido a 8 eventos. |
| Q6 | Tech | Atomicidad | `prisma.$transaction`: UPDATE BookingIntent + UPDATE BudgetItem (si revert) + 2 notifs. |
| Q7 | Sec | Auth bilateral | Organizer (dueño del evento) O vendor (target del QR). Otros ⇒ `404 BOOKING_INTENT_NOT_FOUND` uniforme. |
| Q8 | Tech | Underflow committed | `committed = MAX(0, committed - total_price)`. Si underflow ⇒ log warn `budget.committed_underflow_corrected`. |

## 9. Recomendación

`Needs Refinement` — 8 decisiones PO/Tech/Sec bloqueantes.

```text
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
```
