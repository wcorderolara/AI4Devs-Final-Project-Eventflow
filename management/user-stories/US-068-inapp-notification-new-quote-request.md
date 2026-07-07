# 🧾 User Story: Recibir aviso in-app de nueva QuoteRequest

## 🆔 Metadata

| Field              | Value                                                                        |
| ------------------ | ---------------------------------------------------------------------------- |
| ID                 | US-068                                                                        |
| Epic               | EPIC-NOT-001 — Notifications                                                  |
| Backlog Item       | PB-P2-005 — Notificación de QuoteRequest creada (P2, posición 1 de 1)         |
| Feature            | Emitir notificación in-app y email simulado al vendor al crear QuoteRequest    |
| Module / Domain    | Notifications                                                                 |
| User Role          | Vendor (destinatario) / System (emisor)                                       |
| Priority           | Should Have                                                                   |
| Status             | Approved with Minor Notes                                                     |
| Owner              | Product Owner / Business Analyst                                              |
| Approved By        | PO/BA Review                                                                  |
| Approval Date      | 2026-07-06                                                                    |
| Ready for Development Tasks | Yes (notas no bloqueantes; ver §Notes)                              |
| Sprint / Milestone | MVP                                                                           |
| Created Date       | 2026-06-09                                                                    |
| Last Updated       | 2026-07-06                                                                    |

---

## 🎯 User Story

**As a** proveedor
**I want** que el sistema emita automáticamente una notificación in-app y un email simulado cuando un organizador me envíe una nueva QuoteRequest
**So that** pueda enterarme oportunamente sin depender de refresh manual

---

## 🧠 Business Context

### Context Summary

El `CreateQuoteRequestUseCase` (US-049) invoca sincrónicamente al handler `OnQuoteRequestCreatedHandler` dentro de la misma transacción Prisma. El handler crea 2 registros `Notification(type='quote_request_received')` (canales `in_app` + `email_simulated`) dirigidos al `VendorProfile.user_id` y registra una entrada de log estructurado simulando envío de email. El paso 6 de `UC-QUOTE-001` (`docs/8 §3070`) documenta el disparo.

### Related Domain Concepts

* `Notification(type='quote_request_received')`.
* `SimulatedEmailAdapter` (reusado de US-034).
* `NotificationLinkResolver` (definido en US-071 D3).
* Emisión in-transaction (sin event bus/outbox en MVP).

### Assumptions

* `VendorProfile.status='approved'` garantizado por UC-QUOTE-001 E3 (`docs/8`); US-049 rechaza QRs a vendors no-approved.
* MVP corre single-process (`docs/14 §23.1`); no hay Redis/BullMQ/Kafka.
* `SimulatedEmailAdapter` ya existe (reuso de US-034).
* `NotificationLinkResolver` ya existe (US-071 D3) y se extiende con la estrategia `quote_request_received`.

### Dependencies

* **US-049** (upstream — `CreateQuoteRequestUseCase` invoca este handler).
* **US-072** (downstream — mark-as-read cross-role).
* Nota: la bandeja UI vendor no tiene US dedicada en el backlog actual; se documenta como Future US simétrica a US-071.

### PO/BA Decisions Applied

Decisiones formalizadas en `management/user-stories/decision-resolutions/US-068-decision-resolution.md`:

