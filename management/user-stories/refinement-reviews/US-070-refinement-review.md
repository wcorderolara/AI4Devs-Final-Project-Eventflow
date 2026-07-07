# User Story Refinement Review — US-070

## Source User Story File
management/user-stories/US-070-inapp-notification-booking-confirmed.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-070-decision-resolution.md

## Review Date
2026-07-06 (revalidación: 2026-07-06)

## Revalidation Result (2026-07-06)

Tras la ejecución de `eventflow-po-ba-decision-resolver` (ver `management/user-stories/decision-resolutions/US-070-decision-resolution.md`) y la actualización en sitio de la User Story:

| Verificación                                                                                                                                                | Resultado |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Q1 (transaction scope) resuelta: handler in-tx dentro del `ConfirmBookingIntentUseCase`.                                                                     | OK        |
| Q2 (idempotencia) resuelta: SELECT antes de INSERT por `(user_id, type, payload->>'booking_intent_id')` — con `user_id` para dedup por recipient.            | OK        |
| Q3 (payload+link con dispatch por rol) resuelta: payload común, link organizer vs vendor; resolver extendido con `{recipientRole}`.                          | OK        |
| Q4 (surface UI) resuelta: Out of Scope. Organizer = US-071 aprobada; vendor = Future US.                                                                    | OK        |
| Q5 (idioma per recipient) resuelta: fallback ladder independiente.                                                                                          | OK        |
| Q6 (recipients) resuelta: BOTH (organizer + vendor). FRD FR-BOOKING-010 prevalece; Documentation Alignment con PB-P2-007.                                    | OK        |
| Q7 (defensa + dedup self-notification) resuelta: guards + dedup por `user_id` + skip parcial ante `deactivated`.                                             | OK        |
| Traceability corregida con IDs canónicos (`FR-BOOKING-010`, `UC-BOOKING-002`, `BR-BOOKING-002/003`, `BR-NOTIF-*`, `NFR-OBS-004/005`).                        | OK        |
| Recorte de alcance: Frontend + UX/UI eliminadas. Backlog Item declarado (`PB-P2-007`).                                                                       | OK        |
| AC reescritos (AC-01..AC-08, incluyendo dedup self-notification), EC ampliados (EC-01..EC-05), VR/SEC/Test ampliados.                                       | OK        |
| Documentation Alignment Required (4 ítems, no bloqueantes) incluyendo la corrección del `Description` de PB-P2-007.                                         | OK        |
| Sin scope creep (push/SMS/WhatsApp/event bus/notif de creación y cancelación permanecen Out of Scope; `BR-BOOKING-008` alcance US-061 upstream).             | OK        |

