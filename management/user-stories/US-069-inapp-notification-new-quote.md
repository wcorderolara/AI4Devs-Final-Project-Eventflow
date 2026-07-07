# 🧾 User Story: Recibir aviso in-app de nueva Quote

## 🆔 Metadata

| Field              | Value                                                                        |
| ------------------ | ---------------------------------------------------------------------------- |
| ID                 | US-069                                                                        |
| Epic               | EPIC-NOT-001                                                                  |
| Backlog Item       | PB-P2-006 — Notificación de Quote enviada (P2, posición 1 de 1)               |
| Feature            | Emitir notificación in-app y email simulado al organizer cuando el vendor envía Quote |
| Module / Domain    | Notifications                                                                 |
| User Role          | Organizer (destinatario) / System (emisor)                                    |
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

**As an** organizador
**I want** que el sistema emita automáticamente una notificación in-app y un email simulado cuando un vendor pase una Quote a `status='sent'`
**So that** pueda revisar y comparar cotizaciones oportunamente sin refresh manual

---

## 🧠 Business Context

### Context Summary

El `RespondToQuoteRequestUseCase` (US-052) invoca sincrónicamente al handler `OnQuoteSentHandler` dentro de la misma transacción Prisma cuando la `Quote` pasa a `status='sent'`. El handler crea 2 registros `Notification(type='quote_received')` (canales `in_app` + `email_simulated`) dirigidos al `QuoteRequest.event.owner_id` y registra una entrada `[EMAIL]`. `FR-QUOTE-017` y `BR-QUOTE-018` documentan el requisito.

### Related Domain Concepts

* `Notification(type='quote_received')`.
* `SimulatedEmailAdapter` (reuso US-034).
* `NotificationLinkResolver` (US-071 D3) extendido con estrategia `quote_received`.
* Emisión in-transaction (`docs/14 §23.1`).

### Assumptions

* Vendor y organizer activos; QR previamente creada por US-049.
* `RespondToQuoteRequestUseCase` (US-052) valida las precondiciones de UC-QUOTE-004.
* MVP single-process (`docs/14 §23.1`).
* `SimulatedEmailAdapter` y `NotificationLinkResolver` ya existen (US-034 / US-071).

### Dependencies

* **US-052** (upstream — `RespondToQuoteRequestUseCase` invoca este handler).
* **US-071** (surface consumidor aprobada — bandeja organizer unificada).
* **US-072** (downstream — mark-as-read cross-role).

### PO/BA Decisions Applied

Decisiones formalizadas en `management/user-stories/decision-resolutions/US-069-decision-resolution.md`:

| ID | Decisión                                                                                                                                                                                                                                     |
| -- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1 | Handler in-transaction dentro del `RespondToQuoteRequestUseCase`. Ante fallo del INSERT, la transacción rollea (`Quote` no queda `sent`) y el caller recibe 500. Sin event bus.                                                              |
| D2 | Idempotencia por SELECT antes de INSERT en la misma tx, por `(user_id, type='quote_received', payload->>'quote_id')`. Sin unique constraint. Sin `notification_delivery_log`.                                                                 |
| D3 | `payload={quoteId, quoteRequestId, eventId, vendorProfileId}`; `link='/organizer/quote-requests/{quoteRequestId}/comparator'` generado por `NotificationLinkResolver`. Sin `vendorDisplayName` en payload (PII acotada; frontend lo resuelve). |
| D4 | Surface UI del organizer NO es alcance de US-069. Consumido por US-071 (bandeja unificada aprobada). Mark-as-read = US-072.                                                                                                                    |
| D5 | `Notification.language_code = User.language_preference` del organizer. Fallback: `event.language_code`. Fallback final: `en`.                                                                                                                 |
| D6 | Defensa en profundidad: si `quote.status != 'sent'`, si la QR carece de evento válido o si el organizer está `deactivated`, el handler skip + log warn; no aborta la Quote persistida. Escenario bloqueado upstream por UC-QUOTE-004.        |

---

## 🔗 Traceability

