# 🧾 User Story: Recibir aviso in-app de Booking confirmado

## 🆔 Metadata

| Field              | Value                                                                        |
| ------------------ | ---------------------------------------------------------------------------- |
| ID                 | US-070                                                                        |
| Epic               | EPIC-NOT-001                                                                  |
| Backlog Item       | PB-P2-007 — Notificación de BookingIntent confirmado (P2, posición 1 de 1)     |
| Feature            | Emitir notificación bilateral (organizer + vendor) al confirmarse BookingIntent |
| Module / Domain    | Notifications                                                                 |
| User Role          | Organizer + Vendor (destinatarios) / System (emisor)                          |
| Priority           | Should Have                                                                   |
| Status             | Approved with Minor Notes                                                     |
| Owner              | Product Owner / Business Analyst                                              |
| Approved By        | PO/BA Review                                                                  |
| Approval Date      | 2026-07-06                                                                    |
| Ready for Development Tasks | Yes                                                                  |
| Sprint / Milestone | MVP                                                                           |
| Created Date       | 2026-06-09                                                                    |
| Last Updated       | 2026-07-06                                                                    |

---

## 🎯 User Story

**As an** organizador o proveedor
**I want** que el sistema me notifique cuando un `BookingIntent` pasa a `confirmed_intent`
**So that** tenga registro simétrico e inmediato del cierre del acuerdo simulado sin refresh manual

---

## 🧠 Business Context

### Context Summary

El `ConfirmBookingIntentUseCase` (US-061) invoca sincrónicamente al handler `OnBookingConfirmedHandler` dentro de la misma transacción Prisma cuando el vendor confirma el `BookingIntent`. El handler emite notifs bilaterales:

* **Organizer** (`event.owner_id`): 1 `Notification(channel='in_app')` + 1 `Notification(channel='email_simulated')` + 1 entrada `[EMAIL]`.
* **Vendor** (`vendor_profile.user_id`): 1 `Notification(channel='in_app')` + 1 `Notification(channel='email_simulated')` + 1 entrada `[EMAIL]`.

Total (recipients distintos): 4 registros + 2 entradas. Self-notification (D7): 2 registros + 1 entrada.

`FR-BOOKING-010` (`docs/9 §495`) exige la notificación bilateral. `BR-NOTIF-002` (`docs/4 §389`) enumera "confirmación y cancelación de `BookingIntent`" como disparador. `UC-BOOKING-002` (`docs/8 §3653`) documenta la fuente del disparo.

### Related Domain Concepts

* `Notification(type='booking_confirmed')`.
* `SimulatedEmailAdapter` (reuso US-034).
* `NotificationLinkResolver` (US-071 D3) extendido con dispatch por rol para `booking_confirmed`.
* Emisión in-transaction (`docs/14 §23.1`).

### Assumptions

* MVP single-process (`docs/14 §23.1`).
* `SimulatedEmailAdapter` y `NotificationLinkResolver` ya existen (US-034 / US-071).
* `ConfirmBookingIntentUseCase` (US-061) valida las precondiciones de UC-BOOKING-002.
* `BR-BOOKING-008` (actualización de `BudgetItem.committed`) es alcance de US-061 upstream; US-070 no lo toca.

### Dependencies

* **US-061** (upstream — `ConfirmBookingIntentUseCase` invoca este handler).
* **US-071** (surface consumidor organizer aprobada — bandeja unificada).
* **US-072** (downstream — mark-as-read cross-role).
* Nota: la bandeja UI vendor no tiene US dedicada; Future US simétrica a US-071 (mismo gap que US-068).

### PO/BA Decisions Applied

Decisiones formalizadas en `management/user-stories/decision-resolutions/US-070-decision-resolution.md`:

