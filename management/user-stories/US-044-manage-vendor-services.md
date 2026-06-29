# 🧾 User Story: Gestionar mis paquetes / servicios (CRUD VendorService)

## 🆔 Metadata

| Field              | Value                                                                       |
| ------------------ | --------------------------------------------------------------------------- |
| ID                 | US-044                                                                      |
| Backlog Item       | PB-P1-027 — VendorService (paquetes)                                        |
| Epic               | EPIC-VND-001                                                                |
| Feature            | CRUD VendorService con soft delete via `is_active`                          |
| Module / Domain    | Vendors                                                                     |
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

**As a** proveedor
**I want** listar, crear, editar y eliminar (soft) mis paquetes con nombre, categoría, precio base y descripción
**So that** mi catálogo se mantenga actualizado y visible en mi perfil público cuando esté aprobado

---

## 🧠 Business Context

### Context Summary

CRUD del `VendorService` (`docs/18 §15.2`): `package_name`, `description`, `base_price`, `currency_code`, `service_category_id`, `is_active`. El precio es referencial (BR-SERVICE-006); la cotización formal se da por `Quote`. Cada paquete tiene su propia moneda. La eliminación es lógica vía `is_active=false`; hard delete prohibido. El servicio sólo es visible públicamente cuando `is_active=true` AND `vendor_profile.status='approved'` AND `vendor_profile.deleted_at IS NULL` (BR-SERVICE-001 + BR-VENDOR-001).

### PO/BA Decisions Applied

| #  | Decisión                                                                                                                                                                                                                                       |
| -- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1 | CRUD permitido en `vendor_profile.status ∈ {pending, approved, rejected}`. Bloqueado en `hidden` (`409 PROFILE_HIDDEN`) y soft-deleted del perfil (`404`). Visibilidad pública sólo si `is_active=true` Y `status='approved'` Y `deleted_at IS NULL`. |
| D2 | Soft delete vía `is_active=false`. DELETE responde `204`. Reactivación vía `PATCH` con `{ "is_active": true }`. Hard delete no expuesto en MVP.                                                                                                |
| D3 | `GET /api/v1/vendors/me/services` retorna todos los servicios del vendor (activos e inactivos) ordenados por `created_at desc`. Sin paginación MVP.                                                                                            |
| D4 | `currency_code` requerido en POST; opcional en PATCH. Validado contra enum del schema (mínimo `GTQ`, `EUR`, `MXN`, `COP`, `USD`). Inválido ⇒ `400 INVALID_CURRENCY`.                                                                            |
| D5 | Máximo **50** `VendorService` activos por vendor. Excedido ⇒ `409 SERVICE_LIMIT_REACHED`. Inactivos no cuentan.                                                                                                                                |
| D6 | `package_name` ∈ `[2..150]` chars (trim previo). `description` ∈ `[10..2000]` chars. Inválido ⇒ `400 INVALID_PACKAGE_NAME` o `400 INVALID_DESCRIPTION`.                                                                                       |

### Related Domain Concepts

* `vendor_services` (PB-P0-001).
* `service_categories` (con `is_active=true` requerido).
* `currency_code` enum.

### Assumptions

* Precio es referencial (BR-SERVICE-006); no representa cotización oficial.
* Catálogo de categorías es admin-curado (BR-SERVICE-003).
* `ai_generated_description` persiste `false` por defecto en este flujo (US-023 cubrirá AI).

### Dependencies

* US-040 (creación del `VendorProfile`).
* PB-P0-001 (schema `vendor_services`, `service_categories`).
* PB-P0-003 (error envelope).
* US-045/US-047 (consumirán los servicios para directorio público).

---

## 🔗 Traceability

| Source                 | Reference                                                                                       |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| FRD Requirement(s)     | FR-VENDOR-009                                                                                   |
| Use Case(s)            | UC-VENDOR-004                                                                                   |
| Business Rule(s)       | BR-SERVICE-001, BR-SERVICE-002, BR-SERVICE-003, BR-SERVICE-006, BR-AUTH-007                     |
| Permission Rule(s)     | Ownership (vendor sobre su propio `VendorProfile`)                                              |
| Data Entity / Entities | VendorService, ServiceCategory, VendorProfile                                                   |
| API Endpoint(s)        | GET/POST/PATCH/DELETE /api/v1/vendors/me/services[/:id]                                         |
| NFR Reference(s)       | NFR-PERF-001, NFR-OBS-005                                                                       |
| Related ADR(s)         | —                                                                                                |
| Related Document(s)    | /docs/4 §BR-SERVICE-*, /docs/8 §UC-VENDOR-004, /docs/9 §FR-VENDOR-009, /docs/18 §15.2          |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* Variantes complejas por categoría.
* Hard delete físico.
* Reordenamiento drag-and-drop.
* Bulk operations.
* CRUD de `ServiceCategory` (admin, fuera de US-044).
* AI description generation (US-023).
* Reactivación masiva.

