# 🧾 User Story: Vendor ve la solicitud y la marca como viewed

## 🆔 Metadata

| Field              | Value                                                                       |
| ------------------ | --------------------------------------------------------------------------- |
| ID                 | US-051                                                                      |
| Backlog Item       | PB-P1-031 — Vendor visualiza y responde Quote (validez 15 días default)     |
| Epic               | EPIC-QR-001                                                                 |
| Feature            | GET detalle + POST mark-viewed con transición `sent → viewed` automática     |
| Module / Domain    | Quotes                                                                      |
| User Role          | Vendor                                                                      |
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

**As a** proveedor autenticado
**I want** que mis QuoteRequests pasen automáticamente a `viewed` la primera vez que abro su detalle, con notificación inmediata al organizador
**So that** mantenga visibilidad bilateral del engagement sin acciones manuales adicionales

---

## 🧠 Business Context

### Context Summary

Para cumplir la semántica REST, US-051 separa la lectura de la transición de estado:
- `GET /api/v1/vendor/quote-requests/:id` retorna el detalle (safe + idempotent).
- `POST /api/v1/vendor/quote-requests/:id/mark-viewed` transiciona `sent → viewed` con efectos atómicos.

El frontend orquesta: al montar la página, llama al GET; si `status='sent'`, emite el POST en background. La primera transición persiste `viewed_at` y `viewed_by`, e inserta una `Notification` in-app al organizador dentro de la misma transacción. Estados distintos a `sent` retornan no-op (`200`) sin cambios. Acceso ajeno o inexistente ⇒ `404 QR_NOT_FOUND` uniforme.

### PO/BA Decisions Applied

| #  | Decisión                                                                                                                                                                                                                                       |
| -- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1 | Separación REST: `GET /api/v1/vendor/quote-requests/:id` (sin side-effect) + `POST /api/v1/vendor/quote-requests/:id/mark-viewed` (idempotente). Frontend orquesta GET + POST.                                                                  |
| D2 | Transición SÓLO desde `status='sent'`. Otros estados ⇒ no-op idempotente `200 OK` con la QR actual.                                                                                                                                            |
| D3 | Persistir `quote_requests.viewed_at=NOW()` Y `quote_requests.viewed_by=currentUser.id` en la primera transición.                                                                                                                                |
| D4 | `404 QR_NOT_FOUND` uniforme para QR inexistente, ajena, vendor profile en `status='hidden'` o soft-deleted.                                                                                                                                    |
| D5 | Al transicionar exitosamente, INSERT `notifications(channel='in_app', recipient=organizer_user_id, event='quote_request.viewed', delivery_status='delivered')` dentro de la misma `prisma.$transaction`.                                       |
| D6 | Listado de QRs del vendor fuera de scope (US futura). US-051 cubre detalle por ID + transición mark-viewed.                                                                                                                                   |

### Related Domain Concepts

* `quote_requests` (`status`, `viewed_at`, `viewed_by`, `sent_at`, `expires_at`).
* Estados: `sent → viewed → responded | preferred | expired | cancelled | rejected` (BR-QUOTE-005).
* `notifications` (`channel='in_app'`, `event='quote_request.viewed'`).

### Assumptions

* Frontend orquesta dos llamadas (GET + POST mark-viewed) al montar la página.
* La transición es idempotente: re-emitir POST no causa side-effects adicionales.

### Dependencies

* US-049 (creación de QR con `status='sent'`).
* PB-P0-001 (schema con columnas `viewed_at`, `viewed_by`).
* `NotificationSenderPort` reutilizado de US-049.

---

## 🔗 Traceability

| Source                 | Reference                                                                |
| ---------------------- | ------------------------------------------------------------------------ |
| FRD Requirement(s)     | FR-QUOTE-006, FR-QUOTE-014, FR-AUTH-010                                  |
| Use Case(s)            | UC-QUOTE-003                                                              |
| Business Rule(s)       | BR-QUOTE-005, BR-QUOTE-006, BR-AUTH-009                                  |
| Permission Rule(s)     | Assignment-based: vendor target sólo                                     |
| Data Entity / Entities | QuoteRequest, Notification, VendorProfile                                |
| API Endpoint(s)        | GET /api/v1/vendor/quote-requests/:id, POST /api/v1/vendor/quote-requests/:id/mark-viewed |
| NFR Reference(s)       | NFR-PERF-001, NFR-OBS-005                                                |
| Related ADR(s)         | —                                                                         |
| Related Document(s)    | /docs/4 §BR-QUOTE-005/006, /docs/8 §UC-QUOTE-003, /docs/9 §FR-QUOTE-006/014, /docs/14 §NotificationSenderPort |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* Read receipts complejos (timestamps por sección, scroll tracking).
* Listado `GET /api/v1/vendor/quote-requests` (US futura).
* Email simulado para "quote_request.viewed" (Future).
* Notificación push al organizer.
* Marcar como no-vista (revertir).

### Scope Notes

* Sólo transición simple `sent → viewed`.
* Idempotente y assignment-based.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Primera transición exitosa