| ID | Decisión                                                                                                                                                                                                                                            |
| -- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1 | Handler in-transaction dentro del `ConfirmBookingIntentUseCase`. Ante fallo del INSERT, la tx rollea (BookingIntent no queda `confirmed_intent`; `BudgetItem.committed` no se actualiza). Sin event bus.                                            |
| D2 | Idempotencia por SELECT antes de INSERT en la misma tx, por `(user_id, type='booking_confirmed', payload->>'booking_intent_id')`. Clave incluye `user_id` para dedup independiente por recipient.                                                    |
| D3 | Payload común `{bookingIntentId, quoteId, quoteRequestId, eventId, vendorProfileId}` (sin totales). Link dispatch por rol: organizer → `/organizer/events/{eventId}/bookings/{bookingIntentId}`; vendor → `/vendor/bookings/{bookingIntentId}`. Firma del `NotificationLinkResolver` extendida con `{ recipientRole }` opcional. |
| D4 | Surface UI Out of Scope. Organizer consume vía US-071 (aprobada). Vendor = Future US.                                                                                                                                                                |
| D5 | Idioma por recipient (fallback ladder independiente): `User.language_preference → event.language_code → en`.                                                                                                                                          |
| D6 | Recipients = **AMBOS** (organizer + vendor). FR-BOOKING-010 prevalece sobre `Description` de PB-P2-007 (Documentation Alignment).                                                                                                                    |
| D7 | Guards defensivos: `status != 'confirmed_intent'` → skip+warn; event eliminado → skip+warn; `event.owner_id == vendor_profile.user_id` → dedup (1 par, rol organizer prioritario); recipient `deactivated` → skip parcial (otro sigue).                |

---

## 🔗 Traceability

| Source                 | Reference                                                                                                                                    |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Backlog Item           | PB-P2-007                                                                                                                                     |
| FRD Requirement(s)     | FR-BOOKING-010 (primario — notif bilateral al confirmar), FR-NOTIF-001, FR-NOTIF-003                                                          |
| Use Case(s)            | UC-BOOKING-002 (Confirmar booking intent — fuente del disparo), UC-NOTIF-001                                                                   |
| Business Rule(s)       | BR-BOOKING-002 (confirmación bilateral), BR-BOOKING-003 (estados), BR-NOTIF-001, BR-NOTIF-002 (disparador), BR-NOTIF-003, BR-NOTIF-005, BR-NOTIF-007 |
| Permission Rule(s)     | Sistema → `event.owner_id` AND `vendor_profile.user_id`                                                                                        |
| Data Entity / Entities | Notification, BookingIntent, Quote, QuoteRequest, Event, VendorProfile, User                                                                    |
| API Endpoint(s)        | No aplica (handler interno). Consumo por organizer vía `GET /api/v1/notifications` (US-071)                                                     |
| NFR Reference(s)       | NFR-OBS-004, NFR-OBS-005                                                                                                                       |
| Related ADR(s)         | —                                                                                                                                              |
| Related Document(s)    | /docs/4 §BR-BOOKING-002/003 §BR-NOTIF-001/002/003/005/007, /docs/6 §Notification §BookingIntent §Quote, /docs/8 §UC-BOOKING-002 §UC-NOTIF-001, /docs/9 §FR-BOOKING-010 §FR-NOTIF-001/003, /docs/10 §NFR-OBS-004/005, /docs/14 §23.1 §Notifications, /docs/18 §18.1 |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Should Have

### Explicitly Out of Scope

* Surface UI del organizer (bandeja) — alcance **US-071** aprobada.
* Surface UI del vendor (bandeja) — Future US no listada.
* Mark-as-read (single + bulk) — alcance **US-072**.
* Push, SMS, WhatsApp (BR-NOTIF-006).
* Event bus / outbox pattern — Future.
* Tabla `notification_delivery_log` — Future (`docs/18 §18.1`).
* Retry asincrónico diferido — Future.
* Integración SMTP real — Future.
* Notif de creación (`pending`) y cancelación de `BookingIntent` — Future US (FR-BOOKING-010 los enumera; US-070 sólo cubre `confirmed_intent`).
* Actualización de `BudgetItem.committed` — alcance de US-061 (upstream).
* Inclusión de montos de `Quote` (total, breakdown) en el `payload` — PII financiera protegida.

### Scope Notes

* Sólo emisor + persistencia (2 o 4 registros `Notification`) + 1 o 2 logs `[EMAIL]`. Sin frontend.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Emisión bilateral al confirmarse BookingIntent

**Given** un vendor autenticado que ejecuta con éxito `ConfirmBookingIntentUseCase` (US-061) y el `BookingIntent` pasa a `confirmed_intent`
**When** el use case persiste el cambio
**Then** dentro de la misma tx Prisma se crean:

* Para el organizer (`event.owner_id`):
  1. 1 `Notification(user_id=event.owner_id, type='booking_confirmed', channel='in_app', payload={bookingIntentId, quoteId, quoteRequestId, eventId, vendorProfileId}, language_code=<resolved>, link='/organizer/events/{eventId}/bookings/{bookingIntentId}')`.
  2. 1 `Notification(...same..., channel='email_simulated')`.
  3. 1 entrada `[EMAIL] to=<organizerUserId> subject=<localized> body=<localized>` con `correlationId` heredado.