### Scope Notes

* Cap defensivo de 50 activos por vendor.
* Catálogo de categorías es admin-curado.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01a: Crear servicio

**Given** un vendor autenticado con `vendor_profile.status ∈ {pending,approved,rejected}`, `deleted_at IS NULL`, con menos de 50 servicios activos
**When** envía `POST /api/v1/vendors/me/services` con `{ "package_name": "Paquete Boda Premium", "description": "...", "base_price": "15000.00", "currency_code": "GTQ", "service_category_id": "<uuid>" }`
**Then** el backend:
- valida cardinalidad, longitudes, currency, categoría activa,
- inserta `vendor_services(id, vendor_profile_id, package_name, description, base_price, currency_code, service_category_id, is_active=true, ai_generated_description=false)`,
- emite log `vendor.service.created`,
- responde `201 Created` con el recurso.

### AC-01b: Editar servicio

**Given** un vendor con un servicio propio
**When** envía `PATCH /api/v1/vendors/me/services/:id` con uno o más campos válidos
**Then** el backend persiste los cambios, emite log `vendor.service.updated`, responde `200 OK` con el recurso actualizado. Si el body incluye `{ "is_active": true }` y se excedería el tope (D5), responde `409 SERVICE_LIMIT_REACHED`.

### AC-01c: Soft delete (desactivar)

**Given** un servicio activo propio
**When** envía `DELETE /api/v1/vendors/me/services/:id`
**Then** el backend actualiza `is_active=false`, emite log `vendor.service.deactivated`, responde `204 No Content`.

### AC-01d: Listar servicios del vendor

**Given** un vendor autenticado
**When** envía `GET /api/v1/vendors/me/services`
**Then** el backend retorna `200 OK` con `{ items: [...] }` ordenado por `created_at desc` incluyendo activos e inactivos.

---

## ⚠️ Edge Cases

### EC-01: Precio negativo

**Given** body con `base_price < 0`
**When** backend valida
**Then** `400 INVALID_PRICE`.

#### Handling

* Zod `.gte(0)` + CHECK constraint en DB.

### EC-02: Categoría inexistente o inactiva

**Given** `service_category_id` no existe o `is_active=false`
**When** backend valida
**Then** `400 INVALID_CATEGORY` con `details.unknown_or_inactive: [...]`.

### EC-03: Currency inválida

**Given** `currency_code` fuera del enum
**When** backend valida
**Then** `400 INVALID_CURRENCY`.

### EC-04: Tope alcanzado

**Given** vendor con 50 servicios activos
**When** intenta crear o reactivar uno más
**Then** `409 SERVICE_LIMIT_REACHED`.

### EC-05: `package_name` o `description` fuera de rango

**Given** longitudes inválidas
**When** backend valida
**Then** `400 INVALID_PACKAGE_NAME` o `400 INVALID_DESCRIPTION`.

### EC-06: Perfil `hidden`

**Given** vendor con `status='hidden'`
**When** intenta cualquier operación CRUD
**Then** `409 PROFILE_HIDDEN`.

### EC-07: Perfil soft-deleted

**Given** vendor con `deleted_at IS NOT NULL`
**When** intenta cualquier operación CRUD
**Then** `404`.

### EC-08: Servicio ajeno o inexistente

**Given** `:id` ajeno o inexistente
**When** PATCH/DELETE
**Then** `404 SERVICE_NOT_FOUND`.

### EC-09: Idempotencia DELETE sobre servicio ya inactivo

**Given** servicio con `is_active=false`
**When** DELETE
**Then** `204 No Content` (idempotente; permanece inactivo).

---

## 🚫 Validation Rules

| ID    | Rule                                                              | Message / Behavior                              |
| ----- | ----------------------------------------------------------------- | ----------------------------------------------- |
| VR-01 | `package_name` ∈ `[2..150]` chars                                  | `400 INVALID_PACKAGE_NAME`                      |
| VR-02 | `base_price >= 0` (precision `numeric(14,2)`)                      | `400 INVALID_PRICE`                             |
| VR-03 | `service_category_id` existe y `is_active=true`                    | `400 INVALID_CATEGORY`                          |
| VR-04 | `currency_code` ∈ enum del schema                                  | `400 INVALID_CURRENCY`                          |
| VR-05 | `COUNT(*) WHERE vendor_profile_id=? AND is_active=true < 50`        | `409 SERVICE_LIMIT_REACHED`                     |
| VR-06 | `description` ∈ `[10..2000]` chars                                  | `400 INVALID_DESCRIPTION`                       |
| VR-07 | `vendor_profile.status != 'hidden'`                                 | `409 PROFILE_HIDDEN`                            |
| VR-08 | `vendor_profile.deleted_at IS NULL`                                 | `404`                                            |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                          |
| ------ | --------------------------------------------------------------------------------------------- |
| SEC-01 | Ownership: vendor sobre sus propios `VendorService`.                                          |
| SEC-02 | Política por status del `VendorProfile` (D1).                                                 |
| SEC-03 | Visibilidad pública: sólo `is_active=true` AND perfil `approved` AND `deleted_at IS NULL`.    |
| SEC-04 | Servicio ajeno o inexistente: `404 SERVICE_NOT_FOUND` (no revela existencia / ownership).    |

