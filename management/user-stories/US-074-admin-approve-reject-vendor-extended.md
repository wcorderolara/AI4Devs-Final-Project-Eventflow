# 🧾 User Story: Panel admin de moderación de VendorProfiles (listado global con filtros)

## 🆔 Metadata

| Field | Value |
|---|---|
| ID | US-074 |
| Backlog Item | PB-P1-041 — Admin: aprobar / rechazar / ocultar vendor |
| Epic | EPIC-ADM-001 / EPIC-VND-001 |
| Feature | Endpoint admin global `GET /admin/vendors` + UI `VendorModerationTable` + Dialog |
| Module / Domain | Admin / Vendors |
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
**I want** un panel admin global con listado paginado de VendorProfiles + filtros (status, is_hidden, fechas, business_name search) + acción "Moderar" por fila
**So that** revise y modere vendors de forma operativa y eficiente, complementando el endpoint atómico de US-047

---

## 🧠 Business Context

### Context Summary

US-074 cierra PB-P1-041. Es surface UI + endpoint nuevo `GET /api/v1/admin/vendors` para el panel admin global de vendors. Distinto al endpoint público de US-040 (que es lookup filtrado por approved+is_hidden=false). Admin tiene visibilidad universal (PII completa: owner email). Acción "moderate" reusa endpoint de US-047 (un solo endpoint con `action` enum).

### PO/BA Decisions Applied

| # | Decisión |
|---|---|
| D1 | Endpoint nuevo `GET /api/v1/admin/vendors` global con filtros. |
| D2 | Filtros: `status` (multi), `is_hidden`, `created_at_from/to`, `business_name` (ILIKE), `pageSize`, `cursor`. |
| D3 | Cursor pagination base64 paridad US-077. |
| D4 | Response admin con owner email + last_admin_action opcional. |
| D5 | Sort fijo `created_at DESC`; frontend pre-aplica filtro `status=pending` por default. |
| D6 | 3 componentes nuevos (`VendorModerationTable`, `VendorModerationDialog`, `VendorFiltersPanel`) + hook `useModerateVendor` consumiendo US-047. |
| D7 | Business name search ILIKE substring case-insensitive. |
| D8 | Sin bulk actions MVP. |

### Related Domain Concepts

* `VendorModerationTable` nuevo.
* `VendorModerationDialog` con action selector (paridad `ModerationDialog` de US-067).
* `useModerateVendor` hook reuso del endpoint de US-047.

### Assumptions

* US-047 entregó endpoint moderate + AdminAction + audit fields.
* `vendor_profiles.is_hidden` ya existe (US-047 D9 migración).

### Dependencies

* US-047 (endpoint moderate + audit fields + service común extendido), US-066/US-077 (cursor pattern), PB-P0-001.

---

## 🔗 Traceability

| Source | Reference |
|---|---|
| FRD Requirement(s) | FR-ADMIN-003, FR-VENDOR-010, FR-VENDOR-011 |
| Use Case(s) | UC-ADMIN-004, UC-ADMIN-005 |
| Business Rule(s) | BR-VENDOR-003, BR-ADMIN-001, BR-ADMIN-003, BR-ADMIN-011 |
| Permission Rule(s) | Admin only |
| Data Entity / Entities | VendorProfile, AdminAction, User |
| API Endpoint(s) | GET /api/v1/admin/vendors |
| NFR Reference(s) | NFR-PERF-001, NFR-A11Y-001 |
| Related Document(s) | /docs/9 §FR-ADMIN-003, /docs/8 §UC-ADMIN-004/005, /docs/8.1 #16 |

---

## 🧭 Scope Guardrails

### MVP Scope
* In Scope
* Must Have

### Explicitly Out of Scope
* Bulk actions.
* Export CSV.
* Búsqueda full-text en descripción.
* Acción "moderate" duplicada (reusa US-047).

### Scope Notes
* Reuso máximo de patterns de US-077.

---

## ✅ Acceptance Criteria

### AC-01: Listado admin con paginación + filtro default
**Given** admin autenticado en `/admin/vendors`
**When** carga la página (frontend pre-aplica `status=pending`)
**Then** `200` con `{items: [vendors pending], pagination: {next_cursor, page_size: 25}}`.

### AC-02: Filtros combinados
**Given** filtros `?status=approved&is_hidden=true&business_name=catering`
**When** se aplica
**Then** items filtrados acorde + pagination.

### AC-03: Admin ve owner email + last_admin_action
**Given** vendor moderado por admin
**When** se renderiza item
**Then** incluye `owner: {user_id, email}` + `last_admin_action: {action, reason, admin_id, created_at}`.

### AC-04: UI panel
**Given** admin en `/admin/vendors`
**When** carga
**Then** muestra `VendorModerationTable` + `VendorFiltersPanel` + botón "Moderar" por fila que abre `VendorModerationDialog`.

### AC-05: Acción moderate refresca tabla
**Given** admin completa moderation via `VendorModerationDialog` (4 acciones)
**When** mutation termina exitosa
**Then** `invalidateQueries(['admin.vendors'])` ⇒ tabla refresca + nuevo `last_admin_action` visible.

---

## ⚠️ Edge Cases

### EC-01: Sin resultados
**Given** filtros muy restrictivos
**When** se aplica
**Then** `200` con `items: []`. Empty state visible.

### EC-02: Cursor malformado
**Given** cursor base64 inválido
**When** se valida
**Then** `400 INVALID_CURSOR`.

