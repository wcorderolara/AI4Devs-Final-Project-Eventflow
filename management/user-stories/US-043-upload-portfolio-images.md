# 🧾 User Story: Subir hasta 10 imágenes por trabajo del portafolio

## 🆔 Metadata

| Field              | Value                                                                       |
| ------------------ | --------------------------------------------------------------------------- |
| ID                 | US-043                                                                      |
| Backlog Item       | PB-P1-026 — Portafolio del vendor (10 imágenes / trabajo)                   |
| Epic               | EPIC-VND-001                                                                |
| Feature            | Portafolio del vendor con `work_label` polimórfico y resize básico          |
| Module / Domain    | Vendors / Attachments                                                       |
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
**I want** subir hasta 10 imágenes por trabajo (`work_label`) de mi portafolio
**So that** muestre evidencia visual de mi oferta y atraiga más solicitudes de cotización

---

## 🧠 Business Context

### Context Summary

El portafolio del vendor se implementa vía la tabla polimórfica `attachments` con `owner_type='vendor_work'`, `owner_id = vendor_profile.id` y `work_label` (no existe entidad `vendor_work` con PK propia). Cada trabajo (grupo lógico identificado por `work_label`) acepta hasta 10 imágenes activas (Decisión PO 8.1 #2 / BR-VENDOR-005 / FR-VENDOR-006). El soft delete obligatorio (Decisión PO 8.1 #19 / BR-PRIVACY-011 / FR-VENDOR-008) se entrega en US-048. Allowlist MIME y resize server-side son enforcement obligatorios. Storage abstraído por `FileStoragePort` con `LocalFileStorageAdapter` en MVP.

### PO/BA Decisions Applied

| #  | Decisión                                                                                                                                                                                                                                                                       |
| -- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1 | El endpoint canónico es `POST /api/v1/vendors/me/portfolio/works/:workLabel/images` (multipart/form-data, campo `file`). Persistencia en `attachments(owner_type='vendor_work', owner_id=vendor_profile.id, work_label, status='active', ...)`. No existe entidad `vendor_work`. |
| D2 | Tamaño máximo por archivo: **5 MB**. Excedido ⇒ `413 FILE_TOO_LARGE`.                                                                                                                                                                                                          |
| D3 | Política por status: permitido en `pending`, `approved`, `rejected`. Bloqueado en `hidden` (`409 PROFILE_HIDDEN`) y soft-deleted (`404`).                                                                                                                                       |
| D4 | Resize básico server-side con `sharp`: long-edge ≤ 2048 px, JPEG quality 80, una sola variante. Sin thumbnails adicionales.                                                                                                                                                     |
| D5 | `work_label` valida `^[a-zA-Z0-9\-_ ]{1,80}$`. Comparación entre grupos por `LOWER(work_label)`. Persistencia preserva display. Inválido ⇒ `400 INVALID_WORK_LABEL`.                                                                                                            |
| D6 | Máximo **20** `work_labels` distintos por vendor (sobre attachments activos). Excedido ⇒ `409 WORK_LABEL_LIMIT_REACHED`.                                                                                                                                                        |

### Related Domain Concepts

* `attachments` (polimórfico): `owner_type='vendor_work'`, `owner_id`, `work_label`, `status`, `mime`, `size_bytes`, `storage_url`, `uploaded_by`, `deleted_at`, `deleted_by`, `deletion_reason`.
* `attachment_status` enum: `active`, `deleted`.
* `attachment_owner_type` enum: `vendor_profile`, `vendor_work`, `quote_request`.
* `FileStoragePort` con `LocalFileStorageAdapter`.
* C-022 (constraint de service layer ≤ 10 por grupo).

### Assumptions

* MVP usa `LocalFileStorageAdapter` (path `storage/uploads/<yyyy>/<mm>/<uuid>.<ext>`).
* MIME allowlist server-side: `image/jpeg`, `image/png`, `image/webp`.
* Resize obligatorio antes de persistir el binario.

### Dependencies

* US-040 (creación del `VendorProfile`).
* PB-P0-001 (schema `attachments` + enums + índices).
* PB-P0-003 (error envelope) y PB-P0-007 (middleware chain).
* US-048 entrega el endpoint DELETE (soft delete).

---

## 🔗 Traceability

| Source                 | Reference                                            |
| ---------------------- | ---------------------------------------------------- |
| FRD Requirement(s)     | FR-VENDOR-006, FR-VENDOR-007, FR-VENDOR-008          |
| Use Case(s)            | UC-VENDOR-005                                        |
| Business Rule(s)       | BR-VENDOR-005, BR-PRIVACY-011                        |
| Permission Rule(s)     | Ownership (vendor sobre su propio `VendorProfile`)   |
| Data Entity / Entities | VendorProfile, Attachment (polimórfico)              |
| API Endpoint(s)        | POST /api/v1/vendors/me/portfolio/works/:workLabel/images |
| NFR Reference(s)       | NFR-DATA-008, NFR-OBS-005                            |
| Related ADR(s)         | —                                                    |
| Related Document(s)    | /docs/8.1 (#2, #19), /docs/4 §BR-VENDOR-005, /docs/9 §FR-VENDOR-006..008, /docs/14 §FileStoragePort, /docs/18 §19, /docs/19 §SEC-POL-VENDOR-004/UPLOAD-001 |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### Explicitly Out of Scope

* Antimalware / scanning de virus.
* Watermarking automático.
* CDN / retención avanzada / lifecycle policies.
* Múltiples variantes / thumbnails.
* Galería avanzada / reordenamiento drag-and-drop.
* Edición de imagen post-upload (rotación, crop).
* DELETE (soft delete) del attachment → US-048.

### Scope Notes

* Tope estricto de 10 imágenes activas por `(owner_id, LOWER(work_label))`.
* Tope estricto de 20 `work_labels` distintos por vendor.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Subir imagen válida en un `work_label` existente o nuevo

**Given** un vendor autenticado con `vendor_profile.status ∈ {pending,approved,rejected}` y `deleted_at IS NULL`
**When** envía `POST /api/v1/vendors/me/portfolio/works/:workLabel/images` con multipart `file` (jpg/png/webp ≤ 5 MB)
**Then** el backend:
- valida MIME, magic-bytes y tamaño,
- valida `work_label` con `^[a-zA-Z0-9\-_ ]{1,80}$`,
- valida `COUNT(*) < 10` para `(owner_id=vendor_profile.id, LOWER(work_label), status='active')`,
- valida `COUNT(DISTINCT LOWER(work_label)) < 20` cuando el label es nuevo,
- pasa el binario por `sharp` (long-edge ≤ 2048 px, JPEG quality 80, aspect ratio preservado),
- persiste el binario procesado vía `FileStoragePort` (path `storage/uploads/<yyyy>/<mm>/<uuid>.<ext>`),
- inserta `attachments(id, owner_type='vendor_work', owner_id=vendor_profile.id, work_label, status='active', mime, size_bytes, storage_url, uploaded_by=currentUser.id)`,
- emite log `vendor.portfolio.uploaded` con `correlation_id`,
- responde `201 Created` con `{ id, owner_type, owner_id, work_label, mime, size_bytes, storage_url, status, created_at, dimensions: { width, height } }`.

### AC-02: Límite de 10 imágenes por trabajo

**Given** un vendor con 10 attachments activos en `(owner_id, LOWER(work_label))`
**When** intenta subir la 11ª imagen al mismo `work_label`
**Then** el backend responde `409 Conflict` con `{ error: { code: 'IMAGE_LIMIT_REACHED', message_key: 'vendor.portfolio.image_limit_reached' } }`, no se crea registro ni se persiste binario.

### AC-03: Resize verificado

**Given** un vendor sube una imagen con dimensiones `3000 × 4000 px`
**When** el backend procesa el binario
**Then** la imagen persistida tiene long-edge `2048 px` (`1536 × 2048` aproximado, aspect ratio conservado) y MIME final `image/jpeg`.

---

## ⚠️ Edge Cases

### EC-01: MIME no permitido

**Given** un vendor envía un PDF
**When** el backend valida MIME y magic-bytes
**Then** responde `400 Bad Request` con `{ error: { code: 'INVALID_MIME' } }`. Allowlist: `image/jpeg`, `image/png`, `image/webp`.

#### Handling

* Allowlist server-side + verificación de magic-bytes (file signature).

### EC-02: Tamaño excedido

**Given** un vendor envía una imagen > 5 MB
**When** el middleware multer evalúa el tamaño
**Then** responde `413 Payload Too Large` con `{ error: { code: 'FILE_TOO_LARGE' } }`.

#### Handling

* Límite multer global + verificación post-disk.

### EC-03: Perfil oculto (`hidden`)

**Given** un vendor con `vendor_profile.status='hidden'`
**When** intenta upload
**Then** `409 Conflict` con `{ error: { code: 'PROFILE_HIDDEN' } }`.

### EC-04: Perfil soft-deleted

**Given** un vendor con `vendor_profile.deleted_at IS NOT NULL`
**When** intenta upload
**Then** `404 Not Found`.

### EC-05: `work_label` inválido

**Given** un vendor envía `:workLabel` que no matchea `^[a-zA-Z0-9\-_ ]{1,80}$`
**When** el backend valida
**Then** `400 Bad Request` con `{ error: { code: 'INVALID_WORK_LABEL' } }`.

### EC-06: Máximo de `work_labels` alcanzado

**Given** un vendor con 20 `work_labels` distintos activos
**When** intenta subir una imagen con un nuevo `work_label`
**Then** `409 Conflict` con `{ error: { code: 'WORK_LABEL_LIMIT_REACHED' } }`. Subir imágenes a `work_labels` existentes sigue permitido.

---

## 🚫 Validation Rules

| ID    | Rule                                                                | Message / Behavior                              |
| ----- | ------------------------------------------------------------------- | ----------------------------------------------- |
| VR-01 | MIME ∈ `{image/jpeg, image/png, image/webp}` (allowlist + magic-bytes). | `400 INVALID_MIME`                              |
| VR-02 | `size_bytes ≤ 5 MB`.                                                 | `413 FILE_TOO_LARGE`                            |
| VR-03 | `COUNT(*) < 10` para `(owner_id, LOWER(work_label), status='active')`. | `409 IMAGE_LIMIT_REACHED`                       |
| VR-04 | `COUNT(DISTINCT LOWER(work_label)) < 20` por vendor.                  | `409 WORK_LABEL_LIMIT_REACHED`                  |
| VR-05 | `:workLabel` matches `^[a-zA-Z0-9\-_ ]{1,80}$`.                       | `400 INVALID_WORK_LABEL`                        |
| VR-06 | `vendor_profile.status != 'hidden'`.                                  | `409 PROFILE_HIDDEN`                            |
| VR-07 | `vendor_profile.deleted_at IS NULL`.                                  | `404`                                            |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                |
| ------ | --------------------------------------------------------------------------------------------------- |
| SEC-01 | Ownership: solo el vendor autenticado puede modificar su propio portafolio.                         |
| SEC-02 | MIME allowlist server-side + verificación de magic-bytes (THR-008).                                 |
| SEC-03 | Sin ejecución de archivos: storage fuera del web root; descarga vía endpoint autenticado (US futura). |
| SEC-04 | Soft delete obligatorio aplica al DELETE de US-048; este upload nunca hard-deletea.                  |
| SEC-05 | Política por status del `VendorProfile` (D3).                                                       |
| SEC-06 | Sin path traversal: `work_label` y nombres de archivo sanitizados antes de tocar el filesystem.     |

### Negative Authorization Scenarios

* Sin sesión → `401`.
* Sesión `organizer` o `admin` → `403`.
* Vendor sobre perfil `hidden` → `409 PROFILE_HIDDEN`.
* Vendor sobre perfil soft-deleted → `404`.

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
| Screen / Route      | `/[locale]/vendor/portfolio`                                                                    |
| Main UI Pattern     | Dropzone por `work_label` + grid de imágenes con contador "N/10".                              |
| Primary Action      | "Subir imágenes"                                                                                |
| Secondary Actions   | "Crear nuevo trabajo" (input para nuevo `work_label`); soft delete vive en US-048.             |
| Empty State         | "Aún no has subido imágenes de tus trabajos."                                                  |
| Loading State       | Spinner por upload + barra de progreso multipart.                                              |
| Error State         | Banner accesible con mensaje i18n por code (`INVALID_MIME`, `FILE_TOO_LARGE`, `IMAGE_LIMIT_REACHED`, `WORK_LABEL_LIMIT_REACHED`, `INVALID_WORK_LABEL`, `PROFILE_HIDDEN`). |
| Success State       | Thumbnail aparece en el grid del work y contador se incrementa.                                |
| Accessibility Notes | Dropzone con keyboard support (Enter/Space para abrir picker); `aria-live` para el contador.   |
| Responsive Notes    | Mobile-first.                                                                                  |
| i18n Notes          | 4 locales: `es-LATAM`, `es-ES`, `pt`, `en`.                                                    |
| Currency Notes      | No aplica.                                                                                     |

---

## 🛠 Technical Notes

### Frontend

* Route / Page:
  * `app/[locale]/vendor/portfolio/page.tsx`
* Components:
  * `PortfolioUploader` (dropzone + multipart progress).
  * `WorkGrid` (grupos por `work_label`).
* State Management:
  * TanStack Query mutation + invalidación de `vendor.me.portfolio`.
* Forms:
  * Multipart upload via fetch API.
* API Client:
  * `vendorsApi.uploadPortfolioImage({ workLabel, file })`.

### Backend

* Use Case / Service:
  * `UploadPortfolioImageUseCase`.
* Controller / Route:
  * `POST /api/v1/vendors/me/portfolio/works/:workLabel/images`.
* Authorization Policy:
  * Ownership (sesión vendor).
* Validation:
  * Zod del path param + multer (memory storage, límite 5 MB) + MIME allowlist + magic-bytes + `sharp` para resize.
* Transaction Required:
  * Sí. La inserción de `attachments` ocurre en `prisma.$transaction` tras escribir el binario via `FileStoragePort`; si la inserción falla, se elimina el binario (compensación).

### Database

* Main Tables:
  * `attachments` (polimórfico).
* Constraints:
  * C-022 (service layer: ≤ 10 por grupo).
  * `attachment_status` enum: `active`, `deleted`.
* Index Considerations:
  * `idx_attachments_vendor_work_active (owner_id, work_label) WHERE owner_type='vendor_work' AND status='active'` (ya entregado por PB-P0-001).

### API

| Method | Endpoint                                                          | Purpose                                  |
| ------ | ----------------------------------------------------------------- | ---------------------------------------- |
| POST   | `/api/v1/vendors/me/portfolio/works/:workLabel/images`            | Subir imagen al `work_label` indicado.   |

### Observability / Audit

* Correlation ID Required: Yes
* Log Event Required: Yes (`vendor.portfolio.uploaded` con `vendor_profile_id`, `work_label`, `attachment_id`, `size_bytes`, `mime`, `correlation_id`).
* AdminAction Required: No (uploads vendor-driven no requieren `AdminAction`; `hide_attachment`/`remove_attachment` viven en flujos admin futuros).
* AIRecommendation Required: No

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                  | Type        |
| ----- | ------------------------------------------------------------------------- | ----------- |
| TS-01 | Upload válido a `work_label` nuevo (transición desde 0 imágenes).         | Integration |
| TS-02 | Upload de la 10ª imagen al mismo `work_label` permitido; 11ª bloqueada.   | Integration |
| TS-03 | Resize: imagen `3000×4000` resulta en long-edge `2048`, MIME jpeg.        | Integration |
| TS-04 | 20 `work_labels` distintos creados; 21º label bloqueado.                  | Integration |

### Negative Tests

| ID    | Scenario                                              | Expected Result          |
| ----- | ----------------------------------------------------- | ------------------------ |
| NT-01 | PDF                                                   | `400 INVALID_MIME`       |
| NT-02 | Imagen > 5 MB                                          | `413 FILE_TOO_LARGE`     |
| NT-03 | `work_label` con caracteres inválidos                 | `400 INVALID_WORK_LABEL` |
| NT-04 | Otro vendor sobre portfolio ajeno                     | `403`                    |
| NT-05 | Vendor con `status='hidden'`                          | `409 PROFILE_HIDDEN`     |
| NT-06 | Vendor soft-deleted                                   | `404`                    |
| NT-07 | Imagen con MIME spoofeado (magic-bytes distintos)     | `400 INVALID_MIME`       |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario              | Expected Result          |
| ---------- | --------------------- | ------------------------ |
| AUTH-TS-01 | Dueño / `approved`    | `201`                    |
| AUTH-TS-02 | Dueño / `pending`     | `201`                    |
| AUTH-TS-03 | Dueño / `rejected`    | `201`                    |
| AUTH-TS-04 | Dueño / `hidden`      | `409 PROFILE_HIDDEN`     |
| AUTH-TS-05 | Dueño / soft-deleted  | `404`                    |
| AUTH-TS-06 | Otro vendor           | `403`                    |
| AUTH-TS-07 | Sin sesión            | `401`                    |

### Accessibility Tests

* Dropzone con keyboard support (Enter/Space abre file picker).
* Contador con `aria-live="polite"`.
* Mensajes de error accesibles con `aria-describedby` por upload fallido.

---

## 📊 Business Impact

| Field               | Value                                                  |
| ------------------- | ------------------------------------------------------ |
| KPI Affected        | Atractivo del perfil del vendor; conversión a quote.   |
| Expected Impact     | Mejora visualización y diferenciación; cierre de PB-P1-026 junto con US-048. |
| Success Criteria    | Vendors completan portafolio con allowlist y resize aplicados. |
| Academic Demo Value | Uploads seguros con allowlist, magic-bytes y resize.   |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Dropzone + grid + contador accesible.
* `vendorsApi.uploadPortfolioImage` + MSW handler.

### Potential Backend Tasks

* `UploadPortfolioImageUseCase` con pipeline multer → magic-bytes → `sharp` → `FileStoragePort` → insert.
* DTO Zod del path param.
* Repository extension para `attachments`.

### Potential Database Tasks

* Verificación documental del schema y enums.

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* TS, NT, AUTH-TS, A11Y, security tests (magic-bytes, path traversal).

### Potential DevOps / Config Tasks

* Configurar variable `FILE_STORAGE_DRIVER=local`, `FILE_STORAGE_PATH=./storage/uploads`.

---

## ✅ Definition of Ready

* [x] Rol claro.
* [x] Goal/valor claros.
* [x] FRD/UC/BR enlazados (FR-VENDOR-006/007/008, UC-VENDOR-005, BR-VENDOR-005, BR-PRIVACY-011).
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

* [ ] Endpoint funcional con allowlist MIME + magic-bytes + tamaño + resize + límite por work + límite de works.
* [ ] `FileStoragePort` con `LocalFileStorageAdapter` operativo.
* [ ] Tests verdes (functional, negative, auth, accessibility, security).
* [ ] Log `vendor.portfolio.uploaded` registrado con `correlation_id`.
* [ ] i18n de mensajes en 4 locales.
* [ ] PO valida demo en `pending` y `approved`.

---

## 📝 Notes

* DELETE (soft delete) del attachment se entrega en US-048.
* Documentation Alignment Required (no bloqueantes) registradas en `management/user-stories/decision-resolutions/US-043-decision-resolution.md §5`: documentar endpoint en `docs/16 §M07`; considerar NFR de tamaño máximo de upload en futura iteración.
