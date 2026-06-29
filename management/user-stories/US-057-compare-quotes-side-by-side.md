# 🧾 User Story: Comparar Quotes lado a lado (por categoría)

## 🆔 Metadata

| Field              | Value                                                                       |
| ------------------ | --------------------------------------------------------------------------- |
| ID                 | US-057                                                                      |
| Backlog Item       | PB-P1-035 — Comparador lado a lado + marca preferred                        |
| Epic               | EPIC-CMP-001 — Quote Comparison & Booking                                   |
| Feature            | Endpoint comparativo `GET /events/:id/quotes/compare` por categoría         |
| Module / Domain    | Booking / Quotes                                                            |
| User Role          | Organizer                                                                   |
| Priority           | Must Have                                                                   |
| Status             | Approved                                                                    |
| Owner              | Product Owner / Business Analyst                                            |
| Sprint / Milestone | MVP                                                                         |
| Created Date       | 2026-06-09                                                                  |
| Last Updated       | 2026-06-28                                                                  |
| Approved By        | PO/BA Review                                                                |
| Approval Date      | 2026-06-28                                                                  |
| Ready for Development Tasks | Yes                                                                 |

---

## 🎯 User Story

**As an** organizador autenticado con Quotes recibidas para su evento
**I want** comparar Quotes por categoría lado a lado en una vista única con datos del vendor y desglose
**So that** decida cuál marcar como preferred sin saturarme con vistas individuales

---

## 🧠 Business Context

### Context Summary

US-057 entrega el endpoint y la UX del comparador (`BR-QUOTE-021` / `FR-QUOTE-011` / `UC-QUOTE-006`). El endpoint `GET /api/v1/events/:id/quotes/compare?categoryCode=<slug>` retorna todas las Quotes activas/históricas para la categoría con datos del vendor + desglose + estado. El frontend muestra una vista tabular responsive (columnas en desktop, cards en mobile). La acción "Marcar preferred" vive en US-058 (PB-P1-035 posición 2). El resumen IA es deep-link a US-022 (FR-AI-006 Should Have).

Currency heredada del evento (BR-QUOTE-019). Sin conversión FX en MVP (BR-BUDGET-007).

### PO/BA Decisions Applied

| #  | Decisión                                                                                                                                                                                                                                       |
| -- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1 | `categoryCode` query param REQUERIDO. Ausente ⇒ `400 INVALID_FILTERS`.                                                                                                                                                                       |
| D2 | Backend retorna todas las Quotes con `status IN ('sent','responded','preferred','accepted','expired','rejected')`. Excluye `draft`. Frontend muestra `expired/rejected` con indicador visual y NO permite seleccionarlas para preferred.    |
| D3 | Empty states: 0 Quotes ⇒ `{ items: [] }` + mensaje i18n "Aún no has recibido cotizaciones en esta categoría". 1 Quote ⇒ vista de detalle única con CTA "Marcar preferred" (deep-link US-058). ≥2 Quotes ⇒ vista comparativa estándar.        |
| D4 | "Resumir con IA" es deep-link a US-022 (CTA visible sólo con ≥2 Quotes). US-057 NO genera resumen.                                                                                                                                            |
| D5 | Response shape: `{ category, currency_code, items[] }` con `items` = `{ quote_id, vendor: {profile_id, business_name, slug, rating_avg, reviews_count}, status, total_price, breakdown, valid_until, conditions, is_preferred, created_at }`. Ordenado por `is_preferred DESC, status (activos primero), total_price ASC`. |

### Related Domain Concepts

* `quotes` (status, total_price, breakdown, valid_until, is_preferred).
* `vendor_profiles` (business_name, slug, rating_avg, reviews_count).
* `service_categories` (code).
* `events.currency_code` (heredada, inmutable).

### Assumptions

* Quotes existen (US-052/053 entregaron creación y expiración).
* US-058 entrega el toggle `is_preferred`.
* US-022 entrega el resumen IA.

### Dependencies

* US-052 (Quote creation).
* US-053 (Quote expiration).
* US-058 (mark preferred — secundario US del backlog item).
* PB-P0-001 (schema + índices).

---

## 🔗 Traceability

| Source                 | Reference                                                                |
| ---------------------- | ------------------------------------------------------------------------ |
| FRD Requirement(s)     | FR-QUOTE-011, FR-AI-006 (referencia opcional)                            |
| Use Case(s)            | UC-QUOTE-006                                                              |
| Business Rule(s)       | BR-QUOTE-021, BR-QUOTE-019, BR-BUDGET-007                                |
| Permission Rule(s)     | Organizer dueño del evento                                                |
| Data Entity / Entities | Quote, VendorProfile, ServiceCategory, Event                              |
| API Endpoint(s)        | GET /api/v1/events/:id/quotes/compare?categoryCode=<slug>                 |
| NFR Reference(s)       | NFR-PERF-001, NFR-OBS-005                                                |
| Related ADR(s)         | —                                                                         |
| Related Document(s)    | /docs/4 §BR-QUOTE-021, /docs/8 §UC-QUOTE-006, /docs/9 §FR-QUOTE-011/FR-AI-006 |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* Conversión FX automática (BR-BUDGET-007).
* Generación del resumen IA (vive en US-022).
* Marcar preferred (vive en US-058).
* Filtros adicionales (vendor, rating, precio range) en MVP.
* Sort override del cliente.