**Given** un vendor target autenticado, con QR `status='sent'`, `expires_at` futuro
**When** envía `POST /api/v1/vendor/quote-requests/:id/mark-viewed`
**Then** el backend, en `prisma.$transaction`:
- UPDATE `quote_requests` SET `status='viewed'`, `viewed_at=NOW()`, `viewed_by=currentUser.id` WHERE `status='sent'` (guard TOCTOU),
- INSERT `notifications(channel='in_app', recipient_user_id=event.organizer_user_id, event='quote_request.viewed', delivery_status='delivered')`,
- emite log `quote_request.viewed`,
- responde `200 OK` con la QR actualizada `{ status: 'viewed', viewed_at, viewed_by, ... }`.

### AC-02: GET sin side-effect

**Given** vendor target con QR `status='sent'`
**When** envía `GET /api/v1/vendor/quote-requests/:id`
**Then** responde `200 OK` con el detalle de la QR; `status` permanece `sent`, sin Notification creada, sin log de transición.

### AC-03: Segundo POST mark-viewed idempotente

**Given** QR ya en `status='viewed'`
**When** vendor re-emite POST mark-viewed
**Then** responde `200 OK` con la QR sin cambios; `viewed_at` y `viewed_by` se mantienen; NO se crea otra Notification; NO se emite log adicional.

### AC-04: Estado distinto a `sent` no transiciona

**Given** QR en `status ∈ {responded, preferred, cancelled, expired, rejected}` o vencida lazy
**When** vendor emite POST mark-viewed
**Then** responde `200 OK` con la QR actual; sin cambios; sin Notification; sin log.

---

## ⚠️ Edge Cases

### EC-01: QR vencida (lazy)

**Given** QR `status='sent'` pero `expires_at < NOW()`
**When** POST mark-viewed
**Then** no transiciona (filtro lazy heredado de US-050 D4); responde `200 OK` con la QR actual.

### EC-02: QR ajena

**Given** QR cuyo `vendor_profile_id != currentUser.vendor_profile.id`
**When** GET o POST mark-viewed
**Then** `404 QR_NOT_FOUND`.

### EC-03: Vendor profile no válido

**Given** vendor con `vendor_profile.status='hidden'` o `deleted_at IS NOT NULL`
**When** GET o POST mark-viewed
**Then** `404 QR_NOT_FOUND` (uniforme).

### EC-04: QR inexistente

**Given** UUID inexistente
**When** GET o POST mark-viewed
**Then** `404 QR_NOT_FOUND`.

### EC-05: UUID malformado

**Given** `:id` no UUID
**When** se valida
**Then** `400 INVALID_UUID`.

---

## 🚫 Validation Rules

| ID    | Rule                                                                                   | Message / Behavior                              |
| ----- | -------------------------------------------------------------------------------------- | ----------------------------------------------- |
| VR-01 | `:id` es UUID válido                                                                    | `400 INVALID_UUID`                              |
| VR-02 | QR existe Y `vendor_profile_id = currentUser.vendor_profile.id`                          | `404 QR_NOT_FOUND` (uniforme)                   |
| VR-03 | `vendor_profile.status != 'hidden'` Y `vendor_profile.deleted_at IS NULL`                | `404 QR_NOT_FOUND` (uniforme)                   |
| VR-04 | Transición sólo desde `status='sent'`                                                    | No-op idempotente `200`                          |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                          |
| ------ | --------------------------------------------------------------------------------------------- |
| SEC-01 | Sesión `vendor` requerida.                                                                    |
| SEC-02 | Assignment-based: vendor sólo accede a sus QRs (`quote_requests.vendor_profile_id`).         |
| SEC-03 | `404 QR_NOT_FOUND` uniforme para no revelar existencia ni ownership (D4).                     |
| SEC-04 | GET es safe + idempotent (sin side-effects).                                                  |

### Negative Authorization Scenarios

* Sin sesión → `401`.
* `organizer` / `admin` → `403`.
* Vendor ajeno → `404 QR_NOT_FOUND`.

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
| Screen / Route      | `/[locale]/vendor/quote-requests/:id`                                                          |
| Main UI Pattern     | Detalle de QR (read-only en MVP).                                                              |
| Primary Action      | "Responder" (deep-link a US-052/US-053 — fuera de scope US-051).                              |
| Secondary Actions   | Volver al listado.                                                                              |
| Empty State         | No aplica.                                                                                     |
| Loading State       | Skeleton del detalle.                                                                          |
| Error State         | 404 page accesible cuando `QR_NOT_FOUND`.                                                      |
| Success State       | Detalle visible + banner `aria-live` que confirma "Marcada como vista el día X" cuando aplica. |
| Accessibility Notes | `aria-live="polite"` en el badge de status; encabezados semánticos.                            |
| Responsive Notes    | Mobile-first.                                                                                  |
| i18n Notes          | 4 locales.                                                                                     |
| Currency Notes      | Moneda del evento (heredada de la QR).                                                         |

---

## 🛠 Technical Notes

### Frontend

