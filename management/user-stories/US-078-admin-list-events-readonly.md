# 🧾 User Story: Admin lista + detalle de eventos en solo lectura con AdminAction(view_event)

## 🆔 Metadata

| Field | Value |
|---|---|
| ID | US-078 |
| Backlog Item | PB-P1-044 — Admin: listado de eventos en solo lectura |
| Epic | EPIC-ADM-001 |
| Feature | 2 endpoints admin solo lectura + AdminAction(view_event) en detalle |
| Module / Domain | Admin / Events |
| User Role | Admin |
| Priority | Must Have |
| Status | Approved |
| Owner | Product Owner / Business Analyst |
| Sprint / Milestone | MVP |
| Created Date | 2026-06-09 |
| Last Updated | 2026-06-29 |
| Approved By | PO/BA Review |
| Approval Date | 2026-06-29 |
| Ready for Development Tasks | Yes |

---

## 🎯 User Story

**As an** administrador
**I want** listar y ver detalle completo de cualquier evento en modo solo lectura, con AdminAction(view_event) por cada acceso a detalle
**So that** apoye soporte y verifique datos sin alterarlos, con audit trail completo (Decisión PO 8.1 #16 + FR-EVENT-010)

---

## 🧠 Business Context

### Context Summary

US-078 single-story de PB-P1-044. 2 endpoints admin: listado paginado con filtros + detalle agregado. AdminAction(view_event) solo en detalle (no en list para no inflar audit). Sin endpoints de mutación admin sobre Event (FR-EVENT-010 prohibe edición). Detail incluye counts agregados de sub-entidades (tasks, quotes, booking_intents, reviews, ai_recommendations).

### PO/BA Decisions Applied

| # | Decisión |
|---|---|
| D1 | 2 endpoints: `GET /admin/events` (list) + `GET /admin/events/:id` (detail). |
| D2 | AdminAction(view_event) SOLO en detail (no list). Action `view_event`, target_type `event`, reason null. |
| D3 | Filtros list: `status` (multi), `event_type_id`, `event_date_from/to`, `organizer_search` (ILIKE en email + business_name). |
| D4 | Cursor pagination paridad US-077 (default 25, max 50). |
| D5 | Detail shape agregado: event + organizer + counts + budget_summary. NO listas completas de sub-entidades. |
| D6 | Solo lectura enforcement: NO existen endpoints admin de mutación; arquitecturalmente módulo admin/events solo expone GETs. |
| D7 | `404 EVENT_NOT_FOUND` uniforme. |
| D8 | 1 INSERT AdminAction por detail GET; aceptable MVP. Dedup window post-MVP si aplica. |

### Related Domain Concepts

* `view_event` action obligatorio en AdminAction (extensión semántica de BR-ADMIN-011).
* Counts agregados con queries optimizadas.
* Solo lectura arquitectónica (sin endpoints de mutación expuestos).

### Assumptions

* `events` schema completo (PB-P0-001).
* `admin_actions` table existe con campo `action` flexible.

### Dependencies

* PB-P0-001 (schema), US-067 (AdminGuard reuso), US-066/US-077 (cursor pattern).

---

## 🔗 Traceability

| Source | Reference |
|---|---|
| FRD Requirement(s) | FR-EVENT-010, FR-ADMIN-002, FR-ADMIN-006 |
| Use Case(s) | UC-ADMIN-002, UC-ADMIN-009 |
| Business Rule(s) | BR-EVENT-014, BR-ADMIN-005, BR-ADMIN-011 |
| Permission Rule(s) | Admin only |
| Data Entity / Entities | Event, AdminAction, User, EventType, Budget, Task, Quote, QuoteRequest, BookingIntent, Review, AIRecommendation |
| API Endpoint(s) | GET /api/v1/admin/events; GET /api/v1/admin/events/:id |
| NFR Reference(s) | NFR-PERF-001 |
| Related Document(s) | /docs/9 §FR-EVENT-010/FR-ADMIN-002/006, /docs/8 §UC-ADMIN-002, /docs/8.1 #16 |

---

## 🧭 Scope Guardrails

### MVP Scope
* In Scope
* Must Have

### Explicitly Out of Scope
* Edición admin de eventos.
* Export CSV.
* AdminAction en listado.
* Drill-down a sub-entidades completas (solo counts).
* Dedup window de view_event.

### Scope Notes
* Solo lectura estricta + audit en detail.

---

## ✅ Acceptance Criteria

### AC-01: Listado con filtros + cursor
**Given** admin, filters `?status=in_progress&pageSize=25`
**When** `GET /api/v1/admin/events`
**Then** `200` con `{items: [25 events resumidos], pagination: {next_cursor, page_size}}`. NO crea AdminAction.

### AC-02: Detail con counts + AdminAction
**Given** admin, evento existente
**When** `GET /api/v1/admin/events/:id`
**Then** `200` con detail completo + counts agregados; INSERT AdminAction `action='view_event'`.

### AC-03: Solo lectura
**Given** admin
**When** intenta `PATCH /admin/events/:id` o `DELETE`
**Then** `404` (endpoint inexistente).

### AC-04: Acceso a múltiples detalles registra múltiples AdminActions
**Given** admin abre 3 detalles distintos
**When** se completa
**Then** 3 AdminActions registradas.

---

## ⚠️ Edge Cases

### EC-01: Evento inexistente
`404 EVENT_NOT_FOUND`.

### EC-02: UUID malformado
`400 INVALID_UUID`.

### EC-03: Filtros inválidos
`400 INVALID_FILTERS`.

### EC-04: Cursor malformado
`400 INVALID_CURSOR`.

### EC-05: Acceso repetido al mismo evento por mismo admin
Cada acceso = 1 AdminAction nuevo (sin dedup window MVP).

---

## 🚫 Validation Rules

| ID | Rule | Behavior |
|---|---|---|
| VR-01 | `:id` UUID válido | `400 INVALID_UUID` |
| VR-02 | `pageSize` 1..50 | `400 INVALID_PAGE_SIZE` |
| VR-03 | `cursor` base64 válido | `400 INVALID_CURSOR` |
| VR-04 | `status[]` valores válidos | `400 INVALID_FILTERS` |
| VR-05 | `event_date_from <= event_date_to` | `400 INVALID_FILTERS` |
| VR-06 | Evento existe | `404 EVENT_NOT_FOUND` |
| VR-07 | Admin role | `403` |

---

## 🔐 Authorization & Security Rules

| ID | Rule |
|---|---|
| SEC-01 | Admin only |
| SEC-02 | Solo lectura: ningún endpoint admin de mutación sobre Event |
| SEC-03 | AdminAction(view_event) obligatorio en detail |
| SEC-04 | `404 EVENT_NOT_FOUND` uniforme |

### Negative Authorization Scenarios
* Sin sesión → 401; organizer/vendor → 403.

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
| Screen / Route | `/[locale]/admin/events` (listado) + `/[locale]/admin/events/:id` (detalle) |
| Main UI Pattern | Tabla paginada con filtros + página de detalle con counts cards |
| Primary Action | "Ver detalle" |
| Secondary Actions | "Limpiar filtros" |
| Empty State | "No hay eventos que coincidan." |
| Loading State | Skeleton |
| Error State | Banner |
| Success State | Tabla / detail renderizado |
| Accessibility | Tabla con headers + página detail accesible |
| Responsive | Mobile-first |
| i18n | 4 locales (`admin.event.list.*`, `admin.event.detail.*`) |
| Currency | Mostrar `currency_code` del evento en cards de budget |

---

## 🛠 Technical Notes

### Frontend
* Components: `AdminEventTable`, `AdminEventFiltersPanel`, `AdminEventDetailPage`, `EventCountsCards`.
* State: TanStack `useInfiniteQuery` (list) + `useQuery` (detail).
* Forms: RHF para filtros.
* API: `adminApi.event.list/get`.

### Backend
* Use Cases: `ListEventsForAdminUseCase`, `GetEventDetailForAdminUseCase` (con INSERT AdminAction).
* Controllers: admin only.
* Authorization: AdminRoleGuard (reuso US-067).
* Validation: Zod.
* Transaction: detail use case sí (INSERT AdminAction + SELECT detail).

### Database
* Tablas: `events` (read), `users` (read for organizer), `event_types` (read), `admin_actions` (insert), `tasks/budgets/quote_requests/quotes/booking_intents/reviews/ai_recommendations` (read for counts).
* Indexes: `(status, event_date DESC)`, `(event_type_id)`. Verificar.

### API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/admin/events` | Listado paginado con filtros |
| GET | `/api/v1/admin/events/:id` | Detail + AdminAction |

### Observability
* Correlation ID: Yes
* Log: `admin.event.viewed` para list (estándar) + `admin.event.detail.viewed` para detail.
* AdminAction: Yes en detail (`action='view_event'`).

---

## 🧪 Test Scenarios

### Functional
| ID | Scenario | Type |
|---|---|---|
| TS-01 | Listado con filtros + cursor | Integration |
| TS-02 | Detail crea AdminAction(view_event) | Integration |
| TS-03 | List NO crea AdminAction | Integration |
| TS-04 | Detail incluye counts correctos | Integration |
| TS-05 | Múltiples GET detail = múltiples AdminActions | Integration |

### Negative
| ID | Scenario | Expected |
|---|---|---|
| NT-01 | Evento inexistente | `404 EVENT_NOT_FOUND` |
| NT-02 | UUID malformado | `400 INVALID_UUID` |
| NT-03 | PATCH /admin/events/:id | `404` (endpoint inexistente) |
| NT-04 | DELETE /admin/events/:id | `404` |
| NT-05 | Filtros inválidos | `400 INVALID_FILTERS` |
| NT-06 | Sin sesión | `401` |
| NT-07 | Organizer/Vendor | `403` |

### AI Tests
Not applicable for this story.

### Authorization
| ID | Scenario | Expected |
|---|---|---|
| AUTH-TS-01 | Admin | 200 |
| AUTH-TS-02 | Organizer | 403 |
| AUTH-TS-03 | Vendor | 403 |
| AUTH-TS-04 | Sin sesión | 401 |

### Accessibility
* Tabla + detail accesibles.

### Performance
* List `< 500ms p95`.
* Detail con counts: `< 700ms p95` (queries adicionales).

---

## 📊 Business Impact

| Field | Value |
|---|---|
| KPI Affected | Capacidad de soporte admin + auditoría |
| Expected Impact | Soporte sin riesgo de alterar datos + audit trail completo |
| Success Criteria | 100% acceso a detail registrado + 0 mutaciones admin |
| Academic Demo Value | Gobernanza admin + audit completo |

---

## 🧩 Task Breakdown Readiness

* FE: list page + detail page + filters + counts cards + i18n.
* BE: 2 UseCases + Controller + DTOs.
* DB: Verificar índices.
* QA: UT, IT (incluye verificación AdminAction + no mutation endpoints), AUTH, A11Y, Performance.

---

## ✅ Definition of Ready
* [x] Rol, goal, FRD/UC/BR, permisos, entidades, AC GWT, edge cases, validación, out of scope, deps, UX, API, tests.
* [x] PO/BA validó.

---

## 🏁 Definition of Done
* [ ] 2 endpoints funcionales.
* [ ] AdminAction(view_event) registrada en cada detail.
* [ ] NO existen endpoints admin de mutación.
* [ ] Counts agregados correctos.
* [ ] Tests verdes + verificación arquitectónica.
* [ ] i18n 4 locales.

---

## 📝 Notes

* Decisión PO 8.1 #16: solo lectura admin.
* Counts agregados optimizados con queries `COUNT(*)` separadas o `_count` Prisma.
* Documentation Alignment Required (no bloqueantes) en `management/user-stories/decision-resolutions/US-078-decision-resolution.md`.
