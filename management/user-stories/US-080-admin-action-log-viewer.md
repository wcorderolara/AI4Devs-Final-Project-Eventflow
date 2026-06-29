# 🧾 User Story: Visor admin del log inmutable de AdminAction con filtros estructurados

## 🆔 Metadata

| Field | Value |
|---|---|
| ID | US-080 |
| Backlog Item | PB-P1-046 — Visor del log AdminAction |
| Epic | EPIC-ADM-001 |
| Feature | Endpoint admin único `GET /admin/admin-actions` con filtros + cursor pagination + inmutabilidad arquitectónica |
| Module / Domain | Admin / Audit |
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
**I want** consultar el log inmutable de `AdminAction` con filtros estructurados (admin actor, target, action, fechas) y paginación cursor
**So that** revise auditoría completa de acciones admin sin posibilidad de alterar el log (FR-ADMIN-006 + FR-ADMIN-009)

---

## 🧠 Business Context

### Context Summary

US-080 cierra **EPIC-ADM-001 — Admin Governance**. Visor del log AdminAction inmutable (BR-ADMIN-004). Pattern análogo a US-077 (panel reviews admin) y US-074 (panel vendors admin). NO se crea AdminAction al consultar este endpoint para evitar loop. Módulo arquitectónicamente solo lectura (sin POST/PATCH/DELETE expuestos).

### PO/BA Decisions Applied

| # | Decisión |
|---|---|
| D1 | 1 endpoint único `GET /api/v1/admin/admin-actions` con payload embebido. |
| D2 | Filtros: `admin_id`, `target_type`, `target_id`, `action`, `created_at_from/to`, cursor, pageSize. |
| D3 | Cursor pagination paridad US-077. |
| D4 | Response shape con admin info completa (id + business_name + email). |
| D5 | Inmutabilidad arquitectónica: solo GET expuesto. |
| D6 | NO crear AdminAction al consultar (evita loop infinito). |
| D7 | Solo `role='admin'`; superadmin/auditor out of MVP. |
| D8 | Sin search libre; solo filtros estructurados. |

### Related Domain Concepts

* `admin_actions` table append-only.
* Inmutabilidad arquitectónica (sin endpoints de mutación expuestos).
* Self-log evitado.

### Assumptions

* `admin_actions` schema existe (PB-P0-001) con campos `admin_id, target_type, target_id, action, reason, payload, created_at`.
* AdminGuard existe (US-067).

### Dependencies

* PB-P0-001, US-067 (AdminGuard), US-066/US-077 (cursor pattern), todas las US que generan AdminAction (US-047/067/075/076 etc.).

---

## 🔗 Traceability

| Source | Reference |
|---|---|
| FRD Requirement(s) | FR-ADMIN-009, FR-ADMIN-006 |
| Use Case(s) | UC-ADMIN-009 |
| Business Rule(s) | BR-ADMIN-004, BR-ADMIN-011 |
| Permission Rule(s) | Admin only |
| Data Entity / Entities | AdminAction, User (admin info) |
| API Endpoint(s) | GET /api/v1/admin/admin-actions |
| NFR Reference(s) | NFR-PERF-001 |
| Related Document(s) | /docs/9 §FR-ADMIN-006/009, /docs/8 §UC-ADMIN-009, /docs/4 §BR-ADMIN-004 |

---

## 🧭 Scope Guardrails

### MVP Scope
* In Scope
* Must Have

### Explicitly Out of Scope
* Endpoints de mutación.
* Self-log al consultar.
* Search full-text en reason/payload.
* Rol auditor granular.
* Export CSV.
* Real-time stream.

### Scope Notes
* Inmutable + filtros estructurados + cursor.

---

## ✅ Acceptance Criteria

### AC-01: Listado paginado con filtros
**Given** admin, filters `?admin_id=<uuid>&target_type=review&pageSize=25`
**When** `GET /api/v1/admin/admin-actions`
**Then** `200` con `{items: [25 AdminActions], pagination: {next_cursor, page_size}}` ordenado `created_at DESC`.

### AC-02: Cada item incluye admin info + payload embebido
**Given** request
**When** se renderiza
**Then** cada item incluye `{id, admin: {id, business_name?, email}, target_type, target_id, action, reason, payload, created_at}`.

### AC-03: Inmutabilidad arquitectónica
**Given** admin intenta `POST/PATCH/DELETE /api/v1/admin/admin-actions/:id`
**When** se ejecuta
**Then** `404` (endpoint inexistente).

### AC-04: Self-log evitado
**Given** admin consulta el endpoint
**When** se completa
**Then** NO se crea AdminAction nuevo (solo log estándar `admin.admin_actions.viewed`).

---

## ⚠️ Edge Cases

### EC-01: Sin resultados con filtros restrictivos
`200` con `items: []`.

### EC-02: Cursor malformado
`400 INVALID_CURSOR`.

### EC-03: PageSize fuera de rango
`400 INVALID_PAGE_SIZE`.

### EC-04: Filtros inválidos
`400 INVALID_FILTERS`.

---

## 🚫 Validation Rules

