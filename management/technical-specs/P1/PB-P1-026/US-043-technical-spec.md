# Technical Specification — US-043: Subir hasta 10 imágenes por trabajo del portafolio

## 1. Metadata

| Field                                | Value                                                                                                          |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| User Story ID                        | US-043                                                                                                         |
| Source User Story                    | `management/user-stories/US-043-upload-portfolio-images.md`                                                    |
| Decision Resolution Artifact         | `management/user-stories/decision-resolutions/US-043-decision-resolution.md`                                   |
| Priority                             | P1                                                                                                             |
| Backlog ID                           | PB-P1-026                                                                                                      |
| Backlog Title                        | Portafolio del vendor (10 imágenes / trabajo)                                                                  |
| Backlog Execution Order              | 45                                                                                                              |
| User Story Position in Backlog Item  | 1 de 2 (US-043 → US-048)                                                                                       |
| Related User Stories in Backlog Item | US-043, US-048                                                                                                 |
| Epic                                 | EPIC-VND-001                                                                                                   |
| Backlog Item Dependencies            | PB-P1-024 (perfil del vendor), PB-P0-001 (schema), PB-P0-003 (error envelope), PB-P0-007 (middleware chain)    |
| Feature                              | Portafolio del vendor con `work_label` polimórfico + resize básico                                              |
| Module / Domain                      | Attachments / Vendors                                                                                          |
| User Story Status                    | Approved with Minor Notes                                                                                     |
| Backlog Alignment Status             | Found                                                                                                          |
| Technical Spec Status                | Ready for Task Breakdown                                                                                       |
| Created Date                         | 2026-06-26                                                                                                     |
| Last Updated                         | 2026-06-26                                                                                                     |

---

## 2. Backlog Execution Context

### Product Backlog Item

`PB-P1-026` cubre el portafolio del vendor con 10 imágenes por trabajo + soft delete. Contiene US-043 (upload) y US-048 (DELETE soft). Depende de PB-P1-024 (US-040/041) para el `VendorProfile`.

### Execution Order Rationale

US-043 se ejecuta después de PB-P1-025 (US-042). Posición 1 de 2 en PB-P1-026 (US-048 es 2 de 2). Execution order 45.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item                          | Suggested Order |
| ---------- | --------------------------------------------- | --------------- |
| US-043     | Upload de imágenes por `work_label`.          | 1               |
| US-048     | Soft delete del attachment.                   | 2               |

---

## 3. Executive Technical Summary

US-043 introduce el módulo `modules/attachments` con `UploadPortfolioImageUseCase`, `AttachmentRepository`, `FileStoragePort` + `LocalFileStorageAdapter`, controller `POST /api/v1/vendors/me/portfolio/works/:workLabel/images`, y el frontend `PortfolioUploader` + `WorkGrid`. La pipeline server-side es:

1. `multer` (memory storage) recibe el archivo con límite de 5 MB.
2. Validación MIME por header + verificación de magic-bytes (allowlist `image/jpeg|image/png|image/webp`).
3. Validación del path param `:workLabel` con Zod `^[a-zA-Z0-9\-_ ]{1,80}$`.
4. Validación del estado del `VendorProfile` (D3): `pending`/`approved`/`rejected` permitido; `hidden` `409`; soft-deleted `404`.
5. Conteo `COUNT(*) < 10` para `(owner_id, LOWER(work_label), status='active')` (C-022) y `COUNT(DISTINCT LOWER(work_label)) < 20` cuando el label es nuevo (D6).
6. Resize con `sharp` (long-edge ≤ 2048 px, JPEG quality 80, aspect ratio).
7. `FileStoragePort.save(buffer, { mime, filename })` escribe el binario y devuelve `storage_url`.
8. `prisma.$transaction` inserta `attachments(...)`; si falla, el adapter de storage elimina el binario (compensación).
9. Emite log `vendor.portfolio.uploaded` con `correlation_id`.

