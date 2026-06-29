# 🧾 User Story: Enviar QuoteRequest con brief estructurado

## 🆔 Metadata

| Field              | Value                                                                       |
| ------------------ | --------------------------------------------------------------------------- |
| ID                 | US-049                                                                      |
| Backlog Item       | PB-P1-030 — Crear QuoteRequest con brief estructurado (+ límite 5)          |
| Epic               | EPIC-QR-001                                                                 |
| Feature            | Envío de QuoteRequest con brief estructurado y notificación atómica         |
| Module / Domain    | Quotes                                                                      |
| User Role          | Organizer                                                                   |
| Priority           | Must Have                                                                   |
| Status             | Approved                                                                    |
| Owner              | Product Owner / Business Analyst                                            |
| Sprint / Milestone | MVP                                                                         |
| Created Date       | 2026-06-09                                                                  |
| Last Updated       | 2026-06-27                                                                  |
| Approved By        | PO/BA Review                                                                |
| Approval Date      | 2026-06-27                                                                  |
| Ready for Development Tasks | Yes                                                                 |

---

## 🎯 User Story

**As an** organizador autenticado
**I want** crear una `QuoteRequest` desde mi evento `active` hacia un vendor `approved` con un brief estructurado
**So that** obtenga cotización de un proveedor con una notificación inmediata in-app + email simulado

---

## 🧠 Business Context

### Context Summary

El organizer envía la `QuoteRequest` con un brief estructurado (budget, currency heredada del evento, message). El backend valida ownership del evento, status `active`, vendor `approved` + `deleted_at IS NULL`, unicidad por par (event, vendor) entre activas (BR-QUOTE-004) y límite 5 por categoría (BR-QUOTE-009 — US-050 cubre QA dedicada). Toda la operación vive en `prisma.$transaction`: INSERT QR + INSERT 2 `Notification` rows (`in_app` + `email_simulated`). El flag `ai_generated_brief` se setea según `source` del body. US-050 cubre el QA exhaustivo del límite por categoría.

### PO/BA Decisions Applied

| #  | Decisión                                                                                                                                                                                                                                       |
| -- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1 | Brief estructurado: body `{ event_id, vendor_profile_id, service_category_id, brief: { budget, message }, source? }`. Currency heredada del evento (inmutable). Snapshot del evento al persistir (`event_type, event_date, city_code, guests_count`). |
| D2 | Estados que cuentan como "activa" (BR-QUOTE-004 + BR-QUOTE-009): `sent, viewed, responded, preferred`. No cuentan: `cancelled, expired, rejected`.                                                                                              |
| D3 | Sólo `event.status='active'` permite crear QR. Otros estados ⇒ `409 EVENT_NOT_ACTIVE`.                                                                                                                                                          |
| D4 | Vendor target: `status='approved'` AND `deleted_at IS NULL`. Otros estados o UUID inexistente ⇒ `400 VENDOR_NOT_AVAILABLE` (uniforme).                                                                                                          |
| D5 | Reactivación: si QR previa al mismo (event, vendor) está `cancelled`/`expired`/`rejected`, se permite crear una nueva.                                                                                                                         |
| D6 | Notificación: 2 rows `notifications` (`in_app` `delivered` + `email_simulated` `simulated`) dentro de la misma transacción. Reuso de `NotificationSenderPort` (docs/14).                                                                       |
| D7 | `ai_generated_brief`: si `source='ai_generated'` en body, persiste `true`; default `false`.                                                                                                                                                    |
| D8 | Rate limit `10 req/min` por organizer (clave `org:quote_request`). Excedido ⇒ `429 TOO_MANY_REQUESTS` + `Retry-After`. Reuso middleware PB-P0-007.                                                                                            |
| D9 | `prisma.$transaction`: SELECT FOR UPDATE event/vendor + validaciones BR-QUOTE-004/009 + INSERT QR + INSERT 2 Notifications + log. Rollback completo en error.                                                                                  |

### Related Domain Concepts

