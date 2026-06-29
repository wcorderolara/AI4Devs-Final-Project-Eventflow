# 🧾 User Story: Cambiar mis categorías (máx 5 cambios acumulados)

## 🆔 Metadata

| Field              | Value                                                                       |
| ------------------ | --------------------------------------------------------------------------- |
| ID                 | US-042                                                                      |
| Backlog Item       | PB-P1-025 — Categorías del vendor con tope acumulado (5)                    |
| Epic               | EPIC-VND-001                                                                |
| Feature            | Cambio de categorías con límite y revisión admin                            |
| Module / Domain    | Vendors                                                                     |
| User Role          | Vendor                                                                      |
| Priority           | Must Have                                                                   |
| Status             | Approved                                                                    |
| Owner              | Product Owner / Business Analyst                                            |
| Sprint / Milestone | MVP                                                                         |
| Created Date       | 2026-06-09                                                                  |
| Last Updated       | 2026-06-26                                                                  |
| Approved By        | PO/BA Review                                                                |
| Approval Date      | 2026-06-26                                                                  |
| Ready for Development Tasks | Yes                                                                 |

---

## 🎯 User Story

**As a** proveedor
**I want** poder cambiar el conjunto de categorías de mi perfil con un límite acumulado de 5 cambios
**So that** ajuste mi oferta de servicios sin abusar de la re-categorización y dispare la revisión admin que corresponde (Decisión PO 8.1 #3)

---

## 🧠 Business Context

### Context Summary

El proveedor puede actualizar el conjunto de `service_category_id` asociadas a su `VendorProfile`. Cada cambio aplicado incrementa `vendor_profile.category_change_count` (tope acumulado de 5), actualiza `last_category_change_at`, marca `requires_admin_review=true`, registra un `AdminAction(action='vendor_category_change', actor=vendor)` y, cuando el `status` actual es `approved` o `rejected`, transiciona automáticamente a `pending` en la misma transacción (replicando el patrón de US-041 D2 para cambios mayores). Esta regla previene rotaciones masivas del catálogo y garantiza coherencia con la visibilidad del directorio público.

### PO/BA Decisions Applied

| #  | Decisión                                                                                                                                                                                                                                                                       |
| -- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1 | El backend responde **`409 Conflict` con `error.code='CATEGORY_CHANGE_LIMIT'`** cuando `category_change_count = 5`.                                                                                                                                                              |
| D2 | **Toda mutación del set de categorías** (alta, baja o sustitución de al menos un elemento) marca `requires_admin_review=true` y emite `AdminAction(action='vendor_category_change', actor=vendor)`.                                                                              |
| D3 | Si el `status` es `approved` o `rejected`, la operación transiciona automáticamente `status → pending` en la misma transacción y devuelve `repending=true`. Si el `status` es `pending`, el cambio se aplica sin transición.                                                      |
| D4 | El endpoint permite cambios en `pending`, `approved` y `rejected`. Se **bloquea en `hidden`** con `409 PROFILE_HIDDEN` (consistente con US-041 D3). Si el perfil está soft-deleted (`deleted_at IS NOT NULL`), responde `404`.                                                    |
| D5 | "No cambio" se evalúa por **conjunto** (`Set<service_category_id>`) ignorando orden y duplicados. Igualdad ⇒ `200 OK` con `noop=true`, sin efectos: no incrementa contador, no marca flag, no registra `AdminAction`, no transiciona status.                                     |
| D6 | El set entrante debe cumplir **`1 ≤ size ≤ 5`** y cada `service_category_id` debe existir y estar `active=true` en el catálogo; en caso contrario, `400` con `INVALID_CATEGORIES` o `INVALID_CATEGORY`.                                                                          |

### Related Domain Concepts

* `VendorProfile.category_change_count`
* `VendorProfile.last_category_change_at`
* `VendorProfile.requires_admin_review`
* `VendorProfile.status` (`pending | approved | rejected | hidden`)
* `vendor_profile_categories(vendor_user_id, service_category_id)`
* `ServiceCategory` (catálogo, `active=true`)
* `AdminAction(action='vendor_category_change')`

### Assumptions

* Cada cambio de set distinto al actual cuenta una unidad del contador.
* La comparación "mismo set" usa semántica de conjunto (ignora orden y duplicados).
* El banner UI "Tu perfil pasó a revisión" se reutiliza desde US-041 para el caso `repending=true`.

### Dependencies

* US-040 (creación del `VendorProfile`).
* US-041 (patrón de re-pending automático y endpoint base del vendor).

---

## 🔗 Traceability

| Source                 | Reference                                            |
| ---------------------- | ---------------------------------------------------- |
| FRD Requirement(s)     | FR-VENDOR-004, FR-VENDOR-005                         |
| Use Case(s)            | UC-VENDOR-002                                        |
| Business Rule(s)       | BR-VENDOR-003, BR-VENDOR-004, BR-ADMIN-011           |
| Permission Rule(s)     | Ownership (vendor sobre `VendorProfile` propio)      |
| Data Entity / Entities | VendorProfile, ServiceCategory, AdminAction          |
| API Endpoint(s)        | POST /api/v1/vendors/me/categories                   |
| NFR Reference(s)       | NFR-PERF-001                                         |
| Related ADR(s)         | —                                                    |
| Related Document(s)    | /docs/8.1 (#3), /docs/4 §BR-VENDOR-004, /docs/9 §FR-VENDOR-004/005 |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* Subcategorías ilimitadas.
* Rotación admin del contador `category_change_count` (Future / panel admin).
* UNDO o reversa de un cambio de categorías.
* Cambio de categorías como auto-aprobación (siempre requiere revisión admin).

### Scope Notes

* Tope acumulado estricto de 5 cambios.
* La transición a `pending` solo aplica desde `approved` o `rejected`.
* `hidden` y soft-deleted bloquean la operación.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Cambio válido desde `approved`

**Given** un vendor autenticado con `category_change_count = 2`, `status = 'approved'` y un set actual `{c1, c2, c3}`
**When** envía `POST /api/v1/vendors/me/categories` con set `{c1, c2, c4}` (válido y dentro del catálogo activo)
**Then** el backend, en una sola transacción:
- persiste el nuevo set en `vendor_profile_categories`,
- incrementa `category_change_count` a `3`,
- actualiza `last_category_change_at = NOW()`,
- marca `requires_admin_review = true`,
- transiciona `status` a `'pending'`,
- inserta `AdminAction(action='vendor_category_change', actor=vendor)`,
- emite log `vendor.category.changed` con `correlation_id`,
- responde `200 OK` con `{ category_change_count: 3, requires_admin_review: true, repending: true, status: 'pending' }`.

### AC-02: Límite alcanzado

**Given** un vendor con `category_change_count = 5`
**When** envía un set distinto al actual
**Then** el backend responde `409 Conflict` con `{ error: { code: 'CATEGORY_CHANGE_LIMIT', message_key: 'vendor.category.limit_reached' } }`, el contador permanece en `5`, el set no se modifica, no se registra `AdminAction`, no hay transición de status.

### AC-03: Cambio válido desde `pending` (sin transición)

**Given** un vendor con `category_change_count = 0` y `status = 'pending'`
**When** envía un set distinto
**Then** el backend persiste el cambio, incrementa el contador a `1`, marca `requires_admin_review = true`, inserta `AdminAction`, **no transiciona** (status sigue `pending`), responde `200 OK` con `{ repending: false, status: 'pending' }`.

### AC-04: Cambio válido desde `rejected` (transición a `pending`)

**Given** un vendor con `status = 'rejected'`
**When** envía un set distinto y válido
**Then** el backend aplica el cambio, incrementa el contador, marca `requires_admin_review = true`, transiciona `status` a `'pending'`, inserta `AdminAction`, responde `200 OK` con `{ repending: true, status: 'pending' }`.

---

## ⚠️ Edge Cases

### EC-01: "No cambio" (mismo set)

**Given** un vendor con set `{c1, c2}` y `category_change_count = 2`
**When** envía un set con los mismos `service_category_id` (en cualquier orden, con o sin duplicados, p. ej. `[c2, c1, c1]`)
**Then** el backend responde `200 OK` con `{ noop: true, category_change_count: 2 }`, **sin** modificar el set, el contador, `last_category_change_at`, `requires_admin_review`, sin emitir `AdminAction` ni transicionar status.

#### Handling

* Backend normaliza el payload a `Set<service_category_id>` y compara con el set persistido.

### EC-02: Perfil oculto (`hidden`)

**Given** un vendor con `status = 'hidden'`
**When** intenta cambiar categorías
**Then** el backend responde `409 Conflict` con `{ error: { code: 'PROFILE_HIDDEN' } }`, sin efectos.

### EC-03: Perfil soft-deleted

**Given** un vendor con `deleted_at IS NOT NULL`
**When** intenta cambiar categorías
**Then** el backend responde `404 Not Found`, sin efectos.

### EC-04: Cardinalidad inválida

**Given** un vendor que envía un set con `size = 0` o `size > 5`
**When** el backend evalúa la validación
**Then** responde `400 Bad Request` con `{ error: { code: 'INVALID_CATEGORIES' } }`.

### EC-05: Categoría inexistente o inactiva

**Given** un vendor que envía un `service_category_id` que no existe o tiene `active=false`
**When** el backend evalúa la validación
**Then** responde `400 Bad Request` con `{ error: { code: 'INVALID_CATEGORY', details: { unknown_or_inactive: [...] } } }`.

---

## 🚫 Validation Rules

| ID    | Rule                                                                                | Message / Behavior                                                                    |
| ----- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| VR-01 | El set entrante tiene `1 ≤ size ≤ 5` `service_category_id` distintos.               | `400 INVALID_CATEGORIES`.                                                              |
| VR-02 | `category_change_count <= 5` antes de aplicar el cambio.                            | `409 CATEGORY_CHANGE_LIMIT`.                                                            |
| VR-03 | `status != 'hidden'`.                                                                | `409 PROFILE_HIDDEN`.                                                                   |
| VR-04 | `deleted_at IS NULL`.                                                                 | `404`.                                                                                  |
| VR-05 | Cada `service_category_id` existe y `active=true` en el catálogo.                    | `400 INVALID_CATEGORY` con `details.unknown_or_inactive`.                              |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                          |
| ------ | --------------------------------------------------------------------------------------------- |
| SEC-01 | Ownership: solo el vendor autenticado puede modificar su propio `VendorProfile`.              |
| SEC-02 | Emite log `vendor.category.changed` con `correlation_id`, `vendor_user_id`, `before`, `after`. |
| SEC-03 | Inserta `AdminAction(action='vendor_category_change', actor=vendor)` cuando aplica el cambio. |
| SEC-04 | Bloquea operación cuando `status='hidden'` o `deleted_at IS NOT NULL`.                         |

### Negative Authorization Scenarios

* Sesión no autenticada → `401`.
* Vendor autenticado modificando perfil ajeno → `403` (política unificada del proyecto, ver docs/19).
* Vendor con perfil soft-deleted → `404`.
* Vendor con perfil `hidden` → `409 PROFILE_HIDDEN`.

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
| Screen / Route      | `/[locale]/vendor/profile/edit/categories`                                                     |
| Main UI Pattern     | Multi-select de categorías + contador visible "Cupo restante: N/5" + CTA "Solicitar cambio"     |
| Primary Action      | "Solicitar cambio"                                                                              |
| Secondary Actions   | Cancelar                                                                                        |
| Empty State         | No aplica                                                                                       |
| Loading State       | Spinner en CTA + disable de submit durante request                                              |
| Error State         | Banner accesible con código y mensaje i18n (`CATEGORY_CHANGE_LIMIT`, `PROFILE_HIDDEN`, `INVALID_CATEGORIES`, `INVALID_CATEGORY`) |
| Success State       | Toast i18n; si `repending=true`, banner reutilizado de US-041 "Tu perfil pasó a revisión por cambio de categorías" |
| Accessibility Notes | Contador con `aria-live="polite"`; CTA deshabilitado cuando `category_change_count=5` con `aria-describedby` que explica el bloqueo |
| Responsive Notes    | Mobile-first                                                                                    |
| i18n Notes          | 4 locales: `es-LATAM`, `es-ES`, `pt`, `en`                                                     |
| Currency Notes      | No aplica                                                                                       |

---

## 🛠 Technical Notes

### Frontend

* Route / Page:
  * Editor de categorías del perfil del vendor.
* Components:
  * `CategoryChangeForm` (multi-select + contador + CTA).
  * Reuso del banner `RependingNotice` introducido en US-041.
* State Management:
  * TanStack Query (mutation + invalidación de `vendor.me`).
* Forms:
  * Zod schema (`size 1..5`, `service_category_id` válidos).
* API Client:
  * `vendorsApi.changeCategories(payload)`.

### Backend

* Use Case / Service:
  * `ChangeVendorCategoriesUseCase` (en módulo Vendors).
* Controller / Route:
  * `POST /api/v1/vendors/me/categories`.
* Authorization Policy:
  * Ownership (vendor autenticado sobre su propio `VendorProfile`).
* Validation:
  * Zod (cardinalidad y forma) + verificación del catálogo activo + verificación del estado del perfil.
* Transaction Required:
  * Sí. `prisma.$transaction` aplica diff (delete + insert), incrementa `category_change_count`, actualiza `last_category_change_at`, setea `requires_admin_review=true`, transiciona `status` cuando aplique e inserta `AdminAction`.

### Database

* Main Tables:
  * `vendor_profile`, `vendor_profile_categories`, `admin_action`.
* Columns:
  * `vendor_profile.category_change_count INT NOT NULL DEFAULT 0` con `CHECK (category_change_count BETWEEN 0 AND 5)`.
  * `vendor_profile.last_category_change_at TIMESTAMPTZ NULL`.
  * `vendor_profile.requires_admin_review BOOLEAN NOT NULL DEFAULT FALSE`.
* Constraints:
  * `UNIQUE (vendor_user_id, service_category_id)` en `vendor_profile_categories`.
* Index Considerations:
  * Índice por `vendor_user_id` en `vendor_profile_categories`.

### API

| Method | Endpoint                                          | Purpose                                                                                              |
| ------ | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| POST   | `/api/v1/vendors/me/categories`                   | Cambia el set de categorías. Body: `{ service_category_ids: string[] }`. Response: `{ category_change_count, requires_admin_review, repending, noop?, status }`. Errores: `400 INVALID_CATEGORIES`, `400 INVALID_CATEGORY`, `401`, `403`, `404`, `409 PROFILE_HIDDEN`, `409 CATEGORY_CHANGE_LIMIT`. |

### Observability / Audit

* Correlation ID Required: Yes
* Log Event Required: Yes (`vendor.category.changed`)
* AdminAction Required: Yes (`action='vendor_category_change'` cuando se aplica el cambio)
* AIRecommendation Required: No

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                              | Type        |
| ----- | ------------------------------------------------------------------------------------- | ----------- |
| TS-01 | Cambio válido desde `approved` incrementa contador y transiciona a `pending`.         | Integration |
| TS-02 | Sexto intento bloqueado con `409 CATEGORY_CHANGE_LIMIT`.                              | Integration |
| TS-03 | Cambio inserta `AdminAction(action='vendor_category_change')`.                        | Integration |
| TS-04 | Payload con mismo set en distinto orden retorna `200` con `noop=true`.                | Integration |
| TS-05 | Cambio desde `pending` no transiciona status.                                         | Integration |
| TS-06 | Cambio desde `rejected` transiciona a `pending`.                                      | Integration |

### Negative Tests

| ID    | Scenario                                              | Expected Result                  |
| ----- | ----------------------------------------------------- | -------------------------------- |
| NT-01 | Otro vendor intenta modificar perfil ajeno.            | `403`                            |
| NT-02 | `service_category_id` inexistente o `active=false`.    | `400 INVALID_CATEGORY`           |
| NT-03 | Cardinalidad fuera de `[1,5]`.                          | `400 INVALID_CATEGORIES`         |
| NT-04 | Perfil con `status='hidden'`.                          | `409 PROFILE_HIDDEN`             |
| NT-05 | Perfil con `deleted_at IS NOT NULL`.                   | `404`                            |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario                            | Expected Result            |
| ---------- | ----------------------------------- | -------------------------- |
| AUTH-TS-01 | Vendor sobre su propio perfil       | `200`                      |
| AUTH-TS-02 | Otro vendor sobre perfil ajeno      | `403`                      |
| AUTH-TS-03 | Vendor sobre perfil `hidden`        | `409 PROFILE_HIDDEN`       |
| AUTH-TS-04 | Vendor sobre perfil soft-deleted    | `404`                      |
| AUTH-TS-05 | Sin sesión                          | `401`                      |

### Accessibility Tests

* Contador con `aria-live="polite"` anuncia el cupo restante.
* CTA deshabilitado al alcanzar el límite con `aria-describedby` que explica el bloqueo.
* Banner de éxito y banner de "repending" navegables por teclado.

---

## 📊 Business Impact

| Field               | Value                                                  |
| ------------------- | ------------------------------------------------------ |
| KPI Affected        | Calidad del catálogo de vendors y confianza del directorio público. |
| Expected Impact     | Previene rotaciones abusivas de categoría; garantiza revisión admin. |
| Success Criteria    | Límite enforced server-side; cada cambio audita `AdminAction`. |
| Academic Demo Value | Demuestra la regla de negocio Decisión PO 8.1 #3 con auditoría completa. |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* `CategoryChangeForm` con multi-select y contador accesible.
* Integración con `vendorsApi.changeCategories` y manejo de estados (loading, error, success, noop, repending).
* i18n de mensajes en 4 locales.

### Potential Backend Tasks

* DTO Zod y validación de cardinalidad.
* `ChangeVendorCategoriesUseCase` con `prisma.$transaction` (diff + contador + flag + status + AdminAction).
* Adapter `AdminActionWritePort` (reuso del introducido en US-041).
* Controller `POST /api/v1/vendors/me/categories` con logger.

### Potential Database Tasks

* Confirmar/agregar columnas `category_change_count`, `last_category_change_at`, `requires_admin_review` con `CHECK (category_change_count BETWEEN 0 AND 5)` (puede haberse cubierto en US-040).
* Confirmar índice y `UNIQUE` en `vendor_profile_categories`.

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* Tests de integración para AC-01..AC-04, EC-01..EC-05, NT-01..NT-05, AUTH-TS-01..AUTH-TS-05.
* Test de accesibilidad para CTA deshabilitado y contador.

### Potential DevOps / Config Tasks

* Not applicable for this story.

---

## ✅ Definition of Ready

* [x] Rol claro.
* [x] Goal/valor claros.
* [x] FRD/UC/BR enlazados (FR-VENDOR-004/005, UC-VENDOR-002, BR-VENDOR-003/004, BR-ADMIN-011).
* [x] Permisos identificados.
* [x] Entidades listadas.
* [x] AC en GWT.
* [x] Edge cases documentados.
* [x] Validación clara.
* [x] Out of Scope explícito.
* [x] Dependencias conocidas.
* [x] UX states identificados.
* [x] API definida (request, response, error codes).
* [x] Tests definidos.
* [x] PO/BA validó.

---

## 🏁 Definition of Done

* [ ] Endpoint funcional con tope acumulado y validación de catálogo.
* [ ] Transacción única aplica diff, contador, flag, transición y `AdminAction`.
* [ ] Banner UI "repending" reutilizado de US-041 en 4 locales.
* [ ] Contador accesible con `aria-live`.
* [ ] Tests verdes (functional, negative, auth, accessibility).
* [ ] Auditoría `AdminAction(action='vendor_category_change')` registrada.
* [ ] PO valida demo en `pending`, `approved` y `rejected`.

---

## 📝 Notes

* Documentation Alignment Required (no bloqueantes) registradas en `management/user-stories/decision-resolutions/US-042-decision-resolution.md §5`: actualizar `docs/9 FR-VENDOR-004`, `docs/8 UC-VENDOR-002 E2` y `docs/4 BR-VENDOR-004` con los códigos/alcance acordados; documentar el endpoint en `docs/16 §M07`.
