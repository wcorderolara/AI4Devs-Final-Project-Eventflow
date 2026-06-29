# User Story Refinement Review — US-056

## Source User Story File
management/user-stories/US-056-cancel-active-quote-request.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-056-decision-resolution.md

## Review Date
2026-06-28 (revalidación: 2026-06-28)

## Revalidation Result (2026-06-28)
Q1–Q8 resueltas. La US-056 declara `Backlog Item: PB-P1-034`, `PO/BA Decisions Applied` D1–D8, trazabilidad corregida (`FR-QUOTE-015`, `FR-NOTIF-001/004`, `UC-QUOTE-002`, `BR-QUOTE-005/010`, `BR-NOTIF-001/002`, `BR-BOOKING-009` ref, `NFR-OBS-005/PERF-001`). Endpoint `POST /api/v1/organizer/quote-requests/:id/cancel` con restricción `confirmed_intent`, refactor a `QuoteEventNotificationService` genérico, 2 Notifications atómicas, AC-01..AC-03, EC-01..EC-06, VR-01..VR-05, SEC-01..SEC-04, TS-01..TS-06, NT-01..NT-08, AUTH-TS-01..AUTH-TS-05. **Estado**: `Ready for Approval`.

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| User Story ID                              | US-056                                                                    |
| File Path                                  | management/user-stories/US-056-cancel-active-quote-request.md             |
| Backlog Item                               | PB-P1-034 — Cancelar QuoteRequest activa (con restricción)                |
| Epic                                       | EPIC-QR-001                                                               |
| Estado actual                              | Draft                                                                     |
| Estado recomendado                         | Needs Refinement                                                          |
| Nivel de riesgo                            | Medio                                                                     |
| Calidad general                            | Media                                                                     |
| Requiere decisión PO                       | Sí                                                                        |
| Requiere decisión técnica                  | Sí (refactor service común para soportar QR)                              |
| Requiere decisión QA                       | No                                                                        |
| Requiere decisión Seguridad                | No                                                                        |
| Decision Resolution artifact found         | No                                                                        |
| User Story file updated                    | No                                                                        |
| Refinement review artifact created/updated | Yes                                                                       |
| Refinement review path                     | management/user-stories/refinement-reviews/US-056-refinement-review.md    |

---

## 2. Diagnóstico PO/BA

US-056 entrega el endpoint del organizer para cancelar una `QuoteRequest` activa, con restricción si existe `BookingIntent.confirmed_intent` asociado (Decisión PO US-056 + BR-QUOTE-010). Hallazgos:

