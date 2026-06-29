# 🧾 User Story: Buscar proveedores por categoría/ciudad/precio (directorio autenticado)

## 🆔 Metadata

| Field              | Value                                                                       |
| ------------------ | --------------------------------------------------------------------------- |
| ID                 | US-045                                                                      |
| Backlog Item       | PB-P1-028 — Búsqueda de directorio de proveedores (organizer)               |
| Epic               | EPIC-VND-001                                                                |
| Feature            | Búsqueda autenticada en directorio                                          |
| Module / Domain    | Vendors                                                                     |
| User Role          | Organizer (principal); Vendor / Admin autorizados                           |
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
**I want** buscar proveedores aprobados filtrando por categoría, ciudad y rango de precio (con moneda)
**So that** encuentre rápidamente candidatos para mis QuoteRequests con resultados paginados y ordenados de forma estable

---

## 🧠 Business Context

### Context Summary

Endpoint server-side con query optimizada que retorna `VendorProfile` con `status='approved'` AND `deleted_at IS NULL` (BR-VENDOR-001). Filtros: `categoryCode` (slug), `locationCode` (slug), `priceMin`/`priceMax` con `currency` (semántica EXISTS sobre `vendor_services` activos). Paginación cursor opaque + `limit`. Ordenamiento estable `(rating_avg DESC NULLS LAST, created_at DESC, id DESC)`. Sólo lectura.

### PO/BA Decisions Applied

| #  | Decisión                                                                                                                                                                                                                                       |
| -- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1 | Paginación cursor opaque base64 `{ created_at, id }` + `limit` default `20`, máx `50`. Response: `{ items: [...], page: { cursor, limit, hasNext } }`.                                                                                          |
| D2 | Orden default: `rating_avg DESC NULLS LAST, created_at DESC, id DESC`. Sin override en MVP.                                                                                                                                                     |
| D3 | Filtros strict: valores inválidos ⇒ `400 INVALID_FILTERS` con `details.invalid: [...]`. Filtros ausentes/vacíos se ignoran silenciosamente.                                                                                                    |
| D4 | El filtro `priceMin`/`priceMax` aplica EXISTS sobre `vendor_services` con `is_active=true` cuyo `base_price` cae en el rango Y `currency_code = ?currency`.                                                                                    |
| D5 | `currency` requerido cuando se envía `priceMin` o `priceMax` (enum del schema). Ausente ⇒ `400 INVALID_FILTERS` con `details.invalid: ['currency_required_with_price']`. Sin conversión automática (BR-BUDGET-007).                          |
| D6 | Roles autorizados: `organizer`, `vendor`, `admin` autenticados. Sin sesión ⇒ `401`. Vendor autenticado no se ve a sí mismo en resultados (`vendor_user_id != currentUser.id`). Versión pública anónima vive en US-046.                       |
| D7 | Query params: `categoryCode` (slug `service_categories.code`), `locationCode` (slug `locations.code`), `priceMin`, `priceMax` (`numeric(14,2)`), `currency`, `cursor`, `limit`. Slugs resueltos a IDs en backend.                              |
| D8 | Empty state: mensaje genérico i18n + CTA "Limpiar filtros". Sin sugerencias automáticas en MVP.                                                                                                                                               |

### Related Domain Concepts

* `vendor_profiles` (status, location_id, rating_avg, deleted_at).
* `vendor_profile_categories` (M:N).
* `vendor_services` (base_price, currency_code, is_active).
* `service_categories` (code, is_active).
* `locations` (code).

### Assumptions

* Cursor pagination protege consistencia bajo concurrencia.
* Sólo lectura; sin side-effects ni logs estructurados (más allá de `correlation_id` heredado).

### Dependencies

* US-040 (VendorProfile creación).
* US-044 (VendorService — necesario para filtro de precio).
* US-047 (admin approve — necesario para que existan vendors `approved`).
* PB-P0-001 (schema + índices).

---

## 🔗 Traceability

| Source                 | Reference                                                                |
| ---------------------- | ------------------------------------------------------------------------ |
| FRD Requirement(s)     | FR-VENDOR-003, FR-SERVICE-004                                            |
| Use Case(s)            | UC-VENDOR-006                                                             |
| Business Rule(s)       | BR-VENDOR-001, BR-VENDOR-003, BR-SERVICE-001, BR-BUDGET-007              |
| Permission Rule(s)     | Organizer / Vendor / Admin autenticados                                  |
| Data Entity / Entities | VendorProfile, VendorService, ServiceCategory, Location                  |
| API Endpoint(s)        | GET /api/v1/vendors                                                       |
| NFR Reference(s)       | NFR-PERF-001                                                              |
| Related ADR(s)         | —                                                                         |
| Related Document(s)    | /docs/4 §BR-VENDOR-001, /docs/8 §UC-VENDOR-006, /docs/9 §FR-VENDOR-003, /docs/18 §15.1 |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* Búsqueda geoespacial (lat/long radio).
* Full-text avanzada (Postgres FTS / Elasticsearch).
* Conversión automática de moneda.
* Cache de búsquedas populares.
* Sugerencias automáticas en empty state.
* Override de ordenamiento (`sort` query param).
* Versión pública anónima (US-046).

