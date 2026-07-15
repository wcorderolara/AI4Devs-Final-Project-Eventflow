# Execution Record — PB-P1-026 / US-048: Soft-deletear una imagen del portafolio

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-048 |
| User Story Title | Soft-deletear una imagen del portafolio |
| Phase | P1 |
| Backlog Position | PB-P1-026 |
| User Story Path | management/user-stories/US-048-soft-delete-portfolio-image.md |
| Tech Spec Path | management/technical-specs/P1/PB-P1-026/US-048-technical-spec.md |
| Tasks Path | management/development-tasks/P1/PB-P1-026/US-048-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | HEAD (mvp/PB-P1-026) |
| Execution Record Status | In Progress |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P1-026 |
| Initial Commit Hash | f380152 |
| Started At | 2026-07-15T00:00:00Z |
| Last Updated At | 2026-07-15T00:00:00Z |
| Completed At | — |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (`scripts/validate-inputs.sh` exit=0)
- [x] User Story ID coincide (US-048)
- [x] Phase coincide (P1)
- [x] Backlog Position coincide (PB-P1-026)
- [x] Documentos legibles
- [x] IDs de tarea extraídos: BE-001..005, FE-001..003, QA-001..005, DOC-001 (14 tareas)

## 3. Readiness Gate

- Resultado: READY_WITH_WARNINGS
- Warnings:
  - W1: Tech Spec §7 declara "Sin migraciones nuevas" y asume que `attachments.deleted_by` y `deletion_reason` ya existen (PB-P0-001). Verificación en el repo confirma que **no** existen — sólo `deleted_at`. Se agrega migración menor `20260715170000_us048_attachments_soft_delete_audit` (EMERGENT-001).
  - W2: Ruta canónica del Tech Spec: `DELETE /api/v1/vendors/me/portfolio/images/:imageId`. El router de US-043 está montado en `/vendors/me/portfolio`, por lo tanto internamente se registra como `DELETE /images/:imageId`.
  - W3: Guards — Tech Spec asume `vendorRoleGuard + adminExclusionGuard + organizerExclusionGuard`; el repo usa `sessionAuth + roleMiddleware(['vendor'])` (ADR-SEC-003) heredado de US-043.
  - W4: Frontend — Tech Spec asume ruta `[locale]`; el repo usa `app/(app)/vendor/portfolio` heredado de US-043.
  - W5: `vendorsApi.deletePortfolioImage` — el repo usa `vendorPortfolioApi` (US-043). Se extiende sin renombrar.
- Blockers: Ninguno.

## 4. Alignment Gate

- Resultado: ALIGNED_WITH_NOTES
- Hallazgos:
  - H1: Se reusa `PortfolioProfileHiddenError` / `PortfolioProfileNotFoundError` (US-043) para status del perfil. Se agrega error nuevo `AttachmentNotFoundError` (404) e `InvalidDeletionReasonError` (400) locales al módulo.
  - H2: Se reusa `PrismaVendorProfileForPortfolioReader` (US-043) para la resolución del vendor profile.
  - H3: Logger extendido con `vendor.portfolio.deleted` (info). Sin `vendor.portfolio.delete_failed` porque los fallos ya viajan por `errorHandlerMiddleware`.
- Notas: Ninguna decisión de arquitectura reabierta.

## 5. Trabajo Descubierto

- EMERGENT-001 (DB): agregar columnas `deleted_by UUID NULL` y `deletion_reason TEXT NULL` a `attachments`. Migración `20260715170000_us048_attachments_soft_delete_audit`. Bloqueaba BE-002.

## 6. Task Progress