### Negative Authorization Scenarios

* Sin sesión → `401`.
* `admin`/`organizer` → `403`.
* Vendor sobre servicio ajeno → `404 SERVICE_NOT_FOUND`.
* Vendor con `hidden` → `409 PROFILE_HIDDEN`.
* Vendor soft-deleted → `404`.

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
| Screen / Route      | `/[locale]/vendor/services`                                                                     |
| Main UI Pattern     | Tabla con inline edit + modal de creación + toggle `is_active` + contador "N/50".              |
| Primary Action      | "Agregar paquete"                                                                              |
| Secondary Actions   | "Editar", "Desactivar", "Reactivar"                                                            |
| Empty State         | "Aún no tienes paquetes. Crea tu primero para que aparezca en tu perfil público (cuando seas aprobado)." |
| Loading State       | Skeleton de tabla.                                                                              |
| Error State         | Banner accesible con código i18n (`INVALID_*`, `SERVICE_LIMIT_REACHED`, `PROFILE_HIDDEN`, `SERVICE_NOT_FOUND`). |
| Success State       | Toast i18n + tabla actualizada.                                                                 |
| Accessibility Notes | Tabla con `<th scope="col">` + `aria-live` para el contador; modal de creación accesible.       |
| Responsive Notes    | Mobile-first; tabla colapsa a cards en mobile.                                                  |
| i18n Notes          | 4 locales: `es-LATAM`, `es-ES`, `pt`, `en`.                                                    |
| Currency Notes      | Selector de moneda por servicio; mostrar código junto al precio.                              |

---

## 🛠 Technical Notes

### Frontend

* Route / Page:
  * `app/[locale]/vendor/services/page.tsx`.
* Components:
  * `VendorServiceTable` (tabla con inline edit).
  * `CreateServiceDialog` (modal con form).
  * `DeactivateServiceDialog` (confirmación accesible).
* State Management:
  * TanStack Query (lista + mutations).
* Forms:
  * RHF + Zod espejo del backend.
* API Client:
  * `vendorsApi.services.list/create/update/deactivate`.

### Backend

* Use Case / Service:
  * `CreateVendorServiceUseCase`, `UpdateVendorServiceUseCase`, `DeactivateVendorServiceUseCase`, `ListVendorServicesUseCase`.
* Controller / Route:
  * `VendorServiceController` con 4 handlers.
  * Rutas: `GET/POST/PATCH/DELETE /api/v1/vendors/me/services[/:id]`.
* Authorization Policy:
  * Ownership.
* Validation:
  * Zod + verificación de catálogo activo + política por status del perfil.
* Transaction Required:
  * No (operaciones de un único update/insert).

### Database

* Main Tables:
  * `vendor_services`, `service_categories` (lectura), `vendor_profiles` (lectura).
* Constraints:
  * `base_price >= 0` (CHECK existente).
  * FK `service_category_id → service_categories.id` (ON DELETE RESTRICT).
* Index Considerations:
  * Reuso de `idx_vendor_services_vendor_profile_id`, `idx_vendor_services_active` y `idx_vendor_services_service_category_id`.

### API

| Method | Endpoint                                              | Purpose                              |
| ------ | ----------------------------------------------------- | ------------------------------------ |
| GET    | `/api/v1/vendors/me/services`                         | Listar servicios del vendor.         |
| POST   | `/api/v1/vendors/me/services`                         | Crear servicio.                      |
| PATCH  | `/api/v1/vendors/me/services/:id`                     | Editar (incluye reactivar).          |
| DELETE | `/api/v1/vendors/me/services/:id`                     | Soft delete (set `is_active=false`). |

### Observability / Audit

* Correlation ID Required: Yes
* Log Event Required: Yes (`vendor.service.created`, `vendor.service.updated`, `vendor.service.deactivated`).
* AdminAction Required: No
* AIRecommendation Required: No

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                  | Type        |
| ----- | ------------------------------------------------------------------------- | ----------- |
| TS-01 | POST crea servicio con `is_active=true`.                                  | Integration |
| TS-02 | PATCH actualiza campos y emite log.                                       | Integration |
| TS-03 | DELETE setea `is_active=false`; GET lo retorna marcado inactivo.          | Integration |
| TS-04 | PATCH `{ is_active: true }` reactiva si tope no se excede.                | Integration |
| TS-05 | GET retorna activos e inactivos ordenados `created_at desc`.              | Integration |
| TS-06 | Visibilidad pública: servicio sólo aparece si `is_active=true` Y perfil `approved`. | Integration |