| Source                 | Reference                                                                                                                                    |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Backlog Item           | PB-P2-006                                                                                                                                     |
| FRD Requirement(s)     | FR-QUOTE-017 (notif in-app al pasar `sent` — primario), FR-NOTIF-001, FR-NOTIF-003                                                            |
| Use Case(s)            | UC-QUOTE-004 (Responder cotización — fuente del disparo), UC-NOTIF-001                                                                        |
| Business Rule(s)       | BR-QUOTE-018 (notif al organizer al pasar `sent`), BR-NOTIF-001, BR-NOTIF-002, BR-NOTIF-003, BR-NOTIF-005, BR-NOTIF-007                       |
| Permission Rule(s)     | Sistema → `QuoteRequest.event.owner_id`                                                                                                        |
| Data Entity / Entities | Notification, Quote, QuoteRequest, Event, User, VendorProfile                                                                                  |
| API Endpoint(s)        | No aplica (handler interno). Consumo por organizer vía `GET /api/v1/notifications` (US-071, `docs/16 §34.2`)                                    |
| NFR Reference(s)       | NFR-OBS-004 (email log), NFR-OBS-005 (cambios críticos en logs)                                                                                 |
| Related ADR(s)         | — (Future ADR si se promueve a event bus)                                                                                                       |
| Related Document(s)    | /docs/4 §BR-QUOTE-018 §BR-NOTIF-001/002/003/005/007, /docs/6 §Notification §Quote §QuoteRequest, /docs/8 §UC-QUOTE-004 §UC-NOTIF-001, /docs/9 §FR-QUOTE-017 §FR-NOTIF-001/003, /docs/10 §NFR-OBS-004/005, /docs/14 §23.1 §Notifications, /docs/18 §18.1 |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Should Have

### Explicitly Out of Scope

* Surface UI organizer (bandeja) — alcance **US-071** aprobada.
* Mark-as-read (single + bulk) — alcance **US-072**.
* Push, SMS, WhatsApp (BR-NOTIF-006).
* Event bus / outbox pattern — Future (requiere ADR).
* Tabla `notification_delivery_log` — Future (`docs/18 §18.1`).
* Retry asincrónico diferido — Future.
* Integración SMTP real — Future.
* Inclusión de `vendorDisplayName` en `payload` (Q3 — el comparador resuelve datos frescos).

### Scope Notes

* Sólo emisor + persistencia (2 registros `Notification`) + log estructurado. Sin componentes frontend en US-069.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Emisión correcta al pasar Quote a `sent`

**Given** un vendor autenticado que ejecuta con éxito `RespondToQuoteRequestUseCase` (US-052) y la `Quote` pasa a `status='sent'`
**When** el use case persiste el cambio
**Then** dentro de la misma tx Prisma se crean exactamente:

1. 1 `Notification(user_id=QuoteRequest.event.owner_id, type='quote_received', channel='in_app', payload={quoteId, quoteRequestId, eventId, vendorProfileId}, language_code=<resolved per D5>)`,
2. 1 `Notification(...same..., channel='email_simulated')`,
3. 1 entrada de log estructurado `[EMAIL] to=<organizerUserId> subject=<localized> body=<localized>` sin PII, con `correlationId` heredado del request (`req-quote-sent-<id>` si no hay contexto).

### AC-02: Idempotencia por `quote_id`

**Given** una `Quote` para la cual ya existen los 2 registros `Notification`
**When** el handler se invoca defensivamente por segunda vez para la misma `quote_id`
**Then** el SELECT detecta el registro existente y skip silencioso.

### AC-03: Aislamiento (BR-NOTIF-005)

**Given** dos organizers `o1` (dueño de QR1) y `o2` (dueño de QR2), y una Quote respondida a QR1
**When** el handler ejecuta
**Then** `Notification.user_id = o1.user_id`; `o2` no recibe registros.

### AC-04: Idioma resuelto y persistido

**Given** un organizer con `User.language_preference='pt'` y evento con `event.language_code='en'`
**When** el handler emite las notifs
**Then** los 2 registros y el `[EMAIL]` se persisten con `language_code='pt'` (D5 fallback ladder).

### AC-05: Observabilidad + no-PII

**Given** el handler emite con éxito
**When** el run termina
**Then** el log estructurado contiene sólo `userId, quoteId, quoteRequestId, eventId, correlationId`. Prohibido: `email, displayName, brief, event notes, vendor name, quote amount/total, breakdown`.

### AC-06: Rollback ante fallo del INSERT