Sin migraciones nuevas: PB-P0-001 entregó tabla `attachments` polimórfica con enums `attachment_status`/`attachment_owner_type`, índice parcial y columnas necesarias (`docs/18 §15.1`, `§19`).

---

## 4. Scope Boundary

### In Scope

- Módulo `modules/attachments` con use case, repository, port + adapter local, controller.
- DTO Zod del path param + multer middleware con límite 5 MB.
- Pipeline magic-bytes + `sharp` resize.
- Controller handler con guards Vendor + exclusion.
- Frontend `PortfolioUploader` + `WorkGrid`.
- i18n 4 locales.
- Tests (unit, integration, auth, contract, security, a11y).
- Seed demo extendido.

### Out of Scope

- DELETE (soft delete) → US-048.
- Antimalware / scanning de virus.
- Watermarking.
- CDN / lifecycle policies.
- Múltiples thumbnails.
- Galería avanzada / reordenamiento.
- `ObjectStorageAdapter` (futuro).

### Explicit Non-Goals

- No introducir tabla `vendor_work`.
- No exponer `storage_url` interno directamente; usar identificador `attachment_id` en frontend cuando aplica.

---

## 5. Architecture Alignment

### Backend Architecture

Reuso del stack: Node + Express + TypeScript + Prisma + PostgreSQL. Nuevo módulo `modules/attachments` siguiendo Hexagonal: use cases en aplicación, `AttachmentRepository` por Prisma, `FileStoragePort` con `LocalFileStorageAdapter`. Multer en `memoryStorage` para evitar I/O temporal.

### Frontend Architecture

Next.js + App Router. Client Component `PortfolioUploader` con dropzone, multipart progress y manejo de errores i18n. `WorkGrid` agrupa por `work_label`.

### Database Architecture

Reuso de `attachments` polimórfica. Sin migraciones nuevas. Índice parcial `idx_attachments_vendor_work_active` cubre el conteo C-022. Confirmar columnas `mime`, `size_bytes`, `storage_url`, `work_label`, `uploaded_by`, `deleted_at`, `deleted_by`, `deletion_reason`, `status`.

### API Architecture

REST JSON bajo `/api/v1`. Multipart upload con un campo `file`. Error envelope estándar.

### AI / PromptOps Architecture

No aplica.

### Security Architecture

Allowlist MIME + magic-bytes (THR-008). Storage fuera del web root (`./storage/uploads/...`). Ownership por sesión. Sin path traversal: `work_label` y filename sanitizados; UUID en filename.

### Testing Architecture

Vitest + Supertest + MSW + Playwright opcional + axe. Tests de seguridad: magic-bytes y path traversal.

---

## 6. Functional Interpretation

| Acceptance Criterion             | Technical Interpretation                                                                                                                                   | Impacted Layer(s) |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| AC-01 upload válido               | Pipeline completa (validación → resize → storage → insert) en transacción; response 201 con metadata + dimensions.                                          | BE, DB, Storage   |
| AC-02 límite por work             | `COUNT(*) < 10` con índice parcial; `409 IMAGE_LIMIT_REACHED`.                                                                                              | BE                |
| AC-03 resize verificado            | `sharp` aplica long-edge ≤ 2048 px; MIME final jpeg; response incluye `dimensions: {width, height}`.                                                        | BE                |
| EC-01 MIME no permitido            | Allowlist por header + magic-bytes; `400 INVALID_MIME`.                                                                                                    | BE                |
| EC-02 tamaño excedido              | multer rechaza con `413 FILE_TOO_LARGE`.                                                                                                                    | BE                |
| EC-03 hidden                       | Verificación previa al pipeline; `409 PROFILE_HIDDEN`.                                                                                                     | BE                |
| EC-04 soft-deleted                 | Verificación previa; `404`.                                                                                                                                | BE                |
| EC-05 `work_label` inválido        | Zod path param `.regex(...)`; `400 INVALID_WORK_LABEL`.                                                                                                    | BE                |
| EC-06 máx work_labels              | `COUNT(DISTINCT LOWER(work_label)) < 20`; `409 WORK_LABEL_LIMIT_REACHED`.                                                                                  | BE                |
| AUTH-TS-01..07                     | Guards + middleware sesión + matriz auth × estado.                                                                                                          | BE                |
| A11Y dropzone + contador           | Dropzone keyboard-accessible; contador `aria-live`.                                                                                                         | FE                |
| i18n 4 locales                     | `messages/{es-LATAM,es-ES,pt,en}.json` con claves `vendor.portfolio.*`.                                                                                     | FE                |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

