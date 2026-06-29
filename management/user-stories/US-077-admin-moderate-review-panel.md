# 🧾 User Story: Panel admin de moderación de reseñas (listado global con filtros)

## 🆔 Metadata

| Field | Value |
|---|---|
| ID | US-077 |
| Backlog Item | PB-P1-040 — Moderación admin de reseñas (soft delete) |
| Epic | EPIC-REV-001 / EPIC-ADM-001 (cross-epic) |
| Feature | Endpoint admin global `GET /admin/reviews` + UI `ReviewModerationTable` conectada |
| Module / Domain | Admin / Reviews |
| User Role | Admin |
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

**As an** administrador
**I want** un panel admin global con listado paginado de reseñas + filtros (status, vendor, fechas, rating, moderated) + acción "Moderar" por fila
**So that** revise y modere contenido de forma operativa y eficiente, complementando el endpoint atómico de US-067

---

## 🧠 Business Context

### Context Summary

US-077 cierra PB-P1-040. Es surface UI + endpoint nuevo `GET /api/v1/admin/reviews` para el panel admin global de reseñas. Distinto al endpoint público de US-066 (que es por vendor y anonimizado). Admin tiene visibilidad universal (PII completa) y filtros operativos. La acción "Moderar" reusa el endpoint de US-067.

### PO/BA Decisions Applied

| # | Decisión |
|---|---|
| D1 | Endpoint nuevo `GET /api/v1/admin/reviews` global con filtros. |
| D2 | Filtros: `status` (multi), `vendor_id`, `created_at_from/to`, `rating_min/max`, `has_admin_action`, `pageSize`, `cursor`. |
| D3 | Cursor pagination base64 paridad US-066. Order `created_at DESC, id DESC`. |
| D4 | Response admin: PII completa + `last_admin_action` opcional. |
| D5 | Sin bulk actions MVP. |
| D6 | Sort fijo `created_at DESC`. |
| D7 | Reuso de `ReviewModerationTable` + `ModerationDialog` de US-067 spec. |
| D8 | Filtros multi-status via query array `?status=published&status=hidden`. |

### Related Domain Concepts

* `ReviewModerationTable` shared (de US-067).
* `ModerationDialog` shared.
* Cursor pagination pattern.
* Admin visibilidad universal.

### Assumptions

* US-065 entregó schema `reviews` con `status` y audit fields (US-067 D3).
* US-067 entregó endpoint moderate + componentes definidos.
* `AdminAction` table existe (PB-P0-001).

### Dependencies

* US-067 (endpoint moderate + componentes), US-066 (cursor pattern), PB-P0-001.

---

## 🔗 Traceability

| Source | Reference |
|---|---|
| FRD Requirement(s) | FR-ADMIN-005, FR-REVIEW-004 |
| Use Case(s) | UC-ADMIN-008, UC-REVIEW-003 |
| Business Rule(s) | BR-ADMIN-003, BR-ADMIN-011 |
| Permission Rule(s) | Admin only |
| Data Entity / Entities | Review, AdminAction, VendorProfile, Event, User |
| API Endpoint(s) | GET /api/v1/admin/reviews |
| NFR Reference(s) | NFR-PERF-001, NFR-A11Y-001 |
| Related Document(s) | /docs/9 §FR-ADMIN-005, /docs/8 §UC-ADMIN-008 |

---

## 🧭 Scope Guardrails

### MVP Scope
* In Scope
* Must Have

### Explicitly Out of Scope
* Bulk actions.
* Export CSV/Excel.
* Búsqueda full-text en `comment`.
* Filtros AI-assisted.
* Acción "moderate" duplicada (reusa US-067).

### Scope Notes
* Panel operativo + reuso componentes de US-067.

---

## ✅ Acceptance Criteria

### AC-01: Listado admin con paginación
**Given** admin autenticado
**When** `GET /api/v1/admin/reviews?pageSize=25`
**Then** `200` con `{items: [25 reviews], pagination: {next_cursor, page_size: 25}}` order `created_at DESC`.