| ID | Decisión                                                                                                                                                                                                                       |
| -- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1 | Handler `OnQuoteRequestCreatedHandler` invocado sincrónicamente dentro de la transacción Prisma del `CreateQuoteRequestUseCase`. Ante fallo del INSERT, la QR se revierte y el caller recibe 500. Sin event bus/outbox en MVP.   |
| D2 | Idempotencia por chequeo SELECT antes de INSERT en la misma tx, filtrando por `(user_id, type='quote_request_received', payload->>'quote_request_id')`. Sin unique constraint. Sin `notification_delivery_log`.                  |
| D3 | `payload={quoteRequestId, eventId, organizerId, categoryCode}`; `link='/vendor/quote-requests/{quoteRequestId}'` generado por `NotificationLinkResolver` (extensión de la tabla de US-071).                                     |
| D4 | Surface UI vendor Out of Scope. Bandeja vendor genérica = Future US no listada. Mark-as-read = US-072. US-068 se limita al emisor + persistencia.                                                                                |
| D5 | `Notification.language_code = User.language_preference` del vendor. Fallback secundario: `event.language_code`. Fallback terciario: `en`.                                                                                        |
| D6 | Defensa en profundidad: si por bug upstream el handler recibe QR con `vendor.status != 'approved'`, skip + log warning estructurado; no aborta la QR (aunque el escenario está bloqueado por UC-QUOTE-001 E3).                    |

---

## 🔗 Traceability

| Source                 | Reference                                                                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Backlog Item           | PB-P2-005                                                                                                                          |
| FRD Requirement(s)     | FR-NOTIF-001, FR-NOTIF-003                                                                                                          |
| Use Case(s)            | UC-NOTIF-001, UC-QUOTE-001 (paso 6 — origen del disparo)                                                                             |
| Business Rule(s)       | BR-NOTIF-001, BR-NOTIF-002, BR-NOTIF-003, BR-NOTIF-005, BR-NOTIF-007                                                                |
| Permission Rule(s)     | Sistema → `VendorProfile.user_id`                                                                                                    |
| Data Entity / Entities | Notification, QuoteRequest, VendorProfile, User                                                                                     |
| API Endpoint(s)        | No aplica (handler interno). Consumo por vendor vía `GET /api/v1/notifications` (`docs/16 §34.2`)                                     |
| NFR Reference(s)       | NFR-OBS-004 (email simulado por log), NFR-OBS-005 (cambios críticos en logs)                                                         |
| Related ADR(s)         | — (Future ADR sólo si se promueve a event bus)                                                                                       |
| Related Document(s)    | /docs/4 §BR-NOTIF-001/002/003/005/007, /docs/6 §Notification, §VendorProfile, /docs/8 §UC-QUOTE-001, §UC-NOTIF-001, /docs/9 §FR-NOTIF-001/003, /docs/10 §NFR-OBS-004/005, /docs/14 §23.1 §Notifications, /docs/18 §18.1 |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Should Have

### Explicitly Out of Scope

* Surface UI vendor (bandeja de notificaciones) — Future US no listada en el backlog actual.
* Mark-as-read (single + bulk) — alcance US-072 (PB-P2-008).
* Push, SMS, WhatsApp (BR-NOTIF-006).
* Event bus / outbox pattern — Future (requiere ADR).
* Tabla `notification_delivery_log` — Future (`docs/18 §18.1`).
* Retry asincrónico diferido — Future.
* Integración SMTP real — Future.

### Scope Notes

* Sólo emisor + persistencia (`Notification` in_app + `Notification` email_simulated) + log estructurado. Sin componentes frontend en US-068.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Emisión correcta al crear QuoteRequest

**Given** un organizer autenticado que envía una `QuoteRequest` válida a un `VendorProfile.status='approved'` mediante `CreateQuoteRequestUseCase` (US-049)
**When** el use case persiste la `QuoteRequest`
**Then** dentro de la misma transacción Prisma se crean exactamente:

1. 1 `Notification(user_id=VendorProfile.user_id, type='quote_request_received', channel='in_app', payload={quoteRequestId, eventId, organizerId, categoryCode}, language_code=<resolved per D5>)`,
2. 1 `Notification(user_id=VendorProfile.user_id, type='quote_request_received', channel='email_simulated', payload=<mismo>, language_code=<mismo>)`,
3. 1 entrada de log estructurado `[EMAIL] to=<vendorUserId> subject=<localized> body=<localized>` sin PII, con `correlationId` heredado del request (`req-qr-<id>` si no hay request context).