Nuevo módulo `modules/attachments` (siguiendo `docs/14 §attachments`). Expone `UploadPortfolioImageUseCase`. Reusa guards de `modules/vendors`.

### Use Cases / Application Services

**`UploadPortfolioImageUseCase`**

1. Recibe `{ currentUser, workLabel, fileBuffer, mimeFromHeader, originalFilename }`.
2. Resuelve `vendorProfile = vendorProfileRepository.findActiveByVendorUserId(currentUser.id)`. Si null o `deleted_at` → `404`.
3. Si `vendorProfile.status === 'hidden'` → `409 PROFILE_HIDDEN`.
4. Verifica magic-bytes (`file-type` o `image-size`) contra allowlist; si no coincide → `400 INVALID_MIME`.
5. `normalizedLabel = workLabel.trim().toLowerCase()`.
6. `existsLabel = await attachmentRepository.existsActiveByOwnerAndLabel(vendorProfile.id, normalizedLabel)`.
7. `countInGroup = await attachmentRepository.countActiveByOwnerAndLabel(vendorProfile.id, normalizedLabel)`. Si `countInGroup >= 10` → `409 IMAGE_LIMIT_REACHED`.
8. Si `!existsLabel`: `distinctLabels = await attachmentRepository.countDistinctActiveLabelsByOwner(vendorProfile.id)`. Si `distinctLabels >= 20` → `409 WORK_LABEL_LIMIT_REACHED`.
9. `processed = await sharpPipeline(fileBuffer)` → buffer JPEG redimensionado + dims.
10. `{ storageUrl, attachmentId } = await fileStoragePort.save(processed.buffer, { mime: 'image/jpeg', uuid: newUuid() })`.
11. `prisma.$transaction(async tx => { const created = await attachmentRepository.create({ id: attachmentId, ownerType: 'vendor_work', ownerId: vendorProfile.id, workLabel, status: 'active', mime: 'image/jpeg', sizeBytes: processed.buffer.length, storageUrl, uploadedBy: currentUser.id, tx }); return created; })`.
12. Si la transacción falla → `fileStoragePort.delete(storageUrl)` (compensación) y propaga error.
13. Emite log `vendor.portfolio.uploaded` con `vendor_profile_id`, `work_label`, `attachment_id`, `size_bytes`, `mime='image/jpeg'`, `dimensions`, `correlation_id`.
14. Retorna el recurso para mapear a `201 Created`.

### Controllers / Routes

```ts
router.post(
  '/vendors/me/portfolio/works/:workLabel/images',
  vendorRoleGuard,
  adminExclusionGuard,
  organizerExclusionGuard,
  fileUploadMiddleware.single('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  asyncHandler(controller.uploadPortfolioImage.bind(controller))
);
```

Controller delgado: extrae `req.user`, `req.params.workLabel`, `req.file`, llama al use case y mapea a `201 { id, ownerType, ownerId, workLabel, mime, sizeBytes, storageUrl, status, createdAt, dimensions }`.

### DTOs / Schemas

```ts
export const workLabelParam = z.object({
  workLabel: z.string().regex(/^[a-zA-Z0-9\-_ ]{1,80}$/),
});

export const uploadPortfolioImageResponse = z.object({
  id: z.string().uuid(),
  ownerType: z.literal('vendor_work'),
  ownerId: z.string().uuid(),
  workLabel: z.string(),
  mime: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  storageUrl: z.string(),
  status: z.literal('active'),
  createdAt: z.string().datetime(),
  dimensions: z.object({ width: z.number(), height: z.number() }),
});
```