* `quote_requests` (status enum: `sent, viewed, responded, preferred, cancelled, expired, rejected`).
* `notifications` (`channel`, `event`, `delivery_status`).
* `events.status='active'`, `events.currency_code` (inmutable).
* `vendor_profiles.status='approved'`, `deleted_at`.
* `service_categories.is_active=true`.
* C-016 (constraint del límite 5 per categoría).

### Assumptions

* Brief AI viene de US-021 (opcional); este flow lo consume vía `source='ai_generated'`.
* Email simulado no requiere SMTP (solo metadata persistida).

### Dependencies

* US-040 + US-047 (vendor approved).
* PB-P0-001 (schema `quote_requests` + `notifications`).
* PB-P0-007 (rate limit middleware).
* `NotificationSenderPort` (docs/14 §4.2).
* US-021 opcional (brief AI).
* US-050 (QA del límite por categoría).

---

## 🔗 Traceability

| Source                 | Reference                                                                |
| ---------------------- | ------------------------------------------------------------------------ |
| FRD Requirement(s)     | FR-QUOTE-001, FR-QUOTE-003, FR-QUOTE-004, FR-QUOTE-006, FR-QUOTE-016, FR-EVENT-006 |
| Use Case(s)            | UC-QUOTE-001                                                              |
| Business Rule(s)       | BR-QUOTE-001, BR-QUOTE-003, BR-QUOTE-004, BR-QUOTE-005, BR-QUOTE-007, BR-EVENT-006/007 |
| Permission Rule(s)     | Organizer + ownership del evento; vendor target válido                  |
| Data Entity / Entities | QuoteRequest, Event, VendorProfile, Notification, ServiceCategory        |
| API Endpoint(s)        | POST /api/v1/quote-requests                                              |
| NFR Reference(s)       | NFR-PERF-001                                                              |
| Related ADR(s)         | —                                                                         |
| Related Document(s)    | /docs/4 §BR-QUOTE-001..009, /docs/8 §UC-QUOTE-001, /docs/9 §FR-QUOTE-001..016, /docs/14 §NotificationSenderPort, C-016 |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* Chat real-time.
* Cotizaciones múltiples concurrentes por (event, vendor) entre activas.
* Email real con SMTP (sólo `email_simulated`).
* Cambios de status posteriores a `sent` (cubren otras USs).
* Edición del brief tras envío.

### Scope Notes

* Una QR activa por par (event, vendor) — BR-QUOTE-004.
* Límite 5 por categoría — BR-QUOTE-009 enforcement compartido con US-050.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Envío exitoso con brief estructurado

**Given** un organizer con sesión activa, evento propio `status='active'`, vendor target con `status='approved'` Y `deleted_at IS NULL`, `service_category_id` activo, y no existe QR activa al mismo par (event, vendor)
**When** envía `POST /api/v1/quote-requests` con body válido
**Then** el backend, en `prisma.$transaction`:
- INSERT `quote_requests(status='sent', sent_at=NOW(), event_id, vendor_profile_id, service_category_id, ai_generated_brief, budget, currency_code (del evento), message, event_type/event_date/city_code/guests_count snapshot)`,
- INSERT `notifications(channel='in_app', recipient_user_id=vendor.user_id, event='quote_request.created', delivery_status='delivered')`,
- INSERT `notifications(channel='email_simulated', delivery_status='simulated')`,
- emite log `quote_request.created`,
- responde `201 Created` con el recurso.

### AC-02: Una activa por par (event, vendor) — BR-QUOTE-004

**Given** existe una QR previa al mismo par en estado activo (`sent`/`viewed`/`responded`/`preferred`)
**When** se intenta crear otra
**Then** `409 QR_ALREADY_ACTIVE` con `details.existing_quote_request_id`.

### AC-03: Reactivación post-cancel/expired/rejected (FR-QUOTE-003)

**Given** la QR previa al mismo par está `cancelled`/`expired`/`rejected`
**When** se envía una nueva
**Then** `201 Created` con la nueva QR independiente.

### AC-04: AI flag persistido