### AC-02: Idempotencia por re-invocación

**Given** una `QuoteRequest` para la cual ya existen los 2 registros `Notification`
**When** el handler es invocado de nuevo (por bug del caller o reintento defensivo)
**Then** el SELECT detecta el registro existente y skip silencioso: no se crean duplicados; no se emite segunda entrada `[EMAIL]`.

### AC-03: Aislamiento (BR-NOTIF-005)

**Given** dos vendors `v1` y `v2` con perfiles independientes
**When** el organizer envía una QR a `v1`
**Then** el `Notification.user_id` creado corresponde exclusivamente a `v1.user_id`; `v2` no recibe registros.

### AC-04: Idioma resuelto y persistido

**Given** un vendor `v1` con `User.language_preference='pt'` y una QR asociada a un evento con `event.language_code='en'`
**When** el handler emite las notifs
**Then** los 2 registros `Notification` y la entrada `[EMAIL]` se persisten con `language_code='pt'` (D5 fallback ladder: preferencia del vendor → idioma del evento → `en`).

### AC-05: Observabilidad + no-PII

**Given** el handler emite las notifs con éxito
**When** el run termina
**Then** el log estructurado contiene sólo los campos `userId, quoteRequestId, eventId, categoryCode, correlationId`. Quedan excluidos: `email, displayName, brief content, event notes, vendor name`. El `[EMAIL]` está localizado según D5.

### AC-06: Rollback ante fallo del INSERT

**Given** un fallo transitorio del INSERT de cualquiera de los 2 `Notification` dentro de la transacción
**When** el `CreateQuoteRequestUseCase` intenta commit
**Then** la transacción se revierte por completo: no queda `QuoteRequest`, no quedan registros `Notification`, no se emite entrada `[EMAIL]`. El caller HTTP recibe 500 con el `correlationId` para diagnóstico.

### AC-07: Defensa vendor no-approved (D6)

**Given** un handler que recibe defensivamente una QR asociada a un `VendorProfile.status != 'approved'` (escenario bloqueado upstream por UC-QUOTE-001 E3)
**When** el handler se ejecuta
**Then** skip la creación de notifs y emite log `warn` estructurado con `correlationId, quoteRequestId, vendorProfileId, vendorStatus`. La QR permanece persistida.

---

## ⚠️ Edge Cases

### EC-01: Vendor no autenticado en ese momento

**Given** el vendor destinatario está offline al momento del disparo
**When** el handler emite las notifs
**Then** los 2 registros `Notification` se persisten y son visibles al próximo login (consumo del canonical `GET /api/v1/notifications`).

#### Handling

* Sin filtros; el vendor consume las notifs al recuperar sesión.

### EC-02: Retry del use case a nivel HTTP

**Given** una llamada previa que persistió la QR y las notifs, seguida de un retry del cliente HTTP con la misma intención
**When** el nuevo intento invoca el handler para la MISMA `quote_request_id` (bug defensivo; normalmente el retry crea una QR nueva)
**Then** no se crean duplicados (AC-02).

#### Handling

* SELECT antes de INSERT en la misma tx.

### EC-03: `VendorProfile` sin `user_id` o `User` desactivado

**Given** un `VendorProfile.user_id=null` o el `User` en estado `deactivated`
**When** el handler se ejecuta
**Then** skip + log warn (VR-01); no se abortan otras operaciones.

#### Handling

* Guard defensivo antes del SELECT/INSERT.

### EC-04: Fallo del INSERT (DB no disponible)

**Given** la DB no responde durante el INSERT del segundo `Notification`
**When** la transacción intenta commit
**Then** rollback completo (AC-06).

#### Handling

* Rollback estándar de Prisma; sin retry automático en el handler.

---

## 🚫 Validation Rules

