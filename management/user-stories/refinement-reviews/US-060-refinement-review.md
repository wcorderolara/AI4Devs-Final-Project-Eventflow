# User Story Refinement Review — US-060

## Source User Story File
management/user-stories/US-060-create-booking-intent.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-060-decision-resolution.md

## Review Date
2026-06-28 (revalidación: 2026-06-28)

## Revalidation Result (2026-06-28)
Q1–Q8 resueltas. La US-060 declara `Backlog Item: PB-P1-036`, `PO/BA Decisions Applied` D1–D8, trazabilidad corregida (`FR-BOOKING-001/002/006/007`, `FR-NOTIF-001/004`, `UC-BOOKING-001`, `BR-BOOKING-001/004/006/007`, `BR-NOTIF-001/002`, `NFR-OBS-005/PERF-001`). Endpoint atómico `POST /organizer/booking-intents` con aceptación de Quote + creación de BookingIntent + disclaimer enforcement + 2 notifs + UNIQUE parcial. AC-01..AC-03, EC-01..EC-05, VR-01..VR-07, SEC-01..SEC-06, TS-01..TS-05, NT-01..NT-09, AUTH-TS-01..AUTH-TS-05. **Estado**: `Ready for Approval`.

## 1. Resultado Ejecutivo

| Campo | Evaluación |
|---|---|
| User Story ID | US-060 |
| File Path | management/user-stories/US-060-create-booking-intent.md |
| Backlog Item | PB-P1-036 — BookingIntent: crear, confirmar, cancelar |
| Epic | EPIC-CMP-001 |
| Estado actual | Draft |
| Estado recomendado | Needs Refinement |
| Nivel de riesgo | Alto |
| Requiere decisión PO | Sí |
| Requiere decisión técnica | Sí |
| Decision Resolution artifact found | No |
| Refinement review path | management/user-stories/refinement-reviews/US-060-refinement-review.md |

## 2. Diagnóstico

US-060 es 1 de 3 en PB-P1-036 (US-060 crear, US-061 confirmar, US-062 cancelar). El AC actual "Quote vigente accepted... Quote → accepted" es contradictorio: si la Quote ya está `accepted`, no se transiciona; si está en otro estado, ¿quién y cuándo la acepta?

No existe US separada de "Accept Quote" en el sprint visible. PB-P1-036 dice "desde Quote vigente + `accepted`". Esto exige decisión PO: ¿la US-060 implementa la **aceptación + creación atómica** del BookingIntent, o son flujos separados?

Recomendación: **atómico** — US-060 marca `Quote.status='accepted'` + crea `BookingIntent.status='pending'` en una transacción. Esto cierra el bucle MVP sin requerir un endpoint adicional de "accept Quote".

### Hallazgos clave

1. **Trazabilidad**: cita `FR-BOOKING-002` (lifecycle) pero la principal es **`FR-BOOKING-001`** (origen). Faltan **`FR-BOOKING-006`** (disclaimer), **`FR-BOOKING-007`** (sin pagos), **`BR-BOOKING-004/006`**, **`FR-NOTIF-001`**.
2. **Falta declarar `Backlog Item: PB-P1-036`**.
3. **AC-01 contradictorio** sobre la transición de Quote.
4. **Disclaimer**: server-side enforcement (`disclaimer_accepted: true` requerido) + UI checkbox/acción.
5. **Atomicidad**: Quote → `accepted` + BookingIntent → `pending` + notif → vendor.
6. **UNIQUE constraint**: 1 BookingIntent activo por Quote (excluyendo `cancelled`).
7. **Notif vendor**: 2 Notifications atómicas vía `QuoteEventNotificationService` con nuevo evento `booking_intent.created`.
8. **Estados Quote origen**: ¿`sent`, `responded`, `preferred`? Recomendado: cualquiera de `sent/responded/preferred` no vencida.
9. **404 uniforme**: `404 QUOTE_NOT_FOUND` para Quote ajena/inexistente.
10. **Sin pagos** (FR-BOOKING-007): assert que no hay capturas de pago en la transacción.

## 3. Hallazgos Principales

| Severidad | Hallazgo | Recomendación |
|---|---|---|
| Alta | AC-01 contradictorio "Quote accepted → accepted" | Resolver Q1 (PO): la US-060 marca `Quote.status='accepted'` + crea BookingIntent atómicamente. |
| Alta | Trazabilidad incompleta | Reemplazar/añadir FR-BOOKING-001/002/006/007, FR-NOTIF-001, UC-BOOKING-001, BR-BOOKING-001/004/006, BR-NOTIF-001/002. |
| Alta | Disclaimer enforcement | Resolver Q2 (PO): `disclaimer_accepted: true` en body es requerido server-side. |
| Alta | Atomicidad | Resolver Q3 (Tech): `prisma.$transaction` UPDATE Quote + INSERT BookingIntent + 2 notifs. |
| Alta | UNIQUE constraint | Resolver Q4 (Tech): UNIQUE parcial `(quote_id) WHERE status IN ('pending','confirmed_intent')`. |
| Alta | Notif vendor | Resolver Q5 (PO): reutilizar service común con evento `booking_intent.created`. |
| Alta | Estados Quote origen | Resolver Q6 (PO): permitidos `sent`, `responded`, `preferred` no vencidas. |
| Alta | 404 uniforme | Resolver Q7 (Sec): `404 QUOTE_NOT_FOUND`. |
| Media | Falta declarar PB-P1-036 | Añadir en Metadata. |
| Media | Sin pagos enforcement | Resolver Q8 (Sec): test explícito que verifica no hay campos de pago aceptados. |

## 7. Preguntas Pendientes

| # | Tipo | Pregunta | Recomendado |
|---|---|---|---|
| Q1 | PO/Tech | Aceptación de Quote: ¿flujo separado o atómico con creación BookingIntent? | **Atómico**: la US-060 marca `Quote.status='accepted'` + crea BookingIntent `pending`. Cierra MVP sin endpoint extra. |
| Q2 | PO | Disclaimer enforcement | Body requiere `disclaimer_accepted: true`. Si `false` o ausente ⇒ `400 DISCLAIMER_REQUIRED`. Frontend bloquea CTA hasta checkbox. |
| Q3 | Tech | Atomicidad | `prisma.$transaction` con SELECT FOR UPDATE: UPDATE Quote → `accepted`, INSERT BookingIntent `pending`, 2 notifs vendor vía service común. |
| Q4 | Tech | UNIQUE constraint | UNIQUE parcial `booking_intents (quote_id) WHERE status IN ('pending','confirmed_intent')`. Si ya existe ⇒ `409 BOOKING_INTENT_ALREADY_EXISTS`. |
| Q5 | PO | Notif vendor | 2 Notifications atómicas (`in_app`+`email_simulated`) con `event='booking_intent.created'` vía `QuoteEventNotificationService` extendido. |
| Q6 | PO | Estados Quote origen permitidos | `sent`, `responded`, `preferred` no vencidas. Otros (`accepted`, `rejected`, `expired`, `draft`) ⇒ `409 QUOTE_NOT_ACCEPTABLE`. |
| Q7 | Sec | Authorization | Organizer dueño del evento que contiene la QR de la Quote. Otros ⇒ `404 QUOTE_NOT_FOUND` uniforme. |
| Q8 | Sec | No-pagos enforcement | Body DTO `.strict()` rechaza cualquier campo de pago (`payment_method`, `card_token`, `amount_paid`, etc.) con `400 INVALID_BODY`. Test explícito FR-BOOKING-007. |

## 9. Recomendación

`Needs Refinement` — 8 decisiones PO/Tech/Sec bloqueantes.

```text
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
```