**Given** body con `source='ai_generated'`
**When** se crea la QR
**Then** se persiste `ai_generated_brief=true`. Default `false`.

---

## ⚠️ Edge Cases

### EC-01: Vendor target no válido

**Given** vendor con `status ∈ {pending, rejected, hidden}` o `deleted_at IS NOT NULL` o UUID inexistente
**When** se envía
**Then** `400 VENDOR_NOT_AVAILABLE` (uniforme).

#### Handling
* Whitelist por status (D4).

### EC-02: Evento no `active`

**Given** evento con `status ∈ {draft, completed, cancelled}`
**When** se envía
**Then** `409 EVENT_NOT_ACTIVE`.

### EC-03: Brief inválido

**Given** `brief.budget < 0` o `brief.message.length > 5000`
**When** se valida
**Then** `400 INVALID_BRIEF`.

### EC-04: `service_category_id` inválido

**Given** categoría inexistente o `is_active=false`
**When** se valida
**Then** `400 INVALID_CATEGORY`.

### EC-05: Límite 5 activas por categoría (BR-QUOTE-009 / US-050)

**Given** 5 QRs activas en `(event_id, service_category_id)`
**When** se envía la 6ª
**Then** `409 QR_CATEGORY_LIMIT_REACHED` con `details.active_count=5`.

### EC-06: Rate limit

**Given** organizer envía 11 requests en 60s
**When** la 11ª llega
**Then** `429 TOO_MANY_REQUESTS` + `Retry-After`.

---

## 🚫 Validation Rules

| ID    | Rule                                                              | Message / Behavior                              |
| ----- | ----------------------------------------------------------------- | ----------------------------------------------- |
| VR-01 | Ownership del evento (`events.organizer_user_id = currentUser.id`) | `404 EVENT_NOT_FOUND` (uniforme)                |
| VR-02 | `event.status='active'`                                            | `409 EVENT_NOT_ACTIVE`                          |
| VR-03 | Vendor `approved` + `deleted_at IS NULL`                            | `400 VENDOR_NOT_AVAILABLE`                      |
| VR-04 | `service_category_id` existe + `is_active=true`                     | `400 INVALID_CATEGORY`                          |
| VR-05 | `brief.budget >= 0` y `numeric(14,2)`                                | `400 INVALID_BRIEF`                              |
| VR-06 | `brief.message ∈ [0..5000]`                                          | `400 INVALID_BRIEF`                              |
| VR-07 | No existe QR activa par (event, vendor)                              | `409 QR_ALREADY_ACTIVE`                          |
| VR-08 | `< 5` QR activas en (event, category)                                | `409 QR_CATEGORY_LIMIT_REACHED`                  |
| VR-09 | Rate limit `10 req/min` por organizer                                 | `429 TOO_MANY_REQUESTS`                          |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                          |
| ------ | --------------------------------------------------------------------------------------------- |
| SEC-01 | Sólo `organizer` autenticado (`organizerRoleGuard`).                                          |
| SEC-02 | Ownership del evento.                                                                          |
| SEC-03 | Vendor target debe ser `approved` + `deleted_at IS NULL` (D4).                                |
| SEC-04 | Rate limit `10 req/min` por organizer (D8).                                                   |
| SEC-05 | `404 EVENT_NOT_FOUND` uniforme para evento ajeno o inexistente (no revela ownership).         |
| SEC-06 | `400 VENDOR_NOT_AVAILABLE` uniforme para vendor inválido (no revela existencia).             |
| SEC-07 | Vendor recibirá la QR via in-app + email_simulated (assignment-based access).                 |

### Negative Authorization Scenarios

* Sin sesión → `401`.
* Rol `vendor`/`admin` → `403`.
* Organizer sobre evento ajeno → `404 EVENT_NOT_FOUND`.
* Rate excedido → `429`.

---

## 🤖 AI Behavior

This story does not invoke AI directly.

### AI Involvement

* AI Feature: None (consume output opcional de US-021 vía `source='ai_generated'`).
* Provider Layer: Not applicable
* Human Validation Required: Not applicable
* Persist AIRecommendation: No
* Fallback Required: Not applicable

