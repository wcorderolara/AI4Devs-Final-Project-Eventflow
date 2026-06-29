# 🧾 User Story: Listado público de reseñas en perfil del vendor (cursor pagination + anonimato del organizer)

## 🆔 Metadata

| Field | Value |
|---|---|
| ID | US-066 |
| Backlog Item | PB-P1-039 — Visualización de reseñas en perfil vendor |
| Epic | EPIC-REV-001 — Reviews & Moderation |
| Feature | Endpoint `GET /vendors/:id/reviews` con cursor pagination + summary + anonimato organizer |
| Module / Domain | Reviews / Vendor |
| User Role | Anonymous / Organizer / Vendor / Admin |
| Priority | Must Have |
| Status | Approved |
| Owner | Product Owner / Business Analyst |
| Sprint / Milestone | MVP |
| Created Date | 2026-06-09 |
| Last Updated | 2026-06-28 |
| Approved By | PO/BA Review |
| Approval Date | 2026-06-28 |
| Ready for Development Tasks | Yes |

---

## 🎯 User Story

**As a** visitante del perfil del vendor (anónimo, organizer, vendor o admin)
**I want** ver las reseñas publicadas paginadas con el promedio del vendor y sin exponer información personal del organizer
**So that** pueda evaluar la confianza del vendor antes de iniciar una solicitud de cotización

---

## 🧠 Business Context

### Context Summary

US-066 entrega el endpoint sólo lectura para listar reseñas verificadas (status `published`) con cursor pagination. Solo vendors `approved` son visibles públicamente; admin ve todos los estados. Display anonimizado del organizer (sólo título del evento + fecha + rating + comment) para preservar privacy MVP (BR-REVIEW-004). Excluye `hidden` y `deleted` (filtrado por backend).

### PO/BA Decisions Applied

| # | Decisión |
|---|---|
| D1 | Cursor pagination base64 paridad con US-045. `pageSize` default 20, max 50. |
| D2 | Reviewer display anonimizado: solo `event_title` + `created_at` + `rating` + `comment`. Sin organizer business name ni user ID. |
| D3 | Anónimo/organizer/vendor: solo vendor `approved`. Admin: todos los status. |
| D4 | Response: `{vendor: {rating_avg, reviews_count, ...}, items[], pagination: {next_cursor, page_size}}`. Order `created_at DESC, id DESC`. |
| D5 | `404 VENDOR_NOT_FOUND` uniforme para vendor inexistente, suspendido, rejected, draft (excepto admin). |
| D6 | Sin filtros adicionales en MVP (rating range, with_comment_only). Sólo ordering por fecha. |
| D7 | Index parcial `(vendor_profile_id, created_at DESC) WHERE status='published'`. |

### Related Domain Concepts

* `reviews.status='published'` filter obligatorio.
* `vendor_profiles.rating_avg/reviews_count` (denormalize US-065).
* Cursor pagination consistente con US-045.

### Assumptions

* US-065 publicó reviews y denormalize ya operativo.
* Reviews schema soporta `status published/hidden/deleted`.

### Dependencies

* US-065 (creación + denormalize), US-045 (cursor pagination pattern), PB-P0-001.

---

## 🔗 Traceability

| Source | Reference |
|---|---|
| FRD Requirement(s) | FR-REVIEW-010, FR-VENDOR-013 |
| Use Case(s) | UC-REVIEW-002 |
| Business Rule(s) | BR-REVIEW-004, BR-REVIEW-009 |
| Permission Rule(s) | Público (anónimo/organizer/vendor); admin para todos status |
| Data Entity / Entities | Review, VendorProfile, Event |
| API Endpoint(s) | GET /api/v1/vendors/:id/reviews |
| NFR Reference(s) | NFR-PERF-001, NFR-A11Y-001 |
| Related Document(s) | /docs/4 §BR-REVIEW-004, /docs/8 §UC-REVIEW-002, /docs/9 §FR-REVIEW-010 |

---

## 🧭 Scope Guardrails

### MVP Scope
* In Scope
* Must Have

### Explicitly Out of Scope
* Filtros avanzados (rating range, with_comment_only, fecha).
* Editar review propia.
* Responder review (FR-REVIEW-008).
* Búsqueda full-text.
* Exportar reviews.

### Scope Notes
* Sólo `status='published'` visible (públicamente y para organizer/vendor); admin ve todos.

---

## ✅ Acceptance Criteria