* Para el vendor (`vendor_profile.user_id`):
  4. 1 `Notification(user_id=vendor.user_id, type='booking_confirmed', channel='in_app', payload=<mismo>, language_code=<resolved>, link='/vendor/bookings/{bookingIntentId}')`.
  5. 1 `Notification(...same..., channel='email_simulated')`.
  6. 1 entrada `[EMAIL] to=<vendorUserId> subject=<localized> body=<localized>`.

### AC-02: Idempotencia por recipient

**Given** ya existen los registros `Notification` para uno o ambos recipients (por retry defensivo)
**When** el handler se invoca de nuevo para el mismo `bookingIntentId`
**Then** el SELECT (aplicado 2× por recipient) detecta cada registro y skip por recipient de forma independiente.

### AC-03: Aislamiento (BR-NOTIF-005)

**Given** dos parejas (organizer1/vendor1) y (organizer2/vendor2), y una confirmación de BookingIntent en la primera pareja
**When** el handler ejecuta
**Then** los 4 registros creados tienen `user_id ∈ {organizer1.user_id, vendor1.user_id}`; nadie del segundo par recibe.

### AC-04: Idioma resuelto por recipient

**Given** organizer con `User.language_preference='pt'` y vendor con `User.language_preference='en'`
**When** el handler emite las notifs
**Then** los 2 registros del organizer tienen `language_code='pt'` y los 2 registros del vendor tienen `language_code='en'`. Cada `[EMAIL]` se localiza con su locale.

### AC-05: Observabilidad + no-PII

**Given** el handler emite con éxito
**When** el run termina
**Then** el log estructurado (por cada `[EMAIL]`) contiene sólo `userId, bookingIntentId, quoteId, quoteRequestId, eventId, vendorProfileId, correlationId`. Prohibido: `email, displayName, quote total, breakdown, brief, event notes, vendor name`.

### AC-06: Rollback ante fallo del INSERT

**Given** fallo del INSERT de cualquiera de los 4 (o 2 en self-notification) registros
**When** el `ConfirmBookingIntentUseCase` intenta commit
**Then** rollback completo: `BookingIntent` no queda `confirmed_intent`, `BudgetItem.committed` no se actualiza, no queda ningún `Notification`. El caller HTTP recibe 500 con `correlationId`.

### AC-07: Defensa `status` / event eliminado / recipient deactivated (D7)

**Given** un handler que recibe defensivamente un `BookingIntent.status='pending'` o un `event` inexistente o un recipient con `User.status='deactivated'`
**When** el handler se ejecuta
**Then** skip + log `warn` con `correlationId, bookingIntentId, eventId?, recipientRole?, reason`. Si sólo un recipient está deactivated, el otro se emite normalmente. La tx del use case no aborta por skip defensivo.

### AC-08: Dedup self-notification (D7)

**Given** un `BookingIntent` donde `event.owner_id == vendor_profile.user_id` (escenario improbable, típicamente por seed corrupto)
**When** el handler ejecuta
**Then** se crea sólo 1 par de `Notification` (con `link` del rol organizer prioritario) + 1 entrada `[EMAIL]`. Log info registra el escenario para auditoría.

---

## ⚠️ Edge Cases

### EC-01: Self-notification

**Given** `event.owner_id == vendor_profile.user_id`
**When** el handler ejecuta
**Then** dedup por `user_id` → 1 par de `Notification` con link de organizer + 1 `[EMAIL]` (AC-08).

#### Handling

* Dedup en el handler antes del INSERT.

### EC-02: Retry HTTP defensivo

**Given** una confirmación previa persistió los registros y el use case es reinvocado con la misma `booking_intent_id`
**When** el handler se ejecuta
**Then** SELECT detecta y skip por recipient (AC-02).

#### Handling

* Chequeo por recipient.

### EC-03: Event eliminado

**Given** `booking_intent.event_id` referencia evento soft-deleted
**When** el handler ejecuta
**Then** skip + log warn (AC-07); Booking persiste.

#### Handling

* Guard defensivo.

### EC-04: Recipient deactivated

**Given** organizer `deactivated` y vendor activo (o viceversa)
**When** el handler ejecuta
**Then** skip el recipient deactivated con log warn; el otro se emite normalmente.

