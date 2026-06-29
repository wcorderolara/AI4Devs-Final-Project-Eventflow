# 🧾 User Story: Validar límite de 5 QR activas por categoría (enforcement + UX)

## 🆔 Metadata

| Field              | Value                                                                       |
| ------------------ | --------------------------------------------------------------------------- |
| ID                 | US-050                                                                      |
| Backlog Item       | PB-P1-030 — Crear QuoteRequest con brief estructurado (+ límite 5)          |
| Epic               | EPIC-QR-001                                                                 |
| Feature            | Enforcement + UX del límite de 5 QR activas por (event, category)            |
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
**I want** que el sistema impida enviar más de 5 QuoteRequests activas por categoría por evento, con un contador visible que anticipe el bloqueo en la UI
**So that** mantenga control del flujo y no sature a vendors de la misma categoría (Decisión PO 8.1 #12 / BR-QUOTE-009 / FR-QUOTE-002 / C-016)

---

## 🧠 Business Context

### Context Summary

El enforcement server-side del límite ya se implementa en `CreateQuoteRequestUseCase` (US-049 D9 + EC-05 + VR-08). US-050 cierra PB-P1-030 con:

1. **Endpoint dedicado** `GET /api/v1/quote-requests/active-count` para que el frontend muestre el badge "N/5" en el form de QR.
2. **UI `QRLimitBadge`** con `aria-live` que muestra el conteo y deshabilita el CTA cuando se alcanza el límite.
3. **QA exhaustivo** del límite, incluyendo concurrencia, expiración y mensajes i18n.

Estados que cuentan como "activa": `sent`, `viewed`, `responded`, `preferred` (BR-QUOTE-009). El conteo aplica filtro lazy `(expires_at IS NULL OR expires_at > NOW())`.

### PO/BA Decisions Applied

| #  | Decisión                                                                                                                                                                                                                                       |
| -- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1 | Nuevo endpoint `GET /api/v1/quote-requests/active-count?event_id=&service_category_id=` con response `{ active_count, limit: 5, available_slots, statuses_counted }`. Requiere sesión organizer + ownership del evento. Inválido ⇒ `400/401/404`.   |
| D2 | Concurrencia atómica con `SELECT FOR UPDATE` (heredado de US-049 D9). Sin bloqueo optimista en MVP.                                                                                                                                            |
| D3 | Código de error unificado: `409 Conflict` con `error.code='QR_CATEGORY_LIMIT_REACHED'` y `details: { active_count, limit: 5, event_id, service_category_id }`. Consistente con US-049 EC-05.                                                  |
| D4 | Conteo lazy: `status IN ('sent','viewed','responded','preferred') AND (expires_at IS NULL OR expires_at > NOW())`. Sin job background dedicado en US-050; expiración formal a `status='expired'` queda para US futura del lifecycle (BR-QUOTE-005). |
| D5 | Pre-check híbrido: frontend llama al endpoint count al seleccionar categoría; deshabilita CTA si `available_slots=0`; backend re-valida en POST (defense in depth).                                                                            |
| D6 | Badge `QRLimitBadge` siempre visible (inclusive `N=0`) con `aria-live="polite"` al seleccionar categoría en el form.                                                                                                                          |

### Related Domain Concepts

* `quote_requests` (`status`, `expires_at`).
* Estados activos: `sent`, `viewed`, `responded`, `preferred`.
* Constraint C-016 (limit 5 by (event_id, service_category_id)).

### Assumptions

* US-049 ya implementa el enforcement en POST.
* El conteo lazy es suficiente para MVP; la expiración batch llega después.

### Dependencies

* US-049 (endpoint POST y enforcement core).
* PB-P0-001 (schema + índices).

---

## 🔗 Traceability

| Source                 | Reference                                                                |
| ---------------------- | ------------------------------------------------------------------------ |
| FRD Requirement(s)     | FR-QUOTE-002                                                              |
| Use Case(s)            | UC-QUOTE-001                                                              |
| Business Rule(s)       | BR-QUOTE-009                                                              |
| Permission Rule(s)     | Ownership del evento (heredado de US-049)                                |
| Data Entity / Entities | QuoteRequest, Event, ServiceCategory                                     |
| API Endpoint(s)        | GET /api/v1/quote-requests/active-count, POST /api/v1/quote-requests (re-valida) |
| NFR Reference(s)       | NFR-PERF-001, NFR-OBS-005                                                |
| Related ADR(s)         | —                                                                         |
| Related Document(s)    | /docs/8.1 (#12), /docs/4 §BR-QUOTE-009, /docs/9 §FR-QUOTE-002, C-016     |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* Configurable por usuario o por categoría.
* Job background para expirar QRs (Future).
* Push notifications cuando se libera un slot.
* Bloqueo optimista a nivel de DB.

### Scope Notes

* Estricto `5` por (event_id, service_category_id) entre activas.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: 5ª QR exitosa

**Given** 4 QRs activas en `(event_id, service_category_id)`
**When** el organizer envía la 5ª
**Then** `201 Created` con la nueva QR `status='sent'`. El endpoint `active-count` retorna ahora `{ active_count: 5, available_slots: 0 }`.

### AC-02: 6ª QR bloqueada

**Given** 5 QRs activas
**When** se envía la 6ª
**Then** `409 Conflict` con `{ error: { code: 'QR_CATEGORY_LIMIT_REACHED', details: { active_count: 5, limit: 5, event_id, service_category_id } } }`. No se crea registro.

### AC-03: Endpoint count

**Given** organizer autenticado con ownership del evento
**When** envía `GET /api/v1/quote-requests/active-count?event_id=&service_category_id=`
**Then** `200 OK` con `{ active_count: <int>, limit: 5, available_slots: <int>, statuses_counted: ['sent','viewed','responded','preferred'] }`.

### AC-04: Badge visible en form de QR

**Given** organizer abre `/events/:id/quotes/new` y selecciona categoría
**When** el frontend carga `active-count`
**Then** el `QRLimitBadge` muestra "N/5 cotizaciones activas en esta categoría" con `aria-live="polite"`. Si `available_slots=0`, el CTA "Enviar solicitud" se deshabilita con `aria-describedby` que explica el bloqueo.

### AC-05: Concurrencia atómica

**Given** organizer envía 2 POSTs simultáneos con 4 activas previas
**When** ambos llegan al backend
**Then** sólo uno responde `201`; el otro responde `409 QR_CATEGORY_LIMIT_REACHED`. Esto se garantiza con `SELECT FOR UPDATE` heredado de US-049.

---

## ⚠️ Edge Cases

### EC-01: QR vence y libera slot

**Given** 5 activas con una con `expires_at < NOW()`
**When** el organizer consulta `active-count` o envía POST
**Then** el conteo retorna `active_count=4`, `available_slots=1`. La 6ª QR se acepta con `201 Created`. La QR vencida permanece con `status='sent'` y `expires_at` en el pasado hasta que un job futuro la marque `expired` (BR-QUOTE-005, Future).

### EC-02: Evento ajeno

**Given** organizer consulta `active-count` con `event_id` ajeno
**When** el backend valida ownership
**Then** `404 EVENT_NOT_FOUND` (uniforme con US-049 SEC-05).

### EC-03: Categoría inválida

**Given** `service_category_id` inexistente o `is_active=false`
**When** se valida
**Then** `400 INVALID_CATEGORY`.

---

## 🚫 Validation Rules

| ID    | Rule                                                                                                              | Message / Behavior                              |
| ----- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| VR-01 | Antes del INSERT: `COUNT(*) WHERE event_id AND service_category_id AND status IN (active) AND not_expired) < 5`    | `409 QR_CATEGORY_LIMIT_REACHED`                 |
| VR-02 | `event.organizer_user_id = currentUser.id`                                                                          | `404 EVENT_NOT_FOUND`                           |
| VR-03 | `service_category_id` existe y `is_active=true`                                                                     | `400 INVALID_CATEGORY`                          |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                          |
| ------ | --------------------------------------------------------------------------------------------- |
| SEC-01 | Sesión organizer (heredado de US-049 SEC-01).                                                 |
| SEC-02 | Ownership del evento (heredado de US-049 SEC-02; uniformidad `404 EVENT_NOT_FOUND`).          |
| SEC-03 | El conteo no revela datos sensibles (solo `active_count`).                                    |
| SEC-04 | Rate limit del endpoint count: heredar middleware general PB-P0-007.                          |

### Negative Authorization Scenarios

* Sin sesión → `401`.
* Vendor/Admin → `403`.
* Organizer ajeno → `404 EVENT_NOT_FOUND`.

---

## 🤖 AI Behavior

This story does not invoke AI directly.

### AI Involvement

* AI Feature: None
* Provider Layer: Not applicable
* Human Validation Required: Not applicable
* Persist AIRecommendation: No
* Fallback Required: Not applicable

### AI Input

* Not applicable for this story.

### AI Output

* Not applicable for this story.

### Human-in-the-loop Rules

* Not applicable for this story.

### AI Error / Fallback Behavior

* Not applicable for this story.

---

## 🎨 UX / UI Notes

| Area                | Notes                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| Screen / Route      | `/[locale]/organizer/events/:id/quotes/new` (reuso de US-049).                                 |
| Main UI Pattern     | `QRLimitBadge` "N/5 cotizaciones activas en esta categoría" con `aria-live="polite"`.          |
| Primary Action      | "Enviar solicitud" (deshabilitado cuando `available_slots=0`).                                 |
| Secondary Actions   | "Cancelar".                                                                                    |
| Empty State         | No aplica.                                                                                     |
| Loading State       | Skeleton del badge durante el fetch inicial de `active-count`.                                 |
| Error State         | Banner accesible con código i18n `QR_CATEGORY_LIMIT_REACHED`.                                 |
| Success State       | Badge se actualiza tras envío exitoso (`active_count++`).                                      |
| Accessibility Notes | Badge con `aria-live="polite"`; CTA con `aria-describedby` cuando bloqueado.                  |
| Responsive Notes    | Mobile-first.                                                                                  |
| i18n Notes          | 4 locales.                                                                                     |
| Currency Notes      | No aplica.                                                                                     |

---

## 🛠 Technical Notes

### Frontend

* Route / Page: reuso `app/[locale]/organizer/events/[id]/quotes/new/page.tsx` (US-049).
* Components: nuevo `QRLimitBadge` integrado en `QuoteRequestForm`.
* State Management: TanStack Query con `useQuery(['quote-requests','active-count', eventId, categoryId])`. Invalidate tras mutation exitosa.
* Forms: extensión del form de US-049 con disable del CTA según `available_slots`.
* API Client: `quotesApi.activeCount({ eventId, categoryId })`.

### Backend

* Use Case / Service:
  * Nuevo `GetActiveQrCountUseCase` para el endpoint dedicado.
  * El enforcement en POST sigue en `CreateQuoteRequestUseCase` (US-049).
* Controller / Route:
  * Nuevo handler `GET /api/v1/quote-requests/active-count` en `QuoteRequestController`.
* Authorization Policy: Organizer + ownership del evento.
* Validation: Zod del query string.
* Transaction Required: No (sólo SELECT).

### Database

* Main Tables: `quote_requests` (read).
* Index Considerations:
  * Verificar índice `(event_id, service_category_id, status)` con `WHERE status IN (active states)`.
  * Si falta, considerar `idx_quote_requests_event_category_active_status (event_id, service_category_id) WHERE status IN ('sent','viewed','responded','preferred')`.

### API

| Method | Endpoint                                            | Purpose                                  |
| ------ | --------------------------------------------------- | ---------------------------------------- |
| GET    | `/api/v1/quote-requests/active-count`              | Pre-check del frontend.                  |
| POST   | `/api/v1/quote-requests`                           | Enforcement (US-049 re-valida en POST).  |

### Observability / Audit

* Correlation ID Required: Yes
* Log Event Required: Yes (`quote_request.limit_reached` cuando POST retorna `409 QR_CATEGORY_LIMIT_REACHED`).
* AdminAction Required: No
* AIRecommendation Required: No

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                          | Type        |
| ----- | --------------------------------------------------------------------------------- | ----------- |
| TS-01 | 5 envíos secuenciales OK; 6º bloqueado.                                            | Integration |
| TS-02 | Endpoint count retorna shape correcto.                                            | API         |
| TS-03 | Concurrencia: 2 POST simultáneos con 4 previos → uno 201, otro 409.                | Integration |
| TS-04 | QR vencida no cuenta (conteo lazy con `expires_at`).                              | Integration |
| TS-05 | Badge se actualiza tras envío exitoso.                                            | E2E         |
| TS-06 | CTA deshabilitado cuando `available_slots=0`.                                     | E2E         |

### Negative Tests

| ID    | Scenario                                              | Expected Result                  |
| ----- | ----------------------------------------------------- | -------------------------------- |
| NT-01 | 6ª con todas activas y no vencidas                    | `409 QR_CATEGORY_LIMIT_REACHED`  |
| NT-02 | Evento ajeno en `active-count`                        | `404 EVENT_NOT_FOUND`            |
| NT-03 | Categoría inválida en `active-count`                  | `400 INVALID_CATEGORY`           |
| NT-04 | Sin sesión en `active-count`                           | `401`                            |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario                            | Expected Result          |
| ---------- | ----------------------------------- | ------------------------ |
| AUTH-TS-01 | Organizer dueño, 4 activas, POST    | `201`                    |
| AUTH-TS-02 | Organizer dueño, 5 activas, POST    | `409`                    |
| AUTH-TS-03 | Organizer dueño, `active-count`     | `200`                    |
| AUTH-TS-04 | Organizer ajeno                     | `404 EVENT_NOT_FOUND`    |
| AUTH-TS-05 | Vendor / Admin                      | `403`                    |
| AUTH-TS-06 | Sin sesión                          | `401`                    |

### Accessibility Tests

* `QRLimitBadge` con `aria-live="polite"`.
* CTA deshabilitado con `aria-describedby` que explica el bloqueo.

---

## 📊 Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | Calidad del flujo de cotización.                     |
| Expected Impact     | Evita spam a vendors; transparencia preventiva.      |
| Success Criteria    | Límite enforced server-side y reflejado en UI.       |
| Academic Demo Value | Demuestra regla de negocio #12 con UX preventiva.   |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* `QRLimitBadge` accesible.
* Integración con `QuoteRequestForm` (US-049).
* `quotesApi.activeCount`.
* i18n 4 locales.

### Potential Backend Tasks

* DTO Zod del query.
* `GetActiveQrCountUseCase`.
* Handler GET en `QuoteRequestController`.
* Logger extension `quote_request.limit_reached`.

### Potential Database Tasks

* Verificación del índice + posible nuevo índice parcial.

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* TS exhaustivos + concurrencia + expiración lazy + UI deshabilitado.

### Potential DevOps / Config Tasks

* Not applicable for this story.

---

## ✅ Definition of Ready

* [x] Rol claro.
* [x] Goal/valor claros.
* [x] FRD/UC/BR enlazados (FR-QUOTE-002, UC-QUOTE-001, BR-QUOTE-009, C-016).
* [x] Permisos identificados.
* [x] Entidades listadas.
* [x] AC en GWT.
* [x] Edge cases documentados.
* [x] Validación clara.
* [x] Out of Scope explícito.
* [x] Dependencias conocidas.
* [x] UX states identificados.
* [x] API definida (GET count + POST re-valida).
* [x] Tests definidos.
* [x] PO/BA validó.

---

## 🏁 Definition of Done

* [ ] Endpoint `active-count` funcional con guards y validaciones.
* [ ] `QRLimitBadge` integrado en el form de QR de US-049 con `aria-live`.
* [ ] CTA deshabilitado cuando `available_slots=0`.
* [ ] Backend re-valida en POST (heredado de US-049).
* [ ] Tests concurrencia (`SELECT FOR UPDATE`) verdes.
* [ ] TS expiración lazy verde.
* [ ] Log `quote_request.limit_reached` registrado al bloquear.
* [ ] i18n 4 locales.
* [ ] PO valida demo (envío de 5 + bloqueo en 6º + badge en UI).

---

## 📝 Notes

* Conteo lazy con `expires_at`. Job background de expiración formal es Future.
* Documentation Alignment Required (no bloqueantes) en `management/user-stories/decision-resolutions/US-050-decision-resolution.md`.
