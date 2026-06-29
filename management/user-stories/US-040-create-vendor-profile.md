# 🧾 User Story: Crear mi VendorProfile (status=pending)

## 🆔 Metadata

| Field              | Value                                                |
| ------------------ | ---------------------------------------------------- |
| ID                 | US-040                                               |
| Epic               | EPIC-VND-001 — Vendor Directory & Profile            |
| Backlog Item       | PB-P1-024                                            |
| Feature            | Creación de perfil de proveedor                      |
| Module / Domain    | Vendors                                              |
| User Role          | Vendor                                               |
| Priority           | Must Have                                            |
| Status             | Approved with Minor Notes                            |
| Owner              | Product Owner / Business Analyst                     |
| Approved By        | PO/BA Review                                         |
| Approval Date      | 2026-06-27                                           |
| Ready for Development Tasks | Yes                                         |
| Sprint / Milestone | MVP                                                  |
| Created Date       | 2026-06-09                                           |
| Last Updated       | 2026-06-27                                           |

---

## 🎯 User Story

**As a** proveedor registrado
**I want** crear mi VendorProfile con datos comerciales mínimos, categorías, idiomas atendidos y ciudad
**So that** quede en cola de revisión del admin y, una vez aprobado, visible en el directorio público vía slug

---

## 🧠 Business Context

### Context Summary

Tras el registro de vendor (US-002), el usuario crea su `VendorProfile` con `POST /api/v1/vendors/me`. El handler valida los campos mínimos exigidos por `BR-VENDOR-002` (business_name, bio, location_id, languages_supported, categories), genera slug único server-side y persiste `status='pending'` directamente (D1). Emite log estructurado `vendor.profile.created` que el dashboard admin (US-016 / módulo Admin futuro) consume para encolar la revisión (D3). El perfil queda invisible al directorio público hasta que el admin lo apruebe (`UC-ADMIN-004`).

### Related Domain Concepts

* `VendorProfile { status: pending | approved | rejected | hidden }` (`docs/6 §VendorStatus`).
* `ServiceCategory` (catálogo curado por admin; vendors no lo modifican).
* `Location` (catálogo ciudad/país).
* `LanguageCode` (catálogo de idiomas soportados por la plataforma).

### Assumptions

* Estado inicial `pending` (D1).
* Cap inicial 1-3 categorías (D2); el contador `category_change_count` para cambios futuros vive en US-042.
* Bio 50-1000 chars (D4).
* Slug auto-generado e inmutable en US-040 (D5).
* Notificación al admin vía log estructurado en MVP (D3); entidad Notification es US futura.

### Dependencies

* US-002 — registro del usuario con rol `vendor`.
* US-016 — admin queue consume el log o consulta `GET /vendors?status=pending` (US futura).
* US-041 — edición del perfil + flujo `submit-approval` cuando `status='rejected'`.
* US-042 — contador `category_change_count ≤ 5` para cambios post-aprobación.
* Catálogos: `Location`, `ServiceCategory`, `LanguageCode` (entregados por PB-P0-001 y módulo Admin).

### PO/BA Decisions Applied

| ID | Decisión                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Resolución |
| -- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| D1 | Estado inicial                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `POST /vendors/me` crea con `status='pending'` directamente. `POST /vendors/me/submit-approval` queda para US-041 (re-submit tras `rejected`). |
| D2 | Cap categorías iniciales                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `1 ≤ categories.length ≤ 3`. El contador `category_change_count = 0` al crear; cambios post-aprobación viven en US-042.                            |
| D3 | Notificación al admin                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Log estructurado `vendor.profile.created` con campos canónicos. La entidad `Notification` in-app dirigida al admin queda Out of Scope (US futura).  |
| D4 | Bio mínimo                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `50 ≤ bio.length ≤ 1000`.                                                                                                                          |
| D5 | Slug auto-generado                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `slug = slugify(business_name)` con desambiguación numérica si colisiona. Persistido en US-040, inmutable; ediciones de slug viven en US-041 si aplica. |

Referencia completa: `management/user-stories/decision-resolutions/US-040-decision-resolution.md`.

---

## 🔗 Traceability