1. **Trazabilidad incorrecta**: cita `FR-QUOTE-010` (notif por Quote rejected/expired), `UC-QUOTE-007` (marcar preferred), `BR-QUOTE-012` (datos mínimos Quote). Las correctas son **`FR-QUOTE-015`** (organizer cancela QR sent/viewed), **`UC-QUOTE-002`** (cancelar solicitud de cotización), **`BR-QUOTE-010`** (cancelación organizador). Falta **`BR-QUOTE-005`** (lifecycle QR) + **`BR-NOTIF-002`** (notif al vendor) + **`BR-BOOKING-009`** (cancelación BookingIntent — referencia para la restricción). El backlog item cita `FR-QUOTE-014` que es preferred — incorrecto.
2. **Falta declarar `Backlog Item: PB-P1-034`**.
3. **Estados origen permitidos**: BR-QUOTE-010 dice "sent o viewed". El backlog dice también permitir cuando QR está `responded` con Quote sin booking confirmado. Hay que reconciliar.
4. **Restricción BookingIntent**: PB-P1-034 description: "No permitido si existe `BookingIntent.confirmed_intent` asociado". Necesita resolución técnica para verificar existencia del BookingIntent.
5. **Comportamiento sobre Quote asociada**: ¿la Quote pasa a `rejected`, queda como está, o se cancela explícitamente?
6. **`cancellation_reason`** opcional: paridad con US-054 D4 (`reason`).
7. **Notificación al vendor**: in-app + email_simulated (paridad US-049/052/053/054).
8. **`404 QR_NOT_FOUND` uniforme**: consistente con US-051..054.
9. **Atomicidad**: `prisma.$transaction` con UPDATE + notif.
10. **Refactor `QuoteNotificationService`** (US-054): actualmente sólo maneja `quote.rejected` y `quote.expired`. ¿Renombrar a `QuoteEventNotificationService` y agregar `quote_request.cancelled`?
11. **Dependencia US-035 / PB-P1-036**: el modelo de `BookingIntent` debe existir para que la verificación funcione. Confirmar si está entregado o asume schema PB-P0-001.
12. **EC-01**: "QR ya respondida, se permite si Quote no accepted/booking_intent" — confuso. Aclarar.
13. **Rate limit del organizer**.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                                                          | Impacto                                                                                                                                | Recomendación                                                                                                                                                                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alta      | Trazabilidad incorrecta.                                                                                                                                                          | Trazabilidad rota.                                                                                                                     | Reemplazar/añadir: `FR-QUOTE-015, FR-NOTIF-001`, `UC-QUOTE-002`, `BR-QUOTE-005, BR-QUOTE-010, BR-NOTIF-001/002, BR-BOOKING-009 (ref)`, `NFR-OBS-005`.                                                                                          |
| Alta      | Estados origen permitidos.                                                                                                                                                       | Ambigüedad entre BR-QUOTE-010 (sent/viewed) y backlog (responded sin booking).                                                          | Resolver Q1 (PO). Recomendado: **`sent`, `viewed`, `responded`** permitidos. `preferred` requiere recheck Quote/BookingIntent. `cancelled`/`expired` ya finalizados ⇒ `409`.                                                                  |
| Alta      | Restricción `BookingIntent.confirmed_intent`.                                                                                                                                    | PB-P1-034 explícito.                                                                                                                   | Resolver Q2 (PO/Tech). Recomendado: bloquear cancelación si existe `BookingIntent` asociado a la QR (via su Quote) con `status='confirmed_intent'`. ⇒ `409 QR_HAS_CONFIRMED_BOOKING` con `details.booking_intent_id`.                          |
| Alta      | Comportamiento sobre Quote asociada.                                                                                                                                              | Implementación arbitraria.                                                                                                              | Resolver Q3 (PO). Recomendado: la Quote asociada NO se toca por defecto (permanece en su estado actual). El contexto queda en la QR `cancelled`. La Quote vencerá por job de US-053 si aplica.                                                  |
| Alta      | `cancellation_reason` opcional.                                                                                                                                                  | UX limitada.                                                                                                                            | Resolver Q4 (PO). Recomendado: body `{ reason?: string [0..500] }`. Persistir en `quote_requests.cancellation_reason`.                                                                                                                          |
| Alta      | Notificación al vendor.                                                                                                                                                          | Paridad con resto del flujo.                                                                                                            | Resolver Q5 (PO). Recomendado: 2 Notifications atómicas (`in_app` `delivered` + `email_simulated` `simulated`) reutilizando `QuoteNotificationService`.                                                                                       |
| Alta      | Refactor del service común.                                                                                                                                                       | Service actual maneja sólo Quote.                                                                                                       | Resolver Q6 (Tech). Recomendado: renombrar `QuoteNotificationService` (US-054) a `QuoteEventNotificationService` con método genérico `emit({ recipientUserId, eventName, payload, tx })`. Soporta `quote.rejected`, `quote.expired`, `quote_request.cancelled`. |
| Alta      | Authorization + uniformidad de errores.                                                                                                                                          | Patrón inconsistente.                                                                                                                   | Resolver Q7 (PO/Sec). Recomendado: organizer dueño del evento que contiene la QR. Otros ⇒ `404 QR_NOT_FOUND` uniforme.                                                                                                                          |
| Alta      | Atomicidad.                                                                                                                                                                       | Riesgo estado sin notif.                                                                                                                | Resolver Q8 (Tech). Recomendado: `prisma.$transaction` con SELECT FOR UPDATE.                                                                                                                                                                |
| Media     | Falta declarar `Backlog Item: PB-P1-034`.                                                                                                                                       | Trazabilidad incompleta.                                                                                                              | Añadir en Metadata.                                                                                                                                                                                                                            |
| Media     | EC-01 confuso.                                                                                                                                                                   | Test no testeable.                                                                                                                     | Reescribir tras Q1/Q2/Q3.                                                                                                                                                                                                                       |
| Baja      | `Notes` plantea "Confirmar reglas si BookingIntent existe" — exactamente lo que Q2 resuelve.                                                                                       | Obsoleta.                                                                                                                              | Eliminar.                                                                                                                                                                                                                                       |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                  |
| ------------------------------------ | --------- | --------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | Sin penalización (BR-BOOKING-009).                                          |
| No introduce contratos firmados      | Pass      | No aplica.                                                                  |
| No introduce WhatsApp/chat/push      | Pass      | No aplica.                                                                  |
| Respeta human-in-the-loop IA         | Pass      | No invoca IA.                                                                |
| Respeta backend como source of truth | Pass      | Validación server-side.                                                     |
| Respeta seed/demo si aplica          | Pass      | Reuso seed.                                                                 |
| No introduce P4/Future scope         | Pass      | Penalizaciones explícitamente Out of Scope.                                |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad      | Problema detectado                                                          | Acción recomendada                                                                                                                                                                                              |
| ----- | ------------ | --------------------------------------------------------------------------- | -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| AC-01 | Needs Detail | No nombra body, transición, notif, log.                                      | Reescribir tras Q1..Q8.                                                                                                                                                                                    |
| EC-01 | Needs Detail | Política "Quote no accepted/booking_intent" confusa.                         | Tras Q2: reescribir con restricción de `BookingIntent.confirmed_intent`.                                                                                                                                  |

Faltan AC para:
- Restricción `confirmed_intent` (Q2).
- Comportamiento sobre Quote asociada (Q3).
- `reason` opcional (Q4).
- 2 Notifications atómicas (Q5).
- `404 QR_NOT_FOUND` uniforme (Q7).
- Idempotencia (re-cancel ⇒ `409`).