### Scope Notes

* Sólo moneda del evento.
* `categoryCode` requerido.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Vista comparativa con ≥2 Quotes

**Given** organizador dueño del evento con ≥2 Quotes para `categoryCode='catering'`
**When** envía `GET /api/v1/events/:id/quotes/compare?categoryCode=catering`
**Then** responde `200 OK` con `{ category: {code, name}, currency_code, items: [...] }`. Items incluyen datos del vendor + breakdown + status + indicadores `is_preferred`/`expired`. Orden: `is_preferred DESC, status (activos), total_price ASC`.

### AC-02: 1 Quote = vista detalle

**Given** sólo 1 Quote en la categoría
**When** se consulta
**Then** response `{ items: [singleQuote] }`. Frontend muestra vista de detalle con CTA "Marcar preferred" (deep-link a US-058).

### AC-03: Empty state

**Given** 0 Quotes en la categoría
**When** se consulta
**Then** response `{ items: [] }`. Frontend muestra mensaje i18n + CTA "Volver al evento".

### AC-04: Resumir IA deep-link

**Given** vista con ≥2 Quotes
**When** organizador hace clic en "Resumir con IA"
**Then** navega a la vista de US-022 (`/organizer/events/:id/quotes/compare/ai-summary?categoryCode=catering`). US-057 NO genera el resumen.

---

## ⚠️ Edge Cases

### EC-01: `categoryCode` ausente

**Given** request sin `categoryCode`
**When** backend valida
**Then** `400 INVALID_FILTERS` con `details: ['category_required']`.

### EC-02: `categoryCode` inválido o inactivo

**Given** slug inexistente o categoría con `is_active=false`
**When** backend valida
**Then** `400 INVALID_CATEGORY`.

### EC-03: Evento ajeno o inexistente

**Given** evento de otro organizer o UUID inexistente
**When** se consulta
**Then** `404 EVENT_NOT_FOUND` uniforme.

### EC-04: Quotes con `expired`/`rejected`

**Given** algunas Quotes ya `expired`/`rejected`
**When** se consulta
**Then** aparecen en `items` con `status` correspondiente; el frontend las marca claramente y NO permite seleccionarlas para preferred.

---

## 🚫 Validation Rules

| ID    | Rule                                                                       | Message / Behavior                              |
| ----- | -------------------------------------------------------------------------- | ----------------------------------------------- |
| VR-01 | Organizer dueño del evento                                                  | `404 EVENT_NOT_FOUND` (uniforme)                |
| VR-02 | `categoryCode` requerido                                                    | `400 INVALID_FILTERS`                           |
| VR-03 | `categoryCode` existe y `is_active=true`                                    | `400 INVALID_CATEGORY`                          |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                          |
| ------ | --------------------------------------------------------------------------------------------- |
| SEC-01 | Sesión `organizer`.                                                                           |
| SEC-02 | Ownership del evento.                                                                          |
| SEC-03 | `404 EVENT_NOT_FOUND` uniforme.                                                                |
| SEC-04 | Sólo lectura (sin side-effect).                                                                |

### Negative Authorization Scenarios

* Sin sesión → `401`.
* `vendor`/`admin` → `403`.
* Organizer ajeno → `404 EVENT_NOT_FOUND`.

---

## 🤖 AI Behavior

This story does not invoke AI directly (consume US-022 via deep-link).

### AI Involvement

* AI Feature: None (consume US-022)
* Provider Layer: Not applicable
* Human Validation Required: Not applicable
* Persist AIRecommendation: No
* Fallback Required: Not applicable

### AI Input

* Not applicable for this story.

### AI Output

* Not applicable for this story.

### Human-in-the-loop Rules

* US-022 maneja HITL para resumen IA.

### AI Error / Fallback Behavior

* Not applicable for this story.

---

## 🎨 UX / UI Notes

| Area                | Notes                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| Screen / Route      | `/[locale]/organizer/events/:id/quotes/compare?categoryCode=...`                               |
| Main UI Pattern     | Desktop: tabla con columnas por Quote. Mobile: cards apiladas.                                  |
| Primary Action      | "Marcar preferred" (deep-link US-058) por Quote activa.                                        |
| Secondary Actions   | "Resumir con IA" (deep-link US-022) cuando ≥2 Quotes.                                          |
| Empty State         | "Aún no has recibido cotizaciones en esta categoría" + CTA "Volver al evento".                |
| Loading State       | Skeleton de tabla.                                                                              |
| Error State         | Banner i18n.                                                                                    |
| Success State       | Tabla/cards renderizadas.                                                                       |
| Accessibility Notes | Tabla con `<th scope="col">`; cards con `aria-labelledby`. Indicadores `expired`/`rejected` con `aria-label`. |
| Responsive Notes    | Mobile: cards. Desktop: tabla.                                                                  |
| i18n Notes          | 4 locales (`organizer.quote.compare.*`).                                                       |
| Currency Notes      | Cada precio muestra `currency_code` (del evento).                                              |

