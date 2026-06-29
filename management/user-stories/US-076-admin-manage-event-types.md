# 🧾 User Story: CRUD admin de EventType con bloqueo de hard delete + endpoint público

## 🆔 Metadata

| Field | Value |
|---|---|
| ID | US-076 |
| Backlog Item | PB-P1-043 — Gestión de EventType (sin hard delete con eventos) |
| Epic | EPIC-ADM-001 |
| Feature | CRUD admin + endpoint público + AdminAction + soft delete con guard EXISTS events |
| Module / Domain | Admin / Catalog |
| User Role | Admin (admin endpoints) / Cualquier autenticado (público) |
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
**I want** CRUD completo de EventTypes con bloqueo de hard delete cuando hay eventos asociados, AdminAction obligatorio e i18n; además un endpoint público para consumo por el wizard de creación de eventos
**So that** el catálogo de tipos de evento se mantenga consistente sin romper integridad referencial (Decisión PO 8.1 #17 + FR-ADMIN-007 + BR-EVENTTYPE-007)

---

## 🧠 Business Context

### Context Summary

US-076 single-story de PB-P1-043. Pattern análogo a US-075 (CRUD ServiceCategory) **sin jerarquía** y con guard sobre `events`. Soft delete obligatorio cuando hay eventos asociados (BR-EVENTTYPE-007). AdminAction obligatorio (BR-ADMIN-011). Seed obligatorio con 6 EventTypes culturales (FR-EVENT-013: wedding, xv, baptism, baby_shower, birthday, corporate).

### PO/BA Decisions Applied

| # | Decisión |
|---|---|
| D1 | 5 endpoints REST estándar paridad US-075 (4 admin + 1 público). |
| D2 | Listado admin con `is_active=false`; público solo activas. |
| D3 | `name_i18n` jsonb requerido es-LATAM + fallback; `description_i18n` opcional. |
| D4 | Soft delete con guard `EXISTS events` ⇒ `409 EVENT_TYPE_IN_USE`. Sino `is_active=false`. NO hard delete. |
| D5 | Reactivar via PATCH `is_active=true`. |
| D6 | AdminAction obligatorio (`target_type='event_type'`). Reason required en soft_delete [10..500]. |
| D7 | `404 EVENT_TYPE_NOT_FOUND` uniforme. |
| D8 | Endpoint público `GET /api/v1/event-types` incluido (autenticado, solo activas). |
| D9 | Seed obligatorio 6 EventTypes con codes fijos (FR-EVENT-013). |
| D10 | Reorder via PATCH `sort_order`. |

### Related Domain Concepts

* `event_types` (id, code, name_i18n, description_i18n, sort_order, is_active).
* Soft delete con `is_active`.
* AdminAction obligatorio.
* Sin jerarquía (diferencia con ServiceCategory).

### Assumptions

* `event_types` tabla existe (PB-P0-001).
* `events.event_type_id` FK existe.
* Admin role + AdminGuard existen (US-067).

### Dependencies

* PB-P0-001 (schema), US-067 (AdminGuard reuso), US-075 (pattern reference).

---

## 🔗 Traceability

| Source | Reference |
|---|---|
| FRD Requirement(s) | FR-ADMIN-007, FR-EVENT-013 |
| Use Case(s) | UC-ADMIN-007 |
| Business Rule(s) | BR-EVENTTYPE-001, BR-EVENTTYPE-007, BR-ADMIN-002, BR-ADMIN-011, BR-EVENT-004 |
| Permission Rule(s) | Admin (admin endpoints); autenticado (público) |
| Data Entity / Entities | EventType, AdminAction, Event (ref para guard) |
| API Endpoint(s) | GET / POST / PATCH / DELETE /api/v1/admin/event-types; GET /api/v1/event-types |
| NFR Reference(s) | NFR-PERF-001, NFR-A11Y-001 |
| Related Document(s) | /docs/4 §BR-EVENTTYPE-007 + §BR-ADMIN-002/011, /docs/8 §UC-ADMIN-007, /docs/9 §FR-ADMIN-007/FR-EVENT-013, /docs/8.1 #17 |

---

## 🧭 Scope Guardrails

### MVP Scope
* In Scope
* Must Have

### Explicitly Out of Scope
* Hard delete físico (BR-EVENTTYPE-007).
* Jerarquía de EventTypes (no soportada en MVP).
* Bulk reorder.
* Importar/exportar.
* AI-generated EventTypes.

### Scope Notes
* Curado por admin con audit.

---

## ✅ Acceptance Criteria

### AC-01: Create EventType
**Given** admin, body `{code: 'engagement', name_i18n: {es-LATAM: 'Compromiso'}, sort_order: 7}`
**When** `POST /admin/event-types`
**Then** `201` + INSERT AdminAction action='create'.

### AC-02: Update name/sort/is_active
**Given** EventType existente
**When** `PATCH /admin/event-types/:id`
**Then** UPDATE + AdminAction (reactivate si is_active=true desde false).

### AC-03: Soft delete sin eventos asociados
**Given** EventType con 0 events asociados, body `{reason: 'No es relevante en LATAM'}`
**When** `DELETE /admin/event-types/:id`
**Then** UPDATE `is_active=false` + AdminAction soft_delete.

### AC-04: Listado admin
**Given** admin
**When** `GET /admin/event-types`
**Then** todos los EventTypes (incluye inactivas).

### AC-05: Listado público
**Given** cualquier autenticado
**When** `GET /api/v1/event-types`
**Then** solo `is_active=true`.

---

## ⚠️ Edge Cases

### EC-01: Soft delete con eventos asociados
**Given** EventType con events
**When** DELETE
**Then** `409 EVENT_TYPE_IN_USE` con `details.usage_count`.

### EC-02: Code duplicado
**Given** body con `code` ya existente
**When** se valida
**Then** `409 DUPLICATE_CODE`.

### EC-03: name_i18n sin es-LATAM
`400 INVALID_NAME_I18N`.

### EC-04: UUID malformado / inexistente
`400 INVALID_UUID` / `404 EVENT_TYPE_NOT_FOUND`.

### EC-05: Reason ausente en delete
`400 REASON_REQUIRED`.

---

## 🚫 Validation Rules

| ID | Rule | Behavior |
|---|---|---|
| VR-01 | `:id` UUID válido | `400 INVALID_UUID` |
| VR-02 | `code` slug único [1..64] | `409 DUPLICATE_CODE` |
| VR-03 | `name_i18n` requiere es-LATAM | `400 INVALID_NAME_I18N` |
| VR-04 | `sort_order` >= 0 | `400 INVALID_SORT_ORDER` |
| VR-05 | `is_active` boolean | `400 INVALID_BODY` |
| VR-06 | DELETE: sin eventos asociados | `409 EVENT_TYPE_IN_USE` |
| VR-07 | DELETE reason [10..500] | `400 REASON_REQUIRED` / `400 INVALID_REASON_LENGTH` |
| VR-08 | EventType existe | `404 EVENT_TYPE_NOT_FOUND` |
| VR-09 | Admin role (admin endpoints) | `403` |

---

## 🔐 Authorization & Security Rules

| ID | Rule |
|---|---|
| SEC-01 | Admin role para CRUD endpoints |
| SEC-02 | Endpoint público requiere autenticación |
| SEC-03 | AdminAction obligatorio por mutación |
| SEC-04 | No hard delete físico |
| SEC-05 | `404 EVENT_TYPE_NOT_FOUND` uniforme |

### Negative Authorization Scenarios
* Sin sesión → 401; organizer/vendor en admin endpoints → 403.

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
| Screen / Route | `/[locale]/admin/event-types` |
| Main UI Pattern | Tabla simple con CRUD + dialog confirmación delete con reason |
| Primary Action | "Crear tipo de evento" |
| Secondary Actions | "Editar", "Desactivar", "Reactivar" |
| Empty State | "No hay tipos de evento" |
| Loading State | Skeleton |
| Error State | Banner i18n por código |
| Success State | Toast + actualización tabla |
| Accessibility | Tabla + dialogs accesibles |
| Responsive | Mobile-first |
| i18n | 4 locales (`admin.event-type.*`) |
| Currency | No aplica |

---

## 🛠 Technical Notes

### Frontend
* Components: `EventTypeTable`, `EventTypeFormDialog`, `EventTypeDeleteDialog`.
* State: TanStack mutation + invalidación.
* Forms: RHF + Zod + i18n multi-locale.
* API: `adminApi.eventType.list/create/update/delete`.

### Backend
* Use Cases: `ListEventTypes` (admin/public), `CreateEventType`, `UpdateEventType`, `SoftDeleteEventType`.
* Controllers: admin + público.
* Authorization: AdminRoleGuard.
* Validation: Zod `.strict()`.
* Transaction: Sí.

### Database
* Tablas: `event_types` (read/write), `admin_actions` (insert), `events` (read for guard).
* Migración menor: verificar columnas i18n + audit. Si faltan, añadir.

### API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/admin/event-types` | Admin list |
| POST | `/api/v1/admin/event-types` | Create |
| PATCH | `/api/v1/admin/event-types/:id` | Update |
| DELETE | `/api/v1/admin/event-types/:id` | Soft delete |
| GET | `/api/v1/event-types` | Público list (solo activas) |

### Observability
* Correlation ID: Yes
* Log: `event_type.created/updated/soft_deleted/reactivated` con `adminUserId, eventTypeId, action`.
* AdminAction: Yes (obligatoria).

---

## 🧪 Test Scenarios

### Functional
| ID | Scenario | Type |
|---|---|---|
| TS-01 | Create + AdminAction | Integration |
| TS-02 | Update + reactivate detection | Integration |
| TS-03 | Soft delete sin eventos + AdminAction | Integration |
| TS-04 | Listado admin incluye inactivas | Integration |
| TS-05 | Listado público solo activas | Integration |
| TS-06 | Seed 6 EventTypes obligatorios | Integration |

### Negative
| ID | Scenario | Expected |
|---|---|---|
| NT-01 | Delete con eventos asociados | `409 EVENT_TYPE_IN_USE` |
| NT-02 | Code duplicado | `409 DUPLICATE_CODE` |
| NT-03 | name_i18n sin es-LATAM | `400 INVALID_NAME_I18N` |
| NT-04 | Delete sin reason | `400 REASON_REQUIRED` |
| NT-05 | Sin sesión | `401` |
| NT-06 | Organizer/Vendor en admin endpoints | `403` |

### AI Tests
Not applicable for this story.

### Authorization
| ID | Scenario | Expected |
|---|---|---|
| AUTH-TS-01 | Admin en admin endpoints | 200/201 |
| AUTH-TS-02 | Organizer/Vendor en admin endpoints | 403 |
| AUTH-TS-03 | Cualquier autenticado en público | 200 |
| AUTH-TS-04 | Sin sesión en público | 401 |

### Accessibility
* Tabla + dialogs.

### Performance
* `< 500ms` p95.

---

## 📊 Business Impact

| Field | Value |
|---|---|
| KPI Affected | Integridad referencial del catálogo |
| Expected Impact | Sin pérdida de eventos por hard delete accidental |
| Success Criteria | 100% acciones auditadas + 0 hard deletes |
| Academic Demo Value | Gobernanza admin + integridad referencial |

---

## 🧩 Task Breakdown Readiness

* FE: tabla + form dialog + delete dialog + i18n.
* BE: DTOs + 4 UseCases + Controllers + Logger.
* DB: Verificar/migrar + seed 6 obligatorios.
* QA: UT, IT (CRUD + guard EXISTS + AdminAction), AUTH, A11Y.

---

## ✅ Definition of Ready
* [x] Rol, goal, FRD/UC/BR, permisos, entidades, AC GWT, edge cases, validación, out of scope, deps, UX, API, tests.
* [x] PO/BA validó.

---

## 🏁 Definition of Done
* [ ] 5 endpoints funcionales.
* [ ] Soft delete con guard EXISTS events.
* [ ] AdminAction por cada op.
* [ ] Seed 6 EventTypes obligatorios.
* [ ] i18n 4 locales.
* [ ] Tests verdes.

---

## 📝 Notes

* Decisión PO 8.1 #17 (no hard delete con eventos).
* Sin jerarquía (diferencia con US-075).
* Documentation Alignment Required (no bloqueantes) en `management/user-stories/decision-resolutions/US-076-decision-resolution.md`.