* Route / Page: `app/[locale]/vendor/quote-requests/[id]/page.tsx`.
* Components: `QuoteRequestDetail`, `EventBriefSnapshot`, `StatusBadge`, `RependingNotice` opcional.
* State Management: TanStack Query (GET) + mutation (POST mark-viewed) + invalidación.
* Forms: No aplica.
* API Client: `vendorApi.qr.detail(id)` + `vendorApi.qr.markViewed(id)`.
* Orchestration: `useEffect` al montar la página llama `markViewed` si `data.status === 'sent'`.

### Backend

* Use Case / Service:
  * `GetVendorQrDetailUseCase` (read-only).
  * `MarkVendorQrViewedUseCase` (write con transacción).
* Controller / Route:
  * `GET /api/v1/vendor/quote-requests/:id`.
  * `POST /api/v1/vendor/quote-requests/:id/mark-viewed`.
* Authorization Policy: Assignment-based.
* Validation: Zod del path param (UUID).
* Transaction Required: Sí (sólo POST mark-viewed).

### Database

* Main Tables: `quote_requests`, `notifications`, `vendor_profiles`, `events`.
* Constraints: UPDATE con guard `WHERE status='sent'` (TOCTOU-safe).
* Index Considerations: Reuso de `idx_quote_requests_vendor_status` y PK por `id`.
* Columnas: confirmar `viewed_at` y `viewed_by` (DB-001).

### API

| Method | Endpoint                                              | Purpose                              |
| ------ | ----------------------------------------------------- | ------------------------------------ |
| GET    | `/api/v1/vendor/quote-requests/:id`                   | Detalle (sin side-effect).           |
| POST   | `/api/v1/vendor/quote-requests/:id/mark-viewed`       | Transición `sent → viewed` idempotente. |

### Observability / Audit

* Correlation ID Required: Yes
* Log Event Required: Yes (`quote_request.viewed`).
* AdminAction Required: No
* AIRecommendation Required: No

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                          | Type        |
| ----- | --------------------------------------------------------------------------------- | ----------- |
| TS-01 | Primer POST mark-viewed transiciona y crea Notification.                          | Integration |
| TS-02 | Segundo POST mark-viewed es no-op (no Notification adicional).                    | Integration |
| TS-03 | GET no transiciona.                                                                | Integration |
| TS-04 | QR en `responded`/`cancelled`/`expired` no transiciona.                            | Integration |
| TS-05 | QR vencida lazy no transiciona.                                                    | Integration |

### Negative Tests

| ID    | Scenario                                              | Expected Result          |
| ----- | ----------------------------------------------------- | ------------------------ |
| NT-01 | Otro vendor                                            | `404 QR_NOT_FOUND`       |
| NT-02 | QR inexistente                                         | `404 QR_NOT_FOUND`       |
| NT-03 | Vendor `hidden`                                        | `404 QR_NOT_FOUND`       |
| NT-04 | Vendor soft-deleted                                    | `404 QR_NOT_FOUND`       |
| NT-05 | UUID malformado                                        | `400 INVALID_UUID`       |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario                            | Expected Result          |
| ---------- | ----------------------------------- | ------------------------ |
| AUTH-TS-01 | Vendor target                       | `200`                    |
| AUTH-TS-02 | Otro vendor                         | `404 QR_NOT_FOUND`       |
| AUTH-TS-03 | Organizer                           | `403`                    |
| AUTH-TS-04 | Admin                                | `403`                    |
| AUTH-TS-05 | Sin sesión                          | `401`                    |

### Accessibility Tests

* `aria-live` anuncia "Marcada como vista el día X".
* Encabezados semánticos.
* 404 page accesible.

---

## 📊 Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | Engagement vendor + visibilidad bilateral.            |
| Expected Impact     | Aumenta confianza del organizer (feedback de lectura). |
| Success Criteria    | Transición idempotente correcta + Notification entregada al organizer. |
| Academic Demo Value | Bilateralidad clara + REST design correcto.          |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Page detalle + orquestación GET + POST.
* `vendorApi.qr.detail/markViewed` + MSW.
* i18n 4 locales.

### Potential Backend Tasks

* 2 use cases (GET detail + POST mark-viewed).
* DTOs Zod.
* Repository extensions.
* Controller + 2 rutas.
* Logger extension.
* NotificationSenderPort reuso.

### Potential Database Tasks

* Verificar columnas `viewed_at`, `viewed_by`.

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* UT, IT (idempotencia + transición), AUTH, A11Y.

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
* [x] API definida (GET + POST).
* [x] Tests definidos.
* [x] PO/BA validó.

---

## 🏁 Definition of Done

* [ ] GET y POST funcionales con guards assignment-based.
* [ ] Transacción atómica POST mark-viewed (QR update + Notification).
* [ ] Idempotencia verificada.
* [ ] Log `quote_request.viewed` registrado con `correlation_id`.
* [ ] `404 QR_NOT_FOUND` uniforme.
* [ ] i18n 4 locales.
* [ ] PO valida demo (vendor abre QR → organizer recibe in-app).

---

## 📝 Notes

* Listado del vendor + filtros viven en US futura.
* Documentation Alignment Required (no bloqueantes) en `management/user-stories/decision-resolutions/US-051-decision-resolution.md`.