### Repository / Persistence

```ts
class AttachmentRepository {
  create(args: { ...; tx?: PrismaTx }): Promise<Attachment>
  existsActiveByOwnerAndLabel(ownerId: string, normalizedLabel: string): Promise<boolean>
  countActiveByOwnerAndLabel(ownerId: string, normalizedLabel: string): Promise<number>
  countDistinctActiveLabelsByOwner(ownerId: string): Promise<number>
}
```

Conteo case-insensitive: `WHERE LOWER(work_label) = LOWER($1)`.

### Validation Rules

| ID    | Regla                                                                | Comportamiento                          |
| ----- | -------------------------------------------------------------------- | --------------------------------------- |
| VR-01 | MIME header + magic-bytes ∈ allowlist                                | `400 INVALID_MIME`                      |
| VR-02 | `size_bytes ≤ 5 MB` (multer)                                          | `413 FILE_TOO_LARGE`                    |
| VR-03 | `COUNT(*) < 10` por `(owner_id, LOWER(work_label))`                   | `409 IMAGE_LIMIT_REACHED`               |
| VR-04 | `COUNT(DISTINCT LOWER(work_label)) < 20`                              | `409 WORK_LABEL_LIMIT_REACHED`          |
| VR-05 | `workLabel` matches regex                                              | `400 INVALID_WORK_LABEL`                |
| VR-06 | `status != 'hidden'`                                                   | `409 PROFILE_HIDDEN`                    |
| VR-07 | `deleted_at IS NULL`                                                   | `404`                                    |

### Error Handling

Reusa error envelope estándar. Códigos: `400 INVALID_MIME`, `400 INVALID_WORK_LABEL`, `401`, `403`, `404`, `409 IMAGE_LIMIT_REACHED`, `409 WORK_LABEL_LIMIT_REACHED`, `409 PROFILE_HIDDEN`, `413 FILE_TOO_LARGE`.

### Transactions

Storage write antes de la inserción (para fail-fast en disk). Compensación en error de DB. Insert vive en `prisma.$transaction` (preparado para múltiples efectos si se requiere en el futuro).

### Observability

Log `vendor.portfolio.uploaded` (info) con `correlation_id`. Log `vendor.portfolio.upload_failed` (warn) en errores 4xx/5xx con `code`.

---

## 8. Frontend Technical Design

### Routes / Pages

- `app/[locale]/vendor/portfolio/page.tsx` (Client wrapper que carga lista actual via `vendor.me.portfolio`).

### Components

- `components/vendor/portfolio/PortfolioUploader.tsx` con dropzone (keyboard-accessible), input `work_label`, progress bar, manejo de errores con códigos i18n.
- `components/vendor/portfolio/WorkGrid.tsx` con agrupación por `work_label` y contador `aria-live`.

### Forms

Multipart `FormData` directo via `fetch` o helper del cliente.

### State Management

TanStack Query mutation `useUploadPortfolioImage` + invalidación de la query `vendor.me.portfolio`. Optimistic update opcional del placeholder; revertir en error.

### Data Fetching

`vendorsApi.uploadPortfolioImage({ workLabel, file })` extendido en `lib/api/vendorsApi.ts`.

### Loading / Empty / Error / Success States

- Loading: barra de progreso por upload.
- Empty: "Aún no has subido imágenes de tus trabajos."
- Error: banner i18n por código.
- Success: thumbnail aparece + contador `N/10` se actualiza.

### Accessibility

Dropzone keyboard-accessible (Enter/Space). Contador `aria-live="polite"`. Mensajes de error con `aria-describedby`.

### i18n

Claves `vendor.portfolio.*` en 4 locales.

---

## 9. API Contract Design