---

## 🛠 Technical Notes

### Frontend

* Route / Page: `app/[locale]/organizer/events/[id]/quotes/compare/page.tsx`.
* Components: `QuoteComparator` (orquestador), `QuoteComparisonTable` (desktop), `QuoteComparisonCards` (mobile).
* State Management: TanStack Query.
* Forms: N/A.
* API Client: `quotesApi.compare({ eventId, categoryCode })`.

### Backend

* Use Case / Service: `CompareQuotesUseCase`.
* Controller / Route: `GET /api/v1/events/:id/quotes/compare`.
* Authorization Policy: Organizer + ownership.
* Validation: Zod del path param + query.
* Transaction Required: No (sólo SELECT).

### Database

* Main Tables: `quotes`, `vendor_profiles`, `service_categories`, `events`.
* Indexes: reuso de `idx_quotes_quote_request_id` + considerar `(quote_request_id, status)` para filtro eficiente. Verificar.

### API

| Method | Endpoint                                            | Purpose                       |
| ------ | --------------------------------------------------- | ----------------------------- |
| GET    | `/api/v1/events/:id/quotes/compare?categoryCode=<slug>` | Datos del comparador.           |

### Observability / Audit

* Correlation ID Required: Yes
* Log Event Required: No (sólo log estándar de request)
* AdminAction Required: No
* AIRecommendation Required: No

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                          | Type        |
| ----- | --------------------------------------------------------------------------------- | ----------- |
| TS-01 | ≥2 Quotes ordenadas por `is_preferred DESC, status, total_price ASC`.            | Integration |
| TS-02 | 1 Quote retorna response normal con `items.length=1`.                            | Integration |
| TS-03 | 0 Quotes retorna `items=[]`.                                                       | Integration |
| TS-04 | Quotes `expired`/`rejected` aparecen con `status` correspondiente.                | Integration |
| TS-05 | E2E: vista responsive (table desktop / cards mobile).                              | E2E         |

### Negative Tests

| ID    | Scenario                                              | Expected Result                  |
| ----- | ----------------------------------------------------- | -------------------------------- |
| NT-01 | Sin `categoryCode`                                     | `400 INVALID_FILTERS`            |
| NT-02 | `categoryCode` inexistente                             | `400 INVALID_CATEGORY`           |
| NT-03 | Evento ajeno                                           | `404 EVENT_NOT_FOUND`             |
| NT-04 | Sin sesión                                             | `401`                             |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario                            | Expected Result          |
| ---------- | ----------------------------------- | ------------------------ |
| AUTH-TS-01 | Organizer dueño                     | `200`                    |
| AUTH-TS-02 | Organizer ajeno                     | `404 EVENT_NOT_FOUND`    |
| AUTH-TS-03 | Vendor                              | `403`                    |
| AUTH-TS-04 | Admin                                | `403`                    |
| AUTH-TS-05 | Sin sesión                          | `401`                    |

### Accessibility Tests

* Tabla con `<th scope="col">`, cards con `aria-labelledby`, indicadores con `aria-label`.

### Performance

* `< 1s p95`.

---

## 📊 Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | Tiempo a decisión del organizador.                   |
| Expected Impact     | Decisión informada y rápida.                          |
| Success Criteria    | < 1s p95 + UX responsive.                            |
| Academic Demo Value | Demo central del flujo de cotización.                 |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Page + `QuoteComparator` + tabla/cards responsive.
* `quotesApi.compare` + MSW.
* i18n 4 locales.
* Indicadores visuales para estados.

### Potential Backend Tasks

* DTO Zod del path + query.
* `CompareQuotesUseCase` con joins.
* Controller + ruta.
* Mapper para shape.

### Potential Database Tasks

* Verificar índices.

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* TS funcional + AUTH + A11Y + performance.

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
* [x] API definida (query + response shape).
* [x] Tests definidos.
* [x] PO/BA validó.

---

## 🏁 Definition of Done

* [ ] Endpoint funcional con guards + validaciones.
* [ ] Vista responsive (tabla/cards) accesible.
* [ ] Empty states 0/1/≥2 Quotes.
* [ ] Deep-link funcional a US-058 (preferred) y US-022 (AI).
* [ ] Tests verdes (functional, negative, auth, accessibility).
* [ ] i18n 4 locales.
* [ ] PO valida demo.

---

## 📝 Notes

* Mobile collapsa columnas a cards (UX guideline).
* Documentation Alignment Required (no bloqueantes) en `management/user-stories/decision-resolutions/US-057-decision-resolution.md`.