#### Handling

* Skip por recipient, no aborta.

### EC-05: Fallo del INSERT

**Given** DB no responde durante INSERT de cualquier registro
**When** la tx intenta commit
**Then** rollback completo (AC-06).

#### Handling

* Rollback estándar de Prisma.

---

## 🚫 Validation Rules

| ID    | Rule                                                                                | Message / Behavior                     |
| ----- | ----------------------------------------------------------------------------------- | -------------------------------------- |
| VR-01 | `event.owner_id` y `vendor_profile.user_id` no nulos; recipient `User.status != 'deactivated'` (por recipient) | Skip parcial + log warn                |
| VR-02 | `booking_intent.status = 'confirmed_intent'` (defensa; upstream US-061 lo garantiza) | Skip + log warn (AC-07)                |
| VR-03 | `Notification.user_id ∈ {event.owner_id, vendor_profile.user_id}` (BR-NOTIF-005)     | InvariantViolation si difiere          |
| VR-04 | Dedup si `event.owner_id == vendor_profile.user_id` (self-notification)              | 1 par en vez de 2 (AC-08)              |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                          |
| ------ | ------------------------------------------------------------------------------------------------------------- |
| SEC-01 | Handler ejecutado por sistema dentro del use case autenticado (US-061 valida sesión de vendor).               |
| SEC-02 | Log estructurado sólo contiene `userId, bookingIntentId, quoteId, quoteRequestId, eventId, vendorProfileId, correlationId`. Excluye `email, displayName, quote total/breakdown, brief, event notes, vendor name`. |
| SEC-03 | Aislamiento BR-NOTIF-005: `Notification.user_id ∈ {event.owner_id, vendor_profile.user_id}` verificado por guard.  |

### Negative Authorization Scenarios

* No aplica desde el handler. Endpoints de surface heredan sus policies (US-071).

---

## 🤖 AI Behavior

This story does not invoke AI directly.

### AI Involvement

* AI Feature: None
* Provider Layer: Not applicable
* Human Validation Required: Not applicable
* Persist AIRecommendation: No
* Fallback Required: Not applicable

### AI Input / Output / Human-in-the-loop / Fallback

* Not applicable for this story.

---

## 🎨 UX / UI Notes

| Area                | Notes                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| Screen / Route      | No aplica — surface organizer en **US-071**; vendor Future US.                                                   |
| Main UI Pattern     | No aplica.                                                                                                      |
| Primary Action      | No aplica.                                                                                                      |
| Secondary Actions   | No aplica — mark-as-read en US-072.                                                                             |
| Empty State         | No aplica.                                                                                                      |
| Loading State       | No aplica.                                                                                                      |
| Error State         | No aplica.                                                                                                      |
| Success State       | No aplica.                                                                                                      |
| Accessibility Notes | No aplica directamente.                                                                                          |
| Responsive Notes    | No aplica.                                                                                                      |
| i18n Notes          | Locales: `es-LATAM, es-ES, pt, en`. Subject/body del `[EMAIL]` localizado por recipient (D5).                    |
| Currency Notes      | No aplica (payload sin totales; totales monetarios permanecen en `Quote` y son recuperados por la UI al render). |

---

## 🛠 Technical Notes

### Frontend

* No aplica — US-070 no entrega componentes ni rutas frontend.

### Backend

* Use Case / Service:

  * `OnBookingConfirmedHandler` (módulo `notifications`), invocado sincrónicamente por `ConfirmBookingIntentUseCase` (US-061).
* Transaction Required:

  * **Sí** — parte de la misma transacción del use case (D1).
* Authorization Policy:

  * System.
* Validation:

  * VR-01..VR-04 aplicadas en guard interno.
* Idempotencia (D2 — `Recommended Decision — Requires Tech Lead Validation`):

  * `SELECT 1 FROM notifications WHERE user_id=$1 AND type='booking_confirmed' AND payload->>'booking_intent_id'=$2 LIMIT 1`, aplicado 2× (uno por recipient).
* Repositorios reutilizados:

  * `NotificationRepository.existsBookingConfirmedForRecipient(recipientUserId, bookingIntentId)`.
  * `NotificationRepository.create(Notification)`.
  * `UserRepository.resolveLanguageCode(userId, fallback=event.language_code)` (US-034).
  * `SimulatedEmailAdapter.logEmail({to, subject, body, correlationId, locale})` (US-034).
