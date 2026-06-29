# 🧾 User Story: Editar y soft-delete del VendorProfile (con re-pending automático en cambios mayores)

## 🆔 Metadata

| Field              | Value                                              |
| ------------------ | -------------------------------------------------- |
| ID                 | US-041                                             |
| Epic               | EPIC-VND-001 — Vendor Directory & Profile          |
| Backlog Item       | PB-P1-024                                          |
| Feature            | Edición + Soft delete del VendorProfile             |
| Module / Domain    | Vendors                                            |
| User Role          | Vendor                                             |
| Priority           | Must Have                                          |
| Status             | Approved with Minor Notes                          |
| Owner              | Product Owner / Business Analyst                   |
| Approved By        | PO/BA Review                                       |
| Approval Date      | 2026-06-27                                         |
| Ready for Development Tasks | Yes                                       |
| Sprint / Milestone | MVP                                                |
| Created Date       | 2026-06-09                                         |
| Last Updated       | 2026-06-27                                         |

---

## 🎯 User Story

**As a** proveedor con perfil
**I want** editar mi `VendorProfile` (campos básicos) y opcionalmente retirarlo del directorio mediante soft delete
**So that** mantenga la presencia actualizada o me dé de baja sin perder mi histórico

---

## 🧠 Business Context

### Context Summary

US-041 entrega `PATCH /api/v1/vendors/me` y `DELETE /api/v1/vendors/me`. El PATCH actualiza campos básicos (`business_name`, `bio`, `location_id`, `languages_supported`). Si el body incluye un **campo mayor** (`business_name` o `location_id`, D1) y el estado actual es `approved`, el handler transiciona automáticamente `status: approved → pending` (D2) y registra `AdminAction` para que el admin re-valide. El DELETE realiza soft delete (D4) preservando integridad referencial.

### Related Domain Concepts

* `VendorProfile.status` enum `pending | approved | rejected | hidden`.
* `AdminAction` para auditoría de re-pending.
* Cambios de categorías y servicios viven en US-042 y US-043+ (no este endpoint).

### Assumptions

* Campos mayores (D1): `business_name`, `location_id`. Disparan re-pending automático cuando `status='approved'`.
* Campos menores (D1): `bio`, `languages_supported`. NO disparan re-pending.
* Slug inmutable post-creación (D5). El cambio de `business_name` solo afecta display.
* Edits bloqueados en `status ∈ {rejected, hidden}` (D3). Re-submit tras `rejected` vive en `POST /vendors/me/submit-approval` (separado, US futura si se requiere endpoint dedicado).

### Dependencies

* US-040 — provee `CreateVendorProfileUseCase`, `VendorProfileRepository`, schema.
* US-016 — admin queue consume el evento de re-pending.
* US-042 — cambios de categorías con cap acumulado.

### PO/BA Decisions Applied

| ID | Decisión                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Resolución |
| -- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| D1 | Campos mayores                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `business_name` y `location_id` son mayores. `bio` y `languages_supported` son menores.                                                                                                                                                                                                                                                                                                                  |
| D2 | Trigger re-pending                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Automático en PATCH: si body contiene campo mayor + `status='approved'`, transicionar a `pending` + persistir `AdminAction(action='vendor_pending_after_major_edit')` + log `vendor.profile.repending`. Response 200 con `repending=true`.                                                                                                                                                                  |
| D3 | Edits en `hidden`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Bloqueados con `409 PROFILE_HIDDEN`. Vendor debe contactar al admin.                                                                                                                                                                                                                                                                                                                                          |
| D4 | Soft delete in-scope                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `DELETE /api/v1/vendors/me` setea `deleted_at = NOW()`, `deleted_by`. Permitido en pending/approved/rejected. Bloqueado en hidden (D3). Confirmación modal frontend obligatoria. Reverso queda Future.                                                                                                                                                                                                              |
| D5 | Slug inmutable                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Slug NO se regenera al cambiar `business_name`. Cambios futuros viven en US separada con redirects 301.                                                                                                                                                                                                                                                                                                       |

Referencia completa: `management/user-stories/decision-resolutions/US-041-decision-resolution.md`.

---

## 🔗 Traceability

