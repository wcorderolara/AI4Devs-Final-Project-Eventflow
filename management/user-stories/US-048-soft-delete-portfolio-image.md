# 🧾 User Story: Soft-deletear una imagen de mi portafolio

## 🆔 Metadata

| Field              | Value                                                                       |
| ------------------ | --------------------------------------------------------------------------- |
| ID                 | US-048                                                                      |
| Backlog Item       | PB-P1-026 — Portafolio del vendor (10 imágenes / trabajo)                   |
| Epic               | EPIC-VND-001                                                                |
| Feature            | Soft delete de attachment del portafolio                                    |
| Module / Domain    | Attachments / Vendors                                                       |
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
**I want** eliminar (soft) una imagen de mi portafolio
**So that** retire contenido sin perder trazabilidad ni metadata

---

## 🧠 Business Context

### Context Summary

El soft delete se aplica sobre la tabla polimórfica `attachments` (`owner_type='vendor_work'`) introducida en US-043: el endpoint marca `status='deleted'`, `deleted_at=NOW()`, `deleted_by=currentUser.id` y `deletion_reason` (opcional). La eliminación física del binario en disco queda para un proceso técnico de mantenimiento posterior (BR-PRIVACY-011, Decisión PO 8.1 #19). El attachment soft-deleted deja de mostrarse en el portafolio público inmediatamente; la metadata persiste para auditoría.

### PO/BA Decisions Applied

| #  | Decisión                                                                                                                                                                                                                                       |
| -- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1 | El endpoint canónico es `DELETE /api/v1/vendors/me/portfolio/images/:imageId`. `:imageId` es el `attachment.id` (UUID). Backend verifica ownership y que `owner_type='vendor_work'`. No se requiere `work_label` en path.                       |
| D2 | `deletion_reason` opcional vía body JSON `{ "deletion_reason": string }` (1..500 chars). Ausente ⇒ persiste `null`. Excede ⇒ `400 INVALID_DELETION_REASON`.                                                                                    |
| D3 | Política por status del `VendorProfile`: permitido en `pending`, `approved`, `rejected`. Bloqueado en `hidden` (`409 PROFILE_HIDDEN`) y soft-deleted del perfil (`404`).                                                                       |
| D4 | Si `attachment.status='deleted'` o `imageId` no existe o pertenece a otro vendor, responde `404 ATTACHMENT_NOT_FOUND` (no revela existencia ni ownership; idempotente).                                                                        |

### Related Domain Concepts

* `attachments` (polimórfico).
* `attachment_status` enum: `active`, `deleted`.
* C-037 (auditoría de soft delete).
* C-060 (soft delete con auditoría).

### Assumptions

* Soft delete oculta la imagen inmediatamente del público.
* El binario físico permanece (lifecycle policy en futura iteración).
* `AdminAction` no se inserta para acciones vendor-driven (sí para `hide_attachment`/`remove_attachment` admin-driven en flujos futuros).

### Dependencies

* US-043 (entrega tabla `attachments`, módulo `modules/attachments`, repository, port + adapter, controller base, frontend `WorkGrid`).
* PB-P0-001 (schema attachments).
* PB-P0-003 (error envelope).

---

## 🔗 Traceability

| Source                 | Reference                                            |
| ---------------------- | ---------------------------------------------------- |
| FRD Requirement(s)     | FR-VENDOR-008                                        |
| Use Case(s)            | UC-VENDOR-005                                        |
| Business Rule(s)       | BR-PRIVACY-011                                       |
| Permission Rule(s)     | Ownership (vendor sobre `attachment.owner_id`)       |
| Data Entity / Entities | Attachment                                            |
| API Endpoint(s)        | DELETE /api/v1/vendors/me/portfolio/images/:imageId  |
| NFR Reference(s)       | NFR-DATA-008, NFR-OBS-005                            |
| Related ADR(s)         | —                                                    |
| Related Document(s)    | /docs/8.1 (#19), /docs/4 §BR-PRIVACY-011, /docs/9 §FR-VENDOR-008, /docs/18 §19, C-037, C-060 |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* Hard delete físico del registro o del binario.
* Lifecycle policies de retención / purge físico.
* Restauración del attachment (undelete).
* Edición de `deletion_reason` post-delete.
* `AdminAction` para acciones vendor-driven.

### Scope Notes

* El binario físico se preserva para auditoría/forense.
* Soft delete es inmediatamente visible en el público (la query del directorio filtra `status='active'`).

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Soft delete válido

**Given** un vendor autenticado con `vendor_profile.status ∈ {pending,approved,rejected}`, `deleted_at IS NULL`, y un `attachment` propio con `status='active'` (`owner_type='vendor_work'`, `owner_id=vendor_profile.id`)
**When** envía `DELETE /api/v1/vendors/me/portfolio/images/:imageId` opcionalmente con body `{ "deletion_reason": "Imagen desactualizada" }`
**Then** el backend:
- actualiza `attachments` con `status='deleted'`, `deleted_at=NOW()`, `deleted_by=currentUser.id`, `deletion_reason` (o `null`),
- emite log `vendor.portfolio.deleted` con `vendor_profile_id`, `attachment_id`, `work_label`, `deletion_reason`, `correlation_id`,
- responde `204 No Content`.

### AC-02: Sin `deletion_reason` (body ausente)

**Given** un vendor con attachment propio activo
**When** envía `DELETE` sin body
**Then** el backend persiste `deletion_reason=NULL` y responde `204`.

---

## ⚠️ Edge Cases

### EC-01: Attachment ajeno o inexistente

**Given** un `imageId` que no existe, está soft-deleted, o pertenece a otro vendor
**When** el vendor envía `DELETE`
**Then** el backend responde `404 ATTACHMENT_NOT_FOUND` (mismo trato; no revela existencia ni ownership).

#### Handling

* Verificación de ownership por sesión (`owner_id == vendor_profile.id`).

### EC-02: Idempotencia (segundo DELETE)

**Given** un vendor que ya borró su attachment
**When** envía nuevamente `DELETE` al mismo `imageId`
**Then** responde `404 ATTACHMENT_NOT_FOUND`, sin efectos.

### EC-03: Perfil oculto (`hidden`)

**Given** vendor con `vendor_profile.status='hidden'`
**When** intenta `DELETE`
**Then** `409 PROFILE_HIDDEN`, sin efectos.

### EC-04: Perfil soft-deleted

**Given** vendor con `vendor_profile.deleted_at IS NOT NULL`
**When** intenta `DELETE`
**Then** `404`.

### EC-05: `deletion_reason` excede 500 caracteres

**Given** vendor envía body con `deletion_reason` > 500 chars
**When** backend valida
**Then** `400 INVALID_DELETION_REASON`, sin efectos.

---

## 🚫 Validation Rules

| ID    | Rule                                                                    | Message / Behavior                              |
| ----- | ----------------------------------------------------------------------- | ----------------------------------------------- |
| VR-01 | `:imageId` es UUID válido.                                               | `400 INVALID_UUID`                              |
| VR-02 | `attachment.owner_id == vendor_profile.id` y `owner_type='vendor_work'`. | `404 ATTACHMENT_NOT_FOUND`                      |
| VR-03 | `attachment.status='active'`.                                            | `404 ATTACHMENT_NOT_FOUND`                      |
| VR-04 | `vendor_profile.status != 'hidden'`.                                     | `409 PROFILE_HIDDEN`                            |
| VR-05 | `vendor_profile.deleted_at IS NULL`.                                     | `404`                                            |
| VR-06 | Si `deletion_reason` presente, `1 ≤ len(deletion_reason) ≤ 500`.         | `400 INVALID_DELETION_REASON`                   |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                          |
| ------ | --------------------------------------------------------------------------------------------- |
| SEC-01 | Ownership: vendor sobre su propio attachment.                                                 |
| SEC-02 | Soft delete obligatorio (BR-PRIVACY-011). Hard delete prohibido.                              |
| SEC-03 | No revelar existencia / ownership ajeno (`404 ATTACHMENT_NOT_FOUND` uniforme).                 |
| SEC-04 | Política por status del `VendorProfile` (D3).                                                 |
| SEC-05 | Sin `AdminAction` (acción vendor-driven; `hide/remove_attachment` viven en flujos admin futuros). |

### Negative Authorization Scenarios

* Sin sesión → `401`.
* `admin`/`organizer` → `403`.
* Vendor sobre attachment ajeno → `404 ATTACHMENT_NOT_FOUND`.
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
| Screen / Route      | `/[locale]/vendor/portfolio` (reuso de US-043).                                                |
| Main UI Pattern     | Botón "Eliminar" en cada thumbnail del `WorkGrid` + modal de confirmación accesible.           |
| Primary Action      | "Eliminar".                                                                                     |
| Secondary Actions   | "Cancelar".                                                                                    |
| Empty State         | No aplica.                                                                                     |
| Loading State       | Spinner en CTA mientras el DELETE está en curso; thumbnail con opacity reducida.               |
| Error State         | Banner accesible con código i18n (`ATTACHMENT_NOT_FOUND`, `PROFILE_HIDDEN`, `INVALID_DELETION_REASON`). |
| Success State       | Thumbnail desaparece del grid; contador `N/10` del work se decrementa.                         |
| Accessibility Notes | Modal `role="dialog"`, focus trap, ESC, etiqueta del botón ("Eliminar imagen del trabajo X"); confirmación con botón explícito. |
| Responsive Notes    | Mobile-first.                                                                                  |
| i18n Notes          | 4 locales: `es-LATAM`, `es-ES`, `pt`, `en`.                                                    |
| Currency Notes      | No aplica.                                                                                     |

---

## 🛠 Technical Notes

### Frontend

* Route / Page:
  * `app/[locale]/vendor/portfolio` (reuso de US-043).
* Components:
  * Extensión del `ImageThumb`/`WorkGrid` con botón "Eliminar".
  * Nuevo `DeleteImageDialog` (modal accesible con textarea opcional para `deletion_reason`).
* State Management:
  * TanStack Query mutation `useDeletePortfolioImage` + invalidación de `vendor.me.portfolio`.
* Forms:
  * Confirmación opcional con textarea para `deletion_reason`.
* API Client:
  * `vendorsApi.deletePortfolioImage({ imageId, deletionReason? })`.

### Backend

* Use Case / Service:
  * `SoftDeletePortfolioImageUseCase`.
* Controller / Route:
  * Extender `PortfolioController` con handler `deletePortfolioImage(req, res)`.
  * Ruta: `DELETE /api/v1/vendors/me/portfolio/images/:imageId`.
* Authorization Policy:
  * Ownership (sesión vendor).
* Validation:
  * Zod del path param (UUID) + body opcional.
* Transaction Required:
  * No (operación de un solo update; transacción opcional para futuro AdminAction).

### Database

* Main Tables:
  * `attachments` (update).
* Constraints:
  * Reuso de `attachment_status` enum (`active`, `deleted`).
* Index Considerations:
  * Reuso del índice parcial `idx_attachments_vendor_work_active` (entregado por PB-P0-001).

### API

| Method | Endpoint                                              | Purpose                                                       |
| ------ | ----------------------------------------------------- | ------------------------------------------------------------- |
| DELETE | `/api/v1/vendors/me/portfolio/images/:imageId`        | Soft delete del attachment. Body opcional `{ deletion_reason? }`. Response `204`. |

### Observability / Audit

* Correlation ID Required: Yes
* Log Event Required: Yes (`vendor.portfolio.deleted` con `vendor_profile_id`, `attachment_id`, `work_label`, `deletion_reason`, `correlation_id`).
* AdminAction Required: No
* AIRecommendation Required: No

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                | Type        |
| ----- | ----------------------------------------------------------------------- | ----------- |
| TS-01 | Soft delete con `deletion_reason` actualiza columnas y emite log.       | Integration |
| TS-02 | Soft delete sin body persiste `deletion_reason=null`.                   | Integration |
| TS-03 | Segundo DELETE sobre el mismo `imageId` retorna `404`.                  | Integration |
| TS-04 | Tras soft delete, la imagen no aparece en `GET` público del portafolio. | Integration |

### Negative Tests

| ID    | Scenario                                              | Expected Result                  |
| ----- | ----------------------------------------------------- | -------------------------------- |
| NT-01 | Attachment ajeno                                       | `404 ATTACHMENT_NOT_FOUND`       |
| NT-02 | `imageId` inexistente                                  | `404 ATTACHMENT_NOT_FOUND`       |
| NT-03 | `:imageId` no UUID                                     | `400 INVALID_UUID`               |
| NT-04 | `deletion_reason` > 500 chars                          | `400 INVALID_DELETION_REASON`    |
| NT-05 | Vendor con `status='hidden'`                          | `409 PROFILE_HIDDEN`             |
| NT-06 | Vendor soft-deleted                                   | `404`                            |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario                            | Expected Result            |
| ---------- | ----------------------------------- | -------------------------- |
| AUTH-TS-01 | Dueño / `approved`                  | `204`                      |
| AUTH-TS-02 | Dueño / `pending`                   | `204`                      |
| AUTH-TS-03 | Dueño / `rejected`                  | `204`                      |
| AUTH-TS-04 | Dueño / `hidden`                    | `409 PROFILE_HIDDEN`       |
| AUTH-TS-05 | Dueño / soft-deleted                | `404`                      |
| AUTH-TS-06 | Otro vendor                         | `404 ATTACHMENT_NOT_FOUND` |
| AUTH-TS-07 | Sin sesión                          | `401`                      |
| AUTH-TS-08 | `admin`/`organizer`                 | `403`                      |

### Accessibility Tests

* Modal `role="dialog"`, focus trap, ESC, foco inicial en el botón "Cancelar".
* Botón de eliminar con label descriptivo (incluyendo el `work_label`).
* Textarea de `deletion_reason` con label visible.

---

## 📊 Business Impact

| Field               | Value                                                  |
| ------------------- | ------------------------------------------------------ |
| KPI Affected        | Calidad del portafolio del vendor.                     |
| Expected Impact     | Control fino sobre el contenido visible al público.    |
| Success Criteria    | Soft delete enforced; metadata preservada para audit.  |
| Academic Demo Value | Demuestra soft delete + auditoría + idempotencia.      |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Botón eliminar en `ImageThumb` + `DeleteImageDialog` accesible.
* `vendorsApi.deletePortfolioImage` + MSW handler.
* i18n 4 locales.

### Potential Backend Tasks

* `SoftDeletePortfolioImageUseCase` con verificación previa.
* DTO Zod del path param + body opcional.
* Repository extension (`softDelete`, `findActiveOwnedBy`).
* Controller + ruta.
* Logger extension `vendor.portfolio.deleted`.

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
* [x] FRD/UC/BR enlazados (FR-VENDOR-008, UC-VENDOR-005, BR-PRIVACY-011).
* [x] Permisos identificados.
* [x] Entidades listadas.
* [x] AC en GWT.
* [x] Edge cases documentados.
* [x] Validación clara.
* [x] Out of Scope explícito.
* [x] Dependencias conocidas.
* [x] UX states identificados.
* [x] API definida (request, response, errors).
* [x] Tests definidos.
* [x] PO/BA validó.

---

## 🏁 Definition of Done

* [ ] Endpoint funcional con verificación previa de ownership/status.
* [ ] Update único persiste `status='deleted'`, `deleted_at`, `deleted_by`, `deletion_reason`.
* [ ] Tests verdes (functional, negative, auth, accessibility).
* [ ] Log `vendor.portfolio.deleted` registrado con `correlation_id`.
* [ ] Modal de confirmación accesible en 4 locales.
* [ ] PO valida demo (soft delete + idempotencia + bloqueo `hidden`).

---

## 📝 Notes

* Cierra PB-P1-026 junto con US-043.
* Documentation Alignment Required (no bloqueantes) registradas en `management/user-stories/decision-resolutions/US-048-decision-resolution.md §5`: documentar endpoint DELETE en `docs/16 §M07`.