* Servicio compartido:

  * `NotificationLinkResolver.resolve(notification, { recipientRole })` extendido con dispatch por rol (D3). Firma retrocompatible: para tipos que no usan dispatch, el parámetro se ignora.
* Estrategia de emisión:

  1. Resolver `recipients = [organizer, vendor]` (dedup si iguales, D7).
  2. Para cada recipient: aplicar guards D7, chequear idempotencia D2, resolver idioma D5, generar link D3, INSERT `in_app` + INSERT `email_simulated`, invocar `SimulatedEmailAdapter.logEmail`.

### Database

* Main Tables: `notifications`, `booking_intents`, `quotes`, `quote_requests`, `events`, `users`, `vendor_profiles`.
* Constraints: sin migración.
* Index Considerations: reuso de `idx_notifications_user_status_sent`, `idx_notifications_user_unread`.

### API

| Method | Endpoint                              | Purpose                                                    |
| ------ | ------------------------------------- | ---------------------------------------------------------- |
| —      | Handler interno                       | Emitir 2/4 `Notification` + 1/2 log `[EMAIL]` desde US-061   |
| GET    | `/api/v1/notifications`               | Consumo por US-071 canonical (`docs/16 §34.2`)               |

### Observability / Audit

* Correlation ID Required: Yes (heredado del request de US-061; fallback `req-booking-confirmed-<id>`).
* Log Event Required: Yes — `[EMAIL]` por recipient exitoso (NFR-OBS-004); `warn` por skip defensivo (D7); `info` por dedup self-notification (D7).
* AdminAction Required: No (`BR-BOOKING-008` puede requerirlo si US-061 lo declara; fuera de scope de US-070).
* AIRecommendation Required: No.
* PII en logs: prohibida (SEC-02).

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                                                                             | Type        |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| TS-01 | BookingIntent válido pasa a `confirmed_intent` con recipients distintos → 4 registros `Notification` + 2 entradas `[EMAIL]`, todo in-tx. | Integration |
| TS-02 | Idempotencia: segundo intento con mismo `booking_intent_id` no crea duplicados por recipient.                                       | Integration |
| TS-03 | Aislamiento: dos parejas — sólo la pareja objetivo recibe registros.                                                                 | Integration |
| TS-04 | Idioma por recipient: organizer `pt`, vendor `en` → dos `language_code` distintos persistidos y localización correcta.               | Integration |
| TS-05 | Log estructurado sin PII: campos permitidos = set exacto; sin `email/displayName/quote total/brief/vendor name`.                    | Integration |
| TS-06 | Rollback: mock INSERT del segundo `Notification` falla → BookingIntent no persistido en `confirmed_intent`; `BudgetItem` no cambia. | Integration |
| TS-07 | Defensa: BookingIntent en `pending` recibido por handler → skip + warning; BookingIntent original persiste como estaba.               | Integration |
| TS-08 | Dedup self-notification: `event.owner_id == vendor_profile.user_id` → 1 par de `Notification` + 1 `[EMAIL]` (AC-08).                | Integration |

### Negative Tests

| ID    | Scenario                                                        | Expected Result                             |
| ----- | --------------------------------------------------------------- | ------------------------------------------- |
| NT-01 | `event.owner_id` nulo                                            | Skip organizer + log warn; vendor puede seguir. |
| NT-02 | Vendor `User.status='deactivated'`                                | Skip vendor + log warn; organizer emite normalmente. |
| NT-03 | Fallo DB durante INSERT                                          | Rollback completo (TS-06 refuerza).          |
| NT-04 | Event soft-deleted                                                | Skip completo + log warn; BookingIntent no aborta. |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario                                                          | Expected Result                                              |
| ---------- | ----------------------------------------------------------------- | ------------------------------------------------------------ |
| AUTH-TS-01 | Sistema (via US-061) crea `Notification` para ambos recipients    | Success; `user_id ∈ {event.owner_id, vendor_profile.user_id}`. |

### Accessibility Tests

* No aplica — sin UI en US-070.

---

## 📊 Business Impact

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| KPI Affected        | Confianza + cierre demoable del flujo bilateral                                                                 |
| Expected Impact     | Ambas partes tienen registro simétrico del acuerdo simulado                                                    |
| Success Criteria    | 100% de confirmaciones producen 2/4 `Notification` + 1/2 `[EMAIL]` según recipients (D6); sin PII en logs.     |
| Academic Demo Value | Cierra demo end-to-end del flujo QR → Quote → BookingIntent → confirmación bilateral                            |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* No aplica.