### AI Input

* Not applicable for this story.

### AI Output

* Not applicable for this story.

### Human-in-the-loop Rules

* El brief AI (US-021) es editable antes de enviar.

### AI Error / Fallback Behavior

* Not applicable for this story.

---

## 🎨 UX / UI Notes

| Area                | Notes                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| Screen / Route      | `/[locale]/organizer/events/:id/quotes/new?vendorSlug=<slug>`                                  |
| Main UI Pattern     | Form con datos snapshot del evento (read-only) + campos `budget` + `message` + selector categoría. |
| Primary Action      | "Enviar solicitud".                                                                            |
| Secondary Actions   | "Autocompletar con IA" (deep-link a US-021).                                                   |
| Empty State         | N/A.                                                                                           |
| Loading State       | Spinner en CTA durante submit.                                                                 |
| Error State         | Banner accesible con código i18n (`QR_ALREADY_ACTIVE`, `QR_CATEGORY_LIMIT_REACHED`, `EVENT_NOT_ACTIVE`, `VENDOR_NOT_AVAILABLE`, `INVALID_BRIEF`, `INVALID_CATEGORY`). |
| Success State       | Toast + redirect a `/organizer/events/:id/quotes`.                                              |
| Accessibility Notes | Labels semánticos + `aria-describedby` para errores.                                            |
| Responsive Notes    | Mobile-first.                                                                                  |
| i18n Notes          | 4 locales.                                                                                     |
| Currency Notes      | Heredada del evento; sólo se muestra (no editable).                                            |

---

## 🛠 Technical Notes

### Frontend

* Route / Page: `app/[locale]/organizer/events/[id]/quotes/new/page.tsx`.
* Components: `QuoteRequestForm`, `EventSnapshotCard`, `VendorCardSummary`.
* State Management: TanStack mutation + invalidación de query de QRs por evento.
* Forms: RHF + Zod espejo del backend.
* API Client: `quotesApi.createRequest(payload)`.

### Backend

* Use Case / Service: `CreateQuoteRequestUseCase`.
* Controller / Route: `POST /api/v1/quote-requests` con `organizerRoleGuard` + rate limit.
* Authorization Policy: Organizer + ownership.
* Validation: Zod estricto + service layer (BR-QUOTE-004/009).
* Transaction Required: **Sí** (D9). `prisma.$transaction` con `SELECT FOR UPDATE`.

### Database

* Main Tables: `quote_requests`, `notifications`, `events`, `vendor_profiles`, `service_categories`.
* Constraints: UNIQUE parcial activa por (event_id, vendor_profile_id) WHERE `status IN ('sent','viewed','responded','preferred')` (verificar en DB-001; si falta, migración menor).
* Index Considerations: `idx_quote_requests_event_status`, `idx_quote_requests_vendor_status`, `idx_quote_requests_event_category_active`.

### API

| Method | Endpoint                          | Purpose                |
| ------ | --------------------------------- | ---------------------- |
| POST   | `/api/v1/quote-requests`          | Crear QR con brief.    |

#### Request Body
```json
{
  "event_id": "<uuid>",
  "vendor_profile_id": "<uuid>",
  "service_category_id": "<uuid>",
  "brief": { "budget": "5000.00", "message": "..." },
  "source": "manual" | "ai_generated"
}
```

#### Response 201
```json
{
  "id": "<uuid>",
  "status": "sent",
  "sent_at": "2026-...",
  "event_id": "...",
  "vendor_profile_id": "...",
  "service_category_id": "...",
  "ai_generated_brief": false,
  "brief": { "budget": "5000.00", "currency_code": "GTQ", "message": "..." },
  "event_snapshot": { "event_type": "...", "event_date": "...", "city_code": "...", "guests_count": 100 }
}
```

### Observability / Audit