| Source                 | Reference                                                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FRD Requirement(s)     | FR-VENDOR-002 (editar) · FR-VENDOR-010 (lifecycle pending→approved/rejected) · FR-VENDOR-001 (datos mínimos siguen aplicando)                            |
| Use Case(s)            | UC-VENDOR-002                                                                                                                                          |
| Business Rule(s)       | BR-VENDOR-001 (visibilidad por status) · BR-VENDOR-002 (datos mínimos) · BR-VENDOR-003 (transiciones) · BR-VENDOR-004 (referencia: cambios de categoría) |
| Permission Rule(s)     | `VendorRoleGuard` + ownership por sesión + `adminExclusionGuard` + `organizerExclusionGuard`                                                             |
| Data Entity / Entities | `VendorProfile`, `AdminAction`                                                                                                                          |
| API Endpoint(s)        | `PATCH /api/v1/vendors/me` · `DELETE /api/v1/vendors/me`                                                                                                |
| NFR Reference(s)       | NFR-PERF-001                                                                                                                                            |
| Related ADR(s)         | —                                                                                                                                                      |
| Related Document(s)    | `/docs/4 §BR-VENDOR-001..004` · `/docs/6 §VendorProfile §AdminAction` · `/docs/8 §UC-VENDOR-002` · `/docs/9 §FR-VENDOR-002/010` · `/docs/10 §NFR-PERF-001` · `/docs/16 §M07` · US-040 |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* Cambios de categorías (US-042).
* CRUD de `VendorService` (US-043+).
* Reverso de soft delete (Future).
* `POST /vendors/me/submit-approval` (queda como endpoint separado catalogado; podrá entregarse en US futura específica o inferirse del flujo PATCH si el vendor edita estando en `rejected` — fuera de US-041).
* Rotación de slug (Future).
* AI bio (US-023).

### Scope Notes

* Re-pending automático **solo** desde `approved`. Desde `pending` los cambios mayores no transicionan (ya está en revisión).

---

## ✅ Acceptance Criteria

### AC-01: PATCH menor (no dispara re-pending)

**Given** vendor con perfil `status='approved'`
**When** `PATCH /api/v1/vendors/me` con body solo conteniendo campos menores (bio, languages_supported)
**Then** se actualiza, `status='approved'` se mantiene, response 200 con `repending=false`.

### AC-02: PATCH mayor desde `approved` ⇒ re-pending automático

**Given** vendor con perfil `status='approved'`
**When** PATCH con body conteniendo al menos un campo mayor (`business_name` y/o `location_id`)
**Then** dentro de `prisma.$transaction`: aplica cambios, `status` transiciona a `pending`, persiste `AdminAction(action='vendor_pending_after_major_edit', target_id=vendorProfileId, actor_id=currentUser.id)`, emite log `vendor.profile.repending`. Response 200 con `repending=true` para que UI muestre banner.

### AC-03: PATCH desde `pending` (sin transición)

**Given** vendor con `status='pending'`
**When** PATCH (cualquier campo)
**Then** se actualiza; `status='pending'` se mantiene; no se persiste AdminAction (sin transición).

### AC-04: PATCH/DELETE bloqueado en `rejected` y `hidden`

**Given** vendor con `status ∈ {rejected, hidden}`
**When** PATCH o DELETE
**Then** 409 `PROFILE_REJECTED` o 409 `PROFILE_HIDDEN`. La UI muestra mensaje específico.

### AC-05: DELETE soft delete (D4)

**Given** vendor con `status ∈ {pending, approved, rejected}` y `deleted_at IS NULL`
**When** `DELETE /api/v1/vendors/me`
**Then** setea `deleted_at = NOW()`, `deleted_by = currentUser.id`. Response 204 No Content. El perfil deja de aparecer en el directorio público. Frontend confirma con modal antes de invocar.

### AC-06: Slug inmutable (D5)

**Given** vendor cambia `business_name` vía PATCH
**Then** `slug` permanece igual. Display público usa `business_name` actualizado pero URL canónica usa slug original.

### AC-07: Body Zod estricto

**Given** PATCH body
**Then** Zod `.strict()` rechaza campos no permitidos (e.g., `status`, `slug`, `vendor_user_id`, `category_change_count`).