### AC-02: Filtros combinados
**Given** filtros `?status=published&status=hidden&vendor_id=<uuid>&rating_min=4&has_admin_action=false`
**When** se aplica
**Then** items filtrados acorde + `pagination.next_cursor` válido.

### AC-03: Admin ve PII completa + last_admin_action
**Given** review moderada por admin
**When** se renderiza
**Then** incluye `author: {user_id, business_name}`, `vendor: {...}`, `event: {...}`, `last_admin_action: {action, reason, admin_id, created_at}`.

### AC-04: UI panel admin
**Given** admin en `/admin/reviews`
**When** carga la página
**Then** muestra `ReviewModerationTable` con filtros activos + botón "Moderar" por fila que abre `ModerationDialog` (US-067).

### AC-05: Acción moderate refresca la tabla
**Given** admin completa moderation via `ModerationDialog`
**When** mutation termina exitosa
**Then** invalidate de query del listado ⇒ tabla refresca con nuevo status + `last_admin_action`.

---

## ⚠️ Edge Cases

### EC-01: Sin resultados
**Given** filtros muy restrictivos
**When** se aplica
**Then** `200` con `items: [], pagination.next_cursor: null`. Empty state visible.

### EC-02: Cursor malformado
**Given** cursor base64 inválido
**When** se valida
**Then** `400 INVALID_CURSOR`.

### EC-03: PageSize fuera de rango
**Given** `pageSize=100` o `0`
**When** se valida
**Then** `400 INVALID_PAGE_SIZE`.

### EC-04: Filtros inválidos
**Given** `rating_min=6` o `created_at_from > created_at_to`
**When** se valida
**Then** `400 INVALID_FILTERS` con `details.field`.

---

## 🚫 Validation Rules

| ID | Rule | Behavior |
|---|---|---|
| VR-01 | `pageSize` 1..50 | `400 INVALID_PAGE_SIZE` |
| VR-02 | `cursor` base64 válido | `400 INVALID_CURSOR` |
| VR-03 | `rating_min/max` 1..5 con min<=max | `400 INVALID_FILTERS` |
| VR-04 | `created_at_from <= created_at_to` | `400 INVALID_FILTERS` |
| VR-05 | `status[]` valores válidos | `400 INVALID_FILTERS` |
| VR-06 | `vendor_id` UUID válido si presente | `400 INVALID_UUID` |

---

## 🔐 Authorization & Security Rules

| ID | Rule |
|---|---|
| SEC-01 | Sesión `admin` obligatoria |
| SEC-02 | Backend enforced (no confiar en UI) |
| SEC-03 | Admin ve PII completa (autorizado por rol) |
| SEC-04 | Sin acceso a reviews vía este endpoint para no-admin |

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
| Screen / Route | `/[locale]/admin/reviews` |
| Main UI Pattern | `ReviewModerationTable` (de US-067) + filtros laterales + botón "Moderar" por fila |
| Primary Action | "Moderar" (abre `ModerationDialog` de US-067) |
| Secondary Actions | "Limpiar filtros" |
| Empty State | "No hay reseñas que coincidan con los filtros." |
| Loading State | Skeleton de tabla |
| Error State | Banner con retry |
| Success State | Tabla renderizada con `AdminActionBadge` en moderated |
| Accessibility | Tabla con headers, filtros con labels, navegación teclado |
| Responsive | Mobile-first: cards apiladas en mobile |
| i18n | 4 locales (`admin.review.panel.*`, `admin.review.filters.*`) |
| Currency | No aplica |

---

## 🛠 Technical Notes

### Frontend
* Components: `ReviewModerationTable` (reuso US-067), `ReviewFiltersPanel` (nuevo), `AdminActionBadge` (reuso).
* State: TanStack `useInfiniteQuery` con queryKey `['admin.reviews', filters]`.
* Forms: Zod alineado con filtros backend.
* API: `adminApi.review.list(filters)`.