* Correlation ID Required: Yes
* Log Event Required: Yes (`quote_request.created`).
* AdminAction Required: No
* AIRecommendation Required: No

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                          | Type        |
| ----- | --------------------------------------------------------------------------------- | ----------- |
| TS-01 | Envío exitoso crea QR `sent` y 2 Notifications.                                   | Integration |
| TS-02 | Reactivación tras `cancelled` permitida.                                          | Integration |
| TS-03 | `source='ai_generated'` setea `ai_generated_brief=true`.                          | Integration |
| TS-04 | Currency heredada del evento.                                                     | Integration |
| TS-05 | Transacción rollback al fallar inserción de Notification.                          | Integration |

### Negative Tests

| ID    | Scenario                                              | Expected Result                  |
| ----- | ----------------------------------------------------- | -------------------------------- |
| NT-01 | Duplicada activa par (event, vendor)                   | `409 QR_ALREADY_ACTIVE`          |
| NT-02 | Vendor `pending`/`rejected`/`hidden`/soft-deleted/UUID inexistente | `400 VENDOR_NOT_AVAILABLE`      |
| NT-03 | Evento `draft`/`completed`/`cancelled`                 | `409 EVENT_NOT_ACTIVE`           |
| NT-04 | Brief inválido (budget < 0 o message > 5000)           | `400 INVALID_BRIEF`              |
| NT-05 | Categoría inactiva o inexistente                       | `400 INVALID_CATEGORY`           |
| NT-06 | 5 activas en (event, category) → 6ª                    | `409 QR_CATEGORY_LIMIT_REACHED`  |
| NT-07 | Rate excedido                                          | `429 TOO_MANY_REQUESTS`          |
| NT-08 | Evento ajeno                                           | `404 EVENT_NOT_FOUND`            |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario           | Expected Result          |
| ---------- | ------------------ | ------------------------ |
| AUTH-TS-01 | Organizer dueño    | `201`                    |
| AUTH-TS-02 | Vendor             | `403`                    |
| AUTH-TS-03 | Admin              | `403`                    |
| AUTH-TS-04 | Organizer ajeno    | `404 EVENT_NOT_FOUND`    |
| AUTH-TS-05 | Sin sesión         | `401`                    |

### Accessibility Tests

* Form labels semánticos.
* Mensajes de error accesibles.

---

## 📊 Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | Quote Request Volume.                                |
| Expected Impact     | Habilita cotización bilateral organizer↔vendor.      |
| Success Criteria    | `< 1s p95` con seed completo (NFR-PERF-001).         |
| Academic Demo Value | Core flow marketplace + transacción atómica + notifs. |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Page + Form + Snapshot card + i18n.

### Potential Backend Tasks

* DTO Zod, repository, use case, controller, rate limit, NotificationSenderPort wiring, logger.

### Potential Database Tasks

* Verificación + posible UNIQUE parcial activa.

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* UT, IT, AUTH, A11Y, contract.

### Potential DevOps / Config Tasks

* Not applicable for this story.

---

## ✅ Definition of Ready

* [x] Rol claro.
* [x] Goal/valor claros.
* [x] FRD/UC/BR enlazados.
* [x] Permisos identificados.
* [x] Entidades listadas.
* [x] AC en GWT.
* [x] Edge cases documentados.
* [x] Validación clara.
* [x] Out of Scope explícito.
* [x] Dependencias conocidas.
* [x] UX states identificados.
* [x] API definida.
* [x] Tests definidos.
* [x] PO/BA validó.

---

## 🏁 Definition of Done

* [ ] Endpoint funcional con todas las validaciones.
* [ ] Transacción atómica QR + 2 Notifications.
* [ ] Log `quote_request.created` con `correlation_id`.
* [ ] Rate limit operativo.
* [ ] Tests verdes (functional, negative, auth, accessibility, contract).
* [ ] i18n 4 locales.
* [ ] PO valida flujo end-to-end con vendor recibiendo notificación.

---

## 📝 Notes

* US-050 cubre QA exhaustivo del límite 5 por categoría (mismo endpoint, mismas validaciones).
* Documentation Alignment Required (no bloqueantes) en `management/user-stories/decision-resolutions/US-049-decision-resolution.md`.