### AC-08: Performance

P95 < 1.5 s (`NFR-PERF-001`).

### AC-09: A11Y

Editor cumple WCAG AA (labels, foco visible, modal de DELETE con `role="dialog"` + `aria-labelledby`).

### AC-10: i18n

Locales `es-LATAM` (default), `es-ES`, `pt`, `en`.

---

## ⚠️ Edge Cases

### EC-01: PATCH solo con campos no permitidos
400 `INVALID_FIELD`.

### EC-02: PATCH con `categories` en body
400 `INVALID_FIELD` con mensaje: "Use US-042 endpoint para cambiar categorías" (consistente con scope: US-042 entrega endpoint dedicado).

### EC-03: PATCH desde `rejected`
409 `PROFILE_REJECTED` con mensaje sugiriendo `POST /vendors/me/submit-approval`.

### EC-04: DELETE en `hidden`
409 `PROFILE_HIDDEN`.

### EC-05: DELETE en perfil ya soft-deleted
409 `PROFILE_DELETED`.

### EC-06: Cambio menor + mayor en un mismo PATCH
Aplica ambos atómicamente; el mayor dispara re-pending desde `approved`.

### EC-07: Cambio de `location_id` a ciudad inactiva
400 `INVALID_VALUE`.

### EC-08: `bio` < 50 o > 1000 chars
400 `INVALID_VALUE`.

---

## 🚫 Validation Rules

| ID    | Rule                                                                                                                | Message / Behavior                                                  |
| ----- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| VR-01 | `bio` 50-1000 chars (consistencia con US-040 D4)                                                                     | 400                                                                  |
| VR-02 | `business_name` 2-150 chars                                                                                          | 400                                                                  |
| VR-03 | `location_id` UUID válido + `is_active=true`                                                                          | 400 `INVALID_VALUE`                                                  |
| VR-04 | `languages_supported.length ≥ 1` (si presente); cada elemento en catálogo                                              | 400 `INVALID_VALUE`                                                  |
| VR-05 | Body Zod `.strict()` rechaza extras                                                                                  | 400 `INVALID_FIELD`                                                  |
| VR-06 | `status ∉ {rejected, hidden}` para PATCH                                                                              | 409 `PROFILE_REJECTED` / `PROFILE_HIDDEN`                            |
| VR-07 | `status ∉ {hidden}` y `deleted_at IS NULL` para DELETE                                                                 | 409 `PROFILE_HIDDEN` / `PROFILE_DELETED`                              |
| VR-08 | Slug inmutable                                                                                                       | 400 `INVALID_FIELD` si `slug` viene en body                          |
| VR-09 | Body PATCH no vacío                                                                                                   | 400 `INVALID_VALUE` con mensaje "no fields to update"                |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                                            |
| ------ | ------------------------------------------------------------------------------------------------------------------------------- |
| SEC-01 | `vendor_user_id` se deriva de la sesión.                                                                                         |
| SEC-02 | `VendorRoleGuard` + `adminExclusionGuard` + `organizerExclusionGuard`.                                                          |
| SEC-03 | Ownership: el perfil debe pertenecer al currentUser (404 si no existe perfil propio).                                            |
| SEC-04 | Logging sin PII: `vendorProfileId`, `vendor_user_id` opaco, campos editados (sin valores en caso de PII potencial), `repending`. |
| SEC-05 | `AdminAction` se persiste con `correlationId` para trazabilidad cruzada.                                                          |

### Negative Authorization Scenarios

* Sin sesión → 401.
* Vendor sin perfil → 404 `PROFILE_NOT_FOUND`.
* Organizer/Admin → 403.

---

## 🤖 AI Behavior

This story does not invoke AI directly.

---

## 🎨 UX / UI Notes