| ID    | Rule                                                                                       | Message / Behavior                     |
| ----- | ------------------------------------------------------------------------------------------ | -------------------------------------- |
| VR-01 | `VendorProfile.user_id` no nulo; `User.status` distinto de `deactivated`                    | Skip + log warn (EC-03)                |
| VR-02 | `VendorProfile.status = 'approved'` (defensa en profundidad; upstream UC-QUOTE-001 E3)      | Skip + log warn (AC-07, D6)            |
| VR-03 | `Notification.user_id = VendorProfile.user_id` (BR-NOTIF-005)                              | InvariantViolation si difiere          |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                          |
| ------ | ------------------------------------------------------------------------------------------------------------- |
| SEC-01 | Handler ejecutado por sistema como parte del use case autenticado (US-049); no requiere sesión propia.        |
| SEC-02 | Log estructurado sólo contiene `userId, quoteRequestId, eventId, categoryCode, correlationId`. Excluye `email, displayName, brief, event notes, vendor name`. |
| SEC-03 | Aislamiento BR-NOTIF-005: `Notification.user_id = VendorProfile.user_id` verificado por guard interno.        |

### Negative Authorization Scenarios

* No aplica desde el punto de vista del handler (no expone endpoint). Los endpoints de surface para el vendor viven en el canonical `GET /api/v1/notifications` y heredan sus policies.

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

| Area                | Notes                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Screen / Route      | No aplica — surface Out of Scope; consumo del canonical `GET /api/v1/notifications` en un vendor client Future.      |
| Main UI Pattern     | No aplica.                                                                                                          |
| Primary Action      | No aplica.                                                                                                          |
| Secondary Actions   | No aplica — mark-as-read en US-072.                                                                                 |
| Empty State         | No aplica.                                                                                                          |
| Loading State       | No aplica.                                                                                                          |
| Error State         | No aplica.                                                                                                          |
| Success State       | No aplica.                                                                                                          |
| Accessibility Notes | No aplica directamente.                                                                                             |
| Responsive Notes    | No aplica.                                                                                                          |
| i18n Notes          | Locales soportados: `es-LATAM`, `es-ES`, `pt`, `en` (US-007). Subject/body del log `[EMAIL]` localizado por D5.       |
| Currency Notes      | No aplica                                                                                                            |

---

## 🛠 Technical Notes

### Frontend

* No aplica — US-068 no entrega componentes ni rutas frontend. Consumo de las notifs se hará por una US futura simétrica a US-071 (bandeja vendor genérica) fuera del backlog actual, o vía el cliente canonical según el rol.

### Backend

* Use Case / Service:

  * `OnQuoteRequestCreatedHandler` (módulo `notifications`), invocado sincrónicamente por `CreateQuoteRequestUseCase` (módulo `quote-flow`, US-049).
* Transaction Required:

  * **Sí** — parte de la misma transacción del use case (D1).
* Authorization Policy:

  * System (invocado por el use case).
* Validation:

  * VR-01, VR-02, VR-03 aplicadas en guard interno del handler.
* Idempotencia (D2 — `Recommended Decision — Requires Tech Lead Validation`):

  * `SELECT 1 FROM notifications WHERE user_id=$1 AND type='quote_request_received' AND payload->>'quote_request_id'=$2 LIMIT 1` antes de cada INSERT.
* Repositorios reutilizados:

  * `NotificationRepository.existsQuoteRequestReceivedForQR(vendorUserId, quoteRequestId)`.
  * `NotificationRepository.create(Notification)`.
  * `UserRepository.resolveLanguageCode(vendorUserId, fallback=event.language_code)` (US-034 base).
  * `SimulatedEmailAdapter.logEmail({to, subject, body, correlationId, locale})` (US-034 base).
* Servicio compartido:

  * `NotificationLinkResolver.resolve(notification)` con la estrategia `quote_request_received` (D3, extensión de US-071 D3).

### Database