**Given** fallo del INSERT de cualquiera de los 2 `Notification`
**When** el `RespondToQuoteRequestUseCase` intenta commit
**Then** rollback completo: la `Quote` no queda en `sent`; el caller HTTP recibe 500 con `correlationId`.

### AC-07: Defensa `quote.status != 'sent'` / QR huérfana (D6)

**Given** un handler que recibe defensivamente una Quote en `status != 'sent'` o cuya QR no resuelve a un evento válido
**When** el handler se ejecuta
**Then** skip la creación de notifs y emite log `warn` estructurado con `correlationId, quoteId, quoteRequestId, reason`. La Quote permanece persistida.

---

## ⚠️ Edge Cases

### EC-01: Múltiples Quotes contra la misma QR

**Given** N vendors distintos responden a la misma QR con Quotes distintas
**When** cada respuesta pasa a `sent`
**Then** se crea 1 par de `Notification` por cada `quote_id` (no se agrupa; una notif por Quote).

#### Handling

* Idempotencia por `payload->>'quote_id'` (D2) garantiza no duplicar dentro del mismo `quote_id`, pero permite múltiples registros para `quote_id` distintos.

### EC-02: Retry HTTP del vendor

**Given** el vendor reintenta la respuesta a la misma QR (US-052 rechaza por BR-QUOTE-013 "una sola Quote activa por QR"). En el hipotético caso de que el handler sea invocado 2× para la MISMA `quote_id` (bug defensivo):
**When** el segundo intento ocurre
**Then** no se duplica (AC-02).

#### Handling

* SELECT antes de INSERT.

### EC-03: Organizer sin sesión al momento del disparo

**Given** el organizer está offline
**When** el handler emite las notifs
**Then** los registros se persisten y son visibles al próximo login vía US-071 canonical.

#### Handling

* Sin filtros; el organizer consume las notifs al recuperar sesión.

### EC-04: Fallo del INSERT

**Given** DB no disponible durante el INSERT del segundo `Notification`
**When** la tx intenta commit
**Then** rollback completo (AC-06).

#### Handling

* Rollback estándar de Prisma.

### EC-05: QR huérfana (evento eliminado)

**Given** una Quote asociada a QR cuyo `event_id` fue soft-deleted o cuyo `event.owner_id` referencia un `User` en `deactivated`
**When** el handler ejecuta
**Then** skip + log warn (AC-07); Quote persiste.

#### Handling

* Guard defensivo.

---

## 🚫 Validation Rules

| ID    | Rule                                                                              | Message / Behavior                     |
| ----- | --------------------------------------------------------------------------------- | -------------------------------------- |
| VR-01 | `event.owner_id` no nulo y `User.status != 'deactivated'`                          | Skip + log warn (AC-07)                |
| VR-02 | `quote.status = 'sent'` (defensa; upstream US-052 lo garantiza)                    | Skip + log warn (AC-07)                |
| VR-03 | `event_id` resuelve a `Event` existente                                            | Skip + log warn (AC-07)                |
| VR-04 | `Notification.user_id = event.owner_id` (BR-NOTIF-005)                             | InvariantViolation si difiere          |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                          |
| ------ | ------------------------------------------------------------------------------------------------------------- |
| SEC-01 | Handler ejecutado por sistema dentro del use case autenticado (US-052 valida sesión de vendor).               |
| SEC-02 | Log sólo contiene `userId, quoteId, quoteRequestId, eventId, correlationId`. Excluye `email, displayName, brief, event notes, vendor name, quote total/breakdown`. |
| SEC-03 | Aislamiento BR-NOTIF-005: `Notification.user_id = event.owner_id`.                                             |

### Negative Authorization Scenarios

* No aplica desde el handler (no expone endpoint). Endpoints de surface heredan sus policies de US-071.

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

| Area                | Notes                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| Screen / Route      | No aplica — surface en **US-071** (bandeja unificada organizer, aprobada).                        |
| Main UI Pattern     | No aplica — ver US-071.                                                                          |
| Primary Action      | No aplica — click abre `link` (US-071 delega vía `useRouter().push`).                              |
| Secondary Actions   | No aplica — mark-as-read en US-072.                                                              |
| Empty State         | No aplica.                                                                                        |
| Loading State       | No aplica.                                                                                        |
| Error State         | No aplica.                                                                                        |
| Success State       | No aplica.                                                                                        |
| Accessibility Notes | No aplica directamente.                                                                            |
| Responsive Notes    | No aplica.                                                                                        |
| i18n Notes          | Locales: `es-LATAM, es-ES, pt, en`. Subject/body del `[EMAIL]` localizado por D5.                  |
| Currency Notes      | No aplica                                                                                          |

