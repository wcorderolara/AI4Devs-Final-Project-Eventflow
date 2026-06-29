# 🧾 User Story: Vendor responde Quote con desglose estructurado

## 🆔 Metadata

| Field              | Value                                                                       |
| ------------------ | --------------------------------------------------------------------------- |
| ID                 | US-052                                                                      |
| Backlog Item       | PB-P1-031 — Vendor visualiza y responde Quote (validez 15 días default)     |
| Epic               | EPIC-QR-001                                                                 |
| Feature            | Respuesta del vendor con `Quote` (total + breakdown + valid_until) atómica  |
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

**As a** proveedor target
**I want** responder una `QuoteRequest` con `total`, breakdown estructurado, condiciones y validez
**So that** el organizador pueda evaluar mi propuesta con desglose verificable y recibir notificación inmediata

---

## 🧠 Business Context

### Context Summary

El vendor envía la `Quote` en un single-shot: crea el registro y lo transiciona a `status='sent'` atómicamente. La currency se hereda del evento (BR-QUOTE-019). El breakdown es `[{label, amount}]` con `1..20` items y `SUM(amount) === total_price ± 0.01`. `valid_until` opcional con default 15 días (BR-QUOTE-015) y techo en `today+90` (PB-P1-031). La transacción incluye INSERT Quote + UPDATE `quote_requests.status='responded'` + 2 Notifications al organizer (`in_app` + `email_simulated`). Sin draft CRUD en MVP.

### PO/BA Decisions Applied

| #  | Decisión                                                                                                                                                                                                                                       |
| -- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1 | `breakdown: [{ label: string [1..150], amount: numeric(14,2) >= 0 }]` con `1..20` items. `Math.abs(SUM(amount) - total_price) <= 0.01` (tolerancia de redondeo).                                                                                |
| D2 | Envío directo single-shot. `POST /api/v1/vendor/quote-requests/:id/respond` crea Quote y transiciona a `status='sent'` atómicamente. Sin draft CRUD en MVP.                                                                                    |
| D3 | `valid_until` en rango `[today+1, today+90]`. Default 15 días si ausente (`created_at::date + INTERVAL '15 days'`).                                                                                                                            |
| D4 | `currency_code` heredado de `events.currency_code`. Cliente no lo envía; si lo envía, se ignora.                                                                                                                                              |
| D5 | 2 Notifications al organizer dentro de la transacción: `in_app` (`delivered`) + `email_simulated` (`simulated`). Paridad US-049 D6.                                                                                                            |
| D6 | Permitido sólo cuando QR `status IN ('sent','viewed')` Y `(expires_at IS NULL OR expires_at > NOW())`. Otros estados ⇒ `409 QR_NOT_RESPONDABLE`. Existe Quote vigente ⇒ `409 QUOTE_ALREADY_EXISTS`. Acceso ajeno ⇒ `404 QR_NOT_FOUND`.       |
| D7 | `total_price > 0` (estricto). `<= 0` ⇒ `400 INVALID_TOTAL`.                                                                                                                                                                                    |

### Related Domain Concepts

* `quotes` (status: `draft → sent → accepted | rejected | expired`).
* `quote_requests.status='responded'` post-INSERT.
* `notifications`.
* C-030 (UNIQUE parcial: una Quote vigente por QR).
* C-031 (default 15 días en service layer).

### Assumptions

* US-053 cubre el job de expiración por `valid_until` (FR-QUOTE-009).
* Vendor compone localmente la UI (sin autosave).

### Dependencies

* US-051 (acceso del vendor a su QR).
* PB-P0-001 (schema `quotes` + UNIQUE parcial + enum `quote_status`).
* `NotificationSenderPort` reutilizado.

---

## 🔗 Traceability