| ID | Rule | Behavior |
|---|---|---|
| VR-01 | `pageSize` 1..50 | `400 INVALID_PAGE_SIZE` |
| VR-02 | `cursor` base64 válido | `400 INVALID_CURSOR` |
| VR-03 | `admin_id` UUID válido si presente | `400 INVALID_UUID` |
| VR-04 | `target_id` UUID válido si presente | `400 INVALID_UUID` |
| VR-05 | `created_at_from <= created_at_to` | `400 INVALID_FILTERS` |
| VR-06 | Admin role | `403` |

---

## 🔐 Authorization & Security Rules

| ID | Rule |
|---|---|
| SEC-01 | Admin only |
| SEC-02 | Inmutabilidad arquitectónica (sin endpoints mutación) |
| SEC-03 | Self-log evitado (no loop) |
| SEC-04 | Backend enforced |

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
| Screen / Route | `/[locale]/admin/admin-actions` |
| Main UI Pattern | Tabla cronológica + filtros laterales + expansión row para ver payload completo |
| Primary Action | "Ver detalle" (expand row, NO acción de mutación) |
| Secondary Actions | "Limpiar filtros" |
| Empty State | "No hay acciones registradas con estos filtros" |
| Loading State | Skeleton |
| Error State | Banner |
| Success State | Tabla con cronología clara |
| Accessibility | Tabla semántica + expand controlado |
| Responsive | Mobile-first |
| i18n | 4 locales (`admin.admin-actions.*`) |
| Currency | No aplica |

---

## 🛠 Technical Notes

### Frontend
* Components: `AdminActionsTable`, `AdminActionsFiltersPanel`, `AdminActionRowExpansion`.
* State: TanStack `useInfiniteQuery` con queryKey `['admin.admin-actions', filters]`.
* Forms: RHF para filtros con debounce.
* API: `adminApi.adminActions.list(filters)`.

### Backend
* Use Case: `ListAdminActionsUseCase`.
* Controller: GET único.
* Authorization: AdminRoleGuard (reuso US-067).
* Validation: Zod query.

### Database
* Tablas: `admin_actions` (read), `users` (read for admin info).
* Indexes: `(created_at DESC)`, `(admin_id, created_at DESC)`, `(target_type, target_id, created_at DESC)`. Verificar.

### API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/admin/admin-actions` | Listado paginado del log con filtros |

#### Response 200
```json
{
  "items": [
    {
      "id": "<uuid>",
      "admin": { "id": "<uuid>", "business_name": "Admin User", "email": "admin@example.com" },
      "target_type": "review",
      "target_id": "<uuid>",
      "action": "hide",
      "reason": "Contenido inapropiado",
      "payload": { "from_status": "published", "to_status": "hidden", "rating_snapshot": 1 },
      "created_at": "2026-..."
    }
  ],
  "pagination": { "next_cursor": "...", "page_size": 25 }
}
```

### Observability
* Correlation ID: Yes
* Log: `admin.admin_actions.viewed` (estándar, NO AdminAction).
* AdminAction: No (evita loop).

---

## 🧪 Test Scenarios

### Functional
| ID | Scenario | Type |
|---|---|---|
| TS-01 | Listado con filtros combinados | Integration |
| TS-02 | Items incluyen admin info + payload | Integration |
| TS-03 | Pagination con cursor | Integration |
| TS-04 | Self-log evitado: NO crea AdminAction al consultar | Integration |
| TS-05 | Empty con filtros restrictivos | Integration |

### Negative
| ID | Scenario | Expected |
|---|---|---|
| NT-01 | PATCH /admin/admin-actions/:id | `404` (endpoint inexistente) |
| NT-02 | DELETE /admin/admin-actions/:id | `404` |
| NT-03 | POST /admin/admin-actions | `404` |
| NT-04 | Cursor malformado | `400 INVALID_CURSOR` |
| NT-05 | created_at_from > created_at_to | `400 INVALID_FILTERS` |
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
* Tabla semántica + expand accesible.

### Performance
* `< 500ms p95` con filtros combinados.

---

## 📊 Business Impact

| Field | Value |
|---|---|
| KPI Affected | Compliance + auditoría |
| Expected Impact | Trazabilidad completa de gobernanza |
| Success Criteria | 100% acciones admin visibles + inmutabilidad enforced |
| Academic Demo Value | Gobernanza compliance |

---

## 🧩 Task Breakdown Readiness

* FE: tabla + filtros + row expansion + i18n.
* BE: UseCase + Controller + DTO.
* DB: Verificar índices.
* QA: UT, IT (verificación arquitectural NO mutation), AUTH, A11Y.

---

## ✅ Definition of Ready
* [x] Rol, goal, FRD/UC/BR, permisos, entidades, AC GWT, edge cases, validación, out of scope, deps, UX, API, tests.
* [x] PO/BA validó.

---

## 🏁 Definition of Done
* [ ] Endpoint funcional con filtros.
* [ ] Inmutabilidad arquitectónica verificada (NO endpoints mutación).
* [ ] Self-log evitado.
* [ ] Tests verdes.
* [ ] i18n 4 locales.

---

## 📝 Notes

* Cierra EPIC-ADM-001.
* Inmutabilidad enforced arquitectónicamente.
* Documentation Alignment Required (no bloqueantes) en `management/user-stories/decision-resolutions/US-080-decision-resolution.md`.