---

## 🛠 Technical Notes

### Frontend

* No aplica — surface en US-071 (aprobada).

### Backend

* Use Case / Service:

  * `OnQuoteSentHandler` (módulo `notifications`), invocado sincrónicamente por `RespondToQuoteRequestUseCase` (US-052).
* Transaction Required:

  * **Sí** — parte de la misma transacción del use case (D1).
* Authorization Policy:

  * System.
* Validation:

  * VR-01..VR-04 aplicadas en guard interno.
* Idempotencia (D2 — `Recommended Decision — Requires Tech Lead Validation`):

  * `SELECT 1 FROM notifications WHERE user_id=$1 AND type='quote_received' AND payload->>'quote_id'=$2 LIMIT 1`.
* Repositorios reutilizados:

  * `NotificationRepository.existsQuoteReceivedForQuote(organizerUserId, quoteId)`.
  * `NotificationRepository.create(Notification)`.
  * `UserRepository.resolveLanguageCode(organizerUserId, fallback=event.language_code)` (US-034 base).
  * `SimulatedEmailAdapter.logEmail({to, subject, body, correlationId, locale})` (US-034).
* Servicio compartido:

  * `NotificationLinkResolver.resolve(notification)` extendido con estrategia `quote_received` (D3).

### Database

* Main Tables: `notifications`, `quotes`, `quote_requests`, `events`, `users`, `vendor_profiles`.
* Constraints: sin migración.
* Index Considerations: reuso de `idx_notifications_user_status_sent`, `idx_notifications_user_unread`.

### API

| Method | Endpoint                              | Purpose                                                    |
| ------ | ------------------------------------- | ---------------------------------------------------------- |
| —      | Handler interno                       | Emitir 2 `Notification` + log `[EMAIL]` desde US-052        |
| GET    | `/api/v1/notifications`               | Consumo por US-071 canonical (`docs/16 §34.2`)               |

### Observability / Audit

* Correlation ID Required: Yes (heredado del request de US-052; fallback `req-quote-sent-<id>`).
* Log Event Required: Yes — `[EMAIL] to=<organizerUserId> subject=<localized> body=<localized>` (NFR-OBS-004).
* AdminAction Required: No.
* AIRecommendation Required: No.
* PII en logs: prohibida (SEC-02).

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                                                          | Type        |
| ----- | ----------------------------------------------------------------------------------------------------------------- | ----------- |
| TS-01 | Quote pasa a `sent` → 2 registros `Notification` + 1 entrada `[EMAIL]`, todo in-tx.                                | Integration |
| TS-02 | Idempotencia: segundo intento con misma `quote_id` no crea duplicados.                                            | Integration |
| TS-03 | Aislamiento: dos organizers — `o1` recibe notif, `o2` no.                                                          | Integration |
| TS-04 | Idioma: (a) `pt`; (b) fallback `event.language_code`; (c) fallback `en`.                                          | Integration |
| TS-05 | Log estructurado sin PII: set exacto de campos; sin `email/displayName/brief/vendor name/quote total`.             | Integration |
| TS-06 | Rollback: mock INSERT del segundo `Notification` falla → Quote no persistida en `sent`.                            | Integration |
| TS-07 | Defensa: `quote.status='draft'` recibido por handler → skip + warning; Quote persiste.                             | Integration |

### Negative Tests

| ID    | Scenario                                                        | Expected Result                             |
| ----- | --------------------------------------------------------------- | ------------------------------------------- |
| NT-01 | `event.owner_id` nulo                                            | Skip + log warn; Quote persiste.             |
| NT-02 | Organizer `User.status='deactivated'`                             | Skip + log warn.                             |
| NT-03 | Fallo DB durante INSERT                                          | Rollback completo (TS-06 refuerza).          |
| NT-04 | `event_id` referencia evento eliminado (soft-delete)              | Skip + log warn.                             |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario                                                       | Expected Result                                    |
| ---------- | -------------------------------------------------------------- | -------------------------------------------------- |
| AUTH-TS-01 | Sistema (via US-052) crea `Notification` para `event.owner_id` | Success; `Notification.user_id = event.owner_id`. |

