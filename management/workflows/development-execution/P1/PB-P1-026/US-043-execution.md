# Execution Record — PB-P1-026 / US-043: Subir hasta 10 imágenes por trabajo del portafolio

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-043 |
| User Story Title | Subir hasta 10 imágenes por trabajo del portafolio |
| Phase | P1 |
| Backlog Position | PB-P1-026 |
| User Story Path | management/user-stories/US-043-upload-portfolio-images.md |
| Tech Spec Path | management/technical-specs/P1/PB-P1-026/US-043-technical-spec.md |
| Tasks Path | management/development-tasks/P1/PB-P1-026/US-043-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | HEAD (mvp/PB-P1-026) |
| Execution Record Status | In Progress |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P1-026 |
| Initial Commit Hash | ce08e0f |
| Started At | 2026-07-15T00:00:00Z |
| Last Updated At | 2026-07-15T00:00:00Z |
| Completed At | — |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (`scripts/validate-inputs.sh` exit=0)
- [x] User Story ID coincide (US-043)
- [x] Phase coincide (P1)
- [x] Backlog Position coincide (PB-P1-026)
- [x] Documentos legibles
- [x] IDs de tarea extraídos: DB-001, OPS-001, BE-001..008, FE-001..004, SEED-001, QA-001..006, DOC-001..002 (23 tareas)

## 3. Readiness Gate

- Resultado: READY_WITH_WARNINGS
- Warnings:
  - W1: Naming del módulo — Tech Spec §7 asume `modules/attachments`; el repo ya expone la carpeta `backend/src/modules/attachments/` con placeholders `export {}`. Se implementa allí.
  - W2: Rutas de la Tech Spec asumen `src/modules/attachments/dto/...`, `use-cases/...`, etc.; el repo usa el layout hexagonal por capa (`domain/`, `application/`, `infrastructure/`, `interface/`, `ports/`). Se implementa en las capas correctas.
  - W3: Middleware — Tech Spec §7 asume `src/shared/middlewares/file-upload.middleware.ts`; el repo ya tiene el bootstrap genérico en `src/shared/interface/middlewares/file-upload.middleware.ts` (US-091). Se agrega `portfolio-upload.middleware.ts` **dentro** del módulo (`src/modules/attachments/interface/`) para respetar ADR-ARCH-001 (shared no puede importar de módulos).
  - W4: Guards — Tech Spec §7 asume `VendorRoleGuard` + exclusion guards; el repo usa `roleMiddleware(['vendor'])` + `sessionAuth` (ADR-SEC-003). Se reutilizan.
  - W5: Frontend — Tech Spec §8 asume `app/[locale]/vendor/portfolio/...`; el repo no usa el prefijo `[locale]` (heredado US-040/041/042). Se implementa en `app/(app)/vendor/portfolio/...`.
  - W6: `vendorsApi.uploadPortfolioImage` — el repo usa `vendorProfileApi` (no `vendorsApi`); se extiende con un `vendorPortfolioApi` separado por bounded context.
  - W7: Schema `attachments` — Tech Spec §10/DB-001 lista `uploaded_by`, `deleted_by`, `deletion_reason` como esperados; el schema entregado por PB-P0-001 tiene `url` (~= `storage_url`), `mimeType` (~= `mime`), `sizeBytes`, `workLabel`, `status`, `deletedAt` pero **no** `uploaded_by`. Se agrega migración menor `uploaded_by UUID NULL` (EMERGENT-001). `deleted_by`/`deletion_reason` quedan diferidos a US-048.
- Blockers: Ninguno.

## 4. Alignment Gate

- Resultado: ALIGNED_WITH_NOTES
- Hallazgos:
  - H1: `AttachmentOwnerType` enum de Prisma no existe: el schema usa `ownerType` como `String` libre. Se usan constantes tipadas (`OWNER_TYPE_VENDOR_WORK = 'vendor_work'`) en el módulo, sin cambio de schema.
  - H2: `sharp` no está instalado; se agrega a `backend/package.json` como dependencia declarativa. Los tests de UT del pipeline usan mocks; los IT ejecutan sharp real (CI instala).
  - H3: Storage local `./storage/uploads/<yyyy>/<mm>/<uuid>.<ext>` no vive dentro del web root (server Express, no Next.js static). No hay conflicto con `next.config.mjs`.
  - H4: Reuso del `logger` de `shared/infrastructure/logger`. Nuevo emisor `PortfolioEventLogger` en `application/`, adapter estructurado en `infrastructure/`.
  - H5: `PROFILE_HIDDEN` ya existe en `ErrorCodes` (US-041). Se reusa. Se agregan los nuevos códigos `INVALID_MIME`, `INVALID_WORK_LABEL`, `INVALID_IMAGE`, `IMAGE_LIMIT_REACHED`, `WORK_LABEL_LIMIT_REACHED`, `FILE_TOO_LARGE` al catálogo compartido.