| Source                 | Reference                                                                |
| ---------------------- | ------------------------------------------------------------------------ |
| FRD Requirement(s)     | FR-QUOTE-007, FR-QUOTE-008, FR-QUOTE-017, FR-QUOTE-018, FR-QUOTE-019    |
| Use Case(s)            | UC-QUOTE-004                                                              |
| Business Rule(s)       | BR-QUOTE-011, BR-QUOTE-012, BR-QUOTE-013, BR-QUOTE-014, BR-QUOTE-017, BR-QUOTE-018, BR-QUOTE-019, BR-QUOTE-020 |
| Permission Rule(s)     | Assignment-based (vendor target)                                          |
| Data Entity / Entities | Quote, QuoteRequest, Notification, Event                                  |
| API Endpoint(s)        | POST /api/v1/vendor/quote-requests/:id/respond                            |
| NFR Reference(s)       | NFR-PERF-001, NFR-OBS-005                                                |
| Related ADR(s)         | —                                                                         |
| Related Document(s)    | /docs/4 §BR-QUOTE-011..020, /docs/8 §UC-QUOTE-004, /docs/9 §FR-QUOTE-007/008/017..019, /docs/18 §16.2, C-030, C-031 |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* Multi-quote vigente por QR (BR-QUOTE-013 — bloqueado por UNIQUE parcial).
* Draft CRUD ("Guardar borrador" + PATCH + envío) — Future.
* Autosave de borrador.
* `quantity`, `unit`, `tax` en breakdown — Future.
* Edición tras envío (FR-QUOTE-019 — Quote inmutable post-`sent`).
* Email real con SMTP.

### Scope Notes

* Una Quote vigente por QR (`status NOT IN ('expired','rejected')` — C-030).
* Validez con techo 90 días.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Envío exitoso con default 15 días

**Given** un vendor target autenticado, QR `status='sent'` o `'viewed'`, sin Quote vigente previa, `expires_at` futuro
**When** envía `POST /api/v1/vendor/quote-requests/:id/respond` con body válido sin `valid_until`
**Then** el backend, en `prisma.$transaction`:
- valida ownership + breakdown + total + valid_until (default `today+15d`),
- infiere `currency_code` del evento,
- INSERT `quotes(status='sent', quote_request_id, vendor_profile_id, total_price, currency_code, breakdown, conditions?, valid_until, ai_generated_brief=?)`,
- UPDATE `quote_requests.status='responded'` con guard `WHERE status IN ('sent','viewed')` (TOCTOU-safe),
- INSERT 2 rows en `notifications` (in_app + email_simulated) al organizer,
- emite log `quote.sent`,
- responde `201 Created` con la Quote completa.

### AC-02: `valid_until` explícito dentro del rango

**Given** body con `valid_until` ∈ `[today+1, today+90]`
**When** se persiste
**Then** se usa el valor del body; sin override del default.

### AC-03: Currency heredada

**Given** body con o sin `currency_code`
**When** se persiste
**Then** el `currency_code` final = `events.currency_code` (siempre).

### AC-04: Breakdown suma == total

**Given** breakdown `[{label, amount}, ...]`
**When** se valida
**Then** `Math.abs(SUM(amount) - total_price) <= 0.01`. Caso contrario ⇒ `400 INVALID_BREAKDOWN_SUM`.

---

## ⚠️ Edge Cases

### EC-01: QR no respondable

**Given** QR `status ∈ {responded, preferred, cancelled, expired, rejected}` o vencida lazy
**When** se envía
**Then** `409 QR_NOT_RESPONDABLE` con `details: { current_status, expires_at }`.

### EC-02: Quote vigente ya existe

**Given** existe Quote vigente (`status NOT IN ('expired','rejected')`) para la misma QR
**When** se envía
**Then** `409 QUOTE_ALREADY_EXISTS` con `details.existing_quote_id`.

### EC-03: Total inválido

**Given** body con `total_price <= 0`
**When** se valida
**Then** `400 INVALID_TOTAL`.

### EC-04: Breakdown vacío o > 20 items

**Given** breakdown fuera de `[1..20]`
**When** se valida
**Then** `400 INVALID_BREAKDOWN`.

### EC-05: Label o amount inválidos

**Given** `label` fuera de `[1..150]` o `amount < 0`
**When** se valida
**Then** `400 INVALID_BREAKDOWN_ITEM`.

### EC-06: `valid_until` fuera de rango

**Given** `valid_until < today+1` o `> today+90`
**When** se valida
**Then** `400 INVALID_VALID_UNTIL`.

### EC-07: QR ajena/inexistente o vendor no válido

**Given** QR de otro vendor, UUID inexistente, vendor `status='hidden'` o soft-deleted
**When** se envía
**Then** `404 QR_NOT_FOUND` (uniforme).

---

## 🚫 Validation Rules