### Scope Notes

* Filtros básicos; sin combinatoria avanzada.
* Vendors `pending`/`rejected`/`hidden`/soft-deleted nunca aparecen.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Búsqueda combinada con paginación

**Given** vendors con `status='approved'` y `deleted_at IS NULL`
**When** un organizador envía `GET /api/v1/vendors?categoryCode=catering&locationCode=GT-GUA&priceMin=100&priceMax=500&currency=GTQ&limit=20`
**Then** el backend:
- valida slugs contra `service_categories.is_active=true` y `locations.id`,
- aplica `WHERE vp.status='approved' AND vp.deleted_at IS NULL`,
- aplica `EXISTS (SELECT 1 FROM vendor_profile_categories WHERE vendor_profile_id = vp.id AND service_category_id = ?)`,
- aplica `vp.location_id = ?`,
- aplica `EXISTS (SELECT 1 FROM vendor_services WHERE vendor_profile_id = vp.id AND is_active = true AND currency_code = 'GTQ' AND base_price BETWEEN 100 AND 500)`,
- excluye `vp.vendor_user_id = currentUser.id` cuando el rol es `vendor`,
- ordena por `rating_avg DESC NULLS LAST, created_at DESC, id DESC`,
- retorna máx 20 items con `{ items: [...], page: { cursor, limit: 20, hasNext } }`.

### AC-02: Página siguiente con cursor

**Given** una primera respuesta con `page.cursor != null`
**When** el cliente envía `GET /api/v1/vendors?...&cursor=<value>`
**Then** el backend decodifica el cursor y retorna los siguientes resultados con el mismo orden estable.

### AC-03: Empty state

**Given** filtros sin matches
**When** la consulta se ejecuta
**Then** responde `200 OK` con `{ items: [], page: { cursor: null, limit, hasNext: false } }`. El frontend muestra mensaje i18n genérico + CTA "Limpiar filtros".

### AC-04: Authorization

**Given** un cliente sin sesión
**When** envía la consulta
**Then** `401 Unauthorized`.

---

## ⚠️ Edge Cases

### EC-01: Filtros inválidos

**Given** query con `categoryCode=non-existent` o UUID malformado o `priceMin > priceMax`
**When** backend valida
**Then** `400 INVALID_FILTERS` con `details.invalid: [...]`. Sin retornar parcialmente filtrado.

#### Handling

* Strict (D3).

### EC-02: Precio sin currency

**Given** `priceMin=100` sin `currency`
**When** backend valida
**Then** `400 INVALID_FILTERS` con `details.invalid: ['currency_required_with_price']`.

### EC-03: Vendor autenticado en sus propios resultados

**Given** vendor autenticado
**When** consulta sin filtros
**Then** la respuesta no incluye su propio `vendor_profile`.

### EC-04: `limit` fuera de rango

**Given** `limit=100`
**When** backend valida
**Then** `400 INVALID_FILTERS` con `details.invalid: ['limit_out_of_range']`.

### EC-05: Cursor corrupto

**Given** `cursor` que no decodifica base64 válido o no contiene `{ created_at, id }`
**When** backend valida
**Then** `400 INVALID_CURSOR`.

---

## 🚫 Validation Rules

| ID    | Rule                                                              | Message / Behavior                              |
| ----- | ----------------------------------------------------------------- | ----------------------------------------------- |
| VR-01 | `priceMin <= priceMax` cuando ambos están presentes               | `400 INVALID_FILTERS`                           |
| VR-02 | `categoryCode` existe y `is_active=true`                          | `400 INVALID_FILTERS`                           |
| VR-03 | `locationCode` existe                                              | `400 INVALID_FILTERS`                           |
| VR-04 | `currency` ∈ enum del schema; requerido si hay `priceMin`/`priceMax` | `400 INVALID_FILTERS`                           |
| VR-05 | `limit ∈ [1..50]`                                                  | `400 INVALID_FILTERS`                           |
| VR-06 | `cursor` decodifica a `{ created_at, id }` válido                  | `400 INVALID_CURSOR`                            |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                          |
| ------ | --------------------------------------------------------------------------------------------- |
| SEC-01 | Sesión válida requerida (`organizer`, `vendor`, `admin`).                                     |
| SEC-02 | Sólo `VendorProfile.status='approved'` Y `deleted_at IS NULL` aparecen en resultados.        |
| SEC-03 | Vendor autenticado no se ve a sí mismo en resultados.                                         |
| SEC-04 | Sólo lectura; ningún side-effect.                                                              |

