# 🧾 User Story: CRUD admin de ServiceCategory con jerarquía 2 niveles + soft delete + endpoint público

## 🆔 Metadata

| Field | Value |
|---|---|
| ID | US-075 |
| Backlog Item | PB-P1-042 — CRUD ServiceCategory (jerarquía 2 niveles) |
| Epic | EPIC-ADM-001 |
| Feature | CRUD admin + endpoint público + AdminAction + jerarquía enforcement + soft delete |
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
**I want** CRUD completo de ServiceCategories con jerarquía máxima de 2 niveles, soft delete cuando hay dependencias, AdminAction obligatorio, e i18n; además un endpoint público para consumo por vendors/organizers
**So that** el catálogo de servicios refleje la oferta oficial LATAM con curaduría auditada (Decisión PO 8.1 #18 + BR-SERVICE-003..007)

---

## 🧠 Business Context

### Context Summary

US-075 single-story de PB-P1-042. Catálogo `ServiceCategory` curado únicamente por admin (BR-SERVICE-003). Jerarquía simple `parent → child` con máx 2 niveles (Decisión PO 8.1 #18). Soft delete con guards: bloquea cuando hay `VendorService` asociados o subcategorías activas (FR-SERVICE-003 + BR-SERVICE-007). AdminAction obligatorio por cada operación (BR-ADMIN-011/012). i18n: `name_i18n` jsonb con fallback. Esta US entrega también el endpoint público `GET /service-categories` para consumo en formularios de QR, creación de vendor services, US-040.

### PO/BA Decisions Applied

| # | Decisión |
|---|---|
| D1 | 5 endpoints REST estándar: `GET, POST, PATCH, DELETE` admin + `GET` público. Reorder via PATCH `sort_order`. |
| D2 | Listado shape `{tree, flat}` (admin ve `is_active=false`; público solo activas). |
| D3 | `name_i18n` requerido en `es-LATAM`, otros opcionales con fallback. `description_i18n` opcional. |
| D4 | Jerarquía 2 niveles enforcement server-side. Violaciones ⇒ `409 INVALID_HIERARCHY_DEPTH`. |
| D5 | Soft delete con guards: `409 CATEGORY_IN_USE` / `409 CATEGORY_HAS_CHILDREN`. Sino `is_active=false`. NO hard delete físico. |
| D6 | Reactivar via PATCH `is_active=true`. |
| D7 | AdminAction obligatorio (`target_type='service_category'`, action `create/update/soft_delete/reactivate`). Reason required en `soft_delete` [10..500]; opcional en otros. |
| D8 | Reorder via PATCH `sort_order`. Bulk reorder out of MVP. |
| D9 | `404 SERVICE_CATEGORY_NOT_FOUND` uniforme. |
| D10 | Endpoint público incluido en esta US: `GET /api/v1/service-categories` (autenticado, solo activas). |

### Related Domain Concepts

* `service_categories` (id, code, name_i18n, description_i18n, parent_id, sort_order, is_active).
* Jerarquía simple parent/child max 2.
* Soft delete con `is_active`.
* AdminAction obligatorio.

### Assumptions

* `service_categories` tabla existe (PB-P0-001) con campos audit.
* `vendor_services.service_category_id` FK existe.
* Admin role + AdminGuard existen (US-067).

### Dependencies

* PB-P0-001 (schema), US-067 (AdminGuard reuso), US-066 (cursor reuso opcional para flat pagination).

---

## 🔗 Traceability

| Source | Reference |
|---|---|
| FRD Requirement(s) | FR-ADMIN-004, FR-SERVICE-001, FR-SERVICE-002, FR-SERVICE-003, FR-SERVICE-005, FR-SERVICE-006 |
| Use Case(s) | UC-ADMIN-007 |
| Business Rule(s) | BR-SERVICE-003, BR-SERVICE-005, BR-SERVICE-007, BR-ADMIN-002, BR-ADMIN-011, BR-ADMIN-012 |
| Permission Rule(s) | Admin (admin endpoints); autenticado cualquier rol (público) |
| Data Entity / Entities | ServiceCategory, AdminAction, VendorService (ref para guard) |
| API Endpoint(s) | GET / POST / PATCH / DELETE /api/v1/admin/service-categories; GET /api/v1/service-categories |
| NFR Reference(s) | NFR-PERF-001, NFR-A11Y-001 |
| Related Document(s) | /docs/4 §BR-SERVICE-003..007 + §BR-ADMIN-002/011/012, /docs/8 §UC-ADMIN-007, /docs/9 §FR-ADMIN-004/FR-SERVICE-001..006, /docs/8.1 #18 |

---

## 🧭 Scope Guardrails

### MVP Scope
* In Scope
* Must Have

### Explicitly Out of Scope
* Jerarquía 3+ niveles.
* Hard delete físico.
* Bulk reorder.
* Importar/exportar catálogo.
* AI-generated categories.

### Scope Notes
* Curado por admin con audit obligatorio.

---

## ✅ Acceptance Criteria

### AC-01: Create categoría raíz
**Given** admin autenticado, body `{code, name_i18n: {es-LATAM: 'Catering'}, sort_order: 0, parent_id: null}`
**When** `POST /admin/service-categories`
**Then** `201` con categoría creada (status `is_active=true` default) + INSERT AdminAction `action='create'`.

### AC-02: Create subcategoría (nivel 2)
**Given** admin, parent existente con `parent_id IS NULL`, body con `parent_id`
**When** se ejecuta
**Then** `201` con subcategoría creada + AdminAction.

### AC-03: Update name + sort_order + is_active
**Given** admin, body `{name_i18n: {...}, sort_order: 1, is_active: false}`
**When** `PATCH /admin/service-categories/:id`
**Then** UPDATE + AdminAction action='update' (reactivate si is_active pasó a true).

### AC-04: Soft delete sin dependencias
**Given** categoría sin `vendor_services` ni subcategorías activas, body `{reason: 'No utilizada en LATAM verificado'}`
**When** `DELETE /admin/service-categories/:id`
**Then** UPDATE `is_active=false` + AdminAction `action='soft_delete'`. NO hard delete.

### AC-05: Listado admin tree + flat
**Given** admin
**When** `GET /admin/service-categories`
**Then** `200` con `{tree: [...], flat: [...]}` incluyendo `is_active=false`.

### AC-06: Listado público solo activas
**Given** cualquier user autenticado
**When** `GET /api/v1/service-categories`
**Then** `200` con `{tree, flat}` solo `is_active=true`.

---

## ⚠️ Edge Cases

### EC-01: Crear nivel 3
**Given** body con `parent_id` apuntando a child existente (que ya tiene parent)
**When** se valida
**Then** `409 INVALID_HIERARCHY_DEPTH`.

### EC-02: Asignar parent a categoría con children
**Given** categoría con children activos, PATCH `parent_id=otra_root`
**When** se valida
**Then** `409 INVALID_HIERARCHY_DEPTH`.

### EC-03: Soft delete con servicios asociados
**Given** categoría con `vendor_services`
**When** DELETE
**Then** `409 CATEGORY_IN_USE` con `details.usage_count`.

### EC-04: Soft delete con subcategorías activas
**Given** categoría root con children activos
**When** DELETE
**Then** `409 CATEGORY_HAS_CHILDREN`.

### EC-05: name_i18n sin es-LATAM
**Given** body `name_i18n: {en: '...'}` sin `es-LATAM`
**When** se valida
**Then** `400 INVALID_NAME_I18N`.

### EC-06: code duplicado
**Given** body con `code` ya existente
**When** se valida
**Then** `409 DUPLICATE_CODE`.

### EC-07: UUID malformado
`400 INVALID_UUID`. Categoría inexistente: `404 SERVICE_CATEGORY_NOT_FOUND`.

---

## 🚫 Validation Rules

| ID | Rule | Behavior |
|---|---|---|
| VR-01 | `:id` UUID válido | `400 INVALID_UUID` |
| VR-02 | `code` string slug [1..64] único | `409 DUPLICATE_CODE` |
| VR-03 | `name_i18n` jsonb con `es-LATAM` requerido | `400 INVALID_NAME_I18N` |
| VR-04 | `description_i18n` opcional jsonb | `400 INVALID_BODY` |
| VR-05 | `parent_id` referencia válida o null | `400 INVALID_PARENT_ID` |
| VR-06 | Jerarquía max 2 niveles | `409 INVALID_HIERARCHY_DEPTH` |
| VR-07 | `sort_order` >= 0 integer | `400 INVALID_SORT_ORDER` |
| VR-08 | `is_active` boolean | `400 INVALID_BODY` |
| VR-09 | DELETE: sin dependencias activas | `409 CATEGORY_IN_USE` / `409 CATEGORY_HAS_CHILDREN` |
| VR-10 | DELETE reason `[10..500]` | `400 REASON_REQUIRED` / `400 INVALID_REASON_LENGTH` |
| VR-11 | Categoría existe | `404 SERVICE_CATEGORY_NOT_FOUND` |
| VR-12 | Admin role (admin endpoints) | `403` |

---

## 🔐 Authorization & Security Rules

| ID | Rule |
|---|---|
| SEC-01 | Admin role para CRUD endpoints |
| SEC-02 | Endpoint público requiere autenticación (cualquier rol) |
| SEC-03 | AdminAction obligatorio por cada operación de mutación |
| SEC-04 | No hard delete físico (FR-SERVICE-003) |
| SEC-05 | `404 SERVICE_CATEGORY_NOT_FOUND` uniforme |
| SEC-06 | Vendor NO puede crear categorías (BR-SERVICE-003 + FR-SERVICE-005) |

### Negative Authorization Scenarios
* Sin sesión → 401 (público y admin); organizer/vendor en admin endpoints → 403.

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
| Screen / Route | `/[locale]/admin/categories` (admin panel) |
| Main UI Pattern | Tree view con drag-and-drop opcional (post-MVP) + form CRUD + dialog confirmación delete |
| Primary Action | "Crear categoría" / "Crear subcategoría" |
| Secondary Actions | "Editar", "Desactivar", "Reactivar" |
| Empty State | "No hay categorías. Crea la primera." |
| Loading State | Skeleton de tree |
| Error State | Banner i18n por código |
| Success State | Toast + actualización del tree |
| Accessibility | Tree con `role="tree"`, items con `role="treeitem"`, dialog accesible |
| Responsive | Mobile-first: tree colapsable |
| i18n | 4 locales (`admin.category.crud.*`, `admin.category.errors.*`) |
| Currency | No aplica |

---

## 🛠 Technical Notes

### Frontend
* Components: `CategoryTreeView`, `CategoryFormDialog` (create/edit), `CategoryDeleteDialog` (con reason).
* State: TanStack mutation + invalidación de `['admin.categories']`.
* Forms: RHF + Zod con i18n input multi-locale.
* API: `adminApi.category.list/create/update/delete`.

### Backend
* Use Cases: `ListServiceCategoriesUseCase` (admin + public variants), `CreateServiceCategoryUseCase`, `UpdateServiceCategoryUseCase`, `SoftDeleteServiceCategoryUseCase`.
* Controllers: admin + público.
* Authorization: AdminRoleGuard (reuso US-067) + authGuard para público.
* Validation: Zod `.strict()`.
* Transaction: Sí (UPDATE/INSERT + AdminAction atómica).

### Database
* Tablas: `service_categories` (read/write), `admin_actions` (insert), `vendor_services` (read for guard).
* Migración menor: verificar columnas `name_i18n jsonb`, `description_i18n jsonb`, `sort_order integer`, `is_active boolean DEFAULT true`, `parent_id uuid NULL FK self-ref`, `code text UNIQUE`. Si faltan, añadir.

### API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/admin/service-categories` | Listado admin (incluye inactivas) |
| POST | `/api/v1/admin/service-categories` | Create |
| PATCH | `/api/v1/admin/service-categories/:id` | Update (name, desc, parent, sort, is_active) |
| DELETE | `/api/v1/admin/service-categories/:id` | Soft delete |
| GET | `/api/v1/service-categories` | Listado público (solo activas) |

### Observability
* Correlation ID: Yes
* Log: `service_category.created/updated/soft_deleted/reactivated` con `adminUserId, categoryId, action, payload snapshot`.
* AdminAction: Yes (obligatoria).

---

## 🧪 Test Scenarios

### Functional
| ID | Scenario | Type |
|---|---|---|
| TS-01 | Create root + AdminAction | Integration |
| TS-02 | Create child (nivel 2) + AdminAction | Integration |
| TS-03 | Update name + sort_order + AdminAction | Integration |
| TS-04 | Soft delete sin dependencias + AdminAction | Integration |
| TS-05 | Reactivar via PATCH is_active=true | Integration |
| TS-06 | Listado admin incluye inactivas; público solo activas | Integration |
| TS-07 | i18n fallback es-LATAM cuando otros faltan | Integration |

### Negative
| ID | Scenario | Expected |
|---|---|---|
| NT-01 | Crear nivel 3 | `409 INVALID_HIERARCHY_DEPTH` |
| NT-02 | Asignar parent a categoría con children | `409 INVALID_HIERARCHY_DEPTH` |
| NT-03 | Delete con vendor_services asociados | `409 CATEGORY_IN_USE` |
| NT-04 | Delete con children activos | `409 CATEGORY_HAS_CHILDREN` |
| NT-05 | name_i18n sin es-LATAM | `400 INVALID_NAME_I18N` |
| NT-06 | Code duplicado | `409 DUPLICATE_CODE` |
| NT-07 | Delete sin reason | `400 REASON_REQUIRED` |
| NT-08 | Sin sesión | `401` |
| NT-09 | Organizer/Vendor en admin endpoints | `403` |

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
* Tree accesible + formularios + dialog.

### Performance
* `< 500ms` p95.

---

## 📊 Business Impact

| Field | Value |
|---|---|
| KPI Affected | Calidad y coherencia del catálogo LATAM |
| Expected Impact | Categorías curadas culturalmente coherentes (BR-SERVICE-004) |
| Success Criteria | 100% acciones auditadas + jerarquía respetada + sin hard delete |
| Academic Demo Value | Gobernanza admin completa del catálogo |

---

## 🧩 Task Breakdown Readiness

* FE: `CategoryTreeView` + `CategoryFormDialog` + `CategoryDeleteDialog` + i18n.
* BE: DTOs + 4 UseCases + Controllers + Logger.
* DB: Verificar/migrar columnas.
* QA: UT, IT (jerarquía + guards + AdminAction), AUTH, A11Y.

---

## ✅ Definition of Ready
* [x] Rol, goal, FRD/UC/BR, permisos, entidades, AC GWT, edge cases, validación, out of scope, deps, UX, API, tests.
* [x] PO/BA validó.

---

## 🏁 Definition of Done
* [ ] 5 endpoints funcionales.
* [ ] Jerarquía 2 niveles enforced.
* [ ] Soft delete con guards.
* [ ] AdminAction por cada op.
* [ ] i18n 4 locales.
* [ ] Tests verdes.

---

## 📝 Notes

* Sin hard delete físico (FR-SERVICE-003).
* Decisión PO 8.1 #18 (jerarquía max 2 niveles).
* Documentation Alignment Required (no bloqueantes) en `management/user-stories/decision-resolutions/US-075-decision-resolution.md`.