| ID    | Rule                                                                                        | Message / Behavior                              |
| ----- | ------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| VR-01 | `total_price > 0`                                                                            | `400 INVALID_TOTAL`                             |
| VR-02 | `Math.abs(SUM(breakdown.amount) - total_price) <= 0.01`                                       | `400 INVALID_BREAKDOWN_SUM`                     |
| VR-03 | `breakdown.length ∈ [1..20]`                                                                  | `400 INVALID_BREAKDOWN`                         |
| VR-04 | Cada `label ∈ [1..150]`; cada `amount >= 0`                                                  | `400 INVALID_BREAKDOWN_ITEM`                    |
| VR-05 | `valid_until ∈ [today+1, today+90]` (si presente)                                              | `400 INVALID_VALID_UNTIL`                       |
| VR-06 | QR `status IN ('sent','viewed')` Y no vencida                                                  | `409 QR_NOT_RESPONDABLE`                        |
| VR-07 | No existe Quote vigente para la QR                                                            | `409 QUOTE_ALREADY_EXISTS`                      |
| VR-08 | Vendor target + vendor profile válido                                                          | `404 QR_NOT_FOUND` (uniforme)                   |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                          |
| ------ | --------------------------------------------------------------------------------------------- |
| SEC-01 | Sesión `vendor`.                                                                              |
| SEC-02 | Assignment-based: `quote_requests.vendor_profile_id = currentUser.vendor_profile.id`.        |
| SEC-03 | Una Quote vigente por QR (BR-QUOTE-013, enforced por UNIQUE parcial + service layer).        |
| SEC-04 | `404 QR_NOT_FOUND` uniforme para no revelar existencia.                                       |
| SEC-05 | Quote inmutable post-`sent` (FR-QUOTE-019 — fuera del scope de US-052 pero respetado).        |

### Negative Authorization Scenarios

* Sin sesión → `401`.
* Organizer/Admin → `403`.
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
| Screen / Route      | `/[locale]/vendor/quote-requests/:id/respond`                                                  |
| Main UI Pattern     | Form con `total_price` + `BreakdownEditor` (dinámico, `1..20` items) + `conditions` (textarea) + `valid_until` (date picker con default+15d). Indicador de currency heredada del evento (read-only). |
| Primary Action      | "Enviar cotización".                                                                            |
| Secondary Actions   | "Cancelar" (descarta cambios). Sin "Guardar borrador" en MVP.                                  |
| Empty State         | No aplica.                                                                                     |
| Loading State       | Spinner en CTA durante submit.                                                                 |
| Error State         | Banner accesible con código i18n (`INVALID_TOTAL`, `INVALID_BREAKDOWN_SUM`, `INVALID_BREAKDOWN`, `INVALID_BREAKDOWN_ITEM`, `INVALID_VALID_UNTIL`, `QR_NOT_RESPONDABLE`, `QUOTE_ALREADY_EXISTS`). |
| Success State       | Toast + redirect a detalle de la QR (US-051) que ahora muestra Quote `sent`.                  |
| Accessibility Notes | Labels semánticos; mensaje de error suma con `aria-describedby` al campo total.               |
| Responsive Notes    | Mobile-first.                                                                                  |
| i18n Notes          | 4 locales.                                                                                     |
| Currency Notes      | Heredada del evento; mostrada junto al total y a cada amount del breakdown.                   |

---

## 🛠 Technical Notes

### Frontend

* Route / Page: `app/[locale]/vendor/quote-requests/[id]/respond/page.tsx`.
* Components: `QuoteResponseForm`, `BreakdownEditor` (dinámico), `EventSummaryCard`.
* State Management: TanStack mutation + invalidación del detalle de QR.
* Forms: RHF + Zod espejo del backend + cálculo cliente de suma con tolerancia.
* API Client: `vendorApi.qr.respond(id, payload)`.

### Backend

* Use Case / Service: `RespondQuoteRequestUseCase`.
* Controller / Route: `POST /api/v1/vendor/quote-requests/:id/respond` con guards Vendor + exclusion.
* Authorization Policy: Assignment-based (verificación dentro del use case).
* Validation: Zod estricto + service layer (suma, currency override).
* Transaction Required: **Sí** (`prisma.$transaction` con SELECT FOR UPDATE).

### Database

* Main Tables: `quotes` (write), `quote_requests` (update), `notifications` (write), `events` (read), `vendor_profiles` (read).
* Constraints: `CHECK(total_price >= 0)`, `uq_quotes_request_active`.
* Index Considerations: Reuso de existentes (`idx_quotes_quote_request_id`).

### API

| Method | Endpoint                                                | Purpose             |
| ------ | ------------------------------------------------------- | ------------------- |
| POST   | `/api/v1/vendor/quote-requests/:id/respond`             | Crear Quote + transicionar QR a responded. |

#### Request Body