---

## 6. Gaps Detectados

### Producto / Negocio
- Faltan decisiones (Q1..Q8).

### Backend / API
- `RejectQuoteRequestUseCase` con verificación BookingIntent.
- Refactor del service común.
- Reuso de `NotificationSenderPort`.

### Frontend / UX
- `CancelQRDialog` accesible con textarea opcional.

### Base de Datos
- Confirmar `quote_requests.cancellation_reason text NULL`, `cancelled_at timestamptz NULL`.

### Seguridad / Autorización
- Organizer dueño + `404` uniforme.

### IA / PromptOps
- No aplica.

### QA / Testing
- TS cancelación válida + restricción `confirmed_intent` + idempotencia + aislamiento.

### Seed / Demo
- QR `viewed` propia del organizer demo + opcional BookingIntent confirmado para demo del bloqueo.

### Documentación / Trazabilidad
- Corregir FR/UC/BR.
- Documentar endpoint en `docs/16 §M07`.

---

## 7. Preguntas Pendientes

| Tipo     | Pregunta                                                                                                                                                                                                                                          | Bloquea aprobación | Responsable |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| PO       | **Q1** — Estados origen. Recomendado: `sent`, `viewed`, `responded`, `preferred` permitidos (siempre con recheck `confirmed_intent`); `cancelled`/`expired` ⇒ `409`.                                                                            | Sí                 | PO          |
| PO/Tech  | **Q2** — Restricción `confirmed_intent`. Recomendado: query verifica `EXISTS (SELECT 1 FROM booking_intents bi JOIN quotes q ON bi.quote_id=q.id WHERE q.quote_request_id=:qrId AND bi.status='confirmed_intent')`. Si existe ⇒ `409 QR_HAS_CONFIRMED_BOOKING`. | Sí                 | PO/Tech     |
| PO       | **Q3** — Quote asociada. Recomendado: NO se toca (permanece en estado actual). Caducará por job de US-053 si aplica.                                                                                                                          | Sí                 | PO          |
| PO       | **Q4** — `cancellation_reason`. Recomendado: opcional `[0..500]`; persistir en `quote_requests.cancellation_reason` + `cancelled_at=NOW()` + `cancelled_by=currentUser.id`.                                                                  | Sí                 | PO          |
| PO       | **Q5** — Notif vendor. Recomendado: 2 Notifications atómicas reutilizando service común.                                                                                                                                                       | Sí                 | PO          |
| Tech     | **Q6** — Refactor service. Recomendado: renombrar `QuoteNotificationService` → `QuoteEventNotificationService` con método genérico `emit({ recipientUserId, eventName, payload, tx })`. Soporta nuevo `quote_request.cancelled`.              | Sí                 | Tech        |
| PO/Sec   | **Q7** — Auth. Recomendado: organizer dueño del evento; `404 QR_NOT_FOUND` uniforme.                                                                                                                                                          | Sí                 | PO/Sec      |
| Tech     | **Q8** — Atomicidad. Recomendado: `prisma.$transaction` con SELECT FOR UPDATE.                                                                                                                                                                | Sí                 | Tech        |

---

## 8. Documentation Alignment Required

| Documento / Fuente              | Conflicto detectado                                                          | Decisión vigente                       | Acción recomendada                                                | ¿Bloquea aprobación? |
| ------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------- | -------------------- |
| `docs/9 §FR-QUOTE-015`          | La US cita `FR-QUOTE-010`.                                                    | Trazabilidad corregida.                | Housekeeping en US.                                                | No                   |
| `docs/8 §UC-QUOTE-002`          | La US cita `UC-QUOTE-007`.                                                    | Trazabilidad corregida.                | Housekeeping en US.                                                | No                   |
| `docs/4 §BR-QUOTE-010`          | La US cita `BR-QUOTE-012`.                                                    | Trazabilidad corregida.                | Housekeeping en US.                                                | No                   |
| PB-P1-034 Traceability          | El backlog item cita `FR-QUOTE-014` (preferred).                              | Trazabilidad real registrada.          | Housekeeping del backlog.                                          | No                   |
| `docs/16 §M07`                  | Falta documentar endpoint cancel.                                              | Documentar.                            | Actualizar `docs/16`.                                              | No                   |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| User Story file updated                    | No                                                                                    |
| User Story file path                       | `management/user-stories/US-056-cancel-active-quote-request.md`                       |
| User Story ID verified                     | Yes                                                                                   |
| Refinement review artifact created/updated | Yes                                                                                   |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-056-refinement-review.md`              |
| Final recommended status                   | Needs Refinement                                                                      |
| Next recommended skill                     | `eventflow-po-ba-decision-resolver`                                                   |
| Reason                                     | 8 decisiones PO/Tech bloqueantes + trazabilidad incorrecta + restricción BookingIntent sin spec. |

---

## 11. Recomendación Final

`Needs Refinement`.

```text
User Story file updated: No
Path: management/user-stories/US-056-cancel-active-quote-request.md
Refinement review artifact created/updated: Yes
Review path: management/user-stories/refinement-reviews/US-056-refinement-review.md
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
```