| Area                | Notes                                                                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Screen / Route      | `/[locale]/vendor/profile/edit`                                                                                                          |
| Main UI Pattern     | Form con secciones (Datos básicos, Idiomas) + botón "Eliminar perfil" con confirmación modal.                                            |
| Primary Action      | "Guardar cambios".                                                                                                                       |
| Secondary Actions   | "Cancelar", "Eliminar perfil" (apertura modal).                                                                                          |
| Banner re-pending   | Cuando response `repending=true`: "Tu perfil pasó a revisión por cambios mayores. Será verificado por el equipo de EventFlow."          |
| Loading State       | Spinner con `aria-busy`.                                                                                                                |
| Error State         | Mensajes inline + toast con `aria-live="polite"`.                                                                                       |
| Success State       | Toast "Perfil actualizado" o banner re-pending según response.                                                                          |
| Accessibility Notes | WCAG AA; modal de DELETE con `role="dialog"`, `aria-labelledby`, focus trap, ESC para cerrar.                                            |
| Responsive Notes    | Mobile-first.                                                                                                                            |
| i18n Notes          | Locales: `es-LATAM`, `es-ES`, `pt`, `en`.                                                                                                |

---

## 🛠 Technical Notes

### Frontend

* Route: `/[locale]/vendor/profile/edit`.
* Components: `VendorProfileEditor` (form), `DeleteProfileDialog` (modal).
* State: RHF + Zod espejo del backend; tracking de "dirty fields mayores" para mostrar warning previo a submit.
* API client: `vendorsApi.update(body)`, `vendorsApi.softDelete()`.

### Backend

* Use cases: `UpdateVendorProfileUseCase`, `SoftDeleteVendorProfileUseCase` (en `modules/vendors`).
* Controller: `PATCH /api/v1/vendors/me`, `DELETE /api/v1/vendors/me` (reuso del controller de US-040).
* Middleware: `authRequired` + `VendorRoleGuard` + exclusion guards.
* Transacción: PATCH con cambio mayor → `prisma.$transaction([profileUpdate, statusUpdate, adminActionInsert])`.
* DELETE: single update (`deleted_at`, `deleted_by`).

### Database

* `vendor_profile` (reuso US-040): añadir verificación de `deleted_at` y `deleted_by` (si no existen en PB-P0-001, migración menor).
* `AdminAction` (reuso del entregado por módulo Admin/PB-P0-001).
* Sin migraciones nuevas si schema completo.

### API

| Method | Endpoint                | Purpose                                                          |
| ------ | ----------------------- | ---------------------------------------------------------------- |
| PATCH  | `/api/v1/vendors/me`     | Editar perfil; re-pending auto en cambios mayores (D2).            |
| DELETE | `/api/v1/vendors/me`     | Soft delete (D4).                                                   |

### Observability / Audit

* Correlation ID Required: Yes.
* Log Events: `vendor.profile.updated`, `vendor.profile.repending`, `vendor.profile.soft_deleted`.
* AdminAction: `vendor_pending_after_major_edit` (D2).

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                | Type        |
| ----- | ----------------------------------------------------------------------- | ----------- |
| TS-01 | PATCH menor en `approved` ⇒ se mantiene approved                         | Integration |
| TS-02 | PATCH mayor desde `approved` ⇒ re-pending + AdminAction                  | Integration |
| TS-03 | PATCH mayor + menor combinados desde `approved` ⇒ re-pending             | Integration |
| TS-04 | PATCH cualquier campo desde `pending` ⇒ sin transición                   | Integration |
| TS-05 | DELETE en `pending`/`approved`/`rejected` ⇒ 204                          | Integration |
| TS-06 | Slug NO se regenera al cambiar `business_name`                            | Integration |

### Negative Tests

| ID    | Scenario                                          | Expected                                  |
| ----- | ------------------------------------------------- | ----------------------------------------- |
| NT-01 | PATCH en `rejected`                                | 409 `PROFILE_REJECTED`                    |
| NT-02 | PATCH/DELETE en `hidden`                            | 409 `PROFILE_HIDDEN`                       |
| NT-03 | DELETE en perfil ya soft-deleted                    | 409 `PROFILE_DELETED`                      |
| NT-04 | PATCH con `categories` en body                      | 400 `INVALID_FIELD`                        |
| NT-05 | PATCH con `slug` en body                            | 400 `INVALID_FIELD` (slug inmutable)      |
| NT-06 | PATCH con `status` en body                          | 400 `INVALID_FIELD`                        |
| NT-07 | PATCH vacío                                          | 400 `INVALID_VALUE`                        |
| NT-08 | location_id inactiva                                | 400 `INVALID_VALUE`                        |
| NT-09 | bio < 50 o > 1000                                    | 400 `INVALID_VALUE`                        |
| NT-10 | Vendor ajeno (sin perfil)                            | 404 `PROFILE_NOT_FOUND`                    |