```json
{
  "total_price": "5000.00",
  "breakdown": [
    { "label": "Servicio principal", "amount": "4000.00" },
    { "label": "Materiales", "amount": "1000.00" }
  ],
  "conditions": "Forma de pago: 50% anticipo, 50% al evento.",
  "valid_until": "2026-07-12"
}
```

#### Response 201

```json
{
  "id": "<uuid>",
  "quote_request_id": "<uuid>",
  "vendor_profile_id": "<uuid>",
  "status": "sent",
  "total_price": "5000.00",
  "currency_code": "GTQ",
  "breakdown": [...],
  "conditions": "...",
  "valid_until": "2026-07-12",
  "created_at": "2026-..."
}
```

### Observability / Audit

* Correlation ID Required: Yes
* Log Event Required: Yes (`quote.sent`).
* AdminAction Required: No
* AIRecommendation Required: No

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                          | Type        |
| ----- | --------------------------------------------------------------------------------- | ----------- |
| TS-01 | Respuesta válida con default 15 días.                                              | Integration |
| TS-02 | Respuesta válida con `valid_until` custom dentro del rango.                       | Integration |
| TS-03 | 2 Notifications creadas (in_app + email_simulated).                                | Integration |
| TS-04 | QR transiciona a `responded`.                                                      | Integration |
| TS-05 | Currency heredada del evento, body ignora `currency_code`.                        | Integration |
| TS-06 | Breakdown con tolerancia ±0.01 aceptado.                                            | Integration |

### Negative Tests

| ID    | Scenario                                              | Expected Result                  |
| ----- | ----------------------------------------------------- | -------------------------------- |
| NT-01 | QR `responded` ya                                       | `409 QR_NOT_RESPONDABLE`         |
| NT-02 | QR `cancelled`/`expired`/`rejected`                    | `409 QR_NOT_RESPONDABLE`         |
| NT-03 | Quote vigente ya existe                                 | `409 QUOTE_ALREADY_EXISTS`       |
| NT-04 | Total `<= 0`                                            | `400 INVALID_TOTAL`              |
| NT-05 | Breakdown suma != total                                 | `400 INVALID_BREAKDOWN_SUM`      |
| NT-06 | Breakdown vacío o > 20                                  | `400 INVALID_BREAKDOWN`          |
| NT-07 | Label > 150 chars o amount negativo                     | `400 INVALID_BREAKDOWN_ITEM`     |
| NT-08 | `valid_until` fuera de rango                            | `400 INVALID_VALID_UNTIL`        |
| NT-09 | Otro vendor                                             | `404 QR_NOT_FOUND`                |
| NT-10 | QR inexistente                                          | `404 QR_NOT_FOUND`                |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario                            | Expected Result          |
| ---------- | ----------------------------------- | ------------------------ |
| AUTH-TS-01 | Vendor target                       | `201`                    |
| AUTH-TS-02 | Otro vendor                         | `404 QR_NOT_FOUND`       |
| AUTH-TS-03 | Organizer                           | `403`                    |
| AUTH-TS-04 | Admin                                | `403`                    |
| AUTH-TS-05 | Sin sesión                          | `401`                    |

### Accessibility Tests

* Labels semánticos en form.
* `aria-describedby` para mensajes de error.
* `BreakdownEditor` keyboard-accessible.

---

## 📊 Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | Tasa de respuesta del vendor.                        |
| Expected Impact     | Habilita el comparador de cotizaciones.              |
| Success Criteria    | ≥ 60% de QRs reciben respuesta + 2 Notifications entregadas. |
| Academic Demo Value | Flujo bilateral completo + atomicidad transaccional. |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Page + Form + BreakdownEditor + i18n.

### Potential Backend Tasks

* DTO Zod estricto + cálculo suma.
* UseCase con `prisma.$transaction`.
* Repository extension.
* Controller + ruta.
* Logger extension.

### Potential Database Tasks

* Verificación schema + UNIQUE parcial.

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* TS funcional, atomicidad, suma, currency, notif.

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
* [ ] Transacción atómica (Quote + QR update + 2 Notifications).
* [ ] Default 15 días aplicado en service layer.
* [ ] Currency heredada del evento.
* [ ] Tests verdes (functional, negative, auth, accessibility).
* [ ] Log `quote.sent` registrado.
* [ ] i18n 4 locales.
* [ ] PO valida demo (vendor envía + organizer recibe in-app).

---

## 📝 Notes

* US-053 entrega la expiración automática por `valid_until` y la notificación al vendor.
* Documentation Alignment Required (no bloqueantes) en `management/user-stories/decision-resolutions/US-052-decision-resolution.md`.