### Negative Authorization Scenarios

* Sin sesión → `401`.
* Vendor en sus propios resultados → excluido silenciosamente (no error).

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
| Screen / Route      | `/[locale]/organizer/vendors`                                                                   |
| Main UI Pattern     | Filtros laterales (categoría, ciudad, rango de precio + moneda) + grid de cards + "Cargar más".|
| Primary Action      | "Solicitar cotización" en cada card (deep-link a US-quote).                                    |
| Secondary Actions   | "Ver detalle" (deep-link a US-046).                                                            |
| Empty State         | "No encontramos proveedores con esos filtros." + CTA "Limpiar filtros".                        |
| Loading State       | Skeleton de cards.                                                                              |
| Error State         | Banner accesible con código i18n.                                                              |
| Success State       | Grid con cards.                                                                                |
| Accessibility Notes | Filtros con `<label>` visibles; cards con `aria-labelledby`; "Cargar más" con `aria-busy`.     |
| Responsive Notes    | Mobile-first; filtros colapsan a drawer.                                                       |
| i18n Notes          | 4 locales: `es-LATAM`, `es-ES`, `pt`, `en`.                                                    |
| Currency Notes      | Cada card muestra moneda junto al precio; filtro requiere currency single.                    |

---

## 🛠 Technical Notes

### Frontend

* Route / Page:
  * `app/[locale]/organizer/vendors/page.tsx`.
* Components:
  * `VendorSearch` (orquesta filtros + lista).
  * `VendorFilters` (form de filtros con URL state).
  * `VendorCard`.
  * "Cargar más" button.
* State Management:
  * TanStack Query con `useInfiniteQuery` keyed por filtros.
* Forms:
  * Filtros en URL (deep linking) + RHF para precio/currency.
* API Client:
  * `vendorsApi.search({ categoryCode, locationCode, priceMin, priceMax, currency, cursor, limit })`.

### Backend

* Use Case / Service:
  * `SearchVendorsUseCase`.
* Controller / Route:
  * `GET /api/v1/vendors`.
* Authorization Policy:
  * `authenticatedGuard` (cualquier rol válido).
* Validation:
  * Zod query schema con refine cross-field (currency required with price; priceMin <= priceMax).
* Transaction Required:
  * No.

### Database

* Main Tables:
  * `vendor_profiles`, `vendor_profile_categories`, `vendor_services`, `service_categories`, `locations`.
* Indexes:
  * `idx_vendor_profiles_status_location (status, location_id) WHERE status='approved'`.
  * `idx_vendor_services_active (vendor_profile_id) WHERE is_active=true`.
  * Considerar: índice compuesto `(rating_avg, created_at, id) WHERE status='approved' AND deleted_at IS NULL`.

### API

| Method | Endpoint                | Purpose                                                       |
| ------ | ----------------------- | ------------------------------------------------------------- |
| GET    | `/api/v1/vendors`       | Buscar vendors approved con filtros + cursor pagination.      |

#### Query Params

| Param            | Type         | Required           | Notes                                                |
| ---------------- | ------------ | ------------------ | ---------------------------------------------------- |
| `categoryCode`   | string slug  | No                 | Slug `service_categories.code`.                      |
| `locationCode`   | string slug  | No                 | Slug `locations.code`.                               |
| `priceMin`       | numeric(14,2)| No (requiere currency) | `>= 0`.                                              |
| `priceMax`       | numeric(14,2)| No (requiere currency) | `>= priceMin`.                                       |
| `currency`       | enum         | Sí si hay precio   | `GTQ/EUR/MXN/COP/USD`.                               |
| `cursor`         | base64       | No                 | Opaque `{ created_at, id }`.                         |
| `limit`          | int          | No                 | Default 20, máx 50.                                  |

#### Response Shape

```json
{
  "items": [
    {
      "id": "<uuid>",
      "slug": "<slug>",
      "businessName": "...",
      "locationCode": "GT-GUA",
      "categories": ["catering"],
      "ratingAvg": 4.6,
      "reviewsCount": 24,
      "priceRange": { "min": "150.00", "max": "450.00", "currency": "GTQ" },
      "thumbnailUrl": "..."
    }
  ],
  "page": { "cursor": "<base64|null>", "limit": 20, "hasNext": true }
}
```

### Observability / Audit