### Potential Backend Tasks

* Implementar `OnBookingConfirmedHandler` in-tx con emisión bilateral y dedup.
* Wire con `ConfirmBookingIntentUseCase` (US-061).
* Extender `NotificationRepository` con `existsBookingConfirmedForRecipient`.
* Extender `NotificationLinkResolver` con dispatch por rol para `booking_confirmed` (firma extendida con `{recipientRole}`).
* Catálogos i18n para `booking_confirmed` (una key por recipient role si el copy difiere: `notif.bookingConfirmed.organizer.subject`, `.body`, `.vendor.subject`, `.body`) en 4 locales.

### Potential Database Tasks

* No aplica — sin migración.

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* Suite TS-01..TS-08 + NT-01..NT-04.
* Regresión no-PII.
* Test de rollback.
* Test de dedup self-notification.

### Potential DevOps / Config Tasks

* Not applicable for this story.

---

## ✅ Definition of Ready

* [x] Rol claro (Organizer + Vendor destinatarios, System emisor).
* [x] Goal/valor claros.
* [x] FRD/UC/BR enlazados (FR-BOOKING-010, FR-NOTIF-001/003, UC-BOOKING-002, UC-NOTIF-001, BR-BOOKING-002/003, BR-NOTIF-001/002/003/005/007).
* [x] Permisos identificados (Sistema → 2 recipients).
* [x] Entidades listadas.
* [x] AC en GWT (AC-01..AC-08).
* [x] Edge cases documentados (EC-01..EC-05).
* [x] Validación clara (VR-01..VR-04).
* [x] Out of Scope explícito.
* [x] Dependencias conocidas.
* [x] UX states identificados (No aplica).
* [x] API definida (No aplica; consumo canonical US-071).
* [x] Tests definidos.
* [x] PO/BA validó (Q1–Q6 + Q7 cerradas).

---

## 🏁 Definition of Done

* [ ] `OnBookingConfirmedHandler` implementado y wired al `ConfirmBookingIntentUseCase`.
* [ ] Emisión bilateral in-tx verificada; rollback comprobado (TS-06).
* [ ] Idempotencia comprobada por recipient (TS-02).
* [ ] Aislamiento BR-NOTIF-005 verificado (TS-03).
* [ ] `language_code` resuelto por recipient (D5, TS-04).
* [ ] Log `[EMAIL]` sin PII (SEC-02, TS-05).
* [ ] Defensa `status`/event eliminado/deactivated verificada (TS-07, NT-01, NT-02, NT-04).
* [ ] Dedup self-notification comprobado (TS-08).
* [ ] Extensión de `NotificationLinkResolver` con dispatch por rol para `booking_confirmed` merged.
* [ ] Catálogos i18n en 4 locales × 2 recipient roles.
* [ ] CI quality gates pasan.
* [ ] PO valida en demo: vendor demo confirma BookingIntent → ambos (organizer y vendor demo) reciben notif con `link` correcto por rol.

---

## 📝 Notes

* Reuso máximo del patrón US-068/US-069 D1–D6 aprobadas y del `NotificationLinkResolver` (US-071 D3).
* Documentation Alignment Required (no bloqueante):
  * Corregir `Description` de PB-P2-007 a "Organizer y vendor reciben notificación in-app + email simulado al confirmarse BookingIntent".
  * Agregar fila `booking_confirmed` (con dispatch por rol) a `docs/16 §34.3` (tabla `link generation by type`).
  * Ampliar Traceability de PB-P2-007 con `FR-BOOKING-010, UC-BOOKING-002, BR-BOOKING-002/003, BR-NOTIF-*`.
  * Documentar `OnBookingConfirmedHandler` en `docs/14 §Notifications`.
* D1, D2 y D3 marcadas como `Tech Recommendation — Requires Tech Lead Validation`.
* Handoff explícito: US-061 (upstream), US-071 (surface organizer aprobada), US-072 (mark-as-read), Future vendor bandeja.
* Riesgo aceptado: si un recipient nunca abre la campanita, la notif queda persistida y visible ante la primera consulta.
* US-070 NO cubre notif de creación (`pending`) ni de cancelación de BookingIntent, aunque FR-BOOKING-010 los enumera; son Future US.