* Main Tables:

  * `notifications`, `quote_requests`, `vendor_profiles`, `users`, `events`.
* Constraints:

  * Sin migraciones. FKs existentes.
* Index Considerations:

  * Reuso de `idx_notifications_user_status_sent` para lecturas.
  * Reuso de `idx_notifications_user_unread` para conteo unread.
  * Sin índice nuevo en MVP.

### API

| Method | Endpoint                              | Purpose                                                    |
| ------ | ------------------------------------- | ---------------------------------------------------------- |
| —      | Handler interno                       | Emitir 2 `Notification` + log `[EMAIL]` desde US-049        |
| GET    | `/api/v1/notifications`               | Consumo por vendor client Future (canonical `docs/16 §34.2`) |

### Observability / Audit

* Correlation ID Required: Yes (heredado del request de `CreateQuoteRequestUseCase`; fallback `req-qr-<id>` si no hay contexto).
* Log Event Required: Yes — por cada QR: `[EMAIL] to=<vendorUserId> subject=<localized> body=<localized>` (NFR-OBS-004).
* AdminAction Required: No.
* AIRecommendation Required: No.
* PII en logs: prohibida (SEC-02).

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                                                       | Type        |
| ----- | -------------------------------------------------------------------------------------------------------------- | ----------- |
| TS-01 | QR válida → 2 registros `Notification` (in_app + email_simulated) + 1 entrada `[EMAIL]`, todo in-tx.            | Integration |
| TS-02 | Idempotencia: segundo intento con la misma `quote_request_id` no crea duplicados.                              | Integration |
| TS-03 | Aislamiento: dos vendors — `v1` recibe notif; `v2` no.                                                          | Integration |
| TS-04 | Idioma: (a) vendor con `pt` → notif en `pt`; (b) sin preferencia → fallback `event.language_code`; (c) sin ambos → `en`. | Integration |
| TS-05 | Log estructurado sin PII: campos permitidos = set exacto; sin email/displayName/brief.                          | Integration |
| TS-06 | Rollback: mock INSERT del segundo `Notification` falla → QR no persistida (AC-06).                              | Integration |
| TS-07 | Defensa vendor no-approved: handler recibe QR con `vendor.status='pending_approval'` → skip + warning log; QR persiste. | Integration |

### Negative Tests

| ID    | Scenario                                          | Expected Result                                      |
| ----- | ------------------------------------------------- | ---------------------------------------------------- |
| NT-01 | `VendorProfile.user_id` null                       | Skip + log warn; QR persiste.                        |
| NT-02 | `User` en `deactivated`                            | Skip + log warn; QR persiste.                        |
| NT-03 | Fallo DB durante INSERT                            | Rollback completo (TS-06 refuerza).                  |
| NT-04 | Retry HTTP del use case genera nueva QR + nuevas notifs (no re-usa `quote_request_id`) | Nueva QR + nuevas notifs; sin conflicto con AC-02.  |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario                                                     | Expected Result                                     |
| ---------- | ------------------------------------------------------------ | --------------------------------------------------- |
| AUTH-TS-01 | Sistema (via US-049) crea `Notification` para `vendor.user_id` | Success; `Notification.user_id = VendorProfile.user_id`. |

### Accessibility Tests

* No aplica — sin UI en US-068. La accesibilidad del consumo vive en la US futura de bandeja vendor.

---

## 📊 Business Impact

| Field               | Value                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------- |
| KPI Affected        | Tasa de respuesta vendor a nuevas QRs                                                     |
| Expected Impact     | Reacción rápida sin refresh manual                                                        |
| Success Criteria    | 100% de QRs válidas producen 2 registros `Notification` + 1 log `[EMAIL]` (verificable vía TS-01) sin PII en logs. |
| Academic Demo Value | Demuestra emisión bilateral (organizer → vendor) end-to-end                                |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* No aplica — surface Out of Scope.

### Potential Backend Tasks