### AC-01: Listado público con summary y pagination
**Given** vendor approved con 25 reviews published
**When** `GET /api/v1/vendors/:id/reviews?pageSize=20`
**Then** `200` con `{vendor: {rating_avg, reviews_count: 25}, items: [20 reviews], pagination: {next_cursor, page_size: 20}}` ordenado `created_at DESC, id DESC`.

### AC-02: Paginación con cursor
**Given** `next_cursor` de AC-01
**When** `GET /api/v1/vendors/:id/reviews?cursor=<b64>&pageSize=20`
**Then** `200` con siguientes 5 reviews + `pagination.next_cursor: null`.

### AC-03: Anonimato del organizer
**Given** review existente
**When** se renderiza item
**Then** incluye `id, rating, comment, event_title, created_at, status`. NO incluye `author_user_id`, `event_id`, `organizer_business_name`.

### AC-04: Exclusión de hidden/deleted
**Given** vendor con 3 reviews `published` + 2 `hidden` + 1 `deleted`
**When** se consulta (no admin)
**Then** items.length=3.

### AC-05: Admin ve todos
**Given** admin autenticado
**When** consulta vendor con varios status reviews
**Then** items incluyen `published + hidden + deleted` con flag `status`.

---

## ⚠️ Edge Cases

### EC-01: Vendor sin reviews
**Given** vendor approved con 0 reviews
**When** se consulta
**Then** `200` con `items: [], vendor.reviews_count: 0, rating_avg: 0, pagination.next_cursor: null`. Frontend muestra empty state.

### EC-02: Vendor no approved
**Given** vendor `pending`/`suspended`/`rejected`/`draft`
**When** no admin
**Then** `404 VENDOR_NOT_FOUND` uniforme.

### EC-03: Cursor malformado
**Given** `cursor` no base64 válido
**When** se valida
**Then** `400 INVALID_CURSOR`.

### EC-04: `pageSize` fuera de rango
**Given** `pageSize=100` o `0`
**When** se valida
**Then** `400 INVALID_PAGE_SIZE`.

### EC-05: UUID malformado
**Given** `:id` no UUID
**When** se valida
**Then** `400 INVALID_UUID`.

---

## 🚫 Validation Rules

| ID | Rule | Behavior |
|---|---|---|
| VR-01 | `:id` UUID válido | `400 INVALID_UUID` |
| VR-02 | `pageSize` 1..50 si presente | `400 INVALID_PAGE_SIZE` |
| VR-03 | `cursor` base64 válido si presente | `400 INVALID_CURSOR` |
| VR-04 | Vendor `status='approved'` (no admin) | `404 VENDOR_NOT_FOUND` |

---

## 🔐 Authorization & Security Rules

| ID | Rule |
|---|---|
| SEC-01 | Endpoint público (sin sesión requerida) |
| SEC-02 | Filter `status='published'` para no-admin |
| SEC-03 | Anonimato del organizer (sin PII en response) |
| SEC-04 | Vendor non-approved invisible para no-admin (`404`) |

### Negative Authorization Scenarios
* Anónimo intenta ver vendor pending → 404; admin ve todo → 200.

---

## 🤖 AI Behavior

This story does not invoke AI directly.

* AI Feature: None
* Provider Layer: Not applicable
* AI Input/Output/HITL/Fallback: Not applicable

---

## 🎨 UX / UI Notes

| Area | Notes |
|---|---|
| Screen / Route | `/[locale]/vendors/:slug` (perfil público); `/[locale]/organizer/vendors/:id` (autenticado) |
| Main UI Pattern | `AverageRating` (grande arriba) + `ReviewList` con items + `Pagination` con "Cargar más" |
| Primary Action | "Cargar más reseñas" (cursor pagination) |
| Secondary Actions | "Solicitar cotización" (deep-link a flujo QR si vendor approved) |
| Empty State | "Este proveedor aún no tiene reseñas." |
| Loading State | Skeleton de 3 reviews |
| Error State | Banner con retry |
| Success State | Lista renderizada con stars accesibles |
| Accessibility | `StarRating` (reuso de US-065) con `aria-valuenow`; lista con `aria-label` |
| Responsive | Mobile-first: cards apiladas |
| i18n | 4 locales (`vendor.profile.reviews.*`) |
| Currency | No aplica |

---

## 🛠 Technical Notes