| Source                 | Reference                                                                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| FRD Requirement(s)     | FR-VENDOR-001 (crear perfil) · FR-VENDOR-010 (ciclo de vida)                                                                              |
| Use Case(s)            | UC-VENDOR-001                                                                                                                            |
| Business Rule(s)       | BR-VENDOR-001 (visibilidad por status) · BR-VENDOR-002 (datos mínimos) · BR-VENDOR-003 (estados) · BR-SERVICE-003 (vendors no crean categorías) |
| Permission Rule(s)     | Vendor crea su propio perfil; `VendorRoleGuard` + ownership por sesión                                                                    |
| Data Entity / Entities | `VendorProfile` · `ServiceCategory` · `Location` · `LanguageCode`                                                                          |
| API Endpoint(s)        | `POST /api/v1/vendors/me`                                                                                                                |
| NFR Reference(s)       | NFR-PERF-001 (P95 < 1.5 s)                                                                                                                |
| Related ADR(s)         | —                                                                                                                                        |
| Related Document(s)    | `/docs/4 §BR-VENDOR-001..003 §BR-SERVICE-003` · `/docs/6 §VendorProfile §Location §ServiceCategory §VendorStatus` · `/docs/8 §UC-VENDOR-001` · `/docs/9 §FR-VENDOR-001/010` · `/docs/10 §NFR-PERF-001` · `/docs/16 §M07` · `/docs/8.1 §3` |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* KYC / validación documental.
* Verificación bancaria.
* Suscripción comercial.
* `POST /vendors/me/submit-approval` (US-041).
* Entidad `Notification` in-app dirigida a admins (US futura módulo Notifications).
* Autosave del wizard (Future).
* Creación de `ServiceCategory` por el vendor (`BR-SERVICE-003`).

### Scope Notes

* Estado inicial `pending` (D1); el perfil NO es visible al directorio público hasta aprobación.
* Slug se genera y persiste pero solo se hace visible al ser aprobado.

---

## ✅ Acceptance Criteria

### AC-01: Crear perfil con todos los campos requeridos por `BR-VENDOR-002`

**Given** un usuario autenticado con rol `vendor` sin perfil previo
**When** envía `POST /api/v1/vendors/me` con body:

```json
{
  "business_name": "Acme Catering",
  "bio": "Catering boutique con más de 10 años de experiencia en eventos corporativos y bodas en LATAM.",
  "location_id": "uuid",
  "languages_supported": ["es", "en"],
  "categories": ["uuid1", "uuid2"]
}
```

**Then** el backend valida los campos vía Zod (D2, D4), resuelve `vendor_user_id = currentUser.id`, genera `slug` (D5), crea el `VendorProfile` con `status='pending'`, `category_change_count=0`, persiste la relación M:N con `vendor_profile_categories`, emite log `vendor.profile.created` (D3) y responde `201 Created` con el `VendorProfileDto`.

### AC-02: Banner "En revisión" al consultar perfil propio

**Given** un vendor con `VendorProfile.status='pending'`
**When** consulta `GET /api/v1/vendors/me` (endpoint catalogado en `docs/16 §M07`)
**Then** la UI muestra el banner "Tu perfil está en revisión" con CTA "Editar" (deeplink a US-041).

### AC-03: Slug auto-generado con desambiguación

**Given** un vendor crea perfil con `business_name="Acme Catering"`
**When** otro vendor previamente creó perfil con el mismo nombre
**Then** el nuevo perfil recibe `slug='acme-catering-2'` (siguiente número disponible). El campo es único en BD.

### AC-04: Shape canónico del response

**Given** una creación exitosa
**Then** el response 201 incluye:

```json
{
  "id": "uuid",
  "vendor_user_id": "uuid",
  "business_name": "string",
  "bio": "string",
  "location_id": "uuid",
  "languages_supported": ["string"],
  "categories": [{"id": "uuid", "name": "string"}],
  "slug": "string",
  "status": "pending",
  "created_at": "ISO-8601"
}
```

### AC-05: A11Y del wizard

**Given** la UI renderiza `VendorProfileWizard`
**Then** cumple WCAG AA: labels asociados a inputs, `aria-required` en campos obligatorios, anuncios de progreso de pasos con `aria-live`, foco visible en cada paso.

### AC-06: i18n en 4 locales