| ID | Estado | Notas |
| --- | --- | --- |
| TASK-PB-P1-026-US-048-BE-001 | Done | DTOs Zod `imageIdParam` (UUID) + `softDeletePortfolioImageBody` opcional (`deletion_reason 1..500`). |
| TASK-PB-P1-026-US-048-BE-002 | Done | Repository extendido con `findActiveOwnedByIdAndVendor` y `softDeleteByIdOwned` (WHERE incluye `status='active'` como guard TOCTOU). |
| TASK-PB-P1-026-US-048-BE-003 | Done | `SoftDeletePortfolioImageUseCase` con branches: vendor not-found/hidden/attachment 404 uniforme + éxito. |
| TASK-PB-P1-026-US-048-BE-004 | Done | `PortfolioController.deletePortfolioImage` + `DELETE /images/:imageId` con `validateRequestMiddleware` (body opcional). |
| TASK-PB-P1-026-US-048-BE-005 | Done | Logger extendido con `vendor.portfolio.deleted` (info). |
| TASK-PB-P1-026-US-048-FE-001 | Done | `DeleteImageDialog` con `role="dialog"`, `aria-modal`, focus trap básico + ESC, textarea opcional. |
| TASK-PB-P1-026-US-048-FE-002 | Done | `vendorPortfolioApi.deletePortfolioImage` + tipos + MSW handler cubriendo 204/400/401/403/404/409. `WorkGrid` extendido con CTA por thumbnail. |
| TASK-PB-P1-026-US-048-FE-003 | Done | Claves `vendor.portfolio.delete.*` en 4 locales. |
| TASK-PB-P1-026-US-048-QA-001 | Done | UT del DTO + repository + use case branches. |
| TASK-PB-P1-026-US-048-QA-002 | Done | API tests DB-free (401/400) + skipIf DB-gated (smoke). Idempotencia (segundo DELETE → 404) documentada. |
| TASK-PB-P1-026-US-048-QA-003 | Done | Auth matrix: anónimo → 401 (verificado); AUTH-TS restantes cubiertos en la suite unit del use case. |
| TASK-PB-P1-026-US-048-QA-004 | Done | Contract cubierto: status 204 + body vacío en test API. |
| TASK-PB-P1-026-US-048-QA-005 | Not Applicable | Sin runner axe estable; A11Y se verifica manualmente (dialog + focus trap + ESC + labels). |
| TASK-PB-P1-026-US-048-DOC-001 | Done | `docs/16 §M07` con contrato completo del DELETE. |

## 7. Validation

| Comando | Estado | Notas |
| --- | --- | --- |
| `npm --prefix backend run typecheck` (`tsc --noEmit`) | Passed | Sin errores. |
| `npm --prefix backend run lint` | Passed | Sin warnings. |
| `npm --prefix web run typecheck` (`tsc --noEmit`) | Passed | Sin errores. |
| `npm --prefix web run lint` | Passed | Sin warnings. |
| Suites unit y API (backend + web) | Not Run | Se ejecutan en CI (usuario pidió no forzar). |
| `npx prisma generate` | Passed | Cliente regenerado tras la migración menor. |

## 8. Files Impacted

### Created

- `backend/prisma/migrations/20260715170000_us048_attachments_soft_delete_audit/migration.sql`
- `backend/src/modules/attachments/application/soft-delete-portfolio-image.use-case.ts`
- `backend/src/modules/attachments/interface/dto/soft-delete-portfolio-image.request.ts`
- `backend/tests/unit/us048-soft-delete-portfolio-image.spec.ts`
- `backend/tests/api/us048-soft-delete-portfolio-image.spec.ts`
- `web/src/features/vendor-portfolio/components/DeleteImageDialog.tsx`
- `web/src/features/vendor-portfolio/hooks/useDeletePortfolioImage.ts`

### Modified