### EC-03: PageSize fuera de rango
**Given** `pageSize=100` o `0`
**When** se valida
**Then** `400 INVALID_PAGE_SIZE`.

### EC-04: Filtros inválidos
**Given** `created_at_from > created_at_to` o status inválido
**When** se valida
**Then** `400 INVALID_FILTERS`.

### EC-05: business_name vacío
**Given** `business_name=""`
**When** se valida
**Then** trim a undefined (sin filtro).

---

## 🚫 Validation Rules

| ID | Rule | Behavior |
|---|---|---|
| VR-01 | `pageSize` 1..50 | `400 INVALID_PAGE_SIZE` |
| VR-02 | `cursor` base64 válido | `400 INVALID_CURSOR` |
| VR-03 | `created_at_from <= created_at_to` | `400 INVALID_FILTERS` |
| VR-04 | `status[]` valores válidos | `400 INVALID_FILTERS` |
| VR-05 | `is_hidden` boolean | `400 INVALID_FILTERS` |
| VR-06 | `business_name` length [1..100] si presente | `400 INVALID_FILTERS` |

---

## 🔐 Authorization & Security Rules

| ID | Rule |
|---|---|
| SEC-01 | Sesión `admin` obligatoria |
| SEC-02 | Backend enforced |
| SEC-03 | Admin ve PII completa (owner email) |
| SEC-04 | No-admin no puede acceder al panel ni al endpoint |

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
| Screen / Route | `/[locale]/admin/vendors` |
| Main UI Pattern | `VendorModerationTable` + `VendorFiltersPanel` lateral/superior + botón "Moderar" |
| Primary Action | "Moderar" (abre `VendorModerationDialog`) |
| Secondary Actions | "Limpiar filtros" |
| Empty State | "No hay vendors que coincidan con los filtros." |
| Loading State | Skeleton |
| Error State | Banner con retry |
| Success State | Tabla renderizada con badges de status, is_hidden, last_admin_action |
| Accessibility | Tabla con headers, filtros con labels, keyboard nav, dialog accesible |
| Responsive | Mobile-first: cards en mobile |
| i18n | 4 locales (`admin.vendor.panel.*`, `admin.vendor.filters.*`, `admin.vendor.moderate.*`) |
| Currency | No aplica |

---

## 🛠 Technical Notes

### Frontend
* Components: `VendorModerationTable`, `VendorModerationDialog` (con action selector + reason RHF+Zod), `VendorFiltersPanel`, `VendorStatusBadge` (reuso o nuevo).
* State: TanStack `useInfiniteQuery` con queryKey `['admin.vendors', filters]`.
* Mutation: `useModerateVendor` ⇒ POST a endpoint de US-047 ⇒ invalidate `['admin.vendors']`.
* Forms: RHF + Zod alineado con DTO de US-047.

### Backend
* Use Case: `ListVendorsForAdminUseCase`.
* Controller / Route: `GET /api/v1/admin/vendors`.
* Authorization: AdminRoleGuard (reuso US-067).
* Validation: Zod query DTO con cross-field refines.
* Transaction: No.

### Database
* Tablas: `vendor_profiles` (read), `users` (read for owner), `admin_actions` (read for last action).
* Indexes: considerar `(status, created_at DESC)` parcial o GIN para business_name si necesario.

### API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/admin/vendors` | Listado admin global con filtros |

#### Response 200
```json
{
  "items": [
    {
      "id": "<uuid>",
      "business_name": "Acme Catering",
      "slug": "acme-catering",
      "status": "approved",
      "is_hidden": false,
      "created_at": "2026-...",
      "owner": { "user_id": "<uuid>", "email": "owner@example.com" },
      "last_admin_action": {
        "action": "approve",
        "reason": null,
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
| TS-01 | Listado con filtro default status=pending | Integration |
| TS-02 | Filtros combinados | Integration |
| TS-03 | business_name ILIKE | Integration |
| TS-04 | Paginación con cursor | Integration |
| TS-05 | E2E: filtrar + moderate (via US-047) + refresh | E2E |

### Negative
| ID | Scenario | Expected |
|---|---|---|
| NT-01 | Cursor malformado | `400 INVALID_CURSOR` |
| NT-02 | PageSize > 50 | `400 INVALID_PAGE_SIZE` |
| NT-03 | Status inválido | `400 INVALID_FILTERS` |
| NT-04 | created_at_from > created_at_to | `400 INVALID_FILTERS` |
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
* Tabla + filtros + dialog accesibles con teclado.

### Performance
* `< 500ms` p95.

---

## 📊 Business Impact

| Field | Value |
|---|---|
| KPI Affected | Eficiencia operativa admin |
| Expected Impact | Tiempo a aprobación reducido |
| Success Criteria | Filtros funcionales + acción individual + refresh post-moderate |
| Academic Demo Value | Gobernanza admin completa |

---

## 🧩 Task Breakdown Readiness

* FE: page + 3 componentes + hook + i18n.
* BE: DTO + UseCase + Controller.
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
* [ ] Tests verdes + regresión US-047.
* [ ] i18n 4 locales.

---

## 📝 Notes

* Reuso máximo de US-047 (endpoint + AdminGuard) y US-077 (cursor pattern).
* Documentation Alignment Required (no bloqueantes) en `management/user-stories/decision-resolutions/US-074-decision-resolution.md`.