**Given** el cliente envía `Accept-Language ∈ {es-LATAM, es-ES, pt, en}` (default `es-LATAM`)
**Then** todas las etiquetas y mensajes de error se renderizan en el idioma solicitado.

### AC-07: Performance

**Given** un seed razonable
**When** se mide el endpoint
**Then** P95 < 1.5 s (`NFR-PERF-001`).

---

## ⚠️ Edge Cases

### EC-01: Vendor ya tiene perfil

**Given** existe `VendorProfile` para el `vendor_user_id`
**When** el vendor intenta crear otro
**Then** 409 `PROFILE_EXISTS`. La UI redirige a `/vendor/profile/edit` (deeplink a US-041).

### EC-02: Categoría inexistente o inactiva

**Then** 400 `INVALID_VALUE` con `invalid_categories: [uuid]`.

### EC-03: Ciudad inexistente o inactiva

**Then** 400 `INVALID_VALUE`.

### EC-04: Slug colisión

**Then** el sistema añade sufijo `-2`, `-3`, etc. hasta encontrar uno único (AC-03).

### EC-05: `languages_supported` vacío

**Then** 400 `INVALID_VALUE` (mínimo 1 idioma; `BR-VENDOR-002`).

### EC-06: `categories.length > 3` o `< 1`

**Then** 400 `INVALID_VALUE`.

### EC-07: Body con `vendor_user_id` o `status` (intento de override)

**Then** 400 `INVALID_FIELD` (Zod `.strict()` rechaza; el usuario nunca puede setear estos campos manualmente).

---

## 🚫 Validation Rules

| ID    | Rule                                                                              | Message / Behavior                                                  |
| ----- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| VR-01 | `business_name` 2-150 chars                                                       | 400                                                                  |
| VR-02 | `bio` 50-1000 chars (D4)                                                          | 400                                                                  |
| VR-03 | `categories.length ∈ [1, 3]` (D2)                                                  | 400                                                                  |
| VR-04 | `location_id` existe y `is_active=true`                                            | 400                                                                  |
| VR-05 | `languages_supported.length ≥ 1`; cada elemento ∈ catálogo `LanguageCode`           | 400                                                                  |
| VR-06 | UUIDs válidos en `location_id` y `categories`                                      | 400 `INVALID_PARAMS`                                                |
| VR-07 | Body no acepta `vendor_user_id`, `status`, `slug` (Zod `.strict()`)                 | 400 `INVALID_FIELD`                                                 |
| VR-08 | Sin sesión válida                                                                  | 401                                                                  |
| VR-09 | Cada `category_id` existe y `is_active=true`                                       | 400 `INVALID_VALUE`                                                  |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                          |
| ------ | --------------------------------------------------------------------------------------------- |
| SEC-01 | `vendor_user_id` se deriva de la sesión; nunca se acepta del cliente.                          |
| SEC-02 | `VendorRoleGuard`: solo rol `vendor` puede invocar.                                            |
| SEC-03 | `organizerExclusionGuard` y `adminExclusionGuard`: ambos retornan 403.                          |
| SEC-04 | Logging sin PII: `vendorProfileId`, `vendor_user_id` opaco, `business_name`, `slug`, `status`, `categories`, `location_id`, `languages_supported`, `correlationId`. |
| SEC-05 | Sin endpoint público para esta US; el directorio público vive en US futura.                    |

### Negative Authorization Scenarios

* Sin sesión → 401.
* Organizer → 403.
* Admin → 403 (admin no crea perfiles por vendor).

---

## 🤖 AI Behavior

This story does not invoke AI directly.

### AI Involvement

* AI Feature: None (US-023 cubre AI opcional para bio/paquetes).
* Provider Layer: Not applicable
* Human Validation Required: Not applicable
* Persist AIRecommendation: No
* Fallback Required: Not applicable

### AI Input / Output / HITL / Error / Fallback

Not applicable for this story.

---

## 🎨 UX / UI Notes