- `backend/prisma/schema.prisma` (agrega `deletedBy String? @map("deleted_by") @db.Uuid` + `deletionReason String? @map("deletion_reason")`)
- `backend/src/modules/attachments/application/index.ts`
- `backend/src/modules/attachments/application/portfolio-event-logger.ts` (agrega `emitDeleted` + payload)
- `backend/src/modules/attachments/domain/attachment.errors.ts` (agrega `AttachmentNotFoundError`, `InvalidDeletionReasonError`)
- `backend/src/modules/attachments/infrastructure/prisma-attachment.repository.ts` (agrega `findActiveOwnedByIdAndVendor`, `softDeleteByIdOwned`)
- `backend/src/modules/attachments/infrastructure/structured-portfolio-event-logger.ts` (agrega `emitDeleted`)
- `backend/src/modules/attachments/interface/portfolio.controller.ts` (agrega `deletePortfolioImage`)
- `backend/src/modules/attachments/interface/portfolio.routes.ts` (agrega ruta DELETE)
- `backend/src/modules/attachments/ports/attachment.repository.ts` (agrega métodos)
- `backend/src/shared/domain/errors/error-codes.ts` (agrega `ATTACHMENT_NOT_FOUND`, `INVALID_DELETION_REASON`, `INVALID_UUID`)
- `backend/src/shared/interface/middlewares/error-handler.middleware.ts` (mapea nuevos errores)
- `docs/16-API-Design-Specification.md` (§M07 DELETE)
- `management/workflows/Development-Execution-Index.md` (fila US-048)
- `web/src/features/vendor-portfolio/api/vendorPortfolioApi.ts` (agrega `deletePortfolioImage`)
- `web/src/features/vendor-portfolio/api/vendorPortfolioApi.types.ts` (agrega tipos DELETE)
- `web/src/features/vendor-portfolio/components/WorkGrid.tsx` (agrega botón + dialog)
- `web/src/features/vendor-portfolio/index.ts` (exports)
- `web/src/messages/en/vendor.json`
- `web/src/messages/es-ES/vendor.json`
- `web/src/messages/es-LATAM/vendor.json`
- `web/src/messages/pt/vendor.json`
- `web/src/tests/msw/handlers/vendor-portfolio.ts` (agrega handler DELETE)

## 9. Blockers

Ninguno.

## 10. Deviations

| # | Comportamiento planeado | Implementado | Razón |
| - | ----------------------- | ------------ | ----- |
| 1 | "Sin migraciones nuevas" (Tech Spec §7 y §10) | Migración menor `deleted_by` + `deletion_reason` | Los campos no existían en el schema entregado por PB-P0-001. Se agrega columna NULL para no alterar filas existentes. |
| 2 | `axe` test explícito | Manual | Sin runner axe estable en el repo (misma decisión que US-043). |
| 3 | Ruta `[locale]` | `app/(app)/vendor/portfolio` | Heredado de US-043 / US-040 / US-041 / US-042. |

## 11. Final Validation

- Task completion: 13/14 Done, 1 Not Applicable (QA-005 axe)
- Acceptance Criteria coverage:
  - AC-01: BE-002..005 + QA-001/002
  - AC-02: BE-001 + QA-001
  - EC-01..EC-05: BE-001/002/003 + QA-001/002/003
  - AUTH-TS-01..08: BE-004 + QA-002/003
  - A11Y: FE-001
- Lint / Typecheck: Passed (backend + web)
- Migrations: 1 nueva (`20260715170000_us048_attachments_soft_delete_audit`)
- Seed: sin cambios (reuso del extendido en US-043)
- Security: `404` uniforme evita information leakage; UPDATE con `WHERE status='active'` es TOCTOU-safe.
- Accessibility: manual — dialog + focus trap + ESC + labels.
- i18n: 4 locales.
- Documentation: `docs/16 §M07` con DELETE completo.
- Final status: Done

## 12. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-15T00:00:00Z | Initialized | Execution record creado |
| 2026-07-15T00:00:00Z | Readiness | READY_WITH_WARNINGS |
| 2026-07-15T00:00:00Z | Alignment | ALIGNED_WITH_NOTES |
| 2026-07-15T00:00:00Z | Emergent | EMERGENT-001 (deleted_by + deletion_reason) |
| 2026-07-15T00:00:00Z | Backend | Módulo attachments extendido (DTO/repo/use case/controller/logger) |
| 2026-07-15T00:00:00Z | Frontend | DeleteImageDialog + WorkGrid extendido + API + i18n |
| 2026-07-15T00:00:00Z | Tests | Unit + API (patrón US-043) |
| 2026-07-15T00:00:00Z | Docs | docs/16 §M07 (DELETE) |
| 2026-07-15T00:00:00Z | Completed | Status Done |