* Correlation ID Required: Yes
* Log Event Required: No (sólo log estándar de request)
* AdminAction Required: No
* AIRecommendation Required: No

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                  | Type        |
| ----- | ------------------------------------------------------------------------- | ----------- |
| TS-01 | Filtros combinados retornan matches paginados.                            | API         |
| TS-02 | Cursor pagina correctamente sin duplicar resultados.                      | API         |
| TS-03 | Orden estable: `rating_avg DESC NULLS LAST, created_at DESC, id DESC`.    | API         |
| TS-04 | Vendor autenticado no aparece en sus propios resultados.                  | API         |
| TS-05 | Empty state cuando no hay matches.                                         | API         |
| TS-06 | Sólo `approved` + `deleted_at IS NULL` aparecen.                          | API         |
| TS-07 | E2E: usuario completa flujo de filtros + cargar más.                       | E2E         |

### Negative Tests

| ID    | Scenario                                              | Expected Result          |
| ----- | ----------------------------------------------------- | ------------------------ |
| NT-01 | `priceMin > priceMax`                                  | `400 INVALID_FILTERS`    |
| NT-02 | `categoryCode` inexistente                             | `400 INVALID_FILTERS`    |
| NT-03 | `locationCode` inexistente                             | `400 INVALID_FILTERS`    |
| NT-04 | `priceMin` sin `currency`                              | `400 INVALID_FILTERS`    |
| NT-05 | `limit` fuera de `[1..50]`                             | `400 INVALID_FILTERS`    |
| NT-06 | `cursor` corrupto                                      | `400 INVALID_CURSOR`     |
| NT-07 | Sin sesión                                              | `401`                    |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario                            | Expected Result                       |
| ---------- | ----------------------------------- | ------------------------------------- |
| AUTH-TS-01 | Organizer autenticado                | `200`                                  |
| AUTH-TS-02 | Vendor autenticado                   | `200` (no se ve a sí mismo)            |
| AUTH-TS-03 | Admin autenticado                    | `200`                                  |
| AUTH-TS-04 | Sin sesión                          | `401`                                  |

### Accessibility Tests

* Filtros con labels semánticos.
* Cards con `aria-labelledby`.
* "Cargar más" con `aria-busy` durante fetch.

---

## 📊 Business Impact

| Field               | Value                                                  |
| ------------------- | ------------------------------------------------------ |
| KPI Affected        | Descubrimiento, conversión a QuoteRequest.             |
| Expected Impact     | Encuentro eficiente vendor↔organizador.                |
| Success Criteria    | `< 1s p95` con seed completo (NFR-PERF-001).            |
| Academic Demo Value | Demuestra marketplace + cursor pagination + ordenamiento estable. |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Page + filtros con URL state + grid + "Cargar más".
* `vendorsApi.search` + MSW.
* i18n 4 locales.

### Potential Backend Tasks

* `SearchVendorsUseCase`.
* DTO Zod query con refine.
* Repository extension (query con joins + EXISTS).
* Controller + ruta.
* Helper cursor (encode/decode).

### Potential Database Tasks

* Verificación de índices existentes.
* Considerar índice compuesto adicional.

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* TS, NT, AUTH-TS, performance.

### Potential DevOps / Config Tasks

* Not applicable for this story.

---

## ✅ Definition of Ready

* [x] Rol claro.
* [x] Goal/valor claros.
* [x] FRD/UC/BR enlazados (FR-VENDOR-003, FR-SERVICE-004, UC-VENDOR-006, BR-VENDOR-001, BR-BUDGET-007).
* [x] Permisos identificados.
* [x] Entidades listadas.
* [x] AC en GWT.
* [x] Edge cases documentados.
* [x] Validación clara.
* [x] Out of Scope explícito.
* [x] Dependencias conocidas.
* [x] UX states identificados.
* [x] API definida (query params + response shape).
* [x] Tests definidos.
* [x] PO/BA validó.

---

## 🏁 Definition of Done

* [ ] Endpoint funcional con todos los filtros y validaciones.
* [ ] Cursor pagination consistente bajo concurrencia.
* [ ] Ordenamiento estable verificado.
* [ ] Vendor no se ve a sí mismo.
* [ ] `< 1s p95` en seed completo (NFR-PERF-001).
* [ ] Tests verdes (TS, NT, AUTH-TS, A11Y, performance).
* [ ] i18n 4 locales para empty state y filtros.

---

## 📝 Notes

* Versión pública anónima vive en US-046.
* Cache de búsquedas populares es Future.
* Documentation Alignment Required (no bloqueantes) en `management/user-stories/decision-resolutions/US-045-decision-resolution.md §5`: documentar endpoint en `docs/16 §M07`; corregir Traceability de PB-P1-028.