### Backend
* Use Case: `ListReviewsForAdminUseCase`.
* Controller / Route: `GET /api/v1/admin/reviews`.
* Authorization: AdminRoleGuard (reuso US-067).
* Validation: Zod query DTO.
* Transaction: No.

### Database
* Tablas: `reviews` (read), `vendor_profiles` (read for include), `users` (read for include author), `events` (read), `admin_actions` (read for last action).
* Index: reusar `idx_reviews_*` existentes; considerar `(status, created_at DESC)` general.

### API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/admin/reviews` | Listado admin global con filtros |

#### Response 200
```json
{
  "items": [
    {
      "id": "<uuid>",
      "rating": 4,
      "comment": "...",
      "status": "published",
      "created_at": "2026-...",
      "author": { "user_id": "<uuid>", "business_name": "Organizador XYZ" },
      "vendor": { "id": "<uuid>", "business_name": "Acme Catering", "slug": "acme-catering" },
      "event": { "id": "<uuid>", "title": "Boda de Juan" },
      "last_admin_action": {
        "action": "hide",
        "reason": "Contenido inapropiado",
        "admin_id": "<uuid>",
        "created_at": "2026-..."
      }
    }
  ],
  "pagination": { "next_cursor": "...", "page_size": 25 }
}
```

### Observability
* Correlation ID: Yes
* Log Event: No (log estándar)

---

## 🧪 Test Scenarios

### Functional
| ID | Scenario | Type |
|---|---|---|
| TS-01 | Listado sin filtros (todos los status) | Integration |
| TS-02 | Filtro multi-status + vendor_id | Integration |
| TS-03 | Filtro rating range + fechas | Integration |
| TS-04 | Filter has_admin_action=true muestra solo moderadas | Integration |
| TS-05 | Paginación con cursor | Integration |
| TS-06 | E2E: filtrar + moderar (via US-067) + refresh tabla | E2E |

### Negative
| ID | Scenario | Expected |
|---|---|---|
| NT-01 | Cursor malformado | `400 INVALID_CURSOR` |
| NT-02 | PageSize > 50 | `400 INVALID_PAGE_SIZE` |
| NT-03 | rating_min > rating_max | `400 INVALID_FILTERS` |
| NT-04 | Status inválido | `400 INVALID_FILTERS` |
| NT-05 | Sin sesión | `401` |
| NT-06 | Organizer/Vendor | `403` |

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
* Tabla + filtros accesibles con navegación teclado.

### Performance
* `< 500ms` p95.

---

## 📊 Business Impact

| Field | Value |
|---|---|
| KPI Affected | Eficiencia operativa del admin |
| Expected Impact | Capacidad de moderación masiva con filtros |
| Success Criteria | Filtros funcionales + pagination + refresh post-moderate |
| Academic Demo Value | Gobernanza admin operativa |

---

## 🧩 Task Breakdown Readiness

* FE: page + `ReviewFiltersPanel` + integración con componentes de US-067 + i18n.
* BE: UseCase + Controller + DTO filtros.
* DB: Verificar índices.
* QA: UT, IT, AUTH, A11Y, Performance.

---

## ✅ Definition of Ready
* [x] Rol, goal, FRD/UC/BR, permisos, entidades, AC GWT, edge cases, validación, out of scope, deps, UX, API, tests.
* [x] PO/BA validó.

---

## 🏁 Definition of Done
* [ ] Endpoint funcional con filtros combinados.
* [ ] Panel admin operativo.
* [ ] Acción moderate refresca tabla.
* [ ] Tests verdes + regresión US-067.
* [ ] i18n 4 locales.

---

## 📝 Notes

* Reuso máximo de componentes y endpoint de US-067.
* Documentation Alignment Required (no bloqueantes) en `management/user-stories/decision-resolutions/US-077-decision-resolution.md`.