| Area                | Notes                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Screen / Route      | `/[locale]/vendor/profile/new` (wizard).                                                                            |
| Main UI Pattern     | `VendorProfileWizard` multi-step: Datos básicos → Ciudad/Categorías → Idiomas → Confirmación.                       |
| Primary Action      | "Enviar a revisión" (POST + transición a banner "En revisión").                                                     |
| Secondary Actions   | "Cancelar". (Autosave queda Out of Scope.)                                                                          |
| Empty State         | No aplica (wizard nuevo).                                                                                            |
| Loading State       | Spinner con `aria-busy="true"`.                                                                                     |
| Error State         | Mensajes inline cerca del campo afectado con `aria-live="polite"`.                                                  |
| Success State       | Redirección a `/vendor/profile` con banner "Tu perfil está en revisión" (AC-02).                                    |
| Accessibility Notes | Labels asociados, `aria-required`, foco visible, navegación por teclado entre pasos (AC-05).                         |
| Responsive Notes    | Mobile-first.                                                                                                       |
| i18n Notes          | Locales: `es-LATAM` (default), `es-ES`, `pt`, `en`.                                                                 |

---

## 🛠 Technical Notes

### Frontend

* Route / Page: `/[locale]/vendor/profile/new`.
* Components: `VendorProfileWizard` con sub-componentes para selección de Location, ServiceCategory (multi-select cap 1-3), languages_supported (multi-select).
* State Management: RHF + Zod (espejo del schema backend).
* Forms: Multi-step.
* API Client: `vendorsApi.create(body): Promise<VendorProfileDto>`.

### Backend

* Use Case: `CreateVendorProfileUseCase` (en `modules/vendors`).
* Controller / Route: `POST /api/v1/vendors/me`.
* Authorization Policy: `VendorRoleGuard` + `adminExclusionGuard` + `organizerExclusionGuard`.
* Validation: Zod `.strict()` rechaza campos no permitidos.
* Transaction Required: Sí — inserts en `vendor_profile` + `vendor_profile_categories` dentro de `prisma.$transaction`.

### Slug Generation Helper

* `slugify(business_name)` → normaliza (lowercase, sin tildes, espacios → `-`, regex de caracteres permitidos).
* Loop de desambiguación: consulta `vendor_profile.slug LIKE 'base-%' OR slug = 'base'`; computa siguiente sufijo libre.

### Database

* `vendor_profile` (PB-P0-001): id, vendor_user_id (UNIQUE), business_name, bio, location_id, languages_supported (array), slug (UNIQUE), status (enum), category_change_count (int default 0), created_at, updated_at, deleted_at (nullable, soft delete).
* `vendor_profile_categories` (M:N): vendor_profile_id, service_category_id, PK compuesta.
* Índices: `vendor_user_id` UNIQUE, `slug` UNIQUE, `status`.

### API

| Method | Endpoint                | Purpose                  |
| ------ | ----------------------- | ------------------------ |
| POST   | `/api/v1/vendors/me`     | Crear perfil de vendor   |

### Observability / Audit

* Correlation ID Required: Yes.
* Log Event Required: Sí — `vendor.profile.created` (definido en D3).
* AdminAction Required: No (la aprobación sí, US futura).
* AIRecommendation Required: No.

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                | Type        |
| ----- | ----------------------------------------------------------------------- | ----------- |
| TS-01 | Crear con todos los campos válidos                                      | Integration |
| TS-02 | E2E desde onboarding (US-002 → US-040)                                   | E2E         |
| TS-03 | Slug auto-generado simple                                                | Integration |
| TS-04 | Slug con desambiguación numérica                                         | Integration |
| TS-05 | `languages_supported` con 2 idiomas se persiste correctamente             | Integration |
| TS-06 | `category_change_count` inicia en 0                                       | Integration |

### Negative Tests

| ID    | Scenario                                          | Expected Result                              |
| ----- | ------------------------------------------------- | -------------------------------------------- |
| NT-01 | Vendor ya con perfil                              | 409 `PROFILE_EXISTS`                          |
| NT-02 | Categoría inexistente o inactiva                  | 400 `INVALID_VALUE`                           |
| NT-03 | Organizer invoca                                  | 403                                          |
| NT-04 | Admin invoca                                       | 403                                          |
| NT-05 | Sin sesión                                         | 401                                          |
| NT-06 | Body con `vendor_user_id` o `status` (override intento) | 400 `INVALID_FIELD`                          |
| NT-07 | `languages_supported` vacío                        | 400 `INVALID_VALUE`                           |
| NT-08 | `categories.length = 0` o `> 3`                    | 400 `INVALID_VALUE`                           |
| NT-09 | `bio` < 50 chars o > 1000                          | 400                                          |