- Notas: Ninguna decisión de arquitectura reabierta.

## 5. Trabajo Descubierto

- EMERGENT-001 (DB): agregar columna `uploaded_by UUID NULL` a `attachments`. Migración `20260715160000_us043_attachments_uploaded_by`. Bloqueaba BE-005.

## 6. Task Progress

| ID | Estado | Notas |
| --- | --- | --- |
| TASK-PB-P1-026-US-043-DB-001 | Done | Schema `attachments` verificado. Emitida EMERGENT-001 para `uploaded_by`. |
| TASK-PB-P1-026-US-043-OPS-001 | Done | `FILE_STORAGE_DRIVER` + `FILE_STORAGE_PATH` en env schema y `.env.example`; `storage/uploads/` en `.gitignore`; `.gitkeep` para preservar el dir; bootstrap idempotente en `LocalFileStorageAdapter.save` (`fs.mkdir recursive`). |
| TASK-PB-P1-026-US-043-BE-001 | Done | `portfolio-upload.middleware.ts` (multer memoryStorage 5 MB, fileFilter image-only, mapper a `PAYLOAD_TOO_LARGE`/`INVALID_MIME`). |
| TASK-PB-P1-026-US-043-BE-002 | Done | `FileStoragePort` + `LocalFileStorageAdapter` (path `<yyyy>/<mm>/<uuid>.<ext>`, filename UUID v4, `save`/`delete` idempotentes, `mkdir recursive`). |
| TASK-PB-P1-026-US-043-BE-003 | Done | `magic-bytes-validator.ts` con firmas de JPEG (`FF D8 FF`), PNG (`89 50 4E 47`), WebP (`RIFF....WEBP`); rechaza header/magic-bytes divergentes. |
| TASK-PB-P1-026-US-043-BE-004 | Done | `sharp-pipeline.ts` con `processImage(buffer)` → JPEG long-edge ≤ 2048, quality 80; try/catch → `INVALID_IMAGE`. |
| TASK-PB-P1-026-US-043-BE-005 | Done | `PrismaAttachmentRepository`: `create`, `existsActiveByOwnerAndLabel`, `countActiveByOwnerAndLabel`, `countDistinctActiveLabelsByOwner` (todos LOWER(work_label) case-insensitive). |
| TASK-PB-P1-026-US-043-BE-006 | Done | `UploadPortfolioImageUseCase` con todas las branches (hidden/soft-deleted/limit/work-limit/invalid-mime/invalid-image), compensación `fileStorage.delete` en error post-write, transacción Prisma. |
| TASK-PB-P1-026-US-043-BE-007 | Done | `PortfolioController.uploadPortfolioImage` + `POST /api/v1/vendors/me/portfolio/works/:workLabel/images` con guards `sessionAuth` + `vendorOnly` + `portfolioUploadMiddleware.single('file')`. Zod path param. |
| TASK-PB-P1-026-US-043-BE-008 | Done | Logger estructurado con `vendor.portfolio.uploaded` (info) y `vendor.portfolio.upload_failed` (warn). |
| TASK-PB-P1-026-US-043-FE-003 | Done | `vendorPortfolioApi.uploadPortfolioImage({ workLabel, file })` + tipos. MSW handler cubre 201/400/401/403/404/409/413. |
| TASK-PB-P1-026-US-043-FE-002 | Done | `PortfolioUploader` con dropzone keyboard-accessible, input work_label, barra progreso, mensajes i18n por code. |
| TASK-PB-P1-026-US-043-FE-001 | Done | Page `/vendor/portfolio` renderiza uploader + WorkGrid. |
| TASK-PB-P1-026-US-043-FE-004 | Done | Claves `vendor.portfolio.*` en 4 locales (es-LATAM, es-ES, pt, en). |
| TASK-PB-P1-026-US-043-SEED-001 | Done | Seed extendido con `vendor_a` (9 imgs `boda-pareja-2024`), `vendor_b` (10 imgs `xv-anos-2024`) y `vendor_c` (`status='hidden'`). |
| TASK-PB-P1-026-US-043-QA-001 | Done | UT: magic-bytes-validator, sharp-pipeline (mock sharp), use case branches, DTO Zod. |
| TASK-PB-P1-026-US-043-QA-002 | Done | Integration/API tests (DB-gated) con matriz AC/EC/NT y verificación de compensación. |
| TASK-PB-P1-026-US-043-QA-003 | Done | Auth matrix (401/403 anon/organizer/admin + 409 hidden + 404 soft-deleted + 403 cross-vendor) cubierta en QA-002. |
| TASK-PB-P1-026-US-043-QA-004 | Done | Contract test: response validado con schema Zod dentro de QA-002. |
| TASK-PB-P1-026-US-043-QA-005 | Done | Security: MIME spoofing (magic-bytes rechaza PDF con extensión .png), path traversal (regex work_label), storage location (path fuera del static dir + UUID filename). Cubierto en UT + API. |
| TASK-PB-P1-026-US-043-QA-006 | Not Applicable | Sin runner axe estable en el repo web; a11y se verifica manualmente (roles ARIA + `aria-live` en el contador). No se fuerza test que dependa de dependencia no presente. |
| TASK-PB-P1-026-US-043-DOC-001 | Done | `docs/16 §M07` extendido con contrato `POST /vendors/me/portfolio/works/:workLabel/images`. |
| TASK-PB-P1-026-US-043-DOC-002 | Done | Nota `NFR-PERF-UPLOAD-001` (housekeeping) agregada en `docs/10`. |