* Implementar `OnQuoteRequestCreatedHandler` con emisión in-tx.
* Wire con `CreateQuoteRequestUseCase` (US-049).
* Extender `NotificationRepository` con `existsQuoteRequestReceivedForQR`.
* Extender `NotificationLinkResolver` (US-071) con estrategia `quote_request_received`.
* Extender catálogos i18n para `quote_request_received` subject/body en 4 locales.

### Potential Database Tasks

* No aplica — sin migración.

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* Suite TS-01..TS-07 + NT-01..NT-04.
* Regresión no-PII (SEC-002 pattern).
* Test de rollback (TS-06).

### Potential DevOps / Config Tasks

* Not applicable for this story.

---

## ✅ Definition of Ready

* [x] Rol claro (Vendor destinatario, System emisor).
* [x] Goal/valor claros.
* [x] FRD/UC/BR enlazados (FR-NOTIF-001/003, UC-NOTIF-001 + UC-QUOTE-001, BR-NOTIF-001/002/003/005/007).
* [x] Permisos identificados (Sistema → `VendorProfile.user_id`).
* [x] Entidades listadas (`Notification`, `QuoteRequest`, `VendorProfile`, `User`, `Event`).
* [x] AC en GWT (AC-01..AC-07).
* [x] Edge cases documentados (EC-01..EC-04).
* [x] Validación clara (VR-01..VR-03).
* [x] Out of Scope explícito (surface vendor, mark-as-read, event bus, push/SMS/WhatsApp).
* [x] Dependencias conocidas (US-049 upstream, US-072 downstream).
* [x] UX states identificados (No aplica).
* [x] API definida (No aplica; consumo canonical).
* [x] Tests definidos (TS-01..TS-07, NT-01..NT-04, AUTH-TS-01).
* [x] PO/BA validó (Q1–Q5 + Q6 cerradas).

---

## 🏁 Definition of Done

* [ ] `OnQuoteRequestCreatedHandler` implementado y wired al `CreateQuoteRequestUseCase` (US-049).
* [ ] Emisión in-transaction verificada; rollback comprobado (TS-06).
* [ ] Idempotencia comprobada (TS-02).
* [ ] Aislamiento BR-NOTIF-005 verificado (TS-03).
* [ ] `language_code` resuelto y persistido (D5, TS-04).
* [ ] Log `[EMAIL]` sin PII (SEC-02, TS-05).
* [ ] Defensa vendor no-approved verificada (TS-07).
* [ ] Extensión de `NotificationLinkResolver` con `quote_request_received` merged.
* [ ] Catálogos i18n para `quote_request_received` en 4 locales.
* [ ] CI quality gates pasan.
* [ ] PO valida en demo: crear QR desde organizer demo → `notifications` tiene 2 filas con `type='quote_request_received'` para el vendor demo, con `link='/vendor/quote-requests/<id>'`.

---

## 📝 Notes

* Alcance recortado a emisor + persistencia. Bandeja vendor genérica documentada como Future US no listada; se recomienda crearla como simétrica a US-071 para completar EPIC-NOT-001.
* Documentation Alignment Required (no bloqueante; ver `decision-resolutions/US-068-decision-resolution.md §5`):
  * Agregar fila `quote_request_received` en `docs/16 §34.3` (tabla `link generation by type`).
  * Ampliar Traceability de PB-P2-005 con `FR-NOTIF-003, BR-NOTIF-002/003/005/007`.
  * Documentar `OnQuoteRequestCreatedHandler` en `docs/14 §Notifications`.
* D1 y D2 marcadas como `Tech Recommendation — Requires Tech Lead Validation` durante Technical Spec.
* Handoff explícito: US-049 (upstream), US-072 (mark-as-read), Future US-vendor-bandeja.
* Riesgo aceptado: si el vendor destinatario nunca abre la campanita (bandeja Future), la notif queda persistida y visible ante la primera consulta.