### Authorization Tests

| ID         | Scenario           | Expected Result |
| ---------- | ------------------ | --------------- |
| AUTH-TS-01 | Vendor              | 201             |
| AUTH-TS-02 | Organizer           | 403             |
| AUTH-TS-03 | Admin               | 403             |
| AUTH-TS-04 | Sin sesión          | 401             |

### Performance Tests

| ID      | Scenario             | Expected               |
| ------- | -------------------- | ---------------------- |
| PERF-01 | Endpoint con seed     | P95 < 1.5 s             |

### Accessibility Tests

| ID       | Scenario                                                               | Expected                          |
| -------- | ---------------------------------------------------------------------- | --------------------------------- |
| A11Y-01  | Wizard cumple WCAG AA: labels, aria-required, foco visible, aria-live   | jest-axe sin violaciones          |
| A11Y-02  | Navegación por teclado entre pasos                                       | Manual                           |

### Contract Tests

| ID           | Scenario                                                                | Expected                                |
| ------------ | ----------------------------------------------------------------------- | --------------------------------------- |
| CONTRACT-01  | Shape del body y response vs OpenAPI snapshot                            | Match exacto (handoff US-098)           |

---

## 📊 Business Impact

| Field               | Value                                                                       |
| ------------------- | --------------------------------------------------------------------------- |
| KPI Affected        | Supply readiness.                                                            |
| Expected Impact     | Llenado del catálogo MVP de proveedores.                                     |
| Success Criteria    | ≥ 80% vendors completan perfil tras registro; demo end-to-end con admin queue. |
| Academic Demo Value | Demuestra ciclo proveedor con HITL admin para aprobación.                     |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* `VendorProfileWizard` multi-step.
* Selectores de Location, ServiceCategory (cap 1-3), languages_supported.
* i18n en 4 locales.

### Potential Backend Tasks

* `CreateVendorProfileUseCase`.
* `VendorProfileRepository`.
* Slug generation helper con desambiguación.
* DTOs Zod estrictos.
* Logger estructurado.

### Potential Database Tasks

* Verificación de schema `vendor_profile` + `vendor_profile_categories` + columna `slug` UNIQUE + `category_change_count`. Si falta algo, migración menor.

### Potential AI / PromptOps Tasks

* No aplica.

### Potential QA Tasks

* TS, NT, AUTH, PERF, A11Y, CONTRACT.

### Potential DevOps / Config Tasks

* No aplica.

---

## ✅ Definition of Ready

* [x] Rol claro.
* [x] Goal/valor claros.
* [x] FRD/UC/BR enlazados.
* [x] Permisos identificados.
* [x] Entidades listadas.
* [x] AC en GWT.
* [x] Edge cases documentados.
* [x] Validación clara.
* [x] Out of Scope explícito.
* [x] Dependencias conocidas.
* [x] UX states identificados.
* [x] API definida.
* [x] Tests definidos.
* [x] PO/BA validó.

---

## 🏁 Definition of Done

* [ ] Endpoint operativo con todos los campos `BR-VENDOR-002`.
* [ ] Slug único auto-generado y desambiguado.
* [ ] Tests verdes (unit, integration, E2E, perf, a11y, contract).
* [ ] Log estructurado `vendor.profile.created` emitido sin PII.
* [ ] i18n verificado en 4 locales.
* [ ] A11Y wizard verificada.
* [ ] OpenAPI snapshot actualizado por US-098.
* [ ] PO valida demo: vendor crea → admin queue muestra entrada → admin aprueba en US futura.

---

## 📝 Notes

* US-040 sienta las bases del módulo Vendors; US-041 entrega edición + flujo de re-submit tras `rejected`.
* Documentation Alignment Required (no bloqueantes): `docs/16 §M07` con shape del body extendido, `docs/4 §BR-VENDOR-002` nota interpretativa cap inicial 1-3, verificación `vendor_profile.slug` UNIQUE en PB-P0-001, housekeeping `NFR-PERF-001`.
* Handoff: vendor crea (US-040) → admin lee log/queue (US-016/US futura) → admin aprueba/rechaza → vendor edita (US-041) y/o ajusta categorías con cap acumulado (US-042).