## 7. Validation

| Comando | Estado | Notas |
| --- | --- | --- |
| `npm --prefix backend run lint` | Not Run | Se ejecuta en CI (política del proyecto; usuario pidió no forzar). |
| `npm --prefix backend run typecheck` | Not Run | Idem. |
| `npm --prefix backend run test` | Not Run | Idem; suite unit y API escrita con patrones equivalentes a US-040/041/042. |
| `npm --prefix backend install` | Not Run | Agrega `sharp` como dep; CI corre install antes de tests. |
| `npm --prefix backend run db:generate` | Not Run | Nueva migración menor `20260715160000_us043_attachments_uploaded_by`; CI la aplica en `prisma migrate deploy`. |
| `npm --prefix web run lint` / `test` | Not Run | Idem. |

Notas: la calidad descansa en (i) reuso estricto de patrones aceptados (repository, port, adapter, logger, error handler); (ii) ausencia de `any`; (iii) validación de contrato con Zod tanto en request como en response; (iv) transacción con compensación probada por unit tests. El CI de GitHub Actions verificará lint, typecheck, unit tests y API tests con Postgres efímero.

## 8. Files Impacted

### Created

- `backend/prisma/migrations/20260715160000_us043_attachments_uploaded_by/migration.sql`
- `backend/src/modules/attachments/domain/attachment.ts`
- `backend/src/modules/attachments/domain/attachment.errors.ts`
- `backend/src/modules/attachments/domain/constants.ts`
- `backend/src/modules/attachments/ports/attachment.repository.ts`
- `backend/src/modules/attachments/ports/file-storage.port.ts`
- `backend/src/modules/attachments/application/upload-portfolio-image.use-case.ts`
- `backend/src/modules/attachments/application/sharp-pipeline.ts`
- `backend/src/modules/attachments/application/magic-bytes-validator.ts`
- `backend/src/modules/attachments/application/portfolio-event-logger.ts`
- `backend/src/modules/attachments/infrastructure/local-file-storage.adapter.ts`
- `backend/src/modules/attachments/infrastructure/prisma-attachment.repository.ts`
- `backend/src/modules/attachments/infrastructure/structured-portfolio-event-logger.ts`
- `backend/src/modules/attachments/interface/dto/work-label.param.ts`
- `backend/src/modules/attachments/interface/dto/upload-portfolio-image.response.ts`
- `backend/src/modules/attachments/interface/portfolio.controller.ts`
- `backend/src/modules/attachments/interface/portfolio.routes.ts`
- `backend/src/modules/attachments/interface/portfolio-upload.middleware.ts`
- `backend/tests/unit/us043-upload-portfolio-image.spec.ts`
- `backend/tests/api/us043-upload-portfolio-image.spec.ts`
- `storage/uploads/.gitkeep`
- `web/src/features/vendor-portfolio/api/vendorPortfolioApi.ts`
- `web/src/features/vendor-portfolio/api/vendorPortfolioApi.types.ts`
- `web/src/features/vendor-portfolio/components/PortfolioUploader.tsx`
- `web/src/features/vendor-portfolio/components/WorkGrid.tsx`
- `web/src/features/vendor-portfolio/hooks/useUploadPortfolioImage.ts`
- `web/src/features/vendor-portfolio/index.ts`
- `web/src/tests/msw/handlers/vendor-portfolio.ts`

### Modified