### Frontend
* Components: `AverageRating`, `ReviewList`, `ReviewListItem`, `LoadMoreButton`.
* State: TanStack infinite query con queryKey `['vendor.reviews', vendorId]`.
* API: `vendorsApi.reviews(id, {cursor, pageSize})`.

### Backend
* Use Case: `GetVendorReviewsUseCase`.
* Controller / Route: `GET /api/v1/vendors/:id/reviews`.
* Authorization: pública + lógica conditional para admin.
* Validation: Zod path + query.
* Transaction: No.

### Database
* Tablas: `reviews` (read), `vendor_profiles` (read).
* Index: parcial `(vendor_profile_id, created_at DESC) WHERE status='published'`.

### API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/vendors/:id/reviews?cursor=<b64>&pageSize=20` | Listar reviews paginadas |

#### Response 200
```json
{
  "vendor": {
    "id": "<uuid>",
    "business_name": "Acme Catering",
    "slug": "acme-catering",
    "status": "approved",
    "rating_avg": 4.6,
    "reviews_count": 25
  },
  "items": [
    {
      "id": "<uuid>",
      "rating": 5,
      "comment": "Excelente servicio.",
      "event_title": "Boda de Juan y María",
      "created_at": "2026-...",
      "status": "published"
    }
  ],
  "pagination": {
    "next_cursor": "eyJjcmVhdGVkX2F0IjoiMjAyNi0uLi4iLCJpZCI6IjxVVUlEPiJ9",
    "page_size": 20
  }
}
```

### Observability
* Correlation ID: Yes
* Log Event: No (sólo log estándar)

---

## 🧪 Test Scenarios

### Functional
| ID | Scenario | Type |
|---|---|---|
| TS-01 | Lista + summary + paginación primera página | Integration |
| TS-02 | Segunda página con cursor | Integration |
| TS-03 | Excluye hidden/deleted para no-admin | Integration |
| TS-04 | Admin ve todos los status | Integration |
| TS-05 | Vendor sin reviews ⇒ empty | Integration |
| TS-06 | Anonimato: sin PII expuesta | Integration |

### Negative
| ID | Scenario | Expected |
|---|---|---|
| NT-01 | Vendor non-approved (no admin) | `404 VENDOR_NOT_FOUND` |
| NT-02 | Cursor malformado | `400 INVALID_CURSOR` |
| NT-03 | pageSize > 50 | `400 INVALID_PAGE_SIZE` |
| NT-04 | UUID malformado | `400 INVALID_UUID` |
| NT-05 | Vendor inexistente | `404 VENDOR_NOT_FOUND` |

### AI Tests
Not applicable for this story.

### Authorization
| ID | Scenario | Expected |
|---|---|---|
| AUTH-TS-01 | Anónimo | 200 (si approved) |
| AUTH-TS-02 | Organizer | 200 |
| AUTH-TS-03 | Vendor | 200 |
| AUTH-TS-04 | Admin | 200 (incluye todos status) |

### Accessibility
* StarRating accesible (reuso de US-065).
* Lista con `aria-label`.

### Performance
* `< 500ms` p95 con cursor.

---

## 📊 Business Impact

| Field | Value |
|---|---|
| KPI Affected | Confianza del directorio + conversión a QR |
| Expected Impact | Decisión informada del organizer |
| Success Criteria | Reviews visibles 100% para approved vendors; pagination funcional |
| Academic Demo Value | Cierre del feedback loop |

---

## 🧩 Task Breakdown Readiness

* FE: `AverageRating`, `ReviewList`, `ReviewListItem`, paginación, i18n.
* BE: UseCase + Controller + Mapper anonimizado.
* DB: Verificar/crear index parcial.
* QA: UT + IT + AUTH + A11Y + paginación + anonimato.

---

## ✅ Definition of Ready
* [x] Rol, goal, FRD/UC/BR, permisos, entidades, AC GWT, edge cases, validación, out of scope, deps, UX, API, tests.
* [x] PO/BA validó.

---

## 🏁 Definition of Done
* [ ] Endpoint funcional con cursor pagination.
* [ ] Anonimato del organizer verificado.
* [ ] Admin ve todos status; resto solo published.
* [ ] Index parcial creado o verificado.
* [ ] Tests verdes + A11Y.
* [ ] i18n 4 locales.

---

## 📝 Notes

* Paridad de cursor pagination con US-045.
* Documentation Alignment Required (no bloqueantes) en `management/user-stories/decision-resolutions/US-066-decision-resolution.md`.