| Method | Endpoint                                                          | Purpose                              | Auth Required | Request                                                                | Response                                                                                                                       | Error Cases                                                                                                                                                                                          |
| ------ | ----------------------------------------------------------------- | ------------------------------------ | ------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/v1/vendors/me/portfolio/works/:workLabel/images`            | Subir imagen al `work_label`.        | Sí (vendor)   | `multipart/form-data` con campo `file` (jpg/png/webp ≤ 5 MB).          | `201 Created` con `{ id, ownerType, ownerId, workLabel, mime, sizeBytes, storageUrl, status, createdAt, dimensions }`.        | `400 INVALID_MIME`, `400 INVALID_WORK_LABEL`, `401`, `403`, `404`, `409 IMAGE_LIMIT_REACHED`, `409 WORK_LABEL_LIMIT_REACHED`, `409 PROFILE_HIDDEN`, `413 FILE_TOO_LARGE`.                            |

---

## 10. Database / Prisma Design

### Models Impacted

- `Attachment` (insert).
- `VendorProfile` (lectura).

### Fields / Columns

Sin nuevos campos. Confirmar (DB-001): `mime`, `size_bytes`, `storage_url`, `work_label`, `owner_type`, `owner_id`, `status`, `uploaded_by`, `deleted_at`, `deleted_by`, `deletion_reason`.

### Relations

`Attachment.ownerId` → `VendorProfile.id` (lógico, sin FK formal por polimorfismo).

### Indexes

`idx_attachments_vendor_work_active (owner_id, work_label) WHERE owner_type='vendor_work' AND status='active'`. Sin nuevos.

### Constraints

C-022 (service layer). C-060 (soft delete). Sin nuevos.

### Migrations Impact

Ninguna nueva. Verificar en DB-001.

### Seed Impact

Extender el seed: un vendor con 9 imágenes en un work (para demo del 10º) y otro con 10 (para demo del bloqueo en el 11º).

---

## 11. AI / PromptOps Design

No aplica.

---

## 12. Security & Authorization Design

### Authentication

Sesión via HTTP-only cookie (PB-P0-006).

### Authorization

Ownership por sesión: `currentUser.id == vendor_user_id`. Reuso de `VendorRoleGuard` + exclusion guards.

### Ownership Rules

El vendor sólo puede modificar su propio portafolio.

### Role Rules

Sólo `vendor`. Admin y organizer rechazados.

### Negative Authorization Scenarios

- Sin sesión → `401`.
- `admin`/`organizer` → `403`.
- Vendor con `hidden` → `409 PROFILE_HIDDEN`.
- Vendor soft-deleted → `404`.

### Audit Requirements

Sin `AdminAction` para uploads vendor-driven (los moderation actions `hide_attachment`/`remove_attachment` viven en flujos admin futuros).

### Sensitive Data Handling

Storage fuera del web root. URL no expuesta directamente al cliente como path filesystem; usar `attachment.id` para descargas via endpoint autenticado en US futura.

---

## 13. Testing Strategy

### Unit Tests

- DTO Zod regex.
- Helper `normalizeWorkLabel`.
- Pipeline `sharp` (mock + verificación de dimensions).
- Branches del use case (hidden, soft-deleted, INVALID_MIME, IMAGE_LIMIT, WORK_LABEL_LIMIT).

### Integration Tests

- TS-01..TS-04, NT-01..NT-07.
- Verificación de compensación: simular fallo de DB y verificar que el binario se elimina.

### API Tests

Supertest cubriendo todos los códigos: `201`, `400 INVALID_MIME`, `400 INVALID_WORK_LABEL`, `401`, `403`, `404`, `409 IMAGE_LIMIT_REACHED`, `409 WORK_LABEL_LIMIT_REACHED`, `409 PROFILE_HIDDEN`, `413 FILE_TOO_LARGE`.

### E2E Tests

Opcional Playwright para el flujo completo (upload + grid update).

### Security Tests

- MIME spoofing: archivo con extensión `.png` pero magic-bytes de PDF → `400 INVALID_MIME`.
- Path traversal: `workLabel` malformado → bloqueado por regex.
- Storage location: assert que el binario se escribe fuera del web root.

### Accessibility Tests

- Dropzone keyboard.
- Contador `aria-live`.
- Errores con `aria-describedby`.

### AI Tests

No aplica.

### Seed / Demo Tests

Verificar que el seed cubre los escenarios demo.

### CI Checks

Lint + Vitest + Supertest. Sin nuevos jobs.

---

## 14. Observability & Audit

### Logs

- `vendor.portfolio.uploaded` (info) con campos del §7.
- `vendor.portfolio.upload_failed` (warn) con `code` y `phase` (validation/storage/db).

### Correlation ID

Propagado desde middleware central.

### AdminAction

No requerido para uploads vendor-driven.

### Error Tracking

Heredado del middleware central.

### Metrics

N/A.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

- Vendor demo A: `work_label='boda-pareja-2024'` con 9 imágenes activas.
- Vendor demo B: `work_label='xv-anos-2024'` con 10 imágenes activas (demo del bloqueo).
- Vendor demo C: `status='hidden'` para AUTH-TS-04.

### Demo Scenario Supported

- Subir 10ª imagen exitosa.
- Bloqueo en 11ª.
- Bloqueo en `hidden`.

### Reset / Isolation Notes

Reuso de PB-P0-014. Limpieza opcional del directorio `storage/uploads` por `npm run seed:reset`.

---

## 16. Documentation Alignment Required

| Document / Source            | Conflict                                                                                                       | Current Decision                              | Recommended Action                                                 | Blocks Implementation? |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------ | ---------------------- |
| `docs/16 §M07`               | Falta documentar el endpoint.                                                                                  | Documentar tras D1.                            | Actualizar `docs/16` con request/response/errors.                  | No                     |
| `docs/10`                    | No existe NFR específico para tamaño máximo de upload.                                                         | 5 MB establecido en D2.                       | Considerar agregar `NFR-PERF-UPLOAD-001`.                          | No                     |

---

## 17. Technical Risks & Mitigations

| Risk                                                                                              | Impact                                       | Mitigation                                                                       |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------- |
| MIME spoofing.                                                                                    | Distribución de malware (THR-008).            | Magic-bytes + allowlist + sin ejecución.                                          |
| Race entre `COUNT()` y `INSERT()` (10ma simultánea).                                              | Crear 11ª imagen.                            | `SELECT ... FOR UPDATE` sobre el grupo o reintento con verificación post-insert. |
| Fallo de DB tras escritura en disk.                                                               | Orphan files.                                 | Compensación: eliminar binario en error de DB.                                    |
| `work_label` con espacios en path URL.                                                             | URLs mal codificadas.                         | Frontend usa `encodeURIComponent`; backend valida tras `decodeURIComponent`.    |
| Resize con imagen corrupta.                                                                        | Exception en `sharp`.                         | Try/catch + `400 INVALID_IMAGE`.                                                  |
| Storage path traversal vía filename.                                                              | RCE / sobreescritura.                         | Generar filename como UUID v4; no usar `originalname` directamente.              |

---

## 18. Implementation Guidance for Coding Agents

### Archivos impactados

**Backend**:
- `src/modules/attachments/dto/work-label.param.ts`
- `src/modules/attachments/use-cases/upload-portfolio-image.use-case.ts`
- `src/modules/attachments/repositories/attachment.repository.ts`
- `src/modules/attachments/ports/file-storage.port.ts`
- `src/modules/attachments/adapters/local-file-storage.adapter.ts`
- `src/modules/attachments/controllers/portfolio.controller.ts`
- `src/modules/attachments/routes/portfolio.routes.ts`
- `src/modules/attachments/services/sharp-pipeline.ts`
- `src/modules/attachments/services/magic-bytes-validator.ts`
- `src/shared/middlewares/file-upload.middleware.ts`
- `src/shared/logging/vendor-events.ts` (extensión con `vendor.portfolio.*`)

**Frontend**:
- `app/[locale]/vendor/portfolio/page.tsx`
- `components/vendor/portfolio/PortfolioUploader.tsx`
- `components/vendor/portfolio/WorkGrid.tsx`
- `lib/api/vendorsApi.ts` (extender con `uploadPortfolioImage`)
- `messages/{es-LATAM,es-ES,pt,en}.json`

**Config**:
- `.env.example`: `FILE_STORAGE_DRIVER=local`, `FILE_STORAGE_PATH=./storage/uploads`.
- `.gitignore`: `storage/uploads/`.

### Orden sugerido

1. DB-001 verificación schema.
2. `FileStoragePort` + `LocalFileStorageAdapter` con UT.
3. `magic-bytes-validator` + `sharp-pipeline` (puros).
4. Repository extensiones.
5. UseCase con branches y compensación.
6. Controller + ruta + middleware multer.
7. Logger.
8. Frontend `vendorsApi` + MSW handler.
9. Componentes + i18n.
10. Seed demo.
11. Tests integración + auth + security.
12. Documentación (docs/16).

### Decisiones que no deben reabrirse

D1 (endpoint), D2 (5 MB), D3 (política por status), D4 (resize sharp), D5 (`work_label` regex), D6 (20 labels).

### Qué no implementar

- DELETE (US-048).
- Antimalware.
- Watermarking.
- CDN.
- Thumbnails múltiples.

### Assumptions to preserve

- Schema entregado por PB-P0-001.
- Storage local en MVP (driver configurable via env).
- Reuso de guards de `modules/vendors`.

---

## 19. Task Generation Notes

| Grupo | Tasks |
| ----- | ----: |
| DB    | 1 (verificación schema) |
| BE    | 8 (multer middleware, port + adapter, magic-bytes, sharp pipeline, repository, use case, controller, logger) |
| FE    | 4 (page, PortfolioUploader, WorkGrid + vendorsApi, i18n) |
| SEED  | 1 (vendors demo con 9/10 imágenes + hidden) |
| OPS   | 1 (env + .gitignore + storage dir bootstrap) |
| QA    | 6 (UT, IT, AUTH, Contract, Security, A11Y) |
| DOC   | 2 (docs/16, considerar NFR upload) |

**Total estimado ~23 tareas.**

### Required QA tasks

- Unit tests por branch del use case.
- Integration con DB y storage real (temp dir).
- Auth matrix.
- Contract test del response.
- Security tests (MIME spoofing, path traversal, storage location).
- A11Y.

### Required security tasks

- Magic-bytes validator + tests.
- Filename UUID + storage path sanitization.

### Required seed/demo tasks

- Extender seed.

### Required documentation tasks

- `docs/16 §M07`.
- Considerar NFR.

### Dependencies between tasks

- DB-001 bloquea BE-*.
- BE-* bloquean FE-* y QA.
- DOC en paralelo.

### Backlog consolidated `tasks.md`

PB-P1-026 contiene US-043 y US-048. Considerar generar `tasks.md` consolidado tras procesar ambas US.

---

## 20. Technical Spec Readiness

| Check                                                       | Status |
| ----------------------------------------------------------- | ------ |
| User Story approved or explicitly allowed for draft spec    | Pass   |
| Product Backlog mapping found                                | Pass   |
| Decision Resolution reviewed if present                      | Pass   |
| Scope clear                                                  | Pass   |
| Architecture alignment clear                                 | Pass   |
| API impact clear                                             | Pass   |
| DB impact clear                                              | Pass   |
| AI impact clear                                              | N/A    |
| Security impact clear                                        | Pass   |
| Testing strategy clear                                       | Pass   |
| Ready for Development Task Breakdown                         | Yes    |

---

## 21. Final Recommendation

`Ready for Task Breakdown`.

US-043 introduce el módulo `modules/attachments` con todas las capacidades operacionales requeridas (allowlist + magic-bytes + resize + storage + límites + observabilidad) reusando schema y middleware de PB-P0. US-048 cerrará el backlog item con el DELETE (soft delete). Sin migraciones nuevas. 2 acciones documentales no bloqueantes.