### Authorization Tests

| ID         | Scenario           | Expected         |
| ---------- | ------------------ | ---------------- |
| AUTH-TS-01 | Vendor (PATCH menor) | 200             |
| AUTH-TS-02 | Vendor (DELETE)     | 204             |
| AUTH-TS-03 | Organizer           | 403              |
| AUTH-TS-04 | Admin               | 403              |
| AUTH-TS-05 | Sin sesión          | 401              |

### Performance Tests

| ID      | Scenario          | Expected     |
| ------- | ----------------- | ------------ |
| PERF-01 | PATCH con re-pending | P95 < 1.5 s   |

### Accessibility Tests

| ID       | Scenario                                                          | Expected                          |
| -------- | ----------------------------------------------------------------- | --------------------------------- |
| A11Y-01  | Editor labels, aria-required, foco visible                         | jest-axe                          |
| A11Y-02  | `DeleteProfileDialog` con `role="dialog"`, focus trap, ESC          | jest-axe                          |

### Contract Tests

| ID           | Scenario                                          | Expected                                |
| ------------ | ------------------------------------------------- | --------------------------------------- |
| CONTRACT-01  | Shape PATCH/DELETE response vs OpenAPI snapshot   | Match (handoff US-098)                  |

---

## 📊 Business Impact

| Field               | Value                                                                       |
| ------------------- | --------------------------------------------------------------------------- |
| KPI Affected        | Calidad y vigencia de perfiles.                                              |
| Expected Impact     | Vendors mantienen su perfil al día; admin recibe perfiles modificados para revisión. |
| Success Criteria    | Demo end-to-end: vendor edita business_name aprobado → admin queue recibe entrada → admin re-aprueba. |
| Academic Demo Value | Edición + soft delete + re-pending automático.                              |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* `VendorProfileEditor` form + tracking de campos mayores dirty.
* `DeleteProfileDialog` modal con confirmación accesible.
* Banner re-pending.
* i18n 4 locales.

### Potential Backend Tasks

* `UpdateVendorProfileUseCase` con detección de mayores + transacción.
* `SoftDeleteVendorProfileUseCase`.
* AdminAction insert helper.
* Logger `vendor.profile.updated/repending/soft_deleted`.
* Extensión del controller con PATCH y DELETE.

### Potential Database Tasks

* Verificar `vendor_profile.deleted_at`, `deleted_by` en schema (DB-001 de US-040 cubre).

### Potential AI / PromptOps Tasks

* No aplica.

### Potential QA Tasks

* Tests funcionales, negativos, auth, perf, a11y, contract.

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

* [ ] PATCH funcional con detección de campos mayores y transición auto a `pending` cuando aplica (D2).
* [ ] DELETE soft delete funcional (D4).
* [ ] Slug inmutable verificado (D5).
* [ ] Tests verdes: unit, integration, E2E, perf, a11y, contract.
* [ ] AdminAction `vendor_pending_after_major_edit` persistida con `correlationId`.
* [ ] Logs estructurados emitidos sin PII.
* [ ] i18n verificado en 4 locales.
* [ ] A11Y verificada (editor + modal).
* [ ] OpenAPI snapshot por US-098.
* [ ] PO valida demo end-to-end.

---

## 📝 Notes

* US-041 cierra PB-P1-024 junto con US-040.
* Documentation Alignment Required (no bloqueantes): `docs/16 §M07` con shape PATCH/DELETE + códigos nuevos (`PROFILE_HIDDEN`, `PROFILE_DELETED`, `PROFILE_REJECTED`); `docs/4 §BR-VENDOR-003` nota interpretativa D2; `docs/4 §BR-VENDOR-002` nota slug inmutable D5; housekeeping `NFR-PERF-001`.
* Handoff: vendor edita (US-041) → admin lee AdminAction queue (US futura) → admin re-aprueba o rechaza.