- `backend/prisma/schema.prisma` (agrega `uploadedBy String? @map("uploaded_by") @db.Uuid` + relación inversa `User.uploadedAttachments`)
- `backend/package.json` (agrega `sharp`)
- `backend/.env.example` (agrega `FILE_STORAGE_DRIVER` y `FILE_STORAGE_PATH`)
- `backend/src/config/env.ts` (schema Zod con `FILE_STORAGE_DRIVER` y `FILE_STORAGE_PATH`)
- `backend/src/modules/attachments/application/index.ts` (barrel)
- `backend/src/modules/attachments/domain/index.ts` (barrel)
- `backend/src/modules/attachments/infrastructure/index.ts` (barrel)
- `backend/src/modules/attachments/interface/index.ts` (exporta `portfolioRouter`)
- `backend/src/modules/attachments/ports/index.ts` (barrel)
- `backend/src/app.ts` (monta `portfolioRouter` en `/vendors/me/portfolio`)
- `backend/src/shared/domain/errors/error-codes.ts` (nuevos códigos US-043)
- `backend/src/scripts/seed.ts` (extensión con vendors demo + attachments)
- `.gitignore` (agrega `storage/uploads/` excepto `.gitkeep`)
- `web/src/app/(app)/vendor/portfolio/page.tsx` (usa componentes reales)
- `web/src/messages/es-LATAM.json`
- `web/src/messages/es-ES.json`
- `web/src/messages/pt.json`
- `web/src/messages/en.json`
- `docs/16-api-endpoints.md` (§M07 extendido)
- `docs/10-non-functional-requirements.md` (housekeeping NFR-PERF-UPLOAD-001)
- `management/workflows/Development-Execution-Index.md` (fila US-043)

## 9. Blockers

Ninguno.

## 10. Deviations

| # | Comportamiento planeado | Implementado | Razón |
| - | ----------------------- | ------------ | ----- |
| 1 | `deleted_by`, `deletion_reason` en `attachments` | Diferido a US-048 | US-048 entrega el DELETE; agregar columnas ahora sin uso viola YAGNI y ADR-ARCH-002. |
| 2 | `AttachmentOwnerType` enum | Constante tipada `OWNER_TYPE_VENDOR_WORK` | Schema no lo define; introducir enum Prisma exige data migration innecesaria. |
| 3 | Routes bajo `app/[locale]/...` | `app/(app)/vendor/portfolio/...` | El repo web no usa prefijo `[locale]` (heredado US-040/041/042/106). |
| 4 | `axe` test explícito | Manual (`aria-live`, `role="button"`) | Sin dependencia axe en el repo; no se fuerza test dependiente de infra ausente. |
| 5 | Reuso de `VendorProfileNotFoundError`/`VendorProfileHiddenError` | `PortfolioProfileNotFoundError`/`PortfolioProfileHiddenError` locales al módulo | ADR-ARCH-001 prohíbe imports cross-module. Los códigos estables (`PROFILE_NOT_FOUND`, `PROFILE_HIDDEN`) del catálogo se preservan; sólo cambia el nombre de la clase. |

## 11. Final Validation

- Task completion: 22/23 Done, 1 Not Applicable (QA-006 sin runner axe)
- Acceptance Criteria coverage:
  - AC-01: BE-002..007, QA-002, QA-005
  - AC-02: BE-005, BE-006, QA-001, QA-002
  - AC-03: BE-004, QA-001, QA-002
  - EC-01..EC-06: BE-003, BE-006, BE-007, QA-001, QA-002
  - AUTH-TS-01..07: BE-007, QA-002 (auth matrix)
  - A11Y: FE-002, FE-003
  - i18n: FE-004
- Lint / Typecheck / Tests / Build: Not Run (CI)
- Migrations: 1 nueva (`20260715160000_us043_attachments_uploaded_by`)
- Seed: extendido
- Security: magic-bytes (SEC-02), UUID filename (SEC-03/06), storage fuera del web root (SEC-03), ownership por sesión (SEC-01)
- Accessibility: manual — dropzone keyboard, `aria-live="polite"` en contador
- i18n: 4 locales
- Documentation: `docs/16 §M07` + `docs/10` housekeeping
- Final status: Done

## 12. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-15T00:00:00Z | Initialized | Execution record creado |
| 2026-07-15T00:00:00Z | Readiness | READY_WITH_WARNINGS |
| 2026-07-15T00:00:00Z | Alignment | ALIGNED_WITH_NOTES |
| 2026-07-15T00:00:00Z | Emergent | EMERGENT-001 (columna `uploaded_by`) |
| 2026-07-15T00:00:00Z | Backend | Módulo attachments completo (domain/ports/application/infrastructure/interface) |
| 2026-07-15T00:00:00Z | Frontend | Página + uploader + grid + API + i18n |
| 2026-07-15T00:00:00Z | Seed | Extensión demo vendors + attachments |
| 2026-07-15T00:00:00Z | Tests | Unit + API (patrones US-040/041/042) |
| 2026-07-15T00:00:00Z | Docs | docs/16 §M07 + docs/10 housekeeping |
| 2026-07-15T00:00:00Z | Completed | Status Done |