### Accessibility Tests

* No aplica — sin UI (surface en US-071).

---

## 📊 Business Impact

| Field               | Value                                                                              |
| ------------------- | ---------------------------------------------------------------------------------- |
| KPI Affected        | Tiempo a decisión del organizer (velocidad de comparación de Quotes)                |
| Expected Impact     | Reacción rápida; cierre del loop bilateral del flujo (organizer ↔ vendor)           |
| Success Criteria    | 100% de Quotes que pasan a `sent` producen 2 `Notification` + 1 `[EMAIL]` sin PII. |
| Academic Demo Value | Demuestra emisión bilateral end-to-end                                              |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* No aplica — surface en US-071.

### Potential Backend Tasks

* Implementar `OnQuoteSentHandler` in-tx.
* Wire con `RespondToQuoteRequestUseCase` (US-052).
* Extender `NotificationRepository` con `existsQuoteReceivedForQuote`.
* Extender `NotificationLinkResolver` (US-071) con estrategia `quote_received`.
* Extender catálogos i18n para `quote_received` subject/body en 4 locales.

### Potential Database Tasks

* No aplica — sin migración.

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* Suite TS-01..TS-07 + NT-01..NT-04.
* Regresión no-PII.
* Test de rollback.

### Potential DevOps / Config Tasks

* Not applicable for this story.

---

## ✅ Definition of Ready

* [x] Rol claro.
* [x] Goal/valor claros.
* [x] FRD/UC/BR enlazados (FR-QUOTE-017, FR-NOTIF-001/003, UC-QUOTE-004, UC-NOTIF-001, BR-QUOTE-018, BR-NOTIF-001/002/003/005/007).
* [x] Permisos identificados (Sistema → `event.owner_id`).
* [x] Entidades listadas.
* [x] AC en GWT (AC-01..AC-07).
* [x] Edge cases documentados (EC-01..EC-05).
* [x] Validación clara (VR-01..VR-04).
* [x] Out of Scope explícito.
* [x] Dependencias conocidas.
* [x] UX states identificados (No aplica).
* [x] API definida (No aplica; consumo canonical US-071).
* [x] Tests definidos.
* [x] PO/BA validó (Q1–Q5 + Q6 cerradas).

---

## 🏁 Definition of Done

* [ ] `OnQuoteSentHandler` implementado y wired al `RespondToQuoteRequestUseCase`.
* [ ] Emisión in-transaction verificada; rollback comprobado (TS-06).
* [ ] Idempotencia comprobada (TS-02).
* [ ] Aislamiento BR-NOTIF-005 verificado (TS-03).
* [ ] `language_code` resuelto y persistido (D5, TS-04).
* [ ] Log `[EMAIL]` sin PII (SEC-02, TS-05).
* [ ] Defensa `quote.status`/QR huérfana verificada (TS-07).
* [ ] Extensión de `NotificationLinkResolver` con `quote_received` merged.
* [ ] Catálogos i18n en 4 locales.
* [ ] CI quality gates pasan.
* [ ] PO valida en demo: vendor demo responde QR → organizer demo recibe notif con `link='/organizer/quote-requests/<id>/comparator'`.

---

## 📝 Notes

* Reuso máximo del patrón US-068 D1–D6 aprobadas y del `NotificationLinkResolver` de US-071.
* Documentation Alignment Required (no bloqueante):
  * Agregar fila `quote_received` en `docs/16 §34.3` (tabla `link generation by type`).
  * Ampliar Traceability de PB-P2-006 con `FR-QUOTE-017, BR-QUOTE-018, BR-NOTIF-*`.
  * Documentar `OnQuoteSentHandler` en `docs/14 §Notifications`.
* D1 y D2 marcadas como `Tech Recommendation — Requires Tech Lead Validation`.
* Handoff explícito: US-052 (upstream), US-071 (surface consumidor aprobada), US-072 (mark-as-read).
* Riesgo aceptado: si el organizer destinatario nunca abre la campanita, la notif queda persistida y visible ante primera consulta.