### Negative Tests

| ID    | Scenario                                              | Expected Result                  |
| ----- | ----------------------------------------------------- | -------------------------------- |
| NT-01 | `base_price < 0`                                       | `400 INVALID_PRICE`              |
| NT-02 | Categoría inexistente o `is_active=false`              | `400 INVALID_CATEGORY`           |
| NT-03 | `currency_code` fuera del enum                         | `400 INVALID_CURRENCY`           |
| NT-04 | 51º servicio activo                                    | `409 SERVICE_LIMIT_REACHED`      |
| NT-05 | `package_name` fuera de `[2..150]`                     | `400 INVALID_PACKAGE_NAME`       |
| NT-06 | `description` fuera de `[10..2000]`                    | `400 INVALID_DESCRIPTION`        |
| NT-07 | Servicio ajeno o `:id` inexistente                     | `404 SERVICE_NOT_FOUND`          |
| NT-08 | Vendor con `status='hidden'`                          | `409 PROFILE_HIDDEN`             |
| NT-09 | Vendor soft-deleted                                   | `404`                            |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario                            | Expected Result            |
| ---------- | ----------------------------------- | -------------------------- |
| AUTH-TS-01 | Dueño / `approved`                  | `200`/`201`/`204`          |
| AUTH-TS-02 | Dueño / `pending`                   | `200`/`201`/`204`          |
| AUTH-TS-03 | Dueño / `rejected`                  | `200`/`201`/`204`          |
| AUTH-TS-04 | Dueño / `hidden`                    | `409 PROFILE_HIDDEN`       |
| AUTH-TS-05 | Dueño / soft-deleted                | `404`                      |
| AUTH-TS-06 | Otro vendor                         | `404 SERVICE_NOT_FOUND`    |
| AUTH-TS-07 | Sin sesión                          | `401`                      |
| AUTH-TS-08 | `admin`/`organizer`                 | `403`                      |

### Accessibility Tests

* Tabla con headers semánticos.
* Modal de creación con `role="dialog"`, focus trap, ESC.
* Modal de desactivar accesible.
* Contador "N/50" con `aria-live`.

---

## 📊 Business Impact

| Field               | Value                                                  |
| ------------------- | ------------------------------------------------------ |
| KPI Affected        | Conversión a QuoteRequest.                              |
| Expected Impact     | Catálogo de servicios estructurado y mantenible.       |
| Success Criteria    | < 1% errores en CRUD; visibilidad pública correcta.    |
| Academic Demo Value | Demuestra CRUD con soft delete `is_active` + ownership. |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Page + Tabla + Create dialog + Deactivate dialog.
* `vendorsApi.services.*` + MSW.
* i18n 4 locales.

### Potential Backend Tasks

* 4 use cases.
* DTOs Zod (POST estricto, PATCH parcial).
* Repository extensions (5 métodos).
* Controller + ruta.
* Logger extension.

### Potential Database Tasks

* Verificación documental.

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* TS, NT, AUTH-TS, A11Y, contract.

### Potential DevOps / Config Tasks

* Not applicable for this story.

---

## ✅ Definition of Ready

* [x] Rol claro.
* [x] Goal/valor claros.
* [x] FRD/UC/BR enlazados (FR-VENDOR-009, UC-VENDOR-004, BR-SERVICE-001/002/003/006).
* [x] Permisos identificados.
* [x] Entidades listadas.
* [x] AC en GWT.
* [x] Edge cases documentados.
* [x] Validación clara.
* [x] Out of Scope explícito.
* [x] Dependencias conocidas.
* [x] UX states identificados.
* [x] API definida (4 endpoints).
* [x] Tests definidos.
* [x] PO/BA validó.

---

## 🏁 Definition of Done

* [ ] 4 endpoints funcionales con todas las validaciones.
* [ ] Soft delete via `is_active=false`; reactivación vía PATCH.
* [ ] Tests verdes (functional, negative, auth, accessibility, contract).
* [ ] Logs estructurados con `correlation_id`.
* [ ] i18n de mensajes en 4 locales.
* [ ] PO valida demo (CRUD + visibilidad pública).

---

## 📝 Notes

* Visibilidad pública vive en US-045/US-047 (directorio y perfil público).
* Documentation Alignment Required (no bloqueantes) registradas en `management/user-stories/decision-resolutions/US-044-decision-resolution.md §5`: documentar 4 endpoints en `docs/16 §M07`.