**Estado recomendado final**: `Ready for Approval`.
**Próximo paso**: `eventflow-user-story-approval`.

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                                                     |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| User Story ID                              | US-070                                                                                          |
| File Path                                  | `management/user-stories/US-070-inapp-notification-booking-confirmed.md`                        |
| Backlog Item                               | PB-P2-007 — Notificación de BookingIntent confirmado (P2, Should Have, posición 1 de 1)         |
| Epic                                       | EPIC-NOT-001                                                                                    |
| Estado actual                              | Draft                                                                                            |
| Estado recomendado                         | Needs Refinement                                                                                 |
| Nivel de riesgo                            | Medio                                                                                            |
| Calidad general                            | Media                                                                                            |
| Requiere decisión PO                       | Sí                                                                                               |
| Requiere decisión técnica                  | Sí                                                                                               |
| Requiere decisión QA                       | No                                                                                               |
| Requiere decisión Seguridad                | No                                                                                               |
| Decision Resolution artifact found         | No                                                                                              |
| User Story file updated                    | No                                                                                              |
| Refinement review artifact created/updated | Yes                                                                                              |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-070-refinement-review.md`                        |

---

## 2. Diagnóstico PO/BA

US-070 formaliza el handler que emite `Notification(type='booking_confirmed')` cuando `ConfirmBookingIntentUseCase` (US-061, upstream) transiciona un `BookingIntent` a `confirmed_intent`. `FR-BOOKING-010` (`docs/9 §495`) es explícito: "El sistema debe notificar **al organizador y al proveedor** en plataforma cada cambio de estado del `BookingIntent` (creación, confirmación, cancelación)". `BR-NOTIF-002` (`docs/4 §389`) también enumera "confirmación y cancelación de `BookingIntent`" como disparador MVP.

El patrón esperado es simétrico a US-068 (Ready for Sprint Planning) y US-069 (Ready for Sprint Planning), con dos particularidades:

* **Dos destinatarios**: la notif se emite a `event.owner_id` (organizer) **y** a `vendor_profile.user_id` (vendor). El vendor es quien confirma, pero FR-BOOKING-010 exige el registro también en su bandeja para trazabilidad. Esta bilateralidad diferencia US-070 de US-068/US-069.
* **Link por destinatario**: la ruta canónica al detalle del booking difiere por rol (organizer → `/organizer/events/{eventId}/bookings/{bookingIntentId}`; vendor → `/vendor/bookings/{bookingIntentId}`). El `NotificationLinkResolver` (US-071 D3) necesita despachar por rol para `type='booking_confirmed'`, o bien el emisor debe pasar un contexto explícito al resolver.

Sin embargo, el archivo llega con los cuatro bloques de problemas ya vistos en US-068/US-069:

1. **Solapamiento con surface UI.** `UX / UI Notes` y `Technical Notes → Frontend` describen inbox + campanita + mark-as-read. La bandeja organizer está aprobada en US-071; la bandeja vendor no tiene US dedicada (mismo gap identificado en US-068 D4). US-072 cubre mark-as-read.
2. **Traceability incorrecta o incompleta.** `FR-NOTIF-004` es **INCORRECTO** (`docs/9 §523`: notif al proveedor por Quote rechazada/expirada). `BR-NOTIF-004` también **INCORRECTO** (read_at, alcance US-072). El canónico primario es `FR-BOOKING-010` (`docs/9 §495`), complementado con `FR-NOTIF-001` (in-app en general) y `FR-NOTIF-003` (email log). BR primario: `BR-BOOKING-002` (confirmación bilateral), `BR-BOOKING-003` (estados), `BR-NOTIF-002` (disparador), más `BR-NOTIF-001/003/005/007`. UC: `UC-BOOKING-002` (fuente del disparo) + `UC-NOTIF-001`. NFR: `NFR-OBS-004, NFR-OBS-005` (no `NFR-OBS-001`).
3. **Decisiones abiertas.** Mismas cinco decisiones que US-068/US-069, más una específica: recipients (organizer only o both). PB-P2-007 `Description` dice "Organizer recibe notificación..." — contradicción con FR-BOOKING-010 (ambos). Documentation Alignment Required. Además, `EC-01` sobre self-notification asume "MVP single-role" — hay que ratificar si un `User` puede ser simultáneamente organizer de un evento y vendor del mismo booking (improbable pero defensa vale).
4. **AC-01 no ejecutable.** "Notif a organizer y vendor" sin número, canal, payload, link por rol, idioma, correlationId ni comportamiento transaccional.

`docs/16 §34.3` enum `type` incluye `booking_confirmed` (verificado). El patrón de link para `booking_confirmed` no está en la tabla `LINK_STRATEGY_BY_TYPE` de US-071 (esa tabla se inicializó con `task_due_soon` y se está ampliando US por US); US-068 agregó `quote_request_received`, US-069 `quote_received`. US-070 debe agregar `booking_confirmed` con lógica por rol.

Sin resolver Q1–Q6 (bloqueantes) y Q7 (defensa opcional) no pueden reescribirse AC/EC/VR/Technical Notes de forma consistente con US-061 y con el patrón US-068/US-069 aprobado.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                                                                | Impacto                                                                             | Recomendación                                                                                                                                                                                                                                                                       |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alta      | Scope creep hacia surface. Alcance solapado con US-071 (organizer) y Future US (vendor bandeja).                                                                                          | Boundaries rotos.                                                                    | Recortar US-070 al handler + persistencia. UX/UI y Frontend Notes migran a "No aplica — surface organizer en US-071; vendor Future".                                                                                                                                                |
| Alta      | Traceability con IDs INCORRECTOS: `FR-NOTIF-004` no aplica (es Quote rechazada), `BR-NOTIF-004` es read_at.                                                                              | Rompe trazabilidad académica.                                                       | Reemplazar por IDs canónicos: FR = `FR-BOOKING-010, FR-NOTIF-001, FR-NOTIF-003`; UC = `UC-BOOKING-002, UC-NOTIF-001`; BR = `BR-BOOKING-002/003, BR-NOTIF-001/002/003/005/007`; NFR = `NFR-OBS-004, NFR-OBS-005`.                                                                     |
| Alta      | Contradicción de recipients: PB-P2-007 `Description` dice "Organizer recibe notificación"; FR-BOOKING-010 dice "organizador y proveedor".                                                | Ambigüedad de scope crítica; afecta número de INSERTs.                              | Resolver Q6 (PO). FRD prevalece: BOTH (organizer + vendor). Documentation Alignment con PB-P2-007.                                                                                                                                                                                    |
| Alta      | Transaction scope, idempotencia, contrato payload+link ausentes.                                                                                                                        | Impacta consistencia y bandeja UX.                                                  | Resolver Q1–Q3 (paralelo D1/D2/D3 US-068).                                                                                                                                                                                                                                            |
| Alta      | `NotificationLinkResolver` requiere lógica por rol para `booking_confirmed` (organizer path vs vendor path).                                                                             | Sin lógica, un solo link no cubre a ambos destinatarios.                             | Resolver Q3 con extensión al resolver: acepta `recipientRole` opcional o el emisor pasa link precomputado por recipient. Recomendación: extender la firma del resolver y agregar dispatch por rol para `booking_confirmed`.                                                          |
| Media     | AC-01 no ejecutable.                                                                                                                                                                     | QA no puede asertar.                                                                | Reescribir con patrón `2 pares por emisión: 1 par organizer + 1 par vendor = 4 registros Notification + 2 entradas [EMAIL]` heredado de US-068 D5.                                                                                                                                    |
| Media     | Idioma sin definir; con 2 destinatarios, cada uno con su propio locale.                                                                                                                | Copy en idioma incorrecto por destinatario.                                          | Resolver Q5. Recomendación: cada recipient resuelve su idioma independientemente (`User.language_preference` con fallback `event.language_code` → `en`).                                                                                                                              |
| Media     | Defensa ante estados inválidos (`booking_intent.status != 'confirmed_intent'`) y `event` eliminado.                                                                                       | Bug upstream llegar al handler.                                                     | Resolver Q7 (paralelo D6 US-068/D6 US-069).                                                                                                                                                                                                                                            |
| Media     | EC-01 "Self-notification" cita "MVP single-role" sin respaldo documental explícito.                                                                                                     | Regla no verificable si un `User` puede tener ambos roles simultáneamente.          | Ratificar en Q6 (subpregunta) o dejar como defensa: si `event.owner_id == vendor_profile.user_id`, emitir sólo 1 par de notifs (dedup por `user_id`).                                                                                                                                 |
| Media     | Backlog Item no declarado.                                                                                                                                                                | Pérdida de trazabilidad.                                                            | Agregar `Backlog Item: PB-P2-007`.                                                                                                                                                                                                                                                    |
| Baja      | i18n locales no enumerados.                                                                                                                                                              | QA puede no cubrir.                                                                 | Enumerar (`es-LATAM, es-ES, pt, en`).                                                                                                                                                                                                                                                  |
| Baja      | Dependencia `US-061` correcta; falta declarar US-071 (surface organizer) y US-072 (mark-as-read).                                                                                        | Handoff poco explícito.                                                             | Ampliar `Dependencies`.                                                                                                                                                                                                                                                               |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                     |
| ------------------------------------ | --------- | ------------------------------------------------------------------------------ |
| No introduce pagos reales            | Pass      | BR-BOOKING-004 explícitamente lo prohíbe.                                       |
| No introduce contratos firmados      | Pass      | BR-BOOKING-005.                                                                 |
| No introduce WhatsApp/chat/push      | Pass      | Out of Scope declara "Push, SMS".                                              |
| Respeta human-in-the-loop IA         | Pass      | No invoca IA.                                                                  |
| Respeta backend como source of truth | Pass      | Emisor server-side.                                                             |
| Respeta seed/demo si aplica          | Pass      | BR-SEED-006 requiere al menos 1 confirmed booking en seed.                     |
| No introduce RAG/vector DB           | Pass      | —                                                                              |
| No introduce multi-tenant enterprise | Pass      | Aislamiento por `user_id`.                                                     |
| No introduce P4/Future scope         | Pass      | Push/realtime siguen Future.                                                   |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad                     | Problema detectado                                                              | Acción recomendada                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----- | --------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01 | Needs Detail / Not Testable | "Notif a organizer y vendor" sin número, canal, payload, link por rol, idioma. | Reescribir tras Q1..Q6. Ejemplo: "Dado un vendor que ejecuta con éxito `ConfirmBookingIntentUseCase` (US-061) y el `BookingIntent` pasa a `confirmed_intent`, cuando se persiste, entonces dentro de la misma transacción se crean 2 pares de `Notification(type='booking_confirmed')`: 1 par para `event.owner_id` con `link=/organizer/events/{eventId}/bookings/{bookingIntentId}` y 1 par para `vendor_profile.user_id` con `link=/vendor/bookings/{bookingIntentId}`, más 2 entradas `[EMAIL]` (una por recipient) sin PII." |

AC faltantes:
- AC para idempotencia por `booking_intent_id + user_id` (evita duplicados al mismo destinatario).
- AC para aislamiento BR-NOTIF-005 (cada recipient sólo su fila).
- AC para idioma resuelto por recipient (Q5).
- AC para observabilidad + no-PII (paralelo US-068/069).
- AC para rollback ante fallo (paralelo).
- AC para defensa `booking_intent.status != 'confirmed_intent'` o event eliminado.
- AC para dedup si `event.owner_id == vendor_profile.user_id` (self-notification).

---

## 6. Gaps Detectados

### Producto / Negocio
- Decisión recipients (Q6): FRD dice ambos; PB describe organizer. FRD gana.
- Enumerar locales.

### Backend / API
- Declarar `OnBookingConfirmedHandler` invocado por `ConfirmBookingIntentUseCase` (US-061).
- Contrato `payload` común (`bookingIntentId, quoteId, quoteRequestId, eventId, vendorProfileId`).
- Extensión `NotificationLinkResolver` para `booking_confirmed` con dispatch por rol.
- Idempotencia por `(user_id, type='booking_confirmed', payload->>'booking_intent_id')`.
- Transaction scope in-tx (Q1).

### Frontend / UX
- Recortar. Surface organizer en US-071; vendor Future US.

### Base de Datos
- Sin migraciones. Reuso de índices.

### Seguridad / Autorización
- Aislamiento por recipient.
- Log sin PII (paralelo US-068/US-069 SEC-02).
- Payload NO incluye montos monetarios (`Quote.total`) para evitar PII/comercial (`docs/19` sensibilidad financiera).

### QA / Testing
- TS para 2 recipients + aislamiento entre ellos + idempotencia + idioma por recipient + rollback + defensa + dedup self-notification + BudgetItem NO afectado por este handler (US-070 no toca `BR-BOOKING-008`).

### Seed / Demo
- BR-SEED-006 exige booking confirmed en seed. La creación de la notif es automática al ejecutar el handler durante el seed.

### Documentación / Trazabilidad
- IDs canónicos.
- Backlog Item.
- Documentation Alignment con PB-P2-007 (`Description` dice organizer; FR-BOOKING-010 dice ambos).

---

## 7. Preguntas Pendientes

| Tipo         | Pregunta                                                                                                                                                                                                                                                                                                                                                                            | Bloquea aprobación | Responsable        |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------ |
| Tech + PO    | Q1. ¿Handler in-tx dentro del `ConfirmBookingIntentUseCase` (US-061) o post-commit? Recomendación: in-tx (paralelo D1 US-068).                                                                                                                                                                                                                                                       | Sí                 | Tech Lead + PO     |
| Tech + PO    | Q2. Idempotencia por `(user_id, type='booking_confirmed', payload->>'booking_intent_id')`. Con 2 recipients, la clave incluye `user_id` para permitir 1 par por recipient sin bloquear al otro.                                                                                                                                                                                       | Sí                 | Tech Lead + PO     |
| PO + Tech    | Q3. Payload + link server-side por rol. Payload común: `{bookingIntentId, quoteId, quoteRequestId, eventId, vendorProfileId}` (sin totales). Link: organizer → `/organizer/events/{eventId}/bookings/{bookingIntentId}`; vendor → `/vendor/bookings/{bookingIntentId}`. Requiere extensión del `NotificationLinkResolver` con dispatch por rol.                                        | Sí                 | Product Owner + Tech Lead |
| PO           | Q4. Surface UI. Recomendación: Out of Scope. Organizer consume vía US-071 (aprobada). Vendor bandeja = Future US no listada (mismo gap que US-068).                                                                                                                                                                                                                                | Sí                 | Product Owner     |
| PO           | Q5. Idioma. Cada recipient resuelve su idioma con fallback ladder `User.language_preference → event.language_code → en`.                                                                                                                                                                                                                                                             | Sí                 | Product Owner     |
| PO           | Q6. Recipients. PB-P2-007 `Description` dice "Organizer recibe notificación"; FR-BOOKING-010 y BR-NOTIF-002 exigen ambos (organizer + vendor). Recomendación: FRD prevalece; ambos. Documentation Alignment con PB-P2-007.                                                                                                                                                            | Sí                 | Product Owner     |
| PO           | Q7 (opcional, defensa en profundidad). Si por bug upstream el handler recibe un `BookingIntent.status != 'confirmed_intent'`, si el evento fue eliminado, o si `event.owner_id == vendor_profile.user_id` (self-notification), ¿el handler skip + warn, dedup por `user_id`, o emite igual? Recomendación: skip + warn; dedup por `user_id` para self-notification (emitir 1 par sólo). | Parcial            | Product Owner     |

---

## 8. Documentation Alignment Required

| Documento / Fuente                             | Conflicto detectado                                                                                        | Decisión vigente                                                        | Acción recomendada                                                                                                                                             | ¿Bloquea aprobación? |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| PB-P2-007 `Description`                        | Dice "Organizer recibe notificación"; FR-BOOKING-010 y BR-NOTIF-002 exigen ambos.                          | FRD prevalece (Q6).                                                     | Corregir `Description` de PB-P2-007 a "Organizer y vendor reciben notificación in-app + email simulado al confirmarse `BookingIntent`".                       | No                   |
| `docs/16 §34.3` (tabla `link generation by type`) | Falta fila `booking_confirmed` con dispatch por rol.                                                        | D3 US-070 extiende la tabla con lógica por rol.                          | Agregar fila y clarificar patrón de dispatch (o Nota).                                                                                                          | No                   |
| PB-P2-007 Traceability                          | Verificar si menciona `FR-BOOKING-010` + `BR-NOTIF-002`.                                                    | US-070 refinada declara IDs canónicos.                                   | Ampliar Traceability del backlog item.                                                                                                                          | No                   |
| `docs/14 §Notifications`                        | Sin `OnBookingConfirmedHandler`.                                                                            | Handler in-tx.                                                          | Documentar.                                                                                                                                                     | No                   |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                                                                                                                                                       |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User Story file updated                    | No                                                                                                                                                                                                                          |
| User Story file path                       | `management/user-stories/US-070-inapp-notification-booking-confirmed.md`                                                                                                                                                    |
| User Story ID verified                     | Yes                                                                                                                                                                                                                         |
| Decision Resolution artifact found         | No                                                                                                                                                                                                                          |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-070-decision-resolution.md`                                                                                                                                                |
| Refinement review artifact created/updated | Yes                                                                                                                                                                                                                         |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-070-refinement-review.md`                                                                                                                                                    |
| Final recommended status                   | Needs Refinement                                                                                                                                                                                                            |
| Next recommended skill                     | `eventflow-po-ba-decision-resolver`                                                                                                                                                                                         |
| Reason                                     | 6 preguntas bloqueantes Q1–Q6 + Q7 parcial. Q6 en particular resuelve una contradicción documental entre PB y FRD que impacta el número de recipients y por tanto el número de INSERTs. Reescritura de AC/EC/VR imposible sin las decisiones. Scope creep hacia surface debe recortarse. |

---

## 10. Cambios Aplicados o Recomendados

(No aplicados; prescriptivos para tras la resolución.)

### Metadata
- `Backlog Item: PB-P2-007`.
- `User Role: Organizer + Vendor (destinatarios) / System (emisor)`.
- `Feature`: "Emitir notificación in-app y email simulado a organizer y vendor al confirmarse BookingIntent".
- `Status → Ready for Approval` tras aplicar todos los cambios.

### Business Context
- Dependencies ampliadas: US-061 (upstream), US-071 (surface organizer aprobada), US-072 (mark-as-read).

### PO/BA Decisions Applied
- Sección nueva D1..D7.

### Traceability
- FRD → `FR-BOOKING-010, FR-NOTIF-001, FR-NOTIF-003`.
- UC → `UC-BOOKING-002, UC-NOTIF-001`.
- BR → `BR-BOOKING-002, BR-BOOKING-003, BR-NOTIF-001, BR-NOTIF-002, BR-NOTIF-003, BR-NOTIF-005, BR-NOTIF-007`.
- Permission → `Sistema → event.owner_id AND vendor_profile.user_id`.
- Data Entity → `Notification, BookingIntent, Quote, QuoteRequest, Event, VendorProfile, User`.
- API → No aplica (handler).
- NFR → `NFR-OBS-004, NFR-OBS-005`.
- Related Documents → `/docs/4 §BR-BOOKING-002/003 §BR-NOTIF-*`, `/docs/6 §Notification §BookingIntent §Quote`, `/docs/8 §UC-BOOKING-002 §UC-NOTIF-001`, `/docs/9 §FR-BOOKING-010 §FR-NOTIF-001/003`, `/docs/10 §NFR-OBS-004/005`, `/docs/14 §23.1 §Notifications`, `/docs/18 §18.1`.
- Backlog Item.

### Scope Guardrails
- Out of Scope: surface organizer (→ US-071), surface vendor (Future), mark-as-read (→ US-072), event bus, `notification_delivery_log`, push/SMS/WhatsApp, retry asincrónico, SMTP real, actualización de `BudgetItem.committed` (alcance de US-061 upstream).

### Acceptance Criteria
- Reescribir AC-01. Añadir AC-02..AC-08 (idempotencia por recipient, aislamiento, idioma por recipient, observabilidad + no-PII, rollback, defensa, dedup self-notification).

### Edge Cases
- EC-01 (self-notification: dedup por `user_id`).
- EC-02 (retry: sin duplicados por recipient).
- EC-03 (BookingIntent en `pending` recibido defensivamente: skip).
- EC-04 (event eliminado: skip + warn).
- EC-05 (fallo INSERT: rollback completo).

### Validation Rules
- VR-01: `event.owner_id` y `vendor_profile.user_id` válidos; skip si nulos.
- VR-02: `booking_intent.status = 'confirmed_intent'`.
- VR-03: `Notification.user_id ∈ {event.owner_id, vendor_profile.user_id}` (BR-NOTIF-005).
- VR-04: dedup si `event.owner_id == vendor_profile.user_id`.

### Authorization & Security
- SEC-01 Sistema; SEC-02 log sin PII (`userId, bookingIntentId, quoteId?, quoteRequestId?, eventId, vendorProfileId, correlationId`; excluye `email, displayName, quote total, brief, event notes, vendor name`); SEC-03 aislamiento por recipient.

### Technical Notes (Backend)
- `OnBookingConfirmedHandler` in-tx (D1) dentro de `ConfirmBookingIntentUseCase` (US-061).
- Reuso: `NotificationRepository` (extendido con `existsBookingConfirmedForRecipient`), `SimulatedEmailAdapter` (US-034), `UserRepository.resolveLanguageCode` (US-034), `NotificationLinkResolver` (US-071) extendido con dispatch por rol para `booking_confirmed`.

### UX / UI Notes
- Reemplazar por "No aplica — surface organizer en US-071; vendor Future".

### Test Scenarios
- TS-01..TS-08 + NT-01..NT-04 (paralelo US-068/US-069 + 2 recipients + dedup self-notification).

### Definition of Ready / Done
- DoR: PO/BA validó.
- DoD: idempotencia por recipient, rollback, log sin PII, i18n por recipient, PO valida en demo.

### Notes
- Handoff explícito con US-061 (upstream), US-071 (surface organizer), US-072 (mark-as-read), Future vendor bandeja.
- Documentation Alignment con PB-P2-007 `Description`.

---

## 11. Recomendación Final

`Needs Refinement`

Q1–Q6 bloqueantes + Q7 parcial. Q6 resuelve una contradicción documental relevante (recipients: FRD vs PB). Todas las decisiones tienen paralelo directo en US-068/US-069 aprobadas, salvo Q6 (nueva) y Q3 (extensión del resolver para dispatch por rol).

Próximo paso: ejecutar `eventflow-po-ba-decision-resolver`.

---

User Story file updated: No
Path: management/user-stories/US-070-inapp-notification-booking-confirmed.md
Refinement review artifact created/updated: Yes
Review path: management/user-stories/refinement-reviews/US-070-refinement-review.md
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
